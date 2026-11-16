use eigenvista_core::{
    Atom, BOHR_TO_ANGSTROM, ComponentKind, Document, SecondaryStructure, StructureChain,
    StructureMetadata, StructureResidue, inspection::*,
};
use std::collections::BTreeSet;

fn source(points: &[[f64; 3]]) -> Document {
    let mut document = Document::empty("neighborhood fixture");
    document.atoms = points
        .iter()
        .map(|&position| Atom {
            element: 6,
            position: position.map(|coordinate| coordinate / BOHR_TO_ANGSTROM),
        })
        .collect();
    document
}

fn query(seeds: &[usize], radius: f64, whole_residues: bool) -> NeighborhoodRequest {
    NeighborhoodRequest {
        seeds: seeds.to_vec(),
        radius_angstrom: radius,
        whole_residues,
    }
}

// Independent exhaustive pair union. Fixtures avoid ambiguous floating-point
// cutoffs except the separately checked exact-axis boundary cases below.
fn exhaustive(document: &Document, request: &NeighborhoodRequest) -> Vec<usize> {
    document
        .atoms
        .iter()
        .enumerate()
        .filter_map(|(index, atom)| {
            request
                .seeds
                .iter()
                .any(|&seed| {
                    let other = &document.atoms[seed];
                    let squared: f64 = (0..3)
                        .map(|axis| {
                            ((atom.position[axis] - other.position[axis]) * BOHR_TO_ANGSTROM)
                                .powi(2)
                        })
                        .sum();
                    squared <= request.radius_angstrom.powi(2)
                })
                .then_some(index)
        })
        .collect()
}

#[test]
fn nearest_seed_search_matches_exhaustive_union_under_permutation_and_translation() {
    let points: Vec<_> = (0..733)
        .map(|index| {
            [
                ((index * 137) % 997) as f64 / 31.,
                ((index * 337) % 991) as f64 / 29.,
                ((index * 577) % 983) as f64 / 37.,
            ]
        })
        .collect();
    let mut document = source(&points);
    for seeds in [vec![3], vec![5, 33, 304], (0..500).collect()] {
        let request = query(&seeds, 3.37, false);
        assert_eq!(
            neighborhood(&document, &request).unwrap(),
            exhaustive(&document, &request)
        );
    }
    document.atoms.reverse();
    for atom in &mut document.atoms {
        atom.position = std::array::from_fn(|axis| {
            atom.position[axis] + [1e7, -2e7, 3e7][axis] / BOHR_TO_ANGSTROM
        });
    }
    let request = query(&[12, 300, 700], 3.37, false);
    assert_eq!(
        neighborhood(&document, &request).unwrap(),
        exhaustive(&document, &request)
    );
}

#[test]
fn neighborhood_includes_seeds_coincident_atoms_and_the_closed_radius_boundary() {
    let document = source(&[
        [0.; 3],
        [4., 0., 0.],
        [4. + 1e-9, 0., 0.],
        [0.; 3],
        [-4., 0., 0.],
    ]);
    assert_eq!(
        neighborhood(&document, &query(&[0], 4., false)).unwrap(),
        [0, 1, 3, 4]
    );
    assert_eq!(
        neighborhood(&document, &query(&[0], 0., false)).unwrap(),
        [0, 3]
    );
    assert_eq!(
        neighborhood(&document, &query(&[3, 0, 3], 0., false)).unwrap(),
        [0, 3]
    );
}

#[test]
fn zero_radius_matches_exact_coordinates_even_when_squared_distances_underflow() {
    let document = source(&[
        [0.; 3],
        [1e-200, 0., 0.],
        [1e-200, -0., 0.],
        [-0., 0., 0.],
        [2e-200, 0., 0.],
    ]);
    // Independent equality oracle, deliberately not squared-distance arithmetic.
    let seeds = [0, 1];
    let expected: Vec<_> = document
        .atoms
        .iter()
        .enumerate()
        .filter_map(|(index, atom)| {
            seeds
                .iter()
                .any(|&seed| document.atoms[seed].position == atom.position)
                .then_some(index)
        })
        .collect();
    assert_eq!(expected, [0, 1, 2, 3]);
    assert_eq!(
        neighborhood(&document, &query(&seeds, 0., false)).unwrap(),
        expected
    );
    assert!(neighborhood(&document, &query(&[0], 1e-200, false)).is_err());
    assert_eq!(
        neighborhood(&document, &query(&seeds, 1e-150, false)).unwrap(),
        [0, 1, 2, 3, 4]
    );
}

fn identity_fixture() -> Document {
    let mut document = source(&[
        [0.; 3],
        [1., 0., 0.],
        [30., 0., 0.],
        [50., 0., 0.],
        [2., 0., 0.],
        [32., 0., 0.],
    ]);
    let chains = ["A", "B"]
        .map(|label| StructureChain {
            label_id: Some(label.into()),
            author_id: Some(label.into()),
            entity_id: None,
        })
        .to_vec();
    let residues = [(0, "LIG", None), (0, "ALA", Some("A")), (1, "LIG", None)]
        .map(|(chain, name, insertion)| StructureResidue {
            chain,
            name: name.into(),
            label_seq_id: None,
            author_seq_id: Some("5".into()),
            insertion_code: insertion.map(String::from),
            segment: 0,
            kind: if name == "LIG" {
                ComponentKind::Ligand
            } else {
                ComponentKind::Protein
            },
            secondary: SecondaryStructure::Unknown,
        })
        .to_vec();
    document.structure = Some(StructureMetadata {
        chains,
        residues,
        atom_names: ["C1", "CA", "C1", "C2", "N", "C2"]
            .map(String::from)
            .to_vec(),
        atom_residues: vec![0, 1, 2, 0, 1, 2],
        secondary_source: "none".into(),
    });
    document
}

#[test]
fn residue_expansion_uses_identity_not_names_or_contiguous_source_rows() {
    let document = identity_fixture();
    document.structure.as_ref().unwrap().validate(6).unwrap();
    assert_eq!(
        neighborhood(&document, &query(&[0], 1.1, false)).unwrap(),
        [0, 1]
    );
    assert_eq!(
        neighborhood(&document, &query(&[0], 1.1, true)).unwrap(),
        [0, 1, 3, 4]
    );
    assert_eq!(
        neighborhood(&document, &query(&[2], 0., true)).unwrap(),
        [2, 5]
    );
    // Materialized results remain a canonical original-index set suitable for
    // naming; the result never collapses same-name ligand copies together.
    let selection = NamedSelection {
        id: "site".into(),
        label: "Ligand A and full residues".into(),
        atoms: neighborhood(&document, &query(&[0], 1.1, true)).unwrap(),
        neighborhood: Some(query(&[0], 1.1, true)),
    };
    let annotations = Annotations {
        selections: vec![selection],
        ..Annotations::default()
    };
    annotations.validate(&document).unwrap();
}

#[test]
fn query_rejects_missing_metadata_invalid_sources_and_reports_cancellation() {
    let mut document = source(&[[0.; 3], [1., 0., 0.]]);
    for request in [
        query(&[], 1., false),
        query(&[2], 1., false),
        query(&[0], -1., false),
        query(&[0], f64::NAN, false),
        query(&[0], 1., true),
    ] {
        assert!(neighborhood(&document, &request).is_err());
    }
    let cancelled = neighborhood_with_progress(&document, &query(&[0], 1., false), |_, _| {
        Err("cancelled by owner".into())
    });
    assert_eq!(cancelled.unwrap_err(), "cancelled by owner");
    document.atoms[0].position[0] = f64::INFINITY;
    assert!(neighborhood(&document, &query(&[0], 1., false)).is_err());
}

#[test]
fn large_seed_sets_stay_linear_in_retained_work_and_report_monotone_counts() {
    let points: Vec<_> = (0..10_000).map(|index| [index as f64, 0., 0.]).collect();
    let document = source(&points);
    let seeds: Vec<_> = (0..10_000).step_by(2).collect();
    let mut progress = Vec::new();
    let result = neighborhood_with_progress(&document, &query(&seeds, 0., false), |done, total| {
        progress.push((done, total));
        Ok(())
    })
    .unwrap();
    assert_eq!(result, seeds);
    assert_eq!(progress.first(), Some(&(0, 10_000)));
    assert_eq!(progress.last(), Some(&(10_000, 10_000)));
    assert!(progress.windows(2).all(|pair| pair[0].0 < pair[1].0));
    assert_eq!(result.iter().collect::<BTreeSet<_>>().len(), result.len());
}
