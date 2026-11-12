# Vite maintenance and immutable native compatibility fixtures

Date: 12 November 2026 (Australia/Perth). Status: implemented.
Implementation from main `06ecbb9` on
`codex/vite-maintenance-and-native-fixtures`. Tracks
[#46](https://github.com/uvar-apps/eigenvista/issues/46) and the fixture phase of
[#39](https://github.com/uvar-apps/eigenvista/issues/39).
Implemented through [PR #49](https://github.com/uvar-apps/eigenvista/pull/49).

## Scope and decisions

Vite's declared floor becomes `^7.3.8`, with exact 7.3.8 in the lockfile. Only
that dependency changes; compiler/scientific dependencies and application
version remain unchanged. Clean installation and npm audit, the full build and
browser gates, native frontend checks and packaging support qualify the update.
The upstream advisory assessment is in the
[research record](../../plans/2026-11-12-research.md); it did not reproduce an
EigenVista exploit and does not imply a packaged desktop compromise.

The existing native writer, schema/profile IDs, scientific/source hashes,
precision and budgets remain authoritative. Fixture work freezes older/current
producer output and makes compatibility expectations independent of the encoder
under test. It does not implement typed encoding or change scientific reference
answers. #39 therefore remains open for its later encoding scope.

## Compatibility contracts

Tests must open committed archive bytes directly, including genuine output
reconstructed with the unchanged 0.3.2 Rust encoder. Relabeling today's archive
is still useful for identifier-negative tests, but is not historical coverage.
Producer revision, input/driver provenance and logical entry expectations travel
with the corpus. Normal test commands do not regenerate it.

Compatibility checks cover manifest and decompressed entries: descriptor
dtypes/shapes/byte counts/digests, reference coverage and scientific/mesh
metadata. Whole ZIP hashes identify input artifacts; compressor output is not
made a new cross-platform contract. Current re-encoding is compared against the
logical layout, not historical compression bytes. Old files remain untouched.

Native binary roundtrips retain f64 signed-zero bits. Browser JSON Save folds
-0 to +0, and scientific hashes intentionally canonicalize both signs. Native
bit checks and browser canonical-semantic checks are distinct; fixtures do not
introduce a JSON/hash migration. Open's reported missing-bond supplementation
is also distinguished from the lossless format decoder.

Actual WASM, worker and UI checks exercise frozen inputs, saved cached geometry,
Save/reopen and malformed-source recovery. Cached meshes must display without
sampling/re-meshing. Field values, quantum arrays, authoritative samples and
source associations survive within the existing browser JSON contract.

## Verification and boundaries

Fresh results and the reviewed PR's hosted checks are recorded in
[status](../status.md) and [handoff](../handoff.md). They are separate from the
earlier research-only probes. User/agent documentation must state the fixture
phase's outcome without reporting the later typed writer as completed.

The source version remains 0.5.12. No tag, release or tester ZIP is requested.
Native event-loop/frontend smoke checks are not physical file-dialog/shortcut,
clean-Mac or Linux/Windows distribution qualification. Preserve the original
untracked review, frozen scientific inputs, private exports and repository-local
temporary-storage boundary.
