import { release } from "../release.mjs";

export default [
  {
    file: "index.html",
    title: "Molecular structures and quantum chemistry, in view",
    section: "home",
    number: "00",
    description:
      "Explore molecules, orbitals and scalar fields with EigenVista. A local molecular viewer for Apple Silicon Macs.",
    body: `
<section class="hero">
  <div class="hero-copy">
    <p class="eyebrow">Molecules / orbitals / scalar fields</p>
    <h1>Quantum<br>chemistry.<br><span class="outline-type">In view.</span></h1>
    <p class="lede">See the structure. Follow the field. Explore molecular data in a local, interactive 3D viewer.</p>
    <div class="actions"><a class="button primary" href="${release.base}${release.stem}.zip">Download for Mac <span aria-hidden="true">↗</span></a><a class="button" href="tutorials.html">Start exploring <span aria-hidden="true">→</span></a></div>
    <p class="small">v${release.version} · Apple Silicon · Experimental preview<br>Ad-hoc signed; not notarized. <a href="install.html">Installation notes</a></p>
  </div>
  <figure class="hero-image plate">
    <div class="plate-label"><span>01 / STRUCTURE STUDY</span><span>1AON</span></div>
    <img src="assets/media/1aon-ao-on.webp" width="1200" height="900" alt="Large GroEL–GroES molecular structure rendered as pastel space-filling atoms with ambient occlusion revealing folds and cavities" fetchpriority="high">
    <figcaption>58,870 atoms. Pastel element colors. Lambert shading + screen-space ambient occlusion. Rendered in EigenVista.</figcaption>
  </figure>
</section>
<div class="format-strip" aria-label="Supported file families"><span>MOLDEN</span><span>PDB</span><span>mmCIF / BCIF</span><span>XYZ</span><span>CUBE</span><span>.EIGENVISTA</span></div>
<section class="section-block">
  <div class="section-heading"><p class="eyebrow">01 / Inspect</p><h2>Your data.<br>A different perspective.</h2></div>
  <div class="feature-grid">
    <article><span class="index">[01]</span><h3>Read the molecule</h3><p>Open atomic structures with automatically computed display bonds. Move from ball and stick to space-filling atoms, or follow a protein through traces, tubes, ribbons and cartoons.</p><a href="reference-structures.html">Molecular representations →</a></article>
    <article><span class="index">[02]</span><h3>Explore quantum fields</h3><p>Browse imported orbitals and occupations. Preview a supplied orbital, density or cube field with raycasting or volume rendering, then generate a mesh when you want to keep a surface.</p><a href="reference-fields.html">Fields and surfaces →</a></article>
    <article><span class="index">[03]</span><h3>Keep the result</h3><p>Save molecular data and generated surfaces together in a portable .eigenvista file. Export the current view as a PNG, with an opaque or transparent background.</p><a href="reference-files.html#saving">Saving and exporting →</a></article>
  </div>
</section>
<section class="section-block ao-feature">
  <div class="section-heading"><p class="eyebrow">02 / Depth, made visible</p><h2>Find the folds.</h2><p class="lede">Ambient occlusion brings contacts, recesses and broad cavities into view. Use the Pastel palette for best results.</p></div>
  <figure class="comparison" data-comparison>
    <div class="comparison-images">
      <div class="comparison-before"><img src="assets/media/1aon-ao-off.webp" width="1200" height="900" alt="1AON with ambient occlusion off, using normal molecular shading" loading="lazy"><span class="image-label">AO OFF</span></div>
      <div class="comparison-after"><img src="assets/media/1aon-ao-on.webp" width="1200" height="900" alt="The same 1AON view with ambient occlusion on and matte Lambert shading" loading="lazy"><span class="image-label">AO ON</span></div>
    </div>
    <div class="comparison-control" hidden><label for="home-ao">Reveal ambient occlusion</label><input id="home-ao" type="range" min="0" max="100" value="50"><output for="home-ao">50%</output></div>
    <figcaption>Same structure, camera and MatterViz Pastel palette. Off uses the normal molecular material; On uses Lambert + SSAO. <a href="tutorials-ao.html">Recreate this view →</a></figcaption>
  </figure>
</section>
<section class="section-block split-story">
  <figure class="plate"><div class="plate-label"><span>02 / FIELD STUDY</span><span>MOLDEN</span></div><img src="assets/media/water-orbital-mesh.webp" width="1200" height="900" alt="Opposite signed lobes of a molecular orbital from the supplied water Molden calculation" loading="lazy"><figcaption>Imported quantum data, rendered as a signed isosurface. Color identifies the sign of the orbital amplitude.</figcaption></figure>
  <div><p class="eyebrow">03 / From file to figure</p><h2>Choose an orbital.<br>See its shape.</h2><p>Inspect the orbital list, select a field and choose a rendering mode. Raycast and volume previews work without first building a mesh. Surface generation runs in the background with progress and cancellation.</p><a class="button" href="tutorials-orbitals.html">Follow the orbital tutorial →</a></div>
</section>
<section class="closing-band"><p class="eyebrow">Start here</p><h2>A molecule is a good first step.</h2><div class="actions"><a class="button primary" href="install.html">Install EigenVista →</a><a class="button" href="tutorials-first-molecule.html">Your first molecule →</a><a class="button" href="gallery.html">Browse the gallery →</a></div></section>
`,
  },
];
