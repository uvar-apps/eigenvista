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
//! Scope is the `_atom_site` category. Crystallographic extras are recorded as
//! provenance but not acted on: no symmetry-mate generation, no periodic
//! boundary handling, and `struct_conn` connections are not read, so
//! connectivity is perceived from coordinates as it is for PDB.

use crate::{Atom, BOHR_TO_ANGSTROM, Document, Result, bonds};
use std::collections::BTreeMap;

/// mmCIF is markedly more verbose than legacy PDB for the same structure, so
/// this budget is larger than the PDB one while staying under the 128 MiB
/// import ceiling enforced upstream.
const MAX_CIF_BYTES: usize = 64 * 1024 * 1024;

/// Allocation bound on the atom collection, independent of file size.
const MAX_ATOMS: usize = 250_000;

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

/// Split a data line into fields, honouring single- and double-quoted values.
///
/// A quoted field ends at its matching quote only when that quote is followed by
/// whitespace or the end of the line, so `don't` inside double quotes is fine.
fn tokenize(line: &str) -> Result<Vec<&str>> {
    let bytes = line.as_bytes();
    let mut fields = Vec::new();
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i].is_ascii_whitespace() {
            i += 1;
            continue;
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
            fields.push(&line[start..end]);
            i = end + 1;
        } else {
            let start = i;
            while i < bytes.len() && !bytes[i].is_ascii_whitespace() {
                i += 1;
            }
            fields.push(&line[start..i]);
        }
    }
    Ok(fields)
}

/// Skip a multi-line `;` text block. The opening `;` line has already been
/// consumed; this consumes through the closing line that starts with `;`.
fn skip_text_block<'a>(lines: &mut std::iter::Peekable<std::str::Lines<'a>>) -> Result<()> {
    for line in lines.by_ref() {
        if line.starts_with(';') {
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
    let fields = tokenize(line)?;
    if fields.len() >= 2 {
        let value = fields[1];
        return Ok(if is_null(value) {
            None
        } else {
            Some(value.trim_matches('\'').trim_matches('"').to_string())
        });
    }
    // Value may be on the next non-comment line.
    while let Some(next) = lines.peek() {
        let trimmed = next.trim_start();
        if trimmed.is_empty() || trimmed.starts_with('#') {
            lines.next();
            continue;
        }
        if let Some(block) = next.strip_prefix(';') {
            // Text block: the value begins immediately after the opening `;`
            // on that same line. The whole block must then be consumed through
            // its closing `;`, otherwise that terminator would later be
            // misread as the start of a new block and never terminate.
            let value = block.to_string();
            lines.next();
            skip_text_block(&mut *lines)?;
            return Ok(if is_null(&value) { None } else { Some(value) });
        }
        break;
    }
    Ok(None)
}

/// Cheap content check so a file with a `.cif` extension that is not actually
/// mmCIF is rejected rather than misparsed.
///
/// The `_atom_site` tag is searched across the whole text rather than a leading
/// window: in real PDB entries it can sit well past the header (byte 75k in
/// 1BH3), because the header carries many other categories first.
fn looks_like_mmcif(text: &str) -> bool {
    text.lines().take(4096).any(|line| {
        line.trim_start()
            .strip_prefix("data_")
            .is_some_and(|rest| !rest.trim().is_empty())
    }) && text.contains("_atom_site.")
}

/// One parsed `_atom_site` row, before selection.
struct Site {
    z: u16,
    position: [f64; 3],
    occupancy: f64,
    alt: Option<String>,
    key: (String, String, String, String),
}

/// Read the first model's geometry, select one occupancy-ranked alternate
/// location per residue, then infer connectivity from coordinates.
pub fn cif(text: &str, name: &str) -> Result<Document> {
    if text.len() > MAX_CIF_BYTES {
        return Err(format!(
            "mmCIF exceeds the {} MiB preview file budget",
            MAX_CIF_BYTES / (1024 * 1024)
        ));
    }
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

    let mut lines = text.lines().peekable();
    // The atom_site loop header, once seen, drives row parsing until the next
    // tag/loop/block boundary.
    let mut atom_loop: Option<LoopHeader> = None;

    while let Some(raw) = lines.next() {
        let line = raw.trim_end();
        let trimmed = line.trim_start();

        if trimmed.is_empty() || trimmed.starts_with('#') {
            continue;
        }
        if line.starts_with(';') {
            skip_text_block(&mut lines)?;
            atom_loop = None;
            continue;
        }
        if trimmed.starts_with("data_") {
            atom_loop = None;
            continue;
        }
        if trimmed == "loop_" || trimmed.starts_with("loop_ ") {
            // Collect the tags of this loop.
            let mut tags = Vec::new();
            let extra = trimmed.strip_prefix("loop_").map(str::trim).unwrap_or("");
            if !extra.is_empty() {
                tags.extend(tokenize(extra)?.into_iter().map(str::to_string));
            }
            while let Some(peek) = lines.peek() {
                let p = peek.trim_start();
                if p.starts_with('_') {
                    let tag = p
                        .split_whitespace()
                        .next()
                        .unwrap_or_default()
                        .to_ascii_lowercase();
                    tags.push(tag);
                    lines.next();
                } else {
                    break;
                }
            }
            if tags.iter().any(|t| t.starts_with("_atom_site.")) {
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
        let fields = tokenize(line)?;
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

        if sites.len() >= MAX_ATOMS {
            return Err(format!(
                "mmCIF exceeds the {MAX_ATOMS} atom preview budget (structure may be truncated upstream)"
            ));
        }

        let key = (
            field("_atom_site.label_entity_id").to_string(),
            field("_atom_site.label_asym_id").to_string(),
            field("_atom_site.label_seq_id").to_string(),
            field("_atom_site.auth_comp_id").to_string(),
        );
        sites.push(Site {
            z,
            position,
            occupancy,
            alt,
            key,
        });
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
    let mut groups: BTreeMap<&(String, String, String, String), Vec<usize>> = BTreeMap::new();
    for (index, site) in sites.iter().enumerate() {
        groups.entry(&site.key).or_default().push(index);
    }

    let mut keep = vec![false; sites.len()];
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

    // `struct_conn` is not read, so connectivity is perceived from coordinates
    // exactly as it is for a PDB file with no CONECT records.
    let connectivity = bonds::perceive(&doc.atoms, &[])?;
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
        "Structure-only import: residue/chain labels, occupancy, B-factors, formal charges and connections from struct_conn are not retained; no quantum data fabricated."
            .into(),
    );
    doc.provenance = provenance;
    doc.validate()?;
    Ok(doc)
}
