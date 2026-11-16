---
name: eigenvista-control
description: Use an installed EigenVista app to inspect molecular data, render orbitals or densities, adjust molecular and protein views, and export images through its local connector.
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

## Work from the user's goal

Translate ordinary requests such as “show the HOMO,” “load Pastel” and “focus
chain A” into connector actions. Do not ask the user for method names, internal
IDs, revisions or JSON, and do not hand palette or biological-display actions
back to the user as GUI chores.

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

Use `expectedRevision` for document-dependent changes, inspect fresh state after
stale/busy/uncertain outcomes, and cancel only the operation owned by the current
request. Preserve original inputs and never overwrite an existing output.

Keep the app open unless the user asks otherwise. Report the completed result,
actual artifact paths and any remaining limitation in plain language. An agent
without an image viewer must say that it has not visually inspected the export.
