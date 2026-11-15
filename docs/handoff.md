# Development handoff

Updated 15 November 2026 for published **0.7.2**: background controls (#73),
transparent PNG (#74) and optional MatterViz Muted/Pastel palettes. Fresh local
checks, rebuilt artifacts, qualified native retry, production checks and published
asset downloads passed. Source `5f336b6` and the ZIP retain the pre-publication
snapshot; this later living record does not retag or rebuild them. The published
0.7.1 release retains source `a7037dc` and its verified artifacts.
The prior published 0.7.0 release retains source
`d414bc7` and its verified artifacts. The older
published 0.6.0 tag/package retain source `6cb678c`; earlier packages and dated
entries retain their then-current source, version and artifact facts.
Start with [root AGENTS.md](../AGENTS.md), then this document,
[architecture](architecture.md), and [development commands](development.md).
The [documentation map](README.md) links the original brief and full M0-M7 plan.
The current application source is **EigenVista**, version **0.7.2**, in the standalone
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) repository. Source
lives at this repository's root, without a `next/` wrapper or legacy application
code. The icon and logo are unchanged.

EigenVista's project history comes from Molekel, the molecular visualization
application developed by Ugo Varetto from 2006 to 2010. The
[original source](https://github.com/ugovaretto/molekel) and
[original website](https://ugovaretto.github.io/molekel/) document that project.
The current Rust/TypeScript code is its new implementation; recent preview names
and subtree extraction describe development/Git provenance.

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

## Project history correction: #77, 15 November 2026

The author clarified EigenVista's origins in the original Molekel application
he developed during 2006–2010. README and About now have dedicated History
sections with both original links. The previous description as a successor to
a Rust preview has been removed from current public introductions. AGENTS,
the documentation index, architecture and migration introductions now establish
the same product history. The current implementation's technical extraction
record, commit table, file compatibility and read-only reference boundary remain
intact. Original-project links were checked; the development dates are supplied
by the author. Dated snapshots and immutable release notes are preserved.
This editorial follow-up is tracked under #77; application version 0.7.2,
scientific data, runtime, media, license and releases are unchanged.
Fresh local checks passed: the corrected author/dates/original links in six
current entry points, static/deterministic generation, document/history links,
all 96 Chromium/WebKit route/viewport cases and interactions, and desktop/320px
visual review. Evidence: `tmp/2026-11-15-history/`,
`tmp/2026-11-15-website/browser-YYfvOm/RESULT.json` and
`tmp/2026-11-15-website/docs-check-source-zChDKr/RESULT.json`.
App/native tests were not rerun for this documentation-only correction.

## Author and copyright: #77, 15 November 2026

The existing LICENSE already identifies Ugo Varetto's 2026 copyright. The README
now has an explicit Author and copyright section, About has an `#author` section
and contents link, and the shared footer displays both user-requested lines on
all 16 pages, including 404: `Author: Ugo Varetto` and
`Copyright (c) 2026 - Ugo Varetto`. The footer uses readable 12px text and fits
320px screens. The original GPL license and third-party notices are unchanged.

Fresh local macOS verification passed: exact wording in README/About/all footers,
static/deterministic generation, document/history/link checks, all 96 route/
viewport browser cases and interactions, and dedicated Chromium/WebKit footer
visibility/layout checks at 1440 and 320px. Independent screenshot/content review
was clear. Evidence: `tmp/2026-11-15-attribution/`,
`tmp/2026-11-15-website/browser-a1u38c/RESULT.json` and
`tmp/2026-11-15-website/docs-check-source-V2jAdl/RESULT.json`.
This is a documentation/presentation follow-up under #77; the app, version 0.7.2,
release artifacts, scientific data, palettes and media are unchanged. App/native
tests were not rerun for this change. Source
`f94459986f07ecb32398a18d27b4ef496054aa22` is published by
[Pages deployment 43714570437](https://github.com/uvar-apps/eigenvista/actions/runs/43714570437).
Public readback verified the exact wording in all 16 footers, About's author
section, the bare homepage and the GitHub README, plus matching generated pages,
stylesheet and search index. See `tmp/2026-11-15-attribution/public.json`.
The owned site preview was stopped after verification; user servers were untouched.

## Project discovery: #77, 15 November 2026

The user approved GitHub presentation, a short real-app demonstration/social
preview, and search discovery. Outreach and other-project promotion remain with
the user. [#77](https://github.com/uvar-apps/eigenvista/issues/77) tracks this work;
[project discovery](project-discovery.md) documents maintenance and reproduction.
The README now leads with user workflows and a genuine X-ray density rendering.
The repository website, feature-oriented description and six focused topics
are configured and read back through GitHub.

The homepage adds a 30-second 1920×1080, 25 fps H.264 recording: the same cached
256³ C₇H₁₀ density mesh, solid → X-ray with live opacity → live clipping. Actual
UI footage keeps its native aspect, with a separate branded header, no scientific
alteration or calculation-speed claim. It is silent and plays on request, with
a poster, descriptive track/text and download. The public video is 4,166,288 bytes,
SHA256 `48b7169156dc9c259f0b0da4c74794ffa335e4d302199e2566db358b826073fd`.
The initial social PNG was 1280×640 / 228,139 bytes. The user reports uploading it,
then requested both the density rendering and an ambient-occlusion molecule.
The replacement is 1280×640 / 439,371 bytes, combining the same real X-ray density
image with the 58,870-atom 1AON Lambert + SSAO/MatterViz Pastel capture and unchanged
logo. Both full molecular shapes and natural proportions are preserved; panels
show different molecules at independent display scales. Source/output hashes are
in `site/assets/social/provenance.json`; the generator refreshes this ledger and
demo publication preserves its social-image metadata. The user confirms uploading
the combined replacement PNG through GitHub's existing Social preview UI.
The combined-card revision passed fresh local static/deterministic checks,
all 96 route/viewport cases and interactions in both
browsers, syntax/whitespace and public-document/history checks. Evidence:
`tmp/2026-11-15-social-combined/`,
`tmp/2026-11-15-website/browser-KA1Qwu/RESULT.json` and
`tmp/2026-11-15-website/docs-check-source-QWYkAE/RESULT.json`.
Independent full-size/reduced-card review found no cropping, distortion or
readability issue. Original scientific images, logo and demo video are unchanged.
The combined preview is published from `67d8c104ae2821c0cf1bdcc8de23272824c9cc57`
by [Pages deployment 43713569961](https://github.com/uvar-apps/eigenvista/actions/runs/43713569961).
All 66 public files (24,861,945 bytes) match the newly checked source, including the combined PNG,
two-source provenance and cache-busted Open Graph/Twitter metadata. Evidence:
`tmp/2026-11-15-social-combined/public-files.json`. The owned local site preview
was stopped after readback. The repository image was subsequently uploaded
manually by the user; this site deployment did not itself replace it.
The public payload is bounded at 24 MiB (video below 4 MiB), loaded on demand.

Search metadata now names supported molecular/quantum workflows while retaining
visible editorial headings. Social cards use the new PNG, dimensions and alt
text. 404 is `noindex`. The actual Google verification tag is kept in
`tools/site/search-console.mjs` and emitted in the homepage head. A URL-prefix
property for `https://uvar-apps.github.io/eigenvista/` is verified in the user's
signed-in Search Console. The 15-page sitemap was submitted successfully. Its
initial report says "Couldn't fetch"; Google's separate live test at 20:04:31 AWST
confirmed crawl allowed, page fetch Successful and indexing allowed. Public XML
returns HTTP 200 / application/xml, and the submitted URL was checked exactly.
Homepage indexing was requested and accepted into Google's priority crawl queue.
Processing/indexing remain external; do not describe the sitemap report as a
successful parse yet. The nested project `robots.txt` is not
the host's robots policy; do not claim it establishes discovery or modify
another repository to address that.

The initial discovery revision's local macOS checks passed: static/deterministic generation (16 pages,
19 exact downloads; 24,649,602-byte payload), all 96 route/viewport checks in
Chromium and WebKit, actual video decoding/playback/seeking and 16:9 proportions,
byte-range/416 responses, existing search/keyboard/theme/AO/download/404 cases,
and public-document links/history checks. Browser evidence:
`tmp/2026-11-15-website/browser-PQCf8q/RESULT.json`; documentation evidence:
`tmp/2026-11-15-website/docs-check-source-x6QF44/RESULT.json`. HyperFrames 0.9.52
check passed runtime/layout/contrast with no errors, and the encoded final frames
were visually reviewed. Single-frame modularity and intentional-silence hints
were reviewed. An independent content/metadata/media review found no material
issues. Additional footage/check/probe evidence is under
`tmp/2026-11-15-visibility/`.

Website source `1f44a7d6189635f1a707a24b84ef549c83f17813` is live through
[Pages deployment 43711379274](https://github.com/uvar-apps/eigenvista/actions/runs/43711379274).
All 66 served files match the reviewed bytes, including video, poster, social PNG
and bare-homepage verification tag. All 96 route/viewport cases and interactions
also passed against the public site in both engines; see
`tmp/2026-11-15-website/browser-jmnpFf/RESULT.json` and
`tmp/2026-11-15-visibility/public-files.json`. Only the Pages publisher was followed;
application Verify was not run. Both owned capture/site previews (5189/5190)
were stopped; user servers were untouched.

The user reports completing GitHub's original social-preview upload manually;
the browser extension's file-URL permission is no longer a required user action.
The user also confirms completing the combined-image replacement upload.
#77 stays open for the external sitemap follow-up. Application sources,
0.7.2 release/tag/ZIP, icon, palettes, scientific fixtures and historical
snapshots are unchanged; native/app suites were not rerun for this website work.

## Website content and imagery: #76, 15 November 2026

The user rejected the initial website's content/visual quality: the reference
screenshot was stretched, quantum imagery used weak demonstration systems, and
custom surface shaders were buried. #76 tracks the revision. The CSS now preserves
natural image height as figures resize; the 1920×1280 workspace image renders at
994×663 on desktop and 348×232 on phone, with full-size access.

The site now has 16 pages, with Shaders in the main navigation and a practical
illustrated shader guide. The homepage and gallery lead with a real C₇H₁₀ density
surface, X-ray transparency and a clipped view of the same geometry. The guide
provides the molecular file, shader pairs, parameter files and exact settings;
a dedicated close-up keeps the live controls readable. HOMO/LUMO meshes and a
volume view use a 17-atom, 125-basis, 118-orbital Molden input at 256³. The cube
lesson now uses the original 29-atom, 84³ grid instead of the two-atom test field.
Neither source is assigned a method or scalar meaning absent from its metadata.

Fifteen curated images include nine new high-resolution captures and the six
retained AO/biological images. Actual application PNG exports were composed and
reviewed at full size and in page layouts; opaque phase surfaces replaced
transparency artifacts. Shader controls use a real panel screenshot at DPR 2.
The original AO/Pastel views remain unchanged. All new inputs are original-byte
public examples with source/license notes. `tools/site/capture-quantum.mjs`
records the real-UI capture workflow. Evidence is under
`tmp/2026-11-15-website-quality/`.

Application sources, version 0.7.2, icon, scientific fixtures, palette values,
release/tag identities and redistributables remain unchanged. Fresh local site
checks passed: all 16 routes at desktop/390/320 px in Chromium and WebKit (96
route/viewport cases), natural rendered figure aspect ratios, shader filtering,
existing interactions, deterministic output, exact original downloads/media and
public-document links. Evidence includes `tmp/2026-11-15-website/browser-tv6B1g/RESULT.json`,
`static-cache.log`, the reviewed page screenshots and source/capture records.
Content revision `21bcf54` was pushed and published by [Pages deployment
43701982761](https://github.com/uvar-apps/eigenvista/actions/runs/43701982761).
All 61 served files matched the locally reviewed bytes. The follow-up adds
content hashes to image/stylesheet URLs so returning visitors receive the new
pictures and proportion fixes despite Pages' ten-minute asset cache.

The final asset revision `7c296e676219a95fb3728a08c1c412fcbda692a9` is published by
[Pages deployment 43702705994](https://github.com/uvar-apps/eigenvista/actions/runs/43702705994).
All 61 served files again matched the reviewed source bytes. Chromium and WebKit
verified the live reference proportions, readable phone controls and exact
`x-ray.params` download/filename. [#76 is complete](https://github.com/uvar-apps/eigenvista/issues/76#issuecomment-6892818904).
Final evidence is in `public-files-final.json` and `public-browser.json` under
the quality evidence directory above. Both owned preview servers (5189/5190)
were stopped after public verification; the public website remains available.
Original website publication and first editorial correction below remain
historical evidence.

## User website: #75, 15 November 2026

The user authorized a public supporting website and confirmed the repository is
public. [#75](https://github.com/uvar-apps/eigenvista/issues/75) tracks the work,
based on main `b79a751`. The site uses Sesmesh's brutalist paper/ink style and
keeps the application icon unchanged. `site/` contains 15 prepared static HTML
pages: product introduction, installation, a detailed four-topic reference,
four practical tutorials, gallery, about/credits and 404 navigation.

The dependency-free local renderer `tools/site/build.mjs` composes shared layout
and metadata around authored HTML in `tools/site/content/`. Generated HTML is
committed; the small `.github/workflows/pages.yml` only uploads/publishes `site/`
from `main`, with four pinned official Actions and no application build, test or
CI matrix. The user explicitly approved this arrangement after reviewing the
existing Sesmesh workflow; no separate `gh-pages` branch is needed. The retained
application Verify workflow remains manual-only. See [website maintenance](website.md).

Ten real, lossless WebP captures total 3,181,604 bytes. The paired 1AON/4PJ1
images use complete selected structures (58,870/65,963 atoms), MatterViz Pastel,
Element coloring and Van der Waals spheres with identical camera/geometry.
Normal shading is compared with Lambert + SSAO at 100%, automatic radius
14.25/16.25 Å, background `#ecebe4`. Foreground change is independently measured;
background/silhouette match and exact restored-Off pixels passed. Images are
not generated scientific illustrations. Provenance records source, input and
palette hashes, settings, dimensions and output hashes. Eight named public
downloads retain exact source bytes and notices. The total static payload is
under 10 MB, including the 1AON tutorial input.

Fresh local site checks passed: 15 pages, 463 local references, 36 image uses,
exact input/media/download hashes, deterministic regenerated output and YAML/
publisher-scope validation. Chromium and WebKit each passed all 15 routes at
1440/390/320 px (90 route/viewport checks total), plus keyboard/skip/search,
theme persistence, AO pixel comparisons with an identical-frame negative
control, gallery filters, exact downloaded bytes, no-JavaScript navigation,
reduced-motion/dark settings, unavailable-search recovery and nested 404 search/
navigation. Mac WebKit uses Option-Tab for link navigation. Earlier incomplete
runs caught narrow-layout and search/download/404 details; they are not passes.
The complete passing evidence is under `tmp/2026-11-15-website/browser-WDQzCB/`
and the final qualifying run is recorded in `browser-test-final.log`.

Initially published at <https://uvar-apps.github.io/eigenvista/> from source
`fa042e6326050a8f8a2e23fdbdb67f03089e251e` on `main`. Repository visibility is
public; Pages uses the approved workflow publisher. [Deployment 43697301648](https://github.com/uvar-apps/eigenvista/actions/runs/43697301648)
succeeded. Fresh HTTPS readback matched all 44 served files to the local
SHA-256/byte manifest, plus the homepage and nested custom 404. The empty
`.nojekyll` source marker is not served by Pages. The complete Chromium/WebKit
suite was repeated locally against the public site: all 90 route/viewport checks
and interactions passed, completed 15 November 2026 at 09:04 UTC. Evidence is in
`tmp/2026-11-15-website/public-files.json`, `browser-00G0Uj/RESULT.json` and
`browser-test-public.log`. [#75 is closed](https://github.com/uvar-apps/eigenvista/issues/75#issuecomment-6892087152)
with the publication/validation record. The owned local preview on port 5190 was
stopped after public verification; no user application was stopped.

No application code, version, fixture, palette value, tag or released
redistributable changed. Application suites were not rerun for this isolated
website/documentation change. A stale cube-guide sentence was aligned with the
existing direct analytic-preview behavior. Maintain the website with the user
guide and update its pinned release/download facts when a later app release is
actually published; GitHub uploads the checked static output without building it.

### Website editorial correction: 15 November 2026

After publication, the user identified the inappropriate opening warning about
coordinates and wavefunctions in the reference. The earlier review overemphasized
layout/functionality and missed the tone. Removed that callout and its repeated
variants across the introduction, installation, tutorials and about page. Replaced
internal QA language with practical instructions while retaining supported-format,
units, save behavior, resource bounds and concrete rendering-artifact guidance.
This is a website copy correction; no application, media, example, palette,
version or release changes. Fresh local checks passed before pushing: all 15
pages, 464 local references, exact input/media/download hashes, deterministic
output, public-document links, and all 90 Chromium/WebKit route/viewport checks
plus interactions. The revised reference was also visually reviewed at desktop
and phone widths. Evidence: `tmp/2026-11-15-website-editorial/` and
`tmp/2026-11-15-website/browser-xMhoAQ/RESULT.json`. Initial publication results
above remain historical; the editorial delivery is recorded against #75.

## Documentation follow-up: 15 November 2026

The user guide's ambient-occlusion section and `palettes/README.md` now recommend
**MatterViz Pastel** (`matterviz-pastel.json`) for best results with molecular AO,
including how to load it. This is a documentation-only clarification; application
code and version remain unchanged, and runtime tests are not rerun. No tag,
release or redistributable is changed by this follow-up.

## Source version 0.7.2

Published **2026-11-15T07:05:08Z** as a development
[prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.2). Annotated tag `v0.7.2`,
object `911cc11b72662eca31cbf18609176de95e9d943a`, was verified locally/remotely
at immutable source `5f336b6a2d53dcb0db67dd5ed95956134a5a1e18`, based on main `979324c`.
Issues [#73 background](https://github.com/uvar-apps/eigenvista/issues/73#issuecomment-6890841183)
and [#74 transparent PNG](https://github.com/uvar-apps/eigenvista/issues/74#issuecomment-6890841431)
are closed with release ledgers. Read the [0.7.2 notes](releases/0.7.2.md).

The release collects background color/reset and transparent PNG controls plus
two optional MatterViz files for the existing atom-color picker. The default
palette is unchanged. The tester ZIP's `Palettes/` contains both JSON files,
README and upstream MIT notice; each palette preserves all 109 source RGB
entries, with elements 110–118 retaining built-in defaults. Scientific data/file
profiles, dependencies/compiler and icon/logo are unchanged.

Fresh local macOS 0.7.2 checks passed: fmt, 272 default Rust tests, strict
workspace/all-targets Clippy, seven desktop tests, WASM/TypeScript/production build
and 13 packaging checks. The complete browser suite passed 526/526, 263 per engine,
with one worker and zero skipped/flaky/unexpected/retried cases. Its summary
completed at 2026-11-15T06:45:19.078Z; report duration was 943.97 seconds (15.7 minutes).
Reference generation exited zero before Playwright; all 276 recorded source
hashes and Vite PID 26782 remained stable. All local gates passed before pushing.
The earlier feature pass below remains separate historical evidence.

Rebuilt ZIP: `artifacts/distributions/EigenVista-0.7.2-apple-silicon-20261115T065014Z-5f336b6.zip`,
**46,406,211 bytes**, SHA256
`02541f40e5f59ff5381c07605947ef4cff590213256b2dbc67f608e21a7b0937`.
The same-stem checksum and JSON build metadata are published too; all three
server sizes/digests and complete downloaded bytes matched the audited local
candidates. Staging remains `tmp/eigenvista-package-h7HDta`. Build host is
macOS 27.0, target arm64, deployment minimum macOS 13.0, ad-hoc signing and no
notarization.

Independent audit verified 411 source Git blobs/modes, 66 payload files and five
actual embedded production assets. The four `Palettes/` files, original RGB
values, MIT notice and fallback behavior were verified. Extracted CLI/recovered
WASM checks passed four examples, four BinaryCIF controls, four biological views,
four microheterogeneity controls and four frozen native inputs. Guide image/
provenance bytes match source; broad nested offline-link qualification is separate.

Production checks passed 18 real-file molecular-view captures, nine per engine,
plus three signed PNG modes and both extracted palette imports/reset in each
engine. Transparent/opaque composites had maximum 8-bit channel difference 2
and mean below 0.034 in these cases; wrong-background controls were rejected.
Selected production images were visually inspected. Production assets match the
signed app, and the owned port-5189 server was stopped; Vite PID 26782 was preserved.

Native startup's first probe `native-startup-fb0GGQ` lost on-screen visibility
while its process remained alive. That failed attempt is retained and is not a
pass; its cause is unproven. The exact unchanged-helper retry
`native-startup-ULdTyD` passed with owned PID 54972, a 1320×860 on-screen layer-zero
window and five seconds alive/on-screen, without a helper activation. Cleanup
signaled only owned children. This does not qualify physical file dialogs,
native image downloads/Cmd+Q, clean-Mac/Gatekeeper/HiDPI or the full OS range.

Evidence under `tmp/2026-11-15-release-0.7.2/` includes
`full-browsers-summary.json`, `root-browser-review.json`,
`local-acceptance-before-push.json`, `artifact-audit-result.json`,
`root-native-review.json`, `production-views-result.json` and
`publication-verification.json`. The immutable tag/source archive keep their
truthful pre-publication snapshot. This later documentation-only record does
not retag, rebuild or rerun unchanged runtime tests; release-note bytes stay fixed.
Current qualification remains local macOS only; future Linux hosts await access.
No hosted CI was requested or used. Published 0.7.1/older records and artifacts
remain unchanged. Catalog #71 and accessibility-palette #72 remain open.

## Background and transparent-PNG feature verification: 15 November 2026

15 November 2026: the user authorized local implementation of
[#73](https://github.com/uvar-apps/eigenvista/issues/73) and
[#74](https://github.com/uvar-apps/eigenvista/issues/74), based on main `979324c`.
This feature-development pass completed on source version 0.7.1 before the later
0.7.2 release request above. At that point no branch, commit, tag, push, version
bump or release was requested, and the changes remained uncommitted. The
published 0.7.1 app/ZIP predates these additions.

The scene toolbar gains **Background color** and **Reset background color**,
starting at `#e8edef`. This is viewport session state; changes only invalidate
drawing and leave geometry, scientific inputs, field sampling, document/dirty
state and saved-file profiles unchanged. Ordinary **Export image** retains
`eigenvista-view.png` and uses the selected opaque background. The extra
**Export image with transparent background** action uses
`eigenvista-view-transparent.png`, including fractional alpha on antialiased
edges and translucent surfaces. HTML overlays remain outside scene PNGs.

The renderer uses `alpha: true` with `preserveDrawingBuffer: false`. Transparent
capture temporarily clears black at alpha zero, calls the shared final-frame
draw/AO path and encodes synchronously. A `finally` restores the exact prior
clear color/alpha and redraws the opaque view on success or encoding failure.
There is no color-key removal, persistent capture target, scientific shader/AO
algorithm change or native-format change.

Fresh local macOS checks passed: fmt, 272 default Rust tests, strict workspace/
all-targets Clippy, seven explicit desktop tests, final WASM/TypeScript/production
build and 13 packaging checks. The new focused browser cases passed 22/22,
followed by 30/30 combined camera/background cases after the toolbar-test update.
The qualifying full run passed 526/526, 263 per engine, with one worker and zero
skipped, flaky, unexpected or retried cases. It completed at
2026-11-15T06:12:16.039Z in about 15.4 minutes (923.92 seconds). Reference
generation exited zero before Playwright; all 276 recorded source hashes and
existing Vite PID 26782 remained stable.

The first full attempt was stopped after its obsolete five-button mobile-toolbar
assertion failed in both engines; that partial run is not a pass. The camera test
now checks all eight named toolbar controls, bounds and pairwise non-overlap at
the same 390/320 px widths. Its original zoom actions and scientific/pixel oracles
remain unchanged. The fresh, complete `attempt-2/` run qualifies this batch.

Desktop/mobile controls and actual PNG foreground/transparency were reviewed.
Decoded RGBA/compositing checks cover alpha-zero empty pixels, fractional alpha,
opaque white atoms, selected background, mesh/raycast/volume, AO and encoder-error
restoration/retry. Evidence under `tmp/2026-11-15-background-export/` includes
`attempt-2/full-browsers-summary.json`, `focused-browser-review.json` and
`visual-review.json`; earlier release results remain historical. The
[user guide](user-guide.md#moving-and-inspecting-the-scene) describes the controls.
Native image-download handling remains a separate qualification gate; no new
packaged app or clean-machine/platform qualification is claimed.

## Source version 0.7.1

Published **2026-11-14T13:24:03Z** as a development
[prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.1).
Annotated tag `v0.7.1`, object `d471bf83e9750c05fe35a73fa554202e9ab1a434`,
was verified locally/remotely at immutable source
`a7037dc47063da59e5b22a9920dbe605bae54ded`, based on main `6ace2f5`.
[#70](https://github.com/uvar-apps/eigenvista/issues/70) is closed; its
[final evidence ledger](https://github.com/uvar-apps/eigenvista/issues/70#issuecomment-6877940064)
records the label change and release. Read the [0.7.1 notes](releases/0.7.1.md).

This is a display-label change. Internal `document` panel/profile IDs, ordering
and expansion preferences, mounted UI state, Rust `Document`, scientific data,
native formats and Open/Save terminology remain unchanged. Current guide
instructions use Molecular data; historical release notes and snapshots retain
their original labels. Dependency/compiler pins, limits and icon/logo are unchanged.

Fresh local macOS checks passed: fmt, 272 default Rust tests, strict workspace/
all-targets Clippy, seven explicit desktop tests, WASM/TypeScript/production
build and 13 packaging checks. The complete browser suite passed 504/504 cases
(252 Chromium and 252 WebKit), with zero skipped, flaky or unexpected results
and zero retries, using one worker. Its summary completed at
2026-11-14T13:12:41Z; the measured browser duration was about 14.7 minutes.
Reference generation exited successfully before Playwright. All 275 recorded
source hashes and the existing Vite PID 48452 remained stable. These are fresh
0.7.1 results, separate from the older release evidence below.

Rebuilt ZIP: `artifacts/distributions/EigenVista-0.7.1-apple-silicon-20261114T131547Z-a7037dc.zip`,
**46,381,687 bytes**, SHA256
`2f8a433fb3f89dd2ef1cdfaafcf6e785ab7187793eca7fd61ff5ee2f0951f1b1`.
The same-stem `.zip.sha256` and `.json` build metadata are also published.
All three server-reported sizes/digests and fresh downloaded bytes matched.
Staging remains `tmp/eigenvista-package-e3aNeg`. Build host macOS 27.0, arm64
target, deployment minimum macOS 13.0, ad-hoc signing and no notarization.

Independent audit verified 405 source Git blobs/modes, 62 payload files and
five actual Mach-O embedded production assets. The new title is embedded while
internal `document` key/id remain stable. Recovered WASM and the extracted CLI
passed four examples, four BinaryCIF controls, four biological-view controls,
four microheterogeneity controls and four frozen native inputs. The guide's
three image/provenance references resolve with exact committed bytes; broader
nested offline links are not certified. Protected/private originals were excluded.

Eighteen actual production-browser molecular-view captures passed, nine per
engine; two additional Molecular data heading captures were inspected. The
production assets match the signed app. Actual extracted native startup passed
with its own on-screen layer-zero 1320×860 window and five seconds alive after
validated activation. Cleanup sent SIGTERM only to the owned child PID 54406;
Vite PID 48452 was preserved. This is not physical native file-dialog/loading/
Cmd+Q, clean-Mac/Gatekeeper/HiDPI or full-OS-range qualification.

Evidence under `tmp/2026-11-14-release-0.7.1/` includes
`metadata-native-audit.json`, `full-browsers-summary.json`,
`audit/run-20261114T131920290Z-a7037dc/REPORT.json`,
`native-startup-result.json`, `production-views-result.json` and
`publication-verification.json`. The tag/source archive retain their truthful
pre-publication snapshot. This later documentation-only update does not retag,
rerun unchanged runtime tests or rebuild those binaries. Release-note bytes
remain unchanged. No hosted CI was required or used; current qualification is
local macOS only, with future Linux checks awaiting access to the two local hosts.

The previous 0.7.0 tag/package and all older records below remain unchanged.
Changing source versions does not update an installed app or an existing ZIP.

## Source version 0.7.0

Published as a development prerelease at **2026-11-14T11:43:29Z** on the
[0.7.0 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.7.0).
Annotated tag `v0.7.0`, object `d587bf48709ac4a22d98f9d11e7e809643d9b287`,
resolves locally and remotely to immutable source
`d414bc7c92f83b640a682d8c053b681b31667051`. It includes the biological views
merged as `1e6881d` / [PR #67](https://github.com/uvar-apps/eigenvista/pull/67)
and the tester-guide image repair #69. Read the [release notes](releases/0.7.0.md).

Fresh 0.7.0 automated local macOS checks passed: 272 default Rust tests, seven
explicit desktop tests, formatting, strict workspace/all-targets Clippy,
WASM/TypeScript/production build and 13 packaging checks. The complete browser
suite passed 504 cases (252 Chromium and 252 WebKit) in 15.7 minutes, with zero
skipped, flaky or unexpected results and zero retries, using one worker.
Runtime/test/fixture/generated-WASM hashes and the owned Vite process remained
unchanged. Eighteen actual production-browser captures (nine per engine) passed
using full tracked 1AON, 4PJ1 and 1CRN; their assets match the signed app, and the
results were visually inspected. Hosted CI was not required or used for this release.

Rebuilt ZIP: `artifacts/distributions/EigenVista-0.7.0-apple-silicon-20261114T112514Z-d414bc7.zip`,
**46,375,930 bytes**, SHA256
`24e21458a0567c03db6623f584d29e904dd7232ca7bf72b1a6417ca9f2e2c5b7`.
The release also contains the same-stem `.zip.sha256` and `.json` build metadata;
all three GitHub-reported digests and fresh downloaded bytes were verified.
Retained staging: `tmp/eigenvista-package-jwYnQO`. Built on macOS 27.0 for arm64,
deployment target macOS 13.0, with ad-hoc signing and no notarization.

Independent audit verified all 404 eligible source blobs/modes, 62 payload files
and actual Mach-O embedded production assets byte-for-byte, recovering the
embedded WASM for extracted-CLI parity. Four examples, four BinaryCIF controls,
four biological-view controls, four microheterogeneity controls and four frozen
native inputs passed. Protected original/private paths were excluded without
reading their contents.

The actual extracted native app was launched and observed alive for five seconds
with its own 1320×860 on-screen layer-zero window after PID-validated activation.
The initial off-screen-window failure remains recorded; this was a diagnostic
activation step, not an application patch. Cleanup terminated only the owned
child PID 33158; the user's Vite PID 48452 remained untouched. This is native
startup evidence, not physical file-dialog, molecular-loading, Cmd+Q, clean-Mac,
Gatekeeper, HiDPI or complete-OS-range qualification.

Packaging repair [#69](https://github.com/uvar-apps/eigenvista/issues/69) copies the
existing biological-view illustrations/provenance beside the standalone guide.
The extracted ZIP resolves those three direct guide references with exact
committed image/provenance bytes. This does not certify every nested offline link.

Evidence is under `tmp/2026-11-14-release-0.7.0/`: `package-result.json`,
`published-release-verification.json`,
`audit/run-20261114T112941787Z-d414bc7/REPORT.json`,
`native-startup-result.json` and `production-views-result.json`.
The tag/archive retain their truthful
pre-publication snapshot; this post-tag living-document update does not retag,
rerun runtime tests or rebuild the immutable app/archive. Current verification
remains local macOS only; future local Linux validation awaits access.

The feature's pre-bump local results are recorded below: 272 default plus seven
desktop Rust tests, 504 browser cases, 40 focused checks and 18 actual-app visual
captures, with build/packaging/static checks. They are implementation evidence,
not fresh verification of this version bump or its redistributables.

Native documents with selected biological metadata declare
`eigenvista-biological-structure-v1`. Older metadata-free documents remain
readable with the previous encoding; old files cannot reconstruct discarded
chain/residue identities, so reimport their original structural source.
Secondary assignments are deposited only, and ambiguous/missing identities do
not become invented backbone connections. The bump preserves scientific data,
numerical precision, allocation limits, dependency/compiler pins and icon/logo.

The earlier published 0.6.0 tag/package below remains unchanged and predates
biological views. Updating source does not update an installed app or an old
archive. Its recorded hosted results remain historical evidence; the current
local-before-push policy above governs this release.

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

The user authorized the version/tag/push/publication workflow. Eleven own version
values and all six inherited Cargo package versions are 0.6.0. Preserve the
untracked `AO_AND_NOAO.png` and `docs/reviews/2026-11-11-code-review.md` without
reading, staging or moving them; private chat exports and old releases remain
untouched. Later post-publication documentation commits may follow the tag;
always distinguish current main from the immutable tagged/package source.

## Biological structure views: first four roadmap additions

The user authorized Plan 007's metadata prerequisite and first four additions:
chain/entity colors, component selection/mixed views, backbone trace/tube and
protein ribbons/cartoons. Implementation was developed on `codex/biological-structure-views` from
`d098380`; [#62](https://github.com/uvar-apps/eigenvista/issues/62) through
[#66](https://github.com/uvar-apps/eigenvista/issues/66) track the work, merged
through [PR #67](https://github.com/uvar-apps/eigenvista/pull/67) as `1e6881d`. The
[decision](design/2026-11-14-biological-structure-views.md) records optional
metadata, native capability gating, session display ownership and deposited-only
secondary assignments. The
[verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
records the exact source revision, PR, completed local results, historical
hosted observations and actual merge state. Consult it and Git before continuing
from a different checkout. The earlier planning snapshot below remains historical.

Pre-bump local macOS implementation checks passed: 272 default Rust tests, seven explicit
desktop tests, fmt, strict workspace/all-targets Clippy, 13 packaging tests and
WASM/TypeScript/production build. Authentic frozen native files remain exact; biological files round-trip
with unchanged original numeric entries and an explicit additional capability.

Forty focused Chromium/WebKit cases pass at the corrected production source
(38 biological checks plus two unchanged atom-picking regressions):
structure controls, namespace collisions, original-index picking, clean native
Save/session state, independent geometry/normal/arrow controls, real worker
caching/cancellation and exact field/custom-shader/AO-OFF/PNG invariants, with
explicit GL/FBO/resource checks, real-file application workflows and legal
microheterogeneity. The complete local browser suite passed 504/504 cases
(252 per engine), with zero skipped, flaky or unexpected results. The linked
ledger records the run; the original 233 cases per engine and all existing
deadlines remain intact.

Both engines completed nine actual-application visual captures each, using full
tracked 1AON, 4PJ1 and 1CRN inputs. Real helices, strand arrows, ribbons, tubes,
isolated chains and restoration were inspected. The palette now avoids the
neighboring single-letter hue clustering found during review; an independent
old-palette negative control verifies the fix. Contextual label/author names
remain distinct even when valid source identifiers have the same visible text.
See [user-guide illustrations](user-guide.md#biological-structure-views) and the
decision's retained/peak-memory observations.

The initial `10e7fe0` candidate is superseded. Its full run passed 500/502 and
exposed the primary atom-label compatibility failure; that code now preserves
the old format and 35-pixel status/canvas bounds without changing the old test.
Final review also found legal shared-position monomer variants rejected by new
validation. Both identities now remain selected, and every ambiguous backbone
anchor is omitted with an explicit break. A subsequent partial-identifier
counterexample at `80a6eb1` required checking identity ambiguity independently
of traversal order. Known label conflicts and uncertain author aliases now
remain barriers even with an unclassified variant. Independent review and
972 identifier-presence scenarios cover this guard, including positive
retention controls and native browser diagnostics. Both earlier candidates
and their interrupted/cancelled runs are historical; only the final corrected
head's completed local results in the ledger qualify delivery.
The task-local contract, ownership, ledger and checkpoint live under
`tmp/2026-11-14-structure-views/`. All relevant local tests and checks must pass
before pushing, including the real large-structure visual/compatibility checks
applicable to this implementation. Hosted checks are optional under the current
policy above; earlier hosted runs are historical evidence, not a merge gate.
Consult the linked ledger for PR #67’s actual merge revision and delivery state.
The implementation batch kept version 0.6.0; the separate published 0.7.0
release is recorded above. Existing tags/releases, scientific inputs/precision,
compiler/dependency pins, allocation limits and icon/logo are preserved.

## Visualization roadmap: 14 November 2026 planning snapshot

The user requested practical priorities for additional PDB/mmCIF visualization
options and a file for future planning. [Plan 007](../plans/007-molecular-visualization-roadmap.md)
records the complete ordered catalog, rationale, source evidence and future
acceptance boundaries against main `d098380`. It proposes four bounded additions:
chain/entity coloring; basic chain/component selection and mixed views; protein
backbone trace/tube; then ribbons/secondary-structure cartoons. Shape surfaces
follow, with Gaussian and SAS/SES semantics kept distinct.

Shared prerequisite: retain bounded biological identity across PDB/mmCIF/
BinaryCIF and native saves. The current model retains only element/position;
profile compatibility, stable source atom indices and true polymer continuity
need explicit design before these features. Existing missing hierarchy is a
documented limitation, not a newly established bug. Preserve quantum fields,
hashes, frozen compatibility inputs, instancing, current AO and export behavior.

This pass changes planning documentation only. No feature code, tests, builds,
GitHub priorities, branches, commits or releases were changed. Future major
implementation needs issue tracking and the user's branch/PR authorization.
The [plans index](../plans/README.md) links the roadmap without rewriting earlier
research or release records. Only document/source inspection and link checks
qualify this planning pass; the release tests above remain historical evidence.

## Molecular ambient occlusion: #59

The user authorized [#59](https://github.com/uvar-apps/eigenvista/issues/59) on
`codex/molecular-ssao`, through [PR #60](https://github.com/uvar-apps/eigenvista/pull/60).
Current source adds **Lambert shading + SSAO** for existing atom/bond instances,
without specular highlights. Published 0.5.15 predates this source feature. The
user's [visual reference](https://ugovaretto.github.io/molekel/wiki/uploads/Main/Gallery/AO_AND_NOAO.png)
requires broad fold/cavity shading; the initial indirect-light-only candidate
`a6b58f3` was rejected and must not be treated as accepted source/evidence.

Appearance starts with AO off. Automatic radius starts on: 5% of the atom-only
coordinate-box diagonal, converted to angstrom, quarter-angstrom rounded and
clamped to 1.5–30 Å. It is memoized by atoms reference, independent of fields or
camera. Disabling Auto adopts the current value for manual 0.25–50 Å adjustment.
Owned Lambert replacements receive illustrative visibility contrast on both
diffuse terms; Off/zero/failure restores exact original material references
before releasing owned resources. Field/custom shaders and the final direct
scene/PNG depth/color/transparency path remain separate. Targets follow the
physical buffer, capped at 1024 per edge (ideal attachment payload at most
28 MiB before driver overhead). Read the
[decision](design/2026-11-14-molecular-ambient-occlusion.md) before changing
ownership, bounds, pass settings or deferred nonthrowing shader diagnostics.

Fresh **100/100 local browser checks** pass (194.985 seconds), with zero
skipped/flaky/unexpected results: 20 AO, 72 unchanged renderer/camera/PNG/sidebar
and eight unchanged palette cases. They enforce actual Lambert instances,
positive legacy-gloss controls, independent recessed-versus-exposed geometry,
exact original-reference/Off/zero restoration, field presence/isolation,
physical PNG/compositor parity, Auto/manual/recompute behavior, Save/worker
isolation, target lifecycle and labelled injected FBO/receiver-link recovery.
Normal inventory is **466** (233 per engine, 39 files). Production
WASM/TypeScript/Vite, final strict TypeScript/Prettier and 13 packaging tests
pass. Earlier in this feature, 234 default Rust tests, fmt and strict Clippy
passed; Rust sources, fixtures, locks and workflow budgets remain unchanged.
All four actual final PR-head jobs must pass before merge; their results and
current merge state are linked from #59/PR #60 rather than inferred from config.

Primary actual-App testing uses the unchanged tracked
[1AON.cif](../fixtures/cif/1AON.cif), all **58,870 atoms**, automatic **14.25 Å**
radius, WebKit/Apple GPU. Root inspected the default and genuine side-orbit
Lambert-only/full-AO pairs plus desktop/mobile UI. Broad cavities visibly darken
while exposed atom colors remain. Default-fit/desktop restored PNGs are exact.
Rotated/mobile frames are visual evidence, not exact-restoration passes: an
independent main-frame GPU diagnostic shows 957 pixels already changing between
two Off captures with AO never enabled, with model-view delta 1.14e-5 and
identical projection/viewport. Those comparisons did not hold the same-camera
precondition. Keep their original failed reports; no test tolerance was relaxed.
The unchanged 65,963-atom 4PJ1 structure remains secondary current visual proof.
No FPS, total GPU-memory or all-device performance qualification is claimed.

PNG automation separates three full-size desktop captures from a bounded
interaction/resize case. The latter changes only the test render host at DPR 2
(240×128→160×160 CSS; actual buffers 480×256→320×320), retaining the real
window/toolbar, all five captures, camera/resize/Fit/zero actions and every
pixel/idle/60-second deadline. The separate 1024-cap test and unmodified actual
1AON UI qualification remain. Run 43479687125 at `04c8c919` passed Linux/Mac/
WebKit but timed out in the formerly combined Chromium capture case (231/232);
three completed large captures were exact. Preserve that diagnostic; it does
not qualify the revised test head.

Evidence: `tmp/2026-11-14-molecular-ssao/revision-local-summary.json` and
`revision-visual/` (final100 report/source hashes, primary1AON captures, public
GPU matrix observations and secondary4PJ1). The old head's CI had three green
jobs and one unchanged density-heartbeat failure; it is historical, not the new
head's gate. Preserve user review/reference files, private exports and earlier
releases. No version/tag/archive or scientific/format/precision/dependency/
compiler/logo change belongs to this issue.

## Release 0.5.15

[Published GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.15), annotated tag `v0.5.15`,
source `cf39343c0a53c9ca1e162cf47b1f2eca2bd8392e`, published 13 November 2026
at 15:18:27 UTC. This release includes
[#52 sidebar reordering](design/2026-11-13-sidebar-reordering.md) in the rebuilt
distribution and retains #55's volume visibility fix. [Release notes](releases/0.5.15.md)
and the [release record](status.md#version-0515) describe behavior, limitations
and completed artifact/verification evidence.

All four actual release-head jobs pass in
[run 43445458328](https://github.com/uvar-apps/eigenvista/actions/runs/43445458328):
Linux 232 Rust tests/fmt/strict Clippy, macOS seven desktop tests, Chromium
223/223 (26.9 minutes) and WebKit 223/223 (20.0 minutes), with 13 packaging tests
and production builds per browser job. Fresh local checks pass 241 Rust tests,
fmt/strict Clippy, 13 packaging tests and optimized app/CLI plus production
WASM/TypeScript/Vite builds. Independent audit verifies all 366 eligible source
blobs/modes, 59 payload files, signatures, seven extracted-converter/native/WASM
cases and the new sidebar JS/WASM embedded in the actual Mac executable.
The old 0.5.14 app fails the new sidebar-identity control; static byte identity
does not replace native GUI testing. Remote tag, exact notes, all three GitHub
asset digests and downloaded bytes match the verified local outputs.

ZIP: `artifacts/distributions/EigenVista-0.5.15-apple-silicon-20261113T144337Z-cf39343.zip`
(45,615,151 bytes), with checksum and build metadata sidecars.
SHA-256: `ee9b49963b2a3fae3655c12075f048bafde9e25cd77337ea2badf17781375132`.
Build metadata identifies clean source `cf39343`, arm64, ad-hoc signing and no
notarization. Rebuilt release app:
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.
Evidence: `tmp/2026-11-13-release-0.5.15/`; staging
`tmp/eigenvista-package-CU6Rrj`. Preserve those, original untracked review,
private exports and older releases. Physical native/clean-Mac/HiDPI/cross-OS
installation, general scientific/rendering and power-loss qualification remain
separate gates. Whole-ray opaque intersections and native-save/ExFAT limitations
are unchanged. Timestamped restart files remain historical snapshots.

## Sidebar reordering before the 0.5.15 release

The user authorized [#52](https://github.com/uvar-apps/eigenvista/issues/52) on
`codex/sidebar-reordering`, merged through
[PR #58](https://github.com/uvar-apps/eigenvista/pull/58) as main `e471cbd`.
The contract is
within-pane ordering, stable mounted controls and actual DOM/tab order, a
bounded profile preference separate from documents/expansion, and drag,
keyboard and tap controls. Busy Field rendering retains progress and Cancel.
Read the [decision](design/2026-11-13-sidebar-reordering.md).

The implementation and independent source/test/doc review pass; focused browser
checks pass **38/38**, with zero skipped/flaky/unexpected results. Actual native
drag events, keyboard/tap access, stable file/error nodes, decoded Save parity
and current-request cancellation are covered. Fresh local checks pass **234 Rust
tests**, fmt, strict workspace/all-target Clippy, production WASM/TypeScript/Vite
and **13 packaging tests**. Expanded/reordered desktop/mobile captures have been
inspected. The unchanged camera/direct-preview/shader tests pass **20/20**,
including real scene pixels and wheel/button/middle-drag camera changes, giving
**58/58 local browser checks**. Normal discovery is **446** (223 per engine,
38 spec files). All four actual jobs passed at reviewed head `0473c1b` in
[run 43440036206](https://github.com/uvar-apps/eigenvista/actions/runs/43440036206):
Linux 232/fmt/Clippy, macOS seven, Chromium 223 and WebKit 223, with packaging
13/builds. #52 is closed through the merge. Evidence and acceptance gates remain
under `tmp/2026-11-13-sidebar52/`. No private export, dependency, compiler,
scientific profile, format, version, tag or distribution changed in that repair
batch; the separate 0.5.15 release preparation is above.

## Historical release 0.5.14

[Published GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.14), annotated tag `v0.5.14`,
source `1c37e34f7533e025c02342fbe89a6b887de19fe5`. This release includes the merged
[#55 fix](design/2026-11-13-volume-visibility.md) in the rebuilt distribution.
[Release notes](releases/0.5.14.md) and the
[current release record](status.md#version-0514) describe behavior, limitations
and the exact completed artifact/verification evidence.

All four actual release-head jobs pass in
[run 43429204710](https://github.com/uvar-apps/eigenvista/actions/runs/43429204710):
Linux 232 Rust tests/fmt/Clippy, macOS seven desktop tests, Chromium 214 and
WebKit 214, with 13 packaging tests and production builds per browser job.
Fresh local verification passes 241 Rust tests, 13 packaging tests, fmt/strict
Clippy and optimized app/CLI plus production WASM/frontend. Independent audit
verifies 362 source blobs/modes, 59 payload files, signatures, BinaryCIF/native/
WASM parity and byte-identical fixed shader/JS and WASM embedded in the actual
extracted Mac executable. The old 0.5.13 app fails the fixed-shader control.
Remote tag, exact notes and all three published/downloaded asset hashes match.

ZIP: `artifacts/distributions/EigenVista-0.5.14-apple-silicon-20261113T125509Z-1c37e34.zip`
(45,597,944 bytes), with checksum and build metadata sidecars.
SHA-256: `398591c604e70628f15229e82a585b261c677a3d8922424e3ffd4257fc0bad93`.
Source is clean, signing ad-hoc, without notarization. Rebuilt release app:
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.
Evidence: `tmp/2026-11-13-release-0.5.14/`; staging
`tmp/eigenvista-package-jcaTVc`. Preserve original untracked review, private
exports and older releases. No persistent Git exclusion was changed.

#55 is closed and ships in 0.5.14. Optional #52, #37's bounded memory/fallback
policy, #40 profiling and #41 save-policy work are next candidates; #38 stays
behind #37. Whole-ray opaque intersections remain approximate, and physical
native/clean-Mac/HiDPI/cross-OS installation remain separate qualification gates.
Timestamped restart files stay historical snapshots.

## Volume visibility repair before the 0.5.14 release

[#55](https://github.com/uvar-apps/eigenvista/issues/55) fixes the disappearance
of volumes at finer preview qualities. A shared aggregate-alpha cutoff 0.005
now determines both visibility and the first representative depth, interpolated
inside the crossing segment. The alpha expression, raycast branch, filtering,
brick skipping, grid/cache/scientific data and limits stay unchanged. Read the
[decision](design/2026-11-13-volume-visibility.md) before changing this policy.

A fresh old-shader run gives four failures and 16 wrong results among 40
production observations. All 40 independent fixed expectations pass after the
repair. The full focused run passes **78/78** across Chromium/WebKit: 52 new
visibility/depth/prefix/cutoff tests and the unchanged 26 affine/tent cases,
with 154 new and 56 existing bounded draws, zero skipped/flaky/unexpected tests.
Normal discovery is **428** (214 per engine). The old counterfactual/probe is
retired from current code, preserved in Git history. Diagnostic depth writes
are labelled and separate from real production opaque-object scenes.

Fresh local checks pass **234 default Rust tests**, Rustfmt, strict workspace/
all-target Clippy, production WASM/TypeScript/Vite and **13 packaging tests**.
All four actual final PR-head jobs remain the merge gate: Linux Rust, explicit
macOS desktop and the complete Chromium/WebKit suites. Their results and the
additional existing UI/camera checks are recorded in the PR linked from #55.
Raw failures, source identities, metrics and captures remain under
`tmp/2026-11-13-volume55/`. Preserve the original untracked review/private exports.

Volume still integrates its whole ray before one depth test. Opaque objects
inside an accepted ray can leave behind-object color in that result; this is
an explicit existing limitation, not scene-depth-clipped compositing. The fix
adds no prepass/buffers or scientific policy. No release/tag/ZIP rebuild is part
of this issue. The published 0.5.13 package retains the old behavior.

After this fix, optional #52 is the simplest UI enhancement. #37 needs a bounded
benefit/memory raw-fallback policy, #40 profiling and #41 save-policy decisions;
#38 stays behind #37. Other scientific/capacity/crystallography issues retain
their existing research/scope gates.

## Historical release 0.5.13

[Published GitHub prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.13), annotated tag `v0.5.13`,
source `8c09db29981023a95f855a41a079e831dc84a9ff`. [Release notes](releases/0.5.13.md) collect native exit protection,
collapsible sidebar, import/publication/encoding work, compatibility/CI and
research since 0.5.12. Version metadata and current guides agree; source profiles,
precision/limits, dependency/toolchain versions and icon remain unchanged by the
version bump. The current [release record](status.md#version-0513) holds details.

All four actual jobs at the release source pass in
[run 43402898985](https://github.com/uvar-apps/eigenvista/actions/runs/43402898985):
Linux232/fmt/Clippy, macOS7, Chromium188 and WebKit188, packaging13/builds.
Fresh local verification passes 241 Rust tests, 13 packaging tests, fmt/strict
Clippy and optimized app/CLI plus production WASM/frontend. Independent package
audit verifies all 358 source blobs/modes, 59 payload files, extracted signatures,
BinaryCIF conversion and release-WASM/native parity. Published/downloaded asset
hashes and the remote annotated tag match the exact verified release source.

ZIP: `artifacts/distributions/EigenVista-0.5.13-apple-silicon-20261113T093740Z-8c09db2.zip`
(45,586,584 bytes), with checksum and build metadata sidecars.
SHA-256: `35a502024e3df91bccfa17b914aa2aeb351fa185d9007021c992a45697373418`.
Source is clean; signing is ad-hoc, without notarization. Root release app is
`target/aarch64-apple-darwin/release/bundle/macos/EigenVista.app`.
Evidence: `tmp/2026-11-13-release-0.5.13/`; staging
`tmp/eigenvista-package-QQwgNK`. Preserve those, the original untracked review
and private exports. Physical native/clean-Mac/HiDPI/cross-OS installation remain
separate gates. Timestamped restart files stay historical snapshots.

#55 was still unfixed in the published 0.5.13 source; the subsequent repair
is recorded above. #41 remains P3 for explicit save policy/platform work; #43
is closed as investigated. No production compaction or isotropic resampling
was enabled.

## Issue priorities

### Save and anisotropic-rendering research: 13 November 2026

Research only: production writers, renderer, scientific hashes, grid/cache policy,
limits, dependencies and frozen fixtures are unchanged. Read
[Plan 005](../plans/005-native-save-contract-research.md) and
[Plan 006](../plans/006-anisotropic-rendering-research.md) before continuing.

- **#41 stays open at P3** for policy/platform follow-up. Actual APFS saves
  replace complete files and change prepared `0640` mode to `0600`; one of 12
  unique no-clobber contenders wins. Actual writers fail safely under confirmed
  ENOSPC/EROFS. Real ExFAT lacks hard links: CLI initially absent outputs fail,
  including `--force`; replacing an existing output succeeds. Desktop Save uses
  the replacement writer. Neither these ordinary observations nor staging-file
  sync establish power-loss durability. Parent directories are not explicitly
  synced. Physical dialog cancellation, sync failure, ACL/ownership and other
  platforms/filesystems remain unqualified. Never weaken no-clobber publication
  with direct writes to the final name.
- **#43's investigation is complete**; its research PR closes it as investigated.
  Actual production draws pass 26 independent physical-space checks across
  Chromium/WebKit, with 1,200 profile comparisons and four signed thin-feature
  checks. The tested envelope finds no affine/anisotropic traversal defect.
  An equal-memory isotropic allocation erases a resolved thin feature before
  rendering. No automatic resampling/grid-policy change is justified.
- **Next: [#55](https://github.com/uvar-apps/eigenvista/issues/55), P2 confirmed
  renderer bug.** Increasing quality can make volume rendering blank even on
  isotropic grids: per-segment alpha fails the first-marker threshold while
  aggregate alpha should be visible. The opt-in probe retains 40 baseline
  observations (16 wrong) and 20 separately labelled in-memory causal controls
  (all correct); its four tests deliberately fail. This research does not fix
  the product. A future repair must qualify depth testing/opaque occlusion as
  well as opacity and preserve existing quality/empty-space/affine coverage.

Fresh integration checks: **241 Rust tests** (234 default members plus seven
explicit desktop), Rustfmt, strict workspace/all-target Clippy, production
WASM/TypeScript/Vite and **13 packaging tests** pass. The focused normative
browser suite passes **26/26**. Normal discovery totals **376** (188 per engine);
the separate known-bad opt-in probe is outside normal CI and must not be skipped,
marked expected-failure or used to generate expectations. All four actual hosted
jobs at the reviewed PR head remain the merge gate; consult the research PR linked
from [#43](https://github.com/uvar-apps/eigenvista/issues/43) and its check results.
Local evidence and the independently repeated APFS probe are retained under
`tmp/2026-11-13-research41-43/`. Only owned disk images/servers were used and
stopped/detached. Version/tag/release/ZIP remain unchanged.

#52 is the next optional UI enhancement; #37 still needs a bounded benefit/budget
raw-fallback policy, #38 is deferred behind it, and #35/#36/#40/#42/#20 need their
separate workloads/research. #22 remains a separate export feature. See the
[current priority update](reviews/2026-11-11-issue-priorities.md#save-and-rendering-research-follow-up).

### Sidebar disclosures and mesh qualification: 12 November 2026

The user authorized #48 and **only the qualification phase** of #37 in
[PR #53](https://github.com/uvar-apps/eigenvista/pull/53), developed on
`codex/collapsible-panels-and-mesh-qualification`. All eight sidebar sections
now have keyboard-accessible disclosure headings with hidden, mounted bodies.
Bounded profile preferences survive Open/Clear/reload without touching scientific
data, dirty state or worker inputs. Field rendering stays open while busy so
progress and Cancel remain accessible, then restores the user's preference.
See the [user guide](user-guide.md#finding-your-way-around) and
[decision](design/2026-11-12-sidebar-disclosures.md). Reordering is deferred to
[#52](https://github.com/uvar-apps/eigenvista/issues/52).

The separate [qualification record](design/2026-11-12-indexed-mesh-qualification.md)
and [Plan 003](../plans/003-indexed-mesh-qualification.md) cover exact tuple
sharing, original shader vertex-ID reconstruction, frozen signed/reflected
layout inputs and real native memory measurements. Production core, mesher,
renderer, writer/decoder, hashes, profiles, precision, dependencies and limits
are unchanged. Only the research harness and fixtures use the prototype layout
marker;
it is not a supported production format promise. Old arbitrary indexed meshes
retain their existing arrays and shader identity. Keep `fixtures/native/`
and the new adopted qualification corpus immutable.

Retained H2/water geometry shrinks substantially, but unchanged H2 extraction
dominates peak and a near-limit no-sharing control increases median RSS from
107,216,896 bytes to 219,332,608 sorted or 458,457,088 hashed. **NO-GO for automatic
unconditional packing.** #37 stays open with `needs-research`: choose a concrete
whole-application budget and savings-before-output/raw-fallback policy, then
qualify actual custom-shader expansion, WASM/worker/publication/cancellation
before enabling anything. The prototype's 512 MiB scratch guard is not that
production decision. #38 remains deferred; existing hash allocations are #40.

Fresh local verification and actual reviewed-head hosted results belong in
[status](status.md#sidebar-disclosures-and-mesh-qualification-12-november-2026)
and [PR #53](https://github.com/uvar-apps/eigenvista/pull/53). All four hosted
jobs must pass before merge. This increment
does not bump version, tag, release or rebuild the tester ZIP. Preserve the
original untracked review, private exports and repository-local raw evidence.

The first hosted run at `a95ee3f`,
[43240917646](https://github.com/uvar-apps/eigenvista/actions/runs/43240917646),
hit the combined browser step's 35-minute deadline after 318 test starts, with
no explicit assertion failure logged. Final result counts were interrupted;
do not claim those starts passed. Linux Rust 230, macOS seven and packaging 13
passed. Local traced verification passed all 350 cases in 11.4 minutes.
[#54](https://github.com/uvar-apps/eigenvista/issues/54) tracks the required CI
capacity repair in the same PR: separate Chromium/WebKit matrix runners, 175
cases each, fail-fast disabled and distinct failure artifacts. Test sources,
one worker and every existing timeout/assertion remain unchanged. The four
actual final-head results, not the failed combined run, are the merge gate.
See the [decision](design/2026-11-12-browser-project-isolation.md). Preserve the
checksum-verified original failure artifact under repository tmp.

The prior typed writer/test-repair increment is merged in
[PR #50](https://github.com/uvar-apps/eigenvista/pull/50), main `2f7aeec`, closing
#39/#51 after all three jobs passed in
[run 43217008177](https://github.com/uvar-apps/eigenvista/actions/runs/43217008177).
Its final full inventory was 320 browser cases. The user also closed #47 because
the existing ZIP/manifest/arrays meet the requested container goal; no new
directory/container redesign is pending. Older entries below are dated evidence
and then-current priorities, not the current open-issue queue.

### Typed native encoding: 12 November 2026

The user authorized #39's remaining encoding phase on
`codex/typed-native-encoding`. The [typed writer](../crates/eigenvista-format/src/typed.rs)
now emits numerical bytes directly, retaining small metadata/reference JSON.
Publication and Save share exact preflight; decoder, profile IDs, f64 bits,
source hashes, logical layout, scientific code, dependencies and limits stay
unchanged. No profile migration is needed. The frozen corpus is untouched.

All **44 format tests** pass, including four new edge tests with seven layout
hashes captured before the refactor, two checked-buffer safety tests and the six
frozen compatibility tests. Exhaustive model destructuring exposes new schema
fields at compile time. Independent review found no remaining issues.

Three fresh native release processes per version on the same 128³ authoritative
grid measure median whole-process peak RSS **182,304,768→47,480,832 bytes**
(73.96% lower). Median encode times are 261.057→252.110 ms; timing ranges overlap,
so do not claim a general speedup. All six archives have identical manifests
and decompressed entry bytes. Source/binary/input identities and raw results are
retained in `tmp/2026-11-12-typed39/memory/`; the committed
[example and procedure](development.md#native-encoding-measurements) allow new
measurements. This workload excludes saved meshes; existing source hashing still
allocates numeric JSON. Browser/WASM peak memory and universal OOM recovery are
not established.

Fresh local checks pass **238 Rust tests**, strict Clippy/Rustfmt, production
WASM/frontend and debug native builds, **13 packaging tests** and **26 real
embedded-native observations**. Full 306-case two-engine/capture results and the
actual reviewed-head hosted run are recorded in
[#39](https://github.com/uvar-apps/eigenvista/issues/39) and its implementation PR;
all three hosted jobs must pass before merge. See [status](status.md#typed-native-encoding-12-november-2026)
and the [decision](design/2026-11-12-typed-native-encoding.md).

Initial hosted run [43208190349](https://github.com/uvar-apps/eigenvista/actions/runs/43208190349)
at `9ecb720` failed six existing progress/rendering checks (300 passed, 33.2 min).
Linux 229 Rust/Clippy, macOS seven desktop tests, production build, packaging and
all 12 frozen-file browser cases passed. The first local 306-case pass is
historical evidence for that initial head, not a green hosted gate.

Required test repairs are tracked in [#51](https://github.com/uvar-apps/eigenvista/issues/51)
on PR #50. Progress now waits for real worker results/checkpoints and completed
publication; cancellation snapshots identify the active worker/request. GPU
cases preserve all comparisons/timing draws while dividing the aggregate work.
Cube retains loaded desktop-to-mobile resize and real damping; viewer captures
follow actual settled draws. Focused CI-traced Chromium passes **30/30** cases
with a verified ANGLE/SwiftShader renderer in 2.1 minutes; the six GPU evidence
files still contain all 24 comparisons and 14 distinct timing configurations.
Independent final reviews found no remaining blockers. The corrected full
inventory is **320 cases**. See the
[decision](design/2026-11-12-browser-verification-scheduling.md) and current
issue/PR evidence for software-rendered/traced, full local and actual final-head
hosted results. All three jobs must pass before merging. Runtime/writer hashes,
frozen data and the native memory measurements remain unchanged by these test
repairs. Preserve the initial failure artifact under repository tmp.

This completes the writer scope begun after PR #49's fixture checkpoint, subject
to those integration gates. The older entries below describe their dated scope;
their then-future typed phase is this increment. No version/tag/release/ZIP was
requested. Preserve the untracked original review and private exports. Future
#37/#38/#40 work remains separate.

### Vite maintenance and fixture phase: 12 November 2026

The user authorized #46 and only the fixture phase of #39 in
[PR #49](https://github.com/uvar-apps/eigenvista/pull/49), developed on
`codex/vite-maintenance-and-native-fixtures`. Vite is now declared
`^7.3.8` and locked/installed at 7.3.8. Clean install/audit reports zero
vulnerabilities; every other npm package entry is unchanged. The installed Vite
license and generated runtime notices are byte-identical. Rust, bindgen,
scientific dependencies, application version, icon and release artifacts stay
unchanged.

The [native fixture corpus](../fixtures/native/README.md) freezes four small
archives: genuine reconstructed 0.3.2 H2 and current structure/RHF/UHF examples,
with producer provenance, exact logical manifests, numeric entry digests and
semantic documents. Test setup never regenerates input archives. The new native
checks distinguish signed-zero bits from browser JSON canonical Save; the actual
WASM/worker/UI checks preserve cached meshes without sampling/re-meshing and
test Save/reopen, missing-bond supplementation and malformed-source recovery.
The 12 focused Chromium/WebKit cases pass. Fresh workspace verification passes
232 Rust tests, Rustfmt/strict Clippy, production WASM/frontend and debug native
builds, 13 packaging tests and 26 real embedded-native observations across clean
and dirty close/Cancel/Discard. Current desktop/mobile fixture captures were
inspected. The full 306-case browser run and actual reviewed-head hosted evidence
are recorded in [PR #49](https://github.com/uvar-apps/eigenvista/pull/49); all three
hosted jobs must pass before merge. Integration evidence is also
maintained in [status](status.md#vite-maintenance-and-native-fixtures-12-november-2026).

See the [decisions](design/2026-11-12-vite-and-native-fixtures.md) and updated
[plan index](../plans/README.md). #39 remains open for typed encoding and its
remaining design; no writer, profile, hash, numeric precision or resource-limit
change is included. No version/tag/release/ZIP was requested. Preserve the
untracked original review and repository-local research/integration logs.

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

At that research checkpoint, recommended next work was the bounded Vite 7.3.8
maintenance patch (#46), then
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

## Historical release 0.5.12 (6 November 2026)

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
