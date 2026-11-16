//! Model-aware numeric packing for the unchanged preview profile.
//!
//! Arrays are read directly from typed model slices. Only scalar metadata and
//! array references enter the JSON tree; numeric payloads are never JSON Values.

use super::{Array, PreviewBudget, digest};
use eigenvista_core::{
    Atom, BasisFunction, Density, Document, Grid, Orbital, Result, Surface, Term,
};
use serde_json::{Value, json};
use std::collections::BTreeMap;

pub(super) struct PackedDocument {
    pub document: Value,
    pub arrays: BTreeMap<String, Array>,
    pub entries: Vec<(String, Vec<u8>)>,
}

struct Packer {
    arrays: BTreeMap<String, Array>,
    entries: Vec<(String, Vec<u8>)>,
    array_bytes: usize,
    budget: PreviewBudget,
}

pub(super) fn pack(doc: &Document, budget: PreviewBudget) -> Result<PackedDocument> {
    let mut packer = Packer {
        arrays: BTreeMap::new(),
        entries: vec![],
        array_bytes: 0,
        budget,
    };
    // Exhaustive patterns make new model fields a compiler error rather than a
    // silently omitted native field. JSON object keys retain their sorted order.
    let Document {
        id,
        title,
        atoms,
        structure,
        annotations,
        molecular_surfaces,
        field_analysis,
        bonds,
        basis,
        orbitals,
        densities,
        grids,
        surfaces,
        view,
        provenance,
    } = doc;
    // Numeric emission follows sorted document keys, rather than model field order.
    let atoms = packer.atoms(atoms)?;
    let basis = packer.basis(basis)?;
    let bonds = packer.usize_row(
        None,
        0,
        vec![bonds.len(), 2],
        bonds.iter().flatten().copied(),
    )?;
    let densities = packer.densities(densities)?;
    let grids = packer.grids(grids)?;
    let orbitals = packer.orbitals(orbitals)?;
    let surfaces = packer.surfaces(surfaces)?;
    let mut document = json!({
        "atoms": atoms, "basis": basis, "bonds": bonds, "densities": densities,
        "grids": grids, "id": id, "orbitals": orbitals, "provenance": provenance,
        "surfaces": surfaces, "title": title, "view": view,
    });
    if let Some(structure) = structure {
        let mut metadata = serde_json::to_value(structure).map_err(|e| e.to_string())?;
        metadata["atom_residues"] = packer.usize_row(
            None,
            0,
            vec![structure.atom_residues.len()],
            structure.atom_residues.iter().copied(),
        )?;
        document["structure"] = metadata;
    }
    if let Some(annotations) = annotations {
        let mut selections = Vec::with_capacity(annotations.selections.len());
        for selection in &annotations.selections {
            let atoms = packer.usize_row(
                None,
                0,
                vec![selection.atoms.len()],
                selection.atoms.iter().copied(),
            )?;
            let neighborhood = if let Some(query) = &selection.neighborhood {
                let seeds = packer.usize_row(
                    None,
                    0,
                    vec![query.seeds.len()],
                    query.seeds.iter().copied(),
                )?;
                json!({"seeds": seeds, "radius_angstrom": query.radius_angstrom, "whole_residues": query.whole_residues})
            } else {
                Value::Null
            };
            let mut row = json!({"id": selection.id, "label": selection.label, "atoms": atoms});
            if !neighborhood.is_null() {
                row["neighborhood"] = neighborhood;
            }
            selections.push(row);
        }
        document["annotations"] = json!({"selections": selections, "measurements": annotations.measurements, "labels": annotations.labels});
    }
    if let Some(surfaces) = molecular_surfaces {
        document["molecular_surfaces"] = packer.molecular_surfaces(surfaces)?;
    }
    if let Some(analysis) = field_analysis {
        let mut items = Vec::with_capacity(analysis.items.len());
        for item in &analysis.items {
            let eigenvista_core::field_analysis::FieldAnalysisItem {
                id,
                label,
                field,
                descriptor,
                definition,
                source_hash,
                sample_hash,
                interpretation_hash,
                algorithm,
                method,
                values,
                valid,
                range,
                appearance,
            } = item;
            let values = packer.float_row(None, 0, vec![values.len()], values.iter().copied())?;
            let valid = packer.u32_row(None, 0, vec![valid.len()], valid.iter().copied())?;
            items.push(json!({"id":id,"label":label,"field":field,"descriptor":descriptor,
                "definition":definition,"source_hash":source_hash,"sample_hash":sample_hash,
                "interpretation_hash":interpretation_hash,"algorithm":algorithm,"method":method,"values":values,
                "valid":valid,"range":range,"appearance":appearance}));
        }
        document["field_analysis"] = json!({"descriptors":analysis.descriptors,"items":items,"show_field_key":analysis.show_field_key});
    }
    Ok(PackedDocument {
        document,
        arrays: packer.arrays,
        entries: packer.entries,
    })
}

/// A repeated numeric vector forms a column only when every row has the same
/// nonempty shape. Empty vectors keep the original inline `[]` representation.
fn uniform_length<T>(rows: &[T], length: impl Fn(&T) -> usize) -> Option<usize> {
    if rows.len() < 2 {
        return None;
    }
    let first = length(&rows[0]);
    (first > 0 && rows.iter().all(|row| length(row) == first)).then_some(first)
}

fn reference(id: &str, row: Option<usize>) -> Value {
    match row {
        Some(row) => json!({"$array": id, "$index": row}),
        None => json!({"$array": id}),
    }
}

impl Packer {
    fn molecular_surfaces(
        &mut self,
        surfaces: &[eigenvista_core::molecular_surface::MolecularSurface],
    ) -> Result<Value> {
        use eigenvista_core::molecular_surface::MolecularSurface;
        let mut rows = Vec::with_capacity(surfaces.len());
        for MolecularSurface {
            id,
            label,
            kind,
            atom_indices,
            radii_set,
            radii_overrides,
            radii_angstrom,
            probe_radius,
            spacing,
            cavity_policy,
            engine,
            source_hash,
            local_origin_bohr,
            precision,
            positions,
            normals,
            indices,
            vertex_atoms,
            color,
            opacity,
            visible,
            stats,
            warnings,
        } in surfaces
        {
            let atom_indices = self.usize_row(
                None,
                0,
                vec![atom_indices.len()],
                atom_indices.iter().copied(),
            )?;
            let radii_angstrom = self.float_row(
                None,
                0,
                vec![radii_angstrom.len()],
                radii_angstrom.iter().copied(),
            )?;
            let positions =
                self.float_row(None, 0, vec![positions.len()], positions.iter().copied())?;
            let normals = self.float_row(None, 0, vec![normals.len()], normals.iter().copied())?;
            let indices = self.u32_row(None, 0, vec![indices.len()], indices.iter().copied())?;
            let vertex_atoms = self.u32_row(
                None,
                0,
                vec![vertex_atoms.len()],
                vertex_atoms.iter().copied(),
            )?;
            rows.push(json!({"id": id,"label":label,"kind":kind,"atom_indices":atom_indices,
                "radii_set":radii_set,"radii_overrides":radii_overrides,"radii_angstrom":radii_angstrom,
                "probe_radius":probe_radius,"spacing":spacing,"cavity_policy":cavity_policy,
                "engine":engine,"source_hash":source_hash,"local_origin_bohr":local_origin_bohr,
                "precision":precision,"positions":positions,"normals":normals,"indices":indices,
                "vertex_atoms":vertex_atoms,"color":color,"opacity":opacity,"visible":visible,
                "stats":stats,"warnings":warnings}));
        }
        Ok(Value::Array(rows))
    }

    /// Account before allocating, and ensure the iterator cannot grow beyond its
    /// declared shape. Native words are always serialized as little-endian bytes.
    fn emit<const WIDTH: usize>(
        &mut self,
        dtype: &str,
        shape: Vec<usize>,
        values: impl IntoIterator<Item = [u8; WIDTH]>,
    ) -> Result<String> {
        if self.entries.len() >= self.budget.array_entries {
            return Err("Document has too many array entries for the preview profile".into());
        }
        let count = shape
            .iter()
            .try_fold(1usize, |n, d| n.checked_mul(*d))
            .ok_or("Native array shape overflow")?;
        let byte_count = count
            .checked_mul(WIDTH)
            .ok_or("Native array byte length overflow")?;
        let total = self
            .array_bytes
            .checked_add(byte_count)
            .ok_or("Native array byte length overflow")?;
        if total > self.budget.total_bytes {
            return Err("Native document exceeds preview budget".into());
        }
        let mut bytes = vec![];
        bytes
            .try_reserve_exact(byte_count)
            .map_err(|_| "Unable to allocate native array buffer")?;
        let mut actual = 0usize;
        for value in values {
            if actual == count {
                return Err("Native array values disagree with shape".into());
            }
            bytes.extend_from_slice(&value);
            actual += 1;
        }
        if actual != count {
            return Err("Native array values disagree with shape".into());
        }
        let id = format!("a{}", self.arrays.len());
        let entry = format!("arrays/{id}/0.bin");
        self.arrays.insert(
            id.clone(),
            Array {
                dtype: dtype.into(),
                shape,
                entry: entry.clone(),
                bytes: byte_count,
                sha256: digest(&bytes),
            },
        );
        self.entries.push((entry, bytes));
        self.array_bytes = total;
        Ok(id)
    }

    fn floats(&mut self, shape: Vec<usize>, values: impl Iterator<Item = f64>) -> Result<String> {
        self.emit("f64", shape, values.map(f64::to_le_bytes))
    }

    fn integers(&mut self, shape: Vec<usize>, values: impl Iterator<Item = u32>) -> Result<String> {
        self.emit("u32", shape, values.map(u32::to_le_bytes))
    }

    /// Match the prior numeric classifier, including unbounded surface resolution
    /// metadata: a single large unsigned value makes the entire array f64.
    fn unsigned(
        &mut self,
        shape: Vec<usize>,
        values: impl Iterator<Item = usize> + Clone,
    ) -> Result<String> {
        if values.clone().all(|value| u32::try_from(value).is_ok()) {
            self.integers(shape, values.map(|value| value as u32))
        } else {
            self.floats(shape, values.map(|value| value as f64))
        }
    }

    fn float_row(
        &mut self,
        column: Option<&str>,
        row: usize,
        shape: Vec<usize>,
        values: impl Iterator<Item = f64>,
    ) -> Result<Value> {
        if let Some(column) = column {
            return Ok(reference(column, Some(row)));
        }
        if shape.contains(&0) {
            return Ok(json!([]));
        }
        Ok(reference(&self.floats(shape, values)?, None))
    }

    fn u32_row(
        &mut self,
        column: Option<&str>,
        row: usize,
        shape: Vec<usize>,
        values: impl Iterator<Item = u32>,
    ) -> Result<Value> {
        if let Some(column) = column {
            return Ok(reference(column, Some(row)));
        }
        if shape.contains(&0) {
            return Ok(json!([]));
        }
        Ok(reference(&self.integers(shape, values)?, None))
    }

    fn usize_row(
        &mut self,
        column: Option<&str>,
        row: usize,
        shape: Vec<usize>,
        values: impl Iterator<Item = usize> + Clone,
    ) -> Result<Value> {
        if let Some(column) = column {
            return Ok(reference(column, Some(row)));
        }
        if shape.contains(&0) {
            return Ok(json!([]));
        }
        Ok(reference(&self.unsigned(shape, values)?, None))
    }

    fn atoms(&mut self, atoms: &[Atom]) -> Result<Value> {
        if atoms.is_empty() {
            return Ok(json!({"elements": [], "positions": []}));
        }
        let elements = self.integers(
            vec![atoms.len()],
            atoms.iter().map(
                |Atom {
                     element,
                     position: _,
                 }| u32::from(*element),
            ),
        )?;
        let positions = self.floats(
            vec![atoms.len(), 3],
            atoms.iter().flat_map(
                |Atom {
                     element: _,
                     position,
                 }| position.iter().copied(),
            ),
        )?;
        Ok(
            json!({"elements": reference(&elements, None), "positions": reference(&positions, None)}),
        )
    }

    fn basis(&mut self, basis: &[BasisFunction]) -> Result<Value> {
        // Every eligible column is emitted before visiting any individual row.
        let center = if basis.len() >= 2 {
            Some(self.floats(vec![basis.len(), 3], basis.iter().flat_map(|b| b.center))?)
        } else {
            None
        };
        let coefficients = uniform_length(basis, |b| b.coefficients.len())
            .map(|n| {
                self.floats(
                    vec![basis.len(), n],
                    basis.iter().flat_map(|b| b.coefficients.iter().copied()),
                )
            })
            .transpose()?;
        let exponents = uniform_length(basis, |b| b.exponents.len())
            .map(|n| {
                self.floats(
                    vec![basis.len(), n],
                    basis.iter().flat_map(|b| b.exponents.iter().copied()),
                )
            })
            .transpose()?;
        let mut rows = Vec::with_capacity(basis.len());
        for (
            row,
            BasisFunction {
                center: values,
                coefficients: weights,
                exponents: radial,
                terms,
            },
        ) in basis.iter().enumerate()
        {
            let center = self.float_row(center.as_deref(), row, vec![3], values.iter().copied())?;
            let coefficients = self.float_row(
                coefficients.as_deref(),
                row,
                vec![weights.len()],
                weights.iter().copied(),
            )?;
            let exponents = self.float_row(
                exponents.as_deref(),
                row,
                vec![radial.len()],
                radial.iter().copied(),
            )?;
            let terms = self.terms(terms)?;
            rows.push(json!({
                "center": center,
                "coefficients": coefficients,
                "exponents": exponents,
                "terms": terms,
            }));
        }
        Ok(Value::Array(rows))
    }

    fn terms(&mut self, terms: &[Term]) -> Result<Value> {
        let powers = if terms.len() >= 2 {
            Some(self.integers(
                vec![terms.len(), 3],
                terms.iter().flat_map(|term| term.powers),
            )?)
        } else {
            None
        };
        let mut rows = Vec::with_capacity(terms.len());
        for (
            row,
            Term {
                powers: values,
                weight,
            },
        ) in terms.iter().enumerate()
        {
            let powers = self.u32_row(powers.as_deref(), row, vec![3], values.iter().copied())?;
            rows.push(json!({"powers": powers, "weight": weight}));
        }
        Ok(Value::Array(rows))
    }

    fn orbitals(&mut self, orbitals: &[Orbital]) -> Result<Value> {
        let column = uniform_length(orbitals, |o| o.coefficients.len())
            .map(|n| {
                self.floats(
                    vec![orbitals.len(), n],
                    orbitals.iter().flat_map(|o| o.coefficients.iter().copied()),
                )
            })
            .transpose()?;
        let mut rows = Vec::with_capacity(orbitals.len());
        for (
            row,
            Orbital {
                id,
                label,
                spin,
                occupation,
                energy,
                coefficients,
            },
        ) in orbitals.iter().enumerate()
        {
            let coefficients = self.float_row(
                column.as_deref(),
                row,
                vec![coefficients.len()],
                coefficients.iter().copied(),
            )?;
            rows.push(json!({
                "coefficients": coefficients,
                "energy": energy,
                "id": id,
                "label": label,
                "occupation": occupation,
                "spin": spin,
            }));
        }
        Ok(Value::Array(rows))
    }

    fn densities(&mut self, densities: &[Density]) -> Result<Value> {
        let column = uniform_length(densities, |d| d.matrix.len())
            .map(|n| {
                self.floats(
                    vec![densities.len(), n],
                    densities.iter().flat_map(|d| d.matrix.iter().copied()),
                )
            })
            .transpose()?;
        let mut rows = Vec::with_capacity(densities.len());
        for (
            row,
            Density {
                id,
                label,
                kind,
                matrix,
            },
        ) in densities.iter().enumerate()
        {
            let matrix = self.float_row(
                column.as_deref(),
                row,
                vec![matrix.len()],
                matrix.iter().copied(),
            )?;
            rows.push(json!({"id": id, "kind": kind, "label": label, "matrix": matrix}));
        }
        Ok(Value::Array(rows))
    }

    fn grids(&mut self, grids: &[Grid]) -> Result<Value> {
        let axes = if grids.len() >= 2 {
            Some(self.floats(
                vec![grids.len(), 3, 3],
                grids.iter().flat_map(|g| g.axes.into_iter().flatten()),
            )?)
        } else {
            None
        };
        let dims = if grids.len() >= 2 {
            Some(self.unsigned(vec![grids.len(), 3], grids.iter().flat_map(|g| g.dims))?)
        } else {
            None
        };
        let origin = if grids.len() >= 2 {
            Some(self.floats(vec![grids.len(), 3], grids.iter().flat_map(|g| g.origin))?)
        } else {
            None
        };
        let values = uniform_length(grids, |g| g.values.len())
            .map(|n| {
                self.floats(
                    vec![grids.len(), n],
                    grids.iter().flat_map(|g| g.values.iter().copied()),
                )
            })
            .transpose()?;
        let mut rows = Vec::with_capacity(grids.len());
        for (
            row,
            Grid {
                id,
                label,
                quantity,
                origin: point,
                axes: steps,
                dims: dimensions,
                values: samples,
            },
        ) in grids.iter().enumerate()
        {
            let axes = self.float_row(
                axes.as_deref(),
                row,
                vec![3, 3],
                steps.iter().flatten().copied(),
            )?;
            let dims = self.usize_row(dims.as_deref(), row, vec![3], dimensions.iter().copied())?;
            let origin = self.float_row(origin.as_deref(), row, vec![3], point.iter().copied())?;
            let values = self.float_row(
                values.as_deref(),
                row,
                vec![samples.len()],
                samples.iter().copied(),
            )?;
            rows.push(json!({
                "axes": axes,
                "dims": dims,
                "id": id,
                "label": label,
                "origin": origin,
                "quantity": quantity,
                "values": values,
            }));
        }
        Ok(Value::Array(rows))
    }

    fn surfaces(&mut self, surfaces: &[Surface]) -> Result<Value> {
        let grid_axes = if surfaces.len() >= 2 {
            Some(
                self.floats(
                    vec![surfaces.len(), 3, 3],
                    surfaces
                        .iter()
                        .flat_map(|s| s.grid_axes.into_iter().flatten()),
                )?,
            )
        } else {
            None
        };
        let grid_origin = if surfaces.len() >= 2 {
            Some(self.floats(
                vec![surfaces.len(), 3],
                surfaces.iter().flat_map(|s| s.grid_origin),
            )?)
        } else {
            None
        };
        let indices = uniform_length(surfaces, |s| s.indices.len())
            .map(|n| {
                self.integers(
                    vec![surfaces.len(), n],
                    surfaces.iter().flat_map(|s| s.indices.iter().copied()),
                )
            })
            .transpose()?;
        let normals = uniform_length(surfaces, |s| s.normals.len())
            .map(|n| {
                self.floats(
                    vec![surfaces.len(), n],
                    surfaces.iter().flat_map(|s| s.normals.iter().copied()),
                )
            })
            .transpose()?;
        let positions = uniform_length(surfaces, |s| s.positions.len())
            .map(|n| {
                self.floats(
                    vec![surfaces.len(), n],
                    surfaces.iter().flat_map(|s| s.positions.iter().copied()),
                )
            })
            .transpose()?;
        let resolution = if surfaces.len() >= 2 {
            Some(self.unsigned(
                vec![surfaces.len(), 3],
                surfaces.iter().flat_map(|s| s.resolution),
            )?)
        } else {
            None
        };
        let mut rows = Vec::with_capacity(surfaces.len());
        for (
            row,
            Surface {
                id,
                label,
                field,
                source_hash,
                isovalue,
                algorithm,
                resolution: dimensions,
                grid_origin: point,
                grid_axes: steps,
                precision,
                positions: points,
                normals: directions,
                indices: triangles,
                color,
                opacity,
                visible,
            },
        ) in surfaces.iter().enumerate()
        {
            let grid_axes = self.float_row(
                grid_axes.as_deref(),
                row,
                vec![3, 3],
                steps.iter().flatten().copied(),
            )?;
            let grid_origin =
                self.float_row(grid_origin.as_deref(), row, vec![3], point.iter().copied())?;
            let indices = self.u32_row(
                indices.as_deref(),
                row,
                vec![triangles.len()],
                triangles.iter().copied(),
            )?;
            let normals = self.float_row(
                normals.as_deref(),
                row,
                vec![directions.len()],
                directions.iter().copied(),
            )?;
            let positions = self.float_row(
                positions.as_deref(),
                row,
                vec![points.len()],
                points.iter().copied(),
            )?;
            let resolution = self.usize_row(
                resolution.as_deref(),
                row,
                vec![3],
                dimensions.iter().copied(),
            )?;
            rows.push(json!({
                "algorithm": algorithm,
                "color": color,
                "field": field,
                "grid_axes": grid_axes,
                "grid_origin": grid_origin,
                "id": id,
                "indices": indices,
                "isovalue": isovalue,
                "label": label,
                "normals": normals,
                "opacity": opacity,
                "positions": positions,
                "precision": precision,
                "resolution": resolution,
                "source_hash": source_hash,
                "visible": visible,
            }));
        }
        Ok(Value::Array(rows))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn packer(budget: PreviewBudget) -> Packer {
        Packer {
            arrays: BTreeMap::new(),
            entries: vec![],
            array_bytes: 0,
            budget,
        }
    }

    #[test]
    fn overflow_and_capacity_errors_return_without_allocating_large_buffers() {
        let unlimited = PreviewBudget {
            array_entries: 1,
            manifest_bytes: usize::MAX,
            total_bytes: usize::MAX,
        };
        let mut p = packer(unlimited);
        assert!(
            p.floats(vec![usize::MAX, 2], std::iter::empty())
                .unwrap_err()
                .contains("shape overflow")
        );
        assert!(
            p.floats(vec![usize::MAX], std::iter::empty())
                .unwrap_err()
                .contains("byte length overflow")
        );
        // u8 Vec capacity cannot exceed isize::MAX. This deterministically tests
        // the fallible allocation branch without asking the OS for real memory.
        let impossible = isize::MAX as usize + 1;
        assert!(
            p.floats(vec![impossible / 8], std::iter::empty())
                .unwrap_err()
                .contains("allocate native array")
        );
        assert!(p.arrays.is_empty());
        assert!(p.entries.is_empty());
        assert_eq!(p.array_bytes, 0);
    }

    #[test]
    fn byte_budget_and_declared_shape_bound_iteration() {
        let budget = PreviewBudget {
            array_entries: 3,
            manifest_bytes: 0,
            total_bytes: 16,
        };
        let mut p = packer(budget);
        p.floats(vec![1], [1.0].into_iter()).unwrap();
        assert!(
            p.floats(vec![2], [2.0, 3.0].into_iter())
                .unwrap_err()
                .contains("preview budget")
        );
        for values in [vec![], vec![1.0, 2.0]] {
            assert!(
                p.floats(vec![1], values.into_iter())
                    .unwrap_err()
                    .contains("disagree with shape")
            );
        }
        assert_eq!(p.array_bytes, 8);
        assert_eq!(p.entries.len(), 1);
        p.floats(vec![1], [2.0].into_iter()).unwrap();
        assert_eq!(p.array_bytes, 16);
    }
}
