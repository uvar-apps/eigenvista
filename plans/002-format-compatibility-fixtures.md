# Plan 002: freeze authentic native-format compatibility inputs

Planned at `06ecbb9cef6e52a99417f88856cb98cffc3e9df2`, 12 November 2026.
Issue: first phase of [#39](https://github.com/uvar-apps/eigenvista/issues/39).
Priority P3; effort S–M; risk low; dependencies: none.
Status: fixture phase implemented on `codex/vite-maintenance-and-native-fixtures`
after user authorization. Acceptance evidence is in [current status](../docs/status.md#vite-maintenance-and-native-fixtures-12-november-2026)
and the implementation PR checks. Typed encoding was outside this fixture phase;
its subsequently authorized implementation is recorded in
[Plan 004](004-typed-native-encoding.md). The planning baseline/recipe below is
historical, including its instructions to leave #39 open at the fixture checkpoint.

## Planning baseline

The native format is already a ZIP containing manifest.json and binary numeric
entries. `crates/eigenvista-format/src/lib.rs` recognizes matched EigenVista and
Molekel polynomial-v1 identifiers. It packs f64/u32 little-endian arrays and
supports older row references, newer coalesced columns and atom columns.
Authoritative model data remain f64; source hashes identify the science behind
saved surfaces. Budgets are 8,191 arrays plus manifest, 8 MiB manifest and
128 MiB total uncompressed bytes, shared by validation and Save.
The existing signed-zero contract is explicit in docs/preview-format.md: native
binary encoding retains f64 bits; browser JSON Save folds -0 to +0, and source
hashing canonicalizes both signs. Pin native -0 bytes/roundtrips with bit checks,
but compare WASM/browser Save against JSON-canonical semantics. Do not turn this
fixture work into a JSON transport or hash migration.

The current legacy test has this pattern:

```rust
let canonical = encode(&document).unwrap();
let legacy = support::with_profile(&canonical, "molekel", &["molekel-preview-polynomial-v1"]);
```

It is useful for identifier matching but cannot characterize a historical
producer. `src/preflight_tests.rs` also pins a current water manifest; retain it.
Future indexed meshes, typed encoding and #47 layout work need immutable prior
inputs rather than regenerated aliases of today's writer.

## Research evidence to preserve

The unchanged core/format Rust crates at Molekel tag v0.3.2, commit
`24d270e4589642f741ab438d6850f56a768cb66c`, generated a genuine old-profile input
under Rust 1.99.0 in an isolated temporary workspace. Original selected
dependency versions/checksums were preserved; only unused workspace members
were removed. Current WASM successfully decoded it and re-saved/reopened its
science, grid and three signed surfaces with source associations intact.

Candidate: `tmp/2026-11-12-research/compat39/hydrogen-0.3.2.molekel`, 29,673 bytes,
SHA-256 `d82999469208e83662b8aec951e68a8307823f00556cfbc513a0760abafdfee7`.
Its producer driver, historical libraries/locks, expected semantic JSON,
manifest and 36 entry digests remain beside it. This is a reconstructed old
producer, not a claim about an original tester's compiler/build environment.
If these ignored artifacts are absent, reproduce from the pinned historical
Rust source using the recipe below; never substitute today's encoder with a
relabeled manifest. If the pinned source cannot be obtained, STOP. Do not invent
an older fixture. A reconstruction with a different archive hash must receive
its own recorded producer/environment/hash provenance and review, not replace
the measured candidate under its old identity; compression bytes are not a
cross-platform reproducibility promise.

### Missing-artifact reconstruction recipe

This standalone recipe needs the existing read-only Molekel reference checkout
to contain commit `24d270e4589642f741ab438d6850f56a768cb66c`, Rust 1.99.0 and the
historical cached dependencies. It writes only EigenVista tmp. If offline
resolution fails, do not substitute dependency versions: obtain the pinned
packages or report the missing prerequisite. Compare retained package
name/version/checksum records with the original lock before trusting output.

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const ref='/Users/ugo/projects/molekel';
const sha='24d270e4589642f741ab438d6850f56a768cb66c';
const base=path.resolve('tmp/compatibility-producer-0.3.2');
if(fs.existsSync(base))throw new Error('Use a new staging directory; preserve existing artifacts');
fs.mkdirSync(base,{recursive:true});
const git=(...args)=>execFileSync('git',['-C',ref,...args]);
const archive=git('archive',sha,'next/crates/molekel-core','next/crates/molekel-format');
execFileSync('tar',['-xf','-','-C',base,'--strip-components','1'],{input:archive});
const lock=git('show',sha+':next/Cargo.lock');
fs.writeFileSync(base+'/Cargo.lock',lock);
fs.writeFileSync(base+'/original-Cargo.lock',lock);
let manifest=git('show',sha+':next/Cargo.toml').toString();
manifest=manifest.replace(/^members =.*$/m,'members = ["crates/molekel-core", "crates/molekel-format"]')
 .replace(/^default-members =.*$/m,'default-members = ["crates/molekel-core", "crates/molekel-format"]');
fs.writeFileSync(base+'/Cargo.toml',manifest);
const examples=base+'/crates/molekel-format/examples';
fs.mkdirSync(examples,{recursive:true});
fs.writeFileSync(examples+'/compat_fixture.rs',`use molekel_core::{fixtures,compute};
fn main(){
 let out=std::env::args().nth(1).expect("output directory");
 std::fs::create_dir_all(&out).unwrap();
 let mut doc=fixtures::hydrogen_pair();
 for field in ["bonding","antibonding"]{
  let grid=compute::sample(&doc,field,16).unwrap();
  let hash=compute::source_hash(&doc,field).unwrap();
  for iso in [0.08,-0.08]{
   let s=compute::mesh(&grid,iso,field,&hash,"#259d86",0.6).unwrap();
   if !s.indices.is_empty(){doc.surfaces.push(s);}
  }
  if field=="bonding"{doc.grids.push(grid);}
 }
 std::fs::write(format!("{out}/hydrogen-0.3.2.molekel"),molekel_format::encode(&doc).unwrap()).unwrap();
 std::fs::write(format!("{out}/expected.json"),serde_json::to_vec(&doc).unwrap()).unwrap();
}`);
JS
cargo +1.99.0 run --offline --release --manifest-path tmp/compatibility-producer-0.3.2/Cargo.toml -p molekel-format --example compat_fixture -- "$PWD/tmp/compatibility-producer-0.3.2/output"
```

Only workspace metadata and the driver are new. Preserve the extracted core and
format library source unchanged. Record original commit, compiler/platform,
retained dependency versions, complete input/archive hashes and logical entries.
Validate with current native/WASM readers before adopting any fixture. The
semantic expected JSON is not an independent scientific accuracy reference;
existing independently generated scientific fixtures still supply that role.

## Scope and drift check

Read AGENTS.md, docs/preview-format.md and issue comments. Run:

```sh
git diff --stat 06ecbb9..HEAD -- crates/eigenvista-format crates/eigenvista-core/src/model.rs crates/eigenvista-core/src/compute.rs
```

Scope: add a small `fixtures/native/` corpus, provenance/license/expected logical
entries, format compatibility tests, actual-WASM fixture tests, docs/status and
handoff. Follow `fixtures/pyscf/README.md` for frozen provenance and
`crates/eigenvista-format/tests/reference_roundtrips.rs` for exact scientific
roundtrips. No writer refactor, source-hash migration, limit increase, altered
scientific answers, f32 narrowing or changes to historical input bytes.
Existing user fixtures and private exports are out of scope.

## Steps

1. Verify the candidate hash and producing revision before copying it into
   the new fixture directory. Record that the input is reconstructed from the
   unmodified historical library, the fixture driver/compiler and dependency
   provenance. Include GPL-2.0-or-later fixture/source provenance.
2. Freeze a few small current-profile examples: a structure, restricted and
   unrestricted quantum data, authoritative grid and cached signed meshes.
   Include row/column forms, nonuniform primitive lengths, empty numeric
   arrays, integral-valued f64 and signed zero. Use existing frozen independent
   scientific inputs; do not regenerate their expected physics.
3. Record exact uncompressed manifest/array entry bytes or hashes, dtypes,
   shapes, entry coverage and expected semantic data. Compression bytes may
   identify an artifact but are not a new format contract.
4. Add tests that read those committed bytes directly, without invoking today's
   encoder to manufacture the input under test. Verify full model/source-hash
   validation, source associations, exact scientific data, decode→Save→decode
   stability and canonical output identifiers. Native tests must check selected
   negative-zero bits explicitly; browser Save uses the existing JSON-canonical
   comparison and unchanged canonical source hash, not -0 bit retention.
   Keep identifier-negative and
   malformed-input cases; no weaker roundtrip-only replacement.
5. Exercise actual WASM/worker Open/Save/reopen with the old input, preserving
   cached geometry and explicit missing-bond supplementation semantics.
6. Record results and remaining typed-writer work in #39 and current docs.
   Do not close the larger issue as if typed encoding were implemented.

## Commands and acceptance

From the root, create/export repo tmp and unset RUSTUP_TOOLCHAIN as in AGENTS.md:

```sh
cargo test --locked -p eigenvista-format
cargo test --locked -p eigenvista-import --test native_compatibility
cargo fmt --all --check
cargo clippy --locked --workspace --all-targets -- -D warnings
npm --prefix app run build
(cd app && ./node_modules/.bin/playwright test tests/format-validation.spec.ts tests/references.spec.ts tests/cube.spec.ts tests/molden.spec.ts)
```

Check server ownership first. Success requires new immutable-input regressions,
both engines passing the old/current archive checks, unchanged reference inputs
and explicit fixture hashes/provenance. Use full standard browser/packaging and
hosted gates before an authorized merge when shared runtime tests are changed.

- [ ] Genuine old producer input exists; test setup never regenerates it.
- [ ] Logical entry/manifest drift and wrong dtypes/shapes/hashes are detectable.
- [ ] Science, grids, signed mesh associations and Save/reopen are preserved.
- [ ] Original scientific expected results and format/resource/hash contracts match.
- [ ] Updated docs distinguish fixture completion from future typed encoding.

Stop if the old input fails semantic/hash validation, dependency drift prevents
an authentic reconstruction, expected numeric bytes are uncertain, or passing
requires altering a frozen reference. Report the discrepancy rather than
rewriting fixtures. Follow the authorized issue/branch/PR workflow; no Git
publication is implied by this plan.
