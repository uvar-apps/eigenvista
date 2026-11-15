# Quantum gallery example

`bicyclic-c7h10.molden` is an unchanged copy of `data/molden.input` distributed
with [Molekel](https://github.com/ugovaretto/molekel/blob/76f3e3f4d458cece9b398df90e5cc2d11cb18804/data/molden.input).
It contains a 17-atom C7H10 bicyclic hydrocarbon, 125 basis functions and 118
listed spatial orbitals. The 26 occupied orbitals each have occupation 2.

The original title is blank and the input does not identify its calculation
method or basis-set name. The gallery uses its formula rather than assigning a
chemical name or method. MO 26 (26a) is the highest occupied source-order orbital,
with energy -0.20945781051103 hartree; MO 27 (27a) is the first listed unoccupied
orbital, with energy -0.022452121682877 hartree.

Original SHA-256: `9309464ace24326f70c344852d4bbc49bc1bca418876a1a0d6b42863202b4645`.
The original dataset is retained under Molekel's GPL-2.0-or-later distribution;
preserve this attribution and the accompanying EigenVista GPL license notice.

`complex-field.cube` is an unchanged copy of Molekel's `data/elf_pic.cube`.
It contains 29 atoms (Mg6 Cl12 Ti C3 H7) and an 84 × 84 × 84 scalar grid, with
values from 0 to 1. The two header comments are `SYS1`; neither the scalar
quantity nor its units are stated. The tutorial uses it as an imported grid,
without assigning a physical interpretation from its filename.

The surface shader examples are shipped separately under `downloads/shaders/`.
Their README and GPL notice retain the original shader attribution.
