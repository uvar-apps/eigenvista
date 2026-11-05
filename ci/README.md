# Portability checks

See the [development guide](../docs/development.md) for prerequisites, exact
root-relative commands, outputs, troubleshooting, and manual native acceptance.
These checks are not an installed hosted CI workflow.

The shared core has no platform-specific dependencies. The following commands
are intended for macOS and Linux after installing Rust, Node, the WASM target,
wasm-bindgen CLI 0.2.108, and Tauri's native platform prerequisites (needed by
workspace Clippy). Only the macOS run has been verified:

`rust-toolchain.toml` selects Rust 1.99.0, Clippy, Rustfmt, and the WASM target.
Run with `RUSTUP_TOOLCHAIN` unset to exercise the repository selection.

From the repository root:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
cargo fmt --all --check
cargo test --locked
cargo clippy --locked --workspace --all-targets -- -D warnings
cd app
npm ci
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
```

The independent chemistry fixtures are frozen test data, so Python/PySCF is not required in CI. The browser test runner first builds three native `.eigenvista` reference documents under ignored `artifacts/references/`, then checks native-to-browser persistence and the Rust/WASM results against those references. See [fixture provenance and regeneration](../fixtures/pyscf/README.md).

`cargo check -p eigenvista-desktop --locked` additionally checks the Tauri shell. Linux needs the distribution's Tauri/WebKitGTK development dependencies. A desktop build does not establish GPU or window-system compatibility.

No hosted `.github/workflows` configuration is included. These checks are
runnable locally or from a future CI job in the standalone repository. Linux
and Windows execution has not been verified on this Mac; do not mark those
platforms supported based on the WASM build.
