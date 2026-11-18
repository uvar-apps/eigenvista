// sesmesh — Solvent Excluded Surface meshes for molecules
// Copyright (c) 2026 Ugo Varetto
// SPDX-License-Identifier: MIT OR Apache-2.0

//! Uniform cell lists in CSR form (Design §6.2) and Morton ordering.

use super::vec::Vec3;
use crate::error::{self, Error, Result};
use rustc_hash::FxHashMap;

type CellKey = [usize; 3];

/// Only occupied cells are stored. Keys visit z/y/x order; point indices in
/// each cell are ascending, independently of hash-table iteration order.
#[derive(Debug, Clone)]
pub(crate) struct CellGrid {
    origin: Vec3,
    cell: f64,
    max_coord: CellKey,
    keys: Vec<CellKey>,
    starts: Vec<usize>,
    items: Vec<u32>,
    lookup: FxHashMap<CellKey, usize>,
}

impl CellGrid {
    /// Bins points using exactly the supplied positive, finite cell edge.
    /// Empty spatial regions require no cell records; allocation follows the
    /// actual occupied cells and points, without a cell-count quota or regridding.
    pub(crate) fn new(points: &[Vec3], cell: f64) -> Result<Self> {
        if !cell.is_finite() || cell <= 0.0 {
            return Err(Error::InvalidInput(
                "cell size must be finite and positive".into(),
            ));
        }
        let mut grid = Self {
            origin: Vec3::default(),
            cell,
            max_coord: [0; 3],
            keys: Vec::new(),
            starts: Vec::new(),
            items: Vec::new(),
            lookup: FxHashMap::default(),
        };
        let Some(&first) = points.first() else {
            error::push(&mut grid.starts, 0, "empty spatial cell offsets")?;
            return Ok(grid);
        };
        if points.iter().any(|p| !p.is_finite()) {
            return Err(Error::InvalidInput(
                "spatial coordinates must be finite".into(),
            ));
        }
        let (lo, hi) = points
            .iter()
            .fold((first, first), |(lo, hi), &p| (lo.min(p), hi.max(p)));
        let extent = hi - lo;
        if !extent.is_finite() {
            return Err(Error::SizeOverflow("spatial coordinate extent"));
        }
        grid.origin = lo;
        for (axis, value) in [extent.x, extent.y, extent.z].into_iter().enumerate() {
            grid.max_coord[axis] = Self::axis_coord(value, cell)?;
        }
        let mut ordered = error::capacity(points.len(), "occupied spatial cell points")?;
        for (i, &point) in points.iter().enumerate() {
            let rel = point - lo;
            let key = [
                Self::axis_coord(rel.x, cell)?,
                Self::axis_coord(rel.y, cell)?,
                Self::axis_coord(rel.z, cell)?,
            ];
            ordered.push((
                key,
                u32::try_from(i).map_err(|_| Error::SizeOverflow("spatial point indices"))?,
            ));
        }
        ordered.sort_unstable_by_key(|&(key, i)| ([key[2], key[1], key[0]], i));
        grid.items = error::capacity(points.len(), "spatial cell point indices")?;
        for (key, point) in ordered {
            if grid.keys.last() != Some(&key) {
                let ordinal = grid.keys.len();
                grid.lookup
                    .try_reserve(1)
                    .map_err(|source| Error::Allocation {
                        what: "occupied spatial cell lookup",
                        source,
                    })?;
                error::push(&mut grid.keys, key, "occupied spatial cell keys")?;
                error::push(
                    &mut grid.starts,
                    grid.items.len(),
                    "occupied spatial cell offsets",
                )?;
                grid.lookup.insert(key, ordinal);
            }
            grid.items.push(point);
        }
        error::push(
            &mut grid.starts,
            grid.items.len(),
            "occupied spatial cell offsets",
        )?;
        Ok(grid)
    }

    fn axis_coord(relative: f64, cell: f64) -> Result<usize> {
        let coordinate = (relative / cell).floor();
        // Tuple keys require each axis to fit; no product of empty dimensions
        // needs to fit usize or be allocated.
        let exclusive_end = usize::MAX as f64 + 1.0;
        if !coordinate.is_finite() || coordinate < 0.0 || coordinate >= exclusive_end {
            return Err(Error::SizeOverflow("spatial cell coordinate"));
        }
        Ok(coordinate as usize)
    }

    /// Fallible callback form, allowing allocation failures to escape neighbor queries.
    pub(crate) fn try_for_each_near(
        &self,
        center: Vec3,
        radius: f64,
        mut f: impl FnMut(u32) -> Result<()>,
    ) -> Result<()> {
        let mut result = Ok(());
        self.for_each_near(center, radius, |i| {
            if result.is_ok() {
                result = f(i);
            }
        });
        result
    }

    /// The supplied cell edge, unchanged.
    pub(crate) fn cell(&self) -> f64 {
        self.cell
    }

    fn coord(&self, point: Vec3) -> CellKey {
        let rel = point - self.origin;
        let values = [rel.x, rel.y, rel.z];
        std::array::from_fn(|axis| {
            let coordinate = (values[axis] / self.cell).floor();
            if coordinate <= 0.0 {
                0
            } else {
                (coordinate as usize).min(self.max_coord[axis])
            }
        })
    }

    fn visit(&self, ordinal: usize, f: &mut impl FnMut(u32)) {
        for &point in &self.items[self.starts[ordinal]..self.starts[ordinal + 1]] {
            f(point);
        }
    }

    /// Visits cells overlapping the query box (a conservative neighborhood),
    /// always in z/y/x order with ascending input indices inside each cell.
    pub(crate) fn for_each_near(&self, center: Vec3, radius: f64, mut f: impl FnMut(u32)) {
        if self.keys.is_empty() {
            return;
        }
        let r = Vec3::new(radius, radius, radius);
        let lo = self.coord(center - r);
        let hi = self.coord(center + r);
        // Choose by actual traversal work, not a storage quota. A huge empty
        // box (even one whose cell-count product overflows) visits occupied keys.
        let box_cells = (0..3).try_fold(1usize, |count, axis| {
            hi[axis]
                .checked_sub(lo[axis])?
                .checked_add(1)?
                .checked_mul(count)
        });
        if box_cells.is_some_and(|count| count <= self.keys.len()) {
            for z in lo[2]..=hi[2] {
                for y in lo[1]..=hi[1] {
                    for x in lo[0]..=hi[0] {
                        if let Some(&ordinal) = self.lookup.get(&[x, y, z]) {
                            self.visit(ordinal, &mut f);
                        }
                    }
                }
            }
        } else {
            for (ordinal, key) in self.keys.iter().enumerate() {
                if (0..3).all(|axis| lo[axis] <= key[axis] && key[axis] <= hi[axis]) {
                    self.visit(ordinal, &mut f);
                }
            }
        }
    }
}

/// Spreads the low 21 bits of `v` so that two zero bits separate each bit.
fn spread(v: u32) -> u64 {
    let mut x = u64::from(v) & 0x1f_ffff;
    x = (x | (x << 32)) & 0x001f_0000_0000_ffff;
    x = (x | (x << 16)) & 0x001f_0000_ff00_00ff;
    x = (x | (x << 8)) & 0x100f_00f0_0f00_f00f;
    x = (x | (x << 4)) & 0x10c3_0c30_c30c_30c3;
    x = (x | (x << 2)) & 0x1249_2492_4924_9249;
    x
}

/// Morton (Z-order) code of 21-bit cell coordinates.
pub(crate) fn morton(c: [u32; 3]) -> u64 {
    spread(c[0]) | (spread(c[1]) << 1) | (spread(c[2]) << 2)
}

#[cfg(test)]
mod tests {
    use super::*;
    use proptest::prelude::*;

    proptest! {
        #[test]
        fn neighbourhood_is_a_superset(
            pts in prop::collection::vec((-20.0..20.0f64, -20.0..20.0f64, -5.0..5.0f64), 0..200),
            q in (-25.0..25.0f64, -25.0..25.0f64, -8.0..8.0f64),
            radius in 0.0..9.0f64,
            cell in 0.5..6.0f64,
        ) {
            let pts: Vec<Vec3> = pts.into_iter().map(|(x, y, z)| Vec3::new(x, y, z)).collect();
            let q = Vec3::new(q.0, q.1, q.2);
            let grid = CellGrid::new(&pts, cell).unwrap();
            let mut found = Vec::new();
            grid.for_each_near(q, radius, |i| found.push(i as usize));
            let unique = found.len();
            found.sort_unstable();
            found.dedup();
            prop_assert_eq!(unique, found.len(), "a point was visited twice");
            for (i, p) in pts.iter().enumerate() {
                if p.dist(q) <= radius {
                    prop_assert!(found.binary_search(&i).is_ok(), "missed point {}", i);
                }
            }
        }
    }

    #[test]
    fn far_sparse_inputs_preserve_the_supplied_edge() {
        let pts = [Vec3::new(0.0, 0.0, 0.0), Vec3::new(1e7, -1e7, 1e7)];
        let grid = CellGrid::new(&pts, 1.0).unwrap();
        assert_eq!(grid.cell(), 1.0);
        assert_eq!(grid.keys.len(), 2);
        assert_eq!(grid.starts.len(), 3);
        assert_eq!(grid.items.len(), pts.len());
        let mut seen = Vec::new();
        grid.for_each_near(pts[1], 0.5, |i| seen.push(i));
        assert_eq!(seen, [1]);
        seen.clear();
        // The virtual dense cell-count product exceeds usize; occupied-cell
        // queries still visit both points in deterministic spatial order.
        grid.for_each_near(Vec3::default(), 2e7, |i| seen.push(i));
        assert_eq!(seen, [0, 1]);
        let empty = CellGrid::new(&[], 2.0).unwrap();
        empty.for_each_near(Vec3::default(), 10.0, |_| panic!("no points"));
    }

    #[test]
    fn both_query_paths_match_spatial_order_oracle() {
        let mut points = vec![
            Vec3::new(2.0, 0.0, 0.0),
            Vec3::new(0.0, 1.0, 0.0),
            Vec3::new(1.0, 0.0, 0.0),
            Vec3::new(0.0, 0.0, 1.0),
            Vec3::new(0.0, 0.0, 0.0),
            Vec3::new(0.2, 0.2, 0.2),
        ];
        // Independent z/y/x then input-order oracle for the first six points.
        let expected = [4, 5, 2, 0, 1, 3];
        let collect = |grid: &CellGrid| {
            let mut found = Vec::new();
            grid.for_each_near(Vec3::new(1.0, 0.5, 0.5), 1.0, |i| found.push(i));
            found
        };
        let sparse = CellGrid::new(&points, 1.0).unwrap();
        assert_eq!(collect(&sparse), expected); // occupied-key traversal
        points.extend((100..130).map(|x| Vec3::new(f64::from(x), 0.0, 0.0)));
        let populated = CellGrid::new(&points, 1.0).unwrap();
        assert_eq!(collect(&populated), expected); // hash lookup of query-box cells
        assert_eq!(populated.cell(), 1.0);
    }

    #[test]
    fn only_per_axis_representation_is_required() {
        let grid = CellGrid::new(&[Vec3::default(), Vec3::new(1e9, 1e9, 1e9)], 1.0).unwrap();
        assert_eq!(grid.keys.len(), 2);
        assert_eq!(grid.cell(), 1.0);
        let error = CellGrid::new(&[Vec3::default(), Vec3::new(1e100, 0.0, 0.0)], 1.0).unwrap_err();
        assert!(matches!(
            error,
            Error::SizeOverflow("spatial cell coordinate")
        ));
    }

    #[test]
    fn morton_interleaves() {
        assert_eq!(morton([1, 0, 0]), 0b001);
        assert_eq!(morton([0, 1, 0]), 0b010);
        assert_eq!(morton([0, 0, 1]), 0b100);
        assert_eq!(morton([3, 0, 0]), 0b001_001);
        assert_eq!(morton([0x1f_ffff, 0x1f_ffff, 0x1f_ffff]), (1u64 << 63) - 1);
    }
}
