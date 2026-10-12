# Atom colours from a file

Status: **implemented** (2026-10-12). Issue:
[#17](https://github.com/uvar-apps/eigenvista/issues/17).
Baseline: `041e581` (v0.5.7).

## Goal

Atom **colours** come from a file that can be edited without touching
TypeScript. Symbols and radii stay hardcoded.

## Non-goals

- Loading symbols or radii from a file.
- Any change to bond perception or the scientific model.
- Persisting palettes across restarts.
- Storing palettes in `.eigenvista` — see decision 3.
- Startup auto-load from a fixed path.

## Decisions

| # | Decision |
| --- | --- |
| 1 | **A + B** — build-time import for the built-in default, plus a runtime "Colours file…" picker |
| 2 | **Session-only.** Nothing persists |
| 3 | **No file-format change.** Atom colours are not stored in `.eigenvista` |
| 4 | **Partial overrides.** A file may list any subset of elements |
| 5 | Plain `.json`. The loader does not enforce the filename |
| 6 | **The JSON is the single source of truth for colours.** `elements.ts` drops its `color` field |

Decisions 2 and 3 keep the whole feature in runtime state: no save path, no
format version bump, no migration, no compatibility surface.

## 1. File format

```json
{
  "format": "eigenvista-atom-colors",
  "version": 1,
  "colors": [
    { "z": 1, "symbol": "H", "color": "#fafafa" },
    { "z": 6, "symbol": "C", "color": "#535b64" }
  ]
}
```

- **`z` is the only lookup key.**
- **`symbol` is a human label**, validated against the fixed table as a typo
  guard and then ignored. A mistyped symbol can never change behaviour.
- **`format` + `version`** reject the wrong file outright and allow the schema
  to evolve.
- **JSON** parses with zero new dependencies in TypeScript (`JSON.parse`) and
  Rust (`serde_json` is already in the workspace).
- Partial files are valid; unlisted elements keep their default.

Rejected: the pre-0.5.5 `default_atom_colors` shape — positional RGB triples,
CRLF, extensionless, no atomic numbers. Position-indexed data with no
validation anchor is what let that table drift.

Filename is cosmetic. `atom-colors.json` is used; the loader accepts any
`.json`.

## 2. What stays fixed in `app/src/elements.ts`

- `symbol` per Z
- `radius` per Z (van der Waals, with Alvarez / Rahm / Pyykkö provenance)
- the unknown-element fallback `#b294b9` / `1.8` — a "no data" sentinel, not a
  per-element colour
- the Rust drift guard for symbols and radii

## 3. Why the JSON owns colours (decision 6)

1. **Two copies of one fact is how we got here.** The 0.5.5/0.5.6 table
   carried 13 distinct colours across 118 elements — `#e6e600` alone covered
   32 of them, including sulfur and chlorine. It was hand-maintained colour
   data with no guard. Duplicating the palette re-opens that door.
2. **The drift test gets stronger.** `element_display.rs` previously read
   `elements.ts` and checked colours were lowercase hex. Pointed at the JSON it
   checks schema, entry count, lowercase hex, **and all-distinct** — the same
   coverage against a better target, and it now guards the file users actually
   edit.
3. **Session-only makes it safe.** Nothing persists per-document, so no
   document can freeze a stale palette. The bundled JSON is always the live
   default.
4. **Cleaner layering.** `elements.ts` becomes purely scientific — symbols,
   radii, provenance. Colour becomes data.
5. **It is cheap.** Exactly one consumer of the atom colour existed:
   `Viewport.tsx` `tint.set(element.color)`. `symbol()` is unaffected.

The alternative — keep colours in `elements.ts` and treat the JSON as an extra —
is less code up front but carries two sources of truth permanently.

## 4. Runtime resolution order

```
user override (session, partial)  →  bundled default (atom-colors.json)  →  #b294b9
```

Three layers, one copy of the default.

## 5. Loading

**A — built-in default.** The frontend imports `atom-colors.json` at build time,
so the baseline has no runtime failure mode.

**B — runtime override.** Mirrors the existing shader `.params` loader:

- hidden `<input accept=".json,.txt">` in the browser
- `pickNative()` + `readFile` under Tauri
- parse → validate → merge over the default → app state
- errors surfaced inline, the same pattern as `paramsError`
- "Reset to defaults" restores the bundled palette

Deferred: startup auto-load from a fixed location. It needs Tauri FS/asset scope
configuration and introduces silent-load surprises.

Possible later: ship `atom-colors.json` in the tester ZIP next to `Shaders/`, so
testers can inspect and edit the default palette. `Shaders/` already sets that
precedent.

## 6. Rendering — re-tint, do not rebuild

The atom layer is a single `THREE.InstancedMesh` with per-instance colours. A
palette change runs in its own effect keyed on the palette:

```
for each atom i: tint.set(resolve(z)); atoms.setColorAt(i, tint)
atoms.instanceColor.needsUpdate = true
```

Not a scene rebuild. A rebuild would compound the existing finding that
appearance edits rebuild the whole scene.

## 7. Validation

Any failure rejects the whole file, keeps the current palette, and shows the
error. A half-applied palette is harder to diagnose than a loud failure.

- `format` not `eigenvista-atom-colors` → reject
- unknown `version` → reject
- `colors` missing, not an array, or empty → reject
- duplicate `z` → reject
- `z` not an integer in 1..118 → reject
- `color` not matching `#rrggbb` → reject
- `symbol` present and disagreeing with the fixed table → reject

## 8. Code shape

| File | Role |
| --- | --- |
| `app/src/atom-colors.json` | single source of truth for colours |
| `app/src/atomColors.ts` | `parseAtomColors(text)` → `Map<number,string>`; validation; `DEFAULT_PALETTE` from the JSON import; `resolveColor(z, override)` |
| `app/src/elements.ts` | symbols and radii only; `elementDisplay(z)` → `{ symbol, radius }` |
| `app/src/App.tsx` | `atomOverride` state plus error string |
| `app/src/Viewport.tsx` | effect on `[atomOverride]` that re-tints in place |
| panel UI | "Colours file…" and "Reset to defaults", mirroring `ShaderPanel` |

## 9. Tests

`crates/eigenvista-core/tests/element_display.rs`:

- symbols and radii tests unchanged in intent, still read `elements.ts`
- colour tests move to the JSON: schema, 118 entries, lowercase hex,
  **all-distinct** — a regression guard so the 13-colour problem cannot return

New TypeScript unit tests for `parseAtomColors`: valid, partial, bad hex,
duplicate `z`, out-of-range `z`, wrong `format`, unknown `version`, symbol
mismatch, empty `colors`.

New e2e: load a colours file, assert a known atom's rendered pixel changed, and
that "Reset" restores the original.

## Implementation notes

Shipped as designed. Two small refinements came out of testing:

- The colour pattern accepts `A-F` before the lowercase check so an uppercase
  colour reports "must be lowercase" rather than the generic "not a #rrggbb
  hex triplet". Same rejection, clearer message.
- The e2e colour assertions poll the canvas rather than sampling once. The
  scene draws on an animation loop, so a single `readPixels` can land on a
  stale frame and report no change. The cold-start example is a hydrogen pair,
  so the test overrides hydrogen rather than carbon.

Verification on Apple Silicon macOS, Rust 1.99.0: `cargo fmt --all --check`;
`cargo test --locked --workspace` 133 passed (122 baseline + 11 palette and
table guards); `cargo clippy --locked --workspace --all-targets -- -D warnings`;
`npm --prefix app run build`; `npm --prefix app run test:e2e` 144 passed
(72 Chromium, 72 WebKit). Not run: `test:packaging`, the native Tauri shell,
clean-machine install, Linux/Windows.
