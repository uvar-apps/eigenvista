# EigenVista agent guide

This is the self-contained working agreement for the standalone
[`uvar-apps/eigenvista`](https://github.com/uvar-apps/eigenvista) repository.
The Rust workspace, `app/`, `crates/`, `docs/`, `tools/`, and `fixtures/` live at
the repository root. There is no `next/` wrapper or legacy application code here.

EigenVista was extracted from the Molekel rewrite with eight rewrite-only
commits; the [migration record](docs/migration.md) identifies the pinned original
source and changed commit identities. Historical plans, original Git tags, and
legacy implementation remain in the original repository, not this checkout. Use
`eigenvista-*` Rust packages, the `eigenvista-convert` CLI, and `.eigenvista`
for new documents. Older `.molekel` preview documents remain readable. See the
[native profile](docs/preview-format.md) before changing format compatibility.

## Orientation

- [Handoff](docs/handoff.md): current work, next gates, and common traps.
- [Architecture](docs/architecture.md): ownership and data contracts.
- [Development](docs/development.md): exact setup/build/test commands.
- [Documentation index](docs/README.md): planning through delivery.
- [User guide](docs/user-guide.md): actual controls, supported files, and limits.

## Working agreement

- Inspect `git status`, current branch, and relevant diffs before editing.
  Preserve existing work. Continue on the current branch; do not create branches
  or worktrees, commit, tag, or push unless requested.
- Implement scientific/native behavior in Rust and shared UI in TypeScript.
  Do not copy legacy C++ application code or add a legacy build to this repository.
- Keep the original Molekel checkout unchanged. Historical research is linked
  to its pinned original revision, not copied here as current implementation.
- Preserve frozen scientific fixtures and provenance. `fixtures/legacy/` contains
  eight data-only regression inputs and their license, not legacy application code.
- Never stop or restart the user's app or an unknown server. Check port ownership
  before development/browser work; a server in another checkout is not this app.
- Treat imported documents as untrusted. Preserve validation, allocation bounds,
  source hashes, exact scientific data, and atomic-save guarantees.
- Exclude private `chat-*.md` exports from reads, commits, and source packages.
- Keep current behavior, decisions, tests, and limitations documented. This is
  a development preview, not completion of v1 or the historical M0-M7 plan.

Before running tools, from the repository root:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
```

Never use system `/tmp`, including for screenshots, test fixtures, or build
staging. Existing project wrappers enforce the same location. Generated WASM,
builds, packages, reports, and node_modules are ignored; retain both lockfiles.

## Change and verification rules

- Keep chemistry, format validation, and import algorithms in the Rust crates.
  Do not duplicate scientific logic in React or shaders without a tested contract.
- Preserve explicit units, basis normalization, density semantics, affine grid
  order, durable saved meshes, and source identity. Update native and WASM
  reference tests when a shared contract changes. Never regenerate expected
  scientific results simply to make a failing test pass.
- Run Rust formatting, scientific/format tests, workspace/all-target Clippy,
  and the production WASM/frontend build for runtime changes. Test the Tauri
  shell when changing native behavior. Commands are in the development guide.
- For UI/rendering changes, also run Chromium/WebKit workflows, inspect desktop
  and mobile screenshots, and verify canvas pixels and camera interaction.
  A successful compile or screenshot file alone is not a rendering test.
- For packaging changes, run packaging tests and a full verified ZIP build.
  Keep signing credentials out of tester builds. Do not publish or upload.
- For documentation-only edits, verify referenced code, commands, relative
  links, and agreement with status. Do not claim runtime tests were rerun.
- Update `docs/status.md` with evidence and changed decisions. Update the user
  guide for behavior changes and architecture/format docs for contract changes.
- Report tests actually run and any remaining gaps. Do not mark M0-M7 complete
  from preview checks or claim Linux/Windows support from portable dependencies.

The existing [license](LICENSE) is GPL-2.0-or-later. Preserve notices and locked
dependency provenance; do not silently relicense the rewrite.
