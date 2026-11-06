# BinaryCIF import and viewer capture

Status: implemented

Date: 6 November 2026. Baseline: `44d73d7`, source version 0.5.11.
Issues: [#21](https://github.com/uvar-apps/eigenvista/issues/21),
[#7](https://github.com/uvar-apps/eigenvista/issues/7),
[#4](https://github.com/uvar-apps/eigenvista/issues/4).

## BinaryCIF boundary

Decode the seven standard BinaryCIF column transforms in Rust. A borrowed,
bounded MessagePack reader checks lengths, aggregate nodes, nesting, duplicate
keys, and types before allocation. Bound gzip output independently of compressed
input size. Each transform checks its declared expansion and charges cumulative
decoded work before reserving output. Dictionary strings remain borrowed slices;
Unicode offset conversion uses the requested offsets rather than a table sized
to every source byte. Invalid pipelines, masks, lengths, references, arithmetic,
or unsupported profiles return input errors.

Emit a bounded canonical CIF representation of atom sites, declared connections,
cell, and symmetry metadata and invoke the existing core mmCIF importer. This
keeps element/coordinate validation, first-model/alternate selection, declared
connection resolution, provenance policy, and exact bond perception shared.
Force atom sites into loop form even for one atom. Preserve all connection
columns and null masks. Do not add a second scientific selection implementation
or a BinaryCIF export feature. Raw original bytes, including a gzip wrapper,
remain the import-source digest input.

Evaluate libraries first. `mmcif-cif` 0.3.2 has configurable limits, but its
Unicode auxiliary table and category text construction can allocate before the
relevant text check; numeric access may also populate an unbounded text cache.
`molframe-bcif` 0.7.0 deserializes MessagePack before its row checks. A narrow
bounded implementation avoids those paths; no upstream source is copied.
Use the existing pure-Rust `flate2` backend for bounded gzip decoding.

The import ceiling remains 128 MiB; binary payload after gzip and canonical CIF
are separately limited to 64 MiB. MessagePack allows one million aggregate nodes
and 64 container levels. Interpreted transforms share 16 × 1024² decoded values,
with at most 16 transforms per chain and eight nested encoding levels. Enforce
one 0.3.x block, at most 256 columns per interpreted category, 250,000 total atom
rows, 100,000 connection rows, and the core's 100,000 selected-atom limit.
Only `-1` is the empty dictionary-index sentinel; packed unsigned words still
reconstruct signed Int32 output. Require real packing sentinel termination and
declared lengths, rather than bypassing validation on an equal-length fast path.

Acceptance includes independently produced real BinaryCIF/text twins, all
encoding operations and masks, alternate/model/connection parity, malformed and
excessive inputs, exact native persistence, real CLI conversion, and actual WASM
Open/Convert workflows. Record final limits, measurements, and gaps in status.

## Canvas and runtime label

Create the viewport with drawing-buffer preservation disabled. PNG export
already explicitly renders immediately before synchronously capturing that
frame; retain this approach without a permanent extra render target. Validate
idle, camera/size changes, repeated mesh/raycast/volume capture, and visible
failure recovery. Browser pixel tests must inspect compositor pixels or a
synchronously rendered buffer rather than an asynchronously discarded backbuffer.
Do not weaken geometry, colour, alpha, or camera assertions to hide that change.

Use `Native (Tauri)` for the native runtime badge and preserve `WebAssembly` in
the browser. This reports the runtime without adding a platform dependency or
claiming Linux/Windows qualification.

Primary references: [BinaryCIF layout and transforms](https://github.com/molstar/BinaryCIF/blob/master/encoding.md),
[MessagePack specification](https://github.com/msgpack/msgpack/blob/master/spec.md),
[Mol* conversion tooling](https://molstar.org/docs/data-access-tools/convert-to-bcif/),
[Three.js renderer](https://threejs.org/docs/#api/en/renderers/WebGLRenderer).
