# Shared application control for external harnesses

- **Status:** implemented and locally verified on macOS; unreleased working tree.
- **Date:** 16 November 2026, Australia/Perth.
- **Issue:** [#78](https://github.com/uvar-apps/eigenvista/issues/78).
- **Baseline:** main `d48a8111c5908559ac7842ac95052201e95b7cf7`, version 0.7.2.

## Decision and scope

Implement the shared application API and an external connector first, as selected
by the user after the [AI integration research](../research/2026-11-15-ai-console-and-agent-api.md).
Do not add an embedded console, model provider, inference SDK, scripting runtime,
visible GUI controls or presentation changes.

The controller operates the actual React document, scientific worker and Three.js
viewport. It wraps the same existing operations as the GUI, preserving numerical
validation, source identity, resource limits, cancellation and native-save rules.
The external harness provides any reasoning or model connection itself.

## Components

1. A typed application controller validates requests and returns bounded state,
   metadata, explicit errors and asynchronous calculation jobs.
2. A viewport port exposes camera/background/capture without introducing controls
   or changing renderer ownership. Existing toolbar and API captures share the
   final-frame/AO/transparent-background path.
3. A Tauri bridge correlates local requests with the frontend controller; a native
   server does not create a separate molecular document or scientific engine.
4. An opt-in local JSON-RPC connection and Rust `eigenvista-ctl` client let an
   external harness invoke the API. Browser harness qualification uses a separate
   explicit `?control=1` opt-in entry point.

Normal startup opens no control listener and exposes no browser global API.
Enabling the native service requires an explicit connection-file argument and
file-root grants. The connection file contains a per-start token and instance
identity, is private on qualified systems and must never appear in model output,
logs, source control or molecular documents.

## Transport decision

Use bounded newline-delimited JSON-RPC 2.0 over authenticated IPv4 loopback TCP
for the first external connector. This provides a single standard-library client
and server transport without adding a web server or opening the renderer CSP.
It is not an HTTP endpoint. A private socket/pipe remains a possible alternative;
REST, MCP and other adapters can use the same application semantics later.

Requests and responses have explicit IDs. Notifications and batches are not
accepted as mutation requests. Message sizes, client concurrency, idle time and
frontend response waits are bounded. The API itself controls operation ownership;
a TCP request ID is not a scientific-job ID or an idempotency guarantee.

The initial qualified native platform is macOS. File-grant enforcement must
address symlinks and filesystem races, not just lexical `startsWith` checks.
Other native platforms must fail explicit control activation where the required
private-file/access guarantees are not implemented or qualified; ordinary GUI
startup remains independent of the connector.

## Application semantics

- Queries return summaries, IDs, energies/occupations, field kinds and saved
  surface metadata. They do not return large quantum arrays or meshes.
- Import uses authorized native files or explicit browser-provided bytes.
  Replacing dirty work requires an explicit discard decision, not an invisible
  confirmation dialog.
- Direct sampled previews do not require marching cubes. Mesh generation retains
  current all-or-nothing publication and allocation guards.
- Jobs expose real progress, terminal results and cancellation. Cancel only work
  owned by the active control operation; preserve prior geometry and other owners.
- Mutations can require the current accepted document revision. UI/session state
  is read only after React has committed its setters.
- Camera, AO, shaders, background, preview mode and biological display remain
  subject to existing transient/persistent boundaries. API access does not change
  the native document format.
- Captures wait for applied scene state and use the existing final draw/read path.
  Transparent export restores the exact normal background and renderer state.
- Native saves validate the document, remain within granted roots, protect the
  imported source and preserve atomic/no-clobber behavior. Browser byte export
  reports `saved: false` and retains dirty state because returning bytes does not
  establish that the harness wrote a file.

## Verification and delivery boundary

The [living handoff](../handoff.md#shared-application-control-api-16-november-2026)
records completed checks: 282 default Rust tests, eight desktop tests, strict
Clippy, WASM/TypeScript/production build, 540 browser cases and 13 packaging checks,
plus the actual native external harness, file/authentication negatives and
independent image/document inspection. Ten selected API cases also passed against
the production web build. The implementation includes the
[API reference](../application-control.md), external harness and coding-agent skill.
The requirements below remain the acceptance criteria for future changes.

Qualify the API through real browser/WASM operations in Chromium and WebKit and
through a client attached to a running native application. Include invalid/stale
requests, sampling without meshes, complete batches, current-worker cancellation,
camera effects, PNG alpha/restoration, file grants/authentication and native saves.
Retain the pre-change GUI inventory/captures and compare normal startup.

Run applicable local Rust/default/desktop checks, strict Clippy, WASM/TypeScript
build, the complete browser suites and packaging-support checks on the final
source. Record exact evidence and platform gaps in the living handoff. This work
does not authorize a version bump, tag, commit, push or release, and it does not
update previously published application packages.
