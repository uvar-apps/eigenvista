# Plan 004: typed native encoding

Date: 12 November 2026 (Australia/Perth). Baseline: merged main `f92e063`,
EigenVista 0.5.12. Tracks the remaining phase of
[#39](https://github.com/uvar-apps/eigenvista/issues/39).
Status: implemented on `codex/typed-native-encoding`, following user authorization
for a separate PR. Fresh results and final integration evidence are in
[status](../docs/status.md#typed-native-encoding-12-november-2026) and the tracking
issue. The plan below records the agreed work and acceptance sequence.

## Contract

Replace the encoder's whole-document numeric `serde_json::Value` tree and
flattened numeric clones with typed array emission. Keep small metadata/reference
objects, existing model/source validation, exact shared publication/Save budget
accounting and the existing ZIP writer. Leave decoding and atomic saving alone.

This is an implementation change within the existing polynomial-v1 profile.
Manifest and decompressed array bytes must match the prior writer exactly;
no profile identifier, schema, hash, precision or limit change is intended.
The old Molekel profile remains readable. The immutable corpus from PR #49 and
independent scientific reference inputs must not be regenerated or edited.

Preserve these representation rules:

- Traverse metadata keys in their existing sorted order. Emit all uniform numeric
  columns before visiting individual rows, including nested basis term powers.
- Coalesce only collections with at least two rows and equal nonempty numeric
  shapes. Empty numeric vectors stay inline `[]`; nonuniform rows stay separate.
- Keep coefficient, density, grid-sample and mesh vectors flat. Equal sample
  counts can coalesce even when grids have different dimensions.
- Keep scientific floats as f64, including integral values and negative zero.
  Integer arrays use u32 only when all values fit. Preserve the whole-array f64
  fallback for currently unbounded `usize` surface resolutions.
- Keep metadata nulls, field names, array IDs, descriptors, entry order and
  source associations. Exhaustive model destructuring should expose future
  schema additions rather than silently discarding fields.

## Work and verification

1. Capture a fresh unchanged-writer optimized binary and three isolated 128³
   encode measurements before changing runtime code. Preserve input and
   executable identity, raw timings and maximum-RSS logs under repository tmp.
2. Capture additional small logical-layout expectations from that writer for
   singleton/two-row, empty/nonuniform, nested-term and wide-integer edge cases.
   Ordinary tests must not regenerate their expected values.
3. Implement the typed writer with checked shape/byte arithmetic and fallible
   binary-buffer reservation. Keep shared preflight and unchanged thresholds;
   retain exact boundary, malformed-model and malformed-container tests.
4. Run the frozen native suite and independent edge cases. Compare before/after
   native memory and timings using the identical example/input/toolchain and
   separate fresh processes. Review exact logical bytes independently.
5. Run standard Rust, WASM/frontend, native and packaging checks, the full
   Chromium/WebKit suite, inspect current captures, and obtain independent
   review. Update architecture/profile/development/status/handoff documentation
   and issue evidence with actual results.
6. Push a separate PR. Require all three actual hosted Verify jobs at the
   reviewed head before merging, then verify issue closure and local `main`.

## Measurement boundaries

The native example uses an authoritative 128³ grid sampled from the analytic H2
fixture. Sampling, input identification and optional file writing are outside
the encode timer. Maximum RSS includes the whole isolated optimized process,
including sampling and compression. Retain three independent observations per
implementation rather than treating an in-process loop as independent RSS.

Existing saved-surface source validation still uses core's JSON-based hashing;
that is #40's separate concern. Metadata, prepared binary entries, ZIP output
and decoder allocations remain. Measurements do not establish browser/WASM
peak memory, recoverability of every allocation or clean-machine distribution
qualification. No dependency/compiler upgrade, UI/transport change, version
bump, tag, release or tester ZIP is part of this phase.
