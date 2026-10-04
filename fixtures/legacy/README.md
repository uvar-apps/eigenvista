# Legacy molecular test data

These eight molecular files were copied byte-for-byte from the
[Molekel repository at commit 4edabf6](https://github.com/ugovaretto/molekel/tree/4edabf6852db44ff849e82223bef6c0702730e3c)
when EigenVista became a standalone repository. Only the molecular test data
and original license notice were copied; this directory contains no legacy
application implementation.

The [SHA-256 manifest](manifest.json) records the full source commit, original
repository paths, byte lengths, and checksums of all eight inputs plus the
license notice. The `data/` and `all_data/` names preserve their original paths
within this fixture directory. Do not normalize or regenerate these inputs
to accommodate a failing regression.

| File | Existing regression purpose |
| --- | --- |
| [molden.input](data/molden.input) | Real Molden import, complete orbital metadata, density sampling, and background cancellation |
| [guanine.pdb](data/guanine.pdb) | PDB import and automatic connectivity |
| [3POR.pdb](data/3POR.pdb) | Larger PDB import, connectivity, and optional bond benchmark |
| [URIDINE-VANADATE.pdb](data/URIDINE-VANADATE.pdb) | PDB compatibility and connectivity |
| [alaninemulti.pdb](data/alaninemulti.pdb) | Multiple-model PDB selection and connectivity |
| [h2o-dens.cube](data/h2o-dens.cube) | Gaussian cube density import, bonds, sampled fields, and surfaces |
| [Benzene.MO19-BOTH-SIGNS.cube](all_data/Benzene.MO19-BOTH-SIGNS.cube) | Signed single-orbital cube import and positive/negative surfaces |
| [test_homo.cube](all_data/molden_test/test_homo.cube) | Single-orbital cube import and positive/negative surfaces |

## Notices and scientific scope

[LICENSE](LICENSE) is an unchanged copy of the source repository's
`src/license`, retained with these legacy data. Preserve that notice and any
attribution embedded in the original files. It records the original Molekel
copyright and license terms; its references to historical application code
and dependencies do not mean those implementations are included here.
EigenVista's own license remains at the [repository root](../../LICENSE).

These inputs are preserved compatibility/regression examples, not freshly
generated or independently qualified quantum-chemistry references. The
separate [PySCF references](../pyscf/README.md) and
[Molden references](../molden/README.md) retain their own frozen checksums and
provenance. The [IOData-derived ORCA fixture](../molden/third-party/README.md)
retains its separate GPL-3.0-or-later attribution and license.
