import * as THREE from "three";
import { GTAOPass } from "three/addons/postprocessing/GTAOPass.js";

const MOLECULE_LAYER = 1;
const MAX_AO_EDGE = 1024;
const AO_CHUNK = "#include <aomap_fragment>";
const AO_PROGRAM_KEY = "eigenvista-molecular-ao-v1";

export interface MolecularAmbientOcclusionOptions {
  enabled: boolean;
  strength: number;
  /** World distance in Bohr, matching the molecular geometry. */
  radius: number;
}

/** Distinguishes an AO failure from an unrelated final-scene rendering error. */
export class MolecularAmbientOcclusionError extends Error {
  constructor(cause: unknown) {
    super(
      `Molecular ambient occlusion failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
    this.name = "MolecularAmbientOcclusionError";
  }
}

interface MaterialBinding {
  material: THREE.MeshStandardMaterial;
  beforeCompile: THREE.Material["onBeforeCompile"];
  cacheKey: THREE.Material["customProgramCacheKey"];
  hook: THREE.Material["onBeforeCompile"];
  keyHook: THREE.Material["customProgramCacheKey"];
}

/**
 * Molecule-only AO producer. The caller still renders the complete scene directly
 * after render(); scientific field and surface materials never receive this map.
 */
export class MolecularAmbientOcclusion {
  private meshes: readonly THREE.InstancedMesh[] = [];
  private pass: GTAOPass | null = null;
  private masks = new Map<THREE.InstancedMesh, number>();
  private bindings: MaterialBinding[] = [];
  private pendingShaderError: unknown = null;
  private failed = false;
  private disposed = false;
  private dimensions = new THREE.Vector2();
  private uniforms = {
    eigenvistaMolecularAo: { value: null as THREE.Texture | null },
    eigenvistaMolecularAoViewport: { value: new THREE.Vector2(1, 1) },
    eigenvistaMolecularAoStrength: { value: 0 },
  };

  constructor(
    private readonly renderer: THREE.WebGLRenderer,
    private readonly scene: THREE.Scene,
    private readonly camera: THREE.PerspectiveCamera,
  ) {}

  setMolecules(meshes: readonly THREE.InstancedMesh[]): void {
    if (
      this.disposed ||
      (meshes.length === this.meshes.length &&
        meshes.every((mesh, index) => mesh === this.meshes[index]))
    )
      return;
    this.deactivate();
    this.meshes = [...new Set(meshes)];
    this.pendingShaderError = null;
    this.failed = false;
  }

  render(options: MolecularAmbientOcclusionOptions): void {
    if (this.disposed) return;
    if (!options.enabled || options.strength === 0) {
      this.deactivate();
      this.pendingShaderError = null;
      this.failed = false;
      return;
    }
    if (this.failed || this.meshes.length === 0) return;

    try {
      if (
        !Number.isFinite(options.strength) ||
        options.strength < 0 ||
        options.strength > 1 ||
        !Number.isFinite(options.radius) ||
        options.radius <= 0
      )
        throw new Error("AO strength must be 0–1 and radius must be positive.");

      let attachedMaterials = false;
      this.withShaderDiagnostics(() => {
        this.withRestoredState(() => {
          const gl = this.renderer.getContext();
          if (gl.isContextLost())
            throw new Error("The graphics context is lost.");
          if (!this.renderer.extensions.has("EXT_color_buffer_float"))
            throw new Error("Floating-point render targets are unavailable.");

          this.renderer.getDrawingBufferSize(this.dimensions);
          const limit = Math.min(
            MAX_AO_EDGE,
            this.renderer.capabilities.maxTextureSize,
            gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number,
          );
          const scale = Math.min(
            0.5,
            limit / Math.max(1, this.dimensions.x, this.dimensions.y),
          );
          const width = Math.max(1, Math.floor(this.dimensions.x * scale));
          const height = Math.max(1, Math.floor(this.dimensions.y * scale));

          let needsValidation = false;
          if (!this.pass) {
            this.pass = new GTAOPass(this.scene, this.camera, width, height);
            this.pass.output = GTAOPass.OUTPUT.Off;
            this.pass.updateGtaoMaterial({
              samples: 16,
              scale: 1,
              screenSpaceRadius: false,
            });
            this.pass.updatePdMaterial({ samples: 8 });
            needsValidation = true;
          } else if (this.pass.width !== width || this.pass.height !== height) {
            this.pass.setSize(width, height);
            needsValidation = true;
          }
          const pass = this.pass;
          if (needsValidation) this.validateTargets(pass);
          pass.updateGtaoMaterial({
            radius: options.radius,
            thickness: options.radius,
          });

          if (this.masks.size === 0) {
            for (const mesh of this.meshes) {
              this.masks.set(mesh, mesh.layers.mask);
              mesh.layers.enable(MOLECULE_LAYER);
            }
          }
          this.camera.layers.set(MOLECULE_LAYER);
          // Off still computes normal/depth, GTAO and denoise. Neither buffer
          // argument is accessed, and gtaoMap exposes the denoised target directly.
          pass.render(
            this.renderer,
            pass.gtaoRenderTarget,
            pass.gtaoRenderTarget,
            0,
            false,
          );
          this.uniforms.eigenvistaMolecularAo.value = pass.gtaoMap;
          this.uniforms.eigenvistaMolecularAoViewport.value.copy(
            this.dimensions,
          );
          this.uniforms.eigenvistaMolecularAoStrength.value = options.strength;
          if (this.bindings.length === 0) {
            this.attachMaterials();
            attachedMaterials = true;
          }
        });
        // Compile only the registered molecular instances with the main scene's
        // lights, after the target/camera layers are restored. Hooks and driver
        // diagnostics record failures without throwing through Three's stacks.
        if (attachedMaterials && this.pendingShaderError === null) {
          for (const mesh of this.meshes)
            this.renderer.compile(mesh, this.camera, this.scene);
          // Program validation is lazy in the pinned renderer. Force first use
          // while our scoped, nonthrowing diagnostics are still installed.
          for (const program of this.renderer.info.programs ?? []) {
            if (program.cacheKey.includes(AO_PROGRAM_KEY))
              program.getUniforms();
          }
        }
      });
      if (this.pendingShaderError !== null) throw this.pendingShaderError;
    } catch (error) {
      throw this.failure(error);
    }
  }

  dispose(): void {
    this.deactivate();
    this.meshes = [];
    this.disposed = true;
  }

  private validateTargets(pass: GTAOPass): void {
    // The pinned implementation exposes this target, but @types/three does not.
    const normal = (
      pass as GTAOPass & { normalRenderTarget?: THREE.WebGLRenderTarget }
    ).normalRenderTarget;
    if (!normal?.isWebGLRenderTarget)
      throw new Error("The AO normal/depth target is unavailable.");
    const gl = this.renderer.getContext();
    for (const target of [normal, pass.gtaoRenderTarget, pass.pdRenderTarget]) {
      this.renderer.initRenderTarget(target);
      this.renderer.setRenderTarget(target);
      const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
      if (status !== gl.FRAMEBUFFER_COMPLETE)
        throw new Error(
          `An AO framebuffer is incomplete (0x${status.toString(16)}).`,
        );
    }
  }

  private attachMaterials(): void {
    const materials = new Set<THREE.MeshStandardMaterial>();
    for (const mesh of this.meshes) {
      const candidates = Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];
      for (const material of candidates) {
        if (!(material instanceof THREE.MeshStandardMaterial))
          throw new Error(
            "Molecular AO requires standard atom/bond materials.",
          );
        materials.add(material);
      }
    }
    for (const material of materials) {
      // The pinned renderer caches program variants but keeps one uniform map
      // per material. A baseline draw between enables can replace that map;
      // force fresh hook binding without replacing the material/instance data.
      material.dispose();
      const beforeCompile = material.onBeforeCompile;
      const cacheKey = material.customProgramCacheKey;
      const uniforms = this.uniforms;
      const controller = this;
      const hook: THREE.Material["onBeforeCompile"] = function (
        this: THREE.Material,
        shader,
        renderer,
      ) {
        const vertexShader = shader.vertexShader;
        const fragmentShader = shader.fragmentShader;
        const originalUniforms = { ...shader.uniforms };
        try {
          beforeCompile.call(this, shader, renderer);
          if (
            !shader.fragmentShader.includes(AO_CHUNK) ||
            shader.fragmentShader.indexOf(AO_CHUNK) !==
              shader.fragmentShader.lastIndexOf(AO_CHUNK)
          )
            throw new Error(
              "The molecular AO shader integration point changed.",
            );
          Object.assign(shader.uniforms, uniforms);
          shader.fragmentShader =
            "uniform sampler2D eigenvistaMolecularAo;\n" +
            "uniform vec2 eigenvistaMolecularAoViewport;\n" +
            "uniform float eigenvistaMolecularAoStrength;\n" +
            shader.fragmentShader.replace(
              AO_CHUNK,
              `${AO_CHUNK}\nreflectedLight.indirectDiffuse *= mix(1.0, clamp(texture2D(eigenvistaMolecularAo, gl_FragCoord.xy / eigenvistaMolecularAoViewport).r, 0.0, 1.0), eigenvistaMolecularAoStrength);`,
            );
        } catch (error) {
          // Throwing through Three's compile/render callbacks can leave its
          // internal stacks unbalanced. Finish with the original shader, then
          // report and deactivate after the owned compile call has returned.
          shader.vertexShader = vertexShader;
          shader.fragmentShader = fragmentShader;
          shader.uniforms = originalUniforms;
          controller.pendingShaderError ??= error;
        }
      };
      const keyHook: THREE.Material["customProgramCacheKey"] = function (
        this: THREE.Material,
      ) {
        try {
          return `${cacheKey.call(this)}|${AO_PROGRAM_KEY}`;
        } catch (error) {
          controller.pendingShaderError ??= error;
          return `molecular-fallback|${AO_PROGRAM_KEY}`;
        }
      };
      this.bindings.push({ material, beforeCompile, cacheKey, hook, keyHook });
      material.onBeforeCompile = hook;
      material.customProgramCacheKey = keyHook;
      material.needsUpdate = true;
    }
  }

  private withShaderDiagnostics(draw: () => void): void {
    const debug = this.renderer.debug;
    const checkShaderErrors = debug.checkShaderErrors;
    const onShaderError = debug.onShaderError;
    debug.checkShaderErrors = true;
    debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      // This scope renders/compiles only the owned AO pass and molecule shaders.
      // Never invoke a potentially throwing external callback inside Three.
      try {
        const logs = [
          gl.getProgramInfoLog(program),
          gl.getShaderInfoLog(vertexShader),
          gl.getShaderInfoLog(fragmentShader),
        ]
          .filter(Boolean)
          .map((log) => log!.slice(0, 4096))
          .join("\n");
        this.pendingShaderError ??= new Error(
          `An AO shader failed to link${logs ? `: ${logs}` : "."}`,
        );
      } catch (error) {
        this.pendingShaderError ??= error;
      }
    };
    try {
      draw();
    } finally {
      debug.onShaderError = onShaderError;
      debug.checkShaderErrors = checkShaderErrors;
    }
  }

  private withRestoredState(draw: () => void): void {
    const renderer = this.renderer;
    const target = renderer.getRenderTarget();
    const cubeFace = renderer.getActiveCubeFace();
    const mipmapLevel = renderer.getActiveMipmapLevel();
    const viewport = renderer.getViewport(new THREE.Vector4());
    const scissor = renderer.getScissor(new THREE.Vector4());
    const scissorTest = renderer.getScissorTest();
    const gl = renderer.getContext();
    const effectiveViewport = new THREE.Vector4().fromArray(
      gl.getParameter(gl.VIEWPORT) as Int32Array,
    );
    const effectiveScissor = new THREE.Vector4().fromArray(
      gl.getParameter(gl.SCISSOR_BOX) as Int32Array,
    );
    const effectiveScissorTest = gl.isEnabled(gl.SCISSOR_TEST);
    const clearColor = renderer.getClearColor(new THREE.Color()).clone();
    const clearAlpha = renderer.getClearAlpha();
    const autoClear = renderer.autoClear;
    const overrideMaterial = this.scene.overrideMaterial;
    const layers = this.camera.layers.mask;
    const hidden: THREE.Object3D[] = [];
    // GTAOPass temporarily hides these even outside the selected layer. Retain
    // them here too, because its own restoration is not protected on exceptions.
    this.scene.traverse((object) => {
      const candidate = object as THREE.Object3D & {
        isPoints?: boolean;
        isLine?: boolean;
        isLine2?: boolean;
      };
      if (
        object.visible &&
        (candidate.isPoints || candidate.isLine || candidate.isLine2)
      )
        hidden.push(object);
    });
    try {
      draw();
    } finally {
      for (const object of hidden) object.visible = true;
      this.camera.layers.mask = layers;
      this.scene.overrideMaterial = overrideMaterial;
      renderer.autoClear = autoClear;
      renderer.setClearColor(clearColor, clearAlpha);
      renderer.setViewport(viewport);
      renderer.setScissor(scissor);
      renderer.setScissorTest(scissorTest);
      if (target) {
        // setRenderTarget copies target-owned physical rectangles over any
        // manual viewport/scissor overrides. Temporarily supply the saved
        // effective rectangles so Three's internal current state is restored,
        // without changing the target's own configuration.
        const targetViewport = target.viewport.clone();
        const targetScissor = target.scissor.clone();
        const targetScissorTest = target.scissorTest;
        try {
          target.viewport.copy(effectiveViewport);
          target.scissor.copy(effectiveScissor);
          target.scissorTest = effectiveScissorTest;
          renderer.setRenderTarget(target, cubeFace, mipmapLevel);
        } finally {
          target.viewport.copy(targetViewport);
          target.scissor.copy(targetScissor);
          target.scissorTest = targetScissorTest;
        }
      } else {
        renderer.setRenderTarget(null, cubeFace, mipmapLevel);
      }
      // Retain exact physical rectangles, including fractional-DPR rounding,
      // while updating Three's GL state cache rather than bypassing it.
      renderer.state.viewport(effectiveViewport);
      renderer.state.scissor(effectiveScissor);
      renderer.state.setScissorTest(effectiveScissorTest);
    }
  }

  private failure(error: unknown): MolecularAmbientOcclusionError {
    this.failed = true;
    const releasePrograms = this.pendingShaderError !== null;
    this.pendingShaderError = null;
    this.deactivate(releasePrograms);
    return error instanceof MolecularAmbientOcclusionError
      ? error
      : new MolecularAmbientOcclusionError(error);
  }

  private deactivate(releasePrograms = false): void {
    for (const { material, beforeCompile, cacheKey, hook, keyHook } of this
      .bindings) {
      if (material.onBeforeCompile === hook)
        material.onBeforeCompile = beforeCompile;
      if (material.customProgramCacheKey === keyHook)
        material.customProgramCacheKey = cacheKey;
      material.needsUpdate = true;
      if (releasePrograms) {
        // A failed linked program is cached by material even after removing the
        // hook. Release those GPU programs so OFF/ON can retry the same object.
        try {
          material.dispose();
        } catch {
          // Keep cleanup nonthrowing; the caller still owns the material object.
        }
      }
    }
    this.bindings = [];
    for (const [mesh, mask] of this.masks) mesh.layers.mask = mask;
    this.masks.clear();
    this.uniforms.eigenvistaMolecularAo.value = null;
    this.uniforms.eigenvistaMolecularAoStrength.value = 0;
    const pass = this.pass;
    this.pass = null;
    if (pass) {
      // The pinned GTAOPass owns its targets/depth texture/noise, but omits these
      // two materials from dispose(). Cleanup must not prevent the direct draw.
      for (const release of [
        () => pass.dispose(),
        () => pass.gtaoMaterial.dispose(),
        () => pass.blendMaterial.dispose(),
      ]) {
        try {
          release();
        } catch {
          // A lost context or failed allocation must still allow disabling AO.
        }
      }
    }
  }
}
