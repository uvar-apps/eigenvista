// Validate the actual committed static payload, not just source templates.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { release } from "./release.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const site = path.join(root, "site"),
  base = "https://uvar-apps.github.io/eigenvista/";
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const files = [];
const walk = (directory, prefix = "") => {
  for (const name of fs.readdirSync(directory).sort()) {
    const full = path.join(directory, name),
      relative = prefix + name,
      stat = fs.lstatSync(full);
    assert(!stat.isSymbolicLink(), `No symlink in public site: ${relative}`);
    if (stat.isDirectory()) walk(full, relative + "/");
    else {
      assert(stat.isFile());
      files.push({
        path: relative,
        bytes: stat.size,
        sha256: hash(fs.readFileSync(full)),
      });
    }
  }
};
walk(site);
for (const file of files) {
  assert(
    !/(^|\/)(?:node_modules|tmp|target|\.git|\.env[^/]*)(\/|$)/.test(file.path),
    file.path,
  );
  assert(
    !/(?:chat-|AO_AND_NOAO|2026-11-11-code-review)/i.test(file.path),
    file.path,
  );
}
const html = new Map(
  files
    .filter((row) => row.path.endsWith(".html"))
    .map((row) => [
      row.path,
      fs.readFileSync(path.join(site, row.path), "utf8"),
    ]),
);
assert.equal(html.size, 15, "Complete website route inventory");
const ids = new Map(
  [...html].map(([name, text]) => {
    const all = [...text.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    assert.equal(new Set(all).size, all.length, `Unique IDs: ${name}`);
    return [name, new Set(all)];
  }),
);
const resolve = (from, target) => {
  const url = new URL(target.replaceAll("&amp;", "&"), base + from);
  if (
    url.origin !== new URL(base).origin ||
    !url.pathname.startsWith("/eigenvista/")
  )
    return null;
  let relative = decodeURIComponent(url.pathname.slice("/eigenvista/".length));
  if (!relative || relative.endsWith("/")) relative += "index.html";
  const full = path.resolve(site, relative);
  assert(full.startsWith(site + path.sep), target);
  assert(
    fs.existsSync(full) && fs.statSync(full).isFile(),
    `${from}: missing ${target}`,
  );
  if (url.hash && html.has(relative))
    assert(
      ids.get(relative).has(decodeURIComponent(url.hash.slice(1))),
      `${from}: missing fragment ${target}`,
    );
  return relative;
};
let localReferences = 0,
  images = 0;
for (const [name, text] of html) {
  assert(text.startsWith("<!doctype html>"), name);
  assert(text.includes('<html lang="en">'), name);
  assert.equal(
    [...text.matchAll(/<h1(?:\s|>)/g)].length,
    1,
    `One main heading: ${name}`,
  );
  assert(
    text.includes('aria-label="Main navigation"') && text.includes('id="main"'),
    name,
  );
  assert(
    text.includes('name="description"') && text.includes('name="viewport"'),
    name,
  );
  assert(
    !/\b(?:TODO|TBD|lorem ipsum|coming soon)\b/i.test(text),
    `No placeholder copy: ${name}`,
  );
  assert(!text.split("\n").some((line) => /[ \t]+$/.test(line)), name);
  for (const match of text.matchAll(/\b(?:href|src)="([^"]+)"/g))
    if (resolve(name, match[1])) localReferences++;
  for (const match of text.matchAll(/<img\b[^>]*>/g)) {
    assert(/\balt="[^"]*"/.test(match[0]), `Image alt text: ${name}`);
    assert(
      /\bwidth="\d+"/.test(match[0]) && /\bheight="\d+"/.test(match[0]),
      `Image dimensions: ${name}`,
    );
    images++;
  }
  for (const match of text.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const source = match[1].match(/src="([^"]+)"/)?.[1];
    assert(
      ["assets/site.js", "/eigenvista/assets/site.js"].includes(source) &&
        !match[2].trim(),
      "Only local website script: " + name,
    );
  }
}
// Sensitivity controls ensure bad local paths and bad fragments are rejected.
assert.throws(() => resolve("index.html", "absent-website-page.html"));
assert.throws(() =>
  resolve("index.html", "install.html#absent-website-fragment"),
);
const downloaded = JSON.parse(
  fs.readFileSync(path.join(site, "downloads/provenance.json")),
);
assert.equal(downloaded.files.length, 8);
for (const row of downloaded.files) {
  const bytes = fs.readFileSync(path.join(site, "downloads", row.file));
  assert.equal(bytes.length, row.bytes);
  assert.equal(hash(bytes), row.sha256);
  assert.deepEqual(bytes, fs.readFileSync(path.join(root, row.source)));
}
assert.deepEqual(
  fs.readFileSync(path.join(site, "assets/favicon.svg")),
  fs.readFileSync(path.join(root, "app/src-tauri/icons/source.svg")),
);
assert.deepEqual(
  fs.readFileSync(path.join(site, "LICENSE.txt")),
  fs.readFileSync(path.join(root, "LICENSE")),
);
const index = JSON.parse(fs.readFileSync(path.join(site, "search-index.json")));
assert.equal(index.length, html.size - 1);
for (const row of index) {
  assert(html.has(row.url));
  assert(row.text.length > 100);
  assert(row.title && row.description);
}
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(site, "release.json"))),
  release,
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "app/package.json"))).version,
  release.version,
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "app/src-tauri/tauri.conf.json")))
    .version,
  release.version,
);
const media = JSON.parse(
  fs.readFileSync(path.join(site, "assets/media/provenance.json")),
);
assert(media && typeof media === "object", "Actual image provenance exists");
assert.equal(media.application.version, release.version);
assert.equal(media.application.sourceRevision, release.source);
assert.deepEqual(media.errors, []);
assert.equal(media.images.length, 10);
for (const row of media.images) {
  assert(/^[a-z0-9-]+\.webp$/.test(row.file), row.file);
  const bytes = fs.readFileSync(path.join(site, "assets/media", row.file));
  assert.equal(bytes.length, row.bytes);
  assert.equal(hash(bytes), row.sha256);
  assert.equal(bytes.toString("ascii", 0, 4), "RIFF");
  assert.equal(bytes.toString("ascii", 8, 12), "WEBP");
  assert(
    Number.isInteger(row.width) &&
      row.width > 0 &&
      Number.isInteger(row.height) &&
      row.height > 0,
  );
}
const allowedInputs = new Set([
  "fixtures/cif/1AON.cif",
  "fixtures/large-structure/4PJ1.pdb",
  "fixtures/molden/water-rhf-ccpvdz.molden",
  "fixtures/molden/water-rhf-ccpvdz.json",
  "fixtures/cube/signed-affine.cube",
  "palettes/matterviz-pastel.json",
  "palettes/LICENSE-MatterViz.txt",
]);
assert.equal(media.inputs.length, allowedInputs.size);
for (const row of media.inputs) {
  assert(allowedInputs.has(row.file), "Only named public capture inputs");
  const bytes = fs.readFileSync(path.join(root, row.file));
  assert.equal(bytes.length, row.bytes);
  assert.equal(hash(bytes), row.sha256);
}
assert.equal(media.comparisons.length, 2);
for (const pair of media.comparisons) {
  assert.equal(pair.backgroundDelta, 0);
  assert.equal(pair.silhouetteMismatch, 0);
  assert.equal(pair.exactOffRestoration, true);
  assert(pair.changedForegroundFraction > 0.1);
}
const mediaFiles = files.filter(
  (row) => row.path.startsWith("assets/media/") && row.path.endsWith(".webp"),
);
assert.equal(mediaFiles.length, 10, "All planned genuine captures");
const expectedMedia = [
  "1aon-ao-off",
  "1aon-ao-on",
  "4pj1-ao-off",
  "4pj1-ao-on",
  "1aon-cartoon-chain",
  "1aon-chain-secondary",
  "water-orbital-mesh",
  "water-orbital-volume",
  "cube-raycast",
  "app-overview",
];
for (const name of expectedMedia)
  assert(
    mediaFiles.some((row) => row.path === `assets/media/${name}.webp`),
    name,
  );
const bytes = files.reduce((sum, row) => sum + row.bytes, 0);
assert(bytes < 20 * 1024 * 1024, `Static payload remains bounded: ${bytes}`);
for (const name of [
  "site/assets/site.js",
  "tools/site/build.mjs",
  "tools/site/serve.mjs",
])
  execFileSync(process.execPath, ["--check", path.join(root, name)]);
// Regenerate into owned ignored storage, then compare every generated byte.
fs.mkdirSync(path.join(root, "tmp"), { recursive: true });
const generated = fs.mkdtempSync(path.join(root, "tmp/site-generation-"));
execFileSync(
  process.execPath,
  [path.join(root, "tools/site/build.mjs"), generated],
  { cwd: root },
);
const compareGenerated = (directory, prefix = "") => {
  for (const name of fs.readdirSync(directory)) {
    const full = path.join(directory, name),
      relative = prefix + name;
    if (fs.statSync(full).isDirectory()) compareGenerated(full, relative + "/");
    else
      assert.deepEqual(
        fs.readFileSync(full),
        fs.readFileSync(path.join(site, relative)),
        `Stale generated file: ${relative}`,
      );
  }
};
compareGenerated(generated);
console.log(
  `SITE_STATIC_CHECK_PASS ${html.size} pages; ${localReferences} local references; ${images} image uses; ${downloaded.files.length} exact downloads; ${bytes} bytes`,
);
