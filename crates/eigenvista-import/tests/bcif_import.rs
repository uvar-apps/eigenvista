//! Public BinaryCIF import contracts against independently supplied text twins.

use eigenvista_core::{BOHR_TO_ANGSTROM, Document};
use eigenvista_import::import_bytes;
use flate2::{Compression, write::GzEncoder};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, io::Write};

const BINARY: &[u8] = include_bytes!("../../../fixtures/bcif/1crn.bcif");
const TEXT: &[u8] = include_bytes!("../../../fixtures/bcif/1crn.cif");
// Independent source-row mapping, not derived from the application importer.
const DISULFIDES: [[usize; 2]; 3] = [[19, 281], [25, 228], [115, 187]];

fn connections(document: &Document) -> Vec<Value> {
    document
        .provenance
        .iter()
        .filter_map(|line| line.strip_prefix("mmCIF struct_conn: "))
        .map(|json| serde_json::from_str(json).unwrap())
        .collect()
}

fn assert_source(document: &Document, bytes: &[u8], name: &str) {
    let expected = format!(
        "Import source: {name}; SHA-256 {:x};",
        Sha256::digest(bytes)
    );
    assert!(
        document
            .provenance
            .iter()
            .any(|line| line.starts_with(&expected)),
        "the original input bytes, including compression, must be identified"
    );
}

#[test]
fn real_binarycif_matches_text_twin_geometry_elements_and_declared_disulfides() {
    let binary = import_bytes(BINARY, "1crn.bcif").expect("official BinaryCIF imports");
    let text = import_bytes(TEXT, "1crn.cif").expect("official text twin imports");
    assert_eq!(binary.report.format, "bcif");
    assert!(binary.report.requires_save);
    assert_eq!(binary.document.atoms.len(), 327);
    assert_eq!(binary.document.atoms.len(), text.document.atoms.len());
    let counts = binary
        .document
        .atoms
        .iter()
        .fold(BTreeMap::new(), |mut counts, atom| {
            *counts.entry(atom.element).or_insert(0usize) += 1;
            counts
        });
    assert_eq!(
        counts,
        BTreeMap::from([(6, 202), (7, 55), (8, 64), (16, 6)])
    );
    for (binary, text) in binary.document.atoms.iter().zip(&text.document.atoms) {
        assert_eq!(binary.element, text.element);
        for axis in 0..3 {
            // The official BinaryCIF uses Float64 bytes for the deposited
            // three-decimal-angstrom values; only representation noise is allowed.
            assert!((binary.position[axis] - text.position[axis]).abs() * BOHR_TO_ANGSTROM < 1e-9);
        }
    }
    assert_eq!(binary.document.bonds, text.document.bonds);
    let records = connections(&binary.document);
    assert_eq!(records.len(), 3);
    for (i, pair) in DISULFIDES.iter().enumerate() {
        let id = format!("disulf{}", i + 1);
        let record = records
            .iter()
            .find(|record| record["source"]["id"] == id)
            .unwrap();
        assert_eq!(record["source"]["conn_type_id"], "disulf");
        assert_eq!(record["status"], "retained");
        assert_eq!(record["bond"], serde_json::json!(pair));
        assert!(binary.document.bonds.contains(pair));
        for &atom in pair {
            assert_eq!(binary.document.atoms[atom].element, 16);
        }
    }
    assert!(binary.document.basis.is_empty());
    assert!(binary.document.orbitals.is_empty());
    assert!(binary.document.densities.is_empty());
    assert!(binary.document.grids.is_empty());
    assert_source(&binary.document, BINARY, "1crn.bcif");
}

#[test]
fn content_sniffing_and_gzip_retain_original_source_digests_and_native_data() {
    let raw =
        import_bytes(BINARY, "download.payload").expect("content detection without extension");
    assert_eq!(raw.report.format, "bcif");
    assert_source(&raw.document, BINARY, "download.payload");
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(BINARY).unwrap();
    let compressed = encoder.finish().unwrap();
    for name in ["1crn.bcif.gz", "wrapped.payload"] {
        let wrapped = import_bytes(&compressed, name).expect("gzip magic detection");
        assert_eq!(wrapped.report.format, "bcif");
        assert_eq!(wrapped.document.atoms, raw.document.atoms);
        assert_eq!(wrapped.document.bonds, raw.document.bonds);
        assert_eq!(connections(&wrapped.document), connections(&raw.document));
        assert_source(&wrapped.document, &compressed, name);
        let bytes = eigenvista_format::encode(&wrapped.document).expect("native encode");
        let restored = eigenvista_format::decode(&bytes).expect("native decode");
        assert_eq!(restored, wrapped.document);
        let reopened = import_bytes(&bytes, "saved.eigenvista").expect("native open");
        assert!(!reopened.report.requires_save);
        assert_eq!(reopened.document, wrapped.document);
    }
}

#[test]
fn truncated_invalid_and_trailing_binary_payloads_return_errors_without_panicking() {
    for length in [0, 1, 2, 7, 64, BINARY.len() / 2, BINARY.len() - 1] {
        let result = std::panic::catch_unwind(|| import_bytes(&BINARY[..length], "truncated.bcif"));
        assert!(
            matches!(result, Ok(Err(_))),
            "truncation at {length} must report an error"
        );
    }
    let mut trailing = BINARY.to_vec();
    trailing.push(0xc1); // Reserved MessagePack marker after a complete container.
    let mut invalid = BINARY.to_vec();
    invalid[0] = 0xc1;
    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(BINARY).unwrap();
    let mut bad_crc = encoder.finish().unwrap();
    let crc = bad_crc.len() - 8;
    bad_crc[crc] ^= 0x80;
    for bytes in [&trailing, &invalid, &bad_crc] {
        let result = std::panic::catch_unwind(|| import_bytes(bytes, "malformed.bcif"));
        assert!(
            matches!(result, Ok(Err(_))),
            "malformed data must report an error"
        );
    }
}

#[test]
fn independently_encoded_masks_and_compressed_columns_share_text_selection_policy() {
    // Encoded offline by official Molstar from the text twin, not by this decoder.
    let binary = import_bytes(
        include_bytes!("../../../fixtures/bcif/policy.bcif"),
        "policy.bcif",
    )
    .unwrap();
    let text = import_bytes(
        include_bytes!("../../../fixtures/bcif/policy.cif"),
        "policy.cif",
    )
    .unwrap();
    assert_eq!(binary.report.format, "bcif");
    assert_eq!(binary.document.atoms, text.document.atoms);
    assert_eq!(binary.document.bonds, vec![[0, 1]]);
    assert_eq!(binary.document.bonds, text.document.bonds);
    assert_eq!(
        binary
            .document
            .atoms
            .iter()
            .map(|atom| atom.element)
            .collect::<Vec<_>>(),
        [6, 7, 16, 8]
    );
    for (atom, angstrom) in binary.document.atoms.iter().zip([
        [0., 0.125, 0.],
        [10., 1.25, 0.],
        [20., 2.5, 0.],
        [30., 3.75, 0.],
    ]) {
        for (actual, expected) in atom.position.iter().zip(angstrom) {
            assert!((actual * BOHR_TO_ANGSTROM - expected).abs() < 1e-12);
        }
    }
    for warning in text.report.warnings {
        assert!(
            binary.report.warnings.contains(&warning),
            "shared selection warning missing: {warning}"
        );
    }
    assert!(
        binary
            .report
            .warnings
            .iter()
            .any(|warning| warning.contains("unrecognised element"))
    );
    assert!(
        binary
            .document
            .provenance
            .iter()
            .any(|line| line.contains("Loaded model 1 only") && line.contains("skipped 1 atoms"))
    );
    let records = connections(&binary.document);
    assert_eq!(records.len(), 2);
    let retained = records
        .iter()
        .find(|record| record["source"]["id"] == "selected_B")
        .unwrap();
    assert_eq!(retained["status"], "retained");
    assert_eq!(retained["bond"], serde_json::json!([0, 1]));
    assert_eq!(
        retained["selected_atom_site_ids"],
        serde_json::json!(["1", "3"])
    );
    assert_eq!(retained["source"]["pdbx_value_order"], "SING");
    let omitted = records
        .iter()
        .find(|record| record["source"]["id"] == "omitted_A")
        .unwrap();
    assert_eq!(omitted["status"], "unresolved");
    assert_eq!(omitted["source"]["pdbx_ptnr2_label_alt_id"], "A");
    assert_eq!(omitted["source"]["pdbx_value_order"], "?");
    assert!(
        omitted.get("bond").is_none(),
        "discarded alternate must not be retargeted"
    );
}
