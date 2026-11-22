import { application } from "../application.mjs";
import { release } from "../release.mjs";
import { surfaceAoComparison } from "./surface-ao.mjs";
import { workspaceFigure } from "./workspace.mjs";

const development = `<div class="notice" data-unreleased-inspection><strong>EigenVista ${application.version} · Scientific inspection.</strong> ${application.status === "published" ? `The ${release.version} Mac download includes the four-tab workspace and the scientific-inspection controls described here, through both the GUI and its bundled AI connector. It also includes visible atom picks, automatic field-plane updates and detailed molecular-surface progress.` : `The selection markers, automatic plane updates and detailed molecular-surface progress described here are available in the ${application.version} test build and are not included in the published ${release.version} download.`} If you are using an older app, update it before following these workflows.</div>`;
const figure = (file, alt, caption) =>
  `<figure class="plate"><a href="assets/inspection/${file}.webp"><img src="assets/inspection/${file}.webp" width="1650" height="1232" loading="lazy" alt="${alt}"></a><figcaption>${caption} Actual pre-release app export; original proportions retained. <a href="assets/inspection/provenance.json">Capture provenance</a>.</figcaption></figure>`;
const prompt = (text) => `<pre><code>${text}</code></pre>`;

export default [
  {
    file: "reference-inspection.html",
    title: "Scientific inspection",
    searchTitle:
      "Measurements, SES SAS molecular surfaces, quantitative field probes slices profiles",
    description:
      "EigenVista scientific-inspection manual: select atoms, measure geometry, inspect ligand neighborhoods, create SES/SAS surfaces and analyze scalar fields quantitatively.",
    section: "reference",
    number: "03.F",
    body: `${development}
<p class="lede">Go from a molecular picture to a scientific observation. Select the atoms, measure their geometry, inspect molecular shape, and put numbers on a field.</p>
${workspaceFigure("homo-analysis-right", "The Fields tab and Quantitative field inspection widget beside a true signed HOMO plane, contour lines and an amplitude colorbar", "A true C₇H₁₀ HOMO section, with the controls used to make it: signed amplitude, contours and a continuous −0.06 to +0.06 bohr⁻³ᐟ² key. Open Fields, collapse Quantum fields and Field rendering when you want more room, then expand Quantitative field inspection.")}

<h2 id="where">Find the new controls</h2>
<div class="table-wrap"><table><thead><tr><th scope="col">Pane tab</th><th scope="col">Expand this widget</th><th scope="col">Use it for</th></tr></thead><tbody>
<tr><th scope="row">Molecule</th><td>Selections and measurements</td><td>Ordered picks, named sets, monitors, labels and individual-ligand neighborhoods.</td></tr>
<tr><th scope="row">Surfaces</th><td>Molecular surfaces</td><td>Coordinate-derived SES/SAS shape with an explicit radius table, probe and spacing.</td></tr>
<tr><th scope="row">Fields</th><td>Quantitative field inspection</td><td>Field meaning/units, numerical probes, planes/contours and line profiles.</td></tr>
</tbody></table></div>
<p>The Tools pane starts 480 px wide on the right; its Position control moves it left. Resize the divider, collapse or drag widgets within a tab, or close Tools to recover the scene. Show tools or Shift+T reopens it without losing drafts. Zen and browser fullscreen are separate. <a href="reference.html#keyboard">Workspace and keyboard guide →</a></p>
<p>The same operations are available to your <a href="ai.html">external AI assistant</a>. Request a scientific result in ordinary language. There is no requirement to learn programming commands, operate a file picker for the agent, or enter a model key inside EigenVista.</p>

<h2 id="selection">Select source atoms in a useful order</h2>
<p>Enable <strong>Pick atoms for inspection</strong> and click atoms, or enter the viewer's atom numbers. Numbers shown to you start at 1. The ordered list has earlier/later and remove buttons. Filtering a chain or changing a representation keeps the original atom identities.</p>
<p><strong>Focus selection</strong> frames a set; <strong>Show only selection</strong> isolates it; <strong>Show full structure</strong> clears conflicting visibility filters. Save a <strong>Named selection</strong> when you want to reuse the same atoms for a neighborhood or molecular surface. Renaming or deleting a set never changes the loaded coordinates.</p>
<p>Active picks/highlights are temporary and reset when another source is opened. Named sets are saved with the document. A saved set refers to its original atoms, rather than silently rebinding to similar labels in a different molecule.</p>
<div class="notice"><strong>Visible picking cues in ${application.version}.</strong> Gold hollow reticles identify selected atoms. With selection picking off, a normal click shows a cyan ring at the inspected atom or bond endpoints without replacing your selection. Gold takes precedence for atoms already selected. Markers identify source-atom positions, including behind scene geometry; they do not trace atom or molecular-surface boundaries. Hidden atoms stay unmarked. <strong>Clear selection</strong> removes both cues; opening a new source resets them. Exported PNGs include the markers.</div>

<h2 id="measure">Measure and annotate</h2>
<ul><li><strong>Distance:</strong> two distinct atoms; readout in Å.</li><li><strong>Angle:</strong> three atoms, centered at the middle atom; readout in degrees.</li><li><strong>Signed torsion:</strong> four ordered atoms; right-handed convention from −180° inclusive to below +180°. Pick order matters.</li></ul>
<p>Choose the kind under <strong>Geometry measurements</strong>, pick the required atoms and choose <strong>Add measurement</strong>. Edit the name, input order, kind, color or placement later. Hide a monitor to keep its definition without showing it on the figure.</p>
<p>These are nonperiodic measurements of the supplied source coordinates. Distinct coincident atoms have zero distance; a zero angle arm or degenerate torsion plane is explicitly <strong>Undefined</strong>, with a reason. The app does not invent a zero or an uncertainty estimate.</p>
<p><strong>Atom and residue labels</strong> adds sparse text to a chosen target. Depth-aware labels follow scene occlusion; the always-visible option is useful for a presentation figure. Labels and measurement monitors are included in opaque and transparent PNGs. <strong>Export measurement CSV</strong> keeps names, ordered inputs, values, units and undefined statuses.</p>

<h2 id="neighborhood">Choose one ligand copy, then its environment</h2>
<p>In <strong>Ligands and neighborhoods</strong>, search the ligand list and choose a particular copy. Chain, residue number, insertion code and displayed residue number distinguish same-name copies. Choose a radius, optionally <strong>Include complete residues</strong>, then <strong>Show neighborhood</strong>. Give the result a name to retain it.</p>
<p>The radius is an inclusive atom-center distance from the seeds to <em>all</em> loaded source atoms, including hidden atoms. Seeds remain included. Whole-residue expansion includes all atoms of a matched residue, even if some lie outside the radius; it requires biological identity metadata. The view resets conflicting filters before focusing the result.</p>
<p>This is geometric proximity, not a hydrogen-bond assignment, affinity score, functional-pocket prediction or periodic crystal contact calculation.</p>

<h2 id="shape">Distinguish SAS and SES</h2>
<p>A <strong>solvent-accessible surface (SAS)</strong> traces the solvent probe's center around atomic spheres. A <strong>solvent-excluded surface (SES)</strong> follows the molecular boundary accessible to the rolling probe, including reentrant shape. They need coordinates and radii, not a wavefunction.</p>
<p>Choose all source atoms, the current selection or a named selection. All includes hidden atoms. A subset is calculated as an <strong>isolated object</strong>: omitted atoms no longer occlude it. It is not a cropped patch of the full-molecule surface.</p>
<p>Choose <strong>Bondi / Mantina</strong> or <strong>Alvarez</strong> radii and explicit probe radius/grid spacing in Å. Radius overrides are available. Missing element radii cause an explicit error; choose a supported table or supply an appropriate radius rather than expecting a generic fallback. Display spheres and covalent-bond radii are separate inputs.</p>
<p>Smaller spacing produces finer geometry and needs more memory. Cavities are kept; spacing is not silently coarsened. Generation has progress and cancellation, and regeneration replaces a cached mesh only when successful. Saved controls retain source/probe/radii/engine provenance, visibility, color and opacity. Opaque SES and SAS can use matte ambient occlusion with built-in shading. X-ray and clipping shaders retain their own lighting.</p>
<p>Expand a saved surface to change its color and opacity immediately, without applying settings or regenerating its mesh. Use <strong>Rename surface</strong> to commit a name separately. Empty or out-of-range opacity input keeps the last accepted appearance; the generation form's initial color and opacity apply when generating a mesh.</p>
<p>For a clear SES overlay, choose <strong>Ball and stick</strong> or <strong>Liquorice</strong>. Van der Waals spheres share the SES contact boundary; their independently triangulated surfaces can cross and produce patchy interference. Opacity does not separate those boundaries. Generation preserves your chosen molecular representation and display radii.</p>
<p>A molecular-shape surface is not electron density or electrostatic potential. Save retains its cached mesh without requiring its original input file or another calculation on reopen.</p>
<div class="notice"><strong>Live molecular-surface progress in ${application.version}.</strong> The surface controls and workspace activity display show the phase and elapsed time. During mesh generation, a bar shows completed blocks and the current phase's percentage. Other phases show activity without guessing overall completion or remaining time. The bar can restart when the phase changes. Progress and <strong>Cancel calculation</strong> stay visible when Tools is hidden or Zen is active; cancellation retains the previous accepted surface. Your external AI assistant can report the same status.</div>

<h2 id="meaning">Give a field an honest meaning</h2>
<p>Open <strong>Fields → Quantitative field inspection</strong>, choose the analysis field and expand <strong>Field meaning and units</strong>. Known analytic orbitals/density matrices have their supported interpretation; cube values remain <strong>unspecified</strong> until a meaning is supplied. Knowing the coordinate unit or filename does not identify the scalar quantity.</p>
<p>An orbital section shows the signed amplitude <strong>ψ</strong>: positive and negative values identify phase. Total electron density <strong>ρ = Σ n<sub>i</sub>|ψ<sub>i</sub>|²</strong> is nonnegative and uses density units. Choose the total-density field for a density section; changing a label or colormap does not square an orbital. Spin or difference densities can have either sign and must retain their own meaning.</p>
<p><strong>Apply field meaning</strong> records a user declaration. Declaring source units labels the existing values without rescaling them. Supported <strong>Display and export unit</strong> conversions change readouts/keys/CSV while keeping raw samples intact. Orbital sign colors represent phase, not positive and negative charge.</p>

<h2 id="quantitative">Read points, planes and lines</h2>
<p>A <strong>Point probe</strong> uses an entered coordinate or one selected atom. <strong>Plane / contours</strong> uses XY/XZ/YZ or three ordered atoms, with explicit width/height and columns/rows. The first atom centers the plane, the second defines its horizontal direction, and the third fixes its orientation. Collinear choices are rejected. A <strong>Line profile</strong> uses two endpoints or two ordered atoms, includes both endpoints and plots distance in Å.</p>
<p>Coordinate inputs accept Å or bohr. Values come from direct analytic evaluation or interpolation of the original scalar grid, independent of the 3D preview's resolution. Skewed/reflected grid axes are preserved. Outside-domain samples are visibly missing, not zero-filled or extrapolated; profiles have gaps and contours do not bridge invalid cells.</p>
<p>Use <strong>View meshes and analyses</strong> when a 3D volume hides a slice. This changes the viewing mode without generating a mesh. Existing saved meshes keep their own visibility; hide them separately if needed. Return explicitly to volume/raycast when you want that preview again.</p>
<p>Each result supports <strong>Edit sampling</strong>, <strong>Recompute</strong>, visibility, label, colormap and range choices. A fixed range is useful for comparisons; <strong>Automatic sampled range</strong> restores the sampled range. Enter comma-separated plane <strong>Contour levels</strong>, then <strong>Apply result settings</strong>.</p>
<div class="notice"><strong>Automatic plane updates in ${application.version}.</strong> A newly created plane stays open for editing with <strong>Auto-update plane</strong> enabled. Use a sampling spinner or its arrow keys; press <strong>Enter</strong> after typing a value. Orientation changes update it too. Rapid changes use the newest valid definition, keeping the previous complete plane and contours visible while work runs. Turn automatic updates off to edit several values before choosing <strong>Recompute analysis</strong>. Use <strong>Cancel plane update</strong> or <strong>Cancel editing</strong> to stop pending automatic work; collapsing the widget or hiding Tools keeps it running. Coordinate display-unit changes alone do not resample.</div>
<p>Use <strong>Show numeric key</strong> for a quantitative slice's continuous colorbar. <strong>Show current field rendering key</strong> is different: it identifies the actual signed isovalues of mesh/raycast or the two-color volume's opacity transfer. It does not invent a continuous linear scale for those modes.</p>
${workspaceFigure("homo-analysis-zen", "The same C7H10 signed HOMO section in Zen, with its colorbar and contours retained and minimal controls at the upper right", "Zen gives the same molecular section the full window while retaining its quantitative key and contours. Exit Zen or Tools returns to the pane; hiding controls does not change the analysis.")}
<p><strong>Numerical samples and provenance</strong> and <strong>Export analysis CSV</strong> keep coordinates, values/units, domain status, method and source identity. CSV reports coordinates/profile distances in Å and values in the chosen display/export unit. Finite numerical data can remain inspectable/exportable when a particular 3D depiction reaches its graphics-precision limit; read the displayed explanation.</p>

<h2 id="keep">Keep the scientific result</h2>
<p>Save retains named selections, label and measurement definitions, SES/SAS meshes with provenance, and accepted numerical definitions, caches, interpretation and local appearance. Reopening restores cached fields and meshes without silently recomputing them. Use the current ${application.version} app; these document capabilities were introduced in 0.10.0 and are not readable by older 0.8.0 packages.</p>
<p>Camera, active pick mode, biological filters, palette, background, AO and custom shader settings remain session choices. Save the document and export the figure separately. PNGs include scientific labels/monitors/visible keys; toolbar/status overlays stay out.</p>

<h2 id="limits">Plan larger calculations</h2>
<p>EigenVista attempts the requested allocations for molecular meshes, named sets, annotations, numerical samples and exports, without fixed memory or item-count quotas. Larger grids and finer surface spacing can require substantially more memory and time. Generation runs in the background with progress and cancellation; recoverable allocation failures retain earlier accepted results.</p>
<p>Requested spacing, cavities and source atoms are preserved. The app does not silently coarsen a surface, shorten a numerical result or discard warnings to make it fit. If your computer cannot allocate a request, choose an explicitly smaller extent/count or a coarser spacing and retry. Actual address-space/index representation, floating-point precision and graphics-device capabilities still apply; <a href="reference-fields.html#precision">read the reported cause</a>.</p>
<div class="next-step"><span>Try it</span><a href="tutorials-geometry.html">Measure and annotate →</a><a href="tutorials-molecular-surfaces.html">Compare SES/SAS →</a><a href="tutorials-quantitative-fields.html">Inspect an orbital quantitatively →</a></div>
`,
  },
  {
    file: "tutorials-geometry.html",
    title: "Measure, label and keep the geometry",
    description:
      "Select a real C7H10 bond, measure distance and torsion, export labelled figures and tables, then extend to ligand neighborhoods.",
    section: "tutorials",
    number: "04.5",
    body: `${development}
<p class="lede">A figure should tell you which atoms were measured and keep the numbers that support it. Start with one real carbon–carbon bond, then reuse the same selection.</p>
${figure("geometry-annotations", "C7H10 ball-and-stick structure with a measured carbon-carbon distance and a label on the bridge carbon", "The first two carbons of the 17-atom C₇H₁₀ example are about 1.525 Å apart. The bridge-carbon label targets atom 7; annotations are exported by the app.")}
<h2 id="prepare">1. Open the example</h2>
<p>Use EigenVista ${application.version} and <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a>. This is the same calculated example used by the orbital tutorials. For this lesson you need only its geometry. Preserve the input and use new names for output files.</p>
<p>Choose <strong>Ball and stick</strong>. If a volume obscures the atoms, expand <strong>Fields → Quantitative field inspection</strong> and choose <strong>View meshes and analyses</strong>; hide any saved surfaces separately.</p>
<h2 id="distance">2. Measure the C–C bond</h2>
<ol><li>Open <strong>Molecule → Selections and measurements</strong>.</li><li>Enter <strong>1, 2</strong> in the atom-number box and choose <strong>Select atom numbers</strong>. Alternatively enable picking and click those atoms in order.</li><li>Expand <strong>Geometry measurements</strong>, choose <strong>Distance</strong>, name it <strong>C–C bond</strong>, and choose <strong>Add measurement</strong>.</li><li>Check a value near <strong>1.525 Å</strong> in the table and scene monitor. Rotating/zooming must not change it.</li></ol>
<div class="notice"><strong>Checkpoint:</strong> the monitor measures the original coordinates. It does not estimate a distance from the picture or depend on the display sphere radius.</div>
<h2 id="order">3. Keep selection and pick order separate</h2>
<p>Save the two atoms under <strong>Named selections</strong> as <strong>Measured bond</strong>. Then try four ordered atoms <strong>1, 2, 7, 3</strong> for a connected carbon-path torsion. Choose <strong>Signed torsion</strong> and add a separate monitor. Read its signed value rather than assuming a planar structure.</p>
<p>Use the earlier/later buttons to change pick order before creating another measurement. A saved monitor retains its own ordered inputs. Undefined geometry is reported explicitly; do not copy it as a numeric zero.</p>
<h2 id="label">4. Make an annotated figure</h2>
<ol><li>Expand <strong>Atom and residue labels</strong>, choose atom <strong>7</strong>, and enter <strong>Bridge carbon</strong>.</li><li>Choose a readable color and decide whether the label should respect depth or remain visible. Keep annotations sparse enough to avoid overlap.</li><li>Frame the molecule and export a normal or transparent PNG. Open the actual image and confirm that its label/monitor is present and legible.</li><li>Choose <strong>Export measurement CSV</strong>, then Save a new <code>measured-c7h10.eigenvista</code>.</li><li>Reopen the native document and confirm the named set and monitor definitions remain. Reapply camera/palette/shader session choices separately.</li></ol>
<h2 id="ligand">5. Extend the idea to a binding-site neighborhood</h2>
<p>With the <a href="downloads/1AON.cif" download>1AON example</a>, expand <strong>Ligands and neighborhoods</strong> and choose a particular ADP copy using its chain/residue identity. Start at <strong>4 Å</strong>, include complete residues, name the neighborhood and choose <strong>Show neighborhood</strong>.</p>
<p>Hidden source atoms are searched too. Whole residues can extend beyond the radius because one atom brought their residue into the set. This is proximity, not a hydrogen-bond or affinity assignment. Use the new named set as a later surface input.</p>
<h2 id="agent">Ask your agent instead</h2>
${prompt(`Use EigenVista ${application.version} and the C7H10 example. Measure the distance between atoms 1 and 2, label atom 7 as the bridge carbon, and save an annotated transparent image, a measurement table and a new native document. Check the actual exported files and preserve the input.`)}
<p>Your agent handles the connection and file operations; you do not need programming commands or manual GUI steps. Follow the <a href="ai-install.html">installed-app connection guide</a> first, using the compatible Mac package named there.</p>
<div class="next-step"><span>Next</span><a href="tutorials-molecular-surfaces.html">Compare molecular surfaces →</a><a href="reference-inspection.html#measure">Measurement reference →</a></div>
`,
  },
  {
    file: "tutorials-molecular-surfaces.html",
    title: "Compare solvent-accessible and excluded shape",
    description:
      "Generate genuine SES/SAS molecular surfaces with explicit radius tables, probe and spacing, compare views and retain cached geometry.",
    section: "tutorials",
    number: "04.6",
    body: `${development}
<p class="lede">A molecular surface answers a geometric question about atoms and a solvent probe. Keep those choices explicit, and compare SAS with SES without confusing either with electron density.</p>
${figure("molecular-ses", "Translucent teal solvent-excluded surface around the full C7H10 structure, using the X-ray surface shader to reveal its atomic framework", "C₇H₁₀ SES with Bondi/Mantina radii, a 1.4 Å probe and 0.15 Å spacing, shown with an X-ray finish. This is coordinate-derived molecular shape, not an electron-density isosurface.")}
<h2 id="prepare">1. Start with a manageable structure</h2>
<p>Open <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a> in EigenVista ${application.version}. Its 17 atoms make a quick first comparison; the surface needs their coordinates/radii, not the file's quantum fields. PDB/XYZ/mmCIF structures can use the same controls.</p>
<p>Choose <strong>View meshes and analyses</strong> to remove a sampled volume, and hide unrelated saved quantum meshes. Keep the atomic framework visible.</p>
<h2 id="ses">2. Generate the first SES</h2>
<ol><li>Choose the <strong>Surfaces</strong> tab and expand <strong>Molecular surfaces</strong>.</li><li>Choose <strong>Solvent excluded (SES)</strong>, all source atoms, and <strong>Bondi / Mantina</strong> radii.</li><li>Start with a <strong>1.4 Å</strong> probe and <strong>0.5 Å</strong> spacing. Name the surface and choose <strong>Generate molecular surface</strong>.</li><li>Wait for completion and inspect the saved surface's scientific provenance. It should echo your kind, radii, probe and actual spacing.</li></ol>
<p>Smaller spacing gives finer geometry. To obtain the illustrated finish, generate or regenerate explicitly at <strong>0.15 Å</strong> after the first test succeeds. No automatic coarsening is used. Cancellation/error retains the earlier accepted mesh.</p>
<h2 id="sas">3. Compare SAS using the same inputs</h2>
<p>Keep the SES, choose <strong>Create a new surface</strong>, and select <strong>Solvent accessible (SAS)</strong> with the same atoms, radii, probe and spacing. Give it a different name. Toggle visibility so you compare one surface at a time from the same camera.</p>
<p>SAS follows the probe center, while SES includes the probe-contact/reentrant molecular boundary. A difference is expected. It does not establish a charge distribution, functional pocket or interaction energy. Compare like-for-like settings before interpreting geometry differences.</p>
<h2 id="selection">4. Understand selected surfaces</h2>
<p>Choose <strong>Current selection</strong> or a named set when inspecting a local object. The calculation treats only those atoms as an isolated object: omitted atoms cease to occlude the surface. It is not a window cut out of the full molecule's existing mesh.</p>
<p>For a large protein, first select/name the intended chain or ligand neighborhood. Your agent can resolve the source identities and prepare the set for you. A small selected surface is often a more useful first test than requesting an entire assembly at very fine spacing.</p>
${workspaceFigure("crambin-shape-left", "The left-hand Surfaces pane with molecular-surface controls beside a translucent X-ray-shaded crambin SES and its Pastel atomic framework", "The same Surfaces widget on the left: 327-atom crambin with a solvent-excluded surface, Pastel atoms and the X-ray finish. This is a separate protein example, not the C₇H₁₀ surface above.")}
<h2 id="appearance">5. Reveal the interior and keep the result</h2>
<p>Choose <strong>Ball and stick</strong> or <strong>Liquorice</strong> to avoid the coincident-contact interference of Van der Waals spheres with SES. Expand the saved surface and change its color or opacity: the view updates immediately, with no Apply button or mesh regeneration.</p>
<p>Use opacity or the <a href="surface-shaders.html">X-ray/clipping surface shaders</a> to reveal the framework. Choose the particular molecular surface as the shader target if you want other meshes untouched.</p>
<p>Save a new <code>c7h10-shape-comparison.eigenvista</code> and export the figure. Reopen it and confirm both cached shapes and their provenance load without regeneration. Camera and custom shader settings remain session choices, so keep the exported figure too.</p>
<h2 id="surface-ao">6. Reveal pockets with ambient occlusion</h2>
<p>Set a saved SES or SAS to opacity <strong>1</strong> and use built-in shading. Open <strong>Appearance</strong> and enable <strong>Molecular surface ambient occlusion</strong>. Leave <strong>Automatic AO radius</strong> on to scale the effect with molecule size. Uncheck it to tune the radius, or adjust <strong>AO strength</strong> to soften the shadows.</p>
${surfaceAoComparison("surface-ao-reveal")}
<h2 id="radius-errors">If a radius or allocation is rejected</h2>
<p>Some elements lack a value in a selected table. The app names the missing element; choose a suitable table or provide an explicit positive radius with defensible provenance. Do not silently omit it or substitute a display radius. Generation attempts the requested allocation without a preset memory ceiling. If allocation fails, choose an explicitly coarser spacing or smaller source selection and retry; the error does not silently change your settings.</p>
<h2 id="agent">Ask your agent instead</h2>
${prompt(`Using EigenVista ${application.version}, compare solvent-excluded and solvent-accessible surfaces for the complete C7H10 example. Use Bondi/Mantina radii, a 1.4 angstrom probe and 0.25 angstrom spacing. Keep both cached meshes, show one at a time from the same camera, apply the X-ray finish only to the SES, and save two images plus a new native document. Report the actual settings and any radius or memory errors.`)}
<div class="next-step"><span>Next</span><a href="tutorials-quantitative-fields.html">Put numbers on an orbital →</a><a href="reference-inspection.html#shape">Surface reference →</a></div>
`,
  },
  {
    file: "tutorials-quantitative-fields.html",
    title: "Inspect an orbital quantitatively",
    description:
      "Probe a real HOMO, sample a true plane with contours and a fixed numerical key, plot a bond profile and export the values.",
    section: "tutorials",
    number: "04.7",
    body: `${development}
<p class="lede">A colored surface suggests shape. A probe, slice and line profile tell you what values are actually there.</p>
${figure("orbital-slice", "An oblique view of a signed HOMO slice with the molecular framework, contour lines and a numerical amplitude key", "C₇H₁₀ HOMO (MO 26), z = 0 bohr: 14 × 12 bohr plane, 192 × 192 samples, fixed ±0.06 bohr⁻³ᐟ² range and contours at −0.04, −0.02, +0.02 and +0.04 bohr⁻³ᐟ².")}
<h2 id="field">1. Select a field with known provenance</h2>
<p>Open <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a> in EigenVista ${application.version}. Expand <strong>Fields → Quantitative field inspection</strong> and choose the example's <strong>HOMO, MO 26</strong>, as the analysis field.</p>
<p>Inspect <strong>Field meaning and units</strong>: this is the real orbital amplitude <strong>ψ</strong>, with values expressed in bohr⁻³ᐟ² under the supplied basis/coefficients. The signs are orbital phase, not positive and negative charge. Total electron density is a different, nonnegative field, <strong>ρ = Σ n<sub>i</sub>|ψ<sub>i</sub>|²</strong>, in electrons/bohr³. This tutorial samples the supplied HOMO; it does not calculate a new wavefunction or a density from its color.</p>
<h2 id="probe">2. Read one source point</h2>
<p>Choose <strong>Point probe</strong>. Enter a coordinate with an explicit Å/bohr choice, or select exactly one atom and choose selected source atoms. Create the result and inspect its numerical value, unit and sampling method. Moving the camera or changing 3D preview resolution must not change the number.</p>
<p>Analytic Molden fields are evaluated directly; imported cube fields are interpolated from their original samples. These are different methods and are identified as such.</p>
<h2 id="plane">3. Make the illustrated plane</h2>
<ol><li>Choose <strong>Plane / contours</strong> and coordinate units <strong>bohr</strong>.</li><li>Choose <strong>XY</strong>, center <strong>0, 0, 0</strong>, width <strong>14</strong> and height <strong>12</strong>.</li><li>Set <strong>192 columns</strong> and <strong>192 rows</strong>, label it <strong>HOMO section</strong>, and create the analysis.</li><li>Choose <strong>View meshes and analyses</strong> if a sampled 3D field hides it. Hide unrelated saved meshes separately.</li><li>Under the result, disable automatic sampled range and set <strong>−0.06</strong> to <strong>+0.06</strong>. Choose the blue/white/red colormap and enable its numeric key.</li><li>Enter contour levels <strong>−0.04, −0.02, 0.02, 0.04</strong> and choose <strong>Apply result settings</strong>.</li></ol>
<div class="notice"><strong>Checkpoint:</strong> you see a true sampled plane with a fixed amplitude key and contours, not a clipping plane through a 3D isosurface. Tilting the view makes that distinction clear.</div>
<p>For a local molecular frame, pick three noncollinear atoms and choose <strong>Three selected atoms</strong> instead. The first centers the plane, the second defines its horizontal direction, and the third fixes the orientation. A plane aligned to atoms is not automatically an orbital nodal plane.</p>
<h2 id="profile">4. Plot a profile along the measured bond</h2>
<p>Select atoms <strong>1, 2</strong> in order. Create a <strong>Line profile</strong> from selected atoms with <strong>257 samples</strong>. Both endpoints are included, and the distance axis should span approximately <strong>1.525 Å</strong>. Read the values and any sign changes rather than interpreting only a hue.</p>
<p>Use <strong>Numerical samples and provenance</strong> to page the accepted values. <strong>Export analysis CSV</strong> keeps coordinates/profile distances in Å, values in the selected display/export scalar unit, and method/source information. A profile is not a line integral or a bond-order calculation.</p>
<h2 id="cube">5. Apply the workflow to an unknown cube field</h2>
<p>The <a href="downloads/complex-field.cube" download>29-atom cube example</a> contains an 84 × 84 × 84 scalar grid, with sampled values between 0 and 1. Its supplied meaning/units are unspecified. You can probe, slice, contour and export numerical values without inventing an identity such as electron density or ELF from the filename.</p>
<p>Declare a meaning only when you have producer provenance. Outside the finite grid, a probe is marked outside, a plane has missing regions and a profile has gaps. Those samples are not zeros or extrapolated values. Finer interpolation does not add information to the original grid.</p>
<h2 id="keep">6. Save a reproducible numerical result</h2>
<p>Export a PNG with its visible numeric key and save a new native document. Reopen it to confirm definitions, accepted numerical caches and interpretation survive without silent recalculation. Use a fixed range for comparisons and record the camera/session choices separately.</p>
<h2 id="agent">Ask your agent instead</h2>
${prompt(`In EigenVista ${application.version}, inspect the HOMO of the C7H10 example. Make an XY section centered at the origin, 14 by 12 bohr with 192 by 192 samples. Use a fixed amplitude range from minus 0.06 to plus 0.06 and contours at plus and minus 0.02 and 0.04, with units visible. Also plot 257 values along the bond between atoms 1 and 2. Save an image with the key, both numerical tables and a new native document. Preserve the source and verify the saved outputs.`)}
<div class="next-step"><span>Continue</span><a href="reference-inspection.html#quantitative">Quantitative reference →</a><a href="ai-guide.html">More ordinary-language requests →</a></div>
`,
  },
];
