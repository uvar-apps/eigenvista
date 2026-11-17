# Plan 009: selections, molecular surfaces and quantitative field inspection

**Date:** 16 November 2026, Australia/Perth.\
**Planned at:** EigenVista 0.8.0, `6a728d918cfdf4291a6a04ae9327d668fd449283`.\
**Current source:** 0.9.0 (unreleased); version preparation is authorized, publication is not.\
**Status:** implemented and locally validated on `codex/scientific-inspection`; awaiting user testing before any PR/merge.\
**Source roadmap:** [Plan 008](008-scientific-workflow-roadmap.md), priorities **1, 2 and 3**.\
**Category:** new scientific inspection features, not fixes for established bugs.\
**Effort / risk:** large overall; moderate for geometry and field inspection, high until the Sesmesh integration passes qualification.

## Intended result

A user can select particular atoms or ligand copies, measure and annotate their geometry, show complete neighboring residues, generate genuine solvent-accessible and solvent-excluded molecular surfaces, and read quantitative field values through probes, planes, contours and line profiles. These operations work through both the GUI and the existing external AI connector. Results can be saved, reopened and exported with their scientific meaning intact.

This plan covers the complete three feature families in staged increments. A successful integration experiment or a measurement table alone does not complete it. The recommended delivery order is **geometry inspection → molecular surfaces → quantitative field inspection**, with independent numerical work allowed in parallel after the shared contracts are settled.

The initial planning session changed only planning documents. The user subsequently authorized implementation on a separate branch, with full local validation and personal testing before any pull request/merge. Work is now tracked by [#83](https://github.com/uvar-apps/eigenvista/issues/83) and focused issues [#84](https://github.com/uvar-apps/eigenvista/issues/84), [#85](https://github.com/uvar-apps/eigenvista/issues/85) and [#86](https://github.com/uvar-apps/eigenvista/issues/86). Leave main unchanged and wait for the user's testing/instruction before opening or merging a PR. A later instruction authorizes preparing source version 0.9.0 only; no commit, push, tag, release or PR/merge is authorized.

## Baseline and drift check

Work in `/Users/ugo/projects/eigenvista`; `/Users/ugo/projects/molekel`, including `next/`, is read-only historical reference. Preserve any uncommitted work. Read the current working rules, [handoff](../docs/handoff.md), [architecture](../docs/architecture.md), [development guide](../docs/development.md), [format contract](../docs/preview-format.md) and [application-control reference](../docs/application-control.md) before implementation.

Run from the EigenVista root before starting:

```sh
git status --short
git diff --stat 6a728d918cfdf4291a6a04ae9327d668fd449283..HEAD -- Cargo.toml Cargo.lock crates app tools docs fixtures palettes plans
```

Any changed implementation contract below requires reconciliation against live source before execution. A relevant mismatch is a stop condition, not permission to apply an obsolete patch. Do not stop/restart an existing app or server, or rebuild over an app the user is running. Use isolated repository-local build/staging paths where required. All temporary output belongs under this repository's ignored `tmp/`; set `TMPDIR`, `TMP` and `TEMP` there before builds, tests or other temporary-file-producing tools.

## Current implementation facts

These are existing entry points, not proposed APIs:

| Area | Existing files / behavior | Consequence |
| --- | --- | --- |
| Authoritative model | [model.rs](../crates/eigenvista-core/src/model.rs), [types.ts](../app/src/types.ts): atom coordinates and scientific arrays are f64; coordinates are bohr; atoms have no UUID. `BOHR_TO_ANGSTROM = 0.529177210903`. | Use original document-local atom indices. Do not migrate every atom to a new ID system. |
| Picking | [Viewport.tsx](../app/src/Viewport.tsx), pointer handler around 451–472, currently emits inspection text. Atom instances carry `originalAtomIndices`; protein geometry carries `proteinAtoms` / `proteinResidues`, resolved in [proteinGeometry.ts](../app/src/proteinGeometry.ts). | Extract typed picks from existing source mappings; do not parse labels or retain filtered GPU instance IDs. |
| Accepted state | [App.tsx](../app/src/App.tsx), `setDoc`, `load`, `example`; one active document, revision changes for document edits. | Add a distinct source generation for atom/structure replacement; presentation and annotation changes must not clear valid picks. |
| Biological views | [molecularDisplay.ts](../app/src/molecularDisplay.ts), [StructureControls.tsx](../app/src/StructureControls.tsx): chain/component filters, residue ranges, mixed styles and focus already exist. | Compose selection masks with these controls; never replace scientific atom arrays with a visible subset. |
| Scientific worker | [science.ts](../app/src/science.ts), [science.worker.ts](../app/src/science.worker.ts), [scienceRegistration.ts](../app/src/scienceRegistration.ts), [WASM library](../crates/eigenvista-wasm/src/lib.rs). Browser and desktop use the same owned WASM worker. | Keep FIFO ownership, cancellation by terminating active worker, stale-result guards and recovery. A native-only surface backend would be a new architecture decision. |
| Geometry-only precedent | [useProteinBackbone.ts](../app/src/useProteinBackbone.ts) sends a stripped geometry document through a separate owned science client. Nonfatal `backbone` errors preserve QC registration. | New geometry actions must preserve unrelated registered quantum inputs too. |
| Numerical fields | [compute.rs](../crates/eigenvista-core/src/compute.rs), `evaluate`, private prepared `ScalarField`, `sample_with_progress`. Analytic evaluation supports orbitals/density matrices; cube resampling has inline trilinear interpolation. | Add a reusable authoritative point/plane/profile evaluator, not a GPU color reader or a call that first builds a 3D preview. |
| Grid contract | `Grid { origin, axes, dims, values, quantity, ... }`; axes are step vectors in bohr. Dimensions must all be at least two. | A 2D slice is a new analysis type, not a `Grid` with a dimension of one. |
| Native format | [format lib.rs](../crates/eigenvista-format/src/lib.rs), `preflight` / `decode`; [typed.rs](../crates/eigenvista-format/src/typed.rs), exhaustive `Document` packing. Base profile plus optional biological profile are currently exact-matched. | Add bounded payloads and explicit capability combinations; update the typed writer as well as model/decoder. |
| Hashes | `compute::source_hash` hashes serialized basis, selected orbital/density/grid, including existing grid labels/quantity. | Keep this algorithm and its payload unchanged. New interpretation metadata must live outside those objects. |
| Existing meshes | `Surface` is a quantum/grid-shaped object with resolution, axes, optional field/isovalue and source hash; validation requires valid grid geometry. | Molecular surfaces need a separate scientific record, not fictitious grid axes or an electron-density field. |
| Rendering/export | `Viewport.draw` and `captureImage` share the final-frame path. Existing PNGs omit text overlays. Current AO ownership includes atom/bond instances only. | New labels/keys need explicit export rendering; do not silently extend AO to surfaces or protein geometry. |
| Control/files | [control.ts](../app/src/control.ts), [desktopControl.ts](../app/src/desktopControl.ts), [native control](../app/src-tauri/src/control.rs), [ScopedFiles](../crates/eigenvista-control/src/files.rs). API v1 has bounded schemas/jobs; native writers cover documents and PNG, not generic CSV. | Extend the shared controller and add a narrowly scoped CSV writer, retaining current authorization/no-clobber protections. |

Two particularly important baseline excerpts:

```rust
// crates/eigenvista-core/src/compute.rs:184, existing behavior to preserve
let mut value = serde_json::json!({"basis":doc.basis,
    "orbital":doc.orbitals.iter().find(|o| o.id == field),
    "density":doc.densities.iter().find(|d| d.id == field),
    "grid":doc.grids.iter().find(|g| g.id == field)});
```

```ts
// app/src/scienceRegistration.ts: existing source-registration boundary
if (action !== "sample" && action !== "generate") return { args };
// Registered source inputs exclude view and saved meshes.
// New annotation/interpretation payloads need their own explicit validation.
```

Existing limits remain independent: 256³ transient samples, 128³ retained grid samples, 2,000,000 vertices, 128 MiB native inflated budget and 8 MiB manifest budget. This plan does not raise them or reintroduce an arbitrary CPU-time/work ceiling for ordinary field sampling. New products need additional checked allocation budgets, not unlimited allocations or reliance on catching every out-of-memory failure.

## Scope and proposed modules

All names in the **proposed** column are design targets, not existing interfaces. Small naming changes are acceptable if recorded in the implementation decision; scientific contracts and acceptance gates are not optional.

| Feature | Extend existing | Proposed new modules / tests |
| --- | --- | --- |
| Selection/geometry | `model.rs`, core `lib.rs`, WASM `lib.rs`, `App.tsx`, `Viewport.tsx`, `proteinGeometry.ts`, `molecularDisplay.ts` | core `inspection.rs`; app `inspection.ts`, `InspectionControls.tsx`, `annotationRendering.ts`; core `tests/inspection.rs`, `tests/neighborhoods.rs`; app `tests/inspection.spec.ts` |
| Molecular surfaces | workspace dependency/lock metadata, core/WASM exports, worker, accepted state, viewport/material helpers | core `molecular_surface.rs`; app `MolecularSurfaceControls.tsx`; core `tests/molecular_surfaces.rs`; app `tests/molecular-surfaces.spec.ts`; new provenance-backed surface fixtures |
| Field analysis | model, `compute.rs`, WASM exports, worker/registration, accepted state, `volume.ts` keys | core `field_analysis.rs`; app `FieldAnalysisControls.tsx`, `fieldAnalysisRendering.ts`; core `tests/field_analysis.rs`; app `tests/field-analysis.spec.ts`; new small affine-grid fixtures |
| Shared infrastructure | format `lib.rs` / `typed.rs`, `control.ts`, `desktopControl.ts`, native control/files, `files.ts`, registration/ownership tests | format `tests/inspection_profiles.rs`; control CSV tests; app `tests/inspection-control.spec.ts` |
| Documentation | user guide, architecture, development, preview format, control and connector references, living handoff/status, docs index, website content/build output, packaged connector instructions | focused scientific decision/provenance records under `docs/design/` and fixture READMEs |

Do not modify legacy sources, frozen compatibility inputs or private working documents. Add new fixtures instead. No new import format, geometry editor, embedded AI console, scripting engine, electrostatics solver, crystal/PBC support, full saved-scene system, ESP-to-surface mapping, trajectory support or chemically assigned interaction detector is in scope. Full camera/palette/AO/shader scene restoration remains roadmap priority 4. Narrow persistence of the new scientific inspection objects **is** in scope.

## Shared design contracts — settle in M0

### Required API and AI connector coverage

**Every new user-facing capability in this plan must be accessible through the shared application-control API and the packaged external AI connector in the same milestone as its GUI implementation.** This includes discovery, configuration, edits, readback, visibility, removal, progress/cancellation, persistence and exports—not only starting a calculation. A feature is incomplete until its connector path and documentation pass acceptance.

The GUI, direct API and connector must call the same application operations, validators and publication guards. The connector uses the existing authenticated transport/helper and discoverable schemas; do not add a separate automation implementation or require browser scripting, DOM interaction, private test hooks or manual GUI steps to cover missing operations. Agents may handle internal IDs and schemas; users express scientific outcomes in ordinary language.

Maintain this coverage matrix in the implementation issues and tests. Method names remain proposed until schemas are finalized; every listed operation is required:

| Capability | Required API and connector operations |
| --- | --- |
| Atom/residue selection | Discover original identities with pagination; select, extend, replace and clear sets; read back current selection; create, rename, update and delete named sets; focus/isolate/show/reset filters |
| Measurements | Evaluate ordered distance/angle/torsion inputs; create, list, update/reorder and delete saved definitions; read values, units and undefined statuses; configure monitor visibility/style; export table |
| Labels/annotations | Create, list, edit and remove atom/residue labels; configure text, visibility and supported presentation/occlusion options; include them in exported images |
| Ligand neighborhoods | Identify a particular ligand copy; configure radius and whole-residue expansion; execute/cancel/read results; save a named result and apply/reset its display mask |
| SES/SAS | Configure source selection, kind, radii/overrides, probe and spacing; generate/regenerate, observe progress and cancel; list/read provenance; set appearance/visibility and supported shaders/clipping; remove, save and reopen cached meshes |
| Field descriptors and probes | Discover fields/meaning/units/provenance; declare or update interpretation and supported display conversions; create, inspect, update and remove probes; configure probe labels and numerical keys |
| Planes and contours | Create/edit coordinate- or atom-defined planes; configure extents/counts, visibility, range/colormap/key and contour levels; inspect bounded numerical samples/statuses; recompute/cancel and remove |
| Line profiles | Create/edit endpoint/count definitions; inspect values, coordinates, distances, units and domain statuses; configure supported plot settings; recompute/cancel, remove and export |
| Persistence and output | Save/reopen all new durable records/caches; export numerical CSV and opaque/transparent PNG with the same annotations/keys; obtain bounded receipts/results and actionable errors |

For each row, add controller tests plus actual connector-transport acceptance that reads back the accepted state or inspects the produced artifact. Test updates and failure paths as well as creation. Include stale-source/revision errors, cancellation, limits and applicable file-scope/no-clobber rejection. A passing in-page controller test alone does not prove the packaged connector works.

Update API capability schemas, helper/CLI support where needed, packaged agent instructions/examples and Codex/Claude Code/generic-agent documentation alongside each feature. Preserve installed-binary setup without requiring the source repository. No milestone may defer its API or connector support to a later batch.

### Identity, state and publication

- An atom reference is an original zero-based index in the accepted document. At runtime pair it with a monotonic source generation that changes when accepted atoms/structure change. Persist only document-local indices, validated on decode. `doc.id`, filenames, labels and compact instance IDs are insufficient identity.
- Keep the canonical sorted selection **set** separate from the ordered measurement **pick sequence**. Sorting a torsion's inputs changes its meaning.
- Named sets, labels, measurement definitions, molecular surfaces and field-analysis definitions/results are durable document edits: dirty state, accepted revision and save all see them. Active highlights, hover/pick state and temporary display isolation are session state.
- Validate a complete candidate before publication. A cancelled, stale, invalid or over-budget job leaves the previous document and meshes intact. Guard both source generation and relevant request parameters; do not reject a valid result merely because an unrelated label changed.
- Keep authoritative source arrays immutable. New records must not alter atom order, coordinates, basis, coefficients, density matrices or cube samples. Render in f32 as needed; calculate/export in f64.

### Persistence and fingerprints

Propose three optional document fields, omitted when absent: `annotations`, `molecular_surfaces`, `field_analysis`. Proposed required-feature names are `eigenvista-annotations-v1`, `eigenvista-molecular-surfaces-v1`, and `eigenvista-field-analysis-v1`.

Extend the current version `[0,1]` capability mechanism rather than redesigning the container. Maintain a canonical ordered allowlist: base profile, biological capability if present, then the new capabilities if their payloads are present. Decoder validation must reject unknown/duplicate features and missing or spurious capability/payload pairs. Preserve legacy `.molekel` restrictions and old metadata-free output exactly. Older readers should explicitly reject a new required capability, not silently drop data.

Update `Document::validate`, exact format preflight, typed array packing, decode, TypeScript types, fixtures and native reference generation together. Named atom sets use typed u32 arrays where appropriate; do not expand many large sets into manifest JSON. All existing array/hash/path/ZIP checks still apply. Saved meshes must reopen without their original external input or Sesmesh being run again.

Keep **three identities** distinct for field analysis:

1. Existing numeric `source_hash`, byte-for-byte unchanged.
2. New sample fingerprint: numeric source hash + query geometry/counts + sampler algorithm version.
3. New interpretation fingerprint: validated quantity/unit/provenance metadata and display/export interpretation.

Put descriptors in `Document.field_analysis`, not `Grid`, `Orbital` or `Density`. An interpretation/label change can reuse unchanged raw samples; it must not invalidate old QC mesh hashes. New molecular-surface hashes use their own versioned domain. Validate added payloads explicitly outside numeric registration; stripping them from cached source registration must never become a validation bypass.

### Worker, budgets, cancellation and export

- Use separately owned clients for geometry, surface and field-analysis work while retaining the single-worker scheduler. Extend both main-thread and worker recoverable-action classification, currently special-casing only `backbone`. Invalid geometry/metadata must not discard resident QC registration.
- Geometry-only jobs send source geometry and necessary metadata, never a copied basis/density payload. Field analysis reuses prepared numeric source and scratch buffers; it must not parse a full scientific document once per point.
- Report real phase progress; provide counts only where the algorithm exposes honest totals. Do not invent percentages. Cancelling an active synchronous WASM job terminates its worker; a message posted to that busy worker alone cannot cancel it. Preserve unrelated queued owners and recover on the next job.
- Check size arithmetic and reserve owned allocations fallibly where practical. Account for source, scratch, output, typed transfer, retained caches and GPU buffers together. Runtime traps must dispose/recreate the worker without discarding accepted results. Allocation failure in upstream code is not guaranteed to be a recoverable Rust `Result`.
- Add one bounded domain-specific CSV path, shared by measurement and field exports. Native control needs a new `ScopedFiles` method/Tauri adapter using existing internal write protections: allowed roots, source protection, no-follow/no-clobber and destination validation; allow `.csv` only. No unrestricted file writer. Browser GUI downloads generated bytes; browser control returns bounded text/pages or a supported download receipt. Never serialize full plane arrays in retained job JSON: the native broker frame cap is 4 MiB.

### Proposed initial limits

These are conservative V1 product limits to qualify, not claims about current code or measured optimal values. Declare them in shared discoverable constants and test each boundary. Existing lower archive/aggregate budgets always win.

| Product | Proposed bound |
| --- | --- |
| Named sets / total references | 64 sets; at most 1,000,000 aggregate atom references; each index must belong to the accepted source |
| Measurements / labels | 256 measurement definitions; 256 visible labels; label text at most 256 UTF-8 bytes, 64 KiB aggregate; a separate 16 MiB label-texture budget |
| Selection/neighborhood result | At most the source atom count; avoid allocating all seed–candidate pairs; paginate discovery at at most 100 records |
| New molecular-surface output | Existing 2,000,000-vertex ceiling; at most 4,000,000 triangles; 256 MiB configured engine working budget, additionally constrained by whole-job memory estimate |
| Field caches | 128 probes; 8 planes of at most 512×512 samples each; 16 profiles of at most 4,096 samples each; 16 MiB aggregate retained numeric/mask cache |
| Contours | At most 32 levels, 1,000,000 line segments aggregate; count/reserve before publication |
| CSV | At most 32 MiB generated UTF-8 output; browser control response chunks at most 1 MiB; bounded metadata/text lengths |

The individual maxima need not all fit concurrently. Return a specific limit error, retain earlier results and show an actionable smaller spacing/extent/count choice. A larger scientific job remains cancellable; elapsed time alone is not a reason to reject it. Do not silently coarsen a surface or downsample a quantitative export.

## Delivery map

| Milestone | Depends on | Reviewable result |
| --- | --- | --- |
| M0 — shared contracts | Baseline review | Agreed identity/lifecycle, capabilities, budgets and scientific conventions, with contract tests |
| M1 — selection and geometry | M0 | Typed picks, stable atom sets, f64 measurement table, shared control methods |
| M2 — annotations and neighborhoods | M1 | Persistent named selections/labels/monitors, annotated PNG and CSV, ligand-copy and whole-residue proximity workflows |
| M3 — Sesmesh qualification | M0; can run alongside M1–M2 | Actual native/WASM evidence, portability repairs identified, explicit integration go/no-go |
| M4 — molecular surfaces | M2 + M3 pass | Whole-source and selected SES/SAS, bounded background jobs, source/radius provenance, cached save/reopen and export |
| M5 — field semantics and probes | M0; can run alongside M3–M4 | Structured interpretation, numerical probes and truthful keys for existing rendering modes |
| M6 — planes, contours and profiles | M5; reuse M2 export/annotation path | f64 planes and line profiles, continuous slice color keys, bounded contours, CSV and save/reopen |
| M7 — integrated qualification | M2 + M4 + M6 | Full local macOS validation, native connector workflow, updated user/technical documentation |

Use a parent tracking issue with milestone-sized child issues, or equivalent linked issues using the current repository taxonomy. These are enhancements; M3 is a qualification task. File an independently demonstrated bug separately rather than describing every prerequisite as a bug. Existing #35/#36/#37/#38/#40/#41/#42 and the remaining biological roadmap remain separate; do not expand this plan into those investigations automatically.

## M0 — lock the shared contracts

1. Record the decisions above, schema shapes, byte/count limits, torsion convention, unit provenance and source-generation rules in a focused decision record. Resolve how new masks compose with current chain/component/range visibility before adding another selection UI.
2. Add validated optional payload types and exact feature/payload checks in core/format/types. Keep empty/absent behavior canonical. Introduce the new capabilities only when meaningful payloads are written.
3. Define typed worker requests/results and independent non-QC error classification. Add a common candidate-publication guard and bounded CSV export adapter; do not create an additional server or automation protocol.
4. Add compatibility tests before feature UI: old fixtures/array entries/hash bytes unchanged; every allowed feature combination roundtrips; unknown/duplicate/mismatched capabilities and invalid references fail. Invalid added metadata must fail even when numeric source registration would otherwise be reused.
5. Map every operation in the required API/connector coverage matrix to a shared application handler, discoverable schema and planned controller/transport test. Track those acceptance items in each milestone's issue before its implementation begins.

**Gate:** `cargo test --locked -p eigenvista-format` and `cargo test --locked -p eigenvista-core` pass, including the new contract tests; `npm --prefix app run build` passes. Existing frozen fixture bytes and hashes match their checked-in oracles. No capability is declared implemented solely because its types compile.

## M1 — stable selection and geometry measurements

### Implementation

1. Add proposed typed `InspectionPick` results for atoms, residues, bonds and surfaces; keep formatted inspection text for existing behavior. Resolve original indices from the existing atom/protein mappings. A cartoon hit may identify its mapped source Cα/residue; do not present a triangle intersection as an exact atomic coordinate.
2. Add explicit selection/measurement mode, ordered picks with clear/remove/reorder, sparse highlights and a keyboard-accessible results table. Preserve ordinary orbit/zoom and existing click inspection. Scope stale hit callbacks to source generation.
3. Implement shared Rust `inspection` operations over source f64 positions. Keep selection sets sorted/unique, but retain measurement order. Evaluate in the owned worker with geometry-only inputs. Add bounded paginated atom/residue discovery so users and agents can identify a particular ligand copy without needing a global atom dump.
4. Add shared-controller schemas for selection and measurement operations at the same time as GUI controls. Proposed method families: `atoms.list`, `residues.list`, `selection.*`, `measure.*`. Exact names are new and must be documented/discoverable; use existing revision guards, jobs and structured errors.

### Scientific conventions

- Euclidean nonperiodic distance; source bohr, default readout Å. Distinct coincident atoms have valid zero distance. Duplicate atom IDs in one measurement are invalid arguments.
- Angle `A–B–C` is at B: `atan2(|u×v|, u·v)` for `u=A−B`, `v=C−B`. Both arms must be nonzero; valid collinear nonzero arms produce 0° or 180°.
- Ordered torsion `A,B,C,D`: `u=(C−B)/|C−B|`, `v=(A−B)−u·dot(A−B,u)`, `w=(D−C)−u·dot(D−C,u)`, then `atan2(dot(cross(u,v),w),dot(v,w))`. Report degrees in **[-180°,180°)**; normalize negative zero. Zero central bond or degenerate projected arms is explicitly undefined.
- Use robust norms and a documented scale-aware degeneracy threshold. Distinguish undefined geometry from overflow/invalid input; never turn either into a numeric zero/NaN in exports. Do not claim uncertainties or periodic minimum-image measurements.

### Independent acceptance

New `crates/eigenvista-core/tests/inspection.rs` uses closed-form fixtures: distance from `(0,0,0)` to `(2,0,0)` is 2 bohr / **1.058354421806 Å**; unit-axis angle 90°; opposite arms 180°. Torsion `(1,0,0),(0,0,0),(0,1,0),(0,1,-1)` is +90°; changing the last z to +1 gives −90°. Test translation/proper rotation invariance, reflection sign, pick order, ±180° normalization, zero distance, undefined planes and invalid indices.

New `app/tests/inspection.spec.ts` must pick the same original atoms before/after filtering and representation changes, preserve measurements on camera/palette changes, clear transient picks on source replacement, reject late old-source responses, and match GUI/controller numbers. Use existing `worker-ownership.spec.ts` and `structure-registration.spec.ts` patterns to prove invalid/cancelled geometry jobs preserve unrelated QC work/registration.

**Gate:** core tests pass; actual built-WASM results match the closed-form oracles within explicit f64 tolerances. From `app/`, `npx playwright test tests/inspection.spec.ts --project=chromium --project=webkit` passes. A screenshot alone is not numerical evidence.

## M2 — persistent annotations, ligand neighborhoods and exports

### Annotations and presentation

1. Add bounded named source-index sets, ordered measurement definitions and atom/residue labels to `annotations`. Persist definitions/presentation, recomputing geometry values from the document's authoritative coordinates rather than treating rounded table text as data. Materialized named sets survive save/reopen of the same source order.
2. Keep labels and distance/angle/torsion monitors in an owned render group outside atom/bond AO ownership. Choose and document depth/occlusion behavior; default depth-aware anchors with readable text, plus an explicit always-visible option if provided. No automatic labels on every atom in a large molecule.
3. Render text with a bounded canvas-texture/WebGL overlay or a shared explicit export compositor. Both ordinary and transparent PNG must contain the same intended labels/monitors; DOM-only labels that disappear in export fail acceptance. Preserve transparent edges, final dimensions, viewport restore-on-error and resource disposal.
4. Add measurement CSV and label/named-selection controller operations. Selection/filter-only actions remain session changes; adding/removing saved records marks the document dirty. Full camera/palette/AO scene persistence remains deferred.

### Neighborhood semantics

Add a Rust spatial query independent of bond perception. Reuse the existing `kiddo` dependency where appropriate, not covalent bond thresholds or `bonds::perceive`.

- Resolve one ligand by residue index or fully qualified chain/residue identity; repeated residue names/numbers must not arbitrarily select one copy. Show chain identifiers, insertion code and source residue index in discovery.
- “Within N Å” is an inclusive atom-center distance against the full accepted source by default, including currently hidden atoms. Seeds are included. A nearest-seed k-d tree queried once per candidate avoids materializing all seed–candidate pairs.
- Optional whole-residue expansion uses `structure.atom_residues`. Reject that option when metadata is absent. Keep seed exclusion out of V1, avoiding ambiguous expansion/exclusion order.
- A named result is a materialized set with seed/radius/expansion provenance. It does not silently rebind after a different input is loaded. Existing chain/component/range masks and the new selection mask intersect; provide explicit “reset filters and show selection” behavior so an old hidden-chain setting cannot mysteriously hide a valid neighborhood.
- Do not label proximity as a hydrogen bond, salt bridge, affinity, functional pocket or chemically typed interaction.

### Acceptance

New `tests/neighborhoods.rs` compares the spatial query to an independent exhaustive union on small fixtures, including exact-radius boundaries, coincident distinct atoms, translations, permuted original indices and large seed sets. Add a new tiny biological fixture with two ligand copies, repeated author residue numbers, an insertion code and noncontiguous atoms of one residue; retain existing fixtures unchanged. Verify exact whole-residue expansion and a bounded real 1AON neighborhood.

Format tests cover named sets/ordered definitions/labels with and without biological metadata, malformed references/budgets, dirty state, save/reopen and unchanged QC hashes. PNG tests decode pixels using the existing `app/tests/scenePixels.ts` pattern: visible text/monitor pixels, alpha edges without opaque rectangles, camera changes, resize and export while idle. CSV tests cover numeric precision/units, undefined-status rows, escaping, source protection, roots and no-clobber.

Natural-language end-to-end task: **“Select this copy of the ligand, show complete residues within 4 Å, measure these two atoms, label the result, and save an annotated image and table.”** The user never needs to type internal method names or perform a tutorial step manually in the GUI because control support was omitted.

**Gate:** `cargo test --locked` passes including format/control tests; from `app/`, the new inspection and inspection-control tests pass in both engines. Export, reopen and inspect actual artifacts. All annotations survive reopen; source hashes and saved QC meshes remain unchanged.

## M3 — qualify Sesmesh before production integration

### Source-reviewed opportunity and real blockers

Review pinned upstream [Sesmesh source](https://github.com/uvar-apps/sesmesh/tree/1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8), version 1.1.2. Its [Cargo features](https://github.com/uvar-apps/sesmesh/blob/1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8/crates/sesmesh/Cargo.toml) enable parallelism, gzip and radii-file support by default; [par.rs](https://github.com/uvar-apps/sesmesh/blob/1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8/crates/sesmesh/src/par.rs) supplies sequential alternatives. Qualify a dependency with **default features disabled**, not the upstream CLI or its file importer.

The actual control API is `compute_surface_with(&[Sphere], &SurfaceParams, &Control) -> Result<SurfaceOutput>`. [Control](https://github.com/uvar-apps/sesmesh/blob/1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8/crates/sesmesh/src/control.rs) takes a `Sync` progress callback, unlike the current JS callback bridge. [surface.rs](https://github.com/uvar-apps/sesmesh/blob/1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8/crates/sesmesh/src/surface.rs) unconditionally uses `std::time::Instant::now()`. That requires a target-appropriate clock for `wasm32-unknown-unknown`; [web-time documentation](https://docs.rs/web-time/latest/web_time/) explains the browser timing gap. Source inspection is not an actual EigenVista WASM pass.

### Qualification tasks

1. Use repo-local scratch/staging and a minimal adapter to compile **and execute** native and actual worker-WASM SES/SAS for one and two spheres. Exercise the exact scalar/SIMD mode intended to ship in Chromium and WebKit. No browser threads, cross-origin-isolation deployment change or native-only fallback is assumed.
2. Resolve timing through a reviewed target-specific upstream fix or minimal pinned patch, using a worker-compatible clock. Keep portability changes independently reviewable. Do not edit the separate Sesmesh checkout/repository without authorization; record a proposed upstream change if needed.
3. Bridge honest phase progress without unsafe `Send`/`Sync` assertions on JS values. A safe target-specific adapter may access worker-local callback state, or expose stage-only events at supported boundaries. Qualify callback failure and cleanup. Active cancellation continues to terminate the worker, including a synchronous upstream call.
4. Prove `max_memory` behavior, peak whole-job estimates, allocation/trap recovery and checked output bounds. Disable automatic coarsening, smoothing and decimation; requested spacing must not change silently. Preserve cavity policy explicitly (initially keep cavities). Measure mesh error versus spacing, not just timings.
5. Check exact dependency/version pin, supported toolchain/targets, license alternatives and shipped notices. No copied legacy implementation. Record native/WASM identity, settings, browser, elapsed time, peak/resident/transfer estimates and limitations in a decision/qualification record.

**GO gate:** real worker computations pass in both browser engines; native/WASM results meet agreed analytic tolerances; cancellation/memory failure leaves accepted results usable; portability/progress fixes are small and reviewed; dependency/notice checks pass. Then pin that qualified version/commit and continue M4.

**NO-GO gate:** document the specific failure and present the smallest alternative decision. Do not silently ship only desktop support, mislabel a Gaussian envelope as SES, copy another implementation, or declare the feature finished after the spike. Independent M1/M2/M5 work may continue while this surface track is blocked.

**Verify:** `cargo build --locked -p eigenvista-wasm --target wasm32-unknown-unknown`, `npm --prefix app run build`, the new native molecular-surface tests, and actual Chromium/WebKit worker tests all pass. Compilation without the worker computations does not satisfy the gate.

## M4 — ship bounded SES/SAS molecular surfaces

### Scientific adapter and model

1. Feed accepted source atoms to the Rust library as spheres, converting coordinates from bohr to Å exactly once. Rebase around a documented deterministic local origin before the f32 mesh is produced, then restore that origin in f64 when converting output to bohr; qualify large-translation error. Do not re-import PDB/mmCIF/XYZ through Sesmesh and change selected models/alternates. Preserve original source indices through `vertex_atom`, which indexes the adapter's sphere list rather than the original document automatically.
2. Default to explicit **Bondi/Mantina** radii using the vetted library table, with **Alvarez** as a selectable alternative and finite positive per-element overrides if supplied. Never use the viewer's display radii or covalent bond radii. Reject missing radii with the affected elements; no generic 1.8 Å fallback, silent omission or automatic alternative table. Defer ProtOr/united-atom radii until explicit-H handling is qualified. Record actual resolved radii, table/version and hydrogen inclusion policy.
3. Start with SES and SAS; label their definitions and probe radius (default 1.4 Å), requested/actual spacing (initial default 0.5 Å, qualified finer setting 0.25 Å), cavity policy and included atoms. Both surfaces use a nonzero probe. A vdW boundary is a later optional addition, not required to finish this plan.
4. Add a separate `MolecularSurface` record in optional `Document.molecular_surfaces`: ID, type, atom-index set, resolved radii/probe/spacing/cavity settings, engine/algorithm version, independent source fingerprint, mesh/material/visibility and diagnostics. Geometry may share validated buffer helpers with `Surface`, but must not invent a field, isovalue, grid or quantum hash.
5. Fingerprint a canonical `molecular-surface-v1` payload containing included original indices, elements/f64 coordinates, resolved radii, SES/SAS kind, probe, requested/actual spacing, cavity/smoothing/decimation policy and engine version. Palette/opacity edits do not regenerate geometry. Store library-produced f32 vertices as their exact f64-representable values in the current native numeric format; identify their actual precision honestly. Convert Å positions back to bohr for the shared scene; normals remain unit directions.

### UI, jobs and rendering

6. Add a dedicated molecular-surface panel; do not imply it is another quantum field. Create from the whole source or a named/current selection. The initial selected mode is **the surface of the selected atoms treated as an isolated object**. It is not a cropped patch of the full molecule or an environment-aware pocket surface; expose that distinction clearly.
7. Run a cancellable background job with progress, memory estimate, validated parameters and transactional publication. Keep old meshes visible during replacement. The full working set must fit the qualified policy even when the engine's internal limit is smaller than total browser memory use.
8. Reuse the existing surface shading paths, labelled Diffuse (currently `MeshStandardMaterial`) and Blinn–Phong, plus clipping/X-ray/custom shaders and PNG capture where applicable; test their actual behavior. Molecular meshes remain visible independently of the selected quantum field/render mode; extend field-specific visibility rules explicitly. Existing molecular atom/bond SSAO stays scoped to those instances with its Lambert policy. AO on SAS/SES is not claimed by this increment. Dispose new geometry/material resources on remove, replace, import and failure.
9. Add discoverable proposed `molecularSurfaces.*` controller operations and job receipts, not mesh arrays in ordinary state/list responses. Persist cached geometry and its provenance with exact native preflight. Reject an over-budget save/publication while retaining the previous accepted surface; never silently discard embedded source data to make it fit.

### Acceptance

- For a single sphere of radius r, SAS radius is r+probe; SES radius is r. Validate bounds, outward normals, area/volume convergence as spacing decreases, and no gross topology errors. Establish numeric tolerances before accepting the engine, tied to the tested spacing; do not compare exact triangles across SIMD/targets.
- Test disjoint, overlapping, tangent/near-tangent two-sphere cases; use independent closed-form geometry where applicable. Add at least one documented independent molecular reference under identical radii/probe/cavity definitions. An upstream golden generated by the same engine is regression evidence, not the only correctness oracle.
- Qualify a small ligand, a bounded 1AON selection and a whole-source case that fits the stated budgets. Check bohr↔Å, atom attribution, radii failures/overrides, hidden-source policy, selected-isolated semantics, cache keys and both SES/SAS.
- Save/reopen with QC arrays, legacy QC surfaces and molecular surfaces together; exact old QC hashes survive. Reopened molecular meshes display without recomputation or external files. Test shader/transparent-PNG parity, cancellation, source replacement, memory error and retry. GUI and connector create the same scientific object.

**Gate:** new core/format/control surface tests plus `npm --prefix app run build` and both-engine molecular-surface tests pass. Compare saved mesh/provenance and independent geometric errors, not just attractive pictures. A successful whole-source surface does not waive selected-surface acceptance.

## M5 — field meaning, probes and truthful numerical keys

### Semantics and numerical evaluation

1. Add bounded field descriptors in `field_analysis`: stable field ID, quantity, scalar unit, provenance/origin (`imported`, `derived`, `user-declared`, `unknown`) and optional source note. Validate descriptor references and compatible quantity/unit combinations. Do not change existing `Grid.quantity` or guess meaning from filenames/comments such as “ELF.” Known coordinate units do not establish scalar-value units.
2. Populate descriptors only from scientifically supported importer/derivation contracts. Where meaning is absent, show **unspecified**, allow an explicitly recorded user declaration and still permit numerical inspection. Distinguish occupation-derived Molden density from a correlated density. Distinguish orbital amplitude/sign, electron/spin density, potential and arbitrary scalar data.
3. A unit declaration labels raw values; it does not rescale them. Any display/export conversion must be explicit, dimension-compatible and documented. Keep original values/units and a separate conversion choice. Numeric sampling cache keys exclude label/color choices; publication checks the relevant interpretation snapshot too.
4. Add a reusable f64 evaluator for analytic fields and stored grids. Reuse prepared scalar scratch for many points without replacing the resident sampled preview cache. Reuse immutable numeric registration for quantitative actions and transfer bounded `Float64Array` values/status masks, not JSON-expanded sample arrays. Do not route probes through current `RegisteredDocument.prepare`, which builds a full 3D preview, or through existing per-point exports that repeatedly parse a document.
5. For grids, invert the affine step basis: with rows a0,a1,a2 and determinant d, reciprocal rows are `cross(a1,a2)/d`, `cross(a2,a0)/d`, `cross(a0,a1)/d`; index coordinate qi is their dot product with `p−origin`. Trilinearly interpolate source f64 samples. Support skew and negative determinant, inclusive endpoints and correct x-fastest indexing. At the maximum endpoint use a safe final cell with weight one. Clamp only tolerance-sized endpoint roundoff; outside points have explicit status, never zero-fill/extrapolation.

### User workflow and control

6. Add probes at an exact atom, entered coordinate or explicit analysis point. A picked mesh location is a world-space point, not proof of a nearby atom's value. Show coordinates/unit, value/unit or unknown, analytic versus interpolated method, source identity and domain status. Keep raw f64 results separate from rounded labels/GPU values.
7. Add truthful exportable keys: signed ±isovalue labels for existing meshes/raycast; for volume explain the actual signed colors and opacity/transfer settings. Current volume uses a smoothstep extinction relationship, not a continuous linear scalar colormap. Do not append a misleading rainbow/linear colorbar to it. Continuous numeric colorbars arrive with M6 slice colormaps.
8. Add proposed descriptor/probe families such as `fields.describe`, `fields.set_metadata`, `analysis.create/list/get/remove/samples`. Names are new. Creation may return a job receipt; summaries contain bounded IDs, hashes, ranges/counts and statuses, never all cached arrays. Use existing job status/cancel and scoped exports. User tutorials remain ordinary scientific prompts.

### Acceptance

Use frozen PySCF fixtures and their independent point values as the analytic oracle, including open-shell spin and signed data. New grid fixtures use constant, linear and trilinear-polynomial fields on orthogonal, skewed and reflected bases, including exact samples/endpoints/interiors/outside points. Test large coordinate offsets, finite-value checks and ill-conditioned transforms under an explicit quantitative-evaluation policy, without tightening unrelated frozen-format acceptance. Finite f64 values beyond f32 range remain valid for numerical readouts/CSV; report a separate rendering limitation where applicable. Retain the existing affine resampling/mesh reflection tests if extracting helpers.

Descriptor edits must leave source arrays, old `source_hash` values and QC mesh associations unchanged. Test metadata rejection even with reused numeric registration. A probe on unknown cube data remains unknown after save/reopen unless the user explicitly declared its meaning. Numerical readouts must match f64 oracles; changing GPU preview resolution or camera cannot change them.

**Gate:** `cargo test --locked -p eigenvista-core`, format compatibility tests, the production WASM build and both-engine new field-analysis tests pass. Numeric keys appear correctly in opaque and transparent PNGs and state the actual rendering semantics.

## M6 — quantitative planes, contours and line profiles

### Plane sampling and depiction

1. Add a new 2D analysis definition: source field/hash, origin, two in-plane basis directions/extents in bohr, sample counts, sampler version and interpretation reference. GUI accepts Å while preserving bohr internally. Support coordinate-aligned planes and a plane through three distinct noncollinear atoms.
2. For atom-defined planes, use A as center, horizontal direction along B−A, normal along `(B−A)×(C−A)`, and vertical direction `normal×horizontal`, all normalized; extents are explicit. Reject collinear/near-degenerate choices using the documented tolerance. Store the resolved world frame as well as atom references so the plane has reproducible orientation.
3. Sample directly from analytic fields or the authoritative f64 grid interpolator, reporting completed rows/tiles. Represent outside-grid samples with a separate validity/status mask, not NaN payloads. Do not first generate a 256³ volume, and do not call upsampling new source information.
4. Render a true plane heatmap with an explicit fixed/automatic range, unit-bearing continuous colorbar, signed diverging option and visible missing-data mask. Handle all-equal/all-zero values without division by zero. Do not silently change the range between comparisons. The PNG path includes the same scale/key; numeric probing/export reads f64 values, not the texture.
5. Generate bounded marching-squares contours in plane coordinates. Specify equality/tie rules and resolve ambiguous saddle cells with a documented bilinear/asymptotic decision. Never connect across invalid samples. Test exact line positions on simple fields and saddle topology independently; count line-segment allocations against the contour budget.

### Profiles, caches and export

6. A line profile is a straight segment with two explicit endpoints, optionally from atoms, and 2–4,096 inclusive samples. Plot distance along the segment in Å against the field/unit, with gaps for outside-domain points and access to the sampled table. Reject a zero-length segment; no periodic wrapping or implied path integration.
7. Persist definitions **and bounded f64 sample caches/status masks**, source/sample/interpretation fingerprints, chosen numeric scales and algorithm version in `field_analysis`. Typed packer stores arrays, not huge JSON. On reopen, valid cached results display without recomputation. Stale/malformed caches are rejected; an explicit future source edit may retain a definition only by marking it unevaluated and removing its cache. Do not silently resample and present changed values as the saved result.
8. Share M2's CSV writer for probes, plane samples and profiles. Use controlled columns: coordinates and coordinate units, profile distance when applicable, value/unit or empty value plus status, method and source/sample identifiers. Preserve adequate f64 roundtrip precision and deterministic ordering. Escape text/records; neutralize untrusted text labels for spreadsheet consumers without altering negative numeric values. Header metadata records interpretation/provenance and conversion choices.
9. GUI and controller can create/remove/list analyses, choose scales, inspect bounded sample pages and export them. Keep large arrays out of loopback job metadata; `analysis.export_csv` or its final equivalent yields a scoped file receipt/bounded browser result. No file write outside the authorized roots.

### Acceptance

- Plane samples from synthetic constant/linear/trilinear sources match independent closed-form values; analytic planes match frozen PySCF points where present and independently checked generated reference points. Orthogonal/skewed/reflected axes, endpoints, partial/outside coverage and axis orientation all have explicit tests.
- Three-atom plane frame matches the stated construction and rejects degeneracy. Profiles include both endpoints, correct Å distances and signed values; coordinate/unit conversions leave original samples unchanged.
- Constant-range and signed colormap/legend tests exercise numerical mapping, not only screenshot similarity. Contours test linear crossing, saddle tie, flat/equal cells, zero level, invalid-cell holes and segment limits.
- Native save/reopen preserves f64 caches/masks and interpretation; 16 MiB cache and existing archive limits reject transactionally. Tampered hashes/refs and interpretation mismatch fail clearly. Old native fixtures remain byte-identical when optional payloads are absent.
- Opaque/transparent PNGs include the plane, readable continuous key, selected labels and contours with correct aspect/alpha. Profile/plane CSV values match source calculations independently of GPU precision, camera and current preview quality.
- Cancel mid-plane/profile, replace the document, retry after a worker trap, and queue unrelated QC/geometry work. No stale result appears or unrelated job is lost.

**Gate:** new field-analysis/core/format/control tests pass; from `app/`, `npx playwright test tests/field-analysis.spec.ts tests/inspection-control.spec.ts --project=chromium --project=webkit` passes. Inspect real CSV/native/PNG artifacts; all scientific and lifecycle assertions hold.

## M7 — integration, documentation and local acceptance

Update user guide, website/reference/tutorials, packaged connector instructions and technical API/architecture/format/development documentation in the same milestones as their behavior. Extend method-count/schema assertions where currently fixed to 28; use actual discovered capabilities rather than stale counts. Keep setup valid for downloaded binary users, with Codex, Claude Code and generic agents. No source checkout or internal API vocabulary should be required in user prompts.

Publish three practical workflows in the user documentation:

1. Ligand-copy selection → whole-residue neighborhood → distance/torsion monitors → annotated PNG/CSV → save/reopen.
2. Accepted structure/selection → explicitly parameterized SES and SAS → shader/clipping view → cached native reopen and PNG.
3. Molden analytic field and an unknown cube → documented interpretation → probe → three-atom plane/contours → line profile/CSV → saved caches reopen.

Keep tutorial content on the website, matching the repository's current convention, and technical contracts in repository docs. Use scientifically meaningful multi-atom examples and preserve image aspect ratio. Do not advertise unqualified Linux support, surface AO, chemical interactions or periodic measurements. Update living handoff/status with exact evidence and remaining limitations; update this plan/index milestone statuses after accepted implementation.

### Local commands for the executor

These commands were checked against the existing scripts/documentation, **not run as runtime validation during this planning task**. Run from the EigenVista root unless the table specifies otherwise. Check port/build ownership first. Do not install/rebuild during the planning-only session.

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
```

| Purpose | Command | Required result |
| --- | --- | --- |
| Formatting | `cargo fmt --manifest-path Cargo.toml --all --check` | Exit 0 |
| Locked default Rust suites | `npm --prefix app test` | All affected and existing tests pass |
| Strict Rust lint | `cargo clippy --manifest-path Cargo.toml --locked --workspace --all-targets -- -D warnings` | Exit 0, no warnings |
| Desktop tests | `cargo test --manifest-path Cargo.toml --locked -p eigenvista-desktop` | All pass |
| WASM/TS/production | `npm --prefix app run build` | Exit 0; actual WASM tests still required |
| Full browser suites | `npm --prefix app run test:e2e` | Complete Chromium and WebKit pass; no skipped failing cases, retries masking failures or interrupted-suite claims |
| Packaging support | `npm --prefix app run test:packaging` | All pass |
| Connector package tests | `node --test tools/package-ai-connector.test.mjs` | All pass against the required rebuilt helper/app inputs; support-only tests are not a substitute |
| User website | `node tools/site/build.mjs`, then `node tools/site/check.mjs`, then `node tools/site/test.mjs` | Content/build/link checks and both-engine layout/media checks pass |
| Final diff | `git diff --check` and `git status --short` | No whitespace defects or unexpected files; preserve pre-existing edits |

Install browser engines only if absent, using the documented development procedure. Full local macOS checks, scientific oracles, actual native operation and relevant connector/package tests must pass **before every authorized push**, including PR updates. No hosted application CI is required or should be started. Linux qualification remains pending until the promised local hosts are available; record it honestly.

For native acceptance use an isolated rebuilt app/helper, not the old running debug binary. When package creation is authorized, exercise the extracted redistributable with a clean connector setup: load input, discover ligand, annotate, create SES/SAS, create/probe a quantitative plane/profile, export PNG/CSV, save/reopen, reject unauthorized/no-clobber writes, cancel and recover. Preserve tests of existing orbital generation, volume/raycast, AO, shaders, imported bonds and transparent PNG. Source version 0.9.0 preparation is authorized; a future release/tag is a separate authorization and is not implied by finishing this plan.

The required coverage matrix is a per-feature completion gate, not merely a final demo: verify every row through the real helper/transport using an isolated matching build during its milestone, then repeat the integrated workflows against the extracted redistributable at M7 when packaging is authorized. Read back modified settings/results and inspect exported files; do not infer support from advertised method names alone.

## Completion checklist

Local implementation/qualification completed on 16 November 2026. The
[design record](../docs/design/2026-11-16-scientific-inspection.md) records the
intentional single inspection-client ownership (with serialized mutations and
per-request cancellation) instead of three inspection clients proposed above.
Controller coverage is integrated into the geometry/field/surface browser suites
and actual extracted-helper acceptance rather than a separate test filename.

Evidence: 336 default and eight desktop Rust tests, fmt/strict workspace Clippy,
final WASM/TypeScript/build, 604 Chromium/WebKit cases (302 each, one worker,
20.5 minutes, no skips/retries/failures), 162 website cases and 17+6 packaging
tests. All 257 monitored runtime/test files stayed stable. Independent package
audit verified 664 source files, vendored-source/notice coverage and actual
embedded assets. The extracted app passed every new method (34 methods/160
helper calls), five inspected PNGs/alpha, numerical references, cancellation,
source preservation, scoped CSV/no-clobber and save/reopen. The living
[handoff](../docs/handoff.md) records exact artifact identities and evidence.
The final reporting edits are documentation-only. Main, version and published
release remain unchanged; no commit/push/PR/merge is authorized yet. User testing
is the next external gate, not a claim of release acceptance or Linux qualification.

- [x] M0 contracts and all optional feature/payload combinations are tested; absent payloads preserve frozen format bytes/hashes.
- [x] M1 original-index selection and ordered distance/angle/torsion measurements pass independent numerical and lifecycle tests.
- [x] M2 particular ligand copies, whole-residue neighborhoods, durable annotations, labelled PNG and measurement CSV work through GUI and AI control.
- [x] M3 actual native and both-engine WASM qualification passes, with documented clock/progress/memory treatment and dependency pin.
- [x] M4 whole-source and isolated-selected SES/SAS pass independent geometry/resource tests; cached meshes/provenance reopen without recalculation.
- [x] M5 known/unknown meaning and units remain truthful; f64 probes and existing-mode keys pass scientific and PNG checks without hash changes.
- [x] M6 quantitative planes/contours/profiles, caches, colorbars and CSV pass domain/precision/units/limit tests in both engines.
- [x] Every operation in the required coverage matrix has bounded shared-API and real AI-connector coverage, accepted-state/artifact assertions and ordinary-language user guidance; no GUI-only tutorial workaround is required.
- [x] Capability schemas, helper/CLI behavior and packaged instructions are synchronized; create/update/read/remove, progress/cancel and export/save/reopen are verified where applicable in each feature milestone.
- [x] Source replacement/cancellation/errors cannot publish stale output or corrupt accepted meshes/QC registration.
- [x] M7 relevant full local macOS/runtime/native/packaging/documentation checks pass on the exact source to be pushed.
- [x] Handoff/status/architecture/format/control/user/site documentation and this index reflect the implemented scope and evidence.

## Stop conditions and deferred decisions

Stop the affected track and report a concrete decision if:

- Live source changes invalidate a current-state contract or require an unplanned format/hash migration. Reconcile the plan; do not overwrite ongoing user changes.
- Sesmesh cannot execute safely in the shared WASM worker after a bounded clock/callback portability repair, or only fits by silently changing requested geometry. Do not substitute a different surface meaning or architecture.
- Independent numerical/geometric references disagree beyond declared tolerance. Do not loosen an oracle solely to match the implementation or call visual plausibility correctness.
- Supporting a radius table requires unqualified H/protonation behavior, or a scalar meaning/unit is unavailable. Resolve the radius input explicitly; retain unknown scalar semantics rather than inventing data.
- Memory/transport/native preflight cannot hold the requested product. Return a bounded failure and retain the accepted state; record a separate capacity proposal rather than raising global limits casually.
- A safety guarantee depends on unsafe JS `Sync` assertions, ignoring worker traps, unrestricted writes, dropping source arrays, bypassing format checks or editing the read-only legacy repository.

These are product/scope decisions, not permission to abandon independent completed work. Rank 4 scene presets, rank 5 supplied-property mapping, chemically typed interactions, surface AO and vdW/ProtOr expansion can use these foundations later, but need their own selected scope and acceptance criteria.

## Primary references and evidence boundary

- Workflow precedent only: [Mol* measurements](https://molstar.org/viewer-docs/tips/measurements/) and [VESTA 2D/profile utilities](https://jp-minerals.org/vesta/en/doc/VESTAch14.html). Their features do not establish EigenVista correctness or require copying their interfaces.
- Surface API/features/portability: pinned Sesmesh source links in M3; numerical and performance qualification is explicitly future work. [Sesmesh repository](https://github.com/uvar-apps/sesmesh) provides upstream documentation/licenses and scientific references for matching independent test definitions.
- Current implementation facts: directly inspected EigenVista source at the baseline above, with compatibility and runtime contracts recorded in repository documentation. New module/type/API names and proposed resource budgets in this plan are design recommendations, not shipped capabilities or benchmark results.

**Planning verification:** source/interface review and primary-source research only. No application source/dependency/runtime change or test/build/package run is claimed by this document.

The plan and updated index passed local link/fence/milestone checks (45 local links, M0–M7); all nine unique external plan references returned HTTP 200. A fresh-context review found no material gaps after the source/precision refinements. Whitespace checks include the new untracked documents, not only the tracked index diff.
