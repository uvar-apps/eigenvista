use super::{column, serial};
use crate::import::biological::{MAX_METADATA_ROWS, SecondaryRange, secondary_ranges};
use crate::structure::{StructureBuilder, is_ion, named_kind, optional};
use crate::{
    ComponentKind, Result, SecondaryStructure, StructureChain, StructureMetadata, StructureResidue,
};
use std::collections::{BTreeMap, HashMap, HashSet};

#[derive(Clone, PartialEq, Eq, PartialOrd, Ord)]
struct ResidueKey {
    chain: String,
    sequence: i32,
    insertion: String,
    segment: usize,
}

struct Identity {
    residue: ResidueKey,
    name: String,
    atom_name: String,
    alt: Option<String>,
    hetero: bool,
    occupancy: f64,
}

pub(super) struct PdbMetadata {
    identities: HashMap<usize, Identity>,
    modifications: BTreeMap<(String, i32, String, String), ComponentKind>,
    ranges: Vec<SecondaryRange>,
}

fn sequence(value: &str) -> Result<i32> {
    value
        .trim()
        .parse()
        .map_err(|_| "Invalid PDB biological residue sequence".into())
}

impl PdbMetadata {
    pub fn parse(source: &str, normalized: &str) -> Result<Self> {
        let mut result = Self {
            identities: HashMap::new(),
            modifications: BTreeMap::new(),
            ranges: vec![],
        };
        let mut model = 0;
        let mut closed = false;
        let mut segment = 0;
        for line in source.lines() {
            let record = line.get(..6).unwrap_or(line).trim();
            match record {
                "MODEL" => model += 1,
                "ENDMDL" => closed = true,
                "END" => break,
                "TER" if model <= 1 && !closed => {
                    segment += 1;
                    if segment >= MAX_METADATA_ROWS {
                        return Err("Too many PDB TER segments".into());
                    }
                }
                "ATOM" | "HETATM" if model <= 1 && !closed => {
                    let id = serial(column(line, 6, 11))?;
                    result.identities.insert(
                        id,
                        Identity {
                            residue: ResidueKey {
                                chain: column(line, 21, 22).trim().into(),
                                sequence: sequence(column(line, 22, 26))?,
                                insertion: column(line, 26, 27).trim().into(),
                                segment,
                            },
                            name: column(line, 17, 20).trim().into(),
                            atom_name: column(line, 12, 16).trim().into(),
                            alt: optional(column(line, 16, 17)),
                            hetero: record == "HETATM",
                            occupancy: 1.0,
                        },
                    );
                }
                "MODRES" => {
                    if result.modifications.len() >= MAX_METADATA_ROWS {
                        return Err("Too many PDB MODRES records".into());
                    }
                    result.modifications.insert(
                        (
                            column(line, 16, 17).trim().into(),
                            sequence(column(line, 18, 22))?,
                            column(line, 22, 23).trim().into(),
                            column(line, 12, 15).trim().into(),
                        ),
                        named_kind(column(line, 24, 27).trim()),
                    );
                }
                "HELIX" | "SHEET" => {
                    if result.ranges.len() >= MAX_METADATA_ROWS {
                        return Err("Too many PDB secondary annotations".into());
                    }
                    let (a, b, c, name) = if record == "HELIX" {
                        (19, 21, 25, 15)
                    } else {
                        (21, 22, 26, 17)
                    };
                    let start_chain = column(line, a, a + 1).trim();
                    let end_chain = column(
                        line,
                        31 + usize::from(record == "SHEET"),
                        32 + usize::from(record == "SHEET"),
                    )
                    .trim();
                    if start_chain != end_chain {
                        return Err("PDB secondary range crosses chain identifiers".into());
                    }
                    let start = (
                        sequence(column(line, b, b + 4))?,
                        column(line, c, c + 1).trim().into(),
                    );
                    let end = (
                        sequence(column(line, 33, 37))?,
                        column(line, 37, 38).trim().into(),
                    );
                    if start > end {
                        return Err("Reversed PDB secondary range".into());
                    }
                    result.ranges.push(SecondaryRange {
                        label: false,
                        chain: start_chain.into(),
                        start,
                        end,
                        start_name: optional(column(line, name, name + 3)),
                        end_name: optional(column(
                            line,
                            if record == "HELIX" { 27 } else { 28 },
                            if record == "HELIX" { 30 } else { 31 },
                        )),
                        secondary: if record == "HELIX" {
                            SecondaryStructure::Helix
                        } else {
                            SecondaryStructure::Sheet
                        },
                    });
                }
                _ => (),
            }
        }
        // Retain the existing narrow repairs of legacy five-column hydrogen
        // names/alternate labels; biological identity otherwise uses source IDs.
        for line in normalized.lines() {
            if !matches!(line.get(..6).unwrap_or(line).trim(), "ATOM" | "HETATM") {
                continue;
            }
            let id = serial(column(line, 6, 11))?;
            if let Some(identity) = result.identities.get_mut(&id) {
                identity.atom_name = column(line, 12, 16).trim().into();
                identity.alt = optional(column(line, 16, 17));
                identity.occupancy = column(line, 54, 60)
                    .trim()
                    .parse()
                    .map_err(|_| "Invalid normalized PDB occupancy")?;
            }
        }
        Ok(result)
    }

    pub fn select<'a>(
        &self,
        atoms: impl Iterator<Item = &'a pdbtbx::Atom>,
    ) -> Result<(Vec<&'a pdbtbx::Atom>, usize)> {
        let mut groups: BTreeMap<&ResidueKey, Vec<&pdbtbx::Atom>> = BTreeMap::new();
        let mut source_serials = HashSet::new();
        for atom in atoms {
            if !source_serials.insert(atom.serial_number()) {
                continue;
            }
            let identity = self
                .identities
                .get(&atom.serial_number())
                .ok_or("PDB parser/source atom identity mismatch")?;
            groups.entry(&identity.residue).or_default().push(atom);
        }
        let mut selected = Vec::new();
        let mut discarded = 0;
        for atoms in groups.values() {
            let mut alternatives: BTreeMap<(&str, &str), (f64, usize)> = BTreeMap::new();
            for atom in atoms {
                let identity = &self.identities[&atom.serial_number()];
                if let Some(alt) = &identity.alt {
                    let entry = alternatives.entry((alt, &identity.name)).or_default();
                    entry.0 += identity.occupancy;
                    entry.1 += 1;
                }
            }
            let preferred = alternatives
                .iter()
                .max_by(|(ka, a), (kb, b)| {
                    (a.0 / a.1 as f64)
                        .total_cmp(&(b.0 / b.1 as f64))
                        .then(kb.cmp(ka))
                })
                .map(|(key, _)| *key);
            let mut names = HashSet::new();
            for &atom in atoms {
                let identity = &self.identities[&atom.serial_number()];
                let keep = identity
                    .alt
                    .as_deref()
                    .is_none_or(|alt| preferred == Some((alt, identity.name.as_str())));
                if !keep || identity.occupancy == 0.0 {
                    discarded += 1;
                    continue;
                }
                if !names.insert(atom.name()) {
                    return Err(format!(
                        "Duplicate PDB atom name {} in selected source residue",
                        atom.name()
                    ));
                }
                selected.push(atom);
            }
        }
        Ok((selected, discarded))
    }

    pub fn build(&self, selected: &[&pdbtbx::Atom]) -> Result<(StructureMetadata, usize)> {
        let mut counts: BTreeMap<&ResidueKey, usize> = BTreeMap::new();
        for atom in selected {
            *counts
                .entry(&self.identities[&atom.serial_number()].residue)
                .or_default() += 1;
        }
        let mut builder = StructureBuilder::new();
        for atom in selected {
            let identity = &self.identities[&atom.serial_number()];
            let key = &identity.residue;
            let modified = self
                .modifications
                .get(&(
                    key.chain.clone(),
                    key.sequence,
                    key.insertion.clone(),
                    identity.name.clone(),
                ))
                .copied();
            let kind = modified.unwrap_or_else(|| {
                if identity.hetero
                    && counts[key] == 1
                    && is_ion(
                        &identity.name,
                        atom.element()
                            .map_or(0, |element| element.atomic_number() as u16),
                    )
                {
                    ComponentKind::Ion
                } else {
                    let named = named_kind(&identity.name);
                    if named != ComponentKind::Unknown {
                        named
                    } else if identity.hetero {
                        ComponentKind::Ligand
                    } else {
                        ComponentKind::Unknown
                    }
                }
            });
            builder.push(
                StructureChain {
                    label_id: None,
                    author_id: optional(&key.chain),
                    entity_id: None,
                },
                StructureResidue {
                    chain: 0,
                    name: identity.name.clone(),
                    label_seq_id: None,
                    author_seq_id: Some(key.sequence.to_string()),
                    insertion_code: optional(&key.insertion),
                    segment: key.segment,
                    kind,
                    secondary: SecondaryStructure::Unknown,
                },
                identity.atom_name.clone(),
            )?;
        }
        let unresolved = secondary_ranges(&mut builder.metadata, &self.ranges)?;
        builder.metadata.validate(selected.len())?;
        Ok((builder.metadata, unresolved))
    }
}
