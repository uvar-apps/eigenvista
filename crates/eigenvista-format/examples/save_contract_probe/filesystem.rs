//! Independent capability observations, separate from actual save outcomes.
use super::{digest, io_outcome};
use serde_json::{Value, json};
use std::{fs, fs::File, io::Write, path::Path};

pub fn observe(root: &Path) -> Result<Value, String> {
    let raw = root.join("capability-file");
    let mut file = File::create(&raw).map_err(|e| e.to_string())?;
    file.write_all(b"independent filesystem capability control\n")
        .map_err(|e| e.to_string())?;
    let file_sync = io_outcome(file.sync_all());
    drop(file);
    let hard_link = io_outcome(fs::hard_link(&raw, root.join("capability-hardlink")));
    let before = root.join("capability-rename-source");
    let after = root.join("capability-rename-target");
    fs::write(&before, b"complete new capability bytes").map_err(|e| e.to_string())?;
    fs::write(&after, b"old capability bytes").map_err(|e| e.to_string())?;
    let rename_result = fs::rename(&before, &after);
    let actual_rename_bytes = fs::read(&after).map_err(|e| e.to_string())?;
    let expected_rename_bytes = if rename_result.is_ok() {
        b"complete new capability bytes".as_slice()
    } else {
        b"old capability bytes".as_slice()
    };
    if actual_rename_bytes != expected_rename_bytes {
        return Err("Replace-rename capability returned an unexpected byte outcome".into());
    }
    let rename = io_outcome(rename_result);
    let directory = File::open(root).map_err(|e| e.to_string())?;
    let directory_sync_all = io_outcome(directory.sync_all());
    #[cfg(unix)]
    let directory_posix_fsync = {
        use std::os::fd::AsRawFd;
        unsafe extern "C" {
            fn fsync(fd: std::ffi::c_int) -> std::ffi::c_int;
        }
        // SAFETY: A live directory File owns this descriptor for the entire call.
        let result = unsafe { fsync(directory.as_raw_fd()) };
        io_outcome(if result == 0 {
            Ok(())
        } else {
            Err(std::io::Error::last_os_error())
        })
    };
    #[cfg(not(unix))]
    let directory_posix_fsync = json!({"not_run":"not Unix"});
    Ok(
        json!({"file_sync_all":file_sync,"hard_link":hard_link,"replace_rename":rename,
        "directory_sync_all":directory_sync_all,"directory_posix_fsync":directory_posix_fsync,
        "rename_target_sha256":digest(&actual_rename_bytes),"rename_expected_bytes_match":true}),
    )
}
