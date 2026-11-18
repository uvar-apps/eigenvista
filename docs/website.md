# User-facing website

The public website lives in `site/` on `main` and is intended for application
users: installation, a detailed reference, worked tutorials and a gallery.
It is published at <https://uvar-apps.github.io/eigenvista/>. Completed issue
[#75](https://github.com/uvar-apps/eigenvista/issues/75) tracks its creation;
[#76](https://github.com/uvar-apps/eigenvista/issues/76) tracks the content,
scientific imagery, aspect-ratio and shader-showcase revision.
[#77](https://github.com/uvar-apps/eigenvista/issues/77) tracks the user-first
GitHub presentation, real-app video/social preview and search discovery. See
[project discovery](project-discovery.md) for recording/reproduction, asset
provenance, Search Console ownership-tag maintenance and publication state.
[Issue #79](https://github.com/uvar-apps/eigenvista/issues/79) adds the local AI
connector section and four prompt-driven tutorials. See the
[connector guide](ai-connector.md) for manual and agent-assisted installation.
Version 0.10.1 retains the packaged connector and scientific-inspection features;
the AI pages guide users from an installed binary. Scientific inspection and the
four-tab workspace were introduced in 0.10.0; the connector was introduced in
0.8.0. Older 0.7.2 packages predate control.
The published homepage hero highlights **AI-enabled viewing**, links directly to
the AI overview, and names the compatible published package beside the callout.
Keep that availability label aligned with the actual public release.

The current source is **0.10.1**, tracked through
[issue #93](https://github.com/uvar-apps/eigenvista/issues/93). The final clean
package uses source `927a2962e8193b41918737ee34adbd2b7a545c29`; its archive audit,
self-contained guide/connector resources and actual extracted app/helper have
passed qualification. A first unpublished candidate was superseded after the
last dependency review found the linked allocation guide missing from its
standalone folders. Both the website and corrected package now carry it.

Current authored content and generated download facts identify the corrected
package. All 162 local browser cases pass. Public release/Pages readback is complete:
all three release downloads and all 90 tracked site files plus nested404 match.
Pages deployment [44216922047](https://github.com/uvar-apps/eigenvista/actions/runs/44216922047)
serves delivery commit `c4109f63a9bb4b40b64426dc620c305fe5a82d63`. See the living
[handoff](handoff.md) and [status](status.md) for the final ledger. Preserve
historical source tags, artifact facts, version DOIs and media capture provenance.
The four-tab, resizable left/right workspace and scientific inspection were
introduced in 0.10.0; the 0.8.0 download predates these additions.

The 0.10.1 reference explains a single camera-aligned light with neutral fill,
smooth diffuse shape cues and one Blinn-Phong highlight. AO retains Lambert +
SSAO without specular highlights. It also replaces obsolete file-byte, atom,
bond, grid, orbital, surface, cache and export quotas with allocation-based
behavior: requested data are retained, actual allocation/representation/device
failures are reported, and calculations keep progress and cancellation. SES/SAS
spacing and cavities are preserved without silent coarsening. The preset grid
choices through 256³ are conveniences; custom positive resolutions are allowed.
Keep scientific format restrictions distinct from removed resource ceilings.
The 50-entry biological legend/search presentation and automatic AO-radius
heuristic remain UI behavior; neither limits imported structure size.

The three `simple-*` workspace PNGs are real 0.9.0 captures of the approved workspace, retained
with exact hashes and dimensions in media provenance. They illustrate the
approved layout and quantitative signed-orbital plane. Keep their capture
identity separate from current source metadata and preserve their aspect ratios.
Earlier experiment images remain historical design evidence. New page copy
must make quantitative inspection discoverable through Fields and distinguish
orbital amplitude (signed phase) from nonnegative electron density.

## A static directory, with a small publisher

The previous **0.10.0 Mac download** was published with actual qualified artifact
facts. This historical publication record is retained independently of 0.10.1
release preparation. Site commit
`3fc91fb56114c7b16219a2f86e8e817fc6332328` was published by
[Pages deployment 44054046506](https://github.com/uvar-apps/eigenvista/actions/runs/44054046506).
All 89 public files and the custom nested 404 match the qualified payload. The
three release assets also match independent anonymous downloads. Before pushing,
all 162 local site browser cases, static checks and desktop/phone visual review
passed. Evidence is under `tmp/release-0.10.0/`, with browser report
`tmp/2026-11-15-website/browser-FKf8Dv/RESULT.json`. Earlier source-only delivery
and published 0.8.0 asset facts below are historical. Do not alter image capture
versions when advancing release metadata.

The 0.10.0 site is published from merge
`8ab5a0a1e12f7314c93b29745ea75e4c4f11b784` by the successful
[Pages-only deployment](https://github.com/uvar-apps/eigenvista/actions/runs/44047989575).
All **89 committed public files** match the qualified local bytes, including
the custom nested 404 body/status. The local 162-case website suite and visual
review passed before pushing. The first readback also enumerated two ignored
macOS `.DS_Store` files; those correctly returned 404. The corrected check uses
the committed deployment file list and passes. Both reports are preserved under
`tmp/version-0.10.0/public-files{,-attempt1}.json`. No application CI or binary
release was started.

The published payload is ordinary HTML, CSS, JavaScript, images and example
downloads. It has no runtime framework, external fonts, analytics, account or
calculation server. Navigation and downloads work without JavaScript. Optional
JavaScript adds documentation search, theme choice, gallery filters and genuine
AO image comparisons. The existing application icon is copied unchanged.

GitHub Pages cannot select an arbitrary `site/` folder in its branch-source
dropdown: that setting supports `/` or `/docs`. The small
[Pages workflow](../.github/workflows/pages.yml) instead uploads **only `site/`**
from `main`. This matches Sesmesh's deployment arrangement and requires no
separate `gh-pages` branch. Configure repository Settings → Pages → Source as
**GitHub Actions**. The workflow performs no dependency installation, build,
application test or CI matrix; it publishes the locally prepared files.
Application verification remains manual-only under the existing user policy.

## Maintain the content

The small, dependency-free Node script `tools/site/build.mjs` composes shared
headers/navigation/footer and page metadata around authored HTML in
`tools/site/content/`. Its generated output is committed under `site/`; GitHub
does not run this script. CSS and progressively enhanced JavaScript are authored
directly under `site/assets/`. Image and stylesheet URLs include content hashes,
so returning readers receive revised pictures and styles despite Pages caching.
Regenerate HTML after changing either; the local checker catches stale output.

Treat [the user guide](user-guide.md), the import guides and actual UI labels as
the source of truth. Keep the reference and tutorials synchronized when controls
change. Keep installation claims tied to an actually published release.
The AI pages are authored in `tools/site/content/ai.mjs` (overview, installation,
user guide), `ai-quantum.mjs` (two quantum lessons) and `ai-molecules.mjs` (two
large-molecule lessons). The four tutorials live only on the website. Keep the
installation and attachment prompts aligned with `docs/ai-connector.md`, covering
Codex Desktop/CLI, Claude Code, Pi, OpenCode and generic local agents. Link current
official agent setup sources and distinguish the first compatible binary package
from the currently released download. User installation starts from an installed
app and prebuilt helper; it must never require source compilation, a checkout or
project-development instructions. User prompts describe desired views in ordinary language;
the agent handles internal connection/method details from its technical guide.
Palette loading/reset, biological coloring, subsets, per-chain/component styles,
focus and automatic AO radius are now available through #80's controller work.
Keep tutorial actions aligned with the actual running connector's capabilities.
Author and copyright details appear in the README, the About page and the shared
footer on every page: Author: Ugo Varetto; Copyright (c) 2026 - Ugo Varetto.
Keep these visible when editing the layout, alongside the existing license and
third-party credits. The shared footer links to About's **Cite EigenVista**
section. The 0.10.1 citation uses its version-specific DOI
(`10.5281/zenodo.24328295`), supplied by the user on 18 November 2026.
The concept DOI (`10.5281/zenodo.24246123`) identifies all versions.
The About page distinguishes
the current citation from the historical 0.10.0 archive
(`10.5281/zenodo.24302658`) and 0.8.0 archive
(`10.5281/zenodo.24273137`). Its current download citation is derived from
`tools/site/release.mjs`, which remains tied to the verified package until the
release coordinator updates it.
Keep citation title, author, version and DOI
synchronized. A version DOI identifies that archive, so do not assign it to a
later version. DOI metadata added after publication updates documentation
and release notes without moving the existing tag or rebuilding immutable assets.

The three simple-pane illustrations retain original PNGs and complete capture
metadata under `docs/design/assets/simple-workspace-pane-2026-11-17/`. Public
copies are lossless WebP at the same 1280 × 800 dimensions, with zero decoded
pixel differences. Their source version remains 0.9.0; the design introduced
in 0.10.0 is retained in 0.10.1. The public provenance JSON is compactly serialized to keep
all capture data and the new imagery within the existing 25 MiB payload bound.
Existing image bytes, metadata values and palette provenance are preserved.
Project history traces EigenVista to Molekel, developed by Ugo Varetto from
2006 to 2010. Link the original repository and website from README/About History.
Describe the Rust/TypeScript code as the new implementation; repository subtree
extraction details belong in developer provenance.
Write for people using a molecular viewer: lead with tasks and controls. Keep
format restrictions, units and display limitations next to the relevant feature.
Avoid repeated elementary science warnings and internal verification terminology
in user-facing pages. Read the copy and inspect every promoted image at full
resolution and in its actual desktop/phone layout. Choose useful molecules,
fields, camera framing, colors and opacity before publishing. Preserve natural
aspect ratios and make screenshots of controls readable; an automated pass does
not establish content or image quality.
`tools/site/release.mjs` holds the verified release URL, asset stem, source and
checksum used by the download page. It is not an automatic “latest” selector:
development prereleases must not send users to an unrelated stable release.

From the repository root:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
node tools/site/build.mjs
node tools/site/check.mjs
node tools/site/serve.mjs 5190
```

The preview serves <http://127.0.0.1:5190/eigenvista/>, including the real project
prefix and a nested-path 404. Check port ownership first; do not stop an unknown
server. In a second shell with the same temporary-directory environment:

```sh
node tools/site/test.mjs
```

Browser checks use the repository's already installed Playwright Chromium and
WebKit. They exercise all page routes at desktop and phone widths, image
decoding, keyboard/skip/search, saved theme, no-JavaScript navigation, reduced
motion, search failure recovery, gallery filtering, real downloaded bytes,
both AO comparison endpoints and nested 404 navigation. Screenshots and evidence
are retained under ignored `tmp/2026-11-15-website/`. This does not run the
application suites or create new platform qualification.

## Capture authentic media

The local website contains 16 curated captures: the original 15 real EigenVista
0.7.2 captures and one source-preview AI-session image. The original nine quantum images
show a 17-atom C₇H₁₀ molecular calculation, high-resolution frontier orbitals and
volume rendering, X-ray and cutaway density surfaces, the actual workspace and
readable shader controls, plus an imported 29-atom cube field. Six retained
images show large structures and their biological representations. `site/assets/media/provenance.json` records input/palette hashes,
application source, representation, camera operations, AO/field settings,
dimensions and output hashes. The two AO pairs use complete 1AON and 4PJ1
structures with MatterViz Pastel, element coloring and Van der Waals spheres.
Off uses the normal molecular material; On uses Lambert + SSAO. Do not describe
that comparison as two identical lighting models or as electron density.

`ai-session-xray.webp` is a lossless 1700×1328 conversion of the final image in
the user-approved [sample AI session](sample-ai-session/README.md). Its provenance
row identifies the unreleased connector/source workflow, HOMO 26, signed 0.03
isovalue, 128³ grid and 18,736 triangles. Numeric X-ray uniforms were not recorded
in the original session and must not be presented as measured reproduction data.
The lesson labels suggested settings as starting values. Do not relabel this
image as a capture from the released 0.7.2 binary. Existing media keep their
original hashes, including the Pastel/element AO comparisons.

`tools/site/capture-quantum.mjs` records the new real-UI photography procedure.
It uses the existing production app on owned port 5189, the installed Playwright
browser and ImageMagick. With the repository-local temporary environment above:

```sh
node tools/site/capture-quantum.mjs --final
node tools/site/capture-quantum.mjs --final --density-only --cube
node tools/site/capture-quantum.mjs --final --panel-only
```

It writes candidate PNGs and capture settings to
`tmp/2026-11-15-website-quality/`; generated native meshes there can be reopened
while refining the view. Review the frames before selecting them. The published
cutaway uses `zmax = 0.25`, factor `0.24` and other bounds ±10; the orbital mesh
views use opaque Blinn-Phong shading to give clear phase boundaries. The dedicated
shader-panel image is a real element screenshot at device pixel ratio 2.

The approved cutaway replacement keeps that density mesh, clipping and colors,
but uses Fit, one Zoom in step and a 250px horizontal / 80px vertical orbit at
the 2560×1800 capture viewport. This oblique view makes the clipped opening
clearer. It replaces the former 100px horizontal orbit; complete-surface and
X-ray views retain their original cameras. The capture script records the
approved view as `quantum-clipped.png`. The original approved PNG, nearby angle
studies, lossless replacement and desktop/phone layout evidence are retained
under `tmp/2026-11-15-clipping-angle/`.

Encode selected PNGs losslessly with `cwebp`, retaining natural dimensions, then
update the media provenance and page captions. Preserve the source, field,
isovalue, resolution, camera and shader settings. The original
`tools/site/capture.mjs` is the initial website capture record, including the
superseded small demonstration imagery; do not run it over the curated site.
Read port ownership checks before starting a preview, and do not rebuild, replace
or stop the user's app. Original PNGs and lossless pixel comparisons stay in
ignored evidence. The website itself needs none of these image tools to serve.

The 30-second shader demonstration retains its original 1920×1080, 25 fps
H.264 footage and adds the user-approved English narration in a synthetic female
voice, with synchronized English captions. The audio is mono AAC at 48 kHz,
mastered to about −16 LUFS, with no music. Playback remains on request with
`preload="none"`, no autoplay and no looping. The on-demand video is bounded
below 5 MiB and the complete static payload below 25 MiB. See
[project discovery](project-discovery.md#the-shader-demonstration) for the retained
audio, script/voice/caption metadata and reproduction procedure: the publish
helper remuxes the approved AAC without another TTS call or changes to the
original video packets. New recordings must retain the matching visual beats
or have their narration and captions deliberately retimed.

Example downloads are copied from an explicit public-file allowlist, never from
untracked inputs. `site/downloads/provenance.json` records original paths and
SHA-256 values; its README identifies synthetic versus calculated examples and
the MatterViz MIT notice. Preserve source/license attribution and the original
application logo. Do not include private chats, review originals or the original
untracked AO reference image.

## Publishing and scope

Run all relevant local checks before pushing. A change to `site/**` on `main`
triggers only the Pages publisher; changes solely to its authored content modules
must first be regenerated so the new HTML reaches `site/`.
After deployment, verify the public HTTPS pages, CSS/JS/media and examples against
the locally checked payload. Follow only the Pages deployment when checking this
publication; do not start or poll the optional application Verify workflow.

Website-only work does not bump the app version, retag a release or rebuild
existing redistributables. An explicitly requested source-version update is
coordinated with application metadata. Published downloads retain their identities.

## Installed-binary setup correction: 16 November 2026 (local)

[Issue #81](https://github.com/uvar-apps/eigenvista/issues/81) replaces the earlier
developer-oriented installation with installed-app setup: one autonomous agent
prompt or a bundled launcher. The app carries a prebuilt helper, portable user/
agent instructions and local reference, examples and palettes. The optional
skill folder is metadata for an agent, not a substitute for installing the
actual binary or starting its connection. Agents can download a compatible
binary and data files from URLs; a missing compatible release is reported
honestly without a source-build fallback. The published 0.7.2 assets remain
unchanged and lack these components.

The prepared site has 23 pages and **22 exact-byte downloads**: the original 19
inputs/palettes/shaders/notices plus portable `SKILL.md`, `reference.md` and
`README.md` under `downloads/eigenvista-control/`. Their local dependencies travel
with them. All seven AI pages reject development-file/build-command requirements.
Final static checks passed: 850 references, 62 image uses and 25,613,408 bytes.
The full Chromium/WebKit suite passed 138 route/viewport cases and interactions;
18 targeted desktop/phone checks confirmed readable tables, paths and unchanged
copied prompts at 320/390/1440. Real staged/extracted-binary acceptance and 19
packaging checks also passed; see the
[current handoff](handoff.md#standalone-binary-connection-setup-16-november-2026-local).

Evidence: `tmp/2026-11-16-ai-binary-install/` and
`tmp/2026-11-15-website/browser-XQDVdX/RESULT.json`. The first phone overflow and
an obsolete table locator are preserved in failed logs; both were corrected
without weakening assertions. Existing imagery, examples and released artifacts
retain their identities. The website remains a local, uncommitted update.

## Natural-language correction: 16 November 2026 (local)

The user rejected the first AI tutorials' method-oriented language and manual
palette/biological steps. The four lessons and interaction guide now contain
ordinary requests for results. Agents handle connection discovery and translate
those requests using the technical reference/skill. Setup includes narrow access
to bundled palettes and confirms the newer palette/biological features; the
lessons no longer require users to configure roots or operate GUI controls.
AGENTS preserves this user-facing content requirement. The static checker rejects
internal method names and manual handoffs in the AI pages, including negative
controls for the exact rejected wording. #80 adds the required shared-controller
operations without adding a GUI console or model connection.

The corrected site passed static checks: 23 pages, 851 references, 62 image uses,
19 exact downloads and 25,592,677 bytes, within the existing payload budget.
The full Chromium/WebKit site suite passed 138 route/viewport cases and all
interactions. Independent review covered all seven AI pages at desktop/phone
widths, all 27 ordinary-language lesson prompts, matched setup/attach text and
eight parsed manual shell snippets. Existing source media/download hashes are
unchanged. Site results: `tmp/2026-11-15-website/browser-6Mgos4/RESULT.json`;
text/visual evidence: `tmp/2026-11-16-ai-workflow/`.

Actual native verification passed 277 CLI calls, 19 PNGs and eight native saves,
including real 1AON Pastel/AO and chain/entity/secondary views without GUI steps.
Independent archive checks retained complete source/scientific data in isolated
saves. These new captures are verification artifacts, not replacements for the
curated website media. The application also passed its full affected local
runtime/build/native checks. See the
[current handoff](handoff.md#natural-language-workflows-and-presentation-control-16-november-2026-local)
for exact commands, results and remaining limits. The initial evidence below
remains historical and is not acceptance of the rejected user experience. The
corrected site/source remains local, uncommitted and unpublished.

## Initial AI documentation addition: 16 November 2026 (local)

The prepared site now has **23 pages**, **16 curated images** and the original
**19 exact-byte downloads**. The seven new AI routes provide an overview,
installation with an agent setup prompt, connector use, frontier orbitals,
density volume/raycast/shaders, large-molecule AO and protein representations.
The HOMO lesson adapts the saved real session. Source availability and the
unchanged released ZIP are distinguished throughout. These routes are not yet
published; preview them at <http://127.0.0.1:5190/eigenvista/ai.html>.

Local static checks passed: 849 references, 62 image uses and a 25,611,918-byte
payload, within the existing 25 MiB budget. The full Chromium/WebKit suite passed
138 route/viewport cases and all interactions, including the new accessible
phone installer table, exact copied commands/prompts, AI navigation and search.
Independent desktop/phone content and figure reviews passed. Live native replay
verified all four workflows and seven representations through 116 CLI calls,
with 18 PNGs/four native saves; a separate clear-shader checkpoint adds one PNG
and one save. Palette/color GUI instructions retain qualified existing imagery
and were not claimed as new API operations or repeated live checks.

Evidence: `tmp/2026-11-16-ai-docs/` and
`tmp/2026-11-15-website/browser-5ok0kA/RESULT.json`. See the
[living handoff](handoff.md#initial-connector-guide-and-ai-website-tutorials-16-november-2026-local)
for exact scope and testing limits. The application/runtime hashes are unchanged
from #78's qualification. No fresh-machine installation, every-agent sign-in,
Linux qualification, version change, release rebuild or publication is claimed.

## Content and imagery revision: 15 November 2026

Completed [#76](https://github.com/uvar-apps/eigenvista/issues/76) replaces the
small demonstration imagery, fixes figure aspect ratios and makes custom shaders
prominent on the homepage, gallery and illustrated guide. That published snapshot has
16 pages, 15 curated captures and 19 original-byte example/preset/notice downloads.
The existing AO/Pastel views remain intact.

Content source `21bcf54` and the asset-refresh follow-up
`7c296e676219a95fb3728a08c1c412fcbda692a9` are published. The
[final Pages deployment](https://github.com/uvar-apps/eigenvista/actions/runs/43702705994)
succeeded; all 61 served files matched the reviewed local payload. Chromium and
WebKit also checked the live reference proportions, readable phone shader controls
and exact preset downloads. The existing full local site suite passed before
pushing, with 96 route/viewport cases and all interactions. Application code,
version and released packages are unchanged.

Evidence is retained under `tmp/2026-11-15-website-quality/`, including curated
PNG captures, reviewed page layouts, source metadata, `public-files-final.json`
and `public-browser.json`. The final local browser run is
`tmp/2026-11-15-website/browser-tv6B1g/RESULT.json`. Both owned previews were
stopped after verification. See the [issue outcome](https://github.com/uvar-apps/eigenvista/issues/76#issuecomment-6892818904).

## Initial publication: 15 November 2026

Source `fa042e6326050a8f8a2e23fdbdb67f03089e251e` was published from `main` by
[Pages deployment 43697301648](https://github.com/uvar-apps/eigenvista/actions/runs/43697301648).
All relevant local checks passed before the push. After deployment, the public
HTTPS bytes of all 44 served files matched the local SHA-256/byte manifest;
the homepage and nested custom 404 also matched. The empty `.nojekyll` source
marker is not exposed as a public resource by Pages.

The complete local Chromium/WebKit suite then passed against the public origin:
all 15 routes at 1440/390/320 pixels, 90 route/viewport checks and all interaction
cases, completed at 09:04 UTC. Evidence is retained under
`tmp/2026-11-15-website/` (`public-files.json`, `browser-00G0Uj/RESULT.json`,
`browser-test-public.log`). The owned local preview was stopped after public
verification. [The issue outcome](https://github.com/uvar-apps/eigenvista/issues/75#issuecomment-6892087152)
records the delivery and unchanged application/release scope.
