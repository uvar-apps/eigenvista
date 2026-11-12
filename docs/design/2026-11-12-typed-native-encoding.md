# Typed native encoding within the existing preview profile

Date: 12 November 2026 (Australia/Perth). Status: implemented.
Tracks the remaining encoding phase of
[#39](https://github.com/uvar-apps/eigenvista/issues/39), from main `f92e063`.
The [implementation plan](../../plans/004-typed-native-encoding.md) records the
verification sequence; fresh results belong in status and the issue/PR.

## Decision

Write numeric entries directly from the typed Rust document, retaining only
small JSON metadata and array-reference objects. Keep the existing model/source
validation, shared publication/Save preflight, exact descriptor/manifest budget
accounting, ZIP compression and decoder. This removes the whole numeric JSON
tree and its flattened per-number clones without changing stored data.

The writer is model-aware rather than a new generic Serde framework. The finite
set of supported scientific structures makes explicit typed traversal small
enough to audit against the persisted contract. Exhaustive model destructuring
exposes future field additions at compile time; frozen logical output and edge
tests guard the current traversal and numeric choices.

## Compatibility

The output contract remains the existing `[0, 1]` EigenVista polynomial-v1
profile. Array IDs, sorted metadata keys, column-before-row ordering, optional
nulls, flat vector shapes, dtypes, SHA-256 descriptors and decompressed entry
bytes must match the previous encoder. No profile bump or migration is needed
for byte-identical logical output. Genuine old Molekel files remain readable;
compression byte identity is not a new portability promise.

Coalescing is based on equal nonempty numeric shapes in collections with at
least two rows. Nonuniform rows retain individual references; empty vectors
remain inline. Scientific f64 fields keep their bits, including integral values
and negative zero. Existing integer arrays remain u32 when all values fit, with
the original whole-array f64 fallback for oversized unsigned surface resolutions.
This preserves that existing writer behavior, not a new promise that arbitrary
oversized resolution metadata can be decoded losslessly.

The [immutable corpus](../../fixtures/native/README.md) and additional small
layout expectations are captured from the unchanged earlier producer. Tests
must not regenerate expected inputs or alter independent scientific references.
Native bit preservation and browser JSON's existing zero-canonical Save are
separate contracts.

## Bounds and remaining allocations

Check shape products, entry byte counts and cumulative binary-byte accounting
before fallible binary-buffer reservation. Keep the same 8,191-array, 8 MiB
manifest and 128 MiB total uncompressed-byte thresholds. Publication and Save
continue to share one preflight, including malformed scientific/source checks.

This is not streaming persistence or an allocation-free validation path. The
document, metadata, prepared binary arrays and compressed output still occupy
memory. The decoder is unchanged. Core source hashing used by saved-surface
validation still constructs numeric JSON; optimizing it belongs to #40 and
would require preserving its independent hash contract.

Three isolated optimized native processes per implementation measure an
identical 128³ authoritative grid. Encode timing excludes sampling, input
identification and file writing; maximum RSS includes the entire process.
Those results cannot establish browser/WASM peak memory or universal allocation
failure recovery. Application version, dependencies, atomic-save behavior,
scientific precision and release artifacts remain outside this change.
