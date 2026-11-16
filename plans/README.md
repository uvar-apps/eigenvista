# Research and follow-up plans

Index updated 16 November 2026 (Australia/Perth), source version **0.9.0
(unreleased)** on `codex/scientific-inspection`. The reviewed main baseline is
EigenVista 0.8.0, `6a728d918cfdf4291a6a04ae9327d668fd449283`. Current release and implementation
evidence remain in [handoff](../docs/handoff.md) and [status](../docs/status.md).

## Scientific workflow roadmap

[Plan 008: scientific workflow priorities](008-scientific-workflow-roadmap.md)
reviews future features from chemist, biologist, quantum-chemist and physicist
perspectives. It separates current functionality from new capabilities, ranks
16 feature families by practical value/readiness, and records required data,
scientific boundaries, dependencies, existing issues and primary sources.

The recommended starting slices are stable selections/measurements, qualification
of the existing Rust Sesmesh library for molecular surfaces, quantitative field
metadata/probes, and reproducible scene states. A linked orbital-energy diagram
is a smaller independent QC addition. The Sesmesh opportunity merits revisiting
the older Gaussian-first surface proposal; no integration is assumed qualified.

Status: **proposed; review/documentation only**. No implementation, issue creation,
priority-label changes, branch, commit, version bump or publication is authorized
by this roadmap. Choose a bounded increment before starting development. This
cross-disciplinary order complements the broader Plan 007 biological catalog.

## Implementation plan for priorities 1–3

[Plan 009: selections, molecular surfaces and quantitative field inspection](009-scientific-inspection-implementation.md)
turns the first three Plan 008 families into milestone-sized implementation
work: shared identity/persistence contracts; geometry and ligand neighborhoods;
actual Sesmesh native/WASM qualification followed by SES/SAS integration; field
semantics/probes followed by planes, contours and profiles; integrated local
verification and user/connector documentation.

Status: **implemented and locally validated; awaiting user testing** on `codex/scientific-inspection`, tracked
by [#83](https://github.com/uvar-apps/eigenvista/issues/83) and #84–#86. The plan covers GUI and external-agent
control, bounded background jobs, scientific oracles, export/save/reopen,
compatibility and explicit stop conditions. Full local macOS checks passed:
336 default/eight desktop Rust tests, strict Clippy/build, 604 application browser
cases, 162 website cases, packaging audit and the extracted helper's 34-method
acceptance. Numerical, compatibility, cancellation and artifact checks passed.
The user requires testing the feature branch before any pull request or merge.
The user subsequently authorized preparing source version 0.9.0, with no commit,
tag, push, release or PR/merge. The living handoff records the
current implementation evidence and remaining work.

All new user-facing operations require shared API and packaged AI connector
coverage in the same milestone, including configuration/updates, readback,
visibility, progress/cancel, persistence and exports. Plan 009 includes the
mandatory coverage matrix and real connector-transport acceptance gates;
GUI-only or in-page-controller-only completion is insufficient.

## Molecular visualization roadmap

[Plan 007: molecular visualization priorities](007-molecular-visualization-roadmap.md)
records the full catalog, product rationale, dependencies and future acceptance
boundaries. The metadata prerequisite and first four additions were authorized
14 November 2026 and implemented on `codex/biological-structure-views`,
tracked in #62–#66. The [decision record](../docs/design/2026-11-14-biological-structure-views.md)
separates implementation choices from the initial proposed roadmap. Current
source and verification/delivery evidence are recorded in
[the ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097).

The first four additions below, with their biological-metadata and
native-compatibility foundation, were implemented and released in 0.7.0:

1. Chain/entity coloring.
2. Basic chain/component selection, visibility and mixed representations.
3. Protein backbone traces and smooth tubes.
4. Protein ribbons/secondary-structure cartoons and secondary colors.

The original roadmap placed molecular-shape surfaces next, with a Gaussian
envelope before separately qualified SAS/SES work. Plan 008 revisits that choice
in light of the existing Rust Sesmesh library. Plan 007 retains its full catalog
and distinctions between coordinate-derived views and those needing external
data. Its remaining ranks are proposals; implementation requires a new selected
scope and does not follow automatically from the completed first batch.

## Earlier research and implementation history

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

The subsequent [#55 production fix](../docs/design/2026-11-13-volume-visibility.md)
uses accumulated visibility for the volume depth marker and promotes the fixed
research expectations into normal regressions. It changes no scientific grid
policy; version 0.5.14 includes the repair, with release evidence in
[status](../docs/status.md#version-0514).

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
| 6 | [006: anisotropic rendering](006-anisotropic-rendering-research.md), #43 | Investigation complete; close through research PR | Independent affine-grid GPU checks pass; equal-memory isotropic allocation can erase a feature. The separate #55 production fix addresses the confirmed opacity/quality defect; see the newer decision. |
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
  opacity/quality bug #55 is addressed by the subsequent visibility/depth fix.

The remaining deferrals do not establish that their issues are invalid. #43
is closed as investigated on its explicitly bounded evidence; #55 has a
separate production fix and its own acceptance gates.
