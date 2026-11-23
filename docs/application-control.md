# Application control API

**Version 0.10.5:** workloads use [allocation-driven memory handling](allocation-policy.md), with no application memory budgets. Historical release records retain the limits that applied to their original binaries.

Save coordination in 0.10.3 (#99): GUI and API Save share pending-inspection admission.
An inspection write is admitted synchronously before React/worker validation;
coalesced GUI writes stay pending through their final accepted publication.
Committed plane intent is included before preparation/debounce; manual
preparation and cancellation share that lifetime, while text drafts are excluded.
Save reports busy/refuses without encoding while such edits are pending. Await
successful edit completion before saving. Validation failure or stale revision
retains the accepted document and releases admission. Native exit and browser
unload also observe pending edits. The published 0.10.2 package predates this fix.


Installed-app agents should use the packaged portable skill and technical
reference, or the [binary-user setup guide](ai-connector.md). They require no
development checkout or compilation. The source-build examples in this maintainer
reference are not user installation instructions.

The source implementation tracked by [#78](https://github.com/uvar-apps/eigenvista/issues/78)
exposes the running viewer to an external coding agent or another local client.
It uses the same document, scientific worker, camera and renderer as the visible
application. It does not create a second document or operate controls by clicking
the DOM.

**EigenVista 0.8.0 is the first connector-enabled release.** Its Mac package
includes the prebuilt helper, portable instructions and session launcher. Older
0.7.2 packages do not contain them. Qualification results and remaining gaps
belong in [handoff](handoff.md) and [status](status.md#source-version-080).
The additive palette/biological-presentation work in
[#80](https://github.com/uvar-apps/eigenvista/issues/80) brings the API version 1
catalog to 28 methods in the published 0.8.0 release. Discover the connected instance's catalog before using
these additions; an older source-built instance may lack them.

**Scientific inspection, introduced in 0.10.0:** the Mac package includes the geometry,
SES/SAS and quantitative-field methods documented below (#83–#86). Older
0.8.0 downloads do not have these methods. Use the matching 0.10.5
app/helper and the connected instance's
`app.capabilities`, not the numeric version or a hardcoded method count, to
establish availability.

The default pane only changes presentation: the same controls use this service.
Fields → Quantitative field inspection maps to the probe/plane/profile commands,
not sampled preview quality. Pane, Zen and fullscreen have no API; GUI changes
must not change source or cache identity.

For manual installation, a setup prompt and interaction instructions for Codex,
Claude Code, Pi, OpenCode and generic local agents, start with the
[connector guide](ai-connector.md). The [AI website section](https://uvar-apps.github.io/eigenvista/ai.html)
contains the four prompt-driven tutorials. This document is the method and
transport reference for agents and client authors. Users can ask for palette,
coloring, focus and rendering changes in ordinary language; the agent translates
the request into these methods without asking the user to learn method names.

The connector adds no embedded AI console, model client, API-key requirement or
general script runtime. An external agent supplies its own model and tools;
the 0.10.0 scientific features also have normal GUI controls.
The [external-agent skill](../skills/eigenvista-control/SKILL.md) describes how to
use this interface. The existing `eigenvista-convert` CLI remains a separate
document converter.

## Enable a native instance

Normal native startup creates no control listener or connection descriptor.
Enable it explicitly with both flags:

```text
--control-file FILE --control-root DIR [--control-root DIR ...]
```

Run the following from the repository root after the prerequisites in
[development](development.md). These are build/start instructions, not a claim
that a particular checkout has passed qualification:

```sh
mkdir -p tmp
export TMPDIR="$PWD/tmp" TMP="$PWD/tmp" TEMP="$PWD/tmp"
cargo build --locked -p eigenvista-control
npm --prefix app run desktop:build

EIGENVISTA_CONTROL_RUN="$PWD/tmp/control-session-1"
mkdir -m 700 "$EIGENVISTA_CONTROL_RUN"
mkdir -m 700 "$EIGENVISTA_CONTROL_RUN/output"

target/debug/bundle/macos/EigenVista.app/Contents/MacOS/eigenvista-desktop \
  --control-file "$EIGENVISTA_CONTROL_RUN/connection.json" \
  --control-root "$PWD/tools/site/examples" \
  --control-root "$EIGENVISTA_CONTROL_RUN/output"
```

The final command runs the app in that terminal. Choose a fresh session directory
when repeating the example. The descriptor destination must not already exist;
the broker will not overwrite it. Use only the input/output roots intended for
this session, rather than granting the whole filesystem. Root directories and
destination parent directories must exist.

The descriptor records `version`, `transport`, `address`, `token` and `instanceId`.
The listener binds an ephemeral `127.0.0.1` TCP port. The token is generated for
that startup. On Unix, the descriptor must be a regular file owned by the current
user with private permissions; the writer uses mode 0600. **Do not print, upload
or commit its contents.** Give the client its filename instead. A separate
descriptor identifies each authorized instance. Normal shutdown removes the
broker's own matching descriptor; a crash may leave a stale file, so do not assume
that a file's existence means the app is alive.

Native control file access currently uses Unix-specific protections. macOS is
the initial target; Linux qualification remains pending and non-Unix attachment
reports `unsupported`. This guide does not establish new platform qualification.

## Use the control CLI

In another terminal, again from the repository root:

```sh
EIGENVISTA_CONTROL_RUN="$PWD/tmp/control-session-1"
target/debug/eigenvista-ctl \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" app.capabilities
target/debug/eigenvista-ctl \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" app.state
target/debug/eigenvista-ctl \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" document.open \
  --params "{\"path\":\"$PWD/tools/site/examples/bicyclic-c7h10.molden\"}"
target/debug/eigenvista-ctl \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" fields.list \
  --params '{"offset":0,"limit":100}'
target/debug/eigenvista-ctl \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" camera.orbit \
  --params '{"horizontalDegrees":35,"verticalDegrees":15}'
```

The exact CLI shape is:

```text
eigenvista-ctl --connection FILE METHOD
  [--params JSON | --params-file FILE] [--wait SECONDS]
```

`--params` and `--params-file` are alternatives; omitted parameters mean `{}`.
Use a UTF-8 JSON params file for larger requests or paths requiring careful
quoting. `--help` and `--version` do not require a connection.

The client reads/authenticates with the descriptor and prints the **result JSON
directly**, without the wire-level `jsonrpc`/`id` envelope. Errors print
`{"error":{"code":...,"message":...,"data":{"kind":...}}}` and exit 1.
Successful RPCs exit 0, including a `job.get` response describing a failed job;
always inspect job status. `--wait SECONDS` polls an accepted job until it reaches
a terminal state; failed/cancelled jobs then produce an error exit. It accepts
nonnegative whole seconds, subject to the platform's actual time representation.
A wait timeout does **not** cancel the calculation.
The flag has no additional effect on a result that contains no `jobId`.

### Run the external demonstration

For a freshly started, authorized instance with no unsaved work to replace:

```sh
node tools/control-harness/demo.mjs \
  --connection "$EIGENVISTA_CONTROL_RUN/connection.json" \
  --output "$EIGENVISTA_CONTROL_RUN/output/demo"
```

The harness uses `target/debug/eigenvista-ctl` by default. Optional `--client FILE`
and `--input FILE` choose another built client or input; the input must be inside
a granted root and provide a total-density field. The default input is
`tools/site/examples/bicyclic-c7h10.molden`.

It imports the molecule, discovers fields, selects a density by `kind`/`quantity`,
samples a volume without meshes, generates meshes, applies X-ray and clipping
presets, changes the camera and exports four PNGs plus `controlled.eigenvista`.
`harness-result.json` records actual results and artifact hashes. It runs outside
EigenVista using Node and the CLI; it is not code evaluated inside the app.

Choose a fresh output directory for each run: this harness refuses to overwrite
existing files. It does not authorize discarding dirty work or widening roots.
Inspect the generated images with the external agent's image viewer when
assessing composition and rendering quality.

## Discover methods and state

Start with `app.capabilities`. Its result includes:

- `apiVersion: 1` and the current `instanceId`;
- `methods`, each containing `method`, `description` and `inputSchema`;
- `allocationPolicy: "allocation-driven"` and advisory `gridResolutionPresets`;
- `files: {nativePaths, browserBytes, overwrite}` and `errorKinds`. In
  0.10.3, `overwrite:true` advertises optional native replacement
  support, not the default behavior; browser exports advertise false.

Discover schemas from the connected app rather than assuming another version's
catalog. Arguments are strict objects: unknown keys, nonfinite numbers, invalid
types and values outside supported bounds are rejected rather than coerced.

`app.state` returns `revision`, a bounded `document` summary, `dirty`, `busy`,
`progress`, `view`, `mode`, `resolution`, `shading`, `ambientOcclusion`, `shader`,
`palette`, `volumeQuality`, `structureDisplay`, `camera` and `backgroundColor`.
During renderer startup, camera/background may be null while state remains
queryable. Scientific coefficient, grid and mesh arrays are not returned.
`palette` reports `{custom,name}`. The biological `structureDisplay` summary
reports color mode, complete hidden-chain selectors/count, hidden component kinds,
isolation, selected-residue count, complete chain styles/count, component styles
and visible-atom count. It does not return per-atom visibility, residue selections
or the focus atom-index array. Record requested residue-range endpoints separately
if they will be needed to recreate the presentation.
The 0.10.0 extension additionally reports bounded `inspection` state:
`pickEnabled`, `selectedCount`, complete `orderedAtoms`, `measurementCount`,
`molecularSurfaceCount`, `analysisCount` and typed `lastPick`. Page source identities/selections
through the dedicated methods instead of expecting scientific arrays in state.

Use IDs returned by the API. Human labels do not establish scientific meaning:
for example, an occupation-derived density may have `kind: "density"` and
`quantity: "total"` without the word “total” in its label. Unknown cube scalar
meaning remains unspecified; opening a cube does not reconstruct orbitals.
Document, field and surface identifiers, labels, warnings and shader settings
are returned completely. No selector-length or metadata-summary allowance
rejects or truncates them. Scientific arrays use their dedicated data methods.

## Method reference

Document, field, surface, palette, biological-presentation, scene, shader, camera
and image mutations accept optional `expectedRevision`; query methods and
`job.cancel` do not accept it.
All parameters shown as optional may be omitted, subject to native/browser file
rules below. Results may include additional metadata.

| Method | Parameters | Result |
| --- | --- | --- |
| `app.capabilities` | `{}` | Version, instance, schemas, allocation policy, grid presets and host/file capabilities |
| `app.state` | `{}` | Accepted document/presentation state |
| `fields.list` | `offset?`, `limit?` | `{revision,total,offset,items}`: orbitals, densities, then stored grids |
| `surfaces.list` | `{}` | `{revision,total,items}`: IDs, field IDs, isovalues, visibility, counts and source hashes |
| `structure.list` | `offset?`, `limit?` | Chain metadata/counts, component atom counts and `secondarySource` |
| `palette.load` | Native: `path`; browser: `name`, `text` | Applied `{custom,name}` palette summary |
| `palette.reset` | `{}` | Bundled-default palette summary |
| `structure.set` | Biological session patch described below | Applied display summary and actual camera |
| `structure.focus` | `target` (`"visible"` or `"chain"`); `chainIndex` only for `"chain"` | Display summary and focused camera |
| `document.open` | Native: `path`; browser: `name`, `bytes`; `discardUnsaved?` | Imported document summary, import `report`, `previewError`, revision |
| `document.save` | Native: `path`; `overwrite?: boolean` | Native file receipt or browser encoded bytes |
| `field.select` | `fieldId` | Selected field/revision, or a job receipt if sampling is required |
| `field.preview` | `fieldId`, `mode: "volume" | "raycast"`, `resolution` | Sampling-only job receipt; no marching cubes |
| `surfaces.generate` | `fieldIds`, positive `isovalue`, `resolution` | Mesh-generation job receipt |
| `surfaces.set_visibility` | `surfaceId`, `visible` | Applied visibility/revision |
| `surfaces.remove` | `surfaceId` | Removal/revision |
| `scene.set` | Any supported appearance patch below | Applied view/session settings and revision |
| `shader.apply` | `preset: "surface-clip" | "x-ray"`, `target?` (`"all"`; 0.10.0: one QC/molecular surface ID), `uniforms?`, `transparency?` | Applied shader metadata/revision |
| `shader.set_uniforms` | `uniforms`, `target?` as above, `transparency?` | Applied declared uniforms/revision; omitted target retains the applied target |
| `shader.clear` | `{}` | Cleared shader/revision |
| `camera.get` | `{}` | `{revision,position,target,up}` |
| `camera.fit` | `{}` | Applied camera/revision |
| `camera.set` | `position`, `target`, `up?` | Applied camera/revision |
| `camera.orbit` | `horizontalDegrees`, `verticalDegrees` | Applied camera/revision |
| `camera.zoom` | Positive `factor` | Applied camera/revision |
| `image.export` | Native: `path`; `transparent?`, `overwrite?: boolean` | PNG file receipt or browser PNG data URL, dimensions, `revision`, `currentRevision` |
| `job.get` | `jobId` | Operation status, progress and terminal result/error |
| `job.cancel` | `jobId` | Job state after owned cancellation/cleanup |

EigenVista 0.10.2 (#97) adds detailed molecular-surface progress presentation.
The existing `job.get.progress` retains raw `stage` and optional
`counts:{completed,total}`. Engine phases are `geometry`, `classify`, `mesh`,
`assemble` and `measure`; `preparing`, `transferring` and `validating` describe
the surrounding work. Mesh counts are completed/total blocks for that phase.
Other engine phases report only start/end, so their binary counts are not an
overall percentage. `app.state.progress` adds the active `operation`, `label`
and `elapsedSeconds`. Its `started` uses the WebView's monotonic clock, not Unix
time. Wait for terminal job status rather than a phase reaching 100%, and cancel
only an owned receipt. No overall percentage or ETA is inferred. These GUI
displays and elapsed metadata are included in 0.10.2.

`scene.set` supports `representation`, `positiveColor`, `negativeColor`, `opacity`,
`isovalue`, `shading`, `backgroundColor`, `volumeQuality` and
`ambientOcclusion: {enabled?, strength?, radiusAngstrom?, automaticRadius?}`.
Colors are six-digit `#RRGGBB`; shading is `diffuse` or `blinn-phong`; volume
quality is 1, 2 or 4.
Use capabilities for the current representation list. AO strength is 0–1 and
manual radius is 0.25–50 angstrom. Supplying a radius selects manual radius.
Set `automaticRadius: true` without `radiusAngstrom` to restore the automatic
coordinate-derived radius. Combining `automaticRadius: true` with an explicit
radius is rejected before applying any part of the scene patch. Omitting both
radius properties preserves the current radius mode. Setting
`automaticRadius: false` without an explicit radius, when leaving automatic mode,
seeds the manual radius from the current automatic value as the GUI does.

### Palette loading

Palette operations require an open document. Native `palette.load` callers supply one
absolute `path` inside an already granted input root; `name` and `text` are
rejected. Browser callers supply `name` and JSON `text`; filesystem paths are
unavailable. Native reads grow fallibly and decode strict UTF-8; browser JSON
uses the same complete parser. Neither path has a palette-byte allowance.

Both hosts use the GUI's `parseAtomColors` validation: format
`"eigenvista-atom-colors"`, version 1, a nonempty `colors` array, distinct integer
atomic numbers 1–118 and lowercase six-digit hex colors. Optional element symbols
must agree with the atomic number. A partial palette is valid; unlisted elements
retain bundled defaults. Malformed JSON or invalid entries reject the entire
palette and retain the previously active colors. `palette.reset` restores the
bundled palette. Palette operations affect session display only, preserve the
document/dirty state and use Element coloring to display the element overrides.

Palette input is subject to the same native regular-file, no-symlink, root and
source-protection rules as molecular input. A root cannot be added to a running
instance. Do not bypass a refused path by reading it through the agent's other
filesystem tools and resubmitting its contents. Use a previously approved input
directory or a separately authorized instance with the required narrow root.

### Biological presentation

These operations require imported biological chain/residue metadata. Discover
the current source identities with `structure.list`; mutation selectors use its
zero-based `index`, not display labels, author-chain IDs or guessed array order.
Metadata queries remain available without biological metadata, but a biological
mutation then reports `unavailable`. A palette load does not manufacture identities.

`structure.set` accepts a strict patch; omitted properties keep their current
values. It validates every source selector and style before committing any part
of the patch:

| Property | Meaning |
| --- | --- |
| `reset: true` | Restore default biological session display, including Element coloring and inherited styles |
| `showAll: true` | Clear hidden chains/kinds, isolation and residue-range filtering; retain colors/styles |
| `clearStyles: true` | Clear chain and component representation overrides; retain colors/visibility |
| `colorMode` | `"element"`, `"chain"`, `"entity"`, `"secondary"` or `"residue-class"` |
| `hiddenChains` | Replace hidden-chain indices with a distinct list of existing chain indices |
| `hiddenKinds` | Replace hidden component kinds with a distinct list from the advertised component enum |
| `isolatedChain` | Existing chain index to isolate, or `null` to stop isolation |
| `residueRange` | `{chainIndex,first,last}` using deposited residue identifiers, or `null` to clear the range |
| `chainStyles` | Distinct `{chainIndex,representation}` patches; `null` representation removes an override |
| `componentStyles` | Component-kind keys mapped to a representation, or `null` to remove that override |

Reset is applied first, then show-all/style clearing, then explicit values. An
isolation request restores the selected chain's visibility and component kinds
and clears a conflicting residue range, matching GUI isolation. A valid residue
range restores its chain/component visibility and clears isolation; if both are
supplied in one patch, the range is applied after isolation. Invalid, reversed or
ambiguous ranges leave the previous display intact. Residue identifiers use the
same resolver as the GUI, including insertion codes and optional residue names.

Chain styles take precedence over component styles, then the global document
representation. Values are `ball-stick`, `liquorice`, `space-fill`, `trace`, `tube`,
`ribbon` and `cartoon`. Protein styles are rejected for a component other than
protein or a chain without protein residues. These are session depiction choices, not changes to atom,
connectivity, biological-identity or scientific arrays.

`residue-class` groups standard amino acids by side-chain chemistry and leaves
nonprotein atoms in their element colors. Check `app.capabilities` for available
values when connecting to an older binary.

`structure.focus` with `{target:"visible"}` frames the currently visible atoms.
With `{target:"chain",chainIndex:N}`, it frames only that chain's currently
visible atoms. It never reveals hidden atoms or clears filters; isolate/show the
desired subset first. A hidden or empty target reports `not_found`, an unknown
chain reports `not_found`, and mismatched target/index arguments report
`invalid_arguments`. Resetting display choices does not itself fit the camera.
Use `structure.focus` or `camera.fit` explicitly when a new framing is wanted.

Coloring, visibility, isolation, residue ranges, overrides and focus are session
settings. They do not dirty the document and are not stored in `.eigenvista`.
Global `scene.set` representation retains its document/dirty/save contract.
Opening another file resets index-based biological choices and retains color mode
when biological metadata exists; palettes and AO remain session choices across
Open. Reload resets session choices. A native Save and an exported PNG therefore
serve different purposes: the former keeps molecular data and saved depiction
geometry, while the latter captures the current presentation.

### Camera and surface capture

Positions/targets are in **bohr**. A supplied camera `up` must be a unit direction
and cannot be parallel to the view. Degenerate poses, pole-crossing orbits and
violations of current controls limits fail. Positive horizontal orbit advances
azimuth around the camera's up axis; positive vertical orbit raises the view.
A zoom factor greater than one moves closer, below one moves farther, and one
does not change the requested distance.

Shaders are bundled presets with declared, validated uniforms. The API cannot
load arbitrary GLSL or evaluate JavaScript. Capture uses the same final draw/AO
path as normal PNG export, including restoration after transparent capture.
It waits for accepted React/viewport state instead of treating a queued setter
as a completed render.

<a id="unreleased-scientific-inspection-api"></a>

## Scientific inspection API (0.10.0)

All operations below use the same visible application state as their GUI
counterparts. Coordinates and original atom/residue indices are **bohr and
zero based** at this boundary; the GUI presents one-based numbers and accepts
Å/bohr inputs. Do not parse labels to obtain identity. Preserve ordered picks
for measurements, atom planes and profiles separately from sorted selection sets.
Pages use `offset?`, `limit?` (positive safe-integer counts, default 100).

`lastPick` is null or a typed original-source hit: `kind` is `atom`, `bond`,
`residue`, `molecular_surface` or `quantum_surface`, with applicable `atom`,
`atoms`, `residue`, `surface`, and world-bohr `point` fields. `attribution` may
be `mesh_vertex` or `backbone_CA`: surface attribution identifies a source atom
through the hit mesh vertex, and a backbone hit identifies its mapped Cα, not an
arbitrary exact atomic position. Source replacement and stale/removed mesh
geometry invalidate the pick; do not retain compact GPU instance indices.

Mutation schemas accept optional `expectedRevision`; read methods do not.
`selection.neighborhood`, `molecularSurfaces.generate` and `analysis.create`
return job receipts. Wait/poll/cancel through the existing job methods, then read
back the accepted settings/results. No GUI operation is a required workaround.

| Method | Parameters | Result / behavior |
| --- | --- | --- |
| `selection.pick_mode` | `enabled` | Enables/disables interactive source-atom picking; session state |
| `atoms.list` | Page, `residueIndex?` | Source index, element, bohr position, atom name and residue index |
| `residues.list` | Page, `name?`, `kind?`, `chainIndex?` | Particular residue identities, chain identity and original residue indices |
| `selection.get` | Page | Selected index page, ordered picks, selected count, pick-mode state and typed `lastPick` |
| `selection.list` | Page, `id?`, `seeds?` | Named-set summaries; with `id`, page its atoms, or original query seeds when `seeds:true` |
| `selection.set` | Exactly one of `atoms`, `residueIndices`, `selectionId`; `mode?: replace/add/remove`, `showOnly?`, `resetFilters?`, `focus?` | Applies source selection and optional display/focus; does not edit coordinates |
| `selection.clear` | `{}` | Clears transient selection/picks and selection display mask |
| `selection.save` | `id`, `label`, `atoms?` | Creates/replaces a durable named set, defaulting to active atoms |
| `selection.remove` | `id` | Removes a named definition, not source atoms |
| `selection.neighborhood` | `radiusAngstrom`, `seeds?` or `selectionId?`; `wholeResidues?`, `id?`, `label?`, `showOnly?`, `resetFilters?`, `focus?` | Background inclusive source-neighbor query; defaults to active seeds; optional named result |
| `measure.evaluate` | `kind: distance/angle/torsion`, ordered `atoms` | f64 value/unit or explicit undefined status/reason |
| `measure.list` | Page | Saved definitions with authoritative computed results |
| `measure.upsert` | Complete `measurement` object below | Creates/replaces one saved ordered definition/style |
| `measure.remove` | `id` | Removes a measurement and monitor |
| `labels.list` | Page | Saved atom/residue labels and appearance |
| `labels.upsert` | Complete `label` object below | Creates/replaces a label; exactly one atom/residue target |
| `labels.remove` | `id` | Removes a label |
| `molecularSurfaces.list` | Page | Settings/provenance/diagnostics/counts without bulk mesh or atom arrays |
| `molecularSurfaces.atoms` | `id`, page | Original atom indices and resolved `radiusAngstrom` values |
| `molecularSurfaces.warnings` | `id`, page | Full original warning strings; summaries also retain complete warnings |
| `molecularSurfaces.generate` | Complete `request` below | Background create/replace SES/SAS mesh; same ID replaces only on success |
| `molecularSurfaces.set` | `id`, `label?`, `visible?`, `color?`, `opacity?` | Updates saved appearance without recalculation |
| `molecularSurfaces.remove` | `id` | Removes cached molecular mesh |
| `fields.describe` | `fieldId` | Accepted or derived scalar interpretation/provenance |
| `fields.set_key` | `visible` | Persists truthful current mesh/raycast/volume-key visibility |
| `fields.set_metadata` | `descriptor` below | Records scalar interpretation/display units; raw sources/hash stay unchanged |
| `analysis.create` | Complete `request` below; optional `supersede:true` for planes since 0.10.2 | Background create/replace probe, plane or profile with f64 cache |
| `analysis.plane_atoms` | Ordered `atoms` (3), `extentAngstrom` (width/height), `dims` | Resolves an atom plane definition in world bohr |
| `analysis.list` | Page | Analysis definitions, interpretation/counts and rendering warnings; no sample arrays |
| `analysis.get` | `id` | One analysis summary/settings/provenance |
| `analysis.samples` | `id`, page | Raw f64 values/statuses and bohr positions; profile distances/length in Å |
| `analysis.set` | `id`, `label?`, `appearance?`, `automaticRange?` | Updates local presentation; `automaticRange:true` removes a fixed range |
| `analysis.remove` | `id` | Removes definition/cache/depiction |
| `table.export` | `kind: measurements/analysis`, `id?` (required for analysis); native `path?`, `overwrite?:boolean`; browser `offset?`, `length?` | Native scoped CSV receipt or bounded generated text chunk |

### Inspection object shapes and scientific conventions

EigenVista 0.10.2 renders shared active selection as gold hollow
reticles; the latest typed inspection pick has cyan rings for attributed atoms
that are not already selected. `selection.set`, mouse accumulation and named-set
activation share this rendering path. Normal inspection clicks still update
`selection.get.lastPick` without modifying the selected set. `selection.clear`
clears both active selection and the last inspection pick. Hidden atoms are
filtered out of depiction only, retaining their original indices in readback.
Markers are foreground source-position cues included in PNG exports, not
scientific geometry or molecular outlines. No new method or saved-file feature
is required.

`measurement` contains `id,label,kind,atoms,visible,color,always_visible`.
Distance uses two distinct IDs and returns Å; angle uses three, centered on the
middle atom; ordered torsion uses four and reports degrees in `[-180,180)`.
Coincident distinct atoms have valid zero distance; zero angle arms/degenerate
torsion planes return `value:null,status:"undefined",reason`, never a NaN or
fabricated zero. This is nonperiodic source geometry without uncertainties.

`label` contains `id,text,visible,color,always_visible`, and exactly one of
`atom` or `residue`. Colors use `#RRGGBB`. Labels, monitors and keys are included
in `image.export`, including transparent captures. Named sets are materialized
source indices; neighborhoods search hidden atoms too, include seeds, and may
expand complete biological residues. Pick a particular residue/ligand by its
returned identity, not its name alone. Proximity is not chemical interaction typing.

A molecular-surface `request` contains:

```json
{"id":"shape-1","label":"Selected SES","kind":"ses","atom_indices":[],"radii_set":"bondi","radii_overrides":[],"probe_radius":1.4,"spacing":0.5,"color":"#88aabb","opacity":0.7}
```

Empty `atom_indices` explicitly means **all source atoms**, including hidden
atoms. A nonempty selection is treated as an isolated subset, not a patch of
the full-molecule surface. `kind` is `ses` or `sas`; `radii_set` is `bondi` or
`alvarez`; overrides contain `{element,radius_angstrom}`. Probe and spacing use
Å: probe radius is finite and nonnegative; spacing is finite, positive and
representable by the engine. Missing element radii are errors; no generic
radius fallback or atom omission occurs. Cavities are kept; coarsening, smoothing
and decimation are disabled. Shaders and surface appearance reuse existing
operations; atom/bond AO remains separate. Save caches the geometry/provenance.

In this 0.10.0 extension, `shader.apply` can target `all` or one returned
quantum/molecular surface ID; unknown IDs fail with `not_found`.
`shader.set_uniforms` preserves the active target when omitted. Surface-list
warning replies are complete; `molecularSurfaces.warnings` also provides paginated
diagnostic strings when interpreting provenance.

A field `descriptor` contains `field,quantity,value_unit,origin,note?` and
`display_unit?`. Origins are `unknown`, `imported`, `derived`, `user_declared`;
user edits are recorded as declarations. Supported quantities include
`unspecified`, `dimensionless`, `orbital_amplitude`, `electron_density`,
`spin_density`, `difference_density`, `transition_density`, `electric_potential`
and `potential_energy`. Discover/validate the compatible units. Cube meanings
remain unspecified until declared. Declaration does not rescale samples;
supported density/amplitude bohr↔Å display conversions leave caches unchanged.
No electrostatics or wavefunction solver is introduced.

An analysis request contains `id,label,field,definition,descriptor?`. Definitions:

```json
{"kind":"probe","point":[0,0,0]}
```

```json
{"kind":"plane","origin":[-2,-2,0],"u":[4,0,0],"v":[0,4,0],"dims":[64,64]}
```

```json
{"kind":"profile","start":[-2,0,0],"end":[2,0,0],"count":257}
```

These coordinates are bohr. Plane `origin` is the first corner and `u/v` are
full-span vectors, not step vectors. A probe may additionally bind `atom`; a
plane may bind three ordered `atoms`; a profile may bind two. Resolved coordinates
must agree with those source references. Use `analysis.plane_atoms` to construct
the exact three-atom frame: centered at A, horizontal along B−A, normal along
`(B−A)×(C−A)`, with a nondegenerate third point. Endpoints are included.

**Plane replacement in 0.10.2:** discover `analysis.create`'s input schema before
using its optional top-level `supersede:true`. This is supported for plane
definitions only. Send the full request with the same analysis ID on each edit;
the ordinary job receipt is returned immediately. A replacement can supersede
only another replaceable plane job for that ID and the same scientific source.
It aborts unpublished obsolete work, waits for its unwind, and samples only the
newest queued definition. Other jobs, including ordinary manual analysis jobs,
return `busy` and are never cancelled by this option. Once an earlier result has
been published, it remains accepted until a newer successful publication.
Existing appearance is preserved. Cancel only a receipt owned by your request
with `job.cancel`. Explicit `expectedRevision` is checked again before queued
execution; refresh state after a stale outcome. Source replacement and disposal
prevent obsolete publication. Older apps may lack this option.

`appearance` supports `visible`, `colormap` (`diverging`, `viridis`, `grayscale`),
`show_key`, `show_labels`, optional ordered `range:[min,max]` and finite
`contour_levels`, allocated without a count ceiling. API ranges/levels are in **raw source scalar units**; GUI
controls display converted units. `analysis.samples` returns raw values and
`status:"valid"/"outside"`, with `value:null` outside. CSV applies the descriptor's
chosen display/export scalar unit, reports coordinates/profile distance in Å,
and leaves outside values blank. Its provenance identifies source/sample/method.
Quantitative values come from analytic f64 evaluation or source-grid affine
trilinear interpolation, never GPU colors or a resampled preview.

For a slice without the 3D sampled field, `scene.set {mode:"mesh"}` hides that
preview without generating a mesh. Use `field.preview` to return explicitly to
volume/raycast. Existing meshes retain their independent visibility controls.
Numeric keys for those existing modes describe their actual ±isovalue/opacity
transfer; only a continuous slice colormap has a conventional continuous colorbar.

### Bounded output and persistence

Read results through summaries/pages; the connector grows its frame buffer fallibly.
`table.export` with an authorized new native `.csv` path returns a file receipt.
Without a path it returns `{text,offset,totalCharacters,mimeType,name}`; browser
clients concatenate chunks using the returned offset/text length. Omitted
`length` defaults to 1,048,576 UTF-16 code units; explicit positive safe-integer
lengths may be larger. Offsets are UTF-16 positions;
advance by the actual returned `text.length`, not the requested length. Chunk
boundaries preserve Unicode surrogate pairs (a one-unit request can return two
units), and an offset inside a pair is rejected with `invalid_arguments`.
Never mistake that text receipt for a file written
to the user's disk. Generated CSV is UTF-8, allocation-driven, correctly escaped
and neutralizes untrusted textual spreadsheet formulas while preserving numbers.

Save persists named selections, annotations, molecular meshes and quantitative
definitions/f64 caches/interpretations/local appearance. It does not persist
active selection/pick mode, camera, palette, AO, background, shaders or biological
filters. A matching new reader is required; published 0.8.0 rejects the unfamiliar
required native capabilities rather than dropping them silently.

Scientific records and caches are allocation-driven; no fixed count or memory
allowance applies. There is no
silent coarsening or source-data loss. Finite f64 data can remain numerically
valid even when a specific f32 depiction is unavailable; inspect `renderingWarning`.

## Revisions and jobs

`revision` identifies the accepted document state, not a separate camera frame
counter. Read fresh state and pass its `revision` as `expectedRevision` for a
document-dependent mutation. If it changed, inspect state again rather than
blindly forcing a retry. A camera/background/session change need not increment
the document revision. Current native persistence is unchanged; a native Save
is not a promise to persist every transient camera/AO/shader/background setting.

`field.preview`, `surfaces.generate`, sampling-dependent `field.select`, and the
0.10.0 `selection.neighborhood`, `molecularSurfaces.generate`, `analysis.create`
return `{jobId,status:"accepted"}`. Acceptance is not completion. `job.get`
returns `jobId`, `operation`, `status`, optional `progress`, and a terminal
`result` or structured `error`. Status is `accepted`, `running`, `completed`,
`failed` or `cancelled`. Progress may contain `stage` and `counts` with completed
and total work. Jobs are retained for the current controller lifetime;
they are not durable across app restart.

Use `--wait` or poll `job.get` before describing a calculation as completed.
`job.cancel` only targets the named owned job and waits for cleanup. It does not
stop the app or cancel unrelated UI/converter work. A completed publication is
the cancellation boundary: cancelling it later does not undo saved geometry.
Closing a client connection or reaching a client wait deadline does not itself
cancel an accepted job. `document.open` and `document.save` currently return
their final result through the ordinary RPC, rather than a job receipt.

## Native files and browser qualification

Native document/image paths must be absolute and representable by the OS, inside an
explicit granted root, with no `..` traversal or symlink components. Source
files read through control are protected for that broker's lifetime; save/export
cannot replace them through another path or hard-link alias. The app also passes
its protected imported-source hint into native Save.
Only regular input files are accepted; directories, FIFOs and other special files
are rejected. Existing export paths are probed without blocking on a FIFO and
must still satisfy the selected publication and source-protection policy.

Control writes default to **atomic no-clobber**: choose a new `.eigenvista`,
`.png` or `.csv` filename. Version 0.10.5 also permits explicit
native `overwrite:true` for `document.save`, `image.export` and `table.export`.
It authorizes atomic replacement of existing or late-created destinations.
Source paths/hard-link aliases and scoped-path validation remain protected.
On the qualified Mac ExFAT volume only the explicit replacement mode works;
default no-clobber creation still reports unsupported filesystem capability.
Browser byte/text exports reject replacement. The original 0.10.2 package
rejects true; inspect live schemas/capabilities before using the new option.
Native document writes decode/validate the encoded archive before publication;
PNG writes validate the PNG structure/checksums. CSV accepts complete generated
UTF-8 text and retains the same scoped/source-protected publication policy; it
does not expose an unrestricted text writer. Default no-clobber writes fail on
filesystems lacking hard-link publication support rather than silently choosing
replacement or exposing a partial final file.
A file receipt is `{path,bytes}`; native Save adds `saved`, `current`,
`snapshotRevision` and `revision`, while PNG export adds dimensions/MIME type.
PNG `revision` identifies the document at capture; `currentRevision` identifies
the accepted document when the receipt is returned. They can differ if the user
edits the document while the native image is being written.

For browser qualification, explicitly open the source web preview with
`http://127.0.0.1:5178/?control=1`. It publishes
`window.eigenvistaControl.request(method, params = {})`; ordinary browser startup
does not. This is an in-page Promise API, not a network endpoint or a new GUI.
Browser requests resolve to results and reject with a structured `ControlError`.

```js
const api = window.eigenvistaControl;
const state = await api.request("app.state");
await api.request("scene.set", {
  backgroundColor: "#17232d",
  expectedRevision: state.revision,
});
const image = await api.request("image.export", { transparent: true });
// image.dataUrl, image.width, image.height, image.mimeType,
// image.revision (capture), image.currentRevision (response)
```

Browser imports require `{name,bytes}` where `bytes` is an array of byte
integers; native filesystem `path` is unavailable. Browser Save returns
`{revision,saved:false,name,bytes,byteLength}` for the external harness to store.
It does not force a download or clear dirty state, because encoding is not proof
that the harness saved anything. Browser PNG export similarly returns its data
URL instead of downloading it. Large results use actual runtime allocations; no separate browser-result byte
allowance applies.

## Wire protocol, errors and limits

The native transport is **raw loopback TCP, newline-delimited JSON-RPC 2.0**,
identified by `transport: "tcp-ndjson-jsonrpc2"` in the descriptor. It is not HTTP,
REST, WebSocket or MCP; curl and an MCP client cannot connect directly. An MCP
adapter could later reuse the application API, but none is part of this increment.

Each TCP connection carries one UTF-8 JSON request object followed by a newline,
and one response. Requests contain `jsonrpc: "2.0"`, a string/integer `id`,
`method`, object `params` (default `{}`) and `auth` from the private descriptor.
Responses have matching `jsonrpc`/`id` and either `result` or
`error: {code,message,data?}`. Some envelope/auth failures have `id: null`.
Batches and notification calls without IDs are unsupported. Caller request IDs,
native bridge correlation IDs and application job IDs are separate concepts.

Use `error.data.kind` to classify failures; native and frontend layers can reuse
numeric codes for different kinds. Typical outcomes include `invalid_arguments`,
`invalid_params`, `method_not_found`, `busy`, `stale_document`, `permission_required`,
`not_found`, `operation_failed`, `allocation_failed`, `scope_denied`, `source_protected`,
`destination_exists`, `validation_error`, `limit_exceeded`, `unauthorized`,
`not_ready`, `timeout`, `connection_failed` and `unsupported`.

An unsaved-document replacement fails with `permission_required` unless
`discardUnsaved: true` is already authorized by the user. Busy/stale/failed
operations are explicit failures. A transport timeout has an uncertain outcome:
inspect current state/jobs and output files before repeating a mutation.

Version 0.10.5 has no application byte/count ceilings for frames, files,
encoded Save results, PNG/CSV artifacts, palettes, selectors or orbital batches.
Pagination defaults to 100 records but accepts larger positive safe integers.
Jobs remain discoverable for the controller lifetime. Grid presets are advisory;
requested resolutions are safe integers of at least two. Discover
`allocationPolicy` and `gridResolutionPresets` from `app.capabilities`.
Native requests wait for completion or controller invalidation;
there is no default processing or total-transfer cutoff. Socket inactivity is
distinct from calculation duration. The Rust client may use an explicitly chosen
deadline; CLI `--wait` remains a caller-selected job wait and does not cancel it.
On macOS 14+, the desktop's supported background scheduling setting keeps
scientific/Save workers runnable while the window is hidden. Older macOS does
not implement that setting; OS sleep or process termination can still interrupt
work. A transport wait does not keep the OS awake.
A client may half-close its TCP sending side after the complete request and
continue reading the reply. Abandoning the connection does not cancel an accepted
operation. Pending reply state is released when the operation completes or its
controller is invalidated. Authentication, scoped file access and default no-clobber
publication remain. Real runtime/address/format/device constraints
still apply; see [allocation policy](allocation-policy.md).

Implementation entry points are [controller/schemas](../app/src/control.ts),
[App integration](../app/src/App.tsx), [viewport port](../app/src/viewportControl.ts),
[biological presentation](../app/src/control/presentation.ts),
[native attachment](../app/src-tauri/src/control.rs),
[broker/client/files](../crates/eigenvista-control/src/lib.rs) and the
[external demonstration](../tools/control-harness/demo.mjs).
