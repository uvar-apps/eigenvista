# Worker ownership and resident document registration

Status: implemented

Date: 6 November 2026. Baseline: `c5ebcbb`, version 0.5.11.
Issues: [#6](https://github.com/uvar-apps/eigenvista/issues/6),
[#5](https://github.com/uvar-apps/eigenvista/issues/5).

## Decisions

Keep one scientific worker and a FIFO bridge queue. Only one request is posted
at a time; jobs from independent clients remain queued on the main thread.
App and Convert Files each own a client. Client cancellation removes that
client's jobs; an AbortSignal can cancel a single request. Queued cancellation
does not interrupt another client's active work. Active cancellation terminates
the worker to interrupt synchronous WASM, then starts unrelated queued jobs on
a replacement. A fatal worker failure rejects all owners through a separate
teardown path. Request IDs, worker-instance guards, and UI generation tokens
remain distinct protections against late messages and stale pipeline publication.
The existing request/cancel exports remain a default client for compatibility.
Queue entries shallow-copy submitted small arguments. Source documents remain
immutable for their request lifetime. Initialization rejection is fatal because
the worker's failed initialization promise cannot recover in place. Chromium's
message-error path uses an event listener rather than an assigned event property.

Keep one registered document and one sampled field, with explicit disposal on
replacement. A worker-local Rust RegisteredDocument owns validated immutable
inputs and its sampled cache. Repeated field/resolution requests reuse samples;
meshing accepts small validated appearance parameters. Existing SampledField
APIs and their stale-source checks remain available. Persisted source hashes
still come from Rust scientific inputs; internal registration IDs do not replace
them. A resident owner establishes the input/cache pairing without reparsing or
hashing full scientific JSON on every mesh request.

The bridge compares immutable source references together with ID/title values,
without full JSON strings or length-only keys. Scientific edits must replace the affected top-level
source array (or atoms object), including when only a nested value changes;
appearance and saved meshes do not change source identity. New registration
clones/serializes/validates source data once in the worker; subsequent messages
contain only registration identity, field, resolution, isovalue, and appearance.
Registrations are valid only for their worker instance and are rebuilt after
cancellation/failure. Keep only the current registration, not historical copies.
The conservative tuple also observes atom/bond/provenance references and title/ID
values to retain registration validation when non-view metadata is replaced;
it does not yet provide field-specific revisions across unrelated source edits.

## Alternatives and limits

An abort message alone cannot interrupt synchronous WASM. Rejecting a promise
while letting cancelled computation continue would block unrelated work. Separate
workers per UI consumer would multiply WASM/field memory. FIFO ownership keeps
memory bounded while preserving prompt active cancellation.

Reference identity relies on the application's immutable scientific-input
contract; it cannot detect in-place mutation. Do not use this optimization to
weaken imported-document validation or native save/source-hash guarantees.
Appearance changes currently do not request work on every slider frame, so the
original issue's every-frame claim is not an observed application behavior.

## Acceptance

- Real overlapping worker consumers: cancel queued, active, idle, and single
  signalled requests; unaffected jobs complete and old-worker events are ignored.
- Fatal, constructor, and posting failures settle requests and permit recovery.
  Cancellation/queue changes preserve progress and transactional UI pipelines.
- Real Molden/cube registration parity: values, signed meshes, source hashes,
  metadata, and native encoding match existing APIs. Invalid inputs/materials
  remain rejected. Field/resolution/source changes invalidate the right cache.
- Observe actual worker messages: repeated requests omit full documents;
  appearance edits reuse registrations and retain current colors/opacity;
  worker restart requires fresh registration. No unbounded registration history.
- Run formatting, Rust tests/Clippy, production/native builds, packaging tests,
  and the full Chromium/WebKit suite. Inspect desktop/mobile workflows. Record
  measured serialization costs separately from end-to-end performance claims.

Fresh outcomes belong in [status](../status.md) and the tracking issues.
