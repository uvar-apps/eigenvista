import type { ControlSchema as Schema } from "./control";

const str: Schema = { type: "string", minLength: 1 };
const n: Schema = { type: "number" };
const bool: Schema = { type: "boolean" };
const index: Schema = {
  type: "integer",
  minimum: 0,
  maximum: Number.MAX_SAFE_INTEGER,
};
const indices: Schema = { type: "array", items: index };
const vector: Schema = { type: "array", minItems: 3, maxItems: 3, items: n };
const obj = (
  properties: Record<string, Schema>,
  required: string[] = [],
): Schema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const mutation = (
  properties: Record<string, Schema>,
  required: string[] = [],
): Schema =>
  obj(
    {
      ...properties,
      expectedRevision: {
        type: "integer",
        minimum: 0,
        maximum: Number.MAX_SAFE_INTEGER,
      },
    },
    required,
  );
const page = {
  offset: { type: "integer", minimum: 0 },
  limit: { type: "integer", minimum: 1 },
} satisfies Record<string, Schema>;
const color: Schema = {
  type: "string",
  pattern: "^#[0-9a-fA-F]{6}$",
  maxLength: 7,
};
const kind: Schema = { type: "string", enum: ["distance", "angle", "torsion"] };
const measurement = obj(
  {
    id: str,
    label: str,
    kind,
    atoms: { ...indices, minItems: 2, maxItems: 4 },
    visible: bool,
    color,
    always_visible: bool,
  },
  ["id", "label", "kind", "atoms", "visible", "color", "always_visible"],
);
const label = obj(
  {
    id: str,
    text: str,
    atom: index,
    residue: index,
    visible: bool,
    color,
    always_visible: bool,
  },
  ["id", "text", "visible", "color", "always_visible"],
);
const descriptor = obj(
  {
    field: str,
    quantity: str,
    value_unit: str,
    origin: str,
    note: { type: "string" },
    display_unit: str,
  },
  ["field", "quantity", "value_unit", "origin"],
);
const dims: Schema = {
  type: "array",
  minItems: 2,
  maxItems: 2,
  items: { type: "integer", minimum: 2 },
};
const definition: Schema = {
  anyOf: [
    obj({ kind: { enum: ["probe"] }, point: vector, atom: index }, [
      "kind",
      "point",
    ]),
    obj(
      {
        kind: { enum: ["plane"] },
        origin: vector,
        u: vector,
        v: vector,
        dims,
        atoms: { ...indices, minItems: 3, maxItems: 3 },
      },
      ["kind", "origin", "u", "v", "dims"],
    ),
    obj(
      {
        kind: { enum: ["profile"] },
        start: vector,
        end: vector,
        count: { type: "integer", minimum: 2 },
        atoms: { ...indices, minItems: 2, maxItems: 2 },
      },
      ["kind", "start", "end", "count"],
    ),
  ],
};
const analysis = obj(
  { id: str, label: str, field: str, descriptor, definition },
  ["id", "label", "field", "definition"],
);
const appearance = obj({
  visible: bool,
  colormap: { type: "string", enum: ["diverging", "viridis", "grayscale"] },
  show_key: bool,
  show_labels: bool,
  range: { type: "array", minItems: 2, maxItems: 2, items: n },
  contour_levels: { type: "array", items: n },
});
const surface = obj(
  {
    id: str,
    label: str,
    kind: { type: "string", enum: ["ses", "sas"] },
    atom_indices: indices,
    radii_set: { type: "string", enum: ["bondi", "alvarez"] },
    radii_overrides: {
      type: "array",
      maxItems: 118,
      items: obj(
        {
          element: { type: "integer", minimum: 1, maximum: 118 },
          radius_angstrom: n,
        },
        ["element", "radius_angstrom"],
      ),
    },
    probe_radius: { type: "number", minimum: 0 },
    spacing: { type: "number", minimum: Number.MIN_VALUE },
    color,
    opacity: { type: "number", minimum: 0, maximum: 1 },
  },
  [
    "id",
    "label",
    "kind",
    "atom_indices",
    "radii_set",
    "probe_radius",
    "spacing",
    "color",
    "opacity",
  ],
);
const entry = (description: string, inputSchema: Schema) => ({
  description,
  inputSchema,
});
/** Every new GUI operation is discoverable through the same bounded schemas. */
export const INSPECTION_METHODS = {
  "selection.pick_mode": entry(
    "Enable or disable interactive original-atom picking in the visible viewer.",
    mutation({ enabled: bool }, ["enabled"]),
  ),
  "atoms.list": entry(
    "Discover original source atoms and their biological identities.",
    obj({ ...page, residueIndex: index }),
  ),
  "residues.list": entry(
    "Discover particular residue and ligand copies.",
    obj({ ...page, name: str, kind: str, chainIndex: index }),
  ),
  "selection.get": entry(
    "Read selected source atoms and ordered picks.",
    obj(page),
  ),
  "selection.list": entry(
    "List named source selections, or page a named set's atoms/query seeds.",
    obj({ ...page, id: str, seeds: bool }),
  ),
  "selection.set": entry(
    "Select atoms, residues or a named set; optionally isolate/focus.",
    mutation({
      atoms: indices,
      residueIndices: indices,
      selectionId: str,
      mode: { enum: ["replace", "add", "remove"] },
      showOnly: bool,
      resetFilters: bool,
      focus: bool,
    }),
  ),
  "selection.clear": entry(
    "Clear active selection, picks and its display mask.",
    mutation({}),
  ),
  "selection.save": entry(
    "Create or update a durable named selection.",
    mutation({ id: str, label: str, atoms: indices }, ["id", "label"]),
  ),
  "selection.remove": entry(
    "Remove a named selection without deleting source atoms.",
    mutation({ id: str }, ["id"]),
  ),
  "selection.neighborhood": entry(
    "Select atom-center neighbors; optionally expand complete residues.",
    mutation(
      {
        seeds: indices,
        selectionId: str,
        radiusAngstrom: { type: "number", minimum: 0, maximum: 1000 },
        wholeResidues: bool,
        id: str,
        label: str,
        showOnly: bool,
        resetFilters: bool,
        focus: bool,
      },
      ["radiusAngstrom"],
    ),
  ),
  "measure.evaluate": entry(
    "Evaluate an ordered f64 distance, angle or torsion.",
    obj({ kind, atoms: { ...indices, minItems: 2, maxItems: 4 } }, [
      "kind",
      "atoms",
    ]),
  ),
  "measure.list": entry(
    "Read saved measurement definitions and f64 results.",
    obj(page),
  ),
  "measure.upsert": entry(
    "Create or update an ordered measurement and monitor style.",
    mutation({ measurement }, ["measurement"]),
  ),
  "measure.remove": entry(
    "Remove a saved measurement.",
    mutation({ id: str }, ["id"]),
  ),
  "labels.list": entry("Read saved atom/residue labels.", obj(page)),
  "labels.upsert": entry(
    "Create or edit a label and its visibility/occlusion style.",
    mutation({ label }, ["label"]),
  ),
  "labels.remove": entry(
    "Remove a saved label.",
    mutation({ id: str }, ["id"]),
  ),
  "molecularSurfaces.list": entry(
    "Read SES/SAS settings, provenance and output counts, without mesh arrays.",
    obj(page),
  ),
  "molecularSurfaces.atoms": entry(
    "Read bounded original source indices and resolved radii for a cached molecular surface.",
    obj({ id: str, ...page }, ["id"]),
  ),
  "molecularSurfaces.warnings": entry(
    "Page the complete warnings of a cached molecular surface.",
    obj({ id: str, ...page }, ["id"]),
  ),
  "molecularSurfaces.generate": entry(
    "Generate or replace a cached SES/SAS mesh in the background.",
    mutation({ request: surface }, ["request"]),
  ),
  "molecularSurfaces.set": entry(
    "Change a cached molecular mesh's label, visibility and material.",
    mutation(
      {
        id: str,
        label: str,
        visible: bool,
        color,
        opacity: { type: "number", minimum: 0, maximum: 1 },
      },
      ["id"],
    ),
  ),
  "molecularSurfaces.remove": entry(
    "Remove a cached molecular surface.",
    mutation({ id: str }, ["id"]),
  ),
  "fields.describe": entry(
    "Read structured quantity, units and declaration provenance.",
    obj({ fieldId: str }, ["fieldId"]),
  ),
  "fields.set_key": entry(
    "Show/hide a truthful numerical key for the current mesh, raycast or volume.",
    mutation({ visible: bool }, ["visible"]),
  ),
  "fields.set_metadata": entry(
    "Declare field meaning/units without changing source values or quantum hashes.",
    mutation({ descriptor }, ["descriptor"]),
  ),
  "analysis.create": entry(
    "Create or replace a quantitative f64 probe, plane or profile in the background.",
    mutation({ request: analysis }, ["request"]),
  ),
  "analysis.plane_atoms": entry(
    "Resolve an ordered three-atom plane in bohr coordinates.",
    obj(
      {
        atoms: { ...indices, minItems: 3, maxItems: 3 },
        extentAngstrom: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          items: { type: "number", minimum: Number.MIN_VALUE },
        },
        dims,
      },
      ["atoms", "extentAngstrom", "dims"],
    ),
  ),
  "analysis.list": entry(
    "List accepted quantitative analyses without bulk sample arrays.",
    obj(page),
  ),
  "analysis.get": entry(
    "Read analysis metadata and scientific interpretation.",
    obj({ id: str }, ["id"]),
  ),
  "analysis.samples": entry(
    "Read bounded f64 samples with domain status.",
    obj({ id: str, ...page }, ["id"]),
  ),
  "analysis.set": entry(
    "Update analysis labels, range, colormap, contours, keys and visibility.",
    mutation({ id: str, label: str, appearance, automaticRange: bool }, ["id"]),
  ),
  "analysis.remove": entry(
    "Remove a quantitative analysis and its cache.",
    mutation({ id: str }, ["id"]),
  ),
  "table.export": entry(
    "Export a generated measurement or quantitative CSV to an authorized path or bounded browser text chunk.",
    mutation(
      {
        kind: { enum: ["measurements", "analysis"] },
        id: str,
        path: str,
        offset: { type: "integer", minimum: 0 },
        length: { type: "integer", minimum: 1 },
        overwrite: { enum: [false] },
      },
      ["kind"],
    ),
  ),
};
export const inspectionBackgroundMethods = new Set([
  "selection.neighborhood",
  "molecularSurfaces.generate",
  "analysis.create",
]);
export const inspectionReadMethods = new Set([
  "atoms.list",
  "residues.list",
  "selection.get",
  "selection.list",
  "measure.evaluate",
  "measure.list",
  "labels.list",
  "molecularSurfaces.list",
  "molecularSurfaces.atoms",
  "molecularSurfaces.warnings",
  "fields.describe",
  "analysis.plane_atoms",
  "analysis.list",
  "analysis.get",
  "analysis.samples",
]);
