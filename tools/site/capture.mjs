// Historical initial-site capture, including superseded small demo subjects.
// See docs/website.md and capture-quantum.mjs for the curated media workflow.
// Run from the repository root with an owned production preview on port 5189.
// Requires the existing app Playwright install plus cwebp and ImageMagick; no build.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
assert.equal(process.cwd(), root, "Run from the EigenVista repository root");
const staging = path.join(root, "tmp/2026-11-15-website/media");
const output = path.join(root, "site/assets/media");
for (const key of ["TMPDIR", "TMP", "TEMP"])
  process.env[key] = path.join(root, "tmp");
delete process.env.RUSTUP_TOOLCHAIN;
delete process.env.CARGO_TARGET_DIR;
fs.mkdirSync(staging, { recursive: true });
fs.mkdirSync(output, { recursive: true });
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
const fileHash = (file) => sha256(fs.readFileSync(file));
// Pin the production assets independently audited against the published 0.7.2
// signed application, so regeneration does not require a private staging report.
const audit = {
  version: "0.7.2",
  revision: "5f336b6a2d53dcb0db67dd5ed95956134a5a1e18",
  embedded: {
    productionEntrySha256:
      "cebfbc23851cfdd79796215ed92fc6d6e83a5f4f5d523561632a0c8e69235b59",
    embeddedAssets: [
      [
        "assets/eigenvista_wasm_bg-Qn0zbCfX.wasm",
        "3004441679b465da7eb06cf91f6c8e305eccc9c48616da52c30c185d73c85875",
      ],
      [
        "assets/index-Dqo06fKf.css",
        "3a03fc15954ee2b5fea07d5a7971889b7602ab9265ec28e0227af608a9b3a855",
      ],
      [
        "assets/index-tXlYjzLm.js",
        "cebfbc23851cfdd79796215ed92fc6d6e83a5f4f5d523561632a0c8e69235b59",
      ],
      [
        "assets/science.worker-BQJ13Xij.js",
        "fba5b7ffb3363c740a3a7ec4d6af630396889907faa871edd9b35026a308c7e0",
      ],
      [
        "index.html",
        "6fe360992e27baf11be664c49ce02932c4a74a9646875fe790300749920ee6b5",
      ],
    ].map(([path, sha256]) => ({ path, sha256 })),
  },
};
for (const asset of audit.embedded.embeddedAssets)
  assert.equal(
    fileHash(path.join(root, "app/dist", asset.path)),
    asset.sha256,
    asset.path,
  );
const inputs = [
  "fixtures/cif/1AON.cif",
  "fixtures/large-structure/4PJ1.pdb",
  "fixtures/molden/water-rhf-ccpvdz.molden",
  "fixtures/molden/water-rhf-ccpvdz.json",
  "fixtures/cube/signed-affine.cube",
  "palettes/matterviz-pastel.json",
  "palettes/LICENSE-MatterViz.txt",
].map((file) => ({
  file,
  bytes: fs.statSync(path.join(root, file)).size,
  sha256: fileHash(path.join(root, file)),
}));
const { chromium } = await import(
  pathToFileURL(path.join(root, "app/node_modules/playwright/index.mjs"))
);
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=metal", "--use-gl=angle"],
});
const page = await browser.newPage({
  viewport: { width: 1900, height: 1240 },
  deviceScaleFactor: 1,
});
const errors = [],
  records = [],
  comparisons = [];
page.on("pageerror", (error) => errors.push(String(error)));
page.on("dialog", (dialog) => dialog.accept());
await page.addInitScript(() => {
  window.captureAudit = {
    draws: 0,
    actions: [],
    geometry: null,
    backbone: null,
    generation: null,
  };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener("message", (event) => {
        const result = event.data.result,
          doc = result?.document ?? (result?.atoms ? result : null);
        if (doc) {
          window.captureAudit.backbone = null;
          window.captureAudit.generation = null;
          window.captureAudit.geometry = {
            atoms: doc.atoms.positions.length,
            bonds: doc.bonds.length,
            basisFunctions: doc.basis.length,
            orbitals: doc.orbitals.map(
              ({ id, label, occupation, energy, spin }) => ({
                id,
                label,
                occupation,
                energy,
                spin,
              }),
            ),
            grids: doc.grids.map(({ id, label, dims }) => ({
              id,
              label,
              dims,
            })),
            chains: doc.structure?.chains.length,
            residues: doc.structure?.residues.length,
          };
        }
        if (result?.segments)
          window.captureAudit.backbone = {
            segments: result.segments.length,
            points: result.segments.reduce((n, s) => n + s.points.length, 0),
          };
        if (result?.surfaces && result?.grid)
          window.captureAudit.generation = {
            dimensions: result.grid.dims,
            surfaces: result.surfaces.map((s) => ({
              field: s.field,
              isovalue: s.isovalue,
              vertices: s.positions.length / 3,
              triangles: s.indices.length / 3,
            })),
          };
      });
    }
    postMessage(message, ...args) {
      window.captureAudit.actions.push(message.action);
      super.postMessage(message, ...args);
    }
  };
  for (const name of [
    "drawElements",
    "drawArrays",
    "drawElementsInstanced",
    "drawArraysInstanced",
  ]) {
    const draw = WebGL2RenderingContext.prototype[name];
    WebGL2RenderingContext.prototype[name] = function (...args) {
      window.captureAudit.draws++;
      return Reflect.apply(draw, this, args);
    };
  }
});
const settle = () =>
  page.evaluate(async () => {
    let previous = -1,
      stable = 0;
    for (let i = 0; i < 360; i++) {
      await new Promise(requestAnimationFrame);
      const draws = window.captureAudit.draws;
      stable = draws === previous ? stable + 1 : 0;
      previous = draws;
      if (stable === 5) return;
    }
    throw Error("Actual app rendering did not settle");
  });
const control = (name) => page.getByLabel(name, { exact: true });
const setInput = async (name, value) => {
  await control(name).evaluate((node, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
  await settle();
};
const open = async (file) => {
  await control("Open molecular file").setInputFiles(path.join(root, file));
  await page.waitForFunction(
    (name) =>
      document
        .querySelector("footer [role=status]")
        ?.textContent?.includes(`Opened ${name}`),
    path.basename(file),
  );
  await settle();
  assert.equal(await page.getByRole("alert").count(), 0);
};
const camera = async (dx = 0, dy = 0, zooms = 1) => {
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await settle();
  for (let i = 0; i < zooms; i++) {
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await settle();
  }
  if (!dx && !dy) return;
  const b = await page.locator(".scene").boundingBox(),
    x = b.x + b.width / 2,
    y = b.y + b.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 10 });
  await page.mouse.up();
  await settle();
  // OrbitControls can update below its redraw threshold; let damping converge
  // before the first paired export, whose synchronous path updates controls.
  await page.evaluate(async () => {
    for (let i = 0; i < 300; i++) await new Promise(requestAnimationFrame);
  });
};
const pixels = (file) =>
  execFileSync("magick", [file, "-depth", "8", "rgba:-"], {
    maxBuffer: 32 * 1024 * 1024,
  });
const encode = (source, name) => {
  const destination = path.join(output, `${name}.webp`);
  execFileSync("cwebp", [
    "-quiet",
    "-lossless",
    "-m",
    "6",
    source,
    "-o",
    destination,
  ]);
  assert(
    pixels(source).equals(pixels(destination)),
    "Lossless WebP must decode exactly to the original capture",
  );
  return {
    file: `${name}.webp`,
    bytes: fs.statSync(destination).size,
    sha256: fileHash(destination),
    sourcePngSha256: fileHash(source),
  };
};
const capture = async (name, detail, screenshot = false) => {
  await settle();
  assert.equal(await page.getByRole("alert").count(), 0);
  assert.deepEqual(errors, []);
  const source = path.join(staging, `${name}.png`);
  if (screenshot) await page.screenshot({ path: source });
  else {
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export image", exact: true })
      .click();
    await (await pending).saveAs(source);
  }
  const dimensions = execFileSync(
    "magick",
    ["identify", "-format", "%w %h", source],
    { encoding: "utf8" },
  )
    .trim()
    .split(" ")
    .map(Number);
  const state = await page.evaluate(() => ({
    ...window.captureAudit,
    actions: [...window.captureAudit.actions],
  }));
  const record = {
    ...encode(source, name),
    width: dimensions[0],
    height: dimensions[1],
    background: "#ecebe4",
    ...detail,
    geometry: state.geometry,
    backbone: detail.backbone ? state.backbone : undefined,
    generation: detail.field ? state.generation : undefined,
    status: await page.locator("footer [role=status]").innerText(),
    summary: await page.locator(".document-summary").innerText(),
  };
  records.push(record);
  fs.writeFileSync(
    path.join(staging, "checkpoint.json"),
    JSON.stringify(records, null, 2),
  );
  console.log(`Captured ${name} ${dimensions.join("x")}`);
  return source;
};
const compare = (off, on, restored, name) => {
  const a = pixels(off),
    b = pixels(on);
  assert.equal(a.length, b.length);
  assert(
    a.equals(pixels(restored)),
    "AO Off restores the identical camera/geometry/colors frame",
  );
  let foreground = 0,
    background = 0,
    foregroundChanged = 0,
    silhouetteMismatch = 0,
    absoluteDelta = 0,
    backgroundDelta = 0;
  const isBackground = (bytes, i) =>
    [236, 235, 228].every((value, c) => bytes[i + c] === value);
  for (let i = 0; i < a.length; i += 4) {
    const aBg = isBackground(a, i),
      bBg = isBackground(b, i);
    if (aBg !== bBg) silhouetteMismatch++;
    const delta =
      Math.abs(a[i] - b[i]) +
      Math.abs(a[i + 1] - b[i + 1]) +
      Math.abs(a[i + 2] - b[i + 2]);
    if (!aBg) {
      foreground++;
      absoluteDelta += delta;
      if (delta > 12) foregroundChanged++;
    } else if (bBg) {
      background++;
      backgroundDelta += delta;
    }
  }
  const stats = {
    name,
    foreground,
    background,
    foregroundChanged,
    changedForegroundFraction: foregroundChanged / foreground,
    meanForegroundChannelChange: absoluteDelta / (foreground * 3),
    backgroundDelta,
    silhouetteMismatch,
    exactOffRestoration: true,
  };
  assert(stats.changedForegroundFraction > 0.25);
  assert(stats.meanForegroundChannelChange > 4);
  assert.equal(backgroundDelta, 0);
  comparisons.push(stats);
};
try {
  await page.goto(process.env.CAPTURE_URL ?? "http://127.0.0.1:5189/");
  await page.waitForFunction(() =>
    document
      .querySelector("footer [role=status]")
      ?.textContent?.includes("triangles"),
  );
  await settle();
  const renderer = await control("Molecular scene").evaluate((node) => {
    const gl = node.getContext("webgl2"),
      ext = gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "unavailable";
  });
  await setInput("Background color", "#ecebe4");
  await control("Atom colours file").setInputFiles(
    path.join(root, "palettes/matterviz-pastel.json"),
  );
  await page
    .getByText("Overridden by matterviz-pastel.json", { exact: true })
    .waitFor();
  for (const [id, file, dx, dy] of [
    ["1aon", "fixtures/cif/1AON.cif", 65, -38],
    ["4pj1", "fixtures/large-structure/4PJ1.pdb", 0, 0],
  ]) {
    await open(file);
    await control("Representation").selectOption("space-fill");
    await control("Structure coloring").selectOption("element");
    await camera(dx, dy);
    const detail = {
      input: file,
      representation: "Van der Waals",
      coloring: "Element",
      palette: "MatterViz Pastel",
      camera: {
        fit: true,
        zoomInClicks: 1,
        dragCssPixels: [dx, dy],
        dragSteps: 10,
      },
    };
    const off = await capture(`${id}-ao-off`, {
      ...detail,
      ambientOcclusion: {
        enabled: false,
        shading: "original MeshStandardMaterial",
      },
    });
    await control("Atom and bond ambient occlusion").check();
    await settle();
    const settings = {
      enabled: true,
      shading: "Lambert + SSAO",
      strength: Number(await control("AO strength").inputValue()),
      automaticRadius: await control("Automatic AO radius").isChecked(),
      radiusAngstrom: Number(
        await control("AO radius (angstrom)").inputValue(),
      ),
    };
    const on = await capture(`${id}-ao-on`, {
      ...detail,
      ambientOcclusion: settings,
    });
    await control("Atom and bond ambient occlusion").uncheck();
    await settle();
    const restored = path.join(staging, `${id}-restored.png`),
      pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export image", exact: true })
      .click();
    await (await pending).saveAs(restored);
    compare(off, on, restored, id);
  }
  await open("fixtures/cif/1AON.cif");
  await control("Representation").selectOption("cartoon");
  await control("Structure coloring").selectOption("chain");
  await camera(65, -38);
  await capture("1aon-cartoon-chain", {
    input: "fixtures/cif/1AON.cif",
    representation: "Protein cartoon",
    coloring: "Chain",
    backbone: true,
    camera: { fit: true, zoomInClicks: 1, dragCssPixels: [65, -38] },
  });
  const chains = page
    .locator(".structure-controls summary")
    .filter({ hasText: /^Chains/ });
  if (!(await chains.evaluate((node) => node.parentElement.open)))
    await chains.click();
  await page
    .getByRole("button", { name: "Isolate chain A", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Focus chain A", exact: true })
    .click();
  await control("Structure coloring").selectOption("secondary");
  await settle();
  await capture("1aon-chain-secondary", {
    input: "fixtures/cif/1AON.cif",
    representation: "Protein cartoon",
    coloring: "Deposited secondary structure; unknown remains unknown",
    visibleSubset: "Chain A only",
    backbone: true,
    camera: { focusChain: "A" },
  });
  await open("fixtures/molden/water-rhf-ccpvdz.molden");
  await control("Representation").selectOption("ball-stick");
  await page.locator(".orbital-field-list .field-row").nth(4).click();
  await control("Isovalue").fill("0.05");
  await control("Grid resolution").selectOption("96");
  await page
    .getByRole("button", { name: "Generate surfaces", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector("footer [role=status]")
      ?.textContent?.includes("triangles"),
  );
  await camera(0, 0, 2);
  const quantum = {
    input: "fixtures/molden/water-rhf-ccpvdz.molden",
    representation: "Ball and stick",
    palette: "MatterViz Pastel",
    field: {
      orbitalNumber: 5,
      name: "HOMO",
      occupation: 2,
      energyHartree: -0.49306280759577614,
      method: "RHF",
      basis: "cc-pVDZ",
      isovalueBohrPowerMinusThreeHalves: 0.05,
      gridResolution: 96,
    },
    camera: { fit: true, zoomInClicks: 2 },
  };
  await capture("water-orbital-mesh", { ...quantum, mode: "Isosurface mesh" });
  await control("Rendering mode").selectOption("volume");
  await control("Preview sampling quality").selectOption("4");
  await camera(0, 0, 7);
  await capture("water-orbital-volume", {
    ...quantum,
    camera: { fit: true, zoomInClicks: 7 },
    mode: "Volume preview",
    samplingQuality: "Fine",
  });
  await page.setViewportSize({ width: 1600, height: 1050 });
  await camera(0, 0, 7);
  await capture(
    "app-overview",
    {
      ...quantum,
      camera: { fit: true, zoomInClicks: 7 },
      mode: "Volume preview",
      samplingQuality: "Fine",
      captureType: "full unmodified application UI",
    },
    true,
  );
  await page.setViewportSize({ width: 1900, height: 1240 });
  await open("fixtures/cube/signed-affine.cube");
  await control("Rendering mode").selectOption("raycast");
  await control("Isovalue").fill("0.05");
  await control("Preview sampling quality").selectOption("4");
  await camera(0, 0, 2);
  await capture("cube-raycast", {
    input: "fixtures/cube/signed-affine.cube",
    mode: "Sampled raycast preview",
    synthetic: true,
    field: {
      description:
        "Analytical signed affine regression scalar; not quantum chemistry",
      dimensions: [7, 7, 7],
      isovalue: 0.05,
    },
    samplingQuality: "Fine",
    camera: { fit: true, zoomInClicks: 2 },
  });
  const provenance = {
    schema: 1,
    created: new Date().toISOString(),
    application: {
      name: "EigenVista",
      version: audit.version,
      sourceRevision: audit.revision,
      productionEntrySha256: audit.embedded.productionEntrySha256,
      verifiedAllDistAssetsAgainstReleaseAudit: true,
    },
    capture: {
      method:
        "Actual production application UI and its PNG export; only app-overview uses a full-window screenshot",
      browser: `Chromium ${browser.version()}`,
      renderer,
      viewport: { width: 1900, height: 1240, deviceScaleFactor: 1 },
      encoding:
        "cwebp lossless -m 6; every WebP decoded and exactly compared with original PNG by ImageMagick",
      background: "#ecebe4",
      cameraBoundary:
        "Fit, zoom and orbit pointer controls only; OrbitControls damping settles before export; paired cameras unchanged and exact Off restoration verified",
      geometryBoundary:
        "geometry counts describe the complete imported source document. backbone counts describe the complete prepared backbone, before visibleSubset filtering. generation describes saved mesh geometry retained in the document; volume and raycast display sampled fields instead.",
      ambientOcclusionBoundary:
        "Off uses original Standard shading. On switches atoms/bonds to Lambert shading plus illustrative SSAO, not a physically calibrated shadow calculation. AO render targets proportionally capped at 1024.",
    },
    inputs,
    sources: [
      {
        input: "1AON.cif",
        url: "https://www.rcsb.org/structure/1AON",
        doi: "10.2210/pdb1aon/pdb",
        note: "Full tracked mmCIF; deposited structural coordinates and secondary annotations, no generated symmetry mates.",
      },
      {
        input: "4PJ1.pdb",
        url: "https://www.rcsb.org/structure/4PJ1",
        doi: "10.2210/pdb4pj1/pdb",
        note: "Full unmodified tracked PDB fixture; citation and data notices retained in fixture header.",
      },
      {
        input: "water-rhf-ccpvdz.molden",
        note: "First-party PySCF 2.14.0 RHF/cc-pVDZ converged calculation fixture; test geometry, not optimized. Source and independent numerical reference documented in fixtures/molden/README.md.",
      },
      {
        input: "signed-affine.cube",
        note: "First-party synthetic analytical regression field; definition documented in fixtures/cube/README.md; not a quantum calculation.",
      },
      {
        input: "matterviz-pastel.json",
        url: "https://github.com/janosh/matterviz/blob/fae7a3e7fddf26f9625391ea76f28c7ebd261de9/src/lib/colors/pastel-colors.json",
        license: "MIT",
        notice: "palettes/LICENSE-MatterViz.txt",
        note: "Unchanged upstream RGB values for elements 1–109 adapted into EigenVista envelope; 110–118 retain built-in defaults.",
      },
    ],
    comparisons,
    images: records,
    errors,
    limitations: [
      "These are browser captures of the audited release assets, not clean-machine/native installation qualification.",
      "Illustrative views do not add quantum data to structure-only inputs.",
      "Secondary structure is deposited only; unassigned regions are not inferred.",
    ],
  };
  fs.writeFileSync(
    path.join(output, "provenance.json"),
    JSON.stringify(provenance, null, 2) + "\n",
  );
  fs.writeFileSync(
    path.join(staging, "capture-result.json"),
    JSON.stringify(
      { passed: true, images: records.length, comparisons, errors },
      null,
      2,
    ),
  );
} catch (error) {
  fs.writeFileSync(
    path.join(staging, "failure.json"),
    JSON.stringify(
      { error: String(error.stack), errors, completed: records },
      null,
      2,
    ),
  );
  await page.screenshot({ path: path.join(staging, "failure.png") });
  throw error;
} finally {
  await browser.close();
}
