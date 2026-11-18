EigenVista public tutorial examples

bicyclic-c7h10.molden: 17-atom C7H10 molecular calculation, 125 basis functions and 118 listed orbitals. Source and orbital notes: README-quantum-example.txt.
complex-field.cube: original 29-atom, 84x84x84 scalar grid from Molekel data/elf_pic.cube. Source header does not identify scalar meaning/units.
shaders/: ready-to-load X-ray and clipping shader pairs and parameters; original attribution and GPL notice are included.

water.pdb / water.xyz: synthetic three-atom water geometry (two inferred display bonds).
water.molden: independently calculated RHF/cc-pVDZ water; 24 basis functions and 24 spatial orbitals. See fixtures/molden/README.md in the public repository for scientific provenance.
signed-affine.cube: synthetic signed affine field, two atoms/one bond, skewed 7x7x7 grid. It is a mathematical rendering fixture, not a quantum-chemistry calculation.
1AON.cif: public deposited GroEL-GroES structure; see https://www.rcsb.org/structure/1AON for the original structure and citation. Repository import selects 58,870 source atoms.
matterviz-pastel.json / matterviz-muted.json: original MatterViz RGB values for elements1-109 in EigenVista's palette envelope. Author Janosh Riebesell; revision fae7a3e7fddf26f9625391ea76f28c7ebd261de9. MIT notice retained in LICENSE-MatterViz.txt; elements110-118 use built-in defaults.

Source file paths and exact SHA-256 values: provenance.json.
Source repository: https://github.com/uvar-apps/eigenvista
Application/website license: GPL-2.0-or-later (../LICENSE.txt). Preserve original data and palette notices.

Portable agent instructions: eigenvista-control/SKILL.md and reference.md form a complete optional workflow folder; README.md is the installed-app user guide, with allocation-policy.md explaining larger calculations. Keep these files together. These instructions do not install a binary or enable an older app. A compatible EigenVista.app supplies the prebuilt connection helper and launcher. No source checkout or compiler is required for that binary package.
