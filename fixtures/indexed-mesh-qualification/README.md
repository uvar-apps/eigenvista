# Indexed-mesh qualification inputs

These immutable, small fixtures qualify the proposed shader identity policy in
[#37](https://github.com/uvar-apps/eigenvista/issues/37). They do not enable compact
storage, add a supported file-format feature, or change the application renderer.
The current production mesher and reader remain unchanged. Normal tests read the
committed files; they must not regenerate expected data when a check fails.

Four cases cover positive and negative isovalues on ordinary and reflected grid
axes at `±0.12` on 17³ samples with 0.25 spacing. Their constructed scalar
`x * exp(-0.5 * (x*x + y*y + z*z))` is layout test
data, with no assigned quantum-chemistry meaning or physical units. All meshes
come from the unchanged Rust `compute::mesh` function and its pinned
`mcubes-0.1.7-classic` algorithm. These are persistence/identity oracles, not
independent scientific-accuracy references.

Each case includes the producer's semantic JSON and four native archives:

| Variant | Purpose |
| --- | --- |
| `raw` | Actual unmodified generated vertex records and indices; independent expected result |
| `compact` | Prototype exact first-seen sharing of all f64 position **and normal** bits; shader-ID negative control |
| `naive` | Triangle-draw-order expansion; reflected shader-ID negative control |
| `restored` | Prototype reconstruction of original vertex order **and original indices**, from compact data and its explicit generated-layout marker/grid axes alone |

Each raw mesh has 3,756 corner records; compact variants have 778 or 790 exact
tuples. A seventeenth, marker-free arbitrary-indexed archive separately checks
that existing shared vertices/indices survive Save unchanged. Native archives
total **470,421 bytes**. The five losslessly compressed semantic JSON files total
**752,033 bytes**; the complete generated corpus plus manifest is **1,231,867
bytes**. The source JSON is retained byte-for-byte inside gzip, including its
original whitespace and every numeric spelling.

The raw expected document is never an input to restoration. No raw-to-unique map
is persisted. The research marker
`qualification-mcubes-0.1.7-exact-tuples-v1` identifies only the constructed
prototype layout. It is **not** a supported production algorithm/format promise.
Neither that marker nor a marker-free heuristic activates restoration in the
application. Existing arbitrary indexed meshes retain their original arrays and
shader semantics.

The generated ordinary raw index stream is `0,1,2,3,4,5,...`; reflection swaps
the last two indices of each triangle. The prototype reverses that swap before
recovering raw vertex ordinal order, and recreates the original index stream.
Draw-order expansion alone preserves triangle attributes but loses reflected
vertex IDs. The research driver rejects invalid tagged bounds/layouts instead
of treating every indexed mesh as generated data. Native checks also exercise
normal seams, signed zero, affine and large-origin precision separately.

`manifest.json` freezes archive bytes/hashes, compressed **and uncompressed**
semantic bytes/hashes, and producer/source identities. The
per-case oracles identify native f64 attribute bits, original indices and
expanded triangle attribute bits. Native Save/reopen preserves strict f64 bits.
The existing browser JSON transport/Save contract folds `-0` to `+0`; browser
tests explicitly use that canonical expectation rather than changing hashes or
claiming native signed-zero preservation through JSON.

The real Chromium/WebKit tests load every archive through actual WASM and worker
Save/reopen. The production `buildSurfaceMaterial` and real Three.js indexed
buffers render a shader whose flat color depends on `gl_VertexID`. Four bounded
192×192 draws per case compare every pixel and raw/restored f32 VBO bits plus
integer IBO values. Compact drawing must differ; reflected naive expansion must
also differ; correctly restored drawing must match raw. The actual application
also opens raw/restored meshes, loads that custom shader, and checks settled
compositor frames through user Save/reopen. Tests attach images, renderer
identity and differing-pixel counts. Captures happen after draw completion,
outside assertion polling.

The shader test relies on OpenGL ES 3.0.6 sections 2.9.3 (indexed element
selection, printed pp. 29–30), 2.12.9.5 (`gl_VertexID`, p. 78), and 2.17/table
2.12 (flat shading uses the third corner of an independent triangle, p. 92).
These were verified directly in the
[Khronos specification](https://registry.khronos.org/OpenGL/specs/es/3.0/es_spec_3.0.pdf)
(PDF pages 42–43, 91 and 105, counting from one). Tests use the installed Three.js
[`BufferGeometry.setIndex`](https://threejs.org/docs/pages/BufferGeometry.html)
and [`ShaderMaterial`](https://threejs.org/docs/pages/ShaderMaterial.html) APIs.
The baseline and candidate draw with the same camera and material. Pixel
identity here qualifies shader ordinal preservation; it does not establish
scientific accuracy, memory improvements, or all custom shader behavior.

The Rust [manual producer](../../crates/eigenvista-format/examples/indexed_mesh_qualification.rs)
ran against unchanged scientific/format libraries from
`2f7aeec61ba871d8e52f6c7bf5b63aa8fb9a6b8b`, with Rust 1.99.0 on Apple Silicon
macOS 27.0. The manifest records exact driver/helper/library/Cargo.lock/toolchain
and executable digests, compiler output and platform. No claim of identical
compiler output or compressed bytes on other platforms is implied.

[`adopt.mjs`](adopt.mjs) performs only lossless packaging: Node
`gzipSync(originalBytes, {level: 9})`, zero gzip timestamp, repeated-compression
identity check, then strict `gunzip` byte equality. It records Node/zlib versions
and its own final source digest. It copies native archives unchanged, checks the
known producer source set, rejects escaping paths, and creates a new output
directory. The tests only read this committed corpus, with explicit compressed
and decompressed size bounds. They never call either producer or adapter.

Manual reconstruction must use new directories under repository `tmp/`, the
pinned dependencies and the recorded producer. The Rust producer's `prepare
NEW_RAW_DIRECTORY` command writes source JSON/native archives. Beside that raw
directory, retain `source-hashes.txt` for the exact source set in the adapter,
`rustc.txt` (`rustc -vV`), `cargo.txt` (`cargo --version`) and `platform.txt`
(platform identification). Then run, with repository-local `TMPDIR`, `TMP` and
`TEMP`, and `RUSTUP_TOOLCHAIN` unset:

```sh
node fixtures/indexed-mesh-qualification/adopt.mjs \
  tmp/NEW_RUN/raw tmp/NEW_RUN/lossless-corpus
```

Review resulting source/file identities before adopting any newly identified
corpus. Keep this corpus and the separately frozen `fixtures/native/` inputs
unchanged after adoption; differing expected bytes require review, not overwrite.
