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
    max_bytes: Option<usize>,
) -> Result<tauri::ipc::Response, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    tauri::async_runtime::spawn_blocking(move || {
        files
            .read_with_limit(
                std::path::Path::new(&path),
                max_bytes.unwrap_or(eigenvista_control::MAX_FILE_BYTES),
            )
            .map(tauri::ipc::Response::new)
    })
    .await
    .map_err(|_| RpcError::new(-32006, "io_error", "File read task failed"))?
}
#[tauri::command]
pub async fn control_save_document(
    state: tauri::State<'_, ControlState>,
    path: String,
    bytes: Vec<u8>,
    protected_paths: Vec<String>,
    overwrite: bool,
) -> Result<FileReceipt, RpcError> {
    let files = state.files.clone().ok_or_else(disabled)?;
    tauri::async_runtime::spawn_blocking(move || {
        files.save_document(
            std::path::Path::new(&path),
            &bytes,
            &protected_paths,
            overwrite,
        )
    })
    .await
    .map_err(|_| RpcError::new(-32006, "io_error", "Document save task failed"))?
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

#[cfg(test)]
mod tests {
    use super::*;
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
