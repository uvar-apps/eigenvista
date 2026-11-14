use eigenvista_core::{ComponentKind, SecondaryStructure};
use eigenvista_import::import_bytes;

#[test]
fn deposited_crambin_text_binary_and_gzip_identity_and_annotation_parity() {
    let text = include_bytes!("../../../fixtures/bcif/1crn.cif");
    let binary = include_bytes!("../../../fixtures/bcif/1crn.bcif");
    let text = import_bytes(text, "1crn.cif").unwrap();
    let binary = import_bytes(binary, "1crn.bcif").unwrap();
    let a = text.document.structure.as_ref().unwrap();
    let b = binary.document.structure.as_ref().unwrap();
    assert_eq!(a, b);
    assert_eq!(a.atom_names.len(), 327);
    assert_eq!(&a.atom_names[..4], ["N", "CA", "C", "O"]);
    assert_eq!(a.residues.len(), 46);
    assert_eq!(a.chains.len(), 1);
    assert_eq!(a.chains[0].label_id.as_deref(), Some("A"));
    assert_eq!(a.chains[0].author_id.as_deref(), Some("A"));
    assert_eq!(a.chains[0].entity_id.as_deref(), Some("1"));
    assert!(a.residues.iter().all(|r| r.kind == ComponentKind::Protein));
    // Independently deposited ranges in the checked-in source: 1–4 and32–35
    // sheets; 7–19 and23–30 helices. All other residues remain unassigned.
    for residue in &a.residues {
        let n = residue.label_seq_id.unwrap();
        let expected = if (1..=4).contains(&n) || (32..=35).contains(&n) {
            SecondaryStructure::Sheet
        } else if (7..=19).contains(&n) || (23..=30).contains(&n) {
            SecondaryStructure::Helix
        } else {
            SecondaryStructure::Unknown
        };
        assert_eq!(residue.secondary, expected, "residue {n}");
    }
    let native = eigenvista_format::encode(&binary.document).unwrap();
    assert_eq!(eigenvista_format::decode(&native).unwrap(), binary.document);
    use std::io::Write;
    let mut gzip = flate2::write::GzEncoder::new(vec![], flate2::Compression::default());
    gzip.write_all(include_bytes!("../../../fixtures/bcif/1crn.bcif"))
        .unwrap();
    let compressed = import_bytes(&gzip.finish().unwrap(), "1crn.bcif.gz").unwrap();
    assert_eq!(compressed.document.structure.as_ref(), Some(a));
}

#[test]
fn real_1aon_preserves_full_geometry_and_distinct_polymer_and_ligand_chains() {
    let source = std::fs::read(concat!(
        env!("CARGO_MANIFEST_DIR"),
        "/../../fixtures/cif/1AON.cif"
    ))
    .unwrap();
    let imported = import_bytes(&source, "1AON.cif").unwrap();
    assert_eq!(imported.document.atoms.len(), 58_870);
    let metadata = imported.document.structure.as_ref().unwrap();
    assert_eq!(metadata.atom_names.len(), 58_870);
    let a = metadata
        .chains
        .iter()
        .position(|c| c.label_id.as_deref() == Some("A"))
        .unwrap();
    assert_eq!(metadata.chains[a].entity_id.as_deref(), Some("1"));
    // Source HELX_P1 explicitly covers label A8–29 (author A9–30).
    for n in 8..=29 {
        let r = metadata
            .residues
            .iter()
            .find(|r| r.chain == a && r.label_seq_id == Some(n))
            .unwrap();
        assert_eq!(r.secondary, SecondaryStructure::Helix);
    }
    assert!(
        metadata
            .residues
            .iter()
            .any(|r| r.kind == ComponentKind::Protein)
    );
    assert!(
        metadata
            .residues
            .iter()
            .any(|r| r.kind == ComponentKind::Ligand)
    );
    assert!(
        metadata
            .residues
            .iter()
            .any(|r| r.kind == ComponentKind::Ion)
    );
    let encoded = eigenvista_format::encode(&imported.document).unwrap();
    assert_eq!(
        eigenvista_format::decode(&encoded).unwrap().structure,
        imported.document.structure
    );
}
