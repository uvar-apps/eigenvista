# Implementation status

Initial snapshot: 4 October 2026. Standalone repository: `uvar-apps/eigenvista`, initially on
`main`. Application source is at the repository root without legacy application
code. [AGENTS.md](../AGENTS.md) is the self-contained entry point. Temporary
storage remains repository-local ignored `tmp/`.

Start with the [documentation map](README.md), [user guide](user-guide.md),
[as-built architecture](architecture.md), or [agent handoff](handoff.md).

## Verification policy: 14 November 2026

### Local 0.9.0 checkpoint, 16 November 2026

The user authorized a local commit and annotated **`v0.9.0`** tag on
`codex/scientific-inspection`. This records the validated scientific-inspection
work and subsequent live-appearance/lighting corrections. It does not publish
0.9.0 or authorize pushing, a PR or merge. Main and published 0.8.0 assets remain
unchanged. The latest 614 application/162 website browser results below remain
applicable; checkpoint preparation changes documentation only.

### Balanced lighting user feedback, 16 November 2026 — validated

[#87](https://github.com/uvar-apps/eigenvista/issues/87) replaces the asymmetric
fixed key/hemisphere with six equal symmetric camera-following lights and neutral
ambient fill. Built-in mesh/raycast lighting shares the arrangement; custom
shaders retain their explicit lighting. Six new Chromium/WebKit multi-view
regressions, TypeScript and production Vite build pass. The complete application
suite passes **614/614 Chromium/WebKit cases** (22.7 minutes, no skips/retries),
with 259 runtime/test/dependency hashes unchanged through the run. The two old
independent illumination references now derive the new light analytically;
their original scientific/root/depth/compositing tolerances remain unchanged.
The earlier interrupted run is retained as a failed attempt. Website static
checks and all **162 website browser cases** pass; desktop/mobile manuals were
inspected. See the [handoff](handoff.md) for exact evidence and failed-candidate
history. Rust/native source is unchanged; no new native package, push, PR,
merge or release. The later local commit/tag authorization is recorded above.

### Post-bump SES user feedback, 16 November 2026

Saved molecular-surface color and opacity now update immediately through the
validated controller, with coalesced edits and no **Apply appearance** button.
**Rename surface** is separate. All 62 inspection/surface/field Chromium/WebKit
cases pass on this source, including actual 1CRN pixels, rapid and invalid input,
API synchronization and exact mesh/source preservation across reopening.
TypeScript, production Vite build and formatting pass. Regenerated website
static checks and all 162 website browser cases plus interactions pass. These fresh checks
supersede the earlier metadata-only identity claim for this UI component; the
prior 604-case application/native package qualification is historical.

SES/Van der Waals contact interference remains a documented presentation
limitation; choose Ball and stick or Liquorice for a clear overlay. Meshes and
display radii were not altered to hide it. A broader pending-inspection/GUI-Save
coordination gap is also recorded in #85. See the [living handoff](handoff.md)
for exact evidence and boundaries. These changes are included in the later local
checkpoint above; no new distributable or publication.

<a id="source-version-090"></a>

### Source version 0.9.0 (unreleased)

The user authorized this version bump on 16 November 2026, before personal
testing and any PR/merge. Workspace, npm, Tauri, current documentation and website
source labels now identify 0.9.0. The release notes are
[prepared but unreleased](releases/0.9.0.md). The published 0.8.0 release and
previous feature-test ZIP retain their original identities; there is no 0.9.0
release asset or version DOI. Citation metadata uses the concept DOI without an
unreleased date claim. Compiler, dependency versions, scientific profiles and
frozen inputs are unchanged.

Fresh local checks passed: 12 own version declarations plus CFF, locked Cargo
metadata, fmt, 336 default/eight desktop Rust tests, strict workspace/all-targets
Clippy, WASM/TypeScript/production build, 17 packaging-support tests and actual
rebuilt converter/control CLI version output. CFF passes its official 1.2 schema.
Website generation/static checks pass 27 pages/1,033 links; all 162 Chromium/
WebKit cases and interactions pass, with desktop/mobile images inspected.
Current-source and published-download facts are now represented separately.

The 257-file runtime/test identity check proves only five version-metadata files
changed from the qualified feature build; dependency pins, scientific code,
renderer and application tests remain identical. The prior 604-case app suite
was not repeated for this metadata-only change. No new 0.9.0 package was built.
Evidence is under `tmp/version-0.9.0/` and website `browser-M4Reep/`; complete
implementation evidence below retains its earlier version label. No commit,
tag, push, PR, merge or publication is authorized by this request.

### Active scientific-inspection implementation, 16 November 2026

[Plan 009](../plans/009-scientific-inspection-implementation.md) is implemented
on `codex/scientific-inspection`, based on main `6a728d918cfdf4291a6a04ae9327d668fd449283`,
with local qualification complete and user testing pending. Tracking: [#83](https://github.com/uvar-apps/eigenvista/issues/83)–[#86](https://github.com/uvar-apps/eigenvista/issues/86).
The user will test before authorizing any PR or merge. The original feature
qualification used 0.8.0 metadata; the subsequently authorized 0.9.0 preparation
is recorded above. The later local commit/tag checkpoint is recorded above; no
push or release is part of this batch, and the
published 0.8.0 artifacts remain unchanged.

New modules provide original-index selections and ordered geometry, annotations
and ligand neighborhoods, qualified Rust SES/SAS adaptation, and f64 field
descriptors/probes/planes/contours/profiles. GUI and connector operations share
validators, publication guards, cancellation, typed native persistence and
scoped CSV/PNG output. The [design record](design/2026-11-16-scientific-inspection.md)
documents the contracts and independent resource bounds.

Review repairs cover publication acknowledgement/late cancellation, a saved
neighborhood's own expected revision, idempotent union selection, explicit
per-mesh shader targets, original-index picking, bounded warnings, Unicode CSV
chunks, transactional label texture preflight and exact contour saddle signs
for extreme finite scalars. Further integration repairs make metadata loading
lazy without unmounting the form and keep omitted viewport-array props stable.
Two earlier full runs were interrupted on those defects; their logs remain
separate from the final successful run.

Final local macOS runtime checks pass: 336 default Rust tests, eight desktop
tests, formatting, strict workspace/all-targets Clippy, WASM/TypeScript/production
build, and **604 Chromium/WebKit cases** (302 per engine, 20.5 minutes, one worker,
no failures/skips/retries). All 257 monitored runtime/test files stayed stable.
Website checks pass 27 pages/1,030 references and 162 route/viewport cases plus
interactions; authentic figures were recaptured against final source without
changing their pixels. Packaging/extracted-native acceptance also passed: 17+6
packaging tests, 664 audited source files, exact vendored sources/notices and
embedded assets, all 34 inspection methods through 160 actual helper calls,
five inspected PNGs with measured alpha, independent numerical values, scoped
CSV/no-clobber, cancellation and save/reopen including renamed query provenance.
The local dirty-worktree test ZIP is
`EigenVista-0.8.0-apple-silicon-20261116T130036Z-6a728d9-dirty.zip`, SHA-256
`7395583e8608cfc1f960cf62e657b7af34587563a065f2bee0a27cf942c1f98d`.
Later changes update final documentation records only; runtime and packaged
assets retain their qualified identities. Main and the published release are
unchanged. Evidence lives under ignored `tmp/scientific-inspection/` and
`tmp/2026-11-15-website/browser-csxodm/`.

### Required validation policy

The user requires **all relevant tests and checks to pass locally before any
push**. Current verification is local macOS only. Two local Linux machines will
join verification when the user provides access; no current Linux qualification
is claimed. GitHub-hosted checks are not required for push, merge or release.
The retained workflow is manual-only and runs only when explicitly requested.

Dated hosted-CI requirements and results below preserve the earlier policy and
its evidence; they do not override this rule. This policy/documentation update
did not rerun application tests. The implementation results below remain the
record of the completed checks.

## Version citation: 16 November 2026

The 0.8.0 Zenodo DOI is [10.5281/zenodo.24273137](https://doi.org/10.5281/zenodo.24273137),
supplied by the user after release. DataCite confirms the registered software,
author/title/date and version-of relationship. Citation metadata is maintained
in the root `CITATION.cff`, README, website About/footer and 0.8.0 release notes.
The CFF file passes the official 1.2.0 schema. App sources, the existing tag and
release assets are unchanged; their full runtime results below remain applicable.
Local website checks passed all 138 cases/interactions, six additional citation
layouts, schema/syntax and documentation links. Published in commit `705cb35a2a69727ab959136b92c920ffa838b0ff` through the
[Pages-only publisher](https://github.com/uvar-apps/eigenvista/actions/runs/43825880869).
All 77 public HTTPS files (25,599,746 bytes) match the tracked local payload,
and the public `CITATION.cff` matches exactly. The existing GitHub 0.8.0 release
body now includes the DOI while preserving its previous content. Its ZIP digest
and annotated tag identities remain unchanged; no app rebuild, retag or hosted
application tests were performed.

## Source version 0.8.0

Published on 16 November 2026 after the user's release authorization. This is the first packaged
AI connector release (#78–#81), with the same visible document, worker and
renderer, opt-in authenticated native control, prebuilt helper/launcher and
standalone user/agent instructions. Metadata is 0.8.0 across Cargo, npm and Tauri.
Fresh local macOS 0.8.0 checks passed: formatting, 283 default Rust tests,
eight desktop tests, strict workspace/all-targets Clippy, WASM/TypeScript/
production build and all 546 Chromium/WebKit browser cases (273 per engine,
16.8 minutes; no failed/skipped/retried cases). All 190 monitored runtime source
hashes remained stable. Twenty packaging tests passed, including private-file
exclusion before access. The complete public documentation link scan passed
872 links, and installed-app setup prompts match exactly. Logs and hashes are
under `tmp/2026-11-16-release-0.8.0/`. Clean-source optimized packaging and
extracted-native acceptance have now passed. The independent audit matched all
572 source files to commit `f4ff87fab6e5d19bd3f93cafe0a30161d67ee6bd`, verified the
signed app and 13 connector files, and confirmed private-file exclusions. The
actual extracted bundle passed 74 helper calls, eight PNG exports, density and
128³ HOMO generation, native save/reopen, URL-fetched 1AON Pastel/AO and protein
cartoons. Original inputs remained unchanged; only owned test processes were
stopped and their private descriptors removed.

Rebuilt artifact: `EigenVista-0.8.0-apple-silicon-20261116T065542Z-f4ff87f.zip`,
78,396,448 bytes, SHA-256
`b9cc83b8fcd25179513a99ace879472c819b07efe56982c60480ce6912666a31`.
The app/converter/helper are optimized arm64 builds with verified ad-hoc
signatures and system-only runtime libraries. macOS 27.0 was exercised; macOS13
is the deployment target, not full OS-range qualification.

Final website checks pass: 23 pages, 854 local references, 62 image uses and
22 exact downloads. All 138 route/viewport cases and interactions passed in
Chromium/WebKit (`tmp/2026-11-15-website/browser-nXbckB/RESULT.json`). Historical
0.7.2 capture identities are preserved separately from current 0.8.0 downloads.
Published 16 November 2026 at **2026-11-16T07:07:15Z** as the experimental
[0.8.0 prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.8.0).
Annotated tag `v0.8.0`, object `b586a1ca1b15ddd539b94154724aad5f715cba53`,
resolves locally/remotely to `cd0e7f3f392dec9c92211b9731f4b1de9a5cc904`.
The clean binary source remains `f4ff87fab6e5d19bd3f93cafe0a30161d67ee6bd`;
the tag adds only verified release/website metadata. All 190 monitored runtime
files are identical to the fully qualified source. The published ZIP, checksum
and build JSON were downloaded and matched the local files byte for byte.

The Pages-only publisher completed successfully for the tagged release commit:
[deployment 43821665849](https://github.com/uvar-apps/eigenvista/actions/runs/43821665849).
All **77 public HTTPS files** (25,597,705 bytes), including every AI page, portable
instruction file, image, stylesheet and example, match the tracked local payload
exactly (`tmp/2026-11-16-release-0.8.0/public-site.json`). Twelve additional
Chromium/WebKit desktop/phone layouts and actual native PNG alpha checks passed.
Issues #78–#81 are closed with the
[release outcome](https://github.com/uvar-apps/eigenvista/issues/81#issuecomment-6909970380).
Optional in-app setup discovery remains low-priority research in #82.
No application hosted verification was started. Existing debug app 89325,
Vite 77799 and website server 97144 remain intact. Current platform qualification
is local macOS; no notarization or clean-Mac/full-OS-range claim is added.
See [release notes](releases/0.8.0.md). No earlier release is modified.

## Pre-release application-control evidence: 16 November 2026

The following entries preserve the checks and publication state before the
0.8.0 release request; use the current release section above for delivery state.

[Issue #81](https://github.com/uvar-apps/eigenvista/issues/81) replaces the earlier
developer-oriented installation guide with installed-binary setup. The app package
now stages a signed prebuilt helper, portable instructions, examples/palettes and
a system-tool-only launcher. A standalone extracted app passed 34 actual calls,
quantum rendering/save/reopen and URL-downloaded 1AON Pastel/AO rendering without
source or a development server; 19 packaging checks passed. The revised website
passed all 138 route/viewport cases and interactions, plus 18 targeted phone/
desktop checks. Static checks verify 23 pages and 22 exact-byte downloads,
including the three portable instruction files. See the
[binary setup handoff](handoff.md#standalone-binary-connection-setup-16-november-2026-local).
The currently published 0.7.2 app/ZIP still predates the connector-enabled package.

[Issue #80](https://github.com/uvar-apps/eigenvista/issues/80) extends the connector
to existing palette and biological presentation controls. The user rejected #79's
initial method-oriented prompts and manual GUI handoffs. All four website lessons
and the interaction guide now use ordinary requests, with internal commands
handled by the agent's separate technical reference/skill. Palette loading/reset,
biological colors, subsets, styles/focus and automatic AO radius are accessible
through the shared controller. Fresh local macOS qualification passed: 283 default
Rust tests, eight desktop tests, fmt/strict Clippy, production build, 13 packaging
checks, all 546 browser cases and 12 selected production API/representation cases.
Native replay passed 277 CLI calls, 19 PNGs and eight source-preserving saves;
the revised site passed 138 browser cases plus independent desktop/phone text
and visual review. All 212 monitored source hashes stayed unchanged. See the
[current handoff](handoff.md#natural-language-workflows-and-presentation-control-16-november-2026-local).

[Issue #79](https://github.com/uvar-apps/eigenvista/issues/79) adds the
[connector installation/user guide](ai-connector.md) for Codex, Claude Code, Pi,
OpenCode and generic local agents, plus seven AI website pages containing four
website-only tutorials. Local site checks passed: 23 pages, 138 Chromium/WebKit
route/viewport cases and all interactions. Live native replay verified the four
workflows and seven representations; see the
[documentation handoff](handoff.md#initial-connector-guide-and-ai-website-tutorials-16-november-2026-local)
for the initial evidence and limits, superseded by #80's qualification above.
These changes are uncommitted and unpublished; the
released 0.7.2 package still does not include the connector.

[Issue #78](https://github.com/uvar-apps/eigenvista/issues/78) adds an opt-in shared
application-control API, authenticated native JSON-RPC connector, Rust
`eigenvista-ctl` client, external harness and coding-agent skill. The existing
document/worker/renderer owns operations; the normal GUI adds no console or
controls. This is uncommitted source after `d48a811`, with version metadata still
0.7.2. Published 0.7.2 applications and ZIPs remain unchanged and do not include it.

Fresh local macOS checks passed: fmt, 282 default Rust tests, eight desktop tests,
strict workspace/all-targets Clippy, WASM/TypeScript/production build, all 540
Chromium/WebKit browser cases (270 each; zero skipped/flaky/unexpected/retries)
and 13 packaging checks. Actual native CLI/harness, auth/file/FIFO negatives,
independent saved-document validation and PNG alpha/composition checks passed.
Ten selected production API cases also passed, five per engine; the two
development-only direct-WASM cases were outside that production smoke.
Normal startup exposed no automation listener/global, and its 74 controls match
the prior inventory. Native test processes used verified-PID signal cleanup;
physical normal GUI exit was not requalified. Linux and signed-package
qualification remain pending. See [handoff](handoff.md#shared-application-control-api-16-november-2026)
for evidence and [application control](application-control.md) for usage/limits.

## Source version 0.7.2

Published **2026-11-15T07:05:08Z** as a development
[prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.2). Annotated tag `v0.7.2`,
object `911cc11b72662eca31cbf18609176de95e9d943a`, resolves locally/remotely
to source `5f336b6a2d53dcb0db67dd5ed95956134a5a1e18`, based on main `979324c`.
Issues [#73](https://github.com/uvar-apps/eigenvista/issues/73#issuecomment-6890841183)
and [#74](https://github.com/uvar-apps/eigenvista/issues/74#issuecomment-6890841431)
are closed with final release ledgers. See [release notes](releases/0.7.2.md).

The release adds scene background controls, transparent PNG export and optional
MatterViz Muted/Pastel files through the existing atom-color picker. `Palettes/`
contains both JSON files, README and unchanged upstream MIT notice. The 109
original RGB entries per palette and elements 110–118 default fallback were
verified. Scientific data/file profiles, built-in palette, dependencies/compiler
and icon/logo are unchanged.

Fresh local macOS checks passed: fmt, 272 default Rust tests, strict workspace/
all-targets Clippy, seven desktop tests, WASM/TypeScript/production build and
13 packaging checks. The full browser run passed 526/526, 263 per engine, with
one worker and zero skipped/flaky/unexpected/retried cases. The summary completed
at 2026-11-15T06:45:19.078Z; report duration was 943.97 seconds (15.7 minutes).
Reference generation exited zero first; all 276 source hashes and Vite PID 26782
remained unchanged. All local acceptance completed before the release push.
The completed feature verification below remains a separate earlier record.

The rebuilt app/converter/ZIP, independent source/asset audit, qualified native
retry, production UI, tag/publication and downloaded assets passed verification.
All three server-reported sizes/digests and complete downloaded bytes matched:

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| `EigenVista-0.7.2-apple-silicon-20261115T065014Z-5f336b6.zip` | 46,406,211 | `02541f40e5f59ff5381c07605947ef4cff590213256b2dbc67f608e21a7b0937` |
| `EigenVista-0.7.2-apple-silicon-20261115T065014Z-5f336b6.zip.sha256` | 126 | `6f8183755b282ce78389f6571f3d174cc035f878c44ee2cd82e7e0ff0fd29ffb` |
| `EigenVista-0.7.2-apple-silicon-20261115T065014Z-5f336b6.json` | 1,463 | `cc04eb8b791dea6017e702ec384b2dbaabbc42f4fe3ec0b067665312979c9b0b` |

The ZIP is under `artifacts/distributions/`, staging at
`tmp/eigenvista-package-h7HDta`. Built on macOS 27.0 for arm64 with minimum
macOS 13.0, system-only runtime links, ad-hoc signing and no notarization.
Independent audit verified 411 source Git blobs/modes, 66 payload files, five
actual embedded production assets and all four `Palettes/` files. Extracted
CLI/recovered WASM checks passed four examples, four BinaryCIF controls, four
biological views, four microheterogeneity controls and four frozen native inputs.

Production checks passed 18 real-file captures, nine per engine, plus each
engine's three signed PNG modes and two actual extracted palette imports/reset.
The transparent/opaque composites had maximum 8-bit channel difference 2 and
mean below 0.034; wrong-background controls were rejected. Selected production
images were visually reviewed. Actual production assets match the signed app.
The owned diagnostic server PID 55140 was stopped; port 5189 was free and the
user's Vite PID 26782 remained running.

The first native probe `native-startup-fb0GGQ` lost on-screen visibility while
the process stayed alive; its retained failure does not qualify as a pass and
its cause is unproven. The exact unchanged-helper retry `native-startup-ULdTyD`
passed with owned PID 54972, its 1320×860 on-screen layer-zero window and five
seconds alive/on-screen, without helper activation. Only owned children were
signaled for cleanup. This does not qualify physical native dialogs/loading/
image downloads/Cmd+Q, clean-Mac/Gatekeeper/HiDPI or the full deployment-OS range.

Evidence under `tmp/2026-11-15-release-0.7.2/` includes
`local-acceptance-before-push.json`, `artifact-audit-result.json`,
`root-native-review.json`, `production-views-result.json` and
`publication-verification.json`. The tag/source ZIP keep their truthful
pre-publication snapshot. This later documentation-only record does not retag,
rebuild or rerun unchanged runtime tests; release-note bytes remain fixed.
Current qualification is local macOS only; future local Linux hosts await access.
No hosted CI was requested or used. The published 0.7.1/older releases remain
unchanged; catalog #71 and accessibility-palette #72 remain open.

## Background and transparent-PNG feature verification: 15 November 2026

15 November 2026: local implementation of
[#73](https://github.com/uvar-apps/eigenvista/issues/73) and
[#74](https://github.com/uvar-apps/eigenvista/issues/74) completed in the source
0.7.1 working tree based on main `979324c`, before the later 0.7.2 release request.
This feature pass did not create a branch, commit, tag or release. The published
0.7.1 binaries and source tag predate these controls and remain unchanged.

The viewport gains a session background color picker/reset with `#e8edef` as
the default. Normal image export retains `eigenvista-view.png` with the selected
opaque background. A separate image/download icon exports
`eigenvista-view-transparent.png` with real PNG transparency, including
antialiased and translucent foreground alpha. The shared synchronous draw/encode
path uses renderer `alpha: true` and `preserveDrawingBuffer: false`; transparent
capture restores the exact clear state and redraws the normal view in `finally`,
including after encoder failure. Camera, geometry, worker inputs, scientific data,
document/dirty state and file profiles are unchanged.

Fresh local macOS checks passed: fmt, 272 default Rust tests, strict workspace/
all-targets Clippy, seven desktop tests, final WASM/TypeScript/production build
and 13 packaging checks. Focused background/export cases passed 22/22; the later
combined camera/background check passed 30/30. The qualifying full browser run
passed 526/526, 263 per engine, with one worker and zero skipped/flaky/unexpected/
retried cases. Its summary completed at 2026-11-15T06:12:16.039Z after about
15.4 minutes (923.92 seconds). Reference generation exited zero first; all 276
source hashes and the existing Vite PID 26782 remained unchanged.

An earlier full attempt was stopped after the obsolete five-button mobile-toolbar
assertion failed in both engines. It remains partial evidence, not a pass. The
camera test now verifies all eight named controls, bounds and pairwise non-overlap
at the same 390/320 px widths; existing zoom actions and scientific/pixel oracles
are retained. The fresh complete `attempt-2/` run is the qualifying result.

Actual desktop/mobile UI and PNG foreground/transparency were reviewed. Independent
RGBA/compositing checks cover zero/fractional/opaque alpha, white atoms, selected
background, mesh/raycast/volume, AO and failure restoration/retry. Evidence under
`tmp/2026-11-15-background-export/` includes
`attempt-2/full-browsers-summary.json`, `focused-browser-review.json` and
`visual-review.json`. The published-release evidence below remains historical.
No new package or native image-download qualification is claimed. See the
[user workflow](user-guide.md#moving-and-inspecting-the-scene) and
[architecture](architecture.md) for the display/capture contract.

## Source version 0.7.1

Published **2026-11-14T13:24:03Z** as a development
[prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.1).
Annotated tag `v0.7.1`, object `d471bf83e9750c05fe35a73fa554202e9ab1a434`,
resolves locally/remotely to source
`a7037dc47063da59e5b22a9920dbe605bae54ded`, based on main `6ace2f5`.
[#70](https://github.com/uvar-apps/eigenvista/issues/70) is closed; see the
[final evidence ledger](https://github.com/uvar-apps/eigenvista/issues/70#issuecomment-6877940064).
Version 0.7.1 renames
the visible Document section to **Molecular data**. Its internal panel/profile
IDs and remembered UI state remain stable. Rust `Document`, Open/Save behavior,
file formats, scientific data, limits, dependencies/compiler and icon/logo are
unchanged. See [release notes](releases/0.7.1.md).

Fresh local macOS fmt, 272 default Rust tests, strict workspace/all-targets
Clippy, seven explicit desktop tests, WASM/TypeScript/production build and
13 packaging checks passed. The full browser suite passed 504/504, 252 per
engine, with zero skipped/flaky/unexpected/retries and one worker. The summary
completed 2026-11-14T13:12:41Z after about 14.7 minutes of browser execution;
reference generation exited zero before Playwright. All 275 source hashes and
the existing Vite PID 48452 stayed stable. These are fresh results for the
renamed UI and updated selectors; 0.7.0 results below remain historical.

The clean-source app/converter/ZIP, independent asset/source audit, actual
extracted native startup, production UI, annotated tag, publication and downloads
passed verification. All three server-reported sizes/digests and fresh downloads
matched the local candidates:

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| `EigenVista-0.7.1-apple-silicon-20261114T131547Z-a7037dc.zip` | 46,381,687 | `2f8a433fb3f89dd2ef1cdfaafcf6e785ab7187793eca7fd61ff5ee2f0951f1b1` |
| `EigenVista-0.7.1-apple-silicon-20261114T131547Z-a7037dc.zip.sha256` | 126 | `d260df9ff6c6938ac5a8ec488ef8573919ec5bf00703c504700b1dee5d223f15` |
| `EigenVista-0.7.1-apple-silicon-20261114T131547Z-a7037dc.json` | 1,463 | `4eb312297350fb7a2cc51ada9252c6f12b052dae8e716a5f781725483dbeda06` |

The ZIP is retained under `artifacts/distributions/`, staging at
`tmp/eigenvista-package-e3aNeg`. Built on macOS 27.0 for arm64, deployment minimum
macOS 13.0, with system-only runtime links, ad-hoc signing and no notarization.
Independent audit verified 405 eligible source Git blobs/modes, all 62 payload
files and five production assets embedded in the actual Mach-O. The new title is
present, with internal panel key/id `document` unchanged. Recovered WASM and the
extracted CLI passed four examples, four BinaryCIF controls, four biological
views, four microheterogeneity controls and four frozen native inputs. Three
direct guide image/provenance links retain exact committed bytes; no broad
nested offline-link qualification is claimed.

Eighteen production-browser captures passed, nine per engine, plus two separately
inspected Molecular data heading captures. Actual production assets match the
signed app. The extracted native executable passed startup with its own on-screen
layer-zero 1320×860 window and five seconds alive after validated activation.
Only owned child PID 54406 received SIGTERM; the user's Vite PID 48452 was
preserved. This does not qualify physical native file dialogs/loading/Cmd+Q,
clean-Mac/Gatekeeper/HiDPI installation or the full deployment-OS range.

Evidence under `tmp/2026-11-14-release-0.7.1/` includes
`metadata-native-audit.json`, `full-browsers-summary.json`,
`audit/run-20261114T131920290Z-a7037dc/REPORT.json`,
`native-startup-result.json`, `production-views-result.json` and
`publication-verification.json`. The tag/archive keep their pre-publication
snapshot. This later documentation-only record does not retag, rerun unchanged
runtime tests or rebuild those binaries; release-note bytes stay unchanged.
Current qualification remains local macOS only; the future two local Linux hosts
await access. No hosted CI was required or used.

The published 0.7.0 release/source/assets and all older records remain unchanged.
Updating source does not update a previously installed app or existing archive.

## Source version 0.7.0

Published **2026-11-14T11:43:29Z** as a development
[GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.0).
Annotated tag `v0.7.0`, object `d587bf48709ac4a22d98f9d11e7e809643d9b287`,
was verified locally/remotely at source
`d414bc7c92f83b640a682d8c053b681b31667051`. The release includes biological
views and optional metadata from [PR #67](https://github.com/uvar-apps/eigenvista/pull/67),
merged main `1e6881d`, and the guide-image packaging repair #69.
See the [release notes](releases/0.7.0.md).

Fresh automated local macOS verification passed: 272 default Rust tests, seven
desktop tests, fmt, strict workspace/all-targets Clippy, WASM/TypeScript/production
build and 13 packaging checks. The full browser run passed 504 cases, 252 per
engine, in 15.7 minutes with zero skipped, flaky or unexpected results and zero
retries, using one worker. All runtime, test, fixture and generated-WASM hashes
remained stable; Vite PID 48452 was
preserved. These are fresh versioned-source results, separate from the earlier
biological implementation checks below. Eighteen production-browser captures
passed, nine per engine, for full tracked 1AON, 4PJ1 and 1CRN. Actual production
assets match the signed app; appearance was inspected. Hosted CI was not required
or used for this release.

The rebuilt app/converter/ZIP, clean-source and embedded-asset audit, actual
extracted native startup and annotated-tag/publication/download checks passed.
Retained ZIP is under `artifacts/distributions/`; staging is
`tmp/eigenvista-package-jwYnQO`. All three published assets have matching GitHub
digests and fresh downloaded bytes:

| Asset | Bytes | SHA256 |
| --- | ---: | --- |
| `EigenVista-0.7.0-apple-silicon-20261114T112514Z-d414bc7.zip` | 46,375,930 | `24e21458a0567c03db6623f584d29e904dd7232ca7bf72b1a6417ca9f2e2c5b7` |
| `EigenVista-0.7.0-apple-silicon-20261114T112514Z-d414bc7.zip.sha256` | 126 | `2c2297e33f141376aef8953bfb6a8e723c2e337f3f4039f323cda291c1c86e70` |
| `EigenVista-0.7.0-apple-silicon-20261114T112514Z-d414bc7.json` | 1,463 | `ba1bde18f591be690f65b62a386b906c93b75d5d2afb9eceabd5c7e314357c48` |

Build host is macOS 27.0, arm64 target with system-only runtime links, deployment
minimum macOS 13.0, ad-hoc signing and no notarization. Independent extraction
verified 404 eligible Git source blobs/modes and all 62 payload files. The actual
Mach-O embeds the exact production assets; recovered embedded WASM matches the
extracted converter on four examples, four BinaryCIF controls, four biological
views, four microheterogeneity controls and four frozen native inputs. Source
privacy exclusions were checked without reading protected/private originals.

[#69](https://github.com/uvar-apps/eigenvista/issues/69) adds the existing guide
illustrations/provenance to the tester payload. Their three direct offline guide
references resolve inside the extracted payload with exact committed bytes.
Only these direct guide links are qualified; nested provenance backlinks and
other older offline links are not broadly certified.

The actual extracted native app passed startup after PID-validated activation:
its own on-screen layer-zero 1320×860 window appeared and the process stayed
alive for five seconds. Initial off-screen-window observations/failure are
retained; no app patch was made. Only the owned PID 33158 received SIGTERM,
and the existing Vite PID 48452 was preserved. This does not establish native
file-dialog/molecular-loading/Cmd+Q interaction, clean-Mac/Gatekeeper/HiDPI
installation or the full deployment-OS range.

Evidence under `tmp/2026-11-14-release-0.7.0/` includes
`package-result.json`, `artifact-audit-result.json`,
`audit/run-20261114T112941787Z-d414bc7/REPORT.json`,
`native-startup-result.json`, `production-views-result.json` and
`published-release-verification.json`. The tag/source archive retain their
pre-publication snapshot. This later documentation-only record does not retag,
rerun runtime tests or rebuild those binaries. Current qualification is local
macOS only; access to the future two local Linux machines is still pending.

The previous 0.6.0 release remains available with its original source/assets,
and predates biological views. Changing source versions does not update an
installed app or an existing ZIP. Scientific precision, limits, dependencies,
compiler and logo remain unchanged; biological metadata uses its explicit native
capability while metadata-free files keep their old profile.

## Biological structure views: first four roadmap additions

14 November 2026. The user authorized the metadata prerequisite and first four
additions in [Plan 007](../plans/007-molecular-visualization-roadmap.md):
chain/entity coloring, chain/component selection and mixed views, protein
traces/tubes, and ribbons/secondary-structure cartoons. Issues
[#62](https://github.com/uvar-apps/eigenvista/issues/62)–
[#66](https://github.com/uvar-apps/eigenvista/issues/66) track work on
`codex/biological-structure-views` from main `d098380`. See the
[decision record](design/2026-11-14-biological-structure-views.md) and
[verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
for the exact source, actual PR/merge identity, complete local results and
historical hosted observations for [PR #67](https://github.com/uvar-apps/eigenvista/pull/67),
merged as main `1e6881d`.

The optional biological native feature is explicit; metadata-free encoding,
scientific hashes, numerical precision, dependencies and compiler stay
unchanged. Protein secondary assignments come from deposited records, with
missing/conflicting assignments left unknown. This implementation phase kept
version 0.6.0; the separate published 0.7.0 release is recorded above. The
previously published 0.6.0 binary/ZIP predates these additions.

Pre-bump local macOS implementation checks passed: 272 default Rust tests, seven explicit
desktop tests, fmt, strict workspace/all-targets Clippy, WASM/TypeScript/production
build and 13 packaging checks. Forty focused browser cases pass across Chromium/WebKit,
including independent geometry and source-identity controls, clean native Save,
actual worker ownership/cache validation and exact field/custom/AO-OFF/PNG
invariants. Both engines completed nine real-application captures of full
1AON/4PJ1/1CRN inputs; actual shapes and the revised chain palette were inspected.
The complete local browser suite passed 504/504 (252 per engine, including the
unchanged original 233 each), with zero skipped, flaky or unexpected results.
The linked ledger retains complete outcomes. Every future push requires all
relevant local tests and checks to pass under the policy above; hosted results
are not a push, merge or release requirement.

The initial `10e7fe0` run passed 500/502 and caught the old primary atom-label
format regression. That format and the fixed status/canvas bounds are restored
with the old test unchanged. Final review also found valid mmCIF monomer
alternatives rejected by new metadata validation. Both identities now remain
selected, with explicit ambiguous-position backbone breaks and new native,
import/topology and real-browser regressions. A related partial-identifier
counterexample at `80a6eb1` required independent label/author ambiguity guards;
972 presence scenarios and native browser diagnostics cover the correction,
with positive controls retaining distinct canonical positions. Both earlier
heads are superseded; the ledger records fresh final outcomes.

The metadata-free large-structure tests keep their original three-array and
8 KiB manifest assertions. A separate BIO test proves unchanged original
numeric descriptors/entries plus one bounded atom-to-residue column. Valid
mixed namespace aliases are distinguished for display without rewriting source
identity. Source-index selection, long valid residue identifiers and original
color overrides are covered. No old scientific/native fixtures were regenerated.
Two early PDB regressions were corrected with existing assertions preserved.
Native GUI/clean-Mac installation and coordinate-derived secondary prediction
remain separate, unclaimed qualification work.

## Source version 0.6.0

Published 2026-11-14T04:30:30Z at the [0.6.0 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.6.0).
Annotated tag `v0.6.0` (tag object `2dad43d2bb680e5f24e953e638848ea589583eda`) resolves to
immutable release source `6cb678ca5d386cddec974365b50671798b5361d4`. The release-source tag and package retain
that commit; this later living-document update does not retag or rebuild them.

All four actual release-head jobs passed in [run 43554003208](https://github.com/uvar-apps/eigenvista/actions/runs/43554003208): Linux
232 Rust tests plus fmt/strict Clippy, Mac seven desktop tests, and Chromium /
WebKit 233 cases each (reported suite durations 29.4 / 13.8 minutes; zero skipped/flaky/unexpected).
Local release checks passed 241 Rust tests, fmt/strict Clippy, 13 packaging tests
and production builds. Pre-bump AO results remain separate historical evidence.

Rebuilt Apple Silicon tester ZIP: `artifacts/distributions/EigenVista-0.6.0-apple-silicon-20261114T035445Z-6cb678c.zip`, **45,664,199 bytes**, SHA256
`39814fa1ccc756d2812cd46c4a4a1390b72fbb9607756547c9ba44f481fa18b2`. The release also carries its `.zip.sha256` companion and
`EigenVista-0.6.0-apple-silicon-20261114T035445Z-6cb678c.json` build metadata. Fresh downloads of all three published assets were
verified. The retained build staging is `tmp/eigenvista-package-zqccTd`.

Independent extraction/audit verified 371 eligible Git/source blobs, 59 payload
files with matching bytes/modes, seven conversion probes and exact embedded
production JS, worker, CSS and WASM. AO v5 / visibility exponent 6 positive
controls and the old 0.5.15 negative control passed. Signing is ad-hoc, not
notarized; binaries are arm64 with system-only dynamic links and declared macOS13
minimum. These checks do not establish native GUI/clean-Mac/full-OS-range or
general scientific qualification.

Evidence is retained under `tmp/2026-11-14-release-0.6.0/`. The archived source
records its truthful pre-publication preparation state; living docs now record
verified publication. Dependencies, compiler, scientific/file profiles, fixtures,
renderer behavior and icon/logo were preserved by the version bump. Existing
documents need no migration.

The base was merged main `bf98802` / [PR #60](https://github.com/uvar-apps/eigenvista/pull/60),
closing #59. The shading-selector discussion was closed without changing controls.
All eleven own metadata values and six inherited Rust package versions are 0.6.0.
Historical 0.5.* sections and dated restart snapshots retain their original facts.

## Molecular ambient occlusion: 14 November 2026

[#59](https://github.com/uvar-apps/eigenvista/issues/59), developed on
`codex/molecular-ssao` through [PR #60](https://github.com/uvar-apps/eigenvista/pull/60),
adds optional **Lambert shading + SSAO** for atoms and bonds, without specular
highlights. The user supplied the original Molekel broad-cavity reference and
requested **1AON** for testing. The
[decision](design/2026-11-14-molecular-ambient-occlusion.md) records actual owned
Lambert materials, molecular-scale Auto/manual radius, bounded full-physical
GTAO targets, exact borrowed-material restoration, deferred diagnostics and
field/final-frame isolation. Published 0.5.15 predates the feature.

Fresh local verification passes **100/100 browser cases** in **194.985 seconds**,
zero skipped/flaky/unexpected: 20 AO, 72 unchanged camera/PNG/field/transparency/
sidebar and eight unchanged palette checks, both Chromium and WebKit. Normal
inventory is **466**, 233 per engine across 39 files. Actual instanceof Lambert
and exact borrowed-reference controls complement a positive legacy gloss signal.
The new directional/hemisphere-light test uses a declared deeper pocket with
independent cosine visibility 0.6445 and an unobstructed camera ray; its existing
12-luma/15% contrast gates remain unchanged (43.8%/43.95% observed). Original
ambient, field, resource and dense geometry controls are preserved. Comparing
two positive strengths on the same Lambert materials separates AO from removal
of highlights. Auto checks cover the small-molecule clamp, manual 50 Å and a
new two-atom import with independently expected automatic 10 Å.

The five PNG/compositor samples are retained in two independent cases: three
full-size desktop idle/repeated/zoom captures, then a bounded interaction/
resize/Fit/zero case. Only the latter’s test render host is constrained
(240×128 desktop→160×160 mobile CSS at DPR 2, actual 480×256→320×320 buffers);
real window sizes/toolbar, actions, pixel thresholds, 32-idle/240-frame guard and
60-second per-test limit stay unchanged. The 1024-cap resource test and actual
unmodified 1AON desktop/mobile UI checks cover their separate contracts.

Positive custom/volume/opaque-cover controls, exact Off/zero PNGs and picking,
complete decoded Save equality and zero appearance-related worker posts,
physical PNG/compositor parity, real ON-first cycling, capped allocation/
disposal and dense512 instancing pass. Labelled FBO and actual receiver-link
fault injections verify direct recovery/retry without claiming physical GPU
exhaustion. Existing references, deadlines and assertions were not weakened.
Production WASM/TypeScript/Vite, final strict TypeScript/Prettier and **13
packaging tests** pass. Earlier in this feature, **234 default Rust tests**,
fmt and strict workspace/all-target Clippy passed; their Rust sources and pins
remain unchanged. All four actual final-head hosted jobs remain required before
merge; actual results and merge state are linked from #59/PR #60.

Primary real-file evaluation uses tracked **1AON.cif**, SHA256
`6b202f340ffb9a1924d5315ce9e837e02cee1dbd745df675be76f6d4e1b8e66f`,
all **58,870 atoms**, automatic **14.25 Å** radius, through actual App/UI on
WebKit/Apple GPU. Root inspected default/side-orbit Lambert-only versus full-AO
pairs and actual desktop/mobile controls against the supplied visual reference.
Broad recessed regions darken clearly while exposed atom colors remain.
The explicitly labelled Lambert-only diagnostic forces only the observed
molecular AO-strength GL uniform to zero while retaining actual Lambert; real
UI weak/full settings then positively restore the observed 0.05/1 values.
Default-fit/desktop Off restoration is byte-identical, with no page/GL errors.

Large side/mobile poses are visual qualification, not exact-restoration passes.
A separate bounded same-task GPU observation found **957 changed pixels between
two Off exports before AO was ever enabled**, with model-view delta **1.14e-5**;
projection/viewport stayed identical. Initial-Off/restored-Off also had different
model-view transforms. This establishes a changing-camera precondition in the
rotated comparison independently of AO. Preserve the initial failed hash
reports; no exact-pixel threshold or normal camera gate was relaxed. The normal
strict camera/export tests and default real1AON exact checks pass separately.

Unchanged **4PJ1 (65,963 atoms/66,610 bonds)** remains secondary current
Lambert-only/AO visual proof at automatic16.25 Å. Attachment payload is bounded,
but total GPU memory, FPS, all-device navigation and physical native-GUI
acceptance are not established by these checks. Earlier prototype timing and
software-backend probes are historical and do not qualify this more expensive
32-sample/full-resolution mode. It remains an approximate on-screen depth cue;
existing whole-ray field intersections are unchanged.

Evidence: `tmp/2026-11-14-molecular-ssao/revision-local-summary.json`,
`revision-visual/final100-report.json`, frozen source hashes, primary1AON
reports/captures, the public matrix diagnostic and secondary4PJ1 images. The
initial indirect-only candidate `a6b58f3` was visually rejected (<1/255 mean
luma change); its hosted run also had an unchanged density-heartbeat failure.
Neither is used as the current gate. Subsequent [run 43479687125](https://github.com/uvar-apps/eigenvista/actions/runs/43479687125)
at `04c8c919` passed Linux 232, Mac seven and WebKit 232, but Chromium 231/232
hit the unchanged 60-second limit in the combined AO PNG case. Its first three
1000×1042 desktop captures matched exactly; slow drag/resize left Fit pending.
The scoped split/bound above addresses the measured test scheduling cost,
without changing production rendering or weakening a pixel/deadline oracle.
All diagnostic failures remain recorded; actual new-head four-job success is
required independently.
No release/tag/archive rebuild, scientific/profile/precision/limit change,
dependency/compiler update, fixture change or logo change belongs to this task.
Original review/reference/private files and historical releases are preserved.

## Version 0.5.15

Published 13 November 2026 at 15:18:27 UTC, including merged PR #58's
[#52 sidebar reordering](design/2026-11-13-sidebar-reordering.md). All eleven
own version values and current user/agent guides agree on 0.5.15.
[Release notes](releases/0.5.15.md) describe within-pane drag, keyboard/tap access,
profile persistence and retained control/calculation state. Dependencies,
compiler, scientific data/profiles/precision/limits and icon/logo are unchanged
by the version bump. The existing #55 fix remains included.

Release source `cf39343c0a53c9ca1e162cf47b1f2eca2bd8392e` and annotated `v0.5.15` are pushed. The
[GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.15) is published with its ZIP, checksum and
build metadata. Remote annotated-tag object
`694bc8ce5a138d7d7f2d234ece7295d90e1b4eb8` resolves to that source; exact notes,
all three asset names/sizes/digests and independently downloaded bytes match
the verified local outputs. This post-tag living-document record does not move
the tag or rebuild the unchanged release binaries.

All four actual release-head jobs pass in
[run 43445458328](https://github.com/uvar-apps/eigenvista/actions/runs/43445458328):
Linux **232 Rust tests**, Rustfmt and strict workspace/all-target Clippy;
macOS **seven desktop tests**; Chromium **223/223** (26.9 minutes) and WebKit
**223/223** (20.0 minutes), with **13 packaging tests** and production
WASM/frontend builds per browser job. No skipped, flaky, unexpected results or
timeouts. Fresh local checks pass **241 Rust tests** (234 default plus seven
desktop), fmt, strict Clippy, 13 packaging tests and optimized app/CLI plus
production WASM/TypeScript/Vite builds. PR #58's earlier verification remains
separate baseline evidence, not a substitute for this release-head run.

ZIP: `artifacts/distributions/EigenVista-0.5.15-apple-silicon-20261113T144337Z-cf39343.zip`
(**45,615,151 bytes**). SHA-256:
`ee9b49963b2a3fae3655c12075f048bafde9e25cd77337ea2badf17781375132`.
The `.zip.sha256` and same-stem `.json` are alongside it. Build metadata records
version 0.5.15, clean source `cf39343`, arm64, minimum macOS 13/build host 27.0,
Rust 1.99.0, Node 26, wasm-bindgen 0.2.108, cargo-about 0.9.1, ad-hoc signing
and no notarization. Rebuilt app:
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.

The packager verifies source stability, architecture/system runtime links,
strict app/CLI signatures, extracted bytes/modes and example roundtrips.
Independent audit matches all **366** complete eligible Git blobs/modes and
**59** payload files, with original-review/private-export exclusion. Seven
actual extracted-converter inputs (water PDB/XYZ/Molden, signed-affine cube and
raw/gzip/policy BinaryCIF) retain full release-WASM parity and clean native
reopen. The 1crn inputs retain 327 atoms, 337 bonds and three declared connections;
policy retains four atoms and one bond.

Stored Brotli bytes inside the actual extracted signed Mac executable decode
exactly to `assets/index-CVwiJmls.js` and the fresh release WASM. The archived
PanelSidebar source equals the reviewed implementation; its compiled profile,
drag and keyboard-control markers occur in that exact embedded JS. The old
0.5.14 app lacks the new sidebar identity and fails the negative control without
being executed or modified. Embedded production JS SHA-256:
`912c35f8b09896b34fbc558381644b0736dacccede980b2ab669e11124c98a56`.
Embedded WASM SHA-256:
`705c14da16e7a9da5aab90c47bd97875cec8520d3c2c43264d5c8f91789d71fa`.
This is static source/build/embedding evidence, separate from GPU results and
native GUI qualification.

Evidence: `tmp/2026-11-13-release-0.5.15/`, including local verification,
`audit/REPORT.json`, exact-head CI proof/raw logs and
`published-asset-verification.json`; staging remains at
`tmp/eigenvista-package-CU6Rrj`. The untracked original review is preserved;
its process-only source exclusion changes no persistent Git configuration.
Previous tags/archives, release notes and private exports are unchanged.
Whole-ray opaque intersections, native-save/ExFAT support, physical native
interactions, clean-Mac/Gatekeeper/HiDPI installation, Linux/Windows packages,
general scientific/rendering and power-loss qualification remain separate
limitations/gates. This remains a development preview, not v1 completion.

## Sidebar reordering: 13 November 2026

[#52](https://github.com/uvar-apps/eigenvista/issues/52) was implemented on
`codex/sidebar-reordering` after release 0.5.14 and merged through
[PR #58](https://github.com/uvar-apps/eigenvista/pull/58) as main `e471cbd`.
The
[decision](design/2026-11-13-sidebar-reordering.md) defines within-pane order,
profile persistence, stable mounted controls and drag/keyboard/tap access.

Fresh focused Chromium/WebKit verification passes **38/38**, zero skipped, flaky
or unexpected results: nine new ordering cases plus ten existing panel cases per
engine. This includes real trusted drag events in both directions/before/after,
cross-pane/header rejection, actual visual/DOM/focus order, touch moves,
Open/reload and bounded/denied/full storage, exact decoded Save and zero worker
requests, same shader/file/error nodes and cancellation of the same unfinished
request after moving busy Field rendering. Cocoa WebKit uses the independently
verified Option-Tab convention; hosted non-Cocoa traversal still uses plain Tab.

Fresh local **234 default Rust tests**, fmt, strict workspace/all-target Clippy,
production WASM/TypeScript/Vite and **13 packaging tests** pass. Independent
source/test/doc review is clear. Expanded and reordered desktop/mobile captures
are inspected. The unchanged camera/direct-preview/shader regressions pass
**20/20**, including actual pixels and wheel/button/middle-drag camera changes:
**58/58 local browser checks** overall. Normal discovery is **446** (223 per
engine, 38 files). All four actual reviewed-head jobs passed at `0473c1b` in
[run 43440036206](https://github.com/uvar-apps/eigenvista/actions/runs/43440036206):
Linux 232/fmt/Clippy, macOS seven, Chromium 223 and WebKit 223, plus packaging
13/builds. #52 is closed through the merge. Local evidence is
`tmp/2026-11-13-sidebar52/`.

No release/version, dependency, toolchain, format, scientific or logo changes
were part of the implementation issue. The separate 0.5.15 release includes
the feature. The original untracked review and private exports are preserved.

## Version 0.5.14

Released 13 November 2026 from merged main `c30a916` (PR #57). This release
ships the [#55 volume visibility/depth fix](design/2026-11-13-volume-visibility.md).
All eleven own version values and current guides agree on 0.5.14. External
dependencies, compiler, scientific data/profiles/precision/limits and icon/logo
are unchanged by the version bump. [Release notes](releases/0.5.14.md) describe
the repaired behavior and retained whole-ray opaque-intersection limitation.

Release source `1c37e34f7533e025c02342fbe89a6b887de19fe5` and annotated `v0.5.14` are pushed. The
[GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.14) is published with all three verified assets.
Remote tag identity, exact release notes, asset names/sizes/digests and all
three independently downloaded asset hashes match the verified local outputs.
This post-tag documentation follow-up records completion without moving the tag.

All four actual release-head jobs pass in
[run 43429204710](https://github.com/uvar-apps/eigenvista/actions/runs/43429204710):
Linux **232 Rust tests**, Rustfmt and strict workspace/all-target Clippy;
macOS **seven desktop tests**; Chromium **214/214** (19.7 minutes) and WebKit
**214/214** (13.3 minutes), with all 26 new and 13 affine cases per engine,
**13 packaging tests** and actual production WASM/frontend builds in each
browser job. No skipped/flaky/expected failures. Fresh local release checks
pass **241 Rust tests** (234 default members plus seven desktop), Rustfmt,
strict Clippy, 13 packaging tests and optimized app/CLI plus production
WASM/TypeScript/Vite builds. The prior PR #57 results remain separate baseline
evidence, not a substitute for this exact release-head run.

ZIP: `artifacts/distributions/EigenVista-0.5.14-apple-silicon-20261113T125509Z-1c37e34.zip`
(**45,597,944 bytes**). SHA-256:
`398591c604e70628f15229e82a585b261c677a3d8922424e3ffd4257fc0bad93`.
The `.zip.sha256` and same-stem `.json` are alongside it. Build metadata records
version 0.5.14, clean source `1c37e34`, arm64, minimum macOS 13/build host 27.0,
Rust 1.99.0, Node 26, wasm-bindgen 0.2.108, cargo-about 0.9.1, ad-hoc signing
and no notarization. Rebuilt app:
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.

The packager verifies source stability, architecture/system runtime links,
strict app/CLI signatures, extracted bytes/modes, PDB/XYZ/Molden/cube examples,
signed cube meshes and converter/native/WASM roundtrips. Independent audit
matches **362/362** complete eligible source blobs and Git modes, all **59**
payload files, original-review/private-export exclusion, extracted versions/
signatures and actual raw/gzip/policy BinaryCIF full-document release-WASM and
native-reopen parity (327 atoms, 337 bonds, three disulfides; policy four atoms,
one bond).

The actual extracted Mac executable embeds stored Brotli assets whose decoded
bytes exactly match `assets/index-W06H4doM.js` and the fresh release WASM.
Its shader fragment matches archived/current source exactly, contains the
cumulative visibility marker and lacks the old per-segment gate. The old
0.5.13 app correctly fails this new identity control. Fragment SHA-256:
`daf366852f9426043ac24d87a5ed6944bb9aac54bf65bb63f0c96530a6c74bb4`.
Embedded WASM SHA-256:
`1e9cce01d2fb019952ee99759c5fe2f4f229b7c784471891bd875df8b81b9462`.
This is byte-level embedding evidence, separate from GPU tests and native GUI
or clean-Mac installation qualification.

Evidence: `tmp/2026-11-13-release-0.5.14/`, including `audit/REPORT.json`,
`audit/embedded-negative-control.json`, exact-head CI raw logs, local checks and
published/downloaded asset proof. Staging remains at
`tmp/eigenvista-package-jcaTVc`. The original review is untracked and
byte-identical; its process-only source exclusion changes no persistent Git
configuration. Previous release tags/archives and private exports are preserved.
Physical native interactions, clean-Mac/HiDPI installation, Linux/Windows
packages, general nonlinear accuracy and scene-depth-clipped compositing remain
separate gates; this development preview does not establish v1 completion.

## Volume visibility and depth: 13 November 2026

Implemented #55 on `codex/fix-volume-visibility` from main `5114cdc`, after the
0.5.13 release. The old per-segment marker threshold could discard a visibly
opaque aggregate at finer quality. The shader now uses its existing aggregate
cutoff 0.005 for both display and representative depth, with within-segment
optical interpolation/clamping. Alpha integration, raycast, grid/scientific
identity, cache policy, filtering/skipping, precision and limits are unchanged.
The [decision](design/2026-11-13-volume-visibility.md) defines the exact policy
and retained whole-ray opaque-intersection limitation.

The fresh unchanged-shader baseline preserves four failed tests and **16 wrong
results among 40 production observations**. Promoted fixed-oracle controls all
pass after the repair. The focused final-source run passes **78/78** in 173.2
seconds, zero skipped/flaky/unexpected tests: **52 new normal cases** with 154
bounded GPU draws plus **26 unchanged affine/tent cases** with 56 draws. It
covers signs, qualities, isotropic/anisotropic grids, actual manual/hardware
filtering, independent opacity/depth, real opaque plane/sphere/mesh scenes,
camera-inside and near clamping, empty/faint prefixes and sensitive below/above
visibility-cutoff controls. Expected values never come from a patched shader.
Depth-write-only diagnostics are labelled separately from production depth tests.

The opt-in probe/config and predicate counterfactual are retired from current
source; the original evidence remains in Plan 006 and tagged v0.5.13 history.
All old affine/tent expectations, ROI and numerical budgets remain intact.
Normal discovery totals **428** (214 per engine); full actual hosted PR-head
results and existing UI/camera checks are recorded through
[#55](https://github.com/uvar-apps/eigenvista/issues/55) before merge. All four
jobs must pass. Fresh local Rustfmt, **234 default Rust tests**, strict workspace/
all-target Clippy, production WASM/TypeScript/Vite and **13 packaging tests** pass.
Raw source identities, failures, metrics and captures remain in
`tmp/2026-11-13-volume55/`; the original review/private exports are preserved.

Version stays 0.5.13. Its published tag/ZIP are unchanged and predate this source
fix. No new native package, physical native/clean-Mac qualification, general
nonlinear accuracy, scene-depth clipping or v1 completion is claimed.

## Version 0.5.13

Released 13 November 2026, collecting PRs #44/#45/#49/#50/#53/#56 since 0.5.12.
All eleven own version values across Rust workspace/lock, npm metadata/lock and
Tauri, plus current user/agent guides, agree on 0.5.13. External dependencies,
compiler, scientific profiles/precision/limits and logo are unchanged by the
release bump. [Release notes](releases/0.5.13.md) describe shipped changes and
known #55; compaction and isotropic resampling remain research-only.

Release source `8c09db29981023a95f855a41a079e831dc84a9ff` and annotated `v0.5.13` are pushed. The
[GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.13) is published with the ZIP, checksum and
build metadata. Remote tag identity, exact published notes, GitHub asset
sizes/digests and all three independently downloaded asset hashes match the
verified local outputs. This post-tag documentation record does not move the tag.

All four actual release-head jobs pass in
[run 43402898985](https://github.com/uvar-apps/eigenvista/actions/runs/43402898985):
Linux **232 Rust tests**, formatting and strict workspace/all-target Clippy;
macOS **seven desktop tests**; Chromium **188/188** (16.8 minutes) and WebKit
**188/188** (13.2 minutes), with all 13 new analytic cases per engine, no skips,
and **13 packaging tests** plus production WASM/frontend builds in each browser
job. Fresh local checks pass **241 Rust tests** (234 default members plus seven
desktop), Rustfmt, strict Clippy, 13 packaging tests and the optimized app/CLI
and production WASM/TypeScript/Vite build. Superseded builds/runs remain labelled
separately; they are not the final release gate.

Verified ZIP: `artifacts/distributions/EigenVista-0.5.13-apple-silicon-20261113T093740Z-8c09db2.zip`
(**45,586,584 bytes**). SHA-256:
`35a502024e3df91bccfa17b914aa2aeb351fa185d9007021c992a45697373418`.
The `.zip.sha256` and same-stem `.json` are alongside it. Build metadata records
clean source `8c09db2`, arm64, minimum macOS 13/build host 27.0, Rust 1.99.0,
Node 26, wasm-bindgen 0.2.108, cargo-about 0.9.1, ad-hoc signing and no
notarization. The rebuilt native app is
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`; production
frontend is `assets/index-CiOIz4aM.js`.

The packager verifies architecture, runtime links, signatures, source stability,
all extracted payload bytes/modes, PDB/XYZ/Molden/cube examples, signed cube
meshes and converter/native/WASM roundtrips. Independent audit checks **358/358**
complete eligible source blobs and Git modes, all **59** payload files, no private
exports/original untracked review, and actual extracted raw/gzip BinaryCIF
conversion (327 atoms, 337 bonds, three retained disulfides), policy input
(four atoms, one bond), full release-WASM parity and clean native reopen.
The original review stays untracked and byte-identical; its process-only source
exclusion changes no persistent Git config. Evidence is retained in
`tmp/2026-11-13-release-0.5.13/`, including `audit/REPORT.json`, exact-head CI
raw logs, local verification and published/downloaded asset proof. Package
staging remains at `tmp/eigenvista-package-QQwgNK`.

Known #55 is documented in the release notes/user guide; #41 remains a P3 policy
and platform investigation. #43 is closed as investigated. Clean-Mac/Gatekeeper,
physical native dialogs/shortcuts, HiDPI, Linux/Windows distributions, general
nonlinear rendering and power-loss durability are separate qualification gates.
The tester release does not establish v1/M0–M7 completion.

## Save and anisotropic-rendering research: 13 November 2026

From main `a3d71d0` on `codex/save-and-anisotropy-research`, #41/#43 add research
probes, independent regressions and reports only. Production behavior and 0.5.12
release artifacts are unchanged. [Plan 005](../plans/005-native-save-contract-research.md)
records actual APFS/ExFAT/CLI/parameter saves, bounded races, complete-file reader
observations and independently confirmed full/read-only failures. The APFS
integration rerun independently observes one of 12 unique winners, 188 complete
old and 206 complete new reads, and `0640` to `0600` replacement. ExFAT new CLI
outputs fail explicitly without hard links; existing replacements succeed.
Ordinary visibility is not power-loss durability; parent synchronization,
permissions policy and unqualified platforms keep #41 open at P3.

[Plan 006](../plans/006-anisotropic-rendering-research.md) records **26 passing
normative browser cases** across both engines: independent constant-alpha,
linear-field crossing/color/depth and equal-memory thin-feature controls,
1,200 profile comparisons and four signed-tent checks. No anisotropic metric
defect is established within this bounded envelope; no grid policy changes.
#43 closes as investigated through the research PR. The investigation confirms
**[#55](https://github.com/uvar-apps/eigenvista/issues/55), P2**: increased volume
quality can make an aggregate-visible field blank, including on isotropic grids.
The separate opt-in four-test probe intentionally fails; it retains 40 baseline
observations (16 wrong) and 20 causal diagnostic observations (zero wrong).
Its in-memory predicate change is not a qualified product fix or oracle.

Fresh local integration passes **234 default Rust tests + seven desktop = 241**,
Rustfmt, strict all-target workspace Clippy, production WASM/TypeScript/Vite and
**13 packaging tests**. Independent parent APFS and focused GPU reruns agree.
Normal browser inventory is **376**, 188 per engine. All four actual hosted
results at the reviewed head are required before merge; see the research PR
linked from [#43](https://github.com/uvar-apps/eigenvista/issues/43).
Raw JSON, captures, initial failures, source identities and logs remain under
`tmp/2026-11-13-research41-43/`. No crash/power-loss, Windows/network filesystem,
physical native dialog or universal nonlinear/GPU qualification is claimed.

## Sidebar disclosures and mesh qualification: 12 November 2026

From merged main `2f7aeec`, [PR #53](https://github.com/uvar-apps/eigenvista/pull/53),
developed on `codex/collapsible-panels-and-mesh-qualification`, implements #48 and qualifies
#37 without enabling production mesh compaction. Version remains 0.5.12; existing
release/tag/tester ZIP artifacts are unchanged.

All eight sidebar sections collapse with accessible heading buttons and mounted
bodies. Bounded profile preferences survive Open/Clear/reload and storage
failures. Controls, field/material/shader state, scientific worker inputs,
dirty state and saved document data are preserved. Busy Field rendering stays
open with progress/Cancel accessible, then restores the preference. Reordering
is tracked in #52. See the [sidebar decision](design/2026-11-12-sidebar-disclosures.md)
and updated user guide/architecture.

The [native driver](../crates/eigenvista-format/examples/indexed_mesh_qualification.rs),
[new frozen corpus](../fixtures/indexed-mesh-qualification/README.md) and browser
shader checks qualify exact six-f64-bit tuple sharing and marker-only raw
vertex-order/IBO reconstruction. Native checks cover signs, skew/reflection,
normal seams, signed zero, large-origin precision and old arbitrary indexed
Save. Browser checks use actual production material construction, WASM/worker
Save, bounded real GPU draws and application Open/custom shader/Save/reopen,
with compact and reflected naive-expansion negative controls.

All **36 isolated optimized native processes** succeed: three fresh processes
for each of nine workload/method pairs, plus nine separately labelled single
publication probes. Retained numeric **and capacity** bytes fall
4,432,272→1,058,064 for H2 and 4,577,040→1,258,032 for water's 31 meshes. H2
extraction still dominates requested peak at about 33.82 MB. Water sorted
median RSS falls 14,270,464→11,714,560 bytes; a near-limit no-sharing synthetic
control instead rises 107,216,896→219,332,608 sorted or 458,457,088 hashed bytes.
The [full result/decision](design/2026-11-12-indexed-mesh-qualification.md) records
all three RSS samples, actual raw capacities and overlap, first/later retained
passes, publication probes, input/source/binary identities and limitations.

**NO-GO for unconditional automatic compaction.** #37 stays open with
`needs-research` for a concrete production memory budget and benefit-before-output
raw-fallback design, then actual worker, shader-expansion and publication gates.
The 512 MiB prototype bound is research-only. Raw extraction, old-file limits,
f64 precision, hashes, profiles, production renderer/writer/dependencies and
`fixtures/native/` are unchanged. No browser/WASM/GPU memory bound, maximum-cap
extraction benchmark or universal OOM recovery is claimed. Existing source-hash
JSON allocations remain #40; #38 transport work stays deferred.

Focused sidebar checks pass **20/20 Chromium/WebKit cases**, plus four refreshed
animation-settled desktop/mobile captures inspected by the implementation and
reviewing agents. **10/10 shader/persistence cases** pass across both engines:
raw/restored differs by zero pixels, compact by 17,281–17,385 pixels, and
reflected naive expansion by 17,379–17,385 pixels. Actual Chromium reports
ANGLE/SwiftShader; WebKit reports Apple GPU. Real application captures were
inspected, and all 17 native archives/five original semantic documents were
independently byte-verified after lossless gzip packaging.

Fresh **239 Rust checks** pass: 232 default-member tests, including the new
example's native self-check now enabled by `test = true`, plus seven explicit
desktop tests. Rustfmt, strict all-target Clippy, production WASM/TypeScript/Vite,
debug native build and 13 packaging tests pass. Consult
[PR #53](https://github.com/uvar-apps/eigenvista/pull/53) for the full **350-case**
browser run and actual hosted results; these are
separate merge gates, and all four hosted jobs at the reviewed head must pass
before merging. Raw measurements,
traces, initial test-harness corrections and captures are under
`tmp/2026-11-12-panels-mesh37/`. Preserve the untracked original review and private
exports. #47 is closed at the user's request: existing native container layout
meets the asset-layout goal.

The initial hosted [run 43240917646](https://github.com/uvar-apps/eigenvista/actions/runs/43240917646)
at `a95ee3f` failed the combined browser step's **global 35-minute timeout**.
It logged 318 starts (175 Chromium/143 WebKit), without an explicit assertion
or individual-test timeout. Reporting was interrupted; exact final pass counts
are unavailable. Rust 230, desktop seven and packaging 13 passed. Original logs
and the checksum-verified 22,145,868-byte artifact are preserved in repository
tmp. This is not a successful merge gate or evidence of a scientific defect.

[#54](https://github.com/uvar-apps/eigenvista/issues/54) repairs CI capacity in
the same PR with independent Chromium/WebKit matrix runners, 175 cases each.
Fail-fast is disabled; failure artifacts are distinct. Test sources/configuration,
worker count, individual timeout overrides, per-engine 35-minute test-step and
60-minute job bounds, pins, permissions and diagnostics policy are unchanged.
See the [decision](design/2026-11-12-browser-project-isolation.md). The local
full run passed **350/350**, zero skipped/flaky/unexpected results, in 11.4
minutes; final actual four-job hosted evidence belongs in PR #53 and #54 before
merge. Changing scheduling does not require repeating unchanged runtime tests;
project-discovery equivalence and fresh actual hosted execution are required.

## Typed native encoding: 12 November 2026

From main `f92e063`, branch `codex/typed-native-encoding` implements the remaining
encoding phase of [#39](https://github.com/uvar-apps/eigenvista/issues/39).
Version remains 0.5.12; the existing release/tag/ZIP artifacts are unchanged.
The [decision](design/2026-11-12-typed-native-encoding.md) and
[plan](../plans/004-typed-native-encoding.md) describe the preservation contract.

Numeric arrays now emit directly from typed model slices into checked, fallibly
reserved binary buffers. Whole-document numeric JSON trees and flattened numeric
clones are removed. Small metadata/reference JSON, prepared binary entries and
ZIP output remain. Publication and Save still share exact model/source, entry,
manifest and total-byte preflight. The decoder, source hashes, scientific code,
profiles, precision, dependencies and resource limits are unchanged.

The four frozen input archives are untouched. All **44 format tests** pass,
including six frozen compatibility regressions, four new edge tests with seven
logical-layout hashes captured from the unchanged `f92e063` writer, and two
checked-buffer tests. Coverage includes singleton/coalesced/empty/nonuniform
arrays, nested powers, flat grid shape, signed zero, metadata/nulls and the
existing oversized-unsigned f64 fallback. Independent review found no remaining
issues. New model fields are exposed by exhaustive writer destructuring.

Fresh isolated optimized native measurements on Apple M4/macOS 27.0, Rust 1.99.0:

| Run | Prior encode ms | Typed encode ms | Prior peak RSS bytes | Typed peak RSS bytes |
| --- | ---: | ---: | ---: | ---: |
| 1 | 257.256 | 251.281 | 182,353,920 | 47,480,832 |
| 2 | 261.395 | 252.110 | 182,304,768 | 47,480,832 |
| 3 | 261.057 | 258.880 | 182,288,384 | 47,480,832 |

Median whole-process peak RSS falls **73.96%**, from 182,304,768 to 47,480,832
bytes. Median encode time is 261.057 versus 252.110 ms; the small observed timing
difference and overlapping ranges are not a general throughput claim. The same
[driver](../crates/eigenvista-format/examples/encoding_benchmark.rs), toolchain
and exact 2,097,152-sample input were used in three fresh processes per version.
Independent ZIP decoding verifies identical manifests and all decompressed entries
across the six archives: 15 entries, 16,781,174 uncompressed bytes and 9,822,901
archive bytes. Observed compressed-byte equality is not a new format contract.

Encode timing excludes sampling, input identification and file writing; maximum
RSS covers the whole process. The workload has no saved meshes and therefore
does not measure saved-source validation's remaining JSON hash allocations.
This is not a browser/WASM memory bound or an OOM guarantee. See the
[measurement procedure](development.md#native-encoding-measurements).

Fresh local verification passes **238 workspace Rust tests**, Rustfmt and strict
workspace/all-target Clippy, production WASM/TypeScript/frontend and debug native
builds, **13 packaging tests**, and **26 embedded-native observations** across
clean and dirty close/Cancel/Discard. The full **306-case** Chromium/WebKit run,
current capture inspection and actual reviewed-head hosted evidence are recorded
in [#39](https://github.com/uvar-apps/eigenvista/issues/39) and its implementation
PR. All three actual hosted jobs must pass before merge. Physical native
dialogs/shortcuts and distribution qualification remain separate gates.

The initial hosted run at `9ecb720`,
[43208190349](https://github.com/uvar-apps/eigenvista/actions/runs/43208190349),
then failed **6 existing browser checks**, with 300 passing in 33.2 minutes.
Linux Rust/Clippy (229 tests), macOS desktop (7), production build, packaging
(13), and all 12 frozen-file browser cases passed. Original failure traces and
images are retained; this is not counted as a successful merge gate.

[#51](https://github.com/uvar-apps/eigenvista/issues/51) tracks the required
[verification repair](design/2026-11-12-browser-verification-scheduling.md).
Progress waits for actual results/checkpoints and UI publication completion;
cancellation observes the current worker/request at real termination. GPU work
is divided into independent cases while preserving all 24 comparisons, 14 timing
configurations, warmups and nine measurement draws. Cube checks retain desktop,
loaded-scene mobile resize and real damped rotation; viewer captures follow
completed camera/draw work. Pixel thresholds, numerical checks, resolutions,
animation and global CI deadlines remain unchanged. The corrected inventory is
**320 browser cases**. A focused **30/30 Chromium** run with CI tracing and a
verified ANGLE/SwiftShader renderer passes in 2.1 minutes after independent
review fixes. Its six evidence files retain all 24 comparisons and 14 distinct
timing configurations. Current full local, software-rendered/traced and fresh
reviewed-head hosted evidence is linked from #51 and PR #50; all three hosted
jobs must pass before merge. The original 306-case local pass above belongs to
the initial head. Production code and measured writer hashes are unchanged by
this verification repair.

Logs and preserved before/after binaries are under
`tmp/2026-11-12-typed39/`. The original review remains untracked. Completion here
does not implement #37/#38 mesh storage/transport or #40 source hashing.

## Vite maintenance and native fixtures: 12 November 2026

From main `06ecbb9`, [PR #49](https://github.com/uvar-apps/eigenvista/pull/49),
developed on `codex/vite-maintenance-and-native-fixtures`, implements
[#46](https://github.com/uvar-apps/eigenvista/issues/46) and the fixture phase of
[#39](https://github.com/uvar-apps/eigenvista/issues/39). Version remains 0.5.12;
published 6 November artifacts predate these source changes. See the
[decision record](design/2026-11-12-vite-and-native-fixtures.md).

The only changed npm package is Vite 7.3.6→7.3.8, with declaration `^7.3.8`.
Clean installation and npm audit pass with zero reported vulnerabilities. Vite's
license text and generated runtime notices are unchanged; compiler/scientific
dependencies and application logic are unchanged.

Four committed archive inputs total 72,053 bytes. The authentic old producer
archive retains its researched SHA-256; current structure/RHF/UHF files freeze
layout, f64/u32 types, signed-zero bits, empty arrays, nonuniform primitive rows,
authoritative grids, signed cached meshes and source associations. Their
[provenance and test contract](../fixtures/native/README.md) distinguish native
binary bit preservation, browser JSON zero canonicalization, and Open's reported
bond supplementation. Normal tests read frozen bytes without regenerating them.

Fresh local checks pass all **232 workspace Rust tests**, Rustfmt and strict
workspace/all-target Clippy, the production WASM/TypeScript/Vite build and debug
Apple Silicon app build. All **13 packaging support tests** pass. Two owned
embedded-production native probes (clean close and dirty close/Cancel/Discard)
pass all **26 JSONL observations**, including actual worker/frontend readiness.

All **12 focused Chromium/WebKit fixture cases** pass, including actual WASM/worker
decode/validation/Save, UI cached rendering without sampling, desktop/mobile
reopen, supplementation, source mismatch and corruption recovery. Desktop/mobile
captures were inspected. The full **306-case** Chromium/WebKit suite and the
reviewed source head's hosted results are recorded in
[PR #49](https://github.com/uvar-apps/eigenvista/pull/49) and its
[checks](https://github.com/uvar-apps/eigenvista/pull/49/checks); all three hosted
jobs must pass before merge. Physical macOS controls/dialogs, clean-machine/HiDPI and
Linux/Windows distribution qualification remain separate gates.

#39's typed writer remains outside this completed fixture scope; source hashes,
schema/profile, precision and budgets are unchanged. No new tag, release or ZIP
is included. Logs are under `tmp/2026-11-12-vite-fixtures/`; the original review
remains untracked.

## Selected-issue research: 12 November 2026

At source `06ecbb9` / version 0.5.12, research covered #46, #39, #37, #38 and #35.
The [findings](../plans/2026-11-12-research.md) record measured evidence, primary
references, reproduction artifacts and untested limits; the
[plan index](../plans/README.md) gives the recommended order.

Vite 7.3.8 is a bounded maintenance candidate: isolated locks change only Vite
and candidate audits are clear, while the installed application remains 7.3.6.
A reconstructed genuine 0.3.2 native archive opens and re-saves through current
WASM with science/source associations intact. Exact mesh sharing significantly
reduces measured geometry/storage, but f64 precision, normal seams, custom shader
IDs and raw allocation limits must be preserved. Twenty real Chromium/WebKit
worker samples support a narrower typed-output experiment; browser peak memory
and whole-app gains remain unmeasured. Capacity experiments expose independent
500,000-line and 128 MiB persistence constraints, beyond the 512-MO cap.

This pass changes research/planning/current handoff documentation only. Source,
locks, scientific limits, existing fixtures and release artifacts are unchanged.
No feature/patch is implemented, no full runtime suite or new hosted run is
claimed, and no scientific output bug or project-specific exploit was reproduced.
Owned experimental browsers/workers/dynamic server were closed; artifacts are
under repository `tmp/2026-11-12-research/`. The original review stays untracked.

## CI and import/publication performance: 11 November 2026

Issues [#32](https://github.com/uvar-apps/eigenvista/issues/32),
[#33](https://github.com/uvar-apps/eigenvista/issues/33) and
[#34](https://github.com/uvar-apps/eigenvista/issues/34) are implemented in
[PR #45](https://github.com/uvar-apps/eigenvista/pull/45), developed on
`codex/ci-and-import-validation-performance` from merged main `3fef7d4`.
Version remains 0.5.12; published 6 November artifacts predate these changes.
See the [decision/measurement record](design/2026-11-11-ci-and-publication-preflight.md).

Verify CI runs pinned Linux Rust/WASM/browser/package gates and explicit macOS
desktop tests, with read-only permissions and seven-day failure artifacts.
Canonical hosted head/job evidence is the [PR checks](https://github.com/uvar-apps/eigenvista/pull/45/checks);
all three jobs must pass before merge. The first setup run at `b13dae6` proved
clean hosted Rust 1.99.0 installation and passed all seven macOS shell tests.
It also exposed two infrastructure/build problems: missing declared Node types
and an unresolvable Azure Ubuntu mirror. Node declarations now match the
previously inherited 26.1.2 version and are locked locally. Linux package setup
preserves working provider sources, normal signatures, strict update errors and
bounded retries/timeouts. The failed browser job successfully uploaded
only its two diagnostic logs with the configured seven-day retention; the
downloaded archive matched GitHub's reported checksum. Fresh Linux retries
also encountered DNS failures for the official Ubuntu archives. Bounded,
read-only failure probes compare runner/root/apt DNS and HTTP access, exposing
only proxy presence rather than values. One failing runner showed Ubuntu DNS
timeouts as runner/root, no configured proxies, and successful Microsoft DNS/
HTTPS; a separate AWS browser runner installed Ubuntu dependencies from its
preferred EC2 mirror successfully. Final setup preserves existing entries and
priorities. Only when the preferred Ubuntu host fails bounded DNS lookup and
a normal-TLS probe of the fixed Kernel.org Ubuntu mirror succeeds does it add
that fallback with higher APT preference. Apt still verifies signed indexes;
local probe success alone does not establish hosted installation success.
An initial apt-user probe could not read the private workspace, so subsequent
probes receive the script through stdin without changing permissions or the
apt sandbox. Configuration changes alone do not establish that connectivity or
the hosted gates pass. No local system settings were changed by the CI-only
Linux setup helper.

The first usable Linux browser run progressed through Chromium case 144/294
before diagnostic cancellation to retrieve its log. Two camera polls timed out
without a completed image comparison; their enclosing five-second deadline
could expire during compositor capture, rather than demonstrate an unchanged
camera. A late density assertion also assumed computation remained unfinished
during camera/pixel roundtrips. Tests now settle real draw activity, verify the
drag target and compare completed captures outside the nested poll, retaining
the image-change assertions. The density test retains its early real-work
heartbeat, then explicitly holds a real result for cancellation before
publication. Unchanged 256-cubed tests still assert interruption of unfinished
computation. No application defect was reproduced; assertions and per-test
timeouts remain. The 35-minute browser step deadline leaves upload time inside
the 60-minute job; externally cancelled diagnostics did not upload screenshots.

Zero-occupation Molden contractions are skipped after full input validation;
all virtual orbital data and existing allocations remain. Full publication
validation shares exact semantic/source/entry/manifest/uncompressed budgets with
Save, without constructing/compressing a ZIP. The older model-only WASM API
remains distinct. Scientific limits, hashes/profiles and existing dependency/
compiler/runtime versions are unchanged; only missing Node development types
and their type dependency were added to the npm lock.

Fresh local checks pass all **226 workspace Rust tests**, strict workspace/
all-target Clippy, Rustfmt, a clean locked npm install and production WASM/
TypeScript/Vite build. All **294 Chromium/WebKit cases** pass in one **7.8-minute**
run, including four new actual-WASM/worker publication/recovery/cancel cases.
This final run includes the hosted-test synchronization changes; 14 focused
camera/density/active-cancellation cases also pass across both engines.
The original uncompressed manifest/decoder compatibility test passes after
refining the contract to exclude compression bytes. All **13 packaging support
tests** pass; the debug Apple Silicon app is rebuilt. Browser screenshots and
documentation links/commands are reviewed separately from native GUI acceptance.

Scoped optimized native measurements on Apple M4/macOS 27/Rust 1.99.0:

- Synthetic UHF import (512 AOs/512 listed MOs/40 occupied): median process mean
  **56.781 to 5.792 ms**, about 9.8x for this stress input. The frozen small
  hydroxyl fixture has no meaningful timing gain. Density hashes match and
  process RSS is effectively unchanged; no memory reduction is claimed.
- First/later retained-mesh publication checks: original encode medians
  **29.534/52.197/88.296 ms** versus non-compressing validation
  **9.350/13.099/22.345 ms** for 1/15/31 meshes. Maximum process RSS is similar,
  approximately 58–98 MB. Original/new Save bytes match for all three documents.
  These isolate native format work, not end-to-end browser generation.

Raw measurement provenance/commands and limitations are in the decision record;
integration logs remain in `tmp/2026-11-11-ci-import-validation/`, import logs
in `tmp/issue33-*` and publication logs/old archives in `tmp/publication-validation/`.
No input/reference answer was regenerated. The original review remains untracked.

Clean npm installation reports existing Vite development-tool advisories;
[#46](https://github.com/uvar-apps/eigenvista/issues/46) tracks their assessment
and patch planning separately. No project-specific exposure is reproduced and
Vite was not upgraded by this batch. Physical macOS controls/native dialogs,
HiDPI, clean-machine installation and Linux/Windows distribution qualification
remain separate gates; hosted tests do not establish them.

## Native lifecycle and Molden limits: 11 November 2026

Issues [#30](https://github.com/uvar-apps/eigenvista/issues/30) and
[#31](https://github.com/uvar-apps/eigenvista/issues/31) are implemented on
`codex/native-exit-and-molden-contract` from `fa76ac4` in
[PR #44](https://github.com/uvar-apps/eigenvista/pull/44), runtime/test commit
`36c8491`. Source version remains
0.5.12; the 6 November tag/ZIP predates these repairs. The
[decision record](design/2026-11-11-native-lifecycle-and-molden-limits.md)
documents the native protocol, macOS hook and unchanged scientific limits.

The owned native WKWebView probe reproduced dirty-document termination through
the default AppKit Quit selector without a Tauri ExitRequested event. The fix
adds a main-thread, layout-compatible delegate hook alongside the Tauri close/
exit guards. One native request token reaches the in-app Save/Discard/Cancel
dialog; initialization/cancellation races resynchronize, late document changes
require fresh confirmation, and only a successful current-document save permits
Save and Quit. Unsaved conversion results and all pending native exports are
included; explicit discard invalidates/cancels both worker clients. Capability
permissions, scientific data, native profiles and numerical algorithms are
unchanged. The objc2/AppKit dependencies were already locked; no external package
version/checksum changed.

README, Molden and user guides now document independent 1,024-AO/512-total-MO
caps and complete spatial/two-spin consequences. Three actual-parser/core tests
cover exact/one-past limits and 300-AO/600-MO rejection without truncation or
invented densities. Capacity expansion remains #35, not part of this fix.

Fresh verification on Apple Silicon macOS 27 / Rust 1.99.0:

- All **216 workspace Rust tests**, including seven desktop tests, pass.
- Rustfmt and strict workspace/all-target Clippy pass, including native examples.
- Production WASM/TypeScript/Vite and the debug arm64 `.app` build pass. The
  rebuilt app is `target/debug/bundle/macos/EigenVista.app`, version 0.5.12;
  no new tester ZIP/tag/release was requested.
- All **290 Chromium/WebKit cases** pass in one **7.4-minute** run. Eighteen new
  cases per engine cover token races, browser beforeunload, Save cancellation/
  failure/retry, delayed saves, late generation and conversion/output retention.
  Fifty focused adapter/lifecycle cases also passed. Desktop/mobile dialog
  screenshots were inspected; the backdrop blocks editing and actions fit.
- All **13 packaging support tests** pass. Documentation targets/anchors and
  working-tree whitespace checks pass; the original local review is preserved.
- Four real native probe scenarios pass: close, programmatic exit, AppKit
  terminate and clean close. All **60 final JSONL observations** succeed,
  including dirty edits, deduplication, Cancel retention, new tokens and
  approved termination. These use embedded production assets, not a dev server.

Evidence is retained under `tmp/2026-11-11-native-molden/` (workspace, Clippy,
production/native builds, browser and packaging logs). Native probe logs are
`tmp/lifecycle-smoke-78242-close.jsonl`, `78259-exit.jsonl`,
`78273-terminate.jsonl` and `78288-clean-close.jsonl` with the same prefix.
The failing pre-hook Quit observation is
`tmp/lifecycle-smoke-75860-terminate.jsonl`. Dialog captures are
`artifacts/native-exit-{chromium,webkit}-{desktop,mobile}.png`.

Physical close-button/Cmd+Q/Dock clicks and native Save-dialog interaction remain
manual qualification, as do native listener-startup timing, clean-Mac/HiDPI and
Linux/Windows acceptance. Browser IPC doubles, Rust filesystem tests and the
real native event-loop probe establish different layers; none substitutes for
that manual platform matrix. No hosted CI was added (#32). The remaining review
order is #32, #33 and #34, then P3 research/feature work; see the
[triage plan](reviews/2026-11-11-issue-priorities.md).

## Version 0.5.12

Released 6 November 2026, from merged main `e9c7675` (PR #29).
All Rust workspace packages/lockfile entries, npm manifests/lockfile root, Tauri,
and current user/agent documentation are updated to 0.5.12. External dependency
versions and the icon/logo are unchanged. This release collects all five repair
batches since 0.5.11, including the import/rendering/worker and validation fixes
recorded below. At release, remaining open issues were #20 (crystal symmetry)
and #22 (mmCIF export); release work did not claim those features or completion
of v1. The later review queue and repair evidence are above.

Fresh post-bump release checks pass all 208 workspace Rust tests including
desktop, strict workspace/all-target Clippy, Rustfmt, the production WASM/
TypeScript/Vite build, all 254 Chromium/WebKit cases in one uninterrupted
6.8-minute run, and 13 packaging tests. Inspected current desktop/mobile preview
and PNG exports; all 422 local documentation targets resolve. Version agreement
and unchanged external dependency versions are verified.

Release commit `cf0db097a9a35ea9907ed4937abcba9a30c5e7a4` and annotated
`v0.5.12` are pushed; the
[GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.12)
has all three assets, with matching GitHub/local SHA-256 digests. This doc-only
follow-up records the completed package without retagging the release.

The tester workflow rebuilt the Apple Silicon app, optimized standalone
converter, source/dependency bundles, notices, documentation, and examples.
Verified archive:
`artifacts/distributions/EigenVista-0.5.12-apple-silicon-20261106T030153Z-cf0db09.zip`
(44,118,491 bytes). ZIP SHA-256:
`e12930ee0875d62ef1864be1f8c77c6e62b5e01c10257e067be80512007d8688`.
The companion `.zip.sha256` and same-stem `.json` are alongside it. Build metadata
records version 0.5.12, clean source `cf0db09`, Rust 1.99.0, Node 26,
wasm-bindgen 0.2.108, cargo-about 0.9.1, arm64, macOS minimum 13/build host 27.0,
and ad-hoc signing without notarization. The rebuilt
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app` embeds current
frontend `assets/index-BWeZGJaH.js`.

The packager passes strict signatures, architecture/system-library checks,
sample PDB/XYZ/Molden/cube imports, signed cube meshes, and native/legacy naming
and converter/WASM roundtrips both before and after ZIP extraction. Independent
audit additionally verifies extracted bytes/modes, app/CLI version/signatures,
all 255 archived source files against all 255 tagged Git blobs, four pinned
BinaryCIF inputs, absence of excluded local/private files, actual extracted
optimized raw/gzip BinaryCIF conversion and clean native reopen (327 atoms,
337 bonds, three disulfides), the compressed/null-mask/alternate/Unicode policy
(four atoms, one bond), and exact release-WASM parity. Evidence remains at
`tmp/release-0.5.12-audit-65PXR6/REPORT.json` and release logs under
`tmp/2026-11-06-release-0512-*`; package staging is retained at
`tmp/eigenvista-package-wxxAeg`.

User-owned `docs/references/` is now
locally excluded from Git/source packaging without reading or changing its
contents. Private chats, other local inputs, old packages, and dated snapshots
are preserved. No native GUI/HiDPI, clean-Mac, or Linux/Windows qualification is
implied by build/signature checks.

## BinaryCIF and viewer polish: 6 November 2026

Fifth repair batch at source version 0.5.11 in
[PR #29](https://github.com/uvar-apps/eigenvista/pull/29), developed on
`codex/bcif-import-and-viewer-polish` from merged main `44d73d7`; runtime/test
changes are commit `3ed46b5`. Fixes #21, #7, and #4. See the
[design](design/2026-11-06-binarycif-and-capture.md),
[BinaryCIF profile](structure-imports.md#binarycif-profile), and
[independent fixtures](../fixtures/bcif/README.md).

- Raw MessagePack-map and gzip signatures precede text decoding. A borrowed
  MessagePack parser bounds lengths/nodes/nesting before allocating containers;
  checked inverse pipelines cover all seven BinaryCIF transforms. Dictionary
  slices stay borrowed, Unicode offsets cannot split surrogate pairs, masks
  retain all three states, and signed Int32 packing bounds are explicit.
- Gzip output and canonical CIF text each have a 64 MiB limit; cumulative
  decoded values, transform/nesting lengths, category columns, and row counts
  are bounded. One 0.3.x block is supported. Interpreted atom/connection/cell/
  symmetry data use the existing core CIF validation, selection, provenance,
  and bond perception. Unused categories are not column-expanded. Raw original
  bytes, including gzip framing, remain the source-hash input.
- Library source evaluation found pre-limit allocation/cache paths in
  `mmcif-cif` 0.3.2 and pre-validation deserialization in `molframe-bcif` 0.7.0.
  No upstream decoder source was copied. `flate2` is newly direct but was already
  locked transitively; no external dependency version changed. Molstar 5.13.1
  is an offline independent fixture producer/oracle, not a runtime dependency.
- The viewport context has `preserveDrawingBuffer: false`; PNG export renders
  and synchronously reads its current frame, with visible encoding/context-loss
  errors and retry. No permanent capture render target is added. Existing pixel
  regressions inspect the compositor; an independent PNG oracle has positive
  and blank controls. Native uses `Native (Tauri)` instead of a hard-coded OS.

Fresh focused checks pass: 22 codec/protocol tests, four public import cases,
15 real CLI tests, six BinaryCIF browser cases, four runtime-label cases, and
168 affected Chromium/WebKit rendering cases in one 5.1-minute run (including
14 new PNG cases). The real RCSB 1CRN twin yields 327 atoms/337 bonds and the
three independently mapped disulfides; the independent policy twin retains
four atoms and one explicit bond. Input SHA-256 digests, native roundtrips,
conversion/retained-scene failures, picker filters, null/alternate/model policy,
all numeric source widths, Unicode, invalid expansions/counts/masks/indices,
truncation/trailing data, gzip CRC/members/expansion, quoting, and single-atom
geometry are covered. All 208 workspace Rust tests including desktop and all
254 Chromium/WebKit cases pass on the final runtime source. The full browser
run completed uninterrupted in 6.7 minutes. All 421 local documentation targets
across 35 public Markdown files resolve. Source/test formatting and whitespace
checks pass; the unmodified deposited CIF retains its original whitespace via
a narrowly scoped Git attribute. All four new fixture input hashes match their
recorded source manifest.

Fresh Rustfmt/strict workspace-all-target Clippy, production WASM/TypeScript/Vite
and Apple Silicon native builds, and 13 packaging checks pass. The ad-hoc-signed
app at `target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app` passes
strict deep signature verification and embeds current frontend
`assets/index-CT2OlWaI.js`. Source version stays 0.5.11; no new tag/release/ZIP.
The existing EigenVista preview stays on port 5178. Inspected desktop/mobile
PNG exports and UI in both engines, plus the new real-structure previews.
Native interactive capture, dedicated HiDPI acceptance, clean-Mac installation,
and Linux/Windows remain unverified. GPU memory savings were not measured.
User references/private chats/local data, old fixtures, and dated restart
snapshots remain untouched. Remaining tracked work after this batch: #20/#22.

## Bond search and mmCIF connections: 6 November 2026

Fourth repair batch at source version 0.5.11 in
[PR #28](https://github.com/uvar-apps/eigenvista/pull/28), developed on
`codex/bonds-and-cif-connections` from merged main `58d835b`; runtime/test changes
are commit `1c0f638`. Fixes #3 and #19. The
[design record](design/2026-11-06-bond-search-and-cif-connections.md)
defines conservative indexing, declared/perceived precedence, source identity,
link-type/image policy, lexical scope, and metadata bounds.

- Target atoms are indexed in 0.5-angstrom covalent-radius buckets. Each query
  uses its target bucket's observed maximum, preserving every actual pair cutoff,
  minimum distance, deterministic candidate order/ties, explicit precedence,
  coordination rule, and guard. No arbitrary smaller plausible radius is used.
- mmCIF `covale`, `disulf`, and `metalc` declarations seed explicit untyped
  display edges; coordinate perception fills missing pairs. Deposited IDs,
  types/orders, complete parsed columns, selected row/atom identities, and status/
  reasons persist in bounded JSON provenance without changing the native schema.
  Other types and third-partner declarations are recorded without forcing rods.
- Consistent label/author references resolve only against selected first-model/
  alternate rows. Unknown, contradictory, ambiguous, omitted-alternate, or
  unavailable-image references are reported. Matching common images map back to
  selected sites; no identity operator or missing symmetry mate is guessed.
  Non-polymer null label-sequence grouping now uses author residue/insertion
  identity; a new regression first reproduced incorrect cross-water alternate
  selection, then passed with the corrected fallback.
- Loop/scalar connection values, wrapped rows, text blocks, and quoted identifiers
  are supported. Header bounds apply before owned allocation and retain all
  column names. Unsupported inline controls/frames/multiline atom rows fail
  explicitly. Source/record/reference-work and 4 MiB provenance bounds protect
  imports and the unchanged 8 MiB native manifest limit. Final-review regressions
  reproduced dropped constraints after text closers; closers and data/stop
  boundaries now reject trailing tokens while allowing separated comments.
  Cumulative record size is stream-checked before JSON-string allocation, so
  repeated long selected atom-site IDs cannot bypass the source-row budget.

Fresh verification: all 180 workspace Rust tests including desktop, strict
workspace/all-target Clippy, Rustfmt, production WASM/TypeScript/Vite build,
13 packaging tests, and the Apple Silicon native build pass with Rust 1.99.0.
The four new browser cases pass in Chromium/WebKit with actual bond pixels,
native save/reopen, conversion, malformed-input recovery, and inspected desktop/
mobile layouts. All 230 browser cases passed in one uninterrupted 6.2-minute
Chromium/WebKit run. All 384 local targets across 33 public Markdown files
resolve; source/test formatting and whitespace checks pass.

The 0.5.11 ad-hoc-signed app at
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app` passes strict
deep signature verification and embeds current frontend `assets/index-DhfZYEqR.js`.
The preview stays on port 5178. Native interactive acceptance, clean-Mac
installation, and Linux/Windows remain separate unverified gates. No version,
dependency/lockfile, icon, tag, release, or tester-ZIP change was requested;
the published 21 October ZIP predates all four repair batches. User references,
private chats, local `1AON.pdb`, and frozen fixtures remain untouched.

Independent source-row inspection and current WASM import agree on all 27
selected `1AON.cif` metal links. Ten are beyond the 2.47-angstrom Mg–O perception
cutoff. Current results: 58,870 atoms/59,317 bonds, versus historical 59,307
perceived bonds. `1BH3.cif` has 2,383 source rows, no declarations, and retains
2,372 selected atoms/2,270 bonds. Native/CLI regressions preserve the original
source records and exact selected endpoint pairs. Counts are recorded in
`tmp/cif-current-counts-2026-11-06.json`; independent mappings and method are in
`tmp/cif-connection-reference-2026-11-06.{mjs,json}`.

Bond-query diagnostics on this Apple Silicon Mac with the pinned dependency
lockfile retain identical candidate pairs, independently checked against
exhaustive enumeration across all 118 elements and boundary/explicit cases:

| Workload | Atoms | Old global visits | Bucketed visits |
| --- | ---: | ---: | ---: |
| 4PJ1 | 65,963 | 376,802 | 199,218 |
| Synthetic carbon/Cs outlier | 100,000 | 5,153,840 | 675,994 |
| Synthetic hydrogen/Cs outlier | 100,000 | 20,832,964 | 675,994 |

The hydrogen stress now succeeds with 49,743 bonds; old queries exceed the
10-million-visit guard. This is coordinate-valid, deliberately nonphysical
synthetic input, not a real-structure failure. Locked like-for-like prototype
query/build medians (three calls) for 4PJ1 were 24.08 ms global and 18.46 ms
bucketed. Raw measurements are in `tmp/bond-query-baseline-locked.jsonl`.
The permanent `bond_radius_benchmark` example separately labels old-query-only
and new-full-perception timing scopes; do not compare those as speedup ratios.
No general latency, chemical validity, or renderer performance guarantee follows.

Remaining issues follow the original P3 order: BinaryCIF (#21), drawing-buffer
retention (#7), native platform wording (#4), symmetry (#20), and mmCIF export (#22).

## Worker ownership and registration: 6 November 2026

Third repair batch at source version 0.5.11 in
[PR #27](https://github.com/uvar-apps/eigenvista/pull/27), developed on
`codex/worker-ownership-and-cache` from merged main `c5ebcbb`; runtime/test
changes are commit `b701efe`. Fixes #6 and #5. The
[design record](design/2026-11-06-worker-ownership-and-registration.md)
records ownership, alternatives, validation, and the immutable-input contract.

- One FIFO bridge posts one job at a time. App and Convert Files own separate
  clients; client cancellation removes only its jobs, and AbortSignal cancels
  one request. Active cancellation interrupts synchronous WASM, then resumes
  other owners' queued jobs on a replacement worker. Queued/idle cancellation
  leaves active work alone. Small queued parameters are captured at submission.
- Fatal errors reject every owner through separate teardown. Chromium needs an
  actual `messageerror` event listener; assigning the property was ineffective.
  Failed WASM initialization also tears down the unusable worker and permits a
  replacement fetch. Late worker messages/progress/errors cannot affect new jobs.
- One Rust `RegisteredDocument` owns validated immutable inputs and one sampled
  field/resolution cache. Repeated requests omit the scientific payload and
  avoid full-source JSON parsing/hash lookup for cached meshing. Fresh samples
  retain Rust source hashes; legacy `SampledField` stale-source checks, native
  validation, numerical behavior, progress, and allocation bounds remain.
- Registration requires matching source references as well as ID/title values.
  Scientific edits must replace affected top-level source arrays/objects.
  Appearance and saved-mesh changes preserve identity; current small appearance
  parameters are validated in Rust. Replacements/errors/restarts discard old
  registration, with no history of resident documents or sample caches.

Fresh Rustfmt, strict workspace/all-target Clippy, all 147 workspace Rust tests
including desktop, 13 packaging tests, production WASM/TypeScript/Vite, and
Apple Silicon native build pass with repository-selected Rust 1.99.0. Focused
browser checks pass all 36 new cases across Chromium/WebKit, including real
overlapping consumers, aborted WASM fetch/retry, direct legacy API parity,
observed registration packets, scientific replacements, native encoding parity,
and submitted argument snapshots. Message-error/init recovery also passed two
repeats per engine (8 checks). All 226 browser cases passed in one uninterrupted
6.1-minute Chromium/WebKit run. Desktop/mobile progress, previews, and conversion
screenshots were inspected in both engines; all 360 local documentation targets
resolve. Source/test formatting and whitespace checks pass. Dependency lockfiles,
source versions, scientific fixtures, icon assets, and the document format are unchanged.

The ad-hoc-signed 0.5.11 app at
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app` passes strict
deep signature checks and embeds current frontend `assets/index-By9RGElF.js`.
The preview remains on port 5178. No version/tag/release/ZIP was created; the
published 21 October archive predates all three repair batches. Native
interactive acceptance, clean-Mac installation, and Linux/Windows remain
unverified. User-owned `docs/references/`, private chats, and locally excluded
`1AON.pdb` are untouched. Local Serena metadata is ignored, not source/package data.

Diagnostic measurements used Node 26/V8 with release-profile WASM before and
after this change on this Apple Silicon Mac: one warm-up and seven calls per operation, with exact
Molden/cube sample, metadata, and mesh parity guards. Baseline medians in ms:

| Input | Clone | Full document JSON | Scientific key JSON | Rust validation |
| --- | ---: | ---: | ---: | ---: |
| `molden.input` | 0.70 | 0.89 | 0.75 | 2.06 |
| Water density cube, 64k samples | 0.89 | 1.03 | 0.99 | 2.08 |
| Benzene cube, 216k samples | 3.67 | 4.14 | 3.58 | 7.63 |

Actual resident registration and cached meshing at resolution 48, median ms:

| Input | Registration | Resident cached mesh | Legacy cached mesh |
| --- | ---: | ---: | ---: |
| `molden.input` | 2.11 | 1.88 | 4.33 |
| Water density cube | 2.12 | 2.08 | 7.59 |
| Benzene cube | 7.50 | 2.82 | 29.51 |

Registration timing excludes initial JS clone/stringify; cached-mesh timings
include real WASM meshing and mesh JSON, excluding UI messaging/rendering/export.
Near-zero cache-hit timings approach timer resolution. These isolated diagnostics
do not establish end-to-end latency or general speedups. Scripts/raw reports
remain under `tmp/cache-{baseline,resident}-2026-11-06.{mjs,json}` with method,
source/binary identity, and individual calls. Full validation/encoding still
processes complete documents; conservative registration can invalidate for an
unrelated source edit. Ordinary appearance sliders already avoided worker jobs.

Next priorities: benchmark bond-search candidates (#3), then implement declared
mmCIF connections (#19); the original order is retained in the issue review.

## Rendering fixes: 6 November 2026

Second repair batch at source version 0.5.11 in
[PR #26](https://github.com/uvar-apps/eigenvista/pull/26), developed on
`codex/next-rendering-fixes` from merged main `31c4876`; runtime/test changes are
commit `c9ca60f`. Fixes #12 and #2. The
[design record](design/2026-11-06-rendering-quality.md) explains the decisions
and remaining numerical/rendering limits.

- Custom mesh shaders have a live **Shader transparency** switch, enabled by
  default, independent of document opacity and uniform names. Enabled uses
  alpha blending without depth writes; disabled writes depth and forces final
  alpha one. Built-in material behavior is unchanged.
- Sampled volume and raycast use voxel-relative Draft/Standard/Fine quality
  (1/2/4 samples per voxel; Standard default), with full inverse affine axes
  and a 4,096-iteration bound. Eight-cell min/max bricks include shared boundary
  vertices; conservative skipping retains the global sample lattice. Both signed
  roots within one segment are refined and composited in depth order, including
  entry equality without a false constant-field surface.
- Settings are session-only. Tests verify no scientific worker request, dirty
  state, generated mesh, or decoded saved-document change. Immutable sampled
  buffers reuse bounded CPU ranges; scene disposal releases both 3D textures.
  At 256 cubed, ranges add 262,144 CPU bytes and the same GPU texture size.

Fresh checks: 147 workspace Rust tests including desktop, strict
workspace/all-target Clippy, Rustfmt, 13 packaging tests, and the production
WASM/TypeScript/Vite build pass. All 190 Chromium/WebKit cases passed in one
uninterrupted 5.7-minute run. Tests include real shader alpha/depth pixels,
thin positive/negative fields missed by a fixed160 control, affine/reflected/
inside-camera views, dense/skip agreement, independent signed-root compositing
and depth probes, and exact-entry thresholds. Desktop/mobile screenshots of
both controls were inspected in both engines. All 345 local Markdown targets
resolve, and source/test formatting and whitespace checks pass. Versions,
lockfiles, scientific fixtures, icon, and document format are unchanged.

The Apple Silicon app was rebuilt with repository-selected Rust 1.99.0 and the
sanitized tester environment at
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`. Strict deep
signature verification passes; the 0.5.11 bundle embeds current frontend
`assets/index-Ch9iuff6.js`. The running web preview remains on port 5178.
No new tag, release, or tester ZIP was created; the published archive predates
both repair batches. Native interactive rendering was not exercised.

Four direct Node/V8 calls per size measured CPU range construction at
3.49–10.80 ms for 128 cubed and 31.96–41.32 ms for 256 cubed on this Mac,
excluding texture upload, scientific sampling, and rendering. The timings were
recorded in session output, not a persisted benchmark report. Construction runs
synchronously once per immutable display buffer in the application.
Warmed synchronized GPU/readback measurements compare fixed160, dense adaptive,
and skipped adaptive rendering on a sparse planar 256-slice field at 129²
pixels. The fixed160 control uses the current shader kernel with a fixed count,
not an exact old-release shader. These diagnostics are not general molecule/
frame-rate guarantees. Standard/Fine can cost more than fixed160. Generated results
are under `artifacts/adaptive-volume-{chromium,webkit}-{thin-field-pixels,measurements,signed-crossing-depth}.json`.

Standard-quality diagnostics from the final suite, median milliseconds per
synchronized render/readback (WebKit timer resolution is coarse):

| Engine / mode | Fixed160 control | Dense adaptive | Skipped adaptive |
| --- | ---: | ---: | ---: |
| Chromium volume | 16.50 | 51.47 | 25.87 |
| Chromium raycast | 8.23 | 19.57 | 6.83 |
| WebKit volume | 0.67 | 1.00 | 0.67 |
| WebKit raycast | 0.67 | 0.67 | 0.33 |

Finite sampling can still miss tangencies or sub-segment structure. Ordinary
transparent-surface sorting and single-volume/opaque-object overlap limitations
remain. Native interactive acceptance, clean-Mac installation, and Linux/Windows
remain unverified. Preserve user-owned `docs/references/`, private chats, and
the locally excluded `1AON.pdb`. Next: #6 before #5, then #3 and #19.

## Priority fixes: 5 November 2026

First repair batch at source version 0.5.11 in
[PR #25](https://github.com/uvar-apps/eigenvista/pull/25), developed on
`codex/priority-integrity-and-shader-fixes` from `38caf41`. Fixes #11, #9, #10,
and #8; the PR records current merge/issue state. The published `v0.5.11` tag
and release ZIP remain the 21 October artifacts, before these changes.

- Indexed-column references use a checked u64-to-usize conversion, retaining
  row bounds and single-use checks. Native and actual-WASM regressions cover
  oversized/invalid indices and wrapped swaps without changing valid science.
- Shader parameter types and component counts are checked before publication;
  source changes reconcile compatible values and keep the old applied pair
  separate. Clear shader resets the files/values for safe pair replacement.
- Native `.params` export has its own command, 128 KiB text bound, extension
  check, and sibling write/sync/replacement. Errors reach the panel; the native
  molecular-document save command retains its decoder and source protections.
- `rust-toolchain.toml` selects Rust 1.99.0, Clippy, Rustfmt, and the WASM target.
  Fresh checks ran with `RUSTUP_TOOLCHAIN` unset; rustup confirms file selection.
  Dependency lockfiles and source versions are unchanged.

Verification: 147 workspace Rust tests including the desktop shell, strict
workspace/all-target Clippy, Rustfmt, 13 packaging tests, production WASM/
TypeScript/Vite build passed. The latest full Chromium/WebKit run passed 171 of
172 cases; a new pixel probe captured the pre-Apply frame. After correcting the
probe to wait for the applied frame, all 20 format/shader cases passed in both
engines. Together these runs cover all 172 cases, not a single uninterrupted
172-case green run. Source-switch recovery and controlled out-of-order reads
also passed three repeats per engine (12 checks). Desktop/mobile rejection
screenshots were inspected, and 252 local documentation targets verified. Tests exercise
real native text writes and browser native-IPC success/cancel/error simulation.
They do not drive an OS save dialog. Native dialog interaction, clean-Mac
installation, and Linux/Windows remain separate unverified acceptance gates.

The Apple Silicon app was rebuilt with the repository-selected compiler and
ad-hoc signing at `target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.
Strict signature and current embedded frontend (`assets/index-kr9FAYSB.js`) checks pass.
It is a local development build at 0.5.11; no new distributable archive or tag
was created. The preview runs at `http://127.0.0.1:5178/`. The original release's
notarization and scientific qualification boundaries still apply. User-owned
`docs/references/`, private chats, and the local `1AON.pdb` are preserved.

## Version 0.5.11

Date: 21 October 2026. Released live calculation progress (#24) at commit
`cd2ad8d529e81a02934fab748cce1143239c2185`, annotated tag `v0.5.11`, pushed to
origin. [GitHub development-preview release](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.11)
is published with the ZIP, SHA-256 companion, and build-information JSON.
The Rust workspace (all six crates), npm package/lock roots, and Tauri identity
are now 0.5.11. User and agent guides reflect the current progress behavior;
dated release records and restart snapshots remain unchanged.
No scientific schema, dependency version, or memory limit changes accompany
the bump. Post-bump checks pass: 145 workspace Rust tests (including desktop),
strict workspace/all-target Clippy, Rustfmt, production WASM/TypeScript/Vite
build, 13 packaging tests, and the complete 158-case Chromium/WebKit suite in
one uninterrupted run. Inspected progress screenshots and verified 214 local
documentation link targets. All six crate versions and npm/Tauri versions agree;
external locked dependencies are unchanged.

The packaging script rebuilt the native app and converter from clean release
source, reran Rust/packaging tests, checked arm64/system-only libraries and
strict signatures, compared ZIP extraction bytes/modes, and exercised packaged
PDB/XYZ/Molden/cube examples plus converter/WASM roundtrips before and after
extraction. The native bundle reports 0.5.11 and embeds the current frontend
`assets/index-Bo_iKzRk.js`. Build metadata reports `sourceDirty: false` and the
release commit above. The user's local `1AON.pdb` and private chat exports are
absent from the source manifest; the PDB is unchanged and locally ignored via
`.git/info/exclude` rather than committed or removed.

Artifact: `artifacts/distributions/EigenVista-0.5.11-apple-silicon-20261021T102833Z-cd2ad8d.zip`
(43,810,913 bytes), with adjacent `.zip.sha256` and `.json` files. SHA-256:
`c09f8b626df287a1f9a370c3867db0b069176fadd69cdea8fb02767ce537d7da`.
The local checksum passes and GitHub reports the same uploaded ZIP digest.
The app is also available at
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.

Issue #24 is closed. A documentation-only follow-up records this outcome;
the release tag and packaged source remain at `cd2ad8d`. Native interactive
progress, clean-Mac/Gatekeeper installation, the complete macOS range, and
Linux/Windows remain unverified. This is an ad-hoc-signed development preview,
not an Apple-notarized or scientifically qualified release.

## Live calculation progress

Pre-release implementation evidence, 21 October 2026 (before the 0.5.11 bump). Issue
[#24](https://github.com/uvar-apps/eigenvista/issues/24), local changes after
`3632df2`, tested initially at 0.5.10. Added actual sampling slice counts and signed
mesh-pass checkpoints through the Rust/WASM worker. The panel beside Cancel
shows the field, orbital batch position, elapsed time, and per-phase progress.
Preparation, transfer, and validation are indeterminate. No ETA, timer-driven
percentage, mesher replacement, scientific change, or limit increase was added.
Cached fields skip sampling. Progress clears on completion/cancel/error and old
worker/request events cannot update a later job.

The Rust observer API is optional and bounded to at most 257 sampling events.
The worker limits intermediate notifications to at most one per 100 ms while
always retaining start/end. `js-sys` is now a direct dependency using its
existing locked 0.3.85 version, without external dependency upgrades.

Fresh verification on the development Apple Silicon Mac with Rust stable
1.99.0 and wasm-bindgen 0.2.108:

- Formatting, strict workspace/all-target Clippy, 145 workspace Rust tests
  (including desktop), 13 packaging tests, and the production WASM/TypeScript/
  Vite build passed. Vite retains its existing large-chunk warning.
- The full 158-case Chromium/WebKit run passed 156 cases. The two failures were
  the existing high-resolution cache probe counting incremental progress as
  separate calculations. After changing it to count phase starts, all 18
  high-resolution/progress cases passed in both engines. Together these runs
  cover all 158 cases; this is not a single uninterrupted green full-suite run.
- New checks cover exact Rust/WASM sample and mesh parity, callback failure,
  imported affine-grid progress, real Molden batch completion, live 256-cubed
  sampling, cancellation/error cleanup, stale events, retry, and cache reuse.
  Desktop/mobile progress screenshots were inspected in both engines at
  `artifacts/progress-{chromium,webkit}-{cancel,worker-error}.png`.
- External registry dependency versions/checksums remain unchanged. The user's
  untracked `fixtures/large-structure/1AON.pdb` is untouched.

The Apple Silicon release app was rebuilt with the sanitized tester environment
and ad-hoc signing at
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`. Strict deep
signature verification passed, bundle metadata was 0.5.10, and the native
executable contained frontend asset `assets/index-BCO92s6o.js`.
Native interactive progress, clean-Mac installation, and Linux/Windows were not
tested. An already-running native instance must be quit/reopened by the user to
load the rebuild. The preview is available at `http://127.0.0.1:5178/`.

At this pre-release checkpoint the ZIP was unchanged and the feature was
uncommitted, with issue #24 open. See the 0.5.11 entry above for subsequent
release verification and publication.

## Fresh-session handoff

Date: 21 October 2026. Documentation-only restart preparation at `69d234b`
(`v0.5.10`). Added a [session handoff](session-handoff-2026-10-21_173143-AWST.md) and standalone
[restart prompt](restart-prompt-2026-10-21_173143-AWST.md), linked from the root agent guide and docs
index. Rechecked live origin main/tag identity, manifest versions, installed
toolchain, current GitHub issues, native bundle version, and the 0.5.10 ZIP's
SHA-256 companion. The package checksum passes; metadata identifies clean
`69d234b` source, ad-hoc signing, and no notarization. No runtime tests or builds
were rerun. The existing untracked `fixtures/large-structure/1AON.pdb` was left
untouched. No issue or Git publication state was changed by this pass.

## Version 0.5.10

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.10` tag, push to `origin` on `main`, and a rebuilt redistributable. This
release fixes
[#23](https://github.com/uvar-apps/eigenvista/issues/23): in the desktop app,
loading a vertex/fragment shader or a `.params` file opened a native dialog
with every file disabled.

Root cause: `pickNative()` in [files.ts](../app/src/files.ts) hardcoded the
"Molecular documents" filter for every native open dialog. The shader panel —
and the atom-colours picker added in 0.5.8 — called it unchanged, so the
dialog filtered out `.glsl`, `.vert`, `.frag`, `.params`, and `.json`.
The browser build was unaffected (its `accept` attributes were already right),
which is why the e2e suite never caught it: Playwright exercises the browser
path only, and the native dialog is a Tauri platform call it cannot drive.

The fix gives `pickNative` an optional extension list + label, and puts one
extension map in [ShaderPanel.tsx](../app/src/ShaderPanel.tsx) behind both the
browser `accept` attributes and the native filter so the two paths cannot
diverge again. The atom-colours picker now filters for `json`/`txt`.

Evidence on the development Apple Silicon Mac, 12 October 2026:

| Check | Result |
| --- | --- |
| `cargo fmt --all --check` | clean |
| `npm --prefix app test` | 141 passed, 0 failed |
| `cargo clippy --workspace --all-targets -- -D warnings` | clean |
| `cargo test -p eigenvista-desktop` | passed |
| `npm --prefix app run build` | passed |
| `shaders.spec.ts` + `atom-colors.spec.ts`, Chromium + WebKit | 14 passed |

At implementation time, the native dialog filter itself was verified by inspection only — native
file dialogs are not automatable in the current e2e harness. A manual smoke
test (open a surface, load a shader) was the remaining close-out for #23.

Subsequent [release verification](https://github.com/uvar-apps/eigenvista/issues/23#issuecomment-6125936422)
records 141 Rust tests, a separate desktop-shell pass, all 150 Chromium/WebKit
cases, strict Clippy, and a verified 0.5.10 ZIP from clean `69d234b` source.
The [user's native smoke-test confirmation](https://github.com/uvar-apps/eigenvista/issues/23#issuecomment-6126068761)
then confirmed shader and params loading in shipped 0.5.10; issue #23 is closed.
This is not evidence for every native dialog or clean-machine installation.

## Version 0.5.9

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.9` tag, and push to `origin` on `main`. This release adds mmCIF
structure import, tracked by
[#18](https://github.com/uvar-apps/eigenvista/issues/18).

mmCIF (`.cif`, `.mcif`, `.pdbx`) now opens through the same path as legacy
PDB in the browser, the Tauri shell, and `eigenvista-convert` — one dispatch
change in `import_bytes` covers all three. This matters because the PDB no
longer distributes larger entries in legacy PDB format, which is capped at
99,999 atoms.

New reader: [cif.rs](../crates/eigenvista-core/src/import/cif.rs), dispatched
from `eigenvista_import::import_bytes`, so the browser, Tauri shell, and
`eigenvista-convert` CLI all gain it from one change. Frontend picker and CLI
help updated.

**Why a dedicated tokenizer rather than `pdbtbx`'s mmCIF reader.** `pdbtbx`
0.12.0 was probed first and does parse mmCIF from memory under the currently
pinned feature set, which would have meant no new dependency. It was rejected
because it **panics** on malformed input — `?` in a required field such as
`label_atom_id`, a `nan` coordinate, a `.` where a number is expected — and a
panic in the WASM worker is a hard abort rather than a reportable error.
Imported files are untrusted, so that is not an acceptable boundary. The
reader tokenizes the needed mmCIF subset directly and checks every value.
`cif_malformed_input_errors_rather_than_panicking` covers each shape that
panics upstream with `catch_unwind`.

Scope: `_atom_site` coordinates (angstrom → bohr), first model only, the same
alternate-location policy as PDB, unknown element symbols skipped and counted
rather than guessed, bonds perceived from coordinates. `_cell` and
`_symmetry.space_group_name_H-M` are read into provenance but not applied.
`struct_conn` is not read. No symmetry mates, no periodic boundaries, no
BinaryCIF, no mmCIF export. Budgets: 64 MiB per file, 250,000 atoms.

Evidence on the development Apple Silicon Mac, 12 October 2026:

| Check | Result |
| --- | --- |
| `cargo fmt --all --check` | clean |
| `npm --prefix app test` | 141 passed, 0 failed |
| `cargo clippy --workspace --all-targets -- -D warnings` | clean |
| `npm --prefix app run build` | passed (WASM + `tsc --noEmit`) |
| `cif_import.rs` unit/integration tests | 9 passed |
| `cif.spec.ts` e2e, Chromium + WebKit | 6 passed |
| `1BH3.cif` | 2,372 atoms / 2,270 bonds (from 2,395 rows) |
| `1AON.cif` | 58,870 atoms / 59,307 bonds |

Rendered output was inspected directly: `1BH3.cif` opens as a ball-and-stick
structure with correct CPK colours, and provenance reports the unit cell
`a=104.250, b=104.250, c=124.930, α=90.00, β=90.00, γ=120.00` and space
group `'H 3'`, matching the independent `pdbtbx` probe (hexagonal, index 146).
Screenshot: `app/artifacts/cif-1bh3-desktop.png`.

Not done here, captured as separate follow-up issues: `struct_conn`
connectivity, symmetry mates and periodic boundaries, BinaryCIF, and mmCIF
export.

## Version 0.5.8

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.8` tag, and push to `origin` on `main`. This release makes the
per-element atom colour palette loadable from a JSON file, tracked by
[#17](https://github.com/uvar-apps/eigenvista/issues/17).

Colour moves out of `app/src/elements.ts` into
[atom-colors.json](../app/src/atom-colors.json), the single source of truth
for the default palette. [atomColors.ts](../app/src/atomColors.ts) parses and
validates a loaded file, and `resolveAtomColor` resolves session override →
bundled default → the `#b294b9` unknown-element sentinel. The **Atom colours**
panel loads a file and resets to defaults across both the browser and Tauri
paths.

The palette is a session display preference and is **not** written into
`.eigenvista` — no container format change, no format version bump, no
migration. A colour change re-tints the instanced atoms in place; the scene
rebuild reads the palette through a ref so it is not keyed on it. Symbols and
radii stay fixed in `elements.ts`.

`element_display.rs` now reads colours from the JSON and asserts schema, 118
entries, lowercase hex, and **all-distinct**, plus that `elements.ts` declares
no colour of its own.

Fresh verification on Apple Silicon macOS with Rust 1.99.0:

| Gate | Result |
| --- | --- |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | Passed |
| `cargo test --locked --workspace` | 133 passed (122 at 0.5.7 + 11 new palette and table guards) |
| `npm --prefix app run build` | Passed; existing bundle-size warning remains |
| `npm --prefix app run test:e2e` | 144 passed — 72 Chromium and 72 WebKit |
| `eigenvista-convert --version` | Reports `0.5.8` |
| Version/lock checks and local documentation targets | Passed; no external dependency changes |

Not run: `test:packaging`, the native Tauri shell, clean-machine install,
Linux/Windows. No 0.5.8 redistributable ZIP was built for this request.
External locked dependencies are unchanged; `cargo update --workspace` moved
only the six first-party packages.

## Version 0.5.7

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.7` tag, and push to `origin` on `main`. The display-table work landed
separately as `97114f4`; this release carries the version bump across the
workspace, npm, and Tauri manifests plus the documentation below. It
supersedes the display table shipped in 0.5.5/0.5.6, which coloured by
periodic **group** rather than by element.

The 0.5.6 table used 13 distinct colours across 118 elements. `#e6e600` alone
covered 32 of them, including sulfur and chlorine, and Sc through Zn were all
the same yellow. Issue #1 was closed as completed, but for the d-block the
original complaint — several chemically distinct elements rendering visually
identical — still held.

The table now lives in [elements.ts](../app/src/elements.ts) and gives every
supported element its own colour and radius:

| Field | Count | Source |
| --- | --- | --- |
| Colour, Z 1-109 | 101 | Jmol CPK (`PAL.argbsCpk`), cross-checked against jmol.sourceforge.net/jscolors and ASE `jmol_colors` |
| Colour, Z 110-118 | 9 | OpenBabel `data/element.txt` continuation; no CPK colour is published past Mt |
| Colour, legacy 8 | 8 | Restores the pre-0.5.5 EigenVista values, so H/C/N/O/F/P/S/Cl look as they did before 0.5.5 changed them |
| Radius | 85 | Alvarez (2013), Dalton Trans. 42, 8617, via `pdbtbx::Element::atomic_radius().van_der_waals` |
| Radius, Pm and Po-Ra | 6 | Rahm, Hoffmann & Ashcroft (2016), Chem. Eur. J. 22, 14625, via `atomic_radius().unbound` |
| Radius, Fm-Og | 19 | No published value; Pyykko single-bond covalent radius x 1.65, the mean unbound/cov1 ratio over Ac-Cm |
| Radius, legacy 8 | 8 | Bondi (1966) values pinned deliberately |

Distinct colours go from 13 to 118. Radii change on 109 of 118 elements. The
0.5.6 group-congener extrapolation for Rf-Og is replaced by the Pyykko
scaling above, which now also covers Fm-Lr rather than stopping at 104.

Display data only. Bond perception still uses the Pyykko-Atsumi covalent radii
in `crates/eigenvista-core/src/bonds.rs`; nothing here feeds a scientific
calculation.

`default_atom_colors`, the raw RGB-triple working file committed at the
repository root by `3637137`, is removed.

New [element_display.rs](../crates/eigenvista-core/tests/element_display.rs)
(6 tests) re-derives every radius from the `pdbtbx` tables, asserts the
8/85/6/19 source split, checks symbols against the element table, checks
colours are lowercase hex triplets, and bounds radii to 0.8-3.6 A to catch a
unit slip.

Verification on Apple Silicon macOS, Rust 1.99.0:

| Gate | Result |
| --- | --- |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | Passed |
| `cargo test --locked --workspace` | 128 passed (122 prior + 6 new) |
| `npm --prefix app run build` | Passed; existing bundle-size warning remains |
| `npm --prefix app run test:e2e` | 136 passed (68 Chromium, 68 WebKit) |
| Visual A/B | Same 28-element fixture on both builds: 13 distinct rendered hue buckets before, 22 after |

Not run: `test:packaging`, native Tauri shell, clean-machine install,
Linux/Windows. No 0.5.7 redistributable ZIP was built for this request.
External locked dependencies are unchanged; `cargo update --workspace` moved
only the six first-party packages.

## Version 0.5.6

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.6` tag, and push to `origin` on `main`. This patch extends the atom
display table from Z 1–103 to the full model-accepted range Z 1–118, the
remaining scope of
[#1](https://github.com/uvar-apps/eigenvista/issues/1). No measured van der
Waals radii exist for Rf–Og; their radii are extrapolated from each
element's group congener (Rf←Hf … Og←Rn) and their colors follow the same
group palette as the supplied table (transition metals yellow, group 13
light blue, 14 dark gray, 15 brown, 16 dark green, 17 purple, 18 white).
The code records this provenance in a comment at the table. The generic
`Z`-prefixed fallback is now unreachable for documents the Rust model
accepts (Z 1–118) but remains as defensive code. `docs/user-guide.md` and
`docs/handoff.md` now describe the full-range table. This is a display-only
change; the scientific model, bond perception, native format, and worker
paths are untouched.

Verification on Apple Silicon macOS (partial; the change is TypeScript-only):

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npx playwright test tests/viewer.spec.ts tests/connectivity.spec.ts` | 28 passed: 14 scenarios across Chromium and WebKit |

Not rerun for this change: the remaining 11 browser specs (full suite is
136 cases), workspace Rust tests, Clippy, formatting, the production
WASM/frontend build, packaging tests, native GUI interaction, and any
redistributable ZIP. External locked dependencies and all first-party
versions agree at 0.5.6. The issue's remaining suggestions (a deliberately
distinct fallback for unmodelled elements and an unrecognized-element count
in the document summary) are not implemented, though the fallback is now
unreachable for valid documents.

## Version 0.5.5

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.5` tag, and push to `origin` on `main`. This patch extends the atom
display table from eight elements to elements 1–103, tracked by
[#1](https://github.com/uvar-apps/eigenvista/issues/1). Colors come from the
supplied Jmol-style default palette (float RGB converted to hex); radii are
the Bondi (1964) van der Waals values with the standard extensions of the
same table, matching the eight radii already in the viewer. Picking labels
use real symbols across the covered range. Elements Z ≥ 104 retain the
generic fallback color, radius, and `Z`-prefixed label. This is a
display-only change: the scientific model, bond perception (separate
covalent-radius table), native format, and worker paths are untouched.

Verification on Apple Silicon macOS (partial; the change is TypeScript-only):

| Gate | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed |
| `npx playwright test tests/viewer.spec.ts tests/connectivity.spec.ts` | 28 passed: 14 scenarios across Chromium and WebKit |
| Desktop/mobile screenshots in both engines | Inspected; new colors and instanced picking labels render correctly |

Not rerun for this change: the remaining 11 browser specs (full suite is
136 cases), workspace Rust tests, Clippy, formatting, the production
WASM/frontend build, packaging tests, native GUI interaction, and any
redistributable ZIP. External locked dependencies and all first-party
versions agree at 0.5.5. The `default_atom_colors` source table remains an
untracked working file unless separately added to the repository. The
issue's remaining suggestions (a deliberately distinct fallback for
unmodelled elements and an unrecognized-element count in the document
summary) are not implemented.

## Version 0.5.4

Date: 12 October 2026. The user requested a version bump, commit, annotated
`v0.5.4` tag, and push to `origin` on `main`. This patch releases the direct
orbital/density volume and raycast workflow described below, tracked by
[#15](https://github.com/uvar-apps/eigenvista/issues/15). It also includes the
already-committed Rust 1.99 and packaging fixes from issues #13 and #14 since
the previous tag. Rust, npm (including its previously stale root lock metadata),
and Tauri versions now agree. External locked dependencies, scientific model,
native schema, memory limits, icon, and logo are unchanged. Toolchain pinning
remains separate under issue #8.

Fresh post-bump verification on Apple Silicon macOS with Rust 1.99.0:

| Gate | Result |
| --- | --- |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | Passed |
| `cargo test --locked --workspace` | 122 passed, including the desktop shell |
| `npm --prefix app run build` | Production WASM, TypeScript, and Vite passed; existing bundle-size warning remains |
| `npm --prefix app run test:e2e` | All 136 cases passed in one run: 68 Chromium and 68 WebKit |
| `npm --prefix app run test:packaging` | 13 passed |
| `eigenvista-convert --version` | Reports `0.5.4` |
| Version/lock checks and local documentation targets | Passed; no external dependency changes |

Fresh direct-preview screenshots were inspected at desktop and mobile sizes
in both engines; canvas pixel, camera, and responsive-layout checks pass. The
existing web preview server was left running. No 0.5.4 redistributable ZIP was
built for this request; the older archive does not contain the direct-preview
fix. Native GUI interaction, clean-machine installation, and Linux/Windows
qualification were not rerun. Consult Git for commit/tag/publication identity.

## Direct sampled previews

Date: 12 October 2026. Implemented at version **0.5.3** before the release above;
tracked by
[#15](https://github.com/uvar-apps/eigenvista/issues/15).

The UI previously disabled volume/raycast until a sampled grid existed, while
analytic fields only obtained that grid through mesh generation. Selecting a
sampled mode now uses the existing worker `sample` operation directly. No
marching-cubes call or saved surface is needed. Field/resolution changes in a
sampled mode resample while preserving that mode; switching volume/raycast
reuses the current grid. Changed settings and the new preview publish only on
success, so cancellation or failure retains the prior field, resolution, mode,
and saved geometry. Explicit Generate surfaces remains the mesh operation.
Scientific evaluation, allocation limits, and native file format are unchanged.

Verification with Rust 1.99.0: production WASM/TypeScript/frontend build and
`tsc --noEmit` pass. All **136 browser scenarios** are verified across Chromium
and WebKit: the full run passed 128; eight existing cases asserted the former
disabled-mode behavior and all eight passed a `--last-failed` rerun after those
expectations were updated. The new eight cases use the actual legacy
`molden.input`, observe sampling-only worker requests with no meshing, exercise
orbital/density selection, resolution changes, cache reuse, native save/reopen,
structure-only mode availability, cancellation during real 256-cubed sampling,
and worker-error recovery without changing saved meshes. Cube preview-failure
retries still preserve the original finite f64 samples. Desktop/mobile pixel
checks and screenshots in both engines show nonblank, correctly framed previews.

The running web preview received the update without restarting its server.
Rust unit tests, native GUI interaction, and the redistributable ZIP were not
rerun/rebuilt for this UI-only change. The prior tester archive does not include
this fix. Changes were local at that stage; the authorized 0.5.4 release and
fresh verification are recorded above.

## Rust 1.99 compatibility and packaging fixes

Date: 12 October 2026. Version remains **0.5.3**. Work is tracked by
[#13](https://github.com/uvar-apps/eigenvista/issues/13) and
[#14](https://github.com/uvar-apps/eigenvista/issues/14).

- Fixed the five `clippy::chunks_exact_to_as_chunks` findings exposed by Rust
  1.99.0. Fixed-size slice chunks preserve triangle order, in-place winding
  reversal, and ignored remainders without changing allocations or science.
- Updated packaged-example assertions to check both `atoms.positions` and
  `atoms.elements`. The old `atoms.length` assertions predated the columnar
  atom JSON and blocked ZIP verification independently of the Rust upgrade.
  PDB/XYZ bonds, Molden/cube fields, signed meshes, native roundtrips, and
  converter/WASM agreement remain checked.
- Toolchain policy is unchanged: the setup instructions still select 1.92.0,
  there is no committed `rust-toolchain.toml`, and
  [#8](https://github.com/uvar-apps/eigenvista/issues/8) remains open.
  This verification explicitly selects `RUSTUP_TOOLCHAIN=stable` (1.99.0),
  with all temporary storage under the repository's ignored `tmp/`.

### Verification

The strict Clippy failure and obsolete `water.pdb` atom-count assertion were
both reproduced before editing. After the fixes, on Apple Silicon macOS 27.0:

| Gate | Result |
| --- | --- |
| `cargo fmt --all --check` | Passed |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | Passed, without lint suppression |
| `cargo test --locked --workspace` | 122 passed, including the desktop shell |
| `npm --prefix app run test:packaging` | 13 passed |
| `npm --prefix app run package:macos` | Passed: optimized CLI/native app, production WASM/frontend, signatures, sample conversions, ZIP extraction contents and permissions |
| `npm --prefix app run test:e2e` | 128 passed: 64 Chromium and 64 WebKit; fresh cube mesh/mobile volume screenshots inspected |
| Archive SHA-256 companion | Independently checked with `shasum -a 256 -c`; passed |

The verified local tester archive under `artifacts/distributions/` is
`EigenVista-0.5.3-apple-silicon-20261012T035325Z-f13aa8f-dirty.zip`.
Its source snapshot includes these fixes and the existing agent instructions,
before this final verification-record update. `BUILD-INFO.json` records Rust
1.99.0, wasm-bindgen 0.2.108, and the identified uncommitted source state.
The archive is ad-hoc signed, not notarized. At packaging time, the source was
uncommitted and the archive was not uploaded; later Git publication does not
change that archive's recorded source identity.
Native GUI interaction, clean-machine installation, and Linux/Windows acceptance
were not rerun or established by these checks.

## Version 0.5.3

Date: 5 October 2026. Follows the review's item 4. The user asked for the work
committed as separate commits, the remaining manifest ceiling addressed, and the
version bumped to **0.5.3** with a tag. No push was requested. Measured against
`fixtures/large-structure/4PJ1.pdb` (65,963 atoms, 66,610 bonds perceived).

### Renderer instancing

Atoms and bonds were one `Mesh` with one geometry and one material each. On 4PJ1
that meant ~121,500 draw calls per frame and a 3.2 GB JS heap. Both collections
now render as a single `THREE.InstancedMesh` over one shared unit geometry and one
shared material, with per-instance transform and colour.

| Metric (4PJ1, 12 forced frames) | Before | After |
| --- | --- | --- |
| Draw calls per frame | 121,525 | **1.8** |
| Non-instanced draw calls | 1,458,303 | **0** |
| JS heap | 3,185 MB | **73 MB** |

Radius formulas per representation, the `1e-10` degenerate-bond filter, and label
text are unchanged. Selection required real work: an `InstancedMesh` has no
per-object `userData.label`, so the hit label is resolved from
`intersection.instanceId` against a per-instance label list, falling back to the
per-object label used by surfaces. `InstancedMesh::dispose` is now called so
instance buffers are released. `app/src/Viewport.tsx`; regression test in
`app/tests/viewer.spec.ts` (verified to fail if the instance-aware lookup is
reverted).

### Columnar packing

Instancing fixed rendering, but the document still could not be **saved**:
`Document has too many array entries for the preview profile`. Every numeric array
leaf took its own ZIP entry, and `Atom` stores `position` as a nested array, so
each atom cost one entry — capping any document at **8,191 atoms regardless of
byte size**. Raising the cap alone does not help: each entry needs ~196 bytes of
manifest to describe as little as 24 bytes of payload, so 65,963 atoms would put
the manifest at ~12 MiB against the separate 8 MiB manifest budget.

`pack` now coalesces any run of identically-shaped numeric arrays across the rows
of an object array into one `[rows, …inner]` column, with each row holding a
`{ "$array": id, "$index": k }` pointer. Uniform shapes coalesce (atom
positions, basis centers, orbital coefficient vectors); non-uniform rows fall
back to per-row entries.

| 4PJ1 | Before | After |
| --- | --- | --- |
| Array entries | 65,963+ (encode refused) | **2** |
| Saved size | — | 1.71 MB |
| Decode peak RSS per atom | 3,198 B | 2,185 B |

The Rust API and the app-facing JSON keep their row-wise shape; only the on-disk
layout changed. Pre-coalescing documents still decode, since a single-key
`{ "$array": id }` reference remains valid. See
[preview format](preview-format.md#columnar-coalescing).

### Verification

`cargo fmt`, `cargo test --locked`, `clippy --workspace --all-targets -D warnings`,
`cargo test -p eigenvista-desktop`, `npm run build`, and `test:packaging` all
pass. New `crates/eigenvista-format/tests/columnar_packing.rs` pins the
entry-count collapse, round-trip fidelity at 1–10,000 atoms, the non-uniform
fallback, and rejection of out-of-range, non-integer, extra-key, and unknown-id
column references (the manifest carries no digest of its own, so decode-side
bounds checks are the boundary). All 14 chemistry fixtures across PDB, XYZ, Cube,
and Molden encode and round-trip. In-browser, 4PJ1 opens, renders, and saves
through the real app path to a file byte-identical (same SHA-256) to the CLI
encode. Full Playwright suite green on Chromium and WebKit.

4PJ1 is now a checked-in regression fixture under
[`fixtures/large-structure/`](../fixtures/large-structure/README.md) with its own
SHA-256 manifest recording the RCSB source. It deliberately does **not** live in
`fixtures/legacy/`, whose README pins that directory to eight files copied
byte-for-byte from Molekel commit `4edabf6`; 4PJ1 came from the PDB, so putting
it there would have falsified that provenance record. The new
`crates/eigenvista-format/tests/large_structure.rs` verifies the fixture checksum
before anything else (a silently edited fixture would otherwise make every other
assertion pass against the wrong molecule), then pins the import counts, the
two-reference atom encoding, the small constant-shaped manifest, and exact decode
fidelity.

### Atom columns — the ceiling removed

Coalescing fixed the entry count but left the manifest growing with atom count
(~56 B per row object), which would still have bound near 140k atoms against the
8 MiB manifest budget. The atom collection is now columnar in the document JSON
itself:

```json
"atoms": { "elements": { "$array": "aN" }, "positions": { "$array": "aM" } }
```

Two references, so the manifest is constant-size with respect to atom count.
`Document::atoms` in Rust stays a row-wise `Vec<Atom>`; the conversion lives in a
`atoms_columnar` serde module in `model.rs`. The app reads
`atoms.elements[i]` / `atoms.positions[i]` (`app/src/types.ts`,
`Viewport.tsx`, `App.tsx`).

Deserialization accepts the columnar object **and** the older row-wise array of
`{ element, position }` records. The custom `Visitor` dispatches on the JSON token
via `visit_map` / `visit_seq`, so both forms parse without buffering — an
untagged enum would have copied the whole collection into an intermediate value,
which is precisely the cost being removed. This is what keeps the existing
`fixtures/pyscf` JSON inputs parsing unchanged.

| 60,000 atoms | Row-wise | Coalesced rows | Atom columns |
| --- | --- | --- | --- |
| Manifest | 3,271 KiB | 3,271 KiB | **1 KiB** |
| Decode peak per atom | 3,198 B | 2,185 B | **929 B** |

At 100,000 atoms the manifest is 1,455 bytes with 3 entries, encoding and
validating at 77 MB peak — a size the previous format refused outright at 8,191.
The XYZ importer keeps its own separate `1..100000` input cap.

New tests cover the constant-size manifest, exact round-trip from 1 to 10,000
atoms, row-wise backward compatibility, column length-mismatch rejection, and the
`{array, index}` tamper surface that remains on basis centers and orbital
coefficients.

## Version 0.5.2

Date: 5 October 2026. The user asked that all changes be documented and the
version bumped to **0.5.2**, committed, and tagged. No push was requested.

This release adds no features. It fixes four defects surfaced by the
[2026-10-04 code review](reviews/2026-10-04-code-review.md) and the review
that followed it in the same session, and corrects stale documentation.

### Fixed

- **A cold start no longer marks the session unsaved** (P1). `example()` set
  `dirty = false` and then awaited `compute()`, which ended in an
  unconditional `setDirty(true)`. Every load therefore showed the
  unsaved-changes dot and armed the `beforeunload` guard with zero user
  edits. `compute()` now takes a `markDirty` flag (default `true`); the
  built-in example passes `false`, because it regenerates identically on
  every load. Verified in-browser: no leave-site prompt on a clean cold
  start, and the prompt still fires after a real edit. `app/src/App.tsx`,
  regression test in `app/tests/viewer.spec.ts`.
- **`request()` rejects instead of throwing synchronously** (Medium). Worker
  construction and posting moved inside the Promise executor, so a
  `new Worker()` failure (blocked CSP, exhausted resource limit) rejects the
  caller's promise instead of escaping `request()` where a caller's
  `.catch()` could not see it. The `worker!` non-null assertion was replaced
  with an explicit guard. `app/src/science.ts`, regression test in
  `app/tests/viewer.spec.ts`.
- **A malformed `.params` file is rejected instead of pushing NaN into a
  uniform** (Medium). Every numeric component is now checked with
  `Number.isFinite`, and an unsupported `kind` is reported rather than
  silently dropped; both errors name the parameter and the line number.
  Previously `Number("nonsense")` yielded `NaN`, which went straight into the
  WebGL uniform and was written back out by Save parameters.
  `app/src/shaderTools.ts`, surfaced through a new `paramsError` state in
  `app/src/ShaderPanel.tsx`, regression test in `app/tests/shaders.spec.ts`.
- **Intermittent WebKit canvas-read failure in the test suite** (test-only).
  Three specs read the WebGL canvas with a bare one-shot `readPixels`, racing
  the first rendered frame and intermittently measuring zero colourful
  pixels. The helper now polls until a frame is present (bounded 60 × 50 ms);
  a genuinely blank canvas still reports 0 and fails the caller's threshold,
  so this cannot mask a real rendering bug. The other six pixel-reading specs
  already wrapped their reads in `expect.poll` and were unaffected.
  `app/tests/viewer.spec.ts`, `app/tests/shaders.spec.ts`,
  `app/tests/camera.spec.ts`.

### Documentation corrections

Seven stale statements in `docs/status.md` and `docs/handoff.md` were
corrected: three "Nothing committed" notes that contradicted the landed
0.5.0/0.5.1 history (rewritten to name the commit that actually carries the
work), and four `next/` paths in present-tense guidance, where the packaging
command and output directory now read `app/` and `artifacts/`. One
convenience-copy path was deliberately left as `next/…` with a clarifier,
because that behaviour belonged to the pre-standalone tooling and the current
`eigenvista-convert` CLI writes `INPUT.eigenvista` or `--output` /
`--output-dir`. A stale `next/chat-*.md` ignore path in the handoff now names
the actual root-level `chat-*.md` / `*-chat-*.md` patterns.

### Verification

All run on macOS 27 / Apple Silicon on 5 October 2026.

| Check | Result |
| --- | --- |
| `cargo fmt --all --check` | pass |
| `cargo test --locked` (default members) | 107 passed |
| `cargo test --locked -p eigenvista-desktop` | 1 passed |
| `cargo clippy --workspace --all-targets -- -D warnings` | pass |
| `npm --prefix app run test:packaging` | 13/13 |
| `npx tsc --noEmit` | pass |
| Playwright, Chromium + WebKit, full suite | 126 passed, 3 consecutive full runs |

Each new regression test was run against the pre-fix code to confirm it
genuinely fails there: the cold-start test reports the dirty indicator, the
worker test reports a synchronous throw, and the parameters test accepts the
malformed file. The WebKit flake was confirmed pre-existing by stashing every
change and reproducing it on the untouched `v0.5.1` tree, so rolling the
fixes back would not have removed it.

Not run for this bump: the macOS tester ZIP build and its extracted-artifact
verification, ad-hoc signature and architecture checks, Gatekeeper
clean-machine installation, notarization, and any interactive native dialog
test. Linux and Windows remain unverified here. No new external dependencies;
the only lockfile changes are the six first-party version entries.

## Version 0.5.1

The user requested a version bump to **0.5.1**, a commit, an annotated
`v0.5.1` tag, and a push to `origin` on `main`. This release adds shader
compile/link log display in the surface-shader panel, writable classic
`gl_ClipVertex`/`gl_FogFragCoord` compatibility (so Molekel `phong.*` works),
and vendored Molekel `shaders/` shipped as `Shaders/` in tester packages with
`Third-party-notices/Classic-shaders/`. External locked dependencies are unchanged.

Preflight: packaging tests 13/13, full verified ZIP
`EigenVista-0.5.0-apple-silicon-20261004T083506Z-b62d05f-dirty.zip` (from the
pre-bump tree), Playwright `viewer.spec.ts` + `shaders.spec.ts` (18 cases)
Chromium and WebKit, production build. Rust workspace tests were run earlier
in this increment and are unchanged by the version bump itself. Not notarized.

## Classic Molekel surface shaders in packages

The Molekel `shaders/` tree is vendored unchanged at repository `shaders/`
(lambert, phong, phong_fog, clip, x-ray families plus `doc/`). Provenance and
GPL-2.0-or-later attribution are in `shaders/README.md`. The macOS tester ZIP
stages that directory as `Shaders/` and copies the README under
`Third-party-notices/Classic-shaders/`. EigenVista-authored samples remain in
`app/shaders/`. No legacy C++ or application code was copied.

Verification: packaging tests 13/13 including a completeness check for the
vendored pairs. Full verified ZIP
`EigenVista-0.5.0-apple-silicon-20261004T083506Z-b62d05f-dirty.zip` passes
ad-hoc signature checks, extracted-artifact verification, example
conversion/roundtrips, and contains `Shaders/` plus both notice copies. That
archive is built from uncommitted working-tree changes (shader feature work
after `v0.5.0`); `BUILD-INFO.json`/`SOURCE-MANIFEST.json` identify it as
`-dirty`. Not notarized; not uploaded.

## Version 0.5.0

The user requested a version bump to **0.5.0**, a commit, an annotated
`v0.5.0` tag, and a push to `origin` on `main`. This release adds surface
shading (Diffuse / Blinn-Phong), custom vertex/fragment surface shaders with
live uniform controls and Molekel-style `.params` load/save, and the agent
guide refresh. External locked dependencies are unchanged.

Preflight for this bump: cargo fmt --check, workspace `cargo test --locked`
(all default scientific/format/import/CLI tests green), workspace/all-target
Clippy with `-D warnings`, production WASM/TypeScript/frontend build,
`tsc --noEmit`, and Playwright `viewer.spec.ts` + `shaders.spec.ts` +
`connectivity.spec.ts` (28 cases) on Chromium and WebKit. Packaging and a full
tester ZIP were not rerun for this release action. No clean-machine install or
notarized build is claimed.

## Custom surface shaders (vertex/fragment + live uniforms)

Appearance now includes a **Surface shader** panel modeled on classic Molekel
Display→Shaders: load a vertex file, fragment file, and optional `.params`
file; apply to all surfaces or one saved surface; edit parsed uniforms live;
save current values back to a Molekel-style `.params` text file.

Implementation is TypeScript-only (`app/src/shaderTools.ts`,
`app/src/ShaderPanel.tsx`, `Viewport.tsx`/`App.tsx` wiring). Classic GLSL 1.x
built-ins (`ftransform`, `gl_Vertex`, `gl_Normal`, `gl_Color`,
`gl_ModelViewMatrix`, `gl_NormalMatrix`) are mapped onto Three.js ShaderMaterial
names, with reserved-name renames to avoid `normal`/`position` collisions.
Examples: `app/shaders/surface-lambert.*` and `surface-phong.*`. Native schema,
scientific data, and `.eigenvista` contracts are unchanged; shaders/uniforms are
session-only.

Verification: production WASM/TypeScript/frontend build and `tsc --noEmit`
pass. `app/tests/shaders.spec.ts` covers load → params → apply → live uniform
edits → save parameters → clear on Chromium and WebKit (2/2). Full
`viewer.spec.ts` remains 14/14 after scoping document file-input selectors.
Screenshots: `artifacts/custom-shader-lambert.png`,
`custom-shader-saturation0.png`, `custom-shader-phong.png`. Manual native
acceptance and packaging were not rerun. This work was committed later in
`b62d05f` (0.5.0); the statement above describes the pre-bump state.

## Surface shading (Diffuse / Blinn-Phong)

The Appearance panel now offers **Surface shading**: **Diffuse** (previous
two-sided lambert-style lighting) or **Blinn-Phong** (explicit ambient +
diffuse + specular half-vector term). The option applies to saved/generated
isosurface meshes and sampled raycast isosurfaces only; atoms, bonds, and
volume preview keep their existing materials. Shading is a session display
preference like render mode and is not written into `.eigenvista` files.

Implementation is TypeScript/shader only (`app/src/types.ts`, `App.tsx`,
`Viewport.tsx`, `volume.ts`). Native schema shape `[0, 1]`, scientific data,
and format contracts are unchanged.

Verification: production WASM/TypeScript/frontend build and `tsc --noEmit`
pass. Focused Playwright coverage in `app/tests/viewer.spec.ts` switches
mesh and raycast shading on Chromium and WebKit, asserts canvas pixels change
and remain nonblank, and writes `artifacts/surface-blinn-phong.png` and
`artifacts/raycast-blinn-phong.png` (both inspected). Full `viewer.spec.ts`
passes 14/14 on Chromium and WebKit. Manual native acceptance and packaging
were not rerun. This work was committed later in `b62d05f` (0.5.0); the
statement above describes the pre-bump state.

## Private chat exports

Root-level titled `*-chat-*.md` exports are now ignored alongside `chat-*.md`.
Source selection excludes both filename forms before filesystem access, and
snapshotting rejects either form even if accidentally tracked. The user's
saved chat was not read or modified. Agent and packaging guidance reflect
the exclusion; application behavior, dependencies, and version are unchanged.

Verification passes 12 packaging tests, including a missing-file regression
that proves exclusion happens before reads, Git ignore/source-list checks,
and a full macOS tester build with extracted signatures and example checks.
The extracted source archive and source manifest contain no chat export files.
The archive is `EigenVista-0.4.0-apple-silicon-20261004T061422Z-473024d-dirty.zip`;
its source snapshot predates this evidence-only documentation update. Browser
and interactive native checks were not rerun. The ignore rules and packaging
guidance for this were committed later in `5dd0ff4`; nothing was uploaded then
or since.

## Standalone migration

The user requested a dedicated EigenVista repository with the former `next/`
contents at its root and no legacy application code. Eight rewrite-only
commits were extracted from the original repository at
`4edabf6852db44ff849e82223bef6c0702730e3c`; their rewritten hashes differ from
the original history. Original commits and tags remain in the Molekel
repository. See the [migration record](migration.md) for provenance.

Version remains **0.4.0**. The workspace/app/tooling/documentation paths are
root-relative. Four PDB files, one Molden file, and three cube files are
retained as unchanged, licensed data-only inputs under `fixtures/legacy/`.
The original brief and research plans are linked to the pinned original
revision rather than copied. No legacy C++ application source or build system
is included, and the original checkout is not modified. The icon, logo,
scientific data contracts, and native-file compatibility are unchanged.

The standalone checkout passes **108 workspace Rust tests**, **114 Chromium/WebKit
browser cases**, and **11 packaging tests**. Production WASM/TypeScript/frontend
build, formatting, workspace/all-target Clippy, fixture checksums, and local
documentation targets pass. Browser tests used an isolated server on port 5189;
the user's original preview on 5178 was preserved. Desktop/mobile rendering
screenshots were inspected. The existing frontend chunk-size warning remains.

All original icons, frozen scientific references, runtime scientific/UI code,
and dependency records are unchanged. The eight extracted commits contain no
legacy C/C++ application files or private chat exports. New root-local temporary
paths also cover the offline reference generators; they were syntax-checked,
not executed, and no scientific expectations were regenerated.

The full standalone macOS packager also passes: optimized arm64 app and CLI,
bundle identity, system-library checks, strict ad-hoc signatures, extracted ZIP
bytes/permissions, source stability, and PDB/XYZ/Molden/cube native/WASM example
agreement. Its verification archive is
`EigenVista-0.4.0-apple-silicon-20261004T054740Z-da27738-dirty.zip`, built from
the explicitly identified uncommitted migration before this final evidence
update. `BUILD-INFO.json` and `SOURCE-MANIFEST.json` identify that exact snapshot;
this is not a new tag, notarized release, native-dialog test, or clean-Mac install.
All 220 local documentation targets resolve. Git records actual new commits,
remotes, and publication; original dated evidence below remains historical.

## Version 0.4.0 in the original repository

The user requested **EigenVista 0.4.0**, committing the rename below, an annotated
`v0.4.0` tag, and a push of the current `2026` branch to `origin`. The Rust
workspace and six first-party lock entries, npm package/lockfile, Tauri metadata,
and current user/architecture/handoff descriptions use 0.4.0. External
dependencies, icon/logo assets, scientific reference data, and the native
schema shape `[0, 1]` are unchanged. New documents use EigenVista identifiers;
the legacy Molekel reader compatibility remains as documented below.

The 0.4.0 release preflight passes **108 workspace Rust tests**, **114
Chromium/WebKit browser cases**, and **9 packaging tests** after the version
change. Production WASM/TypeScript/frontend build, Rust/frontend formatting,
workspace/all-target Clippy with warnings denied, structured version/dependency
checks, all 202 local documentation targets, and `git diff --check` pass.
Desktop/mobile branding screenshots were inspected; the converter reports
`eigenvista-convert 0.4.0`. The existing frontend chunk-size warning remains.
The running preview and private chat exports are preserved. Native interactive
and clean-machine installation acceptance remain separate from these checks;
tester archives are ad-hoc signed, not notarized public releases.

The repository remains at `ugovaretto/molekel`; no organization migration is
part of this release. Git records the completed commit/tag/push, and each
delivered tester ZIP's `BUILD-INFO.json` records its exact source and checks.

## EigenVista rename

The user requested renaming the active rewrite to **EigenVista**, keeping its
icon and logo. That initial rename retained version **0.3.2**; the repository,
`next/` source location, and current branch remained unchanged. Active packages, commands,
application metadata, generated WASM names, and documentation adopt EigenVista.
The native bundle is `EigenVista.app`; the CLI is `eigenvista-convert`; new
tester ZIP names start with `EigenVista-` and contain
`Source/eigenvista-source.tar.gz`.

The canonical native suffix is `.eigenvista`. Existing `.molekel` preview files
remain readable using the previous matched format/profile identifiers, with
unchanged `[0, 1]` document shape, scientific data, source hashes, and cached
meshes. Both native profiles report `ImportReport.format: "eigenvista"`.
Encoding always writes the new `eigenvista` format and
`eigenvista-preview-polynomial-v1` profile, even when native Save is explicitly
given the supported legacy `.molekel` suffix. New saves are not guaranteed
readable in older Molekel builds. No bulk file migration is performed.
See [native compatibility](preview-format.md).

Verification passes **108 workspace Rust tests** (including native destination
validation), **114 Chromium/WebKit browser cases**, and **9 packaging tests**.
Six new Rust regressions cover exact old/new native profiles, mixed-pair
rejection, scientific arrays/source hashes/cached meshes, import reporting,
bond repair, and CLI naming/overwrite protection. Four new browser cases cover
branding, unchanged atom logo, desktop/390/320-pixel header layout, renamed
downloads, and old-profile Open/save/reopen with full document equality.
Desktop/mobile screenshots in both engines were inspected; the full existing
canvas-pixel, camera, quantum import, rendering, high-resolution, and cancellation
suite also passes. An actual pre-rename water reference file additionally passes
the renamed CLI's validation.

Production WASM/TypeScript/frontend build, Rust/frontend formatting,
workspace/all-target Clippy with warnings denied, local documentation targets,
and `git diff --check` pass. The existing frontend chunk-size warning remains.
Structured comparisons confirm all eight icon files are byte-identical and all
external Rust/npm lock entries are unchanged. The numerical core is unchanged
apart from crate-name substitutions; frozen scientific data is not regenerated.

The packager checks the EigenVista bundle identity, CLI/default filenames,
source snapshots with uncommitted crate renames, extracted bytes and permissions,
ad-hoc signatures, and native/WASM example agreement. Exact source identity
and completed archive checks are recorded in each delivered `BUILD-INFO.json`.
The tester is not notarized; native interactive and clean-machine installation
acceptance are not implied. Earlier counts and release evidence below belong
to the pre-rename Molekel implementation and remain historical evidence.
The initial rename did not request a version bump, commit, tag, or push. Historical
Molekel references, Git tags, repository URLs, original research filenames,
third-party notices, and private chat exports are not renamed.

## Version 0.3.2

The user confirmed the zoom fix in the web preview, then requested version
**0.3.2**, a commit, an annotated `v0.3.2` tag, a push of the current `2026`
branch to `origin`, and a fresh redistributable Apple Silicon tester ZIP.
This release includes the camera redraw fix, Zoom in/out buttons, camera
regressions, and updated documentation described below. The Rust workspace,
six first-party lock entries, frontend package/lockfile, Tauri metadata, and
current version descriptions use 0.3.2. External dependencies, scientific
references, and native schema `[0, 1]` are unchanged.

After the version bump, release preflight passes **102 workspace Rust tests**,
**110 Chromium/WebKit browser cases**, and **7 packaging tests**. Production
WASM/TypeScript/frontend build, Rust/frontend formatting, workspace/all-target
Clippy with warnings denied, all 195 local documentation targets, and
`git diff --check` pass. Camera screenshots were inspected on desktop and mobile.
Structured manifest checks confirm consistent versions and unchanged external
dependencies. The existing frontend chunk-size warning remains.

The existing preview and private chat export are preserved. Chat exports remain
ignored and excluded from source snapshots and commits. Inspect Git for actual
commit/tag/push state and the delivered ZIP's `BUILD-INFO.json` for its source
identity and completed packaging checks. Tester ZIPs remain ad-hoc signed, not
notarized public releases; native interactive workflows and clean-machine
installation remain separate acceptance gates.

## Camera zoom redraw

The user reported that wheel zoom in the web preview only appeared after a
later click. This was reproduced before the fix: after a wheel event and eight
animation frames, canvas pixels remained unchanged. OrbitControls updates the
camera synchronously inside its wheel handler, so the next animation-loop
`update()` can return false even though a new camera view has not been drawn.

The viewport now listens for OrbitControls change events and marks the next
frame for rendering, retaining damping and avoiding unconditional idle redraws.
The listener is removed on cleanup. Zoom in/out toolbar buttons call the
library's public dolly methods; middle-button vertical drag and touchscreen
pinch remain available. Camera-only actions do not modify saved science or
regenerate geometry. The user guide describes all zoom alternatives.

Verification passes **102 workspace Rust tests** and the full **110
Chromium/WebKit browser cases** (55 scenarios per engine). The eight new camera
cases count graphics draw calls, wait for idle frames, and verify wheel-only
pixel changes before any canvas click in both directions and all rendering
modes. They also cover Enter/Space button activation, middle-drag, and toolbar
fit/activation at 390- and 320-pixel widths. Desktop/mobile screenshots were
visually inspected. Production WASM/TypeScript/frontend build, Rust/frontend
formatting, workspace/all-target Clippy, local documentation links, and
`git diff --check` pass. The existing frontend chunk-size warning is unchanged.

At the end of the camera implementation step, version remained 0.3.1 and the
previously distributed ZIP was unchanged. Native interaction and packaging had
not been rerun. The subsequent 0.3.2 release request is recorded above.

## Version 0.3.1

The user requested version **0.3.1**, committing the high-resolution work below,
an annotated `v0.3.1` tag, pushing the current `2026` branch to `origin`, and a
fresh redistributable Apple Silicon tester ZIP. The Rust workspace and its six
first-party lock entries, frontend package/lockfile, Tauri metadata, and current
version descriptions use 0.3.1. External dependencies, frozen scientific
references, and native schema `[0, 1]` are unchanged.

The user reports calculations completing within seconds at higher resolutions;
exact dimensions and timings were not supplied. This is encouraging local
feedback, not a reproducible benchmark or a platform-wide performance promise.
Personal `next/chat-*.md` exports are now ignored so packaging cannot include
them as untracked source. The existing chat export and running preview are
preserved. Inspect Git for commit/tag/push state and each delivered ZIP's
`BUILD-INFO.json` for its source identity and completed packaging checks.

After the version bump, release preflight passes **102 workspace Rust tests**,
**102 Chromium/WebKit browser cases**, and **7 packaging tests**. Production
WASM/TypeScript/frontend build, Rust/frontend formatting, workspace/all-target
Clippy with warnings denied, local documentation links, and `git diff --check`
also pass. Desktop/mobile high-resolution screenshots were inspected. Structured
manifest checks confirm consistent versions and unchanged external dependencies;
Git source discovery excludes the private chat export. The existing large
frontend-chunk build warning remains.

The ZIP workflow builds an optimized native application and standalone converter,
uses ad-hoc signing, and includes documentation, source, examples, and dependency
notices. It is not a notarized public release. Native interactive workflows and
clean-machine installation remain separate acceptance gates.

## High-resolution grids through 256

The user requested substantially larger grids and will test real-molecule
performance themselves. Both selectors now offer 24, 32, 40, 48, 64, 80, 96,
128, 160, 192, 224, and 256 samples per axis, with default 40 unchanged. The
core accepts 12 through 256. Requests are not silently downgraded and remain
background worker jobs with cancellation and phase reports.

`Grid::validate_transient()` permits up to 256-cubed calculation samples,
separately from the unchanged 128-cubed authoritative source-grid bound.
The mesher counts actual per-cell output using all 256 case counts obtained
from the pinned library's public API. It rejects output above two million
vertices before extraction, replacing the former all-cells worst-case rejection
without changing triangulation or mesher identity. Rust-owned large buffers
use fallible reservations. Numerical/domain validation, document surface counts,
geometry budgets, and the 128 MiB native-container cap remain intact.

The WASM `SampledField` owns f64 samples, rechecks scientific identity on meshing,
and exports only small metadata plus an independent full-resolution f32 array
for display. The worker transfers that buffer instead of cloning a large grid
through JSON; the renderer uses it without another CPU-side conversion copy.
Older JSON probe APIs remain for compatibility/reference checks. Saved meshes
record the requested resolution, while authoritative scientific data and native
schema remain unchanged. No transient display array is saved as source data.

A 256-cubed field needs 128 MiB of f64 samples and another 64 MiB of display
values before geometry, temporary copies, GPU storage, and runtime overhead.
Trapped/failed workers are retired, and the next request starts fresh. Scene
construction is staged so a recoverable allocation error leaves the old scene
visible; render/image-export exceptions are reported without unmounting the UI.
Fallible allocations are not a guarantee against browser, library, GPU, or
OS-level OOM. WASM linear memory retains its high-water size until worker
termination. Existing geometry and file guards are deliberately retained.

Verification: **102 workspace Rust tests** and **102 Chromium/WebKit browser
cases** (51 scenarios in each engine), production WASM/frontend build,
formatting, and workspace/all-target Clippy pass. Native tests exercise actual
256-cubed analytic sampling, signed plane meshes, exact case-count/threshold
parity, pathological output rejection, separate source/transient limits, and
deterministic capacity-overflow handling without exhausting physical memory.
Ten new high-resolution browser cases cover a full-resolution two-AO
density, cache reuse, save/reopen, all rendering modes and mobile framing,
real 256-cubed Molden job cancellation, and injected worker/scene failure paths.
Four new direct owned-field API cases verify orbital/density/signed-affine-cube
parity against the legacy API, independent display buffers, unchanged native
sources, source-hash rejection, and reuse after a rejected request. Desktop and
mobile screenshots were visually inspected; all 169 local Markdown targets
resolve and `git diff --check` passes.

At the end of this implementation step, application version remained 0.3.0;
no commit, tag, push, native rebuild, or tester ZIP had yet been requested.
The subsequent 0.3.1 release request is recorded above. Completed high-resolution
benchmarks for the user's large Molden density are not claimed. The user's
running server and chat export were preserved.

## Version 0.3.0

The user requested version **0.3.0**, a commit of the accumulated application
changes, an annotated `v0.3.0` tag, and a push of the current `2026` branch to
`origin`. This increment includes the orbital browser and atomic multi-orbital
meshes, optimized scalar density sampling, and cancellable larger background
calculations documented below. The user also confirmed that the density in
`data/molden.input` generates effectively instantaneously at 48 cubed on their
machine; this is a local observation, not a performance guarantee.

The Rust workspace and its six first-party lock entries, frontend package and
lockfile, Tauri metadata, and current version descriptions now use 0.3.0.
External dependencies, frozen scientific reference values, and native schema
`[0, 1]` are unchanged. Earlier entries describe work before this release request;
their statements that no version bump or commit was requested are historical.
Inspect Git to establish the actual commit, tag, and remote state.

After the version update, **98 workspace Rust tests** and the complete
**88 Chromium/WebKit browser cases** pass. Production WASM/TypeScript/frontend
build, Rust/frontend formatting, workspace/all-target Clippy with warnings
denied, and all 165 local Markdown targets pass validation. Structured checks
confirm that all six crate versions and frontend/Tauri metadata agree, and
that manifest/lockfile contents changed only in first-party versions. The
existing large frontend-chunk build warning remains; no dependencies changed.
No native bundle, tester ZIP, public release upload, or notarization was requested;
native interaction and packaging tests were not rerun.
The separate user chat export is left untracked and excluded from this commit.

## Larger background calculations

The user authorized removing the estimated CPU-work restriction while preserving a
responsive interface, cancellation, and memory/mesh safeguards. Analytic
sampling no longer rejects requests based on the former 150-million estimated
work-unit cap. This applies to all analytic fields, not only `molden.input`;
the actual requested resolution is used without an automatic downgrade.
The existing UI options remain 24, 32, 40, and 48 samples per axis.

Calculations continue in the existing dedicated Rust/WASM Web Worker. The
worker sends request-associated sampling, meshing, and validation phase events
without resolving the pending result. The footer displays the current phase;
there is no percentage or remaining-time estimate. Cancel terminates the
worker and retains the prior document, meshes, and active sampled grid. A
subsequent request starts a fresh worker. Retired-worker events are ignored,
and the existing atomic publication/native-encoding preflight remains intact.

Retained guards include model validation, finite-value and diffuse-domain
checks, API sampling resolution 12 through 80, 128-cubed imported sample count,
the two-million worst-case mesher vertex bound, 128 saved surfaces, and 128 MiB
geometry/native-container budgets. The mesher rejects excessive worst-case
output before copying its sampled input. These guards bound admitted data and
individual allocations, not total browser memory or calculation latency.

Verification on 4 October 2026: **98 workspace Rust tests**, **88 browser cases**
(44 scenarios in Chromium and WebKit), production WASM/TypeScript/frontend
build, Rust/frontend formatting, and workspace/all-target Clippy pass. Actual-file
native tests generate finer density meshes at 32, 40, and 48 than at 24, compare
sampled values with the unchanged point evaluator, and preserve input science.
Additional rejection tests cover sampling resolution, imported-grid size,
dimension overflow, and the exact worst-case mesher boundary.

Browser tests verify real 48-cubed Molden density generation, sampled/reference
agreement, all three rendering modes, exact science/mesh save-reopen, and mobile
framing. A real in-flight sampling job reports its phase while page timers,
animation frames, and camera interaction continue. Cancel terminates that worker
before its result, preserves the exact saved document, and allows a fresh-worker
retry. That check uses the unmodified source file and no delayed or mocked
calculation. The six focused cases passed twice; the final run and complete
88-case suite include the visible sampling-phase assertion. Desktop/mobile
screenshots were inspected and all 165 local Markdown targets checked exist.
WASM builds finished before browser tests ran.

This work preserves the prior uncommitted orbital-browser and scalar-sampling
increments. No version bump, commit, tag, push, native bundle, or tester ZIP was
requested. Native desktop interaction and packaging tests were not rerun, and
the user's running server was not restarted.

## Earlier density sampling work-budget fix

This records the preceding optimization. Its retained CPU cap and 32-cubed
rejection were superseded by the larger-background-calculation follow-up above.

The user reported that `data/molden.input` could not generate its density even
at the UI minimum of 24 cubed. Reproduction confirmed 125 basis functions and
229,340,160 estimated work units, exceeding the existing 150-million cap.
The old sampling loop called the full value-and-gradient evaluator, discarded
the gradients, and contracted all `n*n` matrix entries at every grid point.

Scalar sampling now resolves the field once, reuses a value-only AO buffer,
and folds real density pairs as `Pij + Pji` with separate diagonal terms.
It preserves nonsymmetric and signed matrices without dropping coefficients or
substituting occupation-derived orbitals for arbitrary matrices. Nonfinite
folded coefficients use the original full matrix; alternate multiplication
order protects representable extreme products. The original point/gradient
reference evaluator, scientific inputs/hashes, native schema, dependencies,
application version, and 150-million work cap remain unchanged. Budget errors
now report the maximum admissible integer resolution.

For this file, 24 cubed now costs 122,204,160 estimated work units and produces
13,824 samples plus a 460-triangle density mesh at isovalue 0.08. Higher UI
settings still exceed the cap (the calculated integer maximum is 25); no
automatic resolution reduction or blanket large-workload support is implied.

Verification on 4 October 2026: **94 workspace Rust tests**, **84 browser cases**
(42 scenarios in Chromium and WebKit), production WASM/TypeScript/frontend
build, Rust formatting, and workspace/all-target Clippy pass. New native
tests compare sampling against the unchanged reference evaluator on four
frozen PySCF documents and nonsymmetric/antisymmetric/signed/extreme matrices.
Actual-file regressions cover 24-cubed generation, retained rejection at 32,
source hashes and native persistence. Browser checks also compare sampled
values with analytic points and exercise mesh/raycast/volume pixels, camera
movement, exact science/mesh save-reopen, and mobile framing. Desktop/mobile
screenshots were inspected, and 162 local Markdown targets checked successfully.

This follow-up preserves the uncommitted orbital-browser work. No commit, tag,
push, version bump, native bundle, or tester ZIP was requested. Native desktop
interaction and packaging tests were not rerun; the running server was not
restarted. The rebuilt WASM core is available in the existing web preview.

## Orbital browser and batch meshes

The orbital-browser increment follows `v0.2.1` without changing application
version, native schema, dependencies, import profiles, or scientific algorithms.
The [legacy Electron Density interface](https://ugovaretto.github.io/molekel/wiki/pmwiki.php/ReferenceGuide/ElectronDensity.html)
and its dialog image informed the metadata table. This increment implements
orbital listing and selection, not the legacy dialog's full bounding-box, nodal,
potential-mapping, or density controls.

The searchable table lists every imported orbital in source order, with label,
spin, occupation, energy in hartree, and saved-mesh count. Missing energy or
occupation remains unknown, not zero. Filtering preserves hidden selections;
selection does not change the scene until Generate selected. A batch accepts
up to 32 orbitals, a positive isovalue, and a bounded grid resolution. Larger
selections show an error and disable generation; nothing is silently truncated.

Jobs run sequentially through the existing Rust/WASM worker. The UI accumulates
results without changing the live document, checks aggregate geometry bounds,
and uses Rust native encoding as a persistence preflight before publishing.
Success replaces only selected fields' meshes; all other field meshes remain.
Cancel or any failure retains the prior document, active grid, and generation
settings. The Cancel control also works for native documents with no initially
active field. Only the chosen active orbital's sampled grid is retained for
volume/raycast modes; those modes do not combine multiple fields. Checkbox
selection is transient, while generated meshes persist in `.molekel` files.

Verification on 4 October 2026: **83 workspace Rust tests** and **82 browser
cases** (41 scenarios in Chromium and WebKit) pass, along with Rust formatting,
workspace/all-target Clippy with warnings denied, Prettier, and the production
WASM/TypeScript/frontend build. The 16 new browser cases cover the full
118-orbital legacy Molden list, metadata/nulls, filtering and the 32-orbital
limit, mobile horizontal scrolling, both mesh signs, exact save/reopen,
preserved density surfaces, active-grid pixel parity, camera movement, and
atomic recovery from cancellation, worker failure, invalid source hashes, and
native-format budget rejection. Desktop/mobile table, mesh, and viewport
screenshots were inspected. All 159 relative Markdown targets checked in the
rewrite README and current guides exist.

The initial full browser pass exposed an immediate-pixel-read timing race in
the existing WebKit mobile test. It now polls for the same nonblank-pixel
threshold, allowing the renderer's next animation frame; rendering code and
the threshold are unchanged. Five focused repetitions and the complete
82-case rerun pass. No WASM build ran concurrently with browser tests.

No native shell or packaging behavior changed. No tester ZIP, version bump,
commit, tag, or push was requested for this increment. Full native-dialog and
clean-machine release gates remain open. The native bundle and packaging tests
were not rerun for this UI increment, and the native app was not restarted.

## Version 0.2.1

The cube-rendering/all-format-bonds increment advances the application to
**0.2.1**. Rust workspace crates and their lock entries, frontend package and
lockfile, Tauri bundle metadata, and current guides share this version. External
dependency versions and native schema `[0, 1]` are unchanged. The user confirmed
that the cube examples render correctly and requested committing all changes,
creating a version tag, and pushing the current `2026` branch. The chosen
annotated tag is `v0.2.1`; verify its actual commit and remote state with Git.

After the version bump, version/dependency-consistency checks, all 83 workspace
Rust tests, Rust formatting, workspace/all-target Clippy with warnings denied,
and the production WASM/frontend build passed. The 66 browser cases and full
verified tester-package run below cover the same cube implementation before the
version-only follow-up; they were not rerun solely for metadata changes.

The `elf_pic.cube` investigation confirmed a display-level issue rather than
lost scalar data: almost every value is above the default isovalue `0.08`.
Increasing the level reveals the field. The user asked to stop that investigation;
no proposed percentile-based default selection or ELF-specific behavior was
applied. The prior low-amplitude default remains unchanged.

## Version 0.2.0

The Molden/shared-conversion increment advances the application from 0.1.0 to
0.2.0. Rust workspace crates, CLI, frontend package/lockfile, and Tauri bundle
metadata share this version. The desktop version command derives it from Cargo
instead of a separate literal. The native file schema remains `[0, 1]` with the
same required preview profile; an application version bump does not invalidate
existing `.molekel` documents. Dependency versions and frozen references are
unchanged. The user requested committing and pushing this increment on `2026`;
inspect Git for its actual commit and remote status.
After the bump, version-consistency checks, all 73 workspace Rust tests, Rust
formatting, workspace/all-target Clippy, and the production WASM/frontend build
passed. External Cargo/npm dependency records remain unchanged. The 54 browser
cases below were verified before this version-only follow-up; they were not
rerun solely for the metadata change.

## Cube rendering and all-format bonds

The follow-up to commit `d27aae7` makes cube scalar fields immediately available
in volume and sampled raycast modes on Open, without first extracting meshes.
Generate surfaces creates the signed, persistable geometry explicitly. The
complete original affine f64 grid remains authoritative through preview
resolution changes, conversion, and save/reopen. Standard single-orbital cubes
with negative atom counts and one dataset ID are now supported, alongside
single-channel density cubes. See [the cube profile](cube-import.md).

Every supported format now computes display connectivity: XYZ, PDB, Molden,
cube, and native `.molekel`. Native import fills only missing bonds, preserves
explicit edges/order, scientific records, and cached meshes, and reports the
change through `requires_save`. Raw native format decoding remains exact.
Older native documents are not silently rewritten. Reflected-grid volume box
winding is corrected; grid values overflowing f32 fail preview preparation
without discarding the imported f64 document or cached geometry.

Verification on 3 October 2026: **83 workspace Rust tests** (including the one
desktop test), **66 Chromium/WebKit browser cases**, and **7 packaging tests**
pass. Rust formatting, workspace/all-target Clippy with warnings denied,
TypeScript/production WASM/frontend build, and the macOS debug bundle pass.
The browser cases include both field signs, desktop/mobile pixels and camera
interaction, inside/reflected grids, source-grid preservation, saved meshes,
native missing-bond backfill, conversion, invalid-input recovery, and f32
preview failure with successful f64 persistence. Desktop/mobile screenshots
were inspected. One initial full-suite run was interrupted by a concurrent
WASM rebuild triggering Vite reload; the complete rerun after builds finished
passed all 66 cases. Build and browser checks must run sequentially.

Core tests also read the user's existing water density and two single-orbital
cube fixtures, verifying atoms/bonds, grids, and nonempty signed meshes where
appropriate. The new first-party signed/skewed scalar fixture independently
specifies every expected sample. No legacy data or code was changed.

Tester packaging now includes `Examples/signed-affine.cube`, `Cube-import.md`,
and the three legacy cube fixtures needed by the source tests. Its staged and
extracted checks exercise cube bonds, signed meshes, and the standalone
converter's exact agreement with WASM, in addition to the prior checks. Each
successful ZIP's `BUILD-INFO.json` records its artifact-specific verification;
earlier ZIPs are unchanged. Native cube dialog interaction, full native lifecycle,
clean-machine installation, and other OSs remain unqualified. The running app
was not restarted. The implementation was initially uncommitted at version
0.2.0; the later user-requested 0.2.1 version/commit/tag/push follow-up is recorded
above. No public release upload or notarization is part of this workflow.

## Working increment

The new Rust core builds both natively and as WebAssembly. A shared browser/Tauri viewer opens mathematical reference documents, evaluates orbitals and explicit density matrices, samples affine fields, extracts signed meshes, and persists the science plus geometry/materials in a self-contained native preview file. Molden, XYZ, PDB and single-channel standard cube workflows are available. Every supported import, including native documents, automatically fills missing display bonds from atom coordinates; explicit connections are retained and supplemented.

Generated geometry can be copied/reopened without recomputation. Scientific hashes exclude appearance and link each saved surface to its basis/coefficients/matrix or authoritative grid. A changed source is rejected rather than silently associated with an old mesh. The current model does not yet provide full revision history.

The visible modes are mesh rendering, sampled raycasting preview, and volume preview. Their limitations are described in the [README](../README.md). Native and browser interfaces currently both run numerical work in the same Rust/WASM worker; native threaded field jobs are not implemented. Native saving uses the Rust format library directly.

## Molden and shared conversion increment

The shared Rust `molekel-import` library owns byte detection, Molden parsing,
producer conventions, reports, and provenance. Open, the separate Convert Files
queue, and the standalone `molekel-convert` CLI use that same library. The app
links it through WASM; it does not launch the CLI or vendor executables. No
external runtime dependency, C++, or copied legacy implementation was added.

Canonical real Gaussian Molden S/P/SP/D/F/G shells, spherical/Cartesian order,
normalization, spin, occupations, energies, and occupation-derived densities
are implemented. Identified `orca_2mkl` exports have a separately qualified
S/P/spherical-D normalization profile; its unqualified F/G, Cartesian D, and SP
variants fail explicitly. Direct ORCA/GBW, Gaussian logs, and T41 readers are
deferred. Other formats will be selected later by the user. The exact profile,
limits, losses, CLI behavior, and API are in [Molden import](molden-import.md).

Open marks foreign imports unsaved, reports warnings, and preserves the prior
document on failure. Convert Files retains up to 32 queue entries and 128 MiB
of encoded results, does not replace the scene, and saves only on explicit
request. CLI destination preflight and no-clobber publication protect inputs
and previous outputs, including macOS Unicode filename aliases under `--force`.
Native Save enforces `.molekel` and rejects protected imported source paths.
Browser downloads cannot attest that the user's download ultimately reached disk.

Five [independent actual-import fixtures](../fixtures/molden/README.md) cover
PySCF RHF water, UHF OH, multi-primitive spherical/Cartesian S-G contractions,
and a real upstream ORCA NH3 export. Native and WASM tests compare AO/MO/density
values and analytic gradients, normalization/overlap populations, and native
scientific/mesh persistence. Largest observed canonical sample discrepancy was
`3.13e-12`; the independently corrected ORCA fixture gives `6.64e-9`, within
the stated relative tolerance for its finite-precision text. These are tested
profiles, not a blanket producer or scientific-accuracy guarantee.

The untouched legacy `data/molden.input` also imports successfully: 17 atoms,
125 AOs, 118 spatial orbitals, and one occupation-derived density. Its frequencies,
normal modes, convergence history, and geometry trajectory are explicitly
reported as omitted. This smoke test is separate from independent numerical
qualification. A converted convenience copy is generated under ignored
`next/artifacts/conversions/molden.molekel`, not beside the legacy input.
(This convenience-copy path belonged to the pre-standalone `next/` tooling; the
current `eigenvista-convert` CLI writes `INPUT.eigenvista` by default, or to
`--output` / `--output-dir`.)

Verification for the earlier Molden increment: 72 default-workspace Rust tests, one separate native
destination-guard test, and seven packaging tests pass. Workspace/all-target
Clippy with warnings denied, Rust formatting, the production WASM/frontend build,
and the macOS debug bundle pass. All 54 browser cases pass (27 scenarios in
Chromium and WebKit), including workflow, numerical, pixel, camera, responsive,
and delayed-read success/failure/unsaved-edit regressions. The latter check that
an earlier Open cannot overwrite a later document or bypass newly made edits.
Desktop/mobile Molden and conversion screenshots were inspected. Native file
dialogs and a clean-machine installation were not exercised for this increment.

The tester packager now includes a separately signed `Tools/molekel-convert`,
water Molden example, updated guides, and source/test-data notices. It verifies
the actual extracted converter's native roundtrip against the app's WASM import,
in addition to signature/architecture/library and archive-content checks. Each
successful package's `BUILD-INFO.json` records those artifact-specific checks;
earlier ZIPs remain unchanged. Optional IOData reference-generation/test-data
licensing is isolated and documented in the [dependency record](dependencies.md).
The current documentation pass checked local Markdown links with no missing
targets. Legacy source/data and original plans are unchanged. At the end of
implementation, these changes were uncommitted and the tester ZIP remained local;
the later version/commit/push request is recorded above. No release upload or
additional tag is part of that request.

## Earlier preview evidence

- Rust/f64 tests cover normalized Gaussian values and derivatives, polynomial gradients at nodes, fractional occupations, explicit density contraction, electron count with overlap, grid integration, skewed/reflected grid meshing, affine resampling, malformed inputs, native roundtrips, saved-source mismatch, checksums, unknown profiles, and unsafe ZIP paths.
- Independent PySCF 2.14.0 fixtures now cover water RHF/cc-pVDZ, OH UHF/STO-3G, and general Cartesian/spherical S/P/D/F/G contractions. Native AO/field values and gradients, SCF orbital normalization, total/alpha/beta/spin populations, affine grids, and finite-difference convergence pass. The largest observed native value/gradient discrepancy on these samples was `1.1369e-13` in atomic units. [Fixture provenance, conventions, and remaining limits](../fixtures/pyscf/README.md).
- Browser tests pass in Chromium and Playwright WebKit on this Apple Silicon Mac. They exercise a nonblank scene, camera movement verified through changed canvas pixels, sampled raycast and volume pixels, density generation, save/download/reopen without a field cache, invalid-import recovery, cancellation and worker restart, material persistence, mobile layout, and independent analytic/PySCF values and gradients through WASM. The PySCF tests compare 3,868 field-value/gradient components per browser engine using the documented f64 tolerance.
- Native save regression tests verify complete replacement and preservation of the original on invalid input/write failure. Real closed/open-shell documents retain signed orbital meshes, total-density meshes, visibility/materials, and quantum arrays through native format roundtrips.
- XYZ/PDB regression tests verify automatic connectivity, exact k-d-tree results against exhaustive distance checks, explicit PDB connections, element alignment, coherent alternate/model selection, legacy repository files, malformed inputs, and dense-input limits. Browser tests cover actual XYZ/PDB loading, both bond representations, save/reopen, and mobile canvas sizing, foreground pixels, unclipped framing, and panel separation. [Algorithm decision, import profile, and measured workloads](structure-imports.md).
- Screenshots at 1440 x 960 and 390 x 844 were inspected. The scene is visible and framed; controls fit the mobile layout without horizontal overflow.
- TypeScript/production web build and the Rust/WASM release build pass. Rust formatting and Clippy with warnings denied pass for the scientific crates and desktop shell.
- A debug `Molekel Preview.app`, not Developer ID-signed or notarized, was built on macOS 27.0 / Apple Silicon. The actual packaged `tauri://localhost` viewport was observed rendering mesh/volume content, and the native Save dialog opened. The final native-dialog save/reopen workflow was not completed during the interactive check because the user was using the window; filesystem-level save regression tests are separate evidence. Native window-close protection and viewport PNG-download handling also remain to be qualified independently of browser behavior.

Before the Molden increment, the suite passed 39 Rust tests and 30 browser test cases (15 scenarios in each of two engines). Production web/WASM and the macOS debug bundle were rebuilt with PDB import and automatic XYZ/PDB bonds. At the user's request, the rebuilt native app was subsequently launched; the user confirmed that loading a PDB file works. This manual confirmation is separate from the automated browser coverage and does not complete the native save/reopen checks above. These checks do not establish the full M0 scientific/graphics acceptance matrix or a supported OS range.

The independent browser roundtrip tests exposed JavaScript's folding of negative zero to positive zero. Scientific hashes now explicitly canonicalize zero signs and sort keys, so a saved surface does not acquire a false source mismatch after a browser material edit. A native-to-WASM regression covers a supplied transition matrix with negative-zero entries. Native binary arrays preserve f64 bits; the JSON bridge's zero-sign limitation is documented in the [preview format](preview-format.md).

## Tester packaging

`npm --prefix app run package:macos` produces an optimized Apple Silicon
ZIP with ad-hoc bundle signing, instructions, molecular samples, the
exact source snapshot, dependency sources/notices, build identity, and a SHA-256
companion file. The earlier packaging increment passed seven packaging regressions
and 39 Rust tests. Its full run verified the extracted app's signature, every archived file's
contents/permissions, system-only dynamic library links, and both sample imports.
Rust formatting and workspace Clippy also pass. All temporary staging remains
in repository-local `tmp/`; output remains ignored under `artifacts/`.
The package does not upload, notarize, or require Apple credentials.

The deployment target is macOS 13, but only the recorded development host has
been exercised; the full OS range and clean-machine Gatekeeper installation are
not qualified. Tester distribution is not a supported public release. The
existing GPL-2.0-or-later terms are now explicit for the new source. License
inventory and bundled source are not a legal compatibility opinion. See
[tester packaging](tester-packaging.md) for the repeatable command and boundaries.

Reproducible native example files are generated under ignored `artifacts/references/`: water and OH contain both signs of a HOMO surface plus a hidden total-density surface; a spherical S-G example contains a synthetic transition-density surface. The browser workflow test opens the natively generated water file and restores all three surfaces without recomputation. The water screenshot was also inspected.

## Plan alignment

| Milestone | Status | Remaining gate |
| --- | --- | --- |
| M0: Difficult-path experiments | In progress | Broader scientific qualification, topology-certified meshing, analytic shader evaluation, rigorous mixed-scene transparency, measured limits, and Linux execution |
| M1: Scientific model/persistence | Preview subset implemented | Frozen schema, explicit feature registry, chunk streaming, multiple geometry revisions, extension preservation, formal canonical hashing |
| M2: Native viewer | Preview implemented | Full metadata controls, complete radius policy, per-surface material editing, undo, camera persistence, lifecycle coverage |
| M3: Fields and saved meshes | Preview implemented | Optimized/block evaluator, native jobs, topology-correct extraction, clipping diagnostics, larger workload validation |
| M4: Rendering modes | Experimental sampled modes | Direct analytic raycasting, robust root isolation, shrinkwrap, transfer-function editor, depth-aware compositing |
| M5: External formats | Shared importer/CLI/UI; Molden profile, XYZ, PDB structure profile, standard cube subset | Broader Molden producer conventions, PDB metadata/model selection, future user-selected formats including planned OBJ/color workflows |
| M6: Release qualification | Not complete; preview user/developer guides and tester notices/source packaging available | Supported-device matrix, clean-install tests, native lifecycle checks, signed/notarized release, completed license audit, v1-complete documentation |
| M7: Extensions | Not started | Linux/Windows release qualification, future user-selected converters, justified acceleration or remote jobs |

## Decisions after the research plan

The user's clean-Rust requirement supersedes the planned C-library integrations for this increment. `mcubes` 0.1.7 is an existing MIT Rust implementation used to test the pipeline, not a claim of MC33 topology guarantees. Gaussian evaluation is a new, transparent scalar Rust reference implementation. No hand-written replacement meshing engine, C++ implementation, or legacy source reuse was introduced.

The render coordinates currently remain in bohr throughout the scene; angstroms are shown for picked atom positions. This avoids an extra scene conversion during the initial tests and is explicit in the interface. The research proposal's renderer-in-angstrom convention is not yet adopted.

Active GitHub CI was not installed outside `next/`; reproducible platform commands are in [ci/README.md](../ci/README.md). Linux and Windows remain unverified, not supported release targets. No public release or upload was performed.

## Documentation handoff

Root/scoped `AGENTS.md` now lead to the current handoff, as-built architecture,
fresh-checkout setup, build/test instructions, packaging, and a standalone user
guide. The documentation map links the complete original research and M0-M7
plan while explicitly distinguishing proposals from implemented behavior.
The current docs cover persistence, worker cancellation/cache semantics, import
losses, limitations, and outstanding native/release verification. The fresh-run
instructions create repository `tmp/` before resolving it.

Future tester ZIPs include `User-guide.md`; source snapshots also include both
agent guides, the original brief, historical plans, and current developer docs.
The prior ZIPs remain unchanged; use a newly generated package for these additions.

The documentation pass checked 124 local Markdown links, cross-checked controls
and commands against source, exercised the documented production-preview server
and its linked assets, and passed the seven packaging tests. Application UI and
scientific behavior were not changed; the browser suite was not rerun for this
documentation pass. Historical runtime evidence above remains explicitly dated.

## Next priorities

1. Resolve the topology-aware Rust mesher choice against MC33/Lewiner reference fixtures; classic marching cubes must not become an accidental final decision.
2. Implement robust sampled ray intersections and direct analytic orbital/density shaders, then quantify errors and workload limits.
3. Extend independent qualification with spatial-integral convergence, broader exponent ranges, and more producer-specific Molden conventions. Closed/open-shell, canonical S-G, and one real ORCA S/P/5D import have passing evidence; unsupported producer variants must remain explicit errors.
4. Finish native save/open interaction checks and document lifecycle/state preservation, then expand the interface and remaining importers.

The application is a usable development preview, not completion of the full plan. No scientific accuracy or performance claim beyond the named tests is implied.
