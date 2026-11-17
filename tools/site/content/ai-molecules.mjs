import { agentWorkspaceNote } from "./workspace.mjs";

export default [
  {
    file: "ai-tutorial-ao.html",
    title: "Read crowded molecules with AO",
    searchTitle:
      "AI tutorial: large molecules, atomic representations and ambient occlusion",
    description:
      "Ask an external agent to compare atomic representations and matched-camera ambient-occlusion images of the 58,870-atom 1AON complex in EigenVista.",
    section: "ai",
    number: "07.3",
    body: `
${agentWorkspaceNote}
      <p class="lede page-lede">Turn a crowded atomic view into a readable study of molecular packing. Ask your agent to compare three representations, add matte ambient occlusion, and keep a pair of images from exactly the same camera.</p>

      <h2 id="get-ready">Get ready</h2>
      <p>Complete <a href="ai-install.html">external-agent setup</a> and read the <a href="ai-guide.html">AI control guide</a> first. Give the prompts to Codex, Claude Code, Pi, OpenCode, or another connected local agent that can inspect images. The connection tools are included in the <strong>EigenVista 0.8.0 Mac app</strong>.</p>
      <p>The agent can download <a href="downloads/1AON.cif" download>1AON.cif</a> into your input folder and use the included MatterViz Pastel palette. If you already have those files, give it their locations. The palette is also available as <a href="downloads/matterviz-pastel.json" download>matterviz-pastel.json</a>. Keep original inputs and choose new output names for repeated runs.</p>
      <p>The input is the deposited GroEL–GroES chaperonin complex, <a href="https://www.rcsb.org/structure/1AON">RCSB PDB 1AON</a>. EigenVista imports <strong>58,870 selected atoms</strong>. The goal is two comparison PNGs, a closer finished view, and a native molecular document.</p>

      <h2 id="open-and-check">1. Open the complex</h2>
      <p>Copy this into your external agent after supplying the approved file locations from setup:</p>
      <pre class="wrap-code"><code>Use my connected EigenVista instance and only the input and output directories I approved. If the current molecule has unsaved work, save it under a new name before replacing it; never discard it silently.

      Open 1AON.cif. If I do not already have it, download https://uvar-apps.github.io/eigenvista/downloads/1AON.cif into my input folder first. Tell me how many atoms and chains were imported, which kinds of biological components are present, and whether the secondary-structure assignments came from the deposited file. Check for 58,870 selected atoms and summarize any import warnings before changing the view.</code></pre>
      <div class="notice"><p><strong>Checkpoint:</strong> the agent reports 58,870 atoms and the imported biological identities, preserving any earlier work. Let import and scene preparation finish before judging the picture.</p></div>

      <h2 id="load-pastel">2. Give the atoms a lighter palette</h2>
      <p>MatterViz Pastel is recommended for AO: its light element colors leave room for shaded contacts and cavities. Ask the agent to load the downloaded palette and prepare a complete atomic view.</p>
      <pre class="wrap-code"><code>Load the included matterviz-pastel.json palette and color the structure by element. Show the complete complex, removing any earlier chain or component filters and special representation choices. Use Ball and stick for the whole structure, turn ambient occlusion off, choose automatic AO radius, and set the background to #ecebe4.

      Fit the whole complex in the view. Confirm that MatterViz Pastel is active and show me a PNG so I can check the lighter element colors.</code></pre>
      <p><strong>Checkpoint:</strong> the full complex is framed and its atom colors use Pastel. Chain, entity and secondary-structure coloring serve different tasks; Element coloring displays the palette’s element colors.</p>

      <h2 id="compare-atomic-views">3. Choose the atomic representation</h2>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Representation</th><th scope="col">Use it to read</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ball and stick</th><td>Atomic positions and connectivity; a dense whole-complex view can be visually busy.</td></tr>
          <tr><th scope="row">Liquorice</th><td>The connected atomic framework with a more uniform stick-like appearance.</td></tr>
          <tr><th scope="row">Van der Waals</th><td>Space-filling atomic envelopes, packing and broad recesses; bond cylinders are hidden.</td></tr>
        </tbody>
      </table></div>
      <pre class="wrap-code"><code>Keep the camera, background and palette fixed, with ambient occlusion off. Compare Ball and stick, Liquorice and Van der Waals in that order. Save a new PNG of each in my approved output directory and show me the actual images.

      Wait for each view to finish preparing before taking its picture. Explain what each representation reveals about this crowded complex, then leave Van der Waals selected. Preserve the imported atoms and connectivity.</code></pre>
      <p><strong>Checkpoint:</strong> three images show different depictions of the same complex. Van der Waals has atomic spheres without bond cylinders; hiding those cylinders does not remove connectivity from the document.</p>

      <h2 id="matched-ao-comparison">4. Compare AO off and on from one camera</h2>
      <p>Choose a view with both outer contacts and a broad recess visible. The agent can orbit and zoom before the pair, but must keep the camera fixed between captures.</p>
      <pre class="wrap-code"><code>With Van der Waals selected, fit the complete structure, rotate the view 25 degrees horizontally and 10 degrees vertically, and zoom in by a factor of 1.08. Keep that exact camera angle and framing for the comparison.

      Save a new 1aon-ao-off.png with ambient occlusion off. Then enable ambient occlusion at 100% strength with automatic radius and save a new 1aon-ao-on.png. Wait for each image to finish, then show them side by side. Keep the representation, palette, background and image dimensions unchanged. Confirm that the camera matches and tell me the radius used.</code></pre>
      <figure><img src="assets/media/1aon-ao-off.webp" alt="The complete 1AON complex as Pastel element-colored Van der Waals spheres with normal molecular shading and ambient occlusion off" loading="lazy" decoding="async"><figcaption>Reference capture: normal molecular material, AO off, MatterViz Pastel, Element coloring, Van der Waals spheres and background <code>#ecebe4</code>. The next image uses the same camera and geometry. These existing reference captures used a palette loaded through the GUI.</figcaption></figure>
      <figure><img src="assets/media/1aon-ao-on.webp" alt="The matching 1AON view with matte Lambert shading plus screen-space ambient occlusion, emphasizing contacts and broad cavities" loading="lazy" decoding="async"><figcaption>Reference capture: AO on at 100% strength with automatic radius. Active AO uses Lambert shading plus SSAO, without specular highlights. The comparison includes the matte material change as well as the occlusion effect.</figcaption></figure>
      <p><strong>Checkpoint:</strong> the two exported views have matching framing and element colors, while AO emphasizes contacts and recesses. Off, or zero strength, restores the normal molecular material. The reference images illustrate the result; your chosen orbit need not reproduce their exact angle.</p>
      <p>AO shades <strong>atomic spheres and bonds only</strong>. Protein ribbons, cartoons and custom field surfaces keep their own materials. It is an approximate screen-space depth cue, so visible shading can change with the camera and cannot account for all hidden or offscreen geometry.</p>

      <h2 id="tune-and-navigate">5. Tune the scale, then move closer</h2>
      <p>Automatic radius comes from the atom-coordinate extent and stays fixed as you zoom. Compare a gentler strength and a smaller neighborhood before moving the camera.</p>
      <pre class="wrap-code"><code>Keep the comparison camera fixed. Lower AO strength to 60%, save a new comparison PNG, and show it beside the 100% image. Then use 100% strength with a manual radius of 8 angstroms. Save another PNG and explain how the scale of the shading changes.

      Return to automatic radius. Rotate a further 15 degrees horizontally and zoom in by a factor of 1.15 to explore a recess. Show me a new image and explain which broad features remain readable. If the model is clipped, zoom out without changing its molecular data.</code></pre>
      <p><strong>Checkpoint:</strong> changing radius adjusts the scale of the shading, while camera movement changes its screen-space appearance. Manual radius supports 0.25–50 Å. The final view uses automatic radius again. If navigation is slow, ask the agent to turn AO off while you explore.</p>

      <h2 id="keep-the-result">6. Keep the view and the molecular data</h2>
      <pre class="wrap-code"><code>Keep this Van der Waals view, the Pastel palette and the current AO settings. Save two new final PNGs in my approved output directory: one with the current background and one with a transparent background. Show me both, check that the transparent one has an alpha background, and report their filenames and dimensions.

      Save a new molecular document named 1aon-packing.eigenvista without overwriting anything. Record the camera, background, palette, Element coloring and AO settings in your reply so I can recreate this appearance later.</code></pre>
      <p><strong>Checkpoint:</strong> you have the comparison images, two finished PNGs, and a new native file. The native document retains the selected molecular data, biological identities, connectivity and global representation. AO, palette, background, biological display choices and camera are session settings; Save does not preserve them. A PNG preserves the rendered appearance.</p>
      <p>If a save or image export fails, ask the agent to check the destination before retrying and use fresh names for existing files. An AO enhancement error leaves normal molecular rendering available; ask the agent to disable and re-enable AO before trying again.</p>

      <h2 id="sources-and-next">Sources and next steps</h2>
      <p>Structure and original scientific citation: <a href="https://www.rcsb.org/structure/1AON">RCSB PDB 1AON</a>. The palette preserves Janosh Riebesell’s MatterViz colors for elements 1–109; see the <a href="downloads/LICENSE-MatterViz.txt">MIT notice</a>. <a href="downloads/README.txt">Download sources and reuse notes</a> and the <a href="assets/media/provenance.json">image provenance record</a> accompany the examples.</p>
      <div class="next-step"><span>Continue with your agent</span><a href="ai-tutorial-representations.html">Read the assembly with protein views →</a><a href="ai-tutorial-orbitals.html">Explore frontier orbitals →</a><a href="ai-tutorial-density.html">Shape a density surface →</a></div>
    `,
  },
  {
    file: "ai-tutorial-representations.html",
    title: "Read a large protein assembly",
    searchTitle:
      "AI tutorial: protein trace, tube, ribbon and cartoon representations",
    description:
      "Use natural-language prompts to compare four protein representations of 1AON, distinguish chains and entities, and focus on one protein chain.",
    section: "ai",
    number: "07.4",
    body: `
${agentWorkspaceNote}
      <p class="lede page-lede">Step back from atomic packing to see how a large complex is organized. Ask your agent to compare backbone traces, smooth tubes, ribbons and cartoons, then study the deposited fold of one chain.</p>

      <h2 id="get-ready">Get ready</h2>
      <p>Complete <a href="ai-install.html">external-agent setup</a> and read the <a href="ai-guide.html">AI control guide</a>. The connection tools are included in the <strong>EigenVista 0.8.0 Mac app</strong>. Give the prompts to your connected Codex, Claude Code, Pi, OpenCode, or another local agent with an image viewer.</p>
      <p>Use <a href="downloads/1AON.cif" download>1AON.cif</a> again, this time to study the GroEL–GroES assembly rather than its crowded atomic envelope. Give your agent the file location and the folder where you want the pictures saved, using the connection established during setup. Keep original inputs and use new output names for repeated runs.</p>
      <p>Outcome: four protein-view PNGs, a chain-colored assembly overview, and a focused chain illustration.</p>

      <h2 id="inspect-the-structure">1. Inspect the structure before choosing a view</h2>
      <pre class="wrap-code"><code>Use my connected EigenVista instance. If 1AON.cif is already open, continue with it. Otherwise save any unsaved work under a new name before opening 1AON.cif. If needed, download https://uvar-apps.github.io/eigenvista/downloads/1AON.cif into my input folder first. Never discard existing work silently.

      Tell me the imported atom and chain counts, the kinds of biological components present, and whether the secondary-structure assignments came from the deposited file. Expect 58,870 selected atoms. Show the complete structure, removing earlier visibility filters and special chain or component representation choices. Turn ambient occlusion off, use Element coloring and set the background to #ecebe4.</code></pre>
      <p><strong>Checkpoint:</strong> the full imported complex is available for comparison and the agent reports its biological identities. Keep one coloring choice throughout the four-view comparison.</p>

      <h2 id="representation-map">Choose the level of detail</h2>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">Global representation</th><th scope="col">Useful question</th></tr></thead>
        <tbody>
          <tr><th scope="row">Ball and stick</th><td>Where are the atoms and their connections?</td></tr>
          <tr><th scope="row">Liquorice</th><td>How does the connected atomic framework run through this region?</td></tr>
          <tr><th scope="row">Van der Waals</th><td>How tightly do atomic envelopes pack? Try the <a href="ai-tutorial-ao.html">AO lesson</a>.</td></tr>
          <tr><th scope="row">Backbone trace</th><td>How do the protein backbone paths arrange themselves across the assembly?</td></tr>
          <tr><th scope="row">Smooth tube</th><td>How do those paths flow through space when drawn as rounded tubes?</td></tr>
          <tr><th scope="row">Ribbon</th><td>How do the oriented protein ribbons fold within each subunit?</td></tr>
          <tr><th scope="row">Secondary-structure cartoon</th><td>Where do deposited helices, strand arrows and connecting loops organize the fold?</td></tr>
        </tbody>
      </table></div>
      <p>The first three modes depict atoms. The four protein modes draw the backbone while nonprotein components retain atomic detail. Missing backbone atoms, chain ends and unsupported gaps break paths; the viewer does not draw invented connections. Missing secondary assignments remain thin gray unassigned loops in ribbon/cartoon views.</p>

      <h2 id="trace-and-tube">2. Follow the backbone with trace and tube</h2>
      <pre class="wrap-code"><code>Show the complete assembly as a Backbone trace. Wait for the view to finish preparing, fit the whole complex, then rotate 25 degrees horizontally and 10 degrees vertically. Keep this exact camera angle and framing for all four protein views.

      Save and show me a new 1aon-trace.png. Change only the representation to Smooth tube, wait for it to finish preparing, then save and show me a new 1aon-tube.png. Compare the backbone paths and rounded tubes at matching framing.</code></pre>
      <p><strong>Checkpoint:</strong> trace and tube follow the same protein paths, with different thickness and shape. Atom and chain counts remain unchanged. On this large input, wait for protein geometry to finish preparing before judging a blank or old view.</p>

      <h2 id="ribbon-and-cartoon">3. Compare ribbons and secondary-structure cartoons</h2>
      <pre class="wrap-code"><code>Keep the same assembly camera, background, colors and visible components. Show Ribbon, wait for it to finish preparing, then save and show me a new 1aon-ribbon.png. Repeat with Secondary-structure cartoon and save 1aon-cartoon.png.

      Compare how ribbons, helical regions, strand arrows and connecting loops reveal the folds. Explain which assignments were supplied by the deposited structure. Describe missing or unassigned regions as unknown, without predicting secondary structure. Leave the cartoon view selected.</code></pre>
      <figure><img src="assets/media/1aon-cartoon-chain.webp" alt="The complete 1AON assembly in protein cartoons, with deposited chain instances distinguished by color" loading="lazy" decoding="async"><figcaption>Reference capture: the full 1AON complex in protein cartoons with Chain coloring. This existing image was made with the GUI; the next step asks your agent to choose the biological colors. Protein depiction geometry uses its own diffuse shading, outside molecular AO.</figcaption></figure>
      <p><strong>Checkpoint:</strong> you have four distinct protein-view images of one assembly. Unknown secondary structure remains explicit even with chain or entity coloring. If carbonyl orientation is unavailable, the app can show a thin tube with an informational notice; isolated backbone points remain markers.</p>

      <h2 id="compare-chain-colors">4. Distinguish chains and entities</h2>
      <p>Chain coloring separates deposited chain instances. Entity coloring groups chains that belong to the same supplied molecular entity. Their legends identify the colors; color alone does not establish identity.</p>
      <pre class="wrap-code"><code>Keep the complete assembly in the cartoon representation and keep the camera fixed. Color it by Chain, save a new 1aon-chains.png and show me the image. Then color it by Entity, save a new 1aon-entities.png and show me that image too.

      Explain how chain instances differ from molecular entities in this deposited structure, using the imported identities and the images. Preserve the molecule and the four earlier comparison views.</code></pre>
      <p><strong>Checkpoint:</strong> chain colors distinguish subunits, while chains sharing an entity receive the same entity color. The complete molecular data remain unchanged.</p>

      <h2 id="focus-a-chain">5. Focus on one deposited fold</h2>
      <pre class="wrap-code"><code>Find protein chain A using the deposited chain identities. Isolate it and frame that visible chain closely. Keep the cartoon representation, and color it by the deposited secondary structure.

      Save and show me a new 1aon-chain-a.png. Point out helices, strand arrows and unassigned connecting regions in the actual image. Keep unknown assignments explicit, and confirm that the other chains are hidden rather than removed from the molecular document.</code></pre>
      <figure><img src="assets/media/1aon-chain-secondary.webp" alt="An isolated 1AON chain A in a protein cartoon with deposited secondary-structure colors and gray unassigned regions" loading="lazy" decoding="async"><figcaption>Reference capture: chain A isolated and focused, with deposited secondary-structure coloring. This existing image was made with the GUI. Isolation hides other chains without removing their molecular data.</figcaption></figure>
      <p><strong>Checkpoint:</strong> one protein chain fills the view. Assigned helices and strands are distinct from gray unassigned regions. EigenVista uses deposited annotations; it does not run DSSP or predict missing assignments.</p>

      <h2 id="finish-and-save">6. Finish the overview and keep the result</h2>
      <pre class="wrap-code"><code>Restore the complete structure and remove any chain or component representation choices that would override the whole-assembly view. Use Secondary-structure cartoon for the protein, color by Chain, and frame the entire complex. Choose a readable overview with rotation and zoom, and show me a candidate image before the final export.

      Save new opaque and transparent overview PNGs in my approved output directory. Show me both images and report their filenames and dimensions. Save a new 1aon-assembly.eigenvista without overwriting anything. Record the camera, representation, coloring and other display choices so I can recreate this presentation.</code></pre>
      <p><strong>Checkpoint:</strong> the overview shows the whole complex and the focused-chain PNG shows the chosen subunit. Save retains molecular data, biological identities, connectivity and the global representation. Biological coloring, visibility, isolation, residue ranges, per-chain/component styles, focus, camera, background and palette are session choices; record them with the images if you want to reproduce the presentation.</p>
      <p>The <a href="ai-tutorial-ao.html">atomic-packing lesson</a> shows the complementary Ball and stick, Liquorice and Van der Waals views with <a href="downloads/matterviz-pastel.json" download>MatterViz Pastel</a>. AO shades atomic spheres and bonds, not the protein ribbons or custom field surfaces.</p>

      <h2 id="sources-and-next">Sources and next steps</h2>
      <p>Structure and original scientific citation: <a href="https://www.rcsb.org/structure/1AON">RCSB PDB 1AON</a>. Keep the <a href="downloads/README.txt">download sources and reuse notes</a> with redistributed inputs; the <a href="assets/media/provenance.json">image provenance record</a> documents the real application captures. The <a href="reference-structures.html">biological structure reference</a> covers component filters, residue ranges and identity labels.</p>
      <div class="next-step"><span>More external-agent lessons</span><a href="ai-tutorial-ao.html">Read atomic packing with AO →</a><a href="ai-tutorial-orbitals.html">Explore frontier orbitals →</a><a href="ai-tutorial-density.html">Shape a density surface →</a></div>
    `,
  },
];
