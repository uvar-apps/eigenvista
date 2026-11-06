use eigenvista_core::{Atom, BOHR_TO_ANGSTROM, bonds};
use kiddo::{ImmutableKdTree, SquaredEuclidean};
use std::collections::BTreeSet;

fn atom(element: u16, position: [f64; 3]) -> Atom {
    Atom {
        element,
        position: position.map(|value| value / BOHR_TO_ANGSTROM),
    }
}

// Independent exhaustive pair enumeration followed by the documented
// shortest-normalized-distance ordering and light-element coordination policy.
fn brute_force(atoms: &[Atom], explicit: &[[usize; 2]]) -> (Vec<[usize; 2]>, usize, usize) {
    let positions: Vec<_> = atoms
        .iter()
        .map(|a| a.position.map(|v| v * BOHR_TO_ANGSTROM))
        .collect();
    let radii: Vec<_> = atoms
        .iter()
        .map(|a| bonds::covalent_radius(a.element).unwrap())
        .collect();
    let mut edges = BTreeSet::new();
    let mut degrees = vec![0; atoms.len()];
    for &[a, b] in explicit {
        if edges.insert([a.min(b), a.max(b)]) {
            degrees[a] += 1;
            degrees[b] += 1;
        }
    }
    let mut candidates = Vec::new();
    for a in 0..atoms.len() {
        for b in a + 1..atoms.len() {
            if edges.contains(&[a, b]) {
                continue;
            }
            let distance: f64 = positions[a]
                .iter()
                .zip(positions[b])
                .map(|(x, y)| (x - y).powi(2))
                .sum();
            let sum = radii[a] + radii[b];
            if distance >= bonds::MIN_DISTANCE_ANGSTROM.powi(2)
                && distance <= (sum + bonds::TOLERANCE_ANGSTROM).powi(2)
            {
                candidates.push((distance / sum.powi(2), a, b));
            }
        }
    }
    candidates.sort_by(|left, right| {
        left.0
            .total_cmp(&right.0)
            .then(left.1.cmp(&right.1))
            .then(left.2.cmp(&right.2))
    });
    let count = candidates.len();
    let limit = |element| match element {
        1 | 9 => 1,
        5..=7 => 4,
        8 => 3,
        _ => usize::MAX,
    };
    let mut rejected = 0;
    for (_, a, b) in candidates {
        if degrees[a] >= limit(atoms[a].element) || degrees[b] >= limit(atoms[b].element) {
            rejected += 1;
        } else {
            edges.insert([a, b]);
            degrees[a] += 1;
            degrees[b] += 1;
        }
    }
    (edges.into_iter().collect(), count, rejected)
}

fn assert_exhaustive_parity(atoms: &[Atom], explicit: &[[usize; 2]]) {
    let actual = bonds::perceive(atoms, explicit).unwrap();
    let (edges, candidates, rejected) = brute_force(atoms, explicit);
    assert_eq!(actual.bonds, edges);
    assert_eq!(actual.candidates, candidates);
    assert_eq!(actual.coordination_rejections, rejected);
}

#[test]
fn radius_buckets_match_exhaustive_pairs_and_coordination_across_all_elements() {
    let atoms: Vec<_> = (0..600)
        .map(|i| {
            atom(
                (i % 118 + 1) as u16,
                [
                    ((i * 137) % 997) as f64 / 47.,
                    ((i * 337) % 991) as f64 / 53.,
                    ((i * 577) % 983) as f64 / 59.,
                ],
            )
        })
        .collect();
    assert_exhaustive_parity(&atoms, &[]);
    assert_exhaustive_parity(&atoms, &[[0, 599], [599, 0], [15, 32]]);
    let translated: Vec<_> = atoms
        .iter()
        .map(|atom| Atom {
            element: atom.element,
            position: std::array::from_fn(|axis| {
                atom.position[axis] + [9e8, -8e8, 7e8][axis] / BOHR_TO_ANGSTROM
            }),
        })
        .collect();
    assert_exhaustive_parity(&translated, &[]);
}

#[test]
fn pair_cutoffs_minimum_distance_and_radius_extremes_remain_exact() {
    for first in 1..=118 {
        for second in [1, 6, 55, 118] {
            let cutoff = bonds::covalent_radius(first).unwrap()
                + bonds::covalent_radius(second).unwrap()
                + bonds::TOLERANCE_ANGSTROM;
            for distance in [
                bonds::MIN_DISTANCE_ANGSTROM - 1e-8,
                bonds::MIN_DISTANCE_ANGSTROM,
                bonds::MIN_DISTANCE_ANGSTROM + 1e-8,
                cutoff - 1e-8,
                cutoff,
                cutoff + 1e-8,
            ] {
                assert_exhaustive_parity(
                    &[atom(first, [0.; 3]), atom(second, [distance, 0., 0.])],
                    &[],
                );
            }
        }
    }
}

#[test]
fn bucket_traversal_preserves_explicit_precedence_duplicates_and_tied_candidates() {
    let atoms = [
        atom(1, [0.; 3]),
        atom(8, [1., 0., 0.]),
        atom(8, [-1., 0., 0.]),
        atom(55, [20., 0., 0.]),
        atom(1, [0., 1., 0.]),
        atom(1, [0., 1., 0.]),
    ];
    assert_exhaustive_parity(&atoms, &[]);
    assert_exhaustive_parity(&atoms, &[[0, 3], [3, 0], [5, 2], [0, 2]]);
}

fn old_global_visits_until_budget(atoms: &[Atom]) -> usize {
    let positions: Vec<_> = atoms
        .iter()
        .map(|atom| atom.position.map(|v| v * BOHR_TO_ANGSTROM))
        .collect();
    let maximum = atoms
        .iter()
        .map(|atom| bonds::covalent_radius(atom.element).unwrap())
        .fold(0., f64::max);
    let tree = ImmutableKdTree::<f64, 3>::new_from_slice(&positions);
    let mut visits = 0;
    for (atom, position) in atoms.iter().zip(&positions) {
        let radius =
            bonds::covalent_radius(atom.element).unwrap() + maximum + bonds::TOLERANCE_ANGSTROM;
        visits += tree
            .within_unsorted::<SquaredEuclidean>(
                position,
                radius.powi(2) * (1. + 8. * f64::EPSILON),
            )
            .len();
        // Once this conservative count crosses the unchanged guard, the old
        // per-neighbor loop would already have failed. No remaining query is needed.
        if visits > 10_000_000 {
            break;
        }
    }
    visits
}

#[test]
fn distant_large_radius_outlier_no_longer_exhausts_small_atom_neighbor_budget() {
    // Exactly 100,000 atoms. This intentionally dense coordinate-valid stress
    // fixture tests the work guard, not a model of physically realistic hydrogen.
    let mut atoms: Vec<_> = (0..99_999)
        .map(|i| {
            atom(
                1,
                [
                    (i % 100) as f64 * 0.8,
                    ((i / 100) % 100) as f64 * 0.8,
                    (i / 10_000) as f64 * 0.8,
                ],
            )
        })
        .collect();
    atoms.push(atom(55, [10_000.; 3]));
    let old_visits = old_global_visits_until_budget(&atoms);
    assert!(old_visits > 10_000_000);
    let found = bonds::perceive(&atoms, &[]).unwrap();
    assert_eq!(atoms.len(), 100_000);
    assert!(found.neighbor_visits < 1_000_000);
    assert!(found.candidates < 2_000_000);
    assert!(found.bonds.len() > 49_000);
    let mut degree = vec![0; atoms.len()];
    for [a, b] in found.bonds {
        assert!(b < 99_999, "distant Cs must remain disconnected");
        degree[a] += 1;
        degree[b] += 1;
    }
    assert!(degree.iter().all(|&n| n <= 1));
}
