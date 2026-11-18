//! Selected-site resolution and complete provenance for deposited mmCIF links.

use crate::Result;
use serde::Serialize;
use std::collections::{BTreeMap, BTreeSet};
use std::io::{self, Write};

const RECORD_PREFIX: &str = "mmCIF struct_conn: ";

pub(super) type ConnectionRow = BTreeMap<String, String>;

pub(super) struct SiteIdentity {
    pub id: String,
    /// Asymmetry, component, sequence and atom identifiers in label namespace.
    pub label: [String; 4],
    /// Asymmetry, component, sequence and atom identifiers in author namespace.
    pub author: [String; 4],
    pub alt: Option<String>,
    pub insertion: Option<String>,
}

pub(super) struct ResolvedConnections {
    pub explicit: Vec<[usize; 2]>,
    pub provenance: Vec<String>,
}

fn is_null(value: &str) -> bool {
    value.is_empty() || value == "." || value == "?"
}

fn specified(value: Option<&str>) -> Option<&str> {
    value.filter(|value| !is_null(value))
}

fn normalized_sequence(value: &str) -> &str {
    if is_null(value) { "" } else { value }
}

/// Stream JSON through a fallible buffer rather than an infallible serializer allocation.
struct JsonText(Vec<u8>);
impl Write for JsonText {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.0.try_reserve(bytes.len()).map_err(io::Error::other)?;
        self.0.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}
fn json_text(value: &impl Serialize) -> Result<String> {
    let mut output = JsonText(Vec::new());
    serde_json::to_writer(&mut output, value).map_err(|error| error.to_string())?;
    String::from_utf8(output.0).map_err(|error| error.to_string())
}

/// Validate a source declaration before retaining it. Duplicate IDs are checked
/// once during resolution, avoiding a quadratic scan for every appended row.
pub(super) fn push_row(
    rows: &mut Vec<ConnectionRow>,
    row: ConnectionRow,
    declaration_count: &mut usize,
) -> Result<()> {
    for key in ["id", "conn_type_id"] {
        if row
            .get(key)
            .is_none_or(|value| is_null(value) || value.trim().is_empty())
        {
            return Err(format!(
                "mmCIF struct_conn row {} needs {key}",
                rows.len() + 1
            ));
        }
    }
    *declaration_count = declaration_count
        .checked_add(1)
        .ok_or("mmCIF connection count overflow")?;
    crate::allocation::push(rows, row, "mmCIF connection declarations")?;
    Ok(())
}

type Key<'a> = [&'a str; 4];
type Index<'a> = BTreeMap<Key<'a>, Vec<usize>>;

fn narrower<'a>(current: &mut Option<&'a [usize]>, bucket: Option<&'a Vec<usize>>) {
    let bucket = bucket.map_or(&[][..], Vec::as_slice);
    if current.is_none_or(|current| bucket.len() < current.len()) {
        *current = Some(bucket);
    }
}

struct SiteIndex<'a> {
    sites: &'a [(&'a SiteIdentity, usize)],
    labels: Index<'a>,
    authors: Index<'a>,
    author_residue_label_atom: Index<'a>,
}

impl<'a> SiteIndex<'a> {
    fn new(sites: &'a [(&'a SiteIdentity, usize)]) -> Self {
        let mut result = Self {
            sites,
            labels: BTreeMap::new(),
            authors: BTreeMap::new(),
            author_residue_label_atom: BTreeMap::new(),
        };
        for (i, (site, _)) in sites.iter().enumerate() {
            if [0, 1, 3].into_iter().all(|j| !is_null(&site.label[j])) {
                result
                    .labels
                    .entry([
                        &site.label[0],
                        &site.label[1],
                        normalized_sequence(&site.label[2]),
                        &site.label[3],
                    ])
                    .or_default()
                    .push(i);
            }
            if site.author.iter().all(|value| !is_null(value)) {
                result
                    .authors
                    .entry(site.author.each_ref().map(String::as_str))
                    .or_default()
                    .push(i);
            }
            if site.author[..3].iter().all(|value| !is_null(value)) && !is_null(&site.label[3]) {
                result
                    .author_residue_label_atom
                    .entry([
                        &site.author[0],
                        &site.author[1],
                        &site.author[2],
                        &site.label[3],
                    ])
                    .or_default()
                    .push(i);
            }
        }
        result
    }

    fn partner(&self, reference: &Partner<'_>, visits: &mut usize) -> Result<PartnerMatch> {
        if reference
            .author_alt
            .iter()
            .any(|value| specified(*value).is_some())
        {
            return Ok(PartnerMatch::Missing(
                "Author alternate identifiers are not represented in the selected-site profile",
            ));
        }
        let mut candidates: Option<&[usize]> = None;
        if let [Some(asym), Some(comp), Some(sequence), Some(atom)] = reference.label {
            // An explicit '.' is an inapplicable sequence (e.g. a ligand).
            // Missing/unknown sequence needs a complete author-residue key.
            if !is_null(asym)
                && !is_null(comp)
                && !is_null(atom)
                && sequence != "?"
                && !sequence.is_empty()
            {
                narrower(
                    &mut candidates,
                    self.labels
                        .get(&[asym, comp, normalized_sequence(sequence), atom]),
                );
            }
        }
        if let [Some(asym), Some(comp), Some(sequence), Some(atom)] = reference.author
            && [asym, comp, sequence, atom]
                .into_iter()
                .all(|v| !is_null(v))
        {
            narrower(
                &mut candidates,
                self.authors.get(&[asym, comp, sequence, atom]),
            );
        }
        if let ([Some(asym), Some(comp), Some(sequence), _], Some(atom)) =
            (reference.author, reference.label[3])
            && [asym, comp, sequence, atom]
                .into_iter()
                .all(|v| !is_null(v))
        {
            // This is a mixed-residue identifier, not an alias from label to
            // author atom names: its atom is matched against SiteIdentity.label.
            narrower(
                &mut candidates,
                self.author_residue_label_atom
                    .get(&[asym, comp, sequence, atom]),
            );
        }
        let Some(candidates) = candidates else {
            return Ok(PartnerMatch::Missing(
                "Incomplete label/author partner reference",
            ));
        };
        let mut matched = None;
        for &i in candidates {
            *visits = visits
                .checked_add(1)
                .ok_or("mmCIF connection reference count overflow")?;
            if !reference.matches(self.sites[i].0) {
                continue;
            }
            if matched.is_some() {
                return Ok(PartnerMatch::Missing(
                    "Partner reference is ambiguous among selected atoms",
                ));
            }
            matched = Some(i);
        }
        Ok(matched.map_or(
            PartnerMatch::Missing("Partner reference is absent, omitted by selection, or contradicts another identifier"),
            PartnerMatch::Selected,
        ))
    }
}

struct Partner<'a> {
    label: [Option<&'a str>; 4],
    author: [Option<&'a str>; 4],
    label_alt: [Option<&'a str>; 3],
    author_alt: [Option<&'a str>; 2],
    insertion: [Option<&'a str>; 2],
}

impl<'a> Partner<'a> {
    fn new(row: &'a ConnectionRow, number: usize) -> Self {
        let get = |key: &str| row.get(key).map(String::as_str);
        Self {
            label: ["asym", "comp", "seq", "atom"]
                .map(|part| get(&format!("ptnr{number}_label_{part}_id"))),
            author: ["asym", "comp", "seq", "atom"]
                .map(|part| get(&format!("ptnr{number}_auth_{part}_id"))),
            label_alt: [
                get(&format!("pdbx_ptnr{number}_label_alt_id")),
                get(&format!("ptnr{number}_label_alt_id")),
                get(&format!("ndb_ptnr{number}_label_alt_loc")),
            ],
            author_alt: [
                get(&format!("pdbx_ptnr{number}_auth_alt_id")),
                get(&format!("ndb_ptnr{number}_auth_alt_loc")),
            ],
            insertion: [
                get(&format!("pdbx_ptnr{number}_pdb_ins_code")),
                get(&format!("ndb_ptnr{number}_label_ins_code")),
            ],
        }
    }

    fn matches(&self, site: &SiteIdentity) -> bool {
        self.label
            .iter()
            .zip(&site.label)
            .all(|(&wanted, actual)| specified(wanted).is_none_or(|wanted| wanted == actual))
            && self
                .author
                .iter()
                .zip(&site.author)
                .all(|(&wanted, actual)| specified(wanted).is_none_or(|wanted| wanted == actual))
            && self.label_alt.iter().all(|&wanted| {
                specified(wanted).is_none_or(|wanted| site.alt.as_deref() == Some(wanted))
            })
            && self.insertion.iter().all(|&wanted| {
                specified(wanted).is_none_or(|wanted| site.insertion.as_deref() == Some(wanted))
            })
    }
}

enum PartnerMatch {
    Selected(usize),
    Missing(&'static str),
}

fn valid_symmetry(code: &str) -> bool {
    // Match the wwPDB struct_conn.ptnrN_symmetry `symop` dictionary regex:
    // ([1-9]|[1-9][0-9]|1[0-8][0-9]|19[0-2])(_[1-9][1-9][1-9])?
    // These are lexical bounds from the dictionary, not assumptions about the
    // numbering or identity of a file's crystallographic operations.
    let (operation, translation) = code
        .split_once('_')
        .map_or((code, None), |(op, shift)| (op, Some(shift)));
    let valid_operation = operation
        .parse::<u16>()
        .ok()
        .is_some_and(|op| (1..=192).contains(&op) && op.to_string() == operation);
    valid_operation
        && translation.is_none_or(|shift| {
            shift.len() == 3 && shift.bytes().all(|digit| (b'1'..=b'9').contains(&digit))
        })
}

fn common_image(row: &ConnectionRow) -> std::result::Result<(), &'static str> {
    let first = row.get("ptnr1_symmetry").map(String::as_str);
    let second = row.get("ptnr2_symmetry").map(String::as_str);
    if first == Some("?") || second == Some("?") {
        return Err("Unknown partner symmetry is not assumed to be the selected image");
    }
    let without_image = |code: Option<&str>| code.is_none_or(|code| code.is_empty() || code == ".");
    if without_image(first) && without_image(second) {
        return Ok(());
    }
    if let (Some(first), Some(second)) = (first, second)
        && first == second
        && valid_symmetry(first)
    {
        return Ok(());
    }
    Err(
        "Different, invalid, or mixed specified/unspecified partner images require unsupported symmetry handling",
    )
}

fn has_third_partner(row: &ConnectionRow) -> bool {
    row.iter().any(|(key, value)| {
        let identifier = key
            .strip_prefix("pdbx_ptnr3_")
            .or_else(|| key.strip_prefix("ndb_ptnr3_"));
        !is_null(value)
            && identifier.is_some_and(|field| {
                field.starts_with("label_") || field.starts_with("auth_") || field == "pdb_ins_code"
            })
    })
}

#[derive(Serialize)]
struct Record<'a> {
    row: usize,
    source: &'a ConnectionRow,
    #[serde(skip_serializing_if = "Option::is_none")]
    selected_atoms: Option<[usize; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    selected_atom_site_ids: Option<[&'a str; 2]>,
    #[serde(skip_serializing_if = "Option::is_none")]
    bond: Option<[usize; 2]>,
    status: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    reason: Option<&'static str>,
}

/// Preflight the cumulative record allocation, including atom-site IDs that
/// originate outside the separately bounded declaration source rows.
fn push_record(
    provenance: &mut Vec<String>,
    record: &Record<'_>,
    allocated_bytes: &mut usize,
) -> Result<()> {
    let json = json_text(record)?;
    let mut text = String::new();
    crate::allocation::append(&mut text, RECORD_PREFIX, "mmCIF provenance")?;
    crate::allocation::append(&mut text, &json, "mmCIF provenance")?;
    *allocated_bytes = allocated_bytes
        .checked_add(text.len())
        .ok_or("mmCIF provenance size overflow")?;
    crate::allocation::push(provenance, text, "mmCIF provenance records")?;
    Ok(())
}

/// Resolve declarations only against retained rows; namespaces are constraints,
/// and a discarded alternate is never redirected to its selected neighbour.
pub(super) fn resolve(
    rows: &[ConnectionRow],
    selected: &[(&SiteIdentity, usize)],
) -> Result<ResolvedConnections> {
    if rows.is_empty() {
        return Ok(ResolvedConnections {
            explicit: vec![],
            provenance: vec![],
        });
    }
    let mut ids = BTreeSet::new();
    for (i, row) in rows.iter().enumerate() {
        let id = row
            .get("id")
            .filter(|value| !is_null(value) && !value.trim().is_empty());
        let kind = row
            .get("conn_type_id")
            .filter(|value| !is_null(value) && !value.trim().is_empty());
        if id.is_none() || kind.is_none() {
            return Err(format!(
                "mmCIF struct_conn row {} needs id and conn_type_id",
                i + 1
            ));
        }
        if !ids.insert(id.unwrap()) {
            return Err(format!("Duplicate mmCIF struct_conn ID at row {}", i + 1));
        }
    }
    let index = SiteIndex::new(selected);
    let mut visits = 0;
    let mut explicit = BTreeSet::new();
    let mut provenance = crate::allocation::buffer(
        rows.len()
            .checked_add(3)
            .ok_or("mmCIF provenance count overflow")?,
        "mmCIF provenance",
    )?;
    let mut provenance_allocated_bytes = 0;
    let mut counts = [0usize; 5];
    for (i, row) in rows.iter().enumerate() {
        let first = index.partner(&Partner::new(row, 1), &mut visits)?;
        let second = index.partner(&Partner::new(row, 2), &mut visits)?;
        let third_partner = has_third_partner(row);
        let mut record = Record {
            row: i + 1,
            source: row,
            selected_atoms: None,
            selected_atom_site_ids: None,
            bond: None,
            status: if third_partner { "recorded" } else { "unresolved" },
            reason: third_partner.then_some("A third partner is declared; the pair-only display model records this connection without forcing an explicit bond"),
        };
        if let (PartnerMatch::Selected(a), PartnerMatch::Selected(b)) = (&first, &second) {
            let (site_a, atom_a) = selected[*a];
            let (site_b, atom_b) = selected[*b];
            record.selected_atoms = Some([atom_a, atom_b]);
            record.selected_atom_site_ids = Some([&site_a.id, &site_b.id]);
            if third_partner {
                // Preserve selected first/second partners as trace information,
                // without interpreting a three-partner declaration as one rod.
            } else if atom_a == atom_b {
                record.reason = Some(
                    "Both references resolve to one selected atom; self connections are not inserted",
                );
            } else if let Err(reason) = common_image(row) {
                record.status = "symmetry-omitted";
                record.reason = Some(reason);
            } else {
                let kind = &row["conn_type_id"];
                if ["covale", "disulf", "metalc"]
                    .into_iter()
                    .any(|allowed| kind.eq_ignore_ascii_case(allowed))
                {
                    let pair = [atom_a.min(atom_b), atom_a.max(atom_b)];
                    record.bond = Some(pair);
                    record.status = if explicit.insert(pair) {
                        "retained"
                    } else {
                        "duplicate"
                    };
                } else {
                    record.status = "recorded";
                    record.reason = Some(
                        "Connection type is recorded without forcing an explicit display bond; coordinate perception remains independent",
                    );
                }
            }
        } else if !third_partner {
            record.reason = match (&first, &second) {
                (PartnerMatch::Missing(reason), _) | (_, PartnerMatch::Missing(reason)) => {
                    Some(reason)
                }
                _ => None,
            };
        }
        let category = match record.status {
            "retained" => 0,
            "duplicate" => 1,
            "recorded" => 2,
            "symmetry-omitted" => 4,
            _ => 3,
        };
        counts[category] += 1;
        push_record(&mut provenance, &record, &mut provenance_allocated_bytes)?;
    }
    provenance.push("mmCIF connection policy: pair-only covale/disulf/metalc declarations are explicit untyped display connections; they take precedence and coordinate perception fills missing pairs. Other types and declarations with a third partner are recorded without forcing rods. Orders and source columns remain in declaration provenance. Matching common symmetry codes or both omitted/inapplicable images use selected-site pairs; unknown or different images are not expanded.".into());
    provenance.push(format!("mmCIF declared connections: {} rows; {} retained explicit pairs, {} duplicate pairs, {} recorded-only declarations, {} unresolved declarations, {} symmetry-omitted declarations.", rows.len(), counts[0], counts[1], counts[2], counts[3], counts[4]));
    if counts[2] + counts[3] + counts[4] > 0 {
        provenance.push(format!("mmCIF parser: struct_conn display omissions: {} recorded-only, {} unresolved, {} symmetry-omitted declarations; full source records are retained in provenance, and no unavailable symmetry mates are guessed.", counts[2], counts[3], counts[4]));
    }
    Ok(ResolvedConnections {
        explicit: explicit.into_iter().collect(),
        provenance,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn site(id: &str, atom: &str) -> SiteIdentity {
        SiteIdentity {
            id: id.into(),
            label: ["A".into(), "LIG".into(), ".".into(), atom.into()],
            author: [
                "X".into(),
                "LIG".into(),
                "12".into(),
                format!("auth_{atom}"),
            ],
            alt: None,
            insertion: None,
        }
    }

    fn row(id: &str, kind: &str, first: &str, second: &str) -> ConnectionRow {
        let mut row = BTreeMap::from([
            ("id".into(), id.into()),
            ("conn_type_id".into(), kind.into()),
        ]);
        for (number, atom) in [(1, first), (2, second)] {
            for (part, value) in [("asym", "A"), ("comp", "LIG"), ("seq", "."), ("atom", atom)] {
                row.insert(format!("ptnr{number}_label_{part}_id"), value.into());
            }
        }
        row
    }

    fn records(result: &ResolvedConnections) -> Vec<serde_json::Value> {
        result
            .provenance
            .iter()
            .filter_map(|text| text.strip_prefix(RECORD_PREFIX))
            .map(|json| serde_json::from_str(json).unwrap())
            .collect()
    }

    #[test]
    fn explicit_types_duplicate_pairs_and_raw_records_are_preserved() {
        let a = site("1", "O1");
        let b = site("2", "MG");
        let mut rows = vec![
            row("m1", "metalc", "O1", "MG"),
            row("m2", "COVALE", "MG", "O1"),
            row("h", "hydrog", "O1", "MG"),
        ];
        rows[0].insert(
            "details".into(),
            "raw text\nwith quote \" and slash \\".into(),
        );
        rows[0].insert("pdbx_value_order".into(), "?".into());
        let result = resolve(&rows, &[(&a, 7), (&b, 2)]).unwrap();
        assert_eq!(result.explicit, vec![[2, 7]]);
        let records = records(&result);
        assert_eq!(
            records[0]["source"],
            serde_json::to_value(&rows[0]).unwrap()
        );
        assert_eq!(records[0]["selected_atoms"], serde_json::json!([7, 2]));
        assert_eq!(records[0]["status"], "retained");
        assert_eq!(records[1]["status"], "duplicate");
        assert_eq!(records[2]["status"], "recorded");
        assert!(
            result
                .provenance
                .iter()
                .any(|line| line.starts_with("mmCIF parser:"))
        );
    }

    #[test]
    fn namespaces_altloc_and_ambiguity_never_redirect_references() {
        let mut a = site("1", "O1");
        a.alt = Some("B".into());
        a.insertion = Some("I".into());
        let b = site("2", "MG");
        let alias = site("3", "O1");
        let mut contradictory = row("conflict", "covale", "O1", "MG");
        contradictory.insert("ptnr1_auth_atom_id".into(), "O1".into());
        let mut rejected_alt = row("alt", "covale", "O1", "MG");
        rejected_alt.insert("pdbx_ptnr1_label_alt_id".into(), "A".into());
        let mut insertion = row("ins", "covale", "O1", "MG");
        insertion.insert("pdbx_ptnr1_pdb_ins_code".into(), "wrong".into());
        for row in [contradictory, rejected_alt, insertion] {
            let result = resolve(&[row], &[(&a, 0), (&b, 1)]).unwrap();
            assert!(result.explicit.is_empty());
            assert_eq!(records(&result)[0]["status"], "unresolved");
        }
        let result = resolve(
            &[row("ambiguous", "covale", "O1", "MG")],
            &[(&a, 0), (&b, 1), (&alias, 2)],
        )
        .unwrap();
        assert!(result.explicit.is_empty());
        assert!(
            records(&result)[0]["reason"]
                .as_str()
                .unwrap()
                .contains("ambiguous")
        );
    }

    #[test]
    fn author_atoms_and_author_residue_with_label_atoms_use_their_own_namespace() {
        let a = site("1", "O1");
        let b = site("2", "MG");
        let mut direct_author = row("author", "covale", "O1", "MG");
        direct_author.retain(|key, _| !key.starts_with("ptnr"));
        for (number, identity) in [(1, &a), (2, &b)] {
            for (part, value) in ["asym", "comp", "seq", "atom"]
                .into_iter()
                .zip(&identity.author)
            {
                direct_author.insert(format!("ptnr{number}_auth_{part}_id"), value.clone());
            }
        }
        assert_eq!(
            resolve(&[direct_author.clone()], &[(&a, 0), (&b, 1)])
                .unwrap()
                .explicit,
            vec![[0, 1]]
        );
        direct_author.insert("id".into(), "hybrid".into());
        for (number, atom) in [(1, "O1"), (2, "MG")] {
            direct_author.remove(&format!("ptnr{number}_auth_atom_id"));
            direct_author.insert(format!("ptnr{number}_label_atom_id"), atom.into());
        }
        assert_eq!(
            resolve(&[direct_author], &[(&a, 0), (&b, 1)])
                .unwrap()
                .explicit,
            vec![[0, 1]]
        );
    }

    #[test]
    fn common_images_are_allowed_without_guessing_operator_one() {
        let a = site("1", "O1");
        let b = site("2", "MG");
        for (first, second, retained) in [
            ("2_555", "2_555", true),
            ("7_645", "7_645", true),
            ("4", "4", true),
            (".", ".", true),
            ("?", "?", false),
            ("1_555", ".", false),
            ("1_555", "2_555", false),
            ("0_555", "0_555", false),
        ] {
            let mut row = row("sym", "covale", "O1", "MG");
            row.insert("ptnr1_symmetry".into(), first.into());
            row.insert("ptnr2_symmetry".into(), second.into());
            let result = resolve(&[row], &[(&a, 0), (&b, 1)]).unwrap();
            assert_eq!(!result.explicit.is_empty(), retained, "{first} / {second}");
            assert_eq!(
                records(&result)[0]["status"],
                if retained {
                    "retained"
                } else {
                    "symmetry-omitted"
                }
            );
        }
    }

    #[test]
    fn source_schema_ids_and_large_json_are_preserved_without_truncating() {
        let mut rows = vec![];
        let mut allocated_bytes = 0;
        let mut invalid = row("?", "covale", "O1", "MG");
        assert!(push_row(&mut rows, invalid.clone(), &mut allocated_bytes).is_err());
        invalid.insert("id".into(), "valid".into());
        push_row(&mut rows, invalid.clone(), &mut allocated_bytes).unwrap();
        assert_eq!(rows.len(), 1);
        assert!(resolve(&[invalid.clone(), invalid.clone()], &[]).is_err());
        let mut huge = invalid;
        huge.insert("details".into(), "x".repeat(4 * 1024 * 1024 + 1));
        push_row(&mut rows, huge, &mut allocated_bytes).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[1]["details"].len(), 4 * 1024 * 1024 + 1);
        assert!(resolve(&[], &[]).unwrap().provenance.is_empty());
    }

    #[test]
    fn third_partner_identifiers_are_recorded_without_forcing_a_pair() {
        let a = site("1", "O1");
        let b = site("2", "MG");
        for kind in ["covale", "metalc"] {
            for key in [
                "pdbx_ptnr3_label_atom_id",
                "ndb_ptnr3_auth_atom_id",
                "pdbx_ptnr3_pdb_ins_code",
            ] {
                let mut declaration = row("third", kind, "O1", "MG");
                declaration.insert(key.into(), "third-site".into());
                let result = resolve(&[declaration.clone()], &[(&a, 0), (&b, 1)]).unwrap();
                assert!(result.explicit.is_empty());
                let record = &records(&result)[0];
                assert_eq!(
                    record["source"],
                    serde_json::to_value(&declaration).unwrap()
                );
                assert_eq!(record["selected_atoms"], serde_json::json!([0, 1]));
                assert_eq!(record["status"], "recorded");
                assert!(record.get("bond").is_none());
                assert!(record["reason"].as_str().unwrap().contains("third partner"));
            }
        }
        let mut no_third_identity = row("pair", "covale", "O1", "MG");
        no_third_identity.insert("pdbx_ptnr3_label_atom_id".into(), "?".into());
        no_third_identity.insert("pdbx_ptnr3_symmetry".into(), "1_555".into());
        assert_eq!(
            resolve(&[no_third_identity], &[(&a, 0), (&b, 1)])
                .unwrap()
                .explicit,
            vec![[0, 1]]
        );
    }

    #[test]
    fn nested_json_escaping_preserves_large_provenance() {
        let a = site("1", "O1");
        let b = site("2", "MG");
        for quote_count in [900_000, 1_200_000] {
            let mut declaration = row("escaped", "covale", "O1", "MG");
            declaration.insert("details".into(), "\"".repeat(quote_count));
            let mut rows = vec![];
            let mut source_allocated_bytes = 0;
            push_row(&mut rows, declaration.clone(), &mut source_allocated_bytes).unwrap();
            let result = resolve(&rows, &[(&a, 0), (&b, 1)]).unwrap();
            assert_eq!(result.explicit, vec![[0, 1]]);
            assert_eq!(
                records(&result)[0]["source"],
                serde_json::to_value(declaration).unwrap()
            );
        }
    }

    #[test]
    fn repeated_long_atom_site_ids_are_preserved_above_the_former_ceiling() {
        let a = site(&"a".repeat(1_100_000), "O1");
        let b = site("2", "MG");
        let declaration = row("large-selected-id", "covale", "O1", "MG");
        let record = Record {
            row: 1,
            source: &declaration,
            selected_atoms: Some([0, 1]),
            selected_atom_site_ids: Some([&a.id, &b.id]),
            bond: Some([0, 1]),
            status: "retained",
            reason: None,
        };
        let mut provenance = vec![];
        let mut allocated_bytes = 0;
        for _ in 0..3 {
            push_record(&mut provenance, &record, &mut allocated_bytes).unwrap();
        }
        push_record(&mut provenance, &record, &mut allocated_bytes).unwrap();
        assert_eq!(provenance.len(), 4);
        assert!(allocated_bytes > 4 * 1024 * 1024);

        let rows = (0..4)
            .map(|i| row(&format!("long-id-{i}"), "covale", "O1", "MG"))
            .collect::<Vec<_>>();
        let result = resolve(&rows, &[(&a, 0), (&b, 1)]).unwrap();
        assert_eq!(result.explicit, vec![[0, 1]]);
        assert_eq!(records(&result).len(), 4);
    }
}
