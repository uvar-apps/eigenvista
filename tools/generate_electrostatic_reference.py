#!/usr/bin/env python3
"""Evaluate frozen Molden GTO densities with PySCF/libcint's 1/r integrals."""

import hashlib
import json
from pathlib import Path

import numpy as np
import pyscf
from pyscf.tools import molden

FIXTURES = Path(__file__).resolve().parents[1] / "fixtures" / "molden"
NAMES = (
    "water-rhf-ccpvdz",
    "hydroxyl-uhf-sto3g",
    "general-spdfg-cartesian",
    "general-spdfg-spherical",
)
POINTS = np.array([
    [0.01, -0.02, 0.03], [0.31, -0.57, 1.21], [-1.4, 0.6, -0.8],
    [0.12, -0.24, 0.35], [0.8, 1.3, -0.4], [-0.07, 0.19, 0.43],
    [2.1, -1.7, 0.95], [4, -3, 2], [50, 21, -32],
])


def evaluate(name):
    filename = FIXTURES / f"{name}.molden"
    mol, _, coefficients, occupations, _, _ = molden.load(str(filename))
    if not isinstance(coefficients, tuple):
        coefficients, occupations = (coefficients,), (occupations,)
    density = sum((coeff * occ) @ coeff.T for coeff, occ in zip(coefficients, occupations))
    nuclear = mol.atom_charges() / np.linalg.norm(
        POINTS[:, None, :] - mol.atom_coords(), axis=2,
    )
    values = []
    for point, charges in zip(POINTS, nuclear):
        with mol.with_rinv_origin(point):
            electronic = np.einsum("ij,ij", mol.intor("int1e_rinv"), density)
        values.append(float(charges.sum() - electronic))
    return {
        "fixture": name,
        "sha256": hashlib.sha256(filename.read_bytes()).hexdigest(),
        "values": values,
    }


if __name__ == "__main__":
    print(json.dumps({
        "producer": f"PySCF {pyscf.__version__} / libcint int1e_rinv",
        "points_bohr": POINTS.tolist(),
        "fixtures": [evaluate(name) for name in NAMES],
    }, indent=2))
