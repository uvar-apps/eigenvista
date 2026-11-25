import {
  attachPotential,
  drawCenteredPotentialKey,
  drawPotentialKey,
  potentialColors,
  POTENTIAL_RAMP_GLSL,
  type PotentialKey,
} from "./electrostaticRendering";
import { usesVertexColorPhong } from "./control/presets";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import {
  Focus,
  Camera,
  ImageDown,
  RotateCcw,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
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
import { SurfaceTransparency } from "./surfaceTransparency";
import { addSceneLighting, SURFACE_LIGHTING_GLSL } from "./sceneLighting";
import {
  MolecularAmbientOcclusion,
  BOHR_ANGSTROM as BOHR,
} from "./molecularAmbientOcclusion";
import { elementDisplay } from "./elements";
import { type AtomPalette } from "./atomColors";
import {
  atomDisplayColor,
  atomRepresentation,
  defaultStructureDisplay,
  isAtomVisible,
  residueLabel,
  type StructureDisplayState,
} from "./molecularDisplay";
import {
  createProteinGeometry,
  isProteinRepresentation,
  proteinHitLabel,
  retintProteinGeometry,
} from "./proteinGeometry";
import { useProteinBackbone } from "./useProteinBackbone";
import { buildAnnotations, updateAnnotationScale } from "./annotationRendering";
import type {
  MeasurementDefinition,
  MeasurementResult,
  InspectionPick,
} from "./inspectionTypes";
import {
  buildFieldAnalysisGroup,
  fieldAnalysisLegends,
  fieldColor,
  fieldDisplayFactor,
  fieldDisplayUnit,
} from "./fieldAnalysisRendering";
import { createScienceClient } from "./science";
import type {
  CameraState,
  ViewportControl,
  ViewportImage,
} from "./viewportControl";
const DEFAULT_STRUCTURE_DISPLAY = defaultStructureDisplay();
const DEFAULT_BACKGROUND_COLOR = "#e8edef";

export function symbol(z: number) {
  return elementDisplay(z).symbol;
}

const IDENTITY_QUATERNION = new THREE.Quaternion();

export interface AmbientOcclusionSettings {
  enabled: boolean;
  surfaceEnabled?: boolean;
  strength: number;
  radiusAngstrom: number;
  /** Resolved molecular surface radius. Defaults to the shared radius. */
  surfaceRadiusAngstrom?: number;
}
const DEFAULT_AMBIENT_OCCLUSION: AmbientOcclusionSettings = {
  enabled: false,
  surfaceEnabled: false,
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
    if (
      o instanceof THREE.Mesh ||
      o instanceof THREE.Line ||
      o instanceof THREE.Points ||
      o instanceof THREE.Sprite
    ) {
      if (!(o instanceof THREE.Sprite)) o.geometry.dispose();
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
  mapped: boolean,
) {
  if (shading === "blinn-phong" || mapped) {
    return new THREE.ShaderMaterial({
      glslVersion: THREE.GLSL3,
      transparent: s.opacity < 1,
      // Draw mapped translucent meshes back faces first. Interleaving the
      // triangles blends different potentials in marching-cubes traversal order.
      forceSinglePass: !mapped,
      side: THREE.DoubleSide,
      depthWrite: s.opacity >= 1,
      uniforms: {
        color: { value: new THREE.Color(s.color) },
        opacity: { value: s.opacity },
        ...(mapped ? { potentialStops: potentialColors } : {}),
      },
      vertexShader: `out vec3 vNormal; out vec3 vWorld;
        ${mapped ? "in float potential; out float vPotential;" : ""}
        void main() {
          vNormal = normalize(mat3(modelMatrix) * normal);
          ${mapped ? "vPotential = potential;" : ""}
          vec4 p = modelMatrix * vec4(position, 1.0);
          vWorld = p.xyz;
          gl_Position = projectionMatrix * viewMatrix * p;
        }`,
      fragmentShader: `precision highp float;
        out vec4 outputColor;
        #define gl_FragColor outputColor
        in vec3 vNormal; in vec3 vWorld;
        uniform vec3 color; uniform float opacity;
        ${mapped ? `in float vPotential; ${POTENTIAL_RAMP_GLSL}` : ""}
        ${SURFACE_LIGHTING_GLSL}
        void main() {
          vec3 n = normalize(vNormal);
          if (!gl_FrontFacing) n = -n;
          vec3 viewDirection = cameraPosition - vWorld;
          float light = sceneSurfaceLighting(n, viewDirection, ${shading === "blinn-phong"});
          ${
            mapped
              ? `float diffuse = sceneSurfaceLighting(n, viewDirection, false);
               outputColor = vec4(potentialColor(vPotential) * diffuse + vec3(light - diffuse), opacity);`
              : "outputColor = vec4(color * light, opacity);"
          }
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

// Stable defaults keep standalone/embedded viewers from rebuilding on every
// internal state update when inspection props are omitted.
const EMPTY_INSPECTION_SELECTION: number[] = [];
const EMPTY_INSPECTION_MEASUREMENTS: Array<
  MeasurementDefinition & { result: MeasurementResult }
> = [];

export function Viewport({
  doc,
  grid,
  mode,
  volumeQuality = 2,
  ambientOcclusion = DEFAULT_AMBIENT_OCCLUSION,
  shading,
  shader,
  atomPalette,
  structureDisplay = DEFAULT_STRUCTURE_DISPLAY,
  reset,
  onSelect,
  onAtomPick,
  onInspectionPick,
  inspectionSelection = EMPTY_INSPECTION_SELECTION,
  inspectedPick = null,
  inspectionMeasurements = EMPTY_INSPECTION_MEASUREMENTS,
  onShaderLog,
  controlRef,
}: {
  doc: EigenVistaDocument;
  grid: SampledGrid | null;
  mode: RenderMode;
  volumeQuality?: VolumeQuality;
  ambientOcclusion?: AmbientOcclusionSettings;
  shading: SurfaceShading;
  shader: (ShaderPair & { target: string }) | null;
  atomPalette?: AtomPalette;
  structureDisplay?: StructureDisplayState;
  reset: number;
  onSelect: (text: string) => void;
  onAtomPick?: (atom: number, source: EigenVistaDocument["atoms"]) => void;
  onInspectionPick?: (
    pick: InspectionPick,
    source: EigenVistaDocument["atoms"],
  ) => void;
  inspectionSelection?: number[];
  inspectedPick?: InspectionPick | null;
  inspectionMeasurements?: Array<
    MeasurementDefinition & { result: MeasurementResult }
  >;
  onShaderLog?: (log: string) => void;
  controlRef?: MutableRefObject<ViewportControl | null>;
}) {
  const host = useRef<HTMLDivElement>(null);
  const fieldKeyCanvas = useRef<HTMLCanvasElement>(null);
  const committedPotentialKeys = useRef<PotentialKey[]>([]);
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const [contourState, setContourState] = useState<{
    source: EigenVistaDocument["field_analysis"];
    values: Map<string, Float64Array>;
  }>({ source: undefined, values: new Map() });
  const emptyContours = useMemo(() => new Map<string, Float64Array>(), []);
  const contours =
    contourState.source === doc.field_analysis
      ? contourState.values
      : emptyContours;
  const contourPending =
    contourState.source !== doc.field_analysis &&
    (doc.field_analysis?.items.some(
      (item) =>
        item.definition.kind === "plane" &&
        item.appearance.visible &&
        item.appearance.contour_levels.length > 0,
    ) ??
      false);
  const [contourClient] = useState(createScienceClient);
  const [contourFailure, setContourFailure] = useState<{
    source: EigenVistaDocument["field_analysis"];
    message: string;
  } | null>(null);
  const contourFailureRef = useRef(contourFailure);
  contourFailureRef.current = contourFailure;
  const contourPreparationFailed =
    contourFailure !== null && contourFailure.source === doc.field_analysis;
  const contourCache = useRef(
    new Map<string, { key: string; values: Float64Array }>(),
  );
  useEffect(() => {
    let current = true;
    const source = doc.field_analysis?.items ?? [];
    const work = async () => {
      const output = new Map<string, Float64Array>();
      for (const item of source)
        if (
          item.definition.kind === "plane" &&
          item.appearance.visible &&
          item.appearance.contour_levels.length
        ) {
          const key = `${item.sample_hash}/${item.appearance.contour_levels.join("/")}`;
          const cached = contourCache.current.get(item.id);
          const values =
            cached?.key === key
              ? cached.values
              : await contourClient.request<Float64Array>("analysis_contours", {
                  item,
                });
          if (!current) return;
          contourCache.current.set(item.id, { key, values });
          output.set(item.id, values);
        }
      if (current) {
        for (const id of contourCache.current.keys())
          if (!output.has(id)) contourCache.current.delete(id);
        setContourFailure(null);
        setContourState({ source: doc.field_analysis, values: output });
      }
    };
    void work().catch((cause) => {
      if (current) {
        setContourState({ source: doc.field_analysis, values: new Map() });
        setContourFailure({
          source: doc.field_analysis,
          message: String(cause),
        });
      }
    });
    return () => {
      current = false;
      contourClient.cancel(new Error("Contour source replaced"));
    };
  }, [doc.field_analysis, contourClient]);
  const [backgroundColor, setBackgroundColor] = useState(
    DEFAULT_BACKGROUND_COLOR,
  );
  // Parent display reset is passive; never apply the previous source's indices
  // during the first render of a replacement document.
  const displayOwner = useRef({
    atoms: doc.atoms,
    structure: doc.structure,
    stale: null as StructureDisplayState | null,
  });
  if (
    displayOwner.current.atoms !== doc.atoms ||
    displayOwner.current.structure !== doc.structure
  )
    displayOwner.current = {
      atoms: doc.atoms,
      structure: doc.structure,
      stale: structureDisplay,
    };
  const display =
    displayOwner.current.stale === structureDisplay
      ? DEFAULT_STRUCTURE_DISPLAY
      : structureDisplay;
  const displayRef = useRef(display);
  displayRef.current = display;
  const layoutKey = JSON.stringify([
    display.colorMode,
    display.hiddenChains,
    display.hiddenKinds,
    display.chainStyles,
    display.kindStyles,
    display.isolatedChain,
    display.residueSelection,
    display.atomSelection,
  ]);
  const proteinNeeded = useMemo(() => {
    if (!doc.structure) return false;
    const selected = [
      doc.view.representation,
      ...Object.values(display.chainStyles),
      ...Object.values(display.kindStyles),
    ];
    if (
      !selected.some(
        (value) =>
          value &&
          isProteinRepresentation(
            value as Parameters<typeof isProteinRepresentation>[0],
          ),
      )
    )
      return false;
    return doc.atoms.positions.some(
      (_, atom) =>
        isAtomVisible(doc, display, atom) &&
        isProteinRepresentation(atomRepresentation(doc, display, atom)),
    );
  }, [doc.atoms, doc.structure, doc.view.representation, layoutKey]);
  const protein = useProteinBackbone(doc, proteinNeeded);
  const sceneInput = useMemo(
    () => ({}),
    [
      doc,
      grid,
      mode,
      volumeQuality,
      shading,
      shader?.vertexSource,
      shader?.fragmentSource,
      shader?.target,
      layoutKey,
      protein.backbone,
      proteinNeeded,
      inspectionSelection,
      inspectionMeasurements,
      contours,
    ],
  );
  const requestedScene = useRef(sceneInput);
  requestedScene.current = sceneInput;
  const committedScene = useRef<object | null>(null);
  const committedInspectedPick = useRef<InspectionPick | null>(null);
  const [proteinMessages, setProteinMessages] = useState<string[]>([]);
  const committedDoc = useRef(doc);
  const committedDisplay = useRef(display);
  const inspectionAnnotations = () => {
    const visible = (atom: number) =>
      Number.isSafeInteger(atom) &&
      atom >= 0 &&
      atom < doc.atoms.positions.length &&
      isAtomVisible(doc, displayRef.current, atom);
    const inspected =
      inspectedPick?.atoms ??
      (inspectedPick?.atom === undefined ? [] : [inspectedPick.atom]);
    return buildAnnotations(
      doc,
      inspectionMeasurements,
      inspectionSelection.filter(visible),
      inspected.filter(visible),
    );
  };
  const focusSeen = useRef<StructureDisplayState["focus"]>(null);
  const focusSource = useRef({ atoms: doc.atoms, structure: doc.structure });
  const engine = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    group: THREE.Group;
    ambientOcclusion: MolecularAmbientOcclusion;
    surfaceOcclusion: MolecularAmbientOcclusion;
    draw: (checkAllocations?: boolean) => void;
    fit: () => void;
    focus: (atoms: readonly number[]) => void;
    setUp: (up: THREE.Vector3) => void;
    setSize: (width: number, height: number) => void;
    needsRender: boolean;
    allocationPending: boolean;
  } | null>(null);
  type Engine = NonNullable<typeof engine.current>;
  const queued = useRef<
    {
      run: (current: Engine) => unknown;
      resolve: (value: unknown) => void;
      reject: (reason: unknown) => void;
      draw: boolean;
      document: EigenVistaDocument;
      waitForProtein: boolean;
      commit: number;
    }[]
  >([]);
  const [controlCommit, requestCommit] = useState(0);
  const nextControlCommit = useRef(0);
  const latestDocument = useRef(doc);
  latestDocument.current = doc;
  const proteinPending = useRef(false);
  proteinPending.current =
    (proteinNeeded && !protein.backbone && !protein.error) || contourPending;
  const selection = useRef(onSelect);
  selection.current = onSelect;
  const atomPick = useRef(onAtomPick);
  atomPick.current = onAtomPick;
  const inspectionPick = useRef(onInspectionPick);
  inspectionPick.current = onInspectionPick;
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
  const [surfaceOcclusionError, setSurfaceOcclusionError] = useState("");
  const occlusionSettings = useRef(ambientOcclusion);
  occlusionSettings.current = ambientOcclusion;
  useEffect(() => {
    const div = host.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        preserveDrawingBuffer: false,
      });
    } catch {
      setError(
        "WebGL2 is unavailable. Check graphics acceleration or try another device.",
      );
      return;
    }
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(DEFAULT_BACKGROUND_COLOR, 1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-label", "Molecular scene");
    div.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 1000);
    addSceneLighting(scene, camera);
    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    const group = new THREE.Group();
    scene.add(group);
    const transparency = new SurfaceTransparency(renderer);
    const occlusion = new MolecularAmbientOcclusion(renderer, scene, camera);
    const surfaceOcclusion = new MolecularAmbientOcclusion(
      renderer,
      scene,
      camera,
      "surfaces",
    );
    const occlusionPasses = [
      {
        pass: occlusion,
        option: "enabled",
        radius: "radiusAngstrom",
        label: "Atom and bond ambient occlusion",
        report: setOcclusionError,
      },
      {
        pass: surfaceOcclusion,
        option: "surfaceEnabled",
        radius: "surfaceRadiusAngstrom",
        label: "Molecular surface ambient occlusion",
        report: setSurfaceOcclusionError,
      },
    ] as const;
    // The viewport and synchronous PNG export must draw the same final frame.
    const draw = (checkAllocations = false) => {
      updateAnnotationScale(group, camera, renderer.domElement.clientHeight);
      const settings = occlusionSettings.current;
      for (const { pass, option, radius, label, report } of occlusionPasses) {
        try {
          pass.render({
            enabled: settings[option] === true,
            strength: settings.strength,
            radius: (settings[radius] ?? settings.radiusAngstrom) / BOHR,
          });
        } catch (cause) {
          report(
            `Unable to apply ${label.toLowerCase()}: ${String(cause)}. Disable and re-enable ${label} to retry.`,
          );
        }
      }
      transparency.render(scene, camera, group);
      // Query only at resource boundaries: getError synchronizes with the GPU
      // process and must not stall every camera/damping frame.
      if (checkAllocations || engine.current?.allocationPending) {
        if (engine.current) engine.current.allocationPending = false;
        const gl = renderer.getContext();
        if (gl.getError() === gl.OUT_OF_MEMORY)
          throw new Error(
            "The graphics device could not allocate memory for this scene",
          );
      }
      const overlay = fieldKeyCanvas.current;
      if (overlay) {
        const width = Math.max(1, renderer.domElement.width),
          height = Math.max(1, renderer.domElement.height);
        if (overlay.width !== width || overlay.height !== height) {
          overlay.width = width;
          overlay.height = height;
        }
        const context = overlay.getContext("2d");
        if (!context)
          throw new Error("Unable to allocate the field legend canvas");
        if (context) {
          context.clearRect(0, 0, width, height);
          const pixelRatio = renderer.getPixelRatio();
          context.save();
          context.scale(pixelRatio, pixelRatio);
          context.font = "600 12px system-ui, sans-serif";
          context.textBaseline = "top";
          const keys = fieldAnalysisLegends(committedDoc.current);
          const fieldKey =
            committedDoc.current.field_analysis?.show_field_key &&
            committedDoc.current.view.field;
          let keyOffset = 0;
          if (fieldKey) {
            const source = committedDoc.current;
            const description = source.field_analysis?.descriptors.find(
              (d) => d.field === fieldKey,
            );
            const unit = description
              ? fieldDisplayUnit(description)
              : "unspecified";
            const factor = description ? fieldDisplayFactor(description) : 1;
            const label =
              [...source.orbitals, ...source.densities, ...source.grids].find(
                (f) => f.id === fieldKey,
              )?.label ?? fieldKey;
            const lines = [
              `${label} · ${modeRef.current === "volume" ? "Volume transfer" : "Isovalue"}`,
            ];
            if (modeRef.current === "mesh") {
              const visible = source.surfaces.filter(
                (s) => s.field === fieldKey && s.visible && s.isovalue !== null,
              );
              lines.push(
                visible.length
                  ? visible
                      .slice(0, 6)
                      .map(
                        (s) =>
                          `${(s.isovalue! * factor).toPrecision(4)} ${unit}`,
                      )
                      .join(" / ")
                  : "No saved isosurface for this field",
              );
              if (visible.length > 6)
                lines.push(
                  `${visible.length - 6} additional saved levels; see Saved surfaces`,
                );
            } else {
              lines.push(
                `±${(source.view.isovalue * factor).toPrecision(4)} ${unit}`,
              );
              if (modeRef.current === "volume")
                lines.push(
                  `Opacity ${source.view.opacity.toFixed(2)} · |value| ramp 0.3×iso → iso`,
                );
            }
            context.lineWidth = 3;
            context.strokeStyle = "rgba(255,255,255,0.95)";
            context.fillStyle = "#172f35";
            lines.forEach((text, i) => {
              context.strokeText(text, 14, 16 + i * 18);
              context.fillText(text, 14, 16 + i * 18);
            });
            keyOffset = lines.length * 18 + 12;
          }
          keys.forEach((key, index) => {
            const x = 14,
              y = 16 + keyOffset + index * 65;
            context.lineWidth = 3;
            context.strokeStyle = "rgba(255,255,255,0.95)";
            context.fillStyle = "#172f35";
            const text = `${key.label} · ${key.unit}`;
            context.strokeText(text, x, y);
            context.fillText(text, x, y);
            if (key.min !== null && key.max !== null) {
              const gradient = context.createLinearGradient(x, y, x + 160, y);
              for (let i = 0; i <= 16; i++)
                gradient.addColorStop(
                  i / 16,
                  fieldColor(i / 16, key.colormap).getStyle(),
                );
              context.fillStyle = gradient;
              context.fillRect(x, y + 19, 160, 10);
              context.fillStyle = "#172f35";
              const range = `${key.min.toPrecision(4)} … ${key.max.toPrecision(4)}`;
              context.strokeText(range, x, y + 34);
              context.fillText(range, x, y + 34);
            } else {
              const message =
                key.status === "conversion_overflow"
                  ? "Display conversion overflow; use raw units"
                  : "Outside source domain";
              context.strokeText(message, x, y + 21);
              context.fillText(message, x, y + 21);
            }
          });
          const active = shaderRef.current;
          const potentialKeys = committedPotentialKeys.current.filter(
            (key) =>
              !key.centered ||
              active?.transparent === false ||
              Number(active?.values.opacity) > 0,
          );
          potentialKeys.forEach((key, index) => {
            if (key.centered && potentialKeys.length === 1) {
              drawCenteredPotentialKey(
                context,
                key,
                width / pixelRatio,
                height / pixelRatio,
              );
              return;
            }
            const y =
              height / pixelRatio - 36 - (potentialKeys.length - index) * 76;
            drawPotentialKey(
              context,
              key,
              14,
              y,
              Math.max(1, Math.min(220, width / pixelRatio - 28)),
            );
          });
          context.restore();
        }
      }
    };
    const rendererSize = new THREE.Vector2();
    const setSize = (width: number, height: number) => {
      renderer.getSize(rendererSize);
      const sizeChanged = rendererSize.x !== width || rendererSize.y !== height;
      const aspect = width / Math.max(height, 1);
      if (!sizeChanged && camera.aspect === aspect) return;
      if (sizeChanged) renderer.setSize(width, height);
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      if (engine.current) {
        if (sizeChanged) engine.current.allocationPending = true;
        engine.current.needsRender = true;
      }
    };
    const fitBox = (box: THREE.Box3) => {
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
    const fit = () => fitBox(new THREE.Box3().setFromObject(group));
    const focus = (indices: readonly number[]) => {
      const box = new THREE.Box3();
      const points = committedDoc.current.atoms.positions;
      for (const index of indices) {
        if (!Number.isSafeInteger(index) || index < 0 || index >= points.length)
          continue;
        const point = points[index];
        if (
          point.length === 3 &&
          point.every((value) => Number.isFinite(Math.fround(value)))
        )
          box.expandByPoint(new THREE.Vector3(...point));
      }
      if (!box.isEmpty()) fitBox(box.expandByScalar(2 / BOHR));
    };
    engine.current = {
      renderer,
      scene,
      camera,
      controls,
      group,
      ambientOcclusion: occlusion,
      surfaceOcclusion,
      draw,
      fit,
      focus,
      setSize,
      setUp: (up) => {
        if (camera.up.equals(up)) return;
        // OrbitControls fixes its up-axis quaternion at construction. Recreate
        // through its public API when the requested camera up direction changes.
        const previous = controls;
        previous.removeEventListener("change", invalidate);
        previous.dispose();
        camera.up.copy(up);
        controls = new OrbitControls(camera, renderer.domElement);
        Object.assign(controls, {
          enabled: previous.enabled,
          enableDamping: previous.enableDamping,
          dampingFactor: previous.dampingFactor,
          minDistance: previous.minDistance,
          maxDistance: previous.maxDistance,
          minZoom: previous.minZoom,
          maxZoom: previous.maxZoom,
          minTargetRadius: previous.minTargetRadius,
          maxTargetRadius: previous.maxTargetRadius,
          minPolarAngle: previous.minPolarAngle,
          maxPolarAngle: previous.maxPolarAngle,
          minAzimuthAngle: previous.minAzimuthAngle,
          maxAzimuthAngle: previous.maxAzimuthAngle,
          enableZoom: previous.enableZoom,
          enableRotate: previous.enableRotate,
          enablePan: previous.enablePan,
          zoomSpeed: previous.zoomSpeed,
          rotateSpeed: previous.rotateSpeed,
          panSpeed: previous.panSpeed,
          screenSpacePanning: previous.screenSpacePanning,
          zoomToCursor: previous.zoomToCursor,
          autoRotate: previous.autoRotate,
          autoRotateSpeed: previous.autoRotateSpeed,
        });
        controls.cursor.copy(previous.cursor);
        controls.addEventListener("change", invalidate);
        if (engine.current) engine.current.controls = controls;
      },
      needsRender: true,
      allocationPending: true,
    };
    // Wheel and middle-drag handlers update the camera before the animation tick.
    const invalidate = () => {
      if (engine.current) engine.current.needsRender = true;
    };
    controls.addEventListener("change", invalidate);
    const resize = new ResizeObserver(() => {
      const { width, height } = div.getBoundingClientRect();
      setSize(width, height);
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
        let label =
          proteinHitLabel(hit, committedDoc.current) ?? labelForHit(hit);
        if (label) {
          const data = hit.object.userData;
          let atom: number | undefined;
          let pick: InspectionPick | undefined;
          if (hit.instanceId != null && Array.isArray(data.originalAtomIndices))
            atom = data.originalAtomIndices[hit.instanceId];
          if (atom !== undefined) pick = { kind: "atom", atom };
          if (hit.instanceId != null && Array.isArray(data.originalBonds))
            pick = { kind: "bond", atoms: data.originalBonds[hit.instanceId] };
          if (data.protein && hit.object instanceof THREE.Mesh) {
            const geometry = hit.object.geometry;
            const vertex =
              hit.faceIndex != null && geometry.index
                ? geometry.index.getX(hit.faceIndex * 3)
                : hit.index;
            if (vertex != null) {
              atom = geometry.userData.proteinAtoms?.[vertex];
              pick = {
                kind: "residue",
                atom,
                residue: geometry.userData.proteinResidues?.[vertex],
                attribution: "backbone_CA",
              };
            }
          }
          if (data.surfaceId && hit.object instanceof THREE.Mesh) {
            pick = {
              kind: data.molecularSurface
                ? "molecular_surface"
                : "quantum_surface",
              surface: data.surfaceId,
              point: hit.point.toArray(),
            };
            if (data.molecularSurface && hit.faceIndex != null) {
              const vertex = hit.object.geometry.index?.getX(hit.faceIndex * 3);
              atom =
                vertex === undefined ? undefined : data.vertexAtoms?.[vertex];
              if (atom !== undefined) {
                pick.atom = atom;
                pick.attribution = "mesh_vertex";
                label += ` | mesh-vertex attribution: atom ${atom + 1}`;
              }
            }
          }
          if (atom !== undefined)
            atomPick.current?.(atom, committedDoc.current.atoms);
          if (pick) inspectionPick.current?.(pick, committedDoc.current.atoms);
          selection.current(label);
          return;
        }
      }
    };
    const lost = (e: Event) => {
      e.preventDefault();
      occlusion.resetContext();
      surfaceOcclusion.resetContext();
      transparency.releaseBuffers();
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
      surfaceOcclusion.dispose();
      transparency.dispose();
      dispose(group);
      renderer.dispose();
      div.removeChild(renderer.domElement);
      engine.current = null;
      for (const operation of queued.current.splice(0))
        operation.reject(new Error("The viewport is no longer available"));
    };
  }, []);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    e.renderer.setClearColor(backgroundColor, 1);
    e.needsRender = true;
  }, [backgroundColor]);
  useEffect(() => {
    const e = engine.current;
    if (!e) return;
    // Keep the last complete scene while the replacement plane's contours are
    // prepared. Publishing a plane without its lines causes visible flicker.
    if (contourPending || contourPreparationFailed) return;
    const shader = shaderRef.current;
    const vertexColorPhong = shader && usesVertexColorPhong(shader);
    const group = new THREE.Group();
    const opaqueMolecularSurfaces: THREE.Mesh[] = [];
    let stagedAtomIndices: number[] = [];
    let stagedMessages: string[] = [];
    const potentialKeys: PotentialKey[] = [];
    const stagedDisplay = displayRef.current;
    try {
      const columns = doc.atoms;
      const atomCount = columns.positions.length;
      const display = displayRef.current;
      const notices: string[] = [];
      let preparedProtein = false;
      if (proteinNeeded && protein.backbone) {
        try {
          const depiction = createProteinGeometry(
            doc,
            display,
            protein.backbone,
            paletteRef.current,
          );
          if (depiction.group.children.length) {
            group.add(depiction.group);
            preparedProtein = true;
            notices.push(...protein.backbone.warnings, ...depiction.warnings);
          } else
            notices.push(
              "No alpha-carbon depiction is available for the visible selection; atomic detail is retained.",
            );
        } catch (cause) {
          notices.push(
            `Protein depiction unavailable: ${String(cause)}. Atomic detail and quantum fields are retained.`,
          );
        }
      }
      const representations = Array.from({ length: atomCount }, (_, index) =>
        atomRepresentation(doc, display, index),
      );
      const visible: number[] = [];
      const atomic = new Uint8Array(atomCount);
      for (let index = 0; index < atomCount; index++) {
        if (!isAtomVisible(doc, display, index)) continue;
        if (isProteinRepresentation(representations[index])) {
          if (preparedProtein) continue;
          representations[index] = "ball-stick";
        }
        atomic[index] = 1;
        visible.push(index);
      }
      if (visible.length > 0) {
        const atomGeometry = new THREE.SphereGeometry(1, 24, 16);
        const atomMaterial = new THREE.MeshStandardMaterial({
          roughness: 0.34,
        });
        const atoms = new THREE.InstancedMesh(
          atomGeometry,
          atomMaterial,
          visible.length,
        );
        atoms.name = "atoms";
        const matrix = new THREE.Matrix4();
        const position = new THREE.Vector3();
        const scale = new THREE.Vector3();
        const tint = new THREE.Color();
        const labels: string[] = [];
        for (const [instance, index] of visible.entries()) {
          const point = columns.positions[index];
          const z = columns.elements[index];
          const element = elementDisplay(z);
          const representation = representations[index];
          const radius =
            representation === "space-fill"
              ? element.radius / BOHR
              : representation === "liquorice"
                ? 0.28
                : z === 1
                  ? 0.32
                  : 0.52;
          position.set(point[0], point[1], point[2]);
          scale.setScalar(radius);
          matrix.compose(position, IDENTITY_QUATERNION, scale);
          atoms.setMatrixAt(instance, matrix);
          tint.set(atomDisplayColor(doc, display, index, paletteRef.current));
          atoms.setColorAt(instance, tint);
          const angstrom = point.map((v) => (v * BOHR).toFixed(3)).join(", ");
          const hierarchy = doc.structure
            ? `\n${residueLabel(doc.structure, doc.structure.atom_residues[index])}`
            : "";
          labels.push(
            `${element.symbol} ${index + 1} | ${angstrom} angstrom${hierarchy}`,
          );
        }
        atoms.instanceMatrix.needsUpdate = true;
        if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
        atoms.userData.instanceLabels = labels;
        atoms.userData.originalAtomIndices = visible;
        group.add(atoms);
      }
      stagedAtomIndices = visible;
      const from = new THREE.Vector3();
      const to = new THREE.Vector3();
      const delta = new THREE.Vector3();
      const direction = new THREE.Vector3();
      const midpoint = new THREE.Vector3();
      const orientation = new THREE.Quaternion();
      const cylinderAxis = new THREE.Vector3(0, 1, 0);
      const coloredBonds = !!doc.structure && display.colorMode !== "element";
      const neutralBondColor = "#9ba3a8";
      const bondColor = (atom: number) =>
        display.colorMode === "residue-class" &&
        doc.structure?.residues[doc.structure.atom_residues[atom]]?.kind !==
          "protein"
          ? neutralBondColor
          : atomDisplayColor(doc, display, atom, paletteRef.current);
      const placed: {
        i: number;
        j: number;
        half: 0 | 1 | 2;
        colorAtom: number;
      }[] = [];
      for (const [i, j] of doc.bonds) {
        if (
          !atomic[i] ||
          !atomic[j] ||
          representations[i] === "space-fill" ||
          representations[j] === "space-fill"
        )
          continue;
        from.set(...columns.positions[i]);
        to.set(...columns.positions[j]);
        if (delta.subVectors(to, from).length() < 1e-10) continue;
        if (coloredBonds && bondColor(i) !== bondColor(j)) {
          placed.push(
            { i, j, half: 1, colorAtom: i },
            { i, j, half: 2, colorAtom: j },
          );
        } else placed.push({ i, j, half: 0, colorAtom: i });
      }
      if (placed.length > 0) {
        const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
        const bondMaterial = new THREE.MeshStandardMaterial({
          color: coloredBonds ? "#ffffff" : neutralBondColor,
          roughness: 0.5,
        });
        const bonds = new THREE.InstancedMesh(
          bondGeometry,
          bondMaterial,
          placed.length,
        );
        bonds.name = "bonds";
        const matrix = new THREE.Matrix4(),
          scale = new THREE.Vector3(),
          tint = new THREE.Color();
        const labels: string[] = [];
        for (const [instance, entry] of placed.entries()) {
          const { i, j, half } = entry;
          from.set(...columns.positions[i]);
          to.set(...columns.positions[j]);
          if (half === 1) to.lerpVectors(from, to, 0.5);
          else if (half === 2) from.lerpVectors(from, to, 0.5);
          const length = delta.subVectors(to, from).length();
          direction.copy(delta).multiplyScalar(1 / length);
          orientation.setFromUnitVectors(cylinderAxis, direction);
          midpoint.addVectors(from, to).multiplyScalar(0.5);
          const radius =
            representations[i] === "liquorice" ||
            representations[j] === "liquorice"
              ? 0.28
              : 0.105;
          scale.set(radius, length, radius);
          matrix.compose(midpoint, orientation, scale);
          bonds.setMatrixAt(instance, matrix);
          if (coloredBonds) {
            tint.set(bondColor(entry.colorAtom));
            bonds.setColorAt(instance, tint);
          }
          labels.push(
            doc.structure
              ? `Bond atoms ${i + 1}–${j + 1} | ${residueLabel(doc.structure, doc.structure.atom_residues[entry.colorAtom])}`
              : `Bond atoms ${i + 1}–${j + 1}`,
          );
        }
        bonds.instanceMatrix.needsUpdate = true;
        if (bonds.instanceColor) bonds.instanceColor.needsUpdate = true;
        bonds.userData.instanceLabels = labels;
        bonds.userData.originalBonds = placed.map(({ i, j }) => [i, j]);
        group.add(bonds);
      }
      stagedMessages = notices;
      const molecularMeshes = (doc.molecular_surfaces ?? []).map((mesh) => ({
        ...mesh,
        field: null,
      }));
      for (const s of [...doc.surfaces, ...molecularMeshes]) {
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
        const potential =
          "electrostatic_potential" in s
            ? s.electrostatic_potential
            : undefined;
        const mapped = potential?.enabled ? potential : undefined;
        if (mapped) {
          attachPotential(geometry, mapped, Boolean(usesCustom));
          if (usesCustom ? vertexColorPhong : s.opacity > 0)
            potentialKeys.push({
              range: mapped.range,
              label: `Density isovalue ${("isovalue" in s ? s.isovalue : null)?.toPrecision(4)} e/bohr³`,
              centered: Boolean(usesCustom),
            });
        } else if (shader)
          attachSurfaceColors(geometry, s.color, s.positions.length / 3);
        const mesh = new THREE.Mesh(
          geometry,
          usesCustom && shader
            ? buildSurfaceMaterial(shader, s)
            : surfaceMaterial(s, shading, Boolean(mapped)),
        );
        if (usesCustom) mesh.userData.customShader = true;
        mesh.userData.label = `${s.label} | ${(s.indices.length / 3).toLocaleString()} triangles`;
        mesh.userData.surfaceId = s.id;
        if ("vertex_atoms" in s) {
          mesh.userData.molecularSurface = true;
          mesh.userData.vertexAtoms = s.vertex_atoms;
          if (s.opacity === 1 && !usesCustom)
            opaqueMolecularSurfaces.push(mesh);
        }
        group.add(mesh);
      }
      group.add(inspectionAnnotations());
      group.add(buildFieldAnalysisGroup(doc, contours));
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
      if (grid && mode !== "mesh") {
        const gl = e.renderer.getContext() as WebGL2RenderingContext;
        const maxEdge = gl.getParameter(gl.MAX_3D_TEXTURE_SIZE) as number;
        if (grid.dims.some((edge) => edge > maxEdge))
          throw new Error(
            `The graphics device supports 3D texture dimensions up to ${maxEdge}; requested ${grid.dims.join(" × ")}`,
          );
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
      }
      // Three's render traversal uploads geometry/instance attributes, and its
      // zero-count draw path still compiles programs, uploads textures and binds
      // index buffers. Check those allocations without rasterizing the entire
      // candidate before it is committed and drawn. compile() alone skips uploads.
      const previousVisible = e.group.visible;
      const culling: Array<[THREE.Object3D, boolean]> = [];
      const ranges = new Map<
        THREE.BufferGeometry,
        { start: number; count: number }
      >();
      try {
        group.traverse((object) => {
          culling.push([object, object.frustumCulled]);
          object.frustumCulled = false;
          if (
            object instanceof THREE.Mesh ||
            object instanceof THREE.Line ||
            object instanceof THREE.Points ||
            object instanceof THREE.Sprite
          ) {
            const geometry = object.geometry;
            // Sprite and instanced meshes can share geometry. Snapshot it once
            // so a later occurrence cannot replace its original range with zero.
            if (!ranges.has(geometry)) {
              ranges.set(geometry, { ...geometry.drawRange });
              geometry.setDrawRange(0, 0);
            }
          }
        });
        e.group.visible = false;
        e.scene.add(group);
        e.renderer.render(e.scene, e.camera);
        const gl = e.renderer.getContext();
        if (gl.isContextLost()) throw new Error("The graphics context is lost");
        if (gl.getError() === gl.OUT_OF_MEMORY)
          throw new Error(
            "The graphics device could not allocate memory for the new scene",
          );
      } finally {
        e.scene.remove(group);
        e.group.visible = previousVisible;
        for (const [object, enabled] of culling) object.frustumCulled = enabled;
        for (const [geometry, range] of ranges)
          geometry.setDrawRange(range.start, range.count);
        e.needsRender = true;
      }
    } catch (error) {
      dispose(group);
      setError(
        `Unable to prepare the new scene: ${String(error)}. The previous scene is still displayed. Try a lower grid resolution or fewer surfaces.`,
      );
      return;
    }
    e.ambientOcclusion.setMeshes(
      group.children.filter(
        (object): object is THREE.InstancedMesh =>
          object instanceof THREE.InstancedMesh,
      ),
    );
    e.surfaceOcclusion.setMeshes(opaqueMolecularSurfaces);
    setOcclusionError("");
    setSurfaceOcclusionError("");
    dispose(e.group);
    e.group.clear();
    e.group.add(group);
    committedDoc.current = doc;
    committedPotentialKeys.current = potentialKeys;
    committedScene.current = sceneInput;
    committedInspectedPick.current = inspectedPick;
    committedDisplay.current = stagedDisplay;
    atomsRef.current = stagedAtomIndices;
    setProteinMessages(stagedMessages);
    if (!e.renderer.getContext().isContextLost()) setError("");
    e.allocationPending = true;
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
    layoutKey,
    protein.backbone,
    proteinNeeded,
    inspectionSelection,
    inspectionMeasurements,
    contours,
    contourPending,
    contourPreparationFailed,
  ]);
  useEffect(() => {
    const e = engine.current;
    if (
      !e ||
      committedInspectedPick.current === inspectedPick ||
      committedDoc.current !== doc ||
      committedScene.current !== sceneInput
    )
      return;
    // Inspecting a different atom updates only annotations, not the potentially
    // large molecular meshes. Source/visibility changes use the staged rebuild.
    let next: THREE.Group;
    try {
      next = inspectionAnnotations();
    } catch (cause) {
      setError(`Unable to update inspection markers: ${String(cause)}`);
      return;
    }
    const previous = e.group.getObjectByName("inspection-annotations");
    previous?.removeFromParent();
    if (previous) dispose(previous);
    e.group.add(next);
    committedInspectedPick.current = inspectedPick;
    setError((message) =>
      message.startsWith("Unable to update inspection markers:") ? "" : message,
    );
    e.allocationPending = true;
    e.needsRender = true;
  }, [
    inspectedPick,
    doc,
    sceneInput,
    inspectionSelection,
    inspectionMeasurements,
    layoutKey,
    contours,
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
    const tint = new THREE.Color();
    if (atoms instanceof THREE.InstancedMesh) {
      for (let instance = 0; instance < atomsRef.current.length; instance++) {
        tint.set(
          atomDisplayColor(
            committedDoc.current,
            committedDisplay.current,
            atomsRef.current[instance],
            atomPalette,
          ),
        );
        atoms.setColorAt(instance, tint);
      }
      if (atoms.instanceColor) atoms.instanceColor.needsUpdate = true;
    }
    retintProteinGeometry(
      e.group,
      committedDoc.current,
      committedDisplay.current,
      atomPalette,
    );
    e.allocationPending = true;
    e.needsRender = true;
  }, [atomPalette]);
  useEffect(() => {
    engine.current?.fit();
  }, [reset, doc.id]);
  useEffect(() => {
    if (
      focusSource.current.atoms !== doc.atoms ||
      focusSource.current.structure !== doc.structure
    ) {
      focusSource.current = { atoms: doc.atoms, structure: doc.structure };
      focusSeen.current = null;
      return;
    }
    const focus = display.focus;
    if (
      !focus ||
      focus === focusSeen.current ||
      committedDoc.current.atoms !== doc.atoms ||
      committedDoc.current.structure !== doc.structure
    )
      return;
    focusSeen.current = focus;
    engine.current?.focus(focus.atoms);
  }, [display.focus, doc.atoms, doc.structure]);
  useEffect(() => {
    const current = engine.current;
    if (!current) return;
    const disabled = { enabled: false, strength: 0, radius: 1 };
    // Release targets immediately, including after a failed enable attempt.
    if (!ambientOcclusion.enabled || ambientOcclusion.strength === 0) {
      current.ambientOcclusion.render(disabled);
      setOcclusionError("");
    }
    if (!ambientOcclusion.surfaceEnabled || ambientOcclusion.strength === 0) {
      current.surfaceOcclusion.render(disabled);
      setSurfaceOcclusionError("");
    }
    current.needsRender = true;
  }, [ambientOcclusion]);
  function captureImage(e: Engine, transparent: boolean): ViewportImage {
    const contourError = contourFailureRef.current;
    if (
      contourError &&
      contourError.source === committedDoc.current.field_analysis
    )
      throw new Error(
        `Contours could not be prepared: ${contourError.message}`,
      );
    if (e.renderer.getContext().isContextLost())
      throw new Error("Graphics context is lost");
    const clearColor = e.renderer.getClearColor(new THREE.Color());
    const clearAlpha = e.renderer.getClearAlpha();
    let image: string;
    try {
      // Draw and encode in one task, before this non-preserved buffer can be
      // discarded. Zero-alpha black keeps antialiasing and translucent fields
      // compositable without baking the selected background into their RGB.
      if (transparent) e.renderer.setClearColor(0x000000, 0);
      e.draw(true);
      if (
        fieldKeyCanvas.current &&
        (fieldAnalysisLegends(committedDoc.current).length ||
          committedDoc.current.field_analysis?.show_field_key ||
          committedPotentialKeys.current.length)
      ) {
        const output = document.createElement("canvas");
        output.width = e.renderer.domElement.width;
        output.height = e.renderer.domElement.height;
        const context = output.getContext("2d");
        if (!context) throw new Error("Image composition is unavailable");
        context.drawImage(e.renderer.domElement, 0, 0);
        context.drawImage(
          fieldKeyCanvas.current,
          0,
          0,
          output.width,
          output.height,
        );
        image = output.toDataURL("image/png");
      } else image = e.renderer.domElement.toDataURL("image/png");
      if (!image.startsWith("data:image/png;"))
        throw new Error("The scene image could not be encoded as PNG");
    } finally {
      if (transparent) {
        e.renderer.setClearColor(clearColor, clearAlpha);
        e.needsRender = true;
        e.draw();
      }
    }
    return {
      dataUrl: image,
      width: e.renderer.domElement.width,
      height: e.renderer.domElement.height,
    };
  }
  function screenshot(transparent = false) {
    const e = engine.current;
    if (!e) return;
    try {
      const image = captureImage(e, transparent);
      const a = document.createElement("a");
      a.download = transparent
        ? "eigenvista-view-transparent.png"
        : "eigenvista-view.png";
      a.href = image.dataUrl;
      a.click();
      setError((current) =>
        current.startsWith("Unable to export the scene image:") ? "" : current,
      );
    } catch (error) {
      setError(`Unable to export the scene image: ${String(error)}.`);
    }
  }
  function available(): Engine {
    const current = engine.current;
    if (!current) throw new Error("The viewport is not available");
    if (current.renderer.getContext().isContextLost())
      throw new Error("Graphics context is lost");
    return current;
  }
  function afterEffects<T>(
    run: (current: Engine) => T,
    draw = true,
    waitForProtein = false,
  ): Promise<T> {
    available();
    return new Promise((resolve, reject) => {
      const commit = ++nextControlCommit.current;
      queued.current.push({
        run,
        resolve: (value) => resolve(value as T),
        reject,
        draw,
        document: latestDocument.current,
        waitForProtein,
        commit,
      });
      // A previous commit's pending passive effect must not acknowledge this
      // operation before its requested state update has actually committed.
      requestCommit(commit);
    });
  }
  function vector(value: unknown, name: string): THREE.Vector3 {
    if (
      !Array.isArray(value) ||
      value.length !== 3 ||
      !value.every(
        (part) =>
          typeof part === "number" &&
          Number.isFinite(part) &&
          Number.isFinite(Math.fround(part)),
      )
    )
      throw new TypeError(
        `${name} must contain three finite display coordinates`,
      );
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  function cameraState(current: Engine): CameraState {
    return {
      position: current.camera.position.toArray() as [number, number, number],
      target: current.controls.target.toArray() as [number, number, number],
      up: current.camera.up.toArray() as [number, number, number],
    };
  }
  function validatedCamera(current: Engine, state: CameraState) {
    if (!state || typeof state !== "object" || Array.isArray(state))
      throw new TypeError("Camera state must be an object");
    if (
      Object.keys(state).some(
        (key) => !["position", "target", "up"].includes(key),
      )
    )
      throw new TypeError("Unknown camera state parameter");
    const position = vector(state.position, "Camera position");
    const target = vector(state.target, "Camera target");
    const up =
      state.up === undefined
        ? current.camera.up.clone()
        : vector(state.up, "Camera up");
    if (Math.abs(up.length() - 1) > 1e-6)
      throw new RangeError("Camera up must be a unit direction");
    up.normalize();
    const offset = position.clone().sub(target);
    const distance = offset.length();
    const controls = current.controls;
    if (
      !Number.isFinite(distance) ||
      distance <= 1e-8 ||
      distance < controls.minDistance ||
      distance > controls.maxDistance
    )
      throw new RangeError(
        "Camera distance is degenerate or outside the current controls limits",
      );
    const aligned = offset
      .clone()
      .applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(
          up,
          new THREE.Vector3(0, 1, 0),
        ),
      );
    const spherical = new THREE.Spherical().setFromVector3(aligned);
    if (
      spherical.phi < Math.max(1e-6, controls.minPolarAngle) ||
      spherical.phi > Math.min(Math.PI - 1e-6, controls.maxPolarAngle)
    )
      throw new RangeError(
        "Camera direction is at a pole or outside the current controls limits",
      );
    let min = controls.minAzimuthAngle,
      max = controls.maxAzimuthAngle;
    if (Number.isFinite(min) && Number.isFinite(max)) {
      if (min < -Math.PI) min += 2 * Math.PI;
      else if (min > Math.PI) min -= 2 * Math.PI;
      if (max < -Math.PI) max += 2 * Math.PI;
      else if (max > Math.PI) max -= 2 * Math.PI;
      if (
        min <= max
          ? spherical.theta < min || spherical.theta > max
          : spherical.theta > max && spherical.theta < min
      )
        throw new RangeError(
          "Camera azimuth is outside the current controls limits",
        );
    }
    const targetRadius = target.distanceTo(controls.cursor);
    if (
      targetRadius < controls.minTargetRadius ||
      targetRadius > controls.maxTargetRadius
    )
      throw new RangeError(
        "Camera target is outside the current controls limits",
      );
    return { position, target, up };
  }
  function undamped(controls: OrbitControls, apply: () => void) {
    const damping = controls.enableDamping,
      rotate = controls.autoRotate;
    controls.enableDamping = false;
    controls.autoRotate = false;
    try {
      apply();
    } finally {
      controls.enableDamping = damping;
      controls.autoRotate = rotate;
    }
  }
  const control = useMemo<ViewportControl>(
    () =>
      Object.freeze<ViewportControl>({
        getCamera: () => cameraState(available()),
        setCamera: async (state) => {
          const validated = validatedCamera(available(), state);
          await afterEffects((current) => {
            undamped(current.controls, () => current.controls.update());
            current.setUp(validated.up);
            undamped(current.controls, () => {
              current.camera.position.copy(validated.position);
              current.controls.target.copy(validated.target);
              current.controls.update();
            });
          });
        },
        fit: () =>
          afterEffects(
            (current) => {
              undamped(current.controls, () => {
                current.controls.update();
                current.fit();
              });
            },
            true,
            true,
          ),
        orbit: async (horizontalDegrees, verticalDegrees) => {
          if (
            !Number.isFinite(horizontalDegrees) ||
            !Number.isFinite(verticalDegrees)
          )
            throw new TypeError("Camera orbit angles must be finite numbers");
          await afterEffects((current) => {
            const before = cameraState(current);
            const up = current.camera.up.clone().normalize();
            const rotation = new THREE.Quaternion().setFromUnitVectors(
              up,
              new THREE.Vector3(0, 1, 0),
            );
            const offset = current.camera.position
              .clone()
              .sub(current.controls.target)
              .applyQuaternion(rotation);
            const spherical = new THREE.Spherical().setFromVector3(offset);
            const horizontal = THREE.MathUtils.degToRad(
              horizontalDegrees % 360,
            );
            const vertical = THREE.MathUtils.degToRad(verticalDegrees);
            spherical.theta += horizontal;
            spherical.phi -= vertical;
            if (
              spherical.phi < Math.max(1e-6, current.controls.minPolarAngle) ||
              spherical.phi >
                Math.min(Math.PI - 1e-6, current.controls.maxPolarAngle)
            )
              throw new RangeError(
                "Camera orbit would cross a pole or the current controls limits",
              );
            const position = new THREE.Vector3()
              .setFromSpherical(spherical)
              .applyQuaternion(rotation.invert())
              .add(current.controls.target);
            validatedCamera(current, {
              ...cameraState(current),
              position: position.toArray() as [number, number, number],
            });
            undamped(current.controls, () => {
              current.controls.update();
              current.camera.position.fromArray(before.position);
              current.controls.target.fromArray(before.target);
              current.controls.update();
              current.controls.rotateLeft(-horizontal);
              current.controls.rotateUp(vertical);
            });
          });
        },
        zoom: async (factor) => {
          if (!Number.isFinite(factor) || factor <= 0)
            throw new RangeError(
              "Camera zoom factor must be a finite positive number",
            );
          await afterEffects((current) => {
            const before = cameraState(current);
            const position = current.camera.position
              .clone()
              .sub(current.controls.target)
              .divideScalar(factor)
              .add(current.controls.target);
            validatedCamera(current, {
              ...cameraState(current),
              position: position.toArray() as [number, number, number],
            });
            undamped(current.controls, () => {
              current.controls.update();
              current.camera.position.fromArray(before.position);
              current.controls.target.fromArray(before.target);
              current.controls.update();
              if (factor > 1) current.controls.dollyIn(1 / factor);
              else if (factor < 1) current.controls.dollyOut(factor);
            });
          });
        },
        getBackground: () =>
          `#${available().renderer.getClearColor(new THREE.Color()).getHexString()}`,
        setBackground: async (color) => {
          if (typeof color !== "string" || !/^#[0-9a-f]{6}$/i.test(color))
            throw new TypeError(
              "Background color must be a six-digit hexadecimal color",
            );
          available();
          setBackgroundColor(color.toLowerCase());
          await afterEffects(() => undefined);
        },
        capture: async (transparent = false) => {
          if (typeof transparent !== "boolean")
            throw new TypeError("Transparent capture must be boolean");
          return afterEffects(
            (current) => captureImage(current, transparent),
            false,
            true,
          );
        },
      }),
    [],
  );
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = control;
    return () => {
      if (controlRef.current === control) controlRef.current = null;
    };
  }, [controlRef, control]);
  useEffect(() => {
    if (queued.current.length === 0) return;
    while (queued.current.length > 0) {
      const operation = queued.current[0];
      if (operation.commit > controlCommit) return;
      if (operation.document !== latestDocument.current) {
        queued.current.shift();
        operation.reject(new Error("The requested scene is stale"));
        continue;
      }
      if (operation.waitForProtein && proteinPending.current) return;
      queued.current.shift();
      try {
        const current = available();
        const contourError = contourFailureRef.current;
        if (
          contourError &&
          contourError.source === operation.document.field_analysis
        )
          throw new Error(
            `Contours could not be prepared: ${contourError.message}`,
          );
        if (
          committedDoc.current !== operation.document ||
          committedScene.current !== requestedScene.current
        )
          throw new Error(
            "The requested scene is stale or has not been prepared",
          );
        const bounds = host.current!.getBoundingClientRect();
        if (bounds.width <= 0 || bounds.height <= 0)
          throw new Error("The viewport has no drawable size");
        current.setSize(bounds.width, bounds.height);
        const result = operation.run(current);
        if (operation.draw) current.draw();
        current.needsRender = false;
        operation.resolve(result);
      } catch (cause) {
        operation.reject(cause);
      }
    }
  });
  return (
    <div className="scene-wrap" style={{ backgroundColor }}>
      <div className="scene" ref={host} data-testid="viewport" />
      {(fieldAnalysisLegends(doc).length > 0 ||
        doc.field_analysis?.show_field_key ||
        doc.surfaces.some(
          (s) => s.visible && s.electrostatic_potential?.enabled,
        )) && (
        <canvas
          ref={fieldKeyCanvas}
          aria-label="Quantitative field keys"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />
      )}
      {error && (
        <div className="viewport-error" role="alert">
          {error}
        </div>
      )}
      {contourFailure && contourFailure.source === doc.field_analysis && (
        <div className="viewport-error" role="alert">
          {contourFailure.message}
        </div>
      )}
      {(occlusionError || surfaceOcclusionError) && (
        <div className="viewport-error" role="alert">
          {[occlusionError, surfaceOcclusionError].filter(Boolean).join(" ")}
        </div>
      )}
      {proteinNeeded && (
        <div
          role="status"
          aria-label="Protein depiction status"
          style={{
            position: "absolute",
            bottom: 8,
            left: 12,
            right: 12,
            maxHeight: 120,
            overflow: "auto",
            padding: "5px 8px",
            fontSize: 11,
            background: "#fffffff0",
            color: "#43585b",
            zIndex: 3,
          }}
        >
          {!protein.backbone && !protein.error && (
            <div>Preparing protein backbone; atomic detail is retained.</div>
          )}
          {protein.error && (
            <div>
              Protein depiction unavailable: {protein.error}. Atomic detail is
              retained.
            </div>
          )}
          {proteinMessages.map((message, index) => (
            <div key={index}>{message}</div>
          ))}
          {ambientOcclusion.enabled && ambientOcclusion.strength > 0 && (
            <div>
              Protein depictions use diffuse shading; ambient occlusion applies
              to atom and bond detail.
            </div>
          )}
        </div>
      )}
      <div className="viewport-tools">
        <input
          type="color"
          aria-label="Background color"
          title="Background color"
          value={backgroundColor}
          onChange={(event) => setBackgroundColor(event.target.value)}
        />
        <button
          title="Reset background color"
          aria-label="Reset background color"
          disabled={backgroundColor === DEFAULT_BACKGROUND_COLOR}
          onClick={() => setBackgroundColor(DEFAULT_BACKGROUND_COLOR)}
        >
          <Undo2 size={18} />
        </button>
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
          onClick={() => screenshot()}
        >
          <Camera size={18} />
        </button>
        <button
          title="Export image with transparent background"
          aria-label="Export image with transparent background"
          onClick={() => screenshot(true)}
        >
          <ImageDown size={18} />
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
