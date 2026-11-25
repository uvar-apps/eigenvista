# As-built architecture

**Version 0.10.5:** workloads use [allocation-driven memory handling](allocation-policy.md), with no application memory budgets. Historical release records retain the limits that applied to their original binaries.


This describes the **0.10.5 application preview**, including the shared
application-control API and packaged external-agent connector,
background controls, transparent PNG export (#73/#74), optional atom palettes,
biological structure views, molecular ambient occlusion and sidebar reordering,
not the complete
[proposed architecture](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/03-architecture-decision.md).
Read [status](status.md) for dated verification and uncompleted release gates.

Version 0.10.5 includes the **scientific-inspection implementation** introduced in 0.10.0
([Plan 009](../plans/009-scientific-inspection-implementation.md), #83–#86).
Its selections/measurements/labels, SES/SAS meshes and quantitative field
analyses are described below and are included in the 0.10.5 Mac package. Older 0.8.0
binaries predate them. Read the living handoff for source, artifact identity
and actual qualification boundaries.
The [scientific-inspection decision](design/2026-11-16-scientific-inspection.md)
records source identity, transport, scientific conventions and qualification boundaries.

EigenVista is a modern rewrite of Molekel, the molecular visualization
application developed by Ugo Varetto between 2006 and 2010. The original
[Molekel repository](https://github.com/ugovaretto/molekel) and
[Molekel website](https://ugovaretto.github.io/molekel/) document that application;
the architecture below describes its new Rust/TypeScript implementation.

The current application is EigenVista in the standalone
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) repository.
Application source lives at the repository root without a `next/` wrapper or
legacy application code. Rust
packages/crate directories use `eigenvista-*`, the npm package is `eigenvista`,
and generated browser bindings use `eigenvista_wasm`. The macOS bundle is
`EigenVista.app`, with application identifier `org.uvar-apps.eigenvista`.
The name change preserves the existing icon/logo and scientific model.

Version 0.7.1 only renames the visible **Document** section to **Molecular data**.
The internal panel/profile IDs and mounted control state stay unchanged, as do
Rust `Document`, document serialization and Open/Save behavior. See
[current status](status.md#source-version-071) for verified release identities,
local results and remaining gaps; the prior published 0.7.0 artifacts remain unchanged.

## Boundaries and ownership

```text
Browser                          macOS application
file input / downloads           Tauri 2 / system WebView / native dialogs
         \                       /
          React document UI (App.tsx)
           |                   |
           |                   +--> Three.js / WebGL2 (Viewport.tsx, volume.ts)
           v
     owned clients + FIFO + one Web Worker (science.ts, science.worker.ts)
           |
     wasm-bindgen document/byte/typed-array bridge (eigenvista-wasm)
           |
           +--> eigenvista-import: format detection, Molden, reports, provenance
           |      +--> eigenvista-core: model, structure/grid imports, scientific operations
           +--> eigenvista-format: validated .eigenvista ZIP encode/decode

Command line (no GUI/WebView):
eigenvista-convert --> same eigenvista-import --> eigenvista-format --> atomic file save

Desktop save only:
encoded bytes --> Tauri save_native --> format validation --> atomic file save
```

Both frontends currently perform scientific jobs in the **same Rust/WASM Web
Worker**. The desktop does not yet use native threaded evaluation. The Rust
core also builds natively for tests, reference generation, and the format used
by native saving. There is no calculation server, remote service, or database.

| Component | Responsibility and entry points |
| --- | --- |
| [Core model](../crates/eigenvista-core/src/model.rs) | `Document`, validation, explicit scientific units, affine grid geometry, checked allocation |
| [Computation](../crates/eigenvista-core/src/compute.rs) | AO/field values and gradients, sampling/resampling, source hashes, classic marching cubes |
| [Imports](../crates/eigenvista-core/src/import.rs), [PDB importer](../crates/eigenvista-core/src/import/pdb.rs) and [mmCIF importer](../crates/eigenvista-core/src/import/cif.rs) | Supported text profiles and recorded conversion losses |
| [Import library](../crates/eigenvista-import/src/lib.rs) and [BinaryCIF transport](../crates/eigenvista-import/src/bcif/mod.rs) | Shared byte detection/dispatch, checked binary decoding, Molden conventions, import reports, source-byte digest |
| [Converter CLI](../crates/eigenvista-convert/src/main.rs) | Fallible file reads, batch/JSON/check mode, destination preflight and no-clobber saves |
| [Connectivity](../crates/eigenvista-core/src/bonds.rs) | Exact k-d-tree neighbors, explicit-plus-inferred display bonds |
| [Native format](../crates/eigenvista-format/src/lib.rs) and [filesystem adapter](../crates/eigenvista-format/src/native.rs) | Portable container, checksums/validation, atomic native writes |
| [WASM bridge](../crates/eigenvista-wasm/src/lib.rs) | Document import/validation/encoding, immutable registered document with one sampled-field cache, typed display buffers, compatibility JSON sampling/meshing and point/gradient probes |
| [Document UI](../app/src/App.tsx) and [types](../app/src/types.ts) | One document/controller owner, controls, dirty state, generation replacement, error recovery |
| [Workspace pane](../app/src/WorkspacePane.tsx), [preferences](../app/src/useWorkspacePane.ts) and [widget stack](../app/src/PanelSidebar.tsx) | Default left/right resizable pane, four task tabs, stable mounted tools, bounded presentation preferences, reusable drag/keyboard/menu ordering |
| [Orbital browser](../app/src/OrbitalBrowser.tsx) | Full orbital metadata table, filtering, transient checkbox selection, multi-orbital generation settings |
| [Worker client](../app/src/science.ts), [registration identity](../app/src/scienceRegistration.ts), and [worker](../app/src/science.worker.ts) | Owned FIFO requests, per-request abort, worker lifecycle, owned resident registration/cache |
| [Viewport](../app/src/Viewport.tsx) and [sampled renderer](../app/src/volume.ts) | Scene/materials, OrbitControls, picking, PNG download, sampled raycast/volume shaders |
| [Preview brick ranges](../app/src/volumeRanges.ts) | Conservative min/max bounds over sampled f32 values for renderer-only empty-space skipping |
| [Element display table](../app/src/elements.ts) | Symbol and van der Waals display radius for elements 1-118. Presentation data only; [element_display.rs](../crates/eigenvista-core/tests/element_display.rs) re-derives every radius from the `pdbtbx` source tables so the table cannot drift. Carries no colour — that lives in `atom-colors.json` |
| [Atom colour palette](../app/src/atom-colors.json) and [loader](../app/src/atomColors.ts) | Single source of truth for the default per-element colour. `parseAtomColors` validates a loaded file and rejects it whole; `resolveAtomColor` resolves session override → bundled default → `#b294b9` sentinel. Session-only, never persisted to `.eigenvista`. See the [design record](design/2026-10-12-atom-colors-from-file.md) |
| [File adapter](../app/src/files.ts) | Browser file/download versus native dialog/read/save |
| [Desktop entry point](../app/src-tauri/src/main.rs) | Tauri plugins and `save_native`/version commands |
| [Shader parameter export](../app/src-tauri/src/shader_parameters.rs) | Complete `.params` text, sibling-file write/sync/replacement, separate from molecular-document validation |
| [Runner](../tools/run.mjs) and [packager](../tools/package-macos.mjs) | Repeatable builds/tests and verified tester artifacts |

The Rust workspace's six default members are core, format, import, converter,
control and WASM. The desktop shell is a workspace member but requires an explicit
workspace check or Tauri build. `cargo test` alone is not a desktop check.

<a id="scientific-inspection-ownership-unreleased"></a>

## Scientific inspection ownership

All GUI inspection controls use the same discovered application operations as
the external connector. [Inspection schemas](../app/src/inspectionSchemas.ts)
declare strict validated parameters; [the inspection hook](../app/src/useScientificInspection.ts)
owns accepted selection/pick order, worker requests and publication. Its
operations are dispatched through the existing controller/helper, not a second
document, scripting runtime or GUI-driving automation layer.

Version 0.10.2 adds committed-input plane auto-update. The React
editor retains numeric drafts until a native step or Enter commit, coalesces
rapid commits and owns receipt-specific cancellation through an AbortSignal.
An additive `supersede:true` on `analysis.create` serializes replacement of only
the same replaceable plane/source job. Obsolete queued definitions do not sample;
unpublished obsolete work cannot commit. Manual/unrelated jobs stay protected,
and explicit revision preconditions are rechecked after waiting. The viewport
keeps its last complete scene until replacement contours are prepared; contour
failure retains that scene and makes synchronized export report the failure.
Accepted numerical samples remain inspectable. Appearance-only changes reuse
samples. No scientific evaluator, format, requested resolution or allocation
policy changes. These controls are included in 0.10.5.

| Component | Ownership |
| --- | --- |
| [Rust geometry inspection](../crates/eigenvista-core/src/inspection.rs) | Document-local atom references, annotation validation, f64 distance/angle/torsion, exact zero-radius coincidence and nearest-seed k-d-tree neighborhoods |
| [Rust molecular surfaces](../crates/eigenvista-core/src/molecular_surface.rs) | Selected accepted atoms, explicit radii/Å parameters, Sesmesh adapter, rebased mesh precision, independent provenance/hash and mesh validation |
| [Rust field analysis](../crates/eigenvista-core/src/field_analysis.rs) | Quantity/unit declarations, prepared f64 evaluation, affine-grid interpolation, planes/profiles, contours, caches/fingerprints and CSV |
| [WASM inspection bridge](../crates/eigenvista-wasm/src/inspection.rs) | Validated operations, typed mesh/quantitative buffers and paginated samples |
| [Annotation rendering](../app/src/annotationRendering.ts) | Sparse scene sprites/monitors and selection markers; no scientific geometry calculation |
| [Field depiction](../app/src/fieldAnalysisRendering.ts) | Slice/probe/profile depiction, numeric keys, GPU precision warnings and contour geometry |
| [Geometry controls](../app/src/InspectionControls.tsx), [shape controls](../app/src/MolecularSurfaceControls.tsx), [field controls](../app/src/FieldAnalysisControls.tsx) | Forms/readouts sharing the controller; no duplicate TS scientific evaluator |

Original zero-based atom indices remain stable through filtering and instancing;
GUI numbering is one based. Active source generation/identity and request guards
reject stale picks/jobs after atom/structure replacement. Canonical selection
sets are distinct from ordered measurement/plane/profile atom sequences.
Typed `lastPick` readback distinguishes atoms, bonds, residues and quantum/
molecular surfaces, retaining original identity and explicit mesh-vertex or
backbone-Cα attribution. A changed/removed source mesh invalidates its old pick.
Version 0.10.2 (#96) renders selected atoms as gold target markers and inspected
atoms as cyan rings, using batched foreground points with owned textures.
Markers retain source identities but respect visibility filters; they identify
positions rather than physical silhouettes. An ordinary inspection updates only
the annotation group, preserving molecular geometry, palettes, shaders and AO.
Selection and ordered-pick props are guarded by source identity before passive
reset effects run, preventing a stale cue on the first replacement-source frame.
Clearing selection also clears the transient inspection cue. PNGs use the same
scene markers as the interactive view.
Source geometry-only requests omit basis/density/grids and do not replace QC
registration. Quantitative requests reuse prepared immutable numeric inputs and
transfer f64 caches separately from f32 preview values. Active cancellation
terminates blocked synchronous WASM; unrelated queued clients retain ownership.

Molecular surfaces use the vendored Sesmesh 1.1.2 source with the documented
worker-clock and serial-callback portability changes. Default features are
disabled. The adapter converts bohr to Å, rebases around a source atom before
f32 local meshing, and restores world bohr in f64. It records this precision;
widening vertices does not make the engine f64. Selected-source meshes are
isolated-subset surfaces. Radii, probe, spacing, cavities, engine and source
atoms determine an independent molecular hash; no fake quantum grid is created.
No automatic coarsening, smoothing or decimation is enabled.

Field descriptors live outside legacy `Grid`/orbital/density records so their
interpretation does not change `compute::source_hash`. Sampling and interpretation
have separate fingerprints. Analytic values use prepared Gaussian input; grid
values use source f64 trilinear interpolation in the complete affine basis,
including reflected/skewed axes and closed endpoints. Outside status is explicit.
Finite numeric data may remain inspectable/exportable even when f32 world/value
limits prevent a particular depiction; summaries expose that rendering warning.

Publication validates a whole candidate with exact native preflight before
replacing accepted state. Failed/cancelled jobs retain prior meshes/results.
Annotation edits preflight actual CPU text layout before publication and dispose
temporary resources. Layout/allocation failures retain accepted annotations.
Durable optional `annotations`, `molecular_surfaces` and `field_analysis` payloads
have explicit required capabilities; the typed writer packs bulk numeric arrays.
Annotation, style and interpretation changes leave old quantum hashes intact.
Cached mesh/analysis data reload directly; no silent recalculation is performed.

Scene sprites/measurement lines participate in the shared final-frame PNG path;
field keys are explicitly composited from the matching overlay. They do not
become atom/bond AO targets. Molecular surfaces reuse existing surface materials,
shaders and export while remaining independent of the active quantum-field mode.
The connector's CSV writer shares scoped atomic/no-clobber publication protections;
it is not a general arbitrary-text writer.

## External application control (introduced in 0.8.0)

`app/src/control.ts` owns versioned method schemas, validation, complete metadata,
revision guards and calculation jobs. Its host in `App.tsx` invokes the existing
import, sampling, mesh, save and presentation flows. Scientific work remains in
the existing owned WASM worker; the API does not create a second document or
calculation engine. `Viewport.tsx` exposes an optional typed camera/background/
capture port. API and toolbar PNG exports share the final-frame capture path.

The #80 extension exposes palette load/reset and biological presentation through
the same controller (28 methods in the published 0.8.0 API v1 catalog). The
0.10.0 inspection extension remains additive in API v1; discover live
schemas rather than inferring a method count from the version. Palette loading uses the GUI's
`parseAtomColors` parser and commits only a fully valid palette; native reads grow their buffers fallibly. Palette and biological colors,
visibility, residue subsets and representation overrides stay session-only.
`control/presentation.ts` validates a whole biological patch before state changes,
uses the existing source-index visibility/range helpers and mirrors GUI isolate/
range transitions. Focus uses currently visible atoms. Summary replies expose
complete selectors and counts instead of per-atom arrays. Global representation
retains its existing persisted-document/dirty semantics. Automatic AO radius can
be restored after a manual radius, with the same transitions as the checkbox.
These presentation changes do not invoke quantum evaluation or replace source
scientific arrays. Human instructions describe desired views; agents translate
them using the separate technical reference and workflow skill.

The native `eigenvista-control` crate supplies an opt-in authenticated loopback
NDJSON JSON-RPC broker, scoped filesystem adapter, client library and
`eigenvista-ctl` binary. The Tauri bridge correlates requests with the frontend
controller; the broker does not interpret scientific commands. File grants use
Unix directory descriptors and no-follow traversal, protect imported sources,
validate encoded documents/PNGs and default to atomic no-clobber publication.
Version 0.10.3 accepts explicit `overwrite:true` for atomic replacement
through the same descriptor-pinned writer. That permission includes late-created
targets; protected inputs and scoped traversal remain unchanged. Default
exclusive publication is unavailable on the qualified Mac ExFAT volume, whereas
explicit replacement works. Browser exports have no replacement mode.
Native Save sends the encoded archive through Tauri as raw binary, avoiding
conversion into millions of JSON numbers. A checked `EVT1` frame carries a
little-endian u64 metadata length, UTF-8 JSON metadata and the unchanged archive
bytes. The [native transfer adapter](../app/src/nativeTransfer.ts) and
[native decoder](../app/src-tauri/src/native_transfer.rs) share this internal
transport; it does not change the native document format or public controller
result shapes. Allocation/serialization failures preserve the accepted document
and clear save activity through the existing error paths.
The standard Tauri window configuration disables background throttling. Current
Wry applies public WebKit inactive scheduling policy on macOS 14+, keeping
scientific and encoding workers runnable when the window is inactive. This
setting does not prevent OS sleep/termination and is ignored on older macOS
and unsupported platforms; it does not change deployment requirements.
Unsupported native platforms reject explicit control activation; their normal
startup is independent of it. Only local macOS is currently qualified.

Browser attachment is separately opt-in through `?control=1`. Normal startup has
no browser global API or native listener. Model integration belongs to the
external harness. There is no embedded console, scripting runtime or MCP server.
See the [API reference](application-control.md), [decision](design/2026-11-16-application-control-api.md)
and [current verification record](handoff.md#shared-application-control-api-16-november-2026).

## Scientific contract

`Document` owns one geometry, bonds, explicit basis functions, real orbitals,
real density matrices, authoritative sampled grids, saved surfaces, view
settings, and provenance strings. Scientific objects and surfaces have IDs;
the model validates uniqueness and relationships. TypeScript mirrors this
model manually, so shared changes require updates and roundtrip tests on both
sides. Neither the JSON bridge nor TypeScript types replace Rust validation.

- Positions, basis centers, grids, mesh positions, and the current scene are
  in **bohr**. Picked atom positions are displayed in angstroms. Energies, when
  supplied, are hartree; missing energies/occupations remain optional.
- A basis function is a sum of Cartesian polynomial terms multiplied by a
  contraction of Gaussian primitives about its explicit center. Radial
  coefficients already contain normalization. No hidden normalization, shell
  ordering, or spherical convention is applied by the evaluator.
- Polynomial degrees through G are supported. Orbitals are real linear AO
  combinations; density values contract the supplied full row-major matrix
  with AO values, including nonsymmetric transition matrices. Analytic gradients
  use the same explicit representation. Complex/spinor profiles are absent.
- A grid position is `origin + i*axes[0] + j*axes[1] + k*axes[2]`. Axes are
  step vectors, not total extents. Storage is x-fastest:
  `(k * ny + j) * nx + i`. Skewed and reflected nonsingular grids are valid.
- Scientific values and native arrays are f64. The current mesher interpolates
  using f32; its results live in f64 containers with the limitation recorded.
  Three.js geometry and GPU textures use f32. Do not infer f64 rendering precision.

[Independent PySCF fixtures](../fixtures/pyscf/README.md) establish the tested
normalization/convention subset. The application does not solve SCF, reconstruct
missing wavefunctions, or infer a density matrix from a PDB file.

## Import and open flow

The file adapter obtains bytes. The shared `eigenvista-import::import_bytes`
returns a validated document and structured format/warning/`requires_save` report.
Native ZIPs go through checked decoding. BinaryCIF map/gzip signatures are handled
before UTF-8 text decoding, independently of filename; gzip is restricted to that
transport. The Molden header takes precedence over a text filename. Other
supported extensions use existing Rust importers. Successful loading
replaces the document and resets the camera/render mode. If the selected field
is an authoritative grid, Open prepares its owned display sample immediately;
without saved meshes the initial mode is volume. A sampling failure still opens
the validated document in mesh mode with an error, so its full data can be saved.
An import failure leaves the previous document available and shows an error.
Opening another document cancels the scene client's pending worker jobs.
Generation tokens and a live unsaved-edit check protect the entire
read/import/sample sequence.
External imports start dirty. Native imports supplement missing display bonds
while preserving explicit bonds and their order, scientific inputs, and saved
meshes. Additions produce a warning and `requires_save: true`; otherwise the
decoded document is unchanged and starts clean. Raw format decoding remains
exact and does not infer bonds. Original
Molden sections are not embedded wholesale: preserve inputs and read the report.

Both EigenVista native files and the previous matched Molekel preview profile
produce `ImportReport.format: "eigenvista"`. The decoder preserves their
scientific arrays, source hashes, and cached meshes; the `[0, 1]` data shape
is unchanged. New encodes use `format: eigenvista` and the
`eigenvista-preview-polynomial-v1` required feature. Compatibility accepts the
previous `molekel`/`molekel-preview-polynomial-v1` pair, not arbitrary mixed
identifiers. See [the native profile](preview-format.md) for the exact contract.

Molden shells become explicit normalized polynomial contractions. Spin blocks,
occupations, and energies are retained; complete listed occupations generate
explicitly labeled occupation-derived matrices. This is not a recovered correlated
density. Producer and spherical/Cartesian conventions are checked at the import
boundary, not hidden in the evaluator. See [the exact profile](molden-import.md)
and [independent producer fixtures](../fixtures/molden/README.md).

The [Convert Files dialog](../app/src/ConvertFiles.tsx) uses the same worker and
library, serializing imports and retaining encoded outputs separately
from the open document. It requires explicit per-result Save, supports cancellation,
and does not replace the scene. Scene and conversion pipelines have separate
request owners; cancellation of one cannot reject the other's queued work.
The existing modal and busy controls remain in place, so this is not a new
concurrent UI workflow. Its outputs are transient until saved.
The UI links the Rust library through WASM; it does not spawn the CLI or invoke
vendor programs. The CLI is a separate headless frontend for scripts/batches.

All supported imports compute display bonds from positions, including cube and
native documents. XYZ/PDB convert angstrom positions to bohr. PDB uses `pdbtbx`
plus checked compatibility preflight and explicit
connection handling. `kiddo` supplies exact immutable k-d trees partitioned by
0.5-angstrom covalent-radius buckets. Each query uses that bucket's observed
maximum radius, then the unchanged pair cutoff and deterministic coordination
filtering supplement explicit bonds. The partition tightens conservative queries
around heterogeneous radii without lowering chemistry or work/allocation bounds.
See [structure imports](structure-imports.md) for the scientific tradeoffs,
selection policy, loss notices, and exhaustive-neighbor comparisons.

The mmCIF tokenizer retains `_atom_site` source identity through first-model and
occupancy/alternate selection. Non-polymer null label sequences fall back to
author residue/insertion grouping. The
[connection resolver](../crates/eigenvista-core/src/import/cif/connections.rs)
matches supplied label/author/alternate/insertion references against those selected
rows. `covale`, `disulf`, and `metalc` pairs seed explicit untyped edges before
perception fills gaps; other types or three-partner declarations are recorded
without forcing rods. Perception can independently add the same pair.

One JSON provenance record per declaration retains raw columns,
type/order, selected source row IDs/atom indices, edge, and status/reason. This
preserves import provenance through existing native encoding without a schema or
typed-renderer change. Matching valid image codes, or both omitted/inapplicable
images, map to selected-site pairs; unknown/different/mixed images are reported
without symmetry expansion. The lexer rejects unsupported layouts rather
than silently dropping columns; it is not a general CIF dictionary validator.
See the [design record](design/2026-11-06-bond-search-and-cif-connections.md) for
limits, common-image reasoning, and declared/perceived precedence.

BinaryCIF transport lives in the import library, separately from scientific
selection. Its borrowing MessagePack tree and checked inverse column pipelines
expand only `atom_site`, `struct_conn`, supported biological metadata and supported cell/symmetry categories
into canonical CIF text. That text enters the same core tokenizer and
connection resolver described above. Unused category columns are not expanded,
and no Molstar or external MessagePack/CIF runtime is required. `flate2` uses
its pure Rust backend for checked gzip expansion. Source hashes always identify
the received raw/compressed bytes, not the canonical intermediate text.
The single-block 0.3.x profile uses fallible expansion and actual-payload length
validation and iterative parser/encoding traversal without nesting ceilings; see the exact
[BinaryCIF limits](structure-imports.md#binarycif-profile) and
[independent twins](../fixtures/bcif/README.md).

Cube imports preserve the authoritative affine scalar grid, converting source
z-fastest ordering into model x-fastest ordering. Single-field density cubes and
negative-atom-count cubes containing exactly one dataset are supported in the
standard bohr profile. A dataset identifier is metadata, not reconstructed
orbital coefficients. For low-amplitude fields the initial display isovalue is
adjusted below the original peak; samples are not normalized or changed.
Display sampling may downsample the grid but does not mutate the original array.
Values that overflow f32 fail preview preparation, not import or persistence.
See [cube import](cube-import.md) for the exact limits. Unsupported profiles
fail explicitly. Other new formats are deferred; a direct ORCA/GBW reader is
not part of this increment. Qualified ORCA Molden exports use the shared library.

## Biological structure views

Issues #62–#66 implement the selected first four items in the
[visualization roadmap](../plans/007-molecular-visualization-roadmap.md).
Version 0.7.0 includes this work, merged through
[PR #67](https://github.com/uvar-apps/eigenvista/pull/67). The older published
0.6.0 binary predates it. This section records the source contract; verified
release artifacts, local results and remaining gaps belong in status/handoff.

[Structure metadata](../crates/eigenvista-core/src/structure.rs) is optional
authoritative document data. It retains selected chain label/author/entity
identity, residue names/numbers/insertion/segment/kind/secondary assignment and
atom-name/residue-index arrays aligned with unchanged atom indices. Atom columns
remain element/position only. Rust validates counts, indices, strings and source
classification; TypeScript does not infer biological chemistry. PDB TER segments
and label/author namespaces remain distinct. Unavailable identity is not invented.
Deposited secondary ranges are retained with provenance; there is no DSSP fallback.

PDB, text mmCIF and BinaryCIF feed this same metadata contract. BinaryCIF now also
expands supported entity/polymer/asym/chemical-component/secondary categories before
the shared CIF reader. The optional metadata is included in worker registration
identity and native validation, but excluded from existing quantum-field hashes.
Native documents containing it declare `eigenvista-biological-structure-v1` in
addition to the existing scientific profile. Older documents without it remain
valid and retain their previous encoding profile.

[Structure controls](../app/src/StructureControls.tsx) and
[display settings](../app/src/molecularDisplay.ts) own only session presentation:
deterministic colors, visibility, isolation, named residue ranges, focus and style
overrides. Chain style precedes component style, then global representation;
nonprotein components retain atomic detail. These changes never mutate scientific
arrays, mark the document dirty or request field calculations. Replacement resets
index-bound settings; coloring survives only when the new document has metadata.

[Protein topology](../crates/eigenvista-core/src/protein.rs) owns biological
ordering, continuity breaks and deposited secondary assignments in Rust, separate
from heuristic display bonds. The [backbone hook](../app/src/useProteinBackbone.ts)
requests derived backbone data lazily for visible protein depictions, with request
ownership and cancellation on replacement/unmount. The viewport builds owned
display meshes and preserves source atom/residue picking. These meshes do not
replace imported coordinates, change a field's source hash or become quantum
surfaces. Colors, subset masks and atomic style changes need no backbone job.
Missing carbonyl orientation uses an explicitly reported thin-tube fallback;
single-point segments use original-CA markers. New depiction meshes/lines keep
their own diffuse materials and are excluded from the existing atomic SSAO
receiver set.

Backbone preparation sends only atoms/identity in a minimal validated document;
it does not replace the worker's resident quantum registration. Nonfatal
depiction errors preserve that registration. Geometry interpolation/extrusion
runs in the viewport on the main thread with fallible typed-array allocation.
All requested source points and the standard curve subdivisions are retained; allocation/precision failures
report atomic-detail fallback without replacing field data. Mesh/line buffers
and materials are batch owned and disposed on replacement/unmount.

Chain presentation is cached against the complete immutable metadata source.
Ordinary PDB/CIF identifiers keep their canonical labels/colors. Distinct label
and author identities whose displayed names collide receive explicit namespace,
entity and chain-record descriptions and stable distinct colors. Legend,
controls and picking share those names; filtering does not change them. React
keys remain independent of visible labels. This never modifies source metadata.

Microheterogeneous monomer names can share a sequence position under the
existing CIF selection policy. All selected atoms and both residue identities
remain in the document. Rust treats that position as an explicit backbone
barrier and omits every ambiguous anchor, including unknown-kind variants;
partial labels and insertion codes must not permit a connection across it.
Atomic picking keeps its original element/index/coordinate item; biological
context is rendered separately within the unchanged status bar/canvas bounds.

## Generation, cache, and rendering

1. The UI requests `sample` or `generate` for the selected field and resolution,
   with an isovalue for generation. The bridge compares immutable source
   references against its one current worker registration. New inputs include
   the document without saved meshes; a hit sends only registration identity,
   field, resolution, isovalue, and current appearance.
2. New registration parses and validates the document in Rust. Its
   `RegisteredDocument` owns immutable inputs and one f64 sampled field, keyed
   by field/resolution. Appearance and isovalue changes reuse those samples;
   meshing validates small current color/opacity/isovalue arguments without
   cloning, reparsing, or hashing full scientific JSON on a hit. A fresh sample
   still receives its scientific source hash from Rust.
3. Rust evaluates an analytic field on a bounded domain or resamples an imported
   grid. Analytic domain sizing currently uses the most diffuse Gaussian
   exponent; it is a preview heuristic, not a proven surface-containment bound.
4. A `sample` request returns grid metadata and a full-resolution
   `Float32Array` of display values. Its buffer is transferred to the UI,
   avoiding a large sampled-array JSON roundtrip and structured-clone copy.
   Open, selecting a stored grid, or changing its display resolution uses this
   path without creating surfaces. For `generate`, `mcubes` extracts positive
   and negative isosurfaces from the retained f64 grid. Empty meshes are omitted.
   Affine mesh positions/normals are converted to model coordinates. The display
   renderer uses the transferred array directly rather than making another
   CPU-side f32 copy; GPU texture upload and storage are still required.
5. The UI stages the generated meshes, preflights native encoding of the combined
   document through Rust, then replaces surfaces of the selected field, retains other fields'
   surfaces, stores the transient grid separately, and marks the document dirty.

Analytic grid sampling computes scalar AO values only, resolving the field once
and reusing an AO buffer. The separate value-and-gradient reference evaluator
is unchanged. Real density sampling folds each off-diagonal pair into
`Pij + Pji`, retaining diagonal terms and both halves of nonsymmetric matrices;
it does not reconstruct arbitrary matrices from orbital occupations or discard
small coefficients. If a folded coefficient overflows, sampling uses the
original full matrix. Extreme intermediate products use an alternate
multiplication order rather than overflowing an otherwise representable value.
There is no estimated CPU-work cutoff for analytic sampling. The previous
150-million-work-unit rejection has been removed, not increased or bypassed
for selected files. The current source accepts safe integer resolutions of at least two. UI presets
remain 24 through 256; custom values apply on Enter or leaving the input, so
typing does not start intermediate calculations. Stored and transient grids use
the same allocation-driven policy. The WASM boundary checks actual u32
representability before narrowing numeric arguments or typed arrays. It never
wraps a large requested dimension into a smaller one.

Meshing preflights the actual
per-cell triangle counts instead of assuming the maximum output for every cell.
The case counts are obtained from public binary-case probes of the pinned
`mcubes` implementation and applied using that implementation's case convention.
This permits sparse surfaces on larger grids without replacing the mesher,
loosening the output bound, or claiming topology-certified extraction.

Large Rust-owned buffers use fallible reservation so recoverable allocation
failures can be reported. This is not universal OOM recovery: `mcubes`, JSON,
browser, GPU, and operating-system allocations are outside that guarantee.
A 256 cubed grid has 16,777,216 samples, requiring 128 MiB for its f64 values
and 64 MiB for the display f32 values alone. Meshes, temporary copies, WASM
memory, and GPU textures add to that footprint. No maximum RSS or latency is
claimed from these arithmetic sizes.
Freeing a sampled field makes its storage reusable, but WASM linear memory
does not shrink to its previous size. Worker termination releases that worker's
memory; a successful large calculation may retain its memory high-water size.

The orbital browser lists `document.orbitals` in original document order,
using one-based row numbers and imported label/spin/occupation/energy metadata.
Missing numerical metadata displays as `--`; unknown spin is labeled Unknown.
Search matches number, ID, label, or spin. Filtered select-all affects only
listed rows; hidden selections remain selected. Saved counts derive from
surface field IDs, including hidden meshes. The browser owns checkbox selection
and draft isovalue/resolution locally, with the active orbital initially checked.
Closing without generating does not change the document.

Multi-orbital generation uses `generate` serially for all selected distinct
orbital IDs in document order, stages complete results and commits only after
`validate_document` checks the complete candidate. No byte/count allowance limits
the batch, retained geometry or native file. Actual allocations, source identity,
manifest/array relationships and checked lengths determine whether it succeeds.
Its [typed writer](../crates/eigenvista-format/src/typed.rs) emits binary arrays
directly from the Rust model and builds metadata/reference JSON, without a
per-number JSON tree or flattened numeric clones. Preflight hashes these entries
without creating or compressing a ZIP. Save still compresses the same prepared
entries. The older
WASM `validate` API remains model-only and is not the publication guard. Preflight still scales with retained data and allocates temporary arrays; actual
allocation errors are reported rather than guessed from a fixed budget. Cancellation or
a recoverable batch error leaves previous surfaces untouched. A successful batch replaces
only selected fields' meshes, keeps unrelated saved meshes, and enters mesh mode.
The active field stays unchanged if its orbital was selected, otherwise it
becomes the first selected orbital. Only that field's display grid is retained
in the UI for sampled rendering; the f64 grid remains in the worker's
single-entry Rust/WASM cache rather than a JavaScript number array.

Request IDs resolve worker promises and associate progress events with the
request that emitted them. Stage events keep the string `progress` field, with
optional integer `completed`/`total` counts validated by the client. Rust
`sample_with_progress` reports zero and each finished z slice; imported-grid
copies report start/end and resampling reports its actual output slice count.
The original `sample` entry point remains a no-observer wrapper. The resident
owner's preparation/meshing methods and compatibility `SampledField.with_progress`
and `surfaces_with_progress` APIs use optional JavaScript callbacks; old
constructors/methods retain their stale-source checks. Callback errors
return errors without publishing a partial result. `js-sys` 0.3.85 is now a
direct dependency at its already-locked version; no registry package was upgraded.

Worker notifications are throttled to one per 100 ms, except phase start/end.
Mesh counts are completed positive/negative extraction passes, including empty
surfaces; the pinned mesher itself has no internal progress callback. The panel
beside Cancel shows per-phase progress, current field/batch index, and elapsed
time. Its timer updates only that component. Preparation, display transfer, and
container validation are indeterminate, and cached sampling is skipped. This
is measured work, not an ETA or an overall-job percentage. Fast phases may not
paint before the next phase. No additional field arrays or meshes are allocated
for progress. Stale progress is ignored through request and generation-token
checks, just like stale completion.
Progress UI state is cleared on success, cancellation, and failure; it is not
persisted in native documents.

Version 0.10.2 (#97) also presents molecular SES/SAS progress in the surface
controls and a compact viewport activity card, including hidden Tools and Zen
mode. `useScientificInspection` retains the operation, label and monotonic
start time across phase changes and clears old counts when a phase has none.
The existing Sesmesh `geometry`/`classify`/`mesh`/`assemble`/`measure` callbacks
remain unchanged: only `mesh` reports incremental block completion. Other
phases display indeterminate activity and elapsed time. The worker reports
`transferring` after generation returns; the publication path reports
`validating` before its actual container preflight. Shared job progress retains
its existing stage/count contract; `app.state` additionally exposes active
`elapsedSeconds`. The progress components own their timers, so elapsed ticks
do not rebuild the viewport or run scientific work. Cancellation, source guards,
prior accepted results, scientific hashes and saved formats are unchanged.
Version 0.10.5 includes this presentation and elapsed readback.

App and Convert Files each create a stable scientific client. The bridge keeps
one FIFO queue and posts only one request at a time. A client's `cancel()` removes
only its jobs; the fourth request argument accepts `{ signal }` for a single
request's AbortSignal. Removing a queued job leaves active work alone. Cancelling
an active job terminates synchronous WASM and clears the worker/cache, then starts
unaffected queued jobs on a replacement. It does not cooperatively interrupt a
Rust loop or provide resumable checkpoints. Runtime/transport failure uses a
separate fatal teardown that rejects all owners. Constructor/posting failures
settle the affected request; stale worker-instance messages cannot settle later
jobs. The module's original request/cancel exports share a default compatibility
owner. UI generation tokens still protect asynchronous pipelines outside the
worker, and previous completed geometry remains intact.

Registration observes id/title values and the references of atoms, bonds, basis,
orbitals, densities, grids, and provenance. Scientific inputs and nested entries
are immutable snapshots: future edits must replace the affected top-level
arrays/objects. Reference identity cannot detect in-place mutation. View settings
and saved meshes do not alter registration identity. Registration is committed
only after successful worker completion and reset on errors or worker replacement;
only the current registration is retained. Rust drops the old sampled allocation
before sampling a replacement. Internal IDs identify worker-owned snapshots, not
scientific content; persisted source hashes and full native validation/encoding
remain unchanged. See the [ownership/registration decisions](design/2026-11-06-worker-ownership-and-registration.md).

Mesh mode renders durable surface records. Sampled raycast and volume modes
use a 3D texture and replace the selected field's mesh display. Other fields'
meshes may remain. These shaders are sampled-field previews, not direct
analytic evaluation or robust root isolation. Ordinary mesh transparency and
single-volume compositing do not correctly solve all mixed-scene overlaps.

Volume visibility and representative depth share the aggregate alpha cutoff
0.005. After the crossing segment is composited, the shader interpolates the
first visible depth using its optical rate and clamps it to that segment.
Individual segment alpha no longer gates volume visibility; finer sampling
therefore cannot erase a meaningful aggregate solely for lack of a marker.
Depth writes remain off for volume and on for raycast. Existing opaque depth
still tests the representative point; accepted color still integrates the whole
ray, including samples behind an interior opaque object. See the
[visibility/depth decision](design/2026-11-13-volume-visibility.md) for the exact
contract, floating-point limits and independent regressions.

Skewed and reflected affine grids use the full grid transform; reflected box
winding is corrected for back-face ray-entry rendering, including inside views.

Display steps follow ray length in voxel coordinates, with Draft/Standard/Fine
using 1/2/4 samples per voxel-distance (default 2). Traversal follows monotonic sample/brick steps rather than an arbitrary 4096
iterations, including empty-brick jumps. Quality changes reuse the current grid
without worker requests, scientific edits, mesh generation, or serialization.
Bracket refinement still cannot guarantee tangencies, multiple unseen crossings,
or features unresolved by the sampled grid.

The renderer bounds each eight-cell brick using all its f32 vertices, including
shared faces and partial tail bricks. Padded min/max comparisons skip only bricks
that exclude both signed raycast isovalues or the volume opacity band. The
sampling lattice is preserved across jumps. Dimensions are checked for valid safe-integer products. Range arrays grow with
the requested field and have an accompanying RG
3D texture. A weak cache keyed by immutable sampled-value arrays and dimensions
reuses CPU ranges on scene rebuilds; replace the array when values change.
Each scene object owns its field and range textures, and the viewport disposes
both on replacement. These display bounds do not modify authoritative data or
persist in documents.

Choosing a sampled mode without a current display grid sends only `sample`,
not `generate`; the worker skips marching cubes. In a sampled mode, field and
resolution changes also use `sample`. The UI stages the requested field,
resolution, and mode until sampling succeeds, keeping the prior display grid
and saved meshes on cancellation or failure. Generation tokens reject late
results. Mode-only changes reuse a current grid; field/resolution changes in
mesh mode invalidate it. Imported-grid selection retains automatic preview
preparation. Sampling uses the existing resolution/allocation guards and the
same cancellable worker, and does not change persistent geometry or mark a
document dirty unless its active field changes.

The viewport owns its Three.js engine and disposes rebuilt geometry/materials.
Camera damping drives an animation loop with rendering on movement or changed
scene state. OrbitControls change events also invalidate the next frame because
wheel and middle-drag handlers update the camera before the animation tick;
their movement must not be lost when the next `update()` returns false.
Zoom toolbar buttons use public OrbitControls dolly methods, sharing its target
and distance limits. Camera controls do not change the scientific document.
New scene geometry is staged before replacing the prior scene;
recoverable construction errors keep that prior scene visible and report an
error without unmounting the interface. Render and image-export exceptions are
also reported, separate from the existing graphics-context-loss warning.
The renderer uses `preserveDrawingBuffer: false`. PNG export renders the current
scene/camera and reads `toDataURL("image/png")` synchronously in the same task,
before presentation can discard that buffer. Version 0.7.2 enables
`alpha: true` while keeping normal clear alpha one. Background color/reset is
owned by viewport session state and only invalidates drawing; it does not rebuild
geometry, change camera/document state or resample scientific fields.

Normal export uses the selected opaque background and keeps
`eigenvista-view.png`. The separate transparent action uses
`eigenvista-view-transparent.png`: save the exact clear color/alpha, temporarily
clear black at alpha zero, draw through the same final-frame/AO path, and encode
before restoring the clear state and redrawing the normal view in `finally`.
This retains background transparency, antialiased edges and translucent surface
alpha without removing foreground pixels by color. HTML overlays remain outside
the canvas export. No persistent capture target or file-format field is added.
Lost contexts and invalid/failed encoding report errors; successful retry clears
only an earlier export error. Local Chromium/WebKit checks cover actual PNG
alpha, background pixels, compositing, white foreground, AO and error recovery;
[status](status.md#source-version-072) records the
qualifying full run and remaining native-download limits.
No GPU-memory reduction has been measured or promised.
Scene objects are rebuilt on document/grid/mode changes; atoms and bonds use
instanced meshes with per-instance atom picking. Rendering at every maximum
input size still requires separate platform acceptance.

Version 0.10.1's #91 correction uses [camera-relative lighting](../app/src/sceneLighting.ts):
one directional headlight on camera-local +Z, plus neutral ambient fill.
Light and target are children of a camera-owned group; orbit/pan/roll preserve
the view-space arrangement. This replaces 0.10.0's six-light octahedral rig,
whose absolute-dot diffuse seams and multiple specular lobes produced visible
bands and repeating highlights. Light intensities multiply declared weights by
π to compensate Three's Lambert BRDF factor of 1/π.
Built-in Blinn–Phong mesh and sampled-raycast shaders orient normals toward
the actual eye ray, then use the same camera-axis headlight. Ambient/diffuse
weights are 0.35/0.65: pure Lambert response is 0.35 + 0.65 max(Nview.z, 0)
before material/color processing. Blinn uses one broad half-vector lobe with
exponent 32 and strength 0.25. Existing PBR, Lambert and custom materials remain
distinct; equal illumination does not imply identical BRDFs or images of
different sides of an asymmetric molecule. User/bundled custom GLSL keeps its
declared lighting; pure volume compositing, numerical planes and labels remain
unlit. No scientific geometry, palette or stored view fields change.

A mapped positive total-density mesh uses Gaussian nuclear-attraction integrals
to evaluate the potential of a positive test charge. The [core evaluator](../crates/eigenvista-core/src/electrostatic.rs)
contracts the total density matrix against one-electron Coulomb integrals and
subtracts that electronic term from the nuclear term, in hartree/e. Scaled
Hermite derivatives and Boys-function recurrences work on the same contracted
Cartesian and spherical polynomial basis as density sampling. No Coulomb
grid, atomic point-charge fit, distance truncation, or wavefunction solve is
involved. See the [McMurchie–Davidson integral method](https://doi.org/10.1016/0021-9991(78)90092-X)
and the [PySCF independent reference](../fixtures/molden/electrostatic-reference.json).

The registered worker meshes the density and then maps its vertices. It
publishes the resulting surface only after the same document preflight used
for Save. The archive binds f64 potential values to the density hash, nuclei,
and ordered vertices. The renderer interpolates the potential before applying
the color ramp, then applies the built-in diffuse/Blinn–Phong lighting.
Translucent mapped meshes draw back faces before front faces to keep triangle
traversal order from producing stripes. The viewport and PNG composition
share one signed legend, and the controller uses the same generation,
cancellation and appearance paths as the GUI.

Molecular ambient occlusion is an optional session display setting. The
[controller](../app/src/molecularAmbientOcclusion.ts) uses the pinned GTAO addon
to produce normal/depth and AO maps. Reserved layer 1 contains the existing
instanced atoms and bonds. Layer 2 contains visible SES/SAS meshes at opacity 1
with built-in shading. Each enabled layer has its own pass and screen-map
uniforms on owned MeshLambertMaterial replacements. The separate normal/depth
maps prevent cross-occlusion between the groups and exclude quantum fields
and custom shaders. The surface pass uses double-sided normals to match the
built-in surface materials. Active SSAO uses Lambert diffuse shading without specular
highlights. Strength mixing and a visibility exponent of 6 for atoms and bonds
or 3 for surfaces modulate both diffuse light terms. This illustrative shading targets broad molecular folds and
cavities. The final complete scene remains a direct render, preserving
field/custom-shader and transparency/depth/color paths. Transparent-field
pixels can change through the newly shaded molecular backdrop. No chemistry,
worker registration, scientific source or document dirty state changes.

Automatic radius defaults on and uses 5% of the atom-coordinate bounding-box
diagonal, converted to angstrom, rounded to the nearest quarter angstrom and
clamped to 1.5–30 Å. App memoizes it by the immutable atoms reference; camera,
field bounds and display representation do not change it. Turning Auto off
retains the displayed radius for manual adjustment over 0.25–50 Å. The
automatic surface radius is five-thirds of the automatic atom radius, rounded
to the nearest angstrom. Manual mode shares a radius, and both modes share
strength. The session setting `ambientOcclusion.enabled` controls atoms and
bonds and `ambientOcclusion.surfaceEnabled` controls SES/SAS. Both are exposed
through `scene.set` and `app.state`. State reports the resolved surface radius
as `ambientOcclusion.surfaceRadiusAngstrom`.

Target dimensions follow the full physical drawing buffer up to the actual
device texture/renderbuffer capability. There is no software edge/memory cap.
GTAO uses sample parameter 32 and distance exponent 2. Poisson denoise uses
8 samples with radius 4 and luma rejection 0.25 for atoms and bonds, and radius
6 and luma rejection 0.5 for surfaces. Both render at full resolution without a
beauty composer.
Off/zero allocates no pass; disabling releases owned pass resources. Owned
Lambert materials are disposed and the exact original material references are
restored on Off/zero, failure or scene replacement before old-group disposal.
Borrowed Standard materials, their hooks and programs remain unchanged; each
enable owns fresh Lambert materials/uniforms. Support/FBO
checks, deferred shader diagnostics, scoped failures and finally restoration
retain the normal view on enhancement failure. Actual context loss follows the
existing reload path. Animation and PNG invoke one shared final-frame function.
See the [decision](design/2026-11-14-molecular-ambient-occlusion.md) for exact
ownership, the rejected prototype, limits, API pins and verification boundaries.

The footer uses `Native (Tauri)` for the desktop shell and `WebAssembly` for the
browser. This neutral label describes the runtime rather than guessing the OS;
scientific work still uses WASM in both shells. It adds no platform plugin or
Linux/Windows qualification.

## Persistence versus transient state

The [native preview format](preview-format.md) is a ZIP with `manifest.json`
and checksummed, little-endian f64/u32 arrays. It is **not** the full proposed
schema, a streaming container, or a backward-compatible reader for every
historical Molekel file. Arrays are whole entries and saves can make multiple
in-memory copies.

The [typed encoding decision](design/2026-11-12-typed-native-encoding.md)
preserves the earlier writer's exact logical bytes: sorted metadata, array IDs,
column-before-row coalescing, flat shapes, f64 bits, integer fallback and hashes.
That typed-writer change introduced no schema/profile migration. Checked byte
accounting and fallible binary-buffer reservation report actual allocation or
representation failures without an application byte threshold. Metadata,
prepared arrays, ZIP output and unchanged decoder allocations remain; saved-source
validation still uses core's separate JSON-based hashing. The native benchmark
and its measurement limits are documented in [development](development.md#native-encoding-measurements).

The later 0.10.0 inspection extension adds optional capability-tagged
payloads under the same `[0,1]` container. It does not alter old documents' entry
bytes or the established quantum hash algorithm. See
[inspection capabilities](preview-format.md#scientific-inspection-capabilities-unreleased)
for the new durable records and compatibility boundary.

Saved meshes include field ID, source hash, signed isovalue, mesher/version,
grid geometry, precision, vertices/normals/indices, and appearance. The associated
quantum inputs remain in the same document. Hashes exclude appearance, sort
JSON keys, and canonicalize negative zero because the JavaScript JSON bridge
folds its sign. A source mismatch is rejected; revision-aware historical assets
are not yet implemented. Never discard saved meshes as disposable cache data.

Production generation still stores raw triangle-corner arrays. The separate
[#37 qualification](design/2026-11-12-indexed-mesh-qualification.md) demonstrates
exact tuple sharing and generated-layout shader-ID reconstruction, but does not
enable either. Unconditional postprocessing increases no-sharing peak memory;
future compaction requires an explicit measured benefit and fallible-allocation/raw-result fallback policy.
Existing arbitrary indexed saved surfaces continue to draw their original
arrays. Qualification markers in test fixtures are not a new supported profile.

Optional biological metadata is persisted with the explicit required feature;
biological colors, chain/component styles, visibility/isolation, residue ranges
and focus remain session-only. Global representation remains persistent.

Persistent view settings include representation, active field selection, colors,
opacity, and isovalue. Camera, active render mode, surface shading, custom
surface shader sources/uniforms/transparency, sampled preview quality,
grid-resolution control, orbital-browser
checkbox selection, worker cache, transient display grid, and dirty state are
not persisted. Multi-orbital selection produces independent
saved meshes, not a new combined orbital/density or multiple active volumes. A
loaded document can show saved geometry without recomputation. A selected
authoritative grid also gets a new transient display sample on Open, making
sampled modes available immediately. Selecting a sampled rendering mode prepares
an analytic orbital/density field's transient grid after reopening, without
mesh generation. No sampled
preview is a substitute for the complete authoritative grid saved in the file.
Generated meshes retain their requested generation resolution without embedding
transient samples in `Document.grids`. Neither kind has a policy memory ceiling.

The default workspace is one **480 px** tool pane, initially on the right and
selectable on the left. **Molecule**, **Fields**, **Surfaces** and **Appearance**
each expose a scrollable stack of the existing widgets. At narrow widths the
pane overlays the scene; hiding it returns its allocated width to the viewport.
`WorkspacePane` keeps one viewport parent and one mounted instance of every
scientific widget through side changes, tab changes, closing and Zen. Tab scroll
positions are restored. Hidden form bodies and shader file inputs are retained;
an application reload is not a promise to recover unsaved drafts.

Widget expansion is a separate profile preference, managed by
[`PanelSection`](../app/src/PanelSection.tsx). Eight whitelisted booleans live
under `eigenvista:panel-expansion:v1` in localStorage; reads are validated and
storage errors fall back to in-memory state. Accessible heading buttons control
hidden, mounted bodies, retaining form and shader state. Layout changes never
edit the scientific document, mark it dirty or request worker calculations.
During scientific activity the Field rendering body is forced open and its
disclosure disabled, without overwriting the user's preference.

`useWorkspacePane` owns `eigenvista:workspace-pane:v1`: pane side, finite bounded
width, visibility, active tab, complete per-tab widget permutations and the
three additional widget disclosures. Reads validate each preference;
unavailable storage falls back to session state. Zen and actual
fullscreen state are transient. Neither this store nor the original disclosure
store contains scientific arrays, shader sources, file grants or job state.

The shared `PanelStack` in [PanelSidebar](../app/src/PanelSidebar.tsx) sorts stable
keyed React siblings into actual DOM order, preserving mounted controls,
reading order and tab order. A dedicated drag handle or keyboard/tap move
controls announce positions and retain keyboard focus. Cross-tab/scope moves
are rejected. The legacy `PanelSidebar` wrapper retains its original two-sidebar
membership, `{pane,id}` drag payload and `eigenvista:panel-order:v1` preference
for compatibility; it does not supply the default pane's orders. See the
[simple-pane decision](design/2026-11-17-simple-workspace-pane.md) and earlier
[ordering decision](design/2026-11-13-sidebar-reordering.md).

Closing tools or entering Zen never transfers document/controller ownership,
restarts a worker or cancels a job. An activity strip outside the pane retains
progress and cancellation for cancellable calculations. Browser fullscreen uses
the actual Fullscreen API and reports rejection; it is not a detached native
window implementation or native macOS fullscreen qualification. Presentation
settings currently have no application-control API methods. Quantitative field
metadata stays lazy until its widget is opened, so selecting the Fields tab
alone does not parse an unused source or start an analysis.

Browser saving encodes through WASM and requests a download. Desktop saving
encodes through WASM, revalidates in native Rust, asks for a destination, writes
and syncs a new sibling file, then renames it into place. Cancellation or failed
validation does not replace the existing file. Windows replacement semantics
need separate qualification. File-format tests are not proof that native
window close, Save dialog, or download interactions all work end to end.

The [save-contract investigation](../plans/005-native-save-contract-research.md)
distinguishes atomic visibility from crash durability. Existing Unix staging
mode `0600` replaces old mode/inode metadata; it is not a metadata-preserving
overwrite contract. File sync precedes publication, with no later parent-directory
sync. Exclusive new-file publication needs same-directory hard links; the actual
converter fails safely on the tested ExFAT image even with `--force` when the
destination is absent. Replacement and parameter saves use rename and succeeded
there. The observations do not qualify power loss, ACLs, Windows, remote/provider
filesystems or every possible sync/publish failure. No save behavior is changed
by the research harness or its filesystem regression tests.

Native lifecycle protection vetoes window close and application exit until a
tokenized decision for the current document is resolved. Rust coalesces repeated
requests; the frontend listener recovers pending requests during initialization
and cancellation races. The modal Save/Discard/Cancel prompt blocks editing,
rechecks document identity after asynchronous saves and late calculation results,
and never authorizes exit after a cancelled/failed save. Persistent document,
dirty and activity refs update synchronously, before React rendering. Native save
activity covers document, converted-file and shader-parameter writes; unresolved
saves block discard. Unwritten conversion results require an explicit discard
or a return to the queue to save them. Approval invalidates/cancels both worker
owners before releasing the native exit. Browser beforeunload remains separate.
See the [lifecycle decision record](design/2026-11-11-native-lifecycle-and-molden-limits.md)
for native platform integration and the distinction between automated and physical
GUI acceptance. Scientific/format contracts and capability permissions are unchanged.
Desktop destinations default to `.eigenvista` and may use the legacy `.molekel`
suffix. Encoding always writes EigenVista identifiers even with that old suffix,
so new saves are not guaranteed readable in previous Molekel builds. No automatic
file migration is performed. Imported external source paths
are protected against replacement. Batch conversion protects all selected sources.
Default CLI saves protect inputs and output aliases, require explicit replacement
permission for existing destinations, and atomically publish initially absent files without replacement
even with `--force`. This uses same-directory hard links; filesystems that do
not support them fail explicitly instead of falling back to an unsafe overwrite.

Version 0.10.3 (#100) adds explicit `--replace`, separate from `--force`:
it permits complete atomic replacement, including when a destination appears
after preflight, while preserving source/colliding-output protections. Its
replacement writer works on the tested Mac ExFAT volume; the unchanged default
does not. The earlier filesystem research remains evidence of its original
no-clobber behavior, not a promise of crash durability.

Save coordination (#99) shares a synchronous pending-inspection admission
tracker between controller requests and complete GUI command lifetimes. A
pending validated or coalesced write blocks GUI Save and native automatic exit
before the first asynchronous synchronization; API Save reports busy. Each
admission releases exactly once on completion, failure or stale rejection.
This does not change the saved format or serialize scientific work on the UI.

Shader parameter export uses the separate `save_shader_parameters` command.
It accepts complete UTF-8 text using fallible buffers, offers a `.params` dialog, checks the
extension, and writes/syncs a new sibling before replacement. It does not route
text through `save_native` or weaken native document decoding/source protection.
The UI catches export failures and preserves document state on cancellation.

Shader parameter files are checked against the active declarations before any
values are published. Uniform merging/serialization also validates finite scalar
types and exact vector lengths. Conflicting declarations are rejected. A source
change reconciles editor defaults by declared kind; the applied pair keeps its
own values until Apply. Live edits update only a pair with matching sources.
File reads compose against the latest validated editor state and carry per-input
generations; Clear invalidates pending reads and resets both staged files and
values, so delayed completions cannot restore a cleared pair.

Custom shader transparency is explicit and defaults on: arbitrary fragment alpha
is blended and depth writes are disabled, independently of document opacity or
an `opacity` uniform. Disabling it forces final alpha to 1 and enables depth
writes through a shader define and material update. The checkbox updates a
matching applied pair live and Clear resets it; built-in materials are unchanged.
The supported fragment output is ShaderMaterial's `gl_FragColor`: the wrapper
calls the user main function, then overrides that output's alpha in opaque mode.
This session setting is absent from native documents and parameter files.
Ordinary transparent-object sorting still cannot resolve intersecting layers or
the sampled volume's mixed opaque/transparent overlaps.

Indexed numeric-column references are converted from `u64` with checked
`usize::try_from` before bounds and single-consumption checks. Malformed oversized
indices are rejected on both native and wasm32; array checksums alone cannot
validate manifest references.

## Safety and distribution

Importers, model validation, computation, and ZIP parsing each enforce bounds.
These include finite numbers, checked dimensions, actual index/address
representation, validated identifiers/references, hashes, versioned profiles and
safe archive paths. Reads, buffers and native serialization attempt allocations
without fixed application byte/count ceilings. Actual GPU uploads are staged
before retiring the prior rendered group; recoverable device allocation failure
retains that graph. Device texture limits are queried from the actual renderer.

The [Tauri config](../app/src-tauri/tauri.conf.json) defines a local-content CSP
and embedded frontend; [capabilities](../app/src-tauri/capabilities/default.json)
enable the local dialog/read workflow. Native saving owns the destination
dialog inside Rust. No arbitrary shell-execution command or update service is
exposed to the frontend.

The [tester packager](tester-packaging.md) builds an optimized arm64 app,
embeds notices, ad-hoc signs the staged bundle and standalone converter, includes documentation/source,
and verifies the extracted ZIP before publishing it locally. It does not
notarize or upload. The separate [Linux preview](linux.md) uses a verified tar.gz
prefix with `bin/` executables and `share/eigenvista/` resources. Both package
types use the same Rust science, shared controller and embedded frontend; the
Linux launcher locates the executables through the prefix instead of a Mac
bundle. See the [Linux qualification decision](design/2026-11-20-linux-desktop-preview.md)
for the CachyOS runtime baseline and evidence boundaries. Other distributions
and Windows require their own qualification.

## Decisions still open

The clean-Rust requirement supersedes the early scientific C-library proposal.
The scalar Rust evaluator, classic marching cubes, bohr scene, JSON bridge,
single worker/cache, preview schema, and sampled renderers are current implementation
choices, not all final architecture decisions. Native parallel jobs, optimized
collocation, topology-certified meshing, analytic shaders, shrinkwrap, full
converters, formal schema evolution, camera persistence, and qualified release
platforms remain open. Track them in [status](status.md) and [handoff](handoff.md).
