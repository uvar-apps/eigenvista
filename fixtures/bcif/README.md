# Independent BinaryCIF regression inputs

These are data-only inputs for the shared BinaryCIF/text-mmCIF import contract.
They are separate from the frozen legacy fixtures and are not quantum-chemistry
references. Tests consume the checked-in bytes without network access or external
encoding tools.

## Real deposited structure

`1crn.cif` and `1crn.bcif` are unmodified downloads of RCSB PDB entry **1CRN**
(crambin), retrieved on 6 November 2026:

- Text: <https://files.rcsb.org/download/1CRN.cif>
- Binary: <https://models.rcsb.org/1crn.bcif>
- Structure: <https://www.rcsb.org/structure/1CRN>
- Data DOI: <https://doi.org/10.2210/pdb1CRN/pdb>

The downloaded BinaryCIF declares format version `0.3.0` and encoder
`python-mmcif library`. Its coordinates use little-endian Float64 `ByteArray`
encoding, not a quantized coordinate profile. The BinaryCIF is larger than this
particular text twin; no general compression ratio is inferred.

Independent source-row inspection counts 327 atom records: 202 C, 55 N, 64 O,
and 6 S. Every row has occupancy 1, no alternate, and model 1. All four label
partner identifiers resolve each deposited disulfide uniquely to zero-based
atom indices:

| Connection | Cysteine residue pair | Atom pair    |
| ---------- | --------------------- | ------------ |
| `disulf1`  | 3–40, SG–SG           | `[19, 281]`  |
| `disulf2`  | 4–32, SG–SG           | `[25, 228]`  |
| `disulf3`  | 16–26, SG–SG          | `[115, 187]` |

The independent Molstar 5.13.1 text and BinaryCIF parsers also agree on all
element/identity/occupancy/alternate/model fields. Their maximum coordinate
difference is `3.552713678800501e-15` angstrom. These checks were performed
without invoking the EigenVista BinaryCIF importer; the report and fixed
source expectations are recorded in [reference.json](reference.json).

PDB archive data are available under
[CC0 1.0](https://www.wwpdb.org/about/usage-policies). Preserve the original
embedded metadata and citations. This data notice does not change EigenVista's
GPL-2.0-or-later source license.

## Selection and connection policy twin

`policy.cif` is an original eight-row diagnostic structure. `policy.bcif` was
encoded from it using the independent **Molstar 5.13.1** parser and writer,
without calling any EigenVista decoding or selection implementation. The
offline [generator](generate-policy.cjs) checks every atom column and null mask
through Molstar's own BinaryCIF reader before writing the bytes.

Its expected retained source IDs are `1`, `3`, `5`, and `7`: one common C,
the higher-occupancy B alternate N, one S, and one O with a Unicode atom name.
An A alternate, zero-occupancy site, unknown `Qq` element, and later-model site
are omitted under the shared import policy. A declared long-range pair is
retained as `[0, 1]`; the declaration referring to the discarded A alternate
remains unresolved rather than being redirected. Full expectations are in
[reference.json](reference.json).

The fixture exercises `ByteArray`, `Delta`, `FixedPoint`, `IntegerPacking`,
`RunLength`, and `StringArray`, as well as present/inapplicable/unknown masks
`0`, `1`, and `2`. The `ΩA` name checks UTF-16 string-dictionary offsets from
the JavaScript producer against UTF-8 storage. It does not cover interval
quantization; that transform needs a separate codec regression.

The policy data and generator are original EigenVista GPL-2.0-or-later material.
Molstar is an independent MIT-licensed offline tool, not an application or test
dependency.

To regenerate deliberately, obtain the exact Molstar 5.13.1 npm package and make
its `tslib` dependency available to Node. Keep all staging and cache files under
repository-local `tmp/`, then run from the repository root:

```sh
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
node fixtures/bcif/generate-policy.cjs /path/to/molstar/lib/commonjs
```

Changing fixtures requires reviewing the byte digests and independently derived
expectations. Never regenerate them to make an import test pass.

## Sources

- [BinaryCIF format and encoding specification](https://github.com/molstar/BinaryCIF/blob/master/encoding.md)
- [MessagePack specification](https://github.com/msgpack/msgpack/blob/master/spec.md)
- [Molstar source and MIT license](https://github.com/molstar/molstar)
- [wwPDB data usage policy](https://www.wwpdb.org/about/usage-policies)

Byte lengths and SHA-256 digests for every input are pinned in
[manifest.json](manifest.json).
