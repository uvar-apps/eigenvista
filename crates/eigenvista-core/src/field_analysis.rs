//! Quantitative inspection of authoritative f64 fields, independent of GPU previews.
//!
//! Coordinates are bohr. Sample caches retain raw values; scalar declarations and
//! optional display conversions never modify source arrays or legacy mesh hashes.

use crate::{BOHR_TO_ANGSTROM, Document, Grid, Result, compute};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::cmp::Ordering;
use std::collections::HashSet;

pub const MAX_PROBES: usize = 128;
pub const MAX_PLANES: usize = 8;
pub const MAX_PLANE_DIM: usize = 512;
pub const MAX_PROFILES: usize = 16;
pub const MAX_PROFILE_SAMPLES: usize = 4096;
pub const MAX_CACHE_BYTES: usize = 16 * 1024 * 1024;
pub const MAX_CONTOUR_LEVELS: usize = 32;
pub const MAX_CONTOUR_SEGMENTS: usize = 1_000_000;
pub const MAX_CSV_BYTES: usize = 32 * 1024 * 1024;
pub const SAMPLER_VERSION: &str = "eigenvista-quantitative-f64-v1";

/// A scalar interpretation, separate from the legacy numeric field identity.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FieldDescriptor {
    pub field: String,
    pub quantity: String,
    pub value_unit: String,
    pub origin: String,
    #[serde(default)]
    pub note: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub display_unit: Option<String>,
}

impl FieldDescriptor {
    /// Validate references and dimensionally compatible declarations/conversions.
    pub fn validate(&self, doc: &Document) -> Result<()> {
        doc.check_field(&self.field)?;
        bounded_text(&self.field, 512, "field ID")?;
        bounded_text(&self.note, 2048, "field provenance note")?;
        if !["unknown", "imported", "derived", "user_declared"].contains(&self.origin.as_str()) {
            return Err("Unknown field declaration origin".into());
        }
        let allowed: &[&str] = match self.quantity.as_str() {
            "unspecified" => &["unspecified"],
            "dimensionless" => &["1"],
            "orbital_amplitude" => &["unspecified", "bohr^-3/2", "angstrom^-3/2"],
            "electron_density" | "spin_density" | "difference_density" | "transition_density" => {
                &["unspecified", "electron/bohr^3", "electron/angstrom^3"]
            }
            "electric_potential" => &["unspecified", "hartree/e", "V"],
            "potential_energy" => &["unspecified", "hartree", "eV"],
            _ => return Err("Unknown scalar quantity".into()),
        };
        if !allowed.contains(&self.value_unit.as_str()) {
            return Err("Scalar quantity and value unit are incompatible".into());
        }
        if let Some(unit) = &self.display_unit
            && !allowed.contains(&unit.as_str())
        {
            return Err("Display unit is incompatible with the scalar quantity".into());
        }
        self.display_factor()?;
        Ok(())
    }

    /// Factor applied to readouts/exports only; source caches remain unchanged.
    pub fn display_factor(&self) -> Result<f64> {
        let target = self.display_unit.as_deref().unwrap_or(&self.value_unit);
        let factor = match (self.value_unit.as_str(), target) {
            (a, b) if a == b => 1.,
            ("electron/bohr^3", "electron/angstrom^3") => BOHR_TO_ANGSTROM.powi(-3),
            ("electron/angstrom^3", "electron/bohr^3") => BOHR_TO_ANGSTROM.powi(3),
            ("bohr^-3/2", "angstrom^-3/2") => BOHR_TO_ANGSTROM.powf(-1.5),
            ("angstrom^-3/2", "bohr^-3/2") => BOHR_TO_ANGSTROM.powf(1.5),
            _ => {
                return Err(
                    "This display-unit conversion is not supported; raw values are unchanged"
                        .into(),
                );
            }
        };
        Ok(factor)
    }

    pub fn displayed_unit(&self) -> &str {
        self.display_unit.as_deref().unwrap_or(&self.value_unit)
    }

    pub fn interpretation_hash(&self) -> Result<String> {
        fingerprint(&serde_json::json!({"domain":"field-interpretation-v1", "descriptor":self}))
    }
}

/// Describe supported analytic contracts; stored-grid meanings are never guessed.
pub fn describe_field(doc: &Document, field: &str) -> Result<FieldDescriptor> {
    doc.check_field(field)?;
    let (quantity, unit, origin, note) = if doc.orbitals.iter().any(|v| v.id == field) {
        (
            "orbital_amplitude",
            "bohr^-3/2",
            "derived",
            "Real canonical Gaussian orbital amplitude; normalization follows the supplied coefficients.",
        )
    } else if let Some(density) = doc.densities.iter().find(|v| v.id == field) {
        let quantity = match density.kind.as_str() {
            "spin" => "spin_density",
            "difference" => "difference_density",
            "transition" => "transition_density",
            _ => "electron_density",
        };
        (
            quantity,
            "electron/bohr^3",
            "derived",
            "Supplied real density matrix in the canonical Gaussian basis; occupation-derived matrices do not imply a correlated density.",
        )
    } else {
        (
            "unspecified",
            "unspecified",
            "unknown",
            "Sampled scalar meaning and value units are unspecified. Coordinate units are independently known.",
        )
    };
    Ok(FieldDescriptor {
        field: field.into(),
        quantity: quantity.into(),
        value_unit: unit.into(),
        origin: origin.into(),
        note: note.into(),
        display_unit: None,
    })
}

/// Plane `origin` is its first corner; u/v are full-span vectors, not step sizes.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(tag = "kind", rename_all = "snake_case", deny_unknown_fields)]
pub enum AnalysisDefinition {
    Probe {
        point: [f64; 3],
        #[serde(default, skip_serializing_if = "Option::is_none")]
        atom: Option<usize>,
    },
    Plane {
        origin: [f64; 3],
        u: [f64; 3],
        v: [f64; 3],
        dims: [usize; 2],
        #[serde(default, skip_serializing_if = "Option::is_none")]
        atoms: Option<[usize; 3]>,
    },
    Profile {
        start: [f64; 3],
        end: [f64; 3],
        count: usize,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        atoms: Option<[usize; 2]>,
    },
}

impl AnalysisDefinition {
    pub fn count(&self) -> Result<usize> {
        match self {
            Self::Probe { .. } => Ok(1),
            Self::Plane { dims, .. } => {
                if dims.iter().any(|v| !(2..=MAX_PLANE_DIM).contains(v)) {
                    return Err("Plane dimensions must be between 2 and 512".into());
                }
                dims[0]
                    .checked_mul(dims[1])
                    .ok_or("Plane allocation overflow".into())
            }
            Self::Profile { count, .. } if (2..=MAX_PROFILE_SAMPLES).contains(count) => Ok(*count),
            _ => Err("Profile count must be between 2 and 4096".into()),
        }
    }

    pub fn validate(&self, doc: &Document) -> Result<()> {
        self.count()?;
        match self {
            Self::Probe { point, atom } => {
                finite_point(*point)?;
                if let Some(index) = atom
                    && doc
                        .atoms
                        .get(*index)
                        .is_none_or(|a| !close_point(a.position, *point))
                {
                    return Err("Probe atom and resolved point disagree".into());
                }
            }
            Self::Plane {
                origin,
                u,
                v,
                atoms,
                ..
            } => {
                finite_point(*origin)?;
                finite_point(*u)?;
                finite_point(*v)?;
                let un = norm(*u);
                let vn = norm(*v);
                if un == 0.
                    || vn == 0.
                    || !un.is_finite()
                    || !vn.is_finite()
                    || norm(cross(normalized(*u)?, normalized(*v)?)) < 1e-12
                {
                    return Err("Plane spans must be finite, nonzero and noncollinear".into());
                }
                for a in [0., 1.] {
                    for b in [0., 1.] {
                        finite_point(add(*origin, add(scale(*u, a), scale(*v, b))))?;
                    }
                }
                if let Some(indices) = atoms {
                    let expected = plane_through_atoms(doc, *indices, [un, vn], [2, 2])?;
                    if let Self::Plane {
                        origin: eo,
                        u: eu,
                        v: ev,
                        ..
                    } = expected
                        && (!close_point(*origin, eo)
                            || !close_point(*u, eu)
                            || !close_point(*v, ev))
                    {
                        return Err("Plane atom references and resolved frame disagree".into());
                    }
                }
            }
            Self::Profile {
                start, end, atoms, ..
            } => {
                finite_point(*start)?;
                finite_point(*end)?;
                let length = norm(sub(*end, *start));
                if length == 0. || !length.is_finite() {
                    return Err("Profile endpoints must define a finite nonzero segment".into());
                }
                if let Some([a, b]) = atoms
                    && (a == b
                        || doc
                            .atoms
                            .get(*a)
                            .is_none_or(|v| !close_point(v.position, *start))
                        || doc
                            .atoms
                            .get(*b)
                            .is_none_or(|v| !close_point(v.position, *end)))
                {
                    return Err("Profile atom references and resolved endpoints disagree".into());
                }
            }
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AnalysisRequest {
    pub id: String,
    pub label: String,
    pub field: String,
    pub definition: AnalysisDefinition,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub descriptor: Option<FieldDescriptor>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct AnalysisAppearance {
    pub visible: bool,
    pub colormap: String,
    pub show_key: bool,
    pub show_labels: bool,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub range: Option<[f64; 2]>,
    #[serde(default)]
    pub contour_levels: Vec<f64>,
}

impl Default for AnalysisAppearance {
    fn default() -> Self {
        Self {
            visible: true,
            colormap: "diverging".into(),
            show_key: true,
            show_labels: true,
            range: None,
            contour_levels: vec![],
        }
    }
}

impl AnalysisAppearance {
    pub fn validate(&self) -> Result<()> {
        if !["diverging", "viridis", "grayscale"].contains(&self.colormap.as_str())
            || self
                .range
                .is_some_and(|v| !v.iter().all(|x| x.is_finite()) || v[0] >= v[1])
            || self.contour_levels.len() > MAX_CONTOUR_LEVELS
            || self.contour_levels.iter().any(|v| !v.is_finite())
        {
            return Err("Invalid field analysis range, colormap or contour levels".into());
        }
        Ok(())
    }
}

/// Accepted raw f64 cache with explicit valid(1)/outside(0) statuses.
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FieldAnalysisItem {
    pub id: String,
    pub label: String,
    pub field: String,
    pub descriptor: FieldDescriptor,
    pub definition: AnalysisDefinition,
    pub source_hash: String,
    pub sample_hash: String,
    pub interpretation_hash: String,
    pub algorithm: String,
    pub method: String,
    pub values: Vec<f64>,
    pub valid: Vec<u32>,
    pub range: Option<[f64; 2]>,
    pub appearance: AnalysisAppearance,
}

impl FieldAnalysisItem {
    pub fn validate(&self, doc: &Document) -> Result<()> {
        self.validate_with_contour_count(doc).map(|_| ())
    }

    fn validate_with_contour_count(&self, doc: &Document) -> Result<usize> {
        bounded_text(&self.id, 128, "analysis ID")?;
        bounded_text(&self.label, 256, "analysis label")?;
        if self.id.is_empty()
            || self.field != self.descriptor.field
            || self.algorithm != SAMPLER_VERSION
        {
            return Err("Invalid field analysis identity or sampling algorithm".into());
        }
        self.descriptor.validate(doc)?;
        self.definition.validate(doc)?;
        self.appearance.validate()?;
        let count = self.definition.count()?;
        if self.values.len() != count
            || self.valid.len() != count
            || self.values.iter().any(|v| !v.is_finite())
            || self.valid.iter().any(|v| *v > 1)
            || self
                .values
                .iter()
                .zip(&self.valid)
                .any(|(v, valid)| *valid == 0 && *v != 0.)
            || self.range != value_range(&self.values, &self.valid)
        {
            return Err(
                "Invalid field analysis cache dimensions, values, statuses or range".into(),
            );
        }
        let source = compute::source_hash(doc, &self.field)?;
        if self.source_hash != source
            || self.sample_hash != sample_fingerprint(&source, &self.definition)?
            || self.interpretation_hash != self.descriptor.interpretation_hash()?
            || self.method != sampling_method(doc, &self.field)
        {
            return Err(
                "Field analysis cache source, request or interpretation hash mismatch".into(),
            );
        }
        let segments = if let AnalysisDefinition::Plane { dims, .. } = self.definition {
            contour_count(self, dims)?
        } else if !self.appearance.contour_levels.is_empty() {
            return Err("Contour levels require a plane analysis".into());
        } else {
            0
        };
        Ok(segments)
    }

    pub fn cache_bytes(&self) -> Result<usize> {
        self.values
            .len()
            .checked_mul(8)
            .and_then(|v| {
                self.valid
                    .len()
                    .checked_mul(4)
                    .and_then(|m| v.checked_add(m))
            })
            .ok_or("Field analysis cache allocation overflow".into())
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct FieldAnalysisState {
    /// Truthful key for the current mesh/raycast/volume, separate from slice keys.
    #[serde(default)]
    pub show_field_key: bool,
    #[serde(default)]
    pub descriptors: Vec<FieldDescriptor>,
    #[serde(default)]
    pub items: Vec<FieldAnalysisItem>,
}

impl FieldAnalysisState {
    pub fn validate(&self, doc: &Document) -> Result<()> {
        if self.descriptors.len() > 560 || self.items.len() > MAX_PROBES + MAX_PLANES + MAX_PROFILES
        {
            return Err("Field analysis count budget exceeded".into());
        }
        let mut fields = HashSet::new();
        for descriptor in &self.descriptors {
            descriptor.validate(doc)?;
            if !fields.insert(&descriptor.field) {
                return Err("Duplicate field descriptor".into());
            }
        }
        let mut ids = HashSet::new();
        let mut counts = [0usize; 3];
        let mut bytes = 0usize;
        let mut segments = 0usize;
        for item in &self.items {
            if !ids.insert(&item.id) {
                return Err("Duplicate field analysis ID".into());
            }
            segments = segments
                .checked_add(item.validate_with_contour_count(doc)?)
                .ok_or("Aggregate contour segment count overflow")?;
            if segments > MAX_CONTOUR_SEGMENTS {
                return Err(
                    "Configured planes exceed the one-million aggregate contour segment budget"
                        .into(),
                );
            }
            let kind = match item.definition {
                AnalysisDefinition::Probe { .. } => 0,
                AnalysisDefinition::Plane { .. } => 1,
                AnalysisDefinition::Profile { .. } => 2,
            };
            counts[kind] += 1;
            bytes = bytes
                .checked_add(item.cache_bytes()?)
                .ok_or("Field cache size overflow")?;
        }
        if counts[0] > MAX_PROBES
            || counts[1] > MAX_PLANES
            || counts[2] > MAX_PROFILES
            || bytes > MAX_CACHE_BYTES
        {
            return Err("Field analysis count or 16 MiB aggregate cache budget exceeded".into());
        }
        Ok(())
    }
}

/// Resolve a reproducible plane centered on A; horizontal B−A and normal (B−A)×(C−A).
pub fn plane_through_atoms(
    doc: &Document,
    atoms: [usize; 3],
    extent: [f64; 2],
    dims: [usize; 2],
) -> Result<AnalysisDefinition> {
    if atoms[0] == atoms[1]
        || atoms[1] == atoms[2]
        || atoms[0] == atoms[2]
        || extent.iter().any(|v| !v.is_finite() || *v <= 0.)
    {
        return Err(
            "A plane requires three distinct noncollinear atoms and positive extents".into(),
        );
    }
    let positions: Vec<_> = atoms
        .iter()
        .map(|i| {
            doc.atoms
                .get(*i)
                .map(|a| a.position)
                .ok_or("Plane atom index out of range")
        })
        .collect::<std::result::Result<_, _>>()?;
    let horizontal = normalized(sub(positions[1], positions[0]))?;
    let second = normalized(sub(positions[2], positions[0]))?;
    let perpendicular = cross(horizontal, second);
    if norm(perpendicular) < 1e-12 {
        return Err("The three atoms are collinear or numerically degenerate".into());
    }
    let normal = normalized(perpendicular)?;
    let vertical = cross(normal, horizontal);
    let u = scale(horizontal, extent[0]);
    let v = scale(vertical, extent[1]);
    let origin = sub(positions[0], scale(add(u, v), 0.5));
    let definition = AnalysisDefinition::Plane {
        origin,
        u,
        v,
        dims,
        atoms: Some(atoms),
    };
    definition.count()?;
    finite_point(origin)?;
    Ok(definition)
}

/// World-space position of a cached sample; plane values are x-fastest.
pub fn sample_position(definition: &AnalysisDefinition, index: usize) -> Result<[f64; 3]> {
    if index >= definition.count()? {
        return Err("Analysis sample index out of range".into());
    }
    let point = match definition {
        AnalysisDefinition::Probe { point, .. } => *point,
        AnalysisDefinition::Plane {
            origin, u, v, dims, ..
        } => {
            let x = (index % dims[0]) as f64 / (dims[0] - 1) as f64;
            let y = (index / dims[0]) as f64 / (dims[1] - 1) as f64;
            add(*origin, add(scale(*u, x), scale(*v, y)))
        }
        AnalysisDefinition::Profile {
            start, end, count, ..
        } => {
            let t = index as f64 / (count - 1) as f64;
            std::array::from_fn(|i| lerp(start[i], end[i], t))
        }
    };
    finite_point(point)?;
    Ok(point)
}

/// Prepared analytic coefficients/scratch or an affine source-grid interpolator.
pub struct FieldEvaluator<'a> {
    doc: &'a Document,
    analytic: Option<compute::ScalarField<'a>>,
    ao: Vec<f64>,
    grid: Option<(&'a Grid, [[f64; 3]; 3])>,
}

impl<'a> FieldEvaluator<'a> {
    /// Caller supplies an accepted/validated source; this method checks the selected field.
    pub fn new(doc: &'a Document, field: &str) -> Result<Self> {
        doc.check_field(field)?;
        if let Some(grid) = doc.grids.iter().find(|g| g.id == field) {
            grid.validate()?;
            let inverse = reciprocal(grid.axes)?;
            return Ok(Self {
                doc,
                analytic: None,
                ao: vec![],
                grid: Some((grid, inverse)),
            });
        }
        let analytic = compute::ScalarField::new(doc, field)?;
        let mut ao = Vec::new();
        ao.try_reserve_exact(doc.basis.len())
            .map_err(|_| "Cannot allocate quantitative basis scratch")?;
        ao.resize(doc.basis.len(), 0.);
        Ok(Self {
            doc,
            analytic: Some(analytic),
            ao,
            grid: None,
        })
    }

    /// None means outside a stored grid, never a numerical zero or extrapolation.
    pub fn value(&mut self, point: [f64; 3]) -> Result<Option<f64>> {
        finite_point(point)?;
        if let Some((grid, inverse)) = self.grid {
            return interpolate(grid, inverse, point);
        }
        for (slot, basis) in self.ao.iter_mut().zip(&self.doc.basis) {
            *slot = compute::basis_scalar_value(basis, point);
        }
        let value = self
            .analytic
            .as_ref()
            .ok_or("Analytic evaluator unavailable")?
            .value(&self.ao);
        if !value.is_finite() {
            return Err("Quantitative evaluation produced a non-finite value".into());
        }
        Ok(Some(value))
    }
}

pub fn sample(doc: &Document, request: &AnalysisRequest) -> Result<FieldAnalysisItem> {
    sample_with_progress(doc, request, |_, _| Ok(()))
}

/// Sample a probe/plane/profile directly; observer errors cancel without partial publication.
pub fn sample_with_progress(
    doc: &Document,
    request: &AnalysisRequest,
    mut progress: impl FnMut(usize, usize) -> Result<()>,
) -> Result<FieldAnalysisItem> {
    doc.validate()?;
    bounded_text(&request.id, 128, "analysis ID")?;
    bounded_text(&request.label, 256, "analysis label")?;
    if request.id.is_empty() {
        return Err("Analysis ID must not be empty".into());
    }
    request.definition.validate(doc)?;
    let descriptor = request
        .descriptor
        .clone()
        .map(Ok)
        .unwrap_or_else(|| describe_field(doc, &request.field))?;
    descriptor.validate(doc)?;
    if descriptor.field != request.field {
        return Err("Descriptor references another field".into());
    }
    let count = request.definition.count()?;
    let bytes = count
        .checked_mul(12)
        .ok_or("Field analysis allocation overflow")?;
    if bytes > MAX_CACHE_BYTES {
        return Err("Field analysis cache exceeds 16 MiB".into());
    }
    let mut values = Vec::new();
    let mut valid = Vec::new();
    values
        .try_reserve_exact(count)
        .map_err(|_| "Cannot allocate quantitative sample values")?;
    valid
        .try_reserve_exact(count)
        .map_err(|_| "Cannot allocate quantitative sample statuses")?;
    let mut evaluator = FieldEvaluator::new(doc, &request.field)?;
    progress(0, count)?;
    let stride = match request.definition {
        AnalysisDefinition::Plane { dims, .. } => dims[0],
        _ => 64,
    };
    for index in 0..count {
        match evaluator.value(sample_position(&request.definition, index)?)? {
            Some(value) => {
                values.push(value);
                valid.push(1);
            }
            None => {
                values.push(0.);
                valid.push(0);
            }
        }
        if (index + 1) % stride == 0 || index + 1 == count {
            progress(index + 1, count)?;
        }
    }
    let source_hash = compute::source_hash(doc, &request.field)?;
    Ok(FieldAnalysisItem {
        id: request.id.clone(),
        label: request.label.clone(),
        field: request.field.clone(),
        interpretation_hash: descriptor.interpretation_hash()?,
        descriptor,
        sample_hash: sample_fingerprint(&source_hash, &request.definition)?,
        source_hash,
        definition: request.definition.clone(),
        algorithm: SAMPLER_VERSION.into(),
        method: sampling_method(doc, &request.field).into(),
        range: value_range(&values, &valid),
        values,
        valid,
        appearance: AnalysisAppearance::default(),
    })
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ContourSegment {
    pub level: f64,
    pub start: [f64; 3],
    pub end: [f64; 3],
}

/// Marching squares with bilinear asymptotic saddle decisions and >= equality.
/// Cells containing outside samples are omitted; output is counted before allocation.
pub fn contours(item: &FieldAnalysisItem) -> Result<Vec<ContourSegment>> {
    item.appearance.validate()?;
    let AnalysisDefinition::Plane { dims, .. } = item.definition else {
        return Err("Contours require a plane analysis".into());
    };
    if item.values.len() != item.definition.count()?
        || item.valid.len() != item.values.len()
        || item.values.iter().any(|value| !value.is_finite())
        || item.valid.iter().any(|valid| *valid > 1)
    {
        return Err("Invalid contour source dimensions".into());
    }
    let count = contour_count(item, dims)?;
    let mut result = Vec::new();
    result
        .try_reserve_exact(count)
        .map_err(|_| "Cannot allocate contour segments")?;
    for_each_contour(item, dims, |level, start, end| {
        result.push(ContourSegment { level, start, end });
        Ok(())
    })?;
    Ok(result)
}

fn contour_count(item: &FieldAnalysisItem, dims: [usize; 2]) -> Result<usize> {
    let mut count = 0usize;
    for_each_contour(item, dims, |_, _, _| {
        count = count.checked_add(1).ok_or("Contour allocation overflow")?;
        if count > MAX_CONTOUR_SEGMENTS {
            return Err("Contour exceeds the one-million segment budget".into());
        }
        Ok(())
    })?;
    Ok(count)
}

fn for_each_contour(
    item: &FieldAnalysisItem,
    dims: [usize; 2],
    mut emit: impl FnMut(f64, [f64; 3], [f64; 3]) -> Result<()>,
) -> Result<()> {
    for &level in &item.appearance.contour_levels {
        for y in 0..dims[1] - 1 {
            for x in 0..dims[0] - 1 {
                let ids = [
                    y * dims[0] + x,
                    y * dims[0] + x + 1,
                    (y + 1) * dims[0] + x + 1,
                    (y + 1) * dims[0] + x,
                ];
                if ids.iter().any(|i| item.valid[*i] == 0) {
                    continue;
                }
                let values = ids.map(|i| item.values[i]);
                if values.iter().any(|v| !v.is_finite()) {
                    return Err("Non-finite contour source".into());
                }
                let above = values.map(|v| v >= level);
                if above.iter().all(|value| *value == above[0]) {
                    continue;
                }
                let points = [
                    sample_position(&item.definition, ids[0])?,
                    sample_position(&item.definition, ids[1])?,
                    sample_position(&item.definition, ids[2])?,
                    sample_position(&item.definition, ids[3])?,
                ];
                let edges = [(0, 1), (1, 2), (2, 3), (3, 0)];
                let mut cuts = [None; 4];
                let mut crossed = [0; 4];
                let mut crossed_count = 0;
                for (edge, (a, b)) in edges.into_iter().enumerate() {
                    if above[a] == above[b] {
                        continue;
                    }
                    // Normalize all operands to avoid overflow for finite extreme fields.
                    let magnitude = values[a]
                        .abs()
                        .max(values[b].abs())
                        .max(level.abs())
                        .max(f64::MIN_POSITIVE);
                    let va = values[a] / magnitude;
                    let vb = values[b] / magnitude;
                    let t = ((level / magnitude - va) / (vb - va)).clamp(0., 1.);
                    cuts[edge] = Some(std::array::from_fn(|i| lerp(points[a][i], points[b][i], t)));
                    crossed[crossed_count] = edge;
                    crossed_count += 1;
                }
                let (pairs, pair_count) = match &crossed[..crossed_count] {
                    [a, b] => ([(*a, *b), (0, 0)], 1),
                    [0, 1, 2, 3] => {
                        // Exact saddle ties use the same deterministic diagonal.
                        if saddle_decider(values, level) != Ordering::Less {
                            ([(0, 1), (2, 3)], 2)
                        } else {
                            ([(0, 3), (1, 2)], 2)
                        }
                    }
                    [] => ([(0, 0); 2], 0),
                    _ => return Err("Invalid marching-squares crossing parity".into()),
                };
                for (a, b) in pairs.into_iter().take(pair_count) {
                    let start = cuts[a].ok_or("Missing contour edge")?;
                    let end = cuts[b].ok_or("Missing contour edge")?;
                    if start != end {
                        emit(level, start, end)?;
                    }
                }
            }
        }
    }
    Ok(())
}

/// Exact sign of (v0−level)(v2−level) − (v1−level)(v3−level).
///
/// A common floating scale can erase the smaller diagonal before products are
/// formed. This uses an ordinary-f64 sign filter only at level zero (no rounded
/// subtractions), then a bounded exact dyadic predicate for uncertain cases.
fn saddle_decider(values: [f64; 4], level: f64) -> Ordering {
    let sign = |value: f64| match value.partial_cmp(&level).expect("finite contour") {
        Ordering::Less => -1i8,
        Ordering::Equal => 0,
        Ordering::Greater => 1,
    };
    let left_sign = sign(values[0]) * sign(values[2]);
    let right_sign = sign(values[1]) * sign(values[3]);
    if left_sign != right_sign {
        return left_sign.cmp(&right_sign);
    }
    if left_sign == 0 {
        return Ordering::Equal;
    }
    if level == 0. {
        if (values[0].abs() == values[1].abs() && values[2].abs() == values[3].abs())
            || (values[0].abs() == values[3].abs() && values[2].abs() == values[1].abs())
        {
            return Ordering::Equal;
        }
        let left = values[0] * values[2];
        let right = values[1] * values[3];
        let difference = left - right;
        let bound = (left.abs() + right.abs()) * (8. * f64::EPSILON);
        // Normal products and the conservative bound exclude gradual-underflow
        // and rounded-cancellation uncertainty. Overflow falls through as well.
        if left.is_normal()
            && right.is_normal()
            && difference.is_finite()
            && difference.abs() > bound
        {
            return difference
                .partial_cmp(&0.)
                .expect("finite contour difference");
        }
    }
    // Q = v0*v2 − v1*v3 − L*v0 − L*v2 + L*v1 + L*v3;
    // the two L² terms cancel exactly. An f64 has an integer significand of at
    // most 53 bits and exponent −1074..971. A product therefore fits u128 with
    // exponent −2148..1942. At common exponent −2148 its top bit is at most
    // 4195; summing six terms adds at most three bits. 66*64 = 4224 suffices.
    let mut positive = [0u64; 66];
    let mut negative = [0u64; 66];
    for (a, b, subtract) in [
        (values[0], values[2], false),
        (values[1], values[3], true),
        (level, values[0], true),
        (level, values[2], true),
        (level, values[1], false),
        (level, values[3], false),
    ] {
        let (am, ae) = dyadic_parts(a);
        let (bm, be) = dyadic_parts(b);
        if am == 0 || bm == 0 {
            continue;
        }
        let destination = if a.is_sign_negative() ^ b.is_sign_negative() ^ subtract {
            &mut negative
        } else {
            &mut positive
        };
        add_dyadic_product(
            destination,
            u128::from(am) * u128::from(bm),
            (ae + be + 2148) as usize,
        );
    }
    positive.iter().rev().cmp(negative.iter().rev())
}

/// Absolute finite f64 represented exactly as an unsigned integer times 2^exp.
fn dyadic_parts(value: f64) -> (u64, i32) {
    let bits = value.to_bits();
    let fraction = bits & ((1u64 << 52) - 1);
    let exponent = ((bits >> 52) & 0x7ff) as i32;
    if exponent == 0 {
        (fraction, -1074)
    } else {
        (fraction | (1u64 << 52), exponent - 1023 - 52)
    }
}

fn add_dyadic_product(destination: &mut [u64; 66], product: u128, shift: usize) {
    let word = shift / 64;
    let bit = shift % 64;
    let low = product as u64;
    let high = (product >> 64) as u64;
    add_dyadic_word(destination, word, low << bit);
    if bit == 0 {
        add_dyadic_word(destination, word + 1, high);
    } else {
        add_dyadic_word(destination, word + 1, (low >> (64 - bit)) | (high << bit));
        add_dyadic_word(destination, word + 2, high >> (64 - bit));
    }
}

fn add_dyadic_word(destination: &mut [u64; 66], mut word: usize, mut value: u64) {
    while value != 0 {
        let (sum, carry) = destination[word].overflowing_add(value);
        destination[word] = sum;
        value = u64::from(carry);
        word += 1;
    }
}

/// Generated numerical CSV. Text cells are quoted/formula-neutralized; numbers stay numbers.
pub fn export_csv(item: &FieldAnalysisItem) -> Result<String> {
    if item.values.len() != item.definition.count()?
        || item.valid.len() != item.values.len()
        || item.values.iter().any(|value| !value.is_finite())
        || item.valid.iter().any(|valid| *valid > 1)
    {
        return Err("Invalid analysis cache for CSV export".into());
    }
    let factor = item.descriptor.display_factor()?;
    let mut output = String::new();
    output
        .try_reserve(
            item.values
                .len()
                .checked_mul(240)
                .unwrap_or(MAX_CSV_BYTES)
                .min(MAX_CSV_BYTES),
        )
        .map_err(|_| "Cannot allocate analysis CSV")?;
    output.push_str("sample,x,y,z,coordinate_unit,distance,distance_unit,value,value_unit,status,method,field,source_hash,sample_hash,quantity,declaration_origin,note\n");
    for index in 0..item.values.len() {
        let point = sample_position(&item.definition, index)?.map(|v| v * BOHR_TO_ANGSTROM);
        let distance = match &item.definition {
            AnalysisDefinition::Profile {
                start, end, count, ..
            } => (norm(sub(*end, *start)) * BOHR_TO_ANGSTROM * index as f64 / (count - 1) as f64)
                .to_string(),
            _ => String::new(),
        };
        let value = if item.valid[index] == 1 {
            let value = item.values[index] * factor;
            if !value.is_finite() {
                return Err("Display-unit conversion overflow; export raw units instead".into());
            }
            value.to_string()
        } else {
            String::new()
        };
        let row = format!(
            "{index},{},{},{},angstrom,{distance},angstrom,{value},{},{},{},{},{},{},{},{},{}\n",
            point[0],
            point[1],
            point[2],
            csv_text(item.descriptor.displayed_unit()),
            if item.valid[index] == 1 {
                "valid"
            } else {
                "outside"
            },
            csv_text(&item.method),
            csv_text(&item.field),
            csv_text(&item.source_hash),
            csv_text(&item.sample_hash),
            csv_text(&item.descriptor.quantity),
            csv_text(&item.descriptor.origin),
            csv_text(&item.descriptor.note)
        );
        if output
            .len()
            .checked_add(row.len())
            .is_none_or(|v| v > MAX_CSV_BYTES)
        {
            return Err("CSV exceeds the 32 MiB export budget".into());
        }
        output.push_str(&row);
    }
    Ok(output)
}

pub fn sample_fingerprint(source_hash: &str, definition: &AnalysisDefinition) -> Result<String> {
    fingerprint(
        &serde_json::json!({"domain":"field-samples-v1", "source_hash":source_hash,
        "definition":definition, "algorithm":SAMPLER_VERSION}),
    )
}

fn reciprocal(axes: [[f64; 3]; 3]) -> Result<[[f64; 3]; 3]> {
    let determinant = crate::determinant(axes);
    if !determinant.is_finite() || determinant == 0. {
        return Err("Grid transform is not quantitatively invertible".into());
    }
    let inverse = [
        scale(cross(axes[1], axes[2]), 1. / determinant),
        scale(cross(axes[2], axes[0]), 1. / determinant),
        scale(cross(axes[0], axes[1]), 1. / determinant),
    ];
    let condition = axes.iter().map(|a| norm(*a)).fold(0., f64::max)
        * inverse.iter().map(|a| norm(*a)).fold(0., f64::max);
    if inverse.iter().flatten().any(|v| !v.is_finite())
        || !condition.is_finite()
        || condition > 1e12
    {
        return Err("Grid transform is ill-conditioned for quantitative sampling".into());
    }
    Ok(inverse)
}

fn interpolate(grid: &Grid, inverse: [[f64; 3]; 3], point: [f64; 3]) -> Result<Option<f64>> {
    let delta = sub(point, grid.origin);
    let mut q = inverse.map(|axis| dot(delta, axis));
    if q.iter().any(|v| !v.is_finite()) {
        return Err("Quantitative grid coordinate overflow".into());
    }
    for axis in 0..3 {
        let maximum = (grid.dims[axis] - 1) as f64;
        let roundoff = 64.
            * f64::EPSILON
            * (1.
                + maximum
                + (0..3)
                    .map(|i| (delta[i] * inverse[axis][i]).abs())
                    .sum::<f64>())
            + 8. * f64::EPSILON
                * (0..3)
                    .map(|i| (point[i].abs() + grid.origin[i].abs()) * inverse[axis][i].abs())
                    .sum::<f64>();
        if !roundoff.is_finite() {
            return Err("Source coordinate precision is insufficient to resolve quantitative grid boundaries".into());
        }
        if q[axis] < -roundoff || q[axis] > maximum + roundoff {
            return Ok(None);
        }
        if roundoff > 1e-3 {
            return Err("Source coordinate precision is insufficient to resolve quantitative grid boundaries".into());
        }
        q[axis] = q[axis].clamp(0., maximum);
    }
    let low: [usize; 3] = std::array::from_fn(|i| (q[i].floor() as usize).min(grid.dims[i] - 2));
    let t: [f64; 3] = std::array::from_fn(|i| q[i] - low[i] as f64);
    let at = |x, y, z| {
        grid.values[((low[2] + z) * grid.dims[1] + low[1] + y) * grid.dims[0] + low[0] + x]
    };
    let bottom = lerp(
        lerp(at(0, 0, 0), at(1, 0, 0), t[0]),
        lerp(at(0, 1, 0), at(1, 1, 0), t[0]),
        t[1],
    );
    let top = lerp(
        lerp(at(0, 0, 1), at(1, 0, 1), t[0]),
        lerp(at(0, 1, 1), at(1, 1, 1), t[0]),
        t[1],
    );
    let value = lerp(bottom, top, t[2]);
    if !value.is_finite() {
        return Err("Grid interpolation produced a non-finite result".into());
    }
    Ok(Some(value))
}

fn sampling_method(doc: &Document, field: &str) -> &'static str {
    if doc.grids.iter().any(|grid| grid.id == field) {
        "source_grid_trilinear"
    } else {
        "canonical_gaussian_analytic"
    }
}

fn value_range(values: &[f64], valid: &[u32]) -> Option<[f64; 2]> {
    values
        .iter()
        .zip(valid)
        .filter(|(_, valid)| **valid == 1)
        .map(|(value, _)| *value)
        .fold(None, |range, value| {
            Some(match range {
                Some([a, b]) => [a.min(value), b.max(value)],
                None => [value, value],
            })
        })
}

fn fingerprint(value: &serde_json::Value) -> Result<String> {
    fn canonicalize(value: &mut serde_json::Value) {
        match value {
            serde_json::Value::Number(n) if n.is_f64() && n.as_f64() == Some(0.) => {
                *value = serde_json::json!(0.0)
            }
            serde_json::Value::Array(values) => values.iter_mut().for_each(canonicalize),
            serde_json::Value::Object(values) => values.values_mut().for_each(canonicalize),
            _ => (),
        }
    }
    let mut value = value.clone();
    canonicalize(&mut value);
    value.sort_all_objects();
    Ok(format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(&value).map_err(|e| e.to_string())?)
    ))
}

fn bounded_text(value: &str, maximum: usize, label: &str) -> Result<()> {
    if value.len() > maximum || value.chars().any(char::is_control) {
        return Err(format!("Invalid or oversized {label}"));
    }
    Ok(())
}
fn csv_text(value: &str) -> String {
    let text = if value.trim_start().starts_with(['=', '+', '-', '@']) {
        format!("'{value}")
    } else {
        value.into()
    };
    format!("\"{}\"", text.replace('"', "\"\""))
}
fn finite_point(point: [f64; 3]) -> Result<()> {
    if point.iter().all(|v| v.is_finite()) {
        Ok(())
    } else {
        Err("Analysis coordinates must be finite".into())
    }
}
fn close_point(a: [f64; 3], b: [f64; 3]) -> bool {
    a.into_iter()
        .zip(b)
        .all(|(a, b)| (a - b).abs() <= 32. * f64::EPSILON * (1. + a.abs().max(b.abs())))
}
fn normalized(a: [f64; 3]) -> Result<[f64; 3]> {
    let length = norm(a);
    if !length.is_finite() || length == 0. {
        return Err("Analysis direction is zero or degenerate".into());
    }
    Ok(a.map(|value| value / length))
}
fn norm(a: [f64; 3]) -> f64 {
    a[0].hypot(a[1]).hypot(a[2])
}
fn add(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    std::array::from_fn(|i| a[i] + b[i])
}
fn sub(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    std::array::from_fn(|i| a[i] - b[i])
}
fn scale(a: [f64; 3], s: f64) -> [f64; 3] {
    a.map(|v| v * s)
}
fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    a.into_iter().zip(b).map(|(a, b)| a * b).sum()
}
fn cross(a: [f64; 3], b: [f64; 3]) -> [f64; 3] {
    [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ]
}
fn lerp(a: f64, b: f64, t: f64) -> f64 {
    if t == 0. {
        a
    } else if t == 1. {
        b
    } else if a.is_sign_positive() == b.is_sign_positive() {
        a + (b - a) * t
    } else {
        a * (1. - t) + b * t
    }
}

#[cfg(test)]
mod contour_predicate_tests {
    use super::saddle_decider;
    use std::cmp::Ordering::{Equal, Greater, Less};

    #[test]
    fn exact_dyadic_predicate_handles_signed_products_ties_and_extreme_levels() {
        for (values, level, expected) in [
            ([2., 3., 4., -5.], 0., Greater),
            ([-2., -3., 4., 5.], 0., Greater),
            ([-3., -2., 5., 4.], 0., Less),
            ([1.5, -0.5, 1.5, -0.5], 0.5, Equal),
            ([f64::MAX, -f64::MAX, f64::MAX, -f64::MAX], 0., Equal),
            ([f64::MAX, -f64::MAX, f64::MAX, -f64::MAX], 1., Less),
            ([f64::MAX, -f64::MAX, f64::MAX, -f64::MAX], -1., Greater),
            ([1., -1., 1., -1.], f64::from_bits(1), Less),
        ] {
            assert_eq!(
                saddle_decider(values, level),
                expected,
                "{values:?}, {level}"
            );
        }
    }
}
