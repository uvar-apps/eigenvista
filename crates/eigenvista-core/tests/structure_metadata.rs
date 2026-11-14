use eigenvista_core::{
    Atom, ComponentKind, Document, SecondaryStructure, StructureChain, StructureMetadata,
    StructureResidue, import,
};

fn row(record: &str, fields: &[(usize, &str)]) -> String {
    let mut bytes = [b' '; 80];
    bytes[..record.len()].copy_from_slice(record.as_bytes());
    for &(offset, value) in fields {
        bytes[offset..offset + value.len()].copy_from_slice(value.as_bytes());
    }
    String::from_utf8(bytes.to_vec()).unwrap() + "\n"
}

#[allow(clippy::too_many_arguments)]
fn atom(
    id: usize,
    name: &str,
    alt: &str,
    residue: &str,
    chain: &str,
    sequence: &str,
    insertion: &str,
    x: f64,
    occupancy: f64,
    hetero: bool,
) -> String {
    row(
        if hetero { "HETATM" } else { "ATOM" },
        &[
            (6, &format!("{id:5}")),
            (12, &format!("{name:^4}")),
            (16, alt),
            (17, residue),
            (21, chain),
            (22, &format!("{sequence:>4}")),
            (26, insertion),
            (30, &format!("{x:8.3}")),
            (38, "   0.000"),
            (46, "   0.000"),
            (54, &format!("{occupancy:6.2}")),
            (60, " 20.00"),
            (76, " C"),
        ],
    )
}

#[test]
fn pdb_retains_source_segments_and_selected_alternate_atom_alignment() {
    let source = [
        atom(1, "N", "", "ALA", "A", "-1", "", 0., 1., false),
        atom(2, "CA", "A", "ALA", "A", "-1", "", 1., 0.3, false),
        atom(3, "CA", "B", "ALA", "A", "-1", "", 2., 0.7, false),
        atom(4, "CB", "", "ALA", "A", "-1", "", 3., 0., false),
        "TER\n".into(),
        atom(5, "N", "", "ALA", "A", "-1", "", 10., 1., false),
        atom(6, "CA", "", "ALA", "A", "-1", "", 11., 1., false),
    ]
    .concat();
    let doc = import::pdb(&source, "segments.pdb").unwrap();
    assert_eq!(doc.atoms.len(), 4);
    let metadata = doc.structure.unwrap();
    assert_eq!(metadata.atom_names, ["N", "CA", "N", "CA"]);
    assert_eq!(metadata.atom_residues, [0, 0, 1, 1]);
    assert_eq!(metadata.chains.len(), 1);
    assert_eq!(metadata.chains[0].author_id.as_deref(), Some("A"));
    assert_eq!(metadata.chains[0].label_id, None);
    assert_eq!(metadata.chains[0].entity_id, None);
    assert_eq!(
        metadata
            .residues
            .iter()
            .map(|r| r.segment)
            .collect::<Vec<_>>(),
        [0, 1]
    );
    assert!(
        metadata
            .residues
            .iter()
            .all(|r| r.author_seq_id.as_deref() == Some("-1") && r.kind == ComponentKind::Protein)
    );
    assert!((doc.atoms[1].position[0] * eigenvista_core::BOHR_TO_ANGSTROM - 2.).abs() < 1e-12);
}

#[test]
fn pdb_deposited_ranges_respect_insertions_and_modified_polymer_identity() {
    let helix = row(
        "HELIX",
        &[
            (15, "ALA"),
            (19, "A"),
            (21, "  10"),
            (25, "A"),
            (27, "SEP"),
            (31, "A"),
            (33, "  11"),
        ],
    );
    let sheet = row(
        "SHEET",
        &[
            (17, "GLY"),
            (21, "B"),
            (22, "   1"),
            (28, "GLY"),
            (32, "B"),
            (33, "   2"),
        ],
    );
    let modification = row(
        "MODRES",
        &[(12, "SEP"), (16, "A"), (18, "  11"), (24, "SER")],
    );
    let source = [
        helix,
        sheet,
        modification,
        atom(1, "CA", "", "ALA", "A", "10", "", 0., 1., false),
        atom(2, "CA", "", "ALA", "A", "10", "A", 4., 1., false),
        atom(3, "CA", "", "SEP", "A", "11", "", 8., 1., true),
        atom(4, "CA", "", "GLY", "B", "1", "", 20., 1., false),
        atom(5, "CA", "", "GLY", "B", "2", "", 24., 1., false),
    ]
    .concat();
    let doc = import::pdb(&source, "annotations.pdb").unwrap();
    let metadata = doc.structure.unwrap();
    assert_eq!(metadata.secondary_source, "deposited");
    assert_eq!(
        metadata
            .residues
            .iter()
            .map(|r| r.secondary)
            .collect::<Vec<_>>(),
        [
            SecondaryStructure::Unknown,
            SecondaryStructure::Helix,
            SecondaryStructure::Helix,
            SecondaryStructure::Sheet,
            SecondaryStructure::Sheet
        ]
    );
    assert_eq!(metadata.residues[2].name, "SEP");
    assert_eq!(metadata.residues[2].kind, ComponentKind::Protein);
    assert_eq!(metadata.residues[1].insertion_code.as_deref(), Some("A"));
}

fn cif(rows: &str, metadata: &str) -> String {
    format!(
        "data_test\n{metadata}\nloop_\n_atom_site.group_PDB\n_atom_site.id\n_atom_site.type_symbol\n_atom_site.label_atom_id\n_atom_site.label_alt_id\n_atom_site.label_comp_id\n_atom_site.label_asym_id\n_atom_site.label_entity_id\n_atom_site.label_seq_id\n_atom_site.auth_atom_id\n_atom_site.auth_comp_id\n_atom_site.auth_asym_id\n_atom_site.auth_seq_id\n_atom_site.pdbx_PDB_ins_code\n_atom_site.Cartn_x\n_atom_site.Cartn_y\n_atom_site.Cartn_z\n_atom_site.occupancy\n_atom_site.pdbx_PDB_model_num\n{rows}\n#\n"
    )
}

#[test]
fn cif_preserves_namespaces_entities_modified_residues_and_nonpolymer_kinds() {
    let data = cif(
        "ATOM 1 C CA . SEP A 1 2 Q2 SEP X 11 ? 4 0 0 1 1\nATOM 2 N N . ALA A 1 1 Q1 ALA X 10 A 0 0 0 1 1\nHETATM 3 I I . I L 2 . I I X 100 ? 20 0 0 1 1\nHETATM 4 C CA . ALA F 2 . CA ALA X 101 ? 30 0 0 1 1\nHETATM 5 O O . HOH W 3 . O HOH X 102 ? 40 0 0 1 1\nATOM 6 N N9 . I R 4 1 N9 I R 1 ? 50 0 0 1 1",
        "loop_\n_entity.id\n_entity.type\n1 polymer\n2 non-polymer\n3 water\n4 polymer\nloop_\n_entity_poly.entity_id\n_entity_poly.type\n1 'polypeptide(L)'\n4 polyribonucleotide\nloop_\n_struct_conf.id\n_struct_conf.conf_type_id\n_struct_conf.beg_label_asym_id\n_struct_conf.beg_label_comp_id\n_struct_conf.beg_label_seq_id\n_struct_conf.end_label_asym_id\n_struct_conf.end_label_comp_id\n_struct_conf.end_label_seq_id\nH1 HELX_P A ALA 1 A SEP 2",
    );
    let doc = import::cif(&data, "identity.cif").unwrap();
    let s = doc.structure.unwrap();
    assert_eq!(s.atom_names, ["CA", "N", "I", "CA", "O", "N9"]);
    assert_eq!(s.atom_residues, [0, 1, 2, 3, 4, 5]);
    assert_eq!(
        s.chains[0],
        StructureChain {
            label_id: Some("A".into()),
            author_id: Some("X".into()),
            entity_id: Some("1".into())
        }
    );
    assert_eq!(s.residues[0].label_seq_id, Some(2));
    assert_eq!(s.residues[0].author_seq_id.as_deref(), Some("11"));
    assert_eq!(s.residues[1].insertion_code.as_deref(), Some("A"));
    assert_eq!(
        s.residues.iter().map(|r| r.kind).collect::<Vec<_>>(),
        [
            ComponentKind::Protein,
            ComponentKind::Protein,
            ComponentKind::Ion,
            ComponentKind::Ligand,
            ComponentKind::Water,
            ComponentKind::Nucleic
        ]
    );
    assert_eq!(s.residues[0].secondary, SecondaryStructure::Helix);
    assert_eq!(s.residues[1].secondary, SecondaryStructure::Helix);
}

#[test]
fn cif_author_only_secondary_and_quoted_wrapped_metadata_remain_supported() {
    let data = cif(
        "ATOM 1 C CA . ALA A 1 1 CA ALA X -2 A 0 0 0 1 1\nATOM 2 C CA . GLY A 1 2 CA GLY X -1 ? 4 0 0 1 1",
        "_entity.id 1\n_entity.type polymer\n_entity_poly.entity_id 1\n_entity_poly.type 'polypeptide(L)'\nloop_\n_struct_sheet_range.id\n_struct_sheet_range.beg_auth_asym_id\n_struct_sheet_range.beg_auth_comp_id\n_struct_sheet_range.beg_auth_seq_id\n_struct_sheet_range.pdbx_beg_PDB_ins_code\n_struct_sheet_range.end_auth_asym_id\n_struct_sheet_range.end_auth_comp_id\n_struct_sheet_range.end_auth_seq_id\n_struct_sheet_range.pdbx_end_PDB_ins_code\n'one' X ALA\n-2 A X GLY -1 ?",
    );
    let s = import::cif(&data, "author.cif").unwrap().structure.unwrap();
    assert!(
        s.residues
            .iter()
            .all(|r| r.secondary == SecondaryStructure::Sheet)
    );
}

#[test]
fn coordinate_only_cif_remains_usable_without_fabricated_identity() {
    let text = "data_minimal\nloop_\n_atom_site.type_symbol\n_atom_site.Cartn_x\n_atom_site.Cartn_y\n_atom_site.Cartn_z\nC 0 0 0\n";
    let doc = import::cif(text, "coordinate.cif").unwrap();
    assert_eq!(doc.atoms.len(), 1);
    assert!(doc.structure.is_none());
    assert!(
        doc.provenance
            .iter()
            .any(|s| s.contains("hierarchy unavailable"))
    );
}

pub fn metadata_document() -> Document {
    let mut doc = Document::empty("metadata");
    doc.atoms = vec![Atom {
        element: 6,
        position: [0.; 3],
    }];
    doc.structure = Some(StructureMetadata {
        chains: vec![StructureChain {
            label_id: Some("A".into()),
            author_id: Some("X".into()),
            entity_id: Some("1".into()),
        }],
        residues: vec![StructureResidue {
            chain: 0,
            name: "ALA".into(),
            label_seq_id: Some(1),
            author_seq_id: Some("-1".into()),
            insertion_code: Some("A".into()),
            segment: 0,
            kind: ComponentKind::Protein,
            secondary: SecondaryStructure::Unknown,
        }],
        atom_names: vec!["CA".into()],
        atom_residues: vec![0],
        secondary_source: "none".into(),
    });
    doc
}

#[test]
fn native_metadata_validation_rejects_misalignment_indices_aliases_and_excessive_strings() {
    let base = metadata_document();
    base.validate().unwrap();
    let mutations: [fn(&mut StructureMetadata); 12] = [
        |s| s.atom_names.clear(),
        |s| s.atom_residues[0] = 9,
        |s| s.residues[0].chain = 9,
        |s| s.chains.push(s.chains[0].clone()),
        |s| s.residues.push(s.residues[0].clone()),
        |s| s.atom_names[0] = "X".repeat(129),
        |s| s.chains[0].label_id = Some("".into()),
        |s| s.residues[0].insertion_code = Some("X".repeat(17)),
        |s| s.residues[0].label_seq_id = Some(0),
        |s| s.residues[0].segment = 100_000,
        |s| s.secondary_source = "predicted".into(),
        |s| s.residues[0].secondary = SecondaryStructure::Helix,
    ];
    for mutate in mutations {
        let mut doc = base.clone();
        mutate(doc.structure.as_mut().unwrap());
        assert!(doc.validate().is_err());
    }
    let mut doc = base;
    doc.structure = None;
    doc.view.representation = "cartoon".into();
    assert!(doc.validate().is_err());
}

#[test]
fn deposited_conflicts_and_reused_ter_identifiers_are_not_guessed() {
    let helix = row(
        "HELIX",
        &[
            (15, "ALA"),
            (19, "A"),
            (21, "   1"),
            (27, "ALA"),
            (31, "A"),
            (33, "   1"),
        ],
    );
    let sheet = row(
        "SHEET",
        &[
            (17, "ALA"),
            (21, "A"),
            (22, "   1"),
            (28, "ALA"),
            (32, "A"),
            (33, "   1"),
        ],
    );
    let single = atom(1, "CA", "", "ALA", "A", "1", "", 0., 1., false);
    let conflicted = import::pdb(
        &[helix.clone(), sheet, single.clone()].concat(),
        "conflict.pdb",
    )
    .unwrap();
    assert_eq!(
        conflicted.structure.as_ref().unwrap().residues[0].secondary,
        SecondaryStructure::Unknown
    );
    assert!(
        conflicted
            .provenance
            .iter()
            .any(|s| s.contains("secondary annotation matches left unknown"))
    );
    let repeated = import::pdb(
        &[
            helix,
            single,
            "TER\n".into(),
            atom(2, "CA", "", "ALA", "A", "1", "", 10., 1., false),
        ]
        .concat(),
        "reused.pdb",
    )
    .unwrap();
    assert!(
        repeated
            .structure
            .unwrap()
            .residues
            .iter()
            .all(|r| r.secondary == SecondaryStructure::Unknown)
    );
}

#[test]
fn cif_secondary_namespaces_cannot_contradict_observed_endpoints() {
    let data = cif(
        "ATOM 1 C CA . ALA A 1 1 CA ALA X 10 ? 0 0 0 1 1",
        "loop_\n_struct_conf.id\n_struct_conf.conf_type_id\n_struct_conf.beg_label_asym_id\n_struct_conf.beg_label_comp_id\n_struct_conf.beg_label_seq_id\n_struct_conf.end_label_asym_id\n_struct_conf.end_label_comp_id\n_struct_conf.end_label_seq_id\n_struct_conf.beg_auth_asym_id\n_struct_conf.beg_auth_seq_id\n_struct_conf.end_auth_asym_id\n_struct_conf.end_auth_seq_id\nH1 HELX_P A ALA 1 A ALA 1 Y 10 X 10",
    );
    let doc = import::cif(&data, "conflict.cif").unwrap();
    assert_eq!(
        doc.structure.as_ref().unwrap().residues[0].secondary,
        SecondaryStructure::Unknown
    );
    assert!(
        doc.provenance
            .iter()
            .any(|s| s.contains("secondary annotation matches left unknown"))
    );
}

#[test]
fn primary_chain_and_residue_aliases_and_total_metadata_bytes_are_bounded() {
    let mut doc = metadata_document();
    doc.atoms.push(doc.atoms[0].clone());
    let structure = doc.structure.as_mut().unwrap();
    structure.atom_names.push("CB".into());
    structure.atom_residues.push(1);
    let mut second = structure.residues[0].clone();
    second.name = "GLY".into();
    structure.residues.push(second);
    assert!(doc.validate().unwrap_err().contains("residue aliases"));
    let structure = doc.structure.as_mut().unwrap();
    structure.residues[1].chain = 1;
    let mut second = structure.chains[0].clone();
    second.author_id = Some("Y".into());
    structure.chains.push(second);
    assert!(doc.validate().unwrap_err().contains("label-chain aliases"));
    let mut doc = metadata_document();
    doc.atoms.resize(50_000, doc.atoms[0].clone());
    let structure = doc.structure.as_mut().unwrap();
    structure.atom_names = vec!["X".repeat(100); 50_000];
    structure.atom_residues = vec![0; 50_000];
    assert!(doc.validate().unwrap_err().contains("4 MiB"));
}

#[test]
fn relevant_cif_metadata_is_bounded_without_retaining_large_sequence_text() {
    let mut metadata = "loop_\n_entity.id\n_entity.type\n".to_string();
    for _ in 0..100_001 {
        metadata.push_str("1 polymer\n");
    }
    let data = cif("ATOM 1 C CA . ALA A 1 1 CA ALA X 1 ? 0 0 0 1 1", &metadata);
    assert!(
        import::cif(&data, "oversized.cif")
            .unwrap_err()
            .contains("metadata exceeds the row budget")
    );
    let metadata = "_entity_poly.entity_id 1\n_entity_poly.type 'polypeptide(L)'\n_entity_poly.pdbx_seq_one_letter_code\n;ALAGLY\nALAGLY\n;\n";
    let data = cif("ATOM 1 C CA . ALA A 1 1 CA ALA X 1 ? 0 0 0 1 1", metadata);
    assert_eq!(
        import::cif(&data, "sequence.cif")
            .unwrap()
            .structure
            .unwrap()
            .residues[0]
            .kind,
        ComponentKind::Protein
    );
}
