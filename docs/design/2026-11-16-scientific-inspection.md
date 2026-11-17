# Scientific inspection: identity, surfaces and quantitative fields

Initial implementation record: 16 November 2026, locally qualified on
`codex/scientific-inspection` with **0.9.0** metadata. This work is based on main
`6a728d918cfdf4291a6a04ae9327d668fd449283`; published 0.8.0 binaries do not
contain it. After personal testing, the user approved the simpler workspace
and authorized the 0.10.0 documentation/source update and PR merge on
17 November. The living handoff records current verification and delivery;
this document preserves the scientific decisions and earlier evidence.

Scope: [Plan 009](../../plans/009-scientific-inspection-implementation.md),
parent [#83](https://github.com/uvar-apps/eigenvista/issues/83),
geometry [#84](https://github.com/uvar-apps/eigenvista/issues/84),
SES/SAS [#85](https://github.com/uvar-apps/eigenvista/issues/85), and
quantitative fields [#86](https://github.com/uvar-apps/eigenvista/issues/86).
The living [handoff](../handoff.md) and [status](../status.md) record actual
qualification; this document records the implementation decisions.

## One scientific model and one controller

Rust owns geometric and quantitative calculations, validation and persistence.
React owns editing and accepted state; Three.js owns bounded display geometry.
GUI actions and the opt-in authenticated connector use the same shared
controller. The installed helper discovers new method schemas without adding
another transport, scripting engine or embedded AI console. The user-facing
guides describe outcomes in natural language; internal API details belong in
the [technical reference](../application-control.md).

Original zero-based atom indices are the stable identity within a document.
The runtime additionally checks immutable atoms/structure references and a
source generation before accepting asynchronous results. Compact render
instances are never persisted as atom identities. Canonical selected sets are
sorted and unique; ordered picks remain separate so torsions retain their
meaning. Bond picks expose both original endpoints. Backbone/cartoon picks
identify their deposited residue and C-alpha attribution. Molecular mesh picks
report a world-space hit and a contributing mesh vertex's source atom; this is
explicitly **mesh-vertex attribution**, not an exact nearest-atom calculation.

Renaming a named neighborhood preserves its seeds/radius/expansion provenance
when the canonical atom set is unchanged. Replacing its atom set clears that
query provenance; a new neighborhood calculation establishes a new query.

Named sets, measurement definitions, labels, molecular meshes and quantitative
analyses are durable document edits. Temporary selection, pick mode and
isolation are session settings. Measurements use authoritative f64 bohr
coordinates, report distances in Å and angles/torsions in degrees, and report
singular geometry as undefined with a reason. Torsions use the half-open
interval [-180, 180). Neighborhoods use atom-center distance, optional complete
residue expansion and no periodic images or chemical interaction inference.
Exact zero-radius lookup is separate from positive-radius squared-distance
search to avoid underflow merging distinct coordinates.

## Separate molecular surfaces

SES/SAS records are separate from quantum isosurfaces. They contain selected
source indices, resolved radii, probe/spacing, engine and precision provenance,
cavity policy, mesh arrays, vertex attribution and output diagnostics. No
invented quantum field or grid axes are required. A selected subset produces
an isolated surface of that subset, not a patch computed in its omitted atomic
environment.

The adapter uses Sesmesh 1.1.2 at pinned commit
`1ab2ebdad62cfa3fc8fee304ca64041d9bf6b5d8`. The vendored copy has three
reviewed portability changes: a WASM-safe clock, a serial progress callback
without a `Sync` requirement, and unnecessary parallel bounds removed from
the serial facade. The [upstream record](../../vendor/sesmesh/UPSTREAM-PATCHES.json)
and dependency source archive preserve original and patched digests, copyright
and selected MIT license. No unsafe JavaScript thread-safety assertion is used.

Inputs convert once from f64 bohr to local f32 Å, after rebasing around a source
atom. Results widen to f64 world bohr for storage; widening does not create
additional surface precision. Bondi/Mantina radii and Alvarez radii are
available with explicit per-element overrides. Missing radii fail visibly;
atoms are not silently omitted and no generic radius is substituted. ProtOr,
van der Waals meshes, hydrogen preparation and surface ambient occlusion are
outside this batch. Cavities are kept. Requests are never silently coarsened,
smoothed or decimated to fit a budget.

Molecular meshes use the existing materials and bundled shaders, including
per-surface targets and clipping. AO continues to apply only to atom/bond
instances. Cached meshes reopen without external inputs or rerunning Sesmesh.

Saved-surface color and opacity edits apply immediately through the shared
validated `molecularSurfaces.set` operation. The GUI keeps one appearance command
in flight and coalesces later patches per surface, retaining the latest input
without regenerating geometry. Inputs remain enabled while appearance commits;
rename/regenerate/remove wait for completion. Invalid numeric drafts never
become zero-opacity writes. Drafts reset on source-atom identity changes,
including reopening a document with the same persistent surface IDs.

User testing exposed SES/van der Waals contact interference missed by the earlier
suite: independent tessellations of the shared boundary cross. Real 1CRN tests
in Chromium/WebKit confirm that conventional polygon offset leaves artifacts,
while an explicit Ball and stick representation clears them. The GUI and guide
explain this choice. No depth-test override, hidden display-radius change or
scientific-mesh alteration is applied; SES over van der Waals remains a known
presentation limitation.

User testing also identified a preferred lighting direction (#87). The scene
now uses six equal camera-relative directional lights and neutral ambient fill;
built-in Blinn and raycast lighting share that arrangement. The
[architecture](../architecture.md) records its geometry, normalization and
material scope. Opposed, oblique and rolled views of a sphere, real 1CRN SES and
a sampled sphere qualify balance and retained shape contrast independently of
the lighting implementation. Existing physical-space color references were
updated with an independent camera-frame irradiance derivation; their field,
intersection, compositing, depth and numerical tolerances remain unchanged.

## Quantitative fields and meaning

A prepared f64 evaluator samples analytic Gaussian orbitals/density matrices
or affine source-grid trilinear interpolation. It does not read GPU pixels or
first generate a 3D preview. Probes, two-dimensional planes and line profiles
retain raw f64 values with validity masks. Outside-grid points are explicitly
outside, with no invented zero or clamped boundary value. Ill-conditioned
coordinate transforms are rejected under the quantitative policy without
changing acceptance of historical native files.

Three identities remain distinct: unchanged legacy numeric source hashes,
sample hashes over source/query/sampler, and interpretation hashes over scalar
meaning/units/provenance. Descriptors live outside legacy scientific inputs.
Editing a declaration can reuse raw samples and never rewrites a quantum mesh
hash. Analytic units follow the existing real Gaussian contracts. Cube scalar
meaning and units remain unknown unless declared by the user; changing a
declaration records `user_declared`, rather than impersonating an importer.
Only explicitly supported unit conversions apply to readouts and exports.

Plane heatmaps use fixed full extents and a common numerical range; invalid
cells form holes. Contours are computed in Rust with a deterministic saddle
decider. Profiles keep distances and exact sample statuses alongside plots.
Scientific labels, monitors and truthful numerical keys are included in normal
and transparent PNGs through the shared final-frame path. Display precision or
conversion overflow is reported separately from numerically valid f64 data.

## Publication, cancellation and bounded output

A scientific-inspection client uses the existing FIFO WASM worker independently
of QC/conversion/backbone clients; contour preparation has its own client. The
shared controller serializes inspection mutations and uses per-request abort
signals, so the implementation does not create the three separate inspection
clients originally proposed in M0. Read-only requests retain their own signals;
source replacement cancels the inspection owner's now-stale work. This keeps
the same single-active-mutation and unrelated-owner recovery contracts.
The quantitative panel requests metadata only when first opened, keeping its
body mounted afterward. A collapsed, unused panel must not register quantum
inputs during ordinary loading or change the first-preview worker contract.
Optional viewport inspection arrays use stable module defaults so embedded
viewers do not enter a redraw loop when those props are omitted.
Progress comes from actual callbacks/counts. Active cancellation terminates the owning
worker when synchronous WASM cannot service messages. Recoverable geometry or
metadata errors preserve unrelated resident quantum inputs; fatal errors reset
the worker, leaving accepted documents intact.

Before publication, the complete candidate passes the native writer's exact
semantic, manifest, entry and inflated-byte preflight. Measurements needed for
the GUI are prepared before publication too. Source/revision checks then guard
the atomic accepted-state change. An explicit publication acknowledgement is
the cancellation boundary: a later Cancel reports the completed operation,
rather than claiming that an already accepted mesh was discarded.

Existing 256³ transient/128³ retained-grid, 2-million-vertex, 128 MiB inflated
native and 8 MiB manifest limits remain unchanged. New independent bounds are
64 named sets/1 million references, 256 measurements, 256 labels/64 KiB text,
32 molecular meshes with 256 MiB engine estimates and 4 million triangles per
mesh, 128 probes, eight planes up to 512², 16 profiles up to 4096 points,
16 MiB aggregate quantitative caches, and 1 million aggregate contour segments.
Label textures have a separate 16 MiB rendering budget, checked with the actual
CPU layout before publishing annotation edits. Runtime allocation
traps cannot all be caught as ordinary Rust errors; worker recovery is required.

Native CSV writes are scoped UTF-8 `.csv` outputs up to 32 MiB, with the same
root, source-protection and no-clobber rules as existing exports. Numeric f64
values retain round-trip precision; text is CSV-escaped and formula-prefixed
text is neutralized without changing negative numbers. Browser CSV is paged
on Unicode-safe UTF-16 boundaries. Numerical and diagnostic readback is bounded;
surface summaries include short warning previews and a separate endpoint pages
the complete warnings.

Optional annotations, molecular-surface and field-analysis native capabilities
are emitted in canonical order only when their payloads exist. Typed arrays
avoid expanding bulk data into manifest JSON. Unknown, duplicate, reordered or
inconsistent capability/payload combinations are rejected. Historical fixtures
and metadata-free encoding retain their existing contracts.
