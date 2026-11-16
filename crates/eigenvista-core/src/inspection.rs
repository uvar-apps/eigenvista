//! Nonperiodic inspection of authoritative source atoms. Display subsets never
//! renumber these references, and measurements never use GPU coordinates.
use crate::{BOHR_TO_ANGSTROM, Document, Result, valid_color};
use kiddo::{ImmutableKdTree, SquaredEuclidean};
use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;

pub const MAX_NAMED_SELECTIONS: usize = 64;
pub const MAX_SELECTION_REFERENCES: usize = 1_000_000;
pub const MAX_MEASUREMENTS: usize = 256;
pub const MAX_LABELS: usize = 256;
pub const MAX_ANNOTATION_TEXT_BYTES: usize = 64 * 1024;
/// The same finite coordinate envelope used by display bond perception.
pub const MAX_NEIGHBOR_COORDINATE_ANGSTROM: f64 = 1e9;
const DEGENERACY_TOLERANCE: f64 = 64. * f64::EPSILON;

/// Ordered measurement interpretation; torsions are reported in [-180, 180).
#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MeasurementKind {
    Distance,
    Angle,
    Torsion,
}

impl MeasurementKind {
    pub fn atom_count(self) -> usize {
        match self {
            Self::Distance => 2,
            Self::Angle => 3,
            Self::Torsion => 4,
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MeasurementRequest {
    pub kind: MeasurementKind,
    /// This is an ordered sequence, never a canonical selection set.
    pub atoms: Vec<usize>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MeasurementDefinition {
    pub id: String,
    pub label: String,
    pub kind: MeasurementKind,
    pub atoms: Vec<usize>,
    pub visible: bool,
    pub color: String,
    pub always_visible: bool,
}

impl MeasurementDefinition {
    pub fn request(&self) -> MeasurementRequest {
        MeasurementRequest {
            kind: self.kind,
            atoms: self.atoms.clone(),
        }
    }
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MeasurementStatus {
    Defined,
    Undefined,
}

/// Value is Å for distances and degrees for angles/torsions. Undefined geometry
/// has no numeric value, so neither exports nor callers need NaN sentinels.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct MeasurementResult {
    pub kind: MeasurementKind,
    pub atoms: Vec<usize>,
    pub value: Option<f64>,
    pub unit: String,
    pub status: MeasurementStatus,
    pub reason: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NeighborhoodRequest {
    pub seeds: Vec<usize>,
    pub radius_angstrom: f64,
    pub whole_residues: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct NamedSelection {
    pub id: String,
    pub label: String,
    /// Materialized, strictly increasing original atom indices.
    pub atoms: Vec<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub neighborhood: Option<NeighborhoodRequest>,
}

/// Exactly one target is present. Residue targets retain biological identity;
/// they are not interpreted as arbitrary atoms with similar display labels.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AnnotationLabel {
    pub id: String,
    pub text: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub atom: Option<usize>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub residue: Option<usize>,
    pub visible: bool,
    pub color: String,
    pub always_visible: bool,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct Annotations {
    pub selections: Vec<NamedSelection>,
    pub measurements: Vec<MeasurementDefinition>,
    pub labels: Vec<AnnotationLabel>,
}

impl Annotations {
    pub fn is_empty(&self) -> bool {
        self.selections.is_empty() && self.measurements.is_empty() && self.labels.is_empty()
    }

    /// Validate only this payload and its source references. Calling the full
    /// Document validator here would recurse when annotations belong to it.
    pub fn validate(&self, doc: &Document) -> Result<()> {
        if self.selections.len() > MAX_NAMED_SELECTIONS
            || self.measurements.len() > MAX_MEASUREMENTS
            || self.labels.len() > MAX_LABELS
        {
            return Err("Inspection annotations exceed the record budget".into());
        }
        let mut ids = BTreeSet::new();
        let mut text_bytes = 0;
        let mut references = 0usize;
        for selection in &self.selections {
            record(&selection.id, &selection.label, &mut ids, &mut text_bytes)?;
            validate_set(doc, &selection.atoms)?;
            references = references
                .checked_add(selection.atoms.len())
                .ok_or("Selection reference count overflow")?;
            if references > MAX_SELECTION_REFERENCES {
                return Err("Named selections exceed the aggregate atom-reference budget".into());
            }
            if let Some(query) = &selection.neighborhood {
                validate_neighborhood(doc, query)?;
            }
        }
        for measurement in &self.measurements {
            record(
                &measurement.id,
                &measurement.label,
                &mut ids,
                &mut text_bytes,
            )?;
            validate_measurement(doc, &measurement.request())?;
            appearance(&measurement.color)?;
        }
        for label in &self.labels {
            record(&label.id, &label.text, &mut ids, &mut text_bytes)?;
            appearance(&label.color)?;
            match (label.atom, label.residue) {
                (Some(atom), None) if atom < doc.atoms.len() => {}
                (None, Some(residue))
                    if doc
                        .structure
                        .as_ref()
                        .is_some_and(|metadata| residue < metadata.residues.len()) => {}
                _ => return Err("Label requires exactly one valid atom or residue target".into()),
            }
        }
        Ok(())
    }
}

fn record<'a>(
    id: &'a str,
    text: &str,
    ids: &mut BTreeSet<&'a str>,
    bytes: &mut usize,
) -> Result<()> {
    if id.trim().is_empty()
        || id.len() > 128
        || id.chars().any(char::is_control)
        || !ids.insert(id)
        || text.trim().is_empty()
        || text.len() > 256
        || text.chars().any(char::is_control)
    {
        return Err("Invalid, duplicate or excessive annotation ID/text".into());
    }
    *bytes = bytes
        .checked_add(text.len())
        .ok_or("Annotation text size overflow")?;
    if *bytes > MAX_ANNOTATION_TEXT_BYTES {
        return Err("Annotation text exceeds the 64 KiB budget".into());
    }
    Ok(())
}

fn appearance(color: &str) -> Result<()> {
    if !valid_color(color) {
        return Err("Annotation color must be a six-digit hexadecimal color".into());
    }
    Ok(())
}

fn validate_set(doc: &Document, indices: &[usize]) -> Result<()> {
    if indices.is_empty()
        || indices.len() > doc.atoms.len()
        || indices.iter().any(|&index| index >= doc.atoms.len())
        || indices.windows(2).any(|pair| pair[0] >= pair[1])
    {
        return Err("Selection must contain increasing unique original atom indices".into());
    }
    Ok(())
}

/// Canonicalize a source-index set without ever sorting measurement pick order.
pub fn canonical_selection(doc: &Document, indices: &[usize]) -> Result<Vec<usize>> {
    if indices.len() > doc.atoms.len() || indices.iter().any(|&index| index >= doc.atoms.len()) {
        return Err("Selection contains invalid or excessive atom references".into());
    }
    let mut result = Vec::new();
    result
        .try_reserve_exact(indices.len())
        .map_err(|_| "Cannot allocate the atom selection")?;
    result.extend_from_slice(indices);
    result.sort_unstable();
    result.dedup();
    Ok(result)
}

fn validate_measurement(doc: &Document, request: &MeasurementRequest) -> Result<()> {
    if request.atoms.len() != request.kind.atom_count()
        || request.atoms.iter().any(|&index| index >= doc.atoms.len())
        || request.atoms.iter().collect::<BTreeSet<_>>().len() != request.atoms.len()
    {
        return Err(
            "Measurement requires the correct ordered, distinct source atom indices".into(),
        );
    }
    if request
        .atoms
        .iter()
        .flat_map(|&index| doc.atoms[index].position)
        .any(|value| !value.is_finite())
    {
        return Err("Measurement coordinates must be finite".into());
    }
    Ok(())
}

fn subtract(a: [f64; 3], b: [f64; 3]) -> Result<[f64; 3]> {
    let result = std::array::from_fn(|axis| a[axis] - b[axis]);
    if result.into_iter().any(|value: f64| !value.is_finite()) {
        return Err("Inspection coordinate difference overflow".into());
    }
    Ok(result)
}

fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    a.into_iter().zip(b).map(|(x, y)| x * y).sum()
}

fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}

fn norm(a: [f64; 3]) -> f64 {
    a[0].hypot(a[1]).hypot(a[2])
}

fn unit(a: [f64; 3]) -> Option<[f64; 3]> {
    // Rescaling before the norm also supports finite vectors whose Euclidean
    // length exceeds f64::MAX, and tiny nonzero angle arms.
    let scale = a.into_iter().map(f64::abs).fold(0., f64::max);
    if scale == 0. {
        return None;
    }
    let scaled = a.map(|component| component / scale);
    let length = norm(scaled);
    Some(scaled.map(|component| component / length))
}

fn perpendicular(a: [f64; 3], axis: [f64; 3]) -> Option<[f64; 3]> {
    let normalized = unit(a)?;
    let projection = dot(normalized, axis);
    let plane = std::array::from_fn(|k| normalized[k] - axis[k] * projection);
    let length = norm(plane);
    // Angular degeneracy is relative to the original arm, not its absolute
    // coordinate magnitude, preserving translation and scale invariance.
    (length > DEGENERACY_TOLERANCE).then(|| plane.map(|component| component / length))
}

/// Measure source geometry without editing or cloning scientific input arrays.
pub fn measure(doc: &Document, request: &MeasurementRequest) -> Result<MeasurementResult> {
    validate_measurement(doc, request)?;
    let points: Vec<_> = request
        .atoms
        .iter()
        .map(|&index| doc.atoms[index].position)
        .collect();
    let mut reason = None;
    let value = match request.kind {
        MeasurementKind::Distance => {
            let value = norm(subtract(points[0], points[1])?.map(|value| value * BOHR_TO_ANGSTROM));
            if !value.is_finite() {
                return Err("Measured distance exceeds numerical range".into());
            }
            Some(value)
        }
        MeasurementKind::Angle => {
            match (
                unit(subtract(points[0], points[1])?),
                unit(subtract(points[2], points[1])?),
            ) {
                (Some(u), Some(v)) => Some(norm(cross(u, v)).atan2(dot(u, v)).to_degrees()),
                _ => {
                    reason = Some("Angle has a zero-length arm".into());
                    None
                }
            }
        }
        MeasurementKind::Torsion => {
            let axis = unit(subtract(points[2], points[1])?);
            let projected = match axis {
                Some(u) => perpendicular(subtract(points[0], points[1])?, u)
                    .zip(perpendicular(subtract(points[3], points[2])?, u))
                    .map(|(v, w)| (u, v, w)),
                None => None,
            };
            match projected {
                Some((u, v, w)) => {
                    let angle = dot(cross(u, v), w).atan2(dot(v, w)).to_degrees();
                    Some(if angle >= 180. { angle - 360. } else { angle })
                }
                None => {
                    reason = Some("Torsion has a zero central bond or degenerate plane".into());
                    None
                }
            }
        }
    };
    Ok(MeasurementResult {
        kind: request.kind,
        atoms: request.atoms.clone(),
        value: value.map(|value| if value == 0. { 0. } else { value }),
        unit: match request.kind {
            MeasurementKind::Distance => "angstrom",
            MeasurementKind::Angle | MeasurementKind::Torsion => "degree",
        }
        .into(),
        status: if value.is_some() {
            MeasurementStatus::Defined
        } else {
            MeasurementStatus::Undefined
        },
        reason,
    })
}

fn validate_neighborhood(doc: &Document, request: &NeighborhoodRequest) -> Result<()> {
    if doc.atoms.len() > 100_000
        || request.seeds.is_empty()
        || request.seeds.len() > doc.atoms.len()
        || request.seeds.iter().any(|&index| index >= doc.atoms.len())
        || !request.radius_angstrom.is_finite()
        || !(0. ..=MAX_NEIGHBOR_COORDINATE_ANGSTROM).contains(&request.radius_angstrom)
    {
        return Err("Invalid neighborhood seeds, radius or source atom count".into());
    }
    let radius_bohr = request.radius_angstrom / BOHR_TO_ANGSTROM;
    if request.radius_angstrom > 0. && radius_bohr * radius_bohr < f64::MIN_POSITIVE {
        return Err("Neighborhood radius is below the supported nonzero numerical range".into());
    }
    if request.whole_residues {
        doc.structure
            .as_ref()
            .ok_or("Whole-residue expansion requires biological metadata")?
            .validate(doc.atoms.len())?;
    }
    Ok(())
}

fn coordinate_key(point: [f64; 3]) -> [u64; 3] {
    point.map(|value| if value == 0. { 0 } else { value.to_bits() })
}

/// Inclusive nonperiodic atom-center neighborhood over all accepted source
/// atoms, including seeds and hidden atoms. Query memory is O(atoms + seeds),
/// not the potentially quadratic number of seed/candidate pairs.
pub fn neighborhood(doc: &Document, request: &NeighborhoodRequest) -> Result<Vec<usize>> {
    neighborhood_with_progress(doc, request, |_, _| Ok(()))
}

pub fn neighborhood_with_progress(
    doc: &Document,
    request: &NeighborhoodRequest,
    mut progress: impl FnMut(usize, usize) -> Result<()>,
) -> Result<Vec<usize>> {
    validate_neighborhood(doc, request)?;
    let seeds = canonical_selection(doc, &request.seeds)?;
    let mut positions = Vec::new();
    positions
        .try_reserve_exact(doc.atoms.len())
        .map_err(|_| "Cannot allocate neighborhood coordinates")?;
    for atom in &doc.atoms {
        if atom.position.iter().any(|value| {
            !value.is_finite() || value.abs() * BOHR_TO_ANGSTROM > MAX_NEIGHBOR_COORDINATE_ANGSTROM
        }) {
            return Err("Neighborhood coordinates must be finite and within 1e9 angstrom".into());
        }
        // Preserve the source coordinates exactly. Converting absolute positions
        // to Å first adds avoidable roundoff at a large common translation.
        positions.push(atom.position);
    }
    let mut seed_positions = Vec::new();
    seed_positions
        .try_reserve_exact(seeds.len())
        .map_err(|_| "Cannot allocate neighborhood seeds")?;
    seed_positions.extend(seeds.iter().map(|&index| positions[index]));
    let tree = (request.radius_angstrom > 0.)
        .then(|| ImmutableKdTree::<f64, 3>::new_from_slice(&seed_positions));
    // Exact coincidence is not a squared-distance query. Tiny nonzero deltas
    // can square to zero and make a k-d tree choose an unrelated tied seed.
    let mut coincident = Vec::new();
    if tree.is_none() {
        coincident
            .try_reserve_exact(seed_positions.len())
            .map_err(|_| "Cannot allocate exact neighborhood coordinates")?;
        coincident.extend(seed_positions.iter().copied().map(coordinate_key));
        coincident.sort_unstable();
        coincident.dedup();
    }
    let mut result = Vec::new();
    result
        .try_reserve_exact(doc.atoms.len())
        .map_err(|_| "Cannot allocate neighborhood result")?;
    progress(0, positions.len())?;
    for (index, position) in positions.iter().enumerate() {
        let included = if let Some(tree) = &tree {
            let nearest = tree.nearest_one::<SquaredEuclidean>(position);
            let seed =
                usize::try_from(nearest.item).map_err(|_| "Invalid neighborhood tree index")?;
            let distance = norm(subtract(*position, seed_positions[seed])?) * BOHR_TO_ANGSTROM;
            // Admit only floating-point roundoff at the inclusive boundary,
            // not a chemically meaningful expansion of the radius.
            let boundary = 8. * f64::EPSILON * distance.max(request.radius_angstrom);
            distance <= request.radius_angstrom + boundary
        } else {
            coincident.binary_search(&coordinate_key(*position)).is_ok()
        };
        if included {
            result.push(index);
        }
        if (index + 1) % 256 == 0 || index + 1 == positions.len() {
            progress(index + 1, positions.len())?;
        }
    }
    if request.whole_residues {
        let metadata = doc.structure.as_ref().expect("validated metadata");
        let mut residues = vec![false; metadata.residues.len()];
        for &index in &result {
            residues[metadata.atom_residues[index]] = true;
        }
        result.clear();
        result.extend(
            metadata
                .atom_residues
                .iter()
                .enumerate()
                .filter_map(|(index, &residue)| residues[residue].then_some(index)),
        );
    }
    Ok(result)
}
