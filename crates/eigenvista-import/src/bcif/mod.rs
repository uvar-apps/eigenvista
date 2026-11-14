//! Bounded BinaryCIF transport; scientific interpretation stays in the CIF importer.

mod encoding;
mod messagepack;
#[cfg(test)]
mod profile_tests;
#[cfg(test)]
mod tests;

use eigenvista_core::{Document, import};
use encoding::{Budget, Column, array, count, decode, field, object, text};
use flate2::read::MultiGzDecoder;
use std::io::Read;

const MAX_PAYLOAD_BYTES: usize = 64 * 1024 * 1024;
const MAX_CIF_BYTES: usize = 64 * 1024 * 1024;
const MAX_COLUMNS: usize = 256;

/// MessagePack object markers and gzip magic precede UTF-8 decoding.
pub(super) fn candidate(bytes: &[u8]) -> bool {
    matches!(bytes.first(), Some(0x80..=0x8f | 0xde | 0xdf)) || bytes.starts_with(&[0x1f, 0x8b])
}

pub(super) fn parse(bytes: &[u8], name: &str) -> Result<Document, String> {
    let expanded;
    let payload = if bytes.starts_with(&[0x1f, 0x8b]) {
        let mut reader = MultiGzDecoder::new(bytes).take((MAX_PAYLOAD_BYTES + 1) as u64);
        expanded = {
            let mut output = Vec::new();
            reader
                .read_to_end(&mut output)
                .map_err(|error| format!("BinaryCIF gzip decoding failed: {error}"))?;
            if output.len() > MAX_PAYLOAD_BYTES {
                return Err("BinaryCIF gzip output exceeds the 64 MiB payload budget".into());
            }
            output
        };
        expanded.as_slice()
    } else {
        bytes
    };
    if payload.len() > MAX_PAYLOAD_BYTES {
        return Err("BinaryCIF exceeds the 64 MiB payload budget".into());
    }
    let packed = messagepack::parse(payload)?;
    let root = object(&packed)?;
    let version = text(field(root, "version")?)?;
    if !valid_version(version) {
        return Err("BinaryCIF supports the 0.3.x format version".into());
    }
    let _encoder = text(field(root, "encoder")?)?;
    let blocks = array(field(root, "dataBlocks")?)?;
    if blocks.len() != 1 {
        return Err("BinaryCIF requires exactly one data block in this preview".into());
    }
    let block = object(&blocks[0])?;
    let header = text(field(block, "header")?)?;
    if header.is_empty() || header.len() > 256 || header.chars().any(char::is_whitespace) {
        return Err("BinaryCIF block header is empty, excessive, or contains whitespace".into());
    }
    let mut output = CifText::new();
    output.push("data_EigenVista_BinaryCIF\n#\n")?;
    let mut budget = Budget::new();
    let mut seen = std::collections::BTreeSet::new();
    let mut atoms = false;
    for category in array(field(block, "categories")?)? {
        let category = object(category)?;
        let raw_name = text(field(category, "name")?)?;
        let category_name = raw_name.strip_prefix('_').unwrap_or(raw_name);
        if !valid_name(category_name, false) {
            return Err("BinaryCIF invalid category name".into());
        }
        let category_name = category_name.to_ascii_lowercase();
        if !seen.insert(category_name.clone()) {
            return Err("BinaryCIF duplicate category".into());
        }
        let rows = count(field(category, "rowCount")?)?;
        let columns = array(field(category, "columns")?)?;
        // Unused categories remain bounded borrowed MessagePack, without expanding
        // their columns or pretending to preserve metadata the model cannot hold.
        if !matches!(
            category_name.as_str(),
            "atom_site"
                | "struct_conn"
                | "cell"
                | "symmetry"
                | "space_group"
                | "entity"
                | "entity_poly"
                | "struct_asym"
                | "chem_comp"
                | "struct_conf"
                | "struct_sheet_range"
        ) {
            continue;
        }
        if columns.is_empty() || columns.len() > MAX_COLUMNS {
            return Err("BinaryCIF category needs 1..256 columns".into());
        }
        let maximum_rows = match category_name.as_str() {
            "atom_site" => 250_000,
            "struct_conn" | "entity" | "entity_poly" | "struct_asym" | "chem_comp"
            | "struct_conf" | "struct_sheet_range" => 100_000,
            _ => 1,
        };
        if rows > maximum_rows {
            return Err(format!("BinaryCIF {category_name} exceeds its row budget"));
        }
        if rows == 0 {
            continue;
        }
        let columns = columns
            .iter()
            .map(|column| DecodedColumn::new(column, rows, &mut budget))
            .collect::<Result<Vec<_>, _>>()?;
        let mut names = std::collections::BTreeSet::new();
        for column in &columns {
            if !names.insert(column.name.to_ascii_lowercase()) {
                return Err("BinaryCIF duplicate column name".into());
            }
        }
        if !matches!(category_name.as_str(), "cell" | "symmetry" | "space_group") {
            atoms |= category_name == "atom_site";
            write_loop(&mut output, &category_name, &columns, rows)?;
        } else {
            for column in &columns {
                output.tag(&category_name, column.name)?;
                output.push(" ")?;
                output.value(column, 0, false)?;
                output.push("\n")?;
            }
        }
        output.push("#\n")?;
    }
    if !atoms {
        return Err("BinaryCIF has no atom_site rows".into());
    }
    let mut document = import::cif(&output.0, name)?;
    document.provenance.push(format!("BinaryCIF {version}; data block {header}; decoded through the shared mmCIF structure profile. Only atom sites, declared connections, bounded biological identity/secondary categories, cell and symmetry metadata were interpreted; no quantum data fabricated."));
    Ok(document)
}

fn valid_version(version: &str) -> bool {
    version.strip_prefix("0.3.").is_some_and(|patch| {
        !patch.is_empty() && patch.len() <= 5 && patch.bytes().all(|byte| byte.is_ascii_digit())
    })
}
fn valid_name(name: &str, column: bool) -> bool {
    !name.is_empty()
        && name.len() <= 256
        && name.bytes().all(|byte| {
            byte.is_ascii_alphanumeric()
                || byte == b'_'
                || (column && matches!(byte, b'-' | b'[' | b']'))
        })
}

struct DecodedColumn<'a> {
    name: &'a str,
    values: Column<'a>,
    mask: Option<Vec<i64>>,
}
impl<'a> DecodedColumn<'a> {
    fn new(
        value: &'a messagepack::Value<'a>,
        rows: usize,
        budget: &mut Budget,
    ) -> Result<Self, String> {
        let record = object(value)?;
        let name = text(field(record, "name")?)?;
        if !valid_name(name, true) {
            return Err("BinaryCIF invalid column name".into());
        }
        let values = decode(object(field(record, "data")?)?, budget)?;
        if values.len() != rows {
            return Err("BinaryCIF column length differs from rowCount".into());
        }
        let mask = match record.get("mask") {
            None | Some(messagepack::Value::Nil) => None,
            Some(value) => {
                let mask = decode(object(value)?, budget)?.ints()?;
                if mask.len() != rows || mask.iter().any(|value| !(0..=2).contains(value)) {
                    return Err("BinaryCIF invalid presence mask".into());
                }
                Some(mask)
            }
        };
        Ok(Self { name, values, mask })
    }
}

fn write_loop(
    output: &mut CifText,
    category: &str,
    columns: &[DecodedColumn<'_>],
    rows: usize,
) -> Result<(), String> {
    output.push("loop_\n")?;
    for column in columns {
        output.tag(category, column.name)?;
        output.push("\n")?;
    }
    for row in 0..rows {
        for (index, column) in columns.iter().enumerate() {
            if index > 0 {
                output.push(" ")?;
            }
            output.value(column, row, category == "atom_site")?;
        }
        output.push("\n")?;
    }
    Ok(())
}

/// All canonical text growth is checked before allocation or copying a value.
struct CifText(String);
impl CifText {
    fn new() -> Self {
        Self(String::new())
    }
    fn push(&mut self, text: &str) -> Result<(), String> {
        if self
            .0
            .len()
            .checked_add(text.len())
            .is_none_or(|len| len > MAX_CIF_BYTES)
        {
            return Err("BinaryCIF expanded CIF exceeds the 64 MiB text budget".into());
        }
        self.0
            .try_reserve(text.len())
            .map_err(|_| "BinaryCIF could not allocate expanded CIF text")?;
        self.0.push_str(text);
        Ok(())
    }
    fn tag(&mut self, category: &str, column: &str) -> Result<(), String> {
        self.push("_")?;
        self.push(category)?;
        self.push(".")?;
        self.push(column)?;
        Ok(())
    }
    fn value(
        &mut self,
        column: &DecodedColumn<'_>,
        row: usize,
        atom_row: bool,
    ) -> Result<(), String> {
        match column.mask.as_ref().map(|mask| mask[row]) {
            Some(1) => return self.push("."),
            Some(2) => return self.push("?"),
            _ => {}
        }
        match &column.values {
            Column::Int(values) => self.push(&values[row].to_string()),
            Column::Float(values) => {
                if !values[row].is_finite() {
                    return Err("BinaryCIF contains a present non-finite number".into());
                }
                self.push(&values[row].to_string())
            }
            Column::Text(values) => self.literal(values[row], atom_row),
            Column::Raw(_) => Err("BinaryCIF column was not decoded".into()),
        }
    }
    fn literal(&mut self, value: &str, atom_row: bool) -> Result<(), String> {
        let multiline = value.contains(['\n', '\r']);
        if !multiline && !value.contains('\'') {
            self.push("'")?;
            self.push(value)?;
            return self.push("'");
        }
        if !multiline && !value.contains('"') {
            self.push("\"")?;
            self.push(value)?;
            return self.push("\"");
        }
        // Embedded quote characters do not need quoting in an ordinary bare
        // token. This also keeps valid atom identifiers on their required row.
        let reserved = ["loop_", "stop_", "global_"]
            .iter()
            .any(|word| value.eq_ignore_ascii_case(word))
            || value.get(..5).is_some_and(|prefix| {
                prefix.eq_ignore_ascii_case("data_") || prefix.eq_ignore_ascii_case("save_")
            });
        if !multiline
            && !value.chars().any(char::is_whitespace)
            && !value.starts_with(['_', '#', ';', '\'', '"', '[', ']', '$'])
            && !reserved
        {
            return self.push(value);
        }
        if atom_row {
            return Err("BinaryCIF atom-site value needs unsupported multiline CIF quoting".into());
        }
        if value.contains("\n;") || value.contains('\r') {
            return Err(
                "BinaryCIF text value cannot be represented by the shared CIF profile".into(),
            );
        }
        self.push("\n;")?;
        self.push(value)?;
        self.push("\n;\n")
    }
}
