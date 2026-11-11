use objc2::{
    MainThreadMarker,
    runtime::{AnyObject, ClassBuilder, Sel},
    sel,
};
use objc2_app_kit::{NSApplication, NSApplicationTerminateReply};
use std::sync::OnceLock;
use tauri::Manager;

// The application is singleton. This stores only its handle, never a second
// copy of document/dirty state; all decisions still use the current React state.
static APPLICATION: OnceLock<tauri::AppHandle> = OnceLock::new();

extern "C" fn should_terminate(
    _delegate: *mut AnyObject,
    _selector: Sel,
    _application: *mut NSApplication,
) -> NSApplicationTerminateReply {
    if let Some(app) = APPLICATION.get() {
        // A Rust panic must not unwind through this Objective-C callback. Even
        // if notification fails, return Cancel and preserve the pending request.
        if std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| super::request_exit(app)))
            .is_err()
        {
            eprintln!("Native termination confirmation could not be requested");
        }
    }
    NSApplicationTerminateReply::TerminateCancel
}

/// Route the default Quit/Cmd+Q/Dock termination path through the same guard.
/// Tauri 2.12.1's programmatic ExitRequested hook alone does not intercept it.
pub fn install(app: &tauri::AppHandle) -> Result<(), String> {
    let main =
        MainThreadMarker::new().ok_or("Install native exit protection on the main thread")?;
    if app.try_state::<super::Lifecycle>().is_none() {
        return Err("Native exit protection state is missing".into());
    }
    let application = NSApplication::sharedApplication(main);
    let delegate = application
        .delegate()
        .ok_or("Native application delegate is missing")?;
    let object: &AnyObject = (*delegate).as_ref();
    let original = object.class();
    let mut subclass = ClassBuilder::new(c"EigenVistaExitGuardDelegate", original)
        .ok_or("Native exit delegate class could not be created")?;
    // SAFETY: This is the documented NSApplicationDelegate selector, with the
    // typed AppKit argument/result encoding. Only termination policy changes;
    // all Tao methods, protocol conformance and existing ivars are inherited.
    unsafe {
        subclass.add_method(
            sel!(applicationShouldTerminate:),
            should_terminate
                as extern "C" fn(
                    *mut AnyObject,
                    Sel,
                    *mut NSApplication,
                ) -> NSApplicationTerminateReply,
        );
    }
    let subclass = subclass.register();
    if subclass.instance_size() != original.instance_size() {
        return Err("Native exit delegate changed its instance layout".into());
    }
    APPLICATION
        .set(app.clone())
        .map_err(|_| "Native exit protection was already installed")?;
    // SAFETY: This is the retained, current application delegate on the main
    // thread. The registered class subclasses its effective class, adds no
    // ivars, has the checked identical size and changes only a compatible
    // optional delegate method. No other delegate instance/class is patched.
    let previous = unsafe { AnyObject::set_class(object, subclass) };
    assert!(
        std::ptr::eq(previous, original),
        "Native delegate class changed concurrently"
    );
    // AppKit caches optional-delegate selectors. Retain the same delegate while
    // clearing/restoring its weak property so the new selector is recognized.
    application.setDelegate(None);
    application.setDelegate(Some(&delegate));
    Ok(())
}
