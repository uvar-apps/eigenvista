const labels = {
  quantum: "QUANTUM FIELD",
  shader: "SHADER STUDY",
  structure: "MOLECULAR STRUCTURE",
};

const card = (file, title, category, description, link) =>
  `<article class="gallery-card" data-gallery-item data-category="${category}"><a class="gallery-image" href="assets/media/${file}.webp"><img src="assets/media/${file}.webp" alt="${description}" loading="lazy"></a><div><p class="eyebrow">${labels[category]}</p><h2>${title}</h2><p>${description}</p><a href="${link}">Make this view →</a></div></article>`;

const comparison = (id, title, count) =>
  `<figure class="comparison" data-comparison><div class="plate-label"><span>${title}</span><span>${count} ATOMS</span></div><div class="comparison-images"><div class="comparison-before"><img src="assets/media/${id}-ao-off.webp" width="1200" height="900" alt="${title} using the Pastel palette and normal molecular shading with ambient occlusion off" loading="lazy"><span class="image-label">AO OFF</span></div><div class="comparison-after"><img src="assets/media/${id}-ao-on.webp" width="1200" height="900" alt="The same ${title} view with Lambert shading and ambient occlusion on" loading="lazy"><span class="image-label">AO ON</span></div></div><div class="comparison-control" hidden><label for="${id}-compare">Reveal ambient occlusion: ${title}</label><input id="${id}-compare" type="range" min="0" max="100" value="50"><output for="${id}-compare">50%</output></div><figcaption>Same camera, structure and MatterViz Pastel element palette. Off uses normal shading; On uses Lambert + SSAO. <a href="tutorials-ao.html">Follow the tutorial →</a></figcaption></figure>`;

export default [
  {
    file: "gallery.html",
    title: "The gallery",
    section: "gallery",
    number: "04",
    description:
      "EigenVista renders of molecular orbitals, electron density, custom X-ray and clipping shaders, protein cartoons and large structures with ambient occlusion.",
    body: `<p class="lede page-lede">Orbitals, electron density and the molecular framework. Explore real EigenVista views, then use the linked guides to make your own.</p>
<section class="section-block"><div class="section-heading"><p class="eyebrow">01 / Fields and materials</p><h2>See the field.<br>Shape the view.</h2><p>The quantum and shader studies use the same 17-atom C₇H₁₀ bicyclic hydrocarbon. Compare its frontier orbitals, then see how a custom shader reveals different parts of its electron-density surface.</p></div>
<div class="filter-bar" data-gallery-filters hidden aria-label="Filter gallery"><button type="button" data-filter="all" aria-pressed="true">All views</button><button type="button" data-filter="quantum" aria-pressed="false">Quantum fields</button><button type="button" data-filter="shader" aria-pressed="false">Shaders</button><button type="button" data-filter="structure" aria-pressed="false">Molecules</button><span role="status" data-gallery-status></span></div>
<div class="gallery-grid">
${card("quantum-xray", "Reveal the framework", "shader", "An X-ray shader makes the density envelope translucent toward the viewer and bright at its rim. The carbon cage remains visible inside. Density isovalue: 0.04 electrons/bohr³; grid: 256³.", "surface-shaders.html")}
${card("quantum-clipped", "Open the surface", "shader", "A clipping shader exposes the molecular interior. This uses the same density mesh, isovalue and camera as the complete surface and X-ray views; the clipping boundary is a live control.", "surface-shaders.html")}
${card("quantum-lumo", "LUMO / MO 27", "quantum", "The lowest unoccupied listed orbital of the C₇H₁₀ example, rendered as signed isosurfaces at ±0.03 atomic units. Contrasting colors distinguish its lobes around the carbon framework.", "tutorials-orbitals.html")}
${card("quantum-orbital", "HOMO / MO 26", "quantum", "The highest occupied listed orbital of the same molecule, rendered at ±0.03 atomic units. Compare its shape with the neighboring LUMO while keeping the molecular framework in view.", "tutorials-orbitals.html")}
${card("quantum-volume", "Explore an orbital volume", "quantum", "MO 26 in volume preview, using a 256³ grid and Fine sampling. Accumulated color and opacity show the orbital field throughout its extent.", "reference-fields.html")}
${card("quantum-unclipped", "Start with the complete surface", "shader", "The complete density surface with the clipping preset’s bounds fully open, at 0.04 electrons/bohr³ on a 256³ grid. Compare this reference view with the matching X-ray and clipping studies.", "surface-shaders.html")}
${card("1aon-cartoon-chain", "Follow each chain", "structure", "Full 1AON as a protein cartoon, colored by chain. Trace the organization of the large complex and isolate individual chains for a closer look.", "reference-structures.html")}
${card("1aon-chain-secondary", "Read a single chain", "structure", "An isolated 1AON chain with deposited helices, sheets and connecting regions. Secondary-structure coloring separates the assigned regions.", "tutorials-ao.html")}
</div><p class="small">Select an image to open the full capture. <a href="surface-shaders.html">Try the shader presets</a> · <a href="assets/media/provenance.json">Capture settings</a> · <a href="about.html#credits">Data and palette credits</a></p></section>
<section class="section-block"><div class="section-heading"><p class="eyebrow">02 / Depth in large structures</p><h2>Look into the structure.</h2><p>Compare molecular ambient occlusion on two large structures. MatterViz Pastel softens the element colors while Lambert shading and SSAO emphasize contacts and cavities. Drag each divider to compare the two views.</p></div><div class="comparison-grid">${comparison("1aon", "1AON / GroEL–GroES", "58,870")}${comparison("4pj1", "4PJ1", "65,963")}</div></section>
<section class="closing-band"><h2>Make your own view.</h2><p>Start with the shader presets and examples, then bring your own structures and quantum-chemistry files.</p><div class="actions"><a class="button primary" href="surface-shaders.html">Explore surface shaders →</a><a class="button" href="tutorials.html">Choose a tutorial →</a><a class="button" href="install.html">Install EigenVista →</a></div></section>`,
  },
];
