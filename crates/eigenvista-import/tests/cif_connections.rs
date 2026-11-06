//! Independent mmCIF connection and selected-source-row regressions.

use eigenvista_core::{Document, bonds};
use eigenvista_import::{ImportResult, import_bytes};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

const RECORD_PREFIX: &str = "mmCIF struct_conn: ";

struct Site<'a> {
    id: &'a str,
    element: &'a str,
    label: [&'a str; 4],
    author: [&'a str; 4],
    alt: &'a str,
    insertion: &'a str,
    occupancy: f64,
    model: &'a str,
    x: f64,
}

fn site<'a>(id: &'a str, element: &'a str, name: &'a str, x: f64) -> Site<'a> {
    Site {
        id,
        element,
        label: ["A", "LIG", "1", name],
        author: ["X", "LEG", "5", name],
        alt: ".",
        insertion: ".",
        occupancy: 1.,
        model: "1",
        x,
    }
}

fn token(value: &str) -> String {
    let lower = value.to_ascii_lowercase();
    if value.chars().any(char::is_whitespace)
        || value.starts_with(['_', '#'])
        || ["loop_", "stop_", "global_"].contains(&lower.as_str())
        || lower.starts_with("save_")
        || lower.starts_with("data_")
    {
        format!("'{value}'")
    } else {
        value.into()
    }
}

fn geometry(sites: &[Site<'_>]) -> String {
    let tags = [
        "id",
        "type_symbol",
        "label_asym_id",
        "label_comp_id",
        "label_seq_id",
        "label_atom_id",
        "auth_asym_id",
        "auth_comp_id",
        "auth_seq_id",
        "auth_atom_id",
        "label_alt_id",
        "pdbx_PDB_ins_code",
        "occupancy",
        "pdbx_PDB_model_num",
        "label_entity_id",
        "Cartn_x",
        "Cartn_y",
        "Cartn_z",
    ];
    let mut text = String::from("loop_\n");
    for tag in tags {
        text.push_str(&format!("_atom_site.{tag}\n"));
    }
    for s in sites {
        let mut fields = vec![s.id.to_string(), s.element.into()];
        fields.extend(s.label.map(token));
        fields.extend(s.author.map(token));
        fields.extend([
            s.alt.into(),
            s.insertion.into(),
            s.occupancy.to_string(),
            s.model.into(),
            "1".into(),
            s.x.to_string(),
            "0".into(),
            "0".into(),
        ]);
        text.push_str(&fields.join(" "));
        text.push('\n');
    }
    text.push_str("#\n");
    text
}

type Row = BTreeMap<String, String>;

fn connection(id: &str, kind: &str, first: &str, second: &str) -> Row {
    let mut row = Row::from([
        ("id".into(), id.into()),
        ("conn_type_id".into(), kind.into()),
        ("pdbx_value_order".into(), "?".into()),
    ]);
    for (partner, atom) in [(1, first), (2, second)] {
        for (suffix, value) in [
            ("label_asym_id", "A"),
            ("label_comp_id", "LIG"),
            ("label_seq_id", "1"),
            ("label_atom_id", atom),
        ] {
            row.insert(format!("ptnr{partner}_{suffix}"), value.into());
        }
    }
    row
}

fn connections(rows: &[Row]) -> String {
    let tags: BTreeSet<_> = rows.iter().flat_map(|row| row.keys()).collect();
    let mut text = String::from("loop_\n");
    for tag in &tags {
        text.push_str(&format!("_struct_conn.{tag}\n"));
    }
    for row in rows {
        text.push_str(
            &tags
                .iter()
                .map(|tag| token(row.get(*tag).map_or(".", String::as_str)))
                .collect::<Vec<_>>()
                .join(" "),
        );
        text.push('\n');
    }
    text.push_str("#\n");
    text
}

fn document(sites: &[Site<'_>], rows: &[Row]) -> String {
    let mut text = format!("data_CONNECTIONS\n#\n{}", geometry(sites));
    if !rows.is_empty() {
        text.push_str(&connections(rows));
    }
    text
}

fn load(text: &str) -> ImportResult {
    import_bytes(text.as_bytes(), "connections.cif").expect("valid connection fixture")
}

fn records(doc: &Document) -> Vec<Value> {
    doc.provenance
        .iter()
        .filter_map(|entry| entry.strip_prefix(RECORD_PREFIX))
        .map(|json| serde_json::from_str(json).expect("structured connection provenance"))
        .collect()
}

fn by_id<'a>(entries: &'a [Value], id: &str) -> &'a Value {
    entries
        .iter()
        .find(|entry| entry["source"]["id"] == id)
        .expect("source connection ID preserved")
}

#[test]
fn declared_links_override_distance_and_perception_fills_missing_pairs() {
    let atoms = [
        site("1", "C", "C1", 0.),
        site("2", "C", "C2", 10.),
        site("3", "H", "H1", 0.95),
        site("4", "S", "S1", 20.),
        site("5", "S", "S2", 24.),
        site("6", "Mg", "MG", 40.),
        site("7", "O", "O1", 43.1),
    ];
    let mut covalent = connection("covalent", "covale", "C1", "C2");
    covalent.insert("pdbx_value_order".into(), "doub".into());
    let rows = [
        covalent,
        connection("sulfur", "disulf", "S1", "S2"),
        connection("metal", "metalc", "MG", "O1"),
    ];
    let result = load(&document(&atoms, &rows));
    assert_eq!(result.document.bonds, vec![[0, 1], [0, 2], [3, 4], [5, 6]]);
    let entries = records(&result.document);
    assert_eq!(entries.len(), 3);
    for (id, pair) in [("covalent", [0, 1]), ("sulfur", [3, 4]), ("metal", [5, 6])] {
        assert_eq!(by_id(&entries, id)["status"], "retained");
        assert_eq!(by_id(&entries, id)["bond"], serde_json::json!(pair));
    }
    assert_eq!(
        by_id(&entries, "covalent")["source"]["pdbx_value_order"],
        "doub"
    );
    assert_eq!(by_id(&entries, "metal")["source"]["pdbx_value_order"], "?");
    let encoded =
        eigenvista_format::encode(&result.document).expect("savable declaration metadata");
    let decoded = eigenvista_format::decode(&encoded).expect("native decode");
    assert_eq!(
        serde_json::to_value(&decoded).unwrap(),
        serde_json::to_value(&result.document).unwrap()
    );
}

#[test]
fn duplicate_pairs_keep_both_deposited_identifiers_without_duplicate_bonds() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let rows = [
        connection("forward", "covale", "C1", "N1"),
        connection("reverse", "covale", "N1", "C1"),
    ];
    let result = load(&document(&atoms, &rows));
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    let entries = records(&result.document);
    assert_eq!(entries.len(), 2);
    assert_eq!(by_id(&entries, "forward")["status"], "retained");
    assert_eq!(by_id(&entries, "reverse")["status"], "duplicate");
    assert_eq!(
        by_id(&entries, "reverse")["selected_atoms"],
        serde_json::json!([1, 0])
    );
}

#[test]
fn label_and_author_names_are_distinct_and_all_supplied_constraints_must_match() {
    let mut first = site("1", "C", "CA", 0.);
    first.author[3] = "Q1";
    let mut second = site("2", "N", "NB", 10.);
    second.author[3] = "Q2";
    let atoms = [first, second];
    let mut author = Row::from([
        ("id".into(), "author-only".into()),
        ("conn_type_id".into(), "covale".into()),
    ]);
    for (partner, atom) in [(1, "Q1"), (2, "Q2")] {
        for (suffix, value) in [
            ("auth_asym_id", "X"),
            ("auth_comp_id", "LEG"),
            ("auth_seq_id", "5"),
            ("auth_atom_id", atom),
        ] {
            author.insert(format!("ptnr{partner}_{suffix}"), value.into());
        }
    }
    let result = load(&document(&atoms, &[author]));
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    assert_eq!(records(&result.document)[0]["status"], "retained");

    let mut valid = connection("consistent", "covale", "CA", "NB");
    for (partner, atom) in [(1, "Q1"), (2, "Q2")] {
        for (suffix, value) in [
            ("auth_asym_id", "X"),
            ("auth_comp_id", "LEG"),
            ("auth_seq_id", "5"),
            ("auth_atom_id", atom),
        ] {
            valid.insert(format!("ptnr{partner}_{suffix}"), value.into());
        }
    }
    let mut conflict = valid.clone();
    conflict.insert("id".into(), "contradictory".into());
    conflict.insert("ptnr2_auth_atom_id".into(), "Q1".into());
    let result = load(&document(&atoms, &[valid, conflict]));
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    let entries = records(&result.document);
    assert_eq!(by_id(&entries, "consistent")["status"], "retained");
    assert_eq!(by_id(&entries, "contradictory")["status"], "unresolved");
    assert!(
        result
            .report
            .warnings
            .iter()
            .any(|warning| warning.starts_with("mmCIF parser:"))
    );
}

#[test]
fn insertion_codes_disambiguate_and_absent_or_ambiguous_references_are_not_guessed() {
    let mut a = site("1", "C", "CA", 0.);
    a.insertion = "A";
    let mut b = site("2", "C", "CA", 10.);
    b.insertion = "B";
    let target = site("3", "N", "NB", 20.);
    let mut exact = connection("insertion-A", "covale", "CA", "NB");
    exact.insert("pdbx_ptnr1_PDB_ins_code".to_ascii_lowercase(), "A".into());
    let ambiguous = connection("ambiguous", "covale", "CA", "NB");
    let absent = connection("absent", "covale", "MISSING", "NB");
    let result = load(&document(&[a, b, target], &[exact, ambiguous, absent]));
    assert_eq!(result.document.bonds, vec![[0, 2]]);
    let entries = records(&result.document);
    assert_eq!(by_id(&entries, "insertion-A")["status"], "retained");
    assert_eq!(by_id(&entries, "ambiguous")["status"], "unresolved");
    assert_eq!(by_id(&entries, "absent")["status"], "unresolved");
}

#[test]
fn discarded_alternates_zero_occupancy_and_later_models_cannot_be_retargeted() {
    let common = site("1", "C", "C1", 0.);
    let mut discarded = site("2", "N", "N1", 10.);
    discarded.alt = "A";
    discarded.occupancy = 0.2;
    let mut selected = site("3", "N", "N1", 20.);
    selected.alt = "B";
    selected.occupancy = 0.8;
    let mut zero = site("4", "O", "ZERO", 30.);
    zero.occupancy = 0.;
    let mut later = site("5", "S", "LATER", 40.);
    later.model = "2";
    let mut a = connection("discarded-A", "covale", "C1", "N1");
    a.insert("pdbx_ptnr2_label_alt_id".into(), "A".into());
    let mut b = connection("selected-B", "covale", "C1", "N1");
    b.insert("pdbx_ptnr2_label_alt_id".into(), "B".into());
    let mut contradictory = b.clone();
    contradictory.insert("id".into(), "contradictory-alt-aliases".into());
    contradictory.insert("ptnr2_label_alt_id".into(), "A".into());
    let result = load(&document(
        &[common, discarded, selected, zero, later],
        &[
            a,
            b,
            contradictory,
            connection("zero", "covale", "C1", "ZERO"),
            connection("later", "covale", "C1", "LATER"),
        ],
    ));
    assert_eq!(result.document.atoms.len(), 2);
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    let entries = records(&result.document);
    assert_eq!(by_id(&entries, "selected-B")["status"], "retained");
    for id in ["discarded-A", "contradictory-alt-aliases", "zero", "later"] {
        assert_eq!(by_id(&entries, id)["status"], "unresolved", "{id}");
    }
}

#[test]
fn nonpolymer_null_label_sequences_resolve_through_real_source_identifiers() {
    let mut oxygen = site("1", "O", "O2A", 0.);
    oxygen.label = ["L", "ADP", ".", "O2A"];
    oxygen.author = ["A", "ADP", "1", "O2A"];
    let mut metal = site("2", "Mg", "MG", 3.1);
    metal.label = ["M", "MG", ".", "MG"];
    metal.author = ["A", "MG", "550", "MG"];
    let mut row = connection("nonpolymer", "metalc", "O2A", "MG");
    for (partner, label, author) in [
        (1, oxygen.label, oxygen.author),
        (2, metal.label, metal.author),
    ] {
        for (suffix, value) in ["asym_id", "comp_id", "seq_id", "atom_id"]
            .into_iter()
            .zip(label)
        {
            row.insert(format!("ptnr{partner}_label_{suffix}"), value.into());
        }
        for (suffix, value) in ["asym_id", "comp_id", "seq_id", "atom_id"]
            .into_iter()
            .zip(author)
        {
            row.insert(format!("ptnr{partner}_auth_{suffix}"), value.into());
        }
    }
    let result = load(&document(&[oxygen, metal], &[row]));
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    assert_eq!(records(&result.document)[0]["status"], "retained");
}

#[test]
fn separate_nonpolymer_residues_select_their_own_preferred_alternates() {
    let mut first_a = site("1", "O", "O", 0.);
    first_a.label = ["W", "HOH", ".", "O"];
    first_a.author = ["A", "HOH", "1", "O"];
    first_a.alt = "A";
    first_a.occupancy = 0.9;
    let mut first_b = site("2", "O", "O", 10.);
    first_b.label = first_a.label;
    first_b.author = first_a.author;
    first_b.alt = "B";
    first_b.occupancy = 0.1;
    let mut second_a = site("3", "O", "O", 20.);
    second_a.label = ["W", "HOH", ".", "O"];
    second_a.author = ["A", "HOH", "2", "O"];
    second_a.alt = "A";
    second_a.occupancy = 0.2;
    let mut second_b = site("4", "O", "O", 30.);
    second_b.label = second_a.label;
    second_b.author = second_a.author;
    second_b.alt = "B";
    second_b.occupancy = 0.8;
    let metal = site("5", "Mg", "MG", 50.);
    let mut row = connection("water-2", "metalc", "O", "MG");
    row.insert("ptnr1_label_asym_id".into(), "W".into());
    row.insert("ptnr1_label_comp_id".into(), "HOH".into());
    row.insert("ptnr1_label_seq_id".into(), ".".into());
    row.insert("ptnr1_auth_asym_id".into(), "A".into());
    row.insert("ptnr1_auth_comp_id".into(), "HOH".into());
    row.insert("ptnr1_auth_seq_id".into(), "2".into());
    row.insert("ptnr1_auth_atom_id".into(), "O".into());
    row.insert("pdbx_ptnr1_label_alt_id".into(), "B".into());
    let result = load(&document(
        &[first_a, first_b, second_a, second_b, metal],
        &[row],
    ));
    assert_eq!(result.document.atoms.len(), 3);
    assert_eq!(result.document.atoms[0].position[0], 0.);
    assert!(
        (result.document.atoms[1].position[0] * eigenvista_core::BOHR_TO_ANGSTROM - 30.).abs()
            < 1e-12
    );
    assert_eq!(result.document.bonds, vec![[1, 2]]);
    assert_eq!(records(&result.document)[0]["status"], "retained");
}

#[test]
fn shared_symmetry_maps_back_to_selected_sites_while_other_images_are_reported() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let mut rows = Vec::new();
    for (id, first, second) in [
        ("shared", "2_555", "2_555"),
        ("different", "1_555", "2_555"),
        ("mixed", ".", "1_555"),
        ("unknown", "?", "?"),
        ("invalid", "bad", "bad"),
    ] {
        let mut row = connection(id, "covale", "C1", "N1");
        row.insert("ptnr1_symmetry".into(), first.into());
        row.insert("ptnr2_symmetry".into(), second.into());
        rows.push(row);
    }
    let result = load(&document(&atoms, &rows));
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    let entries = records(&result.document);
    assert_eq!(by_id(&entries, "shared")["status"], "retained");
    for id in ["different", "mixed", "unknown", "invalid"] {
        assert_eq!(by_id(&entries, id)["status"], "symmetry-omitted", "{id}");
    }
}

#[test]
fn noncovalent_and_unknown_declarations_are_recorded_without_explicit_display_edges() {
    for kind in ["hydrog", "saltbr", "unknown-kind"] {
        let atoms = [site("1", "N", "N1", 0.), site("2", "O", "O1", 10.)];
        let row = connection("recorded", kind, "N1", "O1");
        let result = load(&document(&atoms, &[row]));
        assert!(
            result.document.bonds.is_empty(),
            "{kind} was inserted as a display bond"
        );
        let entries = records(&result.document);
        assert_eq!(entries[0]["status"], "recorded");
        assert_eq!(entries[0]["source"]["conn_type_id"], kind);
        assert_eq!(entries[0]["selected_atoms"], serde_json::json!([0, 1]));
    }
}

#[test]
fn third_partner_declarations_are_not_silently_collapsed_to_one_pair() {
    let atoms = [site("1", "Mg", "MG", 0.), site("2", "O", "O1", 10.)];
    let mut row = connection("three-partner", "metalc", "MG", "O1");
    row.insert("pdbx_ptnr3_label_asym_id".into(), "A".into());
    row.insert("pdbx_ptnr3_label_comp_id".into(), "LIG".into());
    row.insert("pdbx_ptnr3_label_seq_id".into(), "1".into());
    row.insert("pdbx_ptnr3_label_atom_id".into(), "O2".into());
    let result = load(&document(&atoms, &[row]));
    assert!(result.document.bonds.is_empty());
    let entries = records(&result.document);
    assert_eq!(entries[0]["status"], "recorded");
    assert_eq!(entries[0]["source"]["pdbx_ptnr3_label_atom_id"], "O2");
    assert_eq!(entries[0]["selected_atoms"], serde_json::json!([0, 1]));
}

#[test]
fn connection_values_can_wrap_precede_atoms_and_use_quoted_identifiers() {
    let atoms = [site("1", "C", "C one", 0.), site("2", "N", "N two", 10.)];
    let row = connection("quoted", "covale", "C one", "N two");
    let category = connections(&[row]);
    // One connection's values span two physical lines, unlike atom_site rows.
    let category = category.replace("quoted", "\nquoted");
    let text = format!("data_BEFORE\n#\n{category}{}", geometry(&atoms));
    let result = load(&text);
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    assert_eq!(
        records(&result.document)[0]["source"]["ptnr1_label_atom_id"],
        "C one"
    );
}

#[test]
fn scalar_connection_fields_and_semicolon_details_preserve_deposited_text() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let row = connection("scalar identity", "covale", "C1", "N1");
    let mut text = document(&atoms, &[]);
    for (tag, value) in row {
        if tag == "id" {
            text.push_str(&format!("_struct_conn.id\n{}\n", token(&value)));
        } else {
            text.push_str(&format!("_struct_conn.{tag} {}\n", token(&value)));
        }
    }
    text.push_str("_struct_conn.details\n;curated connection  \nloop_\ndata_NOT_A_BLOCK\n;\n#\n");
    let result = load(&text);
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    let entries = records(&result.document);
    assert_eq!(entries[0]["source"]["id"], "scalar identity");
    let details = entries[0]["source"]["details"].as_str().unwrap();
    assert!(
        details.starts_with("curated connection  \n"),
        "opening text spaces were lost: {details:?}"
    );
    assert!(details.contains("loop_\ndata_NOT_A_BLOCK"));
}

#[test]
fn text_and_block_boundaries_never_discard_trailing_constraints() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let row = connection("boundary", "covale", "C1", "N1");
    let mut scalar = document(&atoms, &[]);
    for (tag, value) in &row {
        scalar.push_str(&format!("_struct_conn.{tag} {}\n", token(value)));
    }
    scalar.push_str("_struct_conn.details\n;notes\n");
    let ordinary = document(&atoms, &[row]);
    let ignored_text = format!("{ordinary}loop_\n_ignored.details\n;notes\n");
    let trailing_constraints =
        "_struct_conn.ptnr1_symmetry 1_555 _struct_conn.ptnr2_symmetry 2_555";

    // These controls/comments are supported and must preserve the actual edge.
    for input in [
        format!("{scalar}; \t# closing comment\n"),
        format!("{ignored_text}; \t# closing comment\n"),
        format!("{ordinary}stop_ \t# boundary comment\n"),
        ordinary.replace("data_CONNECTIONS\n", "data_CONNECTIONS \t# block comment\n"),
    ] {
        assert_eq!(load(&input).document.bonds, vec![[0, 1]]);
    }

    for (label, input) in [
        (
            "connection text closer",
            format!("{scalar}; {trailing_constraints}\n"),
        ),
        (
            "ignored text closer",
            format!("{ignored_text}; {trailing_constraints}\n"),
        ),
        (
            "unseparated closing comment",
            format!("{scalar};# comment\n"),
        ),
        (
            "stop control",
            format!("{ordinary}stop_ {trailing_constraints}\n"),
        ),
        (
            "data control",
            ordinary.replace(
                "data_CONNECTIONS\n",
                &format!("data_CONNECTIONS {trailing_constraints}\n"),
            ),
        ),
    ] {
        assert!(
            import_bytes(input.as_bytes(), "trailing-boundary.cif").is_err(),
            "{label}: trailing tokens were silently discarded"
        );
    }
}

#[test]
fn inline_comments_do_not_change_quoted_connection_identifiers() {
    let atoms = [site("1", "C", "C # one", 0.), site("2", "N", "N two", 10.)];
    let row = connection("commented", "covale", "C # one", "N two");
    let category = connections(&[row]).replace("\n#\n", " # ignored outside quoted values\n#\n");
    let text = format!("data_COMMENTS\n{}{}", geometry(&atoms), category);
    let result = load(&text);
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    assert_eq!(
        records(&result.document)[0]["source"]["ptnr1_label_atom_id"],
        "C # one"
    );
}

#[test]
fn multiple_loop_header_tags_share_a_line_and_column_growth_is_bounded() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let text = document(
        &atoms,
        &[connection("joined-headers", "covale", "C1", "N1")],
    )
    .replace(
        "_atom_site.id\n_atom_site.type_symbol\n",
        "_atom_site.id _atom_site.type_symbol\n",
    )
    .replace(
        "_struct_conn.conn_type_id\n_struct_conn.id\n",
        "_struct_conn.conn_type_id _struct_conn.id\n",
    );
    let result = load(&text);
    assert_eq!(result.document.bonds, vec![[0, 1]]);
    assert_eq!(
        records(&result.document)[0]["source"]["id"],
        "joined-headers"
    );

    let metadata = |columns: usize| {
        let tags = (0..columns)
            .map(|i| format!("_ignored.field{i}\n"))
            .collect::<String>();
        format!("{text}loop_\n{tags}{}\n#\n", "0 ".repeat(columns))
    };
    // A positive control prevents an unsupported-category rejection from
    // masquerading as the actual header-allocation guard.
    assert_eq!(load(&metadata(256)).document.bonds, vec![[0, 1]]);
    let error = import_bytes(metadata(257).as_bytes(), "overwide.cif").unwrap_err();
    assert!(
        error.contains("column") || error.contains("budget"),
        "expected a header bound, got {error}"
    );
}

#[test]
fn quoted_control_like_identifiers_are_values_and_inline_controls_are_rejected() {
    let atoms = [
        site("1", "C", "_tag", 0.),
        site("2", "N", "loop_", 10.),
        site("3", "O", "save_name", 20.),
    ];
    let rows = [
        connection("loop_", "covale", "_tag", "loop_"),
        connection("save_name", "covale", "loop_", "save_name"),
        connection("_tag", "covale", "_tag", "save_name"),
    ];
    let result = load(&document(&atoms, &rows));
    assert_eq!(result.document.bonds, vec![[0, 1], [0, 2], [1, 2]]);
    let entries = records(&result.document);
    for id in ["loop_", "save_name", "_tag"] {
        assert_eq!(by_id(&entries, id)["status"], "retained");
    }

    let ordinary = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    for control in ["loop_", "save_frame", "_tag", "global_"] {
        let text = document(&ordinary, &[connection(control, "covale", "C1", "N1")]);
        let unquoted = text.replace(&format!("'{control}'"), control);
        assert!(
            import_bytes(unquoted.as_bytes(), "unquoted-control.cif").is_err(),
            "unquoted {control} was accepted as a row value"
        );
    }
    let category = connections(&[connection("inline", "covale", "C1", "N1")])
        .replace("\n#\n", " _cell.length_a 10\n#\n");
    let inline = format!("data_INLINE\n{}{category}", geometry(&ordinary));
    assert!(import_bytes(inline.as_bytes(), "inline-control.cif").is_err());
}

#[test]
fn unsupported_save_frames_and_global_blocks_fail_without_partial_imports() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let ordinary = format!("{}_entry.id DEMO\n", document(&atoms, &[]));
    assert_eq!(load(&ordinary).document.atoms.len(), 2);
    for suffix in [
        "save_frame\n_ignored.foo bar\nsave_\n",
        "global_\n_ignored.foo bar\n",
    ] {
        let text = format!("{ordinary}{suffix}");
        let outcome = std::panic::catch_unwind(|| import_bytes(text.as_bytes(), "unsupported.cif"));
        assert!(
            matches!(outcome, Ok(Err(_))),
            "unsupported control must return an error"
        );
    }
}

#[test]
fn malformed_or_oversized_connection_data_fails_without_panicking() {
    let atoms = [site("1", "C", "C1", 0.), site("2", "N", "N1", 10.)];
    let row = connection("truncated", "covale", "C1", "N1");
    let mut malformed = document(&atoms, &[]);
    malformed.push_str("loop_\n_struct_conn.id\n_struct_conn.conn_type_id\ntruncated\n#\n");
    let mut huge_row = row;
    huge_row.insert("details".into(), "x".repeat(4 * 1024 * 1024));
    let huge = document(&atoms, &[huge_row]);
    let mut duplicated_tags = document(&atoms, &[]);
    duplicated_tags.push_str(
        "loop_\n_struct_conn.id\n_struct_conn.id\n_struct_conn.conn_type_id\none two covale\n#\n",
    );
    let mut cross_block = document(&atoms, &[connection("cross-block", "covale", "C1", "N1")]);
    cross_block.push_str(&format!("data_SECOND\n{}", geometry(&atoms)));
    let duplicated_ids = document(
        &atoms,
        &[
            connection("same", "covale", "C1", "N1"),
            connection("same", "covale", "N1", "C1"),
        ],
    );
    let mut missing_id = connection("missing", "covale", "C1", "N1");
    missing_id.remove("id");
    let missing_id = document(&atoms, &[missing_id]);
    for (label, input) in [
        ("truncated", malformed),
        ("oversized provenance", huge),
        ("duplicate tags", duplicated_tags),
        ("cross data block", cross_block),
        ("duplicate IDs", duplicated_ids),
        ("missing ID", missing_id),
    ] {
        let outcome = std::panic::catch_unwind(|| import_bytes(input.as_bytes(), "bad.cif"));
        assert!(
            matches!(outcome, Ok(Err(_))),
            "{label}: expected a reportable input error"
        );
    }
}

#[test]
fn real_1aon_retains_all_27_independently_resolved_metal_connections() {
    // Frozen zero-based source-row selections derived independently from the
    // deposited label/author tuples, not from this importer's bond output.
    const EXPECTED: [[usize; 2]; 27] = [
        [58674, 58681],
        [58674, 58676],
        [58674, 58678],
        [632, 58674],
        [58702, 58704],
        [58702, 58709],
        [4440, 58702],
        [4441, 58702],
        [58730, 58732],
        [58730, 58737],
        [58730, 58734],
        [8248, 58730],
        [58758, 58765],
        [58758, 58760],
        [12056, 58758],
        [58786, 58788],
        [58786, 58793],
        [58786, 58790],
        [15864, 58786],
        [58814, 58821],
        [58814, 58816],
        [58814, 58818],
        [19672, 58814],
        [58842, 58849],
        [58842, 58844],
        [58842, 58846],
        [23480, 58842],
    ];
    let input = include_bytes!("../../../fixtures/cif/1AON.cif");
    let result = import_bytes(input, "1AON.cif").expect("real fixture import");
    assert_eq!(result.document.atoms.len(), 58_870);
    let entries = records(&result.document);
    assert_eq!(entries.len(), EXPECTED.len());
    for (index, pair) in EXPECTED.into_iter().enumerate() {
        let id = format!("metalc{}", index + 1);
        let entry = by_id(&entries, &id);
        assert_eq!(entry["status"], "retained", "{id}");
        assert_eq!(entry["bond"], serde_json::json!(pair), "{id}");
        assert_eq!(entry["source"]["conn_type_id"], "metalc");
        assert_eq!(entry["source"]["pdbx_value_order"], "?");
        assert!(
            result.document.bonds.contains(&pair),
            "missing {id}: {pair:?}"
        );
    }
    for number in [3, 8, 11, 12, 14, 18, 22, 25, 26, 27] {
        let [a, b] = EXPECTED[number - 1];
        let pa = result.document.atoms[a].position;
        let pb = result.document.atoms[b].position;
        let distance = pa
            .into_iter()
            .zip(pb)
            .map(|(a, b)| (a - b).powi(2))
            .sum::<f64>()
            .sqrt()
            * eigenvista_core::BOHR_TO_ANGSTROM;
        // Independently pinned Mg 1.39 + O 0.63 + tolerance 0.45 Å.
        assert!(
            distance > 2.47,
            "metalc{number} must exercise declared precedence"
        );
    }
}

#[test]
fn entries_without_connections_keep_existing_geometry_and_perceived_bonds() {
    let result = import_bytes(include_bytes!("../../../fixtures/cif/1BH3.cif"), "1BH3.cif")
        .expect("existing no-connection fixture");
    assert_eq!(result.document.atoms.len(), 2372);
    assert_eq!(result.document.bonds.len(), 2270);
    assert!(records(&result.document).is_empty());
    assert_eq!(
        result.document.bonds,
        bonds::perceive(&result.document.atoms, &[]).unwrap().bonds
    );
}
