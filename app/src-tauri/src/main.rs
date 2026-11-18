#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;
use tauri_plugin_dialog::DialogExt;
mod control;
mod lifecycle;
mod native_transfer;
mod shader_parameters;

fn validate_save_destination(
    path: &std::path::Path,
    protected_paths: &[String],
) -> Result<(), String> {
    if !path.extension().is_some_and(|ext| {
        ext.eq_ignore_ascii_case("eigenvista") || ext.eq_ignore_ascii_case("molekel")
    }) {
        return Err("Save to a .eigenvista filename; original external-format files are not export destinations".into());
    }
    if let Ok(destination) = path.canonicalize() {
        for source in protected_paths {
            if std::path::Path::new(source).canonicalize().ok().as_ref() == Some(&destination) {
                return Err("Choose a new filename; the imported source cannot be replaced".into());
            }
        }
    }
    Ok(())
}

#[tauri::command]
async fn save_native(
    app: tauri::AppHandle,
    request: tauri::ipc::Request<'_>,
) -> Result<bool, String> {
    let native_transfer::Transfer {
        metadata:
            native_transfer::NativeSaveMetadata {
                name,
                protected_paths,
            },
        bytes,
    } = native_transfer::decode_body(request.body()).map_err(|error| error.to_string())?;
    tauri::async_runtime::spawn_blocking(move || {
        eigenvista_format::decode(&bytes)?;
        let Some(path) = app
            .dialog()
            .file()
            .add_filter("EigenVista document", &["eigenvista", "molekel"])
            .set_file_name(name)
            .blocking_save_file()
        else {
            return Ok(false);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        validate_save_destination(&path, &protected_paths)?;
        eigenvista_format::native::save_atomic(&path, &bytes)?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[cfg(test)]
mod tests {
    use super::validate_save_destination;
    use std::path::Path;

    #[test]
    fn native_save_requires_native_extension_and_protects_import_sources() {
        let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
        std::fs::create_dir_all(&root).unwrap();
        let path = root.join(format!(
            "native-destination-test-{}.eigenvista",
            std::process::id()
        ));
        std::fs::write(&path, "source bytes").unwrap();
        let protected = vec![path.to_string_lossy().into_owned()];
        assert!(validate_save_destination(&path, &protected).is_err());
        assert!(validate_save_destination(&path, &[]).is_ok());
        assert!(validate_save_destination(&path.with_extension("molden"), &[]).is_err());
        assert!(validate_save_destination(&path.with_extension("EIGENVISTA"), &[]).is_ok());
        assert!(validate_save_destination(&path.with_extension("MOLEKEL"), &[]).is_ok());
        #[cfg(unix)]
        {
            let alias = path.with_file_name(format!(
                "native-destination-alias-{}.eigenvista",
                std::process::id()
            ));
            std::os::unix::fs::symlink(&path, &alias).unwrap();
            assert!(validate_save_destination(&alias, &protected).is_err());
            std::fs::remove_file(alias).unwrap();
        }
        assert_eq!(std::fs::read(&path).unwrap(), b"source bytes");
        std::fs::remove_file(path).unwrap();
    }
}

#[tauri::command]
async fn save_shader_parameters(app: tauri::AppHandle, text: String) -> Result<bool, String> {
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = app
            .dialog()
            .file()
            .add_filter("Shader parameters", &["params"])
            .set_file_name("surface-shader.params")
            .blocking_save_file()
        else {
            return Ok(false);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        shader_parameters::save(&path, &text)?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

#[tauri::command]
fn scientific_core_version() -> &'static str {
    concat!("eigenvista-core ", env!("CARGO_PKG_VERSION"))
}

/// GUI export grants only the directory explicitly chosen in this dialog.
#[tauri::command]
async fn save_csv(
    app: tauri::AppHandle,
    text: String,
    name: String,
    protected_paths: Vec<String>,
) -> Result<bool, String> {
    if text.is_empty() {
        return Err("CSV must contain generated data".into());
    }
    tauri::async_runtime::spawn_blocking(move || {
        let Some(path) = app
            .dialog()
            .file()
            .add_filter("Scientific table", &["csv"])
            .set_file_name(name)
            .blocking_save_file()
        else {
            return Ok(false);
        };
        let path = path.into_path().map_err(|e| e.to_string())?;
        let parent = path.parent().ok_or("Missing export directory")?;
        let files = eigenvista_control::ScopedFiles::new(&[parent.to_path_buf()])
            .map_err(|e| e.to_string())?;
        files
            .write_csv(&path, &text, &protected_paths, false)
            .map_err(|e| e.to_string())?;
        Ok(true)
    })
    .await
    .map_err(|e| e.to_string())?
}

fn main() {
    tauri::Builder::default()
        .manage(lifecycle::Lifecycle::default())
        .on_page_load(|webview, payload| {
            if webview.label() == "main"
                && matches!(payload.event(), tauri::webview::PageLoadEvent::Started)
            {
                control::unready(webview.app_handle());
            }
        })
        .on_window_event(|window, event| {
            if window.label() == "main" && matches!(event, tauri::WindowEvent::Destroyed) {
                control::unready(window.app_handle());
            }
        })
        .setup(|app| {
            lifecycle::install(app.handle())?;
            control::install(app.handle()).map_err(Into::into)
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            scientific_core_version,
            save_native,
            save_shader_parameters,
            save_csv,
            control::control_connection,
            control::control_ready,
            control::control_respond,
            control::control_read_file,
            control::control_save_document,
            control::control_write_image,
            control::control_write_csv,
            lifecycle::pending_native_exit,
            lifecycle::resolve_native_exit
        ])
        .build(tauri::generate_context!())
        .expect("EigenVista desktop failed to start")
        .run(|app, event| {
            if matches!(event, tauri::RunEvent::Exit) {
                control::shutdown(app);
            }
            lifecycle::handle_event(app, event);
        });
}
