//! Opt-in actual-writer qualification on an owned directory beneath repository tmp.
//! Filesystem setup/detach is deliberately separate from these publication checks.
use base64::Engine;
use eigenvista_control::ScopedFiles;
use eigenvista_core::fixtures;
use serde_json::{Value, json};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Arc,
};

#[path = "publication_probe/blocked.rs"]
mod blocked;
#[path = "publication_probe/races.rs"]
mod races;

const MARKER: &[u8] = b"EigenVista issue 100 publication fixture\n";

fn check(condition: bool, message: &str) -> Result<(), String> {
    condition.then_some(()).ok_or_else(|| message.to_owned())
}

fn bytes(path: &Path) -> Result<Vec<u8>, String> {
    fs::read(path).map_err(|error| error.to_string())
}

fn clean_staging(root: &Path) -> Result<(), String> {
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        check(
            !entry
                .file_name()
                .to_string_lossy()
                .starts_with(".eigenvista-control-save-"),
            "Owned staging file remains after publication or refusal",
        )?;
    }
    Ok(())
}

fn run(root: &Path) -> Result<Value, String> {
    fs::write(root.join("publication-fixture.marker"), MARKER).map_err(|e| e.to_string())?;
    let files = Arc::new(ScopedFiles::new(&[root.to_owned()]).map_err(|e| e.message)?);
    let first = eigenvista_format::encode(&fixtures::hydrogen_pair())?;
    let second = eigenvista_format::encode(&fixtures::open_shell())?;
    let default = root.join("default.eigenvista");
    let default_result = files.save_document(&default, &first, &[], false);
    match &default_result {
        Ok(_) => check(bytes(&default)? == first, "Default saved wrong bytes")?,
        Err(_) => check(!default.exists(), "Default failure left a destination")?,
    }
    clean_staging(root)?;
    let native = root.join("explicit.eigenvista");
    files
        .save_document(&native, &first, &[], true)
        .map_err(|e| e.message)?;
    check(
        bytes(&native)? == first,
        "New explicit native output differs",
    )?;
    files
        .save_document(&native, &second, &[], true)
        .map_err(|e| e.message)?;
    check(
        bytes(&native)? == second,
        "Explicit replacement native output differs",
    )?;
    check(
        files
            .save_document(&native, b"invalid native", &[], true)
            .is_err(),
        "Invalid native accepted",
    )?;
    check(
        bytes(&native)? == second,
        "Invalid native altered prior output",
    )?;
    let refusal = files
        .save_document(&native, &first, &[], false)
        .unwrap_err();
    check(
        refusal
            .data
            .as_ref()
            .is_some_and(|data| data["kind"] == "destination_exists"),
        "Default did not refuse existing output",
    )?;
    check(
        bytes(&native)? == second,
        "Default refusal altered prior output",
    )?;
    let csv = root.join("explicit.csv");
    for value in ["value\n1\n", "value\n2\n"] {
        files
            .write_csv(&csv, value, &[], true)
            .map_err(|e| e.message)?;
        check(bytes(&csv)? == value.as_bytes(), "CSV output differs")?;
    }
    check(
        files.write_csv(&csv, "\0", &[], true).is_err(),
        "Invalid CSV accepted",
    )?;
    check(
        bytes(&csv)? == b"value\n2\n",
        "Invalid CSV altered prior output",
    )?;
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    let image = bytes(&icon)?;
    let url = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&image)
    );
    let png = root.join("explicit.png");
    files.write_image(&png, &url, true).map_err(|e| e.message)?;
    fs::write(&png, b"previous complete output").map_err(|e| e.to_string())?;
    files.write_image(&png, &url, true).map_err(|e| e.message)?;
    check(bytes(&png)? == image, "PNG output differs")?;
    check(
        files
            .write_image(&png, "data:image/png;base64,YmFk", true)
            .is_err(),
        "Invalid PNG accepted",
    )?;
    check(bytes(&png)? == image, "Invalid PNG altered prior output")?;
    let source = root.join("protected.eigenvista");
    fs::write(&source, &first).map_err(|e| e.to_string())?;
    files.read(&source).map_err(|e| e.message)?;
    for replace in [false, true] {
        let refusal = files
            .save_document(&source, &second, &[], replace)
            .unwrap_err();
        check(
            refusal
                .data
                .as_ref()
                .is_some_and(|data| data["kind"] == "source_protected"),
            "Loaded source was not protected",
        )?;
        check(bytes(&source)? == first, "Source bytes changed")?;
    }
    let blocked = root.join("blocked.eigenvista");
    fs::create_dir(&blocked).map_err(|e| e.to_string())?;
    check(
        files.save_document(&blocked, &second, &[], true).is_err(),
        "Directory was replaced",
    )?;
    check(blocked.is_dir(), "Rejected directory was changed")?;
    let exclusive_race = races::run(root, files.clone(), false)?;
    let replacement_race = races::run(root, files, true)?;
    clean_staging(root)?;
    Ok(json!({
        "root":root,"all_explicit_native_csv_png_byte_checks":true,
        "invalid_payloads_preserve_prior_bytes":true,"source_protection":true,
        "default_new":match default_result {
            Ok(receipt)=>json!({"ok":true,"bytes":receipt.bytes}),
            Err(error)=>json!({"ok":false,"error":error})
        },
        "default_existing_refused":true,"directory_refused":true,
        "exclusive_race":exclusive_race,"replacement_race":replacement_race,
        "owned_staging_clean":true
    }))
}

fn main() -> Result<(), String> {
    let requested = std::env::args_os().skip(1).collect::<Vec<_>>();
    let (existing, requested) = match requested.as_slice() {
        [requested] => (false, requested),
        [flag, requested] if flag == "--blocked" => (true, requested),
        _ => return Err(
            "usage: publication_probe NEW_DIRECTORY_UNDER_REPOSITORY_TMP | --blocked OWNED_FIXTURE"
                .into(),
        ),
    };
    let requested = PathBuf::from(requested);
    let temporary = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tmp")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let parent = requested
        .parent()
        .ok_or("Missing output parent")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    check(
        parent.starts_with(&temporary),
        "Output must be under repository tmp",
    )?;
    let root = parent.join(requested.file_name().ok_or("Missing output name")?);
    let result = if existing {
        let root = root.canonicalize().map_err(|e| e.to_string())?;
        check(
            root.starts_with(&temporary),
            "Fixture must remain under repository tmp",
        )?;
        blocked::run(&root)?
    } else {
        fs::create_dir(&root).map_err(|e| e.to_string())?;
        run(&root)?
    };
    println!(
        "{}",
        serde_json::to_string_pretty(&result).map_err(|e| e.to_string())?
    );
    Ok(())
}
