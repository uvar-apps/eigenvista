import { application } from "../application.mjs";
import { release } from "../release.mjs";
import { workspaceFigure, workspaceNotice } from "./workspace.mjs";

export default [
  {
    file: "reference.html",
    title: "User reference",
    searchTitle: "Molecular and quantum chemistry viewer reference manual",
    description: `The EigenVista ${application.version} test-build manual: files, scene controls, quantum fields, scientific inspection, biological structures, and saving.`,
    section: "reference",
    number: "03",
    body: `
<div class="prose">
  <p>EigenVista displays molecular structures and supplied quantum-chemistry fields in an interactive 3D scene. This reference covers the <strong>${application.version} unreleased source build</strong>, including the four-tab workspace and <a href="reference-inspection.html">scientific inspection</a>. The published Mac download is still <strong>${release.version}</strong>; its earlier layout and tools differ. Use the <a href="install.html">installation guide</a> for that published app, or follow a <a href="tutorials.html">worked tutorial</a> with a downloadable example and a matching build.</p>

  <h2 id="manual">Find a workflow</h2>
  <ul class="toc">
    <li><a href="reference-files.html">Files, imports, conversion, and saving</a> — choose a format, review import decisions, use the batch converter, and share a self-contained document.</li>
    <li><a href="reference-scene.html">Scene, appearance, and images</a> — navigate, pick atoms, choose a representation, use ambient occlusion and palettes, export PNGs, or apply a surface shader.</li>
    <li><a href="surface-shaders.html">Custom surface shaders</a> — see through a density envelope, expose its interior with clipping, and tune lighting and transparency live.</li>
    <li><a href="reference-fields.html">Orbitals, densities, and sampled fields</a> — generate signed surfaces, browse several orbitals, compare render modes, and understand resolution and caching.</li>
    <li><a href="reference-structures.html">Biological structures</a> — color chains and secondary structure, show components, isolate a chain, select residue ranges, and use protein depictions.</li>
    <li><a href="ai.html">AI-assisted viewing</a> — connect your external coding agent, describe a molecular view, and keep exported figures and native documents.</li>
    <li><a href="reference-inspection.html">Scientific inspection — ${application.version} unreleased test build</a> — measurements and labels, ligand neighborhoods, SES/SAS shape, numerical probes, planes/contours and profiles.</li>
  </ul>

  <h2 id="workspace">The application workspace</h2>
  <p>One Tools pane starts on the right at <strong>480 px</strong> wide. Its four tabs are inside the pane; choose <strong>Position → Left</strong> to move it across the scene. Drag the inner divider to resize it. The existing header, file buttons, viewport toolbar and footer stay in their familiar places.</p>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Area</th><th scope="col">What you do there</th></tr></thead>
    <tbody>
      <tr><th scope="row">Top bar</th><td>Read the document title and unsaved indicator; choose <strong>Open</strong>, <strong>Convert</strong>, or <strong>Save</strong>. Three compact buttons show/hide Tools, enter Zen and toggle fullscreen.</td></tr>
      <tr><th scope="row">Molecule tab</th><td><strong>Molecular data</strong>: counts, representation and biological controls. <strong>Selections and measurements</strong>: ordered picks, named sets, labels and neighborhoods. <strong>Provenance</strong>: source decisions and warnings.</td></tr>
      <tr><th scope="row">Fields tab</th><td><strong>Quantum fields</strong>: orbitals, densities and sampled fields. <strong>Field rendering</strong>: volume/raycast, isovalue, resolution and mesh generation. <strong>Quantitative field inspection</strong>: probes, true planes, contours and line profiles.</td></tr>
      <tr><th scope="row">Surfaces tab</th><td><strong>Molecular surfaces</strong>: coordinate-derived SES/SAS and live saved appearance. <strong>Saved surfaces</strong>: quantum/imported mesh visibility and triangle counts.</td></tr>
      <tr><th scope="row">Appearance tab</th><td><strong>Appearance</strong>: field colors/opacity, surface shading and molecular AO. <strong>Atom colours</strong>: element palettes. <strong>Surface shader</strong>: custom GLSL sources, targets and live parameters.</td></tr>
      <tr><th scope="row">Central scene</th><td>Rotate, pan, zoom, and pick an atom or saved surface. Inspection information appears below the scene.</td></tr>
      <tr><th scope="row">Footer and progress panel</th><td>Read operation status, completed sampling slices, signed meshing passes, elapsed time, and errors.</td></tr>
    </tbody>
  </table></div>
  <p>Close Tools to give its width back to the scene. The header's <strong>Show tools</strong> button or <strong>Shift+T</strong> brings back the same pane. At narrow widths it overlays the scene instead of squeezing it. Switching tabs, changing side or hiding the pane retains tool drafts and the current camera; a hidden pane does not cancel a calculation.</p>

  ${workspaceFigure("homo-analysis-right", "The single right-hand Tools pane with its four tabs, showing Quantitative field inspection beside a signed HOMO plane and numerical colorbar", "Fields → Quantitative field inspection beside a true C₇H₁₀ HOMO section. The orbital amplitude ψ has both signs; its blue–white–red key spans −0.06 to +0.06 bohr⁻³ᐟ², with contours on the sampled plane.")}

  <h2 id="keyboard">Keyboard and widget controls</h2>
  <p>Use Tab to move between controls and Enter or Space to activate buttons. Left/Right and Home/End move among the four pane tabs. A widget heading is a button: activate it to collapse or expand that section. Collapsing retains settings and selections. In Safari on macOS, use Option-Tab if ordinary Tab skips buttons, or enable macOS Keyboard Navigation.</p>
  <ol>
    <li>To move a widget, drag its <strong>Reorder</strong> handle onto the upper or lower half of another heading in the same tab.</li>
    <li>Alternatively, click or tap the handle and choose <strong>Move up</strong> or <strong>Move down</strong>.</li>
    <li>With keyboard focus on the handle, use Up/Down to move one place, or Home/End to move to the start/end of that tab's stack. Focus stays on the handle and the new position is announced.</li>
    <li>Escape closes the move controls and returns focus to the handle.</li>
  </ol>
  <p>Widget order stays within its tab. Pane side, width, active tab and visibility are profile preferences, alongside widget order/expansion; they are not part of a molecular document. Without profile storage they last for the session. On the focused divider, use Left/Right, Shift+arrows for a larger step, or Home/End to resize. Closing a widget differs from closing the whole pane: only closing the pane reclaims its scene width.</p>
  <p><strong>Shift+Z</strong> enters Zen: header, footer and Tools hide while Exit Zen, Tools, source identity and essential scene controls remain. Choose Tools to leave Zen and reopen the pane. Fullscreen is separate and uses the browser's actual facility. While fullscreen is active the platform handles Escape first; after leaving fullscreen, Escape can leave Zen. Visible exits remain available. Shortcuts leave editable inputs and modal dialogs alone. The orbital browser remains a modal chooser.</p>
  <p>Progress and <strong>Cancel calculation</strong> remain available outside the pane, including in Zen, for cancellable work. Hiding Tools or switching tabs neither restarts nor cancels it. A noncancellable Save shows status without a misleading Cancel action. Browser fullscreen does not establish native macOS fullscreen or multi-monitor qualification.</p>
  <p>The scene's <strong>Zoom in</strong>, <strong>Zoom out</strong>, <strong>Fit scene</strong>, and <strong>Reset view</strong> buttons provide alternatives to mouse gestures. See <a href="reference-scene.html#navigation">scene navigation</a>.</p>

  <h2 id="persistence">What is saved?</h2>
  <p><strong>Save</strong> writes the molecular document. It does not capture every view preference. The phrase <strong>Saved surfaces</strong> means meshes in the current document's memory; they reach disk only when you save the document.</p>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Kind of state</th><th scope="col">Examples</th><th scope="col">After reopening or restarting</th></tr></thead>
    <tbody>
      <tr><th scope="row">Saved molecular data</th><td>Atoms and biological identities, bonds, supplied basis/orbitals/density matrices or original sampled grids, provenance, saved meshes, named selections, measurements/labels and quantitative analysis definitions/caches.</td><td>Retained in <code>.eigenvista</code> by a matching current build.</td></tr>
      <tr><th scope="row">Saved document appearance</th><td>Global molecular representation, surface colors, opacity, and saved-mesh visibility.</td><td>Retained in <code>.eigenvista</code>.</td></tr>
      <tr><th scope="row">Session display settings</th><td>Camera, render mode, background, AO, atom palette, surface shading, shader/uniforms, preview quality, biological filters/styles, orbital checkboxes, and preview sampling cache.</td><td>Not stored in the molecular file. Reapply after restarting; some settings continue across Open within a session.</td></tr>
      <tr><th scope="row">Profile preferences</th><td>Pane side, width, active tab and visibility; per-tab widget order and expansion.</td><td>Remembered on that browser/desktop profile when storage is available; not shared with the document. Zen is transient.</td></tr>
    </tbody>
  </table></div>
  <p>Each mesh records the grid used to generate it, but the <strong>Grid resolution</strong> control resets in a new application session. Generated orbital/density grids are transient; their analytic inputs and saved meshes persist. Imported cube grids retain their original values. See <a href="reference-files.html#saving">saving and sharing</a> and <a href="reference-fields.html#cache">field caching</a>.</p>

  <h2 id="troubleshooting">When something looks wrong</h2>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Symptom</th><th scope="col">Next step</th></tr></thead>
    <tbody>
      <tr><th scope="row">Generate surfaces is disabled</th><td>Select an orbital, density matrix, or sampled field in <strong>Quantum fields</strong>. Wait for another active operation to finish or cancel it.</td></tr>
      <tr><th scope="row">Generate selected is disabled</th><td>Check between 1 and 32 orbitals and enter a finite positive isovalue.</td></tr>
      <tr><th scope="row">Raycast/volume choices are disabled</th><td>Select an available field and finish/cancel other active work. Analytic orbital/density previews do not require meshes.</td></tr>
      <tr><th scope="row">No field appears</th><td>Use <strong>Fit scene</strong>, check the selected mode and field, and try a smaller positive isovalue. Read any preview error. An all-zero field has no nonzero surface.</td></tr>
      <tr><th scope="row">A structure seems missing</th><td>Fit the scene, try <strong>Ball and stick</strong>, and check counts and biological visibility filters. <strong>Show all components</strong> clears those filters.</td></tr>
      <tr><th scope="row">Atom/bond counts differ from the source</th><td>Read <strong>Provenance</strong>: model, alternate, occupancy, unknown-element, declared-connection, and inferred-bond policies can change the selected display structure.</td></tr>
      <tr><th scope="row">A calculation is slow or exceeds a bound</th><td>Read phase/counts and elapsed time. Cancel, then use fewer orbitals or a lower grid resolution. Existing completed surfaces are retained on recoverable errors.</td></tr>
      <tr><th scope="row">Volume changes unexpectedly with quality</th><td>Use 0.5.14 or later; earlier builds had an opacity/quality interaction. In all versions, volume intersections with opaque objects remain approximate.</td></tr>
      <tr><th scope="row">A file is rejected</th><td>Read the exact error and supported profile. Export an appropriate supported file rather than removing producer, units, or validation markers.</td></tr>
      <tr><th scope="row">WebGL2 is unavailable / graphics context lost</th><td>Check graphics acceleration. A lost context requires restart/reload; save if possible beforehand. Unsaved data can be lost.</td></tr>
    </tbody>
  </table></div>
  <p>See <a href="reference-files.html#formats">supported file formats</a> for import options and <a href="reference-fields.html#rendering-limits">rendering limits</a> for guidance on sampled previews and transparency.</p>
  <p>For a <a href="https://github.com/uvar-apps/eigenvista/issues">problem report</a>, include the package filename or <code>BUILD-INFO.json</code>, Mac model/processor, OS version, exact error, steps, and a screenshot. Share a small input only if you have permission to publish it. Keep confidential research data out of public issues.</p>
</div>`,
  },
  {
    file: "reference-files.html",
    title: "Files, conversion, and saving",
    searchTitle: "Supported molecular files, conversion and saving",
    description:
      "Open Molden, Gaussian Cube, PDB, mmCIF, BinaryCIF and XYZ files; inspect import provenance, batch-convert inputs, and save native EigenVista documents.",
    section: "reference",
    number: "03.1",
    body: `
<div class="prose">
  ${workspaceNotice}
  <p>Open an existing calculation or structure, inspect the import report, and save a self-contained <code>.eigenvista</code> document. Opening never overwrites the input. Keep original files: the preview deliberately imports a selected, supported subset rather than every source annotation.</p>

  <h2 id="open">Open and check a file</h2>
  <ol>
    <li>Choose <strong>Open</strong> in the app's top bar, then select a supported local file. Use this button: Finder file associations and drag-and-drop loading are not implemented.</li>
    <li>If prompted about unsaved work, save or deliberately discard it before replacing the scene.</li>
    <li>Check counts under <strong>Molecule → Molecular data</strong> and <strong>Fields → Quantum fields</strong>. Read <strong>Import report</strong> and <strong>Molecule → Provenance</strong>, including warnings.</li>
    <li>Use <strong>Fit scene</strong> if necessary. Imported structures show automatic display bonds; cube fields normally start in <strong>Volume preview</strong>.</li>
    <li>Choose <strong>Save</strong> and a new <code>.eigenvista</code> filename to retain the imported data and subsequent changes.</li>
  </ol>
  <p>External imports start unsaved. A malformed-file error leaves the previous document intact. A valid grid that exceeds rendering precision can still open and remain savable with a preview error; see <a href="reference-fields.html#precision">grid precision</a>. The installed app performs these local workflows without an internet connection.</p>
  <p>For a small structure check, download <a href="downloads/water.xyz" download>water.xyz</a>: it should show <strong>3 atoms</strong> and <strong>2 bonds</strong>. For quantum fields, try <a href="downloads/water.molden" download>water.molden</a>; for a sampled field, try <a href="downloads/signed-affine.cube" download>signed-affine.cube</a>.</p>

  <h2 id="formats">Supported formats</h2>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Input</th><th scope="col">What it supplies</th><th scope="col">Supported boundary</th></tr></thead>
    <tbody>
      <tr><th scope="row"><code>.eigenvista</code>, <code>.molekel</code></th><td>Rust-preview scientific document, saved appearance, and meshes.</td><td>Current and supported earlier preview formats. Not a general project reader for the old C++ Molekel application.</td></tr>
      <tr><th scope="row">Molden: <code>.molden</code>, <code>.molf</code>, <code>.molden.input</code>, or recognized header</th><td>Geometry, Gaussian basis, real orbitals, energies, occupations, and eligible occupation-derived density matrices.</td><td>One geometry and basis; canonical S/P/D/F/G and SP. Identified ORCA exports have a narrower qualified subset.</td></tr>
      <tr><th scope="row"><code>.xyz</code></th><td>Geometry in angstroms and inferred display bonds.</td><td>One conventional atom-count/comment/coordinate frame. Extra columns, extended XYZ, and multiple frames are rejected.</td></tr>
      <tr><th scope="row"><code>.pdb</code></th><td>Selected ATOM/HETATM geometry, supported biological metadata, explicit and inferred bonds.</td><td>First model/structure and one alternate conformer per residue.</td></tr>
      <tr><th scope="row"><code>.cif</code>, <code>.mcif</code>, <code>.pdbx</code></th><td>Selected mmCIF atom sites, biological metadata, declared connections, and inferred bonds.</td><td>Bounded mmCIF profile; first model/alternate policy. No crystal-image expansion or complete dictionary validation.</td></tr>
      <tr><th scope="row"><code>.bcif</code>, <code>.bcif.gz</code></th><td>The same selected structure and connection policy as text mmCIF.</td><td>BinaryCIF 0.3.x, one data block; raw or gzip-wrapped content. Gzip support does not extend to text mmCIF or PDB.</td></tr>
      <tr><th scope="row"><code>.cube</code>, <code>.cub</code></th><td>Atoms, automatic bonds, and one already sampled scalar field.</td><td>Supported bohr-coordinate profile, including a single-orbital dataset header. No multi-field or alternative-unit cube profile.</td></tr>
    </tbody>
  </table></div>
  <p>OBJ, legacy atom-color text formats, direct ORCA output/GBW, and Gaussian logs are not implemented. Atom palettes use the separate <a href="reference-scene.html#palettes">JSON palette picker</a>.</p>
  <p>For biological selection, identities, and omitted annotations, see <a href="reference-structures.html#import-selection">structure import policy</a>. For exact accepted cube features and what a sampled field means, see <a href="reference-fields.html#cube">cube fields</a>.</p>
  <p>Per-format byte limits include 32 MiB PDB text and 64 MiB text mmCIF/cube. BinaryCIF has separate 64 MiB expanded-payload and expanded-text limits. These sit inside broader numerical, atom, bond, and allocation bounds; they are rejection limits, not a promise that the largest accepted file will be interactive. See <a href="reference-fields.html#precision">resource bounds</a>.</p>

  <h2 id="molden">Molden wavefunctions and density interpretation</h2>
  <p>A supported Molden input supplies one <code>[Atoms]</code> section with explicit AU or Angs units, one <code>[GTO]</code> basis, and real orbitals in one or more <code>[MO]</code> sections. Missing geometry/basis, ambiguous repeated sections, unsupported shell conventions, or invalid coefficients are errors. The reader does not repair an unrecognized producer convention by guessing.</p>
  <p>Imported orbital labels include supplied symmetry information. Energies use hartree. Missing energies or occupations remain missing; an explicit Alpha/Beta spin is required by the Molden profile. One Alpha-only set is interpreted and reported as spatial orbitals with occupations up to two. Mixed Alpha/Beta sets retain their spin labels with occupations up to one; fractional occupations are preserved.</p>
  <h3>Where the density comes from</h3>
  <p>If every listed orbital has an occupation, the importer constructs the occupation-weighted density from those listed coefficients. A spatial set provides a total-kind matrix; a mixed Alpha/Beta set additionally provides alpha, beta, total, and alpha-minus-beta spin matrices. A beta-only set remains beta-only. If any occupation is missing, no derived density is created.</p>
  <div class="notice"><p>Fields labelled <strong>Occupation-derived … (listed orbitals)</strong> describe the listed export. They are not recovered correlated, transition, or independent difference density matrices. A truncated orbital set can produce only a partial density; omitted orbitals and ECP core electrons are not recovered.</p></div>
  <p>Zero-occupation virtual orbitals remain fully validated, listed, renderable, and savable. They contribute zero to the derived density. A fractional nonzero occupation contributes its supplied value. The initial field is the last source-order orbital with positive occupation, or the first orbital if none qualifies; unusual ordering means this is not necessarily the highest-energy orbital.</p>
  <h3>ORCA exports</h3>
  <p>Export a Molden file with ORCA's <code>orca_2mkl</code> before opening it. Preserve the producer title/marker: it selects the normalization convention. The qualified subset currently accepts S, P, and spherical 5D shells; ORCA SP, Cartesian D, F, and G are rejected. This is not a claim of support for every ORCA version or option. Do not remove a producer marker to bypass rejection.</p>
  <p>Frequency, normal-mode, optimization-trajectory, charge, and core/ECP sections are not preserved as structured data. Ignored sections are named in the report. Keep the original calculation. A supported file needs no installed Python, ORCA, or other calculation program to be read.</p>
  <p>The downloadable <a href="downloads/water.molden" download>water example</a> is a calculated RHF wavefunction with <strong>24 basis functions, 24 spatial orbitals, and a total density</strong>. Follow the <a href="tutorials-orbitals.html">orbital tutorial</a> to inspect it.</p>

  <h2 id="provenance">Read import warnings and provenance</h2>
  <p>The import report summarizes what was accepted and what needs attention. <strong>Provenance</strong> retains source information and decisions in the native document: original input name and byte checksum, importer/profile identification, bond method, warnings, and reported omissions. A checksum identifies source bytes; it is not a certification that the source's chemistry is correct. The source file itself is not embedded wholesale.</p>
  <p>For structures, look for model/alternate selection, omitted zero-occupancy or unknown-element rows, missing/ambiguous identities, secondary-structure notices, and connection decisions. mmCIF/BinaryCIF declared connections retain deposited references, type/order, resolved selected endpoints, and retained/duplicate/omitted status. Cell/symmetry information is reported without creating symmetry mates. A compressed BinaryCIF checksum identifies the actual compressed input bytes.</p>
  <p>All supported imports compute display bonds automatically. PDB <code>CONECT</code> and supported mmCIF covalent, disulfide, and metal declarations take precedence and are supplemented by coordinate-based connections. Rods represent display connectivity; they do not establish bond order, aromaticity, hydrogen bonds, oxidation state, or chemical validity.</p>
  <p>When opening an older native document, missing display bonds may be added while preserving existing connections, scientific arrays, and meshes. The addition is reported and the document becomes unsaved. Save explicitly to retain the change; Open leaves the original untouched.</p>

  <h2 id="conversion">Convert files without replacing the scene</h2>
  <ol>
    <li>Choose <strong>Convert files</strong>. The separate <strong>Convert Files</strong> window leaves the current scene open.</li>
    <li>Add supported input files and click <strong>Convert</strong>. The queue accepts at most <strong>32 files</strong>.</li>
    <li>Review each row's report. A failed row shows its own error and does not discard successful results.</li>
    <li>Click a successful row's <strong>Save</strong>. Desktop Save opens a destination dialog; browser Save requests a download. <strong>Conversion alone writes nothing.</strong></li>
    <li>Save or clear completed results before adding more work. Retained outputs together are bounded to <strong>128 MiB</strong>.</li>
  </ol>
  <p><strong>Cancel</strong> stops that queue's pending work and retains completed results. Closing the conversion window preserves them in memory; <strong>Clear</strong> discards them. Saved/downloaded result bytes are released. Unwritten results do not survive closing the application. Conversion preserves supplied fields and existing native meshes but does not generate new surfaces.</p>

  <h2 id="saving">Save, reopen, and share</h2>
  <p><strong>Save</strong> creates a self-contained <code>.eigenvista</code> file containing selected structure and biological identities when available, bonds, supplied analytic fields or original sampled grids, provenance, saved surface geometry and generation metadata, visibility, colors, opacity, and global representation. The current source also retains named selections, labels/measurements, SES/SAS meshes and accepted quantitative field definitions/caches. A matching installation can reopen results without their original inputs or silent recalculation; the published 0.8.0 reader cannot open documents requiring these newer capabilities.</p>
  <ol>
    <li>Generate any meshes you want to keep, check visibility and appearance, and choose <strong>Save</strong>.</li>
    <li>On desktop, choose a destination. Cancelling leaves the document unsaved. In a browser, confirm the requested download completed.</li>
    <li>Reopen the saved file with <strong>Open</strong>. Existing meshes start in <strong>Isosurface mesh</strong> mode. The camera, active render mode, and session preferences are not restored.</li>
    <li>Share that file with another compatible preview installation. Keep the original input and a backup because the preview schema is not frozen.</li>
  </ol>
  <p>Save does not export back to Molden, PDB, XYZ, mmCIF, or cube. There is no separate OBJ-plus-metadata export or external mesh linking. There is no automatic background saving, undo for surface deletion, or crash recovery. Use different native filenames to preserve multiple isovalues of the same field; regenerating replaces that field's meshes.</p>
  <h3>Compatibility and filesystem details</h3>
  <p>Older Rust-preview <code>.molekel</code> files open without a manual migration. Native Save also accepts that suffix, but new saves contain EigenVista identifiers regardless of filename and are not guaranteed to open in earlier Molekel builds. Native files containing biological identities require an application that supports the biological-structure feature. Keep an original when older software must continue to read it.</p>
  <p>Desktop Save publishes a complete replacement file. On the tested APFS volume, replacing an existing file sets permissions to <code>0600</code> (owner read/write). Atomic replacement does not establish recovery after a crash or power loss. A CLI-created new file can fail with “operation not supported” on ExFAT; create it on APFS and copy the completed output. Desktop replacement Save uses a different path and succeeded on the tested ExFAT image. Other filesystem/platform behavior is not broadly qualified.</p>
  <h3>Leaving the application</h3>
  <p>Desktop close/quit checks for unsaved changes, unfinished operations, and converted results awaiting Save. Choose <strong>Cancel</strong> to continue working, <strong>Discard and Quit</strong> to cancel work and leave without saving, or <strong>Save and Quit</strong> to save the current document before leaving. Failed or cancelled saves keep the document open. Review a refreshed prompt if the document changes while it is displayed. Finish/cancel an existing native save first; save converted results from their queue. Save and Quit is unavailable while the queue has unfinished or unsaved work.</p>
  <p>Browsers use their own close warning. Confirm all downloads before closing. When sharing the application, forward the complete tester ZIP with licenses, notices, and Source.</p>

  <h2 id="cli">Command-line converter</h2>
  <p>The tester ZIP contains <code>Tools/eigenvista-convert</code>. The following examples assume it is on your PATH. Create output directories first. The converter supports the same input profiles as Open, including mmCIF/BinaryCIF and cube.</p>
  <pre><code>eigenvista-convert calculation.molden
eigenvista-convert calculation.molden.input --output calculation.eigenvista
eigenvista-convert --output-dir converted water.molden structure.cif
eigenvista-convert --check --json calculation.cube
eigenvista-convert --help</code></pre>
  <p>A single input defaults to a sibling <code>.eigenvista</code> output; multiple inputs require <code>--output-dir</code>. <code>--output</code> (or <code>-o</code>) chooses one destination. <code>--check</code> validates and reports without writing. <code>--json</code> writes per-file results, counts, warnings, and errors as an array on standard output; otherwise summaries go to standard error. Use <code>--</code> before filenames beginning with a hyphen.</p>
  <p>Existing outputs need explicit <code>--force</code>; an input can never be its own destination. The converter rejects colliding destinations and output symlinks. New outputs use no-clobber publication even with force, and require filesystem hard-link support; unsupported publication is an error, not a partial-write fallback. At most 256 inputs are processed sequentially. Later per-file failures retain successful outputs.</p>
  <p>Exit status is <code>0</code> for complete success, <code>1</code> for a per-file import/write failure, and <code>2</code> for invalid options or path preflight errors. Conversion creates no new meshes. Open its output in the app, generate surfaces, and Save when you need portable geometry.</p>
</div>`,
  },
  {
    file: "reference-scene.html",
    title: "Scene, appearance, and images",
    searchTitle: "Molecular appearance, ambient occlusion and PNG export",
    description:
      "Camera and picking controls, molecular representations, Pastel palettes, ambient occlusion, PNG exports, and surface shaders.",
    section: "reference",
    number: "03.2",
    body: `
<div class="prose">
  ${workspaceNotice}
  <p>Frame a molecule, choose how atoms and fields are drawn, then export the current viewport. Global representation and field colors/opacity belong to the document. Camera, background, lighting choices, palettes, and shaders are display preferences for the session.</p>

  <h2 id="navigation">Navigate and inspect</h2>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Action</th><th scope="col">Control</th></tr></thead>
    <tbody>
      <tr><th scope="row">Rotate</th><td>Left-drag; one-finger drag on a touchscreen.</td></tr>
      <tr><th scope="row">Pan</th><td>Right-drag or Ctrl-drag; two-finger pan on a touchscreen.</td></tr>
      <tr><th scope="row">Zoom</th><td>Scroll, or middle-button drag vertically; pinch on a touchscreen. The toolbar also has <strong>Zoom in</strong> and <strong>Zoom out</strong>.</td></tr>
      <tr><th scope="row">Restore framing</th><td><strong>Fit scene</strong> or <strong>Reset view</strong>. Both currently fit all displayed objects and restore the default viewing direction.</td></tr>
      <tr><th scope="row">Inspect an atom</th><td>Click it to show element, index, and coordinates in angstroms. Biological context appears alongside when supplied.</td></tr>
      <tr><th scope="row">Inspect a saved mesh</th><td>Click it to show its label and triangle count.</td></tr>
    </tbody>
  </table></div>
  <p>Tab to toolbar buttons and activate with Enter or Space. Hover an icon to read its name. The published 0.8.0 app displays picked information; the <a href="reference-inspection.html#measure">unreleased scientific-inspection test build</a> also supports distance, angle and signed-torsion measurements. Neither modifies molecular coordinates. The camera is not saved in <code>.eigenvista</code>.</p>

  <h2 id="representations">Molecular representations</h2>
  <p>Choose <strong>Representation</strong> in <strong>Molecule → Molecular data</strong>. The global choice is saved with the document.</p>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Choice</th><th scope="col">Depiction and use</th></tr></thead>
    <tbody>
      <tr><th scope="row">Ball and stick</th><td>Atoms and connecting rods; useful for checking a small structure and its display connectivity.</td></tr>
      <tr><th scope="row">Liquorice</th><td>A rod-focused atomic view for inspecting connected molecular detail.</td></tr>
      <tr><th scope="row">Van der Waals</th><td>Space-filling atom spheres; no bond cylinders. Useful with ambient occlusion for dense molecules.</td></tr>
      <tr><th scope="row">Protein backbone trace</th><td>A path through supported protein backbone points.</td></tr>
      <tr><th scope="row">Protein smooth tube</th><td>A smoother tube following the supported backbone.</td></tr>
      <tr><th scope="row">Protein ribbon</th><td>Oriented protein ribbons where deposited identities and backbone geometry permit.</td></tr>
      <tr><th scope="row">Protein cartoon</th><td>Helical ribbons, strand arrows, and connecting loops based on deposited secondary assignments.</td></tr>
    </tbody>
  </table></div>
  <p>Protein choices require suitable biological identities. Nonprotein components retain atomic detail; chain/component overrides can mix styles. Missing atoms and gaps break protein paths rather than inventing a connection. See <a href="reference-structures.html#depictions">protein depiction rules</a>.</p>
  <p>Element colors cover atomic numbers 1–118. Display radii use published van der Waals tables where available and a covalent-radius-based continuation for Fm–Og; they are visual models. Automatic bonds use a separate covalent-radius heuristic. A drawn rod is not a bond-order or chemical-validity result.</p>

  <h2 id="field-appearance">Field colors, opacity, and surface shading</h2>
  <p>Under <strong>Appearance</strong>, <strong>Positive</strong> and <strong>Negative</strong> choose signed field colors, and <strong>Opacity</strong> controls field transparency. These apply across quantum/imported-field surfaces, not just the selected field, and are retained when saved. Molecular SES/SAS has its own live saved color and opacity under <strong>Surfaces → Molecular surfaces</strong>. Appearance edits do not recompute either field or geometry.</p>
  <p><strong>Surface shading</strong> offers <strong>Diffuse</strong> (the default) and <strong>Blinn-Phong</strong> (specular highlights on saved meshes and sampled raycast isosurfaces). It is a session preference, separate from atom/bond materials, and is not stored in the molecular document. Choose <a href="reference-fields.html#modes">the rendering mode</a> under Field rendering.</p>
  <p>Six equally strong lights surround the view symmetrically, with neutral ambient fill. They follow the camera during orbit, pan and roll, so the other side does not become a permanently dark back. Atoms, bonds, protein depictions and built-in mesh/raycast surfaces share this arrangement. Visible geometry and specular highlights still provide shape cues. Custom shaders keep their declared lighting; volume compositing stays unlit.</p>
  <p>In <strong>Surfaces → Saved surfaces</strong>, the eye icon toggles one mesh's visibility and the trash icon removes it. There is no undo. Save to retain those changes. In sampled modes, the active field's meshes are visually replaced by the sampled display; eye/trash controls still manage saved meshes. Return to <strong>Isosurface mesh</strong> to inspect their effect independently.</p>

  <h2 id="ao">Molecular ambient occlusion</h2>
  <p>Ambient occlusion emphasizes atom contacts and broad recesses in dense molecules. It starts off. While enabled with nonzero strength, atoms and bonds use <strong>Lambert shading plus screen-space ambient occlusion (SSAO)</strong>, without specular highlights.</p>
  <ol>
    <li>For space-filling detail, choose <strong>Representation → Van der Waals</strong>.</li>
    <li>For best results, download <a href="downloads/matterviz-pastel.json" download>matterviz-pastel.json</a> and load it through <strong>Appearance → Atom colours → Colours file…</strong>. For a biological structure, choose <strong>Coloring → Element</strong> to see that palette.</li>
    <li>Under <strong>Appearance</strong>, enable <strong>Ambient occlusion</strong>. Adjust <strong>AO strength</strong> from 0–100%; zero restores the normal molecular view.</li>
    <li>Leave <strong>Automatic AO radius</strong> checked initially. Read the chosen neighborhood in <strong>AO radius (angstrom)</strong>.</li>
    <li>To tune the scale, uncheck Automatic AO radius. The manual slider starts at the current automatic radius and covers 0.25–50 Å in quarter-angstrom steps. Smaller radii emphasize nearby contacts; larger radii emphasize broader recesses.</li>
  </ol>
  <p>Automatic radius is derived from the atom-coordinate extent and limited to 1.5–30 Å. Zooming, changing the field grid, or changing representation does not alter it. The visible screen-space shading can still vary with camera position. Compare real application views in the <a href="gallery.html">gallery</a> or follow the <a href="tutorials-ao.html">AO tutorial</a>.</p>
  <div class="notice"><p>AO uses the visible scene to emphasize contacts and recesses. Offscreen geometry is not included. Turn it off if navigation becomes slow.</p></div>
  <p>AO controls last through Open within the session; restart/reload begins with AO off. PNG exports include the current shading. Atom colors and picking still work. Quantum fields, saved surfaces, and protein depiction geometry keep their own materials; AO shades the atomic spheres and bonds. Turning AO off releases its image buffers. If enhancement fails, a message appears and normal rendering stays available; disable/re-enable to retry. A lost graphics context requires reload/restart.</p>

  <h2 id="palettes">Atom colours</h2>
  <p>The <strong>Appearance → Atom colours</strong> widget identifies <strong>Built-in default (118 elements)</strong> or the palette file loaded this session. <strong>Colours file…</strong> opens a JSON palette. <strong>Reset to defaults</strong> restores the bundled colors. Biological <strong>Coloring → Element</strong> displays these element overrides; other biological color modes use their own legends.</p>
  <p>Two optional MatterViz palettes are supplied: <a href="downloads/matterviz-pastel.json" download>Pastel</a> is lighter with pale-pink oxygen and is recommended for AO; <a href="downloads/matterviz-muted.json" download>Muted</a> has subdued colors with dusty-rose oxygen. They also live in the source checkout's <code>palettes/</code> and tester ZIP's <code>Palettes/</code>. Both cover elements 1–109; 110–118 keep built-in defaults. Their <a href="downloads/LICENSE-MatterViz.txt">upstream MIT notice</a> accompanies the examples.</p>
  <h3>Write a partial palette</h3>
  <pre><code>{
  "format": "eigenvista-atom-colors",
  "version": 1,
  "colors": [
    { "z": 6, "symbol": "C", "color": "#ff00aa" }
  ]
}</code></pre>
  <p><code>z</code> (atomic number) selects the element. The optional <code>symbol</code> is checked as a typo guard; it never selects an element. Partial palettes are supported: unlisted elements keep defaults. Colors must be lowercase <code>#rrggbb</code>.</p>
  <p>The entire file is rejected for a wrong format/version, missing or empty colors, duplicate/out-of-range atomic numbers, an invalid color, or a symbol inconsistent with its atomic number. The current palette remains intact on rejection. Palette changes are session-only and do not make the molecular document unsaved; a fresh session uses the built-in palette.</p>

  <h2 id="background-images">Background and PNG exports</h2>
  <p>In the scene toolbar, <strong>Background color</strong> opens a color picker. The initial color is <code>#e8edef</code>; <strong>Reset background color</strong> restores it. The choice is session-only and is not written into molecular files.</p>
  <ol>
    <li>Frame the view, adjust lighting/appearance, and wait for any requested field calculation to finish.</li>
    <li>Choose <strong>Export image</strong> for <code>eigenvista-view.png</code> with the selected opaque background.</li>
    <li>Or choose <strong>Export image with transparent background</strong> for <code>eigenvista-view-transparent.png</code>. Empty areas are transparent; antialiased edges and translucent surfaces retain fractional alpha.</li>
    <li>Confirm the download completed, then open the PNG in an image viewer or place the transparent version on your intended background.</li>
  </ol>
  <p>Both actions capture the current rendered viewport after zooming, resizing, or an idle period. Toolbar/status overlays are excluded. The <a href="reference-inspection.html">unreleased scientific-inspection test build</a> additionally includes scientific labels, measurement monitors and visible numerical keys in normal and transparent images. Transparent export leaves the selected background visible in the app. Exports include the current field mode and AO; they are images, not saved scientific documents. Use Save separately to retain data.</p>
  <p>If an export fails, its error appears without changing the molecular document; try the export again. PNG files use the app or browser’s download mechanism. Check that the file has finished downloading before closing the window.</p>

  <h2 id="shaders">Custom surface shaders</h2>
  <p>See the <a href="surface-shaders.html">illustrated shader guide</a> for X-ray and cutaway views, downloadable presets and a complete worked example.</p>
  <p>The <strong>Appearance → Surface shader</strong> widget optionally replaces built-in surface materials with a vertex/fragment GLSL pair. It affects surfaces, not atom/bond AO. Shader sources and uniform values last for the session and are not stored in <code>.eigenvista</code>.</p>
  <ol>
    <li>Choose a <strong>Vertex shader</strong> and a <strong>Fragment shader</strong> file. The picker accepts <code>.vert</code>, <code>.frag</code>, <code>.glsl</code>, or text files.</li>
    <li>Optionally load a <strong>Parameters file</strong> (<code>.params</code>) with default uniform values.</li>
    <li>Choose <strong>Apply to</strong>: all surfaces or one saved surface.</li>
    <li>Click <strong>Apply shader</strong>. Parsed uniforms appear as live controls. Their edits redraw immediately. Choosing new source files leaves the previous applied pair active until you apply the new pair.</li>
    <li>Use <strong>Save parameters</strong> to export the current uniforms as a Molekel-style <code>.params</code> file. Desktop opens a save dialog; the browser downloads it. Cancelling is harmless; a write error appears in the panel.</li>
    <li>Use <strong>Clear shader</strong> to restore Diffuse/Blinn-Phong, clear loaded files/parameters, and reset shader transparency.</li>
  </ol>
  <p>Examples are included in the tester/source packages under <code>Shaders/</code>; repository examples also live in <code>app/shaders/</code> and <code>shaders/</code>. Classic GLSL 1.x built-ins such as <code>ftransform()</code>, <code>gl_Vertex</code>, <code>gl_Normal</code>, and <code>gl_Color</code> are mapped onto the current rendering environment. Surface colors feed <code>gl_Color</code>.</p>
  <h3>Parameters and validation</h3>
  <p>Matching uniform types retain their values when new sources load; changed types reset to defaults. A parameter file with a nonnumeric value, unsupported/mismatched kind, or wrong component count is rejected with its parameter name and line number, preserving current values and the applied shader. Clear before loading another pair when shared uniform types conflict. Parameter export uses lines such as <code>float name&lt;TAB&gt;value</code>; native export has a 128 KiB text bound and writes a complete replacement file.</p>
  <h3>Transparency and errors</h3>
  <p><strong>Shader transparency</strong> starts checked and blends fragment alpha even when document opacity is 100%. Uncheck it for opaque rendering: final alpha becomes one and depth writes are enabled. It updates an applied shader live and is saved in neither the document nor parameter file. <strong>Clear shader</strong> resets it to checked.</p>
  <p>Compile/link errors appear in red in the panel after Apply. Correct and reapply the pair, or Clear shader to restore built-in materials. Transparent objects use ordinary object sorting; intersecting layers can show ordering artifacts.</p>
</div>`,
  },
  {
    file: "reference-fields.html",
    title: "Orbitals, densities, and fields",
    searchTitle: "Molden orbitals, electron density and Cube field rendering",
    description:
      "Select Molden molecular orbitals and electron density, render Cube scalar grids, and control isosurfaces, raycasting, volumes, resolution and mesh caching.",
    section: "reference",
    number: "03.3",
    body: `
<div class="prose">
  ${workspaceNotice}
  <p>Render orbitals and densities from Molden or native documents, or open a cube to visualize a sampled scalar field. Use a raycast or volume preview to explore the field, and generate an isosurface mesh when you want to save its geometry.</p>

  <h2 id="choose">Choose a field</h2>
  <p>In <strong>Fields → Quantum fields</strong>, select under <strong>Orbitals</strong>, <strong>Density matrices</strong>, or <strong>Sampled fields</strong>. Only one field is active for volume/raycast preview. Orbitals come from supplied coefficients; density matrices come from the document or the <a href="reference-files.html#molden">reported occupation-derived Molden interpretation</a>. A cube supplies scalar samples without orbital coefficients.</p>
  <p>Try <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a> for the molecular orbitals and density shown in the gallery, or <a href="downloads/complex-field.cube" download>complex-field.cube</a> for a 29-atom structure with a sampled scalar grid. The flask-shaped example menu beside <strong>Molecular data</strong> offers <strong>Hydrogen pair</strong> and <strong>Fractional open shell</strong>: mathematical demonstrations, not calculated molecular reference results. Opening an example replaces the current document after an unsaved-change confirmation.</p>
  <p>Orbital values use <code>bohr^-3/2</code>; density controls use electrons per <code>bohr^3</code>. Imported grid scalar units remain unspecified: consult the producer rather than guessing from a label. A positive/negative orbital surface represents field sign, not positive/negative electrical charge.</p>

  <h2 id="one-field">Generate a saved surface for one field</h2>
  <ol>
    <li>Select the field in Fields → Quantum fields.</li>
    <li>Under <strong>Fields → Field rendering</strong>, enter a finite positive <strong>Isovalue</strong> magnitude. Generation attempts both the positive and negative level; only nonempty results are added. A nonnegative density may therefore yield one positive surface.</li>
    <li>Choose <strong>Grid resolution</strong>. The default is <strong>40³</strong>. Available points per axis are 24, 32, 40, 48, 64, 80, 96, 128, 160, 192, 224, and 256. These cubic labels describe the full grid.</li>
    <li>Click <strong>Generate surfaces</strong>. Sampling, signed meshing, and validation run in the background. The button becomes <strong>Cancel</strong> while work is active.</li>
    <li>On success, inspect the result in <strong>Isosurface mesh</strong>. Adjust colors/opacity, manage meshes under <strong>Saved surfaces</strong>, then <strong>Save</strong> to retain them on disk.</li>
  </ol>
  <p>An isovalue outside the sampled range can legitimately produce no surface. Try a smaller magnitude or another field. Larger resolution costs more CPU time and memory and is not an accuracy guarantee. Changing the selected field, isovalue, or resolution does not automatically regenerate existing meshes.</p>
  <p>For a sampled preview without mesh extraction, choose <strong>Volume preview</strong> or <strong>Sampled raycast preview</strong> under <strong>Mode</strong>. Analytic orbitals/densities are sampled directly; you do not need to generate a mesh first.</p>

  <h2 id="orbitals">Browse and generate several orbitals</h2>
  <ol>
    <li>Click <strong>Orbitals (count)</strong>, such as <strong>Orbitals (24)</strong> for the water example. Its tooltip is <strong>Browse and select orbitals</strong>.</li>
    <li>Inspect the table: one-based row, label, spin, occupation, energy in hartree, and saved-mesh count. Missing numbers show <code>--</code>, not zero; unspecified spin is <strong>Unknown</strong>.</li>
    <li>Use <strong>Search orbitals</strong> to filter by row number, label, identifier, or spin. Check individual rows. The header checkbox selects/clears the currently listed rows; filtering preserves checked rows outside the current list. <strong>Clear orbital selection</strong> clears every check.</li>
    <li>Set positive <strong>Isovalue</strong> and <strong>Grid resolution</strong>, then click <strong>Generate selected</strong>. Select <strong>1–32 orbitals</strong> per generation. The full table can contain more than 32.</li>
    <li>The window closes and progress identifies each orbital and its batch position. On complete success, all new meshes appear together in <strong>Isosurface mesh</strong>. Save when ready.</li>
  </ol>
  <p>Batch results are applied only after the entire batch passes validation. Cancellation or a recoverable error retains prior surfaces. Only checked orbitals' meshes are replaced; meshes of other fields remain. Multi-selection creates separate orbital meshes, not a combined orbital or a new density matrix.</p>
  <p>The <strong>Saved</strong> column counts meshes in the document's memory, including hidden meshes. It does not mean the document is on disk. Checkboxes are temporary and are not saved. Each opening of the orbital browser initially checks only the active orbital, when the active field is an orbital. Closing without generating leaves the document/settings unchanged.</p>
  <p>After a successful batch, the previous active orbital remains active if it was checked; otherwise the first checked orbital in document order becomes active. Its sampled preview is ready. The checks do not select multiple simultaneous volumes.</p>

  <h2 id="modes">Three rendering modes</h2>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Mode</th><th scope="col">What is drawn</th><th scope="col">When work occurs</th></tr></thead>
    <tbody>
      <tr><th scope="row">Isosurface mesh</th><td>Saved positive/negative triangles.</td><td><strong>Generate surfaces</strong> or <strong>Generate selected</strong> creates/replaces meshes. Reopened saved meshes draw immediately without recalculation.</td></tr>
      <tr><th scope="row">Sampled raycast preview</th><td>Isovalue crossings found by rays through the current display grid.</td><td>Preparing a field/resolution may sample it. Isovalue changes redraw the current sampled preview directly without regenerating saved meshes.</td></tr>
      <tr><th scope="row">Volume preview</th><td>Accumulated color/opacity along rays through one display grid.</td><td>Preparing a field/resolution may sample it. Switching between volume and raycast reuses the current grid.</td></tr>
    </tbody>
  </table></div>
  <p>Sampled previews use an in-memory grid. Cube/stored-grid fields prepare it automatically on Open or selection. Analytic orbital/density fields sample when a sampled mode is requested, including after reopening a document. No marching cubes runs unless you explicitly generate surfaces.</p>
  <p>In sampled modes, selecting another field or changing resolution prepares a new preview while preserving the chosen mode and every saved mesh. Failure/cancellation retains the previous completed preview, field, and resolution. A failed preparation can be retried by selecting the mode, field, or resolution again. In mesh mode, selecting an analytic orbital changes the active field without calculation; choose a sampled mode or Generate surfaces to display it. Stored grids also prepare a preview when selected in mesh mode.</p>
  <p>The selected field's saved meshes are visually replaced by the sampled display. Other fields' meshes may remain visible. Eye/trash controls affect meshes, not a transient volume. Return to mesh mode when checking those controls.</p>
  <h3>Sampling quality is different from grid resolution</h3>
  <p>In either sampled mode, <strong>Sampling quality</strong> offers <strong>Draft</strong>, <strong>Standard</strong> (default), and <strong>Fine</strong>: 1, 2, and 4 samples per voxel-distance along a ray. Quality redraws the existing grid without a worker calculation, new meshes, or scientific-data changes. It does not mark the document unsaved.</p>
  <p>The choice continues across mode switches, is hidden in mesh mode, and is not saved. Fine can reduce missed crossings between display steps; it cannot recover details missing from the grid or guarantee detection of tangencies. Increase grid resolution only when you actually need a different grid and can afford the calculation.</p>

  <h2 id="cube">Cube fields: already sampled data</h2>
  <p>Open <code>.cube</code>/<code>.cub</code> to obtain atoms, automatic display bonds, and one scalar grid. A new cube starts in <strong>Volume preview</strong>; raycast is available immediately. Generate surfaces when you want portable saved geometry. No Gaussian basis, coefficients, or density matrix is required.</p>
  <p>The <a href="downloads/complex-field.cube" download>complex-field example</a> contains <strong>29 atoms and an 84 × 84 × 84 grid</strong>, with values between 0 and 1. Start at an isovalue of <strong>0.65</strong> and adjust it to explore the field. Follow the <a href="tutorials-cube.html">cube tutorial</a> to compare the three modes.</p>
  <h3>Accepted cube profile</h3>
  <p>The file must contain one finite scalar per grid point, positive axis counts of at least two, finite bohr coordinates, and a nonsingular affine grid. Skewed and reflected grids are supported; axes need not align with Cartesian directions. Atom numbers 1–118 and zero-atom grids are accepted. The atom-row charge value is validated but not retained as a separate property. Ordinary and Fortran D/d numeric exponents are supported.</p>
  <p>A negative atom count denotes a standard orbital/dataset header with <strong>exactly one</strong> dataset ID, not a unit change. That ID labels the sampled field; it does not supply orbital coefficients. Optional NVAL must be one. Multiple datasets, negative axis counts/alternative coordinate units, ghost atoms, singular grids, and missing/extra samples are rejected. Export one field per cube with supported units; do not remove markers to bypass the profile.</p>
  <p>Scalar meaning/units remain unspecified even for an orbital-labelled cube. If the normal initial isovalue is at or above a nonzero field's peak magnitude, import can choose one tenth of that peak as a starting display value. This is reported and does not normalize the data. All-zero grids have no nonzero isosurface.</p>
  <p><strong>Grid resolution</strong> bounds the display/meshing grid: a larger source can be downsampled while preserving its affine extent; a smaller source is not upsampled. Increasing the control cannot add missing source detail. The complete original f64 samples and affine grid are retained and saved alongside generated geometry.</p>

  <h2 id="progress">Progress and cancellation</h2>
  <p>While work runs, Field rendering remains expanded when visible. A global activity strip keeps <strong>Cancel calculation</strong> reachable even when you change tabs, close Tools or enter Zen. Read the current field, orbital/batch position, phase, counts, and elapsed time. Sampling reports completed z slices and a per-field percentage. Meshing reports completion of the two signed passes, not progress within each cell pass. Preparation, transfer, and validation are indeterminate.</p>
  <p>Percentages restart for each phase and field; they are not a percentage of the whole batch. There is no remaining-time estimate. A single slice or meshing pass may take longer than another, brief phases may finish before they appear, and cached fields skip sampling. A phase label staying visible is not by itself a failure.</p>
  <p>Cancel terminates the current calculation and retains previous completed meshes/preview. The app runs one scientific operation at a time; other queued work, such as file conversion, continues in order. Batch cancellation does not publish a partial set. If work is too expensive, retry with fewer orbitals or a lower grid resolution. Density cost also depends strongly on basis size.</p>

  <h2 id="cache">Caching, replacement, and saving</h2>
  <p>For unchanged scientific inputs, the most recently sampled field at the same resolution can be reused for another isovalue or appearance change. Sampling another field/resolution replaces that transient cache. Active calculation cancellation or a worker failure that restarts the worker clears it. Saved meshes are independent of the cache.</p>
  <p>Generate surfaces replaces that field's saved meshes, retaining other fields. A mesh records the isovalue actually used to generate it, even if the control is edited later. Save separate documents to keep multiple isovalues of one field. Colors/opacity can be changed without resampling; changing the isovalue does not silently change stored geometry.</p>
  <p>Native Save retains analytic inputs, original imported grids, and completed meshes with generation metadata. It does <strong>not</strong> save the transient analytic calculation/display grid, active mode, camera, sampling quality, or orbital checkbox selection. A reopened document with meshes starts in mesh mode. Stored grids rebuild previews from their saved source; analytic fields can be sampled again directly when you select a sampled mode.</p>

  <h2 id="precision">Precision and resource bounds</h2>
  <p>Original imported scalar values are f64; current display textures and meshing use f32. A finite source grid that overflows f32 produces a preview/meshing error rather than silent clamping. Its valid document, bonds, and existing meshes remain open and savable with the authoritative f64 grid. This differs from a malformed import, which leaves the previous document open.</p>
  <p>Analytic grids can reach 256³ transient samples, displayed at the selected resolution without silently lowering it. Imported/native authoritative grids remain limited to 128³ total samples. The maximum is a rejection bound, not a recommended workload or an accuracy/performance promise.</p>
  <div class="notice"><p>At 256³, one field has <strong>16,777,216 samples</strong>: 128 MiB of f64 calculation values plus 64 MiB of f32 display values, before meshes, copies, and graphics memory. Save before large calculations. Recoverable errors preserve prior work; browser, driver, or operating-system termination can still lose unsaved work.</p></div>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Resource</th><th scope="col">Current guard</th></tr></thead>
    <tbody>
      <tr><th scope="row">Input / inflated native arrays</th><td>128 MiB shared budget; stricter per-format limits also apply.</td></tr>
      <tr><th scope="row">Selected atoms / bonds</th><td>100,000 atoms; 600,000 display bonds.</td></tr>
      <tr><th scope="row">Gaussian basis / orbitals</th><td>1,024 basis functions; 64 primitives per basis function; 512 total orbitals across spin blocks.</td></tr>
      <tr><th scope="row">Imported/native grids</th><td>128³ total samples.</td></tr>
      <tr><th scope="row">Transient analytic sampling</th><td>Up to 256³ samples.</td></tr>
      <tr><th scope="row">Mesh output / document surfaces</th><td>Two-million-vertex output bound; 128 saved surfaces; estimated 128 MiB geometry check before native validation.</td></tr>
    </tbody>
  </table></div>
  <p>The orbital and basis caps are independent. A complete spatial set with one orbital per basis function fits through 512 functions; complete alpha and beta sets fit through 256 functions each. A partial export can use the separate 1,024-basis limit while listing at most 512 orbitals. Omitted orbitals are not recovered. Smaller workloads can still be slow or exceed another numerical/geometry/file limit.</p>

  <h2 id="rendering-limits">Rendering limits</h2>
  <p>Raycasting can miss narrow features or tangencies between grid samples. Use <strong>Fine</strong> sampling quality for a smoother preview, or increase grid resolution to sample the field more densely. For imported cube data, detail is limited by the source grid.</p>
  <p>Volume depth comes from accumulated visible opacity. Opaque objects test that representative depth, but volume color integrates the whole ray; intersections may include color from behind an atom or mesh. Interpenetrating transparent objects use ordinary object sorting and can show ordering artifacts. Shrinkwrap and a transfer-function editor are not available.</p>
</div>`,
  },
  {
    file: "reference-structures.html",
    title: "Biological structures",
    searchTitle: "PDB and mmCIF molecular representations",
    description:
      "Inspect PDB, mmCIF and BinaryCIF structures with chain colors, component filters, residue ranges, traces, tubes, ribbons and protein cartoons.",
    section: "reference",
    number: "03.4",
    body: `
<div class="prose">
  ${workspaceNotice}
  <p>Open PDB, mmCIF, or BinaryCIF with chain, residue, and atom identities to use <strong>Molecule → Molecular data → Biological structure</strong>. Try the public <a href="downloads/1AON.cif" download>1AON complex</a> and compare the real application images in the <a href="gallery.html">gallery</a>.</p>

  <h2 id="import-selection">What the importer selects</h2>
  <p>The reader retains the first model/structure, common atoms, and one alternate conformer per residue, choosing the alternate with the highest mean occupancy. Zero-occupancy atoms are omitted. Unknown mmCIF element symbols are skipped with a notice rather than guessed. These policies can make displayed counts differ from the deposited source; read <strong>Import report</strong> and <strong>Provenance</strong>.</p>
  <p>Selected atoms can retain atom names and residue membership; residues retain chain, name, label/author numbering, insertion identifiers, observed segment, component kind, and deposited secondary assignment. mmCIF label, author, and entity identifiers remain separate. PDB TER boundaries are respected and missing entity identifiers are not fabricated. Classification uses supported deposited component/polymer information and recognized names; unknown classifications remain explicit.</p>
  <p>mmCIF nonpolymer rows without label sequence numbers use author residue/insertion identity to distinguish waters and ligands. Different monomer names at the same sequence position can both remain selected. Protein paths break at that ambiguous position rather than selecting an invented conformer; inspect it in an atomic view or with a named residue range.</p>
  <h3>Connectivity and source losses</h3>
  <p>PDB CONECT and supported mmCIF/BinaryCIF covalent, disulfide, and metal declarations are retained, including accepted links beyond automatic distance cutoffs. Coordinate-based display connections fill gaps. Source declaration details and unresolved, duplicate, or omitted links are recorded in Provenance. Different/unknown symmetry images are reported without generating mates.</p>
  <p>Occupancies, B-factors, and formal charges are not retained as atom attributes; the complete source hierarchy and all annotations/models/conformers are not preserved. Cell/symmetry reporting is not crystal-image expansion. The importer is bounded, not a complete mmCIF dictionary validator. Gzip input is supported only for BinaryCIF, not compressed text mmCIF or PDB. Keep the original structure file.</p>
  <h3>Secondary assignments</h3>
  <p>Supported PDB HELIX/SHEET and mmCIF/BinaryCIF deposited annotations supply secondary structure. Missing, unsupported, ambiguous, or conflicting assignments remain unknown with notices. EigenVista does not run DSSP or infer secondary structure from coordinates. An unassigned gray loop is an explicit uncertainty, not a predicted coil.</p>

  <h2 id="coloring">Coloring and identity</h2>
  <p>Choose <strong>Coloring</strong> under Biological structure. The legend explains the visible categories.</p>
  <div class="table-wrap"><table>
    <thead><tr><th scope="col">Mode</th><th scope="col">Meaning</th></tr></thead>
    <tbody>
      <tr><th scope="row">Element</th><td>The CPK element palette, including any <a href="reference-scene.html#palettes">Atom colours override</a>. Use this to see MatterViz Pastel with atomic AO.</td></tr>
      <tr><th scope="row">Chain</th><td>Distinct deposited chain instances. mmCIF label identifiers appear with author identifiers when different; PDB uses author chain identifiers.</td></tr>
      <tr><th scope="row">Entity</th><td>Chains belonging to the same supplied entity share a color. The supported PDB profile lacks this mapping and reports entity unknown.</td></tr>
      <tr><th scope="row">Secondary structure</th><td>Deposited helices, sheets, and supported coil/turn assignments; unknown/unassigned residues remain gray.</td></tr>
    </tbody>
  </table></div>
  <p>Chain/entity colors are deterministic. Names/colors are based on the complete imported source, so filtering does not rename or recolor the remainder. Extra source identifiers distinguish otherwise identical displayed names in legends, controls, and picking. Unknown identities are labelled instead of inferred from location. A long legend shows its first 50 entries with a count notice.</p>
  <p>Click an atom to inspect element/index/angstrom coordinates with its biological context beside them. Selection does not resize the scene.</p>

  <h2 id="visibility">Components, chains, isolation, and focus</h2>
  <ol>
    <li>Expand <strong>Components</strong>. Show or hide the protein, nucleic acid, ligand, water, ion, and unknown component kinds actually present.</li>
    <li>Expand <strong>Chains (count)</strong>. Use <strong>Filter chain or entity</strong> to find an entry, then its checkbox to show/hide it. Long lists show at most 50 entries at once; filter to reach another chain.</li>
    <li>Use a chain's <strong>Isolate</strong> button to display that chain. Isolation restores the target chain's needed component visibility and clears a conflicting residue range. The button becomes <strong>Stop isolating</strong>; activate it to remove isolation.</li>
    <li>Use <strong>Focus</strong> for a chain's visible atoms, or <strong>Focus visible structure</strong> to frame the full visible subset. Focus is disabled when no target atoms are visible.</li>
    <li>Choose <strong>Show all components</strong> to clear component/chain visibility, isolation, and residue-range filters and recover the full selected structure.</li>
  </ol>
  <p>Chain and component visibility filters combine: showing a chain alone does not override a hidden component kind except when isolation explicitly restores it. The chain text filter controls the list, not the molecular subset. If a structure seems absent, Show all components and Fit scene provide a useful reset.</p>

  <h2 id="depictions">Protein depictions and style overrides</h2>
  <p>The global <strong>Representation</strong> menu offers <strong>Protein backbone trace</strong>, <strong>Protein smooth tube</strong>, <strong>Protein ribbon</strong>, and <strong>Protein cartoon</strong>, alongside the atomic Ball and stick, Liquorice, and Van der Waals choices. Trace/tube follow supported backbone continuity; the secondary-structure cartoon distinguishes helical ribbons, strand arrows, and connecting loops.</p>
  <p>Component/chain style selectors use the shorter labels <strong>Backbone trace</strong>, <strong>Smooth tube</strong>, <strong>Ribbon</strong>, and <strong>Secondary-structure cartoon</strong> for the same protein choices.</p>
  <ol>
    <li>For an overview, choose <strong>Protein cartoon</strong> globally and <strong>Coloring → Chain</strong>.</li>
    <li>In Components or Chains, use an entry's style selector to give it a representation override. For example, keep the protein overview while inspecting a ligand or one chain in an atomic style.</li>
    <li>A chain override takes precedence over a component override; otherwise the global representation applies. Select <strong>Use global representation</strong> to remove that entry's explicit override.</li>
    <li>Choose <strong>Coloring → Secondary structure</strong> to inspect supplied assignments, and use chain isolation/focus for a closer look.</li>
  </ol>
  <p>Protein depictions are unavailable for nonprotein components, which keep atomic detail. Nucleic-acid cartoons and glycan depictions are not implemented.</p>
  <h3>Missing data stays visible as a limitation</h3>
  <p>Missing backbone atoms, source chain/segment ends, sequence breaks, and unsupported gaps break a path rather than bridge it. Ambiguous residue identities also interrupt the depiction. Missing secondary assignments remain thin gray unassigned loops in ribbon/cartoon modes, even with chain/entity coloring. Missing carbonyl orientation uses a thin-tube fallback and an informational notice; isolated backbone points remain visible as markers.</p>
  <p>Protein depiction geometry uses its own diffuse shading. <a href="reference-scene.html#ao">Ambient occlusion</a> continues to shade atomic spheres/bonds, not the new protein geometry. For an AO view of a dense complex, choose Van der Waals, Element coloring, and the Pastel palette.</p>

  <h2 id="residues">Show a deposited residue range</h2>
  <ol>
    <li>Expand <strong>Residue range</strong> and choose the target <strong>Chain</strong>.</li>
    <li>Enter <strong>First residue</strong> and <strong>Last residue</strong> using deposited identifiers. Author numbering is used when supplied. Names are optional: <code>ALA 10</code> through <code>GLY 10A</code>, or <code>10</code> through <code>10A</code>, can include an insertion residue <code>10A</code>.</li>
    <li>Choose <strong>Show residue range</strong>. The range is displayed and necessary component visibility restored.</li>
    <li>Use <strong>Clear residue range</strong> to remove just the range filter, or <strong>Show all components</strong> to clear all structure filters.</li>
  </ol>
  <p>Invalid, reversed, or ambiguous identifiers report an error and leave the previous selection intact. Use residue names where needed to distinguish deposited alternatives. Identifiers are source identities, not an invented continuous sequence: missing residues are not reconstructed.</p>

  <h2 id="saved-state">Session settings and saved metadata</h2>
  <p>Coloring, component/chain styles, visibility, isolation, residue range, and focus are session display settings. They do not modify molecular data, resample a quantum field, or mark the document unsaved. Opening another file resets structure-specific selections and styles; the color mode continues when that file has biological metadata. Restart/reload resets these settings. The global representation remains a document setting and is saved.</p>
  <p>Native Save preserves selected biological identities when available. Such files need the biological-structure format feature and cannot be opened by older applications that lack it. Older native files remain readable, but identities discarded by their original importer cannot be recovered from them: reopen the original PDB/mmCIF/BinaryCIF to obtain current metadata.</p>
  <p>Chain and protein views use the biological metadata imported from PDB, mmCIF, or BinaryCIF. When the file lacks the required metadata, the app explains which views are unavailable. See <a href="reference-files.html#saving">saving and compatibility</a> for sharing a document.</p>
</div>`,
  },
];
