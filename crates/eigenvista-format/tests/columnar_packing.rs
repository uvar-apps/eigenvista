//! Columnar packing and the atom column representation.
//!
//! Covers three things: the atom collection serializes to two numeric columns so
//! the manifest stops growing with atom count; uniform numeric arrays elsewhere
//! (basis centers, orbital coefficients) coalesce into one entry with
//! `{ "$array": id, "$index": k }` row pointers; and the new reference form is
//! validated on decode. The manifest carries no digest of its own, so these
//! decode-side checks are the boundary.

use eigenvista_core::{Atom, BasisFunction, Document, Term};
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

/// A document whose rows keep per-row column references, so the `{array, index}`
/// tamper surface is reachable.
fn basis_doc(functions: usize) -> Document {
    let mut doc = atoms_doc(functions);
    doc.basis = (0..functions)
        .map(|i| BasisFunction {
            center: [i as f64, 0., 0.],
            exponents: vec![1.0 + i as f64],
            coefficients: vec![0.5],
            terms: vec![Term {
                powers: [i as u32, 0, 0],
                weight: 1.0,
            }],
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
        let is_manifest = name == "manifest.json";
        writer.start_file(name, options).unwrap();
        if is_manifest {
            writer
                .write_all(&serde_json::to_vec(&replacement).unwrap())
                .unwrap();
        } else {
            writer.write_all(&data).unwrap();
        }
    }
    writer.finish().unwrap().into_inner()
}

#[test]
fn atom_columns_keep_the_manifest_independent_of_atom_count() {
    let small = encode(&atoms_doc(4)).unwrap();
    let large = encode(&atoms_doc(5000)).unwrap();

    let small_atoms = manifest(&small)["document"]["atoms"].clone();
    let large_atoms = manifest(&large)["document"]["atoms"].clone();

    // Two references and nothing else, so the manifest cannot grow with atoms.
    assert_eq!(
        small_atoms
            .as_object()
            .map(|m| m.keys().cloned().collect::<Vec<_>>()),
        Some(vec!["elements".to_owned(), "positions".to_owned()])
    );
    assert_eq!(
        serde_json::to_string(&small_atoms).unwrap().len(),
        serde_json::to_string(&large_atoms).unwrap().len(),
        "manifest atom representation must not scale with atom count"
    );

    // The columns themselves are single entries at both sizes.
    assert_eq!(
        array_entries(&small).len(),
        2,
        "{:?}",
        array_entries(&small)
    );
    assert_eq!(
        array_entries(&large).len(),
        2,
        "{:?}",
        array_entries(&large)
    );

    let mut shapes: Vec<Vec<usize>> = manifest(&large)["arrays"]
        .as_object()
        .unwrap()
        .values()
        .map(|v| {
            v["shape"]
                .as_array()
                .unwrap()
                .iter()
                .map(|s| s.as_u64().unwrap() as usize)
                .collect()
        })
        .collect();
    shapes.sort();
    assert_eq!(shapes, vec![vec![5000], vec![5000, 3]]);
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
fn row_wise_atom_arrays_still_deserialize() {
    // Older documents and JSON fixtures carry atoms as [{element, position}, …].
    // The visitor dispatches on the JSON token, so both forms parse without
    // buffering the collection into an intermediate.
    let doc = atoms_doc(3);
    let columnar = serde_json::to_value(&doc).unwrap();
    assert!(
        columnar["atoms"].is_object(),
        "atoms must serialize columnar"
    );

    let elements = columnar["atoms"]["elements"].as_array().unwrap().clone();
    let positions = columnar["atoms"]["positions"].as_array().unwrap().clone();
    let mut legacy = columnar.clone();
    let rows: Vec<Value> = elements
        .iter()
        .zip(positions.iter())
        .map(|(e, p)| json!({ "element": e, "position": p }))
        .collect();
    legacy["atoms"] = Value::Array(rows);

    let restored: Document = serde_json::from_value(legacy).unwrap();
    assert_eq!(restored, doc);
}

#[test]
fn mismatched_atom_column_lengths_are_rejected() {
    let doc = atoms_doc(3);
    let mut json = serde_json::to_value(&doc).unwrap();
    json["atoms"]["elements"] = json!([6, 6]);
    let err = serde_json::from_value::<Document>(json)
        .unwrap_err()
        .to_string();
    assert!(
        err.contains("length mismatch"),
        "expected a length-mismatch rejection, got: {err}"
    );
}

#[test]
fn rows_without_a_uniform_shape_are_not_coalesced_and_stay_correct() {
    // Varying-length numeric arrays must fall back to per-row entries rather than
    // being forced into a column that would corrupt them.
    let mut doc = atoms_doc(3);
    doc.basis = vec![
        BasisFunction {
            center: [0., 0., 0.],
            exponents: vec![1.0],
            coefficients: vec![0.5],
            terms: vec![Term {
                powers: [0, 0, 0],
                weight: 1.0,
            }],
        },
        BasisFunction {
            center: [1., 0., 0.],
            exponents: vec![1.0, 2.5, 4.0],
            coefficients: vec![0.25, 0.5, 0.75],
            terms: vec![
                Term {
                    powers: [1, 0, 0],
                    weight: 1.0,
                },
                Term {
                    powers: [0, 1, 0],
                    weight: -1.0,
                },
            ],
        },
    ];
    doc.validate().unwrap();
    let bytes = encode(&doc).unwrap();
    assert!(
        array_entries(&bytes).len() > 2,
        "non-uniform rows should not collapse into one column"
    );
    assert_eq!(decode(&bytes).unwrap(), doc);
}

#[test]
fn column_index_out_of_range_is_rejected() {
    let bytes = encode(&basis_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["basis"][0]["center"]["$index"] = json!(99);
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(
        err.contains("Column index out of range"),
        "expected a bounds rejection, got: {err}"
    );
}

#[test]
fn column_reference_with_extra_key_is_rejected() {
    let bytes = encode(&basis_doc(3)).unwrap();
    let mut extra = manifest(&bytes);
    extra["document"]["basis"][1]["center"]["$extra"] = json!(0);
    let err = decode(&with_manifest(&bytes, extra)).unwrap_err();
    assert!(err.contains("Malformed column reference"), "got: {err}");
}

#[test]
fn non_integer_column_index_is_rejected() {
    let bytes = encode(&basis_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["basis"][2]["center"]["$index"] = json!("2");
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(err.contains("Invalid column index"), "got: {err}");
}

#[test]
fn unknown_column_id_is_rejected() {
    let bytes = encode(&basis_doc(3)).unwrap();
    let mut tampered = manifest(&bytes);
    tampered["document"]["basis"][1]["center"]["$array"] = json!("zzz");
    let err = decode(&with_manifest(&bytes, tampered)).unwrap_err();
    assert!(err.contains("Unknown"), "got: {err}");
}
