# Project discovery

The user approved three visibility tasks on 15 November 2026, tracked in
[#77](https://github.com/uvar-apps/eigenvista/issues/77): GitHub presentation,
a real-app shader demonstration/social preview, and search discovery. Outreach,
social posts and links from other projects remain with the user.

## GitHub presentation

The repository website points to <https://uvar-apps.github.io/eigenvista/>.
Its description names orbital/density rendering, custom surface shaders and
molecular ambient occlusion. Focused topics are `molecular-visualization`,
`quantum-chemistry`, `computational-chemistry`, `scientific-visualization`,
`molden` and `rust`. Preserve existing relevant topics when updating these.

The README leads with benefits, the actual X-ray density image, installation,
examples and the short demo. Engineering and historical release evidence remain
below. Keep its download link aligned with the verified published release.

The reusable social image is
[`site/assets/social/eigenvista-social.png`](../site/assets/social/eigenvista-social.png):
1280×640 PNG, below GitHub's 1 MB limit. It combines the unchanged logo with the
real density rendering, preserving its proportions. Regenerate with
`node tools/site/social-card.mjs`, then rebuild and check the site. Site Open
Graph and Twitter card metadata use this asset with a content hash.
GitHub's repository preview is a separate upload under Settings → General →
Social preview → Edit → Upload an image. Updating site metadata alone does not
set that repository image. Upload completion is recorded in the living handoff.

## The shader demonstration

The homepage's [demo](https://uvar-apps.github.io/eigenvista/#shader-demo) shows
the same total-density mesh in three views: solid, X-ray with live opacity, and
clipped with a moving boundary. It is a silent 30-second, 1920×1080 H.264 MP4 at
25 fps. Playback starts on request; `preload="none"` keeps it out of the initial
page load. A poster, descriptive text track, plain-text description and download
link accompany the native player. No autoplay or looping is used.

The footage is the actual 0.7.2 production web UI with the 17-atom C₇H₁₀ Molden
example, total density 0.04 electrons/bohr³ and a cached 256³ field/mesh. The
1920×960 app view stays at native size beneath a 120px header. Setup is trimmed
and the final view held for reading. There is no time scaling, recoloring,
scientific image synthesis or claim about calculation/import speed. The
scientific input, shader and original image provenance remain in the existing
media/download ledgers. Additional asset hashes and editing details are in
[`site/assets/social/provenance.json`](../site/assets/social/provenance.json).

Recreating the recording is an opt-in maintainer activity, separate from normal
website builds. Check port ownership and start an owned production preview on
5189 using the already qualified `app/dist`; do not rebuild or stop the user's
app. `tools/site/capture-demo.mjs` uses the native density cache documented in
[website maintenance](website.md). All raw footage and the HyperFrames project
stay under `tmp/2026-11-15-visibility/`.

1. Export `TMPDIR`, `TMP` and `TEMP` as the repository's `tmp/` directory. Install
   media tools only in that ignored directory if the system tools are unavailable.
   The qualification used `ffmpeg-static@5.3.0` (FFmpeg 6.0) and the native
   `@ffprobe-installer/darwin-arm64@5.0.1`; the `ffprobe-static@3.1.0` package's
   advertised arm64 file was actually Intel and was not usable on this Mac.
   No system installation was changed.
2. Run `node tools/site/capture-demo.mjs`. Review the captured solid/X-ray/clipped
   frames and `demo-recording.json`. The helper changes real UI inputs and keeps
   the same scientific mesh/camera.
3. Initialize the ignored `videos/eigenvista-shaders/` HyperFrames project if
   absent. Set `EIGENVISTA_FFMPEG` and `EIGENVISTA_FFPROBE` to working binaries;
   run `node tools/site/prepare-demo.mjs`. This stages the source video and the
   authored `tools/site/demo-composition.html`, aligned to the recorded beats.
   Place the pinned GSAP 3.14.2 distribution in its `assets/gsap.min.js`.
4. In that project, run `npx --yes hyperframes@0.9.52 check --json`, inspect snapshots at
   the solid/X-ray/clipped/end beats, and render at 25 fps with one worker and
   `--strict --quality high`. Use `HYPERFRAMES_FFMPEG_PATH` and
   `HYPERFRAMES_FFPROBE_PATH` for local binaries. Output
   `tmp/2026-11-15-visibility/eigenvista-shaders-master.mp4`.
5. From the repository root, run `node tools/site/prepare-demo.mjs --publish`.
   It checks codec/duration/dimensions, creates the poster/descriptions and
   records asset hashes. Inspect frames decoded from the final MP4, then build
   and run the static and both-browser site checks before pushing.

The extra tooling is used locally; the website has no HyperFrames, Playwright,
GSAP or FFmpeg runtime dependency. The public static payload is bounded at
24 MiB, with the on-demand video separately bounded below 4 MiB.

## Google Search Console

Use the **URL-prefix** property
`https://uvar-apps.github.io/eigenvista/`, including HTTPS and the trailing slash.
The organization does not own the `github.io` DNS zone; a Domain property is not
appropriate. The actual public HTML-verification token provided by Google is in
`tools/site/search-console.mjs`. The builder puts it in the homepage head.
**Keep that tag after verification**, including during future redesigns.
It is public ownership evidence, not an account credential.

After the tag is publicly deployed, use the property's HTML-tag **Verify**
action, then submit
<https://uvar-apps.github.io/eigenvista/sitemap.xml> under Sitemaps. The sitemap
contains the 15 canonical content pages and excludes 404. Request homepage
indexing through URL Inspection when available. Verification/submission are
separate from Google's later decision to crawl, index and rank the site; record
the actual result without promising visibility or immediate indexing.

`/eigenvista/robots.txt` is in a project directory. Google consults
`https://uvar-apps.github.io/robots.txt` for the host's robots rules, so the
nested file does not establish host-level crawler policy or sitemap discovery.
Submit the sitemap directly; changing another repository is outside this task.

Search titles and descriptions name actual workflows: Molden HOMO/LUMO and
density, Gaussian Cube volumes/isosurfaces, PDB/mmCIF representations, ambient
occlusion, and custom shaders. Visible editorial headings remain concise.
The site retains canonical URLs, image descriptions and natural aspect ratios;
404 is explicitly `noindex`. No tracking script or analytics account is added.

References: [GitHub social preview](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/customizing-your-repositorys-social-media-preview),
[Google ownership verification](https://support.google.com/webmasters/answer/9008080?hl=en),
[sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap),
and [robots.txt placement](https://developers.google.com/crawling/docs/robots-txt/create-robots-txt).
