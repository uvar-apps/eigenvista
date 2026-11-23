import { workspaceNotice } from "./workspace.mjs";
export default [
  {
    file: "surface-shaders.html",
    title: "Shape the light",
    searchTitle: "Custom molecular surface shaders: X-ray and clipping",
    description:
      "Apply custom GLSL shaders to molecular isosurfaces: create an X-ray finish, clip an electron-density surface, and adjust parameters live in EigenVista.",
    section: "shaders",
    number: "05",
    body: `
${workspaceNotice}
<p class="lede page-lede">Reveal the molecular framework through an X-ray shell. Cut into a density surface. Change the lighting, color and transparency while you explore.</p>
<p><a href="./#shader-demo">Watch the 30-second demonstration of these live controls →</a></p>

<div class="gallery-grid shader-gallery">
  <figure class="plate"><div class="plate-label"><span>X-RAY / VIEW-ANGLE OPACITY</span><span>GLSL SURFACE SHADER</span></div><img src="assets/media/quantum-xray.webp" alt="A molecular density surface drawn with a translucent X-ray shader around its atomic framework" loading="eager"><figcaption>The X-ray shader emphasizes the surface silhouette while letting the molecular framework show through.</figcaption></figure>
  <figure class="plate"><div class="plate-label"><span>CLIPPING / LOOK INSIDE</span><span>LIVE PARAMETERS</span></div><img src="assets/media/quantum-clipped.webp" alt="A molecular surface clipped to expose the atomic framework inside" loading="eager"><figcaption>Move a clipping boundary to reveal the structure beneath the surface. The molecular model stays in place.</figcaption></figure>
</div>

<div class="article-layout">
<aside class="toc" aria-label="On this page"><p class="eyebrow">Try it yourself</p><a href="#prepare">Prepare a surface</a><a href="#xray">Give it an X-ray finish</a><a href="#clip">Cut into the surface</a><a href="#live">Tune the view live</a><a href="#save">Keep the result</a><a href="#presets">Download the presets</a></aside>
<article class="prose">

<h2 id="prepare">Start with a molecular surface</h2>
<p>Custom shaders give you direct control over how an isosurface is drawn. Load a ready-made preset to get started, or bring your own vertex and fragment GLSL files. Choose <strong>Appearance → Surface shader</strong> in the single Tools pane for the editable controls.</p>
<ol>
  <li>Open <a href="downloads/bicyclic-c7h10.molden" download>bicyclic-c7h10.molden</a> and select its total density under <strong>Fields → Quantum fields → Density matrices</strong>.</li>
  <li>In the same <strong>Fields</strong> tab, expand <strong>Field rendering</strong>. Set <strong>Isovalue</strong> to <strong>0.04</strong> electrons/bohr³ and <strong>Grid resolution</strong> to <strong>256³</strong>, then click <strong>Generate surfaces</strong>. The images here use this same density mesh.</li>
  <li>Under <strong>Fields → Field rendering → Mode</strong>, select <strong>Isosurface mesh</strong>. Use <strong>Ball and stick</strong> to see the atomic framework alongside it.</li>
  <li>Frame the molecule with the rotate, zoom and <strong>Fit scene</strong> controls.</li>
</ol>
<p>For the complete field workflow, see <a href="tutorials-orbitals.html">the orbital tutorial</a>. The shaders below work on the generated surface, so you can try several finishes on the same geometry.</p>

<h2 id="xray">Give it an X-ray finish</h2>
<p>For the finish shown in <a href="gallery.html">Crambin in X-ray</a>, load the bundled <code>surface-x-ray.vert</code>, <code>surface-x-ray.frag</code> and <code>surface-x-ray.params</code> from the package’s <code>Shaders/</code> folder. Leave <strong>Shader transparency</strong> enabled and adjust the surface color to change the tint.</p>
<p>This preset makes front-facing areas more transparent and keeps the outline stronger. It is useful when a surface would otherwise hide the atoms inside.</p>
<ol>
  <li>Download <a href="downloads/shaders/x-ray.vert" download="x-ray.vert">x-ray.vert</a>, <a href="downloads/shaders/x-ray.frag" download="x-ray.frag">x-ray.frag</a> and <a href="downloads/shaders/x-ray.params" download="x-ray.params">x-ray.params</a>.</li>
  <li>Choose <strong>Appearance</strong> and expand <strong>Surface shader</strong>. Use <strong>Vertex shader…</strong> for <code>x-ray.vert</code> and <strong>Fragment shader…</strong> for <code>x-ray.frag</code>.</li>
  <li>Use <strong>Parameters file…</strong> to load <code>x-ray.params</code>. Leave <strong>Shader transparency</strong> checked.</li>
  <li>Choose <strong>All surfaces</strong> under <strong>Apply to</strong>, or select an individual surface, then click <strong>Apply shader</strong>.</li>
  <li>For the illustrated finish, set <code>maxOpacity</code> to <strong>0.85</strong>, <code>minOpacity</code> to <strong>0</strong> and <code>da</code> to <strong>0.03</strong>. Use the toolbar’s background picker for <code>#17232d</code>. Rotate the molecule and adjust <strong>color</strong> to suit your view.</li>
</ol>
<div class="table-wrap"><table><thead><tr><th scope="col">Control</th><th scope="col">What to try</th></tr></thead><tbody>
  <tr><th scope="row"><code>color</code></th><td>Choose the tint of the shell.</td></tr>
  <tr><th scope="row"><code>minOpacity</code></th><td>Raise it to give front-facing areas more body; lower it to see more of the framework.</td></tr>
  <tr><th scope="row"><code>maxOpacity</code></th><td>Lower it to soften the strongest edges.</td></tr>
  <tr><th scope="row"><code>da</code></th><td>Raise this cutoff to remove the faintest parts of the shell and emphasize its contours.</td></tr>
</tbody></table></div>
<p>Keep <code>minOpacity</code> at or below <code>maxOpacity</code>. The preset’s <code>eyePosition</code> values start at zero; leave them there for the standard view.</p>

<h2 id="clip">Cut into the surface</h2>
<p>Clipping opens a window into a molecular envelope. Six controls bound a visible box; move one boundary across the molecule to expose what it encloses.</p>
<ol>
  <li>Click <strong>Clear shader</strong> before switching presets.</li>
  <li>Load <a href="downloads/shaders/surface-clip.vert" download="surface-clip.vert">surface-clip.vert</a>, <a href="downloads/shaders/surface-clip.frag" download="surface-clip.frag">surface-clip.frag</a> and <a href="downloads/shaders/surface-clip.params" download="surface-clip.params">surface-clip.params</a> with the same three file buttons.</li>
  <li>Choose the target under <strong>Apply to</strong> and click <strong>Apply shader</strong>.</li>
  <li>Adjust <code>xmin</code> and <code>xmax</code>, <code>ymin</code> and <code>ymax</code>, or <code>zmin</code> and <code>zmax</code>. Keep each minimum below its matching maximum. Enlarge the bounds first if the surface is mostly hidden.</li>
  <li>For the illustrated cutaway, keep <code>factor</code> at <strong>0.24</strong>, set all bounds to <strong>−10 / 10</strong>, then bring <code>zmax</code> to <strong>0.25</strong>. Set the surface’s <strong>Positive color</strong> to <code>#93e8d9</code>. Rotate the view to inspect the exposed framework.</li>
</ol>
<p>The <code>factor</code> control scales the coordinates used by the clipping box. Its preset value is <code>0.24</code>; leave it fixed while finding the six bounds for your molecule. For a solid finish, uncheck <strong>Shader transparency</strong>.</p>

<h2 id="live">Tune the view live</h2>
<p>The parameter names come directly from the shader. Numbers, checkboxes, vector components and color pickers appear as appropriate. Once a shader is applied, editing these controls updates the scene immediately: there is no need to generate the surface again.</p>
<div class="shader-details"><figure><a href="assets/media/quantum-xray.webp"><img src="assets/media/quantum-xray.webp" alt="The molecular framework visible through the density envelope with the X-ray shader" loading="lazy"></a><figcaption>Adjust the finish while keeping the same molecular surface. <a href="reference.html#workspace">Tour the current four-tab workspace</a>.</figcaption></figure><figure class="shader-controls-figure"><a href="assets/media/shader-controls.webp"><img src="assets/media/shader-controls.webp" alt="Close-up of the actual shader panel with color, minimum and maximum opacity, threshold and Save parameters controls" loading="lazy"></a><figcaption><a href="assets/media/shader-controls.webp">Open the controls at full size</a>. This earlier 0.7.2 close-up illustrates shader parameters; find the current widget under Appearance → Surface shader.</figcaption></figure></div>
<p>To switch the underlying shape, choose another field or isovalue and generate its surface. To change only the appearance, keep the geometry and adjust the shader. <strong>Clear shader</strong> returns to the built-in <strong>Diffuse</strong> or <strong>Blinn-Phong</strong> surface shading.</p>

<h2 id="save">Keep the result</h2>
<ol>
  <li>Use <strong>Save</strong> to keep the molecular data and generated mesh in an <code>.eigenvista</code> document.</li>
  <li>Click <strong>Save parameters</strong> in the shader panel to download your current settings as a <code>.params</code> file. Keep it with the vertex and fragment files; load all three to restore the finish in a later session.</li>
  <li>Use <strong>Export image</strong> for the current view, or <strong>Export image with transparent background</strong> to place it on a slide or figure.</li>
</ol>
<p>The molecular document stores the surface geometry; the shader files and saved parameters keep the appearance. See <a href="reference-files.html#saving">saving and sharing</a> for the document details.</p>

<h2 id="presets">Download the presets</h2>
<div class="table-wrap"><table><thead><tr><th scope="col">Finish</th><th scope="col">Files</th><th scope="col">Useful for</th></tr></thead><tbody>
  <tr><th scope="row">X-ray</th><td><a href="downloads/shaders/x-ray.vert" download="x-ray.vert">Vertex</a> · <a href="downloads/shaders/x-ray.frag" download="x-ray.frag">Fragment</a> · <a href="downloads/shaders/x-ray.params" download="x-ray.params">Parameters</a></td><td>See the molecular framework through a luminous surface silhouette.</td></tr>
  <tr><th scope="row">Clipped diffuse</th><td><a href="downloads/shaders/surface-clip.vert" download="surface-clip.vert">Vertex</a> · <a href="downloads/shaders/surface-clip.frag" download="surface-clip.frag">Fragment</a> · <a href="downloads/shaders/surface-clip.params" download="surface-clip.params">Parameters</a></td><td>Expose an interior region with six editable clipping boundaries.</td></tr>
</tbody></table></div>
<p>More lighting and clipping examples are included in the application package’s <code>Shaders/</code> folder. For accepted shader files, parameter handling and error messages, see the <a href="reference-scene.html#shaders">surface-shader reference</a>.</p>
<div class="next-step"><span>Explore further</span><a href="gallery.html">Browse the gallery →</a><a href="reference-fields.html">Fields and surfaces →</a></div>

</article></div>`,
  },
];
