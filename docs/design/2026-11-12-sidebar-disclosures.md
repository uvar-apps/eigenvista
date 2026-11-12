# Sidebar disclosures

Date: 12 November 2026. Status: implemented; verification recorded in status.
Issue: [#48](https://github.com/uvar-apps/eigenvista/issues/48).

The eight stacked sidebar sections can be collapsed independently. Every heading
contains a native button with `aria-expanded` and `aria-controls`; the associated
body is hidden while staying mounted. Unmounting was rejected because it would
discard shader source, parameter and form state. All sections default to open,
preserving the initial application layout and access to controls.

Expansion belongs to the application profile, not `Document`. The bounded
localStorage value accepts only eight known boolean keys. Unknown keys,
nonboolean values, corrupt or oversized JSON and unavailable/full storage never
prevent application use. Open/Clear and document Save leave this preference
separate from scientific data, dirty state and worker scheduling.

Field rendering temporarily stays open while scientific work is busy. Disabling
its disclosure ensures progress and cancellation remain accessible; finishing,
failure or cancellation restores the stored choice. The Document examples
control remains a sibling of its heading button, avoiding nested controls.

Drag-and-drop ordering was the lower-priority part of the request. It is tracked
separately in [#52](https://github.com/uvar-apps/eigenvista/issues/52), including
keyboard operation and its future ordering/persistence contract. This change
adds no ordering preference, drag operation or scientific/rendering behavior.

See the [browser regressions](../../app/tests/panels.spec.ts),
[user guide](../user-guide.md#finding-your-way-around) and
[architecture](../architecture.md).
