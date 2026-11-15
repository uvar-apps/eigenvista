// Render the repository's social preview from a real EigenVista density image.
// Run from the repository root after installing app/ dependencies.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
assert.equal(process.cwd(), root, "Run from the EigenVista repository root");
const scratch = path.join(root, "tmp/2026-11-15-visibility");
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
.copy { position:absolute; inset:0 auto 0 0; width:628px; padding:38px 40px; border-right:4px solid #151613; z-index:2; background:#ecebe4; }
.identity { display:flex; align-items:center; gap:16px; font:600 15px Menlo,monospace; letter-spacing:1px; }
.identity img { width:58px; height:58px; }
h1 { margin:42px 0 28px; font-size:91px; font-weight:900; letter-spacing:-5px; line-height:1; }
.description { margin:0; font-size:37px; font-weight:600; line-height:1.17; letter-spacing:-1px; }
.features { display:inline-block; margin-top:33px; padding:10px 12px; background:#f5d66f; border:3px solid #151613; font:700 16px Menlo,monospace; }
.address { position:absolute; left:40px; bottom:33px; margin:0; padding-top:16px; border-top:3px solid #151613; width:544px; font:17px Menlo,monospace; }
.render { position:absolute; inset:0 0 0 628px; overflow:hidden; background:#17232d; }
/* Crop empty scene margins, never stretch the scientific rendering. */
.render img { position:absolute; width:900px; height:auto; max-width:none; right:-140px; top:-43px; }
.caption { position:absolute; left:24px; right:24px; bottom:25px; margin:0; color:#ecebe4; font:13px Menlo,monospace; letter-spacing:1px; }
</style>
<main>
  <section class="copy" aria-label="EigenVista">
    <div class="identity"><img alt="EigenVista logo" src="${asset("site/assets/favicon.svg", "image/svg+xml")}"><span>OPEN SOURCE<br>MOLECULAR GRAPHICS</span></div>
    <h1>EigenVista</h1>
    <p class="description">Molecular &amp;<br>quantum chemistry<br>visualization.</p>
    <p class="features">ORBITALS / DENSITY / SHADERS</p>
    <p class="address">uvar-apps.github.io/eigenvista</p>
  </section>
  <section class="render" aria-label="Actual electron density rendering">
    <img alt="Bicyclic hydrocarbon electron density with the X-ray surface shader" src="${asset("site/assets/media/quantum-xray.webp", "image/webp")}">
    <p class="caption">ELECTRON DENSITY · X-RAY SHADER</p>
  </section>
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
console.log(JSON.stringify({
  file: path.relative(root, output),
  width: 1280,
  height: 640,
  bytes: bytes.length,
  sha256: createHash("sha256").update(bytes).digest("hex"),
}, null, 2));
