//! Native attachment to the single app-owned frontend controller. Disabled by default.
use eigenvista_control::{Broker, FileReceipt, RpcError, ScopedFiles};
use serde_json::{Value, json};
use std::{
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{Emitter, Manager};

pub struct ControlState {
    broker: Mutex<Option<Broker>>,
    files: Option<Arc<ScopedFiles>>,
}

fn options(
    args: impl Iterator<Item = std::ffi::OsString>,
) -> Result<Option<(PathBuf, Vec<PathBuf>)>, String> {
    let mut args = args;
    let mut file = None;
    let mut roots = Vec::new();
    while let Some(arg) = args.next() {
        if arg == "--control-file" {
            if file.is_some() {
                return Err("--control-file may be provided only once".into());
            }
            file = Some(PathBuf::from(
                args.next().ok_or("--control-file needs a filename")?,
            ));
        } else if arg == "--control-root" {
            roots.push(PathBuf::from(
                args.next().ok_or("--control-root needs a directory")?,
            ));
        } else if arg.to_string_lossy().starts_with("--control-") {
            return Err("Unknown control startup flag".into());
        }
    }
    match (file, roots.is_empty()) {
        (None, true) => Ok(None),
        (Some(file), false) => Ok(Some((file, roots))),
        _ => Err(
            "Control mode requires --control-file FILE and one or more --control-root DIR grants"
                .into(),
        ),
    }
}

pub fn install(app: &tauri::AppHandle) -> Result<(), String> {
    let configured = options(std::env::args_os().skip(1))?;
    let state = if let Some((file, roots)) = configured {
        let files = Arc::new(ScopedFiles::new(&roots).map_err(|e| e.to_string())?);
        let emitter = app.clone();
        let broker = Broker::start(&file, move |request| {
            emitter
                .emit_to("main", "eigenvista-control-request", request)
                .map_err(|_| {
                    RpcError::new(
                        -32006,
                        "io_error",
                        "Could not reach the application controller",
                    )
                })
        })
        .map_err(|e| e.to_string())?;
        ControlState {
            broker: Mutex::new(Some(broker)),
            files: Some(files),
        }
    } else {
        ControlState {
            broker: Mutex::new(None),
            files: None,
        }
    };
    app.manage(state);
    Ok(())
}

pub fn shutdown(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ControlState>()
        && let Ok(mut broker) = state.broker.lock()
    {
        broker.take();
    }
}
/// A reload/closed frontend cannot complete requests from its former controller.
pub fn unready(app: &tauri::AppHandle) {
    if let Some(state) = app.try_state::<ControlState>()
        && let Ok(broker) = state.broker.lock()
        && let Some(broker) = broker.as_ref()
    {
        broker.unready();
    }
}
fn disabled() -> RpcError {
    RpcError::new(
        -32010,
        "disabled",
        "Start EigenVista with explicit control-file and root grants",
    )
}

#[tauri::command]
pub fn control_connection(state: tauri::State<'_, ControlState>) -> Result<Value, RpcError> {
    let broker = state
        .broker
        .lock()
        .map_err(|_| RpcError::new(-32006, "io_error", "Control state unavailable"))?;
    Ok(match broker.as_ref() {
        Some(broker) => json!({"enabled":true,"instanceId":broker.instance_id()}),
        None => json!({"enabled":false,"instanceId":""}),
    })
}
#[tauri::command]
pub fn control_ready(state: tauri::State<'_, ControlState>) -> Result<(), RpcError> {
    let broker = state
        .broker
        .lock()
        .map_err(|_| RpcError::new(-32006, "io_error", "Control state unavailable"))?;
    broker.as_ref().ok_or_else(disabled)?.ready();
    Ok(())
}
#[tauri::command]
pub fn control_respond(
    state: tauri::State<'_, ControlState>,
    request_id: u64,
    response: Value,
) -> Result<(), RpcError> {
    state
        .broker
        .lock()
        .map_err(|_| RpcError::new(-32006, "io_error", "Control state unavailable"))?
        .as_ref()
        .ok_or_else(disabled)?
        .respond(request_id, response)
}
#[tauri::command]
pub async fn control_read_file(
    state: tauri::State<'_, ControlState>,
    path: String,
) -> Result<tauri::ipc::Response, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    tauri::async_runtime::spawn_blocking(move || {
        files
            .read(std::path::Path::new(&path))
            .map(tauri::ipc::Response::new)
    })
    .await
    .map_err(|_| RpcError::new(-32006, "io_error", "File read task failed"))?
}
#[tauri::command]
pub async fn control_save_document(
    state: tauri::State<'_, ControlState>,
    request: tauri::ipc::Request<'_>,
) -> Result<FileReceipt, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    let transfer =
        crate::native_transfer::decode_body::<crate::native_transfer::ControlSaveMetadata>(
            request.body(),
        )
        .map_err(transfer_error)?;
    tauri::async_runtime::spawn_blocking(move || save_transferred_document(&files, transfer))
        .await
        .map_err(|_| RpcError::new(-32006, "io_error", "Document save task failed"))?
}

fn transfer_error(error: crate::native_transfer::TransferError) -> RpcError {
    match error {
        crate::native_transfer::TransferError::Invalid(message) => {
            RpcError::new(-32602, "invalid_params", message)
        }
        crate::native_transfer::TransferError::Allocation(message) => {
            RpcError::new(-32005, "allocation_failed", message)
        }
    }
}

fn save_transferred_document(
    files: &ScopedFiles,
    transfer: crate::native_transfer::Transfer<crate::native_transfer::ControlSaveMetadata>,
) -> Result<FileReceipt, RpcError> {
    let crate::native_transfer::Transfer { metadata, bytes } = transfer;
    files.save_document(
        std::path::Path::new(&metadata.path),
        &bytes,
        &metadata.protected_paths,
        metadata.overwrite,
    )
}
#[tauri::command]
pub async fn control_write_image(
    state: tauri::State<'_, ControlState>,
    path: String,
    data_url: String,
    overwrite: bool,
) -> Result<FileReceipt, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    tauri::async_runtime::spawn_blocking(move || {
        files.write_image(std::path::Path::new(&path), &data_url, overwrite)
    })
    .await
    .map_err(|_| RpcError::new(-32006, "io_error", "Image export task failed"))?
}

/// Write only generated CSV tables through the authenticated scoped file adapter.
#[tauri::command]
pub async fn control_write_csv(
    state: tauri::State<'_, ControlState>,
    path: String,
    text: String,
    protected_paths: Vec<String>,
    overwrite: bool,
) -> Result<FileReceipt, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    tauri::async_runtime::spawn_blocking(move || {
        files.write_csv(
            std::path::Path::new(&path),
            &text,
            &protected_paths,
            overwrite,
        )
    })
    .await
    .map_err(|_| RpcError::new(-32006, "io_error", "CSV export task failed"))?
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::native_transfer::{ControlSaveMetadata, Transfer, decode_body};

    fn raw_transfer(
        path: &std::path::Path,
        protected: &[String],
        payload: &[u8],
    ) -> Transfer<ControlSaveMetadata> {
        let metadata =
            serde_json::to_vec(&json!({"path":path,"protectedPaths":protected,"overwrite":false}))
                .unwrap();
        let mut frame = b"EVT1".to_vec();
        frame.extend_from_slice(&(metadata.len() as u64).to_le_bytes());
        frame.extend_from_slice(&metadata);
        frame.extend_from_slice(payload);
        decode_body(&tauri::ipc::InvokeBody::Raw(frame)).unwrap()
    }

    #[test]
    fn raw_save_command_writer_keeps_scopes_source_protection_and_atomic_no_clobber() {
        let nonce = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("../../tmp")
            .join(format!("raw-native-save-{}-{nonce}", std::process::id()));
        std::fs::create_dir_all(&root).unwrap();
        let root = root.canonicalize().unwrap();
        let files = ScopedFiles::new(std::slice::from_ref(&root)).unwrap();
        let original = eigenvista_core::fixtures::hydrogen_pair();
        let bytes = eigenvista_format::encode(&original).unwrap();
        let destination = root.join("结果.eigenvista");
        let receipt =
            save_transferred_document(&files, raw_transfer(&destination, &[], &bytes)).unwrap();
        assert_eq!(receipt.bytes, bytes.len());
        assert_eq!(std::fs::read(&destination).unwrap(), bytes);
        assert_eq!(
            eigenvista_format::decode(&std::fs::read(&destination).unwrap()).unwrap(),
            original
        );
        assert_eq!(
            save_transferred_document(&files, raw_transfer(&destination, &[], &bytes))
                .unwrap_err()
                .data
                .unwrap()["kind"],
            "destination_exists"
        );
        let source = root.join("source.eigenvista");
        std::fs::write(&source, &bytes).unwrap();
        let protected = vec![source.to_string_lossy().into_owned()];
        assert_eq!(
            save_transferred_document(&files, raw_transfer(&source, &protected, &bytes))
                .unwrap_err()
                .data
                .unwrap()["kind"],
            "source_protected"
        );
        let invalid = root.join("invalid.eigenvista");
        assert!(
            save_transferred_document(&files, raw_transfer(&invalid, &[], b"not a native archive"))
                .is_err()
        );
        assert!(!invalid.exists());
        assert!(
            save_transferred_document(
                &files,
                raw_transfer(
                    &root.parent().unwrap().join("outside.eigenvista"),
                    &[],
                    &bytes
                )
            )
            .is_err()
        );
        assert_eq!(std::fs::read(source).unwrap(), bytes);
        assert_eq!(std::fs::read_dir(&root).unwrap().count(), 2);
        std::fs::remove_dir_all(root).unwrap();
    }
    fn args(values: &[&str]) -> impl Iterator<Item = std::ffi::OsString> {
        values
            .iter()
            .map(std::ffi::OsString::from)
            .collect::<Vec<_>>()
            .into_iter()
    }
    #[test]
    fn normal_startup_is_disabled_and_partial_flags_fail() {
        assert!(options(args(&[])).unwrap().is_none());
        assert!(options(args(&["--control-file", "/a"])).is_err());
        assert!(options(args(&["--control-root", "/a"])).is_err());
        let (_, roots) = options(args(&[
            "--control-file",
            "/a",
            "--control-root",
            "/b",
            "--control-root",
            "/c",
        ]))
        .unwrap()
        .unwrap();
        assert_eq!(roots, [PathBuf::from("/b"), PathBuf::from("/c")]);
        assert!(options(args(&["--control-typo"])).is_err());
    }
}
