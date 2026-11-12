# Plan 003: qualify exact indexed meshes without changing scientific precision

Planned at `06ecbb9cef6e52a99417f88856cb98cffc3e9df2`, 12 November 2026.
Issue: [#37](https://github.com/uvar-apps/eigenvista/issues/37).
Priority P3; effort M; risk medium; dependency: Plan 002 compatibility fixtures.
Status BLOCKED for production implementation: explicit custom-shader identity
policy and extraction/compaction peak bounds remain to be accepted.

## Findings and recommended boundary

The pinned mcubes extractor emits one corner record per triangle corner.
`compute.rs:394–453` counts raw corners before extraction and caps them at
2,000,000. The Surface model uses f64 positions/normals and general u32 indices;
current format and renderer already accept indexed geometry. Exact per-surface
position-plus-normal bit keys substantially reduce retained payload while
preserving expanded triangle order/attributes. Water31 numeric bytes drop
4,577,040→1,258,032; compressed whole-file savings are 17.1%, not a universal 3x.

World precision and normal seams are preservation requirements, not options.
The measured large-origin grid loses all 534 distinct positions when narrowed
to f32; position-only sharing also merges different normal bits. Retain every
f64 attribute bit. Source hashes and profile stay unchanged. Do not rewrite
old loaded surfaces on Open or implement a new extractor in this follow-up.

## Decision needed before implementation

Custom shaders accepted through `app/src/shaderTools.ts` can use gl_VertexID.
Remapping indices changes that built-in even when positions/normals are equal.
Recommended conservative policy: new generated meshes may use compact storage
and built-in indexed drawing, while custom shader drawing preserves the original
raw vertex order AND original indices, including reflection winding swaps.
Simply expanding in triangle draw order is insufficient for gl_VertexID.
Explicitly identify that generated layout and test reconstruction of both
ordinary and reflected original streams. Leave already-loaded meshes and
their existing shader semantics unchanged. An alternative regeneration
contract needs an explicit product decision; do not silently choose it.

Posthoc sharing does not reduce mcubes' raw allocation. Bound the map, output
vectors and index storage separately, measure their overlap, and retain the raw
preflight. Existing model limits for older valid surfaces must not be reduced
just because new generated geometry is compact. The current mcubes dependency
uses infallible internal growth, so complete OOM recovery cannot be promised.

## Scope and drift

Read AGENTS.md and #37/#39 comments. Run:

```sh
git diff --stat 06ecbb9..HEAD -- crates/eigenvista-core/src/compute.rs crates/eigenvista-core/src/model.rs app/src/Viewport.tsx app/src/shaderTools.ts crates/eigenvista-format
```

Potential implementation scope after decisions: core generated-mesh packing,
bounded allocation checks, focused geometry/format/browser tests, conditional
shader drawing if required, and current docs. No quantized welding, normal
averaging, f32 durable storage, cross-surface merging, larger raw caps, new source
hash, whole-worker transport redesign or replacement mesher.

## Qualification and later implementation steps

1. Land authentic compatibility fixtures first. Freeze ordinary/skew/reflected
   signed samples plus large-origin/small-spacing geometry and differing-normal
   duplicates; use an independent expanded-triangle attribute oracle.
2. Record the accepted shader ID policy and add a shader whose visible result
   depends on gl_VertexID for ordinary AND reflected grids, including Save/reopen
   and both engine checks. If the
   proposed representation cannot preserve the agreed policy, stop here.
3. Measure bounded map/vector layouts including raw mcubes output, document
   retention and first/later batches. Existing offline results measured only
   post-compaction encoding. Do not infer extraction peak from them.
4. Only then implement exact first-seen tuple sharing for newly generated
   surfaces, retaining triangle order, reflected winding, every attribute bit
   and old loaded arrays. Reserve/check allocations and dispose all temporary
   maps before publication; keep raw/unique/index budget terms explicit.
5. Revalidate exact expanded geometry, science/source identity, current/legacy
   Save/reopen, default/custom shader pixels, per-owner cancellation, worker
   failure/retry and stale-publication rejection. Measure actual before/after
   generation/peak/retention, not only ZIP size.

## Gates and stop conditions

Normal repo tmp/toolchain setup applies. Existing gate commands:

```sh
cargo test --locked -p eigenvista-core
cargo test --locked -p eigenvista-format
cargo clippy --locked --workspace --all-targets -- -D warnings
cargo fmt --all --check
npm --prefix app run build
npm --prefix app run test:e2e
npm --prefix app run test:packaging
```

Require actual hosted Verify jobs before an authorized merge and inspect
desktop/mobile renders. No current research result substitutes for those tests.
Done means documented shader/memory contracts, unchanged expanded attributes
and old-file behavior, bounded allocations and measured total costs. Stop for
changed normals/precision/winding, unresolved shader identity, additional raw
allocations beyond the agreed bound, or any proposal to weaken old-file limits.
