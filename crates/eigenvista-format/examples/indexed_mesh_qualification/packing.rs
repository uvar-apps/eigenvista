//! Qualification prototypes only: no public library or application path uses these.
use eigenvista_core::{MAX_VERTICES, Result, Surface, determinant};
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::collections::HashMap;

pub const MARKER: &str = "qualification-mcubes-0.1.7-exact-tuples-v1";
const TEMP_BUDGET: usize = 512 * 1024 * 1024;
type Key = [u64; 6];

#[derive(Clone, Copy)]
pub enum Strategy {
    Hash,
    Sort,
}

#[derive(Serialize)]
pub struct Layout {
    pub raw_corners: usize,
    pub unique_tuples: usize,
    pub raw_capacity_bytes: usize,
    pub output_capacity_bytes: usize,
    pub scratch_vector_capacity_bytes: usize,
    pub hash_capacity: usize,
    pub hash_reserved_bound_bytes: usize,
}

pub fn numeric_bytes(surface: &Surface) -> usize {
    (surface.positions.len() + surface.normals.len()) * 8 + surface.indices.len() * 4
}

pub fn capacity_bytes(surface: &Surface) -> usize {
    (surface.positions.capacity() + surface.normals.capacity()) * 8 + surface.indices.capacity() * 4
}

fn buffer<T>(count: usize) -> Result<Vec<T>> {
    let bytes = count
        .checked_mul(std::mem::size_of::<T>())
        .ok_or("Qualification capacity overflow")?;
    if bytes > TEMP_BUDGET {
        return Err("Qualification buffer exceeds temporary budget".into());
    }
    let mut values = Vec::new();
    values
        .try_reserve_exact(count)
        .map_err(|_| "Qualification allocation failed")?;
    Ok(values)
}

fn key(surface: &Surface, ordinal: usize) -> Key {
    std::array::from_fn(|component| {
        if component < 3 {
            surface.positions[ordinal * 3 + component].to_bits()
        } else {
            surface.normals[ordinal * 3 + component - 3].to_bits()
        }
    })
}

/// Clone metadata only. Cloning then replacing geometry would hide a full extra
/// allocation in the prototype and distort its peak measurement.
fn metadata(raw: &Surface) -> Surface {
    let Surface {
        id,
        label,
        field,
        source_hash,
        isovalue,
        algorithm,
        resolution,
        grid_origin,
        grid_axes,
        precision,
        positions: _,
        normals: _,
        indices: _,
        color,
        opacity,
        visible,
    } = raw;
    Surface {
        id: id.clone(),
        label: label.clone(),
        field: field.clone(),
        source_hash: source_hash.clone(),
        isovalue: *isovalue,
        algorithm: algorithm.clone(),
        resolution: *resolution,
        grid_origin: *grid_origin,
        grid_axes: *grid_axes,
        precision: precision.clone(),
        positions: vec![],
        normals: vec![],
        indices: vec![],
        color: color.clone(),
        opacity: *opacity,
        visible: *visible,
    }
}

pub fn canonical_indices(corners: usize, reflected: bool) -> Vec<u32> {
    let mut indices: Vec<_> = (0..corners as u32).collect();
    if reflected {
        for triangle in indices.as_chunks_mut::<3>().0 {
            triangle.swap(1, 2);
        }
    }
    indices
}

fn check_raw(raw: &Surface) -> Result<usize> {
    let count = raw.positions.len() / 3;
    if count > MAX_VERTICES
        || !raw.positions.len().is_multiple_of(3)
        || raw.normals.len() != raw.positions.len()
        || raw.indices.len() != count
        || !count.is_multiple_of(3)
    {
        return Err("Not a bounded generated corner stream".into());
    }
    // Independently check the actual extractor's complete raw index convention.
    let reflected = determinant(raw.grid_axes) < 0.;
    for (offset, index) in raw.indices.iter().enumerate() {
        let expected = if reflected {
            match offset % 3 {
                1 => offset + 1,
                2 => offset - 1,
                _ => offset,
            }
        } else {
            offset
        };
        if *index as usize != expected {
            return Err("Raw indices are not the pinned mcubes layout".into());
        }
    }
    Ok(count)
}

/// Exact full-attribute sharing. Neither strategy quantizes, averages normals,
/// narrows floats, or changes triangle order. Output capacities are exact U/C.
pub fn compact(raw: &Surface, strategy: Strategy) -> Result<(Surface, Layout)> {
    let count = check_raw(raw)?;
    let mut representatives = buffer::<u32>(count)?;
    representatives.resize(count, 0);
    let mut hash_capacity = 0;
    let mut hash_reserved_bound_bytes = 0;
    let unique;
    let scratch_vector_capacity_bytes;
    match strategy {
        Strategy::Hash => {
            // Fixed upper reservation avoids a hidden old+new table overlap on
            // growth. It can still be substantially more expensive than sorting.
            let buckets = count
                .checked_mul(8)
                .and_then(|n| n.checked_add(6))
                .map(|n| n / 7)
                .unwrap_or(usize::MAX)
                .max(8)
                .checked_next_power_of_two()
                .ok_or("Hash capacity overflow")?;
            hash_reserved_bound_bytes = buckets
                .checked_mul(std::mem::size_of::<(Key, u32)>() + 1)
                .and_then(|n| n.checked_add(32))
                .ok_or("Hash byte bound overflow")?;
            if hash_reserved_bound_bytes
                .checked_add(count * 4)
                .is_none_or(|n| n > TEMP_BUDGET)
            {
                return Err("Qualification hash/scratch exceeds temporary budget".into());
            }
            let mut map = HashMap::<Key, u32>::new();
            map.try_reserve(count)
                .map_err(|_| "Qualification hash allocation failed")?;
            hash_capacity = map.capacity();
            let mut next = 0;
            for (ordinal, representative) in representatives.iter_mut().enumerate() {
                let candidate = key(raw, ordinal);
                *representative = *map.entry(candidate).or_insert_with(|| {
                    let id = next;
                    next += 1;
                    id
                });
            }
            unique = next as usize;
            // The map dies BEFORE output buffers are allocated.
            drop(map);
            scratch_vector_capacity_bytes = representatives.capacity() * 4;
        }
        Strategy::Sort => {
            let mut order = buffer::<u32>(count)?;
            order.extend(0..count as u32);
            order.sort_unstable_by(|left, right| {
                key(raw, *left as usize)
                    .cmp(&key(raw, *right as usize))
                    .then(left.cmp(right))
            });
            let mut previous = None;
            let mut first = 0;
            let mut groups = 0;
            for ordinal in order.iter().copied() {
                let candidate = key(raw, ordinal as usize);
                if previous != Some(candidate) {
                    previous = Some(candidate);
                    first = ordinal;
                    groups += 1;
                }
                representatives[ordinal as usize] = first;
            }
            scratch_vector_capacity_bytes = (order.capacity() + representatives.capacity()) * 4;
            drop(order);
            unique = groups;
        }
    }
    let mut output = metadata(raw);
    output.algorithm = MARKER.into();
    output.positions = buffer(unique * 3)?;
    output.normals = buffer(unique * 3)?;
    output.indices = buffer(count)?;
    let mut emitted = 0u32;
    match strategy {
        Strategy::Hash => {
            // Map IDs are assigned in first-seen raw order.
            for (ordinal, mapped) in representatives.iter().copied().enumerate() {
                if mapped == emitted {
                    output
                        .positions
                        .extend_from_slice(&raw.positions[ordinal * 3..ordinal * 3 + 3]);
                    output
                        .normals
                        .extend_from_slice(&raw.normals[ordinal * 3..ordinal * 3 + 3]);
                    emitted += 1;
                }
            }
        }
        Strategy::Sort => {
            // Representatives are earliest raw ordinals, so this conversion is
            // in-place and needs no second mapping or sort of unique tuples.
            for ordinal in 0..count {
                let representative = representatives[ordinal] as usize;
                if representative == ordinal {
                    representatives[ordinal] = emitted;
                    output
                        .positions
                        .extend_from_slice(&raw.positions[ordinal * 3..ordinal * 3 + 3]);
                    output
                        .normals
                        .extend_from_slice(&raw.normals[ordinal * 3..ordinal * 3 + 3]);
                    emitted += 1;
                } else {
                    representatives[ordinal] = representatives[representative];
                }
            }
        }
    }
    if emitted as usize != unique {
        return Err("Qualification unique-count disagreement".into());
    }
    output.indices.extend(
        raw.indices
            .iter()
            .map(|index| representatives[*index as usize]),
    );
    let layout = Layout {
        raw_corners: count,
        unique_tuples: unique,
        raw_capacity_bytes: capacity_bytes(raw),
        output_capacity_bytes: capacity_bytes(&output),
        scratch_vector_capacity_bytes,
        hash_capacity,
        hash_reserved_bound_bytes,
    };
    Ok((output, layout))
}

/// Restore only explicitly identified newly generated prototype layout. Old or
/// arbitrary indexed files must retain their original shader identity untouched.
pub fn restore(compact: &Surface) -> Result<Surface> {
    if compact.algorithm != MARKER
        || !compact.indices.len().is_multiple_of(3)
        || compact.indices.len() > MAX_VERTICES
    {
        return Err("Unsupported raw-identity reconstruction layout".into());
    }
    let count = compact.indices.len();
    if !compact.positions.len().is_multiple_of(3)
        || compact.normals.len() != compact.positions.len()
    {
        return Err("Malformed compact tuple attributes".into());
    }
    // The marker promises first-seen contiguous unique IDs in original RAW
    // ordinal order. A tagged arbitrary index layout is not that promise.
    let unique = compact.positions.len() / 3;
    if unique > count
        || !determinant(compact.grid_axes).is_finite()
        || determinant(compact.grid_axes).abs() < 1e-15
    {
        return Err("Invalid compact tuple count or affine axes".into());
    }
    let mut seen = buffer::<bool>(unique)?;
    seen.resize(unique, false);
    let reflected = determinant(compact.grid_axes) < 0.;
    let mut next = 0;
    for ordinal in 0..count {
        let slot = raw_slot(ordinal, reflected);
        let index = compact.indices[slot] as usize;
        let flag = seen.get_mut(index).ok_or("Invalid compact tuple index")?;
        if !*flag {
            if index != next {
                return Err("Compact IDs are not first-seen contiguous".into());
            }
            *flag = true;
            next += 1;
        }
    }
    if next != unique {
        return Err("Unused compact tuples".into());
    }
    drop(seen);
    let mut output = metadata(compact);
    output.algorithm = "mcubes-0.1.7-classic".into();
    output.positions = buffer(count * 3)?;
    output.normals = buffer(count * 3)?;
    output.indices = canonical_indices(count, reflected);
    for ordinal in 0..count {
        let slot = raw_slot(ordinal, reflected);
        let index = compact.indices[slot] as usize;
        let position = compact
            .positions
            .get(index * 3..index * 3 + 3)
            .ok_or("Invalid compact position index")?;
        let normal = compact
            .normals
            .get(index * 3..index * 3 + 3)
            .ok_or("Invalid compact normal index")?;
        output.positions.extend_from_slice(position);
        output.normals.extend_from_slice(normal);
    }
    Ok(output)
}

fn raw_slot(ordinal: usize, reflected: bool) -> usize {
    if reflected {
        match ordinal % 3 {
            1 => ordinal + 1,
            2 => ordinal - 1,
            _ => ordinal,
        }
    } else {
        ordinal
    }
}

pub fn naive_unroll(compact: &Surface) -> Result<Surface> {
    let mut output = metadata(compact);
    output.algorithm = "qualification-naive-triangle-order".into();
    output.positions = buffer(compact.indices.len() * 3)?;
    output.normals = buffer(compact.indices.len() * 3)?;
    for index in &compact.indices {
        let i = *index as usize * 3;
        output
            .positions
            .extend_from_slice(compact.positions.get(i..i + 3).ok_or("Invalid index")?);
        output
            .normals
            .extend_from_slice(compact.normals.get(i..i + 3).ok_or("Invalid index")?);
    }
    output.indices = canonical_indices(compact.indices.len(), false);
    Ok(output)
}

pub fn vertex_digest(surface: &Surface) -> String {
    let mut hash = Sha256::new();
    for value in surface.positions.iter().chain(&surface.normals) {
        hash.update(value.to_le_bytes());
    }
    format!("{:x}", hash.finalize())
}

pub fn index_digest(surface: &Surface) -> String {
    let mut hash = Sha256::new();
    for value in &surface.indices {
        hash.update(value.to_le_bytes());
    }
    format!("{:x}", hash.finalize())
}

/// Independent expanded triangle-attribute oracle; no compaction map is used.
pub fn expanded_digest(surface: &Surface) -> String {
    let mut hash = Sha256::new();
    for index in &surface.indices {
        let first = *index as usize * 3;
        for value in surface.positions[first..first + 3]
            .iter()
            .chain(&surface.normals[first..first + 3])
        {
            hash.update(value.to_le_bytes());
        }
    }
    format!("{:x}", hash.finalize())
}
