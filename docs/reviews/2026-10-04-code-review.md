# EigenVista code review — 2026-10-04

**Review performed:** 2026-10-04 11:14:42 UTC (2026-10-04 19:14:43 AWST, UTC+08:00)
**Amended:** 2026-10-04 12:28:04 UTC (2026-10-04 20:28:04 AWST, UTC+08:00) —
Linux-enablement evidence added (§8); the workspace-Clippy and desktop-shell
claims in §1 and §4 corrected after installing the one missing WebKitGTK
package; the platform-badge finding added to §3. Sections below describe the
amended state.
**Reviewed revision:** `6a5174466de4d7534b3a0d9b397121d7c0612a02` (`6a51744`) —
"Release EigenVista 0.5.1 with shader logs and packaged classic shaders"
**Branch:** `main` (tracking `origin/main`), working tree clean before and after review
**Application version:** 0.5.1
**Review host:** CachyOS Linux, kernel 7.2.8-2-cachyos, x86_64
**Not the exercised platform:** the project's recorded baseline is Apple Silicon
macOS 27. This review therefore adds Linux portability evidence and does **not**
re-qualify macOS behaviour, native dialogs, packaging, or notarization.

**Method:** read-only source and documentation review plus an independent
verification run of the documented checks that are runnable on this host.
No source file was modified. One throwaway probe script (under ignored `tmp/`)
was used to confirm one UI finding, and the native desktop window was launched
under a virtual framebuffer and inspected by screenshot (§8.1). The amendment
required installing two system packages (§6).

---

## 1. Verification actually performed

| Check | Command | Result |
| --- | --- | --- |
| Rust formatting | `cargo fmt --manifest-path Cargo.toml --all --check` | **pass** |
| Workspace Rust tests (default members) | `cargo test --locked` | **105 passed / 0 failed** |
| Clippy, default members, all targets | `cargo clippy --locked --all-targets -- -D warnings` | **pass** |
| Clippy, full workspace (before Linux prerequisite) | `cargo clippy --locked --workspace --all-targets -- -D warnings` | **failed** — `eigenvista-desktop` could not link `javascriptcoregtk-4.1` / WebKitGTK. Resolved by `sudo pacman -S webkit2gtk-4.1`; see §8 |
| Clippy, full workspace (after prerequisite) | `cargo clippy --locked --workspace --all-targets -- -D warnings` | **pass** — `Finished dev profile … 18.66s`, no warnings emitted |
| Desktop shell check | `cargo check --locked -p eigenvista-desktop` | **pass** — full Tauri / wry / WebKitGTK dependency graph compiles on Linux |
| Desktop shell test | `cargo test --locked -p eigenvista-desktop` | **1 passed / 0 failed** — `native_save_requires_native_extension_and_protects_import_sources` |
| Desktop shell build | `cargo build --locked -p eigenvista-desktop` | **pass** — `target/debug/eigenvista-desktop` (211 MB debug binary) |
| **Native Tauri window launch + render** | `eigenvista-desktop` under `xvfb-run` at 1400×900, screenshot inspected | **pass** — real UI rendered, see §8.1 |
| Production build (WASM + `tsc --noEmit` + Vite) | `npm --prefix app run build` | **pass** — `eigenvista_wasm_bg…wasm` 1,434 kB (gzip 509 kB), `index…js` 827 kB (gzip 227 kB); pre-existing chunk-size warning remains |
| Browser e2e, Chromium | `npx playwright test --project=chromium` | **60 passed / 0 failed** (~2 min) |
| Packaging support tests | `npm --prefix app run test:packaging` | **13 passed / 0 failed** |
| Local Markdown link integrity (all `*.md`) | script over repo, excluding `node_modules`/`target`/`tmp`/`artifacts`/`dist` | **226 local links, 0 missing** |
| Reference document generation | `cargo run --locked -p eigenvista-format --example reference_documents` | **pass** — 4 documents under `artifacts/references/` |
| Working tree hygiene after all builds | `git status --short` | **clean** — all outputs gitignored |

Still not run on this host after the amendment: the **Playwright WebKit** e2e
project (its bundled WebKit is an ubuntu24.04 build hard-linked to ICU 74,
which CachyOS cannot satisfy — see §8.2), the macOS tester ZIP build and its
extracted-artifact verification, ad-hoc signature/architecture checks,
Gatekeeper clean-machine install, and any *interactive* native dialog test.
The native window's rendered output was inspected, but its save/open/cancel
and window-close behaviour was not driven.

---

## 2. Strengths (keep as-is)

- **Science and format boundaries are genuinely enforced in Rust.** Document
  validation (`crates/eigenvista-core/src/model.rs:146`), source hashing with
  explicit negative-zero canonicalisation and object sorting
  (`crates/eigenvista-core/src/compute.rs:176`), per-array SHA-256, ZIP path /
  symlink / compression-method / entry-count / inflated-size rejection
  (`crates/eigenvista-format/src/lib.rs:176`), and atomic save with
  `create_new` + `fsync` + rename-or-hardlink
  (`crates/eigenvista-format/src/native.rs:20`) are all tested. No scientific
  logic leaked into TypeScript or shaders.
- **Race safety is designed in, not incidental.** Generation tokens, retired
  worker isolation, atomic multi-orbital publication behind a Rust native-encode
  preflight (`app/src/App.tsx:158`), late-read/late-failure guards, and CLI
  no-clobber destination resolution all have real regression coverage.
- **Fallible allocation discipline.** `try_reserve_exact` plus exact mesh-output
  preflight counted through the pinned mesher's public API
  (`crates/eigenvista-core/src/compute.rs:325`) replaces worst-case estimation
  without weakening the bound.
- **Honest documentation culture.** Every status entry names what was *not* run;
  there are zero `TODO`/`FIXME`/`XXX`/`HACK` markers in `crates/`, `app/src/`,
  or `tools/`.
- **Frozen, independently generated references.** PySCF fixtures and the
  ORCA `orca_2mkl` profile separation (explicit rejection of unqualified
  variants, `crates/eigenvista-import/src/molden.rs:112`) avoid using the
  implementation-under-test as its own oracle.

---

## 3. Findings

### P1 — Fresh page load is marked "unsaved" with zero user edits

**Where:** `app/src/App.tsx:239` → `app/src/App.tsx:243` → `app/src/App.tsx:195`

`example()` sets `setDirty(false)` and then awaits `compute(d)`, which
unconditionally ends in `setDirty(true)`. The initial `useEffect`
(`app/src/App.tsx:249`) runs `example()` on every cold start.

**Evidence (live, Chromium, this host):** six seconds after loading
`http://127.0.0.1:5178` with no interaction, `document.querySelector('.dirty')`
count = **1**, with the stock "Hydrogen pair / Gaussian model" document.

**Impact:** the `beforeunload` guard (`app/src/App.tsx:256`) fires a
"Leave site?" prompt for a session in which the user changed nothing, and the
unsaved-changes dot is shown immediately. Confusing and trains users to dismiss
a warning that normally means real data loss.

**Suggested fix:** pass an `initial`/`markDirty` flag through `compute()` (or
suppress the dirty transition when the generated document is byte-identical to
what was just loaded) so the built-in example starts clean. Add a browser
regression asserting `.dirty` is absent after cold start and present after the
first real edit.

---

### P1 — Renderer cannot reach the atom budget that validation admits

**Where:** `crates/eigenvista-core/src/model.rs:178` (100 000-atom budget) vs
`app/src/Viewport.tsx:286` (per-atom `SphereGeometry(radius, 24, 16)`) and
`app/src/Viewport.tsx:304` (per-bond `CylinderGeometry(…, 12)`)

Every atom gets its own geometry **and** its own `MeshStandardMaterial`; every
bond likewise. There is no `InstancedMesh` and no shared material/geometry cache.
In addition, the entire scene group is rebuilt whenever any of
`doc / grid / mode / shading / shader.vertexSource / shader.fragmentSource /
shader.target` changes (`app/src/Viewport.tsx:383`), so a mesh↔volume↔raycast
toggle or a shading switch re-creates every atom sphere and bond cylinder even
though none of them depend on those settings.

**Impact:** the declared 100 000-atom ceiling is unreachable in practice —
tens of thousands of draw calls will stall or hang the tab. Even mid-sized
real systems (thousands of atoms plus hundreds of saved surfaces) will stutter
on appearance-only changes that should be free.

**Suggested fix:** instance atoms per element (shared sphere geometry,
per-instance transform/colour) and bonds per radius class; separate the
static atom/bond layer from the surface/volume layer so mode, shading, and
shader changes do not rebuild it. Re-measure with a large synthetic structure
and record the frame cost in `docs/status.md` rather than inferring it.

---

### P2 — Only eight elements have colours and radii

**Where:** `app/src/Viewport.tsx:22` (map covers H, C, N, O, F, P, S, Cl) with
fallback `{ color: "#b294b9", radius: 1.8 }` at `app/src/Viewport.tsx:265`

**Impact:** real PDB and Molden imports containing Na, K, Mg, Ca, Fe, Cu, Zn,
Se, Br, I, B, Si, etc. all render as the *same* purple sphere labelled `Z11`,
`Z26`, …. The science is correct but the picture looks broken, and space-fill
representation is wrong for every unlisted element.

**Suggested fix:** extend the table to at least the ~30 elements that occur in
ordinary structural-biology and quantum-chemistry inputs, using a documented
CPK/periodic colour scheme and consistent radius source. Note that
`crates/eigenvista-core/src/bonds.rs:29` already provides Pyykkö single-bond
covalent radii for the full element range via `pdbtbx::Element`, so the radius
half of this can be sourced rather than hand-maintained.

---

### P2 — Fixed 160-step raymarch independent of domain size and resolution

**Where:** `app/src/volume.ts:97` (`float stepSize=(end-start)/160.0;`) and
`app/src/volume.ts:99`

**Impact:** step size scales with the entry→exit distance. Large boxes get
coarse steps that can skip thin isosurface features entirely; sampling a 256³
grid buys nothing in raycast quality and increases aliasing. There is no root
isolation beyond the 9-iteration bisection after a sign change is detected, so
tangency and multiple-root cases remain unresolved. This matches the project's
own "experimental sampled mode" label, but it is a hard quality ceiling that is
invisible to the user.

**Suggested fix:** derive step count from grid spacing and box extent (or march
in grid space), and surface the sampling cost/quality tradeoff. Keep the
documented limitation until direct analytic raycasting with root isolation
replaces it.

---

### P2 — Bond search degrades on chemically heterogeneous systems

**Where:** `crates/eigenvista-core/src/bonds.rs:81`

`search_radius = radii[i] + max_radius + TOLERANCE_ANGSTROM` uses the **global**
maximum covalent radius for every query. A single large atom in a large
structure inflates every neighbour query toward quadratic candidate volume.
The failure mode at `crates/eigenvista-core/src/bonds.rs:96` is a hard
`MAX_CANDIDATES` (2 000 000) error rather than graceful degradation, so a
plausible input can become unopenable.

**Suggested fix:** query with a per-pair bound (e.g. index lookup at
`radii[i] + maxPossiblePairRadius` computed from a sorted radius list, or a
bucketed/binned approach by radius class) and keep the exact per-pair test.
Add a worst-case timing/candidate-count test on a deliberately heterogeneous
structure so the regression is measurable.

---

### P2 — Platform badge claims "macOS desktop" on Linux

**Where:** `app/src/App.tsx:934`

```tsx
Rust / {native ? "macOS desktop" : "WebAssembly"}
```

`native` is simply `isTauri()` (`app/src/files.ts:5`), which is true on **every**
Tauri platform, not only macOS. The status-bar badge therefore asserts macOS for
a Linux — and equally for a Windows — native build.

**Evidence (this host, native Tauri shell under Xvfb):** the footer of the
running Linux window reads **"Rust / macOS desktop"**, captured in
`tmp/linux-tauri.png`. The same screenshot independently confirms the P1
cold-start dirty dot in the native shell with no user interaction.

**Impact:** a user-visible falsehood outside the project's own platform claims.
It also makes off-macOS test reports ambiguous, because a tester can read the
badge as platform evidence and be misled.

**Suggested fix:** derive the OS instead of assuming it — Tauri exposes it via
`@tauri-apps/plugin-os` (`platform()` / `type()`), or read it from the
`navigator.userAgent` string Wry injects — or use a platform-neutral label such
as `Rust / native desktop`. Add a check that the badge is not macOS-specific
when `isTauri()` is true on a non-macOS host.

---

### P3 — Smaller items

1. **Confirmation arrives after the expensive work.**
   `app/src/App.tsx:357` asks "Replace the current document? Unsaved changes
   will be lost?" only *after* the file has been read, imported, and its preview
   sampled. This is deliberate race-safety (a late read must not clobber a newer
   document), but for a large file the user pays the whole import before being
   allowed to cancel. Consider confirming before the sampling step while keeping
   the token guard.

2. **Two buttons, one behaviour.** `app/src/Viewport.tsx:448` "Fit scene" and
   `app/src/Viewport.tsx:455` "Reset view" both call `fit()`. Either give
   "Reset view" a distinct meaning (restore default camera orientation as well
   as framing) or collapse the controls.

3. **Provenance text is load-bearing.**
   `crates/eigenvista-import/src/lib.rs:96` recovers PDB report warnings by
   string-prefix matching (`entry.starts_with("Structure-only") ||
   entry.starts_with("PDB parser:")`) against provenance strings. Any rewording
   silently drops user-visible warnings. Return warnings structurally from the
   parser instead of round-tripping them through prose.

4. **`preserveDrawingBuffer: true` is always on.**
   `app/src/Viewport.tsx:146` keeps the drawing buffer resident solely for the
   PNG export button. This costs GPU memory and bandwidth continuously; consider
   re-enabling it only around export, or render to an explicit
   `WebGLRenderTarget`.

5. **The pinned toolchain is documentation-only.** There is no
   `rust-toolchain.toml`; the 1.92.0 pin lives only in
   `docs/development.md` and `AGENTS.md`. A fresh machine or agent can silently
   build with a different compiler. Adding a toolchain file would make the pin
   enforced (and would have made this host's failure self-correcting).

6. **`docs/status.md` is append-only and now 785 lines.** Current state is hard
   to locate. A short "current baseline" table at the top, with older evidence
   moved to a dated archive file, would keep the honest history while making the
   live gates findable.

---

## 4. Documentation accuracy drift

These documented counts are not reproducible from the current tree.

| Documented claim | Reproducible today |
| --- | --- |
| "108 workspace Rust tests" (`docs/status.md`, `docs/handoff.md`) | **105** default-member tests on Linux. **107** including the two `#[cfg(target_os = "macos")]` CLI tests at `crates/eigenvista-convert/tests/cli.rs:327` and `:353`. **108** only if `-p eigenvista-desktop` is folded in — which `AGENTS.md` explicitly states is *not* part of `cargo test`. |
| "114 Chromium/WebKit browser cases" | **60 per engine = 120** with the current 12 spec files. |
| `AGENTS.md` verification step 3: `cargo clippy --workspace --all-targets -- -D warnings` | **Runnable on Linux, but only after a prerequisite is installed.** It fails out of the box because `eigenvista-desktop` needs `webkit2gtk-4.1`; after `sudo pacman -S webkit2gtk-4.1` it passes cleanly (§1). `ci/README.md` hints at "Tauri's native platform prerequisites", but the verification order in `AGENTS.md` and `docs/development.md` never names the package, so a Linux contributor hits an unexplained failure. |

Recommendation: restate counts as "as of <date>, <platform>" or derive them in
the evidence text from the run itself, and add the Linux desktop prerequisite
(and the fact that default-member checks are the portable subset) to the
verification order.

---

## 5. Gates that remain unverified

Narrowed by the amendment: the desktop shell now builds, launches and renders on
Linux, so only its *interactive* behaviour remains open here.

- Native Tauri shell **interaction**: dialog save/open/cancel/replace, the
  window-close warning, and native PNG download handling. The shell now builds,
  launches, and renders on Linux (§8.1), but its dialogs and close behaviour
  were not driven.
- WebKit **browser** rendering and pixel/camera behaviour — the Playwright
  WebKit project still cannot launch on this host (bundled ICU 74 vs system
  ICU 78, §8.2). Note this is distinct from the desktop shell, which uses the
  system WebKitGTK 4.1 and does work.
- macOS tester ZIP build, extracted-artifact verification, ad-hoc signature and
  architecture checks, Gatekeeper clean-machine installation, notarization.
- Linux and Windows as supported platforms — still **not** a support claim.
  This review now demonstrates that on Linux x86_64 the scientific crates, the
  browser app, the Chromium e2e suite, **and the native Tauri desktop shell**
  all build, pass, and render. That is strong positive portability evidence for
  Linux, but it is one rolling-release distribution on one machine, and Windows
  remains entirely untested.
- Broader scientific qualification: spatial-integral convergence, extreme
  diffuse/tight exponents, additional producer conventions beyond the frozen
  fixtures.
- Topology-certified meshing (MC33/Lewiner) replacing classic `mcubes`; direct
  analytic raycasting with robust root isolation; shrinkwrap; transfer-function
  editing; schema freezing/migrations; native parallel jobs.

---

## 6. Environment changes made to run the checks

The host's system Rust was **broken** before this review:
`rustc -vV` failed with
`symbol lookup error: /usr/lib/librustc_driver-…so: undefined symbol: _ZNSt7__cxx1112basic_stringIcSt11char_traitsIcESaIcEE9_M_mutateEmmPKcm, version LLVM_23.1`
(pacman `rust 1:1.99.0-1` mismatched against system LLVM/libstdc++).

To obtain real evidence, the following were installed. The first group is
**user-local only** (`PATH` was never modified globally). The second group is
**two system packages installed with `sudo pacman`** during the amendment — a
real system change, reversible with `sudo pacman -Rns <pkg>`:

- rustup into `~/.rustup` and `~/.cargo/bin` (`--no-modify-path`)
- Rust toolchain `1.92.0` (the documented pin) plus `rustfmt` and `clippy`
- `wasm32-unknown-unknown` target
- `wasm-bindgen-cli 0.2.108` (matching the pinned crate) into `~/.cargo/bin`
- `npm --prefix app ci` → `app/node_modules` (89 packages; `esbuild` postinstall
  was blocked by the user's npm `allowScripts` policy, but the
  `@esbuild/linux-x64` optional package is present and Vite works)
- Playwright Chromium headless shell into `~/.cache/ms-playwright`

**System packages installed during the amendment.** The original statement that
"no system package was installed" applied only to the first session and is now
corrected:

| Package | Version | Why |
| --- | --- | --- |
| `webkit2gtk-4.1` | 2.52.6-1 | The only missing prerequisite for the Tauri desktop shell on Linux. Pulled **no additional dependencies** — `gtk3`, `libsoup3`, `openssl` and `pkgconf` were already present, and `webkitgtk-6.0` was already installed and shares most of the closure. |
| `xorg-server-xvfb` | 21.1.24-1.1 | Only because this agent shell is a headless TTY (`DISPLAY`/`WAYLAND_DISPLAY` unset, no compositor process); needed for a virtual framebuffer to launch and screenshot the native window. Not needed by the app itself. |

Both installs ran with `--noconfirm` and each produced a snapper post-transaction
snapshot, so the transactions are rollback-able on this host.

Repository side: `target/`, `tmp/`, `app/dist/`, `app/src/wasm/`, and
`artifacts/` were created and are all gitignored. **`git status` is clean.**
No tracked file was created, modified, or deleted by this review other than this
review document.

---

## 7. Suggested next steps, cheapest value first

1. Fix the P1 dirty-on-cold-start flag and add a browser regression for it.
2. Instance atoms/bonds and decouple them from mode/shading/shader rebuilds —
   largest user-visible gain per unit of work.
3. Extend the element colour/radius table to the elements real imports contain
   (reuse `pdbtbx` covalent radii where possible).
4. Tighten the bond-search radius and add a heterogeneous worst-case test.
5. Add `rust-toolchain.toml` so the 1.92.0 pin is enforced rather than hoped for.
6. Fix the platform badge so a Linux/Windows native build does not report
   "macOS desktop" (`app/src/App.tsx:934`) — a one-line change that removes a
   user-visible falsehood.
7. Correct the test-count claims and **name the Linux prerequisite package**
   (`webkit2gtk-4.1`) in the `AGENTS.md` / `docs/development.md` verification
   order, so `clippy --workspace` and `-p eigenvista-desktop` stop failing
   inexplicably for Linux contributors.
8. Add Linux x86_64 as *observed-working* evidence for the scientific crates,
   browser build, Chromium e2e, **and the native Tauri shell** in
   `docs/status.md` — without converting it into a support claim.
9. Decide how WebKit e2e should run off-macOS: an `ubuntu:24.04` container is
   the clean answer (it is Playwright's own build target), rather than trying to
   satisfy ICU 74 on Arch-derived systems.

---

## 8. Linux enablement — how to run the full stack here

This section answers the question: the project has only been run on macOS, so can
it run on this Linux platform? **Yes** — including the native desktop shell.

### 8.1 Steps that made the native shell work

Starting from the already-prepared user-local toolchain (§6), exactly one package
was missing for the desktop shell:

```sh
# Tauri v2 Linux prerequisite — the only genuinely missing piece
sudo pacman -S webkit2gtk-4.1        # 2.52.6-1, no extra dependencies pulled

# Only for headless launch/screenshot from a TTY; not needed by the app itself
sudo pacman -S xorg-server-xvfb     # 21.1.24-1.1
```

Then, from the repository root with the documented toolchain:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp" RUSTUP_TOOLCHAIN=1.92.0

cargo check  --locked -p eigenvista-desktop                      # pass
cargo test   --locked -p eigenvista-desktop                      # 1 passed
cargo clippy --locked --workspace --all-targets -- -D warnings   # pass
cargo build  --locked -p eigenvista-desktop                      # target/debug/eigenvista-desktop

# launch the native window with no display server available
xvfb-run -a --server-args="-screen 0 1400x900x24" \
  ./target/debug/eigenvista-desktop
```

**Rendered output verified by inspecting the screenshot**
(`tmp/linux-tauri.png`, 1400×900, mean 0.786 / σ 0.335 — real content, not a
blank or black frame):

- Top bar: `EigenVista PREVIEW`, document title "Hydrogen pair / Gaussian
  model" with the amber unsaved-changes dot (P1 reproduced natively).
- Left panel: 2 atoms / 1 bond / 2 basis functions, `Ball and stick`, ORBITALS
  list with Bonding sigma (spatial / occ. 2) and Antibonding sigma\*
  (spatial / occ. 0, selected), DENSITY MATRICES "Total electron density",
  and the provenance paragraph.
- Viewport: WebGL2 renders the teal and magenta antibonding σ\* lobes with both
  atoms and the bond cylinder; the zoom/fit/reset/capture toolbar is present.
- Right panel: Mode "Isosurface mesh", isovalue 0.08 bohr⁻³ᐟ², grid 40³,
  Generate surfaces, positive/negative swatches, opacity 78 %, Diffuse shading,
  and the Surface shader controls.
- Status bar: `3,544 triangles / 0.12 s` and the incorrect
  `Rust / macOS desktop` badge (new finding, §3).

The only runtime diagnostics were benign software-rendering warnings from Xvfb:
`MESA-EGL: warning: DRI3 error: Could not get DRI3 device` and
`Ensure your X server supports DRI3 to get accelerated rendering`. WebGL2 works;
rendering is CPU-side (llvmpipe) under Xvfb, so this is **not** a GPU
performance measurement and must not be quoted as one.

### 8.2 What still cannot run on this host, and why

**Playwright WebKit — 60/60 fail at launch.** Playwright reports
`your OS is not officially supported by Playwright; downloading fallback build
for ubuntu24.04-x64`, and its bundled WebKit is linked against Ubuntu 24.04's
ICU. Direct inspection:

```
$ ldd ~/.cache/ms-playwright/webkit-2359/minibrowser-gtk/bin/WebKitWebProcess
libbacktrace.so.0 => not found
libicudata.so.74  => not found
libicui18n.so.74  => not found
libicuuc.so.74    => not found
```

CachyOS ships `icu 78.3-1.1`, so the `.so.74` sonames cannot be satisfied by
any official package, and `libbacktrace.so.0` is likewise absent.
`PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1` silences the installer warning but
cannot fix the soname mismatch — every test dies with
`browserType.launch: Target page, context or browser has been closed`.

Options, best first:

1. Run the WebKit project in an `ubuntu:24.04` container (Playwright's own
   build target) — clean and reproducible.
2. Vendor ICU 74 plus `libbacktrace` into a private directory and set
   `LD_LIBRARY_PATH` for the test run only. Works, but is a manual, unsupported
   hack that must not leak into the app or into packaging.
3. Accept Chromium-only automated coverage off-macOS and keep WebKit as a
   macOS-only gate, documented as such.

Note the distinction: the **desktop shell uses the system WebKitGTK 4.1 and
works**; it is only Playwright's *bundled* WebKit that cannot start.

**macOS-only, by nature:** the tester ZIP build, ad-hoc signing, architecture
checks, Gatekeeper clean-install verification, and notarization.

**Linux packaging (untested):** `app/src-tauri/tauri.conf.json` declares
`"bundle": { "targets": ["app"] }`, and `app` is a macOS bundle type. Producing
a Linux package would require adding `deb`/`rpm`/`appimage` plus Linux icons, and
there is no `package:linux` wrapper analogous to `package:macos`. Not attempted
in this review.

---

*Review produced by an automated agent. Tests reported above were actually
executed on 2026-10-04 on the host described in the header (initial pass
11:14 UTC, amendment 12:28 UTC); items listed as unverified were not run.*
