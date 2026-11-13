//! Opt-in filesystem observations for #41; production save paths are unchanged.
#[path = "save_contract_probe/blocked.rs"]
mod blocked;
#[path = "save_contract_probe/probes.rs"]
mod probes;

use std::path::Path;

fn main() -> Result<(), String> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    let [operation, directory] = args.as_slice() else {
        return Err(
            "usage: save_contract_probe probe NEW_REPO_TMP_DIRECTORY | blocked OWNED_DIRECTORY"
                .into(),
        );
    };
    if operation != "probe" && operation != "blocked" {
        return Err("expected probe or blocked".into());
    }
    let temporary = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("../../tmp")
        .canonicalize()
        .map_err(|e| e.to_string())?;
    let requested = Path::new(directory);
    let parent = requested
        .parent()
        .ok_or("Output needs an existing parent")?
        .canonicalize()
        .map_err(|e| e.to_string())?;
    if !parent.starts_with(&temporary) {
        return Err("Research artifacts must be inside repository tmp".into());
    }
    let output = parent.join(requested.file_name().ok_or("Missing directory name")?);
    let report = if operation == "probe" {
        std::fs::create_dir(&output).map_err(|e| e.to_string())?;
        probes::run(&output)?
    } else {
        let output = output.canonicalize().map_err(|e| e.to_string())?;
        if !output.starts_with(&temporary) {
            return Err("Research artifacts must remain inside repository tmp".into());
        }
        blocked::run(&output)?
    };
    println!(
        "{}",
        serde_json::to_string_pretty(&report).map_err(|e| e.to_string())?
    );
    Ok(())
}
