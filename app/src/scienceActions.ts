/** Recoverable auxiliary failures must not evict an unrelated QC preview. */
export const auxiliaryScienceActions = new Set([
  "backbone",
  "inspection_measure",
  "inspection_measurements",
  "inspection_neighborhood",
  "inspection_validate",
  "analysis_plane_atoms",
  "analysis_contours",
  "analysis_csv",
  "analysis_samples",
  "molecular_surface",
]);
export const registeredScienceActions = new Set([
  "sample",
  "generate",
  "analyze",
  "describe_field",
  "analysis_metadata",
]);
