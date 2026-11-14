# EigenVista agent guide

Standalone [`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) checkout.
Rust workspace, `app/`, `crates/`, `docs/`, `tools/`, and `fixtures/` live at the
repository root. There is no `next/` wrapper and no legacy C++ / Molekel build here.

EigenVista was extracted from the Molekel rewrite (see [migration](docs/migration.md)).
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
- [Docs index](docs/README.md) · [User guide](docs/user-guide.md) · [Status](docs/status.md)

## Layout that is not obvious from names

- Unreleased source implements Plan 007's metadata prerequisite and first four
  biological views, tracked by #62–#66 and developed on
  `codex/biological-structure-views`. Read the
  [biological-view decision](docs/design/2026-11-14-biological-structure-views.md)
  and [verification/delivery ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097)
  for exact source, PR and actual full-suite/final-head results. The published 0.6.0
  package predates this work; its version/tag/assets stay unchanged.
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

- Current source version **0.6.0** includes #59 molecular screen-space ambient
  occlusion. The version bump synchronizes all eleven own metadata values;
  dependency/toolchain pins and scientific profiles remain unchanged. Read the
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
  full physical targets proportionally capped at 1024 (ideal payload at most
  28 MiB). Automatic radius is 5% of the atom-coordinate box diagonal in
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
  Separate resource checks still exercise the 1024 cap, and actual-app tracked
  1AON remains the primary visual qualification. The published 0.6.0 inventory was
  466 tests, 233 per engine, including 10 AO cases per engine. Current source
  discovers 504 cases (252 per engine), adding 19 biological cases per engine.
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
  `eigenvista-convert`, `eigenvista-wasm`, plus `app/src-tauri` (`eigenvista-desktop`).
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

Standard verification order for runtime changes (details and coverage map in
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
  Keep MessagePack/decompression/column/output bounds before allocation, the
  original input-byte digest, and shared core mmCIF scientific interpretation.
  String indices below the `-1` sentinel are errors; IntegerPacking produces
  signed Int32 values even when its packed words are unsigned. Preserve source
  float widths and Unicode dictionary boundaries. See the
  [BinaryCIF/capture decisions](docs/design/2026-11-06-binarycif-and-capture.md)
  and independently encoded [fixtures](fixtures/bcif/README.md).
- The viewport deliberately uses `preserveDrawingBuffer: false`. PNG export
  renders and reads synchronously in the same task. Asynchronous backbuffer
  reads are not reliable evidence: existing browser pixel tests use the
  compositor via `app/tests/scenePixels.ts`, with an independent PNG oracle.
  Keep idle/camera/resize/signed-field export and visible-error recovery checks.
- Bond queries use exact radius-bucket trees with each bucket's observed maximum;
  preserve pair cutoffs, deterministic ordering, explicit precedence, and work/
  allocation guards. mmCIF declarations resolve only against selected source
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
  automatic packing is NO-GO without a bounded benefit/budget raw-fallback policy.
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
- Treat imported documents as untrusted. Keep validation, allocation bounds,
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
  scenarios, timing samples, signs or thresholds. Use the traced CI config and
  actual hosted results; see the
  [browser-scheduling design](docs/design/2026-11-12-browser-verification-scheduling.md).
- The [Verify workflow](.github/workflows/verify.yml) checks Linux Rust/WASM/
  browser/package gates and explicit macOS desktop tests. Preserve pinned tools,
  local temporary storage, read-only permissions and bounded failure artifacts.
  Inspect actual runs at the PR head before merging; configuration alone is not
  a passed gate. Hosted tests do not qualify packaged Linux/Windows releases or
  physical macOS lifecycle/file-dialog interactions. See [CI](ci/README.md).
  Require all four job results: Linux Rust, macOS desktop, Chromium and WebKit.
  Browser projects run on independent runners with one worker each, unchanged
  35-minute test-step/60-minute job bounds and distinct failure artifacts. Do
  not treat one successful engine or a partially timed-out suite as a full pass.
- Publication uses `eigenvista_format::validate_document` through the distinct
  WASM export, sharing exact semantic/entry/manifest/uncompressed-byte preflight
  with Save without ZIP compression. The older WASM `validate` remains model-only.
  Keep both contracts, source hashes and format limits; never replace publication
  validation with only a mesh-size estimate. Zero-occupation Molden terms may be
  skipped only after full orbital validation; virtual orbitals stay in documents.
- This is a development preview, not v1 or the historical M0-M7 plan. Do not mark
  those complete from preview checks. Record evidence in `docs/status.md` and
  behavior changes in the user/architecture docs.

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
