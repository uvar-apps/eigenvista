---
name: eigenvista-control
description: Use an installed EigenVista app to inspect molecules, measure geometry, create SES/SAS surfaces, analyze scalar fields, render orbitals/densities and export figures or numerical tables through its local connector.
---

# EigenVista control

Use the installed EigenVista app and its bundled `eigenvista-ctl` helper. Read
[reference.md](reference.md) for package locations, connection setup, the method
catalog and scientific/display contracts. This folder is self-contained: retain
both files when copying or registering it with an agent.

The app package supplies the connector; this skill supplies agent instructions.
Reading these files is sufficient for direct use by a terminal-capable agent,
but does not install the app, start a connection or register a skill with the
chosen agent. Skill registration is optional and follows that agent's own
mechanism. No additional MCP service or provider SDK is required.

Use the current EigenVista 0.10.6 package and its bundled helper. The connector
was introduced in 0.8.0; older 0.7.2 apps and tester ZIPs predate this package
layout. If the bundled helper is absent or the connected app lacks
a requested capability, explain what is missing and obtain the appropriate
prebuilt package within the user's authorization.

The scientific-inspection extension was introduced in **0.10.0**, including
measurements, SES/SAS and quantitative-field operations. Older 0.8.0 binaries lack these
operations. Discover the connected app's actual schemas and use the application
and helper supplied together; never infer features from the version string alone.

Version 0.10.6 retains the allocation-driven workloads and smooth camera-relative
lighting introduced in 0.10.1. Request the user's intended resolution, orbital batch or SES spacing;
do not impose an estimated memory allowance, truncate results or silently reduce
detail. Actual allocation, runtime, format and device constraints still apply.
Wait for completion or cancel the owned job; preserve earlier accepted results
after a recoverable failure. An OS or browser process termination is not always
recoverable, so keep important work saved before very large calculations.

## Work from the user's goal

Translate ordinary requests such as “show the HOMO,” “load Pastel” and “focus
chain A” into connector actions. Do not ask the user for method names, internal
IDs, revisions or JSON, and do not hand palette or biological-display actions
back to the user as GUI chores. This also applies to selections, measurements,
labels, neighborhoods, radii/SES/SAS settings, field meanings/units, probes,
planes/contours, profiles, keys and CSV/native/PNG exports. These scientific
operations have application API paths; missing support means a mismatched/older app, not an
instruction to make the user perform the action manually.

1. Use the app and connection identified by the user or created during the
   authorized setup. Preserve an existing app/window; starting a separate
   controlled instance requires authorization already present in the task.
2. Discover `app.capabilities`, then inspect `app.state`. Check that the intended
   molecule and required controls are available before acting. Keep the private
   connection file's contents out of chat, logs and model-visible tool output.
3. Use only approved data/palette/output folders. When the user authorizes URL
   inputs, download them into an approved input folder, then open the local file
   through the connector. Do not bypass a refused path with another file tool.
4. Preserve unsaved work. Save to a fresh native filename before replacement,
   or obtain an explicit discard instruction. Never silently force replacement.
5. Discover fields and biological identities from the app. Use returned IDs and
   chain indices internally; do not guess scientific meaning from labels or
   infer missing orbitals, densities or secondary-structure assignments.
6. Wait for calculations and image exports to complete. Inspect actual PNGs with
   an image viewer before judging a view. Restore the previous camera after
   geometry regeneration when the user wants a matched comparison.
7. Save new molecular documents and images into the approved output folder.
   Record transient appearance settings separately: a native document does not
   preserve the camera, palette, AO, background, shader or biological filters.

For inspection work, preserve original zero-based source identity and ordered
measurement picks internally. Discover the exact ligand copy before selecting
neighbors; proximity is not assigned chemical interaction. Unknown cube meanings
stay unspecified unless the user supplies an interpretation. Numerical values
come from authoritative f64 sources, not GPU colors. SES/SAS use explicit radii,
probe and spacing; a selected subset is an isolated object. Read back changed
settings/results, inspect exported artifacts, and wait/cancel only your owned jobs.
For plane edits since 0.10.2, discover whether `analysis.create` accepts
`supersede`; use the same analysis ID with a complete plane definition and
`supersede:true` for latest-request replacement. Older 0.10.1 binaries lack
this option. It only supersedes a replaceable job for that plane/source, never unrelated
work. Keep requested resolution, appearance and scientific units; poll the
returned job and cancel only your owned receipt. See the reference for revisions
and publication boundaries.
Molecular-surface jobs report real phase-local completion and active elapsed
time. Report the phase and measured mesh progress without guessing an overall
percentage or ETA. Selected atoms have gold reticles and ordinary inspection
has cyan rings; these are transient presentation cues and appear in exported PNGs.
Use typed pick attribution rather than parsing inspection text or compact display
indices. Read complete molecular-surface diagnostics from summaries or the
paginated warning query. A shader can target one returned quantum/molecular
surface ID or all meshes; preserve its current target when only updating uniforms.
Save accepted annotations, molecular meshes and field caches in a matching native
document; active selections and full-scene settings remain transient.

Use `expectedRevision` for document-dependent changes, inspect fresh state after
stale/busy/uncertain outcomes, and cancel only the operation owned by the current
request. Preserve original inputs and use new output names by default. Only use
native `overwrite:true` when the connected schema supports it and the user has
explicitly authorized replacing that output. It can replace a destination
created during export too; do not silently enable it to work around ExFAT's
unsupported no-clobber mode. A normal request to save a result does not imply
replacement permission.

Keep the app open unless the user asks otherwise. Report the completed result,
actual artifact paths and any remaining limitation in plain language. An agent
without an image viewer must say that it has not visually inspected the export.
