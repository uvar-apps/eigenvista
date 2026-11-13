# EigenVista

A clean Rust scientific core with a React/Three.js interface, shared by a Tauri macOS application and the browser. This directory is independent of the legacy implementation. No legacy source is copied or built, and no C++ is used in the application.

EigenVista is the standalone successor to the Molekel Rust rewrite, in
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista). Application code
now lives at this repository's root; legacy application code is not included.
The icon and logo are unchanged. New documents use
`.eigenvista`; existing `.molekel` preview documents still open with their
scientific data and saved meshes. New saves use EigenVista format identifiers
and are not guaranteed readable by older Molekel builds, even when saved with
a `.molekel` filename. See the [native profile](docs/preview-format.md).

**Status:** version 0.5.15 development preview, not v1 and not completion of the M0-M7 plan. See [implementation status](docs/status.md) for evidence, release artifacts, and remaining gates.

Current source adds native close/quit protection, correct Molden limits, hosted
verification, and reduced Molden-import/surface-publication work (#30–#34).
It also includes the bounded Vite maintenance update, authentic native-file
regressions, typed numerical encoding and collapsible sidebar sections.
Indexed meshes remain a qualification experiment; production generation is
unchanged. Version 0.5.14 includes the volume opacity/quality fix
[#55](https://github.com/uvar-apps/eigenvista/issues/55), with consistent
visibility and representative depth across sampling qualities. See the
[0.5.14 release notes](docs/releases/0.5.14.md) and
[visibility/depth decision](docs/design/2026-11-13-volume-visibility.md).
Version 0.5.15 adds [#52 sidebar reordering](docs/design/2026-11-13-sidebar-reordering.md)
with native drag, keyboard and tap controls, remembered profile order and
preserved control/calculation state. See the [0.5.15 release notes](docs/releases/0.5.15.md).

Current source adds optional molecular ambient occlusion for dense
structures ([#59](https://github.com/uvar-apps/eigenvista/issues/59)): matte Lambert
shading, broad fold/cavity depth cues and an automatic radius based on molecular
size. This subsequent source feature is not in the published 0.5.15 ZIP. See the [AO decision](docs/design/2026-11-14-molecular-ambient-occlusion.md).

## Start here

- **Using the application:** [User guide](docs/user-guide.md), including Mac
  installation, supported files, controls, surfaces, saving, and troubleshooting.
- **Building or running from source:** [Development guide](docs/development.md).
- **Sharing a tester ZIP:** [Packaging guide](docs/tester-packaging.md).
- **Continuing development:** [Root AGENTS.md](AGENTS.md),
  [handoff](docs/handoff.md), and [as-built architecture](docs/architecture.md).
- **Planning and all documentation:** [Documentation map](docs/README.md).

The [historical research and M0-M7 plan](https://github.com/ugovaretto/molekel/blob/4edabf6852db44ff849e82223bef6c0702730e3c/doc/rewrite/README.md)
remain in the original repository at the pinned extraction revision. Current
implementation facts and later decisions live in `docs/`. The
[migration record](docs/migration.md) explains the eight-commit rewrite-only
history and data-only legacy fixtures. Proposed features are not all available
in this preview.

## Run

The repository selects Rust **1.99.0** through `rust-toolchain.toml`, including
Clippy, Rustfmt, and the WASM target. Tested with Node 26 and wasm-bindgen CLI
0.2.108. Dependency versions are locked in Cargo.lock and app/package-lock.json.

From the repository root:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.108 --locked
cd app
npm ci
npm run dev
```

The development viewer is served at `http://127.0.0.1:5178`. The port is deliberately strict; choose another in Vite, Tauri, and Playwright config if it is occupied. All project scripts use the ignored repository `tmp/` for temporary work.

Other commands, from `app/`:

```sh
npm run desktop        # Tauri development app, starts its own Vite server
npm run desktop:build  # Debug macOS .app, not Developer ID-signed/notarized
npm run package:macos  # Optimized, ad-hoc-signed Apple Silicon tester ZIP
npm run build          # WASM, TypeScript check, production web bundle
npm test               # Rust scientific and native-format tests
npm run test:e2e       # Chromium/WebKit interaction, persistence, pixel and mobile tests
npm run test:packaging # Packaging safety and license-notice regression tests
```

Stop an independently started Vite server before `npm run desktop`. Install Playwright's browsers once with `npm exec playwright -- install chromium webkit`, using the temporary-directory variables above.

For sharing with friends, see [tester packaging](docs/tester-packaging.md).
The [0.5.15 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.5.15)
is the download location for its ZIP, checksum and build metadata; check
[status](docs/status.md#version-0515) for publication and verification state.
The ZIP is a development build for Apple Silicon Macs, not an Apple-notarized
release. It includes source and notices under the [application license](LICENSE).

## Available

- Analytic two-center and fractional-open-shell fixtures, clearly identified as mathematical models rather than chemistry calculations.
- Frozen independent PySCF references for closed/open-shell molecules and Cartesian/spherical general contractions through G, with native/WASM value and gradient checks. [Reference suite and example documents](fixtures/pyscf/README.md).
- Explicit Gaussian-polynomial basis evaluation and gradients through G, signed orbitals, and supplied real density matrices in Rust/f64.
- Ball-and-stick, liquorice, and space-filling representations; camera controls,
  atom picking, and PNG export of a freshly rendered current view, including
  after the scene has become idle.
- Rust marching-cubes mesh extraction, signed colors, opacity, visibility, deletion, sampling/meshing/validation progress, worker cancellation, and sampled-field reuse.
- Live calculation progress shows the current field and orbital batch position,
  completed sampling slices, per-phase percentage, signed mesh-pass checkpoints,
  and elapsed time. Cancellation remains available throughout worker jobs.
- Calculation and conversion clients share one queued scientific worker.
  Cancelling one client's work preserves unrelated queued requests; scientific
  operations still run one at a time.
- Searchable orbital table with energy, occupation, spin, and saved-surface counts;
  select up to 32 orbitals per batch to generate persistent signed meshes together.
  Cancel or failure preserves prior geometry, and successful batches retain
  surfaces belonging to unselected fields. See the [user guide](docs/user-guide.md).
- Experimental sampled raycasting and volume integration with actual shaders; these do not yet meet the full correctness/performance release gates.
- Volume and raycast previews can sample an orbital or density directly, without
  generating meshes first. Field/resolution changes run in the cancellable worker;
  cancellation or failure preserves the prior preview and saved surfaces.
- Sampled previews offer Draft/Standard/Fine display sampling (1/2/4 samples per
  voxel-distance, default Standard) and conservatively skip empty eight-cell
  bricks. Quality is session-only; changing it reuses the grid without scientific
  recalculation, meshing, or changing the saved document.
- Custom surface shaders have an explicit **Shader transparency** control,
  enabled by default; disabling it forces opaque alpha and depth writes.
- Collapse sidebar sections with their heading buttons. Controls retain their
  state, expansion is remembered in the current profile, and calculation
  progress/Cancel stay visible while busy. Reorder within each sidebar by
  dragging a dedicated handle, using its arrow keys or clicking/tapping its
  move controls; order is saved separately from molecular documents.
- Self-contained `.eigenvista` preview files containing quantum data, binary numeric arrays, saved meshes, isovalues, grid geometry, scientific hashes, provenance, and material settings. Reopen displays saved geometry without recomputation.
- Native Save dialog with validated sibling-file replacement; browser file download. Native Open dialog and browser file selection.
- Conventional single-frame XYZ and PDB import with automatic coordinate-based bonds, PDB alternate/model handling, and retained explicit connections. [Import policy and algorithm](docs/structure-imports.md).
- Gaussian single-field bohr cube import, including single-orbital datasets,
  skewed/reflected affine axes, automatic bonds, and immediate volume/raycast
  previews. Generate signed meshes and save them with the original grid in
  `.eigenvista`. [Cube profile and workflow](docs/cube-import.md).
- Automatic display bonds across every supported import, including filling
  missing bonds in older native documents without losing cached surfaces.
- Molden import through a shared Rust library, Open and batch conversion controls,
  plus a standalone `eigenvista-convert` CLI. Canonical Gaussian shells through G
  and a tested ORCA S/P/spherical-D export subset are supported with explicit
  normalization and loss reports. [Molden profile and converter](docs/molden-import.md).
- Text mmCIF (`.cif`, `.mcif`, `.pdbx`) and BinaryCIF (`.bcif`, `.bcif.gz`)
  structure import through Open and the shared converter. BinaryCIF content is
  detected independently of its filename; gzip support is specific to BinaryCIF.
  Both transports use the same selection and connection rules. Selected
  coordinates retain declared covalent,
  disulfide, and metal-coordination connections; coordinate perception fills
  missing pairs. Deposited types, orders, references, and omissions remain in
  provenance. Cell/symmetry are recorded without generating crystal mates.
  [mmCIF profile](docs/structure-imports.md#mmcif-profile) and
  [bounded BinaryCIF profile](docs/structure-imports.md#binarycif-profile).

## Boundaries

The mesher is the MIT-licensed Rust `mcubes` 0.1.7 library, not MC33. Its classic table is not topology-certified. The numerical evaluator is a scalar Rust reference implementation, not an optimized collocation kernel. Neither substitution closes the relevant scientific/performance gates.

Raycasting uses bounded, voxel-relative step sampling and bracket refinement.
It can miss tangencies or unresolved features and crossings between samples;
finer display sampling cannot recover features absent from the grid.
Transparency uses ordinary mesh sorting and an experimental single-volume pass;
opaque objects inside volumes and interpenetrating transparent layers are not
yet correctly integrated. Do not treat these previews as publication-quality
rendering.

The format's named preview profile is intentionally narrower than the proposed full format. It has whole-array ZIP entries and a 128 MiB file/inflated-byte cap; it is not a streaming/chunked large-data implementation. Saving may need several in-memory copies. Camera and transient volume state are not yet persisted. See [format profile](docs/preview-format.md).

Analytic sampling supports 12 through 256 points per axis in the API. Both UI
selectors offer 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, and 256; the
default remains 40. A transient sampled field may contain up to 256 cubed
values, separately from the unchanged 128 cubed total-sample limit for imported
and native authoritative grids. The two-million-vertex mesher limit now checks
the actual case counts before extraction, using the pinned `mcubes` behavior;
it is not a new meshing algorithm or topology guarantee.

Other limits remain: 1,024 AOs, 512 MOs in total across all spin blocks,
64 primitives per AO, 128 saved surfaces, 32 orbitals per batch, and 128 MiB
geometry/native-container bounds, plus numerical and domain validation. The AO
and MO caps are independent: a complete one-MO-per-AO spatial set fits through
512 AOs, and complete alpha and beta sets through 256 AOs. Partial exports can
use a larger basis within the same caps; missing orbitals are not recovered.
See the [Molden limits](docs/molden-import.md#limits-and-verification).
There is no estimated CPU-work cutoff or silent
resolution reduction for analytic sampling. Scalar sampling avoids unused
gradients and folds density-matrix pairs. The WASM worker keeps the f64 sampled
grid and transfers full-resolution f32 display values without serializing the
large sample array through JSON. One validated resident document supplies the
sampled cache; repeated requests with unchanged source inputs omit the full
scientific payload. Appearance and isovalue changes can reuse its field samples.

A 256 cubed field contains 16,777,216 samples: 128 MiB for f64 values plus
64 MiB for f32 display values, before meshes, additional copies, and GPU memory.
Larger jobs may take longer. Percentages measure completed sampling slices or
signed mesh passes, not overall time remaining; preparation, transfer, and
validation are indeterminate. There is no ETA or intra-pass mesher percentage.
Cancelling active work terminates the worker, retaining previous geometry;
unrelated queued work continues on a replacement worker. Cancelling queued work
does not interrupt the active request. Fatal worker failures reject all pending
jobs, while recoverable errors leave the previous document intact. Allocation
checks cannot guarantee
recovery from every library, browser, GPU, or system out-of-memory failure;
these bounds do not guarantee latency or maximum process memory usage.

Imported cubes can be resampled for display without modifying their
authoritative values. All imports use published covalent radii and bounded
neighbor search for automatic bonds; these are display connectivity, not
inferred bond orders. PDB import selects the first geometry and one alternate
per residue. Space-filling rendering uses a complete display table for all 118
supported elements: a distinct CPK colour per element, and van der Waals radii
from Alvarez (2013) with Rahm-Hoffmann-Ashcroft (2016) filling Pm and Po-Ra.
Fm-Og have no published van der Waals radius and use a documented
Pyykko-covalent-radius extrapolation. These display radii stay separate from
the Pyykko-Atsumi covalent radii used for bond perception, and a Rust test
pins the table against those sources. See
[element display data](app/src/elements.ts).

Direct analytic shader raycasting, topology-certified MC33, shrinkwrap, full transfer-function editing, OBJ import, atom-color text import, metadata editing, undo, and release qualification remain to be implemented. Other external formats are deferred; no direct ORCA reader is planned for this increment. Linux and Windows are architectural targets, not tested supported releases.
