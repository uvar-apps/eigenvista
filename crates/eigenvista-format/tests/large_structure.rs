//! Large-structure regression against a real deposited PDB entry.
//!
//! 4PJ1 is a 66k-atom chaperonin complex from the RCSB PDB. Before 0.5.3 it
//! broke two independent things: per-atom geometry and material made rendering
//! impossible, and the format refused to save it because each atom's nested
//! `position` array took its own ZIP entry. These tests pin the import counts,
//! the columnar encoding, the manifest staying small, and exact decode fidelity.
//!
//! The fixture is read from disk rather than `include_str!` so the test binary is
//! not inflated by 5.6 MB.

use eigenvista_core::import::pdb;
use eigenvista_format::{decode, encode};
use serde_json::Value;
use sha2::{Digest, Sha256};
use std::io::Read;
use zip::ZipArchive;

fn fixture_path() -> std::path::PathBuf {
    std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/large-structure/4PJ1.pdb")
}

fn fixture_bytes() -> Vec<u8> {
    std::fs::read(fixture_path()).expect("read fixtures/large-structure/4PJ1.pdb")
}

fn manifest_entry(bytes: &[u8]) -> Vec<u8> {
    let mut zip = ZipArchive::new(std::io::Cursor::new(bytes)).unwrap();
    let mut buf = vec![];
    zip.by_name("manifest.json")
        .expect("manifest.json")
        .read_to_end(&mut buf)
        .unwrap();
    buf
}

fn manifest_json(bytes: &[u8]) -> Value {
    serde_json::from_slice(&manifest_entry(bytes)).unwrap()
}

#[test]
fn fixture_checksum_matches_its_manifest() {
    // Guards the input itself: a silently edited fixture would make every
    // assertion below pass against the wrong molecule.
    let manifest_raw = std::fs::read(
        std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../fixtures/large-structure/manifest.json"),
    )
    .unwrap();
    let manifest: Value = serde_json::from_slice(&manifest_raw).unwrap();
    let entry = &manifest["fixtures"][0];
    let bytes = fixture_bytes();

    let mut hasher = Sha256::new();
    hasher.update(&bytes);
    let digest = format!("{:x}", hasher.finalize());

    assert_eq!(digest, entry["sha256"].as_str().unwrap(), "fixture drifted");
    assert_eq!(bytes.len(), entry["bytes"].as_u64().unwrap() as usize);
}

#[test]
fn large_structure_imports_the_expected_counts() {
    let text = String::from_utf8(fixture_bytes()).unwrap();
    let doc = pdb(&text, "4PJ1.pdb").unwrap();
    assert_eq!(doc.atoms.len(), 65_963);
    assert_eq!(doc.bonds.len(), 66_610);
    doc.validate().unwrap();
}

#[test]
fn large_structure_encodes_the_atom_collection_as_two_columns() {
    let text = String::from_utf8(fixture_bytes()).unwrap();
    let doc = pdb(&text, "4PJ1.pdb").unwrap();
    let bytes = encode(&doc).unwrap();

    let atoms = manifest_json(&bytes)["document"]["atoms"].clone();
    assert_eq!(
        atoms
            .as_object()
            .map(|m| m.keys().cloned().collect::<Vec<_>>()),
        Some(vec!["elements".to_owned(), "positions".to_owned()]),
        "atoms must be two references, not one record per atom"
    );

    let mut shapes: Vec<Vec<usize>> = manifest_json(&bytes)["arrays"]
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
    // elements + positions for the atoms, plus the bonds array. Three entries for
    // 65,963 atoms and 66,610 bonds; the row-wise form needed one per atom.
    assert_eq!(shapes, vec![vec![65_963], vec![65_963, 3], vec![66_610, 2]]);
}

#[test]
fn manifest_does_not_grow_with_atom_count() {
    // The row-wise form needed roughly 56 bytes per atom record, which put a
    // 66k-atom manifest near 3.7 MiB. The columnar form must stay small.
    let text = String::from_utf8(fixture_bytes()).unwrap();
    let doc = pdb(&text, "4PJ1.pdb").unwrap();
    let bytes = encode(&doc).unwrap();
    let len = manifest_entry(&bytes).len();
    assert!(
        len < 8 * 1024,
        "manifest grew to {len} bytes for {} atoms; it should be constant-shaped",
        doc.atoms.len()
    );
}

#[test]
fn large_structure_round_trips_exactly() {
    let text = String::from_utf8(fixture_bytes()).unwrap();
    let doc = pdb(&text, "4PJ1.pdb").unwrap();
    let restored = decode(&encode(&doc).unwrap()).unwrap();
    assert_eq!(restored, doc);
    assert_eq!(restored.atoms.len(), 65_963);
    assert_eq!(restored.bonds.len(), 66_610);
    for (a, b) in doc.atoms.iter().zip(&restored.atoms) {
        assert_eq!(a.element, b.element);
        assert_eq!(a.position, b.position);
    }
}
