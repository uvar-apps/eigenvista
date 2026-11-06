//! Repeatable visit-count comparison. The two timings have different scopes:
//! old_query_ms excludes pair acceptance/sorting; bucketed_full_ms includes them.
use eigenvista_core::{Atom, BOHR_TO_ANGSTROM, bonds, import};
use kiddo::{ImmutableKdTree, SquaredEuclidean};
use std::time::Instant;

fn old_global_query_visits(atoms: &[Atom]) -> usize {
    let positions: Vec<_> = atoms
        .iter()
        .map(|atom| atom.position.map(|v| v * BOHR_TO_ANGSTROM))
        .collect();
    let radii: Vec<_> = atoms
        .iter()
        .map(|atom| bonds::covalent_radius(atom.element).unwrap())
        .collect();
    let maximum = radii.iter().copied().fold(0., f64::max);
    let tree = ImmutableKdTree::<f64, 3>::new_from_slice(&positions);
    positions
        .iter()
        .zip(radii)
        .map(|(position, radius)| {
            tree.within_unsorted::<SquaredEuclidean>(
                position,
                (radius + maximum + bonds::TOLERANCE_ANGSTROM).powi(2) * (1. + 8. * f64::EPSILON),
            )
            .len()
        })
        .sum()
}

fn report(label: &str, atoms: &[Atom]) {
    let start = Instant::now();
    let old_visits = old_global_query_visits(atoms);
    let old_query_ms = start.elapsed().as_secs_f64() * 1000.;
    let mut times = [0.; 3];
    let mut result = None;
    for time in &mut times {
        let start = Instant::now();
        result = Some(bonds::perceive(atoms, &[]).unwrap());
        *time = start.elapsed().as_secs_f64() * 1000.;
    }
    times.sort_by(f64::total_cmp);
    let result = result.unwrap();
    println!(
        "{label}: atoms={} old_global_visits={old_visits} bucketed_visits={} candidates={} bonds={} old_query_ms={old_query_ms:.3} bucketed_full_ms={:.3}",
        atoms.len(),
        result.neighbor_visits,
        result.candidates,
        result.bonds.len(),
        times[1],
    );
}

fn main() {
    println!(
        "Visit counts are comparable; old-query and new-full timings have different scopes. Synthetic lattices are coordinate-valid stress inputs, not physical structure models."
    );
    for (label, source) in [
        (
            "3POR",
            include_str!("../../../fixtures/legacy/data/3POR.pdb"),
        ),
        (
            "4PJ1",
            include_str!("../../../fixtures/large-structure/4PJ1.pdb"),
        ),
    ] {
        let document = import::pdb(source, label).unwrap();
        report(label, &document.atoms);
    }
    for (element, spacing) in [(6, 1.5), (1, 0.8)] {
        let mut atoms: Vec<_> = (0..99_999)
            .map(|i| Atom {
                element,
                position: [
                    (i % 100) as f64 * spacing / BOHR_TO_ANGSTROM,
                    ((i / 100) % 100) as f64 * spacing / BOHR_TO_ANGSTROM,
                    (i / 10_000) as f64 * spacing / BOHR_TO_ANGSTROM,
                ],
            })
            .collect();
        atoms.push(Atom {
            element: 55,
            position: [10_000. / BOHR_TO_ANGSTROM; 3],
        });
        report(&format!("synthetic-{element}-Cs-outlier"), &atoms);
    }
}
