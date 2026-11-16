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

Use EigenVista 0.8.0 or newer, the first connector-enabled package. Older 0.7.2
apps and tester ZIPs predate this package layout. If the bundled helper is absent or the connected app lacks
a requested capability, explain what is missing and obtain the appropriate
prebuilt package within the user's authorization.

The scientific-inspection extension is **unreleased in 0.9.0** on
`codex/scientific-inspection`. Published 0.8.0 binaries lack its measurement,
SES/SAS and quantitative-field operations. Discover the connected app's actual
schemas and use a matching 0.9.0 test binary/helper; never infer these features
from the version string alone.

## Work from the user's goal

Translate ordinary requests such as “show the HOMO,” “load Pastel” and “focus
chain A” into connector actions. Do not ask the user for method names, internal
IDs, revisions or JSON, and do not hand palette or biological-display actions
back to the user as GUI chores. This also applies to selections, measurements,
labels, neighborhoods, radii/SES/SAS settings, field meanings/units, probes,
planes/contours, profiles, keys and CSV/native/PNG exports. Every new control has
an application API path; missing support means a mismatched/older app, not an
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
Use typed pick attribution rather than parsing inspection text or compact display
indices. Read full paginated molecular-surface warnings when shortened previews
are insufficient. A shader can target one returned quantum/molecular surface ID
or all meshes; preserve its current target when only updating uniforms.
Save accepted annotations, molecular meshes and field caches in a matching native
document; active selections and full-scene settings remain transient.

Use `expectedRevision` for document-dependent changes, inspect fresh state after
stale/busy/uncertain outcomes, and cancel only the operation owned by the current
request. Preserve original inputs and never overwrite an existing output.

Keep the app open unless the user asks otherwise. Report the completed result,
actual artifact paths and any remaining limitation in plain language. An agent
without an image viewer must say that it has not visually inspected the export.
