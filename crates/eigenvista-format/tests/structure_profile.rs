use eigenvista_core::{
    ComponentKind, SecondaryStructure, StructureChain, StructureMetadata, StructureResidue,
    compute, fixtures,
};
use eigenvista_format::{decode, encode};
use serde_json::{Value, json};
use std::collections::BTreeMap;
use std::io::{Cursor, Read, Write};
use zip::{ZipArchive, ZipWriter, write::SimpleFileOptions};

fn entries(bytes: &[u8]) -> BTreeMap<String, Vec<u8>> {
    let mut zip = ZipArchive::new(Cursor::new(bytes)).unwrap();
    (0..zip.len())
        .map(|i| {
            let mut file = zip.by_index(i).unwrap();
            let mut bytes = vec![];
            file.read_to_end(&mut bytes).unwrap();
            (file.name().into(), bytes)
        })
        .collect()
}

fn manifest(bytes: &[u8]) -> Value {
    serde_json::from_slice(&entries(bytes)["manifest.json"]).unwrap()
}

fn mutate(bytes: &[u8], f: impl FnOnce(&mut Value)) -> Vec<u8> {
    let mut entries = entries(bytes);
    let mut value: Value = serde_json::from_slice(&entries["manifest.json"]).unwrap();
    f(&mut value);
    entries.insert("manifest.json".into(), serde_json::to_vec(&value).unwrap());
    let mut zip = ZipWriter::new(Cursor::new(vec![]));
    for (name, bytes) in entries {
        zip.start_file(name, SimpleFileOptions::default()).unwrap();
        zip.write_all(&bytes).unwrap();
    }
    zip.finish().unwrap().into_inner()
}

fn metadata() -> StructureMetadata {
    StructureMetadata {
        chains: vec![StructureChain {
            label_id: Some("A".into()),
            author_id: Some("X".into()),
            entity_id: Some("1".into()),
        }],
        residues: vec![StructureResidue {
            chain: 0,
            name: "GLY".into(),
            label_seq_id: Some(1),
            author_seq_id: Some("-1".into()),
            insertion_code: None,
            segment: 0,
            kind: ComponentKind::Protein,
            secondary: SecondaryStructure::Unknown,
        }],
        atom_names: vec!["H1".into(), "H2".into()],
        atom_residues: vec![0, 0],
        secondary_source: "none".into(),
    }
}

#[test]
fn absent_metadata_keeps_existing_profile_and_frozen_logical_encoding() {
    let old = include_bytes!("../../../fixtures/native/water-rhf-0.5.12.eigenvista");
    let doc = decode(old).unwrap();
    assert!(doc.structure.is_none());
    let rewritten = encode(&doc).unwrap();
    assert_eq!(entries(old), entries(&rewritten));
    let value = manifest(&rewritten);
    assert_eq!(
        value["required_features"],
        json!(["eigenvista-preview-polynomial-v1"])
    );
    assert!(value["document"].get("structure").is_none());
    assert!(
        serde_json::to_value(doc)
            .unwrap()
            .get("structure")
            .is_none()
    );
}

#[test]
fn biological_profile_roundtrips_all_identity_without_field_hash_changes() {
    let mut doc = fixtures::hydrogen_pair();
    let hash = compute::source_hash(&doc, "bonding").unwrap();
    let grid = compute::sample(&doc, "bonding", 12).unwrap();
    doc.structure = Some(metadata());
    doc.view.representation = "cartoon".into();
    let bytes = encode(&doc).unwrap();
    assert_eq!(
        manifest(&bytes)["required_features"],
        json!([
            "eigenvista-preview-polynomial-v1",
            "eigenvista-biological-structure-v1"
        ])
    );
    assert_eq!(decode(&bytes).unwrap(), doc);
    assert_eq!(compute::source_hash(&doc, "bonding").unwrap(), hash);
    assert_eq!(compute::sample(&doc, "bonding", 12).unwrap(), grid);
    assert_eq!(
        manifest(&bytes)["document"]["atoms"]
            .as_object()
            .unwrap()
            .len(),
        2
    );
}

#[test]
fn required_biological_feature_and_payload_must_agree_in_both_directions() {
    let mut doc = fixtures::hydrogen_pair();
    doc.structure = Some(metadata());
    let bytes = encode(&doc).unwrap();
    let cases: [fn(&mut Value); 7] = [
        |m| m["required_features"] = json!(["eigenvista-preview-polynomial-v1"]),
        |m| m["required_features"] = json!(["eigenvista-biological-structure-v1"]),
        |m| {
            m["required_features"] = json!([
                "eigenvista-preview-polynomial-v1",
                "eigenvista-biological-structure-v1",
                "unknown"
            ])
        },
        |m| m["document"]["structure"] = Value::Null,
        |m| {
            m["document"].as_object_mut().unwrap().remove("structure");
        },
        |m| {
            m["format"] = json!("molekel");
            m["required_features"] = json!([
                "molekel-preview-polynomial-v1",
                "eigenvista-biological-structure-v1"
            ]);
        },
        |m| m["document"]["structure"]["arbitrary_extension"] = json!(true),
    ];
    for change in cases {
        assert!(decode(&mutate(&bytes, change)).is_err());
    }
    let absent = encode(&fixtures::hydrogen_pair()).unwrap();
    assert!(
        decode(&mutate(&absent, |m| m["required_features"] = json!([
            "eigenvista-preview-polynomial-v1",
            "eigenvista-biological-structure-v1"
        ])))
        .is_err()
    );
}

#[test]
fn metadata_above_the_former_text_limit_roundtrips() {
    let mut doc = fixtures::hydrogen_pair();
    let mut s = metadata();
    s.atom_names[1] = "X".repeat(129);
    doc.structure = Some(s);
    eigenvista_format::validate_document(&doc).unwrap();
    assert_eq!(decode(&encode(&doc).unwrap()).unwrap(), doc);
}

#[test]
fn biological_native_profile_retains_both_microheterogeneous_monomers() {
    let source = include_str!("../../../app/tests/fixtures/structure-controls/microhet.cif");
    let doc = eigenvista_core::import::cif(source, "microhet.cif").unwrap();
    assert_eq!(doc.atoms.len(), 20);
    assert_eq!(doc.structure.as_ref().unwrap().residues.len(), 5);
    let bytes = encode(&doc).unwrap();
    let restored = decode(&bytes).unwrap();
    assert_eq!(restored, doc);
    let metadata = restored.structure.unwrap();
    assert_eq!(
        (
            metadata.residues[1].name.as_str(),
            metadata.residues[2].name.as_str()
        ),
        ("SER", "CYS")
    );
    assert_eq!(metadata.residues[1].label_seq_id, Some(2));
    assert_eq!(metadata.residues[2].label_seq_id, Some(2));
    assert_eq!(&metadata.atom_residues[4..12], &[1, 1, 1, 1, 2, 2, 2, 2]);
    assert_eq!(
        manifest(&bytes)["required_features"],
        json!([
            "eigenvista-preview-polynomial-v1",
            "eigenvista-biological-structure-v1"
        ])
    );
}
