import type { Page } from "@playwright/test";

export type V3 = [number, number, number];
export type Basis = [V3, V3, V3];
export type FieldKind = "linear" | "positive-tent" | "negative-tent" | 1 | -1;
export const dot = (a: V3, b: V3) => a.reduce((s, v, i) => s + v * b[i], 0);
export const add = (a: V3, b: V3): V3 => a.map((v, i) => v + b[i]) as V3;
export const scale = (a: V3, k: number): V3 => a.map((v) => v * k) as V3;
export const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const unit = (a: V3) => scale(a, 1 / Math.hypot(...a));

export interface GeometryCase {
  id: string;
  basis: Basis;
  dims: V3;
  center: V3;
  eye: V3;
  target: V3;
  up: V3;
  gradient: V3;
}

export function originOf(profile: GeometryCase): V3 {
  return profile.basis.reduce((p, a) => add(p, scale(a, -0.5)), profile.center);
}

/** World-space halfspace clipping, using face normals/Cramer's rule, not Three. */
export function clipRay(profile: GeometryCase, direction: V3) {
  const offset = add(profile.eye, scale(originOf(profile), -1));
  let enter = 0;
  let leave = Infinity;
  for (let axis = 0; axis < 3; axis++) {
    const normal = cross(
      profile.basis[(axis + 1) % 3],
      profile.basis[(axis + 2) % 3],
    );
    const denominator = dot(normal, profile.basis[axis]);
    const coordinate = dot(normal, offset) / denominator;
    const rate = dot(normal, direction) / denominator;
    if (Math.abs(rate) < 1e-14) {
      if (coordinate < 0 || coordinate > 1) return null;
    } else {
      const t0 = -coordinate / rate;
      const t1 = (1 - coordinate) / rate;
      enter = Math.max(enter, Math.min(t0, t1));
      leave = Math.min(leave, Math.max(t0, t1));
    }
  }
  return leave > enter ? { enter, leave, length: leave - enter } : null;
}

export function pixelRay(
  profile: GeometryCase,
  x: number,
  y: number,
  size: number,
): V3 {
  const forward = unit(add(profile.target, scale(profile.eye, -1)));
  const right = unit(cross(forward, profile.up));
  const up = cross(right, forward);
  const half = Math.tan((45 * Math.PI) / 360);
  return unit(
    add(
      forward,
      add(
        scale(right, ((2 * (x + 0.5)) / size - 1) * half),
        scale(up, ((2 * (y + 0.5)) / size - 1) * half),
      ),
    ),
  );
}

export const exactConstantAlpha = (length: number, opacity: number) =>
  -Math.expm1(-1.4 * opacity * length);

const rotated = (v: V3): V3 => {
  const axis = unit([0.3, 1, 0.2]);
  const angle = 0.65;
  return add(
    add(scale(v, Math.cos(angle)), scale(cross(axis, v), Math.sin(angle))),
    scale(axis, dot(axis, v) * (1 - Math.cos(angle))),
  );
};

/** Physical box vectors and voxel counts are deliberately independent. */
export const geometryCases: GeometryCase[] = (() => {
  const center: V3 = [0.15, -0.2, 0.1];
  const gradient: V3 = [0.16, -0.23, 0.96];
  const basis: Basis = [
    [8, 0, 0],
    [0, 2, 0],
    [0, 0, 1],
  ];
  const skew: Basis = [
    [8, 0, 0],
    [0.8, 2, 0],
    [0.2, 0.3, 1],
  ];
  const reflect: Basis = [scale(skew[0], -1), skew[1], skew[2]];
  const outside = (
    id: string,
    basis: Basis,
    dims: V3,
    offset: V3 = [0, 0, 3],
  ): GeometryCase => ({
    id,
    basis,
    dims,
    center,
    gradient,
    eye: add(center, offset),
    target: center,
    up: [0, 1, 0],
  });
  return [
    outside(
      "isotropic-cube",
      [
        [2, 0, 0],
        [0, 2, 0],
        [0, 0, 2],
      ],
      [33, 33, 33],
    ),
    outside("physical-elongation", basis, [33, 33, 33]),
    outside("same-box-fine-short-axis", basis, [17, 33, 65]),
    outside("skew-oblique", skew, [17, 33, 65], [2, 0.8, 2.5]),
    outside("reflected-reverse", reflect, [17, 33, 65], [0, 0, -3]),
    {
      id: "rotated-reflected-inside",
      dims: [17, 33, 65],
      center,
      basis: reflect.map(rotated) as Basis,
      gradient: rotated(gradient),
      eye: add(center, rotated([0.1, -0.1, 0])),
      target: add(center, rotated([0.2, 0, 1])),
      up: rotated([0, 1, 0]),
    },
  ];
})();

export function worldCoordinates(profile: GeometryCase, position: V3): V3 {
  const offset = add(position, scale(originOf(profile), -1));
  return profile.basis.map((axis, i) => {
    const normal = cross(
      profile.basis[(i + 1) % 3],
      profile.basis[(i + 2) % 3],
    );
    return dot(normal, offset) / dot(normal, axis);
  }) as V3;
}

/** Closed-form roots of the world-linear field; no sampled marching lattice. */
export function linearRaycastReference(
  profile: GeometryCase,
  direction: V3,
  iso: number,
  opacity: number,
) {
  const clip = clipRay(profile, direction);
  if (!clip) return null;
  const atCamera = dot(
    profile.gradient,
    add(profile.eye, scale(profile.center, -1)),
  );
  const slope = dot(profile.gradient, direction);
  if (Math.abs(slope) < 0.15) return null; // Explicitly uncertified grazing regime.
  const hits = [-iso, iso]
    .map((level) => ({ level, t: (level - atCamera) / slope }))
    .filter((hit) => hit.t > clip.enter + 1e-5 && hit.t < clip.leave - 1e-5)
    .sort((a, b) => a.t - b.t);
  if (!hits.length) return null;
  const epsilon =
    Math.min(
      ...profile.basis.map((a, i) => Math.hypot(...a) / (profile.dims[i] - 1)),
    ) * 0.5;
  for (const hit of hits) {
    const p = add(profile.eye, scale(direction, hit.t));
    // Keep finite-difference shading away from clamped volume boundaries.
    for (let axis = 0; axis < 3; axis++)
      for (const sign of [-1, 1]) {
        const shifted = [...p] as V3;
        shifted[axis] += sign * epsilon;
        if (
          worldCoordinates(profile, shifted).some((v) => v < 0.02 || v > 0.98)
        )
          return null;
      }
  }
  const light =
    0.4 + 0.6 * Math.abs(dot(unit(profile.gradient), unit([0.4, 0.7, 1])));
  const rgb = [0, 0, 0];
  let alpha = 0;
  for (const hit of hits) {
    rgb[hit.level > 0 ? 1 : 0] += (1 - alpha) * light * opacity;
    alpha += (1 - alpha) * opacity;
  }
  return { clip, hits, slope, rgba: [...rgb, alpha] };
}

/** Perspective depth inversion, expressed independently in physical ray units. */
export function distanceFromDepth(
  profile: GeometryCase,
  direction: V3,
  depth: number,
) {
  const near = 0.04,
    far = 40;
  const forward = unit(add(profile.target, scale(profile.eye, -1)));
  const cosine = dot(direction, forward);
  const eyeDepth = (far * near) / (far - (far - near) * depth);
  return eyeDepth / cosine;
}

export function crossingTolerance(
  profile: GeometryCase,
  direction: V3,
  t: number,
  nodeError: number,
  quality: number,
) {
  const axes = profile.basis.map((a, i) => scale(a, 1 / (profile.dims[i] - 1)));
  // Frobenius norm bounds world displacement for any unit voxel displacement.
  const maximumSegment = Math.hypot(...axes.flat()) / quality;
  const fieldUncertainty =
    nodeError / Math.abs(dot(profile.gradient, direction));
  const cosine = dot(
    direction,
    unit(add(profile.target, scale(profile.eye, -1))),
  );
  const z = t * cosine;
  // Predeclared empirical projection/depth allowance, not a universal GPU bound.
  const depthUncertainty =
    (16 * 2 ** -23 * z * z * (40 - 0.04)) / (40 * 0.04 * cosine) + 2e-5;
  return {
    fieldUncertainty,
    bisectionUncertainty: maximumSegment / 1024,
    depthUncertainty,
    total: fieldUncertainty + maximumSegment / 1024 + depthUncertainty,
  };
}

export function fieldGrid(profile: GeometryCase, field: FieldKind) {
  const origin = originOf(profile);
  const axes = profile.basis.map((axis, i) =>
    scale(axis, 1 / (profile.dims[i] - 1)),
  ) as Basis;
  const values: number[] = [];
  let maximumNodeRounding = 0;
  for (let z = 0; z < profile.dims[2]; z++)
    for (let y = 0; y < profile.dims[1]; y++)
      for (let x = 0; x < profile.dims[0]; x++) {
        const position = [x, y, z].reduce(
          (p, n, i) => add(p, scale(axes[i], n)),
          origin,
        );
        const value =
          field === "linear"
            ? dot(profile.gradient, add(position, scale(profile.center, -1)))
            : typeof field === "number"
              ? field
              : (field === "negative-tent" ? -1 : 1) *
                Math.max(
                  0,
                  1 -
                    Math.abs(position[2] - profile.center[2] - 3 / 64) /
                      (1 / 64),
                );
        const rounded = Math.fround(value);
        maximumNodeRounding = Math.max(
          maximumNodeRounding,
          Math.abs(value - rounded),
        );
        values.push(rounded);
      }
  return { origin, axes, dims: profile.dims, values, maximumNodeRounding };
}

/** Actual production material. The explicit opt-in counterfactual is never used
 * by normative tests; it changes one in-memory predicate solely to isolate cause. */
export async function renderAnalyticField(
  page: Page,
  profile: GeometryCase,
  mode: "volume" | "raycast",
  field: FieldKind,
  quality: 1 | 2 | 4,
  opacity: number,
  size = 97,
  filtered = false,
  firstMarkerControl = false,
) {
  const grid = fieldGrid(profile, field);
  const gpu = await page.evaluate(
    async ({
      profile,
      grid,
      mode,
      quality,
      opacity,
      size,
      filtered,
      firstMarkerControl,
    }) => {
      const toolsUrl = "/src/volume.ts";
      const threeUrl = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .find(
          (url) =>
            new URL(url).pathname === "/node_modules/.vite/deps/three.js",
        );
      if (!threeUrl) throw new Error("App did not load Three.js");
      const THREE = await import(/* @vite-ignore */ threeUrl);
      const { volumeObject } = await import(/* @vite-ignore */ toolsUrl);
      const renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: false,
        preserveDrawingBuffer: true,
      });
      renderer.setPixelRatio(1);
      renderer.setSize(size, size);
      renderer.setClearColor(0, 0);
      renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
      const camera = new THREE.PerspectiveCamera(45, 1, 0.04, 40);
      camera.position.set(...profile.eye);
      camera.up.set(...profile.up);
      camera.lookAt(new THREE.Vector3(...profile.target));
      camera.updateMatrixWorld(true);
      const scene = new THREE.Scene();
      const sampled = {
        ...grid,
        values: new Float32Array(grid.values),
        id: "anisotropy-reference",
        label: "Manufactured analytic field",
        quantity: "generic",
      };
      const useFiltered =
        filtered && renderer.extensions.has("OES_texture_float_linear");
      const mesh = volumeObject(
        sampled,
        mode,
        0.25,
        "#00ff00",
        "#ff0000",
        opacity,
        useFiltered,
        "diffuse",
        quality,
      );
      const productionFragment = mesh.material.fragmentShader;
      const predicate = "if(alpha>0.001&&first<0.0)first=nextT;";
      if (firstMarkerControl) {
        if (
          mode !== "volume" ||
          productionFragment.split(predicate).length !== 2
        )
          throw new Error(
            "Counterfactual requires exactly one unchanged volume first-marker predicate",
          );
        mesh.material.fragmentShader = productionFragment.replace(
          predicate,
          "if(alpha>0.0&&first<0.0)first=nextT;",
        );
        mesh.material.needsUpdate = true;
      }
      const sha = async (source: string) =>
        Array.from(
          new Uint8Array(
            await crypto.subtle.digest(
              "SHA-256",
              new TextEncoder().encode(source),
            ),
          ),
        )
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      const productionFragmentSha256 = await sha(productionFragment);
      const renderedFragmentSha256 = await sha(mesh.material.fragmentShader);
      scene.add(mesh);
      const gl = renderer.getContext();
      const extension = gl.getExtension("WEBGL_debug_renderer_info");
      const backend = extension
        ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER);
      const target = new THREE.WebGLRenderTarget(size, size, {
        depthBuffer: true,
      });
      target.texture.colorSpace = THREE.LinearSRGBColorSpace;
      target.depthTexture = new THREE.DepthTexture(
        size,
        size,
        THREE.UnsignedIntType,
      );
      const packed = new THREE.WebGLRenderTarget(size, size, {
        depthBuffer: false,
      });
      const readScene = new THREE.Scene();
      // Read the real depth attachment. Packing only transports its f32 bits;
      // it neither predicts a hit nor changes the production material.
      const readMaterial = new THREE.ShaderMaterial({
        glslVersion: THREE.GLSL3,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NoBlending,
        uniforms: { sourceDepth: { value: target.depthTexture } },
        vertexShader: "void main(){ gl_Position=vec4(position.xy,0.,1.); }",
        fragmentShader: `precision highp float; precision highp int; precision highp sampler2D;
        uniform sampler2D sourceDepth; out vec4 outputColor;
        void main(){ uint bits=floatBitsToUint(texelFetch(sourceDepth,ivec2(gl_FragCoord.xy),0).r);
          outputColor=vec4(float(bits&255u),float((bits>>8u)&255u),float((bits>>16u)&255u),float((bits>>24u)&255u))/255.; }`,
      });
      const readGeometry = new THREE.PlaneGeometry(2, 2);
      const readMesh = new THREE.Mesh(readGeometry, readMaterial);
      // Its vertex shader already emits clip coordinates, independent of camera.
      readMesh.frustumCulled = false;
      readScene.add(readMesh);
      try {
        renderer.setRenderTarget(target);
        renderer.render(scene, camera);
        const rgba = new Uint8Array(size * size * 4);
        renderer.readRenderTargetPixels(target, 0, 0, size, size, rgba);
        renderer.setRenderTarget(packed);
        renderer.render(readScene, camera);
        const depthBytes = new Uint8Array(size * size * 4);
        renderer.readRenderTargetPixels(packed, 0, 0, size, size, depthBytes);
        const depthView = new DataView(depthBytes.buffer);
        const depth = Array.from({ length: size * size }, (_, i) =>
          depthView.getFloat32(i * 4, true),
        );
        renderer.setRenderTarget(null);
        renderer.render(scene, camera);
        const completed = new Uint8Array(4);
        gl.readPixels(
          (size - 1) / 2,
          (size - 1) / 2,
          1,
          1,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          completed,
        );
        return {
          rgba: Array.from(rgba),
          depth,
          png: renderer.domElement.toDataURL("image/png").split(",")[1],
          backend,
          glError: gl.getError(),
          size,
          filtered: useFiltered,
          firstMarkerControl,
          productionFragmentSha256,
          renderedFragmentSha256,
          physicalBasis: profile.basis,
          dims: grid.dims,
          quality,
          opacity,
          mode,
        };
      } finally {
        target.dispose();
        packed.dispose();
        readMaterial.dispose();
        readGeometry.dispose();
        mesh.geometry.dispose();
        mesh.material.dispose();
        mesh.userData.texture.dispose();
        mesh.userData.rangesTexture.dispose();
        renderer.dispose();
        renderer.forceContextLoss();
      }
    },
    {
      profile,
      grid,
      mode,
      quality,
      opacity,
      size,
      filtered,
      firstMarkerControl,
    },
  );
  return { ...gpu, maximumNodeRounding: grid.maximumNodeRounding };
}
