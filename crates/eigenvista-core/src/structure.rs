//! Optional, bounded biological identity for selected atoms. Coordinates and
//! quantum inputs remain in their existing scientific model.
use crate::Result;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

const MAX_RECORDS: usize = 100_000;
const MAX_STRING_BYTES: usize = 4 * 1024 * 1024;

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum ComponentKind {
    Protein,
    Nucleic,
    Ligand,
    Water,
    Ion,
    Unknown,
}

#[derive(Clone, Copy, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SecondaryStructure {
    Helix,
    Sheet,
    Coil,
    Unknown,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(deny_unknown_fields)]
pub struct StructureChain {
    pub label_id: Option<String>,
    pub author_id: Option<String>,
    pub entity_id: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct StructureResidue {
    pub chain: usize,
    pub name: String,
    pub label_seq_id: Option<i32>,
    pub author_seq_id: Option<String>,
    pub insertion_code: Option<String>,
    /// Observed segment identifier; PDB TER boundaries remain distinct even if
    /// the following records reuse the same chain and residue identifiers.
    pub segment: usize,
    pub kind: ComponentKind,
    pub secondary: SecondaryStructure,
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct StructureMetadata {
    pub chains: Vec<StructureChain>,
    pub residues: Vec<StructureResidue>,
    pub atom_names: Vec<String>,
    pub atom_residues: Vec<usize>,
    pub secondary_source: String,
}

fn string_budget(value: &str, limit: usize, bytes: &mut usize) -> Result<()> {
    if value.trim().is_empty() || value.len() > limit || value.chars().any(char::is_control) {
        return Err("Invalid or excessive biological metadata string".into());
    }
    *bytes = bytes
        .checked_add(value.len())
        .ok_or("Biological metadata size overflow")?;
    if *bytes > MAX_STRING_BYTES {
        return Err("Biological metadata strings exceed the 4 MiB budget".into());
    }
    Ok(())
}

impl StructureMetadata {
    pub fn validate(&self, atoms: usize) -> Result<()> {
        if atoms == 0
            || atoms > MAX_RECORDS
            || self.atom_names.len() != atoms
            || self.atom_residues.len() != atoms
            || self.chains.is_empty()
            || self.residues.is_empty()
            || self.chains.len() > self.residues.len()
            || self.residues.len() > atoms
        {
            return Err("Biological metadata counts do not match the selected atoms".into());
        }
        if !["none", "deposited"].contains(&self.secondary_source.as_str()) {
            return Err("Unsupported secondary-structure source".into());
        }
        if self.chains.iter().collect::<BTreeSet<_>>().len() != self.chains.len() {
            return Err("Duplicate biological chain identity".into());
        }
        let mut residue_keys = BTreeSet::new();
        let mut label_chains = BTreeSet::new();
        let mut label_residues = BTreeSet::new();
        let mut author_residues = BTreeSet::new();
        let mut bytes = 0;
        for chain in &self.chains {
            if chain
                .label_id
                .as_ref()
                .is_some_and(|label| !label_chains.insert(label))
            {
                return Err("Conflicting biological label-chain aliases".into());
            }
            for value in [&chain.label_id, &chain.author_id, &chain.entity_id]
                .into_iter()
                .flatten()
            {
                string_budget(value, 128, &mut bytes)?;
            }
        }
        let mut used_chains = vec![false; self.chains.len()];
        let mut used_residues = vec![false; self.residues.len()];
        for residue in &self.residues {
            if residue.chain >= self.chains.len() || residue.segment >= MAX_RECORDS {
                return Err("Biological residue has an invalid chain or segment index".into());
            }
            if residue.label_seq_id.is_some_and(|n| n <= 0)
                || !residue_keys.insert((
                    residue.chain,
                    &residue.name,
                    residue.label_seq_id,
                    &residue.author_seq_id,
                    &residue.insertion_code,
                    residue.segment,
                ))
            {
                return Err("Invalid or duplicate biological residue identity".into());
            }
            let unique = match residue.label_seq_id {
                Some(sequence) => label_residues.insert((
                    residue.chain,
                    sequence,
                    &residue.insertion_code,
                    residue.segment,
                    &residue.name,
                )),
                None => author_residues.insert((
                    residue.chain,
                    &residue.author_seq_id,
                    &residue.insertion_code,
                    residue.segment,
                    &residue.name,
                )),
            };
            if !unique {
                return Err("Conflicting biological residue aliases".into());
            }
            if residue.kind != ComponentKind::Protein
                && residue.secondary != SecondaryStructure::Unknown
            {
                return Err("Protein secondary annotations require a protein residue".into());
            }
            used_chains[residue.chain] = true;
            string_budget(&residue.name, 128, &mut bytes)?;
            if let Some(value) = &residue.author_seq_id {
                string_budget(value, 64, &mut bytes)?;
            }
            if let Some(value) = &residue.insertion_code {
                string_budget(value, 16, &mut bytes)?;
            }
            if self.secondary_source == "none" && residue.secondary != SecondaryStructure::Unknown {
                return Err("Secondary annotations require a deposited source".into());
            }
        }
        for (name, &residue) in self.atom_names.iter().zip(&self.atom_residues) {
            string_budget(name, 128, &mut bytes)?;
            let Some(used) = used_residues.get_mut(residue) else {
                return Err("Biological atom has an invalid residue index".into());
            };
            *used = true;
        }
        if used_chains.contains(&false) || used_residues.contains(&false) {
            return Err("Biological metadata contains unreferenced chains or residues".into());
        }
        Ok(())
    }
}

pub(crate) fn optional(value: &str) -> Option<String> {
    let value = value.trim();
    if value.is_empty() || value == "." || value == "?" {
        None
    } else {
        Some(value.to_owned())
    }
}

/// Conservative recognized component names; supplied polymer metadata takes
/// precedence. HETATM alone does not imply ligand or exclude a modified polymer.
pub(crate) fn named_kind(name: &str) -> ComponentKind {
    match name.to_ascii_uppercase().as_str() {
        "ALA" | "ARG" | "ASN" | "ASP" | "CYS" | "GLN" | "GLU" | "GLY" | "HIS" | "ILE" | "LEU"
        | "LYS" | "MET" | "PHE" | "PRO" | "SER" | "THR" | "TRP" | "TYR" | "VAL" | "SEC" | "PYL"
        | "ASX" | "GLX" | "MSE" => ComponentKind::Protein,
        "A" | "C" | "G" | "U" | "I" | "DA" | "DC" | "DG" | "DT" | "DI" | "ADE" | "CYT" | "GUA"
        | "THY" | "URA" => ComponentKind::Nucleic,
        "HOH" | "WAT" | "DOD" => ComponentKind::Water,
        _ => ComponentKind::Unknown,
    }
}

pub(crate) fn polymer_kind(kind: &str) -> ComponentKind {
    let kind = kind.to_ascii_lowercase();
    if kind.starts_with("polypeptide") {
        ComponentKind::Protein
    } else if kind.contains("ribonucleotide") {
        ComponentKind::Nucleic
    } else {
        ComponentKind::Unknown
    }
}

pub(crate) fn is_ion(name: &str, element: u16) -> bool {
    let expected = match name.to_ascii_uppercase().as_str() {
        "LI" => 3,
        "NA" => 11,
        "K" => 19,
        "RB" => 37,
        "CS" => 55,
        "MG" => 12,
        "CA" => 20,
        "SR" => 38,
        "BA" => 56,
        "MN" => 25,
        "FE" => 26,
        "CO" => 27,
        "NI" => 28,
        "CU" => 29,
        "ZN" => 30,
        "CD" => 48,
        "HG" => 80,
        "AL" => 13,
        "F" => 9,
        "CL" => 17,
        "BR" => 35,
        "IOD" | "I" => 53,
        _ => return false,
    };
    expected == element
}

type ResidueIdentity = (
    usize,
    String,
    Option<i32>,
    Option<String>,
    Option<String>,
    usize,
);

pub(crate) struct StructureBuilder {
    pub metadata: StructureMetadata,
    chains: BTreeMap<StructureChain, usize>,
    residues: BTreeMap<ResidueIdentity, usize>,
    string_bytes: usize,
}

impl StructureBuilder {
    pub fn new() -> Self {
        Self {
            metadata: StructureMetadata {
                chains: vec![],
                residues: vec![],
                atom_names: vec![],
                atom_residues: vec![],
                secondary_source: "none".into(),
            },
            chains: BTreeMap::new(),
            residues: BTreeMap::new(),
            string_bytes: 0,
        }
    }

    pub fn push(
        &mut self,
        chain: StructureChain,
        mut residue: StructureResidue,
        atom_name: String,
    ) -> Result<()> {
        if self.metadata.atom_names.len() >= MAX_RECORDS {
            return Err("Biological atom budget exceeded".into());
        }
        string_budget(&atom_name, 128, &mut self.string_bytes)?;
        let chain_index = if let Some(&index) = self.chains.get(&chain) {
            index
        } else {
            for value in [&chain.label_id, &chain.author_id, &chain.entity_id]
                .into_iter()
                .flatten()
            {
                string_budget(value, 128, &mut self.string_bytes)?;
            }
            let index = self.metadata.chains.len();
            self.metadata.chains.push(chain.clone());
            self.chains.insert(chain, index);
            index
        };
        residue.chain = chain_index;
        let key = (
            chain_index,
            residue.name.clone(),
            residue.label_seq_id,
            residue.author_seq_id.clone(),
            residue.insertion_code.clone(),
            residue.segment,
        );
        let index = if let Some(&index) = self.residues.get(&key) {
            index
        } else {
            string_budget(&residue.name, 128, &mut self.string_bytes)?;
            if let Some(value) = &residue.author_seq_id {
                string_budget(value, 64, &mut self.string_bytes)?;
            }
            if let Some(value) = &residue.insertion_code {
                string_budget(value, 16, &mut self.string_bytes)?;
            }
            let index = self.metadata.residues.len();
            self.metadata.residues.push(residue);
            self.residues.insert(key, index);
            index
        };
        self.metadata.atom_names.push(atom_name);
        self.metadata.atom_residues.push(index);
        Ok(())
    }
}
