# Native lifecycle protection and Molden capacity contracts

Date: 11 November 2026. Status: implemented; implementation/verification is tracked
in [#30](https://github.com/uvar-apps/eigenvista/issues/30) and
[#31](https://github.com/uvar-apps/eigenvista/issues/31).
The [status record](../status.md) distinguishes fresh evidence from release and
manual platform qualification.

## Native close and application quit

The browser beforeunload listener does not establish native close protection.
The locked macOS stack also needs an AppKit termination hook: the native probe
showed that the default Quit selector can terminate a dirty document without a
Tauri ExitRequested event. Handling that event alone misses this path.

Rust therefore owns the initial veto for main-window CloseRequested,
ExitRequested and macOS applicationShouldTerminate. A single pending monotonically
increasing token represents the exit decision. Repeated requests coalesce.
The frontend installs an event listener then queries pending state, recovering
requests emitted during initialization. Cancel resolution also resynchronizes
pending state; resolved-token high-water checks reject stale replies. Failed IPC
never constitutes approval.

The frontend uses a modal HTML dialog with Cancel, Discard and Quit, and Save
and Quit. It blocks edits immediately, compares current document identity before
approval and after asynchronous save, and asks for fresh confirmation after a
late generation/import publishes a different document. Document, dirty and
activity refs update synchronously with accepted mutations. Saves acknowledge
success only for the current document revision. A cancelled/failed save leaves
the prompt/document available. Pending native saves across document, conversion
and shader-parameter commands block discard; conversion work and unwritten
results require returning to their own queue to save or explicitly discarding.

Approval invalidates generations and cancels both scientific clients, then
resolves the matching native request. Only the specifically authorized zero-code
ExitRequested consumes its one-use permit. Arbitrary programmatic exits, stale
approvals and cancellation cannot bypass the veto. There is no asynchronous
Rust mirror of dirty state and no new frontend capability permission.

On macOS the delegate hook inherits the existing Tao delegate class without
adding ivars and affects only that delegate instance. Installation is confined
to the main thread, verifies compatible instance sizes and refreshes AppKit's
delegate selector cache. Typed APIs from already-locked objc2/AppKit dependencies
define the callback ABI. Existing methods/state remain inherited. Installation
failure prevents application startup rather than silently dropping protection.
Other platforms retain the shared Tauri event guards; they are not qualified
release targets by this change.

Rejected alternatives: browser-only protection; a window-only callback;
mirroring dirty state through asynchronous IPC; blanket permission for any
programmatic exit code; replacing only the Quit menu while leaving other AppKit
termination requests unguarded; and saving a stale snapshot then quitting over
new work. Force termination/crash recovery and autosave are outside this fix.

## Molden limits

The implemented limits remain independent: 1,024 expanded basis functions and
512 total MOs across spin blocks. Complete one-orbital-per-AO spatial sets fit
through 512 AOs; complete separate alpha/beta sets fit through 256 AOs, subject
to the other byte/domain/allocation limits. Partial listed orbital sets can reach
the separate basis cap, but occupation-derived densities describe only the
listed orbitals and do not recover omitted occupied contributions.

#31 corrects stale 256-AO statements in README, Molden and user guides and adds
actual-parser/core agreement tests at each limit and one past it. Its generated
capacity inputs deliberately omit optional occupations to isolate the limits
from unrelated dense matrix construction. Independent scientific fixtures and
all production limits are unchanged. A 300-AO/600-MO unrestricted input must fail
explicitly rather than truncate its spin sets.

Raising capacity remains [#35](https://github.com/uvar-apps/eigenvista/issues/35),
with memory/persistence design first. Skipping zero-occupation contractions is
separate [#33](https://github.com/uvar-apps/eigenvista/issues/33) work.

## Evidence boundaries

Rust guard tests establish token/permit behavior. Browser tests exercise the
real App/dialog/WASM with explicit native IPC boundary doubles, including delayed
and failed replies; they do not establish native OS routing. A dev-only native
example reuses the production lifecycle module and embedded frontend to exercise
real window-close, programmatic-exit and AppKit terminate routes, actual dirty
edits, deduplication, cancellation and final termination in an owned process.
It adds no production test commands or permission changes.

Physical close-button/Cmd+Q interaction and native Save-dialog acceptance remain
separate from those programmatic native observations. Do not infer clean-Mac,
HiDPI or Linux/Windows qualification from these checks. Commands and the remaining
manual matrix live in [development](../development.md#manual-native-acceptance).

API references: [Tauri RunEvent](https://docs.rs/tauri/2.12.1/tauri/enum.RunEvent.html),
[frontend events](https://v2.tauri.app/develop/calling-frontend/), and the locked
SDK source. The concrete macOS behavior was reproduced rather than inferred
from the cross-platform API documentation.
