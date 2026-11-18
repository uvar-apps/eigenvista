use std::{
    fs,
    path::{Path, PathBuf},
    process::{Command, Output},
    sync::atomic::{AtomicUsize, Ordering},
    time::{SystemTime, UNIX_EPOCH},
};

#[path = "../../eigenvista-format/tests/support/mod.rs"]
mod support;

struct Scratch(PathBuf);
static SCRATCH_ID: AtomicUsize = AtomicUsize::new(0);
impl Scratch {
    fn new() -> Self {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        fs::create_dir_all(&root).unwrap();
        let id = SCRATCH_ID.fetch_add(1, Ordering::Relaxed);
        let dir = root.join(format!("convert-test-{}-{nonce}-{id}", std::process::id()));
        fs::create_dir(&dir).unwrap();
        Self(dir)
    }
    fn run(&self, args: &[&str]) -> Output {
        Command::new(env!("CARGO_BIN_EXE_eigenvista-convert"))
            .args(args)
            .current_dir(&self.0)
            .env("TMPDIR", &self.0)
            .env("TMP", &self.0)
            .env("TEMP", &self.0)
            .output()
            .unwrap()
    }
    fn water(&self, name: &str) {
        fs::write(
            self.0.join(name),
            "3\nWater\nO 0 0 0\nH 0.758 0 0.504\nH -0.758 0 0.504\n",
        )
        .unwrap();
    }
}
impl Drop for Scratch {
    fn drop(&mut self) {
        let _ = fs::remove_dir_all(&self.0);
    }
}

#[test]
fn help_version_and_invalid_options_are_explicit() {
    let dir = Scratch::new();
    let help = dir.run(&["--help"]);
    assert!(help.status.success());
    let help = String::from_utf8_lossy(&help.stdout);
    assert!(help.contains("--output-dir"));
    assert!(help.contains("EigenVista file converter"));
    assert!(help.contains("default: INPUT.eigenvista"));
    assert!(help.contains("BinaryCIF .bcif"));
    assert!(help.contains("gzip-wrapped .bcif.gz"));
    let version = dir.run(&["--version"]);
    assert!(version.status.success());
    assert_eq!(
        String::from_utf8_lossy(&version.stdout),
        format!("eigenvista-convert {}\n", env!("CARGO_PKG_VERSION"))
    );
    for args in [
        vec![],
        vec!["--unknown"],
        vec!["--output"],
        vec!["--check", "--force", "in.xyz"],
    ] {
        assert_eq!(dir.run(&args).status.code(), Some(2));
    }
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 0);
}

#[test]
fn legacy_native_defaults_to_new_extension_preserving_science_and_meshes() {
    use eigenvista_core::{compute, fixtures};
    let dir = Scratch::new();
    let mut document = fixtures::hydrogen_pair();
    let hash = compute::source_hash(&document, "antibonding").unwrap();
    let grid = compute::sample(&document, "antibonding", 12).unwrap();
    let surface = compute::mesh(&grid, 0.02, "antibonding", &hash, "#00ff00", 0.5).unwrap();
    assert!(!surface.indices.is_empty());
    document.grids.push(grid);
    document.surfaces.push(surface);
    let old = support::with_profile(
        &eigenvista_format::encode(&document).unwrap(),
        "molekel",
        &["molekel-preview-polynomial-v1"],
    );
    fs::write(dir.0.join("legacy.molekel"), &old).unwrap();
    let result = dir.run(&["legacy.molekel", "--json"]);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report[0]["report"]["format"], "eigenvista");
    assert_eq!(report[0]["report"]["requires_save"], false);
    assert!(
        report[0]["output"]
            .as_str()
            .unwrap()
            .ends_with("legacy.eigenvista")
    );
    let saved = fs::read(dir.0.join("legacy.eigenvista")).unwrap();
    assert_eq!(support::manifest(&saved)["format"], "eigenvista");
    let loaded = eigenvista_format::decode(&saved).unwrap();
    assert_eq!(loaded, document);
    assert_eq!(compute::source_hash(&loaded, "antibonding").unwrap(), hash);
    assert_eq!(fs::read(dir.0.join("legacy.molekel")).unwrap(), old);
    assert_eq!(dir.run(&["legacy.molekel"]).status.code(), Some(2));
    assert_eq!(
        dir.run(&["legacy.molekel", "-o", "legacy.molekel", "--force"])
            .status
            .code(),
        Some(2)
    );
    assert_eq!(fs::read(dir.0.join("legacy.molekel")).unwrap(), old);
}

#[test]
fn explicit_legacy_extension_is_accepted_but_always_writes_canonical_format() {
    let dir = Scratch::new();
    dir.water("water.xyz");
    let source = fs::read(dir.0.join("water.xyz")).unwrap();
    for name in ["legacy.molekel", "upper.MOLEKEL", "native.EIGENVISTA"] {
        assert!(dir.run(&["water.xyz", "--output", name]).status.success());
        let bytes = fs::read(dir.0.join(name)).unwrap();
        let manifest = support::manifest(&bytes);
        assert_eq!(manifest["format"], "eigenvista");
        assert_eq!(
            manifest["required_features"],
            serde_json::json!(["eigenvista-preview-polynomial-v1"])
        );
        assert_eq!(eigenvista_format::decode(&bytes).unwrap().bonds.len(), 2);
        assert_eq!(
            dir.run(&["water.xyz", "--output", name]).status.code(),
            Some(2)
        );
    }
    assert_eq!(
        dir.run(&["water.xyz", "-o", "water.xyz", "--force"])
            .status
            .code(),
        Some(2)
    );
    assert_eq!(fs::read(dir.0.join("water.xyz")).unwrap(), source);
}

#[test]
fn conversion_preserves_structure_and_refuses_accidental_overwrite() {
    let dir = Scratch::new();
    dir.water("water.xyz");
    let original = fs::read(dir.0.join("water.xyz")).unwrap();
    let result = dir.run(&["water.xyz", "--json"]);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report[0]["status"], "converted");
    assert_eq!(report[0]["report"]["format"], "xyz");
    let saved = fs::read(dir.0.join("water.eigenvista")).unwrap();
    let doc = eigenvista_format::decode(&saved).unwrap();
    assert_eq!(doc.atoms.len(), 3);
    assert_eq!(doc.bonds.len(), 2);
    assert_eq!(dir.run(&["water.xyz"]).status.code(), Some(2));
    assert_eq!(fs::read(dir.0.join("water.eigenvista")).unwrap(), saved);
    assert!(dir.run(&["water.xyz", "--force"]).status.success());
    assert_eq!(fs::read(dir.0.join("water.xyz")).unwrap(), original);
}

#[test]
fn molden_cli_and_library_produce_the_same_scientific_document() {
    let dir = Scratch::new();
    let source =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("../../fixtures/molden/water-rhf-ccpvdz.molden");
    fs::copy(source, dir.0.join("water.molden.input")).unwrap();
    let input = fs::read(dir.0.join("water.molden.input")).unwrap();
    let expected = eigenvista_import::import_bytes(&input, "water.molden.input").unwrap();
    let result = dir.run(&["water.molden.input", "--json"]);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let doc =
        eigenvista_format::decode(&fs::read(dir.0.join("water.eigenvista")).unwrap()).unwrap();
    assert_eq!(doc, expected.document);
    assert_eq!(doc.basis.len(), 24);
    assert!(!doc.orbitals.is_empty());
    assert!(!doc.densities.is_empty());
    assert!(!doc.bonds.is_empty());
}

#[test]
fn check_does_not_write_and_batch_reports_individual_failures() {
    let dir = Scratch::new();
    dir.water("water.xyz");
    fs::write(
        dir.0.join("broken.molden"),
        "[Molden Format]\n[Atoms] AU\ninvalid\n",
    )
    .unwrap();
    let checked = dir.run(&["--check", "--json", "water.xyz"]);
    assert!(checked.status.success());
    assert!(!dir.0.join("water.eigenvista").exists());
    fs::create_dir(dir.0.join("out")).unwrap();
    let result = dir.run(&[
        "--json",
        "--output-dir",
        "out",
        "water.xyz",
        "broken.molden",
    ]);
    assert_eq!(result.status.code(), Some(1));
    let report: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report[0]["status"], "converted");
    assert_eq!(report[1]["status"], "failed");
    assert!(report[1]["error"].as_str().unwrap().contains("Molden"));
    assert!(dir.0.join("out/water.eigenvista").exists());
    assert!(!dir.0.join("out/broken.eigenvista").exists());
}

#[test]
fn cube_conversion_preserves_scalar_data_and_repairs_missing_native_bonds() {
    let dir = Scratch::new();
    let input = include_bytes!("../../../fixtures/cube/signed-affine.cube");
    fs::write(dir.0.join("field.cube"), input).unwrap();
    let expected = eigenvista_import::import_bytes(input, "field.cube")
        .unwrap()
        .document;
    let result = dir.run(&["field.cube", "--json"]);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    let converted =
        eigenvista_format::decode(&fs::read(dir.0.join("field.eigenvista")).unwrap()).unwrap();
    assert_eq!(converted, expected);
    assert_eq!(converted.bonds, vec![[0, 1]]);
    assert!(converted.basis.is_empty());
    assert_eq!(converted.grids[0].values.len(), 343);
    let mut missing = converted.clone();
    missing.bonds.clear();
    fs::write(
        dir.0.join("old.eigenvista"),
        eigenvista_format::encode(&missing).unwrap(),
    )
    .unwrap();
    let result = dir.run(&["old.eigenvista", "-o", "repaired.eigenvista", "--json"]);
    assert!(result.status.success());
    let report: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report[0]["report"]["requires_save"], true);
    let repaired =
        eigenvista_format::decode(&fs::read(dir.0.join("repaired.eigenvista")).unwrap()).unwrap();
    assert_eq!(repaired.bonds, converted.bonds);
    assert_eq!(repaired.grids, converted.grids);
    assert_eq!(
        eigenvista_format::decode(&fs::read(dir.0.join("old.eigenvista")).unwrap()).unwrap(),
        missing
    );
    assert_eq!(fs::read(dir.0.join("field.cube")).unwrap(), input);
}

#[test]
fn batch_output_collisions_and_input_replacement_are_rejected_before_writing() {
    let dir = Scratch::new();
    fs::create_dir(dir.0.join("a")).unwrap();
    fs::create_dir(dir.0.join("b")).unwrap();
    fs::create_dir(dir.0.join("out")).unwrap();
    dir.water("a/water.xyz");
    dir.water("b/water.xyz");
    let result = dir.run(&[
        "--force",
        "--output-dir",
        "out",
        "a/water.xyz",
        "b/water.xyz",
    ]);
    assert_eq!(result.status.code(), Some(2));
    assert_eq!(fs::read_dir(dir.0.join("out")).unwrap().count(), 0);
    let native = eigenvista_format::encode(&eigenvista_core::fixtures::hydrogen_pair()).unwrap();
    fs::write(dir.0.join("source.eigenvista"), &native).unwrap();
    assert_eq!(
        dir.run(&["source.eigenvista", "--force"]).status.code(),
        Some(2)
    );
    assert_eq!(fs::read(dir.0.join("source.eigenvista")).unwrap(), native);
}

#[test]
fn invalid_conversion_leaves_no_partial_document_and_preserves_existing_output() {
    let dir = Scratch::new();
    fs::write(dir.0.join("large.xyz"), "invalid molecular input").unwrap();
    assert_eq!(dir.run(&["large.xyz"]).status.code(), Some(1));
    assert!(!dir.0.join("large.eigenvista").exists());
    dir.water("source.xyz");
    assert!(dir.run(&["source.xyz"]).status.success());
    let existing = fs::read(dir.0.join("source.eigenvista")).unwrap();
    fs::write(dir.0.join("source.xyz"), "invalid").unwrap();
    assert_eq!(dir.run(&["source.xyz", "--force"]).status.code(), Some(1));
    assert_eq!(fs::read(dir.0.join("source.eigenvista")).unwrap(), existing);
    assert_eq!(fs::read_dir(&dir.0).unwrap().count(), 3);
}

#[test]
#[cfg(unix)]
fn output_symlinks_are_not_followed_even_with_force() {
    let dir = Scratch::new();
    dir.water("water.xyz");
    let original = fs::read(dir.0.join("water.xyz")).unwrap();
    std::os::unix::fs::symlink(dir.0.join("water.xyz"), dir.0.join("water.eigenvista")).unwrap();
    assert_eq!(dir.run(&["water.xyz", "--force"]).status.code(), Some(2));
    assert_eq!(fs::read(dir.0.join("water.xyz")).unwrap(), original);
}

#[test]
#[cfg(target_os = "macos")]
fn force_batch_cannot_overwrite_a_new_unicode_alias_output() {
    let dir = Scratch::new();
    for name in ["a", "b", "out"] {
        fs::create_dir(dir.0.join(name)).unwrap();
    }
    dir.water("a/caf\u{e9}.xyz");
    fs::write(dir.0.join("b/cafe\u{301}.xyz"), "1\nHelium\nHe 0 0 0\n").unwrap();
    let result = dir.run(&[
        "--force",
        "--json",
        "--output-dir",
        "out",
        "a/caf\u{e9}.xyz",
        "b/cafe\u{301}.xyz",
    ]);
    assert_eq!(result.status.code(), Some(1));
    let report: serde_json::Value = serde_json::from_slice(&result.stdout).unwrap();
    assert_eq!(report[0]["status"], "converted");
    assert_eq!(report[1]["status"], "failed");
    let first = fs::read(dir.0.join("out/caf\u{e9}.eigenvista")).unwrap();
    assert_eq!(eigenvista_format::decode(&first).unwrap().atoms.len(), 3);
    assert_eq!(fs::read_dir(dir.0.join("out")).unwrap().count(), 1);
}

#[test]
#[cfg(target_os = "macos")]
fn force_batch_rejects_preexisting_unicode_aliases_before_writing() {
    let dir = Scratch::new();
    for name in ["a", "b", "out"] {
        fs::create_dir(dir.0.join(name)).unwrap();
    }
    dir.water("a/caf\u{e9}.xyz");
    dir.water("b/cafe\u{301}.xyz");
    let original = eigenvista_format::encode(&eigenvista_core::fixtures::hydrogen_pair()).unwrap();
    fs::write(dir.0.join("out/caf\u{e9}.eigenvista"), &original).unwrap();
    let result = dir.run(&[
        "--force",
        "--output-dir",
        "out",
        "a/caf\u{e9}.xyz",
        "b/cafe\u{301}.xyz",
    ]);
    assert_eq!(result.status.code(), Some(2));
    assert_eq!(
        fs::read(dir.0.join("out/caf\u{e9}.eigenvista")).unwrap(),
        original
    );
    assert_eq!(fs::read_dir(dir.0.join("out")).unwrap().count(), 1);
}

#[test]
fn mmcif_cli_retains_declared_coordination_and_source_records_through_native_roundtrip() {
    let dir = Scratch::new();
    let source = "data_COORDINATION\n#\nloop_\n\
_atom_site.group_PDB\n_atom_site.id\n_atom_site.type_symbol\n\
_atom_site.label_atom_id\n_atom_site.label_alt_id\n_atom_site.label_comp_id\n\
_atom_site.label_asym_id\n_atom_site.label_entity_id\n_atom_site.label_seq_id\n\
_atom_site.auth_atom_id\n_atom_site.auth_comp_id\n_atom_site.auth_asym_id\n\
_atom_site.auth_seq_id\n_atom_site.Cartn_x\n_atom_site.Cartn_y\n\
_atom_site.Cartn_z\n_atom_site.occupancy\n_atom_site.B_iso_or_equiv\n\
_atom_site.pdbx_PDB_model_num\n\
HETATM 7 Mg MG . LIG A 1 1 MG LIG X 5 0 0 0 1 0 1\n\
HETATM 23 O O1 . LIG A 1 1 O1 LIG X 5 3.1 0 0 1 0 1\n#\nloop_\n\
_struct_conn.id\n_struct_conn.conn_type_id\n\
_struct_conn.ptnr1_label_asym_id\n_struct_conn.ptnr1_label_comp_id\n\
_struct_conn.ptnr1_label_seq_id\n_struct_conn.ptnr1_label_atom_id\n\
_struct_conn.ptnr1_symmetry\n_struct_conn.ptnr2_label_asym_id\n\
_struct_conn.ptnr2_label_comp_id\n_struct_conn.ptnr2_label_seq_id\n\
_struct_conn.ptnr2_label_atom_id\n_struct_conn.ptnr2_symmetry\n\
_struct_conn.pdbx_value_order\n_struct_conn.pdbx_details\n\
mg_o metalc A LIG 1 MG 1_555 A LIG 1 O1 1_555 sing 'curated Mg--O'\n#\n";
    fs::write(dir.0.join("coordination.cif"), source).unwrap();
    let checked = dir.run(&["coordination.cif", "--check", "--json"]);
    assert!(
        checked.status.success(),
        "{}",
        String::from_utf8_lossy(&checked.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&checked.stdout).unwrap();
    assert_eq!(report[0]["status"], "validated");
    assert_eq!(report[0]["report"]["format"], "cif");
    assert_eq!(report[0]["atoms"], 2);
    assert!(!dir.0.join("coordination.eigenvista").exists());

    let converted = dir.run(&["coordination.cif", "--json"]);
    assert!(
        converted.status.success(),
        "{}",
        String::from_utf8_lossy(&converted.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&converted.stdout).unwrap();
    assert_eq!(report[0]["status"], "converted");
    assert_eq!(report[0]["report"]["requires_save"], true);
    let encoded = fs::read(dir.0.join("coordination.eigenvista")).unwrap();
    let document = eigenvista_format::decode(&encoded).unwrap();
    assert_eq!(document.bonds, [[0, 1]]);
    assert!(
        eigenvista_core::bonds::perceive(&document.atoms, &[])
            .unwrap()
            .bonds
            .is_empty()
    );
    let record = document
        .provenance
        .iter()
        .find_map(|line| line.strip_prefix("mmCIF struct_conn: "))
        .expect("declared connection provenance");
    let record: serde_json::Value = serde_json::from_str(record).unwrap();
    assert_eq!(record["status"], "retained");
    assert_eq!(record["bond"], serde_json::json!([0, 1]));
    assert_eq!(
        record["selected_atom_site_ids"],
        serde_json::json!(["7", "23"])
    );
    assert_eq!(record["source"]["id"], "mg_o");
    assert_eq!(record["source"]["conn_type_id"], "metalc");
    assert_eq!(record["source"]["pdbx_value_order"], "sing");
    assert_eq!(record["source"]["pdbx_details"], "curated Mg--O");

    let roundtrip = dir.run(&[
        "coordination.eigenvista",
        "--output",
        "roundtrip.eigenvista",
        "--json",
    ]);
    assert!(
        roundtrip.status.success(),
        "{}",
        String::from_utf8_lossy(&roundtrip.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&roundtrip.stdout).unwrap();
    assert_eq!(report[0]["report"]["format"], "eigenvista");
    assert_eq!(report[0]["report"]["requires_save"], false);
    assert_eq!(
        eigenvista_format::decode(&fs::read(dir.0.join("roundtrip.eigenvista")).unwrap()).unwrap(),
        document
    );

    fs::write(
        dir.0.join("broken.cif"),
        source.replace("mg_o metalc", "mg_o ?"),
    )
    .unwrap();
    let failed = dir.run(&["broken.cif", "--json"]);
    assert_eq!(failed.status.code(), Some(1));
    let report: serde_json::Value = serde_json::from_slice(&failed.stdout).unwrap();
    assert_eq!(report[0]["status"], "failed");
    assert!(
        report[0]["error"]
            .as_str()
            .unwrap()
            .contains("conn_type_id")
    );
    assert!(!dir.0.join("broken.eigenvista").exists());
    assert_eq!(
        fs::read(dir.0.join("coordination.eigenvista")).unwrap(),
        encoded
    );
    assert_eq!(
        fs::read(dir.0.join("coordination.cif")).unwrap(),
        source.as_bytes()
    );
}

#[test]
fn binarycif_cli_check_conversion_and_native_roundtrip_preserve_real_structure() {
    let dir = Scratch::new();
    let source = include_bytes!("../../../fixtures/bcif/1crn.bcif");
    fs::write(dir.0.join("crambin.bcif"), source).unwrap();
    let expected = eigenvista_import::import_bytes(source, "crambin.bcif")
        .unwrap()
        .document;
    let checked = dir.run(&["crambin.bcif", "--check", "--json"]);
    assert!(
        checked.status.success(),
        "{}",
        String::from_utf8_lossy(&checked.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&checked.stdout).unwrap();
    assert_eq!(report[0]["status"], "validated");
    assert_eq!(report[0]["report"]["format"], "bcif");
    assert_eq!(report[0]["atoms"], 327);
    assert_eq!(report[0]["orbitals"], 0);
    assert_eq!(report[0]["densities"], 0);
    assert!(!dir.0.join("crambin.eigenvista").exists());

    let converted = dir.run(&["crambin.bcif", "--json"]);
    assert!(
        converted.status.success(),
        "{}",
        String::from_utf8_lossy(&converted.stderr)
    );
    let report: serde_json::Value = serde_json::from_slice(&converted.stdout).unwrap();
    assert_eq!(report[0]["status"], "converted");
    assert_eq!(report[0]["report"]["requires_save"], true);
    let document =
        eigenvista_format::decode(&fs::read(dir.0.join("crambin.eigenvista")).unwrap()).unwrap();
    assert_eq!(document, expected);
    for pair in [[19, 281], [25, 228], [115, 187]] {
        assert!(document.bonds.contains(&pair));
    }
    assert_eq!(
        document
            .provenance
            .iter()
            .filter(|line| line.starts_with("mmCIF struct_conn: "))
            .count(),
        3
    );

    let reopened = dir.run(&[
        "crambin.eigenvista",
        "--output",
        "roundtrip.eigenvista",
        "--json",
    ]);
    assert!(reopened.status.success());
    let report: serde_json::Value = serde_json::from_slice(&reopened.stdout).unwrap();
    assert_eq!(report[0]["report"]["requires_save"], false);
    assert_eq!(
        eigenvista_format::decode(&fs::read(dir.0.join("roundtrip.eigenvista")).unwrap()).unwrap(),
        expected
    );

    fs::write(dir.0.join("download.payload"), source).unwrap();
    let detected = dir.run(&["download.payload", "--check", "--json"]);
    assert!(detected.status.success());
    let report: serde_json::Value = serde_json::from_slice(&detected.stdout).unwrap();
    assert_eq!(report[0]["report"]["format"], "bcif");
    assert_eq!(report[0]["atoms"], 327);
    assert_eq!(fs::read(dir.0.join("crambin.bcif")).unwrap(), source);
}

#[test]
fn malformed_binarycif_does_not_replace_an_existing_native_output() {
    let dir = Scratch::new();
    let source = include_bytes!("../../../fixtures/bcif/1crn.bcif");
    fs::write(dir.0.join("crambin.bcif"), source).unwrap();
    assert!(dir.run(&["crambin.bcif"]).status.success());
    let saved = fs::read(dir.0.join("crambin.eigenvista")).unwrap();
    let truncated = &source[..source.len() / 2];
    fs::write(dir.0.join("crambin.bcif"), truncated).unwrap();
    let failed = dir.run(&["crambin.bcif", "--force", "--json"]);
    assert_eq!(failed.status.code(), Some(1));
    let report: serde_json::Value = serde_json::from_slice(&failed.stdout).unwrap();
    assert_eq!(report[0]["status"], "failed");
    assert!(!report[0]["error"].as_str().unwrap().is_empty());
    assert_eq!(fs::read(dir.0.join("crambin.eigenvista")).unwrap(), saved);
    assert_eq!(fs::read(dir.0.join("crambin.bcif")).unwrap(), truncated);
}

#[test]
fn check_accepts_a_batch_above_the_former_256_file_limit() {
    let dir = Scratch::new();
    dir.water("water.xyz");
    let mut args = vec!["--check", "--json"];
    args.extend(std::iter::repeat_n("water.xyz", 257));
    let output = dir.run(&args);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let reports: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(reports.as_array().unwrap().len(), 257);
    assert!(
        reports
            .as_array()
            .unwrap()
            .iter()
            .all(|report| report["status"] == "validated")
    );
}
