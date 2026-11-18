use eigenvista_import::import_bytes;
use std::fmt::Write;

fn wavefunction(basis: usize, alpha: usize, beta: usize) -> String {
    let mut text = String::from("[Molden Format]\n[Atoms] AU\nH 1 1 0 0 0\n[GTO]\n1 0\n");
    for index in 0..basis {
        writeln!(text, "s 1 1.00\n{} 1", 1. + index as f64 * 0.01).unwrap();
    }
    text.push_str("[MO]\n");
    // Occupations are legitimately optional. Omit them to isolate capacity
    // checks from unrelated O(M * AO^2) eager density construction.
    for (spin, count) in [("Alpha", alpha), ("Beta", beta)] {
        for index in 0..count {
            writeln!(
                text,
                "Sym={spin}-{}\nEne=-0.5\nSpin={spin}\n{} 1",
                index + 1,
                index % basis + 1,
            )
            .unwrap();
        }
    }
    text
}

#[test]
fn basis_capacity_matches_the_core_without_requiring_a_complete_mo_set() {
    let imported = import_bytes(wavefunction(1024, 1, 0).as_bytes(), "partial.molden").unwrap();
    let mut document = imported.document;
    assert_eq!(document.basis.len(), 1024);
    assert_eq!(document.orbitals.len(), 1);
    assert_eq!(document.orbitals[0].coefficients.len(), 1024);
    assert!(document.densities.is_empty());
    assert!(
        imported
            .report
            .warnings
            .iter()
            .any(|warning| warning.contains("Some occupations are missing"))
    );
    document.validate().unwrap();

    document.basis.push(document.basis[0].clone());
    document.orbitals[0].coefficients.push(0.);
    document.validate().unwrap();
    let larger = import_bytes(wavefunction(1025, 1, 0).as_bytes(), "larger-aos.molden").unwrap();
    assert_eq!(larger.document.basis.len(), 1025);
    larger.document.validate().unwrap();
}

#[test]
fn complete_spatial_and_two_spin_sets_extend_beyond_former_mo_ceiling() {
    for (basis, alpha, beta, spin) in [(512, 512, 0, "spatial"), (256, 256, 256, "alpha")] {
        let imported = import_bytes(
            wavefunction(basis, alpha, beta).as_bytes(),
            "complete.molden",
        )
        .unwrap();
        let mut document = imported.document;
        assert_eq!(document.basis.len(), basis);
        assert_eq!(document.orbitals.len(), 512);
        assert_eq!(document.orbitals[0].spin, spin);
        if beta != 0 {
            assert_eq!(document.orbitals[alpha].spin, "beta");
        }
        assert!(document.densities.is_empty());
        document.validate().unwrap();

        let mut extra = document.orbitals.last().unwrap().clone();
        extra.id = "outside-orbital-limit".into();
        document.orbitals.push(extra);
        document.validate().unwrap();
        let larger = import_bytes(
            wavefunction(
                basis,
                alpha + usize::from(beta == 0),
                beta + usize::from(beta != 0),
            )
            .as_bytes(),
            "larger-mos.molden",
        )
        .unwrap();
        assert_eq!(larger.document.orbitals.len(), 513);
        larger.document.validate().unwrap();
    }
}

#[test]
fn complete_300_ao_unrestricted_export_retains_all_600_orbitals() {
    let imported = import_bytes(wavefunction(300, 300, 300).as_bytes(), "uhf-300.molden").unwrap();
    assert_eq!(imported.document.basis.len(), 300);
    assert_eq!(imported.document.orbitals.len(), 600);
    assert!(
        imported.document.orbitals[..300]
            .iter()
            .all(|mo| mo.spin == "alpha")
    );
    assert!(
        imported.document.orbitals[300..]
            .iter()
            .all(|mo| mo.spin == "beta")
    );
    imported.document.validate().unwrap();
}
