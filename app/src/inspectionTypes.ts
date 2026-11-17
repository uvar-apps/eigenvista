/** Scientific inspection records mirror the validated Rust model. Coordinates are bohr. */
export type Vec3 = [number, number, number];
export type MeasurementKind = "distance" | "angle" | "torsion";
export interface MeasurementDefinition {
  id: string;
  label: string;
  kind: MeasurementKind;
  atoms: number[];
  visible: boolean;
  color: string;
  always_visible: boolean;
}
export interface MeasurementResult {
  kind: MeasurementKind;
  atoms: number[];
  value: number | null;
  unit: string;
  status: "defined" | "undefined";
  reason: string | null;
}
export interface NeighborhoodRequest {
  seeds: number[];
  radius_angstrom: number;
  whole_residues: boolean;
}
export interface NamedSelection {
  id: string;
  label: string;
  atoms: number[];
  neighborhood?: NeighborhoodRequest;
}
export interface AnnotationLabel {
  id: string;
  text: string;
  atom?: number;
  residue?: number;
  visible: boolean;
  color: string;
  always_visible: boolean;
}
export interface Annotations {
  selections: NamedSelection[];
  measurements: MeasurementDefinition[];
  labels: AnnotationLabel[];
}
export interface MolecularSurfaceRequest {
  id: string;
  label: string;
  kind: "ses" | "sas";
  atom_indices: number[];
  radii_set: "bondi" | "alvarez";
  radii_overrides: { element: number; radius_angstrom: number }[];
  probe_radius: number;
  spacing: number;
  color: string;
  opacity: number;
}
export interface MolecularSurface extends MolecularSurfaceRequest {
  radii_angstrom: number[];
  cavity_policy: string;
  engine: string;
  source_hash: string;
  local_origin_bohr: Vec3;
  precision: string;
  positions: number[];
  normals: number[];
  indices: number[];
  vertex_atoms: number[];
  visible: boolean;
  warnings: string[];
  stats: {
    area_angstrom2: number;
    volume_angstrom3: number;
    components: number;
    cavities: number;
    estimated_engine_bytes: number;
    elapsed_seconds: number;
    kernel: string;
  };
}
export interface FieldDescriptor {
  field: string;
  quantity: string;
  value_unit: string;
  origin: string;
  note: string;
  display_unit?: string;
}
export type AnalysisDefinition =
  | { kind: "probe"; point: Vec3; atom?: number }
  | {
      kind: "plane";
      origin: Vec3;
      u: Vec3;
      v: Vec3;
      dims: [number, number];
      atoms?: [number, number, number];
    }
  | {
      kind: "profile";
      start: Vec3;
      end: Vec3;
      count: number;
      atoms?: [number, number];
    };
export interface AnalysisAppearance {
  visible: boolean;
  colormap: string;
  show_key: boolean;
  show_labels: boolean;
  range?: [number, number];
  contour_levels: number[];
}
export interface AnalysisRequest {
  id: string;
  label: string;
  field: string;
  definition: AnalysisDefinition;
  descriptor?: FieldDescriptor;
}
export interface FieldAnalysisItem extends Omit<AnalysisRequest, "descriptor"> {
  descriptor: FieldDescriptor;
  source_hash: string;
  sample_hash: string;
  interpretation_hash: string;
  algorithm: string;
  method: string;
  values: number[];
  valid: number[];
  range: [number, number] | null;
  appearance: AnalysisAppearance;
}
export interface FieldAnalysisState {
  descriptors: FieldDescriptor[];
  items: FieldAnalysisItem[];
  show_field_key?: boolean;
}
export interface ContourSegment {
  level: number;
  start: Vec3;
  end: Vec3;
}
/** Original source indices survive display filtering; picks retain measurement order. */
export interface InspectionPick {
  kind: "atom" | "bond" | "residue" | "molecular_surface" | "quantum_surface";
  atom?: number;
  atoms?: number[];
  residue?: number;
  surface?: string;
  point?: Vec3;
  attribution?: "mesh_vertex" | "backbone_CA";
}
