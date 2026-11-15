export default [
  {
    file: "tutorials.html",
    title: "Learn EigenVista by doing",
    description:
      "Four practical lessons: your first molecule, calculated orbitals, a sampled cube field, and a large biological structure.",
    section: "tutorials",
    number: "04",
    body: `
      <h2 id="before-you-start">Before you start</h2>
      <p>Use the <a href="install.html">EigenVista 0.7.2 Mac preview</a> for these lessons. Open the downloaded example files with the app’s <strong>Open</strong> button. The website supplies instructions and data; the installed app runs the local molecular workflows.</p>
      <p>Start with the first lesson if you are new to the viewport. Then choose the kind of data you work with. Keep the original inputs and save your work to new <code>.eigenvista</code> files.</p>

      <h2 id="learning-path">Your learning path</h2>
      <ol>
        <li><p><a href="tutorials-first-molecule.html"><strong>Open, inspect, and save your first molecule</strong></a>. Use three-atom water to learn rotation, zoom, picking, representations, and native Save.</p></li>
        <li><p><a href="tutorials-orbitals.html"><strong>Explore orbitals from a real calculation</strong></a>. Browse the calculated water wavefunction, preview one field without a mesh, then generate and save signed surfaces.</p></li>
        <li><p><a href="tutorials-cube.html"><strong>Inspect a sampled cube field</strong></a>. Compare a raycast with stored triangles and learn what survives saving a skewed scalar grid.</p></li>
        <li><p><a href="tutorials-ao.html"><strong>Read a large biological structure</strong></a>. Use MatterViz Pastel and ambient occlusion on 1AON, then switch to chain cartoons and isolate a chain.</p></li>
      </ol>

      <h2 id="example-files">Download the examples</h2>
      <div class="table-wrap"><table>
        <thead><tr><th scope="col">File</th><th scope="col">What it contains</th><th scope="col">Lesson</th></tr></thead>
        <tbody>
          <tr><td><a href="downloads/water.pdb" download>water.pdb</a> or <a href="downloads/water.xyz" download>water.xyz</a></td><td>Water geometry: 3 atoms and 2 display bonds after import; no quantum fields</td><td><a href="tutorials-first-molecule.html">First molecule</a></td></tr>
          <tr><td><a href="downloads/water.molden" download>water.molden</a></td><td>Calculated RHF/cc-pVDZ water: 24 basis functions, 24 spatial orbitals, occupation-derived total density</td><td><a href="tutorials-orbitals.html">Orbitals</a></td></tr>
          <tr><td><a href="downloads/signed-affine.cube" download>signed-affine.cube</a></td><td>A synthetic signed scalar field on a skewed 7 × 7 × 7 grid, with 2 hydrogen atoms</td><td><a href="tutorials-cube.html">Cube field</a></td></tr>
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
    description:
      "Open water, inspect its atoms and bonds, move around the scene, and save a portable EigenVista document.",
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
      <p>Next, <a href="tutorials-orbitals.html">open the calculated water wavefunction</a> to add orbital fields. For all navigation and appearance controls, see the <a href="reference-scene.html">scene reference</a>.</p>
    `,
  },
  {
    file: "tutorials-orbitals.html",
    title: "Explore calculated orbitals",
    description:
      "Browse a real water wavefunction, preview one orbital without meshing, then generate and save signed isosurfaces.",
    section: "tutorials",
    number: "04.2",
    body: `
      <h2 id="get-ready">Get ready</h2>
      <p>Complete <a href="tutorials-first-molecule.html">Your first molecule</a> and download <a href="downloads/water.molden" download>water.molden</a>. This is a calculated RHF water wavefunction in the cc-pVDZ basis, exported by PySCF. It contains <strong>24 basis functions</strong>, <strong>24 spatial orbitals</strong>, and a total density derived from the listed occupations. Its test geometry is not an optimized structure.</p>
      <p>Outcome: a sampled orbital preview, followed by saved signed mesh geometry that reopens without recalculation.</p>

      <h2 id="browse-orbitals">1. Open and browse the wavefunction</h2>
      <ol>
        <li><p>Use <strong>Open</strong> to choose <code>water.molden</code>. Check <strong>Molecular data</strong> for <strong>3 atoms</strong>, <strong>2 bonds</strong>, and <strong>24 basis functions</strong>. Review the import report and <strong>Provenance</strong>.</p></li>
        <li><p>Under <strong>Quantum fields</strong>, click <strong>Orbitals (24)</strong>. The browser lists one-based row numbers, labels, spin, occupation, energy in hartree, and saved-mesh counts.</p></li>
        <li><p>Use <strong>Search orbitals</strong> to locate <code>molden-mo-5</code>, or find row 5 in the unfiltered table. This orbital has occupation <strong>2.000</strong> and energy about <strong>−0.493063 hartree</strong>. The initial active field is this last occupied source-order orbital.</p></li>
        <li><p>Inspect its checkbox, then close the browser with <strong>Close orbitals</strong>. Checking a row selects it for <strong>Generate selected</strong>; closing alone does not change the active field. For the preview below, click the corresponding <strong>MO 5 (A)</strong> field row under <strong>Quantum fields → Orbitals</strong> if another field is active.</p></li>
      </ol>
      <div class="notice"><p><strong>Checkpoint:</strong> the file offers 24 orbitals, including zero-occupation virtual orbitals. The <strong>Saved</strong> column counts meshes in the current document’s memory, not files written to disk. There is one active field for sampled previews.</p></div>

      <h2 id="preview-without-meshes">2. Preview before making a mesh</h2>
      <ol>
        <li><p>In <strong>Field rendering</strong>, set <strong>Grid resolution</strong> to <strong>96³</strong> and use a positive <strong>Isovalue</strong> of <strong>0.05</strong> to match the illustrated orbital. Orbital isovalues use bohr<sup>−3/2</sup>.</p></li>
        <li><p>Choose <strong>Mode → Sampled raycast preview</strong>. Wait for sampling to finish. This creates a transient display grid and draws an isosurface from it; it does not create saved mesh triangles.</p></li>
        <li><p>Choose <strong>Volume preview</strong>. It reuses the current sampled grid. Set <strong>Sampling quality → Fine</strong> to match the illustrated view, or use <strong>Standard</strong> if navigation is slow. This changes display sampling along the ray without recalculating the scientific grid.</p></li>
        <li><p>Rotate the scene and use <strong>Fit scene</strong>. Under <strong>Appearance</strong>, adjust positive/negative colors or opacity if you wish. The colors identify the signs of the orbital value, not positive and negative charge.</p></li>
      </ol>
      <figure><img src="assets/media/water-orbital-volume.webp" alt="Calculated water orbital displayed in the EigenVista volume preview, with differently colored signed regions." loading="lazy" decoding="async"><figcaption>MO 5 (A) at isovalue 0.05 bohr<sup>−3/2</sup>, with a 96³ grid and Fine preview sampling. This capture was made after meshing; the sampled preview itself does not require saved meshes.</figcaption></figure>
      <p><strong>Checkpoint:</strong> the sampled field is visible while the saved-surface count is still zero. Increasing Sampling quality cannot recover detail absent from the calculation grid.</p>

      <h2 id="generate-surfaces">3. Generate signed surfaces</h2>
      <ol>
        <li><p>Open <strong>Orbitals (24)</strong> again. Use <strong>Clear orbital selection</strong>, find row 5, and check only that orbital. Confirm a positive <strong>Isovalue</strong> of <strong>0.05</strong> and <strong>Grid resolution</strong> of <strong>96³</strong>.</p></li>
        <li><p>Click <strong>Generate selected</strong>. The browser closes. Wait for the footer’s completed result after sampling, meshing, and validation. The app attempts both positive and negative isovalues; only nonempty surfaces are added. The completed preview grid can be reused when field and resolution are unchanged.</p></li>
        <li><p>On success, the view switches to <strong>Isosurface mesh</strong>. Inspect the entries and triangle counts under <strong>Saved surfaces</strong>. Use an eye control to hide and show one signed mesh. Click a mesh to inspect its label and triangle count.</p></li>
      </ol>
      <figure><img src="assets/media/water-orbital-mesh.webp" alt="Positive and negative signed meshes of a calculated water orbital in EigenVista." loading="lazy" decoding="async"><figcaption>MO 5 (A) meshes generated at ±0.05 bohr<sup>−3/2</sup> on a 96³ grid. Meshes and their generation metadata are retained when you Save the document.</figcaption></figure>
      <p>For another isovalue, change the magnitude and generate again. This replaces that orbital’s meshes; changing the control alone leaves existing meshes unchanged. Save separate documents to retain different isovalues of the same orbital. To generate several orbitals later, check at most 32 per batch; this makes separate orbital meshes.</p>

      <h2 id="save-and-reopen">4. Save and reopen</h2>
      <ol>
        <li><p>Click <strong>Save</strong> and choose a new filename such as <code>water-orbital.eigenvista</code>. Finish the save, then reopen that file with <strong>Open</strong>.</p></li>
        <li><p>Check the basis/orbital counts and <strong>Saved surfaces</strong>. The document opens in mesh mode with its saved triangles available immediately, without the original Molden file or a new orbital calculation.</p></li>
        <li><p>Select the desired orbital and choose a sampled mode to prepare its preview again. The transient sampled grid, camera, active render mode, Sampling quality, and orbital checkboxes are not stored in the file.</p></li>
      </ol>

      <h2 id="if-something-differs">If something differs</h2>
      <p>If <strong>Generate selected</strong> is disabled, check one orbital and a finite positive isovalue. Clear a search filter if you cannot find a row; filtering does not clear checks outside the visible list. If a surface is empty, reduce the isovalue magnitude or try another field. If sampling is slow, use a lower resolution; <strong>Cancel</strong> keeps prior completed surfaces and the last completed preview.</p>
      <p>Next, try the <strong>Occupation-derived total density (listed orbitals)</strong> field under <strong>Density matrices</strong>. Its nonnegative values may produce only a positive surface. Read the <a href="reference-fields.html">field reference</a>, or continue with a <a href="tutorials-cube.html">field already sampled in a cube file</a>.</p>
    `,
  },
  {
    file: "tutorials-cube.html",
    title: "Inspect a sampled cube field",
    description:
      "Open a signed affine cube, compare sampled raycasting with meshes, and preserve its original scalar values when saving.",
    section: "tutorials",
    number: "04.3",
    body: `
      <h2 id="get-ready">Get ready</h2>
      <p>Download <a href="downloads/signed-affine.cube" download>signed-affine.cube</a>. You need only EigenVista and this file. A cube already contains sampled scalar values, so no basis functions or orbital coefficients are needed.</p>
      <div class="notice"><p>This example is a mathematical rendering test, not a quantum-chemistry result. Its <strong>2 hydrogen atoms</strong> are 1.4 bohr apart, producing <strong>1 display bond</strong>. Its field has positive and negative lobes, but it is not a calculated hydrogen orbital or electron density.</p></div>

      <h2 id="understand-the-data">What the example contains</h2>
      <p>The <strong>7 × 7 × 7</strong> grid has origin <code>(−3.6, −3.3, −3)</code> and step vectors <code>(1, 0, 0)</code>, <code>(0.2, 1, 0)</code>, and <code>(0, 0.1, 1)</code>, in bohr. Those off-axis components make it skewed. At each grid position it stores:</p>
      <p><code>f(x, y, z) = 0.8 (x + 0.25 y) exp[−0.7 (x² + 0.8 y² + 1.2 z²)]</code></p>
      <p>The scalar is defined by that formula; it has no inferred physical units. The example’s <a href="downloads/README.txt">source notes</a> distinguish it from the calculated Molden sample.</p>

      <h2 id="open-and-preview">1. Open and preview the grid</h2>
      <ol>
        <li><p>Click <strong>Open</strong> and choose <code>signed-affine.cube</code>. Check <strong>2 atoms</strong> and <strong>1 bond</strong> in <strong>Molecular data</strong>. The field appears under <strong>Quantum fields → Sampled fields</strong>.</p></li>
        <li><p>Wait for the initial <strong>Volume preview</strong>. It uses the imported field without generating meshes. Choose <strong>Sampled raycast preview</strong> under <strong>Field rendering → Mode</strong> to see an isovalue boundary instead.</p></li>
        <li><p>Use the initial positive <strong>Isovalue</strong> of <strong>0.08</strong> to start. Rotate and use <strong>Fit scene</strong> to inspect the two signs. Then change the isovalue magnitude: a lower level usually encloses more of a localized lobe; a level outside the sampled range produces no surface.</p></li>
        <li><p>Try <strong>Sampling quality → Fine</strong>, then return to <strong>Standard</strong>. This adjusts ray sampling, not the original 343 scalar samples.</p></li>
      </ol>
      <figure><img src="assets/media/cube-raycast.webp" alt="The mathematical signed affine cube displayed as positive and negative sampled raycast regions around two hydrogen atoms." loading="lazy" decoding="async"><figcaption>Sampled raycasting of the synthetic signed-affine cube in the actual application. Different field colors distinguish positive and negative scalar values.</figcaption></figure>
      <p><strong>Checkpoint:</strong> you can see the field before any entry exists under <strong>Saved surfaces</strong>. The atom positions and display bond come from geometry, independently of the scalar values.</p>

      <h2 id="make-meshes">2. Make and compare meshes</h2>
      <ol>
        <li><p>Return to an <strong>Isovalue</strong> of <strong>0.08</strong>, or use a positive magnitude that shows both signed lobes. Set <strong>Grid resolution</strong> to <strong>40³</strong>. The control bounds sampling; this small 7³ source is not upsampled to 40³.</p></li>
        <li><p>Click <strong>Generate surfaces</strong> and wait for successful completion. Inspect the positive and negative entries under <strong>Saved surfaces</strong>, then choose <strong>Isosurface mesh</strong> if needed.</p></li>
        <li><p>Switch between <strong>Isosurface mesh</strong> and <strong>Sampled raycast preview</strong>. In mesh mode, use the eye controls to show or hide individual saved meshes. In sampled mode, the selected field’s sampled display replaces its meshes visually.</p></li>
        <li><p>Change the isovalue in raycast mode and observe the preview. Switch back to mesh mode: the saved geometry still reflects its generation isovalue. Generate again only when you want to replace it.</p></li>
      </ol>
      <p><strong>Checkpoint:</strong> raycast changes are immediate display changes, while saved meshes change only after explicit generation. A finer display setting cannot recover detail that the original coarse cube never sampled.</p>

      <h2 id="save-the-original-field">3. Save the original field with the meshes</h2>
      <ol>
        <li><p>Save a new file such as <code>signed-field.eigenvista</code>, then reopen it using <strong>Open</strong>.</p></li>
        <li><p>Confirm that the atoms, bond, sampled field, and saved meshes remain available. Cached meshes open in mesh mode without regeneration.</p></li>
        <li><p>Choose <strong>Volume preview</strong> or <strong>Sampled raycast preview</strong> again. The app prepares a display grid from the stored original scalar field.</p></li>
      </ol>
      <p>Save retains the original f64 scalar values and affine grid geometry alongside generated meshes. Display sampling and current meshing use f32; they do not replace the original field in the document. Camera, active render mode, display resolution, and transient display samples are session state.</p>

      <h2 id="if-something-differs">If something differs</h2>
      <p>If no field is visible, try <strong>Fit scene</strong>, check the isovalue, and read any preview error. An all-zero grid cannot produce a nonzero isosurface. An unsupported multi-field or alternative-unit cube must be exported as one field in the supported bohr profile; renaming the file does not convert it.</p>
      <p>Sampled raycasting can miss tangencies or crossings, volume intersections are approximate, and marching cubes is not topology-certified. See the <a href="reference-fields.html">field reference</a> and <a href="reference-files.html">file reference</a> before using your own cube data. For a large atomic model, continue with <a href="tutorials-ao.html">1AON and ambient occlusion</a>.</p>
    `,
  },
  {
    file: "tutorials-ao.html",
    title: "Read a large biological structure",
    description:
      "Use MatterViz Pastel and molecular ambient occlusion on 1AON, then inspect chains, cartoons, and an isolated subunit.",
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
      <div class="notice"><p><strong>Checkpoint:</strong> you see atomic spheres colored by element with the Pastel palette. 1AON contains structure data, so <strong>No quantum fields</strong> is expected. No orbital or density is being calculated.</p></div>

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
