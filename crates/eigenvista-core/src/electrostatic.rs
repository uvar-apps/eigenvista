//! Coulomb potential of an isolated all-electron Gaussian density (hartree/e).
//! Gaussian products are expanded in scaled Hermite derivatives. Their Coulomb
//! integrals reduce to Boys functions and Cartesian derivatives, with no spatial
//! truncation or fit to atom charges.

use crate::{BasisFunction, Density, Document, Result, Surface, allocation, compute};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{collections::HashMap, f64::consts::PI, ops::Range};

// A product of two supported G polynomials has total degree at most eight.
const ORDERS: usize = 9;
type Powers = [usize; 3];

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq)]
pub struct ElectrostaticPotential {
    pub source_hash: String,
    pub values: Vec<f64>,
    /// Symmetric display endpoints in hartree/e. Zero is always the midpoint.
    pub range: f64,
    pub enabled: bool,
}

impl ElectrostaticPotential {
    pub(crate) fn validate(&self, doc: &Document, surface: &Surface) -> Result<()> {
        total_density(doc, surface.field.as_deref().unwrap_or_default())?;
        if surface.isovalue.is_none_or(|iso| iso <= 0.)
            || surface.indices.is_empty()
            || !self.range.is_finite()
            || self.range <= 0.
            || self.values.len() != surface.positions.len() / 3
            || self.values.iter().any(|v| !v.is_finite())
            || self.source_hash != source_hash(doc, surface)
        {
            return Err(
                "Invalid electrostatic potential samples, display range or source hash".into(),
            );
        }
        Ok(())
    }
}

/// Hash the density identity, nuclear charges/positions and ordered sampling points.
fn source_hash(doc: &Document, surface: &Surface) -> String {
    let mut hash = Sha256::new();
    hash.update(b"eigenvista-all-electron-mep-v1");
    hash.update(
        surface
            .source_hash
            .as_deref()
            .unwrap_or_default()
            .as_bytes(),
    );
    hash.update((doc.atoms.len() as u64).to_le_bytes());
    for atom in &doc.atoms {
        hash.update(atom.element.to_le_bytes());
        for coordinate in atom.position {
            hash.update(coordinate_bits(coordinate));
        }
    }
    for &coordinate in &surface.positions {
        hash.update(coordinate_bits(coordinate));
    }
    format!("{:x}", hash.finalize())
}

fn coordinate_bits(value: f64) -> [u8; 8] {
    (if value == 0. { 0. } else { value }).to_le_bytes()
}

fn total_density<'a>(doc: &'a Document, field: &str) -> Result<&'a Density> {
    let density = doc
        .densities
        .iter()
        .find(|d| d.id == field && d.kind == "total")
        .ok_or("Electrostatic potential requires a total electron density matrix")?;
    if doc.atoms.is_empty() {
        return Err("Electrostatic potential requires nuclear charges and coordinates".into());
    }
    if doc
        .provenance
        .iter()
        .any(|note| note == crate::ECP_PROVENANCE)
    {
        return Err("Electrostatic potential requires all-electron data; this input declares effective core potentials".into());
    }
    Ok(density)
}

/// Attach reproducible vertex samples to a positive density isosurface.
/// The old surface is retained if evaluation, cancellation or allocation fails.
pub fn map_surface(
    doc: &Document,
    surface: &mut Surface,
    progress: impl FnMut(usize, usize) -> Result<()>,
) -> Result<()> {
    let field = surface.field.as_deref().unwrap_or_default();
    let (points, remainder) = surface.positions.as_chunks::<3>();
    if surface
        .isovalue
        .is_none_or(|iso| !iso.is_finite() || iso <= 0.)
        || !remainder.is_empty()
        || surface.indices.is_empty()
        || surface.source_hash.as_deref() != Some(compute::source_hash(doc, field)?.as_str())
    {
        return Err(
            "Electrostatic potential requires an isosurface of the selected total density".into(),
        );
    }
    let values = evaluate_points(doc, field, points.iter().copied(), progress)?;
    let range = values.iter().fold(0_f64, |max, value| max.max(value.abs()));
    surface.electrostatic_potential = Some(ElectrostaticPotential {
        source_hash: source_hash(doc, surface),
        values,
        range: if range > 0. { range } else { 0.01 },
        enabled: true,
    });
    Ok(())
}

/// Evaluate the potential of a positive test charge at points in bohr.
pub fn evaluate_points(
    doc: &Document,
    field: &str,
    points: impl ExactSizeIterator<Item = [f64; 3]>,
    mut progress: impl FnMut(usize, usize) -> Result<()>,
) -> Result<Vec<f64>> {
    doc.validate()?;
    let density = total_density(doc, field)?;
    let count = points.len();
    progress(0, count)?;
    let evaluator = Evaluator::new(&doc.basis, density)?;
    let mut values = allocation::buffer(count, "electrostatic potential samples")?;
    // Marching cubes emits triangle corners unindexed. Reuse a calculation
    // only when the coordinates are exactly identical, with signed zeros folded.
    let mut sampled = HashMap::new();
    for point in points {
        let key = point.map(coordinate_bits);
        let value = match sampled.get(&key) {
            Some(&value) => value,
            None => {
                let value = evaluator.value(doc, point)?;
                // The cache is optional. Continue exact evaluation if it cannot grow.
                if sampled.try_reserve(1).is_ok() {
                    sampled.insert(key, value);
                }
                value
            }
        };
        values.push(value);
        progress(values.len(), count)?;
    }
    Ok(values)
}

struct Evaluator {
    pairs: Vec<PrimitivePair>,
    terms: Vec<HermiteTerm>,
}

struct PrimitivePair {
    center: [f64; 3],
    root_exponent: f64,
    scale: f64,
    order: usize,
    terms: Range<usize>,
}

struct HermiteTerm {
    powers: Powers,
    weight: f64,
}

impl Evaluator {
    fn new(basis: &[BasisFunction], density: &Density) -> Result<Self> {
        let mut out = Self {
            pairs: Vec::new(),
            terms: Vec::new(),
        };
        let count = basis.len();
        for (i, a) in basis.iter().enumerate() {
            for (j, b) in basis.iter().enumerate().skip(i) {
                let mut weight = density.matrix[i * count + j];
                if i != j {
                    weight += density.matrix[j * count + i];
                }
                if !weight.is_finite() {
                    return Err(
                        "Electrostatic density coefficients exceed numerical precision".into(),
                    );
                }
                if weight != 0. {
                    out.expand_pair(a, b, weight)?;
                }
            }
        }
        Ok(out)
    }

    fn expand_pair(&mut self, a: &BasisFunction, b: &BasisFunction, weight: f64) -> Result<()> {
        let displacement = std::array::from_fn::<_, 3, _>(|k| b.center[k] - a.center[k]);
        let distance_squared = squared_norm(displacement);
        for (&alpha, &ca) in a.exponents.iter().zip(&a.coefficients) {
            for (&beta, &cb) in b.exponents.iter().zip(&b.coefficients) {
                let exponent = alpha + beta;
                let ratio = beta / exponent;
                let root_exponent = exponent.sqrt();
                let scale = weight
                    * ca
                    * cb
                    * (-alpha * ratio * distance_squared).exp()
                    * (2. * PI / exponent);
                if !scale.is_finite() || !exponent.is_finite() {
                    return Err(
                        "Gaussian product exceeds electrostatic evaluation precision".into(),
                    );
                }
                if scale == 0. {
                    continue;
                }
                let center = std::array::from_fn(|k| a.center[k] + ratio * displacement[k]);
                let terms = self.terms.len();
                let order = self.expand_polynomials(a, b, displacement, ratio, root_exponent)?;
                if self.terms.len() > terms {
                    allocation::push(
                        &mut self.pairs,
                        PrimitivePair {
                            center,
                            root_exponent,
                            scale,
                            order,
                            terms: terms..self.terms.len(),
                        },
                        "electrostatic Gaussian products",
                    )?;
                }
            }
        }
        Ok(())
    }

    fn expand_polynomials(
        &mut self,
        a: &BasisFunction,
        b: &BasisFunction,
        ab: [f64; 3],
        ratio: f64,
        root: f64,
    ) -> Result<usize> {
        let mut coefficients = [[[0.; ORDERS]; ORDERS]; ORDERS];
        let mut extent = [1; 3];
        for ta in &a.terms {
            for tb in &b.terms {
                let degrees =
                    std::array::from_fn::<_, 3, _>(|k| (ta.powers[k] + tb.powers[k]) as usize);
                let axis = std::array::from_fn::<_, 3, _>(|k| {
                    hermite_axis(
                        ta.powers[k] as usize,
                        tb.powers[k] as usize,
                        ratio * ab[k],
                        -(1. - ratio) * ab[k],
                        root,
                    )
                });
                for k in 0..3 {
                    extent[k] = extent[k].max(degrees[k] + 1);
                }
                let weight = ta.weight * tb.weight;
                for (x, slab) in coefficients.iter_mut().enumerate().take(degrees[0] + 1) {
                    for (y, row) in slab.iter_mut().enumerate().take(degrees[1] + 1) {
                        for (z, value) in row.iter_mut().enumerate().take(degrees[2] + 1) {
                            *value += weight * axis[0][x] * axis[1][y] * axis[2][z];
                        }
                    }
                }
            }
        }
        let mut order = 0;
        for (x, slab) in coefficients.iter().enumerate().take(extent[0]) {
            for (y, row) in slab.iter().enumerate().take(extent[1]) {
                for (z, &weight) in row.iter().enumerate().take(extent[2]) {
                    if !weight.is_finite() {
                        return Err(
                            "Gaussian polynomial exceeds electrostatic evaluation precision".into(),
                        );
                    }
                    if weight != 0. {
                        let powers = [x, y, z];
                        allocation::push(
                            &mut self.terms,
                            HermiteTerm { powers, weight },
                            "electrostatic Hermite coefficients",
                        )?;
                        order = order.max(x + y + z);
                    }
                }
            }
        }
        Ok(order)
    }

    fn value(&self, doc: &Document, point: [f64; 3]) -> Result<f64> {
        if !point.into_iter().all(f64::is_finite) {
            return Err("Electrostatic evaluation coordinates must be finite".into());
        }
        let mut value = 0.;
        for atom in &doc.atoms {
            let distance =
                squared_norm(std::array::from_fn(|k| point[k] - atom.position[k])).sqrt();
            if distance == 0. {
                return Err("Electrostatic potential is singular at a nucleus".into());
            }
            value += f64::from(atom.element) / distance;
        }
        let mut correction = 0.;
        for pair in &self.pairs {
            let delta = std::array::from_fn(|k| pair.root_exponent * (pair.center[k] - point[k]));
            let argument = squared_norm(delta);
            if !argument.is_finite() {
                return Err("Point exceeds electrostatic evaluation precision".into());
            }
            let base = boys(argument, pair.order);
            let integral: f64 = self.terms[pair.terms.clone()]
                .iter()
                .map(|term| term.weight * coulomb(term.powers, 0, delta, &base))
                .sum();
            // Compensated accumulation matters for nearly neutral far fields.
            let addend = -pair.scale * integral - correction;
            let next = value + addend;
            correction = (next - value) - addend;
            value = next;
        }
        if !value.is_finite() {
            return Err("Electrostatic potential exceeds numerical precision".into());
        }
        Ok(value)
    }
}

fn squared_norm(vector: [f64; 3]) -> f64 {
    vector.into_iter().map(|v| v * v).sum()
}

// Multiply each scaled derivative by (x-A) or (x-B). The derivative basis is
// p^(-t/2) times the t-th center derivative of exp(-p (x-P)^2).
fn hermite_axis(a: usize, b: usize, pa: f64, pb: f64, root: f64) -> [f64; ORDERS] {
    let mut terms = [0.; ORDERS];
    terms[0] = 1.;
    for degree in 0..a + b {
        let center_offset = if degree < a { pa } else { pb };
        let mut next = [0.; ORDERS];
        for t in 0..=degree {
            let value = terms[t];
            next[t] += center_offset * value;
            next[t + 1] += (0.5 / root) * value;
            if t > 0 {
                next[t - 1] += (t as f64 / root) * value;
            }
        }
        terms = next;
    }
    terms
}

// F_n(T) = integral_0^1 u^(2n) exp(-T u^2) du. Use positive terms for
// small T (then descend), or start at the error function and ascend when
// recurrence subtraction is well-conditioned.
fn boys(t: f64, order: usize) -> [f64; ORDERS] {
    let mut values = [0.; ORDERS];
    if order == 0 || t > order as f64 + 1.5 {
        let root = t.sqrt();
        values[0] = if t == 0. {
            1.
        } else {
            0.5 * PI.sqrt() * (libm::erf(root) / root)
        };
        if order > 0 {
            let decay = (-t).exp();
            for n in 0..order {
                values[n + 1] = (((2 * n + 1) as f64) * values[n] - decay) * (0.5 / t);
            }
        }
    } else {
        let decay = (-t).exp();
        let mut term = decay / ((2 * order + 1) as f64);
        let mut sum = term;
        let mut denominator = order as f64 + 1.5;
        loop {
            term *= t / denominator;
            let next = sum + term;
            if next == sum {
                break;
            }
            sum = next;
            denominator += 1.;
        }
        values[order] = sum;
        for n in (0..order).rev() {
            values[n] = (2. * t * values[n + 1] + decay) / ((2 * n + 1) as f64);
        }
    }
    for (n, value) in values.iter_mut().enumerate().take(order + 1) {
        *value *= (-2_f64).powi(n as i32);
    }
    values
}

fn coulomb(mut powers: Powers, n: usize, delta: [f64; 3], base: &[f64; ORDERS]) -> f64 {
    let Some(axis) = powers.iter().position(|&p| p > 0) else {
        return base[n];
    };
    powers[axis] -= 1;
    let degree = powers[axis];
    let linear = delta[axis] * coulomb(powers, n + 1, delta, base);
    if degree == 0 {
        return linear;
    }
    powers[axis] -= 1;
    linear + degree as f64 * coulomb(powers, n + 1, delta, base)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{Atom, Term};

    #[test]
    fn neutral_gaussian_has_analytic_radial_potential() {
        let mut doc = Document::empty("Neutral Gaussian");
        doc.atoms.push(Atom {
            element: 1,
            position: [0.; 3],
        });
        doc.basis.push(BasisFunction {
            center: [0.; 3],
            exponents: vec![1.],
            coefficients: vec![(2. / PI).powf(0.75)],
            terms: vec![Term {
                powers: [0; 3],
                weight: 1.,
            }],
        });
        doc.densities.push(Density {
            id: "density".into(),
            label: "Total".into(),
            kind: "total".into(),
            matrix: vec![1.],
        });
        let radii = [0.00001, 0.2, 0.5, 1., 2., 4.];
        let values = evaluate_points(
            &doc,
            "density",
            radii.into_iter().map(|r| [r, 0., 0.]),
            |_, _| Ok(()),
        )
        .unwrap();
        for (radius, value) in radii.into_iter().zip(values) {
            let expected = libm::erfc(2_f64.sqrt() * radius) / radius;
            assert!(
                (value - expected).abs() < 4. * f64::EPSILON * expected.abs().max(1.),
                "{radius}: {value} versus {expected}"
            );
        }
        assert!(
            evaluate_points(&doc, "density", [[0.; 3]].into_iter(), |_, _| Ok(()))
                .unwrap_err()
                .contains("singular")
        );
        assert!(
            evaluate_points(&doc, "density", [[1.; 3]].into_iter(), |done, _| {
                if done > 0 {
                    Err("cancelled".into())
                } else {
                    Ok(())
                }
            })
            .unwrap_err()
            .contains("cancelled")
        );
        doc.provenance.push(crate::ECP_PROVENANCE.into());
        assert!(
            evaluate_points(&doc, "density", [[1.; 3]].into_iter(), |_, _| Ok(()))
                .unwrap_err()
                .contains("effective core potentials")
        );
        doc.provenance.clear();
        doc.densities[0].kind = "spin".into();
        assert!(
            evaluate_points(&doc, "density", [[1.; 3]].into_iter(), |_, _| Ok(()))
                .unwrap_err()
                .contains("total electron density")
        );
    }
}
