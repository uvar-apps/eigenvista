import { agentWorkspaceNote } from "./workspace.mjs";

export default [
  {
    file: "ai-tutorial-orbitals.html",
    title: "From a prompt to an orbital",
    searchTitle:
      "AI tutorial: reproduce the recorded EigenVista HOMO and X-ray session",
    description:
      "Follow seven natural-language prompts from a recorded EigenVista session: inspect Molden orbitals, render the HOMO, export PNGs and refine an X-ray surface.",
    section: "ai",
    number: "07.1",
    body: `
${agentWorkspaceNote}
<p class="lede page-lede">Seven exchanges take a real calculation from a Molden file to a smooth, luminous orbital. Give each prompt to your external agent, watch EigenVista respond, and check the result before continuing.</p>

<h2 id="get-ready">Start with the connected app</h2>
<p>Complete <a href="ai-install.html">AI connection setup</a> and read <a href="ai-guide.html">the external-agent guide</a> first. These lessons use the connection tools included in the <strong>EigenVista 0.10.0 Mac app</strong>. Use your own Codex, Claude Code, Pi, OpenCode or another local agent. Type the prompts there; EigenVista has no embedded chat box.</p>
<p>Use the included <code>bicyclic-c7h10.molden</code> example, also available as a <a href="downloads/bicyclic-c7h10.molden" download>download</a>. Your agent can download it into your input folder if needed. The input is a bicyclic C<sub>7</sub>H<sub>10</sub> calculation: <strong>17 atoms, 125 basis functions and 118 listed orbitals</strong>. Its original title is blank and its calculation method and basis-set name are unspecified. See the <a href="downloads/README.txt">source and reuse notes</a>.</p>
<p>Tell your agent which examples folder and output folder you chose during setup. Use that connected EigenVista window and those same folders throughout the lesson. Keep the original input and choose new filenames for your results.</p>
<p>The prompts follow the <a href="https://chatgpt.com/s/cx_6afa6aac0fa48191befd5ad211e86009">actual seven-exchange session</a>, with portable paths and explicit checks added. Read the <a href="https://github.com/uvar-apps/eigenvista/blob/main/docs/sample-ai-session/README.md">recorded archive</a> or <a href="https://github.com/uvar-apps/eigenvista/blob/main/docs/sample-ai-session/EigenVista-prompt-session-2026-11-16.pdf">six-page PDF</a> for the original wording and images.</p>
<figure><a href="assets/media/ai-session-xray.webp"><img src="assets/media/ai-session-xray.webp" width="1700" height="1328" alt="The actual recorded session’s final HOMO, with luminous cyan X-ray contours surrounding the C7H10 molecular framework" loading="eager" decoding="async"></a><figcaption>The recorded session’s final PNG: HOMO surfaces at ±0.03 bohr<sup>−3/2</sup>, refined from 64³ to 128³, with the X-ray finish and viewing angle retained. This is an app export from the external-agent session.</figcaption></figure>

<h2 id="connect">1. Use your connected EigenVista window</h2>
<p>Complete setup first, then copy this into your agent:</p>
<pre class="wrap-code"><code>Use the EigenVista window we connected during setup, along with my chosen examples and output folders. Tell me what document is currently open and whether anything is unsaved. Save any unsaved work to a new .eigenvista file in my output folder before opening another document. Do not discard it or start another app. Leave EigenVista running.</code></pre>
<div class="notice"><p><strong>Checkpoint:</strong> the agent describes the document in the window you are using. Any unsaved work is kept before you move on.</p></div>
<p>Choose fresh filenames when repeating a lesson. Existing files are not overwritten. Opening a new input is a separate action from saving your current work.</p>

<h2 id="frontier-orbitals">2. Ask what the file contains</h2>
<pre class="wrap-code"><code>Open bicyclic-c7h10.molden from my examples folder. Tell me its atom count and identify its HOMO and LUMO, including their energies and occupations. Check the complete orbital list before choosing them.</code></pre>
<p><strong>Checkpoint:</strong> the app contains 17 atoms, 125 basis functions and 118 orbitals. The agent should identify these two frontier orbitals from the supplied energies and occupations:</p>
<div class="table-wrap"><table><thead><tr><th scope="col">Orbital</th><th scope="col">Source identity</th><th scope="col">Energy / hartree</th><th scope="col">Occupation</th></tr></thead><tbody>
<tr><th scope="row">HOMO</th><td>MO 26 (26a)</td><td>−0.20945781051103</td><td>2</td></tr>
<tr><th scope="row">LUMO</th><td>MO 27 (27a)</td><td>−0.022452121682877</td><td>0</td></tr>
</tbody></table></div>
<p>The first 26 listed orbitals are doubly occupied. EigenVista visualizes the supplied calculation; it does not run a new electronic-structure calculation.</p>

<h2 id="signed-surfaces">3. Draw both phases of the HOMO</h2>
<pre class="wrap-code"><code>Remove any previous X-ray or clipping effect and use ordinary diffuse surface shading. Render the HOMO, MO 26, as positive and negative isosurfaces at an isovalue of 0.03 and grid resolution 64. Make the positive phase teal and the negative phase pink. Wait until both surfaces are finished, then fit the molecule in the view.</code></pre>
<p><strong>Checkpoint:</strong> two signed surfaces surround the framework, one at +0.03 and one at −0.03 bohr<sup>−3/2</sup>, sampled on a 64 × 64 × 64 grid. In the recorded session the positive phase is teal and the negative phase pink. Wait for generation to finish and check that both signs are visible.</p>
<p>This adaptation explicitly starts with ordinary surface shading when reusing an instance. Opening a document can retain a session’s X-ray or clipping shader; clearing it makes the two phase colors visible before you add the X-ray finish in step 6.</p>
<p>The colors show the <strong>sign of orbital amplitude</strong>, not positive and negative electric charge. Squaring an orbital removes that sign. A surface encloses a chosen amplitude level; it is not a hard boundary of the electron.</p>

<h2 id="compose">4. Compose the view</h2>
<pre class="wrap-code"><code>Set the background to dark blue #10243a, enable ambient occlusion for the molecule, and rotate the current view 30 degrees horizontally and 15 degrees vertically. Confirm those changes without changing the orbital surfaces.</code></pre>
<p><strong>Checkpoint:</strong> the background is dark blue, the atomic framework gains AO shading, and the camera turns from its fitted pose. The HOMO’s isovalue and mesh resolution remain unchanged.</p>
<p>Ambient occlusion adds visual depth to the molecule. It is a display effect, independent of the orbital calculation and the field’s two phases.</p>

<h2 id="export">5. Export opaque and transparent PNGs</h2>
<pre class="wrap-code"><code>Save this view as homo.png in my output folder. Also export homo-transparent.png with a transparent background. Use fresh filenames if either exists. Show me both images here and tell me their dimensions and where they were saved.</code></pre>
<p><strong>Checkpoint:</strong> both PNG files exist and open. The opaque image includes <code>#10243a</code>; the transparent one has an alpha background while keeping the molecular and surface shading. The recorded exports are 1700 × 1328 pixels; your dimensions follow your actual viewport. Inspect the images, not just the filenames.</p>
<p>Export captures the current view and does not save a molecular document. The visible background is restored after a transparent export.</p>

<h2 id="xray">6. Give the surfaces an X-ray finish</h2>
<pre class="wrap-code"><code>Give both HOMO surfaces an X-ray finish: make their front-facing centers almost transparent and their contours strong and cyan. Use the built-in X-ray preset and adjust its available appearance controls. Keep the current viewing angle and dark blue background. Export a new homo-xray.png in my output folder and show it to me.</code></pre>
<p><strong>Checkpoint:</strong> the framework is visible through the shell and its contours are more prominent. Both signed surfaces remain at the same isovalue and 64³ resolution; only their finish changes.</p>
<p>A useful starting point is zero minimum opacity, 85% maximum opacity and a cutoff that removes opacity below 3%. These are suggested appearance settings; the recording did not preserve its exact numeric adjustments. Ask the agent to inspect the result as it tunes them. This visual finish is not an X-ray simulation.</p>

<h2 id="refine">7. Round the contours</h2>
<pre class="wrap-code"><code>Remember the exact current viewing angle and framing. Increase the HOMO mesh grid resolution from 64 to 128, keeping the same ±0.03 isosurfaces. Wait for the new surfaces to finish and tell me their triangle count. Restore the previous angle and framing afterward, and check that they match the preceding image. Keep the same X-ray finish and background. Export a new homo-xray-128.png in my output folder and show me the result.</code></pre>
<p><strong>Checkpoint:</strong> the surfaces have smoother contours at 128³, with the preceding view restored and the X-ray settings unchanged. The recorded final result has <strong>18,736 triangles</strong>. Compare the settings and actual image if your result differs; a larger grid improves spatial sampling without changing the supplied wavefunction.</p>
<p>Regenerating geometry can change the framing automatically. Asking the agent to remember and restore the view keeps the before-and-after comparison useful.</p>
<p>The isovalue 0.03 specifies the magnitude for both orbital signs. Refining this orbital replaces its saved meshes. Keep a separate molecular document if you want both resolutions.</p>

<h2 id="keep-going">Keep exploring</h2>
<p>To retain the scientific data and generated geometry, ask the agent to save a new <code>.eigenvista</code> file in your output folder. Viewing angle, shader appearance, AO and background are session settings, so keep your prompts and PNGs to reproduce the appearance. The <a href="ai-tutorial-density.html">density lesson</a> explains what is saved and compares direct sampled rendering with mesh-based cutaways.</p>
<p>If a calculation is slow, use the <a href="ai-tutorial-density.html#jobs-and-cancel">cancellation prompt</a>. Starting a calculation is not the same as finishing it; ask the agent to check its progress before continuing.</p>
<div class="next-step"><span>More AI lessons</span><a href="ai-tutorial-density.html">Density and interiors →</a><a href="ai-tutorial-ao.html">Ambient occlusion →</a><a href="ai-tutorial-representations.html">Molecular representations →</a></div>
`,
  },
  {
    file: "ai-tutorial-density.html",
    title: "Look inside electron density",
    searchTitle:
      "AI tutorial: density volume rendering, X-ray surfaces and clipping",
    description:
      "Ask an external AI agent to discover occupation-derived density, compare volume and raycast previews, generate a mesh, reveal its interior and save the molecular document.",
    section: "ai",
    number: "07.2",
    body: `
${agentWorkspaceNote}
<p class="lede page-lede">Move from a signed orbital to a density envelope. Explore the sampled field first, then make geometry you can shade, cut open and save.</p>

<h2 id="get-ready">Use the same real calculation</h2>
<p>Complete <a href="ai-install.html">AI connection setup</a> and read <a href="ai-guide.html">the external-agent guide</a>. This lesson uses the connection tools included in the <strong>EigenVista 0.10.0 Mac app</strong>. Give the prompts to your external Codex, Claude Code, Pi, OpenCode or other local agent; there is no embedded EigenVista chat box.</p>
<p>Use the included <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a>, the same 17-atom C<sub>7</sub>H<sub>10</sub> example as the <a href="ai-tutorial-orbitals.html">recorded orbital lesson</a>. Your agent can also download it into the input folder. Use the connected window and folders chosen during setup. Keep the original input and use new filenames for your results.</p>
<p>Here density is the occupation-weighted sum of squared <strong>listed</strong> orbitals: ρ(r) = Σ n<sub>i</sub>|ψ<sub>i</sub>(r)|². It is nonnegative and has units of electrons/bohr³. It has no positive/negative orbital phase. The importer cannot recover omitted orbitals or core electrons, and the source does not identify its calculation method. This is an occupation-derived density, not a new SCF calculation or an independently supplied correlated density.</p>

<h2 id="discover-density">1. Discover the density by its meaning</h2>
<pre class="wrap-code"><code>Use our connected EigenVista window. Save any unsaved work to a new .eigenvista file in my output folder before opening another document; do not discard it. Open bicyclic-c7h10.molden from my examples folder. Find the total electron density derived from the listed orbital occupations, checking its scientific meaning rather than just its name. Tell me its units and the atom, basis-function and orbital counts. Remove any previous X-ray or clipping effect.</code></pre>
<div class="notice"><p><strong>Checkpoint:</strong> the document has 17 atoms, 125 basis functions and 118 orbitals. The density is described as occupation-derived, with units of electrons/bohr³. Its label may simply say “Occupation-derived density (listed orbitals)”.</p></div>
<p>An imported cube with unspecified scalar meaning is unsuitable for this lesson: its filename cannot establish that it contains electron density.</p>

<h2 id="volume">2. Explore a volume without generating meshes</h2>
<pre class="wrap-code"><code>Show that total density as a volume preview at grid resolution 48 and isovalue 0.04 electrons/bohr³. Use #93e8d9 for the density, 100% opacity and a #17232d background. Show the molecule as ball and stick. Wait until the preview finishes, then fit it in the view. Confirm that no surface meshes were created. Export density-volume-48.png in my output folder and show me the image.</code></pre>
<p><strong>Checkpoint:</strong> a volume preview appears at 48³ and <strong>no saved surfaces</strong> have been created. The density is sampled directly for rendering. At this stage an image exists, but there is no new mesh geometry to save.</p>
<p>The 0.04 electrons/bohr³ value controls how the field is displayed. Volume opacity accumulates samples along viewing rays; the result is not a sharp physical skin around a molecule.</p>

<h2 id="raycast">3. Compare a sampled raycast</h2>
<pre class="wrap-code"><code>Remember the current viewing angle and framing. Keep the same density, 0.04 isovalue and colors, but switch to a sampled raycast preview at grid resolution 64. Wait until it finishes, then restore the same angle and framing for comparison. Confirm that there are still no saved surface meshes. Export density-raycast-64.png in my output folder, show it beside the volume image and explain what changed.</code></pre>
<p><strong>Checkpoint:</strong> the raycast preview uses a 64³ grid and the saved-surface count stays zero. The apparent boundary is rendered from sampled values; neither preview creates mesh geometry. Because this step also increases spatial resolution, use the same resolution for both modes if you want to compare only the rendering method.</p>
<p>Sampling quality is a separate display choice: it changes samples along rays, while grid resolution changes samples in space. Neither creates additional quantum-chemistry input data.</p>

<h2 id="mesh">4. Keep a density surface</h2>
<pre class="wrap-code"><code>Remember the current viewing angle and framing. Generate a surface mesh for this density at isovalue 0.04 electrons/bohr³ and grid resolution 128. Wait until it is finished, then tell me the isovalue, grid resolution and triangle count. Restore the previous angle and framing after generation, check that they match the preview and show me the completed surface.</code></pre>
<p><strong>Checkpoint:</strong> a saved positive density surface now appears at 0.04 electrons/bohr³, generated on a 128³ grid. The view matches the preceding preview after the agent restores it. There is no negative-phase partner for this nonnegative total density.</p>
<p>A mesh is an extracted constant-density surface. It can be retained in the native file and given a surface shader; the direct sampled previews did not create this geometry.</p>

<h2 id="xray">5. See the framework through the shell</h2>
<pre class="wrap-code"><code>Give the density surface an X-ray finish so I can see the framework through it. Use the built-in X-ray preset with transparency enabled, zero minimum opacity, 85% maximum opacity and a cutoff that removes opacity below 3%. Keep the same viewing angle and background. Export density-xray-128.png in my output folder and show me the image.</code></pre>
<p><strong>Checkpoint:</strong> the density geometry and triangle count are unchanged, while front-facing areas become more transparent and the outline stays stronger. The shader is an appearance effect on a mesh; the density values are unchanged.</p>
<figure><a href="assets/media/quantum-xray.webp"><img src="assets/media/quantum-xray.webp" alt="A real EigenVista density surface with an X-ray finish revealing the C7H10 atomic framework" loading="lazy" decoding="async"></a><figcaption>A separate real GUI capture of this example’s occupation-derived total density at 0.04 electrons/bohr³ on a 256³ mesh. It illustrates the finish; its resolution and camera differ from this 128³ agent workflow.</figcaption></figure>

<h2 id="clip">6. Cut a window into the density</h2>
<pre class="wrap-code"><code>Replace the X-ray finish with the built-in surface-clipping preset and make the remaining shell opaque. Keep the clipping coordinate scale at 0.24. Set the clipping box to -10 through 10 on each axis, then lower its upper z boundary to 0.25 to open a window. Rotate 35 degrees horizontally and 15 degrees vertically to inspect the opening. Export density-clipped-128.png and a transparent-background density-clipped-128-transparent.png in my output folder. Show me both.</code></pre>
<p><strong>Checkpoint:</strong> a clipping plane exposes the molecular framework inside the envelope. The saved mesh and scientific field still have the same counts and values: the shader hides fragments rather than cutting atoms or rewriting geometry. The exported transparent background is independent of the surface shader’s own transparency setting.</p>
<figure><a href="assets/media/quantum-clipped.webp"><img src="assets/media/quantum-clipped.webp" alt="The C7H10 density envelope clipped open to expose carbon and hydrogen atoms inside" loading="lazy" decoding="async"></a><figcaption>The same clipping parameters on a 256³ density mesh in a separate GUI capture. Its oblique camera was chosen interactively to show the opening; it is not a screenshot of the 128³ prompt sequence.</figcaption></figure>
<p>Keep the clipping coordinate scale fixed while moving a boundary. To look from the other side, ask the agent to rotate the view; to restore the complete shell, remove the clipping effect.</p>

<h2 id="save">7. Save data and preserve the view</h2>
<pre class="wrap-code"><code>Save the current molecular document as c7h10-density.eigenvista in my output folder, using another fresh name if it exists. Confirm that the file was saved successfully and contains our latest work. Tell me what it retains. Record the current view, surface finish and appearance settings, ambient occlusion and background in your response so I can recreate this image later. Leave EigenVista running.</code></pre>
<p><strong>Checkpoint:</strong> the new molecular file exists and contains your latest work. It retains molecular data, basis/orbitals, the occupation-derived density, provenance, generated mesh and its generation settings. Global representation, surface colors, opacity and saved-mesh visibility are also document appearance.</p>
<p><strong>Viewing angle, surface finish, AO and background are session settings.</strong> They are not stored in <code>.eigenvista</code>. Sampled orbital/density previews must also be prepared again after reopening. Keep the recorded prompts/settings and PNGs with the molecular file; reapply the appearance to recreate the view. See <a href="reference.html#persistence">what is saved</a>.</p>

<h2 id="jobs-and-cancel">Follow progress and stop a calculation</h2>
<p>Starting a calculation does not mean it has finished. Ask the agent to wait for the completed result before judging an image or moving to the next step. Live percentages describe the current phase, not the whole calculation. If the agent stops waiting, the app may still be working; ask it to check progress again.</p>
<p>If a preview or mesh step is taking longer than you want, give this prompt while that work is active:</p>
<pre class="wrap-code"><code>Check the density calculation I just requested. If it is still waiting or running, cancel only that calculation and wait until the app is ready again. Keep every previously completed surface. Tell me whether it was cancelled or had already finished. If it already finished, leave its result in place.</code></pre>
<p><strong>Checkpoint:</strong> the calculation has stopped and the app is ready again. Completed geometry from earlier steps remains. If the calculation finished before cancellation, its result stays in place. Ask for a lower grid resolution if you want a quicker retry.</p>
<div class="next-step"><span>More AI lessons</span><a href="ai-tutorial-orbitals.html">Recorded orbital session →</a><a href="ai-tutorial-ao.html">Ambient occlusion →</a><a href="ai-tutorial-representations.html">Molecular representations →</a></div>
`,
  },
];
