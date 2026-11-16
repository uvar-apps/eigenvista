# Application control API

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
catalog to 28 methods. Discover the connected instance's catalog before using
these additions; an older source-built instance may lack them.

For manual installation, a setup prompt and interaction instructions for Codex,
Claude Code, Pi, OpenCode and generic local agents, start with the
[connector guide](ai-connector.md). The [AI website section](https://uvar-apps.github.io/eigenvista/ai.html)
contains the four prompt-driven tutorials. This document is the method and
transport reference for agents and client authors. Users can ask for palette,
coloring, focus and rendering changes in ordinary language; the agent translates
the request into these methods without asking the user to learn method names.

There is no embedded AI console, model client, API-key requirement, general script
runtime or new visible GUI. An external agent supplies its own model and tools.
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
whole seconds from 0 to 86400. A wait timeout does **not** cancel the calculation.
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

Choose a fresh output directory for each run: writes never overwrite existing
files. The harness does not authorize discarding dirty work or widening roots.
Inspect the generated images with the external agent's image viewer when
assessing composition and rendering quality.

## Discover methods and state

Start with `app.capabilities`. Its result includes:

- `apiVersion: 1` and the current `instanceId`;
- `methods`, each containing `method`, `description` and `inputSchema`;
- `limits`, including supported `gridResolutions`;
- `files: {nativePaths, browserBytes, overwrite: false}` and `errorKinds`.

Discover schemas from the connected app rather than assuming another version's
catalog. Arguments are strict objects: unknown keys, nonfinite numbers, invalid
types and values outside supported bounds are rejected rather than coerced.

`app.state` returns `revision`, a bounded `document` summary, `dirty`, `busy`,
`progress`, `view`, `mode`, `resolution`, `shading`, `ambientOcclusion`, `shader`,
`palette`, `volumeQuality`, `structureDisplay`, `camera` and `backgroundColor`.
During renderer startup, camera/background may be null while state remains
queryable. Scientific coefficient, grid and mesh arrays are not returned.
`palette` reports `{custom,name}`. The biological `structureDisplay` summary
reports color mode, bounded hidden-chain selectors/count, hidden component kinds,
isolation, selected-residue count, bounded chain styles/count, component styles
and visible-atom count. It does not return per-atom visibility, residue selections
or the focus atom-index array. Record requested residue-range endpoints separately
if they will be needed to recreate the presentation.

Use IDs returned by the API. Human labels do not establish scientific meaning:
for example, an occupation-derived density may have `kind: "density"` and
`quantity: "total"` without the word “total” in its label. Unknown cube scalar
meaning remains unspecified; opening a cube does not reconstruct orbitals.
Document, field and surface IDs have a 512-character control selector limit.
Overlong identifiers produce `limit_exceeded`; they are never silently truncated
into a different selector. Display labels and other descriptive text may be
shortened in metadata responses.

## Method reference

Document, field, surface, palette, biological-presentation, scene, shader, camera
and image mutations accept optional `expectedRevision`; query methods and
`job.cancel` do not accept it.
All parameters shown as optional may be omitted, subject to native/browser file
rules below. Results may include additional bounded metadata.

| Method | Parameters | Result |
| --- | --- | --- |
| `app.capabilities` | `{}` | Version, instance, schemas, limits and host/file capabilities |
| `app.state` | `{}` | Accepted document/presentation state |
| `fields.list` | `offset?`, `limit?` | `{revision,total,offset,items}`: orbitals, densities, then stored grids |
| `surfaces.list` | `{}` | `{revision,total,items}`: IDs, field IDs, isovalues, visibility, counts and source hashes |
| `structure.list` | `offset?`, `limit?` | Chain metadata/counts, component atom counts and `secondarySource` |
| `palette.load` | Native: `path`; browser: `name`, `text` | Applied `{custom,name}` palette summary |
| `palette.reset` | `{}` | Bundled-default palette summary |
| `structure.set` | Biological session patch described below | Applied display summary and actual camera |
| `structure.focus` | `target` (`"visible"` or `"chain"`); `chainIndex` only for `"chain"` | Display summary and focused camera |
| `document.open` | Native: `path`; browser: `name`, `bytes`; `discardUnsaved?` | Imported document summary, import `report`, `previewError`, revision |
| `document.save` | Native: `path`; `overwrite?: false` | Native file receipt or browser encoded bytes |
| `field.select` | `fieldId` | Selected field/revision, or a job receipt if sampling is required |
| `field.preview` | `fieldId`, `mode: "volume" | "raycast"`, `resolution` | Sampling-only job receipt; no marching cubes |
| `surfaces.generate` | `fieldIds`, positive `isovalue`, `resolution` | Mesh-generation job receipt |
| `surfaces.set_visibility` | `surfaceId`, `visible` | Applied visibility/revision |
| `surfaces.remove` | `surfaceId` | Removal/revision |
| `scene.set` | Any supported appearance patch below | Applied view/session settings and revision |
| `shader.apply` | `preset: "surface-clip" | "x-ray"`, `target?: "all"`, `uniforms?`, `transparency?` | Applied shader metadata/revision |
| `shader.set_uniforms` | `uniforms`, `target?: "all"`, `transparency?` | Applied declared uniforms/revision |
| `shader.clear` | `{}` | Cleared shader/revision |
| `camera.get` | `{}` | `{revision,position,target,up}` |
| `camera.fit` | `{}` | Applied camera/revision |
| `camera.set` | `position`, `target`, `up?` | Applied camera/revision |
| `camera.orbit` | `horizontalDegrees`, `verticalDegrees` | Applied camera/revision |
| `camera.zoom` | Positive `factor` | Applied camera/revision |
| `image.export` | Native: `path`; `transparent?`, `overwrite?: false` | PNG file receipt or browser PNG data URL, dimensions, `revision`, `currentRevision` |
| `job.get` | `jobId` | Operation status, progress and terminal result/error |
| `job.cancel` | `jobId` | Job state after owned cancellation/cleanup |

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
unavailable. Both paths have a **256 KiB UTF-8 input budget**. Native loading
passes that bound to the broker's `read_with_limit` before reserving the file
buffer, then decodes strict UTF-8. A large native palette is not first read under
the general 128 MiB molecular-file limit. Browser text is checked by UTF-8 byte
length as well as schema length.

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
| `colorMode` | `"element"`, `"chain"`, `"entity"` or `"secondary"` |
| `hiddenChains` | Replace hidden-chain indices with a distinct list of at most 512 existing chain indices |
| `hiddenKinds` | Replace hidden component kinds with a distinct list from the advertised component enum |
| `isolatedChain` | Existing chain index to isolate, or `null` to stop isolation |
| `residueRange` | `{chainIndex,first,last}` using deposited residue identifiers, or `null` to clear the range |
| `chainStyles` | At most 512 distinct `{chainIndex,representation}` patches; `null` representation removes an override |
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
protein or a chain without protein residues. Active chain overrides are also
capped at 512. These are bounded depiction choices, not changes to atom,
connectivity, biological-identity or scientific arrays.

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

## Revisions and jobs

`revision` identifies the accepted document state, not a separate camera frame
counter. Read fresh state and pass its `revision` as `expectedRevision` for a
document-dependent mutation. If it changed, inspect state again rather than
blindly forcing a retry. A camera/background/session change need not increment
the document revision. Current native persistence is unchanged; a native Save
is not a promise to persist every transient camera/AO/shader/background setting.

`field.preview`, `surfaces.generate`, and sampling-dependent `field.select`
return `{jobId,status:"accepted"}`. Acceptance is not completion. `job.get`
returns `jobId`, `operation`, `status`, optional `progress`, and a terminal
`result` or structured `error`. Status is `accepted`, `running`, `completed`,
`failed` or `cancelled`. Progress may contain `stage` and `counts` with completed
and total work. Jobs are retained in bounded memory for the current app instance;
they are not durable across app restart, and old terminal jobs can expire.

Use `--wait` or poll `job.get` before describing a calculation as completed.
`job.cancel` only targets the named owned job and waits for cleanup. It does not
stop the app or cancel unrelated UI/converter work. A completed publication is
the cancellation boundary: cancelling it later does not undo saved geometry.
Closing a client connection or reaching a client wait deadline does not itself
cancel an accepted job. `document.open` and `document.save` currently return
their final result through the ordinary RPC, rather than a job receipt.

## Native files and browser qualification

Native document/image paths must be absolute, at most 4096 bytes, inside an
explicit granted root, with no `..` traversal or symlink components. Source
files read through control are protected for that broker's lifetime; save/export
cannot replace them through another path or hard-link alias. The app also passes
its protected imported-source hint into native Save.
Only regular input files are accepted; directories, FIFOs and other special files
are rejected. Existing export paths are probed without blocking on a FIFO and
must still satisfy the no-clobber policy.

All control writes are **atomic no-clobber**: choose a new `.eigenvista` or `.png`
filename. `overwrite: true` is rejected even if a caller supplies it intentionally.
Native document writes decode/validate the encoded archive before publication;
PNG writes validate the PNG structure/checksums. Filesystems lacking the required
hard-link publication support fail rather than falling back to a weaker write.
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

Browser imports require `{name,bytes}` where `bytes` is a bounded array of byte
integers; native filesystem `path` is unavailable. Browser Save returns
`{revision,saved:false,name,bytes,byteLength}` for the external harness to store.
It does not force a download or clear dirty state, because encoding is not proof
that the harness saved anything. Browser PNG export similarly returns its data
URL instead of downloading it. Use the normal Save action for documents exceeding
the browser control result budget.

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
`not_found`, `operation_failed`, `scope_denied`, `source_protected`,
`destination_exists`, `validation_error`, `limit_exceeded`, `unauthorized`,
`not_ready`, `timeout`, `connection_failed` and `unsupported`.

An unsaved-document replacement fails with `permission_required` unless
`discardUnsaved: true` is already authorized by the user. Busy/stale/failed
operations are explicit failures. A transport timeout has an uncertain outcome:
inspect current state/jobs and output files before repeating a mutation.

| Bound | Current value |
| --- | --- |
| Raw request/response frame | 4 MiB; request metadata/envelope also count |
| Concurrent native client connections | 4 |
| Native frontend response deadline | 60 seconds |
| Socket read/write deadline | 10 seconds; slow trickling does not reset it |
| Connection descriptor | At most 16 KiB; private regular file |
| Granted native roots | 1–16 |
| Native file read/encoded document write | 128 MiB, with additional format limits |
| Atom palette input | 256 KiB UTF-8; native size bound applied before file-buffer allocation |
| Browser encoded Save result | 8 MiB |
| PNG data URL | 16 MiB of characters, before base64 decoding |
| Metadata page size | 1–100; default 100 |
| Document/field/surface selector | At most 512 characters; explicit rejection, no ID truncation |
| Biological hidden-chain/style selectors | At most 512 per request; at most 512 active chain styles |
| Orbital mesh batch | At most 32 distinct orbital IDs; density/grid separately |
| Retained jobs | 32, with terminal entries evicted first |
| Grid resolutions | 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, 256 |

These are rejection bounds, not performance or scientific-accuracy promises.
The scientific/import/allocation limits still apply, including distinct bounds
for authoritative stored grids. A large JSON result can hit the native wire
limit even when the underlying document remains valid; native artifact methods
return file receipts rather than transporting full molecular arrays or PNG data
through that connection.

Implementation entry points are [controller/schemas](../app/src/control.ts),
[App integration](../app/src/App.tsx), [viewport port](../app/src/viewportControl.ts),
[biological presentation](../app/src/control/presentation.ts),
[native attachment](../app/src-tauri/src/control.rs),
[broker/client/files](../crates/eigenvista-control/src/lib.rs) and the
[external demonstration](../tools/control-harness/demo.mjs).
