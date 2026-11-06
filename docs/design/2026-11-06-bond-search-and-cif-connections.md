# Radius-bounded bond search and declared mmCIF connectivity

Status: implemented

Date: 6 November 2026. Baseline: `58d835b`, version 0.5.11.
Issues: [#3](https://github.com/uvar-apps/eigenvista/issues/3),
[#19](https://github.com/uvar-apps/eigenvista/issues/19).

## Bond queries

Partition target atoms into 0.5-angstrom covalent-radius buckets, each with its
own exact k-d tree and observed maximum radius. Query every nonempty bucket with
`source_radius + bucket_maximum + tolerance`. Every target belongs to one bucket,
so this is a conservative bound for every pair without a structure-wide outlier
widening all target queries. Keep exact pair cutoffs, minimum distance, candidate
ordering/ties, explicit precedence, coordination filtering, and every allocation/
work guard unchanged. Do not substitute an arbitrary plausible maximum radius.

Measure old/global and bucket candidate visits separately from total perception
time. Verify candidates/results against an independent exhaustive pair oracle,
all 118 elements, cutoff boundaries, degenerate coordinates, explicit edges, and
heterogeneous stress. A coordinate-valid synthetic hydrogen lattice is not a
physically representative material. No real-input budget failure is assumed.

## mmCIF connection policy

Read `_struct_conn` against retained `_atom_site` source-row identity after the
existing first-model and occupancy/alternate selection. Match supplied label and
author references consistently, including explicit alternate/insertion fields.
Never redirect an omitted conformer to a selected alternate, choose an arbitrary
ambiguous row, or silently ignore contradictory namespaces. The category uses
partner label/author references; no standard direct `atom_site_id` field is
invented. Preserve unknown deposited order rather than infer one.
For non-polymers with an inapplicable label sequence, author residue/insertion
identity separates alternate-location groups; separate waters must not share
one global preferred alternate. A new regression reproduced that selection
defect before correcting the fallback needed by connection resolution.

`covale`, `disulf`, and `metalc` are explicit display connections. They take
precedence; coordinate perception fills missing pairs. Rods remain untyped
display connectivity, not inferred bond orders. Hydrogen/salt/unknown link types
are recorded but not inserted as explicit rods; independent coordinate perception
can still find the same pair. A separate noncovalent rendering class is deferred.
Declarations with non-null third-partner identifiers are recorded without
forcing a two-partner edge; higher-order connection semantics are not guessed.

Matching valid `n_klm` codes on both partners represent a common isometry: the
pair can map back to the selected asymmetric-unit sites through its inverse.
This is a mathematical inference from symmetry semantics, not an assumption
that operation 1 is identity. Both omitted/`.` symmetries use an explicit
selected-site profile. Unknown `?`, differing codes, and mixed specified/
unspecified images are reported and omitted; no symmetry mates are generated.

Keep one provenance record per declaration, including its source ID/type/order,
full source columns, selected partner indices when resolved, explicit canonical
edge when applicable, and retained/duplicate/recorded/unresolved/image status.
Records use the `mmCIF struct_conn: ` JSON prefix in existing provenance strings,
without changing the native document schema. Human-readable policy/counts and
`mmCIF parser:` loss notices expose the import decisions. Cap declaration rows
at 100,000 and serialized connection provenance at 4 MiB to stay within the
native 8 MiB manifest bound. Stream-check cumulative record size before allocating
JSON strings, including selected atom-site IDs originating outside the connection
rows; repeated long IDs must not bypass the source-row budget. The final bound
also counts outer manifest-string escaping. Fail bounded malformed input rather
than truncate.

## Evidence and boundaries

Independent source-row inspection finds 27 unique selected `metalc` pairs in
`1AON.cif`; ten Mg–O declarations exceed the existing 2.47-angstrom pair cutoff.
`1BH3.cif` has no declarations and remains a baseline for unchanged perception.
Tests must cover both real files, label/author differences, missing/ambiguous/
contradictory references, alternate/model omissions, duplicates, noncovalent
types, symmetry, wrapped/scalar categories, malformed input, and native/CLI/UI
roundtrips. Retain source validation, deterministic bonds, worker cancellation,
scientific hashes, and source fixture bytes. Run all standard verification and
inspect desktop/mobile previews. Measurements and remaining limits belong in
[status](../status.md).

Lexical limits are explicit: at most 256 columns are retained while reading a
header, and connection data lines are limited to one million tokens. All column
names on a header line are honored. Connection values can wrap or use text blocks;
atom rows remain line-aligned. Header/data mixtures, inline category controls,
unsupported save/global frames, multiline atom rows, and trailing tokens after
text closers or data/stop boundaries are rejected rather than silently dropping
columns, constraints, or partial geometry. Separated boundary comments remain
supported. Quoted control-like identifiers remain literal values, including
preserved text-block opening whitespace.

Reference semantics: [category](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Categories/struct_conn.html),
[types](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_struct_conn.conn_type_id.html),
[symmetry](https://mmcif.wwpdb.org/dictionaries/mmcif_pdbx_v50.dic/Items/_struct_conn.ptnr1_symmetry.html),
[null/lexical syntax](https://mmcif.wwpdb.org/docs/tutorials/mechanics/pdbx-mmcif-syntax.html).
