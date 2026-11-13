# Sidebar reordering

Date: 13 November 2026. Status: implemented; verification recorded in status.
Issue: [#52](https://github.com/uvar-apps/eigenvista/issues/52).

## Contract

Sections can move within their existing pane: Document, Quantum fields and
Provenance on the left; Field rendering, Appearance, Atom colours, Surface
shader and Saved surfaces on the right. Pane membership remains fixed even
when mobile places both panes below the scene. Cross-pane dragging is ignored.
This keeps the existing information groups and avoids React reparenting that
could discard local file, shader and error state.

A dedicated heading handle provides native drag-and-drop. Clicking/tapping it
reveals move buttons; keyboard users can use those buttons or Up/Down/Home/End
on the handle. Escape also works from a focused move button and restores handle
focus; starting a drag closes its move controls. Ordinary heading Enter/Space
still controls expansion. Moves
update actual DOM order with stable keys, retain keyboard focus and announce
the section's new position. Layout does not use CSS order alone.

## Persistence and state

Order belongs to the application profile, separately from the scientific
Document and from the existing expansion preference. Reads of
`eigenvista:panel-order:v1` are bounded and validate each pane's complete ID
permutation, rejecting duplicates, missing/unknown/cross-pane IDs and invalid
types. Storage corruption or unavailable/full storage cannot prevent use.
Open/Clear/reload retain the order when profile storage is available; temporary
storage failure retains working in-memory controls.

Bodies stay mounted, including hidden bodies and ShaderPanel. Moving a section
does not change document dirty state, scientific data, worker registrations,
selected orbitals or ongoing calculations. Busy Field rendering remains forced
open; moving it retains progress and Cancel. No new scientific policy, dependency,
version, file-format or release is introduced.

## Alternatives and verification

Native drag events plus ordinary buttons avoid adding a drag framework for eight
fixed sections. Touch users can move by tap without relying on browser-native
touch dragging. Cross-pane movement and CSS-only ordering were rejected for
state preservation and consistent reading/tab order.

Browser checks exercise real dragging, keyboard and tap moves, bounds, profile
persistence/failures, mounted controls, decoded Save/worker isolation and real
current-request cancellation. Desktop/mobile captures and camera interactions
are inspected. Cocoa WebKit follows macOS keyboard navigation settings and may
skip ordinary buttons with plain Tab; its local traversal check uses Option-Tab
while Chromium and hosted non-Cocoa WebKit use Tab. The expected actual focus
sequence is identical, with no skipped traversal gate. See
[Apple’s shortcuts](https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac)
and [WebKit’s event policy](https://github.com/WebKit/WebKit/blob/main/Source/WebCore/page/EventHandler.cpp).
Required local checks and all four actual hosted PR-head jobs
are recorded in [status](../status.md) and the tracking issue.
