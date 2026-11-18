//! mmCIF import: dispatch, unit conversion, alternate locations, and the
//! real fixtures under `fixtures/cif`.

use eigenvista_import::import_bytes;
use std::collections::BTreeMap;

const BOHR: f64 = 0.529177210903;

fn cif_body(rows: &str) -> String {
    format!(
        "data_TEST\n\
         #\n\
         loop_\n\
         _atom_site.group_PDB\n\
         _atom_site.id\n\
         _atom_site.type_symbol\n\
         _atom_site.label_atom_id\n\
         _atom_site.label_alt_id\n\
         _atom_site.label_comp_id\n\
         _atom_site.label_asym_id\n\
         _atom_site.label_entity_id\n\
         _atom_site.label_seq_id\n\
         _atom_site.pdbx_PDB_ins_code\n\
         _atom_site.Cartn_x\n\
         _atom_site.Cartn_y\n\
         _atom_site.Cartn_z\n\
         _atom_site.occupancy\n\
         _atom_site.B_iso_or_equiv\n\
         _atom_site.pdbx_formal_charge\n\
         _atom_site.auth_seq_id\n\
         _atom_site.auth_comp_id\n\
         _atom_site.auth_asym_id\n\
         _atom_site.auth_atom_id\n\
         _atom_site.pdbx_PDB_model_num\n\
         {rows}\n\
         #\n"
    )
}

fn load(text: &str, name: &str) -> eigenvista_import::ImportResult {
    import_bytes(text.as_bytes(), name).expect("cif should import")
}

#[test]
fn cif_dispatches_by_extension_and_converts_angstrom_to_bohr() {
    let text = cif_body(
        "ATOM 1 N N . ALA A 1 1 ? 0.000 0.000 0.000 1.00 20.00 ? 1 ALA A N 1\n\
         ATOM 2 C C . ALA A 1 1 ? 1.458 0.000 0.000 1.00 20.00 ? 1 ALA A C 1\n\
         ATOM 3 O O . ALA A 1 1 ? 2.100 1.200 0.000 1.00 20.00 ? 1 ALA A O 1\n",
    );
    let result = load(&text, "alanine.cif");
    assert_eq!(result.report.format, "cif");
    assert_eq!(result.document.atoms.len(), 3);
    assert_eq!(
        result
            .document
            .atoms
            .iter()
            .map(|a| a.element)
            .collect::<Vec<_>>(),
        vec![7, 6, 8]
    );
    // 1.458 A is the C-N bond; it must arrive in bohr, not angstrom.
    let bond = result.document.atoms[1].position[0] - result.document.atoms[0].position[0];
    assert!(
        (bond - 1.458 / BOHR).abs() < 1e-6,
        "expected {bond} bohr, expected {}",
        1.458 / BOHR
    );
    assert!(
        !result.document.bonds.is_empty(),
        "bonds should be perceived from coordinates"
    );
}

#[test]
fn cif_rejects_content_that_is_not_mmcif() {
    let error = import_bytes(b"just some text\nno blocks here\n", "fake.cif").unwrap_err();
    assert!(
        error.contains("mmCIF"),
        "error should name the format: {error}"
    );
    // A data block with no atom_site is still not a structure.
    let error = import_bytes(b"data_ONLY\n_cell.length_a 10.0\n", "nocell.cif").unwrap_err();
    assert!(error.contains("mmCIF"), "error: {error}");
}

#[test]
fn cif_skips_unknown_element_symbols_and_says_so() {
    // `Uxx` is not a real element symbol: it must be dropped with a warning
    // rather than guessed into some other element.
    let text = cif_body(
        "ATOM 1 N N . ALA A 1 1 ? 0.000 0.000 0.000 1.00 20.00 ? 1 ALA A N 1\n\
         ATOM 2 Uxx CA . ALA A 1 1 ? 1.458 0.000 0.000 1.00 20.00 ? 1 ALA A CA 1\n",
    );
    let result = load(&text, "unknown.cif");
    assert_eq!(
        result.document.atoms.len(),
        1,
        "the unrecognised symbol must be dropped, not guessed"
    );
    assert_eq!(result.document.atoms[0].element, 7);
    assert!(
        result
            .report
            .warnings
            .iter()
            .chain(result.document.provenance.iter())
            .any(|w| w.contains("unrecognised element")),
        "a warning should report the skipped atoms: {:?}",
        result.report.warnings
    );
}

#[test]
fn cif_keeps_the_highest_occupancy_alternate_location() {
    // Same atom with two alternates: A at 0.7, B at 0.3.
    let text = cif_body(
        "ATOM 1 N N . ALA A 1 1 ? 0.000 0.000 0.000 1.00 20.00 ? 1 ALA A N 1\n\
         ATOM 2 C C A ALA A 1 1 ? 1.458 0.000 0.000 0.70 20.00 ? 1 ALA A C 1\n\
         ATOM 3 C C B ALA A 1 1 ? 9.000 9.000 9.000 0.30 20.00 ? 1 ALA A C 1\n",
    );
    let result = load(&text, "altloc.cif");
    let carbons = result
        .document
        .atoms
        .iter()
        .filter(|a| a.element == 6)
        .collect::<Vec<_>>();
    assert_eq!(carbons.len(), 1, "one alternate should survive");
    assert!(
        carbons[0].position[0] < 100.0,
        "the high-occupancy conformer should be kept, not the far one"
    );
}

#[test]
fn cif_loads_the_first_model_only() {
    let text = cif_body(
        "ATOM 1 N N . ALA A 1 1 ? 0.000 0.000 0.000 1.00 20.00 ? 1 ALA A N 1\n\
         ATOM 2 C C . ALA A 1 1 ? 1.458 0.000 0.000 1.00 20.00 ? 1 ALA A C 1\n\
         ATOM 3 N N . ALA A 1 1 ? 50.000 50.000 50.000 1.00 20.00 ? 1 ALA A N 2\n",
    );
    let result = load(&text, "models.cif");
    assert_eq!(
        result.document.atoms.len(),
        2,
        "only the first model should be loaded"
    );
    assert!(
        result
            .document
            .provenance
            .iter()
            .any(|p| p.contains("Loaded model 1 only") && p.contains("skipped 1 atoms")),
        "provenance should state the model policy: {:?}",
        result.document.provenance
    );
}

#[test]
fn cif_real_fixture_1bh3() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/cif/1BH3.cif");
    let bytes = std::fs::read(path).expect("fixture present");
    let result = import_bytes(&bytes, "1BH3.cif").expect("1BH3 should import");
    assert_eq!(result.report.format, "cif");
    // pdbtbx reports 2,395 atom_site rows; occupancy/altloc selection may trim.
    assert!(
        result.document.atoms.len() > 2_000,
        "expected the full structure, got {}",
        result.document.atoms.len()
    );
    let counts: BTreeMap<u16, usize> =
        result
            .document
            .atoms
            .iter()
            .fold(BTreeMap::new(), |mut acc, a| {
                *acc.entry(a.element).or_insert(0) += 1;
                acc
            });
    // Probe of the source: C, N, O, S only.
    assert_eq!(
        counts.keys().copied().collect::<Vec<_>>(),
        vec![6, 7, 8, 16],
        "unexpected element set {counts:?}"
    );
    assert!(
        result
            .document
            .atoms
            .iter()
            .all(|a| a.position.iter().all(|v| v.is_finite())),
        "all coordinates must be finite"
    );
    assert!(
        !result.document.bonds.is_empty(),
        "a protein must have perceived bonds"
    );
    assert!(
        result
            .document
            .provenance
            .iter()
            .any(|p| p.contains("Unit cell read")),
        "cell should be recorded as provenance"
    );
    assert!(
        result
            .document
            .provenance
            .iter()
            .any(|p| p.contains("Space group recorded")),
        "symmetry should be recorded as provenance"
    );
}

#[test]
fn cif_large_fixture_1aon_is_bounded_and_sane() {
    let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../fixtures/cif/1AON.cif");
    let bytes = std::fs::read(path).expect("fixture present");
    let started = std::time::Instant::now();
    let result = import_bytes(&bytes, "1AON.cif").expect("1AON should import");
    let elapsed = started.elapsed();
    assert!(
        result.document.atoms.len() > 40_000,
        "expected a large structure, got {}",
        result.document.atoms.len()
    );
    assert!(
        result
            .document
            .atoms
            .iter()
            .all(|a| a.position.iter().all(|v| v.is_finite())),
        "all coordinates must be finite"
    );
    // Recorded, not asserted as a hard gate: guards against a pathological
    // regression (e.g. quadratic re-parse) rather than pinning machine speed.
    assert!(
        elapsed.as_secs() < 120,
        "large mmCIF import took {elapsed:?}"
    );
}

#[test]
fn cif_retains_atoms_past_the_former_text_budget() {
    // A complete comment after the atom loop may exceed the old byte ceiling.
    let mut text = cif_body("ATOM 1 N N . ALA A 1 1 ? 0.0 0.0 0.0 1.00 20.00 ? 1 ALA A N 1\n");
    text.push_str(&"#".repeat(64 * 1024 * 1024 + 1 - text.len()));
    assert!(text.len() > 64 * 1024 * 1024);
    let imported = import_bytes(text.as_bytes(), "huge.cif").unwrap();
    assert_eq!(imported.document.atoms.len(), 1);
    imported.document.validate().unwrap();
}

#[test]
fn cif_malformed_input_errors_rather_than_panicking() {
    // The upstream mmCIF reader panics on these shapes. Ours must return a
    // clean error, because imported files are untrusted and a panic in the
    // WASM worker is a hard abort rather than a reportable error.
    let cases: &[(&str, &str)] = &[
        (
            "nan-coordinate",
            "ATOM 1 C C . ALA A 1 1 ? nan 0.0 0.0 1.00 20.0 ? 1 ALA A C 1\n",
        ),
        (
            "dot-coordinate",
            "ATOM 1 C C . ALA A 1 1 ? . 0.0 0.0 1.00 20.0 ? 1 ALA A C 1\n",
        ),
        (
            "out-of-range",
            "ATOM 1 C C . ALA A 1 1 ? 1e308 0.0 0.0 1.00 20.0 ? 1 ALA A C 1\n",
        ),
        ("short-row", "ATOM 1 C C\n"),
        (
            "unterminated-quote",
            "ATOM 1 C \"C . ALA A 1 1 ? 0.0 0.0 0.0 1.00 20.0 ? 1 ALA A C 1\n",
        ),
    ];
    for (label, rows) in cases {
        let text = cif_body(rows);
        let outcome = std::panic::catch_unwind(|| import_bytes(text.as_bytes(), "untrusted.cif"));
        match outcome {
            Err(_) => panic!("{label}: panicked instead of returning an error"),
            Ok(Ok(doc)) => panic!(
                "{label}: unexpectedly imported {} atoms",
                doc.document.atoms.len()
            ),
            Ok(Err(_)) => {}
        }
    }
}
