use std::sync::Mutex;
use tauri::{Emitter, Manager, RunEvent, State, WindowEvent};

#[cfg(target_os = "macos")]
#[path = "lifecycle/macos.rs"]
mod macos;
#[cfg(target_os = "macos")]
pub use macos::install;

#[cfg(not(target_os = "macos"))]
pub fn install(_app: &tauri::AppHandle) -> Result<(), String> {
    Ok(())
}

#[derive(Default)]
pub struct Lifecycle {
    guard: Mutex<ExitGuard>,
}

#[derive(Default)]
struct ExitGuard {
    next: u32,
    pending: Option<u32>,
    approved: Option<u32>,
}

impl ExitGuard {
    fn request(&mut self) -> Result<(u32, bool), String> {
        if let Some(request) = self.pending {
            return Ok((request, false));
        }
        self.next = self
            .next
            .checked_add(1)
            .ok_or("Native exit request limit reached")?;
        self.pending = Some(self.next);
        Ok((self.next, true))
    }

    fn resolve(&mut self, request: u32, discard: bool) -> Result<bool, String> {
        if self.pending != Some(request) || self.approved.is_some() {
            return Err("Native exit request is no longer awaiting confirmation".into());
        }
        if discard {
            self.approved = Some(request);
        } else {
            self.pending = None;
        }
        Ok(discard)
    }

    fn consume_exit(&mut self, code: Option<i32>) -> bool {
        if code != Some(0) || self.approved.is_none() || self.approved != self.pending {
            return false;
        }
        self.pending = None;
        self.approved = None;
        true
    }
}

#[tauri::command]
pub fn pending_native_exit(state: State<'_, Lifecycle>) -> Result<Option<u32>, String> {
    state
        .guard
        .lock()
        .map(|guard| guard.pending)
        .map_err(|_| "Native exit protection is unavailable".into())
}

#[tauri::command]
pub fn resolve_native_exit(
    app: tauri::AppHandle,
    state: State<'_, Lifecycle>,
    request: u32,
    discard: bool,
) -> Result<(), String> {
    let exit = state
        .guard
        .lock()
        .map_err(|_| "Native exit protection is unavailable")?
        .resolve(request, discard)?;
    // The permit is consumed by the resulting ExitRequested event. Do not hold
    // the state lock while asking the event loop to exit.
    if exit {
        app.exit(0);
    }
    Ok(())
}

fn request_exit(app: &tauri::AppHandle) {
    let state = app.state::<Lifecycle>();
    let requested = state
        .guard
        .lock()
        .map_err(|_| "Native exit protection is unavailable".to_owned())
        .and_then(|mut guard| guard.request());
    match requested {
        Ok((request, true)) => {
            // Keep the pending request if delivery fails. The listener's
            // pending-command handshake also recovers initialization races.
            if let Err(error) = app.emit_to("main", "eigenvista-exit-requested", request) {
                eprintln!("Could not deliver native exit confirmation: {error}");
            }
        }
        Ok((_, false)) => {}
        Err(error) => eprintln!("Could not request native exit confirmation: {error}"),
    }
}

pub fn handle_event(app: &tauri::AppHandle, event: RunEvent) {
    match event {
        RunEvent::WindowEvent {
            label,
            event: WindowEvent::CloseRequested { api, .. },
            ..
        } if label == "main" => {
            api.prevent_close();
            request_exit(app);
        }
        RunEvent::ExitRequested { api, code, .. } => {
            let approved = app
                .state::<Lifecycle>()
                .guard
                .lock()
                .map(|mut guard| guard.consume_exit(code))
                .unwrap_or(false);
            if !approved {
                api.prevent_exit();
                request_exit(app);
            }
        }
        _ => {}
    }
}

#[cfg(test)]
mod tests {
    use super::ExitGuard;

    #[test]
    fn close_and_quit_requests_coalesce_until_resolved() {
        let mut guard = ExitGuard::default();
        assert_eq!(guard.request().unwrap(), (1, true));
        assert_eq!(guard.request().unwrap(), (1, false));
        assert_eq!(guard.pending, Some(1));
        assert!(!guard.consume_exit(None));
        assert!(!guard.consume_exit(Some(0)));
    }

    #[test]
    fn cancellation_retains_the_app_and_a_later_request_has_a_new_token() {
        let mut guard = ExitGuard::default();
        let (first, _) = guard.request().unwrap();
        assert!(!guard.resolve(first, false).unwrap());
        assert_eq!(guard.pending, None);
        assert!(!guard.consume_exit(Some(0)));
        let (second, fresh) = guard.request().unwrap();
        assert!(fresh);
        assert_ne!(first, second);
        assert!(guard.resolve(first, true).is_err());
        assert!(guard.resolve(first, false).is_err());
        assert_eq!(guard.pending, Some(second));
    }

    #[test]
    fn stale_or_unrequested_approval_never_authorizes_exit() {
        let mut guard = ExitGuard::default();
        assert!(guard.resolve(0, true).is_err());
        assert!(guard.resolve(1, true).is_err());
        let (request, _) = guard.request().unwrap();
        assert!(guard.resolve(request + 1, true).is_err());
        assert!(guard.resolve(0, false).is_err());
        assert!(!guard.consume_exit(Some(0)));
        assert_eq!(guard.pending, Some(request));
    }

    #[test]
    fn approval_is_bound_to_pending_request_and_consumed_only_once_by_zero_exit() {
        let mut guard = ExitGuard::default();
        let (request, _) = guard.request().unwrap();
        assert!(guard.resolve(request, true).unwrap());
        assert!(guard.resolve(request, true).is_err());
        assert!(guard.resolve(request, false).is_err());
        assert_eq!(guard.request().unwrap(), (request, false));
        assert!(!guard.consume_exit(None));
        assert!(!guard.consume_exit(Some(1)));
        assert_eq!(guard.pending, Some(request));
        assert!(guard.consume_exit(Some(0)));
        assert_eq!(guard.pending, None);
        assert!(!guard.consume_exit(Some(0)));
    }

    #[test]
    fn exhausted_request_tokens_fail_closed_without_wrapping() {
        let mut guard = ExitGuard {
            next: u32::MAX,
            ..ExitGuard::default()
        };
        assert!(guard.request().is_err());
        assert_eq!(guard.pending, None);
        assert!(!guard.consume_exit(Some(0)));
    }
}
