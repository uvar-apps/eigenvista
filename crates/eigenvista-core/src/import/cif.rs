//! mmCIF (PDBx/mmCIF) reader for the preview.
//!
//! Why a dedicated tokenizer instead of the `pdbtbx` mmCIF reader that the PDB
//! path uses: that reader **panics** on malformed input — a `?` in a required
//! field, a `nan` coordinate, a `.` where a number is expected. Imported files
//! are untrusted, and a panic in the WASM worker is a hard abort rather than a
//! reportable error, so its output cannot be relied on as a validation boundary.
//!
//! The mmCIF subset needed for a structure preview is small: a `data_` block,
//! `loop_` categories, quoted fields, `;` text blocks, and the `?`/`.` null
//! markers. That is tokenized here directly, with every value checked before use.
//!
//! Selected `_atom_site` rows anchor declared `_struct_conn` connections.
//! Covalent/disulfide/metal links supplement exact coordinate perception;
//! unsupported references and images remain explicit provenance, without
//! symmetry-mate generation or periodic boundary expansion.

mod connections;
mod metadata;

use crate::{Atom, BOHR_TO_ANGSTROM, Document, Result, bonds};
use connections::{ConnectionRow, SiteIdentity};
use std::collections::{BTreeMap, BTreeSet};

/// Coordinates beyond this are treated as invalid rather than trusted.
const MAX_COORDINATE_ANGSTROM: f64 = 1.0e9;

/// Case-insensitive element symbol lookup against the core element table.
fn element_number(symbol: &str) -> Option<u16> {
    let table = super::ELEMENTS;
    table
        .split_whitespace()
        .position(|s| s.eq_ignore_ascii_case(symbol))
        .map(|i| i as u16 + 1)
}

/// `?` is unknown, `.` is inapplicable; both are nulls.
fn is_null(value: &str) -> bool {
    value == "?" || value == "." || value.is_empty()
}

/// Quotedness keeps tag-like identifiers distinct from CIF control tokens.
struct Token<'a> {
    value: &'a str,
    quoted: bool,
}

fn control_token(value: &str) -> bool {
    value.starts_with('_')
        || ["loop_", "stop_", "global_"]
            .iter()
            .any(|k| value.eq_ignore_ascii_case(k))
        || value
            .get(..5)
            .is_some_and(|p| p.eq_ignore_ascii_case("data_") || p.eq_ignore_ascii_case("save_"))
}

/// Tokenize complete fields; a closing quote must be
/// followed by whitespace or end of line.
fn tokens(line: &str) -> Result<Vec<Token<'_>>> {
    let bytes = line.as_bytes();
    let mut fields = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
        }
        if bytes[i] == b'#' {
            break;
        }
        if bytes[i] == b'\'' || bytes[i] == b'"' {
            let quote = bytes[i];
            let start = i + 1;
            let mut end = start;
            loop {
                if end >= bytes.len() {
                    return Err(format!("Unterminated quoted field in mmCIF line: {line:?}"));
                }
                if bytes[end] == quote
                    && (end + 1 >= bytes.len() || bytes[end + 1].is_ascii_whitespace())
                {
                    break;
                }
                end += 1;
            }
            crate::allocation::push(
                &mut fields,
                Token {
                    value: &line[start..end],
                    quoted: true,
                },
                "mmCIF tokens",
            )?;
            i = end + 1;
        } else {
            let start = i;
            while i < bytes.len() && !bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            crate::allocation::push(
                &mut fields,
                Token {
                    value: &line[start..i],
                    quoted: false,
                },
                "mmCIF tokens",
            )?;
        }
    }
    Ok(fields)
}

/// Preserve complete headers and never drop extra columns.
fn header_tags(tags: &mut Vec<String>, line: &str) -> Result<()> {
    let fields = tokens(line)?;
    for token in fields {
        if token.quoted || !token.value.starts_with('_') {
            return Err("mmCIF loop headers require unquoted column names; rows must start on a following line".into());
        }
        tags.push(token.value.to_ascii_lowercase());
    }
    Ok(())
}

/// The preview does not parse further tokens after a text/block boundary.
/// Reject them rather than silently losing references or namespace constraints.
fn boundary_line_end(remainder: &str) -> Result<()> {
    if !remainder.is_empty() && !remainder.as_bytes()[0].is_ascii_whitespace() {
        return Err("mmCIF boundary must be followed by whitespace or end of line".into());
    }
    let rest = remainder.trim_start_matches(|c: char| c.is_ascii_whitespace());
    if !rest.is_empty() && !rest.starts_with('#') {
        return Err("Inline mmCIF tokens after a text/block boundary are unsupported".into());
    }
    Ok(())
}

/// Skip a multi-line `;` text block. The opening `;` line has already been
/// consumed; this consumes through the closing line that starts with `;`.
fn skip_text_block<'a>(lines: &mut std::iter::Peekable<std::str::Lines<'a>>) -> Result<()> {
    for line in lines.by_ref() {
        if let Some(remainder) = line.strip_prefix(';') {
            boundary_line_end(remainder)?;
            return Ok(());
        }
    }
    Err("Unterminated text block in mmCIF".into())
}

/// A `loop_` whose tags have been read but whose rows have not.
struct LoopHeader {
    tags: Vec<String>,
}

impl LoopHeader {
    fn index(&self, tag: &str) -> Option<usize> {
        self.tags.iter().position(|t| t == tag)
    }
}

/// Read the value for a scalar `_tag value` line, tolerating a value that sits on
/// the following line.
fn scalar_value(
    line: &str,
    lines: &mut std::iter::Peekable<std::str::Lines<'_>>,
) -> Result<Option<String>> {
    let value = raw_scalar_value(line, lines)?;
    Ok(if is_null(&value) { None } else { Some(value) })
}

/// Read a parsed scalar value, preserving explicit null markers for provenance.
fn raw_scalar_value(
    line: &str,
    lines: &mut std::iter::Peekable<std::str::Lines<'_>>,
) -> Result<String> {
    let fields = tokens(line)?;
    if fields.len() >= 2 {
        if fields.len() != 2 {
            return Err("mmCIF scalar must contain exactly one value".into());
        }
        if !fields[1].quoted && control_token(fields[1].value) {
            return Err("Missing mmCIF scalar value before a control token".into());
        }
        return Ok(fields[1].value.to_string());
    }
    // Value may be on the next non-comment line.
    while let Some(next) = lines.peek() {
        let trimmed = next.trim_start();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            lines.next();
            continue;
        }
        if next.starts_with(';') {
            let opening = *next;
            lines.next();
            return text_block_value(opening, lines);
        }
        let keyword = trimmed.split_whitespace().next().unwrap_or_default();
        if trimmed.starts_with('_')
            || keyword
                .get(..5)
                .is_some_and(|p| p.eq_ignore_ascii_case("data_"))
            || keyword.eq_ignore_ascii_case("loop_")
            || keyword.eq_ignore_ascii_case("stop_")
        {
            break;
        }
        let fields = tokens(next)?;
        if fields.len() != 1 {
            return Err("mmCIF scalar must contain exactly one value".into());
        }
        if !fields[0].quoted && control_token(fields[0].value) {
            return Err("Missing mmCIF scalar value before a control token".into());
        }
        let value = fields[0].value.to_string();
        lines.next();
        return Ok(value);
    }
    Err("Missing mmCIF scalar value".into())
}

/// Retain multi-line connection values rather than discarding their contents.
fn text_block_value(
    opening: &str,
    lines: &mut std::iter::Peekable<std::str::Lines<'_>>,
) -> Result<String> {
    let mut value = opening[1..].to_string();
    for line in lines.by_ref() {
        if let Some(remainder) = line.strip_prefix(';') {
            boundary_line_end(remainder)?;
            return Ok(value);
        }
        value.push('\n');
        value.push_str(line);
    }
    Err("Unterminated text block in mmCIF".into())
}

/// CIF loops may wrap rows or contain multiple rows on one line.
fn connection_value(
    value: String,
    header: &LoopHeader,
    fields: &mut Vec<String>,
    rows: &mut Vec<ConnectionRow>,
    declaration_count: &mut usize,
) -> Result<()> {
    fields.push(value);
    if fields.len() == header.tags.len() {
        let row = header
            .tags
            .iter()
            .map(|tag| tag["_struct_conn.".len()..].to_string())
            .zip(fields.drain(..))
            .collect();
        connections::push_row(rows, row, declaration_count)?;
    }
    Ok(())
}

/// Cheap content check so a file with a `.cif` extension that is not actually
/// mmCIF is rejected rather than misparsed.
///
/// The `_atom_site` tag is searched across the whole text rather than a leading
/// window: in real PDB entries it can sit well past the header (byte 75k in
/// 1BH3), because the header carries many other categories first.
fn looks_like_mmcif(text: &str) -> bool {
    text.lines().any(|line| {
        let token = line.split_whitespace().next().unwrap_or_default();
        token.len() > 5
            && token
                .get(..5)
                .is_some_and(|p| p.eq_ignore_ascii_case("data_"))
    }) && text.lines().any(|line| {
        line.split_whitespace().any(|token| {
            token
                .get(..11)
                .is_some_and(|p| p.eq_ignore_ascii_case("_atom_site."))
        })
    })
}

/// One parsed `_atom_site` row, before selection.
type ResidueKey = (String, String, String, String, Option<String>);

struct Site {
    z: u16,
    position: [f64; 3],
    occupancy: f64,
    alt: Option<String>,
    key: ResidueKey,
    identity: SiteIdentity,
    hetero: bool,
}

/// Read the first model's geometry, select one occupancy-ranked alternate
/// location per residue, then infer connectivity from coordinates.
pub fn cif(text: &str, name: &str) -> Result<Document> {
    if !looks_like_mmcif(text) {
        return Err("Not an mmCIF file: no `data_` block or `_atom_site` category found".into());
    }

    let mut sites: Vec<Site> = Vec::new();
    let mut cell: Option<[f64; 6]> = None;
    let mut spacegroup: Option<String> = None;
    let mut first_model: Option<String> = None;
    let mut skipped_other_models = 0usize;
    let mut unknown_elements = 0usize;
    let mut discarded = 0usize;
    let mut declarations = Vec::new();
    let mut declaration_declaration_count = 0;
    let mut connection_fields = Vec::new();
    let mut scalar_connection = ConnectionRow::new();
    let mut block = 0usize;
    let mut atom_blocks = BTreeSet::new();
    let mut connection_blocks = BTreeSet::new();

    let mut lines = text.lines().peekable();
    // Relevant loop headers drive atom rows or wrapped connection records.
    let mut atom_loop: Option<LoopHeader> = None;

    while let Some(raw) = lines.next() {
        let line = raw.trim_end();
        let trimmed = line.trim_start();

        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if line.starts_with(';') {
            if let Some(header) = atom_loop
                .as_ref()
                .filter(|h| h.tags[0].starts_with("_struct_conn."))
            {
                let value = text_block_value(raw, &mut lines)?;
                connection_value(
                    value,
                    header,
                    &mut connection_fields,
                    &mut declarations,
                    &mut declaration_declaration_count,
                )?;
            } else {
                if atom_loop.is_some() {
                    return Err("Multiline _atom_site rows are unsupported; no partial geometry was imported".into());
                }
                skip_text_block(&mut lines)?;
                atom_loop = None;
            }
            continue;
        }
        let keyword = trimmed.split_whitespace().next().unwrap_or_default();
        if keyword.eq_ignore_ascii_case("global_")
            || keyword
                .get(..5)
                .is_some_and(|p| p.eq_ignore_ascii_case("save_"))
        {
            return Err("mmCIF data-file import does not support save/global frames".into());
        }
        let loop_start = keyword.eq_ignore_ascii_case("loop_");
        let data_start = keyword
            .get(..5)
            .is_some_and(|p| p.eq_ignore_ascii_case("data_"));
        let stop = keyword.eq_ignore_ascii_case("stop_");
        let boundary = data_start || loop_start || stop || trimmed.starts_with('_');
        if boundary && !connection_fields.is_empty() {
            return Err("Incomplete mmCIF _struct_conn loop row".into());
        }
        if boundary
            && !trimmed.to_ascii_lowercase().starts_with("_struct_conn.")
            && !scalar_connection.is_empty()
        {
            connections::push_row(
                &mut declarations,
                std::mem::take(&mut scalar_connection),
                &mut declaration_declaration_count,
            )?;
        }
        if data_start {
            boundary_line_end(&trimmed[keyword.len()..])?;
            block += 1;
            atom_loop = None;
            continue;
        }
        if stop {
            boundary_line_end(&trimmed[keyword.len()..])?;
            atom_loop = None;
            continue;
        }
        if loop_start {
            // Collect the tags of this loop.
            let mut tags = Vec::new();
            let extra = trimmed["loop_".len()..].trim();
            if !extra.is_empty() {
                header_tags(&mut tags, extra)?;
            }
            while let Some(peek) = lines.peek() {
                let p = peek.trim_start();
                if p.starts_with('_') {
                    header_tags(&mut tags, p)?;
                    lines.next();
                } else {
                    break;
                }
            }
            let atoms = tags.iter().any(|t| t.starts_with("_atom_site."));
            let connections = tags.iter().any(|t| t.starts_with("_struct_conn."));
            if atoms || connections {
                let prefix = if atoms {
                    "_atom_site."
                } else {
                    "_struct_conn."
                };
                if tags.iter().any(|tag| !tag.starts_with(prefix))
                    || tags.iter().collect::<BTreeSet<_>>().len() != tags.len()
                {
                    return Err("Invalid, mixed, or duplicate mmCIF loop columns".into());
                }
                if atoms {
                    atom_blocks.insert(block);
                } else {
                    connection_blocks.insert(block);
                }
                atom_loop = Some(LoopHeader { tags });
            } else {
                atom_loop = None;
            }
            continue;
        }

        if trimmed.starts_with('_') {
            let tag = trimmed
                .split_whitespace()
                .next()
                .unwrap_or_default()
                .to_ascii_lowercase();
            // A tag inside the atom_site loop ends its rows: this is a new
            // category or a key/value pair.
            atom_loop = None;
            if let Some(column) = tag.strip_prefix("_struct_conn.") {
                let value = raw_scalar_value(line, &mut lines)?;
                if scalar_connection
                    .insert(column.to_string(), value)
                    .is_some()
                {
                    return Err("Duplicate mmCIF _struct_conn scalar column".into());
                }
                connection_blocks.insert(block);
                continue;
            }
            match tag.as_str() {
                "_cell.length_a" | "_cell.length_b" | "_cell.length_c" | "_cell.angle_alpha"
                | "_cell.angle_beta" | "_cell.angle_gamma" => {
                    if let Some(value) = scalar_value(line, &mut lines)? {
                        let parsed = value.parse::<f64>().ok().filter(|v| v.is_finite());
                        if let Some(parsed) = parsed {
                            let slot = match tag.as_str() {
                                "_cell.length_a" => 0,
                                "_cell.length_b" => 1,
                                "_cell.length_c" => 2,
                                "_cell.angle_alpha" => 3,
                                "_cell.angle_beta" => 4,
                                _ => 5,
                            };
                            let cell = cell.get_or_insert([0.; 6]);
                            cell[slot] = parsed;
                        }
                    }
                }
                "_symmetry.space_group_name_h-m" => {
                    if let Some(value) = scalar_value(line, &mut lines)? {
                        spacegroup = Some(value);
                    }
                }
                _ => {
                    // Consume a value on the next line so it is not misread as
                    // a data row of the preceding loop.
                    let _ = scalar_value(line, &mut lines)?;
                }
            }
            continue;
        }

        // Otherwise this is a data row of the active atom_site loop.
        let Some(header) = atom_loop.as_ref() else {
            continue;
        };
        let parsed = tokens(line)?;
        if parsed
            .iter()
            .any(|token| !token.quoted && control_token(token.value))
        {
            return Err("Inline mmCIF control tokens are unsupported; place category/loop controls on their own lines".into());
        }
        if header.tags[0].starts_with("_struct_conn.") {
            for token in parsed {
                connection_value(
                    token.value.to_string(),
                    header,
                    &mut connection_fields,
                    &mut declarations,
                    &mut declaration_declaration_count,
                )?;
            }
            continue;
        }
        let fields: Vec<_> = parsed.iter().map(|token| token.value).collect();
        if fields.len() != header.tags.len() {
            return Err(format!(
                "mmCIF _atom_site row has {} fields but {} columns declared: {line:?}",
                fields.len(),
                header.tags.len()
            ));
        }
        let field = |tag: &str| -> &str { header.index(tag).map_or("", |i| fields[i]) };

        // Model selection: keep the first model only.
        let model = field("_atom_site.pdbx_pdb_model_num");
        if !is_null(model) {
            match &first_model {
                None => first_model = Some(model.to_string()),
                Some(seen) if seen == model => {}
                Some(_) => {
                    skipped_other_models += 1;
                    continue;
                }
            }
        }

        let symbol = field("_atom_site.type_symbol");
        let Some(z) = element_number(symbol.trim()) else {
            unknown_elements += 1;
            continue;
        };

        let mut position = [0f64; 3];
        for (slot, tag) in position.iter_mut().zip([
            "_atom_site.cartn_x",
            "_atom_site.cartn_y",
            "_atom_site.cartn_z",
        ]) {
            let raw = field(tag);
            let value = raw.parse::<f64>().map_err(|_| {
                format!(
                    "Invalid mmCIF coordinate {raw:?} for {tag} (atom {:?})",
                    field("_atom_site.label_atom_id")
                )
            })?;
            if !value.is_finite() || value.abs() > MAX_COORDINATE_ANGSTROM {
                return Err(format!(
                    "mmCIF coordinate out of range ({value}) for {tag} (atom {:?})",
                    field("_atom_site.label_atom_id")
                ));
            }
            *slot = value;
        }

        let occupancy = {
            let raw = field("_atom_site.occupancy");
            if is_null(raw) {
                1.0
            } else {
                raw.parse::<f64>()
                    .ok()
                    .filter(|v| v.is_finite() && (0.0..=1.0).contains(v))
                    .unwrap_or(1.0)
            }
        };

        let alt = {
            let raw = field("_atom_site.label_alt_id").trim();
            if is_null(raw) {
                None
            } else {
                Some(raw.to_string())
            }
        };

        let identity = SiteIdentity {
            id: field("_atom_site.id").to_string(),
            label: [
                "_atom_site.label_asym_id",
                "_atom_site.label_comp_id",
                "_atom_site.label_seq_id",
                "_atom_site.label_atom_id",
            ]
            .map(|tag| field(tag).to_string()),
            author: [
                "_atom_site.auth_asym_id",
                "_atom_site.auth_comp_id",
                "_atom_site.auth_seq_id",
                "_atom_site.auth_atom_id",
            ]
            .map(|tag| field(tag).to_string()),
            alt: alt.clone(),
            insertion: match field("_atom_site.pdbx_pdb_ins_code") {
                value if is_null(value) => None,
                value => Some(value.to_string()),
            },
        };
        // Non-polymers commonly have label_seq_id='.'. Their author residue
        // number and insertion distinguish different waters/ligands before
        // choosing alternates. Label identifiers remain preferred when present.
        let choose = |label: &str, author: &str| {
            if is_null(label) {
                author.to_string()
            } else {
                label.to_string()
            }
        };
        let sequence = if is_null(&identity.label[2]) {
            format!("author:{}", identity.author[2])
        } else {
            format!("label:{}", identity.label[2])
        };
        let key = (
            field("_atom_site.label_entity_id").to_string(),
            choose(&identity.label[0], &identity.author[0]),
            sequence,
            choose(&identity.label[1], &identity.author[1]),
            identity.insertion.clone(),
        );
        sites.push(Site {
            z,
            position,
            occupancy,
            alt,
            key,
            identity,
            hetero: field("_atom_site.group_pdb").eq_ignore_ascii_case("HETATM"),
        });
    }

    if !connection_fields.is_empty() {
        return Err("Incomplete mmCIF _struct_conn loop row".into());
    }
    if !scalar_connection.is_empty() {
        connections::push_row(
            &mut declarations,
            scalar_connection,
            &mut declaration_declaration_count,
        )?;
    }
    if !declarations.is_empty() && (atom_blocks.len() != 1 || connection_blocks != atom_blocks) {
        return Err("mmCIF connections across multiple data blocks are unsupported".into());
    }

    if sites.is_empty() {
        return Err(if unknown_elements > 0 {
            format!(
                "mmCIF has no atoms with a recognised element ({unknown_elements} unrecognised symbols)"
            )
        } else {
            "mmCIF has no `_atom_site` coordinate rows".into()
        });
    }

    // Alternate-location policy, matching the PDB reader: atoms with no
    // alternate location are always kept; among alternates within a residue,
    // keep the group with the highest mean occupancy, alphabetically first on
    // a tie.
    let mut groups: BTreeMap<&ResidueKey, Vec<usize>> = BTreeMap::new();
    for (index, site) in sites.iter().enumerate() {
        groups.entry(&site.key).or_default().push(index);
    }

    let mut keep = crate::allocation::filled(sites.len(), false, "mmCIF selected atoms")?;
    for indices in groups.values() {
        // Mean occupancy per alternate label.
        let mut per_alt: BTreeMap<&str, (f64, usize)> = BTreeMap::new();
        for &i in indices {
            if let Some(alt) = sites[i].alt.as_deref() {
                let entry = per_alt.entry(alt).or_insert((0.0, 0));
                entry.0 += sites[i].occupancy;
                entry.1 += 1;
            }
        }
        let preferred: Option<String> = per_alt
            .iter()
            .max_by(|a, b| {
                let a_mean = a.1.0 / a.1.1.max(1) as f64;
                let b_mean = b.1.0 / b.1.1.max(1) as f64;
                a_mean.total_cmp(&b_mean).then(b.0.cmp(a.0))
            })
            .map(|(alt, _)| (*alt).to_string());

        for &i in indices {
            let site = &sites[i];
            let selected = match &site.alt {
                None => true,
                Some(alt) => preferred.as_deref() == Some(alt.as_str()),
            };
            if selected && site.occupancy > 0.0 {
                keep[i] = true;
            } else {
                discarded += 1;
            }
        }
    }

    let mut doc = Document::empty(name);
    doc.atoms = sites
        .iter()
        .zip(keep.iter())
        .filter(|(_, keep)| **keep)
        .map(|(site, _)| Atom {
            element: site.z,
            position: site.position.map(|v| v / BOHR_TO_ANGSTROM),
        })
        .collect();

    if doc.atoms.is_empty() {
        return Err("mmCIF has no atoms after alternate-location/occupancy selection".into());
    }

    let selected: Vec<_> = sites
        .iter()
        .zip(&keep)
        .filter(|(_, keep)| **keep)
        .enumerate()
        .map(|(atom, (site, _))| (&site.identity, atom))
        .collect();
    let (structure, unresolved_annotations) = if atom_blocks.len() == 1 {
        let metadata = metadata::CifMetadata::parse(text, *atom_blocks.iter().next().unwrap())?;
        metadata.build(
            &sites
                .iter()
                .zip(&keep)
                .filter(|(_, keep)| **keep)
                .map(|(site, _)| site)
                .collect::<Vec<_>>(),
        )?
    } else {
        (None, 0)
    };
    doc.structure = structure;
    let declared = connections::resolve(&declarations, &selected)?;
    let connectivity = bonds::perceive(&doc.atoms, &declared.explicit)?;
    let connectivity_description = connectivity.description();
    doc.bonds = connectivity.bonds;

    let model_note = match first_model {
        Some(m) if skipped_other_models > 0 => format!(
            "Loaded model {m} only; skipped {skipped_other_models} atoms from later models (models are not merged)."
        ),
        Some(m) => format!("Loaded model {m} (single model)."),
        None => "Model number not declared; treated as a single model.".to_string(),
    };

    let mut provenance = vec![
        format!(
            "Imported {name}; mmCIF `_atom_site` coordinates in angstrom converted to bohr. {model_note}"
        ),
        format!(
            "Alternate locations: highest mean occupancy per residue, alphabetic label on ties, plus common atoms; omitted {discarded} alternate/zero-occupancy atoms."
        ),
        connectivity_description,
    ];
    provenance.extend(declared.provenance);
    if doc.structure.is_none() {
        provenance.push("mmCIF parser: biological hierarchy unavailable because selected identities are incomplete or span multiple data blocks; geometry remains available.".into());
    }
    if unresolved_annotations > 0 {
        provenance.push(format!("mmCIF parser: {unresolved_annotations} ambiguous, absent, unsupported or conflicting secondary annotation matches left unknown."));
    }
    if unknown_elements > 0 {
        provenance.push(format!(
            "Skipped {unknown_elements} atoms with an unrecognised element symbol; unknown elements are not guessed."
        ));
    }
    if let Some(cell) = cell {
        provenance.push(format!(
            "Unit cell read (a={:.3} A, b={:.3} A, c={:.3} A, alpha={:.2}, beta={:.2}, gamma={:.2}) but not applied: symmetry mates and periodic boundaries are not generated.",
            cell[0], cell[1], cell[2], cell[3], cell[4], cell[5]
        ));
    }
    if let Some(spacegroup) = spacegroup {
        provenance.push(format!(
            "Space group recorded ('{spacegroup}') but not applied."
        ));
    }
    provenance.push(
        "Structure-only import: selected chain/residue/atom identity and deposited secondary annotations are retained when supplied. Occupancy, B-factors and formal charges are not retained as atom attributes; declared connection metadata is retained in provenance, without bond orders or quantum data being fabricated."
            .into(),
    );
    doc.provenance = provenance;
    doc.validate()?;
    Ok(doc)
}
