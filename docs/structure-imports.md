# Structure imports and automatic bonds

All supported formats, including XYZ, PDB, mmCIF/BinaryCIF, Molden, Gaussian cube, and native
`.eigenvista` and legacy `.molekel` preview files, automatically compute display
connectivity through the shared Rust
import path. This applies to the native application, browser, and converter CLI.
There is no separate bond-generation action. The document summary shows atom/bond
counts; inferred and explicit bonds are saved together in `.eigenvista` files.

Native import first validates and decodes the document, then appends only missing
connections. Existing bonds retain their order and endpoint orientation, including
connections longer than the automatic cutoff. Scientific arrays and cached
surfaces are unchanged. Additions produce a warning/provenance entry and set
`requires_save`; Open marks the document unsaved without overwriting it. An
already complete bond list leaves the decoded document unchanged. Raw native
format decoding remains an exact operation and does not perform bond inference.

XYZ accepts one conventional atom-count/comment/coordinate frame in angstroms.
Each atom row contains an element symbol and three coordinates. Extra nonempty
records, including additional frames and extended XYZ columns, are rejected;
unlike PDB, XYZ does not select the first of several frames.

## Biological identities

Current source implements optional biological metadata and structure views for
issues #62–#66. The published 0.6.0 ZIP predates this work. See the
[user workflow](user-guide.md#biological-structure-views),
[architecture contract](architecture.md#biological-structure-views) and
[verification ledger](https://github.com/uvar-apps/eigenvista/issues/62#issuecomment-6874030097).

Selected atoms retain parallel atom-name/residue-index arrays; residues retain
name, chain, label/author numbering, insertion, observed segment, component kind
and deposited secondary assignment. Chain label, author and entity identifiers
remain separate. PDB preserves TER boundaries and does not fabricate entity IDs.
Classification uses supplied polymer/chemical-component information, supported
modified-residue records and recognized component names; unsupported identity
remains unknown. It is not a complete Chemical Component Dictionary analysis.

PDB HELIX/SHEET and mmCIF/BinaryCIF struct_conf/struct_sheet_range annotations
are read with endpoint/namespace checks. Missing, ambiguous, unsupported or
conflicting assignments stay unknown with notices. No DSSP assignment or
secondary prediction is performed. Occupancy and alternate selection still occur
before metadata is attached, so every retained metadata index refers to the
selected document atoms. Incomplete mmCIF identity can leave metadata unavailable
rather than inventing a partial hierarchy.

Metadata has a 100,000-selected-atom/record bound and 4 MiB cumulative string
budget in addition to existing import/native limits. Native Save preserves it
under the explicit biological-structure feature; old documents without it remain
valid. These annotations do not add quantum data or change scientific field
hashes. The source is not preserved wholesale; keep original inputs.

## Algorithm decision

The legacy implementation was inspected, not copied. `src/utility/MolekelChemPDBImporter.cpp` uses `UniformGrid`, 27 neighboring buckets, a 1.2-times-covalent-radii cutoff, and angle/valence pruning. Other legacy paths delegate to Open Babel. The located PDB implementation is a uniform grid, not a k-d tree.

All-pairs distance testing is quadratic and unsuitable for large structures. Cell lists are an excellent choice for roughly uniform particle systems with bounded cutoffs; ASE documents a linearly scaling neighbor-list implementation and covalent-radius-based cutoffs. A sparse cell list avoids the empty-volume allocation cost of a dense grid. A k-d tree is also a good fit for a static, nonperiodic point cloud, including sparse structures and element-dependent query radii. No claim is made that a k-d tree always beats a cell list. [ASE neighbor lists](https://docs.ase-lib.org/ase/neighborlist.html).

The preview uses the existing Rust `kiddo` 5.2.4 immutable k-d tree with exact squared-Euclidean radius queries. It was selected for reusable, tested spatial indexing, successful native/WASM builds, and the measured workloads below. It avoids an application-specific spatial-tree implementation. Approximate-nearest-neighbor search is not used. [Kiddo documentation](https://docs.rs/crate/kiddo/5.2.4).

The distance test uses the Pyykko-Atsumi single-bond covalent radii for elements 1-118, as supplied by pinned `pdbtbx` 0.12.0. These are distinct from the viewer's van der Waals display radii, which come from Alvarez (2013) and Rahm-Hoffmann-Ashcroft (2016) and are pinned against the same `pdbtbx` tables by [element_display.rs](../crates/eigenvista-core/tests/element_display.rs). [Original radii publication](https://chemistry-europe.onlinelibrary.wiley.com/doi/10.1002/chem.200800987), [PDB Toolbox](https://docs.rs/pdbtbx/0.12.0/pdbtbx/).

1. Convert the model's bohr coordinates to angstroms for the geometric test.
2. Preserve and deduplicate explicit connections first, including bonds longer than the automatic cutoff.
3. Partition target atoms into 0.5-angstrom covalent-radius buckets, each with an exact k-d tree. Query every nonempty bucket with radius `r_i + observed_maximum_in_bucket + 0.45 angstrom`, then retain pairs with `0.4 <= distance <= r_i + r_j + 0.45 angstrom`. Every target occurs in one bucket, and its observed maximum conservatively includes every accepted pair; the bucket width changes indexing rather than the chemical cutoff. Evaluate each unordered pair once. The search radius has a small numerical guard; acceptance uses the actual pair cutoff.
4. Sort candidates by increasing `distance / (r_i + r_j)`, with deterministic index tie-breaks. Limit inferred coordination to one for H/F, four for B/C/N, and three for O. Existing explicit bonds consume coordination slots but are never removed. Other elements have no chemistry-specific cap, avoiding a blanket organic-valence rule for metals/hypervalent species.
5. Return sorted, unique endpoint pairs with no self-bonds. Report the method and any coordination rejections in provenance. Native import uses these pairs only to append missing bonds, preserving the existing list as described above.

This is a geometric display-connectivity heuristic, not electronic bond-order perception. The minimum-distance and light-element coordination filters avoid common false connections and overlaps. They do not establish aromaticity, oxidation state, metal coordination, hydrogen bonds, or chemical validity in arbitrary geometries. Open Babel likewise separates proximity-based connections from subsequent bond-order handling and applies minimum-distance/valence checks. The Rust implementation does not link to Open Babel. [Open Babel `ConnectTheDots`](https://openbabel.org/api/3.0/classOpenBabel_1_1OBMol.shtml).

Bounds are explicit: 100,000 atoms, 600,000 output connections, 2,000,000 candidates, and 10,000,000 visited neighbors. These limits are unchanged by radius partitioning. Excessively dense or invalid inputs fail rather than silently returning a partial bond list. Each radius-query result is at most the input atom count. Coordinates must be finite and within 1e9 angstrom of the origin. These are numerical/resource limits, not a guarantee of interactive rendering at the maximum atom count.

## PDB profile

`pdbtbx` handles atomic records and the residue/conformer hierarchy. A bounded fixed-column preflight supplies format-specific compatibility, rejects invalid coordinates before library construction, and reads `CONECT` endpoints. The library's optional Rayon/R-tree/serialization features are disabled; its compression feature is enabled for a build constraint in its read-options API, but compressed import is not exposed.

- Read `ATOM` and `HETATM`, using angstrom coordinates. Keep the first MODEL or first concatenated structure, never merge coordinate frames. Interactive model selection is not implemented yet.
- Prefer explicit element columns 77-78. Otherwise use aligned atom names: ` CA ` is carbon, `CA  ` is calcium, and `1HG ` is hydrogen. Unknown elements fail. D/T labels become hydrogen with an explicit isotope-loss notice.
- Keep common atoms and one alternate conformer per residue, selected by highest mean occupancy; ties use the alphabetically first alternate label, then residue name. Exclude zero-occupancy atoms. Do not combine per-atom choices from incompatible conformers.
- Retain unique `CONECT` connections from columns 12-31, resolve serial numbers after selection, and infer additional bonds even when `CONECT` is present. Ignore connections to deliberately omitted alternatives. Unknown serials, self-connections, and duplicate atom serials fail. Old hydrogen/salt-bridge columns after 31 are not imported as covalent bonds. [wwPDB coordinate records](https://www.wwpdb.org/documentation/file-format-content/format33/sect9.html), [wwPDB connectivity records](https://www.wwpdb.org/documentation/file-format-content/format33/sect10.html).
- Support the repository's old identifier/line-number suffixes only when matched to a legacy HEADER. A narrowly scoped repair recognizes full-occupancy, element-unspecified five-column nucleotide hydrogen names such as ` H2'1`; it records the repair and leaves partial-occupancy numeric alternates alone.
- Blank occupancy and B-factor fields default to 1 and 0. Invalid numbers do not become fabricated coordinates. Non-ASCII records and hybrid-36 serials are rejected in this profile.

Current source retains selected residue/chain/atom identities, TER segments, supported modified-residue classification and deposited secondary annotations in the optional biological metadata above. It does not retain the complete PDB hierarchy. Formal charges, occupancies/B-factors, isotope identity, unit cells and symmetry remain omitted, with losses recorded in provenance. The published 0.6.0 importer predates biological metadata. Crystal/periodic images are not generated. No quantum data is inferred from a structure file. Gzipped PDB is not currently accepted; see the [mmCIF profile](#mmcif-profile) for the `.cif` reader.

## mmCIF profile

mmCIF (`.cif`, `.mcif`, `.pdbx`) is read by a dedicated tokenizer in
[cif.rs](../crates/eigenvista-core/src/import/cif.rs) rather than by the `pdbtbx`
mmCIF reader that the PDB profile shares.

That is a deliberate safety decision, not a preference. `pdbtbx`'s mmCIF reader
**panics** on malformed input: a `?` in a required field such as
`label_atom_id`, a `nan` coordinate, or a `.` where a number is expected.
Imported files are untrusted, and a panic inside the WASM worker is a hard abort
rather than a reportable error, so its behaviour cannot be relied on as a
validation boundary. The mmCIF subset needed for a structure preview is small
enough — `data_` blocks, `loop_` categories, quoted fields, `;` text blocks,
and the `?`/`.` null markers — to tokenize directly with every value checked
before use. `cif_malformed_input_errors_rather_than_panicking` guards this with
`catch_unwind` over each shape that panics upstream.

What is read, from the `_atom_site` category:

- `Cartn_x/y/z` in angstrom, converted to bohr like every other importer. Values must parse as finite and stay within 1e9 angstrom; a row that fails is an error, not a fabricated position.
- `type_symbol` resolved case-insensitively against the core element table. An unrecognised symbol is **skipped with a recorded count**, never guessed into some other element.
- `label_alt_id` and `occupancy` drive the same alternate-location policy as PDB: common atoms plus one conformer per residue, highest mean occupancy, alphabetically first label on a tie. Zero-occupancy atoms are dropped. Grouping uses entity/asym/sequence/component and insertion identity. For a non-polymer with inapplicable label sequence, author residue/insertion identity keeps separate waters/ligands from sharing one alternate-selection group.
- `pdbx_PDB_model_num` selects the first model only; later models are skipped and counted in provenance. Models are never merged.
- A row whose field count differs from its declared column count fails rather than being partially read.

Unit cell (`_cell`) and space group (`_symmetry.space_group_name_H-M`) are read
and reported in provenance but **not applied**: no symmetry-mate generation, no
periodic boundary handling, no wrapped distances.

`_struct_conn` is resolved against retained source rows after model/alternate
selection. Supplied label and author identifiers must agree; explicit alternate
and insertion references are honored. Omitted conformers are not redirected to
selected alternatives, and ambiguous, absent, or contradictory endpoints remain
reported unresolved declarations. No nonstandard direct atom-site-ID field is
invented.

Declared pair types `covale`, `disulf`, and `metalc` are explicit display edges,
even beyond the geometric cutoff. They take precedence and perception fills
missing pairs. Rods remain untyped connectivity: deposited orders are retained
without creating a bond-order model. Other types, including hydrogen/salt links,
and declarations with a third partner are recorded without forcing a pair edge;
independent coordinate perception can still find those pairs.

Matching valid symmetry-operation/translation codes on both partners represent
one common isometry, so the pair maps back to the selected sites. Both omitted
or `.` images also use this selected-site profile. Unknown `?`, different codes,
and mixed specified/unspecified images are reported and omitted. No code is
assumed to name the identity operation, and no unavailable symmetry mates are
generated.

Each declaration has a `mmCIF struct_conn: ` JSON provenance record containing
full source columns (including type/order), selected partner indices and source
row IDs when resolved, its canonical edge when retained, and a status/reason.
Duplicate declarations keep their records without duplicate bonds. Human-readable
policy/count summaries and parser loss notices make omissions visible. This
uses existing provenance strings and survives native save/reopen without a
document-schema change. Files without declarations retain coordinate perception;
the `1BH3.cif` baseline keeps its atom/bond counts. Independent inspection of
`1AON.cif` finds 27 selected metal links, ten beyond the Mg–O cutoff of 2.47 Å.

The lexical profile accepts loop/scalar connection categories, wrapped connection
values, quoted literals, and text blocks; atom rows remain line-aligned.
Headers retain at most 256 columns, and a connection data line at most one million
tokens. Header/data mixtures, inline category controls, save/global frames,
multiline atom rows, trailing tokens after text/data/stop boundaries, and
connection references across data blocks are rejected explicitly. Separated
boundary comments are supported. These checks are not full CIF dictionary validation.

Budgets: 64 MiB per file, 250,000 parsed sites from the first model before
alternate selection, 100,000 selected atoms,
100,000 declarations, 2,000,000 reference-candidate visits, and 4 MiB serialized
connection provenance, including outer manifest-string escaping. Cumulative record
size is checked before allocating JSON strings, including repeated selected
atom-site IDs. Malformed or excessive input fails rather than being truncated;
the native manifest limit remains 8 MiB.

Out of scope: full dictionary validation against `mmcif_pdbx.dic`, symmetry
expansion, and writing/exporting mmCIF. BinaryCIF input is described below.

## BinaryCIF profile

The shared import library accepts raw `.bcif` and gzip-wrapped `.bcif.gz`
documents. MessagePack-map and gzip signatures are checked before text decoding,
so either form can be detected under another filename. The report format is
`bcif`. Gzip is accepted only as a BinaryCIF wrapper; it does not add compressed
PDB or compressed text-mmCIF support.

The decoder supports BinaryCIF **0.3.x with exactly one data block**. Its checked
inverse pipelines implement `ByteArray`, `Delta`, `RunLength`, `IntegerPacking`,
`FixedPoint`, `IntervalQuantization`, and `StringArray`, including presence masks
`0` (present), `1` (inapplicable), and `2` (unknown). String dictionaries borrow
the input text and translate only requested Unicode boundaries to UTF-8 byte
offsets; consistent UTF-16 and code-point offset profiles are handled without
splitting surrogate pairs. Producer quantization cannot restore digits absent
from the stored data.

Only `atom_site`, `struct_conn`, `cell`, `symmetry`, `space_group`, `entity`,
`entity_poly`, `struct_asym`, `chem_comp`, `struct_conf` and
`struct_sheet_range` columns are expanded. Other categories are not column-decoded or retained as full source
metadata; their strings and byte payloads remain borrowed within the bounded
MessagePack tree. Interpreted values are written to
bounded canonical CIF text and passed to the existing core reader, preserving
one implementation of first-model, occupancy/alternate, unknown-element,
declared-connection, and bond-perception decisions. The same limitations on atom
attributes and crystal images apply. Native provenance keeps those decisions,
the original BinaryCIF version/block name, and the original input-byte SHA-256,
including compressed bytes for gzip inputs; the source file is not embedded.

The outer import limit remains 128 MiB. BinaryCIF additionally bounds payload
bytes after gzip expansion and canonical CIF text separately at **64 MiB**.
MessagePack containers are checked before allocation: **1,000,000 nodes** and
**64 nesting levels**. Interpreted columns share a cumulative **16 × 1024²
decoded-value** budget, including intermediate transforms, masks, dictionary
indices, and offset boundaries; pipelines allow at most **16 transforms** and
**8 nested string-encoding levels**. Each interpreted category has 1–256 columns;
`atom_site` allows **250,000 total rows before model/alternate selection**,
`struct_conn` and each interpreted biological category allow 100,000 rows,
and interpreted cell/symmetry categories allow
one row. The shared 100,000 selected-atom and connection-provenance limits still
apply. Malformed lengths, invalid masks/indices, arithmetic overflow, unsupported
versions/encodings, and excessive expansion report errors rather than truncate.
These bounds are not a peak-memory guarantee.

[Independent BinaryCIF fixtures](../fixtures/bcif/README.md) provide the deposited
1CRN text/binary twins and a separately encoded selection/connection diagnostic.
The real structure has 327 atoms and three declared disulfides; the policy twin
tests occupancy, alternates, null masks, unknown elements, later models, Unicode
names, retained long links, and unresolved discarded references. Molstar was an
offline fixture tool, not a runtime or normal-test dependency.

From the repository root, with the temporary-directory variables from the
[development guide](development.md), inspect a real input without writing output:

```sh
cargo run --locked -p eigenvista-convert -- fixtures/bcif/1crn.bcif --check --json
```

## Verification

Tests cover water/methane XYZ, disconnected fragments, element alignment, model/alternate selection, explicit-plus-inferred connections, duplicate suppression, malformed input, dense-input budgets, coincident/planar/collinear points, and an independent exhaustive pair-distance comparison. Browser tests open XYZ/PDB through the actual file input, inspect rendered pixels, save/reopen connectivity, and check mobile layout and recovery after malformed imports.

[Radius-query regressions](../crates/eigenvista-core/tests/bond_radius_queries.rs)
add four cases spanning all 118 elements, cutoff/minimum boundaries, translated
coordinates, explicit precedence/ties, and an exactly 100,000-atom outlier stress
that formerly exceeded the neighbor budget. The hydrogen lattice is deliberately
coordinate-valid synthetic input, not a physical material reference.
[Declared-connection regressions](../crates/eigenvista-import/tests/cif_connections.rs)
cover reference identity, alternate/non-polymer selection, duplicates/types/images,
bounded malformed layouts, and native persistence; the resolver also has eight
module tests. [CLI regressions](../crates/eigenvista-convert/tests/cli.rs) exercise
real conversion/check/JSON/native paths, and
[browser workflows](../app/tests/cif-connections.spec.ts) exercise Open, provenance,
conversion, save/reopen, retained-scene errors, and desktop/mobile rendering.

[BinaryCIF contracts](../crates/eigenvista-import/tests/bcif_import.rs),
[bounded codec/MessagePack regressions](../crates/eigenvista-import/src/bcif/tests.rs),
the same CLI suite, and [BinaryCIF browser workflows](../app/tests/bcif.spec.ts)
cover independent twin parity, source-byte hashes, raw/gzip detection, bounded
malformed inputs, native persistence, conversion, file filters, and visible
desktop/mobile geometry. See [status](status.md) for dated results and gaps.

[Cube regressions](../crates/eigenvista-core/tests/cube_import.rs) cover both density
and single-orbital imports with automatic bonds. Shared-import and CLI tests
check native missing-bond backfill, retained explicit connections, unchanged
scientific grids/meshes, and idempotent reopen. See [cube import](cube-import.md)
and [Molden import](molden-import.md) for those formats' profiles and evidence.

Repository fixtures, read without modification. Current WASM verification keeps
`1BH3.cif` at 2,372 atoms/2,270 bonds with no declarations. `1AON.cif` now has
59,317 bonds, compared with the historical 59,307 coordinate-perceived baseline:
the ten additional pairs come from retained deposited links beyond the cutoff.
See [status](status.md) for dated verification.

| File | Selected atoms | Bonds |
| --- | ---: | ---: |
| `fixtures/legacy/data/guanine.pdb` | 33 | 35 |
| `fixtures/legacy/data/3POR.pdb` | 2,325 | 2,285 |
| `fixtures/legacy/data/URIDINE-VANADATE.pdb` | 31 | 33 |
| `fixtures/legacy/data/alaninemulti.pdb` | 66 (first structure only) | 65 |
| `fixtures/cif/1BH3.cif` | 2,372 (from 2,383 source rows) | 2,270 |
| `fixtures/cif/1AON.cif` | 58,870 | 59,317 |

Single release-build measurements on the development Apple Silicon Mac, 3 October 2026, using `cargo run --locked --release -p molekel-core --example bond_benchmark`:

| Workload | Time | Spatial visits | Hypothetical all-pairs comparisons |
| --- | ---: | ---: | ---: |
| 3POR parsing plus connectivity | 7.17 ms | Not recorded | Not recorded |
| Synthetic 10,000-atom lattice, connectivity only | 8.99 ms | 49,600 | 49,995,000 |
| Synthetic 100,000-atom lattice, connectivity only | 96.10 ms | 676,000 | 4,999,950,000 |

These are bounded development measurements, not universal performance promises or renderer benchmarks. The lattice is a spatial-index stress input, not a chemically meaningful bonding reference. Bond orders and broader structure-conversion profiles remain separate work.

The current radius-bucket comparison is repeatable with
`cargo run --locked --release -p eigenvista-core --example bond_radius_benchmark`.
It reports old/global and bucketed neighbor counts separately from timing:
old-query time excludes pair acceptance/sorting, while bucketed-full time includes
them. Those timings have different scopes and are not direct speedup ratios.
Fresh workload measurements and limitations are in [status](status.md).
