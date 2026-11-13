# Research and follow-up plans

Updated 13 November 2026 (Australia/Perth), latest research from main
`a3d71d077da28e38d3e031d531888fd08d98c279`, EigenVista 0.5.12.
The initial research changed no application code or dependencies. The user then
authorized Vite maintenance and #39's fixture phase on a separate branch/PR.
Their implementation is recorded in [status](../docs/status.md#vite-maintenance-and-native-fixtures-12-november-2026)
and the [decision record](../docs/design/2026-11-12-vite-and-native-fixtures.md).
The improve skill supplied the initial research/plan structure.
The user then authorized the remaining typed-encoding phase of #39, implemented
in [Plan 004](004-typed-native-encoding.md). Current evidence is in
[status](../docs/status.md#typed-native-encoding-12-november-2026).
The next authorized batch implements #48's sidebar disclosures and performs
only #37's shader/memory qualification. Its [decision](../docs/design/2026-11-12-indexed-mesh-qualification.md)
rejects unconditional automatic packing; #37 remains open for a bounded
benefit/budget fallback policy and later implementation.

Read the [findings and reproducible evidence](2026-11-12-research.md) first.
Issue comments hold the published research disposition. Earlier priorities remain historical. The 13 November rendering research
confirms the separate P2 product bug #55; the other measured tradeoffs do not
establish a scientific-output bug.

| Order | Plan / issue | Status | Reason |
| --- | --- | --- | --- |
| 1 | [001: bounded Vite maintenance](001-vite-maintenance.md), #46 | Implemented; acceptance in status/PR checks | Only Vite changes; clean install/audit and license comparison are verified. |
| 2 | [002: authentic compatibility fixtures](002-format-compatibility-fixtures.md), first phase of #39 | Implemented; acceptance in status/PR checks | Four frozen archives and native/actual-WASM/worker/UI regressions preserve authentic old/current behavior. |
| 3 | [004: typed native encoding](004-typed-native-encoding.md), remaining #39 | Implemented; acceptance in status/issue/PR checks | Direct typed numeric emission preserves the frozen logical layout and substantially reduces measured native encode peak RSS. |
| 4 | [003: indexed-mesh qualification](003-indexed-mesh-qualification.md), #37 | Qualification recorded; automatic packing NO-GO | Shader identity is reconstructible only for explicitly identified generated layouts; no-sharing peak rejects unconditional packing. Select a bounded benefit/budget fallback before production implementation. |
| 5 | [005: save contract](005-native-save-contract-research.md), #41 | Research recorded; P3 policy/platform follow-up stays open | APFS complete-file visibility/private replacement and actual ExFAT no-clobber limitation reproduced; no power-loss qualification or production change. |
| 6 | [006: anisotropic rendering](006-anisotropic-rendering-research.md), #43 | Investigation complete; close through research PR | Independent affine-grid GPU checks pass; equal-memory isotropic allocation can erase a feature. Separate P2 #55 tracks the confirmed opacity/quality defect. |
| Later | #38 typed mesh outputs | DEFERRED until after #37 | Two-engine transfer measurements are positive but small; remeasure after reducing mesh payload. |
| Later | #35 complete Molden spin sets | BLOCKED: agreed real workload and browser memory | Current input-line and persistence limits independently constrain expansion. |

#39's fixture and typed-writer phases are separate implemented increments. The
historical fixture-only plan did not authorize the later writer; the user did.
Preserve existing scientific hashes, f64 authoritative data, transactional
publication and resource guards. Follow AGENTS.md for future branch/issue/PR work;
the initial research did not create a branch, commit, tag or release. The later
authorized increments use `codex/vite-maintenance-and-native-fixtures` and
`codex/typed-native-encoding`; neither changes the application version or release
artifacts.

## Dependencies

Compatibility fixtures precede indexed storage, typed encoding and any source-hash
migration. The user closed #47 because the existing ZIP/manifest/array layout
already meets the requested asset-container goal; no format redesign is pending
under that issue. Vite maintenance is independent.
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
- #41 save durability: research is now recorded in Plan 005. Keep the issue open
  for explicit policy/platform follow-up; do not infer crash durability.
- #42 diffuse domains: needs independent scientific error/domain references;
  explicit rejection must not be replaced with silent clipping.
- #43 anisotropy: Plan 006 completes the bounded investigation with actual GPU
  evidence. No grid-policy change is justified; repair the separate confirmed
  opacity/quality bug #55 next, with depth/occlusion qualification.

The remaining deferrals do not establish that their issues are invalid. #43
closes as investigated on its explicitly bounded evidence; #55 remains open.
