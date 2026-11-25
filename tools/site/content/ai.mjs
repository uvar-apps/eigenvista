// Installed-app guidance; the published pages contain no executable scripts.
import { application } from "../application.mjs";
import { release } from "../release.mjs";
import { agentWorkspaceNote } from "./workspace.mjs";
const code = (value) =>
  `<pre class="wrap-code"><code>${value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</code></pre>`;

const setupPrompt = `Set up EigenVista so you can operate its desktop window for me.
Use the installed application and the connection tools packaged with it.

Check my operating system and CPU, then find EigenVista in Applications or the
location I supplied. If I need a compatible app, I authorize downloading and
installing the appropriate binary package from https://github.com/uvar-apps/eigenvista/releases
into a location I can write. Use the current ${release.version} Apple Silicon Mac
package or the CachyOS-tested Linux x86_64 package. Preserve existing app copies
and retain the complete downloaded package. If no compatible package is available,
explain that clearly, show me the official release page and stop the setup.

Check that the package includes its connection helper, standalone instructions
and packaged launcher. On Mac these are inside EigenVista.app; use
"Start AI connection.command". On Linux keep bin/ and share/ together and use
share/eigenvista/AI-connector/Start AI connection.sh. Run that Bash launcher
normally from Fish rather than sourcing it. Check the Linux runtime requirements
and that a graphical display is available. Ask before installing system libraries,
changing drivers or setting up a display. Do not compile the application.

Read the standalone instructions in the package's AI-connector folder. If you
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
operating-system permission, sign-in or choice of a private data folder needs me. Keep my
agent/model account settings unchanged.`;

const agentSources = `<p class="small">Official agent setup links were checked on 16 November 2026. Sign-in and model choices belong to your agent; EigenVista does not manage them.</p>`;

const linuxSetup = release.linux ? `
<h2 id="linux-launcher">Manual setup on Linux</h2>
<p>First follow <a href="install.html#linux">the Linux installation steps</a>. Keep the complete extracted package, including <strong>bin/</strong> and <strong>share/</strong>. Start the launcher from a terminal in your graphical Linux session. No Rust, Node.js or additional MCP server is required.</p>
<div class="table-wrap"><table><thead><tr><th>Inside the Linux package</th><th>Purpose</th></tr></thead><tbody><tr><td><code>bin/eigenvista-ctl</code></td><td>The prebuilt helper your agent uses.</td></tr><tr><td><code>share/eigenvista/AI-connector/Start AI connection.sh</code></td><td>The packaged Bash launcher.</td></tr><tr><td><code>share/eigenvista/AI-connector/SKILL.md</code> and <code>reference.md</code></td><td>Standalone agent instructions, with no registration step.</td></tr><tr><td><code>share/eigenvista/AI-connector/examples/</code> and <code>palettes/</code></td><td>Examples and palettes the connected agent can use immediately.</td></tr></tbody></table></div>
<p>For a package extracted in Downloads, run the following. If you extracted it elsewhere, use that directory instead. These commands work in Fish and Bash:</p>
<div data-linux-launcher>${code(`cd "$HOME/Downloads/${release.linux.stem}"
"./share/eigenvista/AI-connector/Start AI connection.sh"`)}</div>
<p>The file has its own Bash interpreter. Run it normally; do not source it into Fish. It opens one new connected EigenVista window, keeps existing windows alone, and prints a nonsecret session-note path. Keep that terminal open and give your agent the session-note path. Never paste the private connection file's contents.</p>
<p>To choose a workspace and approve a separate existing molecular-data folder, run this from the extracted package directory:</p>
${code(`"./share/eigenvista/AI-connector/Start AI connection.sh" --workspace "$HOME/Documents/EigenVista" --input "$HOME/molecules"`)}
<p>Approve only the folders you intend to use. With no options, the persistent workspace and fresh per-session results follow the layout below. The app still needs a graphical display when driven by an agent; a plain SSH session does not supply one.</p>
` : "";

export default [
  {
    file: "ai.html",
    title: "Ask your agent. Watch EigenVista.",
    section: "ai",
    number: "07",
    description:
      "Use Codex, Claude Code, Pi, OpenCode or another local agent to open molecules, change their appearance and export images in the installed EigenVista app.",
    body: `
<p class="lede">Find an orbital, reveal a density surface, load a palette or focus on one protein chain. Tell your agent what you want and watch the same EigenVista window respond.</p>
${agentWorkspaceNote}
<div class="notice"><strong>Included in EigenVista ${release.version} for ${release.linux ? "Mac and Linux" : "Mac"}.</strong> The app ships its connection helper, launcher, agent instructions and examples together. <a href="ai-install.html">Set up your agent</a> and start exploring with ordinary prompts.</div>
<div class="actions"><a class="button primary" href="ai-install.html">Connect the installed app →</a><a class="button" href="ai-guide.html">What to ask your agent →</a></div>
<figure class="plate"><div class="plate-label"><span>RECORDED AGENT SESSION</span><span>C₇H₁₀ / HOMO</span></div><a href="assets/media/ai-session-xray.webp"><img src="assets/media/ai-session-xray.webp" width="1700" height="1328" alt="Translucent cyan orbital lobes surround the carbon and hydrogen framework of C7H10 on a dark blue background" fetchpriority="high"></a><figcaption>An actual app export from a recorded external-agent session: the C₇H₁₀ HOMO (MO 26), on a 128³ grid, with an X-ray finish. <a href="ai-tutorial-orbitals.html">Follow the orbital workflow →</a></figcaption></figure>

<h2 id="goals">Ask for the view you need</h2>
<div class="feature-grid">
<article><span class="index">[01]</span><h3>Explore orbitals</h3><p>“Find the HOMO and LUMO. Show both signs of the HOMO and explain what the colors mean.”</p><a href="ai-tutorial-orbitals.html">Orbital walkthrough →</a></article>
<article><span class="index">[02]</span><h3>Look inside density</h3><p>“Show the electron density, then make the surface transparent enough to see the molecular framework.”</p><a href="ai-tutorial-density.html">Density walkthrough →</a></article>
<article><span class="index">[03]</span><h3>Bring out the depth</h3><p>“Load MatterViz Pastel and compare ambient occlusion off and on from the same angle.”</p><a href="ai-tutorial-ao.html">AO walkthrough →</a></article>
<article><span class="index">[04]</span><h3>Read an assembly</h3><p>“Show a protein cartoon, color by chain, isolate chain A and focus on it.”</p><a href="ai-tutorial-representations.html">Representation walkthrough →</a></article>
</div>

<h2 id="connection">The app includes the connection tools</h2>
<div class="notice"><strong>Explore scientific inspection in ${application.version}.</strong> Ask for geometry measurements/labels, ligand neighborhoods, SES/SAS molecular surfaces, and quantitative field probes/planes/profiles. The ${release.version} packages and their connectors include the core inspection workflows. ${application.status === "published" ? `It also includes visible atom picks, plane-update controls and detailed molecular-surface progress.` : `The new selection, plane-update and surface-progress behavior is available in the ${application.version} test build.`} Ask your agent to confirm available features when connecting to an older or custom app. A HOMO plane shows signed amplitude ψ; a total-density plane shows nonnegative electron density. <a href="reference-inspection.html">Read the scientific-inspection manual →</a></div>
<p>A compatible EigenVista package ships its connection helper, standalone agent instructions, launcher, examples and palettes together. You do not need a separate MCP plugin. Your agent reads those instructions and handles discovery, commands and progress checks.</p>
<p>Use <strong>Codex Desktop or CLI, Claude Code, Pi, OpenCode</strong>, or another agent with local terminal and file access. Codex Desktop already has terminal access; its CLI is optional. An image viewer lets the agent inspect and show actual PNG exports. There is no chat box or model account inside EigenVista; you keep using your chosen agent.</p>

<h2 id="setup">Two ways to get connected</h2>
<ul><li><a href="ai-install.html#manual">Manual setup</a>: open the packaged launcher in Finder or Terminal, then give your agent the nonsecret setup note.</li><li><a href="ai-install.html#setup-prompt">One setup prompt</a>: authorize your agent to find or download the compatible app, read its packaged instructions, start a session and check the connection.</li></ul>
<p>The launcher keeps your input folder between sessions and creates a fresh private results folder each time. It starts one new enabled window and leaves existing app windows alone. You choose which data folders the agent may use.</p>

<h2 id="privacy">Local viewer, chosen model</h2>
<p>Molecular processing and the connection to EigenVista run locally. Your external agent may still send prompts, file contents or images to its chosen model provider. Share only data you are allowed to send and keep credentials and the private connection file's contents out of chat and logs.</p>
<p>For on-device-only work, choose an agent that supports a local model and check its tools, telemetry and network settings. <a href="https://opencode.ai/docs/providers/">OpenCode documents local runtimes ↗</a>. Configure the model in the agent; EigenVista does not install or manage one.</p>

<h2 id="next">Continue with your agent</h2>
<div class="next-step"><span>Next</span><a href="ai-install.html">Installed-app setup →</a><a href="ai-guide.html">Everyday requests →</a></div>
`,
  },
  {
    file: "ai-install.html",
    title: "Connect the installed EigenVista app",
    section: "ai",
    number: "07.A",
    description:
      "Set up a connector-enabled EigenVista Mac or Linux package with its bundled launcher, or give your agent one prompt to install and connect it for you.",
    body: `
<p class="lede">Use the connection tools already included in your package. Open its launcher yourself, or give your agent the setup prompt and let it handle the installation and connection.</p>
<div class="notice"><strong>Use EigenVista ${release.version} for ${release.linux ? "Mac or Linux" : "Mac"}.</strong> Its connection helper, launcher, instructions, examples and palettes are included together. <a href="install.html">Download and install EigenVista</a>, then choose the setup method below. Check the included files when using an older or custom package.</div>

<h2 id="agents">Choose the agent you already use</h2>
<p>Your agent needs local terminal/file access and, to inspect exported pictures, an image viewer. A cloud-only chat without access to the computer running EigenVista cannot control its local app. Keep an existing working agent installation; choose only one if you need to install one.</p>
<div class="table-wrap"><table class="agent-setup-table" role="table"><thead><tr><th scope="col">Agent</th><th scope="col">How to use it</th><th scope="col">Official setup</th></tr></thead><tbody>
<tr><th scope="row">Codex Desktop</th><td data-label="How to use it">Use its local terminal-capable chat. A separate Codex CLI installation is optional.</td><td data-label="Official setup"><a href="https://developers.openai.com/codex/quickstart/">Codex setup ↗</a> · <a href="https://learn.chatgpt.com/docs/integrated-terminal">Desktop terminal ↗</a></td></tr>
<tr><th scope="row">Codex CLI</th><td data-label="How to use it">Use your existing local Codex terminal session and give it the setup prompt.</td><td data-label="Official setup"><a href="https://learn.chatgpt.com/docs/codex/cli">Codex CLI ↗</a></td></tr>
<tr><th scope="row">Claude Code</th><td data-label="How to use it">Use a local Claude Code session with permission to read the app and run its helper.</td><td data-label="Official setup"><a href="https://code.claude.com/docs/en/overview">Claude Code ↗</a></td></tr>
<tr><th scope="row">Pi</th><td data-label="How to use it">Use your local Pi session with your chosen model and terminal tools.</td><td data-label="Official setup"><a href="https://github.com/earendil-works/pi/tree/main/packages/coding-agent">Pi ↗</a></td></tr>
<tr><th scope="row">OpenCode</th><td data-label="How to use it">Use a local OpenCode session and your existing model connection.</td><td data-label="Official setup"><a href="https://opencode.ai/docs/">OpenCode ↗</a></td></tr>
<tr><th scope="row">Other local agent</th><td data-label="How to use it">Use the same packaged instructions and helper through its local terminal tools.</td><td data-label="Official setup">Follow that agent's official setup and model sign-in instructions.</td></tr>
</tbody></table></div>
${agentSources}

<h2 id="package">Check the compatible app package</h2>
<p>Use the download for your operating system and CPU. No source checkout, compiler or separate MCP server is needed. ${release.linux ? `<a href="#linux-launcher">Linux setup is below</a>; its launcher and helper have different locations from the Mac app.` : ""}</p>
<h3>Mac package</h3>
<p>Install the current EigenVista ${release.version} Mac package from the <a href="https://github.com/uvar-apps/eigenvista/releases">official release page ↗</a>. Follow the <a href="install.html">normal Mac installation guide</a>. The connection tools below must be included:</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Inside EigenVista.app</th><th scope="col">Purpose</th></tr></thead><tbody>
<tr><td><code>Contents/MacOS/eigenvista-ctl</code></td><td>The prebuilt connection helper used by the agent.</td></tr>
<tr><td><code>Contents/Resources/AI-connector/Start AI connection.command</code></td><td>The packaged launcher for an enabled session.</td></tr>
<tr><td><code>Contents/Resources/AI-connector/SKILL.md</code> and <code>reference.md</code></td><td>Standalone instructions the agent reads directly. No skill registration is required.</td></tr>
<tr><td><code>Contents/Resources/AI-connector/README.md</code></td><td>This portable user guide.</td></tr>
<tr><td><code>Contents/Resources/AI-connector/examples/</code> and <code>palettes/</code></td><td>Ready-to-use molecular examples and atom palettes.</td></tr>
</tbody></table></div>
<p>If the helper or launcher is missing, this app package is not compatible. Your agent should explain what is missing and point you to the release page. Downloading instructions alone cannot enable an older app.</p>

<h2 id="manual">Manual setup on Mac</h2>
<ol><li>Place the compatible <strong>EigenVista.app</strong> in Applications, or keep its actual installed location.</li><li>In Finder, right-click the app and choose <strong>Show Package Contents</strong>.</li><li>Open <strong>Contents → Resources → AI-connector</strong> and double-click <strong>Start AI connection.command</strong>.</li><li>Keep the Terminal window open while this session runs. The app runs in the foreground there.</li><li>Give your agent the nonsecret session note, or the displayed app, helper, input, output and connection paths. Never paste the connection file's contents.</li></ol>
<p>If the app is in Applications, the equivalent Terminal command is:</p>
${code(String.raw`"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command"`)}
<p>The launcher starts one new enabled EigenVista window. It does not stop or restart other windows. Ordinary app startup does not open a connection.</p>

${linuxSetup}
<h2 id="folders">Your inputs persist; each session gets new results</h2>
<p>With no options, the launcher uses <code>~/Documents/EigenVista</code>:</p>
<ul><li><code>Inputs/</code> is a persistent folder for molecular files you want the agent to use.</li><li><code>Sessions/session.XXXXXX/Results/</code> is a fresh results directory for each launch.</li><li>A private connection file lives in that session directory, outside Results. The launcher prints its filename and writes a nonsecret session note with the paths.</li><li>The bundled examples and palettes are available too. Ask the agent to use MatterViz Pastel; you do not need to load it manually.</li></ul>
<p>Copy your chosen molecular files into Inputs, preserving originals. To allow another existing data folder, use the launcher's repeatable <code>--input</code> option or ask the agent to set up that approved folder for you. A different <code>--workspace</code> chooses the persistent base directory. Only approve the specific folders you want the agent to use.</p>
<details><summary>On Mac: choose the workspace and another input folder</summary>
${code(String.raw`"/Applications/EigenVista.app/Contents/Resources/AI-connector/Start AI connection.command" \
  --workspace "$HOME/Documents/EigenVista" \
  --input "$HOME/Documents/My molecules"`)}
<p>The extra input directory must already exist. Repeat <code>--input</code> for additional approved directories. Run the packaged launcher with <code>--help</code> for its options. If the app is elsewhere, use its actual path.</p></details>
<p>Keep the connection file private. A new session gets a fresh one; its contents must not be printed, uploaded or placed in chat. Use the session note to pass around the filenames. Output files use new names, so repeating a workflow keeps earlier results.</p>

<h2 id="setup-prompt">One prompt: let your agent install and connect</h2>
<p>Paste this into your chosen local agent. It authorizes installation of a compatible binary package if needed, folder setup, a new enabled instance and connection checks. The agent handles the packaged launcher's commands. Only required system permissions, sign-in or a private-folder choice should need you.</p>
${code(setupPrompt)}
<p>Public copies of the packaged <a href="downloads/eigenvista-control/SKILL.md">agent instructions</a> and <a href="downloads/eigenvista-control/reference.md">connection reference</a> are available when the agent needs to read them. These are instructions for the packaged tools, not a replacement for a compatible app.</p>

<h2 id="connect">Ask what is open</h2>
<p>Once setup finishes, ask the agent to tell you what molecule is open, what supplied orbitals or densities are available, and whether there is unsaved work. Continue with ordinary requests in the <a href="ai-guide.html">interaction guide</a>.</p>
<div class="next-step"><span>Next</span><a href="ai-guide.html">What to ask your agent →</a></div>
`,
  },
  {
    file: "ai-guide.html",
    title: "Tell your agent what you want to see",
    section: "ai",
    number: "07.B",
    description:
      "Ask your connected agent to load palettes, compare orbitals, color and focus protein chains, export pictures and preserve your molecular data in the installed app.",
    body: `
<p class="lede">Choose the molecule and describe the result. Your agent handles the connection and calculations while you watch EigenVista.</p>
<p>Use <strong>Codex Desktop or CLI, Claude Code, Pi, OpenCode</strong>, or another local agent with terminal tools and an image viewer. Complete <a href="ai-install.html">installed-app setup</a> first. The agent reads the standalone instructions shipped in the app and translates your requests into supported actions.</p>

<h2 id="connect">Continue the session you set up</h2>
<p>In the chat that completed setup, simply ask “What molecule is open, and what can we explore?” The agent should check for unsaved changes and running calculations before changing anything.</p>
<p>In a new chat, give the agent the nonsecret session note and ask “Reconnect to this EigenVista window, tell me what is open and leave the current view unchanged.” The note supplies the actual app, helper, input, output and connection filenames. Keep the private connection file's contents out of chat.</p>

<h2 id="operations">Ask for an outcome</h2>
<p>These are independent examples. Replace bracketed files and names with your own; keep files inside your approved input folders. The bundled palettes and examples are already available to the session.</p>
<div class="table-wrap"><table><thead><tr><th scope="col">What you want</th><th scope="col">What to say</th></tr></thead><tbody>
<tr><th scope="row">Open a molecule</th><td>“Open [molecular file]. Tell me what it contains and any import warnings. Save a new copy of my current work first if needed.”</td></tr>
<tr><th scope="row">Compare orbitals</th><td>“Find the HOMO and LUMO. Show both signs of the HOMO at an isovalue of 0.03, wait for the surface to finish, and show me an image.”</td></tr>
<tr><th scope="row">Inspect density</th><td>“Show the supplied electron density as a volume first. Then make a surface at 0.04 electrons/bohr³ so we can look inside it.”</td></tr>
<tr><th scope="row">Load a palette and add depth</th><td>“Load the bundled MatterViz Pastel palette, color the atoms by element, and turn on ambient occlusion using its automatic radius. Keep this camera angle.”</td></tr>
<tr><th scope="row">Use your own palette</th><td>“Load the atom palette from [palette file] and show me the result. Keep the molecular data and this framing.”</td></tr>
<tr><th scope="row">Read a protein assembly</th><td>“Show the protein as a cartoon and color it by chain. Isolate chain A and focus on it. Keep the complete molecular data.”</td></tr>
<tr><th scope="row">Explore a subset</th><td>“Show residues [range] of chain [name]. Give that chain a ball-and-stick style while the other visible protein chains stay as cartoons. Focus on the visible structure.”</td></tr>
<tr><th scope="row">Return to an overview</th><td>“Show all components again, clear individual chain and component style overrides, and use the global cartoon view. Give chains from the same molecular entity the same color and fit the complete assembly.”</td></tr>
<tr><th scope="row">Change the finish</th><td>“Give this surface an X-ray finish so I can see the framework through it,” or “Cut a window into the density surface without changing the molecular data.”</td></tr>
<tr><th scope="row">Keep a comparison fair</th><td>“Export AO off and on from the same camera, representation, palette and window size. Show me the actual images side by side.”</td></tr>
<tr><th scope="row">Save the result</th><td>“Save a new molecular document, an opaque PNG and a transparent-background PNG in this session's Results folder. Use fresh filenames and show me the images.”</td></tr>
<tr><th scope="row">Follow a molecular surface</th><td>“How is the molecular surface coming along? Tell me its current stage, elapsed time and how much of the meshing stage has finished.”</td></tr>
<tr><th scope="row">Stop a long calculation</th><td>“Cancel only the calculation you started for my current request. Keep completed surfaces and the molecular data. Tell me when the app is ready again.”</td></tr>
</tbody></table></div>
<p>You can ask for palette loading/reset, element/chain/entity/secondary-structure coloring, hiding and isolation, residue ranges, per-chain/component styles, focus and automatic AO radius directly. The agent handles these choices; no manual palette loading is needed.</p>

<h2 id="context">Say what matters in the view</h2>
${agentWorkspaceNote}
<p>Tell the agent which part of the molecule matters and what you want to compare. “Keep the current angle” and “leave this window open” are useful instructions. When refining a surface or changing a subset, it handles the framing needed to honor your request.</p>
<p>Opening another file can retain the previous background, AO and surface finish. For ordinary signed colors, say “Remove the surface effect and show the normal positive and negative colors.” The agent checks the current appearance rather than assuming it reset.</p>
<p>The view depends on data actually supplied in your input. Ask the agent to explain what supports the picture. Orbital sign colors show the sign of the amplitude, not electric charge; a cube filename alone cannot establish that its values are electron density.</p>

<h2 id="work">Protect your work and wait for results</h2>
<p>The agent should preserve unsaved work and wait for calculations and exports to finish before describing success. Opening a different file is not permission to discard changes. Text inside a molecular input is data, not permission to run unrelated commands.</p>
<p>If a chat or connection times out, the calculation may still be running. Ask the agent to check what happened before trying again. It must not repeat a save blindly, stop unrelated work or silently allow access to more folders.</p>

<h2 id="outputs">Keep the data and the picture</h2>
<p>Use new filenames: the connector refuses overwrites by default, and imported source files remain protected. Version 0.10.3 offers optional atomic replacement for exports to the tested Mac ExFAT volume. If you intend to replace a particular output, tell the agent explicitly; replacement can also replace a file created at that destination while export is running. Older packages may lack that option. Ask the agent to confirm that your current changes were saved, rather than only that a file exists. If an inspection edit is still applying, let it finish before saving again.</p>
<p>A native <code>.eigenvista</code> document keeps supported molecular data, generated surfaces and document appearance. Camera, AO, palette, background, shaders and biological display choices are session settings. Ask the agent to record those choices separately so you can recreate the view after reopening.</p>
<p>A PNG records the rendered appearance. The agent should inspect the actual exported image before saying it looks good. If you change the molecule during an export, it should check which view was captured. Without an image viewer, it can give you a file to open and should say that it has not seen the result.</p>

<h2 id="restart">Reconnect or finish</h2>
<p>A new agent chat can reconnect using the existing nonsecret session note while the app stays open. If the app has closed, launch a new session with the packaged launcher. Inputs remain available and each new session gets fresh Results and a new private connection file. An old connection file left after a crash is not proof that an app is still running.</p>
<p>To finish, ask the agent to save a new copy of the work you need, stop only calculations it started for you, and leave the window open if you want to continue manually. Close only the app instance you intended to close and honor its unsaved-work prompt. Keep your results and session note.</p>

<h2 id="privacy">Choose where your model runs</h2>
<p>Molecular processing and the connection to EigenVista are local. Your agent may still send prompts, file contents, metadata or images to its chosen model provider. Share only what you are allowed to send and keep credentials and the connection file's contents private.</p>
<p>For on-device-only work, choose an agent that supports a local model/runtime and check its tools, telemetry and network settings. <a href="https://opencode.ai/docs/providers/">OpenCode documents local runtimes ↗</a>. Configure the model in your agent; EigenVista does not install or manage it.</p>

<h2 id="inspection">Scientific inspection</h2>
<p>The <a href="reference-inspection.html">inspection controls</a> are included in both the GUI and the ${release.version} app packages' connectors. Older 0.8.0 downloads predate them. Ask the agent to confirm that your connected application has these capabilities before starting.</p>
<p><strong>Inspection improvements in ${application.version}.</strong> Gold reticles identify atoms selected by you or your agent; a normal inspection click shows a cyan ring for atoms not already selected. A field plane can update as you commit sampling changes, while an agent can request its replacement directly. For molecular surfaces, the agent can report the current phase, elapsed time and measured mesh completion, then cancel only its own calculation while retaining completed surfaces. A meshing percentage describes that stage, not the whole job or a remaining-time estimate. ${application.status === "published" ? `These improvements are included in the current packages.` : `These improvements are in the ${application.version} test build; the published ${release.version} download predates them.`}</p>
<ul><li>“Choose this ligand copy, show complete residues within 4 angstroms, label the selected distance and save the figure and numbers.”</li><li>“Generate an SES with explicit radii, a 1.4 angstrom solvent probe and 0.25 angstrom spacing. Apply X-ray shading only to that surface and keep its cached geometry.”</li><li>“Make a true HOMO amplitude slice with a fixed colorbar from minus 0.06 to plus 0.06 and signed contours at 0.02 and 0.04. Show units, plot values along the selected bond, and export the tables and image.”</li></ul>
<p>The agent handles selections, palettes, parameters, cancellation, file access and exports without handing those steps back as GUI chores. Follow the <a href="tutorials-geometry.html">measurement</a>, <a href="tutorials-molecular-surfaces.html">molecular-shape</a> or <a href="tutorials-quantitative-fields.html">quantitative-field</a> lesson for an exact worked example.</p>

<h2 id="walkthroughs">Try a focused workflow</h2>
<ul><li><a href="ai-tutorial-orbitals.html">Explore orbitals with an agent</a></li><li><a href="ai-tutorial-density.html">Inspect density with an agent</a></li><li><a href="tutorials-electrostatic-potential.html#ai">Make a Phong-shaded electrostatic potential figure</a></li><li><a href="ai-tutorial-ao.html">Compare ambient occlusion</a></li><li><a href="ai-tutorial-representations.html">Compare molecular representations</a></li></ul>
<p>Your agent can read the packaged instructions directly, or use their public <a href="downloads/eigenvista-control/SKILL.md">workflow</a> and <a href="downloads/eigenvista-control/reference.md">connection-reference</a> copies. You choose the outcome; it handles the connection details.</p>
`,
  },
];
