// Validate the actual committed static payload, not just source templates.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { release } from "./release.mjs";
import { application } from "./application.mjs";
import { verification } from "./search-console.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const site = path.join(root, "site"),
  base = "https://uvar-apps.github.io/eigenvista/";
// Captures keep the app identity they were actually made with as downloads advance.
const capturedRelease = Object.freeze({
  version: "0.7.2",
  source: "5f336b6a2d53dcb0db67dd5ed95956134a5a1e18",
});
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
assert.equal(html.size, 27, "Complete website route inventory");
for (const page of [
  "ai.html", "ai-install.html", "ai-guide.html",
  "ai-tutorial-orbitals.html", "ai-tutorial-density.html",
  "ai-tutorial-ao.html", "ai-tutorial-representations.html",
]) assert(html.has(page), `Complete AI guide and tutorial route: ${page}`);
// User requests name outcomes; connector operations belong in the agent's technical guide.
const controlSource = fs.readFileSync(path.join(root, "app/src/control.ts"), "utf8");
const inspectionSource = fs.readFileSync(path.join(root, "app/src/inspectionSchemas.ts"), "utf8");
const baseMethods = [...controlSource.matchAll(/^  "([a-z_]+\.[a-z_]+)": definition/gm)].map((match) => match[1]);
const inspectionMethods = [...inspectionSource.matchAll(/^  "([A-Za-z_]+\.[a-z_]+)":\s*entry\(/gm)].map((match) => match[1]);
assert(baseMethods.includes("app.state") && baseMethods.includes("job.cancel"), "Discover real base controller operations");
assert(inspectionMethods.includes("molecularSurfaces.warnings") && inspectionMethods.includes("analysis.samples"), "Discover the additive inspection contract");
assert(controlSource.includes("...INSPECTION_METHODS"), "Inspection schemas are actually part of the shared controller");
const controlMethods = [...baseMethods, ...inspectionMethods];
assert.equal(new Set(controlMethods).size, controlMethods.length, "No duplicate discovered operations");
const assertUserLanguage = (name, content) => {
  for (const method of controlMethods) assert(!content.includes(method), `Natural-language user page must not require ${method}: ${name}`);
  assert(!/Do this part yourself|read app\.state|INPUT_ROOT|OUTPUT_ROOT|expectedRevision|fieldIds|shader\.set_uniforms/.test(name.startsWith("ai-tutorial-") ? content : ""), `No API/connection tasks in visualization lesson: ${name}`);
};
assert.throws(() => assertUserLanguage("ai-tutorial-ao.html", "read app.state and structure.list"));
assert.throws(() => assertUserLanguage("ai-tutorial-ao.html", "Do this part yourself"));
for (const name of ["ai.html", "ai-install.html", "ai-guide.html", "ai-tutorial-orbitals.html", "ai-tutorial-density.html", "ai-tutorial-ao.html", "ai-tutorial-representations.html"]) {
  assertUserLanguage(name, html.get(name));
  assert(!/\b[A]GENTS\.md\b|EIGENVISTA_REPO|cargo build|git clone|rustup|wasm-bindgen|\/target\/debug|tools\/site\/examples/.test(html.get(name)), `Installed-app user setup must not depend on development files/tools: ${name}`);
}
const inspectionPages = ["reference-inspection.html", "tutorials-geometry.html", "tutorials-molecular-surfaces.html", "tutorials-quantitative-fields.html"];
for (const name of inspectionPages) {
  assert(html.has(name), `Complete inspection manual/tutorial route: ${name}`);
  const content = html.get(name);
  assertUserLanguage(name, content);
  assert(content.includes("data-unreleased-inspection") && content.includes(`EigenVista ${application.version}`) && content.includes(`not included in the published ${release.version} download`), `New features must not masquerade as published: ${name}`);
  assert(!content.includes("test build still displays"), `Test-build identity must match source metadata: ${name}`);
  assert(!/\b[A]GENTS\.md\b|expectedRevision|fieldIds|read app\.state/.test(content), `No internal setup/API chores: ${name}`);
}
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
  assert(!text.includes("test build still displays"), `No stale test-build identity: ${name}`);
  assert(text.includes(`<small data-application-version>${application.version}${application.status === "unreleased" ? " test build" : ""}</small>`), `Current application identity: ${name}`);
  assert(text.includes(`<span data-application-status>v${application.version} / ${application.status === "unreleased" ? "UNRELEASED TEST BUILD" : "DEVELOPMENT PREVIEW"}</span>`), `Current application status: ${name}`);
  if (application.status === "unreleased")
    assert(!new RegExp(`releases/(?:tag|download)/v${application.version.replaceAll(".", "\\.")}(?:["/])`).test(text), `No unpublished release/download URL: ${name}`);
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
  for (const match of text.matchAll(/\b(?:href|src|poster)="([^"]+)"/g))
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
assert(html.get("index.html").includes(`<meta name="google-site-verification" content="${verification}">`));
assert(html.get("404.html").includes('<meta name="robots" content="noindex">'));
const preview = fs.readFileSync(path.join(site, "assets/social/eigenvista-social.png"));
assert.equal(preview.readUInt32BE(16), 1280);
assert.equal(preview.readUInt32BE(20), 640);
assert(preview.length < 1_000_000, "GitHub social image under 1 MB");
for (const [name, text] of html) {
  assert(text.includes('property="og:image:width" content="1280"'), name);
  assert(text.includes('property="og:image:height" content="640"'), name);
  assert(text.includes('name="twitter:image:alt"'), name);
  assert(text.includes(`eigenvista-social.png?v=${hash(preview).slice(0,12)}`), name);
}
const discovery = JSON.parse(fs.readFileSync(path.join(site, "assets/social/provenance.json")));
assert.equal(discovery.applicationVersion, capturedRelease.version);
assert.equal(discovery.applicationSource, capturedRelease.source);
assert.equal(discovery.durationSeconds, 30);
assert.deepEqual(discovery.socialImage.sourceImages.map(row => row.file), [
  "assets/media/quantum-xray.webp", "assets/media/1aon-ao-on.webp",
]);
for (const row of discovery.socialImage.sourceImages)
  assert.equal(hash(fs.readFileSync(path.join(site, row.file))), row.sha256);
assert.equal(hash(fs.readFileSync(path.join(site, discovery.socialImage.logo))), discovery.socialImage.logoSha256);
for (const row of discovery.files) {
  assert(/^[a-z0-9-]+\.(?:png|webp|mp4|vtt)$/.test(row.file));
  const content = fs.readFileSync(path.join(site, "assets/social", row.file));
  assert.equal(content.length, row.bytes);
  assert.equal(hash(content), row.sha256);
}
assert.equal(discovery.files.length, 4);
const narration = JSON.parse(fs.readFileSync(path.join(root, "tools/site/narration.json")));
assert.equal(discovery.narration.script, "tools/site/narration.json");
assert.equal(discovery.narration.scriptSha256, hash(fs.readFileSync(path.join(root, discovery.narration.script))));
assert.equal(narration.audio.file, "tools/site/media/eigenvista-narration.m4a");
assert.equal(narration.audio.sha256, hash(fs.readFileSync(path.join(root, narration.audio.file))));
assert.deepEqual(discovery.narration.audio, narration.audio);
assert.equal(narration.voice.synthetic, true);
assert.equal(narration.voice.gender, "female");
const movie = fs.readFileSync(path.join(site, "assets/social/eigenvista-shaders.mp4"));
assert.equal(movie.toString("ascii",4,8), "ftyp");
assert(movie.length < 5 * 1024 * 1024, "Narrated on-demand demo stays below 5 MiB");
assert(fs.readFileSync(path.join(site,"assets/social/eigenvista-shaders.vtt"),"utf8").startsWith("WEBVTT\n"));
// Sensitivity controls ensure bad local paths and bad fragments are rejected.
assert.throws(() => resolve("index.html", "absent-website-page.html"));
assert.throws(() =>
  resolve("index.html", "install.html#absent-website-fragment"),
);
const downloaded = JSON.parse(
  fs.readFileSync(path.join(site, "downloads/provenance.json")),
);
assert.equal(downloaded.files.length, 22);
for (const filename of ["eigenvista-control/SKILL.md", "eigenvista-control/reference.md", "eigenvista-control/README.md"])
  assert(downloaded.files.some((row) => row.file === filename), `Portable binary connector instructions: ${filename}`);
for (const row of downloaded.files) {
  const bytes = fs.readFileSync(path.join(site, "downloads", row.file));
  assert.equal(bytes.length, row.bytes);
  assert.equal(hash(bytes), row.sha256);
  assert.deepEqual(bytes, fs.readFileSync(path.join(root, row.source)));
}
const portable = path.join(site, "downloads/eigenvista-control");
const skill = fs.readFileSync(path.join(portable, "SKILL.md"), "utf8");
assert(skill.includes("[reference.md](reference.md)"), "Portable skill carries its local technical reference");
for (const name of ["SKILL.md", "reference.md", "README.md"]) {
  const text = fs.readFileSync(path.join(portable, name), "utf8");
  assert(!/\b[A]GENTS\.md\b|EIGENVISTA_REPO|cargo build|git clone|rustup|wasm-bindgen|target\/debug/.test(text), `Portable instructions need no development checkout: ${name}`);
  for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    if (/^[a-z]+:/i.test(match[1]) || match[1].startsWith("#")) continue;
    const target = path.resolve(portable, match[1].split("#")[0]);
    assert(target.startsWith(portable + path.sep) && fs.existsSync(target), `Skill folder must carry its dependencies: ${match[1]}`);
  }
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
assert.deepEqual(
  JSON.parse(fs.readFileSync(path.join(site, "application.json"))),
  application,
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "app/package.json"))).version,
  application.version,
);
assert.equal(
  JSON.parse(fs.readFileSync(path.join(root, "app/src-tauri/tauri.conf.json")))
    .version,
  application.version,
);
assert.equal(application.publishedVersion, release.version);
assert.equal(application.status, "unreleased", "Source version is preparation for user testing, not a release");
assert(html.get("index.html").includes("data-current-development") && html.get("index.html").includes(`The published Mac download below remains ${release.version}`));
assert(html.get("install.html").includes(`Published download: ${release.version}`));
assert(html.get("install.html").includes(`${release.base}${release.stem}.zip`), "Download remains the existing verified package");
assert(html.get("about.html").includes("This DOI identifies the released version 0.8.0"));
assert(html.get("about.html").includes(`${application.version} test build is unreleased and has no version-specific DOI yet`));
assert(html.get("about.html").includes('href="https://doi.org/10.5281/zenodo.24246123"'));
const media = JSON.parse(
  fs.readFileSync(path.join(site, "assets/media/provenance.json")),
);
assert(media && typeof media === "object", "Actual image provenance exists");
assert.equal(media.application.version, capturedRelease.version);
assert.equal(media.application.sourceRevision, capturedRelease.source);
assert.deepEqual(media.errors, []);
assert.equal(media.images.length, 16);
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
  "tools/site/examples/bicyclic-c7h10.molden",
  "tools/site/examples/complex-field.cube",
  "shaders/x-ray.vert",
  "shaders/x-ray.frag",
  "shaders/x-ray.params",
  "app/shaders/surface-clip.vert",
  "app/shaders/surface-clip.frag",
  "app/shaders/surface-clip.params",
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
assert.equal(mediaFiles.length, 16, "All curated genuine captures");
const inspectionMedia = JSON.parse(fs.readFileSync(path.join(site, "assets/inspection/provenance.json")));
assert.equal(inspectionMedia.application.publishedRelease, false);
assert.equal(inspectionMedia.application.branch, "codex/scientific-inspection");
assert.equal(inspectionMedia.application.version, "0.8.0");
assert.equal(inspectionMedia.images.length, 3);
assert.deepEqual(inspectionMedia.errors, []);
for (const row of inspectionMedia.images) {
  assert(/^[a-z0-9-]+\.webp$/.test(row.file));
  const image = fs.readFileSync(path.join(site, "assets/inspection", row.file));
  assert.equal(image.length, row.bytes);
  assert.equal(hash(image), row.sha256);
  assert.equal(image.toString("ascii", 0, 4), "RIFF");
  assert.equal(image.toString("ascii", 8, 12), "WEBP");
  assert(row.width > 0 && row.height > 0);
}
for (const row of inspectionMedia.inputs) assert.equal(hash(fs.readFileSync(path.join(root, row.file))), row.sha256);
for (const method of inspectionMethods) {
  assert(fs.readFileSync(path.join(portable, "reference.md"), "utf8").includes("`" + method + "`"), `Packaged instructions cover ${method}`);
}
const expectedMedia = [
  "1aon-ao-off",
  "1aon-ao-on",
  "4pj1-ao-off",
  "4pj1-ao-on",
  "1aon-cartoon-chain",
  "1aon-chain-secondary",
  "quantum-orbital",
  "quantum-lumo",
  "quantum-volume",
  "quantum-xray",
  "quantum-unclipped",
  "quantum-clipped",
  "shader-controls",
  "cube-raycast",
  "app-overview",
  "ai-session-xray",
];
for (const name of expectedMedia)
  assert(
    mediaFiles.some((row) => row.path === `assets/media/${name}.webp`),
    name,
  );
const aiCapture = media.images.find((row) => row.file === "ai-session-xray.webp");
assert.equal(aiCapture.sourcePng, "docs/sample-ai-session/images/06-homo-xray-128.png");
assert.equal(hash(fs.readFileSync(path.join(root, aiCapture.sourcePng))), aiCapture.sourcePngSha256);
assert.equal(aiCapture.application.publishedRelease, false);
assert.equal(aiCapture.width, 1700);
assert.equal(aiCapture.height, 1328);
assert.equal(aiCapture.resolution, 128);
const bytes = files.reduce((sum, row) => sum + row.bytes, 0);
assert(bytes < 25 * 1024 * 1024, `Static payload, including narrated on-demand video, remains bounded: ${bytes}`);
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
