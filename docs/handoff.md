# Development handoff

Updated 12 November 2026 for the research pass at merged main `06ecbb9`;
version 0.5.12 and its 6 November release/artifacts are unchanged. The dated
entries below describe prior increments. Start with [root AGENTS.md](../AGENTS.md),
then this document, [architecture](architecture.md), and
[development commands](development.md).
The [documentation map](README.md) links the original brief and full M0-M7 plan.
The current application is **EigenVista**, version **0.5.12**, in the standalone
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) repository. Source
lives at this repository's root, without a `next/` wrapper or legacy application
code. The icon and logo are unchanged.

## Issue priorities

### Research follow-up: 12 November 2026

PR #45 merged as `06ecbb9`, closing #32/#33/#34 after all three hosted PR checks
passed at `f6df89ff`; the [recorded run](https://github.com/uvar-apps/eigenvista/actions/runs/43045984314)
includes Linux Rust/Clippy, seven macOS desktop tests and all 294 browser cases.
Those remain historical implementation checks, not a new full-suite run today.

The user then authorized selecting and investigating `needs-research` issues.
The [research index and plans](../plans/README.md) and
[measurements/decisions](../plans/2026-11-12-research.md) cover #46/#39/#37/#38/#35.
Application code, dependency locks, limits and frozen fixtures are unchanged;
research scripts/archives live only under ignored `tmp/2026-11-12-research/`.
No implementation, Git publication or release was performed for this pass.

Recommended next work is the bounded Vite 7.3.8 maintenance patch (#46), then
authentic compatibility fixtures (first phase of #39). Exact indexed meshes
(#37) show useful retained/storage savings, but need explicit shader vertex-ID
and extraction-peak contracts. Typed output transport (#38) improves an isolated
phase in both engines; remeasure after compaction rather than promising whole-app
or browser-memory gains. Keep capacity expansion (#35) behind an agreed larger
real workload: MO count, dense input lines, JSON memory and persistence all bind.
No scientific correctness defect or project-specific Vite exploit was reproduced.

Fresh research verifies a reconstructed genuine old 0.3.2 producer archive with
current WASM, eight original/indexed archive decodes, 20 actual two-engine worker
transport samples, precision/capacity guards and isolated native timing/RSS.
It does not qualify a Vite upgrade, production transport/indexing implementation,
new capacity, packaged GUI or browser peak memory. See the report for exact
inputs, hashes, commands and limitations. Full runtime tests were not rerun.
The new #47 asset-layout and #48 collapsible-pane proposals are open; #48 has a
clear UI scope, while #47 needs comparison with the existing ZIP/manifest layout.
Preserve the untracked original review, private exports and local research data.

### CI/import/publication batch: 11 November 2026

[PR #45](https://github.com/uvar-apps/eigenvista/pull/45), developed on
`codex/ci-and-import-validation-performance`, implements #32/#33/#34. Hosted
Verify jobs use pinned tools, read-only permissions, repository-local temporary
storage and bounded failure artifacts. A clean-run Node type declaration gap
is repaired without changing existing dependency/compiler versions. Initial
Linux runs encountered DNS failures for Azure and official Ubuntu package
archives, while an AWS provider mirror worked. Package setup preserves working
sources and adds a fixed HTTPS Ubuntu mirror only after preferred-host DNS
failure and a successful bounded TLS probe, with normal archive signatures.
Strict deadlines and read-only failure probes remain.
Check the [actual PR jobs](https://github.com/uvar-apps/eigenvista/pull/45/checks)
at the reviewed head; all three must succeed before merge. The initial failure
and successful macOS/diagnostic-upload observations are recorded in
[status](status.md#ci-and-importpublication-performance-11-november-2026).
The initial Linux browser run also exposed test scheduling assumptions: camera
checks now settle real draws/verify the target; density checks distinguish
active-work responsiveness from cancellation of a real unpublished result.
Unchanged 256-cubed checks still interrupt unfinished computation. The CI browser
step has a 35-minute deadline, retaining time for failure uploads within its job.

Molden skips exactly zero contributions while retaining/validating all orbitals.
Publication calls the format's exact shared preflight without compression;
Save and the model-only legacy WASM validation contract remain distinct.
Source hashes, profile/layout and resource limits are preserved. Local checks
pass 226 Rust tests, strict Clippy/Rustfmt, clean npm/WASM/frontend and debug
arm64 app builds, all 294 browser cases in a final 7.8-minute run and 13 packaging
tests. Fourteen focused camera/density/cancellation checks also pass. Native measurements
show scoped import/preflight timing gains with similar process memory; see
[decisions and provenance](design/2026-11-11-ci-and-publication-preflight.md).
Source stays 0.5.12 and existing ZIP/tag artifacts are unchanged.

After this batch, remaining work is P3 research/features #35–#43, #20/#22 and
the newly recorded Vite advisory assessment #46. They need their own evidence/
scope decision; this request does not authorize implementing them. Native GUI,
clean-Mac/HiDPI and Linux/Windows release qualification remain open. Preserve
the original untracked review and local diagnostics.

### Native lifecycle/Molden limits repair: 11 November 2026

The batch in [PR #44](https://github.com/uvar-apps/eigenvista/pull/44), developed
on `codex/native-exit-and-molden-contract` from `fa76ac4`, implements
[#30 native close/quit protection](https://github.com/uvar-apps/eigenvista/issues/30)
and [#31 Molden limit documentation](https://github.com/uvar-apps/eigenvista/issues/31).
The native probe reproduced a default macOS Quit bypass of Tauri ExitRequested;
the fix adds an AppKit delegate hook plus tokenized current-document decisions,
Save/Discard/Cancel, late-result checks and conversion/native-save coordination.
Molden caps/science remain unchanged; boundary tests and current docs now agree.
Runtime/test changes are commit `36c8491`; subsequent edits only record evidence.
See the [decisions](design/2026-11-11-native-lifecycle-and-molden-limits.md) and
[fresh evidence](status.md#native-lifecycle-and-molden-limits-11-november-2026).

Fresh checks pass 216 workspace Rust tests, strict Clippy/Rustfmt, production
WASM/frontend and debug Apple Silicon `.app` builds, 13 packaging tests and all
290 Chromium/WebKit cases in one run. Four actual native scenarios produce
60 passing observations; the pre-hook AppKit terminate case failed as expected.
Physical shortcut/button/Dock clicks, native file dialogs, native startup timing
and clean-Mac/platform qualification remain separate gaps. Version/tag/ZIP stay
at 0.5.12; the published ZIP predates these fixes. The supplied original review
remains unchanged and untracked, outside the repair commit.

### Remaining review queue: 11 November 2026

The [November review triage and repair plan](reviews/2026-11-11-issue-priorities.md)
supersedes the earlier queue. Fourteen issues were initially opened with verified
bodies/titles/labels. After merging #30/#31, fourteen remain including existing
#20/#22; verify live GitHub state when continuing. Intentional AO/MO limits are
not themselves a scientific bug. The next P2 engineering batch was:
[#32 hosted CI](https://github.com/uvar-apps/eigenvista/issues/32),
[#33 zero-occupation import contractions](https://github.com/uvar-apps/eigenvista/issues/33),
and [#34 validation without discarded ZIP compression](https://github.com/uvar-apps/eigenvista/issues/34).
Its implementation/evidence is now recorded above.

Issues #35–#43 are P3 with `needs-research`: larger Molden capacity, sampling,
indexed meshes, typed worker outputs, explicit format encoding/fixtures,
hash allocations, native save policy, diffuse domains and anisotropy validation.
They are not confirmed output bugs; measurements, compatibility decisions or
reproductions must precede implementation. #20/#22 remain P3 design work.
See the plan for dependencies, acceptance gates and corrections to unsafe or
unproven review proposals. The initial triage changed no application code; the
subsequently authorized #30/#31 implementation/evidence is recorded above.

### Completed repair batches: 5–6 November 2026

The fifth repair batch implements #21, #7, and #4 in
[PR #29](https://github.com/uvar-apps/eigenvista/pull/29), developed on
`codex/bcif-import-and-viewer-polish` from merged main `44d73d7`; runtime/test
changes are commit `3ed46b5`. The bounded
Rust BinaryCIF reader handles raw/gzip 0.3.x input, all seven transforms, null
masks, Unicode dictionaries, and original-byte source hashes. Canonical CIF
feeds the existing scientific importer, including alternate/model selection,
declared connections, and automatic bonds. It supports one block and the
documented structure profile, without recovering absent quantum data or
expanding crystal images. See the [design](design/2026-11-06-binarycif-and-capture.md)
and [profile](structure-imports.md#binarycif-profile).

The viewport drops drawing-buffer preservation; PNG export explicitly renders
and synchronously captures the current frame. Browser pixel evidence now comes
from compositor captures instead of discarded buffers. The native runtime badge
is neutral `Native (Tauri)`; `WebAssembly` remains the browser label. The real
1CRN binary/text twin has 327 atoms/337 bonds and three independently mapped
disulfides; the Molstar-encoded policy twin covers masks, alternates, omissions,
Unicode, compressed transforms, and one retained long-range connection.

Fresh focused verification passes 22 codec/protocol cases, four public import
cases, all 15 CLI tests, six BinaryCIF browser cases, four runtime-label cases,
and 168 affected renderer cases including 14 new PNG cases. Strict Clippy,
Rustfmt, production WASM/frontend and Apple Silicon native builds, and 13
packaging tests pass, as do all 208 workspace Rust tests including desktop and
all 254 Chromium/WebKit cases in one run. Desktop/mobile previews/exports were
inspected; 421 local documentation targets and four fixture input hashes verify.
Full evidence is maintained in
[status](status.md#binarycif-and-viewer-polish-6-november-2026).
The rebuilt native app is signature/frontend verified at 0.5.11; no tag, release,
or ZIP was requested. Published artifacts predate all five repair batches.
At that 6 November checkpoint, the remaining issue order was crystal symmetry
(#20), then mmCIF export (#22), both larger research/design activities. The
11 November queue above now takes precedence.

The bond/mmCIF batch implements #3 and #19 in
[PR #28](https://github.com/uvar-apps/eigenvista/pull/28), developed on
`codex/bonds-and-cif-connections` from merged main `58d835b`; runtime/test changes
are commit `1c0f638`. Exact 0.5-angstrom radius buckets reduce broad
neighbor visits while preserving pair acceptance, ordering, and limits. mmCIF
selected source identities resolve declared covalent/disulfide/metal connections
before perception fills gaps. Raw ID/type/order/columns and omissions persist in
bounded provenance. Noncovalent/third-partner and unavailable-image semantics
remain explicit rather than fabricated. A reproduced non-polymer alternate
grouping defect is fixed with author residue/insertion fallback. The bounded
lexer handles wrapped/scalar connections and rejects unsupported layouts and
trailing constraints safely. Cumulative JSON preflight bounds repeated selected
atom-site IDs before allocating provenance strings.
See the [design](design/2026-11-06-bond-search-and-cif-connections.md) and
[fresh verification](status.md#bond-search-and-mmcif-connections-6-november-2026).
Fresh checks pass all 180 workspace Rust tests, strict Clippy, Rustfmt, production
builds, 13 packaging tests, and all 230 Chromium/WebKit cases in one run.
Desktop/mobile connection screenshots were inspected; 384 local documentation
targets resolve. The native app is rebuilt/verified at 0.5.11, with no
new tag/release/ZIP; published artifacts predate all four repair batches.
All 27 independent `1AON.cif` connections survive, adding ten previously missed
long Mg–O edges (59,317 total bonds); `1BH3.cif` keeps 2,372 atoms/2,270 bonds.
Preserve source fixtures, user references/local data, and platform acceptance
boundaries. It merged as `44d73d7`, closing both issues; its successor is above.

The worker batch implements #6 and #5 in
[PR #27](https://github.com/uvar-apps/eigenvista/pull/27), developed on
`codex/worker-ownership-and-cache` from merged main `c5ebcbb`; runtime/test
changes are commit `b701efe`. One shared FIFO worker has explicit scene/conversion
owners and per-request AbortSignals. Cancelling active work restarts blocked
WASM while retaining other owners' queued jobs; fatal failures reject all.
Chromium message-error delivery uses an event listener, and initialization
failure permits a fresh worker/fetch. UI generation tokens remain necessary.
One validated Rust `RegisteredDocument` owns immutable source data and one
sampled field; repeat requests carry small parameters instead of the full
scientific document. Replace affected top-level source arrays/objects when
editing: in-place mutation does not invalidate reference identity. Internal
registration IDs never replace scientific hashes or native save validation.
See the [design](design/2026-11-06-worker-ownership-and-registration.md) and
[fresh verification](status.md#worker-ownership-and-registration-6-november-2026).
Fresh checks pass: all 147 workspace Rust tests including desktop, strict Clippy,
Rustfmt, 13 packaging tests, production WASM/frontend build, and all 226 browser
cases in one Chromium/WebKit run. Current desktop/mobile screenshots were
inspected, and local documentation links resolve. Isolated Node/WASM benchmarks
measure registration/cached-mesh costs with exact parity; they do not establish
end-to-end speedups or platform qualification.
The native app was rebuilt at 0.5.11 and verified; published ZIP/tag remain
unchanged and predate all three repair batches. Preserve user references and
local data; `.serena/` is checkout-local ignored tooling, not packaged source.
That batch merged as `58d835b`, closing both issues. Its successor is described
above; the original issue review below preserves the earlier triage.

The rendering batch implements #12 and #2 in
[PR #26](https://github.com/uvar-apps/eigenvista/pull/26), developed on
`codex/next-rendering-fixes` from merged main `31c4876`; runtime/test changes are
commit `c9ca60f`. Custom shaders have an explicit live transparency
policy, independent of document opacity; opaque mode forces final alpha one.
Sampled previews use voxel-relative Draft/Standard/Fine quality and conservative
eight-cell min/max bricks. Both signed crossings within one coarse ray segment
are composited in depth order. Settings are session-only, without worker
requests, scientific changes, mesh generation, or dirty-state changes. See the
[design decisions](design/2026-11-06-rendering-quality.md) and current
[verification](status.md#rendering-fixes-6-november-2026).
Fresh checks pass: 147 workspace Rust tests including desktop, strict Clippy,
Rustfmt, 13 packaging tests, production WASM/frontend build, and all 190 browser
cases in one Chromium/WebKit run. Desktop/mobile controls were inspected. The
Apple Silicon app was rebuilt and verified; no new tag or ZIP was created.
Published `v0.5.11` artifacts still predate both repair batches. Native interactive
rendering and clean-Mac/platform acceptance remain separate gaps.
That batch was merged in `c5ebcbb`; both issues are closed. Its subsequent
worker ownership/cache batch is described above.

The first repair batch was merged as `31c4876` in
[PR #25](https://github.com/uvar-apps/eigenvista/pull/25), developed on
`codex/priority-integrity-and-shader-fixes` from `38caf41`: #11 checked column
indices, #9 shader parameter validation/source replacement, #10 native `.params`
export, and #8 the Rust 1.99.0 selector. All four issues are closed. See
[status](status.md#priority-fixes-5-november-2026) for verification and gaps.
The review below preserves the original triage.

The [5 November issue review](reviews/2026-11-05-issue-priorities.md) covers all
16 initially open GitHub issues at `38caf41` (then matching main and origin main),
version 0.5.11. Its first batch was #11 (WASM column-index wrapping), #9 (shader
parameter crash), #10 (native parameter export), and supporting #8 (compiler policy).
Focused in-memory checks reproduced basis-center swapping in the existing WASM
and the shader-panel exception. The user approved the tracker updates: #16 is
closed as completed using the shipped fix, then leaving 15 open issues. #11 was raised to
P1 with `kind:scientific`; #19 is P2; #3/#6 were lowered to P2 pending stronger
failure/overlap evidence. Each changed issue has a rationale comment. The review
records the applied changes, acceptance checks, and remaining dependencies.

The initial triage ran only the focused reproductions; its subsequent repair
checks are recorded separately in status. Version remains 0.5.11; the published
tag and tester ZIP predate these fixes. Preserve the user's untracked
`docs/references/`; the checkout-local `1AON.pdb` exclusion is unchanged.
The existing CIF browser test also emits `app/artifacts/cif-1bh3-desktop.png`;
that generated image is preserved and locally excluded from Git/source packaging.

## Current release

Version 0.5.12 collects all five repair batches below/above, through merged
main `e9c7675` (PR #29). It includes BinaryCIF/raw-gzip import, declared mmCIF
connections, tighter exact bond queries, safe shader/parameter workflows,
voxel-relative preview quality, scoped worker cancellation and resident input
reuse, PNG capture without retained drawing buffers, and a neutral native badge.
Release commit `cf0db09` and annotated tag `v0.5.12` are pushed. The
[0.5.12 GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.12)
contains the verified ZIP, checksum, and build metadata. Source versions and
lockfiles are 0.5.12; this documentation follow-up does not move the release tag.
Fresh post-bump checks pass 208 workspace Rust tests, strict Clippy/Rustfmt,
production WASM/frontend/native builds, all 254 Chromium/WebKit cases in one
6.8-minute run, and 13 packaging tests. Current screenshots/PNG exports were
inspected, and 422 local documentation targets resolve.

Package: `artifacts/distributions/EigenVista-0.5.12-apple-silicon-20261106T030153Z-cf0db09.zip`.
The app, standalone converter, source/dependency bundles, examples, and notices
were rebuilt from clean `cf0db09`. Signatures, extracted bytes/modes, all 255
archived source files against tagged Git blobs, four BinaryCIF fixture hashes,
actual optimized raw/gzip/policy conversions and release-WASM parity verify.
GitHub asset digests match the local ZIP/checksum/metadata. See
[status](status.md#version-0512) for checksums and evidence. Native GUI/HiDPI,
clean-Mac, and Linux/Windows acceptance remain separate gaps. The build is
ad-hoc signed, not notarized. Old artifacts and timestamped snapshots remain
historical and untouched.

The user's `docs/references/` remains untouched and is now locally excluded via
`.git/info/exclude`, along with local `1AON.pdb` and generated tooling/screenshots,
so these files cannot enter the release source snapshot. Do not remove those
checkout-local exclusions or read/include private chats. Work stays in
EigenVista; Molekel remains read-only reference.

## Previous release: 0.5.11

Issue [#24](https://github.com/uvar-apps/eigenvista/issues/24) adds real-time
progress for surface generation and sampling-only previews. Release commit
`cd2ad8d` and annotated tag `v0.5.11` are pushed to origin. Source manifests and
lockfiles are 0.5.11. The [GitHub preview release](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.11)
contains the verified Apple Silicon ZIP, checksum, and build metadata. This
documentation follow-up records the completed release without moving its tag.
Rust reports completed z slices through optional WASM callbacks;
the worker throttles notifications and the UI shows the field/batch position,
per-phase percentage/counts, and elapsed time beside Cancel. Meshing reports
completed signed extraction passes, not internal marching-cubes iterations.
Preparation/transfer/validation remain indeterminate; no ETA is fabricated.
Cancellation, cache reuse, scientific results, memory guards, and atomic
publication must remain unchanged. See [status](status.md#version-0511)
for fresh verification and artifact state; timestamped snapshots stay unchanged.

Fresh post-bump checks at 0.5.11: 145 workspace Rust tests, strict
Clippy/formatting, 13 packaging tests, and the production build passed, as did
the complete 158-case Chromium/WebKit suite in one uninterrupted run. Inspected
progress screenshots; earlier desktop/mobile inspection is recorded in status.
Verified version agreement, unchanged external dependencies, and 214 local
documentation link targets. Native interactive progress was not exercised.
The preview runs on port 5178. The app and tester ZIP were rebuilt at 0.5.11
from clean `cd2ad8d`, with signatures, extracted bytes/modes, sample imports,
converter/WASM roundtrips, source identity, and uploaded ZIP digest verified.
Package: `artifacts/distributions/EigenVista-0.5.11-apple-silicon-20261021T102833Z-cd2ad8d.zip`.
It is ad-hoc signed, not notarized; clean-Mac installation and Linux/Windows
remain unverified. Issue #24 is closed. The user's untracked
`fixtures/large-structure/1AON.pdb` is preserved and locally excluded from Git
and packaging via `.git/info/exclude`, not added to the release. Next: user
acceptance of native progress and remaining open issues; see status for artifact
checksums and limits. Timestamped restart snapshots still describe 0.5.10.

## Release context

For a fresh session, start with the [restart snapshot](session-handoff-2026-10-21_173143-AWST.md) and
[coding-agent prompt](restart-prompt-2026-10-21_173143-AWST.md). They cover current Git/issue state,
the preserved untracked `1AON.pdb`, toolchain ambiguity, verified local package,
and the distinction between dated test reports and fresh checks.

Versions 0.5.9 and 0.5.10 added bounded mmCIF import and fixed native shader,
parameter, and palette file filters. The 0.5.10 release is commit `69d234b`,
tagged and pushed to origin. Issue #23 records successful user verification of
shader/params loading in the shipped native app and is closed. See
[status](status.md#version-0510) for evidence and remaining boundaries.

Version 0.5.8 makes the per-element atom colour palette loadable from a JSON
file (issue
[#17](https://github.com/uvar-apps/eigenvista/issues/17)). Colour moves out of
`elements.ts` into `app/src/atom-colors.json`, the single source of truth for
the default palette, with `atomColors.ts` parsing and validating a loaded file.
A session can override any subset of elements through the **Atom colours**
panel and reset to the bundled default. The palette is a session display
preference and is not written into `.eigenvista`; a colour change re-tints the
instanced atoms in place rather than rebuilding the scene. Symbols and radii
stay fixed in `elements.ts`, and the Rust guard now asserts the palette is
all-distinct so the 13-colour regression cannot return. Verification: 133
workspace Rust tests, strict Clippy, formatting, the production build, and the
full 144-case Chromium/WebKit browser suite. See the
[design record](design/2026-10-12-atom-colors-from-file.md).

Version 0.5.7 replaces the group-coloured display table shipped in
0.5.5/0.5.6 with a per-element table in `app/src/elements.ts` (issue
[#16](https://github.com/uvar-apps/eigenvista/issues/16)). Distinct colours go
from 13 to 118: Jmol CPK for Z 1-109 and OpenBabel's continuation of the same
gradient for Z 110-118. Radii are Alvarez (2013) van der Waals values, with
Rahm-Hoffmann-Ashcroft (2016) supplying Pm and Po-Ra, and a documented
Pyykko-covalent-radius extrapolation for Fm-Og, which have no published van
der Waals radius. The legacy eight keep their pre-0.5.5 colours and Bondi
radii. Picking labels use real symbols everywhere. This is a display-only
change; bond perception and the scientific model are untouched. Verification:
128 workspace Rust tests, including the new table drift guard, strict Clippy,
formatting, the production build, and the full 136-case Chromium/WebKit
browser suite.

The orbital preview follow-up ([#15](https://github.com/uvar-apps/eigenvista/issues/15))
lets users select volume or raycast directly after importing Molden, without
first generating meshes. Sampling-only field/resolution changes are cancellable
and preserve the previous preview on failure. See the
[rendering guide](user-guide.md#rendering-and-appearance) and
[sampling regression](../app/tests/field-preview.spec.ts).

The 0.5.4 post-bump checks pass 122 workspace Rust tests, 136 Chromium/WebKit
cases in one full run, 13 packaging tests, formatting, strict Clippy, and the
production WASM/frontend build. All first-party versions agree; external
dependencies are unchanged. No 0.5.4 tester ZIP was rebuilt in the version-bump
step; the subsequent user-requested packaging run produced
`EigenVista-0.5.4-apple-silicon-20261012T043954Z-d829183.zip` from clean source.
That archive is historical; use the restart snapshot for the latest package. See
[release evidence](status.md#version-054) and Git for publication identity.

The 12 October 2026 follow-up fixes Rust 1.99 strict Clippy failures and stale
columnar-atom checks in the macOS packager, tracked by issues #13 and #14.
See [the verification record](status.md#rust-199-compatibility-and-packaging-fixes)
before continuing. Those fixes were made at version 0.5.3; toolchain pinning was
then a separate decision under issue #8, and setup selected Rust 1.92.0. The
5 November repair batch above selects Rust 1.99.0 for #8.

Version 0.5.3 makes large structures practical. Atoms and bonds render as
instanced meshes (121,525 → 1.8 draw calls per frame, 3.2 GB → 40 MB heap on a
66k-atom structure), and the document format coalesces uniform numeric columns
and stores the atom collection as two columns, so the manifest no longer grows
with atom count. A 100,000-atom structure now saves with a 1,455-byte manifest;
the previous format refused anything past 8,191 atoms. Chemistry input is
unchanged — PDB, XYZ, Cube, and Molden all still import, and legacy `.molekel`
documents still read. See
[status — Version 0.5.3](status.md#version-053) and
[preview format](preview-format.md#columnar-coalescing).

Version 0.5.2 added no features. It fixed the cold-start unsaved-changes defect,
a synchronous throw in the scientific worker bridge, silent `NaN` acceptance in
shader `.params` files, and a flaky canvas read in the test suite; it also
corrected stale statements in these docs. See
[status — Version 0.5.2](status.md#version-052) for the full list, the
verification table, and the gates that were not rerun.

## Standalone migration

The dedicated checkout starts on `main`, with eight rewrite-only commits
extracted from the original repository's `next/` subtree at
`4edabf6852db44ff849e82223bef6c0702730e3c`. Commit hashes differ; original
Molekel commits and tags remain in the original repository, not as assumed
local refs. The [migration record](migration.md) records source provenance,
extracted identities, and the data boundary.

The workspace, app, tools, documentation, and fixtures are root-relative.
Eight unchanged PDB/Molden/cube data files and their license live under
`fixtures/legacy/`, so tests no longer need a parent Molekel checkout. No
legacy application code or build system is copied. Original research and
the brief are linked to the pinned original revision. The original checkout
and private chat exports remain untouched.

Version remains 0.4.0. The standalone checkout passes 108 workspace Rust tests,
114 Chromium/WebKit cases, 11 packaging tests, production WASM/frontend build,
formatting, Clippy, fixture checksums, and documentation links. Browser checks
ran on isolated port 5189 without disturbing the original preview. The full
standalone macOS ZIP build and extracted-artifact verification also pass, using
an identified uncommitted migration snapshot before the final evidence update.
Native interaction and clean-machine installation remain separate gates.
Earlier evidence below describes the original checkout. Continue with
[AGENTS.md](../AGENTS.md), [status](status.md), and Git for current source,
artifact, and publication state.

## Version 0.4.0 release in the original repository

The user requested the 0.4.0 version bump, a commit, annotated `v0.4.0` tag,
and push of the current `2026` branch to `origin`. This is the first release
under the EigenVista name, including the rename and legacy-file compatibility
described below. At that time the repository had not moved to `uvar-apps`; origin was
`https://github.com/ugovaretto/molekel.git`. External dependencies, icon assets,
scientific references, and native schema shape `[0, 1]` remain unchanged.
The post-bump preflight passes 108 workspace Rust tests, 114 browser cases,
9 packaging tests, production WASM/frontend build, formatting, Clippy, and
all 202 local documentation targets. Native interactive and clean-machine
installation acceptance remain separate gates.
See [status](status.md) for version-specific verification, Git for actual
commit/tag/push state, and the delivered tester ZIP's `BUILD-INFO.json` for
exact source identity and packaging evidence.

## EigenVista rename

The user requested renaming the active rewrite, not the legacy Molekel source
or historical research. Active Rust packages/directories are `eigenvista-*`,
the npm package is `eigenvista`, the CLI is `eigenvista-convert`, and generated
browser bindings use `eigenvista_wasm`. The native application is
`EigenVista.app`, identified as `org.uvar-apps.eigenvista`. New tester archives
use `EigenVista-...` and include `Source/eigenvista-source.tar.gz`.

New documents default to `.eigenvista`. Existing `.molekel` preview documents
remain supported through the old matched `molekel` format/profile identifiers.
New encoding writes `eigenvista`/`eigenvista-preview-polynomial-v1`, retaining
the `[0, 1]` scientific shape, field hashes, and cached-mesh semantics. Both
native profiles report `ImportReport.format: "eigenvista"`. Native Save also
permits the legacy suffix, but that does not produce an old-profile file;
newly saved files are not guaranteed readable in previous Molekel builds.
No files are bulk-migrated. See [native compatibility](preview-format.md).

The initial rename retained version 0.3.2; that step did not request a commit,
tag, push, or repository migration. Its verification passed **108 workspace Rust tests**,
**114 Chromium/WebKit browser cases**, and **9 packaging tests**, plus the
production WASM/frontend build, formatting, and workspace/all-target Clippy.
The old-profile compatibility tests preserve scientific data and cached meshes;
desktop/mobile branding screenshots were inspected. All eight icon assets are
byte-identical to the pre-rename commit, and external locked packages are unchanged.
See [status](status.md) for scope and each delivered ZIP's `BUILD-INFO.json` for
artifact-specific packaging verification. Native interactive and clean-machine
acceptance remain separate gates. Preserve historical tags/URLs, prior release
evidence, third-party notices, private chat exports, and the running application.

## Previous release context

The pre-rename Molekel 0.3.2 release fixed camera redraws during zoom
and added Zoom in/out toolbar buttons. It retains `v0.3.1`'s grids through
256 cubed, default 40, background cancellation, and memory guards. The orbital
browser, multi-orbital mesh generation, density sampling, cube rendering,
automatic bonds, Molden, and shared library/CLI conversion remain available.
Native schema `[0, 1]` and external dependencies are unchanged. The user requested
committing this increment, tagging it `v0.3.2`, pushing on `2026`, and rebuilding
the redistributable Apple Silicon tester ZIP. Inspect Git and the delivered
archive's `BUILD-INFO.json` for actual release state and packaging evidence.
Personal root-level `chat-*.md` and `*-chat-*.md` exports are ignored and
excluded from commits and source snapshots without changing their contents.

The user confirmed that the camera fix works in the web preview before
requesting this release. OrbitControls change events invalidate the next frame,
including wheel and middle-drag updates made before the animation tick. Camera
changes remain transient and do not regenerate geometry or alter science.
See the latest [status](status.md) entry for release verification.

The user reports that higher-resolution calculations still finish within
seconds on their machine. Exact dimensions and timings were not supplied;
this is user feedback, not a measured all-resolution performance guarantee.
Do not treat the automated simple-field 256-cubed tests as a real-molecule
benchmark.

Transient sampled grids now allow 256 cubed; authoritative imported/native grids
retain their 128-cubed sample-count bound. Exact mesh-output preflight replaces
the all-cells worst-case estimate, retaining the two-million-vertex bound.
The worker retains f64 samples in Rust/WASM and transfers a full-resolution
f32 display array instead of roundtripping sample JSON. File/geometry limits
remain, and recoverable failures preserve existing work; process-level OOM is
not guaranteed recoverable.

## Establish the live state

The standalone checkout begins on `main`; always inspect its actual current
state. In the original repository, branch `2026`, commit `a75e8e2`, and tag
`molekel-next-start` marked the initial rewrite. Those original identities are
historical context, not local refs or proof that new changes are committed.
Inspect current state before doing anything:

```sh
git status --short --branch
git log -5 --oneline --decorate
git diff --stat
git ls-files --others --exclude-standard
```

Read relevant staged/unstaged changes and new files. Preserve them. Never reset
to the tag to "restore" the project, change branches, publish, or assume the
working tree is clean. Do not repeat completed research or rebuild the legacy
C++ application. A tester source archive has no `.git`; use its source manifest
and `BUILD-INFO.json` for provenance instead.

## What is already implemented

- Shared Rust core, native format, import library/CLI, Rust/WASM bridge, React/Three.js viewer,
  and Tauri desktop shell, in this standalone repository.
- Automatic exact-neighbor-search display bonds for every supported import:
  XYZ, PDB, Molden, cube, and native files. Native Open supplements only missing
  edges, preserves explicit edges/science/cached meshes, and reports an unsaved
  change when it adds bonds. Raw format decode remains exact.
- [Single-field cube import](cube-import.md), including standard negative-atom-
  count single-orbital cubes, affine original grids, immediate volume/raycast
  previews, and explicit signed-mesh generation. Full f64 source grids persist
  independently of bounded display samples.
- Molden Open and Convert Files workflows, canonical real Gaussian shells
  through G, explicit producer/normalization/loss reports, and a separately
  qualified ORCA S/P/5D Molden export subset. See [import contracts](molden-import.md).
- Real Gaussian-polynomial orbitals/density matrices through G, analytic
  gradients, sampled grids, positive/negative classic marching-cubes meshes.
- A full orbital metadata table with filtering and checkbox selection. Generate
  up to 32 orbital fields sequentially, then publish their signed meshes together
  after Rust source/container validation. Cancellation or failure preserves all
  prior meshes and active-field settings; success retains unselected fields.
- Native preview files containing scientific inputs and durable surface meshes
  with generation/material metadata; browser download and atomic native save.
- Ball-and-stick/liquorice/space-filling, picking, viewport image download,
  surface controls, experimental sampled raycast/volume modes, cancellation.
- Independent frozen PySCF references, native/WASM tests, browser pixel/layout
  checks, and automated ad-hoc-signed Apple Silicon tester ZIP packaging.
- User, architecture, setup/build, packaging, format, import, and continuation
  documentation. Documentation is not a substitute for remaining release tests.

## Evidence, not assumptions

The recorded runs below predate standalone extraction and refer to the original
Molekel checkout. Standalone migration checks are tracked separately in the
latest [status](status.md) entry.

The 0.3.2 release preflight reruns **102 workspace Rust tests**, **110 browser
cases**, and **7 packaging tests** successfully after the version bump. The
production WASM/frontend build, formatting, workspace/all-target Clippy,
structured version/dependency checks, and all 195 local documentation targets
pass. Desktop/mobile camera screenshots were inspected. Exact source identity
and native ZIP verification are recorded in the delivered `BUILD-INFO.json`;
native interactive and clean-machine acceptance are separate gates.

The camera-redraw follow-up passes **102 workspace Rust tests** and **110
Chromium/WebKit browser cases**, including eight camera regressions for
wheel-only redraw, idle settling, alternate zoom controls, and mobile framing.
The production WASM/frontend build, formatting, workspace/all-target Clippy,
and local documentation links pass. Desktop/mobile screenshots were inspected.
The running preview was preserved; the existing native bundle and tester ZIP
were not rebuilt for this browser-reported fix.

The 0.3.1 release preflight reruns **102 workspace Rust tests**, **102 browser
cases**, and **7 packaging tests** successfully after the version change. The
production WASM/frontend build, formatting, workspace/all-target Clippy,
structured version/dependency checks, and local documentation links pass too.
Release ZIP checks and exact source identity are recorded separately in its
`BUILD-INFO.json`; native interactive and clean-machine installation acceptance
are not implied by these automated checks.

The high-resolution increment passes **102 workspace Rust tests** and **102
Chromium/WebKit browser cases** (51 scenarios in each engine), production
WASM/frontend build, formatting, and workspace/all-target Clippy. Browser cases
cover simple-field 256-cubed completion/persistence/typed-cache reuse,
real-Molden sampling cancellation, and injected recoverable worker/scene errors.
Direct `SampledField` tests confirm legacy-path parity, source-hash rejection,
and reuse after a rejected request. All 169 local Markdown targets resolve.
See the latest [status](status.md) entry for complete evidence.

The 0.3.0 version follow-up reran all **98 workspace Rust tests** and **88
Chromium/WebKit browser cases**, plus production WASM/frontend build, formatting,
and workspace/all-target Clippy successfully. Structured checks confirm version
consistency and unchanged external dependencies; all 165 local Markdown targets
exist. No native bundle or tester ZIP was rebuilt, and native interaction and
packaging tests were not rerun for this release request.

The background-calculation follow-up passes **98 workspace Rust tests** and
**88 browser cases** (44 scenarios in Chromium and WebKit), the production
WASM/frontend build, Rust/frontend formatting, and workspace/all-target Clippy.
Native tests generate the actual 125-AO Molden density at 32, 40, and 48, compare
sampled values with the unchanged reference evaluator, and assert retained
resolution, imported-grid, overflow, and worst-case mesh allocation limits.
Browser checks cover real 48-cubed sampling, visible phase progress, timer/frame
and camera responsiveness during work, termination before completion, exact
prior-document preservation, and successful fresh-worker retry. No worker
delay or mock calculation was used for that cancellation check. Mesh/raycast/
volume pixels, save/reopen, and desktop/mobile screenshots were checked, and
165 local Markdown targets exist. Native desktop interaction, native bundle,
and packaging were not rerun. See [status](status.md).

Before that follow-up, the density-sampling fix passed **94 workspace Rust tests**
and **84 browser cases**, along with production WASM/frontend build, Rust
formatting and workspace/all-target Clippy. Added coverage checks scalar/reference parity,
nonsymmetric/signed/extreme matrices, the actual 125-AO file's density at 24,
the then-retained rejection at 32, all rendering modes, and exact persistence. The point/
gradient reference evaluator is unchanged. Native desktop interaction and
packaging remain separate, unrerun gates for this fix. See [status](status.md).

The orbital-browser increment passed **83 workspace Rust tests** and the full
**82 browser cases** (41 scenarios in Chromium and WebKit) on 4 October 2026,
plus production WASM/frontend build, Rust formatting, workspace/all-target
Clippy, and frontend formatting. The 16 new cases exercise metadata, the full
118-orbital imported list, bounded selection, persistence, active-grid pixel
identity, mobile layout, and atomic cancellation/failure. Screenshots were
inspected. An existing mobile pixel assertion now waits for the next rendered
frame rather than assuming calculation completion means pixels are ready;
the threshold is unchanged. Native bundle/packaging tests and interactive
native orbital selection were not rerun for this increment.

The cube/all-format-bonds increment passed **83 workspace Rust tests**, including
the native destination-guard test, and **66 browser cases** (33 scenarios in
Chromium and WebKit). Packaging has **7 passing tests**. Production WASM/frontend,
macOS debug bundle, Rust formatting, and workspace Clippy were checked. The
verified release ZIP workflow checks extracted bytes, permissions, app/CLI
signatures, architecture, linked libraries, sample imports, and the actual
standalone converter's scientific agreement with WASM, including cube grids and
signed mesh generation. Each successful package's
`BUILD-INFO.json` records its artifact-specific checks.
See [status](status.md) for scope and provenance; rerun relevant tests for new
changes rather than treating these counts as permanent acceptance.

The user confirmed native PDB loading. Native Save dialog opening was observed;
complete interactive save/reopen, native close-warning behavior, and native PNG
download handling remain incompletely qualified. Filesystem roundtrip tests and
browser downloads are separate evidence. Clean-machine installation, the entire
macOS target range, Intel, Linux, and Windows are not verified releases.
New native Molden/batch/cube workflows have not been exercised interactively; browser
tests and the native destination-guard unit test are separate evidence. The
existing running app was not restarted during this change.

## Plan and next work

Use the [11 November repair queue](reviews/2026-11-11-issue-priorities.md) for
immediate priorities and the table below for longer-term targets.

The [original implementation plan](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/09-implementation-plan.md)
remains the full target. [Status](status.md) is the authoritative progress table:
M0 is still open, M1-M5 are partial preview implementations, M6 release qualification
is incomplete, and M7 is not started. Later user decisions require a clean Rust
implementation and durable self-contained meshes. Optional external mesh links
or OBJ-plus-metadata export do not replace `.eigenvista` persistence and support
for existing `.molekel` preview documents.

Use the user's next request to choose a bounded item; otherwise these are the
documented priorities, not permission for an unrelated rewrite:

| Work item | Entry points | Required evidence before calling it done |
| --- | --- | --- |
| Topology-aware Rust meshing | `compute.rs`, dependency record, scientific reference tests | MC33/Lewiner ambiguity/topology fixtures, signed/affine behavior, persisted algorithm identity, native/WASM parity |
| Robust sampled intersections and analytic shaders | `volume.ts`, field evaluator, browser tests | Tangency/multiple-root cases, quantified field/intersection errors, orbital and density envelopes, mixed-scene depth/transparency tests |
| Broader scientific qualification | Core reference tests, PySCF fixtures/generator | Spatial-integral convergence, diffuse/tight exponents, independent producer conventions; do not use implementation-under-test as sole oracle |
| Native lifecycle and save workflow | `files.ts`, Tauri entry point, `App.tsx` | Actual dialog save/reopen/cancel/replace/close and data-preservation observations, not only unit tests |
| Remaining external formats and richer UI | Shared import/model/format boundaries, UI | Broader Molden producer fixtures, future formats only when selected by user; metadata/material editing, undo, camera persistence without stale source associations |
| Public macOS release | Packaging, licensing, platform qualification | Supported-device/OS matrix, clean install, independent license review, Developer ID signing/notarization and distribution testing |

Shrinkwrap, full transfer functions, schema freezing/migrations, streaming beyond
preview allocation limits, native parallel jobs, and future user-selected
converters also remain open.
Direct ORCA is deferred in favor of its existing Molden export tool; no direct
Gaussian-log/T41 reader was added; Gaussian cube is a separate supported scalar
profile. PDB is not a full metadata-preserving importer. Do not quietly downgrade
these requirements because the current preview can display a scene.

## Important traps

- Both desktop and browser scientific jobs currently run in WASM, not native
  threads. The worker has one transient grid cache, distinct from saved meshes.
- `mcubes` is classic marching cubes, not MC33. The scalar Rust evaluator is a
  reference implementation, not the proposed optimized scientific kernel.
- Analytic grid sampling has a separate value-only path. Preserve its agreement
  with the point/gradient reference and retain both halves of nonsymmetric
  matrices when folding pairs. There is no estimated CPU-work cutoff; long
  jobs stay inside the worker. Retain numerical/domain validation, API grids
  from 12 through 256, separate 256-cubed transient and 128-cubed source-grid
  bounds, exact mesh-output preflight, and document/container budgets. UI
  options extend from 24 through 256 with default 40; progress reports completed
  sampling slices and signed mesh passes, with indeterminate phases elsewhere
  and no ETA. Termination, request IDs,
  and generation tokens must prevent cancelled or stale work from publishing.
- `SampledField` owns the single worker cache. Free old fields before replacement
  and preserve scientific-hash checks on reuse. Display buffers are independent
  transferable f32 arrays; never detach WASM memory or persist display rounding
  into the authoritative document. Transferred buffers cannot be reused in the
  worker. Freeing Rust buffers allows reuse but does not shrink WASM linear
  memory; only worker termination releases that worker's high-water footprint.
- The as-built scene is in bohr, despite the early proposal's angstrom renderer.
- JSON transport folds negative zero; source hashes explicitly canonicalize it.
  Native binary arrays retain f64 bits. Preserve cross-runtime hash tests.
- Structure-only imports cannot enable quantum generation. Imported grids are
  authoritative scalar data, not recoverable basis/orbital information.
- `sample` and `generate` share one worker cache. Preparing a cube preview does
  not create meshes or replace original grid samples. A preview f32 overflow
  error must not prevent opening/saving a valid f64 document.
- `ImportReport.requires_save` drives the UI dirty state, including native bond
  backfill. Do not infer clean state solely from the `.eigenvista` or legacy
  `.molekel` extension.
- Generation replaces meshes only for the selected field(s), not the whole
  document. Orbital batches commit atomically after native encoding preflight;
  do not publish intermediate jobs or associate the last grid with a different
  active field. Checkbox selection is transient; volume/raycast still uses one
  active field. Reopening saved meshes must not require regeneration or a source
  attachment. Cancel must work even when the prior document has no active field.
- Tests use four unchanged legacy PDB fixtures, the Molden regression, and three
  cube fixtures under `fixtures/legacy/`. Their exact paths are listed by the packager
  and [cube guide](cube-import.md); keep them in supplied source archives.
  Do not copy legacy implementation into the rewrite.
- Preserve ORCA producer markers. Its qualified Molden profile differs from
  canonical normalization; F/G and other unqualified variants must not silently
  fall through to the canonical reader. Density labels must identify listed-
  occupation reconstruction, not imply recovered correlated matrices.
- The app calls the shared importer in WASM, not the CLI subprocess. Native
  conversion results use protected source paths; the CLI independently protects
  inputs and output aliases. Preserve no-clobber behavior even with `--force`.
- `npm test` checks default scientific workspace members, not the Tauri shell.
  Playwright may reuse a server on 5178; verify it belongs to this checkout.
  Do not regenerate WASM during browser tests: Vite can reload an active test
  back to the startup example. Finish frontend/native builds before Playwright.
- New tester packages snapshot current nonignored source, including uncommitted
  work. Do not edit source during packaging; its stability check will reject it.
- Tester signing deliberately clears Apple/Tauri credentials. Public signing
  needs a separate approved workflow; do not weaken the tester script's boundary.
- Current license is GPL-2.0-or-later, matching the repository's existing terms.
  Automated notices/source collection is not a completed legal compatibility audit.

## Finish each increment

Use repo-local temporary storage and the verification matrix in
[development](development.md). Update user-facing behavior docs, relevant
contracts, and dated evidence in status. Name unrun or blocked checks explicitly.
Preserve the user's running app and existing work. A normal handoff should state
what changed, what was verified, and which relevant risks remain; commit/push/tag
only on a direct user request.
