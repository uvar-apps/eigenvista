# User-facing website

The public website lives in `site/` on `main` and is intended for application
users: installation, a detailed reference, worked tutorials and a gallery.
It is published at <https://uvar-apps.github.io/eigenvista/>. Completed issue
[#75](https://github.com/uvar-apps/eigenvista/issues/75) tracks its creation.

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
directly under `site/assets/`.

Treat [the user guide](user-guide.md), the import guides and actual UI labels as
the source of truth. Keep the reference and tutorials synchronized when controls
change. Keep installation claims tied to an actually published release.
Write for people using a molecular viewer: lead with tasks and controls. Keep
format restrictions, units and display limitations next to the relevant feature.
Avoid repeated elementary science warnings and internal verification terminology
in user-facing pages.
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

The gallery contains real EigenVista 0.7.2 captures, not generated scientific
illustrations. `site/assets/media/provenance.json` records input/palette hashes,
application source, representation, camera operations, AO/field settings,
dimensions and output hashes. The two AO pairs use complete 1AON and 4PJ1
structures with MatterViz Pastel, element coloring and Van der Waals spheres.
Off uses the normal molecular material; On uses Lambert + SSAO. Do not describe
that comparison as two identical lighting models or as electron density.

`tools/site/capture.mjs` documents the real-UI capture procedure. It uses the
already built, audited application assets, an owned temporary preview, the
installed Playwright browser and local image tools. Read its prerequisites and
port ownership checks before running it. It must not rebuild, replace or stop
the user's application. Original PNGs and independent lossless-WebP/pixel checks
are retained in the ignored capture evidence, not shipped as another copy.
The website itself does not need these tools to build or serve.

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
