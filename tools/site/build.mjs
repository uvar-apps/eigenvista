// Compose the committed static site. No packages, network or application build.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { release } from "./release.mjs";
import { application } from "./application.mjs";
import { verification } from "./search-console.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const site = path.join(root, "site");
const out = process.argv[2] ? path.resolve(root, process.argv[2]) : site;
if (out !== site && !out.startsWith(path.join(root, "tmp") + path.sep))
  throw Error("Alternative output must stay in repository tmp/");
const escape = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const plain = (value) =>
  value
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const groups = [
  "home",
  "install",
  "reference",
  "inspection",
  "tutorials",
  "gallery",
  "shaders",
  "ai",
  "ai-quantum",
  "ai-molecules",
  "about",
];
const pages = (
  await Promise.all(
    groups.map(
      async (group) => (await import(`./content/${group}.mjs`)).default,
    ),
  )
).flat();
const navigation = [
  ["home", "./", "Home"],
  ["install", "install.html", "Install"],
  ["reference", "reference.html", "Manual"],
  ["shaders", "surface-shaders.html", "Shaders"],
  ["ai", "ai.html", "AI"],
  ["tutorials", "tutorials.html", "Tutorials"],
  ["gallery", "gallery.html", "Gallery"],
  ["about", "about.html", "About"],
];
fs.mkdirSync(path.join(out, "assets"), { recursive: true });

const media = JSON.parse(
  fs.readFileSync(path.join(site, "assets/media/provenance.json")),
);
const dimensions = new Map(
  [...media.images, ...media.workspacePaneCaptures.images].map((row) => [row.file, row]),
);
const cssVersion = createHash("sha256")
  .update(fs.readFileSync(path.join(site, "assets/site.css")))
  .digest("hex")
  .slice(0, 12);
const socialVersion = createHash("sha256")
  .update(fs.readFileSync(path.join(site, "assets/social/eigenvista-social.png")))
  .digest("hex").slice(0, 12);
const socialImage = `https://uvar-apps.github.io/eigenvista/assets/social/eigenvista-social.png?v=${socialVersion}`;
const socialVersions = new Map(
  fs.readdirSync(path.join(site, "assets/social"))
    .filter((name) => /\.(?:png|webp|mp4|vtt)$/.test(name))
    .map((name) => [name, createHash("sha256").update(fs.readFileSync(path.join(site, "assets/social", name))).digest("hex").slice(0, 12)]),
);
const renderBody = (page) => {
  let body = page.body.replace(/<img\b[^>]*>/g, (tag) => {
    const filename = tag.match(/src="assets\/media\/([^"]+)"/)?.[1];
    const size = dimensions.get(filename);
    if (!size) return tag;
    return tag
      .replace(
        'src="assets/media/' + filename + '"',
        'src="assets/media/' +
          filename +
          "?v=" +
          size.sha256.slice(0, 12) +
          '"',
      )
      .replace(/\s(?:width|height)="[^"]*"/g, "")
      .replace(
        />$/,
        ' width="' + size.width + '" height="' + size.height + '">',
      );
  });
  body = body.replace(/<a\b[^>]*>/g, (tag) => {
    const mediaFile = tag.match(/href="assets\/media\/([^"]+)"/)?.[1];
    const image = dimensions.get(mediaFile);
    if (image)
      return tag.replace(
        'href="assets/media/' + mediaFile + '"',
        'href="assets/media/' +
          mediaFile +
          "?v=" +
          image.sha256.slice(0, 12) +
          '"',
      );
    const filename = tag.match(/href="downloads\/([^"]+)"/)?.[1];
    if (!filename || !/\sdownload(?=[\s>])/.test(tag)) return tag;
    return tag.replace(
      /\sdownload(?=[\s>])/,
      ' download="' + escape(filename) + '"',
    );
  });
  body = body.replace(/\b(src|href|poster)="assets\/social\/([^"?]+)"/g, (match, attr, name) => {
    const version = socialVersions.get(name);
    if (!version) throw Error(`Missing social/demo asset: ${name}`);
    return `${attr}="assets/social/${name}?v=${version}"`;
  });
  if (!["reference", "tutorials", "ai"].includes(page.section)) return body;
  const headings = [
    ...body.matchAll(/<h2 id="([^"]+)"[^>]*>([\s\S]*?)<\/h2>/g),
  ];
  const toc = headings
    .map(
      (match) =>
        '<a href="#' +
        escape(match[1]) +
        '">' +
        escape(plain(match[2])) +
        "</a>",
    )
    .join("");
  return (
    '<div class="article-layout"><aside class="toc" aria-label="On this page"><p class="eyebrow">On this page</p>' +
    toc +
    '</aside><article class="prose' + (page.section === "ai" ? " ai-prose" : "") + '">' +
    body +
    "</article></div>"
  );
};

const document = (page) => {
  const home = page.file === "index.html";
  const url = `https://uvar-apps.github.io/eigenvista/${home ? "" : page.file}`;
  const title = home
    ? "EigenVista — Molecular structures & quantum chemistry"
    : `${page.searchTitle ?? page.title} — EigenVista`;
  const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${escape(page.description)}"><meta name="theme-color" content="#ecebe4">
${home ? `<meta name="google-site-verification" content="${escape(verification)}">` : ""}
${page.file === "404.html" ? '<meta name="robots" content="noindex">' : ""}
<title>${escape(title)}</title><link rel="canonical" href="${url}">
<meta property="og:type" content="website"><meta property="og:site_name" content="EigenVista">
<meta property="og:title" content="${escape(title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${url}">
<meta property="og:image" content="${socialImage}"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1280"><meta property="og:image:height" content="640"><meta property="og:image:alt" content="EigenVista: an electron-density X-ray surface beside the 1AON molecular complex with ambient occlusion and Pastel atom colors">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)}"><meta name="twitter:description" content="${escape(page.description)}"><meta name="twitter:image" content="${socialImage}"><meta name="twitter:image:alt" content="EigenVista X-ray density rendering and molecular ambient occlusion on 1AON">
<link rel="icon" type="image/svg+xml" href="assets/favicon.svg"><link rel="stylesheet" href="assets/site.css?v=${cssVersion}">
<script src="assets/site.js" defer></script></head><body>
<a class="skip-link" href="#main">Skip to content</a>
<header class="top"><a class="brand" href="./"><img src="assets/favicon.svg" width="32" height="32" alt=""><span>EigenVista</span><small data-application-version>${application.version}${application.status === "unreleased" ? " test build" : ""}</small></a>
<nav aria-label="Main navigation">${navigation.map(([section, href, label]) => `<a href="${href}"${page.section === section && page.file !== "404.html" ? ' aria-current="page"' : ""}>${label}</a>`).join("")}</nav>
<div class="site-tools"><button type="button" data-search-open hidden aria-haspopup="dialog">Search <kbd>/</kbd></button><button type="button" data-theme-toggle hidden aria-label="Switch color theme">Dark</button></div></header>
<div class="element-strip" aria-hidden="true"></div>
<main id="main" tabindex="-1">${home ? "" : `<div class="page-heading"><p class="eyebrow">${escape(page.number ?? "")} / EIGENVISTA FIELD MANUAL</p><h1>${escape(page.title)}<span class="accent">.</span></h1></div>`}${renderBody(page)}</main>
<footer class="footer"><div><a class="footer-brand" href="./">EigenVista</a><p>Molecular structures. Quantum fields. Your perspective.</p><p class="site-attribution">Author: Ugo Varetto<br>Copyright (c) 2026 - Ugo Varetto</p></div><div><span data-application-status>v${application.version} / ${application.status === "unreleased" ? "UNRELEASED TEST BUILD" : "DEVELOPMENT PREVIEW"}</span><a href="install.html">Download &amp; install</a><a href="https://github.com/uvar-apps/eigenvista">Source &amp; issues ↗</a><a href="https://github.com/uvar-apps/eigenvista/releases">Release history ↗</a></div><div><a href="about.html#citation">Cite EigenVista</a><a href="about.html#credits">Data &amp; image credits</a><a href="LICENSE.txt">GPL-2.0-or-later</a><a href="https://uvar-apps.github.io/sesmesh/">Also by uvar-apps: Sesmesh ↗</a></div></footer>
<dialog class="search-dialog" data-search-dialog aria-labelledby="search-title"><div class="dialog-head"><h2 id="search-title">Find a topic</h2><button type="button" data-search-close aria-label="Close search">Close ×</button></div><label for="site-search">Search the manual, tutorials and installation guide</label><input id="site-search" type="search" placeholder="Try orbitals, AO or cube" autocomplete="off"><p class="small" data-search-status role="status">Type to search.</p><ul data-search-results></ul></dialog>
</body></html>\n`;
  if (page.file !== "404.html") return html;
  return html.replace(/\b(href|src)="([^"]+)"/g, (match, attribute, target) => {
    if (
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^[a-z][a-z0-9+.-]*:/i.test(target)
    )
      return match;
    return attribute + '="/eigenvista/' + (target === "./" ? "" : target) + '"';
  });
};

const files = new Set();
for (const page of pages) {
  if (!/^[a-z0-9-]+\.html$/.test(page.file) || files.has(page.file))
    throw Error(`Invalid or duplicate page: ${page.file}`);
  files.add(page.file);
  if (!page.title || !page.description || !page.body)
    throw Error(`Incomplete page: ${page.file}`);
  fs.writeFileSync(path.join(out, page.file), document(page));
}
fs.writeFileSync(
  path.join(out, "search-index.json"),
  JSON.stringify(
    pages
      .filter((p) => p.file !== "404.html")
      .map((p) => ({
        title: p.title,
        url: p.file,
        description: p.description,
        text: plain(p.body),
      })),
  ) + "\n",
);
fs.writeFileSync(
  path.join(out, "release.json"),
  JSON.stringify(release, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(out, "application.json"),
  JSON.stringify(application, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(out, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages
    .filter((p) => p.file !== "404.html")
    .map(
      (p) =>
        `<url><loc>https://uvar-apps.github.io/eigenvista/${p.file === "index.html" ? "" : p.file}</loc></url>`,
    )
    .join("")}</urlset>\n`,
);
fs.writeFileSync(
  path.join(out, "robots.txt"),
  "User-agent: *\nAllow: /\nSitemap: https://uvar-apps.github.io/eigenvista/sitemap.xml\n",
);
fs.writeFileSync(path.join(out, ".nojekyll"), "");
fs.copyFileSync(
  path.join(root, "app/src-tauri/icons/source.svg"),
  path.join(out, "assets/favicon.svg"),
);
fs.copyFileSync(path.join(root, "LICENSE"), path.join(out, "LICENSE.txt"));

// Copy only this named public corpus; never scan untracked files or user inputs.
const examples = [
  ["packaging/examples/water.xyz", "water.xyz"],
  ["packaging/examples/water.pdb", "water.pdb"],
  ["fixtures/molden/water-rhf-ccpvdz.molden", "water.molden"],
  ["fixtures/cube/signed-affine.cube", "signed-affine.cube"],
  ["fixtures/cif/1AON.cif", "1AON.cif"],
  ["palettes/matterviz-pastel.json", "matterviz-pastel.json"],
  ["palettes/matterviz-muted.json", "matterviz-muted.json"],
  ["palettes/accessible-elements.json", "accessible-elements.json"],
  ["palettes/LICENSE-MatterViz.txt", "LICENSE-MatterViz.txt"],
  ["tools/site/examples/bicyclic-c7h10.molden", "bicyclic-c7h10.molden"],
  ["tools/site/examples/complex-field.cube", "complex-field.cube"],
  ["tools/site/examples/README.md", "README-quantum-example.txt"],
  ["shaders/x-ray.vert", "shaders/x-ray.vert"],
  ["shaders/x-ray.frag", "shaders/x-ray.frag"],
  ["shaders/x-ray.params", "shaders/x-ray.params"],
  ["app/shaders/surface-clip.vert", "shaders/surface-clip.vert"],
  ["app/shaders/surface-clip.frag", "shaders/surface-clip.frag"],
  ["app/shaders/surface-clip.params", "shaders/surface-clip.params"],
  ["shaders/README.md", "shaders/README.txt"],
  ["LICENSE", "shaders/LICENSE.txt"],
  ["skills/eigenvista-control/SKILL.md", "eigenvista-control/SKILL.md"],
  ["skills/eigenvista-control/reference.md", "eigenvista-control/reference.md"],
  ["docs/ai-connector.md", "eigenvista-control/README.md"],
  ["docs/allocation-policy.md", "eigenvista-control/allocation-policy.md"],
];
fs.mkdirSync(path.join(out, "downloads"), { recursive: true });
const sourceRows = examples.map(([from, name]) => {
  const bytes = fs.readFileSync(path.join(root, from));
  fs.mkdirSync(path.dirname(path.join(out, "downloads", name)), {
    recursive: true,
  });
  fs.copyFileSync(path.join(root, from), path.join(out, "downloads", name));
  return {
    file: name,
    source: from,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
});
fs.writeFileSync(
  path.join(out, "downloads/provenance.json"),
  JSON.stringify(
    {
      sourceRepository: "https://github.com/uvar-apps/eigenvista",
      files: sourceRows,
    },
    null,
    2,
  ) + "\n",
);
fs.writeFileSync(
  path.join(out, "downloads/README.txt"),
  `EigenVista public tutorial examples\n\nbicyclic-c7h10.molden: 17-atom C7H10 molecular calculation, 125 basis functions and 118 listed orbitals. Source and orbital notes: README-quantum-example.txt.\ncomplex-field.cube: original 29-atom, 84x84x84 scalar grid from Molekel data/elf_pic.cube. Source header does not identify scalar meaning/units.\nshaders/: ready-to-load X-ray and clipping shader pairs and parameters; original attribution and GPL notice are included.\n\nwater.pdb / water.xyz: synthetic three-atom water geometry (two inferred display bonds).\nwater.molden: independently calculated RHF/cc-pVDZ water; 24 basis functions and 24 spatial orbitals. See fixtures/molden/README.md in the public repository for scientific provenance.\nsigned-affine.cube: synthetic signed affine field, two atoms/one bond, skewed 7x7x7 grid. It is a mathematical rendering fixture, not a quantum-chemistry calculation.\n1AON.cif: public deposited GroEL-GroES structure; see https://www.rcsb.org/structure/1AON for the original structure and citation. Repository import selects 58,870 source atoms.\nmatterviz-pastel.json / matterviz-muted.json: original MatterViz RGB values for elements1-109 in EigenVista's palette envelope. Author Janosh Riebesell; revision fae7a3e7fddf26f9625391ea76f28c7ebd261de9. MIT notice retained in LICENSE-MatterViz.txt; elements110-118 use built-in defaults.\naccessible-elements.json: optional fourteen-element palette with documented color-vision simulations and remaining ambiguities. Source and coverage: https://github.com/uvar-apps/eigenvista/blob/main/palettes/README.md . Included in the 0.10.3 ZIP and bundled connector; the older 0.10.2 loader also accepts this download.\n\nSource file paths and exact SHA-256 values: provenance.json.\nSource repository: https://github.com/uvar-apps/eigenvista\nApplication/website license: GPL-2.0-or-later (../LICENSE.txt). Preserve original data and palette notices.\n`,
);
console.log(
  `SITE_BUILD_PASS ${pages.length} pages; ${sourceRows.length} explicit public downloads`,
);
fs.appendFileSync(
  path.join(out, "downloads/README.txt"),
  "\nPortable agent instructions: eigenvista-control/SKILL.md and reference.md form a complete optional workflow folder; README.md is the installed-app user guide, with allocation-policy.md explaining larger calculations. Keep these files together. These instructions do not install a binary or enable an older app. A compatible EigenVista.app supplies the prebuilt connection helper and launcher. No source checkout or compiler is required for that binary package.\n",
);
