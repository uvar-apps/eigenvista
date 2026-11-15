// Real EigenVista quantum/shader studies. Use the owned production preview on 5189.
// Run from the repository root; all intermediate PNGs remain in repository tmp/.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "../../app/node_modules/playwright/index.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
assert.equal(process.cwd(), root, "Run from the EigenVista repository root");
const task = path.join(root, "tmp/2026-11-15-website-quality");
fs.mkdirSync(task, { recursive: true });
for (const key of ["TMPDIR", "TMP", "TEMP"])
  process.env[key] = path.join(root, "tmp");
const browser = await chromium.launch({
  headless: true,
  args: ["--use-angle=metal", "--use-gl=angle"],
});
const panelOnly = process.argv.includes("--panel-only");
const page = await browser.newPage({
  viewport: panelOnly
    ? { width: 1280, height: 1100 }
    : { width: 2560, height: 1800 },
  deviceScaleFactor: panelOnly ? 2 : 1,
});
page.setDefaultTimeout(120000);
const records = [];
const finalPass = process.argv.includes("--final");
page.on("dialog", (d) => d.accept());
page.on("pageerror", (e) => console.log("PAGE_ERROR", e.message));
await page.addInitScript(() => {
  window.study = { draws: 0, geometry: null, generation: null };
  const NativeWorker = window.Worker;
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args);
      this.addEventListener("message", ({ data }) => {
        const r = data.result,
          doc = r?.document ?? (r?.atoms ? r : null);
        if (doc)
          window.study.geometry = {
            atoms: doc.atoms.positions.length,
            bonds: doc.bonds.length,
            basis: doc.basis.length,
            orbitals: doc.orbitals.map(({ id, label, energy, occupation }) => ({
              id,
              label,
              energy,
              occupation,
            })),
          };
        if (r?.surfaces && r?.grid)
          window.study.generation = {
            dims: r.grid.dims,
            surfaces: r.surfaces.map((s) => ({
              field: s.field,
              isovalue: s.isovalue,
              triangles: s.indices.length / 3,
              vertices: s.positions.length / 3,
            })),
          };
      });
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
      window.study.draws++;
      return Reflect.apply(draw, this, args);
    };
  }
});
const settle = () =>
  page.evaluate(async () => {
    let prev = -1,
      stable = 0;
    for (let n = 0; n < 240; n++) {
      await new Promise(requestAnimationFrame);
      stable = window.study.draws === prev ? stable + 1 : 0;
      prev = window.study.draws;
      if (stable > 5) return;
    }
  });
const label = (name) => page.getByLabel(name, { exact: true });
const set = async (name, value) => {
  await label(name).evaluate((node, value) => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
    node.dispatchEvent(new Event("change", { bubbles: true }));
  }, String(value));
  await settle();
};
const camera = async (dx, dy, zoom) => {
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await settle();
  for (let n = 0; n < zoom; n++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await settle();
  const b = await page.locator(".scene").boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2 + dx, b.y + b.height / 2 + dy, {
    steps: 16,
  });
  await page.mouse.up();
  await page.evaluate(async () => {
    for (let i = 0; i < 220; i++) await new Promise(requestAnimationFrame);
  });
};
const capture = async (name, settings, overview = false) => {
  await settle();
  const png = path.join(task, name + ".png");
  if (overview === "panel")
    await page.locator(".shader-panel").screenshot({ path: png });
  else if (overview) await page.screenshot({ path: png });
  else {
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export image", exact: true })
      .click();
    await (await download).saveAs(png);
  }
  const [width, height] = execFileSync(
    "magick",
    ["identify", "-format", "%w %h", png],
    { encoding: "utf8" },
  )
    .trim()
    .split(" ")
    .map(Number);
  records.push({
    name,
    width,
    height,
    ...settings,
    renderControls: await page
      .locator("input[aria-label],select[aria-label]")
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => n.type !== "file")
          .map((n) => ({
            label: n.getAttribute("aria-label"),
            value: n.type === "checkbox" ? n.checked : n.value,
          })),
      ),
    state: await page.evaluate(() => window.study),
    status: await page.locator("footer [role=status]").innerText(),
  });
  fs.writeFileSync(
    path.join(task, "captures.json"),
    JSON.stringify(records, null, 2) + "\n",
  );
  console.log("CAPTURED", name, width, height);
};
const open = async (
  file = path.join(root, "tools/site/examples/bicyclic-c7h10.molden"),
) => {
  await label("Open molecular file").setInputFiles(file);
  await page.waitForFunction(
    (name) =>
      document
        .querySelector("footer [role=status]")
        ?.textContent?.includes("Opened " + name),
    path.basename(file),
  );
  await settle();
  if (await page.getByLabel("Dismiss import warnings", { exact: true }).count())
    await page.getByLabel("Dismiss import warnings", { exact: true }).click();
};
const generate = async (field, iso) => {
  const cache = path.join(task, "cache-" + field + "-256.eigenvista");
  if (finalPass && fs.existsSync(cache)) {
    await open(cache);
    return;
  }
  if (field === "density")
    await page
      .locator(".field-group")
      .filter({
        has: page.getByRole("heading", {
          name: "Density matrices",
          exact: true,
        }),
      })
      .locator(".field-row")
      .first()
      .click();
  else
    await page
      .locator(".orbital-field-list .field-row")
      .nth(field - 1)
      .click();
  await label("Isovalue").fill(String(iso));
  await label("Grid resolution").selectOption("256");
  await page
    .getByRole("button", { name: "Generate surfaces", exact: true })
    .click();
  await page.waitForFunction(
    () =>
      document
        .querySelector("footer [role=status]")
        ?.textContent?.includes("triangles"),
    null,
    { timeout: 180000 },
  );
  await settle();
  if (finalPass) {
    const download = page.waitForEvent("download");
    await page.getByTitle("Save document", { exact: true }).click();
    await (await download).saveAs(cache);
  }
};
const shader = async (stem, base = "app/shaders") => {
  if (
    await page
      .getByRole("button", { name: "Clear shader", exact: true })
      .isEnabled()
  )
    await page
      .getByRole("button", { name: "Clear shader", exact: true })
      .click();
  for (const [kind, extension] of [
    ["vertex", "vert"],
    ["fragment", "frag"],
    ["params", "params"],
  ])
    await page
      .locator(`[data-shader-input="${kind}"]`)
      .setInputFiles(path.join(root, base, stem + "." + extension));
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await settle();
};
try {
  await page.goto("http://127.0.0.1:5189/");
  await page.waitForFunction(() =>
    document
      .querySelector("footer [role=status]")
      ?.textContent?.includes("triangles"),
  );
  await open();
  if (panelOnly) {
    await generate("density", 0.04);
    await shader("x-ray", "shaders");
    await set("maxOpacity", 0.85);
    await set("minOpacity", 0);
    await set("da", 0.03);
    for (const title of ["Field rendering", "Appearance", "Atom colours"]) {
      const heading = page.getByRole("button", { name: title, exact: true });
      if ((await heading.getAttribute("aria-expanded")) === "true")
        await heading.click();
    }
    await capture(
      "shader-controls",
      {
        field: "Total density",
        shader: "x-ray",
        isovalue: 0.04,
        resolution: 256,
        captureType: "Actual shader panel at device pixel ratio2",
      },
      "panel",
    );
  } else {
    console.log(
      "CONTROLS",
      JSON.stringify(
        await page.locator("input,select").evaluateAll((nodes) =>
          nodes.map((n) => ({
            label: n.getAttribute("aria-label"),
            type: n.type,
            value: n.value,
            options:
              n.tagName === "SELECT"
                ? [...n.options].map((o) => ({
                    value: o.value,
                    text: o.textContent,
                  }))
                : undefined,
          })),
        ),
      ),
    );
    await set("Background color", "#17232d");
    await set("Positive color", "#ef8bac");
    await set("Negative color", "#59d6cf");
    await set("Opacity", 0.92);
    for (const mo of process.argv.includes("--density-only") ? [] : [26, 27]) {
      if (mo !== 26) await open();
      await generate(mo, 0.03);
      await set("Positive color", "#75e1df");
      await set("Negative color", "#ffa1bc");
      await set("Opacity", 1);
      await label("Surface shading").selectOption("blinn-phong");
      await camera(mo === 26 ? 210 : 100, 80, 2);
      await capture(
        finalPass
          ? mo === 26
            ? "quantum-orbital"
            : "quantum-lumo"
          : "candidate-mo-" + mo,
        {
          field: "MO " + mo,
          isovalue: 0.03,
          resolution: 256,
          opacity: 1,
          positiveColor: "#75e1df",
          negativeColor: "#ffa1bc",
          shading: "Blinn-Phong",
          camera: { dx: mo === 26 ? 210 : 100, dy: 80, zoom: 2 },
        },
      );
      if (finalPass && mo === 26) {
        await label("Rendering mode").selectOption("raycast");
        await label("Preview sampling quality").selectOption("4");
        await page.waitForFunction(
          () =>
            !document.querySelector('button[title="Save document"]')?.disabled,
        );
        await settle();
        await camera(210, 80, 5);
        await capture("candidate-raycast-26", {
          field: "MO 26",
          isovalue: 0.03,
          resolution: 256,
          mode: "Sampled raycast preview",
          samplingQuality: "Fine",
        });
        await label("Rendering mode").selectOption("volume");
        await label("Preview sampling quality").selectOption("4");
        await page.waitForFunction(
          () =>
            !document.querySelector('button[title="Save document"]')?.disabled,
        );
        await settle();
        await camera(210, 80, 5);
        await capture("quantum-volume", {
          field: "MO 26",
          isovalue: 0.03,
          resolution: 256,
          mode: "Volume preview",
          samplingQuality: "Fine",
        });
        await label("Rendering mode").selectOption("mesh");
      }
    }
    await open();
    await generate("density", 0.04);
    await camera(100, 80, 1);
    await set("Positive color", "#93e8d9");
    await set("Opacity", 1);
    await capture("density-solid", {
      field: "Total density",
      isovalue: 0.04,
      resolution: 256,
      camera: { dx: 100, dy: 80, zoom: 1 },
    });
    await shader("x-ray", "shaders");
    await set("maxOpacity", 0.85);
    await set("minOpacity", 0);
    await set("da", 0.03);
    await capture("quantum-xray", {
      field: "Total density",
      shader: "x-ray",
      isovalue: 0.04,
      resolution: 256,
      uniforms: { maxOpacity: 0.85, minOpacity: 0, da: 0.03 },
    });
    await page.setViewportSize({ width: 1920, height: 1280 });
    for (const title of ["Field rendering", "Appearance", "Atom colours"]) {
      const heading = page.getByRole("button", { name: title, exact: true });
      if ((await heading.getAttribute("aria-expanded")) === "true")
        await heading.click();
    }
    if (
      await page.getByLabel("Dismiss import warnings", { exact: true }).count()
    )
      await page.getByLabel("Dismiss import warnings", { exact: true }).click();
    await camera(100, 80, 0);
    await capture(
      "shader-workspace",
      { field: "Total density", shader: "x-ray" },
      true,
    );
    await page.setViewportSize({ width: 2560, height: 1800 });
    await camera(100, 80, 1);
    await shader("surface-clip");
    await set("xmin", -10);
    await set("xmax", 10);
    await set("ymin", -10);
    await set("ymax", 10);
    await set("zmin", -10);
    await set("zmax", 10);
    await label("Shader transparency").uncheck();
    await capture("quantum-unclipped", {
      field: "Total density",
      shader: "surface-clip",
      isovalue: 0.04,
      resolution: 256,
    });
    for (const xmax of [0, 0.25, 0.5]) {
      await set("xmax", xmax);
      await capture("candidate-clipped-" + xmax, {
        field: "Total density",
        shader: "surface-clip",
        isovalue: 0.04,
        resolution: 256,
        uniforms: { factor: 0.24, xmax },
      });
    }
    await set("xmax", 10);
    for (const zmax of [0, 0.25, 0.5]) {
      await set("zmax", zmax);
      await capture("candidate-clipped-z-" + zmax, {
        field: "Total density",
        shader: "surface-clip",
        isovalue: 0.04,
        resolution: 256,
        uniforms: { factor: 0.24, zmax },
      });
    }
    // Approved cutaway: preserve the density mesh and clip, orbit to reveal the rim.
    await set("Negative color", "#cb4e72");
    await label("Surface shading").evaluate((node) => {
      node.value = "diffuse";
      node.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await set("factor", 0.24);
    await set("zmax", 0.25);
    await camera(250, 80, 1);
    await capture("quantum-clipped", {
      field: "Total density",
      shader: "surface-clip",
      isovalue: 0.04,
      resolution: 256,
      camera: { fit: true, dx: 250, dy: 80, zoom: 1 },
      uniforms: {
        factor: 0.24,
        xmin: -10,
        xmax: 10,
        ymin: -10,
        ymax: 10,
        zmin: -10,
        zmax: 0.25,
      },
    });
    if (process.argv.includes("--cube")) {
      await page
        .getByRole("button", { name: "Clear shader", exact: true })
        .click();
      await open(path.join(root, "tools/site/examples/complex-field.cube"));
      for (const title of ["Field rendering", "Appearance"]) {
        const heading = page.getByRole("button", { name: title, exact: true });
        if ((await heading.getAttribute("aria-expanded")) === "false")
          await heading.click();
      }
      await set("Positive color", "#eab46c");
      await set("Opacity", 0.8);
      await label("Grid resolution").selectOption("96");
      await label("Isovalue").fill("0.65");
      await label("Rendering mode").selectOption("raycast");
      await label("Preview sampling quality").selectOption("4");
      await settle();
      await camera(120, 50, 2);
      await capture("cube-raycast", {
        input: "tools/site/examples/complex-field.cube",
        field: "Imported scalar field",
        mode: "Sampled raycast preview",
        isovalue: 0.65,
        sourceDimensions: [84, 84, 84],
        gridResolutionControl: 96,
        samplingQuality: "Fine",
      });
    }
  }
} finally {
  await browser.close();
}
