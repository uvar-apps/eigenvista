export const surfaceAoComparison = (id) => `<figure class="comparison surface-ao-comparison" data-comparison>
  <div class="comparison-images">
    <div class="comparison-before"><img src="assets/surface-ao/1aon-ses-off.webp" width="826" height="682" alt="The 1AON solvent-excluded surface with built-in diffuse shading" loading="lazy"><span class="image-label">AO OFF</span></div>
    <div class="comparison-after"><img src="assets/surface-ao/1aon-ses-auto.webp" width="826" height="682" alt="The same 1AON surface with darker clefts and cavities under matte ambient occlusion" loading="lazy"><span class="image-label">AO ON</span></div>
  </div>
  <div class="comparison-control" hidden><label for="${id}">Reveal molecular surface AO</label><input id="${id}" type="range" min="0" max="100" value="50"><output for="${id}">50%</output></div>
  <figcaption>Full 1AON SES, 4.18 million triangles, from the same camera. Alvarez radii, 1.4 Å probe, 0.5 Å grid spacing and 24 Å automatic AO radius. <a href="downloads/1AON.cif" download>Download 1AON</a>.</figcaption>
</figure>`;
