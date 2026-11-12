# Research and follow-up plans

Reviewed 12 November 2026 (Australia/Perth), source
`06ecbb9cef6e52a99417f88856cb98cffc3e9df2`, EigenVista 0.5.12.
The initial research changed no application code or dependencies. The user then
authorized Vite maintenance and #39's fixture phase on a separate branch/PR.
Their implementation is recorded in [status](../docs/status.md#vite-maintenance-and-native-fixtures-12-november-2026)
and the [decision record](../docs/design/2026-11-12-vite-and-native-fixtures.md).
The improve skill supplied the initial research/plan structure.

Read the [findings and reproducible evidence](2026-11-12-research.md) first.
Issue comments hold the published research disposition. Existing priorities
remain P3; none of these measurements establishes a scientific-output bug.

| Order | Plan / issue | Status | Reason |
| --- | --- | --- | --- |
| 1 | [001: bounded Vite maintenance](001-vite-maintenance.md), #46 | Implemented; acceptance in status/PR checks | Only Vite changes; clean install/audit and license comparison are verified. |
| 2 | [002: authentic compatibility fixtures](002-format-compatibility-fixtures.md), first phase of #39 | Implemented; acceptance in status/PR checks | Four frozen archives and native/actual-WASM/worker/UI regressions preserve authentic old/current behavior. |
| 3 | [003: indexed-mesh qualification](003-indexed-mesh-qualification.md), #37 | BLOCKED: shader identity policy and extraction peak | Exact tuple sharing is useful, but custom shader vertex IDs and temporary-map allocations need explicit acceptance. |
| Later | #38 typed mesh outputs | DEFERRED until after #37 | Two-engine transfer measurements are positive but small; remeasure after reducing mesh payload. |
| Later | #35 complete Molden spin sets | BLOCKED: agreed real workload and browser memory | Current input-line and persistence limits independently constrain expansion. |

Keep #39's later typed-writer scope separate from its ready fixture phase. The
research label on that larger issue does not mean the fixture work must wait.
Preserve existing scientific hashes, f64 authoritative data, transactional
publication and resource guards. Follow AGENTS.md for future branch/issue/PR work;
the initial research did not create a branch, commit, tag or release. The later
authorized implementation is on `codex/vite-maintenance-and-native-fixtures`;
it changes neither the application version nor release artifacts.

## Dependencies

Compatibility fixtures precede indexed storage, typed encoding, any source-hash
migration, and a future #47 asset-layout decision. Vite maintenance is independent.
Mesh compaction should precede a production transfer optimization so its benefit
is measured on the remaining payload. Capacity changes require agreed workloads
and separate import, transport, rendering and persistence budgets.

## Considered and deferred

- #20 crystal symmetry: a substantial new crystallography feature, with no new
  blocked-workflow evidence in this pass.
- #36 sampling acceleration: current user calculations are fast; optimize only
  after a representative post-serialization profile identifies a bottleneck.
- #40 source hashing: persistence-sensitive; no evidence yet that it dominates
  these workloads. Preserve exact hash bytes and revisit after profiling.
- #41 save durability: an explicit filesystem/policy investigation, without a
  reproduced corruption or promised-contract failure here.
- #42 diffuse domains: needs independent scientific error/domain references;
  explicit rejection must not be replaced with silent clipping.
- #43 anisotropy: existing affine/voxel-aware stepping has no reproduced defect
  in this pass. No change to grid policy is justified by inspection alone.

These are deferrals, not findings that those issues are invalid or completed.
