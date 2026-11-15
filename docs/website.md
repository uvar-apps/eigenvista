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

## A static directory, with a small publisher

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
Author and copyright details appear in the README, the About page and the shared
footer on every page: Author: Ugo Varetto; Copyright (c) 2026 - Ugo Varetto.
Keep these visible when editing the layout, alongside the existing license and
third-party credits.
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

The curated website media contain 15 real EigenVista 0.7.2 captures. Nine new images
show a 17-atom C₇H₁₀ molecular calculation, high-resolution frontier orbitals and
volume rendering, X-ray and cutaway density surfaces, the actual workspace and
readable shader controls, plus an imported 29-atom cube field. Six retained
images show large structures and their biological representations. `site/assets/media/provenance.json` records input/palette hashes,
application source, representation, camera operations, AO/field settings,
dimensions and output hashes. The two AO pairs use complete 1AON and 4PJ1
structures with MatterViz Pastel, element coloring and Van der Waals spheres.
Off uses the normal molecular material; On uses Lambert + SSAO. Do not describe
that comparison as two identical lighting models or as electron density.

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

Website work does not bump the app version, retag a release or rebuild existing
redistributables. The published 0.7.2 source and downloads retain their identities.

## Content and imagery revision: 15 November 2026

Completed [#76](https://github.com/uvar-apps/eigenvista/issues/76) replaces the
small demonstration imagery, fixes figure aspect ratios and makes custom shaders
prominent on the homepage, gallery and illustrated guide. The published site has
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
