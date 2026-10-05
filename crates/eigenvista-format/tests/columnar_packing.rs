//! Columnar packing: a row-wise collection whose rows share a numeric shape is
//! stored as one column blob instead of one ZIP entry per row. These tests pin the
//! entry-count win, the round-trip fidelity, and the validation of the new
//! `{array, index}` column reference.

use eigenvista_core::{Atom, Document};
use eigenvista_format::{decode, encode};
use serde_json::{Value, json};
use std::io::{Cursor, Read, Write};
use zip::{CompressionMethod, ZipArchive, ZipWriter, write::SimpleFileOptions};

fn atoms_doc(count: usize) -> Document {
    let mut doc = Document::empty("columnar packing");
    doc.id = "columnar-test-v1".into();
    doc.atoms = (0..count)
        .map(|i| Atom {
            element: (i % 90 + 1) as u16,
            position: [i as f64 * 1.3, i as f64 * -0.7, i as f64 * 2.1],
        })
        .collect();
    doc.validate().unwrap();
    doc
}

fn entries(bytes: &[u8]) -> Vec<(String, Vec<u8>)> {
    let mut zip = ZipArchive::new(Cursor::new(bytes)).unwrap();
    (0..zip.len())
        .map(|i| {
            let mut file = zip.by_index(i).unwrap();
            let name = file.name().to_owned();
            let mut buf = vec![];
            file.read_to_end(&mut buf).unwrap();
            (name, buf)
        })
        .collect()
}

fn array_entries(bytes: &[u8]) -> Vec<String> {
    entries(bytes)
        .into_iter()
        .filter(|(name, _)| name.starts_with("arrays/"))
        .map(|(name, _)| name)
        .collect()
}

fn manifest(bytes: &[u8]) -> Value {
    let raw = entries(bytes)
        .into_iter()
        .find(|(name, _)| name == "manifest.json")
        .map(|(_, data)| data)
        .expect("manifest.json");
    serde_json::from_slice(&raw).unwrap()
}

/// Rebuild the archive with a replaced manifest, leaving array blobs untouched so
/// their digest checks still pass and execution reaches `unpack`.
fn with_manifest(bytes: &[u8], replacement: Value) -> Vec<u8> {
    let mut writer = ZipWriter::new(Cursor::new(vec![]));
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    for (name, data) in entries(bytes) {
        if name == "manifest.json" {
            writer.start_file(name, options).unwrap();
            writer
                .write_all(&serde_json::to_vec(&replacement).unwrap())
                .unwrap();
        } else {
            writer.start_file(name, options).unwrap();
            writer.write_all(&data).unwrap();
        }
    }
    writer.finish().unwrap().into_inner()
}

#[test]
fn position_columns_coalesce_to_one_entry_regardless_of_atom_count() {
    let small = encode(&atoms_doc(4)).unwrap();
    let large = encode(&atoms_doc(5000)).unwrap();
    assert_eq!(
        array_entries(&small).len(),
        1,
        "{:?}",
        array_entries(&small)
    );
    assert_eq!(
        array_entries(&large).len(),
        1,
        "{:?}",
        array_entries(&large)
    );
    // The manifest describes one [rows, 3] column rather than one record per row.
    let shapes: Vec<Vec<usize>> = manifest(&large)
        .get("arrays")
        .and_then(|a| a.as_object())
        .map(|m| {
            m.values()
                .map(|v| {
                    v["shape"]
                        .as_array()
                        .unwrap()
                        .iter()
                        .map(|s| s.as_u64().unwrap() as usize)
                        .collect()
                })
                .collect()
        })
        .unwrap();
    assert_eq!(shapes, vec![vec![5000, 3]]);
}

#[test]
fn coalesced_document_round_trips_exactly_at_scale() {
    for count in [1usize, 2, 3, 64, 10_000] {
        let doc = atoms_doc(count);
        let restored = decode(&encode(&doc).unwrap()).unwrap();
        assert_eq!(restored, doc, "{count} atoms");
        assert_eq!(restored.atoms.len(), count);
        for (a, b) in doc.atoms.iter().zip(&restored.atoms) {
            assert_eq!(a.element, b.element);
            assert_eq!(a.position, b.position);
        }
    }
}

#[test]
fn rows_without_a_uniform_shape_are_not_coalesced_and_stay_correct() {
    // Varying-length numeric arrays must fall back to per-row entries rather than
    // being forced into a column that would corrupt them.
    let mut doc = atoms_doc(3);
    doc.basis = vec![
        eigenvista_core::BasisFunction {
            center: [0., 0., 0.],
            exponents: vec![1.0],
            coefficients: vec![0.5],
            terms: vec![eigenvista_core::Term {
                powers: [0, 0, 0],
                weight: 1.0,
            }],
        },
        eigenvista_core::BasisFunction {
            center: [1., 0., 0.],
            exponents: vec![1.0, 2.5, 4.0],
            coefficients: vec![0.25, 0.5, 0.75],
            terms: vec![
                eigenvista_core::Term {
                    powers: [1, 0, 0],
                    weight: 1.0,
                },
                eigenvista_core::Term {
                    powers: [0, 1, 0],
                    weight: -1.0,
                },
            ],
        },
    ];
    doc.validate().unwrap();
    let bytes = encode(&doc).unwrap();
    assert!(
        array_entries(&bytes).len() > 1,
        "non-uniform rows should not collapse into one column"
    );
    assert_eq!(decode(&bytes).unwrap(), doc);
}

#[test]
fn column_index_out_of_range_is_rejected() {
    let bytes = encode(&atoms_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["atoms"][0]["position"]["$index"] = json!(99);
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(
        err.contains("Column index out of range"),
        "expected a bounds rejection, got: {err}"
    );
}

#[test]
fn column_reference_with_extra_or_missing_keys_is_rejected() {
    let bytes = encode(&atoms_doc(3)).unwrap();

    let mut extra = manifest(&bytes);
    extra["document"]["atoms"][1]["position"]["$extra"] = json!(0);
    let err = decode(&with_manifest(&bytes, extra)).unwrap_err();
    assert!(err.contains("Malformed column reference"), "got: {err}");

    let mut missing = manifest(&bytes);
    missing["document"]["atoms"][1]["position"]
        .as_object_mut()
        .unwrap()
        .remove("$array");
    let err = decode(&with_manifest(&bytes, missing)).unwrap_err();
    assert!(
        !err.is_empty(),
        "a reference missing $array must not decode"
    );
}

#[test]
fn non_integer_column_index_is_rejected() {
    let bytes = encode(&atoms_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["atoms"][2]["position"]["$index"] = json!("2");
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(err.contains("Invalid column index"), "got: {err}");
}

#[test]
fn unknown_column_id_is_rejected() {
    let bytes = encode(&atoms_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["atoms"][1]["position"]["$array"] = json!("zzz");
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(err.contains("Unknown"), "got: {err}");
}
