use eigenvista_core::protein::protein_backbone;
use eigenvista_core::structure::{
    ComponentKind, SecondaryStructure, StructureChain, StructureMetadata, StructureResidue,
};
use eigenvista_core::{Atom, BOHR_TO_ANGSTROM, Document};

fn base() -> Document {
    let mut doc = Document::empty("independent backbone cases");
    doc.structure = Some(StructureMetadata {
        chains: vec![StructureChain {
            label_id: Some("A".into()),
            author_id: Some("a".into()),
            entity_id: Some("1".into()),
        }],
        residues: vec![],
        atom_names: vec![],
        atom_residues: vec![],
        secondary_source: "deposited".into(),
    });
    doc
}
fn atom(doc: &mut Document, residue: usize, name: &str, element: u16, position: [f64; 3]) -> usize {
    let index = doc.atoms.len();
    doc.atoms.push(Atom {
        element,
        position: position.map(|v| v / BOHR_TO_ANGSTROM),
    });
    let metadata = doc.structure.as_mut().unwrap();
    metadata.atom_names.push(name.into());
    metadata.atom_residues.push(residue);
    index
}
#[allow(clippy::too_many_arguments)]
fn residue(
    doc: &mut Document,
    label: Option<i32>,
    author: &str,
    insertion: Option<&str>,
    segment: usize,
    x: f64,
    ca: bool,
    carbonyl: bool,
    secondary: SecondaryStructure,
) -> Option<usize> {
    let metadata = doc.structure.as_mut().unwrap();
    let index = metadata.residues.len();
    metadata.residues.push(StructureResidue {
        chain: 0,
        name: "ALA".into(),
        label_seq_id: label,
        author_seq_id: Some(author.into()),
        insertion_code: insertion.map(str::to_owned),
        segment,
        kind: ComponentKind::Protein,
        secondary,
    });
    let result = ca.then(|| atom(doc, index, "CA", 6, [x, 0., 0.]));
    atom(doc, index, "N", 7, [x + 0.2, 0.1, 0.]);
    if carbonyl {
        atom(doc, index, "C", 6, [x + 0.6, 0., 0.]);
        atom(doc, index, "O", 8, [x + 0.6, 1., 0.]);
    }
    result
}

#[test]
fn label_order_preserves_original_ids_annotation_and_carbonyl_orientation() {
    let mut doc = base();
    let c3 = residue(
        &mut doc,
        Some(3),
        "13",
        None,
        0,
        7.6,
        true,
        true,
        SecondaryStructure::Sheet,
    )
    .unwrap();
    let c1 = residue(
        &mut doc,
        Some(1),
        "11",
        None,
        0,
        0.,
        true,
        true,
        SecondaryStructure::Helix,
    )
    .unwrap();
    let c2 = residue(
        &mut doc,
        Some(2),
        "12",
        None,
        0,
        3.8,
        true,
        true,
        SecondaryStructure::Coil,
    )
    .unwrap();
    let data = protein_backbone(&doc).unwrap();
    assert_eq!(data.segments.len(), 1);
    let points = &data.segments[0].points;
    assert_eq!(
        points.iter().map(|p| p.residue).collect::<Vec<_>>(),
        [1, 2, 0]
    );
    assert_eq!(
        points.iter().map(|p| p.atom).collect::<Vec<_>>(),
        [c1, c2, c3]
    );
    assert_eq!(
        points.iter().map(|p| p.secondary).collect::<Vec<_>>(),
        [
            SecondaryStructure::Helix,
            SecondaryStructure::Coil,
            SecondaryStructure::Sheet
        ]
    );
    for point in points {
        assert_eq!(point.position, doc.atoms[point.atom].position);
        let width = point.orientation.unwrap();
        assert!(width[0].abs() < 1e-12 && (width[1] - 1.).abs() < 1e-12 && width[2].abs() < 1e-12);
    }
}

#[test]
fn author_numbers_insertions_ter_and_chain_boundaries_are_independent() {
    let mut doc = base();
    for (author, insertion, x) in [
        ("0", None, 11.4),
        ("-1", Some("B"), 7.6),
        ("-1", None, 0.),
        ("-1", Some("A"), 3.8),
        ("2", None, 19.),
    ] {
        residue(
            &mut doc,
            None,
            author,
            insertion,
            0,
            x,
            true,
            true,
            SecondaryStructure::Unknown,
        );
    }
    residue(
        &mut doc,
        None,
        "3",
        None,
        1,
        22.8,
        true,
        true,
        SecondaryStructure::Unknown,
    );
    residue(
        &mut doc,
        None,
        "4",
        None,
        1,
        26.6,
        true,
        true,
        SecondaryStructure::Unknown,
    );
    doc.structure.as_mut().unwrap().chains.push(StructureChain {
        label_id: Some("B".into()),
        author_id: Some("b".into()),
        entity_id: Some("1".into()),
    });
    doc.structure.as_mut().unwrap().residues[6].chain = 1;
    let data = protein_backbone(&doc).unwrap();
    let ids: Vec<Vec<usize>> = data
        .segments
        .iter()
        .map(|s| s.points.iter().map(|p| p.residue).collect())
        .collect();
    assert_eq!(ids, [vec![2, 3, 1, 0], vec![4], vec![5], vec![6]]);
    assert_eq!(
        data.segments
            .iter()
            .map(|s| (s.chain, s.segment))
            .collect::<Vec<_>>(),
        [(0, 0), (0, 0), (0, 1), (1, 1)]
    );
}

#[test]
fn missing_alpha_carbon_splits_even_when_a_perceived_bond_connects_across_it() {
    let mut doc = base();
    let first = residue(
        &mut doc,
        Some(1),
        "1",
        None,
        0,
        0.,
        true,
        true,
        SecondaryStructure::Helix,
    )
    .unwrap();
    residue(
        &mut doc,
        Some(2),
        "2",
        None,
        0,
        3.8,
        false,
        true,
        SecondaryStructure::Helix,
    );
    let third = residue(
        &mut doc,
        Some(3),
        "3",
        None,
        0,
        7.6,
        true,
        true,
        SecondaryStructure::Helix,
    )
    .unwrap();
    residue(
        &mut doc,
        Some(4),
        "4",
        None,
        0,
        11.4,
        true,
        true,
        SecondaryStructure::Helix,
    );
    let without = protein_backbone(&doc).unwrap();
    doc.bonds.push([first, third]);
    assert_eq!(protein_backbone(&doc).unwrap(), without);
    assert_eq!(
        without
            .segments
            .iter()
            .map(|s| s.points.len())
            .collect::<Vec<_>>(),
        [1, 2]
    );
    assert!(
        without
            .warnings
            .iter()
            .any(|w| w.contains("lack an alpha carbon"))
    );
}

#[test]
fn ambiguous_alpha_carbon_and_implausible_distances_are_not_bridged() {
    let mut doc = base();
    residue(
        &mut doc,
        Some(1),
        "1",
        None,
        0,
        0.,
        true,
        true,
        SecondaryStructure::Sheet,
    );
    residue(
        &mut doc,
        Some(2),
        "2",
        None,
        0,
        3.8,
        true,
        true,
        SecondaryStructure::Sheet,
    );
    atom(&mut doc, 1, "CA", 6, [3.8, 0.1, 0.]);
    residue(
        &mut doc,
        Some(3),
        "3",
        None,
        0,
        7.6,
        true,
        true,
        SecondaryStructure::Sheet,
    );
    residue(
        &mut doc,
        Some(4),
        "4",
        None,
        0,
        30.,
        true,
        true,
        SecondaryStructure::Sheet,
    );
    residue(
        &mut doc,
        Some(5),
        "5",
        None,
        0,
        30.,
        true,
        true,
        SecondaryStructure::Sheet,
    );
    let data = protein_backbone(&doc).unwrap();
    assert_eq!(
        data.segments
            .iter()
            .map(|s| s.points.iter().map(|p| p.residue).collect::<Vec<_>>())
            .collect::<Vec<_>>(),
        [vec![0], vec![2], vec![3], vec![4]]
    );
    assert!(
        data.warnings
            .iter()
            .any(|w| w.contains("ambiguous alpha carbons"))
    );
    assert!(data.warnings.iter().any(|w| w.contains("implausible")));
}

#[test]
fn missing_or_parallel_carbonyl_and_secondary_assignment_remain_explicit() {
    let mut doc = base();
    residue(
        &mut doc,
        Some(1),
        "1",
        None,
        0,
        0.,
        true,
        false,
        SecondaryStructure::Unknown,
    );
    residue(
        &mut doc,
        Some(2),
        "2",
        None,
        0,
        3.8,
        true,
        true,
        SecondaryStructure::Unknown,
    );
    let last = doc.atoms.len() - 1;
    doc.atoms[last].position = [5.4 / BOHR_TO_ANGSTROM, 0., 0.];
    let data = protein_backbone(&doc).unwrap();
    assert_eq!(data.segments[0].points.len(), 2);
    assert!(
        data.segments[0]
            .points
            .iter()
            .all(|p| p.orientation.is_none() && p.secondary == SecondaryStructure::Unknown)
    );
    assert!(
        data.warnings
            .iter()
            .any(|w| w.contains("no deposited secondary"))
    );
}

#[test]
fn unavailable_sequence_order_never_turns_nearby_ca_atoms_into_a_chain() {
    let mut doc = base();
    residue(
        &mut doc,
        None,
        "left",
        None,
        0,
        0.,
        true,
        false,
        SecondaryStructure::Unknown,
    );
    residue(
        &mut doc,
        None,
        "right",
        None,
        0,
        3.8,
        true,
        false,
        SecondaryStructure::Unknown,
    );
    let data = protein_backbone(&doc).unwrap();
    assert_eq!(
        data.segments
            .iter()
            .map(|s| s.points.len())
            .collect::<Vec<_>>(),
        [1, 1]
    );
    assert!(
        data.warnings
            .iter()
            .any(|w| w.contains("no consistent sequence order"))
    );
}

#[test]
fn invalid_metadata_is_rejected_before_indexing_and_legacy_atoms_are_not_guessed() {
    let mut doc = base();
    residue(
        &mut doc,
        Some(1),
        "1",
        None,
        0,
        0.,
        true,
        true,
        SecondaryStructure::Unknown,
    );
    doc.structure.as_mut().unwrap().atom_residues[0] = usize::MAX;
    assert!(protein_backbone(&doc).is_err());
    doc.structure = None;
    let data = protein_backbone(&doc).unwrap();
    assert!(data.segments.is_empty());
    assert!(
        data.warnings
            .iter()
            .any(|w| w.contains("no protein backbone was inferred"))
    );
}

#[test]
fn insertion_progression_accepts_y_to_z_but_never_z_to_punctuation() {
    let mut doc = base();
    for (code, x) in [("Y", 0.), ("Z", 3.8), ("[", 7.6)] {
        residue(
            &mut doc,
            None,
            "10",
            Some(code),
            0,
            x,
            true,
            true,
            SecondaryStructure::Unknown,
        );
    }
    let data = protein_backbone(&doc).unwrap();
    let residues: Vec<Vec<_>> = data
        .segments
        .iter()
        .map(|s| s.points.iter().map(|p| p.residue).collect())
        .collect();
    assert_eq!(residues, [vec![0, 1], vec![2]]);
    assert!(
        data.warnings
            .iter()
            .any(|w| w.contains("sequence discontinuities"))
    );
}

/// Independent deposited-position fixture: N, CA, C, O for each source residue.
/// Both chemical variants are retained in the native document; neither may be
/// chosen as a backbone continuation at their shared sequence position.
fn microheterogeneous_document(label: bool, inserted: bool) -> Document {
    let mut doc = base();
    for (index, (name, number, x, y)) in [
        ("ALA", 1, 0.0, 0.0),
        ("SER", 2, 3.8, 0.0),
        ("CYS", 2, 3.8, 0.2),
        ("GLY", 3, 7.6, 0.0),
        ("THR", 4, 11.4, 0.0),
    ]
    .into_iter()
    .enumerate()
    {
        let author = if inserted {
            [10, 10, 10, 11, 12][index]
        } else {
            number + 8
        };
        doc.structure
            .as_mut()
            .unwrap()
            .residues
            .push(StructureResidue {
                chain: 0,
                name: name.into(),
                label_seq_id: label.then_some(number),
                author_seq_id: Some(author.to_string()),
                insertion_code: (inserted && (index == 1 || index == 2)).then(|| "A".into()),
                segment: 0,
                kind: ComponentKind::Protein,
                secondary: SecondaryStructure::Unknown,
            });
        atom(&mut doc, index, "N", 7, [x - 0.6, y, 0.]);
        atom(&mut doc, index, "CA", 6, [x, y, 0.]);
        atom(&mut doc, index, "C", 6, [x + 0.6, y, 0.]);
        atom(&mut doc, index, "O", 8, [x + 0.6, y + 1., 0.]);
    }
    // Deliberately offer both branches and a direct bridge in the source bond
    // graph. Protein topology must derive from deposited sequence identity.
    doc.bonds = vec![[1, 5], [5, 13], [1, 9], [9, 13], [1, 13], [13, 17]];
    doc
}

fn assert_microheterogeneous_positions_are_barriers(doc: &Document) {
    let unchanged = doc.clone();
    assert_eq!(doc.atoms.len(), 20);
    assert_eq!(doc.structure.as_ref().unwrap().residues.len(), 5);
    let data = protein_backbone(doc).unwrap();
    let atom_ids: Vec<Vec<_>> = data
        .segments
        .iter()
        .map(|segment| segment.points.iter().map(|point| point.atom).collect())
        .collect();
    let residue_ids: Vec<Vec<_>> = data
        .segments
        .iter()
        .map(|segment| segment.points.iter().map(|point| point.residue).collect())
        .collect();
    assert_eq!(atom_ids, [vec![1], vec![13, 17]]);
    assert_eq!(residue_ids, [vec![0], vec![3, 4]]);
    assert!(
        data.segments
            .iter()
            .flat_map(|segment| &segment.points)
            .all(|point| point.position == doc.atoms[point.atom].position)
    );
    assert!(
        data.warnings
            .iter()
            .any(|warning| warning.contains("ambiguous positions")
                && warning.contains("anchors")
                && warning.contains("omitted"))
    );
    assert_eq!(*doc, unchanged);
}

#[test]
fn label_microheterogeneity_omits_all_variant_anchors_without_branching() {
    let mut doc = microheterogeneous_document(true, false);
    assert_microheterogeneous_positions_are_barriers(&doc);
    // An unclassified alternate identity still makes this deposited position
    // ambiguous; it must not silently select the recognized protein variant.
    doc.structure.as_mut().unwrap().residues[2].kind = ComponentKind::Unknown;
    assert_microheterogeneous_positions_are_barriers(&doc);
}

#[test]
fn author_microheterogeneity_omits_all_variant_anchors_with_stable_source_ids() {
    let mut doc = microheterogeneous_document(false, false);
    assert_microheterogeneous_positions_are_barriers(&doc);
    // Mixed deposited label availability still uses author order. The omitted
    // variants' repeated labels cannot invalidate the unambiguous remainder.
    for (index, label) in [Some(1), Some(2), Some(2), None, Some(4)]
        .into_iter()
        .enumerate()
    {
        doc.structure.as_mut().unwrap().residues[index].label_seq_id = label;
    }
    assert_microheterogeneous_positions_are_barriers(&doc);
}

#[test]
fn ambiguous_author_insertion_is_a_barrier_even_when_neighbors_are_numerically_consecutive() {
    // Excluding ambiguous10A before traversal would wrongly reconnect10->11.
    assert_microheterogeneous_positions_are_barriers(&microheterogeneous_document(false, true));
}

#[test]
fn mixed_identity_coverage_cannot_hide_known_label_microheterogeneity() {
    let mut doc = microheterogeneous_document(true, false);
    let metadata = doc.structure.as_mut().unwrap();
    metadata.residues[2].kind = ComponentKind::Unknown;
    metadata.residues[2].author_seq_id = None;
    metadata.residues[3].label_seq_id = None;
    assert_microheterogeneous_positions_are_barriers(&doc);
}

#[test]
fn missing_label_on_unknown_variant_cannot_hide_shared_author_identity() {
    let mut doc = microheterogeneous_document(true, false);
    let metadata = doc.structure.as_mut().unwrap();
    metadata.residues[2].kind = ComponentKind::Unknown;
    metadata.residues[2].label_seq_id = None;
    assert_microheterogeneous_positions_are_barriers(&doc);
}

#[test]
fn opaque_author_microheterogeneity_is_detected_without_inventing_numeric_order() {
    for unknown in [false, true] {
        let mut doc = microheterogeneous_document(false, false);
        for (residue, author) in doc
            .structure
            .as_mut()
            .unwrap()
            .residues
            .iter_mut()
            .zip(["left", "variant", "variant", "right", "last"])
        {
            residue.author_seq_id = Some(author.into());
        }
        if unknown {
            doc.structure.as_mut().unwrap().residues[2].kind = ComponentKind::Unknown;
        }
        let before = doc.clone();
        let result = protein_backbone(&doc).unwrap();
        let ids: Vec<Vec<_>> = result
            .segments
            .iter()
            .map(|segment| segment.points.iter().map(|point| point.atom).collect())
            .collect();
        assert_eq!(ids, [vec![1], vec![13], vec![17]]);
        assert!(
            result
                .warnings
                .iter()
                .any(|message| message.contains("ambiguous positions"))
        );
        assert!(
            result
                .warnings
                .iter()
                .any(|message| message.contains("no consistent sequence order"))
        );
        assert_eq!(doc, before);
    }
}

#[test]
fn numeric_author_aliases_match_the_trimmed_integer_ordering_identity() {
    let mut doc = microheterogeneous_document(false, false);
    doc.structure.as_mut().unwrap().residues[2].author_seq_id = Some(" +010 ".into());
    assert_microheterogeneous_positions_are_barriers(&doc);
}

#[test]
fn complete_distinct_canonical_labels_disambiguate_reused_or_absent_author_aliases() {
    for author in [Some("10"), Some("opaque-author"), None] {
        let mut doc = microheterogeneous_document(true, false);
        for (index, residue) in doc
            .structure
            .as_mut()
            .unwrap()
            .residues
            .iter_mut()
            .enumerate()
        {
            residue.label_seq_id = Some(index as i32 + 1);
            residue.author_seq_id = author.map(str::to_owned);
        }
        // Distinct canonical positions have ordinary3.8Å CA steps. This control
        // deliberately removes the coincident alternate-location geometry.
        for atom in &mut doc.atoms[8..] {
            atom.position[0] += 3.8 / BOHR_TO_ANGSTROM;
        }
        let before = doc.clone();
        let result = protein_backbone(&doc).unwrap();
        let ids: Vec<Vec<_>> = result
            .segments
            .iter()
            .map(|segment| segment.points.iter().map(|point| point.atom).collect())
            .collect();
        assert_eq!(ids, [vec![1, 5, 9, 13, 17]]);
        assert!(
            !result
                .warnings
                .iter()
                .any(|message| message.contains("ambiguous positions"))
        );
        assert_eq!(doc, before);
    }
}

#[test]
fn distinct_author_insertions_are_not_treated_as_one_ambiguous_position() {
    let mut doc = microheterogeneous_document(false, true);
    doc.structure.as_mut().unwrap().residues[2].insertion_code = Some("B".into());
    for atom in &mut doc.atoms[8..] {
        atom.position[0] += 3.8 / BOHR_TO_ANGSTROM;
    }
    let before = doc.clone();
    let result = protein_backbone(&doc).unwrap();
    let ids: Vec<Vec<_>> = result
        .segments
        .iter()
        .map(|segment| segment.points.iter().map(|point| point.atom).collect())
        .collect();
    assert_eq!(ids, [vec![1, 5, 9, 13, 17]]);
    assert!(
        !result
            .warnings
            .iter()
            .any(|message| message.contains("ambiguous positions"))
    );
    assert_eq!(doc, before);
}

#[test]
fn independent_identity_presence_masks_preserve_ambiguous_barriers_and_unambiguous_anchors() {
    let mut scenarios = 0;
    for inserted in [false, true] {
        for unknown in [false, true] {
            for mask in 0..243usize {
                let mut doc = microheterogeneous_document(true, inserted);
                let metadata = doc.structure.as_mut().unwrap();
                if unknown {
                    metadata.residues[2].kind = ComponentKind::Unknown;
                }
                let mut digits = mask;
                for residue in &mut metadata.residues {
                    match digits % 3 {
                        0 => {} // Both deposited identities are available.
                        1 => residue.author_seq_id = None,
                        2 => residue.label_seq_id = None,
                        _ => unreachable!(),
                    }
                    digits /= 3;
                }
                // Independent pairwise oracle: these manufactured monomers
                // collide iff their available labels OR available author IDs
                // explicitly agree in the same insertion namespace. No missing
                // identifier is projected, and no production order/key helper
                // computes the expected set.
                let left = &metadata.residues[1];
                let right = &metadata.residues[2];
                let same_insertion = left.insertion_code == right.insertion_code;
                let shared_label = left
                    .label_seq_id
                    .zip(right.label_seq_id)
                    .is_some_and(|(a, b)| a == b)
                    && same_insertion;
                let shared_author = left
                    .author_seq_id
                    .as_ref()
                    .zip(right.author_seq_id.as_ref())
                    .is_some_and(|(a, b)| a == b)
                    && same_insertion;
                let ambiguous = shared_label || shared_author;
                let before = doc.clone();
                let result = protein_backbone(&doc).unwrap_or_else(|error| {
                    panic!("mask={mask},unknown={unknown},inserted={inserted}: {error}")
                });
                let ids: Vec<_> = result
                    .segments
                    .iter()
                    .flat_map(|segment| segment.points.iter().map(|point| point.atom))
                    .collect();
                let context =
                    format!("mask={mask},unknown={unknown},inserted={inserted},ids={ids:?}");
                // Positive retention guards against a trivial empty depiction.
                for expected in [1, 13, 17] {
                    assert!(ids.contains(&expected), "{context}");
                }
                let warning = result
                    .warnings
                    .iter()
                    .find(|message| message.contains("multiple deposited residue identities"));
                if ambiguous {
                    assert!(!ids.contains(&5) && !ids.contains(&9), "{context}");
                    for segment in &result.segments {
                        let before = segment.points.iter().any(|point| point.atom == 1);
                        let after = segment
                            .points
                            .iter()
                            .any(|point| point.atom == 13 || point.atom == 17);
                        assert!(!(before && after), "{context}");
                    }
                    let warning =
                        warning.unwrap_or_else(|| panic!("Missing ambiguity warning: {context}"));
                    // Count omitted protein residues once, even when BOTH known
                    // namespaces identify the same ambiguous source identities.
                    assert_eq!(
                        warning.split_whitespace().next().unwrap(),
                        if unknown { "1" } else { "2" },
                        "{context}"
                    );
                } else {
                    assert!(ids.contains(&5), "No known identity collision: {context}");
                    assert_eq!(ids.contains(&9), !unknown, "{context}");
                    assert!(
                        warning.is_none(),
                        "No namespace projection allowed: {context}"
                    );
                }
                assert_eq!(doc, before, "{context}");
                scenarios += 1;
            }
        }
    }
    assert_eq!(scenarios, 972);
}
