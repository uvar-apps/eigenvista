import { release } from "../release.mjs";

export default [
  {
    file: "about.html",
    title: "About EigenVista",
    section: "about",
    number: "05",
    description:
      "A local molecular and quantum-chemistry viewer: design, limitations, data credits and project links.",
    body: `<div class="article-layout"><aside class="toc" aria-label="On this page"><a href="#purpose">The purpose</a><a href="#local">Local by design</a><a href="#limits">Current boundaries</a><a href="#credits">Credits</a><a href="#project">The project</a></aside><article class="prose">
<h2 id="purpose">A viewer for molecular data</h2><p class="lede">EigenVista brings atomic structures, imported orbitals, density data and sampled scalar fields into one interactive scene.</p><p>It is the standalone successor to the Rust Molekel preview. It keeps the existing icon and reads older .molekel preview documents, while new documents use .eigenvista. The aim is to help you inspect supplied scientific data and prepare useful views of it.</p>
<h2 id="local">Local by design</h2><p>The desktop application reads and processes local files on your computer. Its scientific core is written in Rust; the interface uses React and Three.js/WebGL2, inside a Tauri desktop shell. Scientific field work runs in a background WebAssembly worker, keeping progress and cancellation available.</p><p>There is no calculation server or account required for local molecular-file workflows. This website provides documentation, examples and downloads; it does not upload or analyze your calculation files.</p><p>A native document can hold structure, supplied quantum data, sampled fields and generated meshes together. Display choices such as the background, palette and AO remain session preferences. See <a href="reference-files.html">the file reference</a> for what is saved.</p>
<h2 id="limits">Know what a view means</h2><ul><li>EigenVista does not calculate a wavefunction from atom positions. PDB/XYZ coordinates alone do not supply orbitals or density.</li><li>Imported fields retain their declared meaning. Unknown cube units or scalar meaning are not guessed.</li><li>Protein secondary structure uses deposited annotations; it is not a new DSSP calculation.</li><li>AO is an approximate screen-space depth cue, not a scientific scalar field.</li><li>Display bonds are inferred or taken from supported declarations. They do not establish bond order, crystallographic symmetry or a complete chemical interpretation.</li></ul><div class="notice">Version ${release.version} is an experimental development preview. The downloadable package targets Apple Silicon Macs; Linux, Windows, Intel Mac and the full deployment-OS range are not qualified distributions. Preserve original calculation files and inspect import reports.</div>
<h2 id="credits">Images, examples and palettes</h2><p>The molecular images were captured in EigenVista from the repository's public test inputs. The large-structure studies use <a href="https://www.rcsb.org/structure/1AON">PDB 1AON</a> and <a href="https://www.rcsb.org/structure/4PJ1">PDB 4PJ1</a>. See each RCSB entry for the deposited structure and its original scientific citation.</p><p>The water Molden example is an independently calculated RHF/cc-pVDZ input. Water PDB/XYZ coordinates and the signed-affine cube are demonstration fixtures; the cube is a mathematical signed field, not a quantum calculation. <a href="downloads/README.txt">Example sources and notices</a> and the <a href="assets/media/provenance.json">capture record</a> preserve provenance and settings.</p><p>MatterViz Muted and Pastel are adaptations of <a href="https://github.com/janosh/matterviz/tree/fae7a3e7fddf26f9625391ea76f28c7ebd261de9/src/lib/colors">Janosh Riebesell's MatterViz element colors</a>. Original RGB values for elements 1–109 are retained; remaining elements use EigenVista defaults. The <a href="downloads/LICENSE-MatterViz.txt">MIT notice</a> accompanies both palettes. <a href="downloads/matterviz-pastel.json" download>Download Pastel</a> for the recommended AO workflow.</p><p>The website follows the brutalist laboratory-manual style of the related <a href="https://uvar-apps.github.io/sesmesh/">Sesmesh project</a>. The application icon is unchanged.</p>
<h2 id="project">Open project, practical feedback</h2><p>EigenVista is available under <a href="https://github.com/uvar-apps/eigenvista/blob/main/LICENSE">GPL-2.0-or-later</a>. Source, release history and issue tracking are on <a href="https://github.com/uvar-apps/eigenvista">GitHub</a>. Keep license notices and sources with redistributed tester packages.</p><p>When reporting a problem, include the app version, platform, input format and exact steps. Share only files you have permission to publish. <a href="https://github.com/uvar-apps/eigenvista/issues">Open an issue ↗</a></p>
</article></div>`,
  },
  {
    file: "404.html",
    title: "This view is missing",
    section: "home",
    number: "404",
    description:
      "Find your way back to EigenVista's installation guide, manual, tutorials and gallery.",
    body: `<section class="not-found"><p class="lede">The page may have moved, or the address may be incomplete.</p><div class="actions"><a class="button primary" href="./">Back to EigenVista →</a><a class="button" href="reference.html">Open the manual →</a><a class="button" href="tutorials.html">Browse tutorials →</a></div></section>`,
  },
];
