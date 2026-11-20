# CachyOS Linux desktop preview — 20 November 2026

Tracked by [#108](https://github.com/uvar-apps/eigenvista/issues/108), developed
on `codex/linux-system76` from `fa410bab79ed533561aa41d10a665f227e443cfa`.
The user authorized committing and pushing the qualified implementation on
20 November 2026. No new public release, version, tag, PR or merge is requested.
The qualified archive retains its original pre-commit dirty-snapshot identity;
the public 0.10.3 Mac download and Zenodo DOI remain unchanged.

## Publication follow-up

The user subsequently authorized PR merge, current 0.10.3 release notes,
commit/push, Linux asset publication and a website update. PR #109 merged the
qualified implementation as `ea65d62e829c0427c592032bdb716356bd8e2f56`.
A clean committed-source package is being prepared. The original Mac assets and
v0.10.3 tag remain immutable; the added Linux package records its own source.
The development archive described below remains historical evidence. See the
living handoff for the final published artifact and acceptance results.

## Runtime and package decision

Build natively on `ugo@system76.local`: CachyOS x86_64, Intel i7-9750H
(six cores/twelve threads), approximately 64GB RAM, Fish login shell. This is
an SSH-only host; no desktop environment was installed. The qualified runtime
has glibc 2.44, GTK 3.24.52 and WebKitGTK 4.1 version 2.54.1. The pinned project
Rust/Cargo 1.99.0 and wasm-bindgen 0.2.108 live under the checkout's ignored
`tmp/toolchains/`; system Rust 1.98.1 and the login shell remain unchanged.

The package is a tar.gz prefix with three executables in `bin/` and resources
in `share/eigenvista/`. Tauri embeds the same production frontend/WASM. The
converter, scientific crates, shared application controller and connector
protocol are unchanged. The Bash AI launcher locates either this Linux prefix
or the existing Mac bundle and inherits the display environment. It does not
create a display. An arbitrary fifteen-input-directory launcher cap was removed;
native qualification grants twenty additional input directories.

The packager verifies actual ELF x86_64 binaries, resolved system libraries,
source/dependency archives and notices, source stability, production assets,
original/extracted converter-WASM parity and complete extracted byte/mode
parity. It publishes complete files locally with no-replace hard links. It
does not upload, install or claim bit-for-bit rebuild reproducibility.

This is a CachyOS-qualified preview, not a universal AppImage. An older glibc
baseline, Debian/RPM installer, desktop integration and Windows each need
separate work and runtime tests. Reusing Rust/TypeScript avoids another
scientific implementation; it does not remove native runtime qualification.
Tauri's [AppImage limitations](https://v2.tauri.app/distribute/appimage/#limitations)
also require choosing an appropriately old glibc/WebKitGTK build baseline;
bundling a rolling-distribution build does not establish older-system support.

## Dependency and licensing setup

Normal package downloads encountered stale mirrors; a cached CachyOS package
retry failed signature verification without committing an installation. Exact
official Arch packages and detached signatures matching the host's existing
package database were obtained from the Arch archive and installed using normal
verification. Signature checks were never disabled; no full system upgrade or
shell-profile modification was performed. Setup logs remain in remote
`tmp/linux-port/dependencies*.log`.

The generated Linux-only cargo-about configuration accepts the existing locked
`target-lexicon` declaration `Apache-2.0 WITH LLVM-exception`. The Mac policy is
unchanged. Locked `dlopen2` 0.8.2 and `dlopen2_derive` 0.4.3 both omit their full
license from the published crate. Their crate checksums, common source commit
and exact upstream MIT text were independently checked. The Linux supplement
in `packaging/licenses/linux/` binds that full text to both crates. Licensing
preflight runs before expensive compilation. No dependency was upgraded or
notice guard bypassed.

The final provenance audit found macOS AppleDouble sidecars introduced by the
initial Mac-to-Linux source transfer, plus a generated browser QA image. The
clean packager excludes `._*`, `.DS_Store` and `__MACOSX` by path component
**before filesystem access**; a real symlink-loop negative control verifies
this ordering. Generated `app/artifacts/` output is ignored. The exact owned
sidecars/image were preserved under repository-local tmp, not broadly deleted.
Future tar transfers from Mac must disable copyfile metadata. The final source
archive has no such metadata or QA output. No scientific or application source
changed for this correction.

## Headless native qualification

SSH automation explicitly invokes `/bin/sh -s`, sources
`/home/ugo/projects/eigenvista/tmp/linux-port/env.sh`, and sets `TMPDIR`, `TMP`
and `TEMP` to the remote repository's `tmp/`. Interactive Fish instead sources
`tmp/linux-port/env.fish`; those ignored setup files were tested under Fish.

Native acceptance used a dedicated authenticated TCP Xvfb display. Its tested
server arguments were:

```text
Xvfb :99 -screen 0 1440x960x24
  -nolisten unix -nolisten local -listen tcp -nolock
  -auth /home/ugo/projects/eigenvista/tmp/linux-port/xauthority
```

Xvfb must run as root for this version to honor `-nolock`. Both Unix transports
must be disabled; `-nolisten unix` alone is insufficient. The server was started
with passwordless sudo and explicit repository-local temporary variables. The
app ran as `ugo`, with `DISPLAY=localhost:99`, the private mode-600 Xauthority
file, and separate repository-local `XDG_RUNTIME_DIR`, `XDG_CONFIG_HOME`,
`XDG_CACHE_HOME` and `XDG_DATA_HOME`. Runtime directories were mode 700. Normal
user preferences were untouched. Never publish the authority cookie or connector
descriptor contents.

An initial unprivileged display experiment incorrectly assumed `-nolock` was
effective and created an X99 lock/socket in system temporary storage. It was
identified, disclosed and stopped; that server removed its files. Subsequent
qualification used the corrected setup above, verified no X99 system-temporary
files, and stopped only the owned display and app groups using recorded process
identity. An unrelated pre-existing display and unrelated Docker services were
left running. Do not use an ordinary `xvfb-run` invocation as a substitute: its
default temporary/socket behavior does not meet this project's storage rule.

This proves actual packaged GTK/WebKit/controller operation on a test display,
not physical native mouse/file-dialog/close behavior, Wayland or the desktop
environment. The isolated display's GL probe reports Mesa llvmpipe 26.2.2.
WebKit masks its JavaScript renderer as “Apple GPU” even on this Linux host;
that string is not hardware evidence. Host Chromium's explicit EGL backend was
independently identified as Intel UHD 630. NVIDIA rendering was not qualified.

For interactive SSH-only browser use, follow the [Linux guide](../linux.md).
That workflow runs the frontend on the Mac browser through a tunnel; it is
separate from native Linux acceptance.

## Qualified development package

Archive under `artifacts/distributions/` on both machines:

`EigenVista-0.10.3-linux-x86_64-20261120T135729Z-fa410ba-dirty.tar.gz`

Bytes: **82,811,544**. SHA-256:

`ba8a941a9c51402dbca16ba1d42a41ac9ff23232e380db34dde7c2d2c4110309`

Its checksum and build-information companions identify the same snapshot.
Source manifest SHA-256:

`419c7878504d7c8cc0c27be1e0faf9e3c519ec13c7f11133a7152b02cd5838f3`

Independent extraction checked 736 archived source files, five embedded
production assets and 64 staged resources. The extracted prefix used for native
qualification remains at `/home/ugo/projects/eigenvista/tmp/linux-port/EigenVista-v3`.
The earlier `EigenVista` and `EigenVista-v2` prefixes are diagnostic history, not
this final candidate.

The archive contains its exact pre-completion-documentation snapshot. Later
living handoff/qualification records describe the tests and do not rebuild or
alter its binaries. `sourceDirty:true` accurately identifies the development
snapshot at build time; `fa410ba` alone does not contain these changes.

Actual extracted launcher/app/helper acceptance passes 34 inspection methods
through 3,432 calls and eleven PNG exports. It includes independent 323-point
scalar verification, plane supersession, real progress/cancellation, full
58,870-atom 1AON SES (2,091,126 vertices; 4,182,788 triangles), cached Save/reopen,
selection, transparent output and twenty additional input roots. A supplement
passes 206 more calls and fifteen PNGs: HOMO, total density and signed Cube
fields at 48³ through both volume and ray-cast renderers with **zero saved
meshes**, trace/ribbon/cartoon, Pastel/AO, full 1AON chain cartoon, protected
source aliases, default refusal to overwrite and output-scope escape rejection.
All 26 PNGs were visually reviewed. Some diagnostic annotations overlap or have
low contrast; these are functional QA captures, not gallery compositions.
Private descriptors and owned native processes were cleaned up.

## Regression checks and changes found during qualification

The Rust scientific/native sources, toolchain and dependency pins, file formats,
icon and allocation policy are unchanged. Linux passes 371 default workspace
tests plus fourteen explicit desktop tests, formatting, strict all-target
workspace Clippy, production WASM/frontend and debug/optimized native builds.
The Mac workspace passes 387 tests, formatting and strict Clippy; the current
frontend/native build and all 32 packaging checks pass as well.

Linux font fallback exposed a real one-pixel topbar overflow at a 320-pixel
viewport. The mobile heading now scales within 16–18px while preserving button
sizes. Final Linux browser qualification passes all **752 cases**: 376 host
Chromium cases in 16.3 minutes and 376 WebKit container cases in 25.3 minutes.
The current-source Mac run also passes all **752 cases** in 21.4 minutes. All
three runs have zero failures, skips, flaky cases, global errors or retries.
The final source audit excluded ten Mac metadata entries and one generated QA
image from the old 424 candidate runtime entries. All **413 genuine runtime/
test/input files** are byte-for-byte unchanged between the passing browser runs
and this clean package, on both machines. The final records are in the living
handoff. All three executable hashes are also identical to the earlier tested
package; its v2 archive is retained as diagnostic history.

Three test-harness issues were corrected without reducing rendering assertions:
the dense palette fixture now preserves the explicitly selected Chromium EGL
backend; its timeout honors the runner's requested duration; startup waits for
the actual ready footer, and scroll-restoration expectations wait for the real
`scrollend` event rather than recording an intermediate wheel position. Dense
qualification retains all 58,870 atoms, full geometry and eight palette/AO
captures. WebKit's focused dense case takes about six minutes on this host.

The Linux WebKit browser suite runs locally in the matching Playwright 1.63.0
Noble container because its downloaded browser's runtime libraries differ from
CachyOS. Container temporary storage is physically backed by the repository;
host-native GTK/WebKit qualification above is independent of that container.
No hosted application CI ran.

Evidence is retained locally in `tmp/linux-system76/` and remotely in
`tmp/linux-port/`; acceptance gates are in `.unlazy/linux-system76/`. Issue #108
remains open for review and subsequent integration. Physical desktop, native
hardware GPU/Wayland, clean installations, older glibc and other distributions
remain qualification gaps.
