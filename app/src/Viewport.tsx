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
  attachSurfaceColors,
  buildSurfaceMaterial,
  formatShaderLog,
  validateShaderMaterial,
  type ShaderPair,
} from "./shaderTools";
import { volumeObject } from "./volume";

const BOHR = 0.529177210903;
const elements: Record<
  number,
  { symbol: string; color: string; radius: number }
> = {
  1: { symbol: "H", color: "#ffffff", radius: 1.20 },
  2: { symbol: "He", color: "#ffffff", radius: 1.40 },
  3: { symbol: "Li", color: "#b34d00", radius: 1.82 },
  4: { symbol: "Be", color: "#66ff54", radius: 1.53 },
  5: { symbol: "B", color: "#5ca1ff", radius: 1.92 },
  6: { symbol: "C", color: "#808080", radius: 1.70 },
  7: { symbol: "N", color: "#0000ff", radius: 1.55 },
  8: { symbol: "O", color: "#ff0000", radius: 1.52 },
  9: { symbol: "F", color: "#b34de6", radius: 1.47 },
  10: { symbol: "Ne", color: "#ffffff", radius: 1.54 },
  11: { symbol: "Na", color: "#b34d00", radius: 2.27 },
  12: { symbol: "Mg", color: "#66ff54", radius: 1.73 },
  13: { symbol: "Al", color: "#5ca1ff", radius: 1.84 },
  14: { symbol: "Si", color: "#0033ff", radius: 2.10 },
  15: { symbol: "P", color: "#00ff00", radius: 1.80 },
  16: { symbol: "S", color: "#e6e600", radius: 1.80 },
  17: { symbol: "Cl", color: "#e6e600", radius: 1.75 },
  18: { symbol: "Ar", color: "#ffffff", radius: 1.88 },
  19: { symbol: "K", color: "#b34d00", radius: 2.75 },
  20: { symbol: "Ca", color: "#66ff54", radius: 2.31 },
  21: { symbol: "Sc", color: "#e6e600", radius: 2.11 },
  22: { symbol: "Ti", color: "#e6e600", radius: 2.00 },
  23: { symbol: "V", color: "#e6e600", radius: 2.00 },
  24: { symbol: "Cr", color: "#e6e600", radius: 2.00 },
  25: { symbol: "Mn", color: "#e6e600", radius: 2.00 },
  26: { symbol: "Fe", color: "#e6e600", radius: 2.00 },
  27: { symbol: "Co", color: "#e6e600", radius: 2.00 },
  28: { symbol: "Ni", color: "#e6e600", radius: 1.63 },
  29: { symbol: "Cu", color: "#e6e600", radius: 1.40 },
  30: { symbol: "Zn", color: "#e6e600", radius: 1.39 },
  31: { symbol: "Ga", color: "#5ca1ff", radius: 1.87 },
  32: { symbol: "Ge", color: "#0033ff", radius: 2.11 },
  33: { symbol: "As", color: "#b34d00", radius: 1.85 },
  34: { symbol: "Se", color: "#009900", radius: 1.90 },
  35: { symbol: "Br", color: "#b34de6", radius: 1.85 },
  36: { symbol: "Kr", color: "#ffffff", radius: 2.02 },
  37: { symbol: "Rb", color: "#b34d00", radius: 3.03 },
  38: { symbol: "Sr", color: "#66ff54", radius: 2.49 },
  39: { symbol: "Y", color: "#009900", radius: 2.19 },
  40: { symbol: "Zr", color: "#009900", radius: 2.12 },
  41: { symbol: "Nb", color: "#009900", radius: 2.17 },
  42: { symbol: "Mo", color: "#009900", radius: 2.10 },
  43: { symbol: "Tc", color: "#009900", radius: 2.05 },
  44: { symbol: "Ru", color: "#009900", radius: 2.05 },
  45: { symbol: "Rh", color: "#009900", radius: 2.00 },
  46: { symbol: "Pd", color: "#009900", radius: 1.63 },
  47: { symbol: "Ag", color: "#009900", radius: 1.72 },
  48: { symbol: "Cd", color: "#009900", radius: 1.58 },
  49: { symbol: "In", color: "#5ca1ff", radius: 1.93 },
  50: { symbol: "Sn", color: "#333333", radius: 2.17 },
  51: { symbol: "Sb", color: "#b34d00", radius: 2.06 },
  52: { symbol: "Te", color: "#009900", radius: 2.06 },
  53: { symbol: "I", color: "#b34de6", radius: 1.98 },
  54: { symbol: "Xe", color: "#ffffff", radius: 2.16 },
  55: { symbol: "Cs", color: "#b34d00", radius: 3.43 },
  56: { symbol: "Ba", color: "#66ff54", radius: 2.68 },
  57: { symbol: "La", color: "#e6e600", radius: 2.43 },
  58: { symbol: "Ce", color: "#009900", radius: 2.42 },
  59: { symbol: "Pr", color: "#009900", radius: 2.40 },
  60: { symbol: "Nd", color: "#009900", radius: 2.39 },
  61: { symbol: "Pm", color: "#009900", radius: 2.38 },
  62: { symbol: "Sm", color: "#009900", radius: 2.36 },
  63: { symbol: "Eu", color: "#009900", radius: 2.35 },
  64: { symbol: "Gd", color: "#009900", radius: 2.34 },
  65: { symbol: "Tb", color: "#009900", radius: 2.33 },
  66: { symbol: "Dy", color: "#009900", radius: 2.31 },
  67: { symbol: "Ho", color: "#009900", radius: 2.30 },
  68: { symbol: "Er", color: "#009900", radius: 2.29 },
  69: { symbol: "Tm", color: "#009900", radius: 2.27 },
  70: { symbol: "Yb", color: "#009900", radius: 2.26 },
  71: { symbol: "Lu", color: "#009900", radius: 2.24 },
  72: { symbol: "Hf", color: "#e6e600", radius: 2.23 },
  73: { symbol: "Ta", color: "#e6e600", radius: 2.22 },
  74: { symbol: "W", color: "#e6e600", radius: 2.18 },
  75: { symbol: "Re", color: "#e6e600", radius: 2.16 },
  76: { symbol: "Os", color: "#e6e600", radius: 2.16 },
  77: { symbol: "Ir", color: "#e6e600", radius: 2.13 },
  78: { symbol: "Pt", color: "#e6e600", radius: 1.75 },
  79: { symbol: "Au", color: "#e6e600", radius: 1.66 },
  80: { symbol: "Hg", color: "#e6e600", radius: 1.55 },
  81: { symbol: "Tl", color: "#5ca1ff", radius: 1.96 },
  82: { symbol: "Pb", color: "#333333", radius: 2.02 },
  83: { symbol: "Bi", color: "#b34d00", radius: 2.07 },
  84: { symbol: "Po", color: "#009900", radius: 1.97 },
  85: { symbol: "At", color: "#b34de6", radius: 2.02 },
  86: { symbol: "Rn", color: "#ffffff", radius: 2.20 },
  87: { symbol: "Fr", color: "#b34d00", radius: 3.48 },
  88: { symbol: "Ra", color: "#66ff54", radius: 2.83 },
  89: { symbol: "Ac", color: "#e6e600", radius: 2.47 },
  90: { symbol: "Th", color: "#b34d00", radius: 2.45 },
  91: { symbol: "Pa", color: "#b34d00", radius: 2.43 },
  92: { symbol: "U", color: "#b34d00", radius: 2.41 },
  93: { symbol: "Np", color: "#b34d00", radius: 2.39 },
  94: { symbol: "Pu", color: "#b34d00", radius: 2.43 },
  95: { symbol: "Am", color: "#b34d00", radius: 2.44 },
  96: { symbol: "Cm", color: "#b34d00", radius: 2.45 },
  97: { symbol: "Bk", color: "#b34d00", radius: 2.44 },
  98: { symbol: "Cf", color: "#b34d00", radius: 2.45 },
  99: { symbol: "Es", color: "#b34d00", radius: 2.45 },
  100: { symbol: "Fm", color: "#b34d00", radius: 2.45 },
  101: { symbol: "Md", color: "#b34d00", radius: 2.46 },
  102: { symbol: "No", color: "#b34d00", radius: 2.46 },
  103: { symbol: "Lr", color: "#b34d00", radius: 2.46 },
  // No measured van der Waals radii exist for Rf-Og. Radii extrapolated from
  // each element's group congener above (Rf<-Hf ... Og<-Rn); colors follow
  // the same group palette as the table (transition metals yellow, group 13
  // light blue, 14 dark gray, 15 brown, 16 dark green, 17 purple, 18 white).
  104: { symbol: "Rf", color: "#e6e600", radius: 2.23 },
  105: { symbol: "Db", color: "#e6e600", radius: 2.22 },
  106: { symbol: "Sg", color: "#e6e600", radius: 2.18 },
  107: { symbol: "Bh", color: "#e6e600", radius: 2.16 },
  108: { symbol: "Hs", color: "#e6e600", radius: 2.16 },
  109: { symbol: "Mt", color: "#e6e600", radius: 2.13 },
  110: { symbol: "Ds", color: "#e6e600", radius: 1.75 },
  111: { symbol: "Rg", color: "#e6e600", radius: 1.66 },
  112: { symbol: "Cn", color: "#e6e600", radius: 1.55 },
  113: { symbol: "Nh", color: "#5ca1ff", radius: 1.96 },
  114: { symbol: "Fl", color: "#333333", radius: 2.02 },
  115: { symbol: "Mc", color: "#b34d00", radius: 2.07 },
  116: { symbol: "Lv", color: "#009900", radius: 1.97 },
  117: { symbol: "Ts", color: "#b34de6", radius: 2.02 },
  118: { symbol: "Og", color: "#ffffff", radius: 2.20 },
};
export function symbol(z: number) {
  return elements[z]?.symbol ?? `Z${z}`;
}

const IDENTITY_QUATERNION = new THREE.Quaternion();

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
  shading,
  shader,
  reset,
  onSelect,
  onShaderLog,
}: {
  doc: EigenVistaDocument;
  grid: SampledGrid | null;
  mode: RenderMode;
  shading: SurfaceShading;
  shader: (ShaderPair & { target: string }) | null;
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
    fit: () => void;
    needsRender: boolean;
  } | null>(null);
  const selection = useRef(onSelect);
  selection.current = onSelect;
  const shaderRef = useRef(shader);
  shaderRef.current = shader;
  const onShaderLogRef = useRef(onShaderLog);
  onShaderLogRef.current = onShaderLog;
  const [error, setError] = useState("");
  useEffect(() => {
    const div = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        preserveDrawingBuffer: true,
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
          renderer.render(scene, camera);
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
        const atomMaterial = new THREE.MeshStandardMaterial({ roughness: 0.34 });
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
          const element = elements[z] ?? {
            symbol: `Z${z}`,
            color: "#b294b9",
            radius: 1.8,
          };
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
          tint.set(element.color);
          atoms.setColorAt(i, tint);
          const angstrom = point.map((v) => (v * BOHR).toFixed(3)).join(", ");
          labels.push(`${element.symbol} ${i + 1} | ${angstrom} angstrom`);
        }
        atoms.instanceMatrix.needsUpdate = true;
        if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
        atoms.userData.instanceLabels = labels;
        group.add(atoms);
      }
      if (doc.view.representation !== "space-fill") {
        const bondRadius = doc.view.representation === "liquorice" ? 0.28 : 0.105;
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
          ),
        );
    } catch (error) {
      dispose(group);
      setError(
        `Unable to prepare the new scene: ${String(error)}. The previous scene is still displayed. Try a lower grid resolution or fewer surfaces.`,
      );
      return;
    }
    dispose(e.group);
    e.group.clear();
    e.group.add(group);
    if (!e.renderer.getContext().isContextLost()) setError("");
    e.needsRender = true;
  }, [
    doc,
    grid,
    mode,
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
      }
    });
    e.needsRender = true;
  }, [shader?.values]);
  useEffect(() => {
    engine.current?.fit();
  }, [reset, doc.id]);
  function screenshot() {
    const e = engine.current;
    if (!e) return;
    try {
      e.renderer.render(e.scene, e.camera);
      const a = document.createElement("a");
      a.download = "eigenvista-view.png";
      a.href = e.renderer.domElement.toDataURL("image/png");
      a.click();
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
