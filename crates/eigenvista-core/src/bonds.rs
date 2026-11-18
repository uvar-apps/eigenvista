//! Nonperiodic display connectivity, not bond-order or aromaticity perception.
use crate::{Atom, BOHR_TO_ANGSTROM, Result};
use kiddo::{ImmutableKdTree, SquaredEuclidean};
use pdbtbx::Element;
use std::collections::{BTreeMap, BTreeSet};

pub const TOLERANCE_ANGSTROM: f64 = 0.45;
pub const MIN_DISTANCE_ANGSTROM: f64 = 0.4;
// This partitions the index, not the chemical cutoff. Each query still uses
// the actual largest covalent radius in its destination bucket.
const RADIUS_BUCKET_WIDTH_ANGSTROM: f64 = 0.5;

struct RadiusBucket {
    tree: ImmutableKdTree<f64, 3>,
    indices: Vec<usize>,
    max_radius: f64,
}

fn radius_buckets(radii: &[f64], positions: &[[f64; 3]]) -> Result<Vec<RadiusBucket>> {
    let mut groups = BTreeMap::<usize, Vec<usize>>::new();
    for (i, radius) in radii.iter().enumerate() {
        let key = (radius / RADIUS_BUCKET_WIDTH_ANGSTROM).floor() as usize;
        crate::allocation::push(groups.entry(key).or_default(), i, "bond radius bucket")?;
    }
    let mut buckets = crate::allocation::buffer(groups.len(), "bond radius buckets")?;
    for indices in groups.into_values() {
        let mut points = crate::allocation::buffer(indices.len(), "bond radius bucket points")?;
        points.extend(indices.iter().map(|&i| positions[i]));
        let max_radius = indices.iter().map(|&i| radii[i]).fold(0., f64::max);
        buckets.push(RadiusBucket {
            tree: ImmutableKdTree::new_from_slice(&points),
            indices,
            max_radius,
        });
    }
    Ok(buckets)
}

pub struct PerceivedBonds {
    pub bonds: Vec<[usize; 2]>,
    pub neighbor_visits: usize,
    pub candidates: usize,
    pub coordination_rejections: usize,
}

impl PerceivedBonds {
    pub fn description(&self) -> String {
        format!(
            "Automatic bonds: {} connections; exact k-d-tree search, Pyykko-Atsumi single-bond covalent radii + 0.45 angstrom, minimum distance 0.4 angstrom. {} candidates rejected by light-element coordination limits. Connectivity only; bond orders, aromaticity and periodic images not inferred.",
            self.bonds.len(),
            self.coordination_rejections
        )
    }
}

pub fn covalent_radius(element: u16) -> Option<f64> {
    Element::new(element as usize).map(|e| e.atomic_radius().covalent_single)
}

fn coordination_limit(element: u16) -> usize {
    match element {
        1 | 9 => 1,
        5..=7 => 4,
        8 => 3,
        _ => usize::MAX,
    }
}

/// Explicit connections take precedence; remaining pairs are accepted shortest-first.
pub fn perceive(atoms: &[Atom], explicit: &[[usize; 2]]) -> Result<PerceivedBonds> {
    let mut radii = crate::allocation::buffer(atoms.len(), "bond radii")?;
    let mut positions = crate::allocation::buffer(atoms.len(), "bond positions")?;
    for atom in atoms {
        radii.push(covalent_radius(atom.element).ok_or("Invalid element for bond detection")?);
        let p = atom.position.map(|v| v * BOHR_TO_ANGSTROM);
        if p.iter().any(|v| !v.is_finite() || v.abs() > 1e9) {
            return Err("Bond detection requires finite coordinates within 1e9 angstrom".into());
        }
        positions.push(p);
    }
    let mut bonds = BTreeSet::new();
    let mut degree = crate::allocation::filled(atoms.len(), 0usize, "atom degrees")?;
    for &[a, b] in explicit {
        if a == b || a >= atoms.len() || b >= atoms.len() {
            return Err("Invalid explicit bond endpoints".into());
        }
        if bonds.insert([a.min(b), a.max(b)]) {
            degree[a] += 1;
            degree[b] += 1;
        }
    }
    let mut result = PerceivedBonds {
        bonds: vec![],
        neighbor_visits: 0,
        candidates: 0,
        coordination_rejections: 0,
    };
    if atoms.len() < 2 {
        return Ok(result);
    }
    let buckets = radius_buckets(&radii, &positions)?;
    let mut candidates = Vec::new();
    for (i, p) in positions.iter().enumerate() {
        for bucket in &buckets {
            // Every atom belongs to one bucket and r_j <= its observed maximum,
            // so this bound includes every possible accepted pair, even when a
            // large-radius outlier is far from the common small-radius atoms.
            let search_radius = radii[i] + bucket.max_radius + TOLERANCE_ANGSTROM;
            // The index uses squared Euclidean distances, including its radius argument.
            for neighbor in bucket.tree.within_unsorted::<SquaredEuclidean>(
                p,
                search_radius.powi(2) * (1. + 8. * f64::EPSILON),
            ) {
                result.neighbor_visits = result
                    .neighbor_visits
                    .checked_add(1)
                    .ok_or("Bond neighbor visit count overflow")?;
                let j = bucket.indices[neighbor.item as usize];
                if j <= i || bonds.contains(&[i, j]) {
                    continue;
                }
                let sum = radii[i] + radii[j];
                if neighbor.distance >= MIN_DISTANCE_ANGSTROM.powi(2)
                    && neighbor.distance <= (sum + TOLERANCE_ANGSTROM).powi(2)
                {
                    crate::allocation::push(
                        &mut candidates,
                        (neighbor.distance / sum.powi(2), i, j),
                        "bond candidates",
                    )?;
                }
            }
        }
    }
    result.candidates = candidates.len();
    candidates.sort_unstable_by(|a, b| a.0.total_cmp(&b.0).then(a.1.cmp(&b.1)).then(a.2.cmp(&b.2)));
    for (_, i, j) in candidates {
        if degree[i] >= coordination_limit(atoms[i].element)
            || degree[j] >= coordination_limit(atoms[j].element)
        {
            result.coordination_rejections += 1;
            continue;
        }
        bonds.insert([i, j]);
        degree[i] += 1;
        degree[j] += 1;
    }
    result.bonds = crate::allocation::buffer(bonds.len(), "perceived bonds")?;
    result.bonds.extend(bonds);
    Ok(result)
}
