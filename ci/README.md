# Hosted verification and local portability checks

See the [development guide](../docs/development.md) for prerequisites, exact
root-relative commands, outputs, troubleshooting, and manual native acceptance.
The [Verify workflow](../.github/workflows/verify.yml) runs on pull requests,
pushes to `main`, and manual dispatch. Its three jobs have independent time
limits and run without secrets or repository write permissions:

| Job                    | Runner           | Checks                                                                                                                                             | Limit      |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Rust                   | Ubuntu 24.04 x64 | Rustfmt, locked default-member tests, strict workspace/all-target Clippy including the desktop crate                                               | 45 minutes |
| Desktop                | macOS 15 arm64   | Explicit locked `eigenvista-desktop` tests                                                                                                         | 45 minutes |
| WASM/browser/packaging | Ubuntu 24.04 x64 | Node 26, locked npm install, 13 packaging support tests, exact wasm-bindgen CLI 0.2.108, production WASM/frontend build, all Chromium/WebKit tests | 60 minutes |

Every project command runs after creating repository-local `tmp/` and exporting
`TMPDIR`, `TMP`, and `TEMP`; elevated dependency installers preserve these
variables. Rust commands unset `RUSTUP_TOOLCHAIN`, so `rustup show` installs and
exercises `rust-toolchain.toml` rather than a runner's default compiler. Rust,
Cargo and Node/npm versions are printed in the run logs. The workflow does not
change compiler versions, dependency locks or frozen scientific fixtures.

Linux Clippy installs Tauri's WebKitGTK 4.1 development dependencies. The browser
job installs only the locked Playwright package's Chromium/WebKit engines and
their native dependencies. Its [configuration](playwright.config.mts) imports the
normal application config, retaining the full test set, engines, single worker
and timeouts. It refuses to reuse another server, rejects focused tests and adds
failure screenshots, traces without embedded source files, and an HTML report.
The native `.eigenvista` reference documents are derived by the same Rust example
as `npm --prefix app run test:e2e`; independent expected scientific answers remain
frozen and are never regenerated.

Failure logs, browser reports/traces and generated PNG screenshots are retained
for **seven days**. Upload paths are limited to those outputs; reference
documents, private exports, source archives and packaged applications are not
uploaded. The workflow builds no tester ZIP and publishes no release. It uses no
dependency/build/browser caches, so a cache hit is never required for correctness.
Superseded runs for the same pull request or branch are cancelled.

Actions are pinned to full commit SHAs, resolved from the official repositories'
release tags on 11 November 2026:

| Action                                                                            | Release | Commit                                     |
| --------------------------------------------------------------------------------- | ------- | ------------------------------------------ |
| [checkout](https://github.com/actions/checkout/releases/tag/v7.0.1)               | 7.0.1   | `3d3c42e5aac5ba805825da76410c181273ba90b1` |
| [setup-node](https://github.com/actions/setup-node/releases/tag/v7.1.0)           | 7.1.0   | `949feb2413d6458794dcd2491c4babbbce0c15c1` |
| [upload-artifact](https://github.com/actions/upload-artifact/releases/tag/v7.0.2) | 7.0.2   | `cf430e030ddbb5b0abf93d22962f4752f3646cd9` |

The runtime `GITHUB_TOKEN` needs only `contents: read`; checkout does not persist
credentials. No `pull_request_target` trigger or additional PAT is used. Publishing
workflow changes requires the contributor's existing workflow-write permission;
the jobs do not grant it. Runner labels and system dependencies follow the
[GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners),
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) and
[Playwright CI instructions](https://playwright.dev/docs/ci).

Hosted execution evidence and remaining gaps belong in
[status](../docs/status.md) and [handoff](../docs/handoff.md). Configuration alone
does not establish a passing hosted run. The jobs do not exercise physical native
close/Quit controls, native dialogs, a packaged system WebView, clean-Mac
installation, Windows, or Linux release qualification.

## Running the same checks locally

The shared core has no platform-specific dependencies. The following commands
are intended for macOS and Linux after installing Rust, Node, the WASM target,
wasm-bindgen CLI 0.2.108, and Tauri's native platform prerequisites (needed by
workspace Clippy). Consult the dated status record for verified platforms:

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

These commands are also runnable locally. Explicit shell tests remain
`cargo test --locked -p eigenvista-desktop`; default-member tests do not cover
the shell. Compilation and browser checks are separate from native runtime,
packaged application and clean-machine acceptance.
