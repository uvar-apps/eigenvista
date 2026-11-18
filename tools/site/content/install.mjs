import { release } from "../release.mjs";
import { application } from "../application.mjs";

export default [
  {
    file: "install.html",
    title: "Install & start",
    section: "install",
    number: "01",
    description:
      "Download EigenVista for Apple Silicon, install the experimental Mac app, open the supplied examples and check your first session.",
    body: `
<div class="article-layout"><aside class="toc" aria-label="On this page"><p class="eyebrow">On this page</p><a href="#download">Download</a><a href="#requirements">Requirements</a><a href="#install">Install</a><a href="#first-run">First run</a><a href="#package">In the package</a><a href="#troubleshooting">Troubleshooting</a></aside><article class="prose">
<h2 id="download">Get EigenVista ${release.version}</h2>
<p class="lede">An experimental desktop preview for Apple Silicon Macs. Your local molecular-file workflows run on your computer, without a calculation server.</p>
<div class="notice" data-published-download><strong>Published download: ${release.version}.</strong> The ZIP includes the four-tab Tools pane, <a href="reference-inspection.html">scientific-inspection controls</a> and AI connector described in this manual. These installation and first-run steps apply to the ${release.version} package.</div>
<div class="download-block"><p class="eyebrow">MAC / APPLE SILICON / v${release.version}</p><a class="button primary" href="${release.base}${release.stem}.zip">Download the tester ZIP ↗</a><p>${(release.zipBytes / 1_000_000).toFixed(1)} MB · Includes the application, AI connector, examples, palettes and converter.</p><div class="actions"><a href="${release.base}${release.stem}.zip.sha256">SHA-256 checksum</a><a href="${release.base}${release.stem}.json">Build information</a><a href="${release.url}">Release notes</a></div></div>
<h2 id="requirements">Before you download</h2>
<ul><li><strong>Apple Silicon Mac:</strong> an M-series processor. This ZIP does not run on Intel Macs.</li><li><strong>macOS 13 or later is the deployment target.</strong> The release was built and checked locally on macOS 27; the full supported OS range has not been qualified.</li><li>Linux and Windows packages are not available yet.</li><li>The installed app needs no Rust, Node.js, development server or internet connection to work with local files.</li></ul>
<div class="notice"><strong>Development preview.</strong> The app is ad-hoc signed and is not Apple-notarized. Follow the macOS instructions below when opening it for the first time.</div>
<h2 id="install">Install on your Mac</h2>
<ol><li>Download and unzip the complete tester package.</li><li>Move <strong>EigenVista.app</strong> into <strong>Applications</strong>.</li><li>Double-click the app. It initially opens a mathematical hydrogen-pair example.</li><li>Keep the rest of the extracted package: it contains examples, palettes, documentation, source and license notices.</li></ol>
<h3>If macOS asks about the developer</h3>
<p>Only proceed when you trust the download's origin and integrity. After trying to open the app, go to <strong>System Settings → Privacy &amp; Security → Open Anyway</strong>, then confirm Open for EigenVista. Managed Macs may prevent this exception.</p>
<p>Do not disable Gatekeeper globally. Stop and report malware or damaged-app warnings instead of bypassing them. <a href="https://support.apple.com/en-us/102445">Apple explains these security messages ↗</a>.</p>
<details><summary>Optionally verify the ZIP checksum</summary><p>The companion checksum detects download corruption; it does not authenticate a publisher by itself. In Terminal, in the folder containing both downloaded files:</p><pre><code>shasum -a 256 -c ${release.stem}.zip.sha256</code></pre><p>The result should end in <code>OK</code>. The ZIP's SHA-256 is:</p><pre class="wrap-code"><code>${release.zipSha256}</code></pre></details>
<h2 id="first-run">Check your first session</h2>
<p>The ${release.version} app uses one resizable Tools pane. Find structure controls under <strong>Molecule</strong>, quantum rendering and numerical inspection under <strong>Fields</strong>, shape/meshes under <strong>Surfaces</strong>, and palettes/AO/shaders under <strong>Appearance</strong>. Move the pane left or right, resize it or hide it; <strong>Zen</strong> gives the view almost the whole window. See the <a href="reference.html#workspace">workspace guide</a>.</p>
<ol><li>Use the app's <strong>Open</strong> button and choose <code>Examples/water.pdb</code>.</li><li><strong>Molecular data</strong> should show <strong>3 atoms</strong> and <strong>2 bonds</strong>. Display bonds are computed automatically.</li><li>Drag to rotate, scroll to zoom, or use the toolbar's <strong>Zoom in</strong> and <strong>Zoom out</strong> buttons. <strong>Fit scene</strong> brings the molecule back into view.</li><li>Choose <strong>Van der Waals</strong> for space-filling spheres, then return to <strong>Ball and stick</strong>.</li><li><strong>Save</strong> to a new <code>.eigenvista</code> file and reopen it with <strong>Open</strong>.</li></ol>
<p>To try orbital and density rendering, open <code>Examples/water.molden</code> with the app’s <strong>Open</strong> button. To operate the viewer through Codex, Claude Code, Pi, OpenCode or another coding agent, follow <a href="ai-install.html">AI connection setup</a>; the connection tools are already inside the app.</p>
<div class="next-step"><span>Next</span><a href="tutorials-first-molecule.html">Your first molecule →</a><a href="tutorials-orbitals.html">Explore a supplied orbital →</a></div>
<h2 id="package">What is in the ZIP?</h2>
<div class="table-wrap"><table><thead><tr><th>Item</th><th>Purpose</th></tr></thead><tbody><tr><td><code>EigenVista.app</code></td><td>The desktop viewer, with its AI connection helper, launcher, instructions, examples and palettes inside the app.</td></tr><tr><td><code>Examples/</code></td><td>Water PDB/XYZ, a calculated water Molden file and a synthetic signed cube.</td></tr><tr><td><code>Palettes/</code></td><td>MatterViz Muted and Pastel JSON files, loading instructions and MIT notice.</td></tr><tr><td><code>Tools/eigenvista-convert</code></td><td>Optional command-line conversion without a GUI.</td></tr><tr><td><code>Shaders/</code></td><td>Optional surface-shader examples and attribution.</td></tr><tr><td>Guides, notices and source</td><td>Offline instructions, source snapshots, license notices and build information.</td></tr></tbody></table></div>
<h2 id="troubleshooting">If something does not look right</h2>
<dl><dt>No quantum fields after opening a structure</dt><dd>Open a Molden file for orbitals and densities, or a cube file for a sampled scalar field. See <a href="reference-files.html#formats">supported formats</a>.</dd><dt>A blank or distant scene</dt><dd>Use <strong>Fit scene</strong>. For sampled fields, inspect the field range and adjust the isovalue; a warning about unknown cube units does not remove the sampled field.</dd><dt>Navigation is slow</dt><dd>Turn off ambient occlusion, use a simpler representation or lower preview quality. A finer grid costs memory and computation; it is not always a better first view.</dd><dt>A graphics-context error</dt><dd>Reload or restart after a lost context. Retain original molecular inputs and save useful work regularly.</dd><dt>Need help?</dt><dd><a href="https://github.com/uvar-apps/eigenvista/issues">Report the file type, app version, macOS version and steps on GitHub ↗</a>. Only attach calculation files you are allowed to share.</dd></dl>
</article></div>`,
  },
];
