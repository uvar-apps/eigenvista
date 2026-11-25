import type { Annotations, FieldAnalysisState, MolecularSurface } from "./inspectionTypes";

export interface Atom {
  element: number;
  position: [number, number, number];
}
/**
 * Columnar atom storage: two parallel arrays instead of one record per atom, so a
 * large structure does not carry tens of thousands of small objects through the
 * bridge or the saved manifest. `positions.length` is the atom count and
 * `elements[i]` pairs with `positions[i]`.
 */
export interface AtomColumns {
  elements: number[];
  positions: [number, number, number][];
}
export interface Orbital {
  id: string;
  label: string;
  spin: string;
  occupation: number | null;
  energy: number | null;
  coefficients: number[];
}
export interface Density {
  id: string;
  label: string;
  kind: string;
  matrix: number[];
}
export interface Grid {
  id: string;
  label: string;
  quantity: string;
  origin: number[];
  axes: number[][];
  dims: number[];
  values: number[];
}
export interface SampledGrid extends Omit<Grid, "values"> {
  values: Float32Array;
}
export interface Surface {
  id: string;
  label: string;
  field: string | null;
  source_hash: string | null;
  isovalue: number | null;
  algorithm: string;
  resolution: number[];
  grid_origin: number[];
  grid_axes: number[][];
  precision: string;
  positions: number[];
  normals: number[];
  indices: number[];
  electrostatic_potential?: {
    source_hash: string;
    values: number[];
    range: number;
    enabled: boolean;
  };
  color: string;
  opacity: number;
  visible: boolean;
}
/** Selected biological identities; atom arrays retain original document indices. */
export type ComponentKind =
  | "protein"
  | "nucleic"
  | "ligand"
  | "water"
  | "ion"
  | "unknown";
export type SecondaryStructure = "helix" | "sheet" | "coil" | "unknown";
export interface StructureChain {
  label_id: string | null;
  author_id: string | null;
  entity_id: string | null;
}
export interface StructureResidue {
  chain: number;
  name: string;
  label_seq_id: number | null;
  author_seq_id: string | null;
  insertion_code: string | null;
  segment: number;
  kind: ComponentKind;
  secondary: SecondaryStructure;
}
export interface StructureMetadata {
  chains: StructureChain[];
  residues: StructureResidue[];
  atom_names: string[];
  atom_residues: number[];
  secondary_source: "deposited" | "none";
}

export interface EigenVistaDocument {
  id: string;
  title: string;
  atoms: AtomColumns;
  bonds: number[][];
  basis: {
    center: number[];
    exponents: number[];
    coefficients: number[];
    terms: { powers: number[]; weight: number }[];
  }[];
  orbitals: Orbital[];
  densities: Density[];
  grids: Grid[];
  surfaces: Surface[];
  view: {
    representation: string;
    positive_color: string;
    negative_color: string;
    opacity: number;
    isovalue: number;
    field: string | null;
  };
  provenance: string[];
  structure?: StructureMetadata | null;
  annotations?: Annotations | null;
  molecular_surfaces?: MolecularSurface[] | null;
  field_analysis?: FieldAnalysisState | null;
}
export interface Generation {
  surfaces: Surface[];
  grid: SampledGrid;
}
export interface ImportReport {
  format: string;
  warnings: string[];
  requires_save: boolean;
}
export interface ImportResult {
  document: EigenVistaDocument;
  report: ImportReport;
}
export type RenderMode = "mesh" | "raycast" | "volume";
export type SurfaceShading = "diffuse" | "blinn-phong";
