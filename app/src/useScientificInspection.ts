import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createScienceClient } from "./science";
import { ControlError, type ControlExecution } from "./control";
import { native } from "./files";
import { fieldRenderingIssue } from "./fieldAnalysisRendering";
import { validateAnnotationRendering } from "./annotationRendering";
import type { EigenVistaDocument } from "./types";
import type {
  Annotations,
  AnnotationLabel,
  FieldAnalysisItem,
  FieldDescriptor,
  MeasurementDefinition,
  MeasurementResult,
  MolecularSurface,
  NamedSelection,
  InspectionPick,
} from "./inspectionTypes";

const BOHR = 0.529177210903;
const emptyAnnotations = (): Annotations => ({
  selections: [],
  measurements: [],
  labels: [],
});
const page = <T>(rows: T[], params: Record<string, unknown>) => {
  const offset = (params.offset as number | undefined) ?? 0;
  return {
    total: rows.length,
    offset,
    items: rows.slice(
      offset,
      offset + ((params.limit as number | undefined) ?? 100),
    ),
  };
};
/** Geometry-only work never sends resident quantum arrays or replaces QC registration. */
export const inspectionGeometry = (
  doc: EigenVistaDocument,
): EigenVistaDocument => ({
  ...doc,
  basis: [],
  orbitals: [],
  densities: [],
  grids: [],
  surfaces: [],
  molecular_surfaces: undefined,
  field_analysis: undefined,
  bonds: [],
  view: { ...doc.view, representation: "ball-stick", field: null },
});
const summary = ({ values, valid, ...item }: FieldAnalysisItem) => ({
  ...item,
  sampleCount: values.length,
  validCount: valid.reduce((total, value) => total + value, 0),
  renderingWarning: fieldRenderingIssue({ ...item, values, valid }),
});
const surfaceSummary = ({
  positions,
  normals: _normals,
  indices,
  vertex_atoms: _attribution,
  atom_indices,
  radii_angstrom: _radii,
  warnings,
  ...surface
}: MolecularSurface) => ({
  ...surface,
  atomCount: atom_indices.length,
  vertexCount: positions.length / 3,
  triangleCount: indices.length / 3,
  warningCount: warnings.length,
  warnings: warnings.slice(0, 8).map((warning) => warning.slice(0, 256)),
});
const upsert = <T extends { id: string }>(rows: T[], row: T): T[] =>
  rows.some((item) => item.id === row.id)
    ? rows.map((item) => (item.id === row.id ? row : item))
    : [...rows, row];
const requireId = <T extends { id: string }>(rows: T[], id: unknown): T => {
  const found = rows.find((item) => item.id === id);
  if (!found)
    throw new ControlError(
      "not_found",
      `Unknown inspection object ${String(id).slice(0, 128)}`,
    );
  return found;
};

interface Options {
  doc: EigenVistaDocument | null;
  getDocument(): EigenVistaDocument | null;
  publish(doc: EigenVistaDocument): void;
  display(
    atoms: number[] | null,
    focus: boolean,
    reset: boolean,
    focusAtoms?: number[],
  ): void;
  setBusy(message: string): void;
  protectedPath?: string;
}

/** One shared GUI/API service; accepted records are committed only after Save preflight. */
export function useScientificInspection(options: Options) {
  const [client] = useState(createScienceClient);
  const latest = useRef(options);
  latest.current = options;
  const [selected, setSelected] = useState<number[]>([]);
  const [ordered, setOrdered] = useState<number[]>([]);
  const [pickEnabled, setPickEnabled] = useState(false);
  const [lastPick, setLastPick] = useState<InspectionPick | null>(null);
  const pickedGeometry = useRef<number[] | null>(null);
  const [measurements, setMeasurements] = useState<
    Array<MeasurementDefinition & { result: MeasurementResult }>
  >([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{
    stage: string;
    completed?: number;
    total?: number;
  } | null>(null);
  const source = useRef<EigenVistaDocument["atoms"] | undefined>(undefined);
  const selection = useRef<number[]>([]),
    picks = useRef<number[]>([]);
  const pending = useRef<Promise<unknown>>(Promise.resolve());
  const abort = useRef<AbortController | null>(null);
  const epoch = useRef(0);
  const read = () => {
    const doc = latest.current.getDocument();
    if (!doc)
      throw new ControlError("no_document", "No molecular document is open");
    return doc;
  };
  const active = () =>
    source.current === read().atoms ? selection.current : [];
  const setSelection = (indices: number[], order: number[] = indices) => {
    const doc = read();
    if (
      indices.some(
        (i) =>
          !Number.isSafeInteger(i) || i < 0 || i >= doc.atoms.positions.length,
      )
    )
      throw new ControlError(
        "invalid_arguments",
        "Selection contains invalid original atom indices",
      );
    source.current = doc.atoms;
    selection.current = [...new Set(indices)].sort((a, b) => a - b);
    picks.current = [...new Set(order)];
    setSelected(selection.current);
    setOrdered(picks.current);
  };
  const measurementTable = async (
    doc: EigenVistaDocument,
    signal?: AbortSignal,
  ) => {
    if (!doc.annotations?.measurements.length) return [];
    const results = await client.request<MeasurementResult[]>(
      "inspection_measurements",
      { doc: inspectionGeometry(doc) },
      undefined,
      { signal },
    );
    return (doc.annotations?.measurements ?? []).map((item, index) => ({
      ...item,
      result: results[index],
    }));
  };
  useEffect(() => {
    epoch.current++;
    abort.current?.abort();
    client.cancel(new Error("Inspection source replaced"));
    source.current = options.doc?.atoms;
    selection.current = [];
    picks.current = [];
    setSelected([]);
    setOrdered([]);
    setLastPick(null);
    pickedGeometry.current = null;
    setMeasurements([]);
    setError("");
  }, [options.doc?.atoms, options.doc?.structure, client]);
  useEffect(() => {
    const doc = options.doc;
    if (!doc) return;
    const revision = epoch.current;
    const work = measurementTable(doc)
      .then((table) => {
        if (
          epoch.current === revision &&
          latest.current.getDocument()?.atoms === doc.atoms
        )
          setMeasurements(table);
      })
      .catch((cause) => {
        if (epoch.current === revision) setError(String(cause));
      });
    pending.current = work;
  }, [options.doc?.atoms, options.doc?.annotations, client]);
  useEffect(
    () => () => {
      abort.current?.abort();
      client.cancel(new Error("Inspection view closed"));
    },
    [client],
  );

  const execute = async (
    method: string,
    params: Record<string, unknown>,
    execution: ControlExecution,
  ): Promise<unknown> => {
    const original = read(),
      startEpoch = epoch.current;
    const check = () => {
      execution.assertCurrent();
      if (
        startEpoch !== epoch.current ||
        read().atoms !== original.atoms ||
        read().structure !== original.structure
      )
        throw new ControlError(
          "stale_document",
          "The source changed before inspection completed",
        );
    };
    const request = <T>(action: string, args: Record<string, unknown>) =>
      client.request<T>(
        action,
        args,
        (stage, counts) => {
          check();
          execution.progress(stage, counts);
          setProgress({ stage, ...counts });
        },
        { signal: execution.signal },
      );
    const commit = async (patch: Partial<EigenVistaDocument>) => {
      check();
      const candidate = { ...read(), ...patch };
      await request("inspection_validate", { doc: candidate });
      check();
      const table =
        patch.annotations !== undefined
          ? await measurementTable(candidate, execution.signal)
          : undefined;
      check();
      if (table) validateAnnotationRendering(candidate, table);
      check();
      latest.current.publish({ ...read(), ...patch });
      execution.markPublished();
      if (table) setMeasurements(table);
      return candidate;
    };
    const annotations = original.annotations ?? emptyAnnotations();
    const saveAnnotations = async (next: Annotations) => {
      await commit({
        annotations:
          next.selections.length ||
          next.measurements.length ||
          next.labels.length
            ? next
            : undefined,
      });
      return { saved: true };
    };
    const choose = (indices: number[]) => {
      check();
      setSelection(indices);
      if (params.showOnly || params.focus || params.resetFilters)
        latest.current.display(
          params.showOnly ? selection.current : null,
          params.focus === true,
          params.resetFilters === true,
          selection.current,
        );
      return { selectedCount: selection.current.length };
    };
    if (method === "atoms.list") {
      const offset = (params.offset as number | undefined) ?? 0,
        limit = (params.limit as number | undefined) ?? 100;
      const indices =
        params.residueIndex === undefined
          ? null
          : (original.structure?.atom_residues ?? []).flatMap((r, i) =>
              r === params.residueIndex ? [i] : [],
            );
      const count = indices?.length ?? original.atoms.positions.length;
      const items = Array.from(
        { length: Math.min(limit, Math.max(0, count - offset)) },
        (_, i) => {
          const index = indices?.[i + offset] ?? i + offset;
          return {
            index,
            element: original.atoms.elements[index],
            position: original.atoms.positions[index],
            coordinateUnit: "bohr",
            name: original.structure?.atom_names[index] ?? null,
            residueIndex: original.structure?.atom_residues[index] ?? null,
          };
        },
      );
      return { total: count, offset, items };
    }
    if (method === "residues.list")
      return page(
        (original.structure?.residues ?? [])
          .map((residue, index) => ({
            index,
            ...residue,
            chainIdentity: original.structure!.chains[residue.chain],
          }))
          .filter(
            (row) =>
              (params.kind === undefined || row.kind === params.kind) &&
              (params.name === undefined || row.name === params.name) &&
              (params.chainIndex === undefined ||
                row.chain === params.chainIndex),
          ),
        params,
      );
    if (method === "selection.pick_mode") {
      setPickEnabled(params.enabled === true);
      return { enabled: params.enabled };
    }
    if (method === "selection.get")
      return {
        ...page(active(), params),
        orderedAtoms: picks.current.slice(0, 256),
        selectedCount: active().length,
        pickEnabled,
        lastPick: currentPick(),
      };
    if (method === "selection.list") {
      const provenance = (row: NamedSelection) =>
        row.neighborhood
          ? {
              radius_angstrom: row.neighborhood.radius_angstrom,
              whole_residues: row.neighborhood.whole_residues,
              seedCount: row.neighborhood.seeds.length,
            }
          : undefined;
      if (params.id !== undefined) {
        const named = requireId(annotations.selections, params.id);
        return {
          id: named.id,
          label: named.label,
          ...page(
            params.seeds === true
              ? (named.neighborhood?.seeds ?? [])
              : named.atoms,
            params,
          ),
          neighborhood: provenance(named),
        };
      }
      return page(
        annotations.selections.map((set) => ({
          id: set.id,
          label: set.label,
          neighborhood: provenance(set),
          atomCount: set.atoms.length,
        })),
        params,
      );
    }
    if (method === "selection.clear") {
      setSelection([]);
      latest.current.display(null, false, false);
      return { selectedCount: 0 };
    }
    if (method === "selection.set") {
      const selectors = [
        params.atoms,
        params.residueIndices,
        params.selectionId,
      ].filter((value) => value !== undefined);
      if (selectors.length !== 1)
        throw new ControlError(
          "invalid_arguments",
          "Choose atoms, residues or a named selection",
        );
      let atoms = params.atoms as number[] | undefined;
      if (params.selectionId !== undefined)
        atoms = requireId(annotations.selections, params.selectionId).atoms;
      if (params.residueIndices !== undefined) {
        if (!original.structure)
          throw new ControlError(
            "unavailable",
            "Residue selection requires biological metadata",
          );
        const residues = new Set(params.residueIndices as number[]);
        if ([...residues].some((r) => r >= original.structure!.residues.length))
          throw new ControlError("invalid_arguments", "Unknown residue index");
        atoms = original.structure.atom_residues.flatMap((r, i) =>
          residues.has(r) ? [i] : [],
        );
      }
      const order = atoms!;
      if (params.mode === "add") atoms = [...picks.current, ...atoms!];
      if (params.mode === "remove") {
        const removed = new Set(atoms);
        atoms = picks.current.filter((i) => !removed.has(i));
      }
      const result = choose(atoms!);
      if (params.mode === undefined || params.mode === "replace")
        setSelection(atoms!, order);
      return result;
    }
    if (method === "selection.save") {
      const atoms = (params.atoms as number[] | undefined) ?? active();
      const row: NamedSelection = {
        id: params.id as string,
        label: params.label as string,
        atoms: [...new Set(atoms)].sort((a, b) => a - b),
      };
      const previous = annotations.selections.find((set) => set.id === row.id);
      if (
        previous?.neighborhood &&
        previous.atoms.length === row.atoms.length &&
        previous.atoms.every((atom, index) => atom === row.atoms[index])
      )
        row.neighborhood = previous.neighborhood;
      await saveAnnotations({
        ...annotations,
        selections: upsert(annotations.selections, row),
      });
      return { id: row.id, atomCount: row.atoms.length };
    }
    if (method === "selection.remove") {
      requireId(annotations.selections, params.id);
      return saveAnnotations({
        ...annotations,
        selections: annotations.selections.filter((s) => s.id !== params.id),
      });
    }
    if (method === "selection.neighborhood") {
      const seeds =
        (params.seeds as number[] | undefined) ??
        (params.selectionId
          ? requireId(annotations.selections, params.selectionId).atoms
          : active());
      const query = {
        seeds,
        radius_angstrom: params.radiusAngstrom,
        whole_residues: params.wholeResidues === true,
      };
      const result = await request<Uint32Array>("inspection_neighborhood", {
        doc: inspectionGeometry(original),
        request: query,
      });
      check();
      const atoms = Array.from(result);
      if (params.id !== undefined)
        await saveAnnotations({
          ...annotations,
          selections: upsert(annotations.selections, {
            id: params.id as string,
            label: (params.label ?? params.id) as string,
            atoms,
            neighborhood: query as NamedSelection["neighborhood"],
          }),
        });
      return choose(atoms);
    }
    if (method === "measure.evaluate")
      return request<MeasurementResult>("inspection_measure", {
        doc: inspectionGeometry(original),
        request: { kind: params.kind, atoms: params.atoms },
      });
    if (method === "measure.list")
      return page(await measurementTable(original, execution.signal), params);
    if (method === "measure.upsert")
      return saveAnnotations({
        ...annotations,
        measurements: upsert(
          annotations.measurements,
          params.measurement as MeasurementDefinition,
        ),
      });
    if (method === "measure.remove") {
      requireId(annotations.measurements, params.id);
      return saveAnnotations({
        ...annotations,
        measurements: annotations.measurements.filter(
          (m) => m.id !== params.id,
        ),
      });
    }
    if (method === "labels.list") return page(annotations.labels, params);
    if (method === "labels.upsert")
      return saveAnnotations({
        ...annotations,
        labels: upsert(annotations.labels, params.label as AnnotationLabel),
      });
    if (method === "labels.remove") {
      requireId(annotations.labels, params.id);
      return saveAnnotations({
        ...annotations,
        labels: annotations.labels.filter((m) => m.id !== params.id),
      });
    }
    if (method === "molecularSurfaces.list")
      return page(
        (original.molecular_surfaces ?? []).map(surfaceSummary),
        params,
      );
    if (method === "molecularSurfaces.atoms") {
      const surface = requireId(original.molecular_surfaces ?? [], params.id),
        offset = (params.offset as number | undefined) ?? 0;
      const indices = page(surface.atom_indices, params);
      return {
        ...indices,
        items: indices.items.map((atom, i) => ({
          index: atom,
          radiusAngstrom: surface.radii_angstrom[offset + i],
        })),
      };
    }
    if (method === "molecularSurfaces.warnings")
      return page(
        requireId(original.molecular_surfaces ?? [], params.id).warnings,
        params,
      );
    if (method === "molecularSurfaces.generate") {
      const raw = await request<MolecularSurface>("molecular_surface", {
        doc: inspectionGeometry(original),
        request: params.request,
      });
      check();
      const previous = read().molecular_surfaces?.find(
        (surface) => surface.id === raw.id,
      );
      const mesh = {
        ...raw,
        visible: previous?.visible ?? true,
        positions: Array.from(raw.positions),
        normals: Array.from(raw.normals),
        indices: Array.from(raw.indices),
        vertex_atoms: Array.from(raw.vertex_atoms),
      };
      await commit({
        molecular_surfaces: upsert(read().molecular_surfaces ?? [], mesh),
      });
      return surfaceSummary(mesh);
    }
    if (
      method === "molecularSurfaces.set" ||
      method === "molecularSurfaces.remove"
    ) {
      const row = requireId(original.molecular_surfaces ?? [], params.id);
      const { id: _id, expectedRevision: _revision, ...patch } = params;
      const rows = method.endsWith("remove")
        ? original.molecular_surfaces!.filter((s) => s.id !== row.id)
        : upsert(original.molecular_surfaces!, { ...row, ...patch });
      await commit({ molecular_surfaces: rows.length ? rows : undefined });
      return { id: row.id, removed: method.endsWith("remove") };
    }
    const analysis = original.field_analysis ?? { descriptors: [], items: [] };
    const descriptor = async (field: string) =>
      analysis.descriptors.find((d) => d.field === field) ??
      request<FieldDescriptor>("describe_field", { doc: original, field });
    if (method === "fields.describe")
      return descriptor(params.fieldId as string);
    if (method === "fields.set_key") {
      let descriptors = analysis.descriptors;
      if (params.visible === true) {
        if (!original.view.field)
          throw new ControlError(
            "unavailable",
            "Select a field before showing its numerical key",
          );
        const meaning = await descriptor(original.view.field);
        descriptors = [
          ...descriptors.filter((d) => d.field !== meaning.field),
          meaning,
        ];
      }
      await commit({
        field_analysis: {
          ...analysis,
          descriptors,
          show_field_key: params.visible === true,
        },
      });
      return { visible: params.visible };
    }
    if (method === "fields.set_metadata") {
      const next = {
        ...(params.descriptor as FieldDescriptor),
        origin: "user_declared",
      };
      // Rebind interpretation without resampling raw f64 values. Rust computes
      // the interpretation fingerprint and validates the complete candidate.
      const resolved = await request<{
        descriptor: FieldDescriptor;
        interpretation_hash: string;
      }>("analysis_metadata", { doc: original, descriptor: next });
      const state = {
        ...analysis,
        descriptors: [
          ...analysis.descriptors.filter((d) => d.field !== next.field),
          resolved.descriptor,
        ],
        items: analysis.items.map((item) =>
          item.field === next.field
            ? {
                ...item,
                descriptor: resolved.descriptor,
                interpretation_hash: resolved.interpretation_hash,
              }
            : item,
        ),
      };
      await commit({ field_analysis: state });
      return next;
    }
    if (method === "analysis.plane_atoms")
      return request("analysis_plane_atoms", {
        doc: inspectionGeometry(original),
        atoms: params.atoms,
        extent: (params.extentAngstrom as number[]).map(
          (value) => value / BOHR,
        ),
        dims: params.dims,
      });
    if (method === "analysis.create") {
      const input = params.request as Record<string, unknown>;
      const accepted = await descriptor(input.field as string);
      const supplied = input.descriptor as FieldDescriptor | undefined;
      const identical =
        supplied &&
        [
          "field",
          "quantity",
          "value_unit",
          "origin",
          "note",
          "display_unit",
        ].every(
          (key) =>
            (supplied[key as keyof FieldDescriptor] ?? "") ===
            (accepted[key as keyof FieldDescriptor] ?? ""),
        );
      const interpretation =
        !supplied || identical
          ? accepted
          : { ...supplied, origin: "user_declared" };
      const specification = { ...input, descriptor: interpretation };
      const raw = await request<FieldAnalysisItem>("analyze", {
        doc: original,
        request: specification,
      });
      check();
      const previous = read().field_analysis?.items.find(
        (item) => item.id === raw.id,
      );
      const item = {
        ...raw,
        appearance: previous?.appearance ?? raw.appearance,
        values: Array.from(raw.values),
        valid: Array.from(raw.valid),
      };
      await commit({
        field_analysis: { ...analysis, items: upsert(analysis.items, item) },
      });
      return summary(item);
    }
    if (method === "analysis.list")
      return page(analysis.items.map(summary), params);
    if (method === "analysis.get")
      return summary(requireId(analysis.items, params.id));
    if (method === "analysis.samples") {
      const item = requireId(analysis.items, params.id);
      const offset = (params.offset as number | undefined) ?? 0,
        limit = (params.limit as number | undefined) ?? 100;
      if (offset > item.values.length)
        throw new ControlError(
          "invalid_arguments",
          "Sample offset is outside the accepted cache",
        );
      const rows = await request<{
        items: unknown[];
        profileLengthAngstrom: number | null;
      }>("analysis_samples", {
        definition: item.definition,
        values: item.values.slice(offset, offset + limit),
        valid: item.valid.slice(offset, offset + limit),
        offset,
      });
      return {
        ...rows,
        total: item.values.length,
        offset,
        descriptor: item.descriptor,
        definition: item.definition,
        method: item.method,
        coordinateUnit: "bohr",
        sourceHash: item.source_hash,
      };
    }
    if (method === "analysis.set" || method === "analysis.remove") {
      const item = requireId(analysis.items, params.id);
      const appearance = {
        ...item.appearance,
        ...(params.appearance as object),
      };
      if (params.automaticRange === true) delete appearance.range;
      const items = method.endsWith("remove")
        ? analysis.items.filter((v) => v.id !== item.id)
        : upsert(analysis.items, {
            ...item,
            ...(params.label === undefined
              ? {}
              : { label: params.label as string }),
            appearance,
          });
      await commit({ field_analysis: { ...analysis, items } });
      return { id: item.id, removed: method.endsWith("remove") };
    }
    if (method === "table.export") {
      let text: string;
      if (params.kind === "analysis")
        text = await request<string>("analysis_csv", {
          item: requireId(analysis.items, params.id),
        });
      else {
        const rows = await measurementTable(original, execution.signal);
        const escaped = (text: string) =>
          `"${/^[=+\-@\t\r]/.test(text) ? "'" : ""}${text.replaceAll('"', '""')}"`;
        text =
          "id,label,kind,atoms,value,unit,status,reason\n" +
          rows
            .map((r) =>
              [
                escaped(r.id),
                escaped(r.label),
                r.kind,
                escaped(r.atoms.join(" ")),
                r.result.value ?? "",
                r.result.unit,
                r.result.status,
                escaped(r.result.reason ?? ""),
              ].join(","),
            )
            .join("\n") +
          "\n";
      }
      if (new TextEncoder().encode(text).length > 32 * 1024 * 1024)
        throw new ControlError("limit_exceeded", "CSV exceeds 32 MiB");
      check();
      if (native && params.path !== undefined)
        return invoke("control_write_csv", {
          path: params.path,
          text,
          protectedPaths: latest.current.protectedPath
            ? [latest.current.protectedPath]
            : [],
          overwrite: false,
        });
      if (!native && params.path !== undefined)
        throw new ControlError(
          "invalid_arguments",
          "Browser export has no filesystem paths",
        );
      const offset = (params.offset as number | undefined) ?? 0,
        length = (params.length as number | undefined) ?? 1_048_576;
      // Character offsets are UTF-16 positions. Keep every returned JSON chunk
      // valid Unicode; a one-character request may include a complete pair.
      const splitPair = (at: number) =>
        at > 0 &&
        at < text.length &&
        text.charCodeAt(at - 1) >= 0xd800 &&
        text.charCodeAt(at - 1) <= 0xdbff &&
        text.charCodeAt(at) >= 0xdc00 &&
        text.charCodeAt(at) <= 0xdfff;
      if (splitPair(offset))
        throw new ControlError(
          "invalid_arguments",
          "CSV offset splits a Unicode character",
        );
      let end = Math.min(text.length, offset + length);
      if (splitPair(end)) end++;
      return {
        text: text.slice(offset, end),
        offset,
        totalCharacters: text.length,
        mimeType: "text/csv",
        name: `${params.kind}.csv`,
      };
    }
    throw new ControlError(
      "method_not_found",
      `Unknown inspection operation ${method}`,
    );
  };

  function currentPick(): InspectionPick | null {
    const doc = latest.current.getDocument();
    if (!doc || doc.atoms !== source.current || !lastPick) return null;
    if (lastPick.surface) {
      const mesh = [...doc.surfaces, ...(doc.molecular_surfaces ?? [])].find(
        (s) => s.id === lastPick.surface,
      );
      if (!mesh || mesh.positions !== pickedGeometry.current) return null;
    }
    return lastPick;
  }
  return {
    selectedAtoms: selected,
    orderedAtoms: ordered,
    pickEnabled,
    setPickEnabled,
    measurements,
    error,
    progress,
    getSelection: active,
    getPick: currentPick,
    synchronize: () => pending.current,
    pick(atom: number, atoms: EigenVistaDocument["atoms"]) {
      if (pickEnabled && latest.current.getDocument()?.atoms === atoms)
        setSelection([...active(), atom], [...picks.current, atom]);
    },
    recordPick(pick: InspectionPick, atoms: EigenVistaDocument["atoms"]) {
      const doc = latest.current.getDocument();
      if (!doc || doc.atoms !== atoms) return;
      setLastPick(pick);
      source.current = atoms;
      pickedGeometry.current = pick.surface
        ? ([...doc.surfaces, ...(doc.molecular_surfaces ?? [])].find(
            (s) => s.id === pick.surface,
          )?.positions ?? null)
        : null;
      const indices =
        pick.atoms ?? (pick.atom === undefined ? [] : [pick.atom]);
      if (pickEnabled && indices.length)
        setSelection([...active(), ...indices], [...picks.current, ...indices]);
    },
    cancel() {
      abort.current?.abort();
      client.cancel(new Error("Inspection cancelled"));
    },
    async execute(
      method: string,
      params: Record<string, unknown>,
      execution: ControlExecution,
    ) {
      setError("");
      const background = [
        "selection.neighborhood",
        "molecularSurfaces.generate",
        "analysis.create",
      ].includes(method);
      if (background) {
        latest.current.setBusy("Scientific inspection");
        setProgress({ stage: "preparing" });
      }
      try {
        return await execute(method, params, execution);
      } catch (cause) {
        setError(String(cause));
        throw cause;
      } finally {
        if (background) {
          latest.current.setBusy("");
          setProgress(null);
        }
      }
    },
  };
}
