# Biological identity and protein depictions

14 November 2026. Implemented on
`codex/biological-structure-views`, based on main `d098380`. Source package version
remains 0.6.0; the published 0.6.0 application predates this work. No new release
or version bump is part of this batch.

The user authorized the shared metadata prerequisite and the first four additions
in [Plan 007](../../plans/007-molecular-visualization-roadmap.md). Tracking:
[#62 metadata](https://github.com/uvar-apps/eigenvista/issues/62),
[#63 chain/entity colors](https://github.com/uvar-apps/eigenvista/issues/63),
[#64 component views](https://github.com/uvar-apps/eigenvista/issues/64),
[#65 backbone](https://github.com/uvar-apps/eigenvista/issues/65),
[#66 ribbons/cartoons](https://github.com/uvar-apps/eigenvista/issues/66).
Molecular-shape surfaces and the remaining roadmap ranks are outside this batch.

## Verification policy: 14 November 2026

The user requires **all relevant tests and checks to pass locally before any
push**. Current verification is local macOS only. Two local Linux machines will
join verification when the user provides access; no current Linux qualification
is claimed. GitHub-hosted checks are not required for push, merge or release.
The retained workflow is manual-only and runs only when explicitly requested.

Dated hosted-CI requirements and results below preserve the earlier policy and
its evidence; they do not override this rule. This policy/documentation update
did not rerun application tests. The implementation results below remain the
record of the completed checks.

## Metadata and compatibility decision

Keep the authoritative atom collection and its two existing element/position
columns unchanged. Add an optional structure table associated with original
selected atom indices. It holds chain label/author/entity identities, residue
and atom names, sequence/insertion identifiers, observed segments, component
classification and deposited secondary assignments. Missing classifications or
assignments remain explicitly unknown. PDB/mmCIF/BinaryCIF share the same model.

The structure field is omitted when absent. New native documents containing it
declare `eigenvista-biological-structure-v1` alongside the existing polynomial
profile. This makes older readers reject the new capability instead of quietly
dropping identity. Existing native documents without structure retain the old
profile and encoding. The new decoder checks feature/payload consistency.
Frozen inputs, quantum data, field hashes and numerical precision are preserved;
allocation and archive limits are not raised.

PDB TER boundaries, alternate selection and mmCIF label/author namespaces require
explicit treatment. The retained metadata describes exactly the selected atoms.
Historically accepted coordinate-only mmCIF can lack the identities needed for a
hierarchy; it keeps its geometry with an explicit metadata-unavailable report.
Names and chains are not fabricated to enable biological controls. Old native
documents that discarded labels similarly need reimport of the original source
to acquire identity.

## Display and computation decisions

Element, chain, entity and secondary coloring are separate choices. Element
palette files remain keyed by atomic number. Biological subset visibility,
chain/component style overrides and focus are session display settings; they
never remove source atoms or alter quantum inputs. The existing global
representation remains a persisted document view choice with its existing
dirty-state rules. Original atom indices remain the picking identity after
render-instance compaction.

Rust derives ordered protein C-alpha segments from validated identity and
continuity, separately from general distance-perceived bonds. The shared worker
prepares them only when a biological depiction needs them, using a separate
owned client and cancellation on replacement. Prepared display geometry is
cached by atom/structure identity; coloring and visibility do not resample
quantum fields. Nonfatal depiction errors must preserve resident quantum input.
Authoritative metadata replacements still trigger worker validation.

Secondary-structure cartoons use deposited HELIX/SHEET and mmCIF assignments.
Absent, conflicting or unresolved assignments remain unassigned and are reported
as such; no coordinate-derived secondary prediction is introduced. Ribbons and
cartoons must have real oriented geometry and strand arrows, not a renamed tube.
Rendering owns interpolation/extrusion, bounded batched buffers and resource
disposal. Protein geometry uses matte Lambert materials; existing molecular AO
targets only atom/bond instances. Exact field/custom-shader, AO restoration and
PNG invariants remain independently checked.

## Acceptance state

Local macOS implementation checks passed 272 default and seven desktop tests,
formatting and strict workspace/all-targets Clippy. WASM/TypeScript/production builds and
13 packaging checks pass. Forty focused cases pass across both browser engines,
including independent normals/arrows/rigid transforms, metadata/name aliases,
source-index picking, actual worker lifetime/cache behavior and exact field,
custom-shader, AO-OFF and PNG pixels. GL reports no errors, all observed FBO
checks complete, and resources return to the pinned Three context baseline.
Both engines completed nine actual-app captures using full tracked 1AON, 4PJ1
and 1CRN inputs; actual shape and color appearance were inspected.

The [verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
records exact source/PR identities, actual merge state, real-file regression
checks and the complete local browser result: 504/504 passed, 252 per engine,
with zero skipped, flaky or unexpected results. All relevant local tests and
checks must pass before pushing under the policy above; hosted checks are not
required for push, merge or release. PR #67’s merge state and revision are recorded
in the linked ledger.
[Handoff](../handoff.md) and [status](../status.md) link that current record.
These local macOS checks do not qualify native GUI/clean-Mac installs, Linux or
other operating systems, general secondary prediction or completion of v1.

Visual review exposed weak neighboring single-letter hue separation despite
distinct RGB values. A deterministic hash finalizer fixes that clustering; the
independent A–H hue-sector gate rejects the original palette. Valid source label
and author aliases also receive contextual namespace/entity/record names and
stable colors against the complete immutable source; filtering does not change
them. Legend/controls/picking share those names without changing scientific data.

Final review found one additional valid-input regression: mmCIF
[permits multiple monomer IDs at one sequence number](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Categories/entity_poly_seq.html).
The new validator initially rejected the existing reader's selected SER/CYS
alternatives. Include the component name in primary residue identity while
preserving the existing import grouping, all coordinates and strict same-name
conflict/duplicate checks. Protein topology retains ambiguous positions as
traversal barriers and omits every variant anchor; it must not join either
branch or skip an insertion barrier. The shared 20-atom fixture and native,
import, label/author/partial-order and browser controls cover this correction.

Ambiguity checks use all known deposited identities independently of the
namespace available for ordering. A missing author identifier cannot hide a
known label conflict, and a missing label cannot hide a shared author identity.
Complete distinct canonical labels can disambiguate reused author aliases;
opaque author identifiers contribute equality evidence without inventing an
order. A 972-scenario presence matrix, explicit insertion/alias controls and
native browser diagnostics check both omission barriers and retained anchors.

The initial complete browser run also caught an existing atom-label contract:
its primary element/index/coordinates item must retain its exact format. The
biological context now occupies a separate status item, with the original
35-pixel bar and canvas bounds preserved. The old picking test is unchanged;
the namespace-picking case additionally checks that selection never resizes the
canvas. The initial candidate's full results remain historical in the ledger;
only the corrected head's completed gates qualify delivery.

## Memory measurements

A repository-local diagnostic imported each full tracked file, prepared its
backbone, encoded and decoded a native archive, and checked complete document
equality. These are single native debug-process observations, not browser/GPU
memory limits or release-performance claims. Rust retained-payload estimates
sum actual vector/string capacities and record sizes; allocator headers and
rounding are excluded. Process peak RSS includes input/parsing, document,
backbone, encoding and decoding together.

| Input | Atoms / residues / chains | Retained metadata estimate | Backbone point storage | Process peak RSS |
| --- | --- | --- | --- | --- |
| tracked `1AON.cif` | 58,870 / 8,029 / 35 | 3,104,198 bytes | 1,219,840 bytes; 8,015 points in 21 segments | 144,015,360 bytes |
| tracked `4PJ1.pdb` | 65,963 / 8,811 / 28 | 6,133,045 bytes | 1,291,520 bytes; 8,783 points in 28 segments | 113,262,592 bytes |

Compact metadata JSON was 1,673,334 / 1,864,357 bytes; compressed native archives
were 1,466,659 / 1,603,667 bytes. The existing archive/string limits were not
raised. Raw diagnostic source, JSON and `/usr/bin/time -l` records are retained
under ignored `tmp/2026-11-14-structure-views/` (`memory-probe/`,
`memory-corrected-1AON.*`, `memory-corrected-4PJ1.*`); run with the repository toolchain and local
temporary directory. These measurements complement validation/allocation tests,
and do not imply every maximum-size structure will render interactively.
