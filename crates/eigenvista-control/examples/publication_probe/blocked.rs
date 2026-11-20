use super::{MARKER, bytes, check, clean_staging};
use base64::Engine;
use eigenvista_control::ScopedFiles;
use eigenvista_core::fixtures;
use serde_json::{Value, json};
use std::path::Path;

/// Exercise real write failures only on a positively identified fixture prepared by run().
pub(super) fn run(root: &Path) -> Result<Value, String> {
    check(
        bytes(&root.join("publication-fixture.marker"))? == MARKER,
        "Missing owned publication fixture marker",
    )?;
    let native = root.join("explicit.eigenvista");
    let csv = root.join("explicit.csv");
    let png = root.join("explicit.png");
    let native_before = bytes(&native)?;
    let csv_before = bytes(&csv)?;
    let png_before = bytes(&png)?;
    check(
        eigenvista_format::decode(&native_before)? == fixtures::open_shell(),
        "Native fixture bytes differ from the prepared document",
    )?;
    check(csv_before == b"value\n2\n", "CSV fixture differs")?;
    let icon = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src-tauri/icons/icon.png");
    check(png_before == bytes(&icon)?, "PNG fixture differs")?;
    let files = ScopedFiles::new(&[root.to_owned()]).map_err(|e| e.message)?;
    let new = eigenvista_format::encode(&fixtures::hydrogen_pair())?;
    let missing = root.join("blocked-new.eigenvista");
    check(
        !missing.exists(),
        "Blocked-write destination must initially be absent",
    )?;
    let image = format!(
        "data:image/png;base64,{}",
        base64::engine::general_purpose::STANDARD.encode(&png_before)
    );
    let attempts = [
        ("native_new", files.save_document(&missing, &new, &[], true)),
        (
            "native_replacement",
            files.save_document(&native, &new, &[], true),
        ),
        (
            "csv_replacement",
            files.write_csv(&csv, "value\n3\n", &[], true),
        ),
        ("png_replacement", files.write_image(&png, &image, true)),
    ];
    check(
        attempts.iter().all(|(_, result)| result.is_err()),
        "A blocked write unexpectedly succeeded",
    )?;
    check(!missing.exists(), "A failed new write left a destination")?;
    check(
        bytes(&native)? == native_before,
        "Failed native write changed prior bytes",
    )?;
    check(
        bytes(&csv)? == csv_before,
        "Failed CSV write changed prior bytes",
    )?;
    check(
        bytes(&png)? == png_before,
        "Failed PNG write changed prior bytes",
    )?;
    clean_staging(root)?;
    Ok(json!({
        "root":root,"all_four_writes_failed":true,"prior_bytes_unchanged":true,
        "new_destination_absent":true,"owned_staging_clean":true,
        "outcomes":attempts.into_iter().map(|(operation,result)| json!({"operation":operation,"error":result.unwrap_err()})).collect::<Vec<_>>()
    }))
}
