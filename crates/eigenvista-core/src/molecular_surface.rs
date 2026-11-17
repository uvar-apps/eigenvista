//! Molecular SES/SAS generation from accepted source atoms, independently of QC fields.

use crate::{BOHR_TO_ANGSTROM, Document, MAX_VERTICES, Result, valid_color};
use serde::{Deserialize, Serialize};
use sesmesh::{Control, Sphere, SurfaceParams, radii::BuiltinRadii, structure::Element};
use sha2::{Digest, Sha256};
use std::{
    cell::RefCell,
    collections::BTreeMap,
    sync::atomic::{AtomicBool, Ordering},
};

/// Fixed, provenance-bearing scientific engine, including the reviewed WASM bridge patch.
pub const ENGINE: &str = "sesmesh-1.1.2+eigenvista-wasm-v1";
/// Engine estimate limit; accepted documents and renderer resources need additional memory.
pub const MAX_ENGINE_BYTES: u64 = 256 * 1024 * 1024;
/// Bound output topology before converting buffers or publishing a replacement.
pub const MAX_TRIANGLES: usize = 4_000_000;
/// Bound saved molecular surface count independently of legacy quantum surfaces.
pub const MAX_MOLECULAR_SURFACES: usize = 32;

/// The solvent-centre boundary (SAS) or the solvent-excluded molecular boundary (SES).
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MolecularSurfaceKind {
    Ses,
    Sas,
}

/// Element-only radius choices; united-atom/explicit-H mixing is deliberately excluded.
#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum RadiiSet {
    Bondi,
    Alvarez,
}

/// An explicit positive element radius in angstrom, never a silent missing-radius fallback.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct RadiusOverride {
    pub element: u16,
    pub radius_angstrom: f64,
}

/// Complete reproducible generation request. Empty atom indices explicitly mean all atoms.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MolecularSurfaceRequest {
    pub id: String,
    pub label: String,
    pub kind: MolecularSurfaceKind,
    pub atom_indices: Vec<usize>,
    pub radii_set: RadiiSet,
    #[serde(default)]
    pub radii_overrides: Vec<RadiusOverride>,
    pub probe_radius: f64,
    pub spacing: f64,
    pub color: String,
    pub opacity: f64,
}

/// Scientific and allocation diagnostics; timings are informative, not cache identity.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MolecularSurfaceStats {
    pub area_angstrom2: f64,
    pub volume_angstrom3: f64,
    pub components: usize,
    pub cavities: usize,
    pub estimated_engine_bytes: u64,
    pub elapsed_seconds: f64,
    pub kernel: String,
}

/// Cached molecular mesh and its geometry source. Positions are bohr; normals are unitless.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq)]
#[serde(deny_unknown_fields)]
pub struct MolecularSurface {
    pub id: String,
    pub label: String,
    pub kind: MolecularSurfaceKind,
    pub atom_indices: Vec<usize>,
    pub radii_set: RadiiSet,
    pub radii_overrides: Vec<RadiusOverride>,
    pub radii_angstrom: Vec<f64>,
    pub probe_radius: f64,
    /// Requested and actual spacing are identical: automatic coarsening is disabled.
    pub spacing: f64,
    pub cavity_policy: String,
    pub engine: String,
    pub source_hash: String,
    pub local_origin_bohr: [f64; 3],
    pub precision: String,
    pub positions: Vec<f64>,
    pub normals: Vec<f64>,
    pub indices: Vec<u32>,
    /// Original document atom indices, not the compact sphere input indices.
    pub vertex_atoms: Vec<u32>,
    pub color: String,
    pub opacity: f64,
    pub visible: bool,
    pub stats: MolecularSurfaceStats,
    pub warnings: Vec<String>,
}

fn text(value: &str, maximum: usize, what: &str) -> Result<()> {
    if value.is_empty() || value.len() > maximum || value.chars().any(char::is_control) {
        return Err(format!("Invalid molecular-surface {what}"));
    }
    Ok(())
}

fn appearance(color: &str, opacity: f64) -> Result<()> {
    if !valid_color(color) || !opacity.is_finite() || !(0.0..=1.0).contains(&opacity) {
        return Err("Invalid molecular-surface appearance".into());
    }
    Ok(())
}

fn geometry_parameters(probe: f64, spacing: f64) -> Result<()> {
    if !probe.is_finite()
        || !(0.05..=10.0).contains(&probe)
        || !spacing.is_finite()
        || !(0.05..=3.0).contains(&spacing)
    {
        return Err("Molecular surface requires probe 0.05–10 Å and spacing 0.05–3 Å".into());
    }
    Ok(())
}

impl MolecularSurfaceRequest {
    /// Resolve explicit original atoms and radii without changing the accepted document.
    pub fn resolve(&self, doc: &Document) -> Result<(Vec<usize>, Vec<f64>)> {
        text(&self.id, 128, "ID")?;
        text(&self.label, 256, "label")?;
        appearance(&self.color, self.opacity)?;
        geometry_parameters(self.probe_radius, self.spacing)?;
        if doc.atoms.is_empty() || doc.atoms.len() > 100_000 {
            return Err("Molecular surfaces require 1–100,000 accepted atoms".into());
        }
        let indices: Vec<_> = if self.atom_indices.is_empty() {
            (0..doc.atoms.len()).collect()
        } else {
            if self.atom_indices.len() > doc.atoms.len() {
                return Err("Molecular surface selection exceeds source atom count".into());
            }
            self.atom_indices.clone()
        };
        if indices.iter().any(|&i| i >= doc.atoms.len())
            || indices.windows(2).any(|pair| pair[0] >= pair[1])
        {
            return Err(
                "Molecular surface atom indices must be sorted, unique and in range".into(),
            );
        }
        let overrides = override_table(&self.radii_overrides)?;
        let table = match self.radii_set {
            RadiiSet::Bondi => BuiltinRadii::Bondi,
            RadiiSet::Alvarez => BuiltinRadii::Alvarez,
        };
        let mut radii = Vec::new();
        radii
            .try_reserve_exact(indices.len())
            .map_err(|_| "Cannot allocate molecular radii")?;
        let mut missing = Vec::new();
        for &i in &indices {
            let atom = &doc.atoms[i];
            if !atom.position.iter().all(|p| p.is_finite()) {
                return Err("Molecular surface source coordinates must be finite".into());
            }
            let element = u8::try_from(atom.element)
                .ok()
                .and_then(Element::from_atomic_number)
                .ok_or("Invalid molecular surface element")?;
            match overrides
                .get(&atom.element)
                .copied()
                .or_else(|| table.element_radius(element))
            {
                Some(radius) => radii.push(radius),
                None => {
                    if !missing.contains(&atom.element) {
                        missing.push(atom.element);
                    }
                }
            }
        }
        if !missing.is_empty() {
            return Err(format!(
                "Selected radius table has no radius for atomic numbers {missing:?}; choose another table or explicit overrides"
            ));
        }
        Ok((indices, radii))
    }
}

fn override_table(values: &[RadiusOverride]) -> Result<BTreeMap<u16, f64>> {
    if values.len() > 118 {
        return Err("Too many molecular radius overrides".into());
    }
    let mut result = BTreeMap::new();
    for value in values {
        if !(1..=118).contains(&value.element)
            || !value.radius_angstrom.is_finite()
            || !(0.1..=10.0).contains(&value.radius_angstrom)
            || result
                .insert(value.element, value.radius_angstrom)
                .is_some()
        {
            return Err("Radius overrides require unique elements and radii 0.1–10 Å".into());
        }
    }
    Ok(result)
}

fn number(hash: &mut Sha256, value: f64) {
    // JSON round trips canonicalize negative zero without changing the geometry.
    hash.update(if value == 0.0 { 0.0f64 } else { value }.to_le_bytes());
}

/// Fingerprint only molecular geometry and its numerical definition, never quantum data.
pub fn source_hash(
    doc: &Document,
    kind: MolecularSurfaceKind,
    indices: &[usize],
    radii: &[f64],
    probe: f64,
    spacing: f64,
) -> Result<String> {
    if indices.len() != radii.len() || indices.iter().any(|&i| i >= doc.atoms.len()) {
        return Err("Invalid molecular source fingerprint dimensions".into());
    }
    let mut hash = Sha256::new();
    hash.update(b"eigenvista-molecular-surface-v1\0");
    hash.update(ENGINE.as_bytes());
    hash.update(match kind {
        MolecularSurfaceKind::Ses => b"ses",
        MolecularSurfaceKind::Sas => b"sas",
    });
    hash.update(
        b"cavities-keep;smoothing-0;decimation-none;coarsening-off;local-origin-first-atom\0",
    );
    hash.update((indices.len() as u64).to_le_bytes());
    number(&mut hash, probe);
    number(&mut hash, spacing);
    for (&index, &radius) in indices.iter().zip(radii) {
        hash.update((index as u64).to_le_bytes());
        hash.update(doc.atoms[index].element.to_le_bytes());
        for coordinate in doc.atoms[index].position {
            number(&mut hash, coordinate);
        }
        number(&mut hash, radius);
    }
    Ok(format!("{:x}", hash.finalize()))
}

impl MolecularSurface {
    /// Validate loaded cache and source association without rerunning Sesmesh.
    pub fn validate(&self, doc: &Document) -> Result<()> {
        let request = MolecularSurfaceRequest {
            id: self.id.clone(),
            label: self.label.clone(),
            kind: self.kind,
            atom_indices: self.atom_indices.clone(),
            radii_set: self.radii_set,
            radii_overrides: self.radii_overrides.clone(),
            probe_radius: self.probe_radius,
            spacing: self.spacing,
            color: self.color.clone(),
            opacity: self.opacity,
        };
        let (indices, radii) = request.resolve(doc)?;
        if self.atom_indices.is_empty()
            || indices != self.atom_indices
            || radii != self.radii_angstrom
            || self.engine != ENGINE
            || self.cavity_policy != "keep"
            || self.precision != "f32-local-angstrom;f64-world-bohr"
            || self.local_origin_bohr != doc.atoms[indices[0]].position
            || self.source_hash
                != source_hash(
                    doc,
                    self.kind,
                    &indices,
                    &radii,
                    self.probe_radius,
                    self.spacing,
                )?
        {
            return Err("Molecular surface source or engine provenance does not match".into());
        }
        let vertices = self.positions.len() / 3;
        if vertices == 0
            || vertices > MAX_VERTICES
            || !self.positions.len().is_multiple_of(3)
            || self.normals.len() != self.positions.len()
            || self.vertex_atoms.len() != vertices
            || self.indices.is_empty()
            || !self.indices.len().is_multiple_of(3)
            || self.indices.len() / 3 > MAX_TRIANGLES
            || !self
                .positions
                .iter()
                .chain(&self.normals)
                .all(|v| v.is_finite())
            || self.indices.iter().any(|&i| i as usize >= vertices)
            || self
                .vertex_atoms
                .iter()
                .any(|&i| self.atom_indices.binary_search(&(i as usize)).is_err())
            || self
                .normals
                .as_chunks::<3>()
                .0
                .iter()
                .any(|n| (n[0].hypot(n[1]).hypot(n[2]) - 1.0).abs() > 0.02)
        {
            return Err("Invalid or over-budget molecular mesh arrays".into());
        }
        if !self.stats.area_angstrom2.is_finite()
            || self.stats.area_angstrom2 <= 0.0
            || !self.stats.volume_angstrom3.is_finite()
            || self.stats.volume_angstrom3 <= 0.0
            || !self.stats.elapsed_seconds.is_finite()
            || self.stats.elapsed_seconds < 0.0
            || self.stats.estimated_engine_bytes > MAX_ENGINE_BYTES
            || self.stats.components == 0
            || self.stats.cavities > self.stats.components
            || self.stats.kernel.len() > 64
            || self.warnings.len() > 128
            || self.warnings.iter().any(|w| w.len() > 1024)
        {
            return Err("Invalid molecular surface diagnostics".into());
        }
        Ok(())
    }
}

/// Generate an isolated surface of the selected source atoms; phase counts are stage-local.
/// A callback error requests cooperative cancellation. Browser hosts can also terminate
/// the owning Worker while synchronous WASM is running; no unsafe JS Sync bridge is used.
pub fn create(
    doc: &Document,
    request: &MolecularSurfaceRequest,
    mut progress: impl FnMut(&str, u64, u64) -> Result<()>,
) -> Result<MolecularSurface> {
    let (atom_indices, radii_angstrom) = request.resolve(doc)?;
    let local_origin_bohr = doc.atoms[atom_indices[0]].position;
    let mut spheres = Vec::new();
    spheres
        .try_reserve_exact(atom_indices.len())
        .map_err(|_| "Cannot allocate molecular spheres")?;
    for (&index, &radius) in atom_indices.iter().zip(&radii_angstrom) {
        let center = std::array::from_fn(|axis| {
            (doc.atoms[index].position[axis] - local_origin_bohr[axis]) * BOHR_TO_ANGSTROM
        });
        if !center.iter().all(|v| v.is_finite()) || center.iter().any(|v| v.abs() > 100_000.0) {
            return Err("Molecular surface local coordinate span exceeds 100,000 Å".into());
        }
        spheres.push(Sphere::new(center, radius));
    }
    let params = match request.kind {
        MolecularSurfaceKind::Ses => SurfaceParams::ses(request.probe_radius),
        MolecularSurfaceKind::Sas => SurfaceParams::sas(request.probe_radius),
    }
    .with_spacing(request.spacing)
    .with_max_memory(MAX_ENGINE_BYTES)
    .with_auto_coarsen(false)
    .with_smoothing(0);
    let cancelled = AtomicBool::new(false);
    let error = RefCell::new(None);
    let observer = RefCell::new(&mut progress);
    let callback = |p: sesmesh::Progress| {
        if error.borrow().is_none()
            && let Err(e) = observer.borrow_mut()(p.stage.name(), p.done, p.total)
        {
            *error.borrow_mut() = Some(e);
            cancelled.store(true, Ordering::Relaxed);
        }
    };
    let control = Control::new()
        .with_cancel(&cancelled)
        .with_progress(&callback);
    let output = sesmesh::compute_surface_with(&spheres, &params, &control);
    if let Some(error) = error.into_inner() {
        return Err(error);
    }
    let output = output.map_err(|error| format!("Molecular surface: {error}"))?;
    if output.stats.spacing != request.spacing {
        return Err("Molecular surface engine changed the requested spacing".into());
    }
    let vertices = output.mesh.positions.len();
    if vertices > MAX_VERTICES || output.mesh.triangles.len() > MAX_TRIANGLES {
        return Err(
            "Molecular surface exceeds mesh allocation limits; choose a coarser spacing".into(),
        );
    }
    let mut positions = Vec::new();
    let mut normals = Vec::new();
    let mut indices = Vec::new();
    let mut vertex_atoms = Vec::new();
    positions
        .try_reserve_exact(vertices.checked_mul(3).ok_or("Mesh size overflow")?)
        .map_err(|_| "Cannot allocate molecular positions")?;
    normals
        .try_reserve_exact(vertices * 3)
        .map_err(|_| "Cannot allocate molecular normals")?;
    indices
        .try_reserve_exact(
            output
                .mesh
                .triangles
                .len()
                .checked_mul(3)
                .ok_or("Mesh size overflow")?,
        )
        .map_err(|_| "Cannot allocate molecular triangles")?;
    vertex_atoms
        .try_reserve_exact(vertices)
        .map_err(|_| "Cannot allocate molecular atom identities")?;
    for p in &output.mesh.positions {
        positions.extend(
            (0..3).map(|axis| f64::from(p[axis]) / BOHR_TO_ANGSTROM + local_origin_bohr[axis]),
        );
    }
    normals.extend(output.mesh.normals.iter().flatten().map(|&v| f64::from(v)));
    indices.extend(output.mesh.triangles.iter().flatten().copied());
    for &atom in &output.mesh.vertex_atom {
        vertex_atoms.push(
            *atom_indices
                .get(atom as usize)
                .ok_or("Invalid surface atom attribution")? as u32,
        );
    }
    let surface = MolecularSurface {
        id: request.id.clone(),
        label: request.label.clone(),
        kind: request.kind,
        source_hash: source_hash(
            doc,
            request.kind,
            &atom_indices,
            &radii_angstrom,
            request.probe_radius,
            output.stats.spacing,
        )?,
        atom_indices,
        radii_set: request.radii_set,
        radii_overrides: request.radii_overrides.clone(),
        radii_angstrom,
        probe_radius: request.probe_radius,
        spacing: output.stats.spacing,
        cavity_policy: "keep".into(),
        engine: ENGINE.into(),
        local_origin_bohr,
        precision: "f32-local-angstrom;f64-world-bohr".into(),
        positions,
        normals,
        indices,
        vertex_atoms,
        color: request.color.clone(),
        opacity: request.opacity,
        visible: true,
        stats: MolecularSurfaceStats {
            area_angstrom2: output.stats.area,
            volume_angstrom3: output.stats.volume,
            components: output.stats.components,
            cavities: output.stats.cavities,
            estimated_engine_bytes: output.stats.estimated_memory.unwrap_or(0),
            elapsed_seconds: output.stats.timings.total().as_secs_f64(),
            kernel: output.stats.simd.into(),
        },
        warnings: output
            .diagnostics
            .warnings()
            .iter()
            .map(ToString::to_string)
            .collect(),
    };
    surface.validate(doc)?;
    Ok(surface)
}
