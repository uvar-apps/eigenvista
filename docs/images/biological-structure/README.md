# Biological-view illustrations

These are unedited captures of the actual EigenVista source application on
14 November 2026, after the published 0.6.0 release. They are user-guide
illustrations, not frozen numerical or pixel-test expectations.

- `1aon-chain-cartoon.png`: complete tracked 1AON, chain coloring and protein
  cartoons, with atomic nonprotein detail retained.
- `1aon-isolated-a-secondary.png`: the same source with chain A isolated and
  focused; deposited secondary coloring shows helices, strand arrows and gray
  unassigned loops.

Input is the existing [tracked 1AON CIF](../../../fixtures/cif/1AON.cif), SHA256
`6b202f340ffb9a1924d5315ce9e837e02cee1dbd745df675be76f6d4e1b8e66f`.
The original fixture is unchanged. PDB archive data uses
[CC0 1.0](https://www.wwpdb.org/about/usage-policies); the existing
[1AON qualification record](../../design/2026-11-14-molecular-ambient-occlusion.md)
also identifies this input. Captured through the
real browser application, its normal import/worker pipeline and current-frame
rendering at a 680×520 scene size. Both import the complete tracked file through
the normal first-model/alternate policy (58,870 selected atoms), without
prefiltering or synthetic geometry. The second image uses the documented session
visibility control. No assignments
were predicted. Application-produced illustrations follow this repository's
[GPL-2.0-or-later license](../../../LICENSE).

Illustration SHA256s:

- `1aon-chain-cartoon.png`: `82709a9c9c142f6420ae83b834888262a0caf8883ad1038d99bd34dd819cd451`
- `1aon-isolated-a-secondary.png`: `aa05e6c04bbc734039c14792543724655142c476a0a0cf69f7ac6830f506d2ce`
