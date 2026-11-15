const card = (file, title, category, description, link) =>
  `<article class="gallery-card" data-gallery-item data-category="${category}"><a class="gallery-image" href="assets/media/${file}.webp"><img src="assets/media/${file}.webp" width="1200" height="900" alt="${description}" loading="lazy"></a><div><p class="eyebrow">${category === "quantum" ? "QUANTUM FIELD" : "MOLECULAR STRUCTURE"}</p><h2>${title}</h2><p>${description}</p><a href="${link}">Make this view →</a></div></article>`;

const comparison = (id, title, count) =>
  `<figure class="comparison" data-comparison><div class="plate-label"><span>${title}</span><span>${count} ATOMS</span></div><div class="comparison-images"><div class="comparison-before"><img src="assets/media/${id}-ao-off.webp" width="1200" height="900" alt="${title} using the Pastel palette and normal molecular shading with ambient occlusion off" loading="lazy"><span class="image-label">AO OFF</span></div><div class="comparison-after"><img src="assets/media/${id}-ao-on.webp" width="1200" height="900" alt="The same ${title} view with Lambert shading and ambient occlusion on" loading="lazy"><span class="image-label">AO ON</span></div></div><div class="comparison-control" hidden><label for="${id}-compare">Reveal ambient occlusion: ${title}</label><input id="${id}-compare" type="range" min="0" max="100" value="50"><output for="${id}-compare">50%</output></div><figcaption>Same camera, structure and MatterViz Pastel element palette. Off uses normal shading; On uses Lambert + SSAO. <a href="tutorials-ao.html">Follow the tutorial →</a></figcaption></figure>`;

export default [
  {
    file: "gallery.html",
    title: "The gallery",
    section: "gallery",
    number: "04",
    description:
      "Real EigenVista views: large molecules with Pastel ambient occlusion, protein cartoons and molecular orbital and cube rendering.",
    body: `<p class="lede page-lede">Structures, folds and fields. Every image here is a real application capture, with source data and settings recorded.</p>
<section class="section-block"><div class="section-heading"><p class="eyebrow">01 / Depth studies</p><h2>Look into the structure.</h2><p>Compare molecular ambient occlusion on two large structures. The Pastel palette softens element colors while AO emphasizes contacts and cavities. These are visual depth cues, not electron-density maps.</p></div><div class="comparison-grid">${comparison("1aon", "1AON / GroEL–GroES", "58,870")}${comparison("4pj1", "4PJ1", "65,963")}</div></section>
<section class="section-block"><div class="section-heading"><p class="eyebrow">02 / Representation studies</p><h2>One dataset. Several readings.</h2></div>
<div class="filter-bar" data-gallery-filters hidden aria-label="Filter gallery"><button type="button" data-filter="all" aria-pressed="true">All views</button><button type="button" data-filter="structure" aria-pressed="false">Molecules</button><button type="button" data-filter="quantum" aria-pressed="false">Quantum fields</button><span role="status" data-gallery-status></span></div>
<div class="gallery-grid">
${card("1aon-cartoon-chain", "Follow each chain", "structure", "Full 1AON as a protein cartoon, colored by chain. The atomic source remains in the document.", "reference-structures.html")}
${card("1aon-chain-secondary", "Read a single chain", "structure", "An isolated 1AON chain showing deposited helices, sheets and connecting regions. Missing assignments remain unknown.", "tutorials-ao.html")}
${card("water-orbital-mesh", "Keep the orbital shape", "quantum", "An occupied orbital from the calculated water Molden example, displayed as a signed isosurface mesh. Opposite colors indicate the sign of amplitude.", "tutorials-orbitals.html")}
${card("water-orbital-volume", "Look through the field", "quantum", "The same supplied water orbital in volume preview. Translucent accumulation reveals its extent without first generating a mesh.", "reference-fields.html")}
${card("cube-raycast", "Read a sampled grid", "quantum", "A sampled raycast of the synthetic signed-affine cube example. This mathematical field tests skew-grid and signed rendering; it is not a molecular calculation.", "tutorials-cube.html")}
</div><p class="small">Open an image for the full capture. <a href="assets/media/provenance.json">Capture settings and source hashes</a> · <a href="about.html#credits">Data and palette credits</a></p></section>
<section class="closing-band"><h2>Make your own view.</h2><p>Use the supplied examples, then bring your own supported structures and quantum-chemistry files.</p><div class="actions"><a class="button primary" href="tutorials.html">Choose a tutorial →</a><a class="button" href="install.html">Install EigenVista →</a></div></section>`,
  },
];
