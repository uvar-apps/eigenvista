import * as THREE from "three";

// Kept clear of the scene and AO layers. The original masks are restored
// after drawing so the offscreen passes have no effect on picking.
const SURFACE_LAYER = 29;
const ANNOTATION_LAYER = 30;
const TILE_EDGE = 16;

function target(type: THREE.TextureDataType, depth = false) {
  return new THREE.WebGLRenderTarget(1, 1, {
    type,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    depthBuffer: depth,
    depthTexture: depth ? new THREE.DepthTexture(1, 1, THREE.FloatType) : null,
  });
}

function screenMaterial(
  fragmentShader: string,
  uniforms: THREE.ShaderMaterial["uniforms"],
) {
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: "void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }",
    fragmentShader,
    depthTest: false,
    depthWrite: false,
    blending: THREE.NoBlending,
  });
}

/** Depth-peel transparent custom-shaded surfaces per pixel over the existing scene. */
export class SurfaceTransparency {
  private readonly size = new THREE.Vector2();
  private readonly base;
  private readonly layers;
  private readonly accumulation;
  private readonly occupancy = target(THREE.UnsignedByteType);
  private readonly materials = new Map<
    THREE.ShaderMaterial,
    THREE.ShaderMaterial
  >();
  private samples: Uint8Array = new Uint8Array(0);
  private readonly screen = new THREE.Scene();
  private readonly screenCamera = new THREE.Camera();
  private readonly reduce = screenMaterial(
    `
    uniform highp sampler2D layerDepth;
    void main() {
      ivec2 corner = ivec2(gl_FragCoord.xy) * ${TILE_EDGE};
      ivec2 size = textureSize(layerDepth, 0);
      for (int y = 0; y < ${TILE_EDGE}; ++y)
        for (int x = 0; x < ${TILE_EDGE}; ++x) {
          ivec2 p = corner + ivec2(x, y);
          if (all(lessThan(p, size)) && texelFetch(layerDepth, p, 0).r < 1.0) {
            gl_FragColor = vec4(1.0);
            return;
          }
        }
      gl_FragColor = vec4(0.0);
    }`,
    { layerDepth: { value: null } },
  );
  private readonly accumulate = screenMaterial(
    `
    uniform sampler2D layer;
    void main() {
      gl_FragColor = texelFetch(layer, ivec2(gl_FragCoord.xy), 0);
    }`,
    { layer: { value: null } },
  );
  private readonly display = screenMaterial(
    `
    uniform sampler2D base;
    uniform sampler2D accumulation;
    void main() {
      ivec2 pixel = ivec2(gl_FragCoord.xy);
      vec4 solid = texelFetch(base, pixel, 0);
      vec4 surface = texelFetch(accumulation, pixel, 0);
      // The ordinary scene target stores premultiplied linear RGB; the
      // custom fragment outputs retain their original display encoding.
      vec3 baseColor = solid.a > 0.0
        ? linearToOutputTexel(vec4(solid.rgb / solid.a, 1.0)).rgb * solid.a
        : vec3(0.0);
      gl_FragColor = vec4(surface.rgb + surface.a * baseColor,
                          1.0 - surface.a * (1.0 - solid.a));
    }`,
    { base: { value: null }, accumulation: { value: null } },
  );
  private readonly quad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    this.display,
  );

  constructor(private readonly renderer: THREE.WebGLRenderer) {
    const type = renderer.extensions.has("EXT_color_buffer_float")
      ? THREE.HalfFloatType
      : THREE.UnsignedByteType;
    this.base = target(type, true);
    this.layers = [target(type, true), target(type, true)] as const;
    this.accumulation = target(type);
    this.quad.frustumCulled = false;
    this.screen.add(this.quad);
    // Store premultiplied color in RGB and remaining transmission in A.
    // Blending adds T * (RGB * alpha) and multiplies T by (1 - alpha).
    this.accumulate.transparent = true;
    this.accumulate.blending = THREE.CustomBlending;
    this.accumulate.blendSrc = THREE.DstAlphaFactor;
    this.accumulate.blendDst = THREE.OneFactor;
    this.accumulate.blendSrcAlpha = THREE.ZeroFactor;
    this.accumulate.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  }

  private material(original: THREE.ShaderMaterial) {
    const cached = this.materials.get(original);
    if (cached) return cached;
    const material = original.clone();
    material.defines = { ...original.defines, EIGENVISTA_DEPTH_PEEL: 1 };
    material.uniforms = {
      ...original.uniforms,
      eigenvistaSceneDepth: { value: this.base.depthTexture },
      eigenvistaPreviousDepth: { value: this.base.depthTexture },
      eigenvistaAccumulation: { value: this.accumulation.texture },
      eigenvistaHasPreviousDepth: { value: false },
    };
    material.transparent = false;
    material.depthWrite = true;
    material.blending = THREE.NoBlending;
    this.materials.set(original, material);
    original.addEventListener("dispose", () => {
      if (this.materials.delete(original)) material.dispose();
    });
    return material;
  }

  private resize() {
    const { x: width, y: height } = this.renderer.getDrawingBufferSize(
      this.size,
    );
    if (
      this.samples.length &&
      this.base.width === width &&
      this.base.height === height
    )
      return;
    const gl = this.renderer.getContext();
    const columns = Math.ceil(width / TILE_EDGE);
    const rows = Math.ceil(height / TILE_EDGE);
    this.samples = new Uint8Array(0);
    this.occupancy.setSize(columns, rows);
    for (const buffer of [
      this.base,
      ...this.layers,
      this.accumulation,
      this.occupancy,
    ]) {
      if (buffer !== this.occupancy) buffer.setSize(width, height);
      this.renderer.setRenderTarget(buffer);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error(
          "The graphics device could not allocate the transparency buffers",
        );
    }
    this.samples = new Uint8Array(columns * rows * 4);
  }

  private drawScreen(
    material: THREE.ShaderMaterial,
    output: THREE.WebGLRenderTarget | null,
  ) {
    this.quad.material = material;
    this.renderer.setRenderTarget(output);
    this.renderer.render(this.screen, this.screenCamera);
  }

  private hasFragments(layer: THREE.DepthTexture) {
    // A very small alpha can round to zero in the color target. Its depth
    // still indicates that a later layer may exist behind it.
    this.reduce.uniforms.layerDepth.value = layer;
    this.drawScreen(this.reduce, this.occupancy);
    // Read a single flag per tile instead of reading the full color buffer.
    const { width, height } = this.occupancy;
    this.samples.fill(0);
    this.renderer.readRenderTargetPixels(
      this.occupancy,
      0,
      0,
      width,
      height,
      this.samples,
    );
    if (this.renderer.getContext().isContextLost())
      throw new Error("The graphics context is lost");
    return this.samples.some((value) => value !== 0);
  }

  render(scene: THREE.Scene, camera: THREE.Camera, group: THREE.Group) {
    const { renderer } = this;
    const surfaces: Array<{
      mesh: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
      original: THREE.ShaderMaterial;
      mask: number;
    }> = [];
    const annotations: Array<{ object: THREE.Object3D; mask: number }> = [];
    group.traverseVisible((object) => {
      if (!camera.layers.test(object.layers)) return;
      if (
        object instanceof THREE.Mesh &&
        object.userData.customShader &&
        object.material instanceof THREE.ShaderMaterial &&
        object.material.transparent
      )
        surfaces.push({
          mesh: object,
          original: object.material,
          mask: object.layers.mask,
        });
      else if (
        (object instanceof THREE.Sprite || object instanceof THREE.Points) &&
        !object.material.depthTest
      )
        annotations.push({ object, mask: object.layers.mask });
    });
    if (!surfaces.length) {
      if (this.samples.length) this.releaseBuffers();
      renderer.render(scene, camera);
      return;
    }

    const output = renderer.getRenderTarget();
    const clear = renderer.getClearColor(new THREE.Color());
    const alpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const background = scene.background;
    const cameraMask = camera.layers.mask;
    try {
      this.resize();
      for (const { mesh } of surfaces) mesh.layers.set(SURFACE_LAYER);
      for (const { object } of annotations) object.layers.set(ANNOTATION_LAYER);
      renderer.autoClear = true;
      renderer.setRenderTarget(this.base);
      renderer.render(scene, camera);

      renderer.setRenderTarget(this.accumulation);
      renderer.setClearColor(0x000000, 1);
      renderer.clearColor();
      renderer.setClearColor(0x000000, 0);
      scene.background = null;
      camera.layers.set(SURFACE_LAYER);
      for (const { mesh, original } of surfaces)
        mesh.material = this.material(original);

      let previousDepth: THREE.DepthTexture | null = null;
      let next = 0;
      for (;;) {
        const layer = this.layers[next];
        for (const { mesh } of surfaces) {
          const { uniforms } = mesh.material;
          uniforms.eigenvistaHasPreviousDepth.value = previousDepth !== null;
          uniforms.eigenvistaPreviousDepth.value =
            previousDepth ?? this.base.depthTexture;
          mesh.material.uniformsNeedUpdate = true;
        }
        renderer.autoClear = true;
        renderer.setRenderTarget(layer);
        renderer.render(scene, camera);
        renderer.autoClear = false;
        if (!this.hasFragments(layer.depthTexture!)) break;
        this.accumulate.uniforms.layer.value = layer.texture;
        this.drawScreen(this.accumulate, this.accumulation);
        previousDepth = layer.depthTexture;
        next = 1 - next;
      }
      this.display.uniforms.base.value = this.base.texture;
      this.display.uniforms.accumulation.value = this.accumulation.texture;
      this.drawScreen(this.display, output);
      if (annotations.length) {
        camera.layers.set(ANNOTATION_LAYER);
        renderer.render(scene, camera);
      }
    } finally {
      for (const { mesh, original, mask } of surfaces) {
        mesh.material = original;
        mesh.layers.mask = mask;
      }
      for (const { object, mask } of annotations) object.layers.mask = mask;
      camera.layers.mask = cameraMask;
      scene.background = background;
      renderer.setRenderTarget(output);
      renderer.setClearColor(clear, alpha);
      renderer.autoClear = autoClear;
    }
  }

  releaseBuffers() {
    for (const buffer of [
      this.base,
      ...this.layers,
      this.accumulation,
      this.occupancy,
    ])
      buffer.dispose();
    this.samples = new Uint8Array(0);
  }

  dispose() {
    this.releaseBuffers();
    for (const material of this.materials.values()) material.dispose();
    this.materials.clear();
    this.reduce.dispose();
    this.accumulate.dispose();
    this.display.dispose();
    this.quad.geometry.dispose();
  }
}
