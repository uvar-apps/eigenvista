import { release } from "../release.mjs";

const lesson = "tutorials-electrostatic-potential.html";
const input = "salicylic-acid-rhf.molden";
const shader = "surface-phong-vertex-color";
const params = "Salicylic-Phong.params";
const figure = "assets/media/salicylic-acid.webp";
const inputUrl = `https://uvar-apps.github.io/eigenvista/downloads/${input}`;

export default [
  {
    file: lesson,
    title: "Map electrostatic potential",
    searchTitle: "Salicylic acid electrostatic potential in EigenVista",
    description: "Make the salicylic acid Gallery figure from an all-electron density surface, electrostatic potential colors and translucent Phong shading. Follow the GUI steps or use an AI connector.",
    section: "tutorials",
    number: "04.9",
    body: `
<p class="lede page-lede">Make a translucent, Phong-shaded density surface for salicylic acid. The color scale shows the molecular electrostatic potential, and the bonds remain visible beneath the surface.</p>
<figure><a href="${figure}"><img src="${figure}" alt="Salicylic acid inside a glossy translucent density surface, with cyan and yellow lobes and a red-to-blue electrostatic potential scale"></a><figcaption>Total density at 0.0248 electrons/bohr³. Electrostatic potential is mapped from −0.130 to +0.130 hartree/e. The surface uses the vertex-colored Phong shader at 88% opacity.</figcaption></figure>

<h2 id="get-ready">Get the files</h2>
<p>Use <a href="install.html">EigenVista ${release.version}</a> on Apple Silicon Mac or CachyOS x86_64. Download <a href="downloads/${input}" download="${input}">${input}</a>. A copy is also included with the packaged AI connector’s examples. The file contains a 16-atom, all-electron RHF/6-31G(d) calculation made with PySCF. See the <a href="downloads/README-quantum-example.txt">calculation and geometry sources</a>.</p>
<p>The GUI uses these three files from your package’s <strong>Shaders</strong> folder. You can also download them individually.</p>
<ul><li><a href="downloads/shaders/${shader}.vert" download>Vertex shader</a></li><li><a href="downloads/shaders/${shader}.frag" download>Fragment shader</a></li><li><a href="downloads/shaders/${params}" download>88% opacity preset</a></li></ul>

<h2 id="gui">Make the figure in the GUI</h2>
<ol>
<li>Choose <strong>Open</strong> and load the Molden file. Under <strong>Molecule → Molecular data</strong>, choose <strong>Liquorice</strong> for the representation.</li>
<li>In <strong>Fields → Quantum fields</strong>, select the total electron density. Open <strong>Field rendering</strong> and set <strong>Mode</strong> to <strong>Isosurface mesh</strong>. Enter <strong>0.0248</strong> for <strong>Isovalue</strong>.</li>
<li>Enter <strong>112</strong> in <strong>Custom grid resolution</strong> and press Enter. Check <strong>Map electrostatic potential (all-electron density)</strong>. Click <strong>Generate surfaces</strong> and wait for mapping to finish.</li>
<li>Open <strong>Surfaces → Saved surfaces</strong> and find the new density mesh. Keep <strong>Show electrostatic potential</strong> enabled. Set <strong>Color range ± (hartree/e)</strong> to <strong>0.130</strong> and press Enter.</li>
<li>Open <strong>Appearance → Surface shader</strong>. Load the vertex, fragment and parameter files above. In <strong>Apply to</strong>, choose the new density mesh. Leave <strong>Shader transparency</strong> checked and click <strong>Apply shader</strong>. The opacity uniform should read <strong>0.88</strong>.</li>
<li>Use the viewport’s <strong>Background color</strong> control to set black (<code>#000000</code>). Drag to bring the ring face-on, with the oxygen-bearing lobes to the right. Hide Tools to widen the view. Zoom so the molecule fills the frame while leaving space below it for the scale.</li>
<li>Click <strong>Export image</strong> and save a PNG. The numeric potential scale is included. Use the toolbar’s <strong>Save</strong> separately to keep the mesh and its potential samples in an EigenVista document. Apply the shader again after restarting the app.</li>
</ol>
<p><strong>Check your result:</strong> there is one saved surface with 21,064 triangles. The scale reads −0.130 to +0.130 hartree/e. The foreground yellow lobe stays in front where it overlaps the blue lobe, and the bonds show through at 88% opacity. Export dimensions and framing follow your viewport.</p>

<h2 id="ai">Make the figure with a connected agent</h2>
<p>Complete <a href="ai-install.html">AI connector setup</a> in Codex, Claude Code, Pi, OpenCode or another local agent. Open your connected EigenVista window. Give your agent the following prompts in order.</p>
<ol>
<li><pre class="wrap-code"><code>Use my connected EigenVista window. Keep any unsaved work before opening another file. Open ${input} from my examples folder, or download it from ${inputUrl} into my approved input folder. Confirm that the file has 16 atoms and a total electron-density field.</code></pre></li>
<li><pre class="wrap-code"><code>Generate one total electron-density isosurface for this molecule at 0.0248 electrons per cubic bohr, sampling 112 points along each grid axis. Map the all-electron molecular electrostatic potential onto it. Wait for the mapping to finish, then set the color scale from −0.130 to +0.130 hartree per elementary charge. Tell me how many triangles the mesh has.</code></pre></li>
<li><pre class="wrap-code"><code>Apply the bundled vertex-colored Phong shader to the mapped density surface. Keep shader transparency on and set the shader opacity to 88%. Show the molecule in Liquorice on a black background. For the Gallery camera, place the camera at (1.1, −6.0, 21.5) bohr, aim at (0, −0.90, 0.24) bohr, and use an up direction of (sin(0.27), cos(0.27), 0), with the angle in radians. Save the current view, including its labeled potential scale, as salicylic-acid-phong.png in my approved output folder. Choose a fresh filename if it exists. Show me the image and its location.</code></pre></li>
</ol>
<p>For the Gallery proportions, aim for a viewport about 1220 pixels wide by 852 pixels high and hide the Tools pane before export. The camera values reproduce the orientation. Pixel dimensions and framing depend on the window size.</p>

<h2 id="read-the-colors">Read the shape and colors</h2>
<p>The density isovalue sets the shape of the shell. The colors show the electrostatic potential experienced by a positive test charge at that shell: warmer colors indicate lower potential and cooler colors indicate higher potential. Green marks the center of the symmetric scale. Adjusting the range changes the display and keeps the computed field values. The Phong highlights help show curvature, and opacity reveals the framework underneath.</p>
`,
  },
];
