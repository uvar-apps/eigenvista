import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Focus, Camera, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import type {
  EigenVistaDocument,
  SampledGrid,
  RenderMode,
  SurfaceShading,
} from "./types";
import {
  applyUniformValues,
  applyShaderTransparency,
  attachSurfaceColors,
  buildSurfaceMaterial,
  formatShaderLog,
  validateShaderMaterial,
  type ShaderPair,
} from "./shaderTools";
import { volumeObject, type VolumeQuality } from "./volume";
import {
  MolecularAmbientOcclusion,
  BOHR_ANGSTROM as BOHR,
} from "./molecularAmbientOcclusion";
import { elementDisplay } from "./elements";
import { resolveAtomColor, type AtomPalette } from "./atomColors";

export function symbol(z: number) {
  return elementDisplay(z).symbol;
}

const IDENTITY_QUATERNION = new THREE.Quaternion();

export interface AmbientOcclusionSettings {
  enabled: boolean;
  strength: number;
  radiusAngstrom: number;
}
const DEFAULT_AMBIENT_OCCLUSION: AmbientOcclusionSettings = {
  enabled: false,
  strength: 1,
  radiusAngstrom: 3,
};

/**
 * Resolve the selection label for a raycast hit. Instanced meshes carry one label
 * per instance rather than one per object, so the instance index selects the text.
 */
function labelForHit(hit: THREE.Intersection): string | undefined {
  const data = hit.object.userData;
  if (Array.isArray(data.instanceLabels) && hit.instanceId != null)
    return data.instanceLabels[hit.instanceId];
  return data.label as string | undefined;
}

function dispose(group: THREE.Object3D) {
  group.traverse((o) => {
    if (o instanceof THREE.InstancedMesh) o.dispose();
    if (o instanceof THREE.Mesh) {
      o.geometry.dispose();
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        m.dispose();
      o.userData.texture?.dispose();
      o.userData.rangesTexture?.dispose();
    }
  });
}

function surfaceMaterial(
  s: {
    color: string;
    opacity: number;
  },
  shading: SurfaceShading,
) {
  if (shading === "blinn-phong") {
    return new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      transparent: s.opacity < 1,
      side: THREE.DoubleSide,
      depthWrite: s.opacity >= 1,
      uniforms: {
        color: { value: new THREE.Color(s.color) },
        opacity: { value: s.opacity },
      },
      vertexShader: `out vec3 vNormal; out vec3 vWorld;
        void main() {
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 p = modelMatrix * vec4(position, 1.0);
          vWorld = p.xyz;
          gl_Position = projectionMatrix * viewMatrix * p;
        }`,
      fragmentShader: `precision highp float;
        out vec4 outputColor;
        #define gl_FragColor outputColor
        in vec3 vNormal; in vec3 vWorld;
        uniform vec3 color; uniform float opacity;
        void main() {
          vec3 n = normalize(vNormal);
          if (!gl_FrontFacing) n = -n;
          vec3 L = normalize(vec3(0.4, 0.7, 1.0));
          vec3 V = normalize(cameraPosition - vWorld);
          vec3 H = normalize(L + V);
          float ndl = abs(dot(n, L));
          float ndh = pow(max(abs(dot(n, H)), 0.0), 64.0);
          float light = 0.22 + 0.48 * ndl + 1.1 * ndh;
          outputColor = vec4(color * light, opacity);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: s.color,
    opacity: s.opacity,
    transparent: s.opacity < 1,
    side: THREE.DoubleSide,
    roughness: 0.45,
    depthWrite: s.opacity >= 1,
  });
}

export function Viewport({
  doc,
  grid,
  mode,
  volumeQuality = 2,
  ambientOcclusion = DEFAULT_AMBIENT_OCCLUSION,
  shading,
  shader,
  atomPalette,
  reset,
  onSelect,
  onShaderLog,
}: {
  doc: EigenVistaDocument;
  grid: SampledGrid | null;
  mode: RenderMode;
  volumeQuality?: VolumeQuality;
  ambientOcclusion?: AmbientOcclusionSettings;
  shading: SurfaceShading;
  shader: (ShaderPair & { target: string }) | null;
  atomPalette?: AtomPalette;
  reset: number;
  onSelect: (text: string) => void;
  onShaderLog?: (log: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    ambientOcclusion: MolecularAmbientOcclusion;
    draw: () => void;
    fit: () => void;
    needsRender: boolean;
  } | null>(null);
  const selection = useRef(onSelect);
  selection.current = onSelect;
  const shaderRef = useRef(shader);
  shaderRef.current = shader;
  // The scene rebuild reads the palette through a ref so a colour edit does not
  // rebuild geometry; the re-tint effect below owns colour updates.
  const paletteRef = useRef(atomPalette);
  paletteRef.current = atomPalette;
  const atomsRef = useRef<number[]>([]);
  const onShaderLogRef = useRef(onShaderLog);
  onShaderLogRef.current = onShaderLog;
  const [error, setError] = useState("");
  const [occlusionError, setOcclusionError] = useState("");
  const occlusionSettings = useRef(ambientOcclusion);
  occlusionSettings.current = ambientOcclusion;
  useEffect(() => {
    const div = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: false,
      });
    } catch {
      setError(
        "WebGL2 is unavailable. Check graphics acceleration or try another device.",
      );
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor("#e8edef");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "Molecular scene");
    div.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    scene.add(new THREE.HemisphereLight(0xffffff, 0x6e7880, 2.4));
    const key = new THREE.DirectionalLight(0xffffff, 3);
    key.position.set(4, 6, 8);
    scene.add(key);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const group = new THREE.Group();
    scene.add(group);
    const occlusion = new MolecularAmbientOcclusion(renderer, scene, camera);
    // The viewport and synchronous PNG export must draw the same final frame.
    const draw = () => {
      const settings = occlusionSettings.current;
      try {
        occlusion.render({
          enabled: settings.enabled,
          strength: settings.strength,
          radius: settings.radiusAngstrom / BOHR,
        });
      } catch (cause) {
        setOcclusionError(
          "Unable to apply ambient occlusion: " +
            String(cause) +
            ". Disable and re-enable Ambient occlusion to retry.",
        );
      }
      renderer.render(scene, camera);
    };
    const fit = () => {
      const box = new THREE.Box3().setFromObject(group);
      if (box.isEmpty()) return;
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const radius = size.length() * 0.5 || 1;
      const distance =
        radius /
        Math.sin(THREE.MathUtils.degToRad(camera.fov / 2)) /
        Math.min(camera.aspect, 1);
      camera.position
        .copy(center)
        .add(
          new THREE.Vector3(0.7, 0.45, 1.4)
            .normalize()
            .multiplyScalar(distance * 1.05),
        );
      controls.target.copy(center);
      camera.near = Math.max(0.001, distance / 1000);
      camera.far = distance * 100;
      camera.updateProjectionMatrix();
      controls.update();
      if (engine.current) engine.current.needsRender = true;
    };
    engine.current = {
      renderer,
      scene,
      camera,
      controls,
      group,
      ambientOcclusion: occlusion,
      draw,
      fit,
      needsRender: true,
    };
    // Wheel and middle-drag handlers update the camera before the animation tick.
    const invalidate = () => {
      if (engine.current) engine.current.needsRender = true;
    };
    controls.addEventListener("change", invalidate);
    const resize = new ResizeObserver(() => {
      const { width, height } = div.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
      if (engine.current) engine.current.needsRender = true;
    });
    resize.observe(div);
    const ray = new THREE.Raycaster();
    let down = [0, 0];
    const pointerdown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const pointerup = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 4) return;
      const b = div.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - b.left) / b.width) * 2 - 1,
          (-(e.clientY - b.top) / b.height) * 2 + 1,
        ),
        camera,
      );
      const hits = ray.intersectObjects(group.children, true);
      for (const hit of hits) {
        const label = labelForHit(hit);
        if (label) {
          selection.current(label);
          return;
        }
      }
    };
    const lost = (e: Event) => {
      e.preventDefault();
      setError("Graphics context lost. Reload the document to recover.");
    };
    renderer.domElement.addEventListener("pointerdown", pointerdown);
    renderer.domElement.addEventListener("pointerup", pointerup);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    renderer.setAnimationLoop(() => {
      const moved = controls.update();
      if (moved || engine.current?.needsRender) {
        try {
          draw();
        } catch (error) {
          setError(
            `Unable to render the scene: ${String(error)}. Try a lower grid resolution or fewer surfaces.`,
          );
        }
        if (engine.current) engine.current.needsRender = false;
      }
    });
    return () => {
      renderer.setAnimationLoop(null);
      resize.disconnect();
      controls.removeEventListener("change", invalidate);
      controls.dispose();
      occlusion.dispose();
      dispose(group);
      renderer.dispose();
      div.removeChild(renderer.domElement);
      engine.current = null;
    };
  }, []);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const shader = shaderRef.current;
    const group = new THREE.Group();
    try {
      const columns = doc.atoms;
      const atomCount = columns.positions.length;
      // Atoms are one InstancedMesh: a single unit sphere and a single material
      // shared by every atom, with per-instance scale and colour. The previous
      // per-atom geometry + material cost 121k draw calls and 3.2 GB of heap on a
      // 66k-atom structure; this renders the same scene in one draw call.
      if (atomCount > 0) {
        const atomGeometry = new THREE.SphereGeometry(1, 24, 16);
        const atomMaterial = new THREE.MeshStandardMaterial({
          roughness: 0.34,
        });
        const atoms = new THREE.InstancedMesh(
          atomGeometry,
          atomMaterial,
          atomCount,
        );
        atoms.name = "atoms";
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const tint = new THREE.Color();
        const labels: string[] = [];
        for (let i = 0; i < atomCount; i++) {
          const point = columns.positions[i];
          const z = columns.elements[i];
          const element = elementDisplay(z);
          const radius =
            doc.view.representation === "space-fill"
              ? element.radius / BOHR
              : doc.view.representation === "liquorice"
                ? 0.28
                : z === 1
                  ? 0.32
                  : 0.52;
          position.set(point[0], point[1], point[2]);
          scale.setScalar(radius);
          matrix.compose(position, IDENTITY_QUATERNION, scale);
          atoms.setMatrixAt(i, matrix);
          tint.set(resolveAtomColor(z, paletteRef.current));
          atoms.setColorAt(i, tint);
          const angstrom = point.map((v) => (v * BOHR).toFixed(3)).join(", ");
          labels.push(`${element.symbol} ${i + 1} | ${angstrom} angstrom`);
        }
        atoms.instanceMatrix.needsUpdate = true;
        if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
        atoms.userData.instanceLabels = labels;
        atomsRef.current = Array.from(columns.elements);
        group.add(atoms);
      }
      if (doc.view.representation !== "space-fill") {
        const bondRadius =
          doc.view.representation === "liquorice" ? 0.28 : 0.105;
        const from = new THREE.Vector3();
        const to = new THREE.Vector3();
        const delta = new THREE.Vector3();
        const direction = new THREE.Vector3();
        const midpoint = new THREE.Vector3();
        const orientation = new THREE.Quaternion();
        const cylinderAxis = new THREE.Vector3(0, 1, 0);
        const placed: [number, number][] = [];
        for (const [i, j] of doc.bonds) {
          from.set(...columns.positions[i]);
          to.set(...columns.positions[j]);
          if (delta.subVectors(to, from).length() >= 1e-10) placed.push([i, j]);
        }
        if (placed.length > 0) {
          const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
          const bondMaterial = new THREE.MeshStandardMaterial({
            color: "#9ba3a8",
            roughness: 0.5,
          });
          const bonds = new THREE.InstancedMesh(
            bondGeometry,
            bondMaterial,
            placed.length,
          );
          bonds.name = "bonds";
          const matrix = new THREE.Matrix4();
          const scale = new THREE.Vector3();
          for (const [k, [i, j]] of placed.entries()) {
            from.set(...columns.positions[i]);
            to.set(...columns.positions[j]);
            const length = delta.subVectors(to, from).length();
            direction.copy(delta).multiplyScalar(1 / length);
            orientation.setFromUnitVectors(cylinderAxis, direction);
            midpoint.addVectors(from, to).multiplyScalar(0.5);
            scale.set(bondRadius, length, bondRadius);
            matrix.compose(midpoint, orientation, scale);
            bonds.setMatrixAt(k, matrix);
          }
          bonds.instanceMatrix.needsUpdate = true;
          group.add(bonds);
        }
      }
      for (const s of doc.surfaces) {
        if (
          !s.visible ||
          (mode !== "mesh" && grid && s.field === doc.view.field)
        )
          continue;
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.Float32BufferAttribute(s.positions, 3),
        );
        geometry.setAttribute(
          "normal",
          new THREE.Float32BufferAttribute(s.normals, 3),
        );
        geometry.setIndex(s.indices);
        const usesCustom =
          shader && (shader.target === "all" || shader.target === s.id);
        if (shader)
          attachSurfaceColors(geometry, s.color, s.positions.length / 3);
        const mesh = new THREE.Mesh(
          geometry,
          usesCustom && shader
            ? buildSurfaceMaterial(shader, s)
            : surfaceMaterial(s, shading),
        );
        if (usesCustom) mesh.userData.customShader = true;
        mesh.userData.label = `${s.label} | ${(s.indices.length / 3).toLocaleString()} triangles`;
        group.add(mesh);
      }
      if (shader) {
        // Compile once so GLSL errors surface in the shader panel.
        const sample = group.children.find(
          (obj) => obj instanceof THREE.Mesh && obj.userData.customShader,
        ) as THREE.Mesh | undefined;
        if (sample && sample.material instanceof THREE.ShaderMaterial) {
          const log = formatShaderLog(
            validateShaderMaterial(e.renderer, sample.material),
          );
          onShaderLogRef.current?.(log);
        }
      }
      if (grid && mode !== "mesh")
        group.add(
          volumeObject(
            grid,
            mode,
            doc.view.isovalue,
            doc.view.positive_color,
            doc.view.negative_color,
            doc.view.opacity,
            e.renderer.extensions.has("OES_texture_float_linear"),
            shading,
            volumeQuality,
          ),
        );
    } catch (error) {
      dispose(group);
      setError(
        `Unable to prepare the new scene: ${String(error)}. The previous scene is still displayed. Try a lower grid resolution or fewer surfaces.`,
      );
      return;
    }
    e.ambientOcclusion.setMolecules(
      group.children.filter(
        (object): object is THREE.InstancedMesh =>
          object instanceof THREE.InstancedMesh,
      ),
    );
    setOcclusionError("");
    dispose(e.group);
    e.group.clear();
    e.group.add(group);
    if (!e.renderer.getContext().isContextLost()) setError("");
    e.needsRender = true;
  }, [
    doc,
    grid,
    mode,
    volumeQuality,
    shading,
    shader?.vertexSource,
    shader?.fragmentSource,
    shader?.target,
  ]);
  useEffect(() => {
    const e = engine.current;
    const active = shaderRef.current;
    if (!e || !active) return;
    e.group.traverse((obj) => {
      if (
        obj instanceof THREE.Mesh &&
        obj.userData.customShader &&
        obj.material instanceof THREE.ShaderMaterial
      ) {
        applyUniformValues(obj.material, active.uniforms, active.values);
        applyShaderTransparency(obj.material, active.transparent !== false);
      }
    });
    e.needsRender = true;
  }, [shader?.values, shader?.transparent]);
  /**
   * Re-tint atoms in place when the palette changes. Geometry is untouched: the
   * rebuild effect reads the palette through `paletteRef` and so is not keyed on
   * it, which keeps a colour edit from rebuilding the whole scene.
   */
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    const atoms = e.group.getObjectByName("atoms");
    if (!(atoms instanceof THREE.InstancedMesh)) return;
    const elements = atomsRef.current;
    const tint = new THREE.Color();
    for (let i = 0; i < elements.length; i++) {
      tint.set(resolveAtomColor(elements[i], atomPalette));
      atoms.setColorAt(i, tint);
    }
    if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
    e.needsRender = true;
  }, [atomPalette]);
  useEffect(() => {
    engine.current?.fit();
  }, [reset, doc.id]);
  useEffect(() => {
    const current = engine.current;
    if (!current) return;
    if (!ambientOcclusion.enabled || ambientOcclusion.strength === 0) {
      // Release targets immediately, including after a failed enable attempt.
      current.ambientOcclusion.render({
        enabled: false,
        strength: 0,
        radius: 1,
      });
      setOcclusionError("");
    }
    current.needsRender = true;
  }, [ambientOcclusion]);
  function screenshot() {
    const e = engine.current;
    if (!e) return;
    try {
      if (e.renderer.getContext().isContextLost())
        throw new Error("Graphics context is lost");
      // Read the freshly rendered frame in the same task, before the browser
      // can discard this non-preserved drawing buffer. Export needs no
      // persistent render target and does not change the camera or document.
      e.draw();
      const a = document.createElement("a");
      a.download = "eigenvista-view.png";
      a.href = e.renderer.domElement.toDataURL("image/png");
      if (!a.href.startsWith("data:image/png;"))
        throw new Error("The scene image could not be encoded as PNG");
      a.click();
      setError((current) =>
        current.startsWith("Unable to export the scene image:") ? "" : current,
      );
    } catch (error) {
      setError(`Unable to export the scene image: ${String(error)}.`);
    }
  }
  return (
    <div className="scene-wrap">
      <div className="scene" ref={host} data-testid="viewport" />
      {error && (
        <div className="viewport-error" role="alert">
          {error}
        </div>
      )}
      {occlusionError && (
        <div className="viewport-error" role="alert">
          {occlusionError}
        </div>
      )}
      <div className="viewport-tools">
        <button
          title="Zoom in"
          aria-label="Zoom in"
          onClick={() => engine.current?.controls.dollyIn(0.8)}
        >
          <ZoomIn size={18} />
        </button>
        <button
          title="Zoom out"
          aria-label="Zoom out"
          onClick={() => engine.current?.controls.dollyOut(0.8)}
        >
          <ZoomOut size={18} />
        </button>
        <button
          title="Fit scene"
          aria-label="Fit scene"
          onClick={() => engine.current?.fit()}
        >
          <Focus size={18} />
        </button>
        <button
          title="Reset view"
          aria-label="Reset view"
          onClick={() => engine.current?.fit()}
        >
          <RotateCcw size={18} />
        </button>
        <button
          title="Export image"
          aria-label="Export image"
          onClick={screenshot}
        >
          <Camera size={18} />
        </button>
      </div>
      <div className="scene-label">
        <span>
          {mode === "mesh"
            ? "Surface geometry"
            : mode === "raycast"
              ? "Sampled raycast preview"
              : "Volume preview"}
        </span>
        <span>Bohr coordinates</span>
      </div>
    </div>
  );
}
