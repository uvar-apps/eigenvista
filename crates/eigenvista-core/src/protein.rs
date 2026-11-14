//! Display-only alpha-carbon topology from validated deposited residue identity.
//! No bond-component traversal or secondary-structure prediction is performed.
use crate::structure::{ComponentKind, SecondaryStructure, StructureResidue};
use crate::{BOHR_TO_ANGSTROM, Document, Result};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const MAX_CA_DISTANCE_ANGSTROM: f64 = 5.0;
const MIN_CA_DISTANCE_ANGSTROM: f64 = 0.5;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct BackbonePoint {
    pub residue: usize,
    pub atom: usize,
    pub position: [f64; 3],
    pub secondary: SecondaryStructure,
    /// Carbonyl-derived ribbon width, perpendicular to the local CA tangent.
    /// Missing/ambiguous C/O or a degenerate projection remains explicit.
    pub orientation: Option<[f64; 3]>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct BackboneSegment {
    pub chain: usize,
    pub segment: usize,
    pub points: Vec<BackbonePoint>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ProteinBackbone {
    pub segments: Vec<BackboneSegment>,
    pub warnings: Vec<String>,
}

#[derive(Default, Clone, Copy)]
struct Candidates {
    ca: Option<usize>,
    c: Option<usize>,
    o: Option<usize>,
    duplicate_ca: bool,
    duplicate_c: bool,
    duplicate_o: bool,
}

fn candidate(slot: &mut Option<usize>, duplicate: &mut bool, atom: usize) {
    if slot.is_some() {
        *duplicate = true;
    } else {
        *slot = Some(atom);
    }
}

fn subtract(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    std::array::from_fn(|i| a[i] - b[i])
}
fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    (0..3).map(|i| a[i] * b[i]).sum()
}
fn normalized(a: [f64; 3]) -> Option<[f64; 3]> {
    let length = a[0].hypot(a[1]).hypot(a[2]);
    (length.is_finite() && length > 1e-10).then(|| a.map(|v| v / length))
}
fn author_number(residue: &StructureResidue) -> Option<i32> {
    residue.author_seq_id.as_deref()?.trim().parse().ok()
}
fn insertion(residue: &StructureResidue) -> &str {
    residue.insertion_code.as_deref().unwrap_or("")
}
fn consecutive_insertion(a: &str, b: &str) -> bool {
    if a.is_empty() {
        return b == "A";
    }
    a.len() == 1
        && b.len() == 1
        && a.as_bytes()[0].is_ascii_uppercase()
        && b.as_bytes()[0].is_ascii_uppercase()
        && a.as_bytes()[0].checked_add(1) == Some(b.as_bytes()[0])
}

#[derive(Clone, Copy)]
enum Order {
    Label,
    Author,
    Unavailable,
}

fn consecutive(a: &StructureResidue, b: &StructureResidue, order: Order) -> bool {
    if let (Some(left), Some(right)) = (a.label_seq_id, b.label_seq_id) {
        return left.checked_add(1) == Some(right);
    }
    if !matches!(order, Order::Author) {
        return false;
    }
    let (Some(left), Some(right)) = (author_number(a), author_number(b)) else {
        return false;
    };
    (left == right && consecutive_insertion(insertion(a), insertion(b)))
        || (left.checked_add(1) == Some(right) && insertion(b).is_empty())
}

fn position_order(indices: &[usize], residues: &[StructureResidue]) -> Order {
    if indices.iter().all(|&i| residues[i].label_seq_id.is_some()) {
        Order::Label
    } else if indices
        .iter()
        .all(|&i| author_number(&residues[i]).is_some())
    {
        Order::Author
    } else {
        Order::Unavailable
    }
}

fn sequence_position(residue: &StructureResidue, order: Order) -> Option<(i32, &str)> {
    match order {
        Order::Label => residue.label_seq_id,
        Order::Author => author_number(residue),
        Order::Unavailable => None,
    }
    .map(|number| (number, insertion(residue)))
}

fn order_residues(
    indices: &mut [usize],
    residues: &[StructureResidue],
    ambiguous_positions: &[bool],
) -> Order {
    let chosen = position_order(indices, residues);
    if matches!(chosen, Order::Label) {
        indices.sort_by_key(|&i| (residues[i].label_seq_id, insertion(&residues[i]), i));
        return Order::Label;
    }
    if matches!(chosen, Order::Author) {
        indices.sort_by_key(|&i| (author_number(&residues[i]), insertion(&residues[i]), i));
        // Partial label numbering cannot contradict the chosen author order.
        let mut previous = None;
        for &i in indices.iter() {
            if ambiguous_positions[i] {
                continue;
            }
            if let Some(label) = residues[i].label_seq_id {
                if previous.is_some_and(|value| value >= label) {
                    return Order::Unavailable;
                }
                previous = Some(label);
            }
        }
        return Order::Author;
    }
    indices.sort_unstable();
    Order::Unavailable
}

#[derive(Default)]
struct Counts {
    missing: usize,
    ambiguous: usize,
    ambiguous_positions: usize,
    sequence: usize,
    distance: usize,
    unordered: usize,
    unoriented: usize,
    unknown_secondary: usize,
    singletons: usize,
}

fn finish(
    points: &mut Vec<BackbonePoint>,
    chain: usize,
    segment: usize,
    output: &mut Vec<BackboneSegment>,
) {
    if !points.is_empty() {
        output.push(BackboneSegment {
            chain,
            segment,
            points: std::mem::take(points),
        });
    }
}

/// Prepare true polymer continuity from residue metadata, retaining document IDs.
/// Numeric author/insertion order is used only when label order is incomplete.
pub fn protein_backbone(document: &Document) -> Result<ProteinBackbone> {
    document.validate()?;
    let Some(metadata) = &document.structure else {
        return Ok(ProteinBackbone {
            segments: vec![],
            warnings: vec![
                "Biological metadata is unavailable; no protein backbone was inferred.".into(),
            ],
        });
    };
    let mut atoms = vec![Candidates::default(); metadata.residues.len()];
    for (index, (name, &residue)) in metadata
        .atom_names
        .iter()
        .zip(&metadata.atom_residues)
        .enumerate()
    {
        if metadata.residues[residue].kind != ComponentKind::Protein {
            continue;
        }
        let row = &mut atoms[residue];
        let element = document.atoms[index].element;
        if name.trim().eq_ignore_ascii_case("CA") && element == 6 {
            candidate(&mut row.ca, &mut row.duplicate_ca, index);
        } else if name.trim().eq_ignore_ascii_case("C") && element == 6 {
            candidate(&mut row.c, &mut row.duplicate_c, index);
        } else if name.trim().eq_ignore_ascii_case("O") && element == 8 {
            candidate(&mut row.o, &mut row.duplicate_o, index);
        }
    }
    let mut groups: BTreeMap<(usize, usize), Vec<usize>> = BTreeMap::new();
    for (index, residue) in metadata.residues.iter().enumerate() {
        groups
            .entry((residue.chain, residue.segment))
            .or_default()
            .push(index);
    }
    let mut counts = Counts::default();
    let mut segments = Vec::new();
    let mut ambiguous_positions = vec![false; metadata.residues.len()];
    for ((chain, segment), observed) in groups {
        let mut indices: Vec<_> = observed
            .iter()
            .copied()
            .filter(|&index| metadata.residues[index].kind == ComponentKind::Protein)
            .collect();
        if indices.is_empty() {
            continue;
        }
        let chosen = position_order(&indices, &metadata.residues);
        let mut positions = BTreeMap::new();
        // Include nonprotein/unknown variants in identity ambiguity, while only
        // protein residues can contribute backbone anchors or select an order.
        for &index in &observed {
            let residue = &metadata.residues[index];
            if let Some(key) = sequence_position(residue, chosen) {
                let entry = positions.entry(key).or_insert((0usize, false));
                entry.0 += 1;
                entry.1 |= residue.kind == ComponentKind::Protein;
            }
        }
        counts.ambiguous_positions += positions
            .values()
            .filter(|&&(count, protein)| count > 1 && protein)
            .count();
        for &index in &indices {
            ambiguous_positions[index] = sequence_position(&metadata.residues[index], chosen)
                .is_some_and(|key| positions[&key].0 > 1);
        }
        let order = order_residues(&mut indices, &metadata.residues, &ambiguous_positions);
        let mut points: Vec<BackbonePoint> = Vec::new();
        for index in indices {
            let residue = &metadata.residues[index];
            if ambiguous_positions[index] {
                // Retain the ambiguous position as a barrier in ordered traversal:
                // removing it first could invent author10 -> author11 continuity
                // across an omitted insertion10A. All source atoms remain in Document.
                finish(&mut points, chain, segment, &mut segments);
                continue;
            }
            let candidates = atoms[index];
            let Some(atom) = candidates.ca.filter(|_| !candidates.duplicate_ca) else {
                if candidates.duplicate_ca {
                    counts.ambiguous += 1;
                } else {
                    counts.missing += 1;
                }
                finish(&mut points, chain, segment, &mut segments);
                continue;
            };
            if let Some(previous) = points.last() {
                let connected = consecutive(&metadata.residues[previous.residue], residue, order);
                let delta = subtract(document.atoms[atom].position, previous.position);
                let separation = delta[0].hypot(delta[1]).hypot(delta[2]) * BOHR_TO_ANGSTROM;
                if !connected {
                    counts.sequence += 1;
                    finish(&mut points, chain, segment, &mut segments);
                } else if !separation.is_finite()
                    || !(MIN_CA_DISTANCE_ANGSTROM..=MAX_CA_DISTANCE_ANGSTROM).contains(&separation)
                {
                    counts.distance += 1;
                    finish(&mut points, chain, segment, &mut segments);
                }
            }
            if matches!(order, Order::Unavailable) {
                counts.unordered += 1;
            }
            if residue.secondary == SecondaryStructure::Unknown {
                counts.unknown_secondary += 1;
            }
            let orientation = if !candidates.duplicate_c && !candidates.duplicate_o {
                candidates.c.zip(candidates.o).and_then(|(c, o)| {
                    normalized(subtract(
                        document.atoms[o].position,
                        document.atoms[c].position,
                    ))
                })
            } else {
                None
            };
            points.push(BackbonePoint {
                residue: index,
                atom,
                position: document.atoms[atom].position,
                secondary: residue.secondary,
                orientation,
            });
            if matches!(order, Order::Unavailable) {
                finish(&mut points, chain, segment, &mut segments);
            }
        }
        finish(&mut points, chain, segment, &mut segments);
    }
    for segment in &mut segments {
        if segment.points.len() == 1 {
            counts.singletons += 1;
        }
        for index in 0..segment.points.len() {
            let last = segment.points.len() - 1;
            let tangent = normalized(subtract(
                segment.points[(index + 1).min(last)].position,
                segment.points[index.saturating_sub(1)].position,
            ));
            if let (Some(width), Some(tangent)) = (segment.points[index].orientation, tangent) {
                segment.points[index].orientation = normalized(std::array::from_fn(|axis| {
                    width[axis] - tangent[axis] * dot(width, tangent)
                }));
            }
            if segment.points[index].orientation.is_none() {
                counts.unoriented += 1;
            }
        }
    }
    let mut warnings = Vec::new();
    for (count, message) in [
        (
            counts.missing,
            "protein residues lack an alpha carbon; backbone breaks were retained",
        ),
        (
            counts.ambiguous,
            "protein residues have ambiguous alpha carbons; no candidate was guessed",
        ),
        (
            counts.ambiguous_positions,
            "sequence positions have multiple deposited residue identities; all alpha-carbon anchors at those ambiguous positions were omitted",
        ),
        (
            counts.sequence,
            "sequence discontinuities split the protein backbone",
        ),
        (
            counts.distance,
            "implausible alpha-carbon separations split the protein backbone",
        ),
        (
            counts.unordered,
            "residues have no consistent sequence order and are shown as isolated markers",
        ),
        (
            counts.unoriented,
            "backbone residues lack a reliable carbonyl orientation",
        ),
        (
            counts.unknown_secondary,
            "backbone residues have no deposited secondary assignment",
        ),
        (
            counts.singletons,
            "isolated alpha-carbon residues remain visible as markers",
        ),
    ] {
        if count > 0 {
            warnings.push(format!("{count} {message}."));
        }
    }
    Ok(ProteinBackbone { segments, warnings })
}
