use eigenvista_core::{
    Atom, BasisFunction, Density, Document, Grid, Orbital, Term, allocation, import,
};

#[test]
fn document_collections_and_basis_contractions_have_no_policy_ceilings() {
    let mut document = Document::empty("large collections");
    document.atoms = vec![
        Atom {
            element: 6,
            position: [0.; 3]
        };
        100_001
    ];
    document.bonds = vec![[0, 1]; 600_001];
    document.basis.push(BasisFunction {
        center: [0.; 3],
        exponents: vec![1.; 65],
        coefficients: vec![1.; 65],
        terms: vec![
            Term {
                powers: [0; 3],
                weight: 1.
            };
            33
        ],
    });
    document.orbitals = (0..513)
        .map(|index| Orbital {
            id: format!("orbital-{index}"),
            label: "large orbital list".into(),
            spin: "spatial".into(),
            occupation: Some(0.),
            energy: None,
            coefficients: vec![1.],
        })
        .collect();
    document.densities = (0..33)
        .map(|index| Density {
            id: format!("density-{index}"),
            label: "large density list".into(),
            kind: "total".into(),
            matrix: vec![1.],
        })
        .collect();
    document.grids = (0..17)
        .map(|index| Grid {
            id: format!("grid-{index}"),
            label: "large grid list".into(),
            quantity: "unknown".into(),
            origin: [0.; 3],
            axes: [[1., 0., 0.], [0., 1., 0.], [0., 0., 1.]],
            dims: [2; 3],
            values: vec![0.; 8],
        })
        .collect();
    document.validate().unwrap();
    document.orbitals.clear();
    document.densities.clear();
    document.basis.resize(1025, document.basis[0].clone());
    document.validate().unwrap();
}

#[test]
fn capacity_failure_is_reported_and_input_claims_are_checked_before_reservation() {
    assert!(
        allocation::buffer::<f64>(usize::MAX, "test samples")
            .unwrap_err()
            .contains("Cannot allocate test samples")
    );
    assert!(allocation::filled(usize::MAX, 0u64, "test samples").is_err());
    assert!(
        import::xyz(
            &format!("{}\nclaimed count\nH 0 0 0\n", usize::MAX),
            "bad.xyz"
        )
        .unwrap_err()
        .contains("Truncated XYZ")
    );
    let malformed = format!(
        "cube\ncomment\n0 0 0 0\n{} 1 0 0\n2 0 1 0\n2 0 0 1\n0\n",
        usize::MAX
    );
    assert!(
        import::cube(&malformed, "bad.cube")
            .unwrap_err()
            .contains("overflow")
    );
    assert!(
        import::cube(
            &malformed.replace(&usize::MAX.to_string(), "1000000000"),
            "bad.cube"
        )
        .unwrap_err()
        .contains("sample count")
    );
}
