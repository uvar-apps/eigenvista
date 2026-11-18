//! Calls actual writers; capability probes are recorded separately from saves.
#[path = "../../../../app/src-tauri/src/shader_parameters.rs"]
pub(super) mod actual_parameters;
#[path = "filesystem.rs"]
mod filesystem;
#[path = "visibility.rs"]
mod visibility;

use eigenvista_core::fixtures;
use eigenvista_format::{decode, encode, native};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::{fs, path::Path};

pub fn digest(bytes: &[u8]) -> String {
    format!("{:x}", Sha256::digest(bytes))
}

pub(super) fn outcome(result: Result<(), String>) -> Value {
    match result {
        Ok(()) => json!({"ok":true}),
        Err(error) => json!({"ok":false,"error":error}),
    }
}

fn io_outcome(result: std::io::Result<()>) -> Value {
    match result {
        Ok(()) => json!({"ok":true}),
        Err(error) => json!({"ok":false,"error":error.to_string(),
            "kind":format!("{:?}",error.kind()),"os_error":error.raw_os_error()}),
    }
}

fn metadata(path: &Path) -> Result<Value, String> {
    let value = fs::metadata(path).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        Ok(
            json!({"length":value.len(),"mode":format!("{:04o}",value.mode() & 0o7777),
            "device":value.dev(),"inode":value.ino(),"links":value.nlink()}),
        )
    }
    #[cfg(not(unix))]
    Ok(json!({"length":value.len(),"readonly":value.permissions().readonly()}))
}

fn snapshot(path: &Path) -> Result<Value, String> {
    if !path.exists() {
        return Ok(json!({"exists":false}));
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    Ok(
        json!({"exists":true,"sha256":digest(&bytes),"metadata":metadata(path)?,
        "native_decode_ok":decode(&bytes).is_ok()}),
    )
}

pub(super) fn stage_files(root: &Path) -> Result<Vec<String>, String> {
    let mut names: Vec<_> = fs::read_dir(root)
        .map_err(|e| e.to_string())?
        .map(|entry| entry.map(|e| e.file_name().to_string_lossy().into_owned()))
        .collect::<std::io::Result<_>>()
        .map_err(|e| e.to_string())?;
    names.retain(|name| name.starts_with(".eigenvista-"));
    names.sort();
    Ok(names)
}

#[cfg(unix)]
fn set_mode(path: &Path, mode: u32) -> Result<(), String> {
    use std::os::unix::fs::PermissionsExt;
    fs::set_permissions(path, fs::Permissions::from_mode(mode)).map_err(|e| e.to_string())
}

fn replacement(root: &Path, old: &[u8], new: &[u8]) -> Result<Value, String> {
    let destination = root.join("replacement.eigenvista");
    fs::write(&destination, old).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    let requested_mode = outcome(set_mode(&destination, 0o640));
    #[cfg(not(unix))]
    let requested_mode = json!({"not_run":"not Unix"});
    let before = snapshot(&destination)?;
    let result = native::save_atomic(&destination, new);
    let after = snapshot(&destination)?;
    let bytes = fs::read(&destination).map_err(|e| e.to_string())?;
    if result.is_err() && bytes != old {
        return Err("Failed native replacement changed original bytes".into());
    }
    if result.is_ok() && bytes != new {
        return Err("Successful native replacement published wrong bytes".into());
    }
    Ok(
        json!({"result":outcome(result),"requested_0640_mode":requested_mode,"before":before,"after":after}),
    )
}

fn parameters(root: &Path) -> Result<Value, String> {
    let destination = root.join("replacement.params");
    let old = "float opacity 1\n";
    let new = "float opacity 0.5\nvec3 lightDir 0 0 1\n";
    fs::write(&destination, old).map_err(|e| e.to_string())?;
    #[cfg(unix)]
    let requested_mode = outcome(set_mode(&destination, 0o640));
    #[cfg(not(unix))]
    let requested_mode = json!({"not_run":"not Unix"});
    let before = snapshot(&destination)?;
    let result = actual_parameters::save(&destination, new);
    let bytes = fs::read(&destination).map_err(|e| e.to_string())?;
    if bytes
        != if result.is_ok() {
            new.as_bytes()
        } else {
            old.as_bytes()
        }
    {
        return Err("Parameter replacement byte contract failed".into());
    }
    let after = snapshot(&destination)?;
    let large = "float opacity 0.5\n".repeat(8193);
    actual_parameters::save(&destination, &large)?;
    if fs::read(&destination).map_err(|e| e.to_string())? != large.as_bytes() {
        return Err(
            "Parameter export above the former byte ceiling published incomplete bytes".into(),
        );
    }
    let large_after = snapshot(&destination)?;
    Ok(
        json!({"result":outcome(result),"requested_0640_mode":requested_mode,"before":before,"after":after,
        "above_former_limit":{"result":{"ok":true},"after":large_after,"expected_sha256":digest(large.as_bytes())}}),
    )
}

fn failures(root: &Path, old: &[u8], new: &[u8]) -> Result<Value, String> {
    let existing = root.join("protected.eigenvista");
    fs::write(&existing, old).map_err(|e| e.to_string())?;
    let invalid = native::save_atomic(&existing, b"invalid native archive");
    let exists = native::save_atomic_new(&existing, new);
    let missing = native::save_atomic(&root.join("missing/file.eigenvista"), new);
    let directory = root.join("directory.eigenvista");
    fs::create_dir(&directory).map_err(|e| e.to_string())?;
    let publish_directory = native::save_atomic(&directory, new);
    let parameter_directory = root.join("directory.params");
    fs::create_dir(&parameter_directory).map_err(|e| e.to_string())?;
    let params_directory = actual_parameters::save(&parameter_directory, "float opacity 1\n");
    if [
        &invalid,
        &exists,
        &missing,
        &publish_directory,
        &params_directory,
    ]
    .iter()
    .any(|r| r.is_ok())
        || fs::read(&existing).map_err(|e| e.to_string())? != old
        || !directory.is_dir()
        || !parameter_directory.is_dir()
    {
        return Err(
            "A rejected validation/create/publish operation changed its destination".into(),
        );
    }
    Ok(
        json!({"invalid_native":outcome(invalid),"existing_no_replace":outcome(exists),
        "missing_parent":outcome(missing),"directory_destination":outcome(publish_directory),
        "parameter_directory_destination":outcome(params_directory)}),
    )
}

pub fn run(root: &Path) -> Result<Value, String> {
    let old = encode(&fixtures::hydrogen_pair())?;
    let mut second = fixtures::open_shell();
    second.id = "save-contract-second".into();
    let new = encode(&second)?;
    let capabilities = filesystem::observe(root)?;
    let fresh = root.join("fresh.eigenvista");
    let fresh_result = native::save_atomic_new(&fresh, &old);
    let fresh_ok = fresh_result.is_ok();
    let fresh_snapshot = snapshot(&fresh)?;
    if fresh_ok && fs::read(&fresh).map_err(|e| e.to_string())? != old {
        return Err("Fresh no-clobber save published wrong bytes".into());
    }
    let replace = replacement(root, &old, &new)?;
    let params = parameters(root)?;
    let failures = failures(root, &old, &new)?;
    let concurrent = if fresh_ok {
        visibility::observe(root, &old, &new)?
    } else {
        json!({"not_run":"actual save_atomic_new failed; no concurrent visibility/race claim"})
    };
    let temporary_files = stage_files(root)?;
    Ok(
        json!({"schema":"eigenvista-save-contract-probe-v1","source_baseline":"a3d71d077da28e38d3e031d531888fd08d98c279",
        "platform":{"os":std::env::consts::OS,"arch":std::env::consts::ARCH},
        "old_archive":{"bytes":old.len(),"sha256":digest(&old)},"new_archive":{"bytes":new.len(),"sha256":digest(&new)},
        "capabilities":capabilities,"native_new":{"result":outcome(fresh_result),"after":fresh_snapshot},
        "native_replace":replace,"parameter_replace":params,"rejected_operations":failures,
        "concurrent":concurrent,"remaining_staging_files":temporary_files,
        "scope":"Ordinary process/filesystem observations only, not power-loss, ACL, Windows or universal filesystem qualification"}),
    )
}
