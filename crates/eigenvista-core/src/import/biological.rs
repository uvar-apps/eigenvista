//! Deposited secondary ranges: match a single identifier namespace without
//! projecting one author chain onto multiple label chains or TER segments.
use crate::{ComponentKind, Result, SecondaryStructure, StructureMetadata};
use std::collections::BTreeMap;

pub(super) struct SecondaryRange {
    pub label: bool,
    pub chain: String,
    pub start: (i32, String),
    pub end: (i32, String),
    pub start_name: Option<String>,
    pub end_name: Option<String>,
    pub secondary: SecondaryStructure,
}

type Index = BTreeMap<(String, i32, String), Vec<usize>>;

pub(super) fn secondary_ranges(
    metadata: &mut StructureMetadata,
    ranges: &[SecondaryRange],
) -> Result<usize> {
    if ranges.is_empty() {
        return Ok(0);
    }
    metadata.secondary_source = "deposited".into();
    let mut label: Index = BTreeMap::new();
    let mut author: Index = BTreeMap::new();
    for (index, residue) in metadata.residues.iter().enumerate() {
        if residue.kind != ComponentKind::Protein {
            continue;
        }
        let chain = &metadata.chains[residue.chain];
        let insertion = residue.insertion_code.clone().unwrap_or_default();
        if let (Some(chain), Some(sequence)) = (&chain.label_id, residue.label_seq_id) {
            label
                .entry((chain.clone(), sequence, String::new()))
                .or_default()
                .push(index);
        }
        if let Some(sequence) = residue
            .author_seq_id
            .as_ref()
            .and_then(|s| s.parse::<i32>().ok())
        {
            author
                .entry((
                    chain.author_id.clone().unwrap_or_default(),
                    sequence,
                    insertion,
                ))
                .or_default()
                .push(index);
        }
    }
    let mut conflicts =
        crate::allocation::filled(metadata.residues.len(), false, "secondary annotations")?;
    let mut visits = 0usize;
    let mut unresolved = 0;
    for range in ranges {
        if range.start > range.end {
            unresolved += 1;
            continue;
        }
        let index = if range.label { &label } else { &author };
        let start = (range.chain.clone(), range.start.0, range.start.1.clone());
        let end = (range.chain.clone(), range.end.0, range.end.1.clone());
        let mut selected = Vec::new();
        let mut ambiguous = false;
        for (key, residues) in index.range(start.clone()..=end.clone()) {
            visits = visits
                .checked_add(residues.len())
                .ok_or("Secondary annotation work overflow")?;
            if residues.len() != 1 {
                ambiguous = true;
                break;
            }
            let residue = residues[0];
            let name = &metadata.residues[residue].name;
            if (key == &start
                && range
                    .start_name
                    .as_ref()
                    .is_some_and(|expected| expected != name))
                || (key == &end
                    && range
                        .end_name
                        .as_ref()
                        .is_some_and(|expected| expected != name))
            {
                ambiguous = true;
                break;
            }
            crate::allocation::push(&mut selected, residue, "secondary annotation residues")?;
        }
        // A single range must never cross source TER segments or chain instances.
        if let Some(&first) = selected.first() {
            let first = &metadata.residues[first];
            if selected.iter().any(|&r| {
                metadata.residues[r].chain != first.chain
                    || metadata.residues[r].segment != first.segment
            }) {
                ambiguous = true;
            }
        }
        if ambiguous || selected.is_empty() {
            unresolved += 1;
            continue;
        }
        for residue in selected {
            let current = &mut metadata.residues[residue].secondary;
            if conflicts[residue] {
                continue;
            }
            if *current != SecondaryStructure::Unknown && *current != range.secondary {
                *current = SecondaryStructure::Unknown;
                conflicts[residue] = true;
                unresolved += 1;
            } else {
                *current = range.secondary;
            }
        }
    }
    Ok(unresolved)
}
