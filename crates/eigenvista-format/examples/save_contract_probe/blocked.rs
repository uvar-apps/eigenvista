//! Existing owned-fixture attempts on a full or read-only research volume.
use crate::probes::{actual_parameters, digest, outcome, stage_files};
use eigenvista_core::fixtures;
use eigenvista_format::{encode, native};
use serde_json::{Value, json};
use std::{fs, path::Path};

pub fn run(root: &Path) -> Result<Value, String> {
    if fs::read(root.join("research-owned.marker")).map_err(|e| e.to_string())?
        != b"eigenvista-save-contract-owned-fixture-v1\n"
    {
        return Err("Blocked probe needs its explicit owned-fixture marker".into());
    }
    let native_path = root.join("blocked.eigenvista");
    let params_path = root.join("blocked.params");
    let old = encode(&fixtures::hydrogen_pair())?;
    let new = encode(&fixtures::open_shell())?;
    let parameter_text = b"float opacity 1\n";
    if fs::read(&native_path).map_err(|e| e.to_string())? != old
        || fs::read(&params_path).map_err(|e| e.to_string())? != parameter_text
    {
        return Err("Blocked fixture contents do not match known originals".into());
    }
    let replace = native::save_atomic(&native_path, &new);
    let params = actual_parameters::save(&params_path, "float opacity 0.5\n");
    let fresh_path = root.join("blocked-new.eigenvista");
    let new_save = native::save_atomic_new(&fresh_path, &new);
    let native_after = fs::read(&native_path).map_err(|e| e.to_string())?;
    let params_after = fs::read(&params_path).map_err(|e| e.to_string())?;
    if replace.is_ok()
        || params.is_ok()
        || new_save.is_ok()
        || native_after != old
        || params_after != parameter_text
        || fresh_path.exists()
    {
        return Err("Blocked write unexpectedly succeeded or changed original bytes".into());
    }
    Ok(json!({"schema":"eigenvista-save-blocked-probe-v1",
        "native_replace":outcome(replace),"parameter_replace":outcome(params),
        "native_new":outcome(new_save),"native_original_preserved":true,
        "parameter_original_preserved":true,"new_destination_exists":false,
        "native_sha256":digest(&native_after),"parameter_sha256":digest(&params_after),
        "remaining_staging_files":stage_files(root)?,
        "phase_attribution":"Writer Result<String> has no phase tag; independent controls identify the blocked capability, not production syscall tracing"}))
}
