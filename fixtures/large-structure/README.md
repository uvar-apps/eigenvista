# Large-structure regression inputs

These inputs exist to guard the renderer and the native document format at sizes
where they previously failed. They are **not** part of the
[legacy Molekel fixture set](../legacy/README.md): that directory records eight
files copied byte-for-byte from Molekel commit
`4edabf6852db44ff849e82223bef6c0702730e3c`, and nothing here came from it.

| Fixture | Content | Regression purpose |
| --- | --- | --- |
| [`4PJ1.pdb`](4PJ1.pdb) | Human mitochondrial chaperonin symmetrical "football" complex. X-ray diffraction, 3.15 Å, deposited 10-MAY-14. 65,571 `ATOM` + 392 `HETATM` records, 28 chain identifiers, elements C/N/O/P/S/Mg, cell 199.1 × 199.1 × 627.39 Å, space group P 4₁ 2₁ 2. | Large-structure import, instanced rendering, and native encode/decode at a size the previous format refused |

## Provenance

[`4PJ1.pdb`](4PJ1.pdb) is the RCSB Protein Data Bank entry **4PJ1**, taken from
the public PDB distribution rather than from any EigenVista or Molekel source.
It is unmodified: the file is checked in exactly as distributed, and the
[SHA-256 manifest](manifest.json) pins its byte length and checksum.

The structure is a real deposited experiment, not a synthetic or optimized test
geometry. Its scientific content is incidental — it is used here for scale, not
as a qualified numerical reference. Independent numerical references remain in
the [PySCF](../pyscf/README.md) and [Molden](../molden/README.md) fixture sets.

## What this fixture guards

Importing 4PJ1 yields 65,963 atoms and 66,610 perceived bonds. Before the 0.5.3
work this broke two independent things:

- **Rendering.** Per-atom geometry and material cost ~121,500 draw calls per
  frame and a 3.2 GB JS heap. Instancing brought that to 1.8 draw calls and
  ~40 MB.
- **Saving.** Every atom's nested `position` array took its own ZIP entry, so
  the 8,192-entry cap refused the document outright with `Document has too many
  array entries for the preview profile`. Columnar packing brought the whole
  atom collection down to two entries and a ~2.6 KiB manifest.

The regression test asserts the import counts, that the atom collection encodes
as two column entries, that the manifest stays small and constant-shaped with
respect to atom count, and that decode reproduces the document exactly.

## Notices

This fixture carries no license file of its own. RCSB PDB entries are distributed
for scientific use under the PDB's licensing terms; the deposited entry's own
copyright and citation are embedded in the file header and are preserved
unaltered. EigenVista's own license remains at the
[repository root](../../LICENSE). Do not treat this file as redistributable
outside the terms recorded in its header.
