# Hosted verification and exact publication preflight

Date: 11 November 2026. Status: implemented.
Tracked in [#32](https://github.com/uvar-apps/eigenvista/issues/32),
[#33](https://github.com/uvar-apps/eigenvista/issues/33) and
[#34](https://github.com/uvar-apps/eigenvista/issues/34), through
[PR #45](https://github.com/uvar-apps/eigenvista/pull/45).

## Decisions

Hosted verification runs the existing pinned checks on Linux and explicit
desktop tests on macOS. The workflow has read-only repository permissions,
immutable action SHAs, repository-local temporary storage and seven-day failure
artifacts. Its CI-only Playwright config imports the local config, retaining the
same engines, workers and test selection while owning its server and recording
failure screenshots/traces/reports. It does not require caches, secrets or
changes to scientific references. See [CI details](../../ci/README.md).

Hosted package setup retains provider-specific sources. Repeated Azure Ubuntu
DNS failures and a successful AWS EC2 mirror established a provider difference,
not a general DNS failure. A bounded preferred-host lookup may select the fixed
Kernel.org Ubuntu HTTPS fallback only after a successful normal-TLS InRelease
probe. Existing entries/priorities, signed-index validation and the apt sandbox
remain; strict update errors prevent stale indexes from hiding setup failures.
Failure probes compare public hosts as runner/root/apt without exposing proxy
values. Local mirror probes and hosted installation are distinct evidence.

Clean hosted installation exposed an undeclared dependency: local TypeScript
had found Node declarations in an enclosing home-directory node_modules.
The project now explicitly locks @types/node 26.1.2, the same declarations
previously exercised locally, and enables Node types for tests/configuration.
Existing dependency versions, Node/Rust compiler pins and runtime packages are
unchanged. This build repair is part of #32, not a suppression of type checks.

The first usable Linux browser run also exposed existing test timing assumptions.
Two camera checks now wait for real draw activity to settle and target the
actionable canvas before dragging, retaining their image-change assertions.
Their hosted poll errors did not contain a completed comparison: a slow
compositor capture could exhaust the enclosing five-second poll before its
first sample. Settled captures now run outside that nested poll, within the
existing test/capture budgets; the checks still require changed image bytes.
The density test retains its early actual-sampling/timer/frame heartbeat, then
holds only a real terminal result to test cancellation before publication after
variable camera work. It explicitly distinguishes that stage from the unchanged
256-cubed checks, which cancel real unfinished computation. No application
camera/cancellation defect was reproduced by this investigation; no production
behavior or individual test timeout was changed. A separate 35-minute CI test
step deadline leaves time for failure diagnostics within the 60-minute job.

Molden density construction skips only exactly zero occupations after full
orbital parsing and validation. It retains every listed orbital and its
metadata, accepts all supported nonzero fractions, and keeps missing-occupation
behavior and eager density allocations. No screening threshold, lazy density
representation or change to supplied arbitrary matrices is introduced.

Publication calls the new WASM `validate_document` export. Its Rust preflight
is shared with `encode`: full Document/source-hash validation, current generic
serde/column packing, array bytes/digests, exact manifest bytes and total
uncompressed bytes. Save then compresses those prepared entries; publication
discards them without ZIP construction. The older WASM `validate` remains
model-only for compatibility. Both full paths deserialize once and validate
through the shared preflight; redundant WASM Save model validation is removed.

The production limits remain 8,191 array entries plus the manifest, an 8 MiB
manifest and 128 MiB total uncompressed data. Retained scientific inputs and
meshes count. This is not a mesh-only estimate, a typed-encoding redesign, a
new source hash or profile, or constant-cost validation. Generic JSON/array
allocations and hashing still scale with retained data.

## Verification design

Seven import regressions use hand-expanded independent densities/gradients and
cover fractional restricted/UHF/beta-only/all-virtual data, signed zero, tiny
nonzero occupations, missing metadata, malformed virtual orbitals and asymmetric
supplied-matrix persistence. Frozen scientific answers are unchanged.

Format tests exercise the production preflight at reduced exact limits for
entry count, manifest bytes and total bytes with retained science/meshes.
They check the unchanged actual production constants; they do not allocate
multi-GiB serde trees to claim full-size boundary execution. Malformed
references/arrays, source mismatch and nonfinite data still fail. The original
water manifest hash and decoder equality preserve entry/dtype/shape/content
coverage without turning compression bytes into a format contract.

Actual WASM and worker tests compare preflight with Save, including a real
oversized manifest that the model-only API accepts. A UI test forwards real
validation/progress and holds only the final result; cancellation preserves the
previous decoded document and a fresh registration regenerates identical meshes.
Existing multi-orbital budget/error regressions remain in the full suite.

## Native measurements

Measured on Apple M4 / macOS 27.0 (26A428), Rust 1.99.0, optimized native builds.
Baseline source was merged main `3fef7d4`. These are scoped measurements,
not browser latency or universal memory guarantees.

### Molden import

Three isolated processes per version/workload; five imports per stress process
and 10,000 per small-reference process. Reported import medians are medians of
the process means. Timing covers import_bytes, excluding source preparation,
diagnostics and result destruction. RSS includes the entire process.

| Input | Before | After | Observation |
| --- | --- | --- | --- |
| Synthetic UHF, 512 AOs, 512 listed MOs, 40 occupied | 56.781 ms | 5.792 ms | About 9.8x for this bounded stress input |
| Frozen hydroxyl UHF, 6 AOs, 12 MOs, 9 occupied | 0.028360 ms | 0.028496 ms | No meaningful improvement |

The synthetic input is valid for the import profile, not a converged physical
wavefunction. Its SHA-256 is
`20bb0ea28d26ceeff3fe8d9d919dc324b95bdb06701c7b697da678a3bc0d9be7`.
The hydroxyl input hash is
`03db46e76e25386a941b501d520abd06bca19bd0ecdf53582b8513cacf4ec890`.
Density hashes match before/after for both. Median stress maximum RSS was
14,155,776 versus 14,106,624 bytes; small-reference RSS was about 3 MB.
Allocations are unchanged and no memory reduction is claimed. First stress
processes had higher startup time/RSS in both versions.

### Publication preflight

Frozen PySCF water with its scientific inputs, retained authoritative grids and
real 64-cubed orbital meshes; five operations per isolated process. JSON load
is excluded from operation timings but included in process maximum RSS.

| Retained meshes | Original encode median | New validation median | Before/after max RSS, bytes |
| --- | --- | --- | --- |
| 1 | 29.534 ms | 9.350 ms | 60,145,664 / 58,441,728 |
| 15 | 52.197 ms | 13.099 ms | 72,695,808 / 70,615,040 |
| 31 | 88.296 ms | 22.345 ms | 97,959,936 / 96,043,008 |

The complete Save ZIP bytes matched the original encoder for all three measured
documents. This is measured compatibility evidence; the regression contract
pins uncompressed content, not ZIP compression choices. Native format costs
still grow with retained data. These results isolate removing compression;
they do not establish a memory bound or end-to-end generation speedup.

## Reproduction and evidence

With the normal repository temporary-directory setup and RUSTUP_TOOLCHAIN unset:

```sh
cargo run --locked --release -p eigenvista-import --example molden_import_benchmark -- stress-uhf 5
cargo run --locked --release -p eigenvista-import --example molden_import_benchmark -- hydroxyl-uhf 10000
cargo run --locked --release -p eigenvista-format --example publication_benchmark -- prepare tmp/publication-recheck
cargo run --locked --release -p eigenvista-format --example publication_benchmark -- validate tmp/publication-recheck/batch-1.json
cargo run --locked --release -p eigenvista-format --example publication_benchmark -- encode tmp/publication-recheck/batch-1.json tmp/publication-recheck/batch-1.eigenvista
```

Use direct optimized executable runs with /usr/bin/time -l on macOS for RSS;
cargo startup/build time is not import/validation time. Original executables,
inputs and raw before/after logs remain under repository tmp/issue33-* and
tmp/publication-validation. Integration logs are under
tmp/2026-11-11-ci-import-validation.

The canonical hosted job results and reviewed source head are retained in
[PR #45 checks](https://github.com/uvar-apps/eigenvista/pull/45/checks).
All required hosted jobs must pass before merging. Hosted compilation/browser
tests do not qualify physical macOS controls/dialogs, clean-Mac installation,
HiDPI or Linux/Windows application distributions. Source version remains 0.5.12;
the published tester ZIP predates this batch.
