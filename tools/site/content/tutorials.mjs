export default [
  {
    file: "tutorials.html",
    title: "Learn EigenVista by doing",
    searchTitle: "Molecular visualization tutorials",
    description:
      "Learn molecular visualization with downloadable examples: PDB and XYZ structures, Molden orbitals, Gaussian Cube fields, and ambient occlusion on 1AON.",
    section: "tutorials",
    number: "04",
    body: `
      <h2 id="before-you-start">Before you start</h2>
      <p>Use the <a href="install.html">EigenVista 0.8.0 Mac preview</a> for these lessons. Open the downloaded example files with the app’s <strong>Open</strong> button. The website supplies instructions and data; the installed app runs the local molecular workflows.</p>
      <p>Start with the first lesson if you are new to the viewport. Then choose the kind of data you work with. Keep the original inputs and save your work to new <code>.eigenvista</code> files.</p>

      <h2 id="learning-path">Your learning path</h2>
      <ol>
        <li><p><a href="tutorials-first-molecule.html"><strong>Open, inspect, and save your first molecule</strong></a>. Use three-atom water to learn rotation, zoom, picking, representations, and native Save.</p></li>
        <li><p><a href="tutorials-orbitals.html"><strong>Explore orbitals from a real calculation</strong></a>. Explore the HOMO and LUMO of a bicyclic hydrocarbon, compare volume and surface views, and save a smooth orbital mesh.</p></li>
        <li><p><a href="tutorials-cube.html"><strong>Inspect a sampled cube field</strong></a>. Explore a scalar field around a 29-atom complex, compare volume and surface views, and save the grid with its mesh.</p></li>
        <li><p><a href="tutorials-ao.html"><strong>Read a large biological structure</strong></a>. Use MatterViz Pastel and ambient occlusion on 1AON, then switch to chain cartoons and isolate a chain.</p></li>
      </ol>

      <h2 id="ai-learning-path">Explore with your AI agent</h2>
      <p>The <a href="ai.html">AI connector guide</a> explains how to use Codex, Claude Code, Pi, OpenCode or another local coding agent with the installed viewer and its bundled helper. EigenVista 0.8.0 for Mac includes everything needed to connect the viewer to your agent; complete the setup guide before starting these lessons.</p>
      <ol>
        <li><a href="ai-tutorial-orbitals.html">From a prompt to a HOMO figure</a>: a recorded orbital, shader and image-export session.</li>
        <li><a href="ai-tutorial-density.html">Explore electron density</a>: direct volume sampling, an envelope mesh and a view into the molecular interior.</li>
        <li><a href="ai-tutorial-ao.html">Read crowded atomic structure</a>: ambient occlusion and atomic representations on a large molecular assembly.</li>
        <li><a href="ai-tutorial-representations.html">Find the assembly's shape</a>: trace, tube, ribbon and cartoon views, with atomic detail when you need it.</li>
      </ol>

      <h2 id="example-files">Download the examples</h2>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">File</th><th scope="col">What it contains</th><th scope="col">Lesson</th></tr></thead>
        <tbody>
          <tr><td><a href="downloads/water.pdb" download>water.pdb</a> or <a href="downloads/water.xyz" download>water.xyz</a></td><td>Water geometry: 3 atoms and 2 display bonds after import; no quantum fields</td><td><a href="tutorials-first-molecule.html">First molecule</a></td></tr>
          <tr><td><a href="downloads/bicyclic-c7h10.molden" download="bicyclic-c7h10.molden">bicyclic-c7h10.molden</a></td><td>C<sub>7</sub>H<sub>10</sub> hydrocarbon: 17 atoms, 125 basis functions, 118 orbitals and occupation-derived total density</td><td><a href="tutorials-orbitals.html">Orbitals</a></td></tr>
          <tr><td><a href="downloads/complex-field.cube" download="complex-field.cube">complex-field.cube</a></td><td>An imported scalar field around a 29-atom complex: 84³ grid, 592,704 samples, values from 0 to 1</td><td><a href="tutorials-cube.html">Cube field</a></td></tr>
          <tr><td><a href="downloads/1AON.cif" download>1AON.cif</a> and <a href="downloads/matterviz-pastel.json" download>matterviz-pastel.json</a></td><td>A large deposited biological structure and an optional element-color palette</td><td><a href="tutorials-ao.html">Large structures and AO</a></td></tr>
        </tbody>
      </table></div>
      <p>Read the <a href="downloads/README.txt">example sources and reuse notes</a> before redistributing the data. After downloading the examples, these local app workflows do not need an internet connection.</p>

      <h2 id="checkpoints">How to use the checkpoints</h2>
      <p>Each lesson gives an expected result before the next action. Wait for the footer’s completed result when a calculation is running. A calculation’s live phase percentage is not a whole-job completion indicator. <strong>Cancel</strong> retains previously completed surfaces.</p>
      <p>If your controls differ, check the installed version and expand the relevant sidebar heading. Use <strong>Fit scene</strong> if an object appears missing. The <a href="reference.html">user reference</a> covers the complete controls and current limits; the <a href="gallery.html">gallery</a> shows real application captures.</p>
    `,
  },
  {
    file: "tutorials-first-molecule.html",
    title: "Your first molecule",
    searchTitle: "Open PDB and XYZ molecules",
    description:
      "Open a PDB or XYZ file, inspect automatically generated bonds, rotate and zoom the molecule, and save a portable EigenVista document.",
    section: "tutorials",
    number: "04.1",
    body: `
      <h2 id="get-ready">Get ready</h2>
      <p>You need the <a href="install.html">installed Mac preview</a> and <a href="downloads/water.pdb" download>water.pdb</a>. The alternative <a href="downloads/water.xyz" download>water.xyz</a> gives the same 3-atom, 2-bond check. These files supply geometry, with coordinates in angstroms. No quantum-chemistry program is needed.</p>
      <p>Outcome: a water structure you can navigate and inspect, saved as a new <code>.eigenvista</code> document.</p>

      <h2 id="open-water">1. Open and check water</h2>
      <ol>
        <li><p>Launch EigenVista. If the initial mathematical example is visible, click <strong>Open</strong> and choose the downloaded <code>water.pdb</code>. If asked about changed content, save anything you want to keep before replacing it.</p></li>
        <li><p>Expand <strong>Molecular data</strong> if necessary. Check <strong>3 atoms</strong> and <strong>2 bonds</strong>. The importer computes display connectivity even when an input does not supply explicit connections.</p></li>
        <li><p>Check <strong>Quantum fields</strong>: it should say <strong>No quantum fields</strong>. Open <strong>Provenance</strong> to see import decisions. The imported document remains unsaved until you explicitly Save.</p></li>
      </ol>
      <div class="notice"><p><strong>Checkpoint:</strong> you can see one oxygen and two hydrogens. The two bonds are generated automatically from the atom positions.</p></div>

      <h2 id="move-and-inspect">2. Move and inspect</h2>
      <ol>
        <li><p>Left-drag in the scene to rotate. Right-drag or Ctrl-drag to pan. Scroll to zoom, or use the viewport’s <strong>Zoom in</strong> and <strong>Zoom out</strong> buttons. On a touchscreen, one finger rotates and two fingers pinch or pan.</p></li>
        <li><p>Click an atom. The status below the scene identifies its element and index and shows its coordinates in angstroms. This is an inspection tool; it does not measure distances or angles.</p></li>
        <li><p>Click <strong>Fit scene</strong> to restore the default framing and direction. You can Tab to toolbar buttons and activate them with Enter or Space.</p></li>
      </ol>
      <p><strong>Checkpoint:</strong> the atom and bond counts stay the same while you navigate. If the molecule leaves the view, <strong>Fit scene</strong> brings it back.</p>

      <h2 id="change-representation">3. Change the representation</h2>
      <ol>
        <li><p>Under <strong>Molecular data → Representation</strong>, try <strong>Ball and stick</strong>, then <strong>Liquorice</strong>.</p></li>
        <li><p>Choose <strong>Van der Waals</strong> for space-filling spheres. Bond cylinders disappear in this representation; the document still contains its two bonds.</p></li>
        <li><p>Return to the representation you want to keep. A representation change marks the document as changed.</p></li>
      </ol>

      <h2 id="save-and-reopen">4. Save and reopen</h2>
      <ol>
        <li><p>Click <strong>Save</strong>. Choose a new filename such as <code>my-water.eigenvista</code> in the native destination dialog and finish saving. Preserve <code>water.pdb</code>.</p></li>
        <li><p>Click <strong>Open</strong> and choose your new <code>.eigenvista</code> file. Confirm that it still has <strong>3 atoms</strong>, <strong>2 bonds</strong>, and the representation you saved.</p></li>
        <li><p>Use <strong>Fit scene</strong> if needed. Camera position is not saved, so reopening does not reproduce your exact viewing angle.</p></li>
      </ol>
      <p><strong>Checkpoint:</strong> the native document is self-contained for the imported structure and connectivity. Save does not write PDB or XYZ, and opening an input never overwrites it.</p>

      <h2 id="if-something-differs">If something differs</h2>
      <p>If the initial example is still visible, use the app’s <strong>Open</strong> button and select the downloaded file again. Finder file associations and drag-and-drop loading are not implemented. If counts differ, verify the filename and read <strong>Provenance</strong> and the error message. For an apparently empty view, try <strong>Fit scene</strong> and <strong>Ball and stick</strong>.</p>
      <p>Next, <a href="tutorials-orbitals.html">explore the hydrocarbon’s calculated orbitals</a> to add quantum fields. For all navigation and appearance controls, see the <a href="reference-scene.html">scene reference</a>.</p>
    `,
  },
  {
    file: "tutorials-orbitals.html",
    title: "Explore frontier orbitals",
    searchTitle: "Visualize HOMO and LUMO orbitals from Molden files",
    description:
      "Open a Molden calculation, select HOMO and LUMO orbitals, compare volume rendering with isosurfaces, and save high-resolution meshes in EigenVista.",
    section: "tutorials",
    number: "04.2",
    body: `
      <h2 id="get-ready">A closer look at a hydrocarbon</h2>
      <p>Download <a href="downloads/bicyclic-c7h10.molden" download="bicyclic-c7h10.molden">bicyclic-c7h10.molden</a> and open it in EigenVista. This bicyclic C<sub>7</sub>H<sub>10</sub> molecule has <strong>17 atoms</strong>, <strong>125 basis functions</strong> and <strong>118 orbitals</strong>. The first 26 orbitals are doubly occupied. You will explore its frontier orbitals, switch between volume and surface rendering, and keep a high-resolution mesh.</p>
      <figure><img src="assets/media/quantum-orbital.webp" alt="Signed HOMO isosurfaces around the carbon and hydrogen framework of a bicyclic C7H10 molecule" loading="eager" decoding="async"><figcaption>The hydrocarbon’s HOMO, MO 26 (26a), rendered at ±0.03 bohr<sup>−3/2</sup> on a 256³ grid. The two surface colors identify opposite signs of orbital amplitude.</figcaption></figure>

      <h2 id="browse-orbitals">1. Find the frontier orbitals</h2>
      <ol>
        <li><p>Check <strong>Molecular data</strong> for <strong>17 atoms</strong> and <strong>125 basis functions</strong>. Choose <strong>Ball and stick</strong> under <strong>Representation</strong> to keep the molecular framework visible.</p></li>
        <li><p>In <strong>Quantum fields</strong>, click <strong>Orbitals (118)</strong>. The orbital browser lists row number, label, spin, occupation and energy.</p></li>
        <li><p>Find row <strong>26</strong>, labelled <strong>MO 26 (26a)</strong>: the HOMO has occupation <strong>2.000</strong> and energy approximately <strong>−0.209458 hartree</strong>. Row <strong>27</strong> is the zero-occupation LUMO. Use <strong>Search orbitals</strong> if needed.</p></li>
        <li><p>Close the browser with <strong>Close orbitals</strong> and click <strong>MO 26 (26a)</strong> in the orbital field list to make it the active field. The browser’s checkboxes select orbitals for mesh generation; clicking a field row selects the field for a preview.</p></li>
      </ol>

      <h2 id="preview-without-meshes">2. Explore the sampled field</h2>
      <ol>
        <li><p>In <strong>Field rendering</strong>, set <strong>Isovalue</strong> to <strong>0.03</strong> and <strong>Grid resolution</strong> to <strong>256³</strong> to match the illustrations. A 128³ grid is useful for a quicker first exploration.</p></li>
        <li><p>Choose <strong>Mode → Sampled raycast preview</strong>. Wait for the field to finish sampling, then rotate and zoom to inspect its lobes.</p></li>
        <li><p>Switch to <strong>Volume preview</strong> and choose <strong>Sampling quality → Fine</strong>. The volume reuses the same grid; Fine increases the display samples taken along each viewing ray.</p></li>
        <li><p>Use <strong>Appearance</strong> to choose positive and negative colors and adjust opacity. Keep enough contrast between the field, the atoms and the background to read the molecular framework clearly.</p></li>
      </ol>
      <figure><img src="assets/media/quantum-volume.webp" alt="The C7H10 HOMO displayed with translucent volume rendering around its molecular framework" loading="lazy" decoding="async"><figcaption>The same MO 26 field in Volume preview, with isovalue 0.03 bohr<sup>−3/2</sup>, a 256³ grid and Fine sampling.</figcaption></figure>
      <p>Raycast and volume previews use the sampled grid directly. Generate a mesh when you want to keep an isosurface as geometry, or apply a custom surface shader.</p>

      <h2 id="generate-surfaces">3. Keep a smooth signed surface</h2>
      <ol>
        <li><p>Open <strong>Orbitals (118)</strong>, click <strong>Clear orbital selection</strong> and check row <strong>26</strong>. Keep <strong>Isovalue</strong> at <strong>0.03</strong> and <strong>Grid resolution</strong> at <strong>256³</strong>.</p></li>
        <li><p>Click <strong>Generate selected</strong>. Follow the sampling and meshing progress until the completed result appears. A matching sampled grid can be reused.</p></li>
        <li><p>The view switches to <strong>Isosurface mesh</strong>. Under <strong>Saved surfaces</strong>, use the eye controls to view each signed part separately, or show both to see the complete orbital.</p></li>
      </ol>
      <p>For the illustrated finish, choose <strong>Surface shading → Blinn-Phong</strong>, set <strong>Opacity</strong> to <strong>100%</strong>, <strong>Positive color</strong> to <code>#75e1df</code> and <strong>Negative color</strong> to <code>#ffa1bc</code>. Use <code>#17232d</code> for the background. Rotate and zoom until the cage and lobes fill the view.</p>
      <p>Try another isovalue to see how the orbital’s extent changes. Generating again replaces that orbital’s saved meshes; changing the control alone leaves the existing geometry intact. Save separate documents to retain several isovalues of one orbital.</p>

      <h2 id="compare-lumo">4. Compare the HOMO and LUMO</h2>
      <p>Hide the HOMO meshes under <strong>Saved surfaces</strong>, select row 27’s field in <strong>Quantum fields</strong>, and choose a sampled preview. Keep the camera, grid resolution and isovalue unchanged for a useful comparison. Look at how the lobes and their signs change around the same carbon framework.</p>
      <p>To keep both orbitals, check rows 26 and 27 in the orbital browser and choose <strong>Generate selected</strong>. EigenVista creates separate meshes for each orbital. Use the saved-surface eye controls to switch between their views.</p>

      <figure><a href="assets/media/quantum-lumo.webp"><img src="assets/media/quantum-lumo.webp" alt="The C7H10 LUMO with contrasting teal and pink lobes and the carbon framework between them" loading="lazy"></a><figcaption>MO 27 (27a), the LUMO, at the same ±0.03 isovalues and 256³ resolution. Opaque surfaces give the two phases clear boundaries.</figcaption></figure>

      <h2 id="save-and-reopen">5. Save and take the view further</h2>
      <ol>
        <li><p>Click <strong>Save</strong> and choose a filename such as <code>c7h10-frontier-orbitals.eigenvista</code>. Reopen it to display the saved meshes immediately, with the molecular and orbital data alongside them.</p></li>
        <li><p>Choose a sampled mode to prepare a volume or raycast again. Preview grids and camera framing are session choices; the saved mesh retains its generation isovalue and resolution.</p></li>
        <li><p>Use <strong>Export image</strong> or <strong>Export image with transparent background</strong> to keep the current view.</p></li>
      </ol>
      <p>For an envelope around the molecular framework, select <strong>Occupation-derived total density (listed orbitals)</strong> under <strong>Density matrices</strong>. Then try an X-ray finish or reveal the interior with a clipping shader.</p>
      <div class="next-step"><span>Next</span><a href="surface-shaders.html">Shape the light with surface shaders →</a><a href="reference-fields.html">Field rendering reference →</a></div>

      <h2 id="if-something-differs">If something differs</h2>
      <p>If an orbital is hard to find, clear the search filter and use its row number. If <strong>Generate selected</strong> is disabled, check an orbital and enter a positive isovalue. For an empty surface, lower the isovalue magnitude or choose another orbital. Use a smaller grid for faster exploration; <strong>Cancel</strong> retains completed surfaces and the last completed preview.</p>
    `,
  },
  {
    file: "tutorials-cube.html",
    title: "Explore a cube field",
    searchTitle: "Render Gaussian Cube fields as volumes and isosurfaces",
    description:
      "Load a Gaussian Cube scalar grid, compare raycast and volume rendering, choose an isovalue, and save its original samples with an isosurface mesh.",
    section: "tutorials",
    number: "04.3",
    body: `
      <h2 id="get-ready">A field around a molecular complex</h2>
      <p>Download <a href="downloads/complex-field.cube" download="complex-field.cube">complex-field.cube</a>. It contains <strong>29 atoms</strong> and an <strong>84 × 84 × 84</strong> grid: <strong>592,704 scalar samples</strong> ranging from <strong>0 to 1</strong>. The source comments do not specify the scalar quantity or its units.</p>
      <p>You will explore this field with raycast and volume rendering, then generate a mesh and save it with the original grid.</p>
      <figure><img src="assets/media/cube-raycast.webp" alt="An imported scalar field drawn around the framework of a 29-atom molecular complex using sampled raycasting" loading="eager" decoding="async"><figcaption>The imported field at isovalue 0.65, using its 84³ source grid and Fine raycast sampling.</figcaption></figure>

      <h2 id="open-and-preview">1. Open and explore the grid</h2>
      <ol>
        <li><p>Use <strong>Open</strong> to load <code>complex-field.cube</code>. Check <strong>29 atoms</strong> under <strong>Molecular data</strong>; bonds are generated automatically. The field appears under <strong>Quantum fields → Sampled fields</strong>.</p></li>
        <li><p>After the initial preview is ready, set <strong>Grid resolution</strong> to <strong>96³</strong>. The app retains this smaller 84³ source grid at its original sampling.</p></li>
        <li><p>Under <strong>Field rendering → Mode</strong>, choose <strong>Sampled raycast preview</strong>. Set <strong>Isovalue</strong> to <strong>0.65</strong> and <strong>Sampling quality</strong> to <strong>Fine</strong> to match the illustration.</p></li>
        <li><p>Rotate and zoom to inspect the field around the atomic framework. Try isovalues between <strong>0.65</strong> and <strong>0.75</strong> to see how the boundary changes.</p></li>
        <li><p>Switch to <strong>Volume preview</strong> for a translucent view through the field. Both preview modes use the imported grid directly.</p></li>
      </ol>

      <h2 id="make-meshes">2. Keep an isosurface mesh</h2>
      <ol>
        <li><p>Choose the isovalue you want to retain, or return to <strong>0.65</strong>. Keep <strong>Grid resolution</strong> at <strong>96³</strong>.</p></li>
        <li><p>Click <strong>Generate surfaces</strong> and wait for completion. Choose <strong>Isosurface mesh</strong> to inspect the stored geometry under <strong>Saved surfaces</strong>.</p></li>
        <li><p>Compare the mesh with <strong>Sampled raycast preview</strong>. Changing the raycast isovalue redraws the preview immediately; the stored mesh keeps the isovalue used to generate it.</p></li>
      </ol>
      <p>Generate again to replace the saved mesh with a different boundary. For a new finish, apply an <a href="surface-shaders.html">X-ray or clipping surface shader</a> to the mesh.</p>

      <h2 id="save-the-original-field">3. Save the field and the result</h2>
      <ol>
        <li><p>Use <strong>Save</strong> to create <code>complex-field.eigenvista</code>.</p></li>
        <li><p>Reopen it with <strong>Open</strong>. The atoms, bonds, original scalar field and generated mesh remain together; the saved geometry is available immediately.</p></li>
        <li><p>Choose <strong>Volume preview</strong> or <strong>Sampled raycast preview</strong> to explore the stored field again, then export an image of your chosen view.</p></li>
      </ol>
      <p>The native document keeps the original samples and grid alongside the generated geometry. Camera framing and preview settings are session choices, so restore them when composing another view.</p>
      <div class="next-step"><span>Explore further</span><a href="reference-fields.html#cube">Cube field reference →</a><a href="tutorials-ao.html">Large structures and ambient occlusion →</a></div>
    `,
  },
  {
    file: "tutorials-ao.html",
    title: "Read a large biological structure",
    searchTitle: "Visualize PDB and mmCIF structures with ambient occlusion",
    description:
      "Explore the 1AON mmCIF structure with MatterViz Pastel, molecular ambient occlusion, chain colors and protein cartoons, then isolate a subunit.",
    section: "tutorials",
    number: "04.4",
    body: `
      <h2 id="get-ready">Get ready</h2>
      <p>Download <a href="downloads/1AON.cif" download>1AON.cif</a> and <a href="downloads/matterviz-pastel.json" download>matterviz-pastel.json</a>. 1AON is a deposited GroEL–GroES chaperonin complex. This file imports <strong>58,870 selected atoms</strong>, making it a useful example of broad molecular folds and crowded contacts. Read the <a href="downloads/README.txt">data source and palette notices</a>.</p>
      <p>Outcome: an atom-colored space-filling AO view, a chain overview, an isolated protein view, and a PNG of your chosen framing. This is a local graphics workload; allow import and scene preparation to finish before navigating.</p>

      <h2 id="prepare-the-atomic-view">1. Prepare the atomic view</h2>
      <ol>
        <li><p>Click <strong>Open</strong> and choose <code>1AON.cif</code>. Wait for the import to finish. Check <strong>58,870 atoms</strong> under <strong>Molecular data</strong> and review <strong>Provenance</strong> for model, alternate-location, and connection decisions.</p></li>
        <li><p>Set <strong>Representation → Van der Waals</strong> for space-filling atomic spheres.</p></li>
        <li><p>In <strong>Molecular data → Biological structure</strong>, set <strong>Coloring → Element</strong>. This is necessary for the element palette to be visible instead of chain, entity, or secondary-structure colors.</p></li>
        <li><p>Expand <strong>Atom colours</strong>, click <strong>Colours file…</strong>, and choose <code>matterviz-pastel.json</code>. Confirm that its filename replaces the built-in palette label. The lighter colors make shaded contacts easier to read.</p></li>
        <li><p>Click <strong>Fit scene</strong>. Rotate to a useful view of the complex, then leave the camera unchanged for the comparison.</p></li>
      </ol>
      <div class="notice"><p><strong>Checkpoint:</strong> you see atomic spheres colored by element with the Pastel palette.</p></div>

      <h2 id="compare-ao">2. Compare normal lighting and ambient occlusion</h2>
      <ol>
        <li><p>Under <strong>Appearance</strong>, leave <strong>Ambient occlusion</strong> off initially. Observe the contacts and central recesses. Optionally export this view before continuing.</p></li>
        <li><p>Enable <strong>Ambient occlusion</strong>. Active AO uses <strong>Lambert shading plus SSAO</strong>, without specular highlights. Keep <strong>Automatic AO radius</strong> checked and read <strong>AO radius (angstrom)</strong>.</p></li>
        <li><p>Adjust <strong>AO strength</strong> while keeping camera, palette, representation, and background unchanged. Compare a moderate strength with zero, then toggle AO off and on. Zero or Off restores normal molecular rendering.</p></li>
        <li><p>For a closer experiment, uncheck <strong>Automatic AO radius</strong>. The manual slider starts from the automatic value: smaller radii emphasize nearby contacts; larger radii can emphasize broader recesses. Recheck automatic radius afterward.</p></li>
      </ol>
      <figure><img src="assets/media/1aon-ao-off.webp" alt="Large 1AON structure in the MatterViz Pastel element palette and Van der Waals representation with ambient occlusion off." loading="lazy" decoding="async"><figcaption>1AON with normal molecular lighting and AO off. Both captures use the same camera, geometry, MatterViz Pastel palette, Element coloring, Van der Waals representation, and background color <code>#ecebe4</code>.</figcaption></figure>
      <figure><img src="assets/media/1aon-ao-on.webp" alt="The same 1AON view with Lambert shading plus screen-space ambient occlusion, emphasizing broad recesses and atomic contacts." loading="lazy" decoding="async"><figcaption>The matching view with Lambert shading plus SSAO at 100% strength and the automatic 14.25 Å radius. The difference includes the active mode’s matte material as well as its screen-space shading.</figcaption></figure>
      <p><strong>Checkpoint:</strong> the shading changes while atom counts, connectivity, and element colors stay the same. The automatic radius comes from the atom-coordinate extent, so zooming does not change that radius. The visible effect can still change with the camera.</p>
      <p>AO emphasizes depth and contact regions by shading atomic spheres and bonds; hidden and offscreen geometry affect what the screen-space method can show. Turn it off if navigation slows. The <a href="gallery.html">gallery</a> provides the paired captures for comparison.</p>

      <h2 id="inspect-chains">3. Switch to chains and protein cartoons</h2>
      <ol>
        <li><p>Set <strong>Ambient occlusion</strong> off. Under <strong>Molecular data</strong>, choose <strong>Representation → Protein cartoon</strong>, then <strong>Biological structure → Coloring → Chain</strong>. Use <strong>Fit scene</strong> to frame the complete complex.</p></li>
        <li><p>Expand <strong>Chains</strong>. Each row identifies a deposited chain instance. If needed, use <strong>Filter chain or entity</strong> to find the chain you want; the list displays at most 50 matching entries.</p></li>
        <li><p>For chain A, use <strong>Isolate</strong>, then <strong>Focus</strong>. Alternatively, <strong>Focus visible structure</strong> frames all currently visible atoms. A chain style can override a component style, and either can override the global representation.</p></li>
        <li><p>Choose <strong>Coloring → Secondary structure</strong>. Inspect deposited helices, strand arrows, and unassigned loops. Click an atom where atomic detail is visible to inspect its biological context.</p></li>
        <li><p>Use <strong>Show all components</strong> to clear isolation and visibility/range filters. Return to <strong>Coloring → Element</strong> and <strong>Representation → Van der Waals</strong> when you want the atomic AO view again.</p></li>
      </ol>
      <figure><img src="assets/media/1aon-cartoon-chain.webp" alt="The complete 1AON complex in EigenVista, with protein cartoons colored by deposited chain." loading="lazy" decoding="async"><figcaption>Chain coloring separates the subunits in the complete complex. Protein cartoon geometry has its own diffuse shading; molecular AO applies to atomic spheres and bonds.</figcaption></figure>
      <figure><img src="assets/media/1aon-chain-secondary.webp" alt="An isolated 1AON protein chain displayed as a cartoon with deposited secondary-structure colors." loading="lazy" decoding="async"><figcaption>An isolated chain with deposited secondary-structure coloring. Unknown or unassigned regions remain explicit; EigenVista does not predict secondary structure.</figcaption></figure>
      <p><strong>Checkpoint:</strong> isolation hides other chains without removing them from the document. Missing backbone atoms, chain boundaries, and unsupported gaps break protein paths rather than inventing connections. Nonprotein components retain atomic representations.</p>

      <h2 id="export-and-save">4. Export the view and save the data</h2>
      <ol>
        <li><p>Choose your final representation, colors, and framing. To capture the shaded atomic view, restore <strong>Element</strong>, <strong>Van der Waals</strong>, the Pastel palette, and your AO settings first.</p></li>
        <li><p>Use the viewport’s camera button, <strong>Export image</strong>, for <code>eigenvista-view.png</code>. Or use <strong>Export image with transparent background</strong> for <code>eigenvista-view-transparent.png</code>. The PNG includes current scene shading and camera framing, without the toolbar or text overlays. Check that your host completed the download.</p></li>
        <li><p>Click <strong>Save</strong> and choose a new filename such as <code>1aon-study.eigenvista</code>. This retains the selected molecular data, biological identities, connectivity, and global representation. Keep the original mmCIF file too.</p></li>
      </ol>
      <div class="notice"><p><strong>Session versus Save:</strong> AO, atom palette, background, biological coloring, chain/component style overrides, visibility, isolation, residue ranges, and focus are session settings. They are not written into <code>.eigenvista</code>. Camera framing is also not saved. Reload starts with AO off and the built-in atom palette; load Pastel and restore your display choices to recreate the illustration. A PNG captures the current appearance but is not a molecular document.</p></div>
      <p>Image export uses the host’s download mechanism. Browser export is the reference path; native image-download handling still needs qualification. Confirm the PNG arrived before relying on it.</p>

      <h2 id="if-something-differs">If something differs</h2>
      <p>If Pastel seems ineffective, choose <strong>Coloring → Element</strong>. If an isolated chain vanishes, use <strong>Show all components</strong>, check chain/component filters, and focus again. If AO reports an enhancement error, disable and re-enable it to retry; normal molecular rendering remains available. A lost graphics context requires a reload, so Save completed work first when possible.</p>
      <p>Continue in the <a href="reference-structures.html">biological structure reference</a> for component styles and residue ranges, or the <a href="reference-scene.html">scene reference</a> for palettes, backgrounds, and PNG export. Return to the <a href="tutorials.html">learning path</a> to explore calculated fields.</p>
    `,
  },
];
