import { GridResolutionInput } from "./GridResolutionInput";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type SetStateAction,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  createApplicationControl,
  controlIdentifier,
  ControlError,
  type ApplicationControl,
  type ControlExecution,
  type ControlHost,
} from "./control";
import { attachDesktopControl } from "./desktopControl";
import { makeNativeTransfer } from "./nativeTransfer";
import { INSPECTION_METHODS, inspectionReadMethods } from "./inspectionSchemas";
import { useScientificInspection } from "./useScientificInspection";
import { InspectionControls } from "./InspectionControls";
import { MolecularSurfaceControls } from "./MolecularSurfaceControls";
import { FieldAnalysisControls } from "./FieldAnalysisControls";
import { WorkspaceFrame } from "./WorkspacePane";
import { controlPreset, updateDeclaredUniforms } from "./control/presets";
import {
  patchStructureDisplay,
  visibleStructureAtoms,
  structureDisplaySummary,
  type StructurePatch,
} from "./control/presentation";
import type { CameraState, ViewportControl } from "./viewportControl";
import { NativeExitGuard } from "./NativeExitGuard";
import { createPendingInspectionSave } from "./pendingInspectionSave";
import {
  hasNativeSave,
  subscribeNativeSaves,
  trackNativeSave,
} from "./nativeSaveActivity";
import {
  Atom,
  FolderOpen,
  Save,
  Play,
  Square,
  Eye,
  EyeOff,
  Trash2,
  FlaskConical,
  Box,
  Check,
  ChevronDown,
  ArrowRightLeft,
  ListChecks,
  X,
} from "lucide-react";
import { createScienceClient } from "./science";
import type { VolumeQuality } from "./volume";
import {
  CalculationProgress,
  type CalculationState,
} from "./CalculationProgress";
import {
  browserSource,
  molecularExtensions,
  native,
  pickNative,
  saveBytes,
  type SourceFile,
} from "./files";
import { ConvertFiles } from "./ConvertFiles";
import { OrbitalBrowser } from "./OrbitalBrowser";
import { gridResolutions, isGridResolution } from "./resolution";
import { Viewport, type AmbientOcclusionSettings } from "./Viewport";
import { StructureControls } from "./StructureControls";
import { defaultStructureDisplay } from "./molecularDisplay";
import { automaticMolecularAoRadiusAngstrom } from "./molecularAmbientOcclusion";
import { ShaderPanel, type ShaderEditorState } from "./ShaderPanel";
import { PanelSection, usePanelExpansion } from "./PanelSection";
import { PanelSidebar, usePanelOrder } from "./PanelSidebar";
import {
  defaultValues,
  mergeUniformValues,
  parseUniforms,
  type ShaderPair,
  type UniformValue,
} from "./shaderTools";
import {
  DEFAULT_ATOM_COLORS,
  parseAtomColors,
  type AtomPalette,
} from "./atomColors";
import type {
  EigenVistaDocument,
  Generation,
  SampledGrid,
  ImportReport,
  ImportResult,
  RenderMode,
  SurfaceShading,
  Surface,
} from "./types";

const WORKSPACE_LAB_ENABLED =
  new URLSearchParams(window.location.search).get("workspace") !== "legacy";

export default function App() {
  const panels = usePanelExpansion();
  const panelOrder = usePanelOrder();
  const [{ request, cancel }] = useState(createScienceClient);
  const [doc, setDocument] = useState<EigenVistaDocument | null>(null);
  const [busy, setBusyState] = useState("Opening scientific core");
  const [calculation, setCalculation] = useState<CalculationState | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [resolution, setResolution] = useState(40);
  const [mode, setMode] = useState<RenderMode>("mesh");
  const [volumeQuality, setVolumeQuality] = useState<VolumeQuality>(2);
  const [automaticAoRadius, setAutomaticAoRadius] = useState(true);
  const [ambientOcclusion, setAmbientOcclusion] = useState<
    Omit<AmbientOcclusionSettings, "surfaceRadiusAngstrom">
  >({
    enabled: false,
    surfaceEnabled: false,
    strength: 1,
    radiusAngstrom: 3,
  });
  const automaticAoRadiusAngstrom = useMemo(
    () => automaticMolecularAoRadiusAngstrom(doc?.atoms.positions ?? []),
    [doc?.atoms],
  );
  // The envelope benefits from a broader neighborhood than atom contacts.
  // Keep the automatic radius in molecular units and independent of the view.
  const automaticSurfaceAoRadiusAngstrom = Math.round(
    (automaticAoRadiusAngstrom * 5) / 3,
  );
  const viewportAmbientOcclusion = useMemo(
    () => ({
      ...ambientOcclusion,
      radiusAngstrom: automaticAoRadius
        ? automaticAoRadiusAngstrom
        : ambientOcclusion.radiusAngstrom,
      surfaceRadiusAngstrom: automaticAoRadius
        ? automaticSurfaceAoRadiusAngstrom
        : ambientOcclusion.radiusAngstrom,
    }),
    [
      ambientOcclusion,
      automaticAoRadius,
      automaticAoRadiusAngstrom,
      automaticSurfaceAoRadiusAngstrom,
    ],
  );
  const aoRadiusReadout =
    ambientOcclusion.surfaceEnabled && !ambientOcclusion.enabled
      ? viewportAmbientOcclusion.surfaceRadiusAngstrom
      : viewportAmbientOcclusion.radiusAngstrom;
  const [surfaceShading, setSurfaceShading] =
    useState<SurfaceShading>("diffuse");
  const [shaderEditor, setShaderEditor] = useState<ShaderEditorState>({
    vertex: null,
    fragment: null,
    values: {},
    target: "all",
    transparent: true,
  });
  const [appliedShader, setAppliedShader] = useState<
    (ShaderPair & { target: string }) | null
  >(null);
  const [shaderStatus, setShaderStatus] = useState("");
  const [shaderError, setShaderError] = useState("");
  const hasProtein = useMemo(
    () =>
      doc?.structure?.residues.some((residue) => residue.kind === "protein") ??
      false,
    [doc?.structure],
  );
  const [structureDisplay, setStructureDisplay] = useState(
    defaultStructureDisplay,
  );
  // Subset indices belong to one imported geometry; coloring is a session choice.
  useEffect(() => {
    setStructureDisplay((previous) => ({
      ...defaultStructureDisplay(),
      colorMode: doc?.structure ? previous.colorMode : "element",
    }));
  }, [doc?.atoms, doc?.structure]);
  // Session-scoped atom colour override; undefined uses the bundled palette.
  const [atomPalette, setAtomPalette] = useState<AtomPalette | undefined>();
  const [atomPaletteName, setAtomPaletteName] = useState("");
  const [atomPaletteError, setAtomPaletteError] = useState("");
  const atomPaletteInput = useRef<HTMLInputElement>(null);
  const [grid, setGrid] = useState<SampledGrid | null>(null);
  const [reset, setReset] = useState(0);
  const [inspected, setInspected] = useState("");
  const inspectionBreak = inspected.indexOf("\n");
  const inspectionPrimary =
    inspectionBreak < 0 ? inspected : inspected.slice(0, inspectionBreak);
  const inspectionDetail =
    inspectionBreak < 0 ? "" : inspected.slice(inspectionBreak + 1);
  const [dirty, setDirtyState] = useState(false);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [converterOpen, setConverterOpen] = useState(false);
  const [conversionPending, setConversionPending] = useState(false);
  const conversionActivity = useRef(false);
  const cancelConversion = useRef<(() => void) | null>(null);
  const conversionChanged = useCallback((pending: boolean) => {
    conversionActivity.current = pending;
    setConversionPending(pending);
  }, []);
  const nativeSaving = useSyncExternalStore(
    subscribeNativeSaves,
    hasNativeSave,
  );
  const [orbitalsOpen, setOrbitalsOpen] = useState(false);
  const [protectedSourcePath, setProtectedSourcePath] = useState<
    string | undefined
  >();
  const file = useRef<HTMLInputElement>(null);
  const generation = useRef(0);
  const current = useRef(doc);
  const unsaved = useRef(dirty);
  const activity = useRef(true);
  const saving = useRef(false);
  const [pendingInspectionSave] = useState(createPendingInspectionSave);
  // Re-render the native exit prompt when admitted work finishes; its event
  // handlers also read the synchronous snapshot before React catches up.
  useSyncExternalStore(
    pendingInspectionSave.subscribe,
    pendingInspectionSave.getSnapshot,
  );
  const documentRevision = useRef(0);
  const inspection = useScientificInspection({
    doc,
    getDocument: () => current.current,
    publish: (next) => {
      setDoc(next);
      setDirty(true);
    },
    setBusy,
    protectedPath: protectedSourcePath,
    display: (atoms, focus, resetFilters, focusAtoms) =>
      setStructureDisplay((previous) => {
        const next = resetFilters
          ? { ...defaultStructureDisplay(), colorMode: previous.colorMode }
          : previous;
        return {
          ...next,
          atomSelection: atoms,
          ...(focus
            ? {
                focus: {
                  atoms: focusAtoms ?? atoms ?? [],
                  revision: (previous.focus?.revision ?? 0) + 1,
                },
              }
            : {}),
        };
      }),
  });
  const viewportControl = useRef<ViewportControl | null>(null);
  const controlHost = useRef<ControlHost | null>(null);
  const controller = useRef<ApplicationControl | null>(null);
  const inspectionCommandRef = useRef<
    | ((
        method: string,
        params?: Record<string, unknown>,
        options?: { signal?: AbortSignal },
      ) => Promise<unknown>)
    | null
  >(null);
  const sendInspectionCommand = useCallback(
    (
      method: string,
      params?: Record<string, unknown>,
      options?: { signal?: AbortSignal },
    ) => {
      if (!inspectionCommandRef.current)
        return Promise.reject(new Error("Inspection control is not ready"));
      const finish =
        Object.hasOwn(INSPECTION_METHODS, method) &&
        !inspectionReadMethods.has(method)
          ? pendingInspectionSave.begin()
          : () => {};
      return inspectionCommandRef
        .current(method, params, options)
        .finally(finish);
    },
    [],
  );
  const [controlCommit, setControlCommit] = useState(0);
  const commitWaiters = useRef<
    { resolve: () => void; reject: (error: Error) => void }[]
  >([]);
  function synchronizeControl() {
    return new Promise<void>((resolve, reject) => {
      commitWaiters.current.push({ resolve, reject });
      setControlCommit((value) => value + 1);
    });
  }
  useLayoutEffect(() => {
    for (const waiter of commitWaiters.current.splice(0)) waiter.resolve();
  }, [controlCommit]);
  useEffect(() => {
    // Effect reattachment (including development refresh) gets a new session;
    // never republish a disposed controller or revive its cancelled jobs.
    const control = createApplicationControl(() => {
      if (!controlHost.current)
        throw new ControlError("unavailable", "The application is not ready");
      return controlHost.current;
    }, pendingInspectionSave);
    controller.current = control;
    const connection = new AbortController();
    let closed = false;
    let detach = () => {};
    const browser =
      !native &&
      new URLSearchParams(window.location.search).get("control") === "1";
    const api = { request: control.request };
    if (browser) window.eigenvistaControl = api;
    if (native)
      void attachDesktopControl(control, connection.signal)
        .then((stop) => {
          if (closed) stop();
          else detach = stop;
        })
        .catch((error) =>
          console.error("Application control attachment failed", error),
        );
    return () => {
      closed = true;
      connection.abort();
      detach();
      if (window.eigenvistaControl === api) delete window.eigenvistaControl;
      if (controller.current === control) controller.current = null;
      control.dispose();
      for (const waiter of commitWaiters.current.splice(0))
        waiter.reject(new Error("Application closed"));
    };
  }, []);
  // Lifecycle decisions must see accepted edits even before React renders them.
  function setDoc(update: SetStateAction<EigenVistaDocument | null>) {
    const next =
      typeof update === "function" ? update(current.current) : update;
    if (next !== current.current) documentRevision.current++;
    current.current = next;
    setDocument(next);
  }
  function setDirty(value: boolean) {
    unsaved.current = value;
    setDirtyState(value);
  }
  function setBusy(value: string) {
    activity.current = Boolean(value);
    setBusyState(value);
  }
  function checkFlow(token: number, execution?: ControlExecution) {
    if (token !== generation.current) {
      if (execution)
        throw new ControlError(
          "cancelled",
          "The operation was superseded or cancelled",
        );
      return false;
    }
    execution?.assertCurrent();
    return true;
  }
  /**
   * Apply a palette file. A rejected file leaves the current palette untouched
   * and only the message changes, so a bad load can never half-colour the scene.
   */
  function applyAtomPalette(text: string, name: string, strict = false) {
    try {
      setAtomPalette(parseAtomColors(text, name));
      setAtomPaletteName(name);
      setAtomPaletteError("");
    } catch (error) {
      setAtomPaletteError(String(error));
      if (strict)
        throw new ControlError(
          "validation_error",
          error instanceof Error ? error.message : String(error),
        );
    }
  }
  function resetAtomPalette() {
    setAtomPalette(undefined);
    setAtomPaletteName("");
    setAtomPaletteError("");
  }
  async function pickAtomPalette() {
    const [picked] = await pickNative(false, ["json", "txt"], "Atom colours");
    if (!picked) return;
    const bytes = await picked.read();
    applyAtomPalette(new TextDecoder().decode(bytes), picked.name);
  }
  function chooseAtomPalette() {
    if (native) {
      void pickAtomPalette();
      return;
    }
    atomPaletteInput.current?.click();
  }
  async function compute(
    document: EigenVistaDocument,
    res = resolution,
    orbitals?: string[],
    markDirty = true,
    execution?: ControlExecution,
  ) {
    if (!document.view.field) return;
    if (!isGridResolution(res)) {
      setError("Choose an available grid resolution.");
      if (execution)
        throw new ControlError(
          "invalid_arguments",
          "Choose an available grid resolution",
        );
      return;
    }
    const fields = orbitals ?? [document.view.field];
    if (!fields.length) return;
    if (
      orbitals &&
      (new Set(fields).size !== fields.length ||
        fields.some((id) => !document.orbitals.some((o) => o.id === id)))
    ) {
      setError("Select distinct available orbitals.");
      return;
    }
    const token = ++generation.current;
    setBusy("Calculating field and surfaces");
    setError("");
    const started = performance.now();
    setCalculation({
      label: "Field and surfaces",
      stage: "preparing",
      started,
    });
    try {
      const retained = document.surfaces.filter(
        (s) => !s.field || !fields.includes(s.field),
      );
      const generated: Surface[] = [];
      let activeGrid: SampledGrid | null = null;
      for (const [index, field] of fields.entries()) {
        const description = orbitals
          ? `Calculating orbital ${index + 1} of ${fields.length}: ${document.orbitals.find((o) => o.id === field)!.label}`
          : "Calculating field and surfaces";
        setBusy(description);
        const label = `${orbitals ? `Orbital ${index + 1} of ${fields.length}: ` : ""}${[...document.orbitals, ...document.densities, ...document.grids].find((f) => f.id === field)?.label ?? field}`;
        setCalculation({ label, stage: "preparing", started });
        const result = await request<Generation>(
          "generate",
          {
            doc: { ...document, surfaces: [] },
            field,
            resolution: res,
            iso: document.view.isovalue,
          },
          (stage, counts) => {
            if (token !== generation.current) return;
            setCalculation({ label, stage, counts, started });
            if (stage === "sampling")
              setBusy(`${description} / Sampling field`);
            if (stage === "meshing")
              setBusy(`${description} / Extracting meshes`);
            execution?.progress(stage, counts);
          },
          { signal: execution?.signal },
        );
        if (!checkFlow(token, execution)) return;
        if (execution)
          for (const surface of result.surfaces) {
            controlIdentifier(surface.id, "Surface ID");
            controlIdentifier(surface.field, "Field ID");
          }
        generated.push(...result.surfaces);
        if (field === document.view.field) activeGrid = result.grid;
      }
      // Publish the complete batch only after Rust validates its combined document.
      await request(
        "validate",
        { doc: { ...document, surfaces: [...retained, ...generated] } },
        () => {
          if (token === generation.current) {
            setBusy("Calculating surfaces / Checking saved geometry");
            setCalculation({
              label: orbitals
                ? `${fields.length} orbitals`
                : "Field and surfaces",
              stage: "validating",
              started,
            });
            execution?.progress("validating");
          }
        },
        { signal: execution?.signal },
      );
      if (!checkFlow(token, execution)) return;
      setDoc((d) =>
        d
          ? {
              ...d,
              view: {
                ...d.view,
                field: document.view.field,
                isovalue: document.view.isovalue,
              },
              surfaces: [
                ...d.surfaces.filter(
                  (s) => !s.field || !fields.includes(s.field),
                ),
                ...generated.map((s) => ({
                  ...s,
                  opacity: d.view.opacity,
                  color:
                    (s.isovalue ?? 0) > 0
                      ? d.view.positive_color
                      : d.view.negative_color,
                })),
              ],
            }
          : d,
      );
      setGrid(activeGrid);
      execution?.markPublished();
      if (orbitals) {
        setMode("mesh");
        setResolution(res);
      }
      setReset((v) => v + 1);
      if (markDirty) setDirty(true);
      setStatus(
        `${orbitals ? `${fields.length} orbitals / ` : ""}${generated.reduce((n, s) => n + s.indices.length / 3, 0).toLocaleString()} triangles / ${((performance.now() - started) / 1000).toFixed(2)} s`,
      );
      return {
        fieldIds: fields,
        surfaceIds: generated.map((surface) => surface.id),
        surfaceCount: retained.length + generated.length,
        triangleCount: generated.reduce(
          (count, surface) => count + surface.indices.length / 3,
          0,
        ),
        resolution: res,
        revision: documentRevision.current,
      };
    } catch (e) {
      if (token === generation.current) setError(String(e));
      if (execution) throw e;
    } finally {
      if (token === generation.current) {
        setBusy("");
        setCalculation(null);
      }
    }
  }
  function generateOrbitals(ids: string[], iso: number, res: number) {
    if (!doc || busy || !ids.length) return;
    if (!Number.isFinite(iso) || iso <= 0 || !isGridResolution(res)) {
      setError(
        "Choose a finite positive isovalue and an available grid resolution.",
      );
      return;
    }
    const field = ids.includes(doc.view.field ?? "") ? doc.view.field : ids[0];
    setOrbitalsOpen(false);
    void compute(
      { ...doc, view: { ...doc.view, field, isovalue: iso } },
      res,
      ids,
    );
  }
  async function example(openShell = false) {
    if (
      dirty &&
      !window.confirm(
        "Replace the current document? Unsaved changes will be lost.",
      )
    )
      return;
    ++generation.current;
    cancel();
    setBusy("Opening example");
    setError("");
    try {
      const d = await request<EigenVistaDocument>("example", { openShell });
      setDoc(d);
      setCalculation(null);
      setOrbitalsOpen(false);
      setGrid(null);
      setMode("mesh");
      setDirty(false);
      setInspected("");
      setImportReport(null);
      setProtectedSourcePath(undefined);
      // A built-in example regenerates identically on every load, so generating
      // its starting surfaces is not an unsaved user edit.
      await compute(d, resolution, undefined, false);
    } catch (e) {
      setError(String(e));
      setBusy("");
    }
  }
  useEffect(() => {
    if (!current.current) void example();
    return () => {
      ++generation.current;
      cancel();
    };
  }, []);
  useEffect(() => {
    if (native) return;
    const guard = (e: BeforeUnloadEvent) => {
      if (unsaved.current || pendingInspectionSave.getSnapshot()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, []);
  function editView(values: Partial<EigenVistaDocument["view"]>) {
    setDoc((d) =>
      d
        ? {
            ...d,
            view: { ...d.view, ...values },
            surfaces: d.surfaces.map((s) => ({
              ...s,
              ...(values.opacity !== undefined
                ? { opacity: values.opacity }
                : {}),
              ...(values.positive_color && (s.isovalue ?? 0) > 0
                ? { color: values.positive_color }
                : {}),
              ...(values.negative_color && (s.isovalue ?? 0) < 0
                ? { color: values.negative_color }
                : {}),
            })),
          }
        : d,
    );
    setDirty(true);
  }
  async function prepareGrid(
    document: EigenVistaDocument,
    res: number,
    nextMode: RenderMode,
    execution?: ControlExecution,
  ) {
    if (!document.view.field) return;
    if (!isGridResolution(res)) {
      setError("Choose an available grid resolution.");
      return;
    }
    const token = ++generation.current;
    setBusy("Calculating sampled field");
    setError("");
    const started = performance.now();
    const label =
      [...document.orbitals, ...document.densities, ...document.grids].find(
        (f) => f.id === document.view.field,
      )?.label ?? document.view.field;
    setCalculation({ label, stage: "preparing", started });
    try {
      const sampled = await request<SampledGrid>(
        "sample",
        {
          doc: { ...document, surfaces: [] },
          field: document.view.field,
          resolution: res,
        },
        (stage, counts) => {
          if (token === generation.current)
            setCalculation({ label, stage, counts, started });
          execution?.progress(stage, counts);
        },
        { signal: execution?.signal },
      );
      if (!checkFlow(token, execution)) return;
      // Keep the previous field and preview until sampling has succeeded.
      if (document.view.field !== current.current?.view.field)
        editView({ field: document.view.field });
      setGrid(sampled);
      setResolution(res);
      setMode(nextMode);
      setReset((v) => v + 1);
      setStatus("Sampled field ready");
      execution?.markPublished();
      return {
        fieldId: document.view.field,
        resolution: res,
        mode: nextMode,
        dims: [...sampled.dims],
        meshGenerated: false,
        revision: documentRevision.current,
      };
    } catch (e) {
      if (token === generation.current) setError(String(e));
      if (execution) throw e;
    } finally {
      if (token === generation.current) {
        setBusy("");
        setCalculation(null);
      }
    }
  }
  async function selectMode(nextMode: RenderMode) {
    if (!doc || busy) return;
    if (nextMode !== "mesh" && !grid) {
      await prepareGrid(doc, resolution, nextMode);
      return;
    }
    setMode(nextMode);
    setReset((v) => v + 1);
  }
  async function selectField(id: string, execution?: ControlExecution) {
    if (!doc || busy || id === doc.view.field) return;
    if (mode !== "mesh" || doc.grids.some((g) => g.id === id)) {
      return await prepareGrid(
        { ...doc, view: { ...doc.view, field: id } },
        resolution,
        mode === "mesh" ? "volume" : mode,
        execution,
      );
    }
    editView({ field: id });
    setGrid(null);
    return { fieldId: id, revision: documentRevision.current };
  }
  async function load(
    source: SourceFile,
    control?: { execution: ControlExecution; discardUnsaved: boolean },
  ) {
    if (control && unsaved.current && !control.discardUnsaved)
      throw new ControlError(
        "permission_required",
        "The current document has unsaved changes; set discardUnsaved explicitly to replace it",
      );
    const token = ++generation.current;
    cancel();
    setBusy("Opening document");
    setError("");
    try {
      const bytes = await source.read();
      if (!checkFlow(token, control?.execution)) return;
      const result = await request<ImportResult>(
        "import_document",
        {
          bytes,
          name: source.name,
        },
        undefined,
        { signal: control?.execution.signal },
      );
      if (!checkFlow(token, control?.execution)) return;
      const d = result.document;
      let sampled: SampledGrid | null = null;
      let previewError = "";
      if (d.grids.some((g) => g.id === d.view.field)) {
        try {
          sampled = await request<SampledGrid>(
            "sample",
            {
              doc: { ...d, surfaces: [] },
              field: d.view.field,
              resolution,
            },
            undefined,
            { signal: control?.execution.signal },
          );
        } catch (e) {
          previewError = `Sampled preview unavailable: ${String(e)}`;
        }
      }
      if (!checkFlow(token, control?.execution)) return;
      if (
        unsaved.current &&
        !(control
          ? control.discardUnsaved
          : window.confirm(
              "Replace the current document? Unsaved changes will be lost.",
            ))
      )
        return;
      setDoc(d);
      setOrbitalsOpen(false);
      setGrid(sampled);
      setCalculation(null);
      setMode(sampled && !d.surfaces.length ? "volume" : "mesh");
      setReset((v) => v + 1);
      setDirty(result.report.requires_save);
      setProtectedSourcePath(
        result.report.format !== "eigenvista" ? source.path : undefined,
      );
      setInspected("");
      setError(previewError);
      setImportReport(result.report.warnings.length ? result.report : null);
      setStatus(
        `Opened ${source.name}${d.surfaces.length ? " / saved geometry restored" : ""}`,
      );
      return {
        revision: documentRevision.current,
        document: {
          id: d.id,
          title: d.title,
          atomCount: d.atoms.positions.length,
          bondCount: d.bonds.length,
          orbitalCount: d.orbitals.length,
          densityCount: d.densities.length,
          gridCount: d.grids.length,
        },
        report: {
          ...result.report,
          warnings: result.report.warnings,
        },
        previewError,
      };
    } catch (e) {
      if (token === generation.current) setError(String(e));
      if (control) throw e;
    } finally {
      if (token === generation.current) setBusy("");
    }
  }
  async function openFile() {
    if (!native) {
      file.current?.click();
      return;
    }
    const token = generation.current;
    try {
      const [f] = await pickNative();
      if (f && token === generation.current) await load(f);
    } catch (e) {
      if (token === generation.current) setError(String(e));
    }
  }
  async function save(): Promise<boolean> {
    if (pendingInspectionSave.getSnapshot()) {
      setError(
        "An inspection edit is still being applied. Wait for it to finish, then save again.",
      );
      return false;
    }
    const snapshot = current.current;
    if (!snapshot || activity.current || saving.current || hasNativeSave())
      return false;
    saving.current = true;
    setBusy("Saving document");
    setError("");
    try {
      const bytes = await request<Uint8Array>("encode", { doc: snapshot });
      if (
        await saveBytes(
          bytes,
          `${snapshot.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.eigenvista`,
          protectedSourcePath ? [protectedSourcePath] : [],
        )
      ) {
        if (current.current === snapshot) setDirty(false);
        setStatus("Saved quantum data, surfaces and appearance");
        return current.current === snapshot;
      }
      return false;
    } catch (e) {
      setError(String(e));
      return false;
    } finally {
      saving.current = false;
      setBusy("");
    }
  }
  function stop() {
    inspection.cancel();
    ++generation.current;
    cancel();
    setBusy("");
    setCalculation(null);
    setStatus("Cancelled; previous surfaces retained");
  }
  async function executeControl(
    method: string,
    params: Record<string, unknown>,
    execution: ControlExecution,
  ): Promise<unknown> {
    const document = current.current;
    const port = () => {
      if (!viewportControl.current)
        throw new ControlError(
          "unavailable",
          "The molecular renderer is not ready",
        );
      return viewportControl.current;
    };
    if (method === "document.open") {
      let source: SourceFile;
      if (native) {
        if (
          typeof params.path !== "string" ||
          params.bytes !== undefined ||
          params.name !== undefined
        )
          throw new ControlError(
            "invalid_arguments",
            "Native imports require one scoped path",
          );
        const path = params.path;
        source = {
          name: path.split(/[\\/]/).pop()!,
          path,
          read: async () => {
            const value = await invoke<ArrayBuffer | Uint8Array | number[]>(
              "control_read_file",
              { path },
            );
            return value instanceof Uint8Array
              ? value
              : value instanceof ArrayBuffer
                ? new Uint8Array(value)
                : new Uint8Array(value);
          },
        };
      } else {
        if (
          params.path !== undefined ||
          typeof params.name !== "string" ||
          !Array.isArray(params.bytes)
        )
          throw new ControlError(
            "invalid_arguments",
            "Browser imports require a name and byte array, not a filesystem path",
          );
        const bytes = new Uint8Array(params.bytes as number[]);
        source = { name: params.name, read: async () => bytes };
      }
      return await load(source, {
        execution,
        discardUnsaved: params.discardUnsaved === true,
      });
    }
    if (!document)
      throw new ControlError("no_document", "No molecular document is open");
    if (Object.hasOwn(INSPECTION_METHODS, method))
      return inspection.execute(method, params, execution);
    if (method === "palette.load" || method === "palette.reset") {
      if (method === "palette.reset") resetAtomPalette();
      else {
        let text: string, name: string;
        if (native) {
          if (
            typeof params.path !== "string" ||
            params.text !== undefined ||
            params.name !== undefined
          )
            throw new ControlError(
              "invalid_arguments",
              "Native palettes require one authorized path",
            );
          const path = params.path;
          const bytes = await invoke<ArrayBuffer | Uint8Array | number[]>(
            "control_read_file",
            { path },
          );
          execution.assertCurrent();
          const buffer =
            bytes instanceof Uint8Array
              ? bytes
              : bytes instanceof ArrayBuffer
                ? new Uint8Array(bytes)
                : new Uint8Array(bytes);
          text = new TextDecoder("utf-8", { fatal: true }).decode(buffer);
          name = path.split(/[\\/]/).pop()!;
        } else {
          if (
            params.path !== undefined ||
            typeof params.text !== "string" ||
            typeof params.name !== "string"
          )
            throw new ControlError(
              "invalid_arguments",
              "Browser palettes require a name and JSON text",
            );
          text = params.text;
          name = params.name;
        }
        execution.assertCurrent();
        applyAtomPalette(text, name, true);
      }
      await synchronizeControl();
      await port().setBackground(port().getBackground());
      return controlHost.current!.snapshot().palette;
    }
    if (method === "structure.set" || method === "structure.focus") {
      if (method === "structure.set") {
        const next = patchStructureDisplay(
          document,
          structureDisplay,
          params as StructurePatch,
        );
        execution.assertCurrent();
        setStructureDisplay(next);
      } else {
        if ((params.target === "chain") !== (params.chainIndex !== undefined))
          throw new ControlError(
            "invalid_arguments",
            "A chain focus requires one chainIndex; a visible focus takes none",
          );
        const atoms = visibleStructureAtoms(
          document,
          structureDisplay,
          params.chainIndex as number | undefined,
        );
        if (!atoms.length)
          throw new ControlError(
            "not_found",
            "No visible atoms match this focus request",
          );
        setStructureDisplay({
          ...structureDisplay,
          focus: {
            atoms,
            revision: (structureDisplay.focus?.revision ?? 0) + 1,
          },
        });
      }
      await synchronizeControl();
      await port().setBackground(port().getBackground());
      return {
        ...(controlHost.current!.snapshot().structureDisplay as object),
        camera: port().getCamera(),
      };
    }
    if (method === "document.save") {
      if (
        (native && typeof params.path !== "string") ||
        (!native && params.path !== undefined)
      )
        throw new ControlError(
          "invalid_arguments",
          native
            ? "Native Save requires an authorized path"
            : "Browser Save returns bytes; paths are unavailable",
        );
      const snapshot = document,
        revision = documentRevision.current;
      if (saving.current || activity.current || hasNativeSave())
        throw new ControlError(
          "busy",
          "A save or calculation is already active",
        );
      saving.current = true;
      setBusy("Saving document");
      setError("");
      try {
        const bytes = await request<Uint8Array>(
          "encode",
          { doc: snapshot },
          undefined,
          { signal: execution.signal },
        );
        execution.assertCurrent();
        if (!native) {
          return {
            revision,
            saved: false,
            name: `${snapshot.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase()}.eigenvista`,
            bytes: Array.from(bytes),
            byteLength: bytes.length,
          };
        }
        const receipt = await trackNativeSave(() =>
          invoke<{ path: string; bytes: number }>(
            "control_save_document",
            makeNativeTransfer(bytes, {
              path: params.path,
              protectedPaths: protectedSourcePath ? [protectedSourcePath] : [],
              overwrite: params.overwrite === true,
            }),
          ),
        );
        const unchanged = current.current === snapshot;
        if (unchanged) setDirty(false);
        setStatus("Saved quantum data, surfaces and appearance");
        return {
          ...receipt,
          saved: true,
          current: unchanged,
          snapshotRevision: revision,
          revision: documentRevision.current,
        };
      } finally {
        saving.current = false;
        setBusy("");
      }
    }
    if (method === "field.preview") {
      return await prepareGrid(
        {
          ...document,
          view: { ...document.view, field: params.fieldId as string },
        },
        params.resolution as number,
        params.mode as RenderMode,
        execution,
      );
    }
    if (method === "surfaces.generate") {
      const ids = params.fieldIds as string[];
      const field = ids.includes(document.view.field ?? "")
        ? document.view.field!
        : ids[0];
      const next = {
        ...document,
        view: { ...document.view, field, isovalue: params.isovalue as number },
      };
      const orbitalBatch = ids.every((id) =>
        document.orbitals.some((orbital) => orbital.id === id),
      );
      const result = await compute(
        next,
        params.resolution as number,
        orbitalBatch ? ids : undefined,
        true,
        execution,
      );
      setMode("mesh");
      setResolution(params.resolution as number);
      return result;
    }
    if (method === "field.select") {
      if (document.view.field === params.fieldId)
        return { fieldId: params.fieldId, revision: documentRevision.current };
      return await selectField(params.fieldId as string, execution);
    }
    if (method === "surfaces.set_visibility" || method === "surfaces.remove") {
      const found = document.surfaces.find(
        (surface) => surface.id === params.surfaceId,
      );
      if (!found)
        throw new ControlError("not_found", "Unknown saved surface ID");
      if (method === "surfaces.remove") {
        setDoc({
          ...document,
          surfaces: document.surfaces.filter(
            (surface) => surface.id !== found.id,
          ),
        });
        setDirty(true);
      } else if (found.visible !== params.visible) {
        setDoc({
          ...document,
          surfaces: document.surfaces.map((surface) =>
            surface.id === found.id
              ? { ...surface, visible: params.visible as boolean }
              : surface,
          ),
        });
        setDirty(true);
      }
      return {
        surfaceId: found.id,
        revision: documentRevision.current,
        ...(method === "surfaces.remove"
          ? { removed: true }
          : { visible: params.visible }),
      };
    }
    if (method === "scene.set") {
      const view: Partial<EigenVistaDocument["view"]> = {};
      for (const [key, name] of [
        ["representation", "representation"],
        ["positiveColor", "positive_color"],
        ["negativeColor", "negative_color"],
        ["opacity", "opacity"],
        ["isovalue", "isovalue"],
      ] as const)
        if (params[key] !== undefined)
          Object.assign(view, { [name]: params[key] });
      if (params.backgroundColor !== undefined)
        await port().setBackground(params.backgroundColor as string);
      execution.assertCurrent();
      if (Object.keys(view).length) editView(view);
      if (params.shading !== undefined)
        setSurfaceShading(params.shading as SurfaceShading);
      if (params.mode === "mesh") setMode("mesh");
      if (params.volumeQuality !== undefined)
        setVolumeQuality(params.volumeQuality as VolumeQuality);
      if (params.ambientOcclusion !== undefined) {
        const { automaticRadius, ...patch } =
          params.ambientOcclusion as Partial<typeof ambientOcclusion> & {
            automaticRadius?: boolean;
          };
        if (
          automaticRadius === false &&
          automaticAoRadius &&
          patch.radiusAngstrom === undefined
        ) {
          const surfaceOnly =
            (patch.surfaceEnabled ?? ambientOcclusion.surfaceEnabled) &&
            !(patch.enabled ?? ambientOcclusion.enabled);
          patch.radiusAngstrom = surfaceOnly
            ? automaticSurfaceAoRadiusAngstrom
            : automaticAoRadiusAngstrom;
        }
        setAmbientOcclusion((current) => ({ ...current, ...patch }));
        if (automaticRadius !== undefined)
          setAutomaticAoRadius(automaticRadius);
        else if (patch.radiusAngstrom !== undefined)
          setAutomaticAoRadius(false);
      }
      await synchronizeControl();
      await port().setBackground(port().getBackground());
      const accepted = controlHost.current!.snapshot();
      return {
        revision: documentRevision.current,
        view: current.current!.view,
        shading: accepted.shading,
        ambientOcclusion: accepted.ambientOcclusion,
        volumeQuality: accepted.volumeQuality,
        backgroundColor: port().getBackground(),
      };
    }
    if (
      method === "shader.apply" ||
      method === "shader.set_uniforms" ||
      method === "shader.clear"
    ) {
      if (method === "shader.clear") {
        setAppliedShader(null);
        setShaderEditor({
          vertex: null,
          fragment: null,
          values: {},
          target: "all",
        });
        setShaderStatus("Cleared custom surface shader");
        setShaderError("");
      } else {
        const patch = (params.uniforms ?? {}) as Record<string, UniformValue>;
        if (method === "shader.set_uniforms" && !appliedShader)
          throw new ControlError(
            "unavailable",
            "Apply a bundled shader before setting its uniforms",
          );
        const target =
          (params.target as string | undefined) ??
          (method === "shader.set_uniforms"
            ? appliedShader?.target
            : undefined) ??
          "all";
        if (
          target !== "all" &&
          ![...document.surfaces, ...(document.molecular_surfaces ?? [])].some(
            (surface) => surface.id === target,
          )
        )
          throw new ControlError("not_found", "Unknown shader target surface");
        const pair =
          method === "shader.apply"
            ? controlPreset(
                params.preset as "surface-clip" | "x-ray",
                patch,
                params.transparency as boolean | undefined,
              )
            : {
                ...appliedShader!,
                values: updateDeclaredUniforms(appliedShader!, patch),
                ...(params.transparency !== undefined
                  ? { transparent: params.transparency as boolean }
                  : {}),
              };
        setShaderEditor({
          vertex: { name: pair.vertexName, source: pair.vertexSource },
          fragment: { name: pair.fragmentName, source: pair.fragmentSource },
          values: pair.values,
          target,
          transparent: pair.transparent !== false,
        });
        setAppliedShader({ ...pair, target });
        setShaderError("");
        setShaderStatus(`Applied ${pair.vertexName} + ${pair.fragmentName}`);
      }
      await synchronizeControl();
      await port().setBackground(port().getBackground());
      await synchronizeControl();
      const accepted = controlHost.current!.snapshot().shader as {
        error?: string;
      } | null;
      if (accepted?.error)
        throw new ControlError("operation_failed", accepted.error);
      return { revision: documentRevision.current, shader: accepted };
    }
    if (method.startsWith("camera.")) {
      const viewport = port();
      if (method === "camera.fit") await viewport.fit();
      else if (method === "camera.set")
        await viewport.setCamera({
          position: params.position,
          target: params.target,
          ...(params.up !== undefined ? { up: params.up } : {}),
        } as CameraState);
      else if (method === "camera.orbit")
        await viewport.orbit(
          params.horizontalDegrees as number,
          params.verticalDegrees as number,
        );
      else if (method === "camera.zoom")
        await viewport.zoom(params.factor as number);
      return { revision: documentRevision.current, ...viewport.getCamera() };
    }
    if (method === "image.export") {
      await inspection.synchronize();
      if (
        (native && typeof params.path !== "string") ||
        (!native && params.path !== undefined)
      )
        throw new ControlError(
          "invalid_arguments",
          native
            ? "Native PNG export requires an authorized path"
            : "Browser PNG export returns a data URL; paths are unavailable",
        );
      const captureRevision = documentRevision.current;
      const capture = await port().capture(params.transparent === true);
      if (native) {
        const receipt = await invoke<{ path: string; bytes: number }>(
          "control_write_image",
          {
            path: params.path,
            dataUrl: capture.dataUrl,
            overwrite: params.overwrite === true,
          },
        );
        return {
          ...receipt,
          width: capture.width,
          height: capture.height,
          mimeType: "image/png",
          revision: captureRevision,
          currentRevision: documentRevision.current,
        };
      }
      return {
        ...capture,
        mimeType: "image/png",
        revision: captureRevision,
        currentRevision: documentRevision.current,
      };
    }
    throw new ControlError(
      "method_not_found",
      `Unknown application operation ${method}`,
    );
  }
  async function inspectionCommand(
    method: string,
    params: Record<string, unknown> = {},
    options: { signal?: AbortSignal } = {},
  ): Promise<unknown> {
    const api = controller.current;
    if (!api) throw new Error("Application control is not ready");
    if (options.signal?.aborted)
      throw new ControlError("cancelled", "Operation cancelled");
    let result = (await api.request(method, params)) as Record<string, unknown>;
    if (typeof result?.jobId === "string") {
      const jobId = result.jobId;
      // The form owns this receipt only. Closing an editor must never call the
      // global Stop action or cancel a later, unrelated background operation.
      const cancelOwned = () => {
        void api.request("job.cancel", { jobId }).catch(() => {});
      };
      options.signal?.addEventListener("abort", cancelOwned, { once: true });
      if (options.signal?.aborted) cancelOwned();
      try {
        while (true) {
          await new Promise((resolve) => setTimeout(resolve, 80));
          const job = (await api.request("job.get", { jobId })) as {
            status: string;
            result?: Record<string, unknown>;
            error?: { message: string; data?: { kind?: string } };
          };
          if (job.status === "completed") {
            result = job.result ?? {};
            break;
          }
          if (job.status === "cancelled")
            throw new ControlError(
              "cancelled",
              job.error?.message ?? "Operation cancelled",
            );
          if (job.status === "failed")
            throw new Error(job.error?.message ?? "Operation failed");
        }
      } finally {
        options.signal?.removeEventListener("abort", cancelOwned);
      }
    }
    if (method === "table.export" && typeof result?.text === "string") {
      let text = result.text;
      while (text.length < (result.totalCharacters as number)) {
        const chunk = (await api.request(method, {
          ...params,
          offset: text.length,
        })) as { text: string };
        if (!chunk.text) throw new Error("Incomplete CSV export");
        text += chunk.text;
      }
      if (native)
        await trackNativeSave(() =>
          invoke<boolean>("save_csv", {
            text,
            name: result.name,
            protectedPaths: protectedSourcePath ? [protectedSourcePath] : [],
          }),
        );
      else {
        const url = URL.createObjectURL(
          new Blob([text], { type: "text/csv;charset=utf-8" }),
        );
        const link = window.document.createElement("a");
        link.href = url;
        link.download = result.name as string;
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    }
    await synchronizeControl();
    return result;
  }
  inspectionCommandRef.current = inspectionCommand;
  controlHost.current = {
    native,
    viewport: () => viewportControl.current,
    synchronize: synchronizeControl,
    execute: executeControl,
    snapshot: () => ({
      document: current.current,
      revision: documentRevision.current,
      dirty: unsaved.current,
      busy: activity.current
        ? busy || "Operation in progress"
        : conversionActivity.current
          ? "Converting files"
          : saving.current || hasNativeSave()
            ? "Saving document"
            : "",
      progress: inspection.progress
        ? {
            ...inspection.progress,
            elapsedSeconds: Math.max(
              0,
              Math.floor(
                (performance.now() - inspection.progress.started) / 1000,
              ),
            ),
          }
        : calculation,
      mode,
      resolution,
      shading: surfaceShading,
      ambientOcclusion: {
        ...viewportAmbientOcclusion,
        automaticRadius: automaticAoRadius,
      },
      shader: appliedShader
        ? {
            vertexName: appliedShader.vertexName,
            fragmentName: appliedShader.fragmentName,
            target: appliedShader.target,
            transparency: appliedShader.transparent !== false,
            uniforms: { ...appliedShader.values },
            error: shaderError,
          }
        : null,
      palette: {
        custom: Boolean(atomPalette),
        name: atomPaletteName,
      },
      volumeQuality,
      structureDisplay: structureDisplaySummary(
        current.current,
        structureDisplay,
      ),
      inspection: {
        lastPick: inspection.getPick(),
        pickEnabled: inspection.pickEnabled,
        selectedCount: inspection.selectedAtoms.length,
        orderedAtoms: inspection.orderedAtoms.slice(),
        measurementCount:
          current.current?.annotations?.measurements.length ?? 0,
        molecularSurfaceCount: current.current?.molecular_surfaces?.length ?? 0,
        analysisCount: current.current?.field_analysis?.items.length ?? 0,
      },
    }),
  };
  const fieldLabel = doc
    ? [...doc.orbitals, ...doc.densities, ...doc.grids].find(
        (f) => f.id === doc.view.field,
      )?.label
    : "";
  const experimentTools = doc
    ? {
        geometry: (
          <InspectionControls
            doc={doc}
            selectedAtoms={inspection.selectedAtoms}
            orderedAtoms={inspection.orderedAtoms}
            measurements={inspection.measurements}
            busy={!!busy}
            error={inspection.error}
            pickEnabled={inspection.pickEnabled}
            onPickEnabled={inspection.setPickEnabled}
            onCancel={stop}
            onCommand={sendInspectionCommand}
          />
        ),
        analysis: (
          <FieldAnalysisControls
            doc={doc}
            selectedAtoms={inspection.selectedAtoms}
            orderedAtoms={inspection.orderedAtoms}
            busy={!!busy}
            error={inspection.error}
            onCancel={stop}
            onCommand={sendInspectionCommand}
            onBeginEdit={pendingInspectionSave.begin}
          />
        ),
        molecular: (
          <MolecularSurfaceControls
            doc={doc}
            selectedAtoms={inspection.selectedAtoms}
            busy={!!busy}
            error={inspection.error}
            progress={inspection.progress}
            onCancel={stop}
            onCommand={sendInspectionCommand}
          />
        ),
      }
    : { geometry: null, analysis: null, molecular: null };
  return (
    <div className="application">
      <NativeExitGuard
        snapshot={() => ({
          document: current.current,
          dirty: unsaved.current,
          busy:
            activity.current ||
            conversionActivity.current ||
            hasNativeSave() ||
            pendingInspectionSave.getSnapshot(),
          saving: saving.current || hasNativeSave(),
          conversionPending,
        })}
        save={save}
        beforeExit={() => {
          ++generation.current;
          cancel();
          inspection.cancel();
          cancelConversion.current?.();
          setBusy("");
          setCalculation(null);
        }}
        onError={setError}
      />
      <header className="topbar">
        <div className="brand">
          <Atom size={27} strokeWidth={1.5} />
          <h1>EigenVista</h1>
          <span className="build-label">PREVIEW</span>
        </div>
        <div className="document-title" title={doc?.title}>
          {doc?.title ?? "New document"}
          {dirty && <span className="dirty" aria-label="Unsaved changes" />}
        </div>
        <div className="file-actions">
          <button onClick={openFile} disabled={!!busy} title="Open document">
            <FolderOpen size={17} />
            <span>Open</span>
          </button>
          <button
            onClick={() => setConverterOpen(true)}
            disabled={!!busy}
            title="Convert Files"
            aria-label="Convert Files"
          >
            <ArrowRightLeft size={17} />
            <span>Convert</span>
          </button>
          <button
            onClick={save}
            disabled={!doc || !!busy || nativeSaving}
            title="Save document"
          >
            <Save size={17} />
            <span>Save</span>
          </button>
        </div>
        <input
          ref={file}
          className="file-input"
          type="file"
          accept={molecularExtensions}
          aria-label="Open molecular file"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) await load(browserSource(f));
          }}
        />
      </header>
      <ConvertFiles
        open={converterOpen}
        onClose={() => setConverterOpen(false)}
        onActivityChange={conversionChanged}
        exitCancel={cancelConversion}
      />
      {orbitalsOpen && doc && (
        <OrbitalBrowser
          document={doc}
          resolution={resolution}
          onClose={() => setOrbitalsOpen(false)}
          onGenerate={generateOrbitals}
        />
      )}
      {error && (
        <div className="error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            Close
          </button>
        </div>
      )}
      {importReport && (
        <div className="import-report">
          <details>
            <summary>
              {importReport.format.toUpperCase()}:{" "}
              {importReport.warnings.length} import{" "}
              {importReport.warnings.length === 1 ? "warning" : "warnings"}
            </summary>
            <ul>
              {importReport.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
            </ul>
          </details>
          <button
            aria-label="Dismiss import warnings"
            title="Dismiss import warnings"
            onClick={() => setImportReport(null)}
          >
            <X size={15} />
          </button>
        </div>
      )}
      {doc ? (
        <WorkspaceFrame
          enabled={WORKSPACE_LAB_ENABLED}
          tools={experimentTools}
          context={`${doc.title} · ${doc.atoms.positions.length} atoms`}
          unsaved={dirty}
          busy={busy}
          cancellable={!!calculation || !!inspection.progress}
          progress={inspection.progress?.stage ?? calculation?.stage}
          molecularProgress={
            inspection.progress?.operation === "molecularSurfaces.generate"
              ? inspection.progress
              : null
          }
          warnings={importReport?.warnings.length ?? 0}
          onCancel={stop}
        >
          <PanelSidebar
            pane="left"
            order={panelOrder.order.left}
            onMove={panelOrder.move}
          >
            <PanelSection
              key="document"
              id="document"
              title="Molecular data"
              expanded={panels.expanded.document}
              onToggle={() => panels.toggle("document")}
              headerAction={
                <details className="examples">
                  <summary title="Open example">
                    <FlaskConical size={16} />
                    <ChevronDown size={13} />
                  </summary>
                  <div>
                    <button disabled={!!busy} onClick={() => example(false)}>
                      Hydrogen pair
                    </button>
                    <button disabled={!!busy} onClick={() => example(true)}>
                      Fractional open shell
                    </button>
                  </div>
                </details>
              }
            >
              <div className="document-summary">
                <Atom size={19} />
                <div>
                  <strong>{doc.atoms.positions.length} atoms</strong>
                  <span>
                    {doc.bonds.length}{" "}
                    {doc.bonds.length === 1 ? "bond" : "bonds"}
                  </span>
                  <span>{doc.basis.length} basis functions</span>
                </div>
              </div>
              <label>
                Representation
                <select
                  aria-label="Representation"
                  value={doc.view.representation}
                  onChange={(e) => editView({ representation: e.target.value })}
                >
                  <option value="ball-stick">Ball and stick</option>
                  <option value="liquorice">Liquorice</option>
                  <option value="space-fill">Van der Waals</option>
                  <option value="trace" disabled={!hasProtein}>
                    Protein backbone trace
                  </option>
                  <option value="tube" disabled={!hasProtein}>
                    Protein smooth tube
                  </option>
                  <option value="ribbon" disabled={!hasProtein}>
                    Protein ribbon
                  </option>
                  <option value="cartoon" disabled={!hasProtein}>
                    Protein cartoon
                  </option>
                </select>
              </label>
              <StructureControls
                doc={doc}
                value={structureDisplay}
                onChange={setStructureDisplay}
              />
              {!WORKSPACE_LAB_ENABLED && experimentTools.geometry}
            </PanelSection>
            <PanelSection
              key="quantum-fields"
              id="quantum-fields"
              title="Quantum fields"
              className="field-section"
              expanded={panels.expanded["quantum-fields"]}
              onToggle={() => panels.toggle("quantum-fields")}
            >
              {[
                { name: "Orbitals", fields: doc.orbitals },
                { name: "Density matrices", fields: doc.densities },
                { name: "Sampled fields", fields: doc.grids },
              ].map(
                (group) =>
                  group.fields.length > 0 && (
                    <div className="field-group" key={group.name}>
                      <h3>{group.name}</h3>
                      {group.name === "Orbitals" && (
                        <button
                          className="browse-orbitals"
                          aria-label="Browse orbitals"
                          title="Browse and select orbitals"
                          disabled={!!busy}
                          onClick={() => setOrbitalsOpen(true)}
                        >
                          <ListChecks size={16} />
                          Orbitals ({doc.orbitals.length})
                        </button>
                      )}
                      <div
                        className={
                          group.name === "Orbitals"
                            ? "orbital-field-list"
                            : undefined
                        }
                      >
                        {group.fields.map((f) => (
                          <button
                            className={`field-row ${doc.view.field === f.id ? "selected" : ""}`}
                            key={f.id}
                            disabled={!!busy}
                            onClick={() => void selectField(f.id)}
                          >
                            <span className="field-dot" />
                            <span>
                              {f.label}
                              <small>
                                {"occupation" in f
                                  ? `${f.spin} / occ. ${f.occupation ?? "unknown"}`
                                  : "kind" in f
                                    ? f.kind
                                    : f.quantity}
                              </small>
                            </span>
                            {doc.view.field === f.id && <Check size={15} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ),
              )}
              {!doc.view.field && <p className="empty">No quantum fields</p>}
              {!WORKSPACE_LAB_ENABLED && experimentTools.analysis}
            </PanelSection>
            <PanelSection
              key="provenance"
              id="provenance"
              title="Provenance"
              className="provenance"
              expanded={panels.expanded.provenance}
              onToggle={() => panels.toggle("provenance")}
            >
              {doc.provenance.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </PanelSection>
          </PanelSidebar>
          <div className="viewport-column">
            <Viewport
              controlRef={viewportControl}
              doc={doc}
              grid={grid}
              mode={mode}
              volumeQuality={volumeQuality}
              ambientOcclusion={viewportAmbientOcclusion}
              shading={surfaceShading}
              shader={appliedShader}
              atomPalette={atomPalette}
              structureDisplay={structureDisplay}
              reset={reset}
              onSelect={setInspected}
              onInspectionPick={inspection.recordPick}
              inspectionSelection={inspection.selectedAtoms}
              inspectedPick={inspection.getPick()}
              inspectionMeasurements={inspection.measurements}
              onShaderLog={(log) => {
                if (log) {
                  setShaderError(log);
                  setShaderStatus("Shader reported compile messages");
                } else if (appliedShader) {
                  setShaderError("");
                  setShaderStatus(
                    `Applied ${appliedShader.vertexName} + ${appliedShader.fragmentName}`,
                  );
                }
              }}
            />
            <div className="selection-status">
              <div className="selection-description">
                <span>{inspectionPrimary || fieldLabel || doc.title}</span>
                {inspectionDetail && (
                  <span title={inspectionDetail}>{inspectionDetail}</span>
                )}
              </div>
              <span>
                {doc.surfaces.length + (doc.molecular_surfaces?.length ?? 0)}{" "}
                saved surfaces
              </span>
            </div>
          </div>
          <PanelSidebar
            pane="right"
            order={panelOrder.order.right}
            onMove={panelOrder.move}
          >
            <PanelSection
              key="field-rendering"
              id="field-rendering"
              title="Field rendering"
              expanded={panels.expanded["field-rendering"]}
              onToggle={() => panels.toggle("field-rendering")}
              forceOpen={!!busy}
            >
              <label>
                Mode
                <select
                  aria-label="Rendering mode"
                  value={mode}
                  disabled={!!busy}
                  onChange={(e) =>
                    void selectMode(e.target.value as RenderMode)
                  }
                >
                  <option value="mesh">Isosurface mesh</option>
                  <option value="raycast" disabled={!doc.view.field}>
                    Sampled raycast preview
                  </option>
                  <option value="volume" disabled={!doc.view.field}>
                    Volume preview
                  </option>
                </select>
              </label>
              {mode !== "mesh" && (
                <label>
                  Sampling quality
                  <select
                    aria-label="Preview sampling quality"
                    value={volumeQuality}
                    disabled={!!busy}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (value === 1 || value === 2 || value === 4)
                        setVolumeQuality(value);
                    }}
                  >
                    <option value="1">Draft</option>
                    <option value="2">Standard</option>
                    <option value="4">Fine</option>
                  </select>
                </label>
              )}
              <label>
                Isovalue
                <input
                  aria-label="Isovalue"
                  type="number"
                  min="0.00001"
                  step="0.01"
                  value={doc.view.isovalue}
                  disabled={!!busy || !doc.view.field}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) editView({ isovalue: v });
                  }}
                />
              </label>
              <div className="units">
                {doc.orbitals.some((o) => o.id === doc.view.field)
                  ? "bohr^-3/2"
                  : doc.densities.some((o) => o.id === doc.view.field)
                    ? "electrons / bohr^3"
                    : "Scalar units unspecified"}
              </div>
              <label>
                Grid resolution
                <select
                  aria-label="Grid resolution"
                  value={resolution}
                  disabled={!!busy}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (!isGridResolution(value)) return;
                    if (
                      mode !== "mesh" ||
                      doc.grids.some((g) => g.id === doc.view.field)
                    )
                      void prepareGrid(doc, value, mode);
                    else {
                      setResolution(value);
                      setGrid(null);
                    }
                  }}
                >
                  {!gridResolutions.some((n) => n === resolution) && (
                    <option value={resolution}>{resolution}³</option>
                  )}
                  {gridResolutions.map((n) => (
                    <option key={n} value={n} title={`${n} x ${n} x ${n}`}>
                      {n}
                      {"\u00b3"}
                    </option>
                  ))}
                </select>
                <GridResolutionInput
                  label="Custom grid resolution"
                  value={resolution}
                  disabled={!!busy}
                  onApply={(value) => {
                    if (
                      mode !== "mesh" ||
                      doc.grids.some((g) => g.id === doc.view.field)
                    )
                      void prepareGrid(doc, value, mode);
                    else {
                      setResolution(value);
                      setGrid(null);
                    }
                  }}
                />
              </label>
              <button
                className="primary generate"
                disabled={
                  busy ? !busy.startsWith("Calculating") : !doc.view.field
                }
                onClick={() => (busy ? stop() : compute(doc))}
              >
                {busy.startsWith("Calculating") ? (
                  <>
                    <Square size={15} />
                    Cancel
                  </>
                ) : (
                  <>
                    <Play size={15} />
                    Generate surfaces
                  </>
                )}
              </button>
              {calculation && (
                <CalculationProgress
                  key={calculation.started}
                  progress={calculation}
                />
              )}
              {inspection.progress && (
                <p role="status" aria-label="Scientific inspection progress">
                  {inspection.progress.stage}
                  {inspection.progress.total
                    ? ` · ${inspection.progress.completed}/${inspection.progress.total}`
                    : ""}
                </p>
              )}
              {!WORKSPACE_LAB_ENABLED && experimentTools.molecular}
            </PanelSection>
            <PanelSection
              key="appearance"
              id="appearance"
              title="Appearance"
              expanded={panels.expanded.appearance}
              onToggle={() => panels.toggle("appearance")}
            >
              <div className="color-pair">
                <label>
                  <input
                    aria-label="Positive color"
                    type="color"
                    value={doc.view.positive_color}
                    onChange={(e) =>
                      editView({ positive_color: e.target.value })
                    }
                  />
                  Positive
                </label>
                <label>
                  <input
                    aria-label="Negative color"
                    type="color"
                    value={doc.view.negative_color}
                    onChange={(e) =>
                      editView({ negative_color: e.target.value })
                    }
                  />
                  Negative
                </label>
              </div>
              <label className="range-label">
                Opacity<output>{Math.round(doc.view.opacity * 100)}%</output>
                <input
                  aria-label="Opacity"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={doc.view.opacity}
                  onChange={(e) =>
                    editView({ opacity: Number(e.target.value) })
                  }
                />
              </label>
              <label>
                Surface shading
                <select
                  aria-label="Surface shading"
                  value={surfaceShading}
                  onChange={(e) =>
                    setSurfaceShading(e.target.value as SurfaceShading)
                  }
                >
                  <option value="diffuse">Diffuse</option>
                  <option value="blinn-phong">Blinn-Phong</option>
                </select>
              </label>
              <label className="ambient-occlusion-toggle">
                Atom and bond ambient occlusion
                <input
                  type="checkbox"
                  checked={ambientOcclusion.enabled}
                  onChange={(event) =>
                    setAmbientOcclusion((current) => ({
                      ...current,
                      enabled: event.target.checked,
                    }))
                  }
                />
              </label>
              <label className="ambient-occlusion-toggle">
                Molecular surface ambient occlusion
                <input
                  type="checkbox"
                  checked={ambientOcclusion.surfaceEnabled}
                  onChange={(event) =>
                    setAmbientOcclusion((current) => ({
                      ...current,
                      surfaceEnabled: event.target.checked,
                    }))
                  }
                  aria-describedby="surface-ao-requirements"
                />
              </label>
              {ambientOcclusion.enabled && (
                <p className="empty">Matte Lambert shading with SSAO.</p>
              )}
              <p id="surface-ao-requirements" className="empty">
                SES and SAS use matte AO at 100% opacity with built-in shading.
              </p>
              {(ambientOcclusion.enabled ||
                ambientOcclusion.surfaceEnabled) && (
                <>
                  <label className="range-label">
                    AO strength
                    <output>
                      {Math.round(ambientOcclusion.strength * 100)}%
                    </output>
                    <input
                      aria-label="AO strength"
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={ambientOcclusion.strength}
                      onChange={(event) =>
                        setAmbientOcclusion((current) => ({
                          ...current,
                          strength: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                  <label className="ambient-occlusion-toggle">
                    Automatic AO radius
                    <input
                      aria-label="Automatic AO radius"
                      type="checkbox"
                      checked={automaticAoRadius}
                      onChange={(event) => {
                        if (!event.target.checked)
                          setAmbientOcclusion((current) => ({
                            ...current,
                            radiusAngstrom: aoRadiusReadout,
                          }));
                        setAutomaticAoRadius(event.target.checked);
                      }}
                    />
                  </label>
                  <label className="range-label">
                    AO radius (angstrom)
                    <output>
                      {automaticAoRadius &&
                      ambientOcclusion.enabled &&
                      ambientOcclusion.surfaceEnabled
                        ? `${aoRadiusReadout.toFixed(2)} Å atoms · ${viewportAmbientOcclusion.surfaceRadiusAngstrom.toFixed(2)} Å surfaces`
                        : `${aoRadiusReadout.toFixed(2)} Å`}
                    </output>
                    <input
                      aria-label="AO radius (angstrom)"
                      type="range"
                      min="0.25"
                      max="50"
                      step="0.25"
                      disabled={automaticAoRadius}
                      value={aoRadiusReadout}
                      onChange={(event) =>
                        setAmbientOcclusion((current) => ({
                          ...current,
                          radiusAngstrom: Number(event.target.value),
                        }))
                      }
                    />
                  </label>
                </>
              )}
            </PanelSection>
            <PanelSection
              key="atom-colours"
              id="atom-colours"
              title="Atom colours"
              expanded={panels.expanded["atom-colours"]}
              onToggle={() => panels.toggle("atom-colours")}
            >
              <p className="empty">
                {atomPalette
                  ? `Overridden by ${atomPaletteName}`
                  : `Built-in default (${DEFAULT_ATOM_COLORS.size} elements)`}
              </p>
              <div className="file-actions">
                <button type="button" onClick={() => chooseAtomPalette()}>
                  Colours file…
                </button>
                {atomPalette && (
                  <button type="button" onClick={resetAtomPalette}>
                    Reset to defaults
                  </button>
                )}
              </div>
              <input
                ref={atomPaletteInput}
                className="file-input"
                type="file"
                accept=".json,.txt"
                aria-label="Atom colours file"
                onChange={(e) => {
                  const chosen = e.target.files?.[0];
                  e.target.value = "";
                  if (!chosen) return;
                  void chosen
                    .text()
                    .then((text) => applyAtomPalette(text, chosen.name));
                }}
              />
              {atomPaletteError && (
                <pre className="error" role="alert">
                  {atomPaletteError}
                </pre>
              )}
            </PanelSection>
            {(() => {
              const defs =
                shaderEditor.vertex && shaderEditor.fragment
                  ? parseUniforms(
                      shaderEditor.vertex.source,
                      shaderEditor.fragment.source,
                    )
                  : [];
              return (
                <ShaderPanel
                  key="surface-shader"
                  expanded={panels.expanded["surface-shader"]}
                  onToggle={() => panels.toggle("surface-shader")}
                  uniforms={defs}
                  state={shaderEditor}
                  surfaceOptions={[
                    ...doc.surfaces,
                    ...(doc.molecular_surfaces ?? []),
                  ].map((s) => ({
                    id: s.id,
                    label: s.label,
                  }))}
                  onChange={(next) => {
                    setShaderEditor(next);
                    if (
                      appliedShader &&
                      appliedShader.vertexSource === next.vertex?.source &&
                      appliedShader.fragmentSource === next.fragment?.source
                    ) {
                      setAppliedShader({
                        ...appliedShader,
                        target: next.target,
                        values: next.values,
                        transparent: next.transparent !== false,
                      });
                    }
                  }}
                  onApply={() => {
                    if (!shaderEditor.vertex || !shaderEditor.fragment) return;
                    try {
                      const uniforms = parseUniforms(
                        shaderEditor.vertex.source,
                        shaderEditor.fragment.source,
                      );
                      const values = mergeUniformValues(
                        uniforms,
                        defaultValues(uniforms),
                        shaderEditor.values,
                      );
                      const pair: ShaderPair & { target: string } = {
                        vertexName: shaderEditor.vertex.name,
                        fragmentName: shaderEditor.fragment.name,
                        vertexSource: shaderEditor.vertex.source,
                        fragmentSource: shaderEditor.fragment.source,
                        uniforms,
                        values,
                        target: shaderEditor.target,
                        transparent: shaderEditor.transparent !== false,
                      };
                      setShaderEditor({ ...shaderEditor, values });
                      setAppliedShader(pair);
                      setShaderError("");
                      setShaderStatus(
                        `Applied ${pair.vertexName} + ${pair.fragmentName}`,
                      );
                    } catch (e) {
                      setShaderError(String(e));
                      setShaderStatus("");
                    }
                  }}
                  onClear={() => {
                    setAppliedShader(null);
                    setShaderEditor({
                      vertex: null,
                      fragment: null,
                      values: {},
                      target: "all",
                    });
                    setShaderStatus("Cleared custom surface shader");
                    setShaderError("");
                  }}
                  status={shaderStatus}
                  error={shaderError}
                />
              );
            })()}
            <PanelSection
              key="saved-surfaces"
              id="saved-surfaces"
              title="Saved surfaces"
              className="surfaces"
              count={doc.surfaces.length}
              expanded={panels.expanded["saved-surfaces"]}
              onToggle={() => panels.toggle("saved-surfaces")}
            >
              {doc.surfaces.length === 0 && (
                <p className="empty">No surfaces</p>
              )}
              {doc.surfaces.map((s) => (
                <div className="surface-row" key={s.id}>
                  <button
                    aria-label={`Toggle ${s.label}`}
                    title="Toggle visibility"
                    onClick={() => {
                      setDoc({
                        ...doc,
                        surfaces: doc.surfaces.map((x) =>
                          x.id === s.id ? { ...x, visible: !x.visible } : x,
                        ),
                      });
                      setDirty(true);
                    }}
                  >
                    {s.visible ? <Eye size={16} /> : <EyeOff size={16} />}
                  </button>
                  <span
                    className="surface-swatch"
                    style={{ background: s.color }}
                  />
                  <div>
                    <strong>
                      {s.isovalue === null
                        ? s.label
                        : `${s.field} ${s.isovalue > 0 ? "+" : ""}${s.isovalue}`}
                    </strong>
                    <small>
                      {(s.indices.length / 3).toLocaleString()} triangles
                    </small>
                  </div>
                  <button
                    aria-label={`Delete ${s.label}`}
                    title="Delete surface"
                    disabled={!!busy}
                    onClick={() => {
                      setDoc({
                        ...doc,
                        surfaces: doc.surfaces.filter((x) => x.id !== s.id),
                      });
                      setDirty(true);
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </PanelSection>
          </PanelSidebar>
        </WorkspaceFrame>
      ) : (
        <div className="loading">
          <Atom size={36} />
          <p>{busy || "Unable to open the scientific core"}</p>
        </div>
      )}
      <footer>
        <span className={busy ? "activity active" : "activity"} />
        <span role="status">{busy || status || "Ready"}</span>
        <span className="runtime">
          <Box size={13} />
          Rust / {native ? "Native (Tauri)" : "WebAssembly"}
        </span>
      </footer>
    </div>
  );
}
