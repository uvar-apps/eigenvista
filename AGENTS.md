# EigenVista agent guide

## Visible atom picking (#96) — source preview, 18 November 2026

The user reports no visible feedback for mouse-picked atoms. Confirmed by a real
export: selecting one atom changed zero pixels, because the old seven-pixel
center point was hidden inside its atom sphere. Tracked by
[#96](https://github.com/uvar-apps/eigenvista/issues/96). Selected atoms now have
gold hollow target markers; the latest inspected atom/bond endpoints have cyan
rings unless already selected. Ordinary inspection retains its existing
selection semantics and updates only the annotation group. Markers preserve
element/palette colors, shader/AO ownership and source identities, respect
visibility filters, and appear in PNGs. Clear selection removes both transient
cues. Source-identity guards suppress old selection/ordered indices before the
passive replacement reset. One batched point draw per marker kind, owned textures
and existing disposal; no per-atom draw calls, resource ceilings or scientific
Rust/WASM/format/version/icon changes.

Final focused Chromium/WebKit validation passes all 38 cases, including eight
new real-pixel/mouse tests and existing inspection/plane-update integration.
TypeScript, formatting and production/native debug builds pass. The final
additional rendering suite passes all 96 cases (AO, molecular surfaces, lighting,
field analysis and workspace), for **134 current-source application cases** total,
67 per engine, with zero failures/skips/flaky cases/retries. All 423 source/input
hashes remain unchanged across final rendering/native qualification. All 162
website cases and static checks pass. Native selection/readback passes 16 calls
and four reviewed PNG exports, including Pastel/AO/space-fill/transparency.
The initial capture framing was corrected with camera fit; its earlier images
remain diagnostic records. An initial AA-edge count assertion was corrected to
test marker visibility over changing atom shading, rather than equal threshold
counts. Source evidence is in `tmp/atom-selection/FINAL.json` and adjacent logs.
Rust/native/WASM sources match prior qualification (182 hashes); those unchanged
backend suites are reused, not claimed rerun. The user tested and accepted #96
and explicitly authorized commit/push on **main**, without a tag, version bump
or release. Before delivery, the complete current-source browser suite passes
all **712 cases**, 356 per engine, with zero failures, skips, flaky cases or
retries and all 423 runtime/test/input hashes unchanged. Fresh packaging/connector
checks pass all 23 cases; formatting and website static checks also pass. The
earlier 16-call/four-PNG native check and 162-case website qualification remain
applicable; all 91 tracked site files are unchanged. Exact delivery evidence is
in `tmp/atom-selection-push/PREFLIGHT.json` and adjacent reports. No release asset
rebuild is requested.
Preserve the original preview server/tab and immutable 0.10.1 release assets.
Linux/clean-Mac qualification remains pending.

## Automatic quantitative plane updates (#95) — source preview, 18 November 2026

Tracked by [#95](https://github.com/uvar-apps/eigenvista/issues/95). The user tested
and accepted the implementation and authorized commit/push on **main**. No
version bump, tag or release is requested. Creating a plane keeps its editor open with
**Auto-update plane** enabled. Native numeric steps, Enter commits and orientation
changes coalesce into the latest request. Typed drafts alone do not calculate.
Manual mode, owned cancellation, focus, exact resolution and accepted appearance
are preserved. The shared API/AI path supports optional plane-only
`analysis.create {request, supersede:true}`; unrelated/manual jobs stay protected.
Source/revision guards and serialization prevent obsolete publication. The
viewport retains the complete previous plane while contours prepare; contour
failure retains that scene and synchronized export reports the failure.

Focused local Chromium/WebKit checks pass: 16 controller race/ownership cases
and 10 actual GUI/WASM cases, with independent scalar values and cache Save/reopen.
Rust workspace 378 tests (365 scientific/support + 13 desktop), explicit desktop
13, fmt/strict Clippy, TypeScript/production frontend, and 23 packaging/connector
checks pass. A fresh source-built native debug app passes 40 authenticated
connector calls and two visually reviewed PNG exports, including real HOMO
updates/cancellation and cached-plane reopening. All **704 application browser
cases pass**, 352 per engine, with zero failures, skips, flaky cases or retries,
and all 422 source/input hashes unchanged. All 162 website checks pass; the
manual/AI/API guides and source-preview notice are synchronized. Final real HOMO
editor captures in both browsers confirm native stepping, retained focus and
cleared progress after completion. Scientific/WASM inputs match the previous
qualified snapshot (159 hashes); unchanged generated WASM was reused.
The website reports measured payload bytes instead of rejecting documentation
growth against an arbitrary 25 MiB threshold. Evidence and aggregate assertions
live in `tmp/plane-auto-update/FINAL.json` and adjacent logs/captures. Failed early
capture-harness attempts remain diagnostic records, not qualification passes.
The 422 qualified source/input hashes were rechecked unchanged before committing;
the completed suites were not repeated for unchanged sources. Issue #95 tracks
the accepted implementation and its delivery. Preserve the published 0.10.1 tag,
DOI and package identities and the user's running preview/tab. No scientific
Rust/WASM/format/dependency/profile/icon or allocation-policy changes. Linux and
clean-Mac qualification remain pending.

Standalone [`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) checkout.
Rust workspace, `app/`, `crates/`, `docs/`, `tools/`, and `fixtures/` live at the
repository root. There is no `next/` wrapper and no legacy C++ / Molekel build here.

EigenVista continues the original Molekel application developed by Ugo Varetto
from 2006 to 2010: [original source](https://github.com/ugovaretto/molekel) and
[original website](https://ugovaretto.github.io/molekel/). The current Rust and
TypeScript code is a new implementation of that project. Its later extraction
from the rewrite's `next/` subtree is repository provenance, documented in
[migration](docs/migration.md); it is not the project's historical origin.
Use `eigenvista-*` crates, the `eigenvista-convert` CLI, and `.eigenvista` for new
documents; older `.molekel` preview documents remain readable. Check
[preview-format](docs/preview-format.md) before changing format compatibility.

## Workspace boundaries

- The active development checkout is `/Users/ugo/projects/eigenvista`. All
  implementation, documentation edits, builds, tests, development servers,
  packaging, generated artifacts, and authorized Git changes belong here or in
  its subdirectories.
- `/Users/ugo/projects/molekel` is **read-only reference**, including its `next/`
  directory. Read or search it for historical context only. Do not edit files,
  build, run tests or development servers, write artifacts, or change Git state
  in that checkout.
- Explicitly set each development command's working directory to EigenVista or
  the appropriate subdirectory. Do not rely on an older chat's default working
  directory; resolve development paths against EigenVista, not Molekel. Historical
  instructions pointing to Molekel's `next/` are not the current work location.
- Use `/Users/ugo/projects/eigenvista/tmp` for temporary files and set `TMPDIR`,
  `TMP`, and `TEMP` to that directory before tools that create temporary files.
  Never use system `/tmp` or the reference checkout for temporary storage.

## Orientation

- [Fresh-session handoff](docs/session-handoff-2026-10-21_173143-AWST.md) and
  [restart prompt](docs/restart-prompt-2026-10-21_173143-AWST.md) - restart without the previous chat;
  recheck their dated Git, issue, and artifact snapshot before acting.
- [Handoff](docs/handoff.md) — current work, next gates, common traps.
- [Architecture](docs/architecture.md) — crate ownership and data contracts.
- [Development](docs/development.md) — full setup, build, test, acceptance steps.
- [Application control](docs/application-control.md) — opt-in external harness API,
  CLI, scoped files and jobs; preserve the normal GUI and scientific ownership.
- [AI connector guide](docs/ai-connector.md) — manual and agent-assisted setup,
  Codex/Claude Code/Pi/OpenCode/generic-agent use. The four prompt-driven tutorials
  live only in the website content modules, not as separate Markdown documents.
- [Docs index](docs/README.md) · [User guide](docs/user-guide.md) · [Status](docs/status.md)
- [User website](https://uvar-apps.github.io/eigenvista/) ·
  [Website maintenance](docs/website.md): static `site/` output, content, media and publishing.

## Release 0.10.1 published — 18 November 2026

The user authorizes commit/tag/push/publication with rebuilt redistributables,
tracked by [#93](https://github.com/uvar-apps/eigenvista/issues/93), including
accepted fixes #91/#92. Clean source `927a2962e8193b41918737ee34adbd2b7a545c29` is tagged `v0.10.1`.
Fresh local source checks pass: 365 workspace and 13 desktop Rust tests,
fmt/strict Clippy, production/native builds, 23 packaging checks and all
678 browser cases on 419 frozen hashes (339 per engine; zero failures/skips/
flaky cases/retries). Both browsers pass full 1AON SES and cache Save/reopen.
The final guide fix changes only three packaging-tool/test inputs; all 416
scientific/UI/test/fixture hashes remain unchanged, and all 23 packaging checks
passed again. The corrected clean package has independent extracted acceptance.

The clean optimized ZIP and companions are rebuilt and independently audited;
the actual extracted launcher/app/helper passed all 34 inspection methods,
184 calls and six reviewed PNGs, including full 1AON cache recovery.
Read current handoff/status for exact source, artifact bytes/hash and gaps.
Website validation passes all 162 cases; the release is published with all three
verified assets. All 90 served website files and nested404 match Pages deployment
44216922047. Issues #91/#92/#93 are completed. Read the living handoff/status
and issue #93 delivery ledger for exact evidence. Historical pre-publication
snapshots remain truthful records. Preserve tags, packages and capture provenance.

The user supplied version DOI **10.5281/zenodo.24328295** for 0.10.1 on
18 November 2026. Use it in current citation metadata and website content.
Concept DOI 10.5281/zenodo.24246123 identifies all versions; 24302658 identifies
0.10.0 only. Keep historical citation/package snapshots intact. This citation
follow-up does not move the existing tag or rebuild its assets. Keep scientific
profiles, pinned toolchain/dependencies and icon unchanged. No application CI. All relevant
local checks must pass before pushing. Later delivery/docs/site commits do
not change runtime code or retag/rebuild the qualified archive.

## Required local validation before pushing

User allocation policy, 17 November 2026 (#92): **never impose application
memory ceilings**. Attempt requested allocations and report actual allocation
failure. Do not reject files, fields, meshes, SES jobs, saved documents or API
transfers using arbitrary byte/count budgets; do not silently coarsen or truncate
them to fit. Use fallible allocation and checked arithmetic. Preserve scientific
validation, cancellation, atomic/no-clobber saves and prior accepted results.
Estimates are diagnostic information; never use them to reject a request or
reduce its requested resolution. Do not introduce or restore resource quotas
under the guise of defensive validation.
Actual address-space, numeric/index representation and device capabilities still
apply and must be reported accurately. This supersedes older preview-budget
requirements and any older instruction to retain resource quotas in this guide.
Historical release snapshots remain evidence of their original binaries.

Source correction **#92** (qualified 17 November 2026) implements this allocation policy across the
scientific, import, SES, persistence, UI and controller paths. Fresh source-built
native and both-browser large 1AON save/reopen checks pass; the final browser
suite passes 678 cases on 419 unchanged frozen hashes. GPU error/capability
checks belong at allocation/resize/upload/export boundaries, not ordinary
camera/damping frames. Preserve AO's exact physical state restoration. Read
the current handoff for commands, reused unchanged-Rust qualification, native
background/OS boundaries, earlier failed attempts and remaining delivery work.
That qualified snapshot was uncommitted. It is now included in the authorized
0.10.1 release preparation; the immutable 0.10.0 binary stays unchanged.

Source correction **#91** (qualified 17 November 2026) replaces the six-light scene rig with one
camera-axis headlight and neutral fill, removing repeated highlights/bands while
preserving camera-relative shading and matte molecular AO. Its accepted
implementation is included in 0.10.1; earlier no-release statements describe
the original qualification snapshot.
Read the latest handoff for its fresh frozen-source qualification. Released
0.10.0 package evidence below describes the immutable artifact, not this newer
source candidate. Preserve the user's unsaved preview tab.

Previous release (#90): the downloadable Mac package is **0.10.0**, with a
published GitHub release and synchronized website/download facts. The clean
optimized ZIP and actual extracted packaged launcher/helper are qualified;
all three downloaded release assets and all 89 served website files match.
This supersedes the earlier source-tag-only delivery. Preserve `v0.10.0`;
never retag it. Current package
identity and publication evidence belong at the top of the living handoff/status.
The source-tag update's full runtime qualification remains valid only while
the recorded runtime/test hashes match; fresh packaging and extracted acceptance
are independently required. No application CI or invented version DOI.

User policy, 14 November 2026 (tracked by #68): **all relevant checks must pass
locally before every push**, including feature branches, PR updates and releases.
Do not push unvalidated changes or defer verification to GitHub. Resolve failures
and complete the applicable checks before pushing.

- For runtime changes, run the full applicable verification sequence below:
  formatting, locked Rust tests, strict workspace/all-targets Clippy, explicit
  desktop tests, WASM/TypeScript/production build, the complete Chromium and
  WebKit suites, packaging checks, and relevant scientific, visual and native
  acceptance checks. Focused tests supplement the full affected suites.
- Validate the source being pushed. A later runtime or test change invalidates
  affected earlier results. Record exact commands, platform, results and remaining
  limitations; partial or interrupted suites are not passes.
- Current required platform validation is **local macOS only**. The user will
  provide two local Linux machines. Once access is available, add appropriate
  local Linux validation before pushing affected changes and document the
  machines/results. Until then, leave Linux qualification explicitly pending;
  do not infer it from macOS or historical hosted runs.
- GitHub CI is **not required** for pushing, merging or releasing. Do not start,
  retry, poll or wait for hosted jobs unless the user explicitly requests them.
  The application Verify workflow is manual-only; normal pushes and PRs do not start it.
- The user explicitly authorized the **Pages-only publisher** for the website
  on 15 November 2026 (#75). It uploads the prepared `site/` directory from
  `main`; it runs no application builds, tests or CI matrix. Website publication
  and its deployment readback do not authorize starting the Verify workflow.
- For documentation/configuration-only changes, run their relevant local checks
  (including links, syntax and consistency) before pushing. Existing full runtime
  results remain applicable only when the tested application and test sources are
  unchanged. Do not claim runtime checks were rerun when they were not.

This policy supersedes older hosted-CI merge requirements in dated documentation;
preserve those historical results as evidence of what ran at the time.

## Layout that is not obvious from names

- The public user website is maintained under `site/`, separately from the
  application. Edit authored HTML modules under `tools/site/content/`, regenerate
  with `node tools/site/build.mjs`, then run `node tools/site/check.mjs` and the
  local Chromium/WebKit `node tools/site/test.mjs` before pushing changes.
  Generated HTML is committed; GitHub only publishes `site/`. Preserve the real
  media/input/palette provenance, user-facing scope and current release facts.
  Content quality is the primary acceptance criterion: read every page and inspect
  featured images at full size and in desktop/phone layouts. Use meaningful
  molecular examples, preserve aspect ratios, keep pictured controls readable,
  and show the application's distinctive features prominently. Automated checks
  supplement this review.
  Keep the site synchronized with the user guide and actual UI; do not advertise
  future features or broaden platform/scientific qualification. See
  [website maintenance](docs/website.md) and current handoff for evidence.
  AI pages are authored in `ai.mjs`, `ai-quantum.mjs` and `ai-molecules.mjs` under
  `tools/site/content/`. Keep the shared installation/attachment prompts aligned
  with `docs/ai-connector.md`. For installed-app setup,
  distinguish the connector-enabled 0.8.0 package from older 0.7.2 downloads.
  Keep current setup instructions aligned with the packaged binary and preserve
  historical capture/version provenance.
  User-facing AI guides and prompts describe scientific/visual outcomes in
  ordinary language. Never require users to name internal methods, JSON keys,
  selectors or revision counters. The agent reads the separate technical API
  reference/skill and handles those details. Support every tutorial action through
  the shared controller, including palette and biological presentation changes;
  do not hand those steps back to the user as manual GUI chores.

- Previous application version **0.10.0**: The approved workspace and scientific
  inspection were merged through [PR #89](https://github.com/uvar-apps/eigenvista/pull/89).
  Preserve the existing annotated `v0.10.0` at
  `8ab5a0a1e12f7314c93b29745ea75e4c4f11b784`. Follow-up #90 explicitly authorizes
  the rebuilt Mac release, correcting the earlier source-only delivery. Its clean
  package source is `c27a8dcbf43b5bcf4b9c69ed8426c6ade32f1167`; all 300 archived
  application/scientific/fixture/vendor files match the tag. The archive includes
  corrected guides and the signed bundled AI helper/launcher. Record the actual
  release/publication state in the living handoff; download metadata must match
  the independently qualified 82,117,816-byte ZIP with SHA-256
  `479339c16f18022da86f860ece49f8c3ed39d2dcf27f221ecd0c0c9011048961`.
  Fresh packaging passes 336 Rust tests, 17 packaging-support and six connector
  checks; independent archive/signature/source/embedded-WASM audit passes.
  The extracted packaged launcher/helper passes 34 inspection methods through
  160 calls and five images; actual optimized GUI plane/pane/Zen/WebKit-fullscreen
  checks pass. All 234 frozen hashes still match the 646-case application suite;
  updated website passes all 162 browser cases. Preserve historical 0.8.0 assets
  and capture provenance. The 0.10.0 version DOI is **10.5281/zenodo.24302658**;
  that DOI identifies 0.10.0 only. New versions use their own supplied DOI or
  the concept DOI until one is available. The concept DOI
  10.5281/zenodo.24246123 identifies all versions; 0.8.0 retains its own DOI.
  Citation-only updates do not rebuild immutable packages or move tags.
  Keep #83/#85 open for the documented Save/SES limits; Linux,
  clean-Mac/Gatekeeper and full OS-range qualification remain pending. No
  application CI, compiler/dependency/profile/icon change or retag is implied.

- Published version **0.8.0** has local runtime, clean-source package,
  extracted-native connector, downloaded-asset and public website verification (#78–#81): shared controller, authenticated opt-in native connection,
  prebuilt helper, packaged launcher, self-contained instructions/examples and
  palettes, natural-language guides and four website-only tutorials. The user
  authorized commit/tag/push/publication and rebuilt redistributables. Check the
  living handoff/status for fresh qualification and publication evidence; do not
  substitute earlier source-preview checks for the actual extracted release.
  Source packages exclude protected private working documents before access.
  The normal GUI, scientific profiles, dependencies/toolchain and icon are unchanged.
  Read [0.8.0 notes](docs/releases/0.8.0.md) and the [connector guide](docs/ai-connector.md).

- Version **0.7.2** is published for background controls (#73),
  transparent PNG (#74) and optional MatterViz Muted/Pastel files. Immutable source
  `5f336b6a2d53dcb0db67dd5ed95956134a5a1e18`, annotated tag `v0.7.2`, is available at
  the [release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.2). Fresh local macOS checks passed:
  fmt, 272 default and seven desktop Rust tests, strict Clippy, WASM/TypeScript/
  production build, 13 packaging checks and all 526 browser cases (263 per engine;
  one worker; zero skipped/flaky/unexpected/retries). All 276 source hashes and
  Vite PID 26782 stayed stable. The rebuilt app/converter/ZIP, independent audit,
  qualified extracted-native retry, production checks and all three downloaded
  assets passed verification. The earlier native visibility failure is retained,
  with its cause unproven; see handoff/status for exact evidence and limits.
  `Palettes/` contains both JSON files, README and upstream MIT notice. The files
  use the existing picker, define elements 1–109 and leave elements 110–118 at
  built-in defaults. Background/palette choices remain session-only; science,
  profiles, defaults, dependencies, compiler and icon/logo are unchanged.
  The tag/source ZIP retain their truthful pre-publication snapshot; this later
  documentation-only record does not retag, rebuild or rerun unchanged runtime
  tests. Read the [0.7.2 notes](docs/releases/0.7.2.md) and current handoff/status.
  Earlier published releases and their artifacts remain unchanged.

- Version **0.7.1** is published for
  [#70](https://github.com/uvar-apps/eigenvista/issues/70): the visible
  **Document** section is renamed **Molecular data**. Only the displayed label
  and current UI documentation/selectors change; internal `document` panel IDs,
  preference keys, mounted state, Rust `Document`, Open/Save behavior and file
  profiles remain unchanged. Read the [0.7.1 release notes](docs/releases/0.7.1.md)
  and current handoff/status. Fresh local macOS checks passed: 272 default plus
  seven desktop Rust tests, fmt/strict workspace/all-targets Clippy, WASM/
  TypeScript/production build, 13 packaging checks and all 504 browser cases
  (252 per engine; zero skipped/flaky/unexpected/retries; one worker). The 275
  recorded source hashes and Vite PID 48452 stayed stable. The
  [0.7.1 prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.1)
  uses immutable source `a7037dc47063da59e5b22a9920dbe605bae54ded`.
  Clean-source app/converter/ZIP, independent artifact audit, extracted native
  startup, production captures and all three published/downloaded assets passed
  verification. Handoff/status retain exact identities and qualification limits.
  The tag/archive keep their pre-publication snapshot; later documentation-only
  records do not retag, rerun runtime tests or rebuild them.
  All relevant checks must pass locally before pushing under the policy above.

- Version **0.7.0** introduced Plan 007's metadata
  prerequisite and first four biological views, tracked by #62–#66 and merged
  through [PR #67](https://github.com/uvar-apps/eigenvista/pull/67) as `1e6881d`.
  Read the [0.7.0 release notes](docs/releases/0.7.0.md), current handoff/status,
  the [biological-view decision](docs/design/2026-11-14-biological-structure-views.md)
  and [verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
  for exact source, PR and local results. Fresh local macOS checks passed:
  272 default and seven desktop Rust tests, fmt/strict Clippy, WASM/TypeScript/
  production build, 13 packaging checks and all 504 browser cases (252 per
  engine, zero skipped/flaky/unexpected/retries). Release **v0.7.0** is published
  at the [release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.0),
  source `d414bc7c92f83b640a682d8c053b681b31667051`. The rebuilt Apple Silicon
  app/converter/ZIP, independent source/embedded-asset audit, actual extracted
  native startup and all three downloaded assets passed verification. Eighteen
  production browser captures passed across both engines. Handoff/status record
  exact artifacts, source, checks and qualification limits. The immutable tag/
  archive retain their pre-publication snapshot; later living-document updates
  do not retag or rebuild them. Current qualification remains local macOS only.
  The published 0.6.0 package predates these views and remains unchanged; source
  updates do not update installed apps.
  `Document.structure` is optional and indexes original selected atoms.
  Native files with metadata require `eigenvista-biological-structure-v1`;
  metadata-free documents retain the old encoding. Preserve frozen native
  inputs, hashes and scientific precision. Rust import/core owns biological
  interpretation and C-alpha continuity; Three.js owns bounded depiction
  extrusion. Respect source TER/chain/sequence breaks. Secondary assignments
  are deposited only; missing/ambiguous assignments remain explicit unknowns.
  Colors, subsets, focus and per-chain/component styles are session settings;
  global representation keeps its persisted view/dirty contract. Protein
  geometry stays outside the existing atom/bond AO target ownership and uses
  matte Lambert materials. Preparation uses a separate owned worker client,
  sends no quantum payload and preserves resident QC registration on nonfatal
  depiction errors. Replace `structure` when editing its metadata; color and
  visibility changes do not replace authoritative arrays or resample fields.

- Version **0.6.0** introduced #59 molecular screen-space ambient
  occlusion, retained in 0.7.0. That release synchronized all eleven own metadata
  values while preserving dependency/toolchain pins and scientific profiles. Read the
  [0.6.0 release notes](docs/releases/0.6.0.md), published
  [release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.6.0)
  and current handoff/status for exact source, artifact and verification evidence.
  Release source `6cb678c` was rebuilt, independently audited and published with
  all four release-head jobs passing. The older 0.5.15 package predates AO. Read the
  [AO decision](docs/design/2026-11-14-molecular-ambient-occlusion.md): only
  actual atom/bond instances participate, with owned MeshLambertMaterial
  replacements, no specular highlights and illustrative AO on both diffuse
  terms. The broad-fold renderer uses visibility exponent 6, GTAO sample
  parameter 32/distance exponent 2, denoise 8/radius 4/luma rejection 0.25 and
  full physical targets constrained only by actual device capabilities. The
  historical 0.6.0 binary capped targets at 1024; #92 removes that source quota. Automatic radius is 5% of the atom-coordinate box diagonal in
  angstrom, rounded to a quarter angstrom and clamped to 1.5–30 Å; memoize by
  atoms reference, independently of camera/fields. Manual radius spans
  0.25–50 Å. Preserve exact original material references on Off/zero/failure,
  field/custom-shader/depth/color isolation, session-only settings and the
  shared animation/PNG frame path. Dispose owned Lambert/pass resources before
  old-group disposal; do not mutate borrowed Standard materials or revive the
  prototype's program-refresh workaround. The earlier indirect-only head was
  visually rejected. Qualify actual-app 1AON as the primary visual case and
  retain 4PJ1 as secondary evidence. The feature was merged through #59/PR #60;
  release-head verification is independently recorded in living handoff/status.
  All four actual jobs passed before publication; do not substitute historical
  feature results for a future release's fresh checks.

  AO PNG verification has two bounded cases: A retains all three full-size
  desktop parity captures; B keeps the real browser window, toolbar, zoom/orbit,
  responsive resize, Fit and strength actions, but bounds only the real `.scene`
  render host to 240×128 → 160×160 CSS at DPR 2 (480×256 → 320×320 physical).
  Preserve all five original PNG samples and every pixel/identity oracle.
  Separate resource checks exercise sizes above the former 1024 ceiling, and actual-app tracked
  1AON remains the primary visual qualification. The published 0.6.0 inventory was
  466 tests, 233 per engine, including 10 AO cases per engine. The published
  0.7.1 inventory was 504 cases (252 per engine), adding 19 biological cases
  per engine; later inventory and verification are recorded above.
  Preserve all original cases and independent oracles. Keep the existing
  60-second per-test, 35-minute suite-step and 60-minute job limits with one
  worker. The failed combined case at head `04c8c919` is historical evidence;
  the merged split passed its final-head checks. Retain the existing limits
  when checking the release source.

- Version 0.5.15 includes #52 sidebar reordering within each existing pane.
  Dedicated handles support native drag, keyboard moves and tap controls;
  bounded profile order stays separate from expansion and molecular documents.
  Stable keyed DOM order retains control/shader state, progress and Cancel.
  Read [release notes](docs/releases/0.5.15.md), current handoff and status for
  published artifacts and completed verification evidence. Scientific
  data, file profiles, limits, precision, dependencies, compiler and icon/logo
  are unchanged by this release bump.
- Version 0.5.14 ships #55: volume visibility and the representative depth share
  the existing accumulated-alpha cutoff, with interpolation inside its crossing
  segment. Normal independent visibility/depth/prefix/cutoff tests cover both
  engines. Read [release notes](docs/releases/0.5.14.md), current handoff and
  status for artifact/verification evidence. Whole-ray opaque intersections
  remain approximate; scientific data, profiles, limits, precision, dependencies,
  compiler and icon/logo are preserved.
- Version 0.5.13 collects the native exit protection, corrected Molden limits,
  import/publication and typed-encoding improvements, authentic native-file
  compatibility fixtures, Vite maintenance, collapsible sidebar and research
  since 0.5.12. Read [release notes](docs/releases/0.5.13.md), current handoff and
  status for verification/artifacts. The historical 0.5.13 package lacks #55;
  version 0.5.14 includes that repair. Mesh compaction and isotropic resampling
  are not enabled. Rust 1.99.0,
  dependency locks, scientific profiles/precision and icon/logo are preserved.
- Version 0.5.12 collects the five repair batches after 0.5.11: validated native
  parameter export/shader controls, the pinned compiler, sampled preview quality,
  scoped worker cancellation/resident inputs, exact radius-bucket bonds and
  declared mmCIF links, BinaryCIF raw/gzip import, and current-frame PNG export.
  Current release/artifact verification belongs in `docs/handoff.md` and
  `docs/status.md`; keep dated 0.5.11 evidence and restart snapshots historical.
- Version 0.5.11 adds live calculation progress (#24). Rust sampling observers
  report actual completed z slices; optional WASM callbacks feed throttled worker
  events. The UI shows per-phase counts/percentage, field/batch position, and
  elapsed time. Meshing reports two signed passes, not internal cell progress.
  Preserve callback-free APIs, cache reuse, cancellation/stale-event guards,
  numerical results, and allocation limits. Tests live in
  `crates/eigenvista-core/tests/sampling_progress.rs` and
  `app/tests/progress.spec.ts`. Consult `docs/handoff.md` and `docs/status.md`
  for current release/artifact state rather than the dated restart snapshots.

- Version 0.5.4 fixes direct orbital/density previews (#15): choosing volume or
  raycast uses the worker's sampling-only operation, without marching cubes.
  Only explicit surface generation creates meshes. Keep field/resolution changes
  transactional on sampling success; cancellation/error must retain the prior
  preview and saved geometry. Regression coverage is in
  `app/tests/field-preview.spec.ts`; release evidence is in `docs/status.md`.

- Workspace members: `eigenvista-core`, `eigenvista-format`, `eigenvista-import`,
  `eigenvista-convert`, `eigenvista-wasm`, `eigenvista-control`, plus
  `app/src-tauri` (`eigenvista-desktop`).
  **Default members exclude the desktop shell** — `cargo test` alone is not a
  Tauri/shell check; use `-p eigenvista-desktop` when native behavior changes.
- Scientific logic (chemistry, import, format validation) belongs in Rust crates.
  `app/` is React + Three.js + worker glue; `eigenvista-wasm` is the bindgen bridge.
  Do not reimplement science in TS/shaders.
- `app/src/wasm/` is generated by wasm-bindgen and gitignored. Keep both
  `Cargo.lock` and `app/package-lock.json`.
- `fixtures/legacy/` is frozen data-only regression input (plus license), not app
  code. Never regenerate expected scientific results to make a test pass; independent
  references are deliberately generated offline (Python/PySCF), not at test time.
- `fixtures/native/` freezes authentic older/current Rust-producer archives and
  logical entry/semantic expectations. Normal tests must read those bytes, never
  manufacture compatibility input with today's encoder. Preserve producer
  provenance and native f64 signed-zero bits; browser JSON Save intentionally
  uses the separately documented zero-canonical contract. See its README before
  changing writers, source hashes, mesh layout, dtypes or profile identifiers.
- Native encoding uses a model-aware typed writer with exhaustive model
  destructuring. Keep its metadata keys, column-before-row emission, inline empty
  arrays, flat shapes and unsigned-to-f64 fallback aligned with the existing
  profile. Adding model fields requires updating this writer as well as Serde
  and TypeScript. Frozen inputs and the pre-typed edge hashes must not be
  regenerated to accommodate accidental drift. Source validation still uses
  core's existing JSON-based hashes; typed encoding does not optimize those.

## Commands (from the repository root)

Always first:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
```

Never use system `/tmp` for tests, screenshots, or build staging. Do not set
`CARGO_TARGET_DIR` to a foreign path (`tools/run.mjs` expects workspace `target/`).

One-time setup (Apple Silicon macOS is the exercised platform):

```sh
rustup show  # selects/installs Rust 1.99.0 plus declared components and WASM target
cargo install wasm-bindgen-cli --version 0.2.108 --locked   # must match the pinned crate
npm --prefix app ci
```

Day-to-day (invoke npm through `--prefix app`; wrappers live in `tools/run.mjs`):

| Command | Result |
| --- | --- |
| `npm --prefix app run dev` | WASM + Vite on `http://127.0.0.1:5178` |
| `npm --prefix app run build` | WASM, `tsc --noEmit`, production `app/dist/` |
| `npm --prefix app run desktop` | Tauri + Vite (same port) |
| `npm --prefix app test` | `cargo test --locked` for default members |
| `npm --prefix app run test:e2e` | generate `artifacts/references/` then Playwright |
| `npm --prefix app run test:packaging` | packaging support tests |
| `npm --prefix app run package:macos` | verified Apple Silicon tester ZIP under `artifacts/` |
| `cargo build --locked --release -p eigenvista-convert` | `target/release/eigenvista-convert` |

Focused checks:

```sh
cargo test --locked -p eigenvista-core                 # one crate
cargo test --locked -p eigenvista-format --test reference_roundtrips
cargo test --locked -p eigenvista-desktop              # Tauri shell only
cargo check --locked -p eigenvista-desktop             # lighter shell check
cd app && npx playwright test tests/camera.spec.ts     # one e2e spec (needs wasm + refs)
```

Required local verification order before pushing runtime changes (details and coverage map in
[development](docs/development.md#verification-commands)):

1. `cargo fmt --manifest-path Cargo.toml --all --check`
2. `npm --prefix app test`
3. `cargo clippy --manifest-path Cargo.toml --locked --workspace --all-targets -- -D warnings`
4. `cargo test --manifest-path Cargo.toml --locked -p eigenvista-desktop` (if shell/native)
5. `npm --prefix app run build`
6. `npm --prefix app exec -- playwright install chromium webkit` then `npm --prefix app run test:e2e`
7. `npm --prefix app run test:packaging` (and a full ZIP build if packaging changed)

## Traps

- Native close/quit protection spans `lifecycle.rs`, the macOS AppKit delegate
  hook, and `NativeExitGuard.tsx`. The default macOS Quit selector can bypass
  Tauri `ExitRequested`; keep the delegate hook and real native smoke checks.
  Preserve token resynchronization, synchronous document/dirty/activity refs,
  current-revision Save and conversion/native-save coordination. Browser IPC
  tests do not establish physical Cmd+Q or native file-dialog acceptance. See
  [the lifecycle decisions](docs/design/2026-11-11-native-lifecycle-and-molden-limits.md).
- BinaryCIF transport belongs in `eigenvista-import`, before UTF-8 dispatch.
  Keep actual-payload/shape/overflow validation before fallible allocation, the
  original input-byte digest, and shared core mmCIF scientific interpretation.
  String indices below the `-1` sentinel are errors; IntegerPacking produces
  signed Int32 values even when its packed words are unsigned. Preserve source
  float widths and Unicode dictionary boundaries. See the
  [BinaryCIF/capture decisions](docs/design/2026-11-06-binarycif-and-capture.md)
  and independently encoded [fixtures](fixtures/bcif/README.md).
- The viewport deliberately uses `preserveDrawingBuffer: false`. PNG export
  renders and reads synchronously in the same task. Transparent
  export enables renderer `alpha: true`, temporarily clears black with alpha
  zero, then restores the exact clear color/alpha and redraws the normal view
  in `finally`, including after encoding failures. Keep normal view alpha one
  and reuse the shared final-frame draw/AO path; never remove pixels by color.
  Asynchronous backbuffer reads are not reliable evidence: existing browser
  pixel tests use the compositor via `app/tests/scenePixels.ts`, with an
  independent PNG oracle. Preserve those original background/signed-color
  expectations; use a separate decoded-RGBA/compositing oracle for transparent
  output. Keep idle/camera/resize/signed-field export and visible-error recovery
  checks. Export adds no persistent capture target or scientific state.
- Bond queries use exact radius-bucket trees with each bucket's observed maximum;
  preserve pair cutoffs, deterministic ordering, explicit precedence, checked
  allocation and complete results without work/memory quotas. mmCIF declarations resolve only against selected source
  rows, with consistent label/author/alternate/insertion constraints. Keep raw
  connection provenance, type/order, loss reporting, and the conservative common-
  image policy; display rods do not imply bond orders or symmetry expansion.
  See the [bond/mmCIF decisions](docs/design/2026-11-06-bond-search-and-cif-connections.md)
  and independent real-file, brute-force, CLI, and browser regressions.
- Scientific worker clients own cancellation: App and Convert Files each keep a
  stable `createScienceClient()` instance. Keep pipeline generation/run tokens
  as well. The FIFO bridge posts one job; active cancel restarts blocked WASM
  while preserving other clients' queued jobs, and fatal failure rejects all.
  Use `addEventListener("messageerror", ...)`; Chromium does not dispatch the
  assigned `onmessageerror` property. See the
  [ownership/registration design](docs/design/2026-11-06-worker-ownership-and-registration.md).
- Registered scientific inputs are immutable snapshots. Replace the affected
  top-level `basis`, `orbitals`, `densities`, `grids`, `bonds`, or `provenance`
  array (or `atoms` / optional `structure` object) when editing; mutating nested values in place will
  not invalidate reference identity. Appearance/saved-mesh changes preserve
  these references. One worker-local Rust `RegisteredDocument` owns validated
  source data and one sampled field; registration IDs never replace persisted
  Rust source hashes. Worker restart/error requires fresh registration. Keep
  the legacy `SampledField` APIs/source checks and bounded disposal intact.
- Sampled preview quality (Draft/Standard/Fine) and custom shader transparency
  are session display settings, not scientific edits or persisted document
  fields. Preview min/max ranges are cached by immutable sampled-value buffer
  and dimensions; replace the buffer when changing values. Dispose both field
  and range textures when replacing scenes. See
  [rendering decisions](docs/design/2026-11-06-rendering-quality.md) and the
  adaptive-volume, volume-ranges, volume-quality-controls, and shader-transparency
  browser specs before changing marching or blending.
- Sidebar disclosures keep their bodies mounted. Expansion is a bounded profile
  preference, separate from `Document`, scientific worker inputs and dirty state.
  Keep Field rendering open while busy so progress and Cancel remain available.
  Preserve keyboard access, shader/form state and Open/Clear behavior; see
  `app/tests/panels.spec.ts`, `app/tests/panel-order.spec.ts` and the sidebar
  design records. Ordering is a separate bounded profile preference in
  `PanelSidebar.tsx`: retain fixed pane membership, stable React keys and actual
  DOM/tab order. Keep drag, keyboard and tap controls accessible; never use CSS
  order alone or remount scientific controls when moving sections.
- Save-contract research calls actual writers; image/full-volume probes are opt-in
  and confined to owned repository-local artifacts. File sync and atomic
  publication do not establish power-loss durability. Exclusive new CLI outputs
  require hard links and fail on the tested ExFAT volume; never add a direct-write
  fallback. See Plan 005 before changing save policy.
- #55 uses one aggregate-alpha cutoff (0.005) for volume visibility and the first
  representative depth, interpolated/clamped inside its crossing segment. Retain
  the alpha expression, final cutoff, raycast path and depth-write states. Normal
  volume-visibility tests use fixed independent alpha/depth/prefix expectations;
  no diagnostic shader is their oracle. A labelled depth-write-only capture is
  separate from production opaque-scene tests. The old opt-in reproducer lives
  in Git history; see the [decision](docs/design/2026-11-13-volume-visibility.md).
  Whole-ray color still does not clip at opaque depth inside the volume.
- #37 remains qualification-only: the production mesher still emits raw corners.
  The format example's `test = true` runs its exact-bit native self-check in the
  default/hosted suite; measurements are opt-in. Preserve the separately frozen
  `fixtures/indexed-mesh-qualification/` corpus and raw/custom-shader identity
  negative controls. See Plan 003 before implementing packing; unconditional
  automatic packing is NO-GO without a measured benefit and fallible-allocation/raw-result fallback policy.
- **Port 5178 is strict.** Keep [vite](app/vite.config.ts), Tauri `devUrl`
  ([tauri.conf.json](app/src-tauri/tauri.conf.json)), and both Playwright URLs
  ([playwright.config.ts](app/playwright.config.ts)) aligned if you move it.
  Playwright reuses an existing server — confirm it belongs to *this* checkout.
- **wasm-bindgen CLI version is pinned** to the crate (`=0.2.108`). Never update
  one side of the bridge alone; do not commit generated bindings.
- **`wasm32-unknown-unknown` must be installed for the toolchain you build with.**
  `rust-toolchain.toml` selects Rust 1.99.0 and its WASM target. An explicit
  `RUSTUP_TOOLCHAIN` overrides this selection; unset it for normal builds. Targets
  belong to their individual toolchains. If the target is
  missing for the active toolchain, `npm --prefix app run build` fails in the
  WASM step with `error[E0463]: can't find crate for 'std'` while every
  host-target check (`cargo test`, `clippy`) still passes — that host-only
  failure mode means a missing target, not a code defect. Inspect with
  `rustup target list --installed --toolchain 1.99.0` and fix with
  `rustup target add wasm32-unknown-unknown --toolchain 1.99.0`.
- Do not stop/restart the user's app or an unknown server. Check port ownership
  first; a server in another checkout is not this app.
- Treat imported documents as untrusted. Keep semantic validation, checked sizes/fallible allocation,
  source hashes, exact scientific data, and atomic-save guarantees intact.
- Exclude private `chat-*.md` and `*-chat-*.md` exports from reads, commits, and
  source packages (including titled chat exports at the repo root).
- UI/rendering changes are not verified by a compile or a screenshot file alone:
  run Chromium/WebKit e2e and actually inspect desktop/mobile screenshots, canvas
  pixels, and camera interaction. Screenshots land under `artifacts/` and can be
  overwritten by the second engine.
- Browser verification must wait for real worker results/checkpoints and UI
  publication completion, not stale success text or the first positive update.
  Cancellation evidence must identify the current worker/request before its
  result. Complete camera/draw work and expensive compositor captures before
  pixel assertions; keep GPU matrices independently bounded without dropping
  scenarios, timing samples, signs or thresholds. Use actual local results and
  preserve the traced configuration when requesting an optional hosted run; see the
  [browser-scheduling design](docs/design/2026-11-12-browser-verification-scheduling.md).
- The [Verify workflow](.github/workflows/verify.yml) is retained for explicitly
  requested manual hosted diagnostics. It is not a push, merge or release gate.
  Preserve pinned tools, local temporary storage, read-only permissions and bounded
  failure artifacts. Its browser projects retain one worker and the existing
  35-minute test-step/60-minute job bounds. See [CI](ci/README.md) and the required
  local-validation policy above. Local browser verification must pass both engines;
  one successful engine or a partially timed-out suite is not a full pass. Neither
  browser tests nor optional hosted runs establish physical macOS lifecycle/dialog
  acceptance or qualification of packaged Linux/Windows releases.
- Publication uses `eigenvista_format::validate_document` through the distinct
  WASM export, sharing exact semantic/entry/manifest/byte-relationship preflight
  with Save without ZIP compression. The older WASM `validate` remains model-only.
  Keep both contracts, source hashes and actual format-representation checks; never replace publication
  validation with only a mesh-size estimate. Zero-occupation Molden terms may be
  skipped only after full orbital validation; virtual orbitals stay in documents.
- This is a development preview, not v1 or the historical M0-M7 plan. Do not mark
  those complete from preview checks. Record evidence in `docs/status.md` and
  behavior changes in the user/architecture docs.

## Simple workspace pane (#88)

On 17 November 2026 the user selected a simpler IDE-style direction after the
initial GUI experiments. Read [the current design](docs/design/2026-11-17-simple-workspace-pane.md)
and living handoff. Normal startup uses one 480 px resizable pane,
selectable left or right, with four top tabs **inside the pane**: Molecule, Fields,
Surfaces and Appearance. Preserve the original header/footer/viewport controls,
collapsible widgets and drag/keyboard/menu reordering. Do not reintroduce the
earlier bottom/floating alternatives or a general docking framework for this scope.
The user approved this design. `?workspace=legacy` retains the old comparison
layout for reference and exact historical regression oracles; production
workflows must also be tested through normal startup. `?workspace=lab` remains
a compatible alias for the approved pane.

`WorkspacePane.tsx`, `useWorkspacePane.ts` and `workspace-pane.css` own this
presentation. Reuse `PanelStack` for actual keyed widget order, keeping the legacy
eight-ID stores, markup and drag payload compatible. Preserve one mounted
viewport and tool bodies, lazy quantitative activation, drafts and global
scientific cancellation. Zen/browser fullscreen remain independent. The original
636-case result and initial screenshots describe the earlier candidate; the
638-case result qualifies the subsequent opt-in simple pane. Both are historical
after default promotion. Use fresh current-source qualification in the handoff.
Layout itself adds no connector methods; scientific/controller operations remain
shared. The rebuilt 0.10.0 app has local macOS 27.0/arm64 UI acceptance for file
loading, the pane, real field-plane creation, Zen, WebKit fullscreen entry/exit
and the Cmd+Q guard. See the handoff for exact evidence. Native detached windows,
green-button fullscreen, multi-monitor use, assistive technology and the full
deployment-OS range remain unqualified.

## Issue-first workflow

- Before implementing a major change, open a GitHub issue in
  `uvar-apps/eigenvista` to track the work. Search existing issues first and reuse
  an applicable open issue instead of creating a duplicate.
- Use judgment to distinguish major from minor changes based on behavioral
  impact and risk, not line count. Bug fixes, new features, scientific or file
  format changes, and substantial refactors require an issue. Minor changes such
  as typo corrections, small documentation clarifications, or formatting-only
  edits generally do not. When uncertain, open an issue.
- Follow the existing [issue label taxonomy](docs/labels.md): one or more
  `area:` and `kind:` labels, and exactly one `priority:` label. Record the
  problem or goal, intended scope, and acceptance checks before implementation.
- Keep the issue updated with material scope changes, verification results, and
  the outcome. Reference it in commits or pull requests when those actions are
  authorized; an issue does not itself authorize committing or publishing code.

## Working agreement

- Inspect `git status`, branch, and relevant diffs before editing; preserve
  existing work. Stay on the current branch; do not branch/commit/tag/push unless asked.
- Keep the original Molekel checkout unchanged; historical material is linked at a
  pinned revision, not copied as current implementation.
- Preserve frozen fixtures and provenance.
- Keep `docs/handoff.md` up to date as the living development handoff. Before
  completing any significant change (including bug fixes, features, releases,
  architecture/toolchain changes, or new verification evidence), update its
  current version/revision, implementation state and decisions, verification
  results and gaps, relevant issue/artifact state, and remaining work as
  applicable. Record the update date, distinguish fresh checks from historical
  evidence, and reconcile stale current-state claims without rewriting history.
  Do not leave this maintenance to a later handoff request.
- Timestamped handoff and restart-prompt files are fixed historical snapshots,
  not living documentation. Preserve them; when a new snapshot is requested,
  create a new timestamped pair and update the entry-point links instead of
  overwriting an older snapshot, unless the user explicitly requests it.
- Documentation-only edits: verify links, commands, and agreement with status —
  do not claim runtime tests were rerun.
- Report tests actually run and remaining gaps.

[License](LICENSE) is GPL-2.0-or-later. Preserve notices and locked dependency
provenance; do not silently relicense.
