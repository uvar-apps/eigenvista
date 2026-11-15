// Render the social preview from real density and molecular AO captures.
// Run from the repository root after installing app/ dependencies.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assert.equal(process.cwd(), root, "Run from the EigenVista repository root");
const scratch = path.join(root, "tmp/2026-11-15-social-combined");
fs.mkdirSync(scratch, { recursive: true });
for (const name of ["TMPDIR", "TMP", "TEMP"])
  process.env[name] = path.join(root, "tmp");
const asset = (filename, type) =>
  `data:${type};base64,${fs.readFileSync(path.join(root, filename)).toString("base64")}`;
const output = path.join(root, "site/assets/social/eigenvista-social.png");
const html = `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>EigenVista social preview</title>
<style>
* { box-sizing: border-box; }
html, body { width:1280px; height:640px; margin:0; overflow:hidden; }
body { background:#ecebe4; color:#151613; font-family:"Helvetica Neue",Arial,sans-serif; }
.identity { position:absolute; inset:0 0 auto; height:144px; border-bottom:4px solid #151613; }
.identity img { position:absolute; left:32px; top:34px; width:68px; height:68px; }
h1 { position:absolute; left:121px; top:24px; margin:0; font-size:76px; font-weight:900; letter-spacing:-4px; line-height:1; }
.features { position:absolute; left:125px; top:108px; margin:0; font:700 14px Menlo,monospace; letter-spacing:0.6px; }
.description { position:absolute; left:699px; top:36px; width:540px; margin:0; font-size:30px; font-weight:600; line-height:1.14; letter-spacing:-0.7px; }
.renderings { position:absolute; left:0; right:0; top:144px; height:448px; display:grid; grid-template-columns:1fr 1fr; }
.panel { position:relative; overflow:hidden; }
.density { color:#ecebe4; background:#17232d; border-right:4px solid #151613; }
.ao { background:#ecebe4; }
.image { position:absolute; inset:0 0 48px; overflow:hidden; }
/* Crop blank scene margins only; both complete molecular shapes remain visible. */
.image img { position:absolute; height:auto; max-width:none; }
.density img { width:670px; left:-16px; top:-76px; }
.ao img { width:716px; left:-28px; top:-75px; }
.caption { position:absolute; inset:auto 0 0; height:48px; margin:0; padding:15px 24px; font:700 17px Menlo,monospace; }
.density .caption { background:#17232d; }
.ao .caption { background:#f5d66f; border-top:3px solid #151613; padding-top:12px; }
.footer { position:absolute; inset:auto 0 0; height:48px; border-top:4px solid #151613; display:flex; align-items:center; justify-content:space-between; padding:0 28px; font:16px Menlo,monospace; }
.footer span { font-size:13px; letter-spacing:0.4px; }
</style>
<main>
  <header class="identity">
    <img alt="EigenVista logo" src="${asset("site/assets/favicon.svg", "image/svg+xml")}">
    <h1>EigenVista</h1>
    <p class="features">ORBITALS / SURFACE SHADERS / MOLECULES</p>
    <p class="description">Molecular &amp; quantum<br>chemistry visualization.</p>
  </header>
  <section class="renderings" aria-label="Actual EigenVista renderings">
    <div class="panel density">
      <div class="image"><img alt="Bicyclic hydrocarbon electron density with the X-ray surface shader" src="${asset("site/assets/media/quantum-xray.webp", "image/webp")}"></div>
      <p class="caption">ELECTRON DENSITY / X-RAY SHADER</p>
    </div>
    <div class="panel ao">
      <div class="image"><img alt="1AON molecular complex with Lambert shading, ambient occlusion and MatterViz Pastel atom colors" src="${asset("site/assets/media/1aon-ao-on.webp", "image/webp")}"></div>
      <p class="caption">1AON / AMBIENT OCCLUSION</p>
    </div>
  </section>
  <footer class="footer">uvar-apps.github.io/eigenvista<span>OPEN SOURCE / ACTUAL APP RENDERINGS</span></footer>
</main></html>`;
fs.writeFileSync(path.join(scratch, "social-card.html"), html);
fs.mkdirSync(path.dirname(output), { recursive: true });
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 640 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html);
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((image) => image.decode()));
  });
  await page.screenshot({ path: output, type: "png" });
} finally {
  await browser.close();
}
const bytes = fs.readFileSync(output);
assert.equal(bytes.readUInt32BE(16), 1280);
assert.equal(bytes.readUInt32BE(20), 640);
assert.ok(bytes.length < 1_000_000, "GitHub social preview must be under 1 MB");
const provenanceFile = path.join(root, "site/assets/social/provenance.json");
const provenance = JSON.parse(fs.readFileSync(provenanceFile));
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
provenance.socialImage = {
  width:1280, height:640,
  sourceImages:["quantum-xray.webp", "1aon-ao-on.webp"].map(file => ({file:"assets/media/"+file,sha256:hash(path.join(root,"site/assets/media",file))})),
  logo:"assets/favicon.svg", logoSha256:hash(path.join(root,"site/assets/favicon.svg")),
  composition:"Two labeled actual app views, with blank scene margins cropped and natural proportions preserved. 1AON uses Lambert + SSAO and MatterViz Pastel; the panels show different molecules at independent display scales."
};
Object.assign(provenance.files.find(row=>row.file==="eigenvista-social.png"), {bytes:bytes.length,sha256:hash(output)});
fs.writeFileSync(provenanceFile, JSON.stringify(provenance,null,2)+"\n");
console.log(JSON.stringify({
  file: path.relative(root, output),
  width: 1280,
  height: 640,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
}, null, 2));
