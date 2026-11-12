# Plan 001: update only the affected Vite 7.3 dependency

Planned at `06ecbb9cef6e52a99417f88856cb98cffc3e9df2`, 12 November 2026.
Issue: [#46](https://github.com/uvar-apps/eigenvista/issues/46).
Priority P3; effort S; implementation risk low–medium; dependencies: none.
Status: implemented on `codex/vite-maintenance-and-native-fixtures` after user
authorization. Acceptance evidence is in [current status](../docs/status.md#vite-maintenance-and-native-fixtures-12-november-2026)
and the implementation PR checks. The planning baseline below is historical;
this plan alone does not authorize further Git publication or upgrades.

## Planning baseline and intent

The source is a Rust/WASM scientific library with a React/Three UI and Tauri
shell. Work only in `/Users/ugo/projects/eigenvista`; Molekel is read-only.
Current `app/package.json:38` contains `"vite": "^7.3.0"`; the installed/locked
resolution is 7.3.6. `tools/run.mjs:49` starts the standard dev server on
127.0.0.1. `app/vite.config.ts` uses React, strict port 5178 and ES module workers.
Tauri production loads `../dist`; production is not a Vite development server.

Five upstream advisories are recorded in #46. Project exploitation was not
reproduced. Source/configuration preconditions and exact candidate-lock checks
are in [the research result](2026-11-12-research.md). Normal SPA behavior excludes
the custom-middleware issue; loopback alone is not a general security exclusion.

Isolated resolutions to 7.3.8 changed no transitive package entries and reported
zero advisories at the research date. Keep existing caret declaration style,
raise its floor to `^7.3.8`, and lock exactly the reviewed 7.3.8 resolution.
Do not upgrade Vite 8, Node, Rust, bindgen, scientific libraries or unrelated npm
packages. Recheck current registry/advisories when executing a dated plan.

## Drift check, scope and workflow

First read AGENTS.md and current issue comments, inspect `git status`, then run:

```sh
git diff --stat 06ecbb9..HEAD -- app/package.json app/package-lock.json app/vite.config.ts tools/run.mjs
```

Reconcile changed source before proceeding. Scope: the Vite declaration and its
lock entry, dependency/verification/handoff documentation, and required notice
updates if bundled license text changed. No application logic, source hashes,
fixtures or scientific data should change. Match the existing exact-lock and
documented issue/branch/PR workflow. Use `codex/` for an authorized branch; do not
commit, push, merge, tag or publish without operator authorization.

## Steps and verification

1. Save manifest/lock hashes, inspect `npm --prefix app audit --json`, and verify
   the official [7.3.8 changelog](https://github.com/vitejs/vite/blob/v7.3.8/packages/vite/CHANGELOG.md)
   and updated #46 advisory state. Nonzero audit exit means findings exist,
   not automatically an install failure. Never use broad `npm audit fix`.
2. Change only the Vite floor, resolve the selected patch, and inspect every
   lockfile difference. Expect only Vite version/integrity/resolved URL and
   root declaration metadata. If another package changes, explain and review
   it before proceeding; do not silently accept the broad resolution.
3. Clean install with the pinned environment. Verify installed Vite 7.3.8 and
   audit again; the five reported advisories should no longer apply.
4. Run the commands below. Verify real workers/WASM asset loading, Open/Save,
   shader/volume behavior and native production assets, not compilation alone.
   Inspect actual desktop/mobile captures and CI at the reviewed PR head.
5. Update dependency notices where needed, #46, docs/status.md and handoff.md.
   Keep #46 open until the actual maintenance change passes its gates.

From the repo root:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
npm --prefix app ci
npm --prefix app audit --json
cargo fmt --manifest-path Cargo.toml --all --check
npm --prefix app test
cargo clippy --manifest-path Cargo.toml --locked --workspace --all-targets -- -D warnings
cargo test --manifest-path Cargo.toml --locked -p eigenvista-desktop
npm --prefix app run build
npm --prefix app run test:e2e
npm --prefix app run test:packaging
npm --prefix app run desktop:build
```

Check port ownership before e2e; do not stop another server. Success means zero
build/lint errors, passing existing tests and all three hosted Verify jobs, plus
reviewed captures/native frontend. No new tiny test merely asserting a version
string is required: clean installation, lock comparison and real integration
exercise the relevant behavior.

## Done and stop conditions

- [ ] Vite is the reviewed 7.3 patch; unrelated package/compiler versions match.
- [ ] Clean audit no longer reports these advisories; new findings are explained.
- [ ] Production/native/browser/packaging checks and actual PR checks pass.
- [ ] Documentation, issue evidence and authorized PR contain the real results.

Stop for unexplained lock drift, a changed advisory prerequisite/exposure, a
production worker/asset regression, or a required unrelated dependency upgrade.
Do not label untested Windows/editor environments safe from macOS results.
