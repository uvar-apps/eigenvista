# Frozen native preview compatibility corpus

These are immutable input files, not outputs generated during tests. They freeze
actual older/current Rust encoders before typed encoding, geometry storage or
asset-layout work. Producing runtime revision for the current inputs is EigenVista
`06ecbb9cef6e52a99417f88856cb98cffc3e9df2`, version 0.5.12. The historical input
uses Molekel's Rust rewrite at `24d270e4589642f741ab438d6850f56a768cb66c`, tag
`v0.3.2`. No legacy C++ Molekel file support is implied.

| ID | Contents | Archive bytes |
| --- | --- | ---: |
| `legacy-h2-0.3.2` | Genuine old Molekel profile, row-wise atoms, two analytic orbitals, one density, 16³ grid and three signed meshes | 29,673 |
| `structure-0.5.12` | Two atoms with deliberately missing bonds; empty basis/orbital/density/surface arrays; constructed 2³ generic scalar grid with integral f64 and signed-zero probes | 1,722 |
| `water-rhf-0.5.12` | Frozen PySCF RHF/cc-pVDZ science, 24 AOs/MOs, nonuniform 8/1/3-primitive rows, authoritative reflected affine grid, three 16³ cached orbital/density meshes | 27,433 |
| `hydroxyl-uhf-0.5.12` | Frozen PySCF UHF/STO-3G science, six AOs, 12 spin MOs, four matrices, authoritative reflected affine grid and three 16³ cached meshes | 13,225 |

The archives total 72,053 bytes. `manifest.json` identifies each archive, exact
uncompressed manifest, semantic model JSON, hashes, counts and producing driver.
Each `*.manifest.json` is the exact `manifest.json` entry from its archive: it
pins every array's name, dtype, shape, byte count and SHA-256. Actual array bytes
are in the archive and checked against those descriptors. `*.document.json`
records the producer's semantic model, independently of today's decoder.
Historical JSON retains original atom rows; current JSON uses atom columns.

Archive hashes identify these immutable inputs. Current writer regressions
compare manifest and decompressed entry bytes, **not** newly compressed ZIP
bytes or ZIP metadata. Compression byte identity is not a new format contract.
The exact historical archive SHA-256 is
`d82999469208e83662b8aec951e68a8307823f00556cfbc513a0760abafdfee7`.

## Scientific and layout boundaries

RHF/UHF basis, orbital, density and authoritative grid arrays were copied
unchanged from [the independent numerical inputs](../pyscf/README.md); their
source file hashes are recorded. The producer adds only inferred display bonds,
view settings and cached meshes. Independent numerical answers were not
regenerated. Cached mesh bytes are format/persistence expectations, not new
independent topology or scientific-accuracy references.

The structure scalar is intentionally constructed layout data with no assigned
physical units. Its C–O separation is 1.25 bohr. Pure format decode preserves
the empty bond list; Open/import separately reports supplementing `[[0,1]]`
and requiring an explicit Save. Other inputs already contain their display bonds.

Native encoding retains f64 bits, including negative zero. Native tests use
bit comparisons as well as explicit dtype probes, so integral-valued f64 arrays
must not become u32. The current browser JSON Save path folds -0 to +0; browser
comparisons use the documented JSON-canonical model and canonical source hash.
This work does not change that contract or introduce a hash/profile migration.

The tests require all four IDs, check positive inputs before corruption cases,
and retain existing malformed-profile tests. Native regressions exercise exact
model bits, source associations, ordinary Save/reopen, full current writer
logical bytes, row/column forms, nonuniform primitives and negative controls for
dtype, shape, binary digest, source mismatch and a correctly rehashed invalid
index. Actual-WASM/browser coverage is in `app/tests/native-fixtures.spec.ts`.

## Producer provenance

Both producers ran on Apple M4/macOS 27.0 with Rust 1.99.0, optimized native
libraries. The legacy archive is a reconstruction from the **unmodified older
library source**, not a claim that the original release build/compiler was
reproduced. Its original selected dependency versions/checksums were retained;
only unrelated workspace members were removed in ignored staging. It was not
created by relabeling today's encoder. The actual historical fixture driver is
preserved byte-for-byte as `produce-legacy-0.3.2.rs`.

`produce-current.rs` is a manual producer linked to unchanged 0.5.12 libraries.
The index records driver/Cargo.lock hashes and source revisions. Neither driver
is part of any test/build lifecycle. They cannot update expected inputs on a
failing test. `.gitattributes` pins archive/JSON bytes and producer-source LF
line endings on checkout, including when `core.autocrlf` is enabled.

## Deliberate reconstruction only

Do not overwrite this corpus to make a test pass. A planned new producer/layout
requires a new identified fixture and explicit review of its provenance and
logical changes. Reconstruct into a **new directory under repository tmp**;
record compiler/platform and verify source/dependency identity first. Hash or
logical differences are evidence to review, not an instruction to replace an
existing expected file. Normal tests need no historical checkout or generator.

For a current-producer check, ensure scientific/format source and Cargo.lock
still match the producing revision. With normal setup from AGENTS.md:

```sh
(
set -eu
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
unset RUSTUP_TOOLCHAIN
git diff --exit-code 06ecbb9 -- crates/eigenvista-core/src crates/eigenvista-format/src Cargo.lock
cargo build --locked --release -p eigenvista-format --message-format=json > tmp/native-producer-build.jsonl
node --input-type=module <<'JS'
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
const artifacts=fs.readFileSync('tmp/native-producer-build.jsonl','utf8')
  .trim().split('\n').map(line=>JSON.parse(line));
const library=name=>artifacts.find(item=>item.reason==='compiler-artifact'
  &&item.target.name===name).filenames.find(file=>file.endsWith('.rlib'));
const core=library('eigenvista_core');
execFileSync('rustc',['--edition=2024','-O','fixtures/native/produce-current.rs',
  '-L','dependency='+path.dirname(core),
  '--extern','eigenvista_core='+core,
  '--extern','eigenvista_format='+library('eigenvista_format'),
  '--extern','serde_json='+library('serde_json'),
  '-o','tmp/native-producer'],{stdio:'inherit'});
JS
./tmp/native-producer tmp/native-producer-new-output
)
```

Stop if runtime source drifted; do not call a changed writer the 0.5.12 producer.
The driver rejects an existing output directory or a path outside repository
tmp. Choose new staging/log paths when retaining prior diagnostic runs.

For the historical producer, the complete pinned-source export recipe is in
[Plan 002](../../plans/002-format-compatibility-fixtures.md). Read Molekel only;
stage/build under EigenVista tmp. Copy `produce-legacy-0.3.2.rs` into the staged
old format crate's `examples/research_fixture.rs`, retain old core/format source
and dependency versions, then run that example with a fresh tmp output path.
Do not substitute the current library or merely rename profile identifiers.
Different reconstructed ZIP bytes/platform math require their own recorded
provenance and review rather than pretending to be the measured input above.

## License

New container/model fixtures and producer drivers use this project's
GPL-2.0-or-later license; see [LICENSE](LICENSE). Preserve the PySCF/basis-data
provenance and Apache-2.0 attribution described in the independent input README.
No PySCF implementation, historical application library, or C++ code is vendored
into this corpus. The old Rust libraries remain read-only reference material.
