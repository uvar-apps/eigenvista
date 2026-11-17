//! Bounded inspection bridge. Mesh/sample payloads cross WASM as typed buffers.
use super::{err, parse, report_progress};
use eigenvista_core::{Document, field_analysis, inspection, molecular_surface};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn inspection_measure(json: &str, request: &str) -> Result<String, JsValue> {
    let doc = parse(json)?;
    let request = serde_json::from_str(request).map_err(err)?;
    serde_json::to_string(&inspection::measure(&doc, &request).map_err(err)?).map_err(err)
}

#[wasm_bindgen]
pub fn inspection_neighborhood(
    json: &str,
    request: &str,
    progress: Option<js_sys::Function>,
) -> Result<Vec<u32>, JsValue> {
    let doc = parse(json)?;
    let request = serde_json::from_str(request).map_err(err)?;
    inspection::neighborhood_with_progress(&doc, &request, |done, total| {
        report_progress(&progress, done, total).map_err(|e| format!("{e:?}"))
    })
    .map(|indices| indices.into_iter().map(|i| i as u32).collect())
    .map_err(err)
}

#[wasm_bindgen]
pub fn inspection_measurements(json: &str) -> Result<String, JsValue> {
    let doc = parse(json)?;
    let results = doc
        .annotations
        .as_ref()
        .map(|annotations| {
            annotations
                .measurements
                .iter()
                .map(|definition| inspection::measure(&doc, &definition.request()))
                .collect::<eigenvista_core::Result<Vec<_>>>()
        })
        .transpose()
        .map_err(err)?
        .unwrap_or_default();
    serde_json::to_string(&results).map_err(err)
}

/// Exact publication accounting is intentionally separate from QC registration.
#[wasm_bindgen]
pub fn inspection_validate(json: &str) -> Result<(), JsValue> {
    let doc: Document = serde_json::from_str(json).map_err(err)?;
    eigenvista_format::validate_document(&doc).map_err(err)
}

#[wasm_bindgen]
pub fn analysis_plane_atoms(
    json: &str,
    atoms: Vec<u32>,
    extent: Vec<f64>,
    dims: Vec<u32>,
) -> Result<String, JsValue> {
    let atoms: [usize; 3] = atoms
        .into_iter()
        .map(|v| v as usize)
        .collect::<Vec<_>>()
        .try_into()
        .map_err(|_| err("An atom-defined plane requires three ordered atoms"))?;
    let extent: [f64; 2] = extent
        .try_into()
        .map_err(|_| err("A plane requires two extents"))?;
    let dims: [usize; 2] = dims
        .into_iter()
        .map(|v| v as usize)
        .collect::<Vec<_>>()
        .try_into()
        .map_err(|_| err("A plane requires two dimensions"))?;
    serde_json::to_string(
        &field_analysis::plane_through_atoms(&parse(json)?, atoms, extent, dims).map_err(err)?,
    )
    .map_err(err)
}

#[wasm_bindgen]
pub fn analysis_contours(json: &str) -> Result<Vec<f64>, JsValue> {
    let item = serde_json::from_str(json).map_err(err)?;
    let segments = field_analysis::contours(&item).map_err(err)?;
    let mut values = Vec::new();
    values
        .try_reserve_exact(
            segments
                .len()
                .checked_mul(7)
                .ok_or_else(|| err("Contour count overflow"))?,
        )
        .map_err(|_| err("Cannot allocate contour transfer"))?;
    for s in segments {
        values.extend([
            s.level, s.start[0], s.start[1], s.start[2], s.end[0], s.end[1], s.end[2],
        ]);
    }
    Ok(values)
}

#[wasm_bindgen]
pub fn analysis_csv(json: &str) -> Result<String, JsValue> {
    field_analysis::export_csv(&serde_json::from_str(json).map_err(err)?).map_err(err)
}

/// Resolve only a bounded page, without reparsing a field source or full cache.
#[wasm_bindgen]
pub fn analysis_sample_rows(
    definition: &str,
    values: Vec<f64>,
    valid: Vec<u32>,
    offset: usize,
) -> Result<String, JsValue> {
    let definition: field_analysis::AnalysisDefinition =
        serde_json::from_str(definition).map_err(err)?;
    let count = definition.count().map_err(err)?;
    if values.len() > 100
        || values.len() != valid.len()
        || offset
            .checked_add(values.len())
            .is_none_or(|end| end > count)
        || values.iter().any(|v| !v.is_finite())
        || valid.iter().any(|v| *v > 1)
    {
        return Err(err("Invalid bounded sample page"));
    }
    let profile_length =
        if let field_analysis::AnalysisDefinition::Profile { start, end, .. } = &definition {
            Some(
                (end[0] - start[0])
                    .hypot(end[1] - start[1])
                    .hypot(end[2] - start[2])
                    * eigenvista_core::BOHR_TO_ANGSTROM,
            )
        } else {
            None
        };
    let mut rows = Vec::with_capacity(values.len());
    for (index, value) in values.iter().enumerate() {
        let position = field_analysis::sample_position(&definition, offset + index).map_err(err)?;
        if position.iter().any(|v| !v.is_finite()) || profile_length.is_some_and(|v| !v.is_finite())
        {
            return Err(err("Nonfinite sample coordinates"));
        }
        let distance =
            profile_length.map(|length| length * (offset + index) as f64 / (count - 1) as f64);
        rows.push(serde_json::json!({"index":offset+index,"value":if valid[index]==1 {Some(value)}else{None},
            "status":if valid[index]==1 {"valid"}else{"outside"},"position":position,"distanceAngstrom":distance}));
    }
    serde_json::to_string(&serde_json::json!({"items":rows,"profileLengthAngstrom":profile_length}))
        .map_err(err)
}

#[wasm_bindgen]
pub fn molecular_surface(
    json: &str,
    request: &str,
    progress: Option<js_sys::Function>,
) -> Result<MolecularMesh, JsValue> {
    let doc = parse(json)?;
    let request = serde_json::from_str(request).map_err(err)?;
    let surface = molecular_surface::create(&doc, &request, |stage, done, total| {
        if let Some(callback) = &progress {
            callback
                .call3(
                    &JsValue::NULL,
                    &JsValue::from_str(stage),
                    &JsValue::from_f64(done as f64),
                    &JsValue::from_f64(total as f64),
                )
                .map_err(|e| format!("Surface progress callback failed: {e:?}"))?;
        }
        Ok(())
    })
    .map_err(err)?;
    Ok(MolecularMesh { surface })
}

#[wasm_bindgen]
pub struct MolecularMesh {
    surface: molecular_surface::MolecularSurface,
}
#[wasm_bindgen]
impl MolecularMesh {
    pub fn take_positions(&mut self) -> Vec<f64> {
        std::mem::take(&mut self.surface.positions)
    }
    pub fn take_normals(&mut self) -> Vec<f64> {
        std::mem::take(&mut self.surface.normals)
    }
    pub fn take_indices(&mut self) -> Vec<u32> {
        std::mem::take(&mut self.surface.indices)
    }
    pub fn take_vertex_atoms(&mut self) -> Vec<u32> {
        std::mem::take(&mut self.surface.vertex_atoms)
    }
    /// Call after taking the large buffers, which remain empty placeholders here
    /// only for the transfer metadata; the worker assembles the complete result.
    pub fn metadata(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.surface).map_err(err)
    }
}

#[wasm_bindgen]
pub struct QuantitativeResult {
    item: field_analysis::FieldAnalysisItem,
}
impl QuantitativeResult {
    pub(crate) fn new(item: field_analysis::FieldAnalysisItem) -> Self {
        Self { item }
    }
}
#[wasm_bindgen]
impl QuantitativeResult {
    pub fn take_values(&mut self) -> Vec<f64> {
        std::mem::take(&mut self.item.values)
    }
    pub fn take_valid(&mut self) -> Vec<u32> {
        std::mem::take(&mut self.item.valid)
    }
    pub fn metadata(&self) -> Result<String, JsValue> {
        serde_json::to_string(&self.item).map_err(err)
    }
}
