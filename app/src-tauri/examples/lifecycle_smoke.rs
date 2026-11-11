//! Owned-process native lifecycle probe; no accessibility or production test hooks.
//! Build the frontend first, then run with `--features tauri/custom-protocol`.
//! Scenarios: close, exit, terminate, clean-close. Logs stay in repository tmp/.

#[path = "../src/lifecycle.rs"]
mod lifecycle;

use std::{
    fs::{File, OpenOptions},
    io::Write,
    sync::{
        Mutex,
        atomic::{AtomicBool, Ordering},
    },
};
use tauri::Manager;

struct Probe {
    log: Mutex<File>,
    expecting_exit: AtomicBool,
}

impl Probe {
    fn record(&self, step: &str, ok: bool, detail: &str) -> Result<(), String> {
        let mut log = self.log.lock().map_err(|e| e.to_string())?;
        writeln!(
            log,
            "{}",
            serde_json::json!({"step":step,"ok":ok,"detail":detail})
        )
        .map_err(|e| e.to_string())?;
        log.sync_all().map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn smoke_report(
    app: tauri::AppHandle,
    step: String,
    ok: bool,
    detail: Option<String>,
) -> Result<(), String> {
    let probe = app.state::<Probe>();
    probe.record(&step, ok, detail.as_deref().unwrap_or(""))?;
    if !ok {
        // This example owns only a generated test document in its own process.
        std::process::exit(3);
    }
    if step == "expect_exit" {
        probe.expecting_exit.store(true, Ordering::SeqCst);
    }
    Ok(())
}

#[tauri::command]
fn smoke_request(app: tauri::AppHandle, kind: String) -> Result<(), String> {
    app.state::<Probe>().record("native_request", true, &kind)?;
    match kind.as_str() {
        "close" => app
            .get_webview_window("main")
            .ok_or("Missing probe window")?
            .close()
            .map_err(|e| e.to_string()),
        "exit" => {
            app.exit(7);
            Ok(())
        }
        "terminate" => app
            .run_on_main_thread(terminate_own_application)
            .map_err(|e| e.to_string()),
        _ => Err("Unknown native request kind".into()),
    }
}

#[cfg(target_os = "macos")]
fn terminate_own_application() {
    let main = objc2::MainThreadMarker::new().expect("Probe termination must use the main thread");
    // The native terminate: selector used by default Quit/Cmd+Q/Dock actions,
    // applied only to this test process through the typed AppKit API.
    objc2_app_kit::NSApplication::sharedApplication(main).terminate(None);
}

#[cfg(not(target_os = "macos"))]
fn terminate_own_application() {
    eprintln!("The terminate scenario requires macOS");
    std::process::exit(2);
}

fn main() {
    let scenario = std::env::args().nth(1).unwrap_or_else(|| "close".into());
    if !["close", "exit", "terminate", "clean-close"].contains(&scenario.as_str()) {
        eprintln!("Expected close, exit, terminate or clean-close");
        std::process::exit(2);
    }
    let directory = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../tmp");
    std::fs::create_dir_all(&directory).unwrap();
    let path = directory.join(format!(
        "lifecycle-smoke-{}-{scenario}.jsonl",
        std::process::id()
    ));
    let probe = Probe {
        log: Mutex::new(
            OpenOptions::new()
                .write(true)
                .create_new(true)
                .open(&path)
                .unwrap(),
        ),
        expecting_exit: AtomicBool::new(false),
    };
    probe.record("scenario", true, &scenario).unwrap();
    println!("Native lifecycle probe log: {}", path.display());
    let script = format!(
        "globalThis.__eigenvistaSmokeScenario = {};\n{}",
        serde_json::to_string(&scenario).unwrap(),
        include_str!("lifecycle_smoke.js"),
    );
    let mut context = tauri::generate_context!();
    context.config_mut().identifier = "org.uvar-apps.eigenvista.lifecycle-smoke".into();
    context.config_mut().app.windows[0].title = "EigenVista lifecycle smoke (owned test)".into();
    tauri::Builder::default()
        .manage(lifecycle::Lifecycle::default())
        .manage(probe)
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            lifecycle::install(app.handle()).map_err(std::io::Error::other)?;
            let app = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_secs(45));
                let _ = app.state::<Probe>().record(
                    "timeout",
                    false,
                    "probe did not exit within 45 seconds",
                );
                std::process::exit(4);
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            smoke_report,
            smoke_request,
            lifecycle::pending_native_exit,
            lifecycle::resolve_native_exit
        ])
        .on_page_load(move |view, payload| {
            if payload.event() == tauri::webview::PageLoadEvent::Finished {
                view.eval(&script).unwrap();
            }
        })
        .build(context)
        .expect("Could not build native lifecycle probe")
        .run(|app, event| {
            if let tauri::RunEvent::ExitRequested { code, .. } = &event {
                app.state::<Probe>()
                    .record("native_exit_requested", true, &format!("{code:?}"))
                    .unwrap();
            }
            if matches!(
                event,
                tauri::RunEvent::WindowEvent {
                    event: tauri::WindowEvent::CloseRequested { .. },
                    ..
                }
            ) {
                app.state::<Probe>()
                    .record("native_close_requested", true, "main")
                    .unwrap();
            }
            if matches!(event, tauri::RunEvent::Exit) {
                let probe = app.state::<Probe>();
                let expected = probe.expecting_exit.load(Ordering::SeqCst);
                probe
                    .record("native_exit_observed", expected, "owned probe")
                    .unwrap();
                if !expected {
                    std::process::exit(3);
                }
            }
            lifecycle::handle_event(app, event);
        });
}
