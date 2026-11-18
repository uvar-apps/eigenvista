/** Transient progress for one owned scientific operation, never saved data. */
export type InspectionProgress = {
  stage: string;
  completed?: number;
  total?: number;
  /** Monotonic WebView time at operation start; retained across phase changes. */
  started: number;
  operation: string;
  label: string;
};

const molecularSurfacePhases: Record<string, string> = {
  preparing: "Preparing molecular surface",
  geometry: "Preparing atom neighborhoods",
  classify: "Classifying surface regions",
  mesh: "Generating surface mesh",
  assemble: "Assembling surface mesh",
  measure: "Checking surface measurements",
  transferring: "Preparing surface display",
  validating: "Validating molecular surface",
};

export const molecularSurfacePhase = (stage: string): string =>
  Object.hasOwn(molecularSurfacePhases, stage)
    ? molecularSurfacePhases[stage]
    : "Generating molecular surface";
