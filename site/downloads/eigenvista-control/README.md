# Use the installed EigenVista app with your agent

For the Linux x86_64 package, use the
[Linux setup and connector instructions](https://uvar-apps.github.io/eigenvista/ai-install.html). Its launcher is
`share/eigenvista/AI-connector/Start AI connection.sh` and its helper is
`bin/eigenvista-ctl`. The detailed Mac paths and setup prompt below apply to
the Apple Silicon package; use the linked Linux instructions for that platform.

Ask your agent to open a molecule, find an orbital, load a palette, focus on a
protein chain or export a figure. It operates the same EigenVista window you
see. Keep using Codex Desktop or CLI, Claude Code, Pi, OpenCode, or another
agent with local terminal/file access. An image viewer lets the agent inspect
and show actual exported pictures.

**EigenVista 0.10.6 includes the AI connector.** For package availability and the
Apple Silicon Mac download, use the [0.10.6 release page](https://github.com/uvar-apps/eigenvista/releases/tag/v0.10.6).
The app ships its prebuilt connection helper, launcher, instructions, examples
and palettes. Check the included files below as well as the version; older
packages such as 0.7.2 do not include them. If tools are missing, the agent should
explain that and point you to the official release page.

**Scientific inspection, introduced in 0.10.0:** geometry measurements/labels and ligand neighborhoods,
SES/SAS molecular surfaces, and quantitative field inspection are available
through the connector. Older 0.8.0 downloads lack these additions. Use the
application and helper supplied together; your agent should check the connected
app's available features. Setup starts from the downloaded app, without a
source checkout.

Version 0.10.2 adds visible picking cues, automatic field-plane updates and
live molecular-surface progress. It retains smooth camera-relative lighting and
[allocation-driven calculations and files](allocation-policy.md). Ask for the
desired grid resolution or SES spacing in ordinary language. The application
keeps that request rather than reducing detail to fit an estimated memory budget;
actual runtime/device constraints and recoverable allocation errors still apply.

EigenVista 0.10.6 groups tools into **Molecule**, **Fields**, **Surfaces**
and **Appearance**. You do not have to operate them first. Ask for the outcome;
the agent shares their document and calculations. Pane position and Zen are
local presentation choices, not connector actions.

For the optional accessibility palette, download
[accessible-elements.json](https://uvar-apps.github.io/eigenvista/downloads/accessible-elements.json)
into an authorized input folder, or use the copy included with 0.10.6 in the
ZIP's `Palettes/` directory or the app's connector `palettes/` directory.
Then ask: “Load Accessible elements, use element coloring, turn on ambient
occlusion, and save a transparent PNG of this molecule.” The agent can load the
palette directly; no separate GUI step is required. The 0.10.6 package includes
the palette; the original 0.10.2 ZIP predates it. Its fourteen-element coverage
and remaining color ambiguities are documented in the
[palette guide](https://github.com/uvar-apps/eigenvista/blob/main/palettes/README.md).

Version 0.10.6 also offers an explicit replacement mode for exports
to ExFAT drives. Ask for a new filename by default. If you want to replace a
particular output, tell the agent explicitly; replacement may also replace a
file created at that destination while export is running. Imported source files
remain protected. An older app may not support this mode, so the agent must
check the connected app's features. The new Save coordination also reports when
an inspection edit is still applying; wait for completion before saving again.

The website has the same [overview](https://uvar-apps.github.io/eigenvista/ai.html),
[installed-app setup](https://uvar-apps.github.io/eigenvista/ai-install.html)
and [everyday requests](https://uvar-apps.github.io/eigenvista/ai-guide.html).
The overview includes an actual app export from a recorded external-agent
session: the C₇H₁₀ HOMO (MO 26) on a 128³ grid with an X-ray finish.

## Choose the agent you already use

The agent needs access to this Mac's terminal and files. A cloud-only chat
without that access cannot control the local app. Keep an existing working
installation; choose only one agent if you need to install one.

| Agent | How to use it | Official setup |
| --- | --- | --- |
| Codex Desktop | Use its local terminal-capable chat. A separate Codex CLI installation is optional. | [Codex setup](https://developers.openai.com/codex/quickstart/) · [Desktop terminal](https://learn.chatgpt.com/docs/integrated-terminal) |
| Codex CLI | Use your existing local Codex terminal session and give it the setup prompt. | [Codex CLI](https://learn.chatgpt.com/docs/codex/cli) |
| Claude Code | Use a local session with permission to read the app and run its helper. | [Claude Code](https://code.claude.com/docs/en/overview) |
| Pi | Use your local Pi session with your chosen model and terminal tools. | [Pi](https://github.com/earendil-works/pi/tree/main/packages/coding-agent) |
| OpenCode | Use a local session and your existing model connection. | [OpenCode](https://opencode.ai/docs/) |
| Other local agent | Use the same packaged instructions and helper through its local terminal tools. | Follow that agent's official setup and model sign-in instructions. |

Agent setup links were checked against primary documentation on
16 November 2026. Accounts, subscriptions, authentication and model support
belong to the chosen agent. There is no model account or chat box inside
EigenVista. A compatible app includes the helper and instructions together,
so no separate MCP plugin or skill registration is required.

## What the compatible app includes

Install the Mac package from the
[official release page](https://github.com/uvar-apps/eigenvista/releases), or use
the compatible preview package provided to you. Follow the
[normal Mac installation guide](https://uvar-apps.github.io/eigenvista/install.html).
These files must be present inside EigenVista.app:

| Inside EigenVista.app | Purpose |
| --- | --- |
| `Contents/MacOS/eigenvista-ctl` | The prebuilt connection helper used by the agent. |
| `Contents/Resources/AI-connector/Start AI connection.command` | The packaged launcher for an enabled session. |
| `Contents/Resources/AI-connector/SKILL.md` and `reference.md` | Standalone instructions the agent reads directly. |
| `Contents/Resources/AI-connector/README.md` | This portable user guide. |
| `Contents/Resources/AI-connector/examples/` and `palettes/` | Ready-to-use molecular examples and atom palettes. |

If the helper or launcher is missing, the app package is not compatible.
Downloading instructions alone cannot enable an older app.

## Manual setup: open the packaged launcher

1. Place the compatible **EigenVista.app** in Applications, or keep its actual
   installed location.
2. In Finder, right-click the app and choose **Show Package Contents**.
3. Open **Contents → Resources → AI-connector** and double-click
   **Start AI connection.command**.
4. Keep the Terminal window open while this session runs. The app runs in the
   foreground there.
5. Give your agent the nonsecret session note, or the displayed app, helper,
   input, output and connection filenames. Never paste the connection file's
   contents.

If the app is in Applications, the equivalent Terminal command is:

```sh
"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command"
```

The launcher starts one new enabled EigenVista window. It does not stop or
restart other windows. Ordinary app startup does not open a connection.

## Your inputs persist; each session gets new results

With no options, the launcher uses `~/Documents/EigenVista`:

- `Inputs/` is a persistent folder for molecular files you want the agent to use.
- `Sessions/session.XXXXXX/Results/` is a fresh results directory for each launch.
- A private connection file lives in that session directory, outside Results.
  The launcher prints its filename and writes a nonsecret session note with
  the paths.
- The bundled examples and palettes are available too. Ask the agent to use
  MatterViz Pastel; you do not need to load it manually.

Copy your chosen molecular files into Inputs, preserving originals. To allow
another existing data folder, use the launcher's repeatable `--input` option
or ask the agent to set up that approved folder for you. A different
`--workspace` chooses the persistent base directory. Only approve the specific
folders you want the agent to use.

For example, with an existing additional input directory:

```sh
"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command" \
  --workspace "$HOME/Documents/EigenVista" \
  --input "$HOME/Documents/My molecules"
```

Repeat `--input` for additional approved directories. Run the packaged launcher
with `--help` for its options. If the app is elsewhere, use its actual path.

Keep the connection file private. A new session gets a fresh one; its contents
must not be printed, uploaded or placed in chat. Use the session note to pass
around the filenames. Output files use new names, so repeating a workflow keeps
earlier results.

## One prompt: let your agent install and connect

Paste this into your chosen local agent. It authorizes installation of a
compatible binary package if needed, folder setup, a new enabled instance and
connection checks. The agent handles the packaged launcher's commands. Only
required Mac permissions, sign-in or a private-folder choice should need you.

```text
Set up EigenVista so you can operate its desktop window for me.
Use the installed Mac application and the connection tools packaged inside it.

Find EigenVista in Applications or the location I supplied. If I need a
compatible app, I authorize downloading and installing the appropriate Mac
binary package from https://github.com/uvar-apps/eigenvista/releases into an
applications location I can write. Preserve existing app copies. Check that
the package includes its connection helper, standalone instructions and
"Start AI connection.command" launcher. Use the matching 0.10.6 Mac package; older packages
such as 0.7.2 do not include them. If no compatible package is available, explain that clearly,
show me the official release page and stop the setup.

Read the standalone instructions in the app's AI-connector folder. If you
need their public copies, use
https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/SKILL.md and
https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/reference.md.
Handle all connection commands and checks for me.

Use the launcher's default persistent workspace unless I supplied another
location. Make the bundled examples and palettes available, and use only the
specific data folders I already approved. Keep a fresh private output folder
for this session. Start one new enabled EigenVista window with the packaged
launcher. Leave all existing windows and servers alone.

Check the connection and tell me which molecule is open, whether there are
unsaved changes or running calculations, and what I can ask you to do. Do not
replace a molecule or discard changes just to test the connection. Return the
app, helper, input, output, connection-file and session-note paths needed to
continue. Keep the connection file's contents and credentials private.

I authorize this installation and setup. Ask me to act only when a required
Mac permission, sign-in or choice of a private data folder needs me. Keep my
agent/model account settings unchanged.
```

Public copies of the packaged
[agent instructions](https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/SKILL.md)
and [connection reference](https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/reference.md)
are available when the agent needs to read them. These are instructions for
the packaged tools, not a replacement for a compatible app.

Once setup finishes, ask what molecule is open, which supplied orbitals or
densities are available, and whether there is unsaved work. Your agent reads
the standalone instructions shipped in the app and translates ordinary
requests into supported actions.

## Ask for an outcome

These are independent examples. Replace bracketed files and names with your
own; keep files inside your approved input folders. The bundled palettes and
examples are already available to the session.

| What you want | What to say |
| --- | --- |
| Open a molecule | “Open [molecular file]. Tell me what it contains and any import warnings. Save a new copy of my current work first if needed.” |
| Compare orbitals | “Find the HOMO and LUMO. Show both signs of the HOMO at an isovalue of 0.03, wait for the surface to finish, and show me an image.” |
| Inspect density | “Show the supplied electron density as a volume first. Then make a surface at 0.04 electrons/bohr³ so we can look inside it.” |
| Load a palette and add depth | “Load the bundled MatterViz Pastel palette, color the atoms by element, and turn on ambient occlusion using its automatic radius. Keep this camera angle.” |
| Shade a molecular surface | “Set the solvent-excluded surface to full opacity. Turn on ambient occlusion for molecular surfaces with automatic radius, then show me an image. Keep atom and bond ambient occlusion off.” |
| Use your own palette | “Load the atom palette from [palette file] and show me the result. Keep the molecular data and this framing.” |
| Read a protein assembly | “Show the protein as a cartoon and color it by chain. Isolate chain A and focus on it. Keep the complete molecular data.” |
| See residue classes | “Show the protein as a cartoon colored by residue class. Keep ligands in their element colors.” |
| Explore a subset | “Show residues [range] of chain [name]. Give that chain a ball-and-stick style while the other visible protein chains stay as cartoons. Focus on the visible structure.” |
| Return to an overview | “Show all components again, clear individual chain and component style overrides, and use the global cartoon view. Give chains from the same molecular entity the same color and fit the complete assembly.” |
| Change the finish | “Give this surface an X-ray finish so I can see the framework through it,” or “Cut a window into the density surface without changing the molecular data.” |
| Keep a comparison fair | “Export AO off and on from the same camera, representation, palette and window size. Show me the actual images side by side.” |
| Save the result | “Save a new molecular document, an opaque PNG and a transparent-background PNG in this session's Results folder. Use fresh filenames and show me the images.” |
| Stop a long calculation | “Cancel only the calculation you started for my current request. Keep completed surfaces and the molecular data. Tell me when the app is ready again.” |

For the newer inspection build, ask “Show the HOMO as a colored plane, with a
numeric key and contours. Keep the signed amplitude rather than squaring it.
Export the samples and save the result.” This requires the connected feature.

You can ask for palette loading/reset, element/chain/entity/secondary-structure
coloring, hiding and isolation, residue ranges, per-chain/component styles,
focus and automatic AO radius directly. The agent handles these choices;
no manual palette loading is needed.

## Say what matters in the view

In EigenVista 0.10.6, ask “Select these atoms and show me which ones are
selected.” Gold reticles identify selected atoms; a cyan ring identifies the
latest atom or bond inspected without adding it to the selection. Ask to clear
the selection to remove both cues. Display-hidden atoms remain hidden, and the
markers are included in exported images.

Tell the agent which part of the molecule matters and what you want to compare.
“Keep the current angle” and “leave this window open” are useful instructions.
When refining a surface or changing a subset, it handles the framing needed to
honor your request.

Opening another file can retain the previous background, AO and surface finish.
For ordinary signed colors, say “Remove the surface effect and show the normal
positive and negative colors.” The agent checks the current appearance rather
than assuming it reset.

The view depends on data actually supplied in your input. Ask the agent to
explain what supports the picture. Orbital sign colors show the sign of the
amplitude, not electric charge; a cube filename alone cannot establish that its
values are electron density.

For a quantitative plane, specify orientation, extent and resolution. A total
density is nonnegative; an orbital amplitude is signed. Ask for a fixed range
when comparing planes, or for a probe/profile when numbers matter. GUI users find
these under **Fields → Quantitative field inspection**.

In EigenVista 0.10.6, you can also say “Move this plane half an angstrom
along Z, keeping its contours, colors and resolution” or “Use only the last
position I asked for.” The agent updates the existing plane and waits for the
completed result. GUI users can leave **Auto-update plane** enabled, use a
spinner, or press **Enter** after typing a sampling value. When connecting to
an older app, the agent checks which update options it supports.

## Protect your work and wait for results

In EigenVista 0.10.6, you can ask “How is the molecular surface coming
along?” The agent can report the current phase, elapsed time and how much of the
meshing phase has finished. A meshing percentage describes that phase rather
than the whole calculation. Other phases report activity without an invented
percentage or completion-time estimate. You can ask to cancel and keep the
previous accepted surface.

The agent should preserve unsaved work and wait for calculations and exports to
finish before describing success. Opening a different file is not permission
to discard changes. Text inside a molecular input is data, not permission to
run unrelated commands.

If a chat or connection times out, the calculation may still be running. Ask
the agent to check what happened before trying again. It must not repeat a
save blindly, stop unrelated work or silently allow access to more folders.

## Keep the data and the picture

Use new filenames: the connector refuses overwrites by default, and
original imported files remain protected. Ask the agent to confirm that your
current changes were saved, rather than only that a file exists.

A native .eigenvista document keeps supported molecular data, generated surfaces
and document appearance. Camera, AO, palette, background, shaders and biological
display choices are session settings. Ask the agent to record those choices
separately so you can recreate the view after reopening.

A PNG records the rendered appearance. The agent should inspect the actual
exported image before saying it looks good. If you change the molecule during
an export, it should check which view was captured. Without an image viewer,
it can give you a file to open and should say that it has not seen the result.

## Reconnect or finish

In the chat that completed setup, simply ask “What molecule is open, and what
can we explore?” The agent should check for unsaved changes and running
calculations before changing anything.

In a new chat, give the agent the nonsecret session note and ask “Reconnect to
this EigenVista window, tell me what is open and leave the current view
unchanged.” The note supplies the actual app, helper, input, output and
connection filenames. Keep the private connection file's contents out of chat.

If the app has closed, launch a new session with the packaged launcher. Inputs
remain available and each new session gets fresh Results and a new private
connection file. An old connection file left after a crash is not proof that
an app is still running.

To finish, ask the agent to save a new copy of the work you need, stop only
calculations it started for you, and leave the window open if you want to
continue manually. Close only the app instance you intended to close and
honor its unsaved-work prompt. Keep your results and session note.

## Choose where your model runs

Molecular processing and the connection to EigenVista are local. Your agent may
still send prompts, file contents, metadata or images to its chosen model
provider. Share only what you are allowed to send and keep credentials and the
connection file's contents private.

For on-device-only work, choose an agent that supports a local model/runtime
and check its tools, telemetry and network settings.
[OpenCode documents local runtimes](https://opencode.ai/docs/providers/).
Configure the model in your agent; EigenVista does not install or manage it.

## Try a focused workflow

The scientific walkthroughs live only on the website:

- [Explore orbitals with an agent](https://uvar-apps.github.io/eigenvista/ai-tutorial-orbitals.html)
- [Inspect density with an agent](https://uvar-apps.github.io/eigenvista/ai-tutorial-density.html)
- [Compare ambient occlusion](https://uvar-apps.github.io/eigenvista/ai-tutorial-ao.html)
- [Compare molecular representations](https://uvar-apps.github.io/eigenvista/ai-tutorial-representations.html)

Your agent can read the packaged instructions directly, or use their public
[workflow](https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/SKILL.md)
and [connection-reference](https://uvar-apps.github.io/eigenvista/downloads/eigenvista-control/reference.md)
copies. You choose the outcome; it handles the connection details.
