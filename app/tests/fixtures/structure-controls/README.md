# Structure control inputs

These first-party synthetic inputs were created for EigenVista on 14 November 2026.
They use the repository's GPL-2.0-or-later license (see../../../../LICENSE).
Coordinates and identities were declared specifically for display tests; no
legacy implementation, deposited coordinates or quantum calculation produced them.
Normal tests consume these files unchanged and never regenerate expectations.

| Input | SHA-256 |
| --- | --- |
| components.pdb | 7fbe3207e935ecad59beb553ce866ec49606847a61bddf4a9b56d919d65e8509 |
| many-chains.cif | 16d62a5257923cef40895f1a90db7a5ec161c3a0f336521eb4667d0d29ccaec1 |

components.pdb has 24 atoms. Chain A contains ALA10, GLY10A and THR11
(12 atoms); B contains SER20 and VAL21 (8); L contains LIG501 (2);
W contains HOH1 (1); I contains ZN1 (1). Protein atom order is N, CA, C, O.
No secondary annotations are supplied. Expected source atom indices are
A=0–11, B=12–19, L=20–21, W=22 and I=23; A10 through A10A selects 0–7.
Entity identity is absent from this PDB.

many-chains.cif declares 60 single-ALA chains C00–C59, each with one CA
atom, entity 1 and residue 1, at x=4i angstrom. It tests bounded controls and
search, rather than complete backbone topology.

Real deposited annotations are checked separately against the existing,
unchanged fixtures/bcif/1crn.cif: helix 7–19 and 23–30 (21 residues),
sheet 1–4 and 32–35 (8), and 17 unknown residues. Existing tracked
fixtures/cif/1AON.cif supplies real identity/palette scale qualification without
a giant routine GPU scene. These original PDB archive inputs are CC0 data;
preserve their embedded deposition metadata and citations and see
../../../../fixtures/bcif/README.md for 1CRN provenance. No third-party data
were copied into these new synthetic files.

small.xyz is a declared three-atom O/H/H replacement geometry in angstroms. Its tiny source index range 0–2 detects stale focus from chain B (indices 12–19). water-only.pdb contains only the synthetic HOH oxygen already declared in components.pdb; it tests retained nonprotein metadata without pretending that a protein backbone is present. Their SHA-256 values are f397a8253001af5fb2f9df9c2307a1a3962b6a477312b946402a7a93cae7b4db and 2d5896d6fd257123b986faf92bf178ad0e3334bad7eaa776292ffde0ead5022b, respectively. Both use the same first-party GPL-2.0-or-later license.

## Microheterogeneity regression

[microhet.cif](microhet.cif) is original EigenVista synthetic test data under
GPL-2.0-or-later, created on 14 November 2026; its header records that provenance.
SHA-256: afe68adde9b14dc956886bdd6316983e5dc0dbf9d5b88aec3d74efc0846a3b6e. No deposited coordinates, legacy code or existing
frozen input was copied or modified to construct it.

It declares 20 N/CA/C/O atoms across five selected monomer records and four
distinct sequence positions: ALA
(label 1/author 9), SER (label 2/author 10, alternate A, occupancy 0.60),
CYS (label 2/author 10, alternate B, occupancy 0.40), GLY (label 3/author 11)
and THR (label 4/author 12). Both variants at label position 2 intentionally survive
the existing component-specific alternate-selection policy. The label chain is A,
author chain X and entity 1. No secondary assignments or quantum data are supplied.

The zero-based CA atom indices are 1, 5, 9, 13, 17, at x=0, 3.8, 3.8, 7.6, 11.4 angstrom;
CYS is displaced 0.2 angstrom in y. Native metadata must retain all 20 atoms and
five residue identities. Display backbone preparation must omit the ambiguous
SER/CYS anchors without choosing a monomer, producing separate original-index
segments [[1], [13, 17]] and an explicit ambiguity notice. The singleton ALA
remains a visible marker; only GLY→THR supplies a trace edge. Tests consume this
input unchanged and check the declared semantics rather than generating an
expectation with the production encoder.
