# Native preview profile

This implementation is an experimental subset of the research proposal, not
its frozen version-1 schema. New files use `format: eigenvista`,
`version: [0, 1]`, `required_features: [eigenvista-preview-polynomial-v1]`, and
`coordinate_unit: bohr`. The exact model is defined in the
[Rust core](../crates/eigenvista-core/src/model.rs).

## Naming and compatibility

The canonical filename suffix is `.eigenvista`. The decoder also accepts the
previous matched identifiers, `format: molekel` with
`required_features: [molekel-preview-polynomial-v1]`, for existing `.molekel`
preview documents. Mixing old and new identifiers is not a supported profile.
This compatibility does not extend to arbitrary files from legacy C++ Molekel.

The [frozen native corpus](../fixtures/native/README.md) records authentic
older/current producer archives, logical manifests/entries and semantic
expectations. Native and actual-WASM/worker tests read those committed inputs
directly; normal tests do not regenerate them with the encoder under test.
Fixture coverage complements identifier-negative and malformed-container tests.
It does not introduce a new writer, profile, source hash or precision policy.

The rename leaves the `[0, 1]` document shape, scientific arrays, field/source
hashes, and cached mesh semantics unchanged. Decoding an old file does not
rewrite it or require regeneration of its surfaces. Open still applies the
existing, separately reported missing-bond supplementation policy below.
The shared importer reports `ImportReport.format = "eigenvista"` for both
old and new native profiles.

Encoding always writes the new EigenVista identifiers. Native Save accepts
both `.eigenvista` and the legacy `.molekel` suffix, defaulting to `.eigenvista`,
but choosing the old suffix does not produce the old profile. Newly saved
files therefore are not guaranteed readable by previous Molekel builds.
Keep the original old-profile file when compatibility with those builds is
required. No bulk file migration is performed by the rename.

Molden conversion uses this same profile without a schema change. Explicit
normalized basis functions, orbitals/occupations/energies, occupation-derived
density matrices, inferred bonds, source-byte hash, and loss notices become
ordinary document data. Original Molden text and omitted sections are not
embedded. Subsequent saved meshes retain the usual field/source associations;
they do not require the original Molden file to reopen. See the
[Molden import contract](molden-import.md) for normalization and completeness limits.

Cube conversion also uses this unchanged profile. The complete affine grid,
original finite f64 samples (reordered x-fastest), atoms, inferred bonds, source
digest, and dataset/provenance metadata are stored. Display downsampling never
replaces that authoritative grid. Generated signed meshes include their sampled
grid geometry and source hash as usual, so the cube source need not accompany a
saved `.eigenvista`. Preview f32 overflow can prevent rendering without preventing
import/save of valid f64 data. See [cube import](cube-import.md).

The ZIP contains `manifest.json` first and `arrays/aN/0.bin` entries. Numeric array leaves in the document are replaced by `{ "$array": "aN" }` references. Descriptors record shape, entry, byte count, SHA-256, and either `f64` or `u32`. Values are little-endian and row-major; grids are x-fastest. Authoritative Rust float arrays remain f64. Mesh positions are f64 containers for the f32 interpolated result, with that precision limitation recorded explicitly.

### Columnar coalescing

When every row of an array-of-objects carries the *same* numeric shape under a key, that key is stored once as a `[rows, …inner]` column and each row keeps a `{ "$array": "aN", "$index": k }` pointer into it. This is what makes large systems storable: 65,963 atom positions become **one** entry instead of 65,963, and the manifest stops carrying a record per row. The same applies to basis centers and to orbital coefficient vectors, which are uniform by construction. Rows whose shapes differ — basis functions with different contraction lengths, for instance — fall back to per-row entries rather than being forced into a column.

Column references are validated on decode: the index must be an integer within the column's row count, the object must carry exactly the two expected keys, and the target column must exist. A row cannot be consumed twice.

This changes only the on-disk layout. Documents written before coalescing still decode, because a plain single-key `{ "$array": "aN" }` reference remains valid; a coalesced file requires the newer reader.

### Atom columns

The atom collection itself is columnar in both the document JSON and the manifest:

```json
"atoms": { "elements": { "$array": "aN" }, "positions": { "$array": "aM" } }
```

Two references, so the manifest is **constant-size with respect to atom count** — 1,455 bytes for a 100,000-atom structure, where the row-wise form needed roughly 5.6 MiB and could not be written at all past 8,191 atoms. `Document::atoms` in Rust is still a row-wise `Vec<Atom>`; the conversion happens in the `atoms_columnar` serde module, and the app reads `atoms.elements[i]` / `atoms.positions[i]`.

Deserialization accepts the columnar object **and** the older row-wise array of `{ element, position }` records. The custom `Visitor` dispatches on the JSON token via `visit_map` / `visit_seq`, so supporting both forms costs no buffering — an untagged enum would have copied the whole collection into an intermediate value, which is exactly the cost this removes. Column lengths must agree; a mismatch is rejected.

Measured per-atom decode peak RSS: 3,198 B (row-wise) → 2,185 B (coalesced rows) → **929 B** (atom columns).

### Why the entry cap mattered

Every array leaf previously cost one ZIP entry, one manifest descriptor (~196 bytes to describe as little as 24 bytes of payload), and one decode buffer. The 8,192-entry cap therefore capped a document at roughly **8,191 atoms regardless of byte size**, and raising the cap alone would still have failed: at 65,963 atoms the manifest alone reaches ~12 MiB against the separate 8 MiB manifest budget. Coalescing removes all three per-row costs at once.

Small scalar metadata is JSON. Basis radial weights already include normalization; no automatic normalization is applied. Orbital energies are optional hartree values, not fabricated zeros. Occupations are explicit. A full row-major density matrix identifies its kind independently of orbitals. Current object relationships use stable IDs within a single geometry/basis document.

Saved surface records contain source field ID and scientific hash, signed isovalue, algorithm/version, grid origin/step vectors/resolution, precision, geometry/normals/indices, sRGB color, opacity, and visibility. Quantum inputs remain in the same document. A source mismatch is rejected in this preview; the later revision-aware model should preserve historical assets with their original inputs.

Loading verifies ZIP paths, duplicate entries, supported compression, declared inflated size, reference coverage, column index bounds, shape products, byte lengths, digests, finite arrays, IDs, indices, and scientific dimensions. Entry count, file size, inflated size, grid size, and mesh size are bounded. The preview refuses unreferenced archive entries and unsupported required profiles. Original source attachments, arbitrary extensions, multiple geometry revisions, chunk streaming, and migrations are not implemented.

`eigenvista-format::decode` preserves the validated document exactly. The shared
import layer used by Open and conversion subsequently supplements missing
display bonds from atom positions, retaining every existing edge and its order.
This is reported as an unsaved change, never silently written back to the
source. Scientific arrays, grids, and cached surface records remain unchanged;
bonds are not part of a field's scientific hash.

Surface publication and encoding share `validate_document` preflight: model and
source-hash checks, at most 8,191 array entries plus the manifest, an 8 MiB
manifest cap and a 128 MiB total uncompressed-byte cap. Publication prepares the
same array bytes/hashes and exact manifest without creating or compressing a ZIP;
Save compresses those entries. This keeps the current profile/layout and still
requires metadata and binary-array allocations. The older WASM `validate` export checks only
the scientific model; it is not a replacement for native-format preflight.

The [typed writer](../crates/eigenvista-format/src/typed.rs) emits numeric bytes
directly from the model instead of first constructing and flattening numeric
JSON values. It preserves the prior writer's manifest/decompressed-entry bytes,
including empty inline arrays, nonuniform rows, uniform-column ordering and
flat vector shapes. Metadata retains sorted keys and explicit nulls. Scientific
f64 values retain their bits; unsigned arrays retain the existing whole-array
f64 fallback if a value exceeds u32. In particular, this preserves the current
writer behavior for oversized surface resolutions without expanding the
decoder's numeric capabilities. No identifier/profile or hash migration is
introduced. See the [decision](design/2026-11-12-typed-native-encoding.md).

Before emitting an entry, checked shape/byte arithmetic and fallible reservation
bound its binary buffer against the existing preflight budget. Exact manifest
and total accounting remain shared by publication and Save. This does not remove
all allocations: model/source validation, metadata, prepared arrays, compression
and decoding still use memory. Source hashing's numeric JSON is unchanged.

Native saves validate the encoded document, write and sync a newly created sibling
file, then publish it by rename. The converter uses an exclusive hard-link
publication when creating a new destination; unsupported capability is an error,
not a fallback to a partially visible final file. Tested pre-publication
validation/write/read-only failures preserve existing destination bytes.

These are atomic-visibility observations on the tested local filesystems, not a
power-loss/crash-durability guarantee. The pinned Rust 1.99 implementation uses
`F_FULLFSYNC` on Apple for file `sync_all`; the adapters do not sync the parent
directory after publication. New Unix staging files request mode `0600`; replacing
an existing file creates a new inode and does not preserve its prior mode bits.
ExFAT synthesizes permissions and does not support the converter's hard-link
publication, although replacement saves worked in the bounded macOS image test.
Windows, ACL/ownership inheritance, network/cloud filesystems and power-loss
behavior remain separately unqualified. See the
[save-contract research](../plans/005-native-save-contract-research.md) for exact
observations and proposed follow-up. Browser downloads use the browser's own
filesystem behavior.

Source identity uses SHA-256 over serde_json's explicitly sorted-key encoding of the basis and selected source record. Floating-point negative zero is canonicalized to positive zero for this hash because JavaScript JSON transport folds their signs; this does not change the represented real field. The native binary format retains f64 bit patterns, but the current browser JSON bridge does not retain the sign of zero when saving. Numeric tests and browser roundtrips compare against the JSON-canonical input. This is a local preview contract, not a published cross-language canonical-JSON standard. Pinning and documenting a formal canonical representation is an M1 gate.
