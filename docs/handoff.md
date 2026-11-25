# Development handoff

## EigenVista 0.10.6 — 25 November 2026 (#117)

The Apple Silicon and CachyOS x86_64 previews use the same clean source,
`576e80e0aad9cf643b1ff04c6f9b3db5c35cace3`. Independent archive checks
matched the packaged shader files, connector resources and every one of the
760 source files to the build manifests and that commit. Use the
[release notes](releases/0.10.6.md) for the archive, checksum and build info
links on each platform.

The installed connector recognizes the generic `surface-phong-vertex-color`
preset. The GUI loads the same shader files and the separate
`Salicylic-Phong.params` opacity preset. Both include the potential scale
in the exported PNG. Native tests from the extracted archives reproduced the
21,064-triangle figure with 20 connector calls on macOS and 21 on CachyOS
through authenticated Xvfb. Each captured and inspected four PNGs with the
88% and 100% depth checks. The matching GUI workflow produced a 1220 × 852 PNG.

The [Gallery](https://uvar-apps.github.io/eigenvista/gallery.html#salicylic-acid)
uses a lossless copy of the accepted figure. The [website tutorial](https://uvar-apps.github.io/eigenvista/tutorials-electrostatic-potential.html)
includes downloadable source data and shaders and both GUI and plain-language
agent instructions. The site passed its static checks and 168 Chromium/WebKit
route and viewport checks. Evidence lives in the ignored `tmp/release-0.10.6/`
directory on the Mac and the build host.

The 0.10.6 archive is published on Zenodo. The current README, CFF, release
notes and website use its
[version DOI 10.5281/zenodo.24529041](https://doi.org/10.5281/zenodo.24529041).
The concept DOI `10.5281/zenodo.24246123` identifies EigenVista across versions.
The 25 November 2026 citation update matched the CFF and website metadata
to Zenodo's public record. Static checks and 168 Chromium/WebKit route and
viewport checks passed for the updated site. The tag and binary archives
retain their build-time provenance.

The applicable Rust, desktop, Clippy, build, and packaging checks pass on
both hosts. Chromium and WebKit each cover 384 passing cases per host with
no skipped cases. The parallel Linux WebKit run timed out in the 1AON
palette case. That exact test passed in an isolated rerun. See
`browser-qualification.json` in the release evidence directory.

The [0.10.6 prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.6)
is public. Anonymous downloads match all six qualified archive, checksum and
build-info files. [Pages run 45593341516](https://github.com/uvar-apps/eigenvista/actions/runs/45593341516)
deployed `4e09065144272ea01bbd84ffa3ac3ac168b8c8ed`. Anonymous readback matched
all 102 served files and the nested 404. The successful Pages run was a fresh
dispatch after the initial deployment and its same-run artifact retry failed.

## Custom-shaded surface depth ordering — 25 November 2026 (#118)

[Issue #118](https://github.com/uvar-apps/eigenvista/issues/118) is a P1
renderer correctness fix in the working tree based on `702a7ee`. The viewport
and PNG export share depth peeling for transparent custom-shaded surfaces.
The renderer uses each shader's emitted alpha and composites visible
fragments from front to back against the existing scene depth. The transparent
targets are reused between frames, and the pass stops when no more fragments
can affect the image at PNG precision.
The fragment wrapper writes the same depth it compares so WebKit cannot
reselect a low-alpha fragment because of an interpolation rounding difference.

The generic vertex-colored Phong shader under `app/shaders/` reads only the
mesh inputs. `Salicylic-Phong.params` sets 88% opacity. The salicylic acid
preview recorded in `tmp/mep/` shows the nearer lobe correctly at 88% with
the bonds visible through it. At 100% both shader transparency settings
show the foreground surface. The new browser regression tests overlapping
triangles in one mesh, an atom between layers, view rotation, tiny and zero
alpha, and both ordinary and transparent PNG export.

The macOS TypeScript check and production frontend build passed. All 102
affected browser cases passed, 51 in Chromium and 51 in WebKit. The browser
log is `tmp/mep/p1-transparency-final-browser.log` and the 88% capture is
`tmp/mep/salicylic-phong-depth-corrected.png`. This source-stage
verification preceded the package qualification above.

## Electrostatic potential on total-density meshes — 25 November 2026 (#115)

Issue [#115](https://github.com/uvar-apps/eigenvista/issues/115) tracks the
implementation on `codex/density-surface-mep`. The selected positive density
isovalue determines geometry. The worker evaluates the all-electron molecular
electrostatic potential in hartree/e at the marching-cubes vertices. Saved maps
retain the f64 samples, source fingerprint, visibility and symmetric color range.
The built-in renderer uses the same signed ramp in the mesh and exported legend.
The GUI and connector share the cancellable generation and appearance operations.

The [user workflow](user-guide.md#color-an-electron-density-surface-by-electrostatic-potential),
[controller details](application-control.md#electrostatic-potential-on-a-density-surface)
and [format](preview-format.md) describe the source feature. The published
0.10.5 binaries, tag and citation identify the earlier release below.

The final source and test snapshot is
`53aaca7a5165529e13c6c18df929087f4505da59`. All 753 tracked input hashes matched
on macOS, the CachyOS checkout and the isolated WebKit checkout. Locked Rust
and desktop tests passed 390 on macOS and 388 on CachyOS. Both passed formatting,
strict workspace/all-target Clippy, TypeScript/WASM production builds, native
connector smoke tests, and the packaged Rust dependency notice checks. Packaging
checks passed 33 on Mac and 27 on Linux.

The final browser matrix passed 766 tests per platform, 383 each in Chromium
and WebKit, with zero skips, failures or retries. Linux Chromium used the
host Intel UHD 630 through EGL. WebKit ran in the pinned Playwright 1.63.0
Noble container with its own Vite server and the established 600-second case
timeout for the slower backend. The Linux native connector used authenticated
TCP Xvfb and llvmpipe. These checks use source-built native apps.

The analytic Gaussian check and 36 PySCF/libcint points qualify the Coulomb
kernel across closed- and open-shell examples with Cartesian and spherical
terms through G. Browser coverage includes the signed legend, actual mapped
pixels, separate back/front passes for translucent maps, both shading modes,
PNG composition, saved appearance and cancellation at the mapping checkpoint.
The 112³ pyridine example shows the corrected translucent rendering and
21,228 triangles. Logs, renderer evidence and reviewed images are in `tmp/mep/`
on both hosts. The ordinary source uses the project's local validation workflow.

## EigenVista 0.10.5 — 23 November 2026 (#114)

The release includes residue-class coloring in the GUI and bundled AI
connector, plus the surface-colored X-ray shader and crambin Gallery view.
The [published prerelease](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.5)
has two archives, two checksums and two build-info files. Anonymous downloads
matched all six verified local files.
Use the [0.10.5 notes](releases/0.10.5.md) for downloads and
[#114](https://github.com/uvar-apps/eigenvista/issues/114) for qualification
and delivery. On 23 November 2026, the version-specific DOI was checked
against Zenodo's 0.10.5 record and added to the README, citation metadata,
release notes and website.
[Zenodo DOI 10.5281/zenodo.24453689](https://doi.org/10.5281/zenodo.24453689)

The CFF citation matches Zenodo's title, version and DOI. The regenerated
site passed static validation for 27 pages and all 162 Chromium/WebKit
route and viewport checks.

The concept DOI `10.5281/zenodo.24246123` identifies EigenVista across
releases, and `10.5281/zenodo.24452126` identifies the 0.10.4 archive.

Both packages were built from `b6a3f271d8f6cdfd0795f902ee489314c62c5248`.
Their checksums and the complete 747-file source manifests were independently
verified. The three packaged `surface-x-ray` files matched the tagged sources.
Extracted Mac and Linux apps passed 46 and 47 bundled-connector calls,
respectively, with 12 PNG checks on each. This includes residue-class coloring
on crambin, active surface AO on the complete 4,182,788-triangle 1AON SES and
checks for translucent and quantum surfaces. Linux used Xvfb on CachyOS.

The application and full test sources match the prior 762-case per-host
qualification. Fresh 0.10.5 packaging ran locked Rust, desktop, Clippy, native
builds and archive roundtrips on both hosts. Six focused release browser cases
passed on macOS, and the website passed static checks and all 162 browser cases.
Evidence is in `tmp/release-0.10.5/`; local archives, checksums and build metadata
are under `artifacts/distributions/`.

## Residue-class coloring — 23 November 2026 (#71)

The 0.10.4 development preview adds **Molecule → Molecular data →
Biological structure → Coloring → Residue class**. Standard amino acids use
four side-chain classes with a labeled legend. Unclassified protein residues
are gray. Nonprotein atoms retain element palette colors and nonprotein bond
segments stay neutral. The mode colors existing atomic and backbone depictions,
including unassigned ribbon/cartoon loops. Coloring is session presentation.

The connector discovers `residue-class` through `app.capabilities` and applies
it with `structure.set`. The current scoped implementation is the residue-class
slice of rank 7 in [#71](https://github.com/uvar-apps/eigenvista/issues/71).
The user guide, connector references and website preview describe the mode.

On macOS, the 52 affected Chromium/WebKit application cases and 162 website
cases passed, along with TypeScript, the production frontend build and static
site checks. The real macOS debug desktop and `eigenvista-ctl` loaded crambin,
selected the mode and exported a residue-colored cartoon PNG. The focused
application case passed on `system76.local` in host Chromium/EGL and Noble
container WebKit. The browser regression compares the saved scientific
document before and after coloring. Evidence is in `tmp/residue-classes/`.

Pre-push verification passed the complete 762-case application inventory on
each host, with 381 cases per browser and zero failures, skips or retries.
Linux Chromium used host EGL. Linux WebKit ran in the local Noble container
with the pinned browser. Both hosts tested the same freshly built WASM.
macOS also passed formatting, locked Rust and desktop tests, strict workspace
Clippy, the frontend build, 33 packaging checks and 162 website cases.
Linux passed TypeScript, production build, 27 packaging and static site checks.
The source tree and matching case reports are recorded in
`tmp/residue-classes-delivery/`.

## X-ray shader with surface colors — 23 November 2026 (#113)

The 0.10.4 development checkout adds `app/shaders/surface-x-ray.*`. Load the
vertex, fragment and parameter files in **Appearance → Surface shader** with
transparency enabled. The fragment tint comes from the mesh's assigned color.
The `minOpacity`, `maxOpacity` and `da` controls set the view-angle opacity
range and cutoff. The Mac and Linux packaging scripts stage all three files
in `Shaders/`; the release packages still correspond to the tagged source.

Live recoloring passed in Chromium and WebKit on the signed orbital example
and the 327-atom 1CRN SES, with PNG evidence under `tmp/surface-x-ray/`.
The shader, transparency, molecular-surface and production workflow suites
passed all 64 cases across both engines. TypeScript, the Vite production build
and 27 packaging tests passed locally. Track delivery in
[#113](https://github.com/uvar-apps/eigenvista/issues/113).

The Gallery now includes the 1CRN X-ray close-up under **Shaders**. The blue
SES fills about 87% of the 1280 × 960 frame height. The capture preserves the
original viewing direction with a 1.5× zoom and recentered camera. The WebP
matches the application PNG pixel for pixel. Local capture and verification
evidence is in `tmp/gallery-crambin-xray/`. The regenerated site passed static
validation and all 162 Chromium/WebKit cases. Desktop and phone previews
preserve the 4:3 image proportions in both engines.

Before pushing, `node tools/package-macos.mjs` built and verified a private
Apple Silicon test ZIP. All three packaged shader files match the sources.
Both hosts passed the 27 packaging checks. On `system76.local`, the X-ray
recoloring test passed with host Chromium/EGL and WebKit in the Noble
Playwright container. Both container engines verified the Gallery at 1440,
390 and 320 pixels. The broader Linux website sweep stopped on a Chromium
homepage overflow also reproduced on the preceding main commit. The Gallery
fits both narrow viewports. Evidence is in `tmp/xray-gallery-delivery/`.

## EigenVista 0.10.4 published — 22 November 2026 (#112)

[Version 0.10.4](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.4) includes optional matte ambient occlusion for opaque
SES and SAS, with a separate control for atoms and bonds. The Apple Silicon
Mac ZIP and CachyOS x86_64 tarball were built from the same tag at
`9a5e8eb5fa5d8b052518dd23690209642855c792`. Release notes and the six package, checksum and build-info
downloads were published and verified by anonymous readback. The website
uses the actual archives and includes the approved 1AON comparison.

See the [0.10.4 notes](releases/0.10.4.md) for the downloads and
[#112](https://github.com/uvar-apps/eigenvista/issues/112) for delivery verification.
On 23 November 2026, the
[Zenodo DOI for 0.10.4](https://doi.org/10.5281/zenodo.24452126) was confirmed
against Zenodo's record and added to the README, citation metadata,
release notes and website. The concept DOI `10.5281/zenodo.24246123`
identifies EigenVista across releases.
The CFF citation matches Zenodo's title, version and DOI. The regenerated
site passed static validation for 27 pages and all 162 Chromium/WebKit
route and viewport checks. The 0.10.4 tag and published packages retain
their release identities.

The archives were audited against all 738 files in the packaged source
manifests. Mac ZIP is **82,357,123 bytes**, SHA-256
`c57ae71a63ea910adc13d348de8b0342f0e5880032ce3b5d5a067015efd4d3b8`. Linux tarball is **82,841,238 bytes**, SHA-256
`45022cae9103bacc6403a6ac8c17a9730c688788d1c7ffeac2a37268c5ca77bd`.

Both clean release builds passed locked Rust and desktop tests, strict Clippy,
production builds, package checks, and packaged converter/WASM agreement. The
758 Chromium/WebKit cases per platform are the verified pre-merge results for
the same runtime and test sources. The extracted 0.10.4 Mac and Linux apps each
passed 38 bundled-connector calls and 10 PNG checks, including the complete
4,182,788-triangle 1AON SES at 24 Å. Quantum-field and translucent-surface
controls differed by at most one eight-bit channel level on the Linux
software-rendering test display. Turning off 1AON AO restored identical
pixels. Physical Linux desktop and other distributions remain unqualified.

Site verification covered 27 pages, 1,092 local references, 78 image uses,
25 exact example/guide downloads and 162 browser route/viewport cases. Four
additional comparisons checked desktop and mobile interaction in Chromium and
WebKit at the original 826 × 682 aspect ratio.
On 22 November the homepage added that same SES comparison directly after the
atom and bond AO figure. The updated site passed the 162 browser cases and
four focused desktop/mobile checks in Chromium and WebKit. Evidence is in
`tmp/home-ses-ao/`.
 Logs, readback bytes, manifests,
and native results are under `tmp/release-0.10.4/` on the two hosts.

## Molecular surface ambient occlusion — 22 November 2026 (#110)

The 0.10.3 development preview adds optional surface AO for visible, fully
opaque SES and SAS. The feature was developed on `codex/surface-ssao` from
`558e8f7`.
Issue [#110](https://github.com/uvar-apps/eigenvista/issues/110) tracks the
work. The local Vite preview is at [127.0.0.1:5178](http://127.0.0.1:5178/).
Release status below is historical.

**Molecular surface ambient occlusion** is in **Appearance → Appearance**.
Set the saved SES/SAS opacity to 1 in **Surfaces**. Its independent GTAO pass
replaces the built-in surface material with matte Lambert while active.
Quantum meshes, sampled fields, user shaders and translucent surfaces retain
their existing shading. Both AO switches are off on startup. Strength is shared.
Manual radius is adjustable and shared. Automatic radius adapts to the atom
bounds and uses a wider neighborhood for the surface. This selects **4 Å on
1CRN** and **24 Å on 1AON**, matching the user's preferred large-mesh comparison.
The GUI and connector use the same controls. Mesh generation and file encoding
stay independent of display AO.

The production WASM/TypeScript/Vite build passes. Chromium 153 with ANGLE Metal
on the Apple M4 and local Playwright WebKit both generated and orbited 1AON SES
using Alvarez radii, a 1.4 Å probe and 0.5 Å spacing. The complete run had
58,870 atoms, 2,091,126 vertices and 4,182,788 triangles. Both exported usable
PNG images with AO off/on and after orbit. Chromium Metal headless reported
median animation-frame intervals of 16.7 ms off and 33.3 ms on during one
automated drag per state at a 760 × 682 drawing size. The corresponding 1CRN
medians were 16.7 ms with either setting. These are local browser samples.
The WebKit drag completed between animation callbacks and gives no useful
frame-interval data. Native packaged-app validation remains pending.

Reviewed captures and browser timings are under `tmp/surface-ssao/`, including
the original radius comparison and the final `*-calibrated-*.png` and
`*-calibrated-*.json` records. User controls and the implementation are
described in the [user guide](user-guide.md#molecular-ambient-occlusion),
[architecture](architecture.md), and [AI connector guide](ai-connector.md).

The selected 114-case Chromium/WebKit regression run passed 112 cases. Two
new SES cases exposed a whole-image brightness assertion that missed localized
darkening. The revised assertion compares visible contrast on opaque pixels
between the same Lambert material at weak and full strength. After the final
build finished, all 12 focused executions passed (three scenarios, two engines,
two repetitions). Logs are `regression-final.log` and `contrast-verified.log`
under `tmp/surface-ssao/`. The full repository suite is a pre-push gate.

User testing confirmed that surface AO worked well. The Appearance widget now
labels the existing control **Atom and bond ambient occlusion** alongside
**Molecular surface ambient occlusion**. The user guide and capture script
match the new label. TypeScript and all 10 targeted Chromium/WebKit checks
passed on the renamed UI. Desktop and mobile captures were reviewed. The checks
are recorded in `tmp/surface-ssao/label-checks.log`.

The user approved the feature and requested a PR merge on 22 November 2026.
The pre-push validation passed on both required platforms. macOS Apple Silicon
passed 387 locked Rust and desktop tests, formatting, strict workspace/all-target
Clippy, the production build, 758 Chromium/WebKit cases (379 per engine), and
32 packaging checks. CachyOS x86_64 on system76 passed the equivalent build and
lint checks, 385 Rust and desktop tests, 379 host Chromium EGL cases on Intel
UHD 630, 379 Playwright 1.63.0 Noble WebKit cases, and 26 applicable packaging
checks. Final browser runs reported zero failures, skips, or retries. The
22.6-minute Linux WebKit run used a separate writable staging copy after the
first copy blocked a screenshot write. Native tests here are build, unit, and
Mac connector-packaging checks. Physical packaged-app acceptance is separate.

All 737 tracked input paths matched the SHA-256 manifest in the macOS build
copy, Linux host copy, and Linux WebKit copy before this documentation update.
The isolated macOS build produced byte-identical WebAssembly for the running
preview, whose server stayed active. Logs are in
`tmp/surface-ssao/merge-validation/` on macOS and
`tmp/surface-ssao-merge-20261122/` on system76. The PR is linked from issue #110.

## Linux 0.10.3 release published — 20 November 2026 (#108)

The user authorized PR merge, release notes, commit/push, Linux publication and
the matching website update. [PR #109](https://github.com/uvar-apps/eigenvista/pull/109)
merged the tested implementation as ea65d62e829c0427c592032bdb716356bd8e2f56.
The release work was completed on main. Release preparation and portable-guide corrections are
committed; the clean Linux package source is
[53ebf37a399872d7b7b4e30397e6eb9a0a9a530b](https://github.com/uvar-apps/eigenvista/tree/53ebf37a399872d7b7b4e30397e6eb9a0a9a530b).

[EigenVista 0.10.3](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.3)
now includes both Mac and Linux distributions. New Linux archive:
EigenVista-0.10.3-linux-x86_64-20261120T143721Z-53ebf37.tar.gz —
**82,817,498 bytes**, SHA-256
9491e341f551517e377d393732d833fe4db436c0fd755216a4df689a331604ec.
Archive/checksum/build-info are available publicly; sourceDirty is false.
Independent anonymous downloads match all six qualified release files. Original
Mac asset IDs/bytes/hash, prerelease state, immutable v0.10.3 tag and DOI
10.5281/zenodo.24391046 are unchanged. The tag names original Mac source
1caf8bd2c2825dba7ff43bd67f542463b740b979; the added Linux archive records its
separate clean source. Never retag or replace either published package.

The clean Linux package independently verifies 736 source files against that
commit, 64 resources, five embedded assets and 413 unchanged runtime/test/input
hashes on both machines. Fresh extracted app/helper acceptance passes **3,728
calls**, all 34 inspection methods and **26 reviewed PNGs**: independent 323-point
scalar oracle, full 58,870-atom 1AON SES/progress/cancel/cache Save/reopen, twenty
additional input roots, direct orbital/density/Cube volume+ray-cast without
saved meshes, protein depictions and Pastel/AO. Owned apps/display and private
descriptors are cleaned up; unrelated services remain untouched.

Completed regression evidence remains valid on those unchanged sources:
385 Linux Rust cases, 387 Mac Rust cases, fmt/strict Clippy, production/native
builds and all 752 browser cases per platform, with zero failures/skips/flaky
cases/retries. Current 32 packaging checks also pass. No scientific/pin/format/
logo/allocation-policy change or hosted application CI. The original Mac
binary remains unchanged; it is not a new Mac rebuild.

The prepared website offers both downloads, Linux installation and AI setup,
separate source attribution and a phone checksum-wrap correction. Current
static checks cover 27 pages, 1,088 local references, 76 image uses and 25 exact
download copies. All 162 Chromium/WebKit route/viewport cases pass with 20 reviewed
desktop/mobile captures. Publication-state wording changed only the raw Linux
guide/provenance download; all HTML/CSS/JS/media remain byte-identical to that
passing browser run. Pictures/fonts/videos/logo are unchanged.
The [Pages-only deployment](https://github.com/uvar-apps/eigenvista/actions/runs/44759879664)
succeeded from website commit 11ddfa8475d0541613c52dd29e80020c0c8681c3.
Independent anonymous readback matches all **92 served files** and the custom
nested404 byte-for-byte. The configuration marker .nojekyll is not a served
page; untracked local Finder metadata is not in the committed deployment.
The live homepage, installation and AI pages now offer the qualified Linux
archive. No application CI ran. Delivery-record-only follow-ups preserve that
verified website tree. The owned 5190 preview was stopped; the user's app and
unrelated services remain untouched.

Linux remains a **CachyOS x86_64 experimental preview**, built/tested with
glibc 2.44, GTK 3 and WebKitGTK 4.1 version 2.54.1. Native tests used authenticated
TCP Xvfb/llvmpipe; host Chromium EGL used Intel UHD 630, and WebKit's masked
Apple GPU string is not hardware evidence. Physical desktop/dialogs/close,
native hardware GPU/Wayland, clean installs, older glibc and other distributions
remain unqualified. The binary app/AI connector require a display; the converter
can run over SSH. No desktop environment was installed.

Clean Linux build/test worktree:
/home/ugo/projects/eigenvista/tmp/linux-release-0.10.3/source, detached at
53ebf37. It remains clean. Preserve the original remote development checkout and
all diagnostic artifacts; do not reset its uncommitted development snapshot.
All temporary files stay under EigenVista tmp on each host. Molekel is read-only.

Evidence/oracles: tmp/linux-release-0.10.3/ (package-qualified.json,
published-assets-qualified.json, verify-package.py, site-final-evidence.json,
verify-site.mjs, live-site-qualified.json); acceptance:
.unlazy/linux-release-0.10.3/. Issue #108 records the completed port/publication
and remaining platform qualification boundaries. The earlier
development-package sections below are historical, not the published payload.

## CachyOS Linux preview qualified — 20 November 2026 (#108)

Implemented on `codex/linux-system76`, baseline
`fa410bab79ed533561aa41d10a665f227e443cfa`. The user authorized committing and
pushing this branch on 20 November 2026. This change records the qualified Linux
implementation and its documentation; no new version, PR, merge, tag or public
release is requested. Public 0.10.3 Mac assets, website and DOI stay unchanged. Track
[#108](https://github.com/uvar-apps/eigenvista/issues/108), which remains open.
Work only in EigenVista; Molekel is read-only.

The user confirmed `system76.local` is **headless/SSH-only**: CachyOS x86_64,
Intel i7-9750H (six cores/twelve threads), 64GB RAM, Fish and passwordless sudo.
Remote checkout: `/home/ugo/projects/eigenvista`. SSH automation explicitly uses
`/bin/sh -s` and `tmp/linux-port/env.sh`; interactive Fish uses `env.fish`.
Pinned Rust1.99.0/wasm-bindgen0.2.108 are isolated under repo-local
`tmp/toolchains/`; system Rust1.98.1 and shell profiles are unchanged. No desktop
environment was installed. Use the [Linux guide](linux.md) for desktop
commands, Fish builds and the tested SSH browser tunnel.

Qualified archive in `artifacts/distributions/` on both hosts:
`EigenVista-0.10.3-linux-x86_64-20261120T135729Z-fa410ba-dirty.tar.gz` —
**82,811,544 bytes**, SHA-256
`ba8a941a9c51402dbca16ba1d42a41ac9ff23232e380db34dde7c2d2c4110309`.
Its checksum/build-info companions bind the same dirty development snapshot:
736 source files, 64 resources, five embedded assets. The current extracted
native prefix is remote `tmp/linux-port/EigenVista-v3`, not the earlier
diagnostic `EigenVista` prefix. Later completion docs do not change the archived
binaries. All 413 genuine runtime/test/input hashes match on both hosts.
A final audit removed Mac transfer sidecars and a generated QA screenshot from
the source payload; the metadata filter is tested before filesystem access.
Those diagnostics remain in repo-local tmp. The clean package retains all
three identical tested executables; no application or browser-test source changed.

Linux passes **385 Rust cases**, fmt/strict all-target Clippy, production and
native builds, and **752 browser cases** (376 host Chromium + 376 local matching
Playwright/Noble WebKit). macOS passes **387 Rust cases**, fmt/strict Clippy,
fresh production/native builds, **752 browser cases** and **32 packaging checks**.
Browser suites have zero failures/skips/flaky cases/retries. Source pins,
scientific/native Rust, formats, logo and allocation policy are unchanged.
The real Linux font fallback exposed a one-pixel mobile overflow; the small
heading fix and renderer/scroll/startup test-harness corrections are qualified.

The actual extracted Linux launcher/app/helper passes **3,638 calls**, 34
inspection methods and **26 reviewed PNGs**, including a 323-point independent
scalar oracle, full 58,870-atom 1AON SES/progress/cancel/cache Save/reopen, twenty
extra input roots, direct 48³ orbital/density/Cube volume and ray-cast with zero
saved meshes, protein representations, Pastel/AO and protected export failures.
Private descriptors and owned app/display/test-server processes are cleaned up;
unrelated services are preserved. Diagnostic annotations sometimes overlap or
have low contrast; these are functional QA, not gallery compositions.

Native qualification used authenticated TCP Xvfb with repo-local private XDG
and authority files, both Unix transports disabled and root `-nolock`. An initial
unprivileged display experiment incorrectly created system-temporary X99 files;
it was disclosed/stopped and the files removed. Corrected runs verified no such
files. Keep this setup requirement explicit. Native display GL reported
llvmpipe; host Chromium EGL independently reported Intel UHD630. WebKit's
masked “Apple GPU” string is not hardware evidence. Physical desktop, native
hardware GPU/Wayland/file-dialog/close behavior, clean installations, older
glibc and other distributions remain unqualified. The package is a CachyOS
tar.gz prefix, not a universal AppImage. Continue appropriate local Mac and
available Linux validation before any future push.

The [qualification record](design/2026-11-20-linux-desktop-preview.md) contains architecture/licensing/setup
decisions and exact evidence boundaries. Evidence: local `tmp/linux-system76/`,
remote `tmp/linux-port/`; gates: `.unlazy/linux-system76/`. Preserve diagnostic
history and prior public tags/assets. Review/integration is the next step.

## 0.10.3 Zenodo citation — 20 November 2026

The user-supplied version DOI for EigenVista 0.10.3 is
[10.5281/zenodo.24391046](https://doi.org/10.5281/zenodo.24391046). Current
README/CFF, release notes and website metadata use this DOI. Concept DOI
10.5281/zenodo.24246123 identifies all versions; older version citations and
media provenance remain historical. The installation guide now lists all three
optional palettes included in 0.10.3. Package source, download names/bytes/hash,
version and annotated tag are unchanged; this update requires no rebuild.

Local citation/YAML and static website checks pass, including 1,079 local
references, 24 exact downloads and all 162 Chromium/WebKit route/viewport cases.
Desktop/mobile citation review passes. All three anonymous release downloads
match qualified bytes; GitHub release notes now use the new DOI with asset/tag
identities preserved. All 420 qualified runtime/test/input hashes are unchanged;
runtime tests were not rerun for this documentation-only update. Evidence:
`tmp/doi-0.10.3/`. Published through [PR #106](https://github.com/uvar-apps/eigenvista/pull/106)
as `f4c86285ed073712c8e1d4e53496fdcc8f07c570`. The
[Pages-only deployment](https://github.com/uvar-apps/eigenvista/actions/runs/44702873552)
succeeded; anonymous readback matches all 91 served files and the custom nested
404 byte-for-byte. The live citation and release metadata identify 0.10.3 and
its new DOI. No application CI ran. Later documentation-only delivery records
leave that verified website tree and package source unchanged.

## Release 0.10.3 published — 20 November 2026 (#103)

Clean release/package source: **`1caf8bd2c2825dba7ff43bd67f542463b740b979`**.

ZIP: `artifacts/distributions/EigenVista-0.10.3-apple-silicon-20261120T073506Z-1caf8bd.zip` — **82,290,759 bytes**.

SHA-256: `fe3beae96bfb8869535613a109c1bb33ea6b15163eca3082029ecca38213d0a2`.

The checksum and build-info companions identify the same clean build. The ZIP
contains the optimized app, converter, AI helper/launcher, guides, examples, all
three optional palettes, notices and source/dependency archives.

Fresh local macOS checks pass 387 Rust workspace tests (14 desktop tests
included), explicit desktop tests, fmt/strict Clippy, production/native builds,
23 packaging checks and all 752 Chromium/WebKit cases, 376 per engine, with
zero failures/skips/flaky cases/retries and all 420 runtime/test/input hashes
unchanged. Both source-stage and final measured website checks pass all 162 cases.
Current download facts identify the qualified 0.10.3 archive.

Independent extraction verifies 730 source files, 57 Sesmesh files,
15 connector files, 5 palette files and 5 exact embedded production
assets, signatures and archived/source parity. The actual packaged launcher/app/
helper passes 34 inspection methods through 1,626 recorded calls and
11 reviewed PNGs: plane supersession, an independent 323-point scalar oracle
(maximum error 4.44e-16), full 58,870-atom 1AON SES, genuine progress/
cancellation and cached Save/reopen. Actual ExFAT acceptance passes another
46 connector calls, 5 packaged converter cases and 3 reviewed PNGs, including
all three export types, explicit replacement/default refusal, source protection
and independently checked transparent alpha. Owned processes/descriptors/volumes
are cleaned up.

No application CI. The package remains an ad-hoc-signed Apple Silicon preview,
not notarized. Linux/Windows/Intel, clean-Mac/Gatekeeper, the full macOS range and
physical OS actions remain unqualified. QA captures are functional checks, not
gallery compositions: some chosen pale annotations overlap or have low contrast,
and densely selected pocket markers obscure detail. No new rendering regression
was found. Preserve all prior tags and release assets. The 0.10.3 version DOI
is 10.5281/zenodo.24391046; concept DOI 10.5281/zenodo.24246123 identifies
all versions.

Published [EigenVista 0.10.3](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.3)
on 20 November 2026 with release notes and all three rebuilt assets. Independent
anonymous downloads match complete ZIP/checksum/build-info bytes. The annotated
`v0.10.3` identifies the clean package source. Release work was merged through
[PR #104](https://github.com/uvar-apps/eigenvista/pull/104) as
`602c869884b7b51ee0b5fbe5e34fba57d091be1f`. Pages-only deployment
[44698474275](https://github.com/uvar-apps/eigenvista/actions/runs/44698474275) succeeded; anonymous readback matches all
**91 served website files** and the custom nested404 byte-for-byte.
No application CI ran. Old tags/assets remain unchanged. Later delivery metadata
retains all 420 qualified runtime/test/input hashes; do not retag or rebuild the
unchanged release. Track #103. Evidence: `tmp/release-0.10.3/`; gates:
`.unlazy/release-0.10.3/`.

## Save / ExFAT / accessibility batch — 20 November 2026

Implemented on `codex/save-exfat-accessibility`, baseline `e9b0ef1`, and merged
through [PR #101](https://github.com/uvar-apps/eigenvista/pull/101) at integration
commit `7bb3d89675d2e789184f93dbed74102a13b60e7d`. Issues #99 (Save), #100
(explicit ExFAT publication) and #72 (optional palette) are closed as completed.
Version remains 0.10.2; published tags/assets/citation identities stay unchanged.
The subsequent delivery-record update is documentation only.

Synchronous pending-inspection admission now prevents GUI Save/native clean exit
from overtaking a validated or coalesced edit; API Save reports busy. Actual
Mac ExFAT rejects hard links/exclusive rename. The user approved opt-in atomic
replacement via CLI `--replace` and native document/PNG/CSV `overwrite:true`;
default no-overwrite/`--force` and source protections remain. Never silently
choose replacement. Permissions and power-loss research remains in #41.

Accessible elements adds 14 common-element overrides through existing loading,
with 104 defaults retained. Its exact mapping, primary sources, simulation method
and ambiguities are in the [palette guide](../palettes/README.md) and
[decision](design/2026-11-20-accessibility-palette.md). The
[Save/ExFAT decision](design/2026-11-20-save-and-exfat.md) records contracts.

Final focused checks pass all 58 Chromium/WebKit cases. Committed plane intent
is admitted before preparation/debounce; manual preflight has cancellation and
source/field guards. The original editor fails both new negative controls, and
its exact corrected bytes were restored. All 373 scientific/support Rust tests
and 14 current desktop tests, fmt/strict Clippy, production/native builds and
23 packaging checks pass. Fresh actual APFS/ExFAT/default/replacement/race and
ENOSPC/EROFS checks pass; the current native helper passes 46 calls and three
reviewed PNGs. Palette review covers 32 originals, 160 diagnostic views and
eight contact sheets. The final complete run passes all 752 browser cases,
376 per engine, with zero failures, skips, flaky cases or retries and all 420
runtime/test/input hashes unchanged. Final comparisons bind 32 original PNGs
to 160 diagnostic views and eight reviewed sheets. All 162 website cases and
static checks pass (27 pages, 24 exact downloads). The merged tree and all 420
recorded runtime/test/input hashes match the qualified feature tree.
Evidence: `tmp/save-exfat-accessibility/`, gates:
`.unlazy/save-exfat-accessibility/`. The earlier 751/752 run is a retained
test-readiness diagnostic; see the Save/ExFAT decision for the correction.
The source notes distinguish these updates from the original 0.10.2 download.

Clean local development package source: `b9359451e0cb5453db9055681c8906ad2a522ad8`.
ZIP: `artifacts/distributions/EigenVista-0.10.2-apple-silicon-20261120T040055Z-b935945.zip`
— **82,280,317 bytes**, SHA-256
`c57e5d6f8c16b3cf91d896333645e65128a2e3181080e1012dae712c012bd380`.
Its checksum/build-info companions identify the same clean build. Independent
extraction verifies 729 source files, 57 Sesmesh files, 15 connector files, five
standalone palette files and five embedded production assets, plus signatures
and exact archived/source bytes. The actual extracted app/helper passes another
46 calls and three reviewed PNGs, including all three ExFAT export types,
Save/reopen, protected sources and independently verified transparent alpha.
Owned apps/descriptors/volumes are cleaned up. The earlier source-debug and
extracted-package receipts are separate, not one doubled call count.

This is a local development archive, not a newly published release. Later
documentation commits retain its qualified runtime/input hashes and truthful
source snapshot. Linux/Windows/Intel, clean-Mac/Gatekeeper, physical OS quit/save
dialogs and the full macOS range remain unqualified. Exact receipts include
`package-identity.json`, `package-audit-latest.json`, `native-package-acceptance.json`,
`package-alpha.json`, `browser-qualification.json` and `post-browser.json`.

The website is published through Pages-only deployment
[44672440454](https://github.com/uvar-apps/eigenvista/actions/runs/44672440454),
source `7bb3d89675d2e789184f93dbed74102a13b60e7d`. Anonymous readback verifies
all 91 served files and the custom nested404 byte-for-byte. No application CI
ran. Exact publication evidence is in `pages-status.json` and `public-files.json`.
Broader #41 permissions/durability/platform research and the separate #85
SES/VDW contact-rendering work remain open; do not close them with this batch.

## Release 0.10.2 published — 18 November 2026 (#98)

Clean release/package source: **`21c8307b72c3588464e06abeb07df055484ea78f`**.

ZIP: `artifacts/distributions/EigenVista-0.10.2-apple-silicon-20261118T081849Z-21c8307.zip` — **82,241,275 bytes**.

SHA-256: `cb9221b2e887eecdf5e7f574b6b2336253b64271400315b828b803dee77f551e`.

The `.zip.sha256` and `.json` companions identify the same clean build; the ZIP includes the optimized app, converter, AI helper/launcher, guides, examples, palettes, notices and source/dependency archives.

Fresh local macOS checks pass 378 Rust workspace tests, 13 explicit desktop tests, fmt/strict Clippy, WASM/TypeScript/production/native-debug builds, 23 packaging/connector checks and all **720 Chromium/WebKit cases**, 360 per engine, with zero failures/skips/flaky cases/retries.

All **427 runtime/test/input hashes** stay fixed through source and optimized-package qualification. Version/CFF checks pass; dependency/toolchain pins, science, format, icon and allocation policy are unchanged.

Independent extraction/source/notices/signature/embedded-assets audit passes: 718 source files, 57 Sesmesh files, 14 connector files and five exact production assets. The actual packaged app/helper passes **34 inspection methods**, **1,479 recorded helper calls** and **11 reviewed PNG exports**.

Native acceptance includes genuine plane supersession, 323 independent linear-field samples (maximum error 4.45e-16), selected/cleared and Pastel/AO/transparent-PNG pixels, full 58,870-atom 1AON SES with 2,091,126 vertices and 4,182,788 triangles, real partial mesh progress/elapsed, owned cancellation and cache Save/reopen.

All **162 website route/viewport cases** and final build/static checks pass. Measured download facts identify this qualified package.

Prequalification harness corrections retained as diagnostics: camera comparison allows 1e-12 roundoff; completed job receipts retain outer status instead of unwrapping result; the externally stopped controlled diagnostic app/descriptor received independent cleanup verification; gold-pixel classification excludes red oxygen highlights. Corrected complete native/pixel checks pass without product or package changes, and cleared water pixels exactly restore the unselected baseline. Later metadata/docs commits must not retag or rebuild the qualified unchanged runtime.

Published [EigenVista 0.10.2](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.2) on 18 November 2026 with all three qualified assets. Independent anonymous downloads match complete ZIP/checksum/build-info bytes. All **90 served website files** and the custom nested404 match the prepared site, through [Pages deployment 44270783358](https://github.com/uvar-apps/eigenvista/actions/runs/44270783358) at metadata commit `0f32876d1bf54f8992c8869f5ffe1cb814654534`. No application CI was run. Old tags and the 0.10.1 ZIP bytes/hash are unchanged.

User authorization covers commits, tag, pushes, public release and rebuilt redistributables. Track [#98](https://github.com/uvar-apps/eigenvista/issues/98), including accepted #94–#97: buttons, automatic planes, visible picks and live SES/SAS progress.

Use concept DOI **10.5281/zenodo.24246123** until the user supplies a 0.10.2 DOI; 24328295 identifies 0.10.1 only. Preserve old tags/assets, pins/icon/scientific contracts/allocation policy and Vite PID7087/user tab.

The Mac tester ZIP remains ad-hoc signed, not notarized. Linux/Windows/Intel, clean-Mac/Gatekeeper, physical native mouse/OS actions, hidden/inactive native behavior and the entire macOS deployment range remain separate qualification gaps.

Evidence/scripts: `tmp/release-0.10.2/`; acceptance ledger: `.unlazy/release-0.10.2/`. Exact current receipts include package-identity.json, package-qualification.json, browser-qualification.json, native/native-latest.json and site-browser.log.

## Molecular-surface progress (#97) — source preview, 18 November 2026

Tracked by [#97](https://github.com/uvar-apps/eigenvista/issues/97). The user tested
and accepted the implementation and authorizes commit/push on current **main**,
explicitly without a tag or new release. No distribution rebuild is requested.
SES/SAS generation now shows human-readable phase, elapsed time,
and genuine mesh-block counts/phase percentage in the surface widget and a
compact viewport card. The card remains visible with Tools hidden or Zen mode
enabled; Cancel remains reachable. Binary start/end phases are indeterminate.
Elapsed ticks update only the small components. Active shared `app.state`
includes `elapsedSeconds`; `job.get` retains its existing raw stage/count shape.
Preparing, post-generation transfer and actual publication-validation phases
are reported without changing the engine or scientific results. Source guards,
cancellation and accepted-geometry retention remain intact.

Final local macOS qualification passes **148 application cases**, 74 per
browser, with zero failures/skips/flaky cases/retries: eight new real-WASM cases
and 140 existing surface, inspection, field-analysis, plane/controller, orbital
progress and workspace regressions. Types, formatting, production frontend and
fresh native debug builds pass. All **427 source/input hashes** remain unchanged
through final qualification. Desktop controls/card, narrow Zen, indeterminate
phases and real Crambin checkpoints have been visually reviewed in both engines.
The actual native app/helper passes **78 authenticated calls**, including real
partial mesh counts/elapsed readback, SES/SAS completion, cancellation, prior-mesh
retention and cached Save/reopen, with one reviewed SES PNG. A first harness
attempt incorrectly rejected the expected cancelled-job error envelope; its
corrected full rerun passes without an application change. All **162 website
route/viewport cases** and static/build checks pass.

Exact evidence: `tmp/molecular-progress/FINAL.json` and adjacent reports/captures.
The 182 unchanged Rust/native/generated-WASM inputs match prior qualification;
378 workspace and 13 explicit desktop tests are reused, not claimed rerun.
Before delivery, the complete current-source browser suite passes **720 cases**,
360 per engine, with zero failures, skips, flaky cases or retries. All 427
runtime/test/input hashes match the accepted implementation and remain unchanged
through the full run. Fresh packaging/connector checks pass all 23 cases;
formatting and website static checks also pass. Earlier native/build/backend
qualification and 162 website cases remain applicable to these unchanged inputs;
all 91 site files are unchanged. Exact delivery evidence is in
`tmp/molecular-progress-push/PREFLIGHT.json` and adjacent reports. The independently
listed test inventory matches the complete report by identity as well as count.
User/API/AI/agent/architecture and website
documentation are synchronized. Issue #97 tracks acceptance and delivery.
No Rust/WASM/vendor, dependency, format, allocation
policy, version or icon changes. The published 0.10.1 package predates this source
feature. Preserve the existing Vite server/user tab and release assets.
Linux/clean-Mac qualification remains pending.

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

## Button visibility (#94) — source preview, 18 November 2026

The user reports that action buttons blend into labels in dense tools panels.
Track [#94](https://github.com/uvar-apps/eigenvista/issues/94). The shared button
style now uses a pale green fill, darker border, semibold text and a subtle
raised edge; hover/pressed feedback and readable muted disabled states remain
distinct. Existing keyboard focus is retained. Flat headings, reorder handles,
menus, orbital rows and tabs opt out of the raised treatment; primary actions
retain their existing green fill. The compact icon-only rule is scoped to header
buttons so a narrow tools pane no longer squeezes the palette file label into
an icon-sized box. Only `app/src/style.css` and
`app/src/workspace-pane.css` change application behavior.

Formatting, TypeScript and the production frontend build pass. Fresh Chromium
and WebKit captures cover all four tabs at desktop width and WebKit at 390/320
px; the before/after geometry controls and surface actions have been reviewed.
The final CSS passes all **192 existing UI/conversion cases** (96 per browser;
zero failures, skips, flaky cases or retries), with all 419 source/input hashes
unchanged throughout the final run. Live hover, pressed, keyboard-focus, disabled
and flat-control checks pass in both engines; the palette action stays on one
line at narrow width and the conversion dialog fits. WebKit uses its documented
Option-Tab navigation. The earlier plain-Tab probe is retained as a diagnostic,
not a product failure. Evidence is under
`tmp/button-affordance/`. The user accepted the appearance and authorizes
commit/push on **main**. No tag or release is requested. The 419 qualified
source/input hashes were rechecked before committing; tests were not repeated
for unchanged sources. No scientific/API/worker or version change is included.
Preserve the original preview server/tab; CSS updates apply without restarting
the app. The existing 0.10.1 tag and packages retain their released contents.

## Zenodo citation update — 18 November 2026

The user published EigenVista 0.10.1 with version DOI
[10.5281/zenodo.24328295](https://doi.org/10.5281/zenodo.24328295).
Current citation metadata, documentation and website now use that version DOI.
The concept DOI remains associated with all versions, and earlier version DOIs
retain their original attribution. This documentation-only follow-up preserves
the existing release tag, package bytes, source identity and runtime qualification.
CFF parsing, DOI/link/static consistency and all 162 website route/viewport
cases pass locally in Chromium/WebKit. The changed citation page was visually
reviewed on desktop and mobile. Published through citation commit `7dca1b257218689fedb9d6069e13b5a1d4aed297`
and [Pages deployment 44220703219](https://github.com/uvar-apps/eigenvista/actions/runs/44220703219).
All 90 public files and nested404 match the checked local site. GitHub release
notes also use the new DOI; asset identities and the annotated tag are unchanged.
Evidence: `tmp/doi-0.10.1/`; runtime tests were not rerun for this citation-only change.

## Release 0.10.1 — published, 18 November 2026

Version **0.10.1** includes smooth camera-relative lighting (#91) and
allocation-driven workloads (#92). Delivery is tracked in
[#93](https://github.com/uvar-apps/eigenvista/issues/93). The user authorizes
commit, annotated tag, push and a published release with notes and rebuilt
redistributables. **Package acceptance, release publication and independent public byte verification are complete.**

The immutable release source is **`927a2962e8193b41918737ee34adbd2b7a545c29`**, annotated tag
`v0.10.1`. The clean optimized Apple Silicon distribution is:

- ZIP: `EigenVista-0.10.1-apple-silicon-20261118T012726Z-927a296.zip` (82,185,967 bytes).
- SHA256: `3260c5ed0b59b23b6ff6345e5fffe80ba6f9605072f67b9e180a1a9bb50ff16c`.
- Companions: `EigenVista-0.10.1-apple-silicon-20261118T012726Z-927a296.zip.sha256` and `EigenVista-0.10.1-apple-silicon-20261118T012726Z-927a296.json`.
- Local output: `artifacts/distributions/`; build identity reports
  `sourceDirty: false`, arm64, macOS 13.0 deployment target and ad-hoc signing.
- Release destination: [v0.10.1](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.1).

Fresh local macOS 27 arm64 source checks pass: formatting, 365 workspace Rust
tests, 13 desktop tests, strict workspace/all-target Clippy, WASM/TypeScript/
production frontend and native builds, 23 packaging/connector checks and all
678 application browser cases (339 each in Chromium/WebKit; one worker;
zero failures/skips/flaky cases/retries). All 419 frozen hashes matched across the full browser suite and first package.
The documentation follow-up changes only three packaging-tool/test inputs; all
416 scientific/UI/test/fixture hashes remain unchanged, and the 23 packaging
checks passed again for the corrected distribution.
The complete planned-case identities and final JSON results were verified.

Both browsers generate/render/save/reopen the full 58,870-atom 1AON SES at
requested 0.5 Å spacing, producing 2,091,126 vertices and 4,182,788 triangles.
Geometry, source hash and physical/topological metrics match the scientific
reference; both reopened caches export successfully. Their images were reviewed.
The packager reran its Rust/production/converter/WASM checks successfully.

Independent archive qualification checks **709 first-party source files**
against the clean commit and live source, both dependency/source archives,
all 21 pinned Sesmesh patches, licenses, bytes/modes, arm64/system libraries,
ad-hoc signatures, five actual executable-embedded frontend/WASM assets, and
all 14 bundled connector files. Protected documents are filtered before access.
The actual extracted optimized app launched through its packaged launcher with
only system runtime paths, exercising **34 inspection methods through
184 calls and six PNG exports**. It passed authentic cancellation,
scoped/no-clobber protections, quantitative references, AO/palette views and
full 1AON generation, binary Save/reopen and image export from the reopened
cache. All six images were visually inspected. The owned app stopped and its
private descriptor was removed; the user's app and preview servers were preserved.

Evidence: `tmp/release-0.10.1/` (BROWSER-FINAL.json,
package-identity.json, package-audit-latest.json, package-qualification.json and
native/native-latest.json). The release issue provides the durable public ledger.
The tagged source/archive preserve their truthful pre-publication snapshot;
subsequent delivery/site records do not change runtime code or retag/rebuild it.

Release **0.10.1 is published**, with notes and all three rebuilt assets.
Anonymous downloads of ZIP/checksum/build-info JSON match complete local bytes.
[Pages deployment 44216922047](https://github.com/uvar-apps/eigenvista/actions/runs/44216922047)
published delivery/site commit `c4109f63a9bb4b40b64426dc620c305fe5a82d63`.
All **90 tracked public files** and the custom nested 404 match the prepared
site. All 162 local Chromium/WebKit route/viewport cases and interactions pass,
with 27 pages, 1,077 local references, 76 image uses and 23 exact downloads;
desktop/mobile pages were visually reviewed. No application CI was used.

[#91](https://github.com/uvar-apps/eigenvista/issues/91),
[#92](https://github.com/uvar-apps/eigenvista/issues/92) and
[#93](https://github.com/uvar-apps/eigenvista/issues/93) are completed. Read the
[durable delivery ledger](https://github.com/uvar-apps/eigenvista/issues/93#issuecomment-6966374399).
Evidence includes `published-release.json`, `published-download-check.json`,
`public-files.json` and site report
`tmp/2026-11-15-website/browser-friivO/RESULT.json`. The initial readback included
two ignored Finder metadata files; the retained diagnostic was corrected to the
exact Git-tracked tree that Pages publishes. Both files remain ignored locally.

No application CI. Keep v0.10.0 and its assets/captures immutable. Current citation
uses version DOI 10.5281/zenodo.24328295 for 0.10.1. Concept DOI
10.5281/zenodo.24246123 identifies all versions; 24302658 identifies only 0.10.0.
Scientific profiles, dependency/toolchain pins
and icon are unchanged. Work only in EigenVista; Molekel is read-only.

Linux, clean-Mac/Gatekeeper installation, the full supported macOS range and
universal OOM recovery remain unqualified. This package acceptance does not
qualify inactive/hidden/minimized behavior; the earlier inactive, nonhidden
source acceptance below remains a separate dated result. Keep preview servers
5178/5190 and the original unsaved browser tab intact. No system /tmp.

## Allocation-driven memory correction (#92) — qualified for review, 17 November 2026

Source remains 0.10.0 on main after 7b57851, preserving the accepted #91
lighting changes. No branch, commit, tag, push, merge or release was requested.
The published Mac download is unchanged and predates these source corrections.
Read [allocation policy](allocation-policy.md) for the permanent contract.

Application memory/byte/count quotas are removed across imports, quantum grids
and meshes, molecular SES/SAS, saved documents, conversion, annotations/analyses,
and the shared controller. Estimates are diagnostic; requests are not rejected,
coarsened or truncated to fit them. Critical buffers reserve fallibly, with
checked arithmetic and actual format/index/device validation. Cancellation,
source protection, atomic/no-clobber saves and accepted-result recovery remain.
BinaryCIF traversal is iterative; SES neighbors use exact occupied-cell indexing.
Custom grid resolution retains the requested integer dimension. Viewport and
field-key canvases use actual device resolution rather than fixed pixel caps.

Full 1AON (58,870 atoms; Alvarez radii; 1.4 Å probe; requested 0.5 Å spacing)
generates 2,091,126 vertices and 4,182,788 triangles. Native and both browsers
render/save/reopen with matching geometry, source hash, area, volume, components
and cavities. Browser reopened-cache exports have no viewport error. Inflated
contents exceed the old 128 MiB ceiling. The earlier artificial 256 MiB rejection
is retained in old-ses-rejection.json. Native Save now uses raw EVT1 binary IPC,
avoiding millions of JSON numbers without a file-format/public-result migration.
Default processing/transfer deadlines and the one-day CLI wait cap are removed.

The rebuilt native app passes all 34 inspection methods through 179 recorded
calls and six PNGs, including large Save/reopen while an AppKit probe confirms
the app is inactive and nonhidden. The supported background scheduling setting
keeps workers runnable on macOS 14+; older/unsupported systems ignore it.
Hidden-window acceptance remains unqualified because macOS rejected programmatic
hiding. This setting does not prevent OS sleep or process termination.

Local macOS 27 arm64 qualification passes formatting, strict workspace/all-target
Clippy, 13 desktop tests, WASM/TypeScript/production and debug native builds, and
23 packaging/connector checks. The 365-test workspace Rust result applies to
unchanged scientific/native sources and inputs, independently hash-verified
after the frontend corrections. The exact-upstream SES harness passes 276
executions with zero failures and six preexisting ignored executions; original
fixtures/oracles/tolerances and dependency versions remain unchanged. All 21
reviewed vendor patch hashes and original upstream provenance are verified.

The final browser suite passes **678/678 cases**, 339 per engine, one worker,
18.4 minutes, with zero failures/skips/flaky cases/retries.
All 419 frozen source/test/fixture/generated-input hashes match before/after;
planned identities and every result are checked independently. The 22 focused
regressions also pass. No scientific/image tolerance or original test deadline
was weakened. GPU allocation checks now use zero-draw upload staging and
allocation/resize/upload/export boundaries, avoiding duplicate rasterization
and synchronous error queries on ordinary camera/damping frames. AO's physical
state restoration and context-loss recovery remain intact. A real native
allocator failure reports its cause with the prior buffer unchanged.

Earlier attempts remain diagnostic evidence: the first full run was 660/676
with 16 failures (selectors, obsolete quota expectations, protein timeouts);
the second was interrupted after two protein timeouts. Neither is qualification.
Those findings were corrected and the entire final suite rerun on frozen source.
Earlier hidden-window/JXA and suspended native attempts also do not count as passes.

Evidence under tmp/allocation-policy/: FINAL.json, qualified-checks.json,
qualified-acceptance.json, full-browser.json/log, source-before.json,
source-after.json, ui-correction-source-delta.json, boundary-focused.json,
native/native-latest.json, audit-*.json and sesmesh-upstream-test-results.json.
Linux, clean-Mac/Gatekeeper and the full deployment-OS range remain unqualified.
The preview server remains on port 5178. Keep #91/#92 open pending user review
and authorized delivery; no redistributable has been republished for this fix.

## Smooth view-relative lighting (#91) — validated for review, 17 November 2026

User testing of the web preview's real hydroxyl Molden example revealed gray
bands and polka-dot highlights from the six-light rig. #91 tracks the correction.
Source remains 0.10.0 on the existing main checkout after `7b57851`; no branch,
commit, tag, push, merge or release is requested. Preserve the user's live
preview and existing unsaved tab. Published 0.10.0 binaries remain unchanged.

The source candidate uses one camera-axis directional headlight and neutral
ambient fill (0.65/0.35), shared with built-in mesh/raycast GLSL. Blinn has one
broader, restrained lobe (32/0.25). Atom/bond materials, geometry and AO's matte
Lambert conversion are unchanged. Fresh source/build/native/browser validation
and independent visual review pass as recorded below. The independent
anisotropic ray reference now explicitly faces the gradient toward the actual
eye ray before projecting onto the headlight; root/depth/compositing bounds
remain unchanged.

Actual pre/post renders reproduce the user's hydroxyl and isolated H/O spheres.
At 45% projected radius, angular RMS falls from 0.026 to 0.0011 for H and from
0.099 to 0.00038 for O. The image oracle rejects both old renders and accepts
the new ones, retaining radial shape contrast. New orbit/roll regressions
exercise this pattern rather than only average brightness. Evidence:
`tmp/smooth-lighting/{before,after}-capture.{json,log}` and original PNGs.
The first diagnostic capture had a file-import wait race and the first focused
suite used the wrong working directory; both attempts are retained separately
and are not accepted qualification. No source/scientific defect is inferred
from those harness mistakes.

Fresh local macOS qualification passes **650/650 application browser cases**,
325 per engine, one worker, 21.7 minutes, zero failures/skips/flaky cases/retries.
Every planned identity/result is checked independently; all 234 frozen hashes
match before/after. The new four H/O cases retain the previous 646 cases and
all numerical/root/depth/compositing tolerances. Focused lighting tests pass
10/10. TypeScript, scoped formatting, WASM/production frontend and actual debug
native bundle builds pass. Rebuilt native acceptance passes all 34 existing
inspection methods through 160 calls and five PNGs; its owned process exits.
Independent review of actual hydroxyl, H/O, crambin and native 1AON pocket AO
captures finds no material regression; matte AO retains contact depth, custom
shaders/keys remain present. This is a source-built native test, not a new
redistributable or clean-Mac qualification.

Only sceneLighting and three affected test files differ in the 234-file
runtime snapshot from the qualified 0.10.0 baseline. Rust/native sources,
generated WASM and dependency pins are byte-identical. Rust, desktop-unit,
Clippy and packaging suites were not rerun for this TypeScript-only correction;
their prior results apply to those unchanged components, not as fresh renderer
qualification. Current renderer evidence is the new full browser/native run.

Evidence: `tmp/smooth-lighting/full-browser.{json,log}`, `planned.json`,
`source-{before,after}.json`, `source-scope-audit.json`, `native-build.log`,
`native/native-latest.json`, `focused-lighting.log`, `format.log`, `tsc.log`,
`doc-check.json` and `test-advice/visual-review.json`. The first focused run's
four failures/six passes are the wrong-CWD diagnostic, retained separately as
`focused-wrong-cwd.log`; none qualifies this source. The final full run passes.
The live EigenVista Vite server remains on port 5178; the original user tab is
not reloaded or replaced. No Git-history change or package publication occurs.
Keep #91 open for user review/delivery. When a new release is authorized, update
guide availability wording before packaging so the archive describes itself.

## Zenodo DOI for 0.10.0 — 17 November 2026

The user supplied **10.5281/zenodo.24302658** as the 0.10.0 version DOI.
Update CITATION.cff, README, release notes, agent guidance and the website's
About citation/download metadata together. The project concept DOI remains
10.5281/zenodo.24246123; the historical 0.8.0 DOI remains
10.5281/zenodo.24273137. Preserve dated pre-DOI records below and all immutable
packages, source tag and asset digests. This is a documentation/metadata update;
validate citation schema, links, static output and the two-engine website suite
before pushing and publishing. The GitHub release notes also need the new DOI.
Zenodo's public API returned HTTP 403 from this environment; the user-supplied
identifier is authoritative and no independent record-metadata match is claimed.

Local verification passes citation schema 1.2.0, Markdown links/whitespace,
website module syntax/static checks and all **162 Chromium/WebKit website cases**
(`tmp/2026-11-15-website/browser-foZl0v/RESULT.json`). Static output remains
27 pages/1,076 local references/76 image uses/22 exact downloads. The new positive
DOI check requires CFF and the published website release metadata to agree.
All 234 frozen application/test hashes match the existing 646-case qualification;
application tests were not rerun for this citation-only change. Evidence is under
`tmp/doi-0.10.0/`. Commit `fd5751f39926956e3c038947a85333693959c18b` is pushed,
the GitHub 0.10.0 release notes include the DOI, and
[Pages deployment 44055609073](https://github.com/uvar-apps/eigenvista/actions/runs/44055609073)
succeeded. All three changed public website files and current GitHub CFF match
local SHA-256 values. Release asset identities/digests and the existing tag are
unchanged (`release-verified.json`, `public-readback.json`). Static payload is
26,204,829 bytes. This later living-document delivery record does not retag,
rebuild packages or repeat unchanged runtime/site-browser tests.

## Mac package 0.10.0 — published, 17 November 2026

The user explicitly requires the downloadable Mac package updated to the latest
version. Track [#90](https://github.com/uvar-apps/eigenvista/issues/90): rebuild
clean optimized app/converter/ZIP, independently audit it, test the actual
extracted packaged launcher/helper and GUI, publish a GitHub release and update
website/download facts. Keep the existing `v0.10.0` tag unchanged. All work is in
EigenVista with repository-local temporary storage; no application CI.

Bundled guides/skill references are being corrected before the final clean
package snapshot so the delivered app describes its own features accurately.
The first diagnostic package run was intentionally stopped during Rust tests;
its staging/log remain under `tmp/release-0.10.0/`. It is not a qualified build.
The previous source-tag delivery below remains historical.

The clean optimized build now passes from `c27a8dcbf43b5bcf4b9c69ed8426c6ade32f1167`:
`artifacts/distributions/EigenVista-0.10.0-apple-silicon-20261117T085533Z-c27a8dc.zip`,
**82,117,816 bytes**, SHA-256
`479339c16f18022da86f860ece49f8c3ed39d2dcf27f221ecd0c0c9011048961`.
All 336 Rust tests, 17 packaging-support and six connector-packaging checks pass.
The independent ZIP audit verifies 695 clean source files, 300 runtime/science/
fixture/vendor files against the unchanged tag, all 88 payload-file bytes/modes,
five embedded frontend/WASM assets, the three signed arm64 binaries and Sesmesh
notices/source archives. Deployment target remains macOS 13; host is macOS 27.0.

Actual extracted acceptance uses the **packaged** launcher and helper under a
system-only PATH, with spaces in paths. All 34 inspection methods pass through
160 calls: scoped imports, Pastel, geometry, SES/SAS, analytic/grid analyses,
cancellation, protected/no-clobber outputs, CSV/PNG and native save/reopen. Five
PNGs are generated; root inspected three. The owned app/descriptor are cleaned
up. The actual optimized GUI separately opens the bundled C7H10 Molden input,
creates a 96 × 96 HOMO plane with key, checks both pane sides, 320/840 px bounds,
restores right/480/Molecule, and retains the plane/key across hide/show, Zen and
explicit Tauri WebKit fullscreen entry/exit. Cmd+Q guards the generated document.
Two automation-handle/screenshot timeouts were recovered without app/source
changes; no native GUI screenshot or native green-button qualification is claimed.
All owned diagnostic windows exited. Existing servers remain untouched.

All 234 frozen hashes still match the full 646-case application qualification.
No runtime/test changes were made for packaging. The website's updated published
availability passes static checks and all **162 Chromium/WebKit cases**; desktop
and phone homepages were inspected. Static payload is 26,204,546 bytes. The first
static attempt matched visible installation text against raw HTML containing a
link; correcting the text extraction retains the full positive wording check.
Earlier failed diagnostic evidence is preserved. All existing imagery and
version-specific DOI provenance remain historical. At package build time the
citation used the concept DOI; the newer 0.10.0 citation is recorded above.

**Publication complete:** the [0.10.0 Mac release](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.0)
is public, retaining the experimental prerelease classification and unchanged
source tag. Download metadata/site commit is
`3fc91fb56114c7b16219a2f86e8e817fc6332328`; its parent clean package source
`c27a8dc` is also pushed. ZIP, checksum and build JSON were downloaded through
anonymous HTTPS and independently matched to local bytes, sizes and GitHub
digests. The [Pages-only deployment](https://github.com/uvar-apps/eigenvista/actions/runs/44054046506)
succeeded; all **89 committed public files** and the custom nested 404 match
the qualified local payload. Evidence: `published-release.json`,
`published-download-check.json`, `pages-deployment.json` and `public-files.json`
under `tmp/release-0.10.0/`. A later documentation-only delivery record updates
these living files without rebuilding, moving the tag, changing the package or
rerunning unchanged runtime checks. Continue from main; #83/#85 remain open
for the documented limitations. Older 0.8.0 assets remain untouched.

Evidence: `tmp/release-0.10.0/` contains `package-final.log`, `artifacts.json`,
`package-test-summary.json`, `package-audit-latest.json`, `native/native-latest.json`,
`native/gui-observations.json`, `site-check.log`, `site-browser.log`; website report
`tmp/2026-11-15-website/browser-FKf8Dv/RESULT.json`. Retain the initial stopped
`package.log` and `site-check-attempt1.log` separately. Clean-Mac/Gatekeeper,
the full deployment-OS range and Linux/Windows remain unqualified.

## Approved 0.10.0 source update — delivered, 17 November 2026

The user tested and approved the simpler workspace for
[#88](https://github.com/uvar-apps/eigenvista/issues/88), then authorized complete
documentation/website updates, the 0.10.0 bump, commit, **merge through a PR, then
tag and push main**. This explicitly supersedes the earlier wait-before-merge
constraint. Development remains in EigenVista; Molekel is read-only reference.

The single resizable 480 px pane becomes normal startup, selectable left/right,
with Molecule, Fields, Surfaces and Appearance tabs. Original collapsible/
draggable widgets and chrome remain, alongside hide/reopen, Zen and independent
browser fullscreen. `?workspace=legacy` is an explicit historical regression/
reference route; `?workspace=lab` remains a compatible alias. Scientific controls,
worker and controller owners are unchanged. **Fields → Quantitative field
inspection** contains probes, planes/contours and profiles. The pictured HOMO
plane shows signed orbital amplitude, not nonnegative electron density.

User/technical guides, website reference/tutorials/gallery and agent entry points
are synchronized with the coordinated metadata bump. Fresh qualification
of the new default passes; the 638-case opt-in candidate below is historical.
All relevant local macOS checks must pass before any push. No application CI;
the authorized Pages-only publisher serves prepared `site/` from main. Published
0.8.0 binary downloads/digests and their version DOI stay unchanged. No new binary
release is requested. The current citation uses the concept DOI.

Track implementation through #83–#88; #85 also retains SES/Van der Waals contact
interference and the pending-inspection/GUI-Save coordination limitation. No
scientific or persistence fix is implied by the layout update. See
[0.10.0 notes](releases/0.10.0.md) and the
[approved design](design/2026-11-17-simple-workspace-pane.md). Sections below are
dated evidence, including superseded candidate and delivery restrictions. Fresh
final verification and delivery identities follow.

**Delivery:** feature commit `308e98b8a814d5703400700d4c6253134fb81af0`
was merged through [PR #89](https://github.com/uvar-apps/eigenvista/pull/89)
as `8ab5a0a1e12f7314c93b29745ea75e4c4f11b784`. The merged tree exactly
matches the qualified feature tree `424f4103e9fcabea5961c3c164d089ebd9ac9cd3`.
Annotated tag `v0.10.0` (tag object `f55a6a688868f874edbe7a55c9a0cf3b45ecf739`)
identifies that merged main commit; remote main and tag readback passed. The
local `v0.9.0` checkpoint was neither moved nor pushed. Issues #84, #86, #87 and
#88 closed through the PR; #83/#85 remain open for the documented gaps.

The [Pages-only publisher](https://github.com/uvar-apps/eigenvista/actions/runs/44047989575)
succeeded for the merge. All **89 committed public files** and the custom nested
404 body/status match the qualified output (`tmp/version-0.10.0/public-files.json`).
The earlier readback included two ignored macOS `.DS_Store` files; their expected
404s caused its diagnostic failure. The corrected verifier uses the committed
deployment list. Preserve `public-files-attempt1.json`; every actual public file
matched in that attempt too. No application CI ran. Published binaries remain
0.8.0. A later documentation-only delivery record updates these living files;
it does not retag, rebuild or repeat unchanged runtime tests. Continue from
`main` and inspect actual Git state before starting new work.

Version preparation is now complete: all current own metadata and citation
identify 0.10.0. Fresh local macOS checks pass for formatting, 336 default Rust
tests, eight desktop tests, strict workspace/all-targets Clippy, both CLI version
outputs, citation schema, WASM/TypeScript/production build, the debug app bundle,
17 packaging-support tests and six connector-packaging tests. Native/scientific
inputs remain unchanged through their 110-file audit. The complete application
suite passes **646/646 cases**, 323 per engine, in 24.3 minutes with one worker
and zero failures, skips, flaky cases or retries. All 234 frozen application/
scientific/native/test/dependency hashes match before and after. Evidence:
`tmp/version-0.10.0/final-browser.{json,log}`, `final-planned.json` and
`final-source-{before,after}.json`. The independent evidence verifier checks
every planned identity and result. Preserve earlier failed/interrupted attempts:
compact-header/mobile-pane and palette assertions were corrected; an isolated
protein-renderer mock was restored to its blank page after route migration.
Scientific/pixel thresholds and original scenarios remain. These attempts and
focused results do not replace the final complete run.

The regenerated website passes static checks: 27 pages, 1,076 local references,
76 image uses, 22 original-byte downloads and 26,206,616 bytes, within the 25 MiB
bound. Three lossless WebPs retain the approved 1280 × 800 captures and honest
0.9.0 provenance; independent decoded-pixel comparisons are zero. All 16 older
curated media rows/hashes are unchanged. Public provenance is compact JSON with
identical data. Both website engines pass all **162 route/viewport cases** and
interactions, including natural image proportions, clipboard prompts, downloads,
search, themes and no-JavaScript navigation. Root reviewed desktop homepage/
gallery and the phone inspection manual. Evidence:
`tmp/2026-11-15-website/browser-51gIcT/RESULT.json` and
`tmp/version-0.10.0/site-check-final-copy.log`.

Actual rebuilt 0.10.0 debug-app acceptance passes all **34 inspection methods**
through **160 native connector calls**, with five PNGs, CSV and saved/reopened
native caches. The helper is the freshly built source helper, not a packaged
launcher/install test. All four owned lifecycle scenarios and their JSONL exit
observations pass. Native UI automation also opened the real C7H10 Molden file
through its file dialog (17 atoms/18 bonds/125 basis functions), created a real
96 × 96 HOMO plane, checked 320/840 px keyboard resizing, both pane sides,
hide/reopen, and retained the analysis through Zen and actual WebKit fullscreen
entry/exit in Tauri. Width/side/tab/disclosure were restored, then the generated
test document was discarded through the real Cmd+Q protection dialog; the owned
app exited. This establishes those actions on macOS 27.0/arm64, not the full
deployment-OS range, native green-button fullscreen, detached windows,
multi-monitor or assistive-technology qualification. The brief automation-handle
reset was recovered without an app/source change. Native evidence:
`tmp/version-0.10.0/native/{native-latest,gui-observations}.json` and
`tmp/version-0.10.0/lifecycle/RESULT.json`. No 0.10.0 redistributable is published.

## Simple pane follow-up — historical opt-in qualification, 17 November 2026

The user selected a simpler IDE-style arrangement for [#88](https://github.com/uvar-apps/eigenvista/issues/88)
and then explicitly requested finishing tests and opening the preview. Current
`?workspace=lab` uses one 480 px pane, selectable left/right, with four tabs inside
it: Molecule, Fields, Surfaces and Appearance. The original header, footer,
background/camera/export controls and collapsible/draggable widgets are retained.
Three compact workspace icons join the existing file-action toolbar; the old
global task bar, bottom workbench and floating placement are removed from the
active experiment. Ordinary startup remains the comparison layout.

New active sources are `WorkspacePane.tsx`, `useWorkspacePane.ts` and
`workspace-pane.css`. The original `PanelSection` markup is restored; reusable
`PanelStack` shares the existing keyed DOM ordering, pointer/keyboard/menu/focus
implementation. The legacy eight-ID preference stores, sidebar classes/labels
and exact `{pane,id}` drag payload are retained. Four new scoped stacks reject
foreign drag scopes and keep bodies mounted. Extra analysis/measurement widgets
start collapsed; actual opening controls lazy analysis activation. Tool state,
scientific ownership, camera and API remain shared. Zen/fullscreen and global
scientific cancellation remain available.

Previous prototype source is archived under
`tmp/gui-design-simple/previous-prototype-source/`; old accepted test/capture
scripts and images remain preserved in `tmp/gui-design/`. The 636-case result
below is historical for that earlier source. Current TypeScript/format/production
frontend build pass. All 24 new workspace cases and all 38 existing disclosure/
order cases pass in Chromium/WebKit. A genuine WebKit scroll-reset gap was
reproduced and fixed with per-tab visible snapshots/explicit restoration; the
corrected regression passes both engines. Earlier test menu/wheel timing mistakes
and the failing WebKit candidate remain preserved.

Twenty final comparison captures pass, with three original PNGs and source/input/
camera provenance in `docs/design/assets/simple-workspace-pane-2026-11-17/`.
Root inspected real 1CRN left, C7H10 right and compact overlay views. Fresh local
macOS 27.0 / arm64 qualification passes **638/638 browser cases**, 319 per engine,
26.1 minutes, one worker, zero failures/skips/flaky cases/retries. All 124 recorded
runtime/test/dependency hashes match before and after, including the WASM bridge.
Evidence: `tmp/gui-design-simple/full-browser.{json,log}`, `frozen-source.json`,
`source-after.json`, `qualification.txt`, `tsc.log`, `format.log` and `build.log`.
Incomplete and deliberately failed evidence reports are rejected by the checker;
these probes are separate from the application test results. See the
[current design](design/2026-11-17-simple-workspace-pane.md).

A fresh in-app browser tab (3) is open at
`http://127.0.0.1:5178/?workspace=lab&preview=simple`. It was observed ready with
four internal tabs, original collapsible/draggable widgets, enabled Open/Save and
the completed example. Original tabs were preserved. User guide, index, agent
instructions, status and design records are synchronized; earlier alternatives
and their qualification are explicitly historical. Nine public documents pass
353 local-file-link/fence checks; all three current PNG identities/dimensions
match the original captures.

All work remains uncommitted on `codex/scientific-inspection`, after `9617a31`.
Tag `v0.9.0`, main and published 0.8.0 downloads remain unchanged. No delivery,
default adoption, native window or native fullscreen qualification is authorized.
Keep Vite PID 7087 at 5178 running; EigenVista only, repo-local tmp only, Molekel
read-only. Do not replace or refresh the user's unsaved original browser tabs.

## Desktop workspace experiments — validated, 17 November 2026

Tracking [#88](https://github.com/uvar-apps/eigenvista/issues/88). The user requested
desktop GUI research and working alternatives to two permanent narrow sidebars,
including hideable tools and Zen/fullscreen. Work remains uncommitted on
`codex/scientific-inspection`, after checkpoint `9617a31e7824fbe93ccc78829afa6079ed1080f5`.
The annotated local `v0.9.0` tag and main are untouched. No push, PR, merge,
publication, native package or production-default change is authorized here.

Read [the design analysis](design/2026-11-16-desktop-workspaces.md). The opt-in
`http://127.0.0.1:5178/?workspace=lab` route uses actual controls in one wide
tabbed dock, bottom workbench or in-app floating palette. One persistent viewport
and tool host preserve camera, accepted scientific objects and tool drafts.
Ordinary startup remains the comparison layout. Separate task groups are
Structure, Quantum, Surfaces, Inspect and Appearance. Tools hide/reopen/resize;
each tool owns its scroll area while subtabs stay visible. Zen is transient and
independent of actual browser fullscreen; essential progress/cancel remains
outside hidden tools. The new global strip offers Cancel only for scientific
calculations, not file opening/saving. Short workbench windows use an overlay to
retain a drawable scene; compact floating width is bounded to preserve visible
scene area. The default dock is 480 px wide, with 439 px of working content.
Keyboard focus transfers to visible launch/exit controls. The Zen overlay leaves
the actual quantitative legend unobstructed at desktop and compact widths.

Primary guideline/source audit and two independent integration reviews are under
`tmp/gui-design/research/`. Initial 14 browser cases passed; visual/source review
then drove additional focus, scrolling, short-window and cancellation fixes.
An immediate WebKit image was blank after changing layout; waiting for actual
ResizeObserver/draw completion fixes the capture without renderer changes.
The strengthened test checks compositor pixels before any export.

Fresh local macOS 27.0 / arm64 qualification passes **636/636 application browser
cases** (318 Chromium, 318 WebKit; 22.8 minutes; one worker; zero failures, skips,
flaky cases or retries), including all 22 new workspace cases. The 125 recorded
runtime/test/dependency hashes match before and after the complete run, including
the generated WASM/bridge. TypeScript, Prettier, production Vite build and diff
whitespace checks pass. Evidence: `tmp/gui-design/full-browser.{json,log}`,
`qualified-source.json`, `source-after.json`, `qualification.txt`, `tsc-final.log`,
`format.log` and `production-build.log`. The evidence checker rejects incomplete
and deliberately failed reports; these negative probes are not application test
failures. Earlier candidate failures remain preserved.

The accepted capture record is `tmp/gui-design/experiments-accepted/RESULT.json`
with 20 matched-camera PNGs. Root inspected desktop/laptop layouts and a narrow
WebKit Zen view; five original PNGs and public input/camera/source provenance are
retained under `docs/design/assets/desktop-workspaces-2026-11-17/`. Read the design
report for measured tradeoffs and the user's remaining adoption decision. The
600 × 520 floating correction retains 28.82% unoccluded scene versus 7.63%
before, passing the unchanged 20% visibility floor. Seven public documents pass
337 local-file-link/fence checks; the five curated PNG hashes and dimensions
match their original captures. A separate in-app browser tab (2) is open at the
lab route and was observed ready with the completed example; original tabs were
preserved. Temporary diagnostics stay in ignored `tmp/gui-design/`; keep the
correct Vite PID 7087 at 5178 running.

Only one task/tool host is visible; simultaneous independent windows are a later
scope. The existing Browse orbitals chooser remains modal. The floating palette
is not a native detached tool window; native fullscreen, multiple displays,
physical system Escape and assistive-technology operation remain unqualified.
No scientific/native format/controller
methods, compiler, dependency versions, fixtures, icon or logo changed. All
development stays in EigenVista; Molekel is read-only and system `/tmp` forbidden.

## Local checkpoint — 16 November 2026

The user authorized committing the validated work and creating the annotated
local tag **`v0.9.0`** on `codex/scientific-inspection`. The tag identifies this
checkpoint; use Git to resolve its commit. Version 0.9.0 remains **unreleased**.
This authorization supersedes the earlier no-commit/no-tag instructions below,
but does not authorize a push, PR, merge or publication. Main remains
`6a728d918cfdf4291a6a04ae9327d668fd449283`, and published downloads remain 0.8.0.
The user will continue testing before deciding the next delivery step.

The checkpoint retains the qualified runtime unchanged: 614 application and
162 website Chromium/WebKit cases passed. Commit preparation changes only
documentation of this authorization; it does not imply a new native bundle or
another runtime test run. Temporary evidence, generated bindings, private
working documents and personal chat exports are excluded from the commit.

## Balanced scene lighting — validated, 16 November 2026

Tracking [#87](https://github.com/uvar-apps/eigenvista/issues/87), user feedback
that SES has a bright side and a dark back. Still on
`codex/scientific-inspection`, version 0.9.0 unreleased. The local checkpoint
authorization above supersedes this task's original no-Git-delivery boundary.

Implemented `app/src/sceneLighting.ts`: six equal directional lights at a rotated
octahedron's vertices, neutral ambient fill, with both lights and targets parented
to the camera and the camera in the scene. Built-in mesh Blinn and sampled-raycast
shaders use the same view-space directions. Ordinary atom/bond/PBR and protein
Lambert materials receive the Three scene rig; custom GLSL, unlit volume
compositing, planes, labels, scientific data and native formats are unchanged.
Final ambient/diffuse weights are 0.1/0.9; pure Lambert ranges from about 0.620
to 1 before material/color processing. This preserves shape cues without a
preferred world direction; it does not promise identical views of different
geometry. The product-lighting AO fixture now uses the actual rig; its existing
contact, restoration, resource and gloss-removal assertions are unchanged.

Fresh checks: TypeScript, formatting, production Vite build and generated-site
static validation pass. Six new Chromium/WebKit cases pass across ten camera
poses each (six axes, two oblique and two rolls), in Diffuse/Blinn modes for
SES spheres, real 1CRN and raycast-only spheres. They save 120 actual PNGs and
12 numeric records. Maximum sphere mean-brightness ratio is 1.00023 and 1CRN
1.00939, versus over 2× under the old Diffuse setup. Root inspected opposed
1CRN views and an oblique Blinn image. Earlier 0.35/0.65 and 0.25/0.75 fill
candidates failed the predeclared protein contrast floor; final values pass
without reducing thresholds. Evidence: `tmp/scientific-inspection/scene-lighting/`
(`final-tests/`, `final-metrics.json`, `vite-final-build.log`, `tsc.log`).

The full application qualification now passes **614/614 Chromium/WebKit cases**
(22.7 minutes, one worker, no failures, skips or retries). All 259 captured
runtime/test/dependency hashes stayed unchanged throughout the run. The prior
attempt in `full-browser.log` stopped after 35 passes/six failures because two
independent CPU color references still encoded the old fixed-light equation;
its interrupted camera case and 572 unrun cases are not passes. Updating only
their illumination math preserved all field, intersection, compositing, depth,
tolerance and geometry coverage; all 26 focused controls then passed before
the complete rerun. Evidence: `full-browser-final.log`, `oracle-browser.log`,
`source-verification.json`, `change-scope.json` and
`independent-color-oracle-check.json`. The actual helper's 42 light directions
and final intensities also pass a CPU transform audit across translated/rotated
camera poses: `actual-helper-transform-review-accepted.json` (0.1/0.9 weights).

The website passes static checks (27 pages, 1,033 references, 70 image uses,
22 exact downloads) and **162/162 Chromium/WebKit route/viewport cases plus
interactions**. Manual desktop/mobile images were inspected. Evidence:
`site-browser-final.log` and `tmp/2026-11-15-website/browser-f15bje/`.
Seven public documents pass local-link/fence checks (342 local file links).
Scientific Rust/native/dependency source is unchanged; its earlier qualification
remains historical rather than a newly rerun Rust/native acceptance. No new
native bundle or release. Local commit/tag is authorized as recorded above;
push, PR and merge still require the user's instruction.

The old preview server was no longer listening when this task began. Port
ownership was checked and the correct app preview restarted at 5178 (PID 7087,
tool session 64200); keep it running for user testing. The website preview is
also running at 5190 (PID 9377, tool session 6591). The existing in-app tab and its
two unsaved 1CRN meshes were preserved; save, refresh and reopen the document
to ensure that tab loads the latest renderer after the server restart. Never use
system temporary storage or modify Molekel.

## SES appearance user-test correction — 16 November 2026

Current source remains **0.9.0, unreleased**, on `codex/scientific-inspection`.
User feedback clarified that saved SES color/opacity worked after **Apply
appearance**; the required correction is immediate application as inputs change.
That button is removed. Saved-surface color and valid opacity changes now use
the shared validated controller immediately, with one in-flight request and
coalesced latest patches per surface. Inputs stay enabled. Empty/out-of-range
opacity remains a draft; source replacement resets drafts even when persistent
surface IDs match. **Rename surface** commits names separately. Mesh generation
and scientific caches are unchanged. Tracking: [#85](https://github.com/uvar-apps/eigenvista/issues/85).

Fresh local macOS checks: TypeScript, production Vite build using the unchanged
qualified WASM bindings, Prettier and `git diff --check`; all **62 inspection,
molecular-surface and field-analysis Chromium/WebKit cases pass** (2.8 minutes,
one worker, no skips/retries). Six focused live-appearance checks also pass.
They cover real 327-atom 1CRN rendered PNG changes, rapid edits, two-surface
isolation, invalid numeric input, API synchronization, same-ID reopen and exact
mesh/source preservation. Root inspected opaque blue and translucent PNGs.
Evidence: `tmp/scientific-inspection/live-appearance-feature-suites.log`,
`live-surface-appearance-final/`, `live-appearance-tsc.log` and
`live-appearance-vite-build.log`. The earlier WebKit focused attempt stopped on
a Save while a redundant accepted-value write was still active; retained as a
failed attempt. The final tests wait for accepted-operation completion.

The website/manual/tutorial content is regenerated. Static validation passes
27 pages, 1,033 local references, 70 image uses and 22 exact downloads. All
**162 Chromium/WebKit website cases plus interactions pass**; evidence:
`tmp/scientific-inspection/live-appearance-site-browser.log` and
`tmp/2026-11-15-website/browser-78wxlh/`. Published 0.8.0 download facts remain
unchanged.

The SES/Van der Waals overlay issue is **not claimed fixed**. Actual 1CRN in both
engines confirms that independently triangulated shared atom-contact boundaries
cross. Conventional polygon offset leaves artifacts; explicitly choosing Ball
and stick clears the interference (0–3 strong differing pixels against the
opaque SES-only reference). GUI, user guide and website explain the representation
choice. No hidden radius change, depth-test override or scientific-mesh change
was applied. Diagnostic evidence: `tmp/scientific-inspection/ses-overlap-vZh2u8/`.

Independent review also found broader GUI inspection/Save coordination work:
Save during an in-flight validated inspection edit can encode the prior accepted
snapshot. Dirty state correctly stays set after a newer publication. This is
recorded in #85; the live-control fix does not claim to resolve it. Save after
accepted writes complete. Other GUI inspection upserts share this existing gap.

The previous **604-case application suite and extracted-native qualification
predate this UI correction**; they were not rerun for this focused change and
must not be described as testing its final source. Rust/WASM scientific source,
renderer and packaging code are unchanged by this correction. No new native
bundle, commit, push, PR or merge; the user's preview server remains running.

## Historical source checkpoint: 0.9.0 — 16 November 2026

The user authorized bumping the feature branch to **0.9.0 everywhere** before
merging. Stay on `codex/scientific-inspection`; main remains
`6a728d918cfdf4291a6a04ae9327d668fd449283`. Personal testing is still required
before any PR or merge. The version bump does not authorize committing,
tagging, pushing, publishing or replacing release assets.

Workspace/npm/Tauri metadata and current user/agent/website descriptions now
identify 0.9.0. [Release notes](releases/0.9.0.md) are explicitly unreleased.
The website distinguishes current 0.9.0 source from the real published 0.8.0
download; its archive URL, digest and release source remain unchanged. Historical
images, native fixtures, planning baselines, dependencies and vendored Sesmesh
metadata retain their identities. Current citation metadata uses concept DOI
`10.5281/zenodo.24246123` without a release date; no 0.9.0 DOI exists yet. The
0.8.0 version DOI remains associated with its original published release.

Fresh local version-preparation checks passed under `tmp/version-0.9.0/`:
12 own program-version declarations plus citation metadata agree on 0.9.0;
locked Cargo metadata, fmt, 336 default Rust tests, eight desktop tests, strict
workspace/all-targets Clippy, production WASM/TypeScript/Vite build and 17
packaging-support tests pass. Rebuilt debug CLIs both report 0.9.0. The citation
file passes the official CFF 1.2 schema. A normalization check against the prior
257-file qualified runtime/test snapshot proves only five package-version files
changed; dependencies, scientific/renderer code and application tests are
unchanged. The 604-case application suite was not repeated for this metadata-only
change and retains its explicitly earlier evidence below.

The website is regenerated and validated: 27 pages, 1,033 local references,
70 image uses, 22 exact downloads and all 162 Chromium/WebKit route/viewport
cases plus interactions pass. Desktop/mobile layouts were inspected; current
headers/footers show 0.9.0 unreleased, while `release.json` still describes the
real published 0.8.0 package. `application.json` derives current identity from
the Tauri manifest. Historical media/provenance is unchanged. Browser evidence:
`tmp/2026-11-15-website/browser-M4Reep/`. Current documentation/agent references
and unreleased notes passed link/fence/example checks.

No 0.9.0 redistributable has been built or published by this version-only task.
The complete feature qualification below ran before the bump; its 0.8.0 test
ZIP must not be represented as a 0.9.0 package. User testing remains the next
step before any PR/merge. Main and published assets remain unchanged.

## Active implementation: scientific inspection, 16 November 2026

Implementation and local validation are complete on `codex/scientific-inspection`,
awaiting the user's testing before any PR. The branch is based on main
`6a728d918cfdf4291a6a04ae9327d668fd449283`. The user authorized
[Plan 009](../plans/009-scientific-inspection-implementation.md), priorities 1–3,
including every feature's shared API and packaged AI connector support. Track
the batch in [#83](https://github.com/uvar-apps/eigenvista/issues/83), geometry
[#84](https://github.com/uvar-apps/eigenvista/issues/84), molecular surfaces
[#85](https://github.com/uvar-apps/eigenvista/issues/85), and quantitative fields
[#86](https://github.com/uvar-apps/eigenvista/issues/86).

**Do not open or merge a pull request, merge into main, push or release.**
Finish implementation and local validation, then let the user test this branch
and wait for their next instruction. Main and published 0.8.0 artifacts retain
their identities. The later local `v0.9.0` checkpoint records the completed work;
inspect the actual working tree and tag before continuing.

Implemented: Rust geometry/annotation/neighborhood kernel, independent
Sesmesh adapter with a pinned minimally patched in-repo dependency, f64 field
inspection kernel, optional native payloads/capabilities with typed packing,
worker bridges, scoped CSV export, shared controller and GUI integration.
All three feature families have GUI and shared-controller coverage, typed
native persistence, original-index picking and rendered scientific annotations.
Read the [scientific design record](design/2026-11-16-scientific-inspection.md)
for accepted decisions, resource limits and the inspection-client simplification.

Fresh local checks passed: **336 default Rust tests**, **eight desktop tests**,
formatting, strict workspace/all-targets Clippy and final WASM/TypeScript/
production build. These include 13 geometry/neighborhood, 15 field-analysis plus
the exact contour-predicate unit test, 15 SES/SAS and eight new native-profile
cases; frozen native fixtures remain unchanged. Initial strict Clippy flagged
test-module placement; moving the test module to EOF repaired it without a
lint suppression. The final full checks passed after that repair.

Focused browser checks passed 40 geometry/surface cases, the additional two
saved-neighborhood rename cases, and 16 field cases across Chromium/WebKit.
The independent review reproduced and fixed publication/cancellation/revision
edges, per-surface shader targeting, original-index pick readback, bounded
warnings, Unicode CSV chunks, annotation-texture publication preflight,
neighborhood rename provenance, extreme contour saddle signs and clipping
before interpolation in fixed-range planes/profiles. Numeric/PNG negative
controls cover these cases. A staged installed bundle passed all 34 new methods
through 153 real helper calls, five PNGs, CSV/scopes/cancellation and native
save/reopen; that bundle predates the final field-rendering/rename repairs and
is not the final extracted-package gate.

Two full-run attempts were interrupted after exposing integration defects,
not recorded as passes. The first revealed eager metadata reads from a collapsed
panel; lazy first-open activation preserves the mounted form and the original
worker startup contract. All 34 field/preview/registration focused cases then
passed. The second exposed new per-render empty default arrays in standalone
`Viewport`, causing repeated scene rebuilds; stable module defaults repair it.
All four existing protein-renderer cases passed in both engines, including
settling, exact PNG/AO comparisons and GL cleanup. The interrupted logs are
`browser-full-interrupted-1.log` and `browser-full-interrupted-2.log` under the
evidence directory. The fresh complete run passed **604/604 cases** (302 per
engine, 20.5 minutes, one worker), without failures, skips or retries. All 257
monitored runtime/test source hashes remained unchanged through the final build,
captures and complete suite (`runtime-identity.json`, `browser-full.log`).

The user/technical/installed-agent documents are updated. The website adds one
manual and three website-only tutorials with authentic 17-atom C₇H₁₀ figures,
explicitly marked unreleased. Website validation passed 27 pages and 162 route/
viewport cases. Final figures were recaptured after the integration repairs;
their pixels remained identical and provenance now records the final source.
Static checks pass 27 pages, 1,030 local references, 70 image uses and 22 exact
downloads (25,831,599 bytes). Final route/viewport evidence is under
`tmp/2026-11-15-website/browser-csxodm/RESULT.json`.

The full local tester archive and final extracted-app acceptance passed.
Artifact: `artifacts/distributions/EigenVista-0.8.0-apple-silicon-20261116T130036Z-6a728d9-dirty.zip`;
SHA-256 `7395583e8608cfc1f960cf62e657b7af34587563a065f2bee0a27cf942c1f98d`.
This is a local, ad-hoc-signed Apple Silicon **unreleased test build**, not a
replacement for the published 0.8.0 release. Its dirty source snapshot preserves
all uncommitted plans/implementation. The independent audit verified 664 exact
eligible sources, all 57 vendored Sesmesh files (50 originals/three patches),
license/dependency archives, 13 connector files, arm64 signatures/system-only
libraries and five assets recovered from the actual Mach-O matching final dist.
Evidence: `package-audit-latest.json`, `package-final.log`.

The actual ZIP-extracted app passed all **34 new methods through 160 helper
calls**, five visually inspected PNGs, independent PySCF/linear-grid values,
SES/SAS, cancellation/recovery, scoped CSV/no-clobber, and native save/reopen.
The renamed neighborhood retained its radius, whole-residue expansion and seeds.
Transparent PNG alpha was measured: 1,389,870 clear, 680,094 partial and 187,636
opaque pixels at 1700×1328. Original inputs stayed unchanged and the owned test
app was cleaned up. Evidence: `native-latest.json` and its workspace's operation,
alpha/visual-review records. Packaging support and connector tests passed 17+6.

Only final documentation/status/plan records were updated after the package
audit; tested runtime hashes and binary assets remain unchanged. The archive's
source documentation retains its truthful pre-final-report snapshot. No release,
tag, commit, push or PR was created. Next step: the user tests the feature branch;
wait for their instruction before preparing a PR or merging. Linux qualification
remains pending access to the user's future test machines.
Temporary logs, the standalone surface probe, and coordination state live under
`tmp/scientific-inspection/` and ignored `.unlazy/scientific-inspection/`.
Vite (77799, port 5178) and the site server (97144, port 5190) remain running.
The old user debug app was PID 89325; it was observed absent during final native
acceptance, with cause/time unestablished. The agents only terminated their own
verified staged/extracted test processes. Recheck ownership before using any PID;
never stop the user's app or an unknown server without authorization.

The GitHub connector was initially missing the organization's installation.
The user repaired it: the connector now sees `uvar-apps/eigenvista` and an issue
label write/readback succeeded. Use the connector where its tools suffice;
the earlier CLI-created tracking issues are already open, not duplicates to create.

## Published baseline

Updated 16 November 2026 after publishing 0.8.0: shared application control
(#78), natural-language workflows, palette/biological control and standalone
binary setup (#79–#81). Fresh local verification, optimized packaging, extracted
native acceptance, downloaded release assets and the public website all passed.
Tag `v0.8.0` resolves to `cd0e7f3`; clean binary source is `f4ff87f`. Earlier
published assets remain unchanged. Dated entries below preserve their then-current
publication state; use the 0.8.0 release section for the current delivery record.

Published **0.7.2** adds background controls (#73),
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
The current application source is **EigenVista**, version **0.10.0**, in the standalone
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) repository. Source
lives at this repository's root, without a `next/` wrapper or legacy application
code. The icon and logo are unchanged.

EigenVista's project history comes from Molekel, the molecular visualization
application developed by Ugo Varetto from 2006 to 2010. The
[original source](https://github.com/ugovaretto/molekel) and
[original website](https://ugovaretto.github.io/molekel/) document that project.
The current Rust/TypeScript code is its new implementation; recent preview names
and subtree extraction describe development/Git provenance.

## Citation update: 16 November 2026

The user supplied the 0.8.0 Zenodo DOI `10.5281/zenodo.24273137` after publication.
DataCite confirms a findable Software record, title **EigenVista: molecular and
quantum chemistry visualization**, author Ugo Varetto, issued 2026-11-16, with
`IsVersionOf` linking to the concept DOI `10.5281/zenodo.24246123`. The version
association is supplied by the user; DataCite's separate version field is empty.
Zenodo's own page/API returned HTTP 403 to automated requests.

`CITATION.cff`, the README, About's citation section, every website footer and
the 0.8.0 release notes now reference the version DOI. Citation metadata passed
the official CFF 1.2.0 schema and matches the registered title/DOI. This is a
documentation-only follow-up; the existing release tag, binary source and
redistributables retain their identities. Fresh local website checks passed: 23 pages, 878 local references, 62 image
uses, 22 exact downloads and all 138 Chromium/WebKit route/viewport cases plus
interactions (`tmp/2026-11-15-website/browser-E6MR2E/RESULT.json`). Six additional
1440/390/320 citation layouts passed and desktop/phone captures were inspected.
An initial 320px overflow from the displayed full resolver URL was corrected by
using the bare DOI as link text, retaining its full resolver target and every
original width assertion. App runtime suites were not rerun for this metadata
change; the release results remain applicable. Evidence is under
`tmp/2026-11-16-doi-0.8.0/`.

Published in commit `705cb35a2a69727ab959136b92c920ffa838b0ff` through the
[Pages-only publisher](https://github.com/uvar-apps/eigenvista/actions/runs/43825880869).
All 77 public HTTPS files (25,599,746 bytes) match the tracked local payload,
and the public `CITATION.cff` matches exactly. The existing GitHub 0.8.0 release
body now includes the DOI while preserving its previous content. Its ZIP digest
and annotated tag identities remain unchanged; no app rebuild, retag or hosted
application tests were performed.

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

## Release 0.8.0 qualification: 16 November 2026 (local)

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

The rebuilt binary source commit is recorded in BUILD-INFO. Final website
artifact metadata and publication evidence are separate documentation changes;
verify that application/runtime hashes remain identical before tagging/pushing.
The user's debug app and existing preview servers remain running. No new
platform, Developer ID, notarization or clean-machine qualification is claimed.

## Homepage AI visibility: 16 November 2026 (local)

The homepage hero now names AI-enabled viewing in its eyebrow and adds a direct
AI overview link above the download actions, with an ordinary-language description
and a compact pending-package label. The detailed AI section remains below.
Fresh website checks pass: 23 pages, 851 local references, 62 image uses, 22 exact
downloads, and all 138 Chromium/WebKit route/viewport cases and interactions
(`tmp/2026-11-15-website/browser-WU3lQw/RESULT.json`). Six additional homepage checks
at 1440/390/320 pixels verify initial-viewport visibility and navigation in both
engines; screenshots and results are in `tmp/2026-11-16-home-ai/`. No app runtime,
version, release, commit, push or public deployment changed.

## Standalone binary connection setup: 16 November 2026 (local)

[Issue #81](https://github.com/uvar-apps/eigenvista/issues/81) corrects the second
installation error: user setup must start with an installed binary, not a local
development checkout, source compilation or project-maintenance instructions.
The user also explicitly permits autonomous URL downloads by the coding agent.
The user guide and three AI setup pages have been rewritten around a compatible
installed app, one setup prompt, and a manual packaged-launcher alternative.
The published 0.7.2 assets still predate these components; no compatible public
binary release is invented and there is no source-build fallback for users.

New package contents are self-contained: `Contents/MacOS/eigenvista-ctl` plus
`Contents/Resources/AI-connector/` containing the user guide, portable skill and
local technical reference, launcher, examples and palettes/notices. The packager
builds the control client with the converter under the same locked release/arm64
target, signs/verifies its architecture/system-only libraries, stages resources
before signing the outer app, and verifies the extracted connector hashes/modes.
`tools/package-ai-connector.mjs` shares the staging/verification implementation.
The source release's optional GPL source archive is unrelated to runtime setup.

`tools/ai-connector/Start AI connection.command` uses only system tools and the
installed binaries. With no arguments it creates persistent
`~/Documents/EigenVista/Inputs` and unique private
`Sessions/session.XXXXXX/{Results,Temporary}`. The connection descriptor is outside
Results; the printed `session-note.txt` contains only paths, never credentials.
`--workspace DIR`, repeated `--input DIR` and `--help` support noninteractive agent
setup. Bundled examples/palettes are included in the narrow roots. The launcher
starts one separate foreground app, preserving existing windows and files.
The portable skill links only its sibling `reference.md`; reading it is separate
from installing a binary, registering a host skill or starting a connection.
The website supplies identical portable instruction files at
`downloads/eigenvista-control/{SKILL.md,reference.md,README.md}`. All four lessons
use bundled/downloaded data without development paths; agents can fetch 1AON
directly into the approved input folder.

Local acceptance so far: 19 packaging tests pass, including six real-binary,
help/error/symlink/no-overwrite/extraction checks. A separate ad-hoc-signed
qualification app was built with embedded production assets and an intentionally
unreachable development URL, archived/extracted into a path with spaces, and
launched from its packaged script with system-only PATH. Its bundled helper
performed 34 calls: bundled C₇H₁₀ import/Pastel/mesh/PNG/native save and reopen,
then autonomous HTTPS 1AON download (verified original SHA), 58,870-atom import,
Pastel/AO PNG and native save. No development server or compiler/Node runtime was
available to the launcher/app. This is local binary-independence evidence, not
clean-Mac/Gatekeeper or full release qualification. Original released artifacts
and the user's running bundle were not overwritten.

Evidence is under `tmp/2026-11-16-ai-binary-install/`: `standalone.json`,
`standalone-raUH3c/native-summary.json` and native operations, extracted app/ZIP,
signature logs, and `cleanup.json`. Only owned PID 15095 was stopped after saving,
with PID/instance verification before removing its stale descriptor. User app
89325, Vite 77799 and website server 97144 remain intact. Final website static
checks pass: 23 pages, 850 local references, 62 image uses, 22 exact downloads
and 25,613,408 bytes. All 138 Chromium/WebKit route/viewport cases and interactions
passed (`tmp/2026-11-15-website/browser-XQDVdX/RESULT.json`), plus 18 targeted
320/390/1440 layout checks in both engines. The actual phone overflow came from
a slash-joined list item; ordinary comma-separated wording and scoped list
wrapping fixed it without relaxing any width assertions. An older broad table
locator matched both Codex rows after copy changes; the test now selects the
exact row header. Earlier failing logs are retained. User setup prompts and
manual commands match the packaged README, and portable links resolve within
the instruction folder or to absolute documentation URLs. Developer-file/build
dependencies are explicitly rejected by static checks on the user AI pages and
portable instruction files. App scientific/UI sources are unchanged from #80;
their 283 Rust/eight desktop/546 browser and production results remain applicable.
No version change, commit, push, release or public deployment was requested.
The [issue outcome](https://github.com/uvar-apps/eigenvista/issues/81#issuecomment-6908911216)
records the completed checks and limitations. Before the first compatible public
release, update the pending-availability statements alongside actual release
metadata; the present 0.7.2 release identity and downloads remain unchanged.

## Natural-language workflows and presentation control: 16 November 2026 (local)

The user rejected the initial tutorials' internal method names and manual GUI
handoffs. [Issue #79](https://github.com/uvar-apps/eigenvista/issues/79) now tracks
the correction; [#80](https://github.com/uvar-apps/eigenvista/issues/80) tracks
missing connector access to existing presentation features. User-facing lessons
and interaction prompts now describe desired scientific/visual outcomes. They
require no API names, JSON keys, internal identifiers or revision bookkeeping.
Technical transport/method details remain in the separate API reference and agent
skill. AGENTS explicitly preserves this distinction for future work.

The additive API v1 now has 28 methods: palette load/reset and biological
presentation/focus join the existing 24. Native palette loading uses the same
parser as the GUI with a 256 KiB preallocation read limit and existing scoped,
protected-source resolution. Browser palettes use bounded named JSON text.
Invalid files preserve the active palette and return a structured failure.
Biological color, visibility, isolation, residue-range, style inheritance and
focus controls operate existing session state and source-index helpers.
Validation is transactional; isolate/range operations restore relevant visibility
like their GUI actions. Automatic AO radius can be restored, and switching from
automatic to manual without specifying a radius retains the displayed automatic
value. Conflicting automatic/explicit-radius input is rejected before mutation.
Scientific payloads and persisted-document semantics are unchanged.

Both installation forms now include the bundled palette directory in their
explicit sample input grants. Setup checks for the newer presentation support
and asks the agent to confirm the running instance supports it. Molecular lessons
leave connection/access mechanics to setup and ask the agent to load Pastel,
choose biological colors, reset/filter/focus and prepare all views. The guide's
residue-range and mixed-chain-style examples are separate because a selected
residue range hides other chains. Temporary files use ignored `tmp/`; normal
build output paths remain the documented `target/`/`app/dist/` paths.

Local macOS formatting, 283 default Rust tests, eight desktop tests, strict
workspace/all-targets Clippy, WASM/TypeScript/production build and 13 packaging
checks passed. All 546 browser cases passed (273 per engine; no skipped,
unexpected or flaky cases), plus six focused presentation cases. The 212
monitored authored runtime/configuration files stayed unchanged during that
qualification. Twelve selected production API/representation cases passed, six
per engine; four development-only test definitions that import `/src/wasm/` were
outside that production selection. No skipped, unexpected or flaky results are
reported as passes. Full-suite JSON starts `2026-11-16T04:29:04.854Z`, duration
962,384.605 ms. Production smoke took 25.7 seconds.

Actual native replay passed **277 CLI calls**, including **19 expected rejected
requests** with unchanged accepted state, **19 real 1700×1328 PNGs** and **eight
validated native saves**. It loaded/reset the actual Pastel file, exercised
coloring, components/chains, inserted residue ranges, isolation/focus, style
inheritance and automatic/manual AO transitions. The matched-camera full-1AON
Pastel AO pair differs at 458,004 pixels; source geometry, representation,
palette, background and dimensions remain identical. Root visual review confirmed
readable AO, chain-colored assembly and focused deposited-secondary views.
Independent `unzip` array hashes and the real WASM decoder agree: component
saves retain 24 atoms; Molden retains 17 atoms, 125 basis functions, 118 orbitals,
one density and all 381 numeric-array entries; isolated/final 1AON saves retain
58,870 atoms and 35 chains. All four original input/palette hashes are unchanged.

Final website checks passed: **23 pages, 851 local references, 62 image uses,
19 exact downloads, 25,592,677 bytes**. Complete Chromium/WebKit site verification
passed all **138 route/viewport cases** and interactions. Independent visual
review covered all seven AI pages at 1440/390 px, actual ordinary-language
prompts, installer cards, outcome tables and natural image proportions. All 27
tutorial prompts are natural-language requests. The shared setup/attach prompts
and all eight manual shell snippets match the repository guide; snippets parse.
The static check rejects internal command names/manual handoffs and verifies
negative controls for the rejected wording. Existing media/download hashes remain
unchanged. Documentation links, anchors, syntax and whitespace passed checks.

Evidence: `tmp/2026-11-16-ai-workflow/` contains runtime/build/browser logs,
`browser-full.json`, `production-browser.json`, `scope-check.json`,
`source-hashes.json`, `final-text-review.json` and `visual/final-visual-qa.json`.
Native results and independent audit are in
`native/session-XPpqQn/output/retry.Lw6BNC/`; site results are
`tmp/2026-11-15-website/browser-6Mgos4/RESULT.json`. Earlier failed harness runs
remain preserved: the first expected the wrong missing-file error kind (scoped
missing paths intentionally report `scope_denied`); the next conflated palette
reset with changed near/far depth planes after focusing on a subset. A full-scene
Fit followed by the original camera pose restored the exact baseline pixel hash.
An independent palette-only roundtrip was also pixel-identical. No runtime
workaround or relaxed image oracle was introduced. The initial browser attempts
used the wrong test cwd, then forwarded query-only `revision` to `camera.set`;
the test harness was corrected before focused/full acceptance.

Only the owned native test process (verified PID 8371 and instance identity) was
stopped, after its final document was saved and idle. SIGTERM/process-death and
matching-instance checks preceded removal of its stale private descriptor;
physical normal GUI exit was not requalified. User app PID 89325, Vite PID 77799
and website server PID 97144 remain untouched. The website preview remains
<http://127.0.0.1:5190/eigenvista/ai.html>.

Work remains on main, uncommitted and unpublished. No version bump, source push,
website deployment or release rebuild was requested. Published 0.7.2 packages
still predate the connector. Qualification is local macOS only; Linux,
fresh-machine installation and live installation/sign-in of every named agent
remain unqualified. Technical APIs retain scoped files, no-clobber writes,
source protection and existing scientific/rendering ownership.
The [#79 correction ledger](https://github.com/uvar-apps/eigenvista/issues/79#issuecomment-6907839156)
and [#80 implementation ledger](https://github.com/uvar-apps/eigenvista/issues/80#issuecomment-6907839524)
record the final outcomes. All five acceptance gates are met, with zero unmet
or abandoned gates; `tmp/2026-11-16-ai-workflow/final-checks.json` records the
final source and process checks. Both issues remain open for source delivery.

## Initial connector guide and AI website tutorials: 16 November 2026 (local)

This initial documentation snapshot preceded the user-requested correction
above. Its claim of suitable user prompts was rejected: internal method names
and manual palette/biological steps were unacceptable. Its earlier checks remain
evidence of what ran, not acceptance of that user experience. The current guides
and controller supersede those limitations.

[Issue #79](https://github.com/uvar-apps/eigenvista/issues/79) tracks the requested
installation/user documentation and four website-only tutorials. The
[connector guide](ai-connector.md) provides manual installation, a copyable
agent installation prompt, attachment, jobs/cancellation, file grants, exports
and troubleshooting. It covers **Codex Desktop/CLI, Claude Code, Pi, OpenCode
and generic terminal-capable agents**. An existing Codex Desktop session needs
no separate Codex CLI. The agent supplies its model/provider; EigenVista adds no
embedded console, model credentials or MCP requirement.

The website gains seven routes: `ai.html`, `ai-install.html`, `ai-guide.html`,
`ai-tutorial-orbitals.html`, `ai-tutorial-density.html`, `ai-tutorial-ao.html`
and `ai-tutorial-representations.html`. Author them in `ai.mjs`, `ai-quantum.mjs`
and `ai-molecules.mjs` under `tools/site/content/`. The two quantum lessons use
the real C₇H₁₀ Molden calculation; the orbital lesson adapts the saved user
session. The two 1AON lessons cover atomic packing/AO and all four protein
depictions. Tutorials remain on the website, with no separate Markdown copies.
Homepage/tutorial navigation, search, sitemap, phone installer layout and the
documentation map are synchronized. The new 1700×1328 X-ray hero is a lossless
copy of the user-approved public sample-session PNG, with explicit source-preview
provenance; the other 15 curated captures retain their original bytes.

Setup uses the user's selected checkout and repository-local temporary tools,
a freshly authorized native instance and explicit existing input/output roots.
The roots are path grants, not separate read-only and write-only permissions.
Tutorial `INPUT_ROOT`/`OUTPUT_ROOT` placeholders must resolve to those actual
grants. The 1AON fixture directory needs an explicit grant or a user-placed copy
inside an already approved input root. Never silently expand a running instance's
access. Palette loading, biological coloring/isolation and per-chain styling
remain clearly identified manual GUI steps; they have no new API methods.

Fresh local macOS documentation/website acceptance passed:

- Static build/check: **23 pages, 849 local references, 62 image uses, 19 exact
  public downloads, 25,611,918 bytes**, retaining the existing 25 MiB budget.
- Complete Chromium/WebKit site suite: **138 route/viewport checks**, plus all
  interactions, image proportions, downloads, AO comparisons and video checks.
  New checks cover accessible installer cards at 390/320 px, unchanged copied
  command/prompt text, AI navigation and agent search.
- Manual desktop/phone visual review and independent content/protocol review
  found no remaining blockers. Nine shell snippets parse; shared setup and
  attachment prompts match the repository guide. Official current agent
  installation sources are linked in the guide and evidence ledger.
  Final documentation checks passed for 356 relative links, 55 Markdown anchors,
  JavaScript syntax and whitespace.
- Actual native tutorial replay: **116 CLI calls**, all four workflows and
  all seven representations, 18 PNGs and four native saves. Direct density
  volume/raycast previews created no meshes. Refining the HOMO produced 18,736
  triangles; matched-camera AO Off/On and camera restoration passed.
- Testing established that file Open retains session shader/AO/background and
  mesh generation can refit the camera. Instructions explicitly clear the shader
  for ordinary surfaces and snapshot/restore camera transforms for comparisons.
  A separate ordinary-HOMO checkpoint verified the clear-shader recipe and was
  visually inspected. It adds one PNG and one native save to the replay outputs.
- All **210 monitored authored application/configuration files** retain the
  previously qualified hashes. Full runtime suites were not rerun for this
  documentation/site change; the #78 results below remain their separate record.

Evidence: `tmp/2026-11-16-ai-docs/` (static/browser logs, `leaf-checks.json`,
`official-sources.json`, visual reviews and `native/run3/` ledgers/captures),
plus `tmp/2026-11-15-website/browser-5ok0kA/RESULT.json`. Native replay used the
default element palette; the curated Pastel/chain-color illustrations retain
their earlier GUI provenance. Manual GUI palette/color steps, fresh-machine
installation and live sign-in/use of every named agent were not repeated.
Linux qualification remains pending.

Only the owned native test process (verified PID 95781/control-file identity)
was stopped after saving its final document. Cleanup used SIGTERM, followed by
process-death and instance-identity checks before removing its stale private
descriptor. This does not qualify physical normal GUI exit. The user's native
app PID 89325 and Vite PID 77799 were preserved. The owned website preview remains
at <http://127.0.0.1:5190/eigenvista/ai.html>. No version bump, commit, push,
publication or rebuild of released packages was requested; #79 stays open for
delivery. Its [verification ledger](https://github.com/uvar-apps/eigenvista/issues/79#issuecomment-6906747808)
records the completed local work and limits. Public links to the new AI pages
become available after an authorized push/publication. The published 0.7.2
downloads still predate the connector.

## Shared application-control API: 16 November 2026

The user selected the shared application API and external connectors, explicitly
excluding an embedded console, model client, scripting runtime and visible GUI
changes. [Issue #78](https://github.com/uvar-apps/eigenvista/issues/78) tracks the
work; the [accepted decision](design/2026-11-16-application-control-api.md) records
the implementation scope. The working tree remains on main at `d48a811`; no
branch switch, commit/push, version bump or release was requested.

The implementation is complete in the working tree. Read the
[API guide](application-control.md) for startup flags, CLI examples, all 24
methods, jobs/revisions, errors, file grants and limits. Entry points:

- `app/src/control.ts`, `App.tsx` and `desktopControl.ts`: app-owned typed
  controller, real scientific flows and native attachment.
- `app/src/viewportControl.ts` and `Viewport.tsx`: optional camera/background/
  capture port; toolbar and API share final-frame/AO/alpha capture.
- `crates/eigenvista-control/`: broker/client/scoped files and `eigenvista-ctl`;
  `app/src-tauri/src/control.rs` attaches it to the single frontend document.
- `tools/control-harness/demo.mjs` and
  `skills/eigenvista-control/SKILL.md`: external deterministic demonstration and
  instructions for a coding agent. No inference SDK or credentials are added.

Native attachment requires `--control-file FILE --control-root DIR` (root
repeatable). Its authenticated loopback TCP connection is newline-delimited
JSON-RPC 2.0, **not HTTP or MCP**. Browser attachment requires `?control=1`.
Ordinary startup exposes neither a native listener nor a browser global API.
Queries omit large scientific arrays. Field previews sample without meshing;
mesh batches publish transactionally, expose real progress and permit owned
cancellation. Native writes are validated, source-protected, atomic and
no-clobber. Browser encoded Save explicitly retains dirty state. Identifiers
over the API's 512-character bound fail explicitly, rather than being truncated.
PNG receipts retain the capture revision and separately report currentRevision.

Fresh local macOS 27.0 / Apple Silicon / pinned Rust 1.99.0 verification passed:

- `cargo fmt --all --check`; `cargo test --locked`: **282 tests**, including
  ten control tests; strict workspace/all-targets Clippy; explicit desktop tests:
  **eight passed**. No existing dependency version was changed.
- `npm --prefix app run build`: optimized WASM, TypeScript and production output.
  Packaging-support tests: **13 passed**. Published ZIPs were not rebuilt.
- All **540 browser cases** passed, 270 in Chromium and 270 in WebKit, one worker,
  zero skipped/unexpected/flaky/retries. References were generated first.
  JSON report start `2026-11-16T01:44:26.368Z`, duration 923,085.35 ms. The seven
  new real API tests also passed separately in both engines (14 cases).
- The built `app/dist` passed ten additional production API cases, five per
  engine, in 18.9 seconds with no failures/flaky/skipped/retried cases. These
  explicitly selected startup/import/preview/mesh/camera/capture tests; two
  development-only tests importing `/src/wasm/` were excluded by title filter,
  not modified or reported as production passes. Eleven recorded production/
  runtime/test hashes stayed unchanged. The owned port-5189 preview was stopped.
- Actual native external harness: 31 CLI calls, Molden import/metadata,
  sampling-only volume, density meshing, both shaders, camera, four PNGs and
  native Save. Another 26 CLI guard checks plus raw auth/batch/oversized-frame
  cases passed. Real FIFO read/save/export failed promptly without blocking the
  app; subsequent sampling/camera/export remained usable.
- Independent hashes matched all five native artifacts. CLI `--check --json`
  validated the saved document: 17 atoms, 118 orbitals, one density. Native PNGs
  are 1700×1328; the transparent image has 2,019,664 empty and 2,044 fractional
  pixels. Compositing it over the selected background differs from opaque PNG
  by at most one channel level, mean 0.000332.
- All 74 normal-startup controls match the pre-change inventory. Visible
  viewport JSX is unchanged and scene captures were visually reviewed. The
  screenshots are not byte/pixel identical: mean channel difference 0.01363,
  maximum 71, across 9,978 channels. Do not claim exact pixel equality.
- A normal native instance without flags stayed alive for 34 seconds with no
  TCP sockets or control descriptor. Both owned test apps were stopped by
  verified-PID SIGTERM; the stale private descriptor was removed only after
  process-death/instance-ID checks. **Physical normal GUI exit was not
  requalified**. Broker cleanup has socket/filesystem test coverage.

Evidence lives under `tmp/2026-11-16-control-api/`: `rust-checks.json`,
`browser-full.json`, build/packaging logs, baseline/qualified UI images,
`normal-ui-result.json`, and `native-final/` ledgers/images/cleanup records.
Production smoke has its own `production-control/summary.json` and reports.
The 210 monitored authored source/configuration files remained unchanged during
final qualification; generated WASM bindings and Tauri schemas are build outputs.
The owned Vite server PID 77799 remains at `127.0.0.1:5178`.

Qualification remains local macOS only; non-Unix control activation fails
explicitly, and Linux qualification is pending. Jobs are not durable, mutations
are not idempotent, and a transport timeout does not cancel an accepted job.
Native readiness is per app start; full WebView reload behavior has not been
qualified. No signed production bundle or redistributable for this change was
created. Source version and published release remain 0.7.2; those immutable
assets do not contain this feature. Issue #78 remains open for source delivery.
Its [verification ledger](https://github.com/uvar-apps/eigenvista/issues/78#issuecomment-6905399975)
records the completed local checks; the authenticated GitHub CLI posted it after
the connector's write request returned 403. No Git push or hosted CI was run.
Earlier research/Zenodo edits and protected untracked files remain untouched.

The user successfully tested natural-language control in a separate shared
session. Its complete exported archive now lives in
[`docs/sample-ai-session/`](sample-ai-session/README.md): six-page PDF, offline
HTML, Markdown/image ZIP, six PNG assets, captured content and verification
records. All seven exchanges and six image occurrences are preserved. The move
from `tmp/session-export-mAgQf1/` preserved all original file hashes; relative
links and archive integrity were checked. This documentation-only move did not
change application behavior or rerun runtime tests.

## AI console and external-agent API research: 15 November 2026 (local)

The user requested investigation of both an EigenVista-hosted prompt console
using configurable OpenAI-compatible local/remote models and an API for external
coding agents through skills, MCP, UTCP and related protocols. The
[research report](research/2026-11-15-ai-console-and-agent-api.md) records source
evidence against `d48a811`, official protocol/provider references, both product
paths, a proposed shared app-owned command/job/state/artifact controller,
integration tradeoffs and future qualification gates. It distinguishes today's
UI automation/internal worker transport from a public viewer-control API.
UCP/AP2 are assessed under their commerce/payment meanings; current MCP revision
and inference-dialect differences are documented rather than assumed.

This is a research proposal, not an accepted implementation. No app code,
dependencies, model connections, listeners, running processes or released
artifacts changed. No issue, commit or push was requested. Provider/client
interoperability still requires the real qualification described in the report.
Fresh documentation checks passed for source revision, relative links/anchors,
Markdown structure and change scope; independent source and protocol reviews
found no blockers. Evidence: `tmp/2026-11-15-ai-research/verification.json`.
Application/native/browser tests were not rerun for this research-only update.

## Approved narrated shader demo: 15 November 2026

The user approved the female-voice preview. The website now uses that
English narration with six synchronized caption cues. The original 30-second,
1920×1080/25fps H.264 packets and approved mono 48 kHz AAC packets are unchanged;
only the container metadata differs from the preview. The final MP4 is
4,533,853 bytes, SHA-256
`e7d1f42cd018e3eadce1fcbadc8b33b0fd83e1a45443fb9051b757fba90068d3`.
The synthetic voice is HeyGen's Deirdre - Gentle & Instructive, generated through
the HyperFrames shared audio engine. Retained
[AAC](../tools/site/media/eigenvista-narration.m4a) and
[script/voice/caption metadata](../tools/site/narration.json) avoid future TTS calls.
The prepare helper checks packet identity and matching beats, stages its output,
and can recover from the tracked MP4/ledger without ignored recording metadata
or a silent master. README, website maintenance/discovery, captions, media ledger
and generated homepage/search are synchronized. Playback remains on request.
The bounded media budgets are now 5 MiB per demo and 25 MiB for the static site,
retaining the approved audio quality; actual payload is 25,239,490 bytes.

Fresh local macOS checks passed: static/deterministic generation, helper syntax,
exact recovery without the ignored recording/master, unchanged encoded streams,
all 96 Chromium/WebKit route/viewport cases and interactions (including decoded
audio and six loaded caption cues), and four desktop/320px caption layout cases.
Desktop/phone player captures were visually reviewed. The first site run exposed
native-player focus carrying into the keyboard test; starting that unchanged
skip-link check on a fresh page resolved it. Evidence is retained under
`tmp/2026-11-15-shader-voiceover/` and
`tmp/2026-11-15-website/browser-buzkKB/RESULT.json`.
The narrated video is published from
`2ac0b4df7ece7e06d15fc1665524e4fd082a6d35` by
[Pages deployment 43724445370](https://github.com/uvar-apps/eigenvista/actions/runs/43724445370).
Public HTTPS readback matched all 66 served files byte for byte, including the
narrated MP4 and captions. The unversioned homepage also matched the checked
local HTML and links to the new video hash. Publication evidence is in
`tmp/2026-11-15-shader-voiceover/public.json` and `public-homepage.json`.
Application source/version 0.7.2 and released packages are unchanged; application/native
tests were not rerun for this website-only update.

## Approved cutaway image: 15 November 2026

The user approved the oblique cutaway candidate before replacement.
`site/assets/media/quantum-clipped.webp` now uses the same cached 256³ total
density mesh at 0.04 electrons/bohr³, colors and object-coordinate clipping,
viewed with Fit, one Zoom in and a 250px/80px orbit instead of 100px/80px.
The 2050×1671 lossless WebP exactly matches the approved PNG's decoded pixels;
its SHA-256 is `0c60cc56c34bdf91342f5f552ef8b64f340187c3418d29d0df6bef44b27eb2b9`.
Provenance, capture procedure and the gallery's previous same-camera claim are
updated; generated pages carry the new image cache hash.

Fresh local macOS checks passed: static/deterministic generation, capture-script
syntax, all 96 Chromium/WebKit site route/viewport cases and interactions, and
12 targeted cutaway layout cases across Home, Gallery and Shaders at 1440/320px.
The approved render and page layouts were visually reviewed. Evidence is in
`tmp/2026-11-15-clipping-angle/` and
`tmp/2026-11-15-website/browser-I0srqK/RESULT.json`.
The approved image is published from
`319d3290fedf89c3c0434794bd6d90eeb42b8161` by
[Pages deployment 43721708221](https://github.com/uvar-apps/eigenvista/actions/runs/43721708221).
Public HTTPS readback matched all 66 served files byte for byte, including the
approved image and refreshed page URLs. Evidence:
`tmp/2026-11-15-clipping-angle/public.json`.
Application source, version 0.7.2 and released packages remain unchanged;
application/native tests were not rerun for this media/caption update.

## Zenodo upload draft: 15 November 2026

The user requested [zenodo-upload.md](../zenodo-upload.md), with suggested values
for their saved upload form through Publisher only. It describes published
release 0.7.2, its original release date and three existing release artifacts,
Ugo Varetto's authorship, GPL-2.0-or-later and the original 2006–2010 Molekel history.
The form's existing DOI reservation is identified as belonging to that draft;
it is not described as a registered/published DOI. Unknown ORCID/affiliation
details remain for the author. The selected journal community and CC BY default
are called out for correction. Form fields after Publisher are excluded.
The source HTML was read from `~/tmp/zenodo/new-upload-zenodo.html` (the supplied
folder spelling had a typo); it was not copied into this repository. Release
facts were checked through GitHub and field guidance against official Zenodo
documentation. This is a local metadata draft: no Zenodo record was submitted
or published, and no commit/push or application/site changes were requested.

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
The corrected history is published from
`6ab7e267dc3a0510ff5b3021b6113d51d5244632` by
[Pages deployment 43715299639](https://github.com/uvar-apps/eigenvista/actions/runs/43715299639).
Public readback matched About/search-index bytes and checked the author, dates,
original-project links and removal of the misleading origin wording in About
and five repository entry points. See `tmp/2026-11-15-history/public.json`.
The owned site preview was stopped; user servers were untouched.

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
