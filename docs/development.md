# Building and running from source

For an already packaged application, use the [user guide](user-guide.md).
This guide is for the standalone EigenVista repository, which contains no
legacy C++ application or legacy build system.
Commands below start from the **repository root** unless explicitly stated.
The current app is EigenVista; the npm package is `eigenvista`, Rust packages
and crate directories use `eigenvista-*`, and browser bindings are generated as
`eigenvista_wasm`. The workspace is at the repository root, not in `next/`.

## Prerequisites

The exercised environment is an Apple Silicon Mac running macOS 27, Rust
1.99.0, arm64 Node.js 26 with npm, and wasm-bindgen CLI **0.2.108**. These are
recorded tested versions, not a fully qualified minimum-version matrix. Cargo
and npm dependencies are locked. The checked-in `rust-toolchain.toml` selects
Rust 1.99.0, Clippy, Rustfmt, and `wasm32-unknown-unknown` for repository commands.

- Install Rust/rustup and Node.js/npm, and make their executables available in
  the shell. An arm64 Node installation is required by the tester packager.
- On macOS, install Xcode command-line tools (`xcode-select --install` if absent).
  Native platform prerequisites are described by [Tauri](https://v2.tauri.app/start/prerequisites/).
- Initial dependency installation/builds require network access. Running the
  completed native application on local files does not require a server.
- Python/PySCF is needed only to deliberately regenerate independent reference
  data, not to build the app or run the normal tests.

The browser frontend uses WebGL2. Linux also needs its distribution's Tauri/
WebKitGTK native prerequisites for the desktop shell; Windows has separate
toolchain/WebView2 requirements. Neither is an already verified release target.

## Fresh checkout setup

Check out the user-selected branch of `uvar-apps/eigenvista`, then open a shell
at its repository root. The migration starts on `main`; inspect the actual
checkout rather than switching branches. If starting from the
tester source archive, extract it into a working directory and use that directory
as the root; it includes required test fixtures but no Git history.

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
rustup show  # installs/selects the repository toolchain and declared components
cargo install wasm-bindgen-cli --version 0.2.108 --locked
npm --prefix app ci
```

Keep the temporary-directory environment in every build/test shell. **Never
use system `/tmp`.** Project wrappers also create/use the repository's ignored
`tmp/`, including child build tools. An explicit `RUSTUP_TOOLCHAIN` environment
variable overrides the repository selection; unset it for normal pinned builds
or record it when deliberately testing a different compiler. Installing
the CLI is needed once; its version must match the pinned wasm-bindgen crate.

Useful checks are `rustc --version`, `node --version`, `node -p process.arch`,
`wasm-bindgen --version`, and `xcode-select -p`. Do not solve a binding-version
mismatch by updating one side of the bridge independently.

## Run the viewer

Choose **one** development command:

```sh
npm --prefix app run dev
```

This builds WASM and starts Vite at `http://127.0.0.1:5178`. Open that address in
a WebGL2-capable browser. Stop your server with Ctrl-C when finished.

```sh
npm --prefix app run desktop
```

This starts Tauri and its own Vite server on the same port. Stop a separately
started server that you own before using this command; do not kill unknown
processes or the user's running packaged app. A separately installed tester
app does not use the development port.

The port is strict, not automatically incremented. If it is occupied by another
project, choose a free port and keep [Vite](../app/vite.config.ts),
[Tauri's devUrl](../app/src-tauri/tauri.conf.json), and both Playwright URLs in
[its config](../app/playwright.config.ts) aligned. Playwright currently reuses
an existing server: verify it belongs to this checkout before trusting results.

## Build outputs

| Command from the root | Result |
| --- | --- |
| `npm --prefix app run wasm` | Optimized Rust/WASM and web bindings in `app/src/wasm/` |
| `npm --prefix app run build` | WASM, TypeScript checking, and production frontend in `app/dist/` |
| `npm --prefix app run desktop:build` | Debug macOS bundle at `target/debug/bundle/macos/EigenVista.app` |
| `npm --prefix app run package:macos` | Verified optimized Apple Silicon tester ZIP under `artifacts/distributions/` |
| `cargo build --manifest-path Cargo.toml --locked --release -p eigenvista-convert` | Standalone converter at `target/release/eigenvista-convert` |

The converter links the same Rust importer used through WASM by Open and Convert
files. It needs no GUI, Python, ORCA, or running application. For a repository
sample, preserving the original and writing only to ignored artifacts:

```sh
mkdir -p artifacts/conversions
cargo run --manifest-path Cargo.toml --locked -p eigenvista-convert -- --output artifacts/conversions/molden.eigenvista fixtures/legacy/data/molden.input
cargo run --manifest-path Cargo.toml --locked -p eigenvista-convert -- --check --json fixtures/legacy/data/molden.input
```

See [Molden import](molden-import.md) for exact profiles, CLI batch options,
exit codes, losses, and overwrite policy. The tester ZIP includes the optimized
Apple Silicon CLI as `Tools/eigenvista-convert`.
The same CLI accepts [cube files](cube-import.md); for example replace the input
above with `fixtures/cube/signed-affine.cube` and choose a new output path.
It also accepts existing `.molekel` preview documents. Native output defaults
to `.eigenvista` and always uses new identifiers, including when an explicit
legacy `.molekel` destination is used. Keep originals needed by older builds;
the rename does not bulk-migrate files. See [native compatibility](preview-format.md).

The web build is an HTTP-served application, not a standalone `file://` HTML file.
For a local production-build preview, after `run build`:

```sh
npm --prefix app exec -- vite preview --host 127.0.0.1 --port 5180 --strictPort --outDir "$PWD/app/dist"
```

Open `http://127.0.0.1:5180`; choose another free port if needed. This command
explicitly locates the build output from the repository root. It is a local
preview server, not a deployment setup.

To launch a debug bundle already built on this Mac:

```sh
open "target/debug/bundle/macos/EigenVista.app"
```

The debug bundle is not Developer ID-signed/notarized and is not the supported
sharing workflow. Share the packager's verified ZIP instead of a raw target
bundle: the staged distributable also embeds notices and is re-signed after
staging. See [tester packaging](tester-packaging.md).

Do not set `CARGO_TARGET_DIR` to an arbitrary location for ordinary scripts:
`run.mjs` expects the workspace's `target/` layout. The packager explicitly
sets that location and uses an architecture-specific release subdirectory.
Generated outputs, downloaded dependencies, reports, and staging are ignored.
Keep `Cargo.lock` and `app/package-lock.json` under version control.

## Native encoding measurements

The [encoding example](../crates/eigenvista-format/examples/encoding_benchmark.rs)
samples a fixed 128³ analytic H2 field and retains it as an authoritative grid.
It performs one encode or publication preflight per process and prints JSON
input identities, sample count and timing. After the usual repository-local
temporary-directory setup, on macOS:

```sh
cargo build --locked --release -p eigenvista-format --example encoding_benchmark
eigenvista_measure_dir=$(mktemp -d "$PWD/tmp/encoding-rss.XXXXXX")
for run in 1 2 3; do
  /usr/bin/time -l target/release/examples/encoding_benchmark encode \
    "$eigenvista_measure_dir/grid-$run.eigenvista" \
    > "$eigenvista_measure_dir/run-$run.json" \
    2> "$eigenvista_measure_dir/run-$run.time"
done
```

The output archive is optional; supplied destinations use create-new semantics.
Use `validate` without an archive argument to measure the shared preflight.
For before/after work, preserve a copy of the original executable under repository
tmp before changing the implementation. Use the same example, locked toolchain
and input identities, and three independent optimized processes per version.
Do not substitute a repeated in-process loop for independent maximum-RSS samples.

The timer excludes sampling, input hashing, JSON output and file writing.
macOS `time -l` reports whole-process maximum RSS in bytes, including sampling,
allocation retention and ZIP compression. Linux reports require its own units
and tools. This native workload has no cached meshes, so it does not measure
saved-surface source hashing's remaining JSON costs. It does not establish
browser/WASM peak memory, OOM recovery or a universal workload improvement.
See the [typed encoding decision](design/2026-11-12-typed-native-encoding.md)
and current [status](status.md) for recorded comparisons and qualification limits.

## Save and affine-rendering checks

[Plan 005](../plans/005-native-save-contract-research.md) documents #41's actual
save/CLI/filesystem controls. After the usual repository-local temp setup:

```sh
cargo test --locked -p eigenvista-format --test save_contract_research
cargo run --locked -p eigenvista-format --example save_contract_probe -- probe \
  "$PWD/tmp/save-contract-unused-run"
```

The example refuses an existing output directory and requires a path below
repository `tmp/`. Ordinary CI runs the bounded actual-writer regressions; mounted
image/full-volume experiments are opt-in research, with independent capability
controls and only newly owned images. Visibility checks do not qualify power loss.

[Plan 006](../plans/006-anisotropic-rendering-research.md) preserves #43's
historical independent constant/linear/tent expectations and #55's original
failing reproduction. The [visibility/depth decision](design/2026-11-13-volume-visibility.md)
describes the production repair and normal regressions. After building WASM and
native references, and verifying strict port 5178 is free:

```sh
cd app
npx playwright test anisotropy-research volume-visibility --config ../ci/playwright.config.mts
```

Both groups are normal Chromium/WebKit tests using actual unmodified production
materials and independent physical expectations. The old counterfactual shader
and opt-in probe/configuration are retired from current source; their historical
bytes and command context remain in the tagged
[v0.5.13 research snapshot](https://github.com/uvar-apps/eigenvista/tree/v0.5.13/app/research).
A labelled depth-write-only capture reads the real marker attachment separately
from actual production opaque-object scenes. Neither is an expected-data generator.
Whole-ray integration still does not clip color at interior opaque depth.

## Indexed-mesh qualification measurements

[#37](https://github.com/uvar-apps/eigenvista/issues/37) is qualification only;
production mesh generation and drawing remain unchanged. After the usual
repository-local temporary-directory setup, with other builds/browser workloads
stopped, on macOS:

```sh
cargo test --locked -p eigenvista-format --example indexed_mesh_qualification
cargo build --locked --release -p eigenvista-format --example indexed_mesh_qualification
eigenvista_mesh_dir=$(mktemp -d "$PWD/tmp/indexed-mesh-rss.XXXXXX")
target/release/examples/indexed_mesh_qualification self-check
target/release/examples/indexed_mesh_qualification prepare "$eigenvista_mesh_dir/fixtures"
for workload in h2 water worst; do
  for method in raw hash sort; do
    for run in 1 2 3; do
      /usr/bin/time -l target/release/examples/indexed_mesh_qualification \
        measure "$workload" "$method" \
        > "$eigenvista_mesh_dir/$workload-$method-$run.json" \
        2> "$eigenvista_mesh_dir/$workload-$method-$run.time"
    done
  done
done
```

The prepared corpus uses create-new files under repository tmp. Normal browser
tests read the already committed [qualification corpus](../fixtures/indexed-mesh-qualification/README.md);
never regenerate expected files to accommodate a failure. Preserve source,
binary, input and file hashes when recording new observations.

`h2` samples 128³ and retains one surface. `water` samples independent PySCF
water orbitals at 64³ and retains each nonempty signed mesh. `worst` constructs
1,999,998 distinct raw corner tuples to stress postprocessing at the existing
cap; it is **not** a maximum-cap extraction benchmark or a scientific field.
`raw` retains unchanged arrays; `hash` and `sort` apply research-only exact
first-seen packing. No restoration or Save runs in these measurement processes.

Per-phase requested Rust live-byte observations include actual extraction and
compaction, capacities and retained prior surfaces. macOS `time -l` separately
reports whole-process peak RSS in bytes, including input preparation, sampling,
source hashing, allocator retention, checking and JSON report output. Requested
bytes exclude allocator overhead and transient copying inside System realloc;
RSS does not identify which phase caused its peak. Separate validation probes
must be labelled as such. Neither these native measurements nor the bounded
pixel tests establish browser/WASM/GPU peak memory or universal OOM recovery.
See the [decision record](design/2026-11-12-indexed-mesh-qualification.md) and
[Plan 003](../plans/003-indexed-mesh-qualification.md) before production work.

## Browser scheduling and software-rendered checks

Use [ci/playwright.config.mts](../ci/playwright.config.mts) to exercise the same tracing, failure screenshots
and owned-server setup as hosted tests. From `app/`, after the repository-local
temporary-directory setup and checking that port 5178 is free:

```sh
node node_modules/@playwright/test/cli.js test --config ../ci/playwright.config.mts \
  tests/adaptive-volume.spec.ts tests/cube.spec.ts tests/progress.spec.ts tests/viewer.spec.ts
```

Hosted CI selects `--project=chromium` and `--project=webkit` in two independent
matrix jobs, with the same one-worker configuration and existing deadlines.
Their complete union is 350 cases (175 each); the default local command still
runs both. Require both engine results and the Rust/macOS results. See the
[project-isolation decision](design/2026-11-12-browser-project-isolation.md).

For an additional controlled software-rendering check, derive a temporary config
under repository tmp from that CI config and give its Chromium project launch
arguments `--use-gl=angle` and `--use-angle=swiftshader`. Use the pinned bundled
browser, a fresh owned server/output directory and no production configuration
changes. Confirm the actual WebGL `UNMASKED_RENDERER_WEBGL` result; flags alone
are not proof of the backend. The measured repair used Chromium 153.0.8010.12
and reported ANGLE/SwiftShader. See
[Chromium's instructions](https://github.com/chromium/chromium/blob/main/docs/gpu/swiftshader.md)
and [Playwright launch arguments](https://playwright.dev/docs/api/class-browsertype#browser-type-launch-option-args).
This controlled local check does not replace actual hosted results.

The [scheduling decision](design/2026-11-12-browser-verification-scheduling.md)
explains why progress waits for actual results/checkpoints, captures happen
after real draws, and expensive GPU matrices are independent bounded cases.
Keep all numerical/pixel/sign/interaction and warmed timing coverage; do not
make a failed gate green by lowering resolution, disabling damping or retries.
Adaptive evidence is now six `measurements-MODE-QUALITY` files per engine,
covering the same 24 comparisons and 14 timing configurations. The normal full
suite has **320 cases**; consult current status/PR checks for actual outcomes.

## Verification commands

Use the root-shell temporary-directory setup above, then:

```sh
cargo fmt --manifest-path Cargo.toml --all --check
npm --prefix app test
cargo clippy --manifest-path Cargo.toml --locked --workspace --all-targets -- -D warnings
cargo test --manifest-path Cargo.toml --locked -p eigenvista-desktop
npm --prefix app run build
npm --prefix app exec -- playwright install chromium webkit
npm --prefix app run test:e2e
npm --prefix app run test:packaging
```

`npm test` runs `cargo test --locked` for the default scientific/format/WASM
members, not the desktop shell. Workspace Clippy checks the shell too and needs
its platform prerequisites. A focused shell check is:

```sh
cargo check --manifest-path Cargo.toml --locked -p eigenvista-desktop
```

Scientific consumers create one stable `createScienceClient()` per pipeline.
Its `cancel()` affects that owner's jobs; use the optional fourth request argument
`{ signal: controller.signal }` to cancel one request. The bridge serializes work
through one worker; active cancellation restarts it while unrelated queued jobs
survive. Keep UI generation tokens for file reads and staged publication, and
keep fatal teardown distinct from user cancellation. Existing module-level
request/cancel exports share a default compatibility owner.

Registered source inputs are immutable snapshots. Replace affected source arrays
or objects for scientific/metadata edits; view and saved-mesh edits can reuse
registration. Never mutate nested scientific arrays in place or use document IDs
as content hashes. Only one resident document/sample is kept, and a worker restart
requires fresh registration. The [design record](design/2026-11-06-worker-ownership-and-registration.md)
explains ownership, validation, and cache boundaries.

| Coverage | Location and meaning |
| --- | --- |
| Scientific model/evaluator | Core unit tests plus [independent references](../crates/eigenvista-core/tests/independent_references.rs) |
| XYZ/PDB and connectivity | [Connectivity regressions](../crates/eigenvista-core/tests/connectivity.rs), including read-only legacy fixtures |
| Radius-bucket bond queries | Four [independent exhaustive/stress regressions](../crates/eigenvista-core/tests/bond_radius_queries.rs): all 118 elements, minimum/cutoff boundaries, translated coordinates, explicit/tied/duplicate pairs, and a 100,000-atom outlier budget case; existing guards and chemistry remain unchanged |
| Declared mmCIF connectivity | Eight [resolver module tests](../crates/eigenvista-core/src/import/cif/connections.rs), 20 [shared-import regressions](../crates/eigenvista-import/tests/cif_connections.rs), real CLI coverage within the 15-case [converter suite](../crates/eigenvista-convert/tests/cli.rs), and two [browser workflows](../app/tests/cif-connections.spec.ts) per engine (four total): selected source identity, types/order/provenance, precedence/gap fill, alternates/non-polymers/models, common/different images, bounded lexical errors, trailing constraints, repeated long IDs, native roundtrips, and retained scenes |
| BinaryCIF transport | Four [public import contracts](../crates/eigenvista-import/tests/bcif_import.rs), 22 internal [codec examples](../crates/eigenvista-import/src/bcif/tests.rs)/[MessagePack bounds](../crates/eigenvista-import/src/bcif/messagepack.rs)/[full-container profiles](../crates/eigenvista-import/src/bcif/profile_tests.rs), [independent real/policy twins](../fixtures/bcif/README.md), the converter suite, and six [browser cases](../app/tests/bcif.spec.ts): raw/gzip content detection, malformed lengths/expansion budgets, element/occupancy/alternate/connection parity, original-byte hashes, native roundtrips, conversion, simulated native picker filters, and desktop/mobile geometry |
| Cube fields and all-import bonds | [Cube regressions](../crates/eigenvista-core/tests/cube_import.rs), shared importer/CLI tests, and [browser cube workflows](../app/tests/cube.spec.ts); analytic signed/skewed grid, negative atom counts, source preservation, native bond backfill, reflected rendering, precision rejection |
| Molden and converter | [Independent imports](../crates/eigenvista-import/tests/independent_molden.rs), parser unit tests, [CLI regressions](../crates/eigenvista-convert/tests/cli.rs), [fixtures/provenance](../fixtures/molden/README.md) |
| Container/native saving | Format unit tests and [reference roundtrips](../crates/eigenvista-format/tests/reference_roundtrips.rs) |
| Indexed-column validation | [Native column regressions](../crates/eigenvista-format/tests/columnar_packing.rs) and [actual WASM decoding](../app/tests/format-validation.spec.ts): oversized/wrapped indices, swapped/duplicate rows, invalid reference forms, and valid roundtrips |
| Shader parameters and native export | [Browser workflows](../app/tests/shaders.spec.ts): type/arity rejection, safe source switches, controlled out-of-order reads and clearing, pixels, downloads, and native IPC success/cancel/error simulation. [Desktop writer](../app/src-tauri/src/shader_parameters.rs) tests actual text writes/replacement and rejected destinations/budgets. Native dialog interaction remains a separate acceptance check. |
| Custom shader transparency | [Alpha/depth and UI regressions](../app/tests/shader-transparency.spec.ts): fragment alpha independent of document opacity, view-dependent alpha, opaque depth writes, unchanged built-in materials, live checkbox changes, and Clear reset |
| Sidebar layout | [Panel workflows](../app/tests/panels.spec.ts) and [ordering regressions](../app/tests/panel-order.spec.ts): all eight disclosures, actual drag/keyboard/tap ordering, DOM/focus, mounted field/shader state, decoded-document/worker isolation, bounded preferences and storage failures, busy cancellation and mobile layout |
| Molecular ambient occlusion | [AO browser checks](../app/tests/molecular-ao.spec.ts): independent contact/isolated cues, instancing, exact Off/zero identity, field/material and document/worker isolation, current PNG/camera, bounded target lifetimes and labelled fault recovery; real 4PJ1 qualification is recorded separately in status |
| Native save contract research | [Actual-writer regressions](../crates/eigenvista-format/tests/save_contract_research.rs) and [opt-in filesystem probe](../crates/eigenvista-format/examples/save_contract_probe.rs): modes, bytes, bounded complete-file visibility and unique no-clobber races; no crash-durability claim |
| Anisotropic rendering and volume visibility | [Affine analytic checks](../app/tests/anisotropy-research.spec.ts) with [independent physical oracle](../app/tests/anisotropyReference.ts); normal [visibility](../app/tests/volume-visibility.spec.ts), [depth/opaque objects](../app/tests/volume-visibility-depth.spec.ts) and [prefix](../app/tests/volume-visibility-prefix.spec.ts) regressions preserve fixed expectations |
| Indexed-mesh qualification only | [Frozen layout corpus](../fixtures/indexed-mesh-qualification/README.md), native research example and [real shader/Save checks](../app/tests/indexed-mesh-qualification.spec.ts): exact raw VBO/IBO restoration, both handednesses/signs and negative controls; no production compaction |
| Browser workflows/numerics | [Playwright tests](../app/tests): Chromium/WebKit, real file input/download, pixels, camera, desktop/mobile layout |
| Direct field previews | [Sampling-only workflows](../app/tests/field-preview.spec.ts): real `molden.input` orbital/density volume and raycast without meshing, field/resolution changes, transient cache reuse, save/reopen, cancellation and worker-failure recovery |
| Worker ownership and cancellation | [Real worker regressions](../app/tests/worker-ownership.spec.ts): independent clients, FIFO ordering, queued/active/idle/signalled cancellation, stale events, fatal/transport failures, constructor/posting errors, and recovery |
| Worker registration messages | [Registration workflows](../app/tests/worker-registration.spec.ts): observed real Molden/cube payloads, no full scientific document on reuse, current appearance, source replacement, worker restart, and preserved saved-document data |
| Resident WASM document | [Registered-owner regressions](../app/tests/registered-document.spec.ts): real Molden/cube sample/mesh/metadata/source-hash/native parity, field/resolution/source invalidation, immutable ownership, invalid inputs/materials, progress callback errors, and recovery; legacy SampledField stale-source checks remain covered by sampled-field.spec.ts |
| Adaptive sampled rendering | [Renderer regressions](../app/tests/adaptive-volume.spec.ts): signed features missed by fixed-160 traversal, affine/inside-camera views, signed roots, empty-brick versus dense traversal, and warmed rendering timings. [Brick bounds](../app/tests/volume-ranges.spec.ts): shared faces, partial tails, 1,090 independent trilinear samples, and invalid dimensions/layout/nonfinite values |
| Sampled quality controls | [Real cube/UI workflows](../app/tests/volume-quality-controls.spec.ts): Draft/Standard/Fine and mode switches, observed real worker messages, no calculation/dirty/scientific changes, identical decoded saves, and desktop/mobile pixels/layout |
| Live calculation progress | [Rust slice counts/parity](../crates/eigenvista-core/tests/sampling_progress.rs) and [browser progress workflows](../app/tests/progress.spec.ts): real in-flight updates, batch position, WASM numerical/mesh parity, cancellation/error cleanup, stale events, cached mesh progress, and desktop/mobile layout |
| EigenVista identity and native compatibility | [Branding/browser regression](../app/tests/branding.spec.ts), [legacy format profiles](../crates/eigenvista-format/tests/legacy_compatibility.rs), and [native import compatibility](../crates/eigenvista-import/tests/native_compatibility.rs): old-profile scientific fixtures/legacy/data/cached meshes, canonical names, unchanged atom logo, downloads, and narrow-window layout |
| Camera redraw and zoom alternatives | [Camera regressions](../app/tests/camera.spec.ts): wheel-only redraw without a later click, idle settling, both zoom directions, middle-drag and keyboard buttons in every rendering mode, and narrow toolbar layout |
| PNG capture without retained backbuffers | [PNG export workflows](../app/tests/png-export.spec.ts): known PNG positive/background controls, non-preserved context attributes, idle/repeated captures, mesh/raycast/volume colours, camera/resize dimensions, encoder failure/retry, actual context loss, and retained document state |
| Runtime badge | [Browser/native branch checks](../app/tests/platform-label.spec.ts): `WebAssembly` versus neutral `Native (Tauri)`, without claiming additional OS support |
| Orbital selection and batch rendering | [Orbital browser workflows](../app/tests/orbitals.spec.ts): complete imported lists and metadata, filtering/checkboxes, bounded generation, preserved meshes, cancellation, save/reopen, desktop/mobile layout |
| Density sampling and remaining bounds | [Scalar reference parity](../crates/eigenvista-core/tests/scalar_sampling.rs), [real Molden density](../crates/eigenvista-import/tests/density_sampling.rs), [allocation limits](../crates/eigenvista-core/tests/allocation_limits.rs), and [browser regression](../app/tests/density-budget.spec.ts): value-only sampling, nonsymmetric/signed matrices, finite extremes, 125-AO density regressions, real-worker cancellation/responsiveness, and retained numerical/allocation bounds |
| High-resolution grids and typed transfer | [256-cubed workflows](../app/tests/high-resolution.spec.ts) and [owned WASM field parity](../app/tests/sampled-field.spec.ts): real simple-field completion, exact saved resolution, typed display buffers, cached meshing, source validation, cancellation and injected recoverable failure paths |
| Packaging safety/notices | [Packaging tests](../tools/package-support.test.mjs), followed by a full ZIP build when packaging changes |

The viewport deliberately does not preserve its WebGL drawing buffer after
presentation. An asynchronous `gl.readPixels` probe can therefore read cleared
data even while the compositor displays a valid scene. Viewport assertions use
[scenePixels](../app/tests/scenePixels.ts): capture the actual composited canvas,
temporarily hide separate DOM tools/labels/errors, decode PNG pixels, and preserve
the prior probes' bottom-left coordinate/checksum convention. Do not re-enable
buffer preservation to make tests pass. Standalone analytic shader probes that
render and read synchronously remain separate. Inspect exported PNGs and actual
desktop/mobile layouts; native WebView image downloads and dedicated HiDPI
acceptance remain separate checks.

`test:e2e` first generates native reference documents in
`artifacts/references/`, then runs Playwright. Its server command builds
WASM when starting a server. Inspect screenshots under `artifacts/` after
UI changes, including `desktop.png`, `mobile.png`, and reference/import scenes;
tests also assert canvas pixels and camera movement. Playwright failure output
lives in `app/test-results/`. Screenshots with shared names can be overwritten
by the second engine; retain specifically needed evidence before another run.

Numerical tests read frozen fixtures without Python. Deliberate regeneration
and extra `.eigenvista` example generation are documented in the
[fixture guide](../fixtures/pyscf/README.md). Do not regenerate expected values
as a substitute for investigating a regression. The optional release-mode bond
benchmark is:

```sh
cargo run --manifest-path Cargo.toml --locked --release -p eigenvista-core --example bond_benchmark
cargo run --manifest-path Cargo.toml --locked --release -p eigenvista-core --example bond_radius_benchmark
```

The radius benchmark compares old/global and bucketed neighbor counts. Its
old-query timing excludes pair acceptance/sorting, while bucketed-full timing
includes them; these are different scopes, not direct speedup ratios. Synthetic
lattices test spatial work limits rather than physical bonding. Use
[status](status.md) for dated measurements and exact verification counts.

The [Verify workflow](../.github/workflows/verify.yml) runs the pinned checks on
pull requests and main. [CI details](../ci/README.md) describe Linux Rust/WASM/
Chromium/WebKit/package checks, explicit macOS desktop tests, local equivalents,
temporary storage and seven-day failure artifacts. Consult dated [status](status.md)
for actual passing run evidence; CI does not qualify a packaged Linux/Windows
release or physical macOS controls/dialogs.

Node declarations are an explicit locked development dependency because tests
and Vite/Playwright configuration use Node APIs. Run `npm --prefix app ci` to
exercise the project lockfile; declarations from an enclosing home-directory
`node_modules` are not part of this project's setup.

## Manual native acceptance

The development-only native lifecycle probe embeds the production frontend and
reuses the actual Rust lifecycle module. With the repository temporary-directory
variables set and `RUSTUP_TOOLCHAIN` unset, build the frontend, then run each
scenario in its own process:

```sh
npm --prefix app run build
cargo run --locked -p eigenvista-desktop --example lifecycle_smoke --features tauri/custom-protocol -- close
cargo run --locked -p eigenvista-desktop --example lifecycle_smoke --features tauri/custom-protocol -- exit
cargo run --locked -p eigenvista-desktop --example lifecycle_smoke --features tauri/custom-protocol -- terminate
cargo run --locked -p eigenvista-desktop --example lifecycle_smoke --features tauri/custom-protocol -- clean-close
```

`terminate` requires macOS and invokes AppKit's normal Quit selector in the probe's
own application. `close` and `exit` send real native window/application events.
The probe edits the real UI, checks modal deduplication/Cancel retention and
confirmed termination, and writes checked JSONL observations under repository
`tmp/`. It controls no existing app and needs no Accessibility permission.
Its test commands are compiled only into this example, never production.
Read the JSONL log as well as checking the exit code; all assertions and the final
expected native-exit observation must succeed. Browser IPC doubles are a separate
test layer. None of these observations establishes physical close-button/Cmd+Q
interaction or native file-dialog behavior.

For a change to file handling or packaging, separately verify the actual native
bundle: launch it, open the included water PDB/XYZ, check 3 atoms/2 bonds, save
to a new path, reopen, cancel a save, and exercise replacement/close behavior
without losing unsaved data. Test cached orbital meshes with a reference document.
Use disposable files under repository `tmp/`, never the user's original data.
Also open `Examples/water.molden`, generate an orbital and density, save/reopen,
then convert a mixed valid/invalid batch without replacing the scene. Check
per-result Save, cancellation, retry, and protected-source errors with disposable
copies. Native automated destination validation is separate from dialog QA.

For the larger repository `fixtures/legacy/data/molden.input`, select the occupation-derived
density and exercise the intended resolution on the target machine. Both grid
selectors offer 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, and 256 points
per axis, with default 40. Larger real-molecule tests remain user/platform
acceptance work, not an implied all-resolution benchmark. Confirm that the
request uses its chosen resolution without an estimated-work rejection or
automatic downgrade. Observe the progress panel's actual completed slices,
per-phase percentage, elapsed time, and signed mesh-pass checkpoints. Verify
batch position advances between orbitals, cached fields skip sampling, and
preparation/transfer/validation remain indeterminate. There is no ETA or
intra-pass mesher percentage. Cancel during a longer job,
verify previous geometry remains intact, then generate again to check worker
restart. Record failures and the actual requested dimensions.

Keep the separate limits covered: API resolution 12 through 256, 256 cubed
transient samples, 128 cubed total authoritative source samples, finite/domain
validation, two-million actual output vertices, 128 saved surfaces, 32 orbitals
per batch, and 128 MiB geometry/native-container budgets. Validate actual-cell
mesher preflight against the pinned library's case behavior; do not reintroduce
the all-cells worst-case rejection or silently change the classic mesher.
Check typed-array display dimensions and values without treating the transient
f32 transfer as persistent scientific data. A 256 cubed test needs at least
128 MiB of f64 samples and 64 MiB of f32 display samples, plus meshes, temporary
copies, WASM/browser overhead, and GPU memory. Recoverable allocation and worker
errors should retain the previous document, but library/browser/GPU/system OOM
is not universally recoverable. Do not report a maximum RSS, timing guarantee,
or platform qualification without separate measurements.

On `Examples/water.molden`, use **Orbitals (24)** (tooltip: **Browse and select
orbitals**): verify all 24 rows, imported
labels/spins/occupations and hartree energies, filtering, selected-count updates,
and filtered select-all. Where metadata is absent, confirm `--` or Unknown,
not a fabricated zero. Generate two orbitals together, confirm that unrelated
saved meshes remain, and check visibility plus Save/reopen of the new meshes.
Cancel another batch and check that it leaves previous surfaces intact. Closing
the browser without generating must not edit the document, and reopening it
must initialize selection from the active orbital rather than restore old checks.
For a file with more than 32 orbitals, check that the entire list is available
but generation above the 32-orbital batch limit is disabled. Check keyboard
Escape, narrow-window table scrolling, and a single active field in sampled
volume/raycast modes. These manual steps are acceptance criteria, not a claim
that the packaged native WebView has passed them.

Open `Examples/signed-affine.cube`: check 2 atoms/1 bond, immediate signed volume,
raycast mode, and Generate for positive/negative meshes. Save/reopen the result;
saved geometry must reappear and sampled modes must be available without
regenerating meshes. Display-resolution changes must not replace source samples.

Record what was actually observed, including the OS and app build. Browser
WebKit tests are not equivalent to Tauri's system WebView. Native filesystem
tests and signature checks do not establish native-dialog interaction or a
clean-machine Gatekeeper install. Coordinate with the user before using their
active application window. Current gaps are in [status](status.md).

## Troubleshooting

| Problem | Action |
| --- | --- |
| `../tmp` or temporary path missing | Create root `tmp/` first and export its absolute path as above |
| Missing WASM module or bindgen mismatch | Install the exact 0.2.108 CLI and target, then run `wasm` or `build`; do not commit generated bindings |
| Port 5178 occupied | Identify its owner; stop only your own server or align all three configs to a free port |
| Playwright browser missing | Run the browser-install command with repo-local temporary variables |
| Rust native link/build fails | Check platform prerequisites/toolchain, then the focused shell check; preserve diagnostics |
| New dependency notice fails packaging | Review the locked dependency's actual license and pinned notice source; do not bypass the check |
| Test refers to missing legacy PDB/Molden/cube fixture | Use the full checkout or source snapshot including the data-only `fixtures/legacy/` directory |
| Desktop display differs from browser | Record both runtimes; test the packaged system WebView separately |
| App file is rejected | Read the exact profile/validation error and import/format docs; do not weaken checks to accept malformed input |

For an agent taking over, continue with [handoff](handoff.md). For distributing
instead of developing, follow [tester packaging](tester-packaging.md).
