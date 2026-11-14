//! Small bounded metadata categories share CIF tokenization, but never retain
//! entire sequences/descriptions or reinterpret the selected coordinate model.
use super::{
    MAX_CIF_COLUMNS, MAX_LINE_FIELDS, Site, boundary_line_end, control_token, is_null,
    raw_scalar_value, text_block_value, tokens,
};
use crate::import::biological::{MAX_METADATA_ROWS, SecondaryRange, secondary_ranges};
use crate::structure::{StructureBuilder, is_ion, named_kind, optional, polymer_kind};
use crate::{
    ComponentKind, Result, SecondaryStructure, StructureChain, StructureMetadata, StructureResidue,
};
use std::collections::{BTreeMap, BTreeSet};

type Row = BTreeMap<String, String>;
const MAX_METADATA_BYTES: usize = 4 * 1024 * 1024;
const CATEGORIES: [&str; 6] = [
    "entity",
    "entity_poly",
    "struct_asym",
    "chem_comp",
    "struct_conf",
    "struct_sheet_range",
];

fn category(tag: &str) -> Option<&str> {
    let category = tag.strip_prefix('_')?.split_once('.')?.0;
    CATEGORIES.contains(&category).then_some(category)
}

fn wanted(column: &str) -> bool {
    [
        "id",
        "type",
        "entity_id",
        "mon_nstd_parent_comp_id",
        "conf_type_id",
    ]
    .contains(&column)
        || column.starts_with("beg_label_")
        || column.starts_with("end_label_")
        || column.starts_with("beg_auth_")
        || column.starts_with("end_auth_")
        || ["pdbx_beg_pdb_ins_code", "pdbx_end_pdb_ins_code"].contains(&column)
}

fn value(row: &Row, column: &str) -> String {
    row.get(column).cloned().unwrap_or_default()
}
fn optional_value(row: &Row, column: &str) -> Option<String> {
    optional(&value(row, column))
}

pub(super) struct CifMetadata {
    rows: BTreeMap<String, Vec<Row>>,
    bytes: usize,
    count: usize,
}

impl CifMetadata {
    fn push(&mut self, category: &str, row: Row) -> Result<()> {
        self.count += 1;
        if self.count > MAX_METADATA_ROWS {
            return Err("mmCIF biological metadata exceeds the row budget".into());
        }
        self.rows.entry(category.into()).or_default().push(row);
        Ok(())
    }

    fn field(&mut self, column: &str, value: &str) -> Result<String> {
        if !wanted(column) {
            return Ok(String::new());
        }
        self.bytes = self
            .bytes
            .checked_add(column.len() + value.len())
            .ok_or("mmCIF metadata size overflow")?;
        if value.len() > 256
            || value.chars().any(char::is_control)
            || self.bytes > MAX_METADATA_BYTES
        {
            return Err("mmCIF biological metadata exceeds the string budget".into());
        }
        Ok(value.into())
    }

    pub fn parse(text: &str, selected_block: usize) -> Result<Self> {
        let mut result = Self {
            rows: BTreeMap::new(),
            bytes: 0,
            count: 0,
        };
        let mut lines = text.lines().peekable();
        let mut block = 0;
        let mut header: Vec<String> = vec![];
        let mut fields: Vec<String> = vec![];
        let mut scalar_category: Option<String> = None;
        let mut scalar = Row::new();
        while let Some(raw) = lines.next() {
            let line = raw.trim();
            if line.is_empty() || line.starts_with('#') {
                continue;
            }
            if raw.starts_with(';') {
                if !header.is_empty() && wanted(header[fields.len()].split_once('.').unwrap().1) {
                    let contents = text_block_value(raw, &mut lines)?;
                    result.loop_value(&header, &mut fields, &contents)?;
                } else {
                    super::skip_text_block(&mut lines)?;
                    if !header.is_empty() {
                        result.loop_value(&header, &mut fields, "")?;
                    }
                }
                continue;
            }
            let word = line.split_whitespace().next().unwrap_or_default();
            let lower = word.to_ascii_lowercase();
            let data = lower.starts_with("data_");
            let loop_start = lower == "loop_";
            let scalar_start = lower.starts_with('_');
            let boundary = data || loop_start || scalar_start || lower == "stop_";
            if boundary {
                if !fields.is_empty() {
                    return Err("Incomplete mmCIF biological metadata row".into());
                }
                if !scalar.is_empty()
                    && (!scalar_start || category(&lower) != scalar_category.as_deref())
                {
                    result.push(
                        scalar_category.as_deref().unwrap(),
                        std::mem::take(&mut scalar),
                    )?;
                    scalar_category = None;
                }
                header.clear();
            }
            if data {
                block += 1;
                continue;
            }
            if loop_start {
                let mut tags = Vec::new();
                let rest = line[word.len()..].trim();
                if !rest.is_empty() {
                    super::header_tags(&mut tags, rest)?;
                }
                while let Some(next) = lines.peek() {
                    if next.trim_start().starts_with('_') {
                        super::header_tags(&mut tags, next.trim())?;
                        lines.next();
                    } else {
                        break;
                    }
                }
                if block == selected_block && tags.first().and_then(|t| category(t)).is_some() {
                    let prefix = tags[0].split_once('.').unwrap().0;
                    if tags.len() > MAX_CIF_COLUMNS
                        || tags
                            .iter()
                            .any(|tag| tag.split_once('.').map(|(p, _)| p) != Some(prefix))
                        || tags.iter().collect::<BTreeSet<_>>().len() != tags.len()
                    {
                        return Err("Invalid biological metadata loop columns".into());
                    }
                    header = tags;
                }
                continue;
            }
            if scalar_start {
                let raw_value = raw_scalar_value(raw, &mut lines)?;
                if block == selected_block
                    && let Some(cat) = category(&lower)
                {
                    let column = lower.split_once('.').unwrap().1;
                    let field = result.field(column, &raw_value)?;
                    scalar_category = Some(cat.into());
                    if wanted(column) && scalar.insert(column.into(), field).is_some() {
                        return Err("Duplicate biological metadata scalar column".into());
                    }
                }
                continue;
            }
            if lower == "stop_" {
                boundary_line_end(&line[word.len()..])?;
                continue;
            }
            if !header.is_empty() {
                for token in tokens(raw, MAX_LINE_FIELDS)? {
                    if !token.quoted && control_token(token.value) {
                        return Err("Inline control in biological metadata loop".into());
                    }
                    result.loop_value(&header, &mut fields, token.value)?;
                }
            }
        }
        if !fields.is_empty() {
            return Err("Incomplete mmCIF biological metadata row".into());
        }
        if !scalar.is_empty() {
            result.push(scalar_category.as_deref().unwrap(), scalar)?;
        }
        Ok(result)
    }

    fn loop_value(
        &mut self,
        header: &[String],
        fields: &mut Vec<String>,
        text: &str,
    ) -> Result<()> {
        let column = header[fields.len()].split_once('.').unwrap().1;
        fields.push(self.field(column, text)?);
        if fields.len() == header.len() {
            let cat = category(&header[0]).unwrap();
            let row = header
                .iter()
                .map(|tag| tag.split_once('.').unwrap().1)
                .zip(fields.drain(..))
                .filter(|(column, _)| wanted(column))
                .map(|(column, value)| (column.into(), value))
                .collect();
            self.push(cat, row)?;
        }
        Ok(())
    }

    fn keyed(&self, category: &str, key: &str, field: &str) -> Result<BTreeMap<String, String>> {
        let mut result = BTreeMap::new();
        for row in self.rows.get(category).into_iter().flatten() {
            if let (Some(id), Some(value)) = (optional_value(row, key), optional_value(row, field))
            {
                if result.get(&id).is_some_and(|previous| previous != &value) {
                    return Err(format!("Conflicting mmCIF {category} identifiers"));
                }
                result.insert(id, value);
            }
        }
        Ok(result)
    }

    pub fn build(&self, selected: &[&Site]) -> Result<(Option<StructureMetadata>, usize)> {
        if selected.iter().any(|site| {
            (is_null(&site.identity.label[1]) && is_null(&site.identity.author[1]))
                || (is_null(&site.identity.label[3]) && is_null(&site.identity.author[3]))
                || (is_null(&site.identity.label[0]) && is_null(&site.identity.author[0]))
                || (is_null(&site.identity.label[2]) && is_null(&site.identity.author[2]))
        }) {
            return Ok((None, 0));
        }
        let entities = self.keyed("entity", "id", "type")?;
        let polymers = self.keyed("entity_poly", "entity_id", "type")?;
        let asym = self.keyed("struct_asym", "id", "entity_id")?;
        let chemical = self.keyed("chem_comp", "id", "type")?;
        let parents = self.keyed("chem_comp", "id", "mon_nstd_parent_comp_id")?;
        let mut counts = BTreeMap::new();
        for site in selected {
            *counts.entry(&site.key).or_insert(0usize) += 1;
        }
        let mut builder = StructureBuilder::new();
        for site in selected {
            let identity = &site.identity;
            let label = optional(&identity.label[0]);
            let entity = optional(&site.key.0)
                .or_else(|| label.as_ref().and_then(|label| asym.get(label).cloned()));
            if let (Some(label), Some(entity)) = (&label, &entity)
                && asym.get(label).is_some_and(|declared| declared != entity)
            {
                return Err("Conflicting mmCIF chain/entity identifiers".into());
            }
            let entity_type = entity
                .as_ref()
                .and_then(|e| entities.get(e))
                .map(|v| v.to_ascii_lowercase());
            let polymer = entity.as_ref().and_then(|e| polymers.get(e));
            let name = optional(&identity.label[1])
                .or_else(|| optional(&identity.author[1]))
                .unwrap();
            let chem_type = chemical.get(&name).map(|s| s.to_ascii_lowercase());
            let singleton_ion = counts[&site.key] == 1 && is_ion(&name, site.z);
            let kind = if entity_type.as_deref() == Some("water") {
                ComponentKind::Water
            } else if let Some(polymer) = polymer {
                polymer_kind(polymer)
            } else if entity_type.as_deref() == Some("non-polymer") {
                if singleton_ion {
                    ComponentKind::Ion
                } else if named_kind(&name) == ComponentKind::Water {
                    ComponentKind::Water
                } else {
                    ComponentKind::Ligand
                }
            } else if chem_type
                .as_ref()
                .is_some_and(|kind| kind.contains("peptide linking"))
            {
                ComponentKind::Protein
            } else if chem_type
                .as_ref()
                .is_some_and(|kind| kind.contains("rna linking") || kind.contains("dna linking"))
            {
                ComponentKind::Nucleic
            } else if singleton_ion && site.hetero {
                ComponentKind::Ion
            } else if let Some(parent) = parents.get(&name).filter(|p| !p.contains(',')) {
                named_kind(parent)
            } else {
                let named = named_kind(&name);
                if named != ComponentKind::Unknown {
                    named
                } else if site.hetero {
                    ComponentKind::Ligand
                } else {
                    ComponentKind::Unknown
                }
            };
            let label_seq_id = if is_null(&identity.label[2]) {
                None
            } else {
                Some(
                    identity.label[2]
                        .parse::<i32>()
                        .ok()
                        .filter(|n| *n > 0)
                        .ok_or("Invalid mmCIF label residue sequence")?,
                )
            };
            builder.push(
                StructureChain {
                    label_id: label,
                    author_id: optional(&identity.author[0]),
                    entity_id: entity,
                },
                StructureResidue {
                    chain: 0,
                    name,
                    label_seq_id,
                    author_seq_id: optional(&identity.author[2]),
                    insertion_code: identity.insertion.clone(),
                    segment: 0,
                    kind,
                    secondary: SecondaryStructure::Unknown,
                },
                optional(&identity.label[3])
                    .or_else(|| optional(&identity.author[3]))
                    .unwrap(),
            )?;
        }
        let endpoint_index: BTreeMap<_, _> = selected
            .iter()
            .filter_map(|site| {
                site.identity.label[2]
                    .parse::<i32>()
                    .ok()
                    .map(|sequence| ((site.identity.label[0].as_str(), sequence), &site.identity))
            })
            .collect();
        let mut ranges = Vec::new();
        let mut unresolved = 0;
        for (category, secondary) in [
            ("struct_conf", None),
            ("struct_sheet_range", Some(SecondaryStructure::Sheet)),
        ] {
            for row in self.rows.get(category).into_iter().flatten() {
                let secondary = secondary.or_else(|| {
                    let kind = value(row, "conf_type_id").to_ascii_uppercase();
                    if kind.starts_with("HELX") {
                        Some(SecondaryStructure::Helix)
                    } else if kind.starts_with("TURN") {
                        Some(SecondaryStructure::Coil)
                    } else {
                        None
                    }
                });
                let Some(secondary) = secondary else {
                    unresolved += 1;
                    continue;
                };
                if let Some(range) = range(row, secondary) {
                    if !range_constraints_match(row, &range, &endpoint_index) {
                        unresolved += 1;
                        continue;
                    }
                    ranges.push(range);
                } else {
                    unresolved += 1;
                }
            }
        }
        unresolved += secondary_ranges(&mut builder.metadata, &ranges)?;
        builder.metadata.validate(selected.len())?;
        Ok((Some(builder.metadata), unresolved))
    }
}

fn range(row: &Row, secondary: SecondaryStructure) -> Option<SecondaryRange> {
    for namespace in ["label", "auth"] {
        let Some(start_chain) = optional_value(row, &format!("beg_{namespace}_asym_id")) else {
            continue;
        };
        let Some(end_chain) = optional_value(row, &format!("end_{namespace}_asym_id")) else {
            continue;
        };
        if start_chain != end_chain {
            continue;
        }
        let start = optional_value(row, &format!("beg_{namespace}_seq_id"))
            .and_then(|s| s.parse::<i32>().ok());
        let end = optional_value(row, &format!("end_{namespace}_seq_id"))
            .and_then(|s| s.parse::<i32>().ok());
        let (Some(start), Some(end)) = (start, end) else {
            continue;
        };
        let label = namespace == "label";
        return Some(SecondaryRange {
            label,
            chain: start_chain,
            start: (
                start,
                if label {
                    String::new()
                } else {
                    value(row, "pdbx_beg_pdb_ins_code")
                }
                .trim_matches(['.', '?'])
                .to_string(),
            ),
            end: (
                end,
                if label {
                    String::new()
                } else {
                    value(row, "pdbx_end_pdb_ins_code")
                }
                .trim_matches(['.', '?'])
                .to_string(),
            ),
            start_name: optional_value(row, &format!("beg_{namespace}_comp_id")),
            end_name: optional_value(row, &format!("end_{namespace}_comp_id")),
            secondary,
        });
    }
    None
}

// When both namespaces are supplied, the secondary annotation must not
// contradict an observed endpoint. Missing endpoints remain range references.
fn range_constraints_match(
    row: &Row,
    range: &SecondaryRange,
    index: &BTreeMap<(&str, i32), &super::SiteIdentity>,
) -> bool {
    if !range.label {
        return true;
    }
    for (side, sequence) in [("beg", range.start.0), ("end", range.end.0)] {
        let Some(identity) = index.get(&(range.chain.as_str(), sequence)) else {
            continue;
        };
        for (suffix, position) in [("asym_id", 0), ("comp_id", 1), ("seq_id", 2)] {
            if let Some(expected) = optional_value(row, &format!("{side}_auth_{suffix}")) {
                let actual = &identity.author[position];
                let equal = expected == *actual
                    || (position == 2
                        && expected
                            .parse::<i32>()
                            .ok()
                            .zip(actual.parse::<i32>().ok())
                            .is_some_and(|(a, b)| a == b));
                if !equal {
                    return false;
                }
            }
        }
        if let Some(expected) = optional_value(row, &format!("pdbx_{side}_pdb_ins_code"))
            && identity.insertion.as_deref() != Some(expected.as_str())
        {
            return false;
        }
    }
    true
}
