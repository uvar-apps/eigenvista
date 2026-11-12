# Exact indexed-mesh qualification

Date: 12 November 2026. Status: proposed production contract; qualification only.
Issue: [#37](https://github.com/uvar-apps/eigenvista/issues/37).
Baseline: main `2f7aeec`; version 0.5.12.

## Boundary

This phase adds an opt-in research driver, a separate immutable layout corpus
and browser qualification tests. It does **not** change the production mesher,
renderer, source hashes, decoder/writer, profiles, numeric precision, allocation
limits or cancellation paths. Existing `fixtures/native/` inputs remain frozen.
The application still generates raw corner meshes. #37 stays open for later
implementation and end-to-end performance/worker/publication acceptance.

The [driver](../../crates/eigenvista-format/examples/indexed_mesh_qualification.rs)
calls unchanged `core::compute::mesh`, then compares two research-only exact
packing strategies: a pre-reserved full-attribute hash table and a sorted raw
ordinal vector. Both key **all six f64 bit patterns** (position and normal),
assign first-seen unique IDs, and preserve expanded triangle attributes and
order. Normal seams and signed zero stay distinct; there is no quantization,
normal averaging, f32 durable storage or cross-surface sharing.

## Shader identity contract

With indexed drawing, `gl_VertexID` depends on the original index values.
Correct triangle positions/normals alone do not preserve that contract.
The proposed boundary is compact storage/built-in indexed drawing for newly
generated meshes, with original raw vertex order **and original indices**
reconstructed for custom shader drawing. This needs an explicit generated-layout
identifier; old marker-free arbitrary indexed meshes keep their original arrays
and shader behavior. No heuristic rewriting on Open is acceptable.

The prototype marker `qualification-mcubes-0.1.7-exact-tuples-v1` is test data,
not a production format promise. Reconstruction uses only compact arrays,
the marker and grid-axis determinant. The pinned raw extractor emits sequential
corner indices; core swaps the last two indices of every reflected triangle.
Undoing that permutation recovers raw ordinal attributes and recreates its IBO.
Simply expanding in triangle draw order fails this policy on reflected grids.
Malformed tagged triangle counts, indices and first-seen layouts are rejected;
the generated raw-corner cap stays 2,000,000. Existing arbitrary indexed meshes
retain their separate, larger index-count allowance.

The [corpus](../../fixtures/indexed-mesh-qualification/README.md) covers both
isovalue signs and both grid handednesses. Native checks additionally cover skew,
large-origin/small-spacing coordinates, differing normals and signed zero.
Raw expected data is never passed into restoration. Tests compare exact native
f64 attributes, original indices, expanded triangle bits and Save/reopen. Browser
checks use the existing JSON zero-canonical contract, actual WASM/worker Save,
real production shader materials, exact VBO/IBO comparisons and real pixels.
Compact drawing and reflected naive expansion are necessary negative controls;
restored drawing must equal raw. Application Open/custom shader/Save/reopen is
also exercised, including negative controls that prove the custom shader is
still active.

## Memory contract

Postprocessing cannot eliminate the raw mcubes allocation. Core reserves f64
output buffers **before** extraction; mcubes raw vertices and indices remain
alive during conversion. Retain raw preflight and account for existing saved
meshes, sampled grid, f32 values, raw capacities, scratch and exact output
capacities. A compact buffer with raw-length capacity is not retained-memory
savings. The research strategies first determine the exact unique count and
drop their table/sort vector before allocating exact-sized output attributes.

The driver observes requested Rust live allocation bytes around unchanged
sampling, hashing, extraction and compaction. This excludes allocator overhead,
internal realloc copy overlap, browser/WASM/GPU memory and unrelated processes.
Fresh optimized processes measured with `/usr/bin/time -l` separately establish
whole-process peak RSS; neither metric is a universal OOM guarantee. The pinned
mcubes dependency still uses infallible internal growth. Existing source-hash
JSON allocation belongs to #40, separately labelled in these observations.

Its deterministic native self-check is enabled in the normal/hosted Cargo test
suite by the example's `test = true`; measurement/prepare commands remain
manual. This test target declaration changes no production dependency or API.

Measured workloads, reproducible commands, results and the resulting production
recommendation are recorded in [status](../status.md) and
[Plan 003](../../plans/003-indexed-mesh-qualification.md). Only checked evidence
from this qualification can resolve those gates; older offline encode timing
did not measure extraction or compaction peak memory.

## Native measurement results

Apple M4/macOS 27.0, Rust 1.99.0, locked dependencies and the same optimized
instrumented binary. Each of the nine combinations ran in three fresh processes,
with no concurrent build/browser workload. All 27 measurement processes and nine
separate publication probes exited successfully. RSS below is macOS bytes;
requested peak is the observed cumulative Rust live-byte peak before report
serialization. Neither column is a contractual allocation limit.

| Workload / method | RSS runs 1 / 2 / 3 (bytes) | Median RSS | Requested peak | Retained geometry capacity |
| --- | --- | ---: | ---: | ---: |
| H2 128³ raw | 36,683,776 / 36,683,776 / 36,683,776 | 36,683,776 | 33,822,442 | 4,432,272 |
| H2 hash | 36,700,160 / 36,700,160 / 36,700,160 | 36,700,160 | 33,822,443 | 1,058,064 |
| H2 sort | 36,700,160 / 36,716,544 / 36,716,544 | 36,716,544 | 33,822,443 | 1,058,064 |
| Water 31 meshes, 64³ raw | 14,385,152 / 14,237,696 / 14,270,464 | 14,270,464 | 10,113,961 | 4,577,040 |
| Water hash | 11,730,944 / 11,780,096 / 11,763,712 | 11,763,712 | 7,114,506 | 1,258,032 |
| Water sort | 11,534,336 / 11,730,944 / 11,714,560 | 11,714,560 | 7,114,458 | 1,258,032 |
| No-sharing control raw | 107,200,512 / 107,216,896 / 107,315,200 | 107,216,896 | 104,110,840 | 103,999,896 |
| No-sharing control hash | 458,440,704 / 458,457,088 / 458,457,088 | 458,457,088 | 351,172,032 | 103,999,896 |
| No-sharing control sort | 219,332,608 / 219,332,608 / 219,332,608 | 219,332,608 | 216,096,757 | 103,999,896 |

H2 has 85,236 raw corners and 14,940 exact unique tuples. Water's 31 nonempty
meshes have 88,020 corners and 18,874 tuples in total. Water retains one
authoritative 64³ grid as well as the current transient sample during meshing;
both real-field workloads use unchanged sampling/source checks. The synthetic
control contains 1,999,998 unique tuples, all within the existing generated
corner cap. It stresses no-sharing memory, not maximum-cap extraction or worst
sorting time.

H2 extraction dominates requested peak, so compacting retained arrays does not
lower its process peak. In water, prior packed surfaces reduce later extraction
peaks: the first pass peaks at 5,340,350 raw versus 5,340,351 sorted bytes, while
pass 30 peaks at 10,113,961 versus 7,114,458. First retained geometry is
23,088→7,632 bytes; final retained geometry is 4,577,040→1,258,032 bytes. These are
actual capacities, not only vector lengths. Exact output capacity is allocated
after the unique count is known.

The H2 allocation trace observes an 8,388,608-byte f32 input alongside f64
position/normal reservations of 2,045,664 bytes each and a 340,944-byte u32
index output. mcubes grows to 131,072 raw vertices (3,145,728 bytes) and 131,072
usize indices (1,048,576 bytes), exceeding its 85,236-corner logical length.
These are observed allocation requests, not assumed length-based estimates;
f64 output and raw extractor buffers overlap. Logs capture every requested
live byte, while the fixed-size growth-event log omits individual requests
smaller than 4,096 bytes. No event log was truncated.

The no-sharing control exposes the overlap. Its hash table reserves capacity
3,670,016 and requests 239,075,336 bytes, plus a 7,999,992-byte representative
vector. Sorting needs two 7,999,992-byte ordinal/representative vectors, drops
the sort vector before output allocation, then retains one representative
vector while allocating another 103,999,896-byte output. Dropping a table does
not guarantee that the system allocator returns its pages: hash RSS exceeds
the requested live-byte peak. Both unconditional prototypes do extra work and
increase peak memory without saving a byte on this control.

**Decision: NO-GO for unconditional automatic post-extraction packing.** A
future implementation may use bounded sorting, detect whether exact output
actually saves space **before allocating it**, and preserve raw output if the
scratch/output budget or a fallible reservation fails. That policy, a chosen
application-wide budget, custom-shader reconstruction costs, WASM/worker
transport and publication/cancellation behavior need implementation-specific
verification. The 512 MiB prototype scratch guard is a research bound, not an
accepted production budget. Do not raise raw limits, reduce old-file limits or
promise OOM recovery based on retained-file savings.

Raw JSON, `time -l` output, input/source/binary identities and publication probes
are retained under `tmp/2026-11-12-panels-mesh37/memory37/`. Use the committed
driver and [measurement procedure](../development.md#indexed-mesh-qualification-measurements)
to reproduce observations on another system; machine-specific RSS/timings are
not fixture assertions. Existing source-hash JSON allocations remain #40.

The nine publication probes are **one separate fresh process per combination**,
not three-sample publication benchmarks. Water raw/sort publication adds
7,431,125/4,113,481 requested bytes and peaks at 14,225,372/7,644,065 requested
live bytes; whole-process RSS is 19,709,952/14,123,008 bytes. The no-sharing
raw/sort probes still add about 104 MB, reflecting unchanged prepared output
entries. They reinforce the need to budget publication separately; their RSS
includes earlier extraction/compaction and must not be called publication-only
memory. They do not measure encode/ZIP or browser memory.

Measured driver SHA-256:
`d0263a86b0546fce16adbea720162b8e1c9d9073f05405c030a17f95fba585f1`;
optimized instrumented binary:
`2f45c70631ecc897204de534c097f773d1f937405ba7759dd1e2e576ba4c15be`.
The corpus manifest also freezes support/production/dependency source hashes
and producer identity. H2 input JSON SHA-256 is
`8da6a78485f392d847bce9a3cc007ea1f3042d443d46a532c5ddc5c33ab8d99d`;
water input fixture SHA-256 is
`652d05b44035be4c0ce153f96939f28301ae54c4f6e4afefaeae338afc364dc7`.

## Browser qualification result

All ten focused cases pass under the traced CI configuration across Chromium
and WebKit: four signed/handedness cases and one arbitrary-indexed persistence
case per engine. Restored/raw VBO/IBO identity is exact and differs by **zero**
pixels. Direct compact drawing differs by 17,281–17,385 pixels; reflected naive
expansion differs by 17,379–17,385 pixels. Ordinary naive expansion correctly
matches the ordinary raw stream. Chromium's actual renderer is ANGLE/SwiftShader
and WebKit's is Apple GPU. The actual application's custom shader, compact/naive
negative controls and raw/restored user Save/reopen checks pass as well.

Agents independently inspected real offscreen/application captures. Corpus
adoption preserves all 17 native archives and all five decompressed semantic
originals exactly; only lossless packaging reduces the semantic JSON size.
No test regenerates expected input or implements restoration in TypeScript.
These checks establish this proposed identity policy, not automatic packing
readiness. Full regression and actual hosted evidence remain in status/issues/PR.
