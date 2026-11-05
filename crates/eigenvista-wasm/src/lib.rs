use eigenvista_core::{Document, Grid, View, compute, fixtures, valid_color};
use wasm_bindgen::prelude::*;
fn err(e: impl ToString) -> JsValue {
    JsValue::from_str(&e.to_string())
}
fn parse(s: &str) -> Result<Document, JsValue> {
    let d: Document = serde_json::from_str(s).map_err(err)?;
    d.validate().map_err(err)?;
    Ok(d)
}
#[wasm_bindgen]
pub fn example(open_shell: bool) -> String {
    serde_json::to_string(&if open_shell {
        fixtures::open_shell()
    } else {
        fixtures::hydrogen_pair()
    })
    .unwrap()
}
#[wasm_bindgen]
pub fn validate(json: &str) -> Result<(), JsValue> {
    parse(json).map(|_| ())
}
#[wasm_bindgen]
pub fn encode(json: &str) -> Result<Vec<u8>, JsValue> {
    eigenvista_format::encode(&parse(json)?).map_err(err)
}
#[wasm_bindgen]
pub fn decode(bytes: &[u8]) -> Result<String, JsValue> {
    serde_json::to_string(&eigenvista_format::decode(bytes).map_err(err)?).map_err(err)
}
#[wasm_bindgen]
pub fn import_text(text: &str, name: &str) -> Result<String, JsValue> {
    let result = eigenvista_import::import_bytes(text.as_bytes(), name).map_err(err)?;
    serde_json::to_string(&result.document).map_err(err)
}
#[wasm_bindgen]
pub fn import_document(bytes: &[u8], name: &str) -> Result<String, JsValue> {
    serde_json::to_string(&eigenvista_import::import_bytes(bytes, name).map_err(err)?).map_err(err)
}
#[wasm_bindgen]
pub fn sample(json: &str, field: &str, resolution: usize) -> Result<String, JsValue> {
    serde_json::to_string(&compute::sample(&parse(json)?, field, resolution).map_err(err)?)
        .map_err(err)
}
#[wasm_bindgen]
pub fn surfaces(json: &str, grid_json: &str, field: &str, iso: f64) -> Result<String, JsValue> {
    let d = parse(json)?;
    let g = serde_json::from_str(grid_json).map_err(err)?;
    let hash = compute::source_hash(&d, field).map_err(err)?;
    mesh_surfaces(&d.view, &g, field, &hash, iso, |_, _| Ok(()))
}

fn report_progress(
    callback: &Option<js_sys::Function>,
    completed: usize,
    total: usize,
) -> Result<(), JsValue> {
    if let Some(callback) = callback {
        callback.call2(
            &JsValue::NULL,
            &JsValue::from_f64(completed as f64),
            &JsValue::from_f64(total as f64),
        )?;
    }
    Ok(())
}

fn mesh_surfaces(
    view: &View,
    g: &Grid,
    field: &str,
    hash: &str,
    iso: f64,
    mut progress: impl FnMut(usize, usize) -> Result<(), JsValue>,
) -> Result<String, JsValue> {
    let mut surfaces = vec![];
    progress(0, 2)?;
    for (index, (level, color)) in [(iso, &view.positive_color), (-iso, &view.negative_color)]
        .into_iter()
        .enumerate()
    {
        let s = compute::mesh(g, level, field, hash, color, view.opacity).map_err(err)?;
        if !s.indices.is_empty() {
            surfaces.push(s);
        }
        progress(index + 1, 2)?;
    }
    serde_json::to_string(&surfaces).map_err(err)
}

/// Retain the authoritative f64 samples inside WASM instead of roundtripping grid JSON.
#[wasm_bindgen]
pub struct SampledField {
    grid: Grid,
    field: String,
    hash: String,
}

impl SampledField {
    fn from_document(
        document: &Document,
        field: &str,
        resolution: usize,
        progress: Option<js_sys::Function>,
    ) -> Result<Self, JsValue> {
        let hash = compute::source_hash(document, field).map_err(err)?;
        Ok(Self {
            grid: compute::sample_with_progress(document, field, resolution, |done, total| {
                report_progress(&progress, done, total)
                    .map_err(|error| format!("Progress callback failed: {error:?}"))
            })
            .map_err(err)?,
            field: field.into(),
            hash,
        })
    }
}

#[wasm_bindgen]
impl SampledField {
    #[wasm_bindgen(constructor)]
    pub fn new(json: &str, field: &str, resolution: usize) -> Result<SampledField, JsValue> {
        Self::with_progress(json, field, resolution, None)
    }

    pub fn with_progress(
        json: &str,
        field: &str,
        resolution: usize,
        progress: Option<js_sys::Function>,
    ) -> Result<SampledField, JsValue> {
        let document = parse(json)?;
        Self::from_document(&document, field, resolution, progress)
    }

    pub fn metadata(&self) -> Result<String, JsValue> {
        let grid = &self.grid;
        serde_json::to_string(&serde_json::json!({
            "id": grid.id,
            "label": grid.label,
            "quantity": grid.quantity,
            "origin": grid.origin,
            "axes": grid.axes,
            "dims": grid.dims,
        }))
        .map_err(err)
    }

    pub fn display_values(&self) -> Result<Vec<f32>, JsValue> {
        let mut values = Vec::new();
        values
            .try_reserve_exact(self.grid.values.len())
            .map_err(|_| {
                err("Insufficient memory for the display grid; reduce the grid resolution")
            })?;
        values.extend(self.grid.values.iter().map(|value| *value as f32));
        Ok(values)
    }

    pub fn surfaces(&self, json: &str, iso: f64) -> Result<String, JsValue> {
        self.surfaces_with_progress(json, iso, None)
    }

    pub fn surfaces_with_progress(
        &self,
        json: &str,
        iso: f64,
        progress: Option<js_sys::Function>,
    ) -> Result<String, JsValue> {
        let document = parse(json)?;
        if compute::source_hash(&document, &self.field).map_err(err)? != self.hash {
            return Err(err(
                "Cached samples do not match the current scientific inputs",
            ));
        }
        mesh_surfaces(
            &document.view,
            &self.grid,
            &self.field,
            &self.hash,
            iso,
            |done, total| report_progress(&progress, done, total),
        )
    }
}

/// A validated immutable source and one sampled field, scoped to a worker lifetime.
#[wasm_bindgen]
pub struct RegisteredDocument {
    document: Document,
    cached: Option<(usize, SampledField)>,
}

impl RegisteredDocument {
    fn sampled(&self) -> Result<&SampledField, JsValue> {
        self.cached
            .as_ref()
            .map(|(_, field)| field)
            .ok_or_else(|| err("No sampled field is prepared"))
    }
}

#[wasm_bindgen]
impl RegisteredDocument {
    #[wasm_bindgen(constructor)]
    pub fn new(json: &str) -> Result<Self, JsValue> {
        let mut document = parse(json)?;
        // Saved geometry was validated above, but cannot affect a new field.
        document.surfaces = Vec::new();
        Ok(Self {
            document,
            cached: None,
        })
    }

    /// Return true only when sampling ran; field/resolution hits emit no progress.
    pub fn prepare(
        &mut self,
        field: &str,
        resolution: usize,
        progress: Option<js_sys::Function>,
    ) -> Result<bool, JsValue> {
        if self
            .cached
            .as_ref()
            .is_some_and(|(cached_resolution, cached)| {
                *cached_resolution == resolution && cached.field == field
            })
        {
            return Ok(false);
        }
        // Drop the previous f64 allocation before attempting its replacement.
        self.cached = None;
        let sampled = SampledField::from_document(&self.document, field, resolution, progress)?;
        self.cached = Some((resolution, sampled));
        Ok(true)
    }

    pub fn metadata(&self) -> Result<String, JsValue> {
        self.sampled()?.metadata()
    }

    pub fn display_values(&self) -> Result<Vec<f32>, JsValue> {
        self.sampled()?.display_values()
    }

    /// Mesh the owned samples using validated current presentation, without source JSON.
    pub fn surfaces(
        &self,
        iso: f64,
        positive_color: &str,
        negative_color: &str,
        opacity: f64,
        progress: Option<js_sys::Function>,
    ) -> Result<String, JsValue> {
        if !valid_color(positive_color)
            || !valid_color(negative_color)
            || !opacity.is_finite()
            || !(0. ..=1.).contains(&opacity)
            || !iso.is_finite()
            || iso <= 0.
            || !(iso as f32).is_finite()
        {
            return Err(err("Invalid surface view settings"));
        }
        let sampled = self.sampled()?;
        let view = View {
            positive_color: positive_color.into(),
            negative_color: negative_color.into(),
            opacity,
            isovalue: iso,
            ..self.document.view.clone()
        };
        mesh_surfaces(
            &view,
            &sampled.grid,
            &sampled.field,
            &sampled.hash,
            iso,
            |done, total| report_progress(&progress, done, total),
        )
    }
}

#[wasm_bindgen]
pub fn point(json: &str, field: &str, x: f64, y: f64, z: f64) -> Result<f64, JsValue> {
    compute::evaluate(&parse(json)?, field, [x, y, z])
        .map(|v| v.0)
        .map_err(err)
}

/// Value followed by the x/y/z analytic derivatives in atomic units.
#[wasm_bindgen]
pub fn point_with_gradient(
    json: &str,
    field: &str,
    x: f64,
    y: f64,
    z: f64,
) -> Result<Vec<f64>, JsValue> {
    let (value, gradient) = compute::evaluate(&parse(json)?, field, [x, y, z]).map_err(err)?;
    Ok(vec![value, gradient[0], gradient[1], gradient[2]])
}
