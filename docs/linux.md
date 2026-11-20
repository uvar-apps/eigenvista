# Linux development preview

Linux work is tracked in [issue #108](https://github.com/uvar-apps/eigenvista/issues/108).
The first target is **CachyOS x86_64** on the local System76 machine. The Linux
implementation is merged through [PR #109](https://github.com/uvar-apps/eigenvista/pull/109).
A clean Linux package is being prepared for the existing
[0.10.3 release](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.3).
See the [living handoff](handoff.md) for the exact tested source, package,
publication state and remaining desktop checks.

## Run on a Linux desktop

Extract the supplied `EigenVista-…-linux-x86_64-….tar.gz` into a directory you
own. Retain the complete directory, including `bin/` and `share/`. From Fish,
run the following, substituting the actual extracted directory:

```fish
cd /path/to/extracted/EigenVista-package
./bin/eigenvista
```

The native window needs a graphical Linux session and WebGL2. The package uses
system GTK 3 and WebKitGTK 4.1, plus their runtime dependencies. On CachyOS/Arch,
install `webkit2gtk-4.1` through the distribution package manager. Use the
package's build-information JSON and `ldd bin/eigenvista` to check the actual
linked libraries. Do not copy newer system libraries over older ones.

This tarball is a distribution-specific preview. A build made on rolling
CachyOS does not establish compatibility with older glibc or other distributions.
An AppImage or Debian/RPM distribution needs its own baseline build and runtime
qualification; changing the filename cannot provide that compatibility.

The standalone converter is `bin/eigenvista-convert`. Offline guides, examples,
palettes and shaders are under `share/eigenvista/`.

## Use the AI connector

This also requires a graphical session or an explicitly configured test display.
No compiler, Node.js, source checkout or additional MCP server is needed to use
the prebuilt connector. From the extracted directory, run:

```fish
"./share/eigenvista/AI-connector/Start AI connection.sh"
```

This executable has its own Bash interpreter; invoke it from Fish rather than
sourcing it into Fish. It opens a separate connected window and prints a
nonsecret session-note path. Give that path to Codex, Claude Code, Pi, OpenCode
or another terminal-capable agent and ask it to read the bundled instructions.
Then request molecular tasks in ordinary language. See the
[AI user guide](ai-connector.md) for examples and folder permissions.

To choose a workspace and grant a molecular-data directory:

```fish
"./share/eigenvista/AI-connector/Start AI connection.sh" --workspace "$HOME/Documents/EigenVista" --input "$HOME/molecules"
```

The launcher supplies the bundled examples/palettes and creates private session
directories. Share the session-note filename, never the connection file contents.
Keep the app, helper and resource directory from the same package together.

## Work with the headless system76 machine

The supplied system76 host is **SSH-only**. No desktop environment was installed.
The native application is a graphical program, including when controlled by an
AI agent; the converter alone can run without a display. Running the commands
above in a plain SSH session will not create a visible window.

For interactive browser testing, start the development server on system76.
The existing isolated toolchain setup can be loaded directly in Fish:

```fish
cd ~/projects/eigenvista
source tmp/linux-port/env.fish
npm --prefix app run wasm
cd app
node_modules/.bin/vite --host 127.0.0.1 --port 5178 --strictPort
```

First check that port 5178 is free or already serves your own EigenVista preview;
do not stop an unknown process. Leave that terminal running. In a second terminal
on your Mac, open a tunnel:

```sh
ssh -o ExitOnForwardFailure=yes -N -L 127.0.0.1:5179:127.0.0.1:5178 ugo@system76.local
```

Open `http://127.0.0.1:5179/` in the Mac browser. Close the tunnel and stop your
development server with Ctrl-C when finished. This exercises the browser UI and
WASM on the browser's machine. It does not exercise the Linux native window,
native file dialogs or native AI connector. Native qualification instead used
the actual extracted app, launcher and helper on an isolated authenticated Xvfb
display, followed by molecular tasks and PNG exports; see the
[qualification record](design/2026-11-20-linux-desktop-preview.md).

The ignored `tmp/linux-port/env.fish` belongs to this prepared checkout, not to
the downloadable package. For a fresh checkout use the source setup below. Do
not source `env.sh` into Fish; SSH automation uses explicit `/bin/sh -s`.

## Build from source using Fish

Use the EigenVista checkout, not the original Molekel source. Install the
[Tauri Linux prerequisites](https://v2.tauri.app/start/prerequisites/#linux) with
the distribution's normal signed-package workflow. CachyOS/Arch builds need
`base-devel`, `webkit2gtk-4.1`, `openssl`, `librsvg`, `pkgconf`, `file`, `curl`,
`patchelf`, Node.js/npm, Rustup, and Bash. Packaging also uses `tar`, `gzip`,
`ldd` and `readelf`. Keep repositories consistent; do not disable signature
checks or perform a partial system upgrade to work around stale mirrors.

At the repository root:

These fresh-checkout commands assume a standard Rustup installation is already
on `PATH`. On the prepared system76 checkout, first run
`source tmp/linux-port/env.fish` to select its isolated Rustup/Cargo installation;
the system's separate Rust installation is not the pinned project toolchain.

```fish
mkdir -p tmp
set -gx TMPDIR "$PWD/tmp"
set -gx TMP "$PWD/tmp"
set -gx TEMP "$PWD/tmp"
rustup show
rustup target add wasm32-unknown-unknown --toolchain 1.99.0
cargo install wasm-bindgen-cli --version 0.2.108 --locked
npm ci --prefix app
npm --prefix app run desktop
```

The final command requires a graphical session. On a headless host, use the
browser workflow above or build/package without launching a native window.

`rust-toolchain.toml` selects Rust 1.99.0, rustfmt and Clippy. Preserve the
checked-in toolchain, lockfiles and matching wasm-bindgen version. The project's
Node build wrappers also set all three temporary-directory variables to the
repository's `tmp/`.

For an optimized tarball containing the app, converter, prebuilt AI helper,
resources, notices and source archives:

```fish
npm --prefix app run package:linux
```

The command writes the archive, SHA-256 companion and build-information JSON
under `artifacts/distributions/`. It records source revision and dirty state,
checks the real executables and their linked dependencies, and independently
extracts and verifies the payload. It does not publish anything. A `dirty`
filename identifies a development snapshot, not a clean tagged release.

## Validation boundaries

Compile/test the scientific Rust workspace and desktop crate, build production
WASM/frontend/native binaries, and exercise the extracted graphical app through
its actual helper. Browser-only success does not qualify native WebKitGTK.
Conversely, an isolated-display run does not qualify physical desktop behavior,
file dialogs, Wayland, both GPUs or another distribution. Record the actual
renderer, display method, machine and test results in the handoff.

Playwright's downloaded WebKit is built for supported distributions and may
need libraries absent from CachyOS. Use a matching supported browser-test
container where necessary; report those results separately from host-native
GTK/WebKit acceptance. Keep its temporary files inside the mounted repository
as well. No hosted application CI is required.

On system76, Chromium's EGL backend was independently checked against the Intel
UHD 630 renderer. To select that backend for tests, from the repository root:

```fish
cargo run --locked -p eigenvista-format --example reference_documents
cd app
env EIGENVISTA_TEST_LINUX_EGL=1 node_modules/.bin/playwright test --project chromium
cd ..
```

This opt-in setting affects the test browser only. Check another machine's
actual renderer before selecting it there. The dense palette fixture preserves
the runner's selected renderer and records all 58,870 atoms and eight palette/AO
captures; it does not reduce geometry or image quality.

The matching local Playwright 1.63.0 Noble container runs the WebKit tests on
this host. Give its runner `--timeout 600000`: the full dense palette case took
6.1 minutes in a focused run. That functional test honors the runner's timeout
and retains every rendering assertion. Bind container temporary storage into
the checkout and set `TMPDIR`, `TMP`, `TEMP` and `NODE_COMPILE_CACHE` there.
Browser-reported GPU names can be masked; the WebKit probe reported “Apple GPU”
on Linux, which is not evidence of Apple hardware or Metal.
