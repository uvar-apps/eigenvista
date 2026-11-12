# Hosted verification and local portability checks

See the [development guide](../docs/development.md) for prerequisites, exact
root-relative commands, outputs, troubleshooting, and manual native acceptance.
The [Verify workflow](../.github/workflows/verify.yml) runs on pull requests,
pushes to `main`, and manual dispatch. Its four job runs have independent time
limits and run without secrets or repository write permissions:

| Job                    | Runner           | Checks                                                                                                                                             | Limit      |
| ---------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Rust                   | Ubuntu 24.04 x64 | Rustfmt, locked default-member tests, strict workspace/all-target Clippy including the desktop crate                                               | 45 minutes |
| Desktop                | macOS 15 arm64   | Explicit locked `eigenvista-desktop` tests                                                                                                         | 45 minutes |
| WASM/Chromium/packaging | Ubuntu 24.04 x64 | Clean pinned setup, 13 packaging support tests, production WASM/frontend build, all 175 Chromium cases | 60 minutes |
| WASM/WebKit/packaging | Ubuntu 24.04 x64 | Clean pinned setup, 13 packaging support tests, production WASM/frontend build, all 175 WebKit cases | 60 minutes |

The browser rows use the same job definition with a two-engine matrix. Each
gets its own clean runner, Node 26, locked npm install and matching wasm-bindgen
CLI 0.2.108. `fail-fast: false` preserves the other engine's result if one fails.
Both rows, Rust and macOS must pass at the reviewed head before merge. See the
[#54 decision](../docs/design/2026-11-12-browser-project-isolation.md).

Every project command runs after creating repository-local `tmp/` and exporting
`TMPDIR`, `TMP`, and `TEMP`; elevated dependency installers preserve these
variables. Rust commands unset `RUSTUP_TOOLCHAIN`, so `rustup show` installs and
exercises `rust-toolchain.toml` rather than a runner's default compiler. Rust,
Cargo and Node/npm versions are printed in the run logs. Workflow commands
preserve compiler versions, dependency locks and frozen scientific fixtures.
The first clean hosted build exposed missing Node type declarations previously
resolved from outside the application workspace. The CI integration batch adds
the exact development dependency `@types/node` 26.1.2 and enables Node types in
TypeScript, matching the declarations already exercised locally; existing
runtime, compiler and dependency versions remain unchanged.

Linux Clippy installs Tauri's WebKitGTK 4.1 development dependencies. The browser
rows each install the locked Playwright package's selected engine and
their native dependencies. A [CI-only package setup](prepare-linux-packages.sh)
preserves provider-specific sources. Observed AWS jobs used inherited HTTP EC2
and security sources successfully; Azure jobs could not resolve Ubuntu archive
domains. Where an image mirrorlist exists, the helper checks its preferred
Ubuntu host with a five-second DNS deadline. Only if that lookup fails and a
ten-second normal-TLS InRelease probe succeeds, it adds the fixed
`https://mirrors.edge.kernel.org/ubuntu/` fallback at explicit `priority:0`.
Existing entries/priorities remain; images without that file retain their
sources. No DNS, TLS, GPG/keyring or sandbox policy is relaxed. APT itself must
validate signed indexes successfully before installing packages.

Kernel.org appears in Ubuntu's [registered archive list](https://launchpad.net/ubuntu/+archivemirrors),
and its [operator documents the HTTPS service](https://mirrors.edge.kernel.org/).
Local normal-TLS checks fetched Noble and Noble-security InRelease successfully;
hosted selection/installation remains a separate gate in the status record.
APT's [mirror format](https://manpages.ubuntu.com/manpages/noble/man1/apt-transport-mirror.1.html)
tries lower priorities first; its [implementation](https://github.com/Debian/apt/blob/main/methods/mirror.cc)
parses explicit zero, while omitted priorities use the maximum unsigned value.
The earlier [Azure image setup](https://github.com/actions/runner-images/blob/add4380b0d6685806e9192c33c37359ee0aa4023/images/ubuntu/scripts/build/configure-apt-sources.sh)
is evidence for that image only, not every provider's configuration.

APT fails on any index-update error, retries once, and limits HTTP/HTTPS
transport waits to 30 seconds. Package-source setup has a two-minute deadline,
and each dependency-install step has ten minutes. Setup/install output joins
the failure logs; see [APT configuration](https://manpages.ubuntu.com/manpages/noble/man5/apt.conf.5.html).
If installation fails, a [read-only network probe](diagnose-linux-network.sh)
compares DNS lookup and non-verbose curl results as the runner, root and `_apt`,
including a direct connection that ignores proxies. It records proxy variable
names/presence, public DNS results, HTTP status/timings and exit codes, never
proxy values or response headers. Each lookup/request has its own deadline;
the diagnostic step is limited to five minutes and joins the failure artifact.
It includes Kernel.org reachability and changes no DNS, signature-verification
or apt sandbox settings. Probes are fed through stdin so `_apt` does not need
permission to traverse the runner's workspace.
The browser [configuration](playwright.config.mts) imports the
normal application config, retaining the full test set, engines, single worker
and timeouts. It refuses to reuse another server, rejects focused tests and adds
failure screenshots, traces without embedded source files, and an HTML report.
Hosted rows select only their engine with `--project`; their disjoint union is
the same complete 350-case suite. The local command still runs both engines.
The native `.eigenvista` reference documents are derived by the same Rust example
as `npm --prefix app run test:e2e`; independent expected scientific answers remain
frozen and are never regenerated.

Failure logs, browser reports/traces and generated PNG screenshots are retained
for **seven days**. Upload paths are limited to those outputs; reference
documents, private exports, source archives and packaged applications are not
uploaded. The workflow builds no tester ZIP and publishes no release. It uses no
dependency/build/browser caches, so a cache hit is never required for correctness.
Superseded runs for the same pull request or branch are cancelled.
Each engine's browser-test step has a 35-minute deadline inside its 60-minute job, leaving
time for failure artifact upload if the suite stalls. This bounds the process
without changing individual test timeouts, assertions or the full test selection.
Failure artifacts are named `browser-linux-chromium-failure` and
`browser-linux-webkit-failure` to keep each runner's evidence distinct.

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
unset RUSTUP_TOOLCHAIN
cargo fmt --all --check
cargo test --locked
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo test --locked -p eigenvista-desktop
cd app
npm ci
npm run build
npm exec playwright -- install chromium webkit
npm run test:e2e
npm run test:packaging
```

The independent chemistry fixtures are frozen test data, so Python/PySCF is not required in CI. The browser test runner first builds three native `.eigenvista` reference documents under ignored `artifacts/references/`, then checks native-to-browser persistence and the Rust/WASM results against those references. See [fixture provenance and regeneration](../fixtures/pyscf/README.md).

`cargo check -p eigenvista-desktop --locked` additionally checks the Tauri shell. Linux needs the distribution's Tauri/WebKitGTK development dependencies. A desktop build does not establish GPU or window-system compatibility.

These commands are also runnable locally. Explicit shell tests remain
`cargo test --locked -p eigenvista-desktop`; default-member tests do not cover
the shell. Compilation and browser checks are separate from native runtime,
packaged application and clean-machine acceptance.
