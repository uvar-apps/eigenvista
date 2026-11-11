use eigenvista_core::{Document, compute};
use eigenvista_import::import_bytes;
use sha2::{Digest, Sha256};

const BASIS: &str =
    "[Molden Format]\n[Atoms] AU\nH 1 1 0 0 0\n[GTO]\n1 0\ns 1 1\n1 1\ns 1 1\n2 1\n[MO]\n";
const ALPHA: &str = "Sym=occupied\nEne=-0.5\nSpin=Alpha\nOccup=0.25\n1 1\n2 2\n";
const VIRTUAL: &str = "Sym=virtual\nEne=0.4\nSpin=Beta\nOccup=0\n1 7\n2 9\n";

fn load(orbitals: &str) -> Document {
    import_bytes(
        format!("{BASIS}{orbitals}").as_bytes(),
        "occupations.molden",
    )
    .unwrap()
    .document
}

// Independent two-normalized-S-Gaussian oracle. Its hand-expanded quadratic
// forms below do not obtain expected densities from imported MO coefficients.
fn check_density(document: &Document, kind: &str, matrix: [f64; 4]) {
    let density = document
        .densities
        .iter()
        .find(|density| density.kind == kind)
        .unwrap();
    assert_eq!(density.matrix, matrix);
    for point in [[0., 0., 0.], [0.3, -0.7, 1.1], [-1.2, 0.4, -0.2]] {
        let r2 = point.iter().map(|value| value * value).sum::<f64>();
        let a = (2. / std::f64::consts::PI).powf(0.75) * (-r2).exp();
        let b = (4. / std::f64::consts::PI).powf(0.75) * (-2. * r2).exp();
        let cross = matrix[1] + matrix[2];
        let expected = matrix[0] * a * a + cross * a * b + matrix[3] * b * b;
        let (value, gradient) = compute::evaluate(document, &density.id, point).unwrap();
        assert!((value - expected).abs() < 2e-12);
        for axis in 0..3 {
            let expected_gradient = -point[axis]
                * (4. * matrix[0] * a * a + 6. * cross * a * b + 8. * matrix[3] * b * b);
            assert!((gradient[axis] - expected_gradient).abs() < 2e-12);
        }
    }
}

#[test]
fn restricted_zero_occupation_retains_virtual_metadata_and_fractional_density() {
    let document = load(
        "Sym=filled\nEne=-0.9\nSpin=Alpha\nOccup=2\n1 1\n2 -2\n\
         Sym=fractional\nEne=-0.2\nSpin=Alpha\nOccup=0.5\n1 3\n2 4\n\
         Sym=virtual\nEne=0.4\nSpin=Alpha\nOccup=-0.0\n1 5\n2 -6\n",
    );
    assert_eq!(document.orbitals.len(), 3);
    assert!(
        document
            .orbitals
            .iter()
            .all(|orbital| orbital.spin == "spatial")
    );
    let virtual_mo = &document.orbitals[2];
    assert_eq!(virtual_mo.id, "molden-mo-3");
    assert!(virtual_mo.label.contains("virtual"));
    assert_eq!(virtual_mo.energy, Some(0.4));
    assert_eq!(
        virtual_mo.occupation.unwrap().to_bits(),
        (-0.0_f64).to_bits()
    );
    assert_eq!(virtual_mo.coefficients, [5., -6.]);
    assert_eq!(document.view.field.as_deref(), Some("molden-mo-2"));
    assert_eq!(document.densities.len(), 1);
    // 2 (a - 2b)^2 + 0.5 (3a + 4b)^2 = 6.5a² + 4ab + 16b².
    check_density(&document, "total", [6.5, 2., 2., 16.]);
}

#[test]
fn unrestricted_fractional_and_zero_occupations_match_independent_spin_densities() {
    let document = load(&format!(
        "{ALPHA}Sym=alpha-virtual\nEne=0.2\nSpin=Alpha\nOccup=0\n1 1e300\n2 -1e300\n\
         Sym=beta-occupied\nEne=-0.1\nSpin=Beta\nOccup=0.75\n1 2\n2 -1\n{VIRTUAL}"
    ));
    assert_eq!(document.orbitals.len(), 4);
    assert_eq!(document.densities.len(), 4);
    assert_eq!(document.orbitals[1].coefficients, [1e300, -1e300]);
    assert_eq!(document.orbitals[3].coefficients, [7., 9.]);
    // alpha = 0.25 (a + 2b)^2; beta = 0.75 (2a - b)^2.
    check_density(&document, "alpha", [0.25, 0.5, 0.5, 1.]);
    check_density(&document, "beta", [3., -1.5, -1.5, 0.75]);
    check_density(&document, "total", [3.25, -1., -1., 1.75]);
    check_density(&document, "spin", [-2.75, 2., 2., 0.25]);
    assert_eq!(document.view.field.as_deref(), Some("molden-mo-3"));
}

#[test]
fn beta_only_and_all_virtual_exports_keep_their_density_kinds() {
    let document = load(
        "Sym=beta-occupied\nSpin=Beta\nOccup=0.75\n1 2\n2 -1\n\
         Sym=beta-virtual\nSpin=Beta\nOccup=0\n1 7\n2 9\n",
    );
    assert_eq!(document.orbitals.len(), 2);
    assert_eq!(document.densities.len(), 1);
    check_density(&document, "beta", [3., -1.5, -1.5, 0.75]);

    let document = load(&format!(
        "{}{VIRTUAL}",
        ALPHA.replace("Occup=0.25", "Occup=0")
    ));
    assert_eq!(document.orbitals.len(), 2);
    assert_eq!(document.view.field.as_deref(), Some("molden-mo-1"));
    assert_eq!(document.densities.len(), 4);
    for kind in ["total", "alpha", "beta", "spin"] {
        check_density(&document, kind, [0.; 4]);
    }
}

#[test]
fn nonzero_occupations_are_not_discarded_by_a_threshold() {
    let document = load("Sym=tiny\nSpin=Alpha\nOccup=1e-200\n1 1\n");
    assert_eq!(document.densities[0].matrix, [1e-200, 0., 0., 0.]);
}

#[test]
fn missing_occupation_still_suppresses_all_derived_densities() {
    let source = format!("{BASIS}{ALPHA}{}", VIRTUAL.replace("Occup=0\n", ""));
    let imported = import_bytes(source.as_bytes(), "missing.molden").unwrap();
    assert_eq!(imported.document.orbitals.len(), 2);
    assert_eq!(imported.document.orbitals[1].occupation, None);
    assert!(imported.document.densities.is_empty());
    assert!(
        imported
            .report
            .warnings
            .iter()
            .any(|warning| warning.contains("Some occupations are missing"))
    );
}

#[test]
fn malformed_zero_occupation_orbitals_are_fully_validated() {
    for (virtual_mo, expected) in [
        (VIRTUAL.replace("1 7", "1 NaN"), "Non-finite"),
        (VIRTUAL.replace("2 9", "2 inf"), "Non-finite"),
        (VIRTUAL.replace("1 7", "1 nonsense"), "Invalid number"),
        (VIRTUAL.replace("2 9", "3 9"), "exceeds the declared basis"),
        (VIRTUAL.replace("1 7", "0 7"), "exceeds the declared basis"),
        (VIRTUAL.replace("2 9", "1 9"), "Duplicate AO index"),
        (
            VIRTUAL.replace("1 7\n2 9", "1 0\n2 0"),
            "All-zero molecular orbital",
        ),
        (VIRTUAL.replace("1 7\n2 9\n", ""), "Missing coefficients"),
        (VIRTUAL.replace("Ene=0.4", "Ene=NaN"), "Non-finite"),
        (VIRTUAL.replace("Spin=Beta", "Spin=Spinor"), "Spin must be"),
        (VIRTUAL.replace("Spin=Beta\n", ""), "Explicit Spin"),
        (VIRTUAL.replace("Occup=0", "Occup=NaN"), "Non-finite"),
        (
            VIRTUAL.replace("Occup=0", "Occup=-0.1"),
            "between zero and two",
        ),
        (VIRTUAL.replace("Occup=0", "Occup=1.5"), "cannot exceed one"),
        (
            VIRTUAL.replace("Sym=virtual", "Sym=virtual\nSym=repeated"),
            "Repeated Sym",
        ),
    ] {
        let source = format!("{BASIS}{ALPHA}{virtual_mo}");
        let error = import_bytes(source.as_bytes(), "bad-virtual.molden").unwrap_err();
        assert!(error.contains(expected), "expected {expected:?}: {error}");
    }
}

#[test]
fn native_roundtrip_preserves_arbitrary_supplied_matrices_and_source_identity() {
    let source = format!("{BASIS}{ALPHA}{VIRTUAL}");
    let mut document = import_bytes(source.as_bytes(), "source.molden")
        .unwrap()
        .document;
    let digest = format!("{:x}", Sha256::digest(source.as_bytes()));
    assert!(
        document
            .provenance
            .iter()
            .any(|entry| entry.contains(&digest))
    );
    // Deliberately unrelated to MO occupations and asymmetric.
    document.densities[0].matrix = vec![1., 2., 3., 4.];
    check_density(&document, "total", [1., 2., 3., 4.]);
    let source_hash = compute::source_hash(&document, "molden-density-total").unwrap();
    let bytes = eigenvista_format::encode(&document).unwrap();
    for name in ["saved.eigenvista", "saved.molekel"] {
        let imported = import_bytes(&bytes, name).unwrap();
        assert_eq!(imported.document, document);
        assert_eq!(
            compute::source_hash(&imported.document, "molden-density-total").unwrap(),
            source_hash
        );
        assert!(!imported.report.requires_save);
        assert!(imported.report.warnings.is_empty());
    }
}
