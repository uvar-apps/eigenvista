import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";
import { activateWidget } from "./workspace";
import {
  pngPixels,
  scenePixels,
  settleScene,
  trackSceneDraws,
} from "./scenePixels";

// Production GUI qualification: no workspace query and no automation opt-in.
async function ready(page: Page) {
  await trackSceneDraws(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(
    page.getByRole("region", { name: "Workspace tools", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => "eigenvistaControl" in window)).toBe(false);
}
async function open(page: Page, file: string) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve(file));
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${path.basename(file)}`,
  );
  await settleScene(page);
}
async function decode(page: Page, file: string): Promise<EigenVistaDocument> {
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(fs.readFileSync(file)),
  );
}
async function save(page: Page, info: TestInfo, name: string) {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  const file = info.outputPath(`${name}.eigenvista`);
  await (await download).saveAs(file);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  return { file, doc: await decode(page, file) };
}
async function exportPng(
  page: Page,
  info: TestInfo,
  name: string,
  transparent = false,
) {
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: transparent
        ? "Export image with transparent background"
        : "Export image",
      exact: true,
    })
    .click();
  const file = info.outputPath(`${name}.png`);
  await (await download).saveAs(file);
  const rgba = await page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let empty = 0,
      opaque = 0;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i] === 0) empty++;
      if (pixels[i] === 255) opaque++;
    }
    return { empty, opaque, corner: Array.from(pixels.slice(0, 4)) };
  }, fs.readFileSync(file).toString("base64"));
  expect(
    (await pngPixels(page, fs.readFileSync(file))).foreground,
  ).toBeGreaterThan(300);
  await info.attach(name, { path: file, contentType: "image/png" });
  return rgba;
}

test("default GUI displays protein representations, pastel atoms, AO and background with real transparent PNG export", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "../fixtures/bcif/1crn.bcif");
  await activateWidget(page, "document");
  const frames = new Set<number>();
  for (const representation of ["trace", "tube", "ribbon", "cartoon"]) {
    await page
      .getByLabel("Representation", { exact: true })
      .selectOption(representation);
    await expect(
      page.getByRole("status", { name: "Protein depiction status" }),
    ).not.toContainText(/Preparing|unavailable/);
    const frame = await scenePixels(page);
    expect(frame.foreground).toBeGreaterThan(300);
    frames.add(frame.checksum);
  }
  expect(frames.size).toBe(4);
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("ball-stick");
  await activateWidget(page, "atom-colours");
  await page
    .getByLabel("Atom colours file", { exact: true })
    .setInputFiles(path.resolve("../palettes/matterviz-pastel.json"));
  await expect(
    page.getByText("Overridden by matterviz-pastel.json", { exact: true }),
  ).toBeVisible();
  const off = await scenePixels(page);
  await activateWidget(page, "appearance");
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .check();
  await expect(
    page.getByLabel("Automatic AO radius", { exact: true }),
  ).toBeChecked();
  await expect
    .poll(async () => (await scenePixels(page)).checksum)
    .not.toBe(off.checksum);
  await page.getByLabel("Background color", { exact: true }).fill("#17232d");
  expect((await exportPng(page, info, "pastel-crambin-opaque")).corner).toEqual(
    [23, 35, 45, 255],
  );
  const transparent = await exportPng(
    page,
    info,
    "pastel-crambin-transparent",
    true,
  );
  expect(transparent.empty).toBeGreaterThan(1000);
  expect(transparent.corner[3]).toBe(0);
  const { doc } = await save(page, info, "crambin-production");
  expect(doc.atoms.elements).toHaveLength(327);
  expect(doc.view.representation).toBe("ball-stick");
});

test("default GUI previews Cube volume and raycast directly and saves the original scalar without cached meshes", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "../fixtures/cube/signed-affine.cube");
  await activateWidget(page, "quantum-fields");
  await expect(
    page.getByRole("heading", { name: "Sampled fields", exact: true }),
  ).toBeVisible();
  await activateWidget(page, "field-rendering");
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("24");
  await page.getByLabel("Isovalue", { exact: true }).fill("0.08");
  for (const mode of ["volume", "raycast"]) {
    await page.getByLabel("Rendering mode", { exact: true }).selectOption(mode);
    await expect(
      page.getByLabel("Rendering mode", { exact: true }),
    ).toHaveValue(mode);
    await expect
      .poll(async () => {
        const frame = await scenePixels(page);
        return frame.positive + frame.negative;
      })
      .toBeGreaterThan(100);
    expect((await save(page, info, `cube-${mode}`)).doc.surfaces).toEqual([]);
  }
  const saved = await save(page, info, "cube-production");
  expect(saved.doc.bonds).toEqual([[0, 1]]);
  expect(saved.doc.grids).toHaveLength(1);
  await open(page, saved.file);
  await activateWidget(page, "field-rendering");
  await page
    .getByLabel("Rendering mode", { exact: true })
    .selectOption("volume");
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(100);
  const reopened = await save(page, info, "cube-reopened");
  expect(reopened.doc.grids).toEqual(saved.doc.grids);
  expect(reopened.doc.surfaces).toEqual([]);
  await exportPng(page, info, "cube-production-volume");
});

test("default GUI generates a real orbital, applies custom shader files and live uniforms, and preserves cached geometry", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "../tools/site/examples/bicyclic-c7h10.molden");
  await activateWidget(page, "quantum-fields");
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  await dialog
    .getByRole("button", { name: "Clear orbital selection", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Select orbital 26", exact: true })
    .check();
  await dialog
    .getByLabel("Orbital grid resolution", { exact: true })
    .selectOption("24");
  await dialog.getByLabel("Orbital isovalue", { exact: true }).fill("0.03");
  await dialog
    .getByRole("button", { name: "Generate selected", exact: true })
    .click();
  await expect(page.locator("footer [role=status]")).toContainText("1 orbital");
  const before = await save(page, info, "orbital-unshaded");
  expect(before.doc.surfaces.length).toBeGreaterThan(0);
  const first = await scenePixels(page);
  await activateWidget(page, "surface-shader");
  for (const [kind, extension] of [
    ["vertex", "vert"],
    ["fragment", "frag"],
    ["params", "params"],
  ]) {
    await page
      .locator(`[data-shader-input="${kind}"]`)
      .setInputFiles(path.resolve(`shaders/surface-lambert.${extension}`));
  }
  await expect(page.getByLabel("saturation", { exact: true })).toHaveValue("1");
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await expect
    .poll(async () => (await scenePixels(page)).checksum)
    .not.toBe(first.checksum);
  const applied = await scenePixels(page);
  await page.getByLabel("saturation", { exact: true }).fill("0");
  await expect
    .poll(async () => (await scenePixels(page)).checksum)
    .not.toBe(applied.checksum);
  await exportPng(page, info, "production-custom-shader");
  const after = await save(page, info, "orbital-shaded");
  expect(after.doc.surfaces).toEqual(before.doc.surfaces);
  expect(after.doc.orbitals).toEqual(before.doc.orbitals);
});

test("default header conversion saves requested output while retaining the active molecular scene", async ({
  page,
}, info) => {
  await ready(page);
  const title = await page.locator(".document-title").innerText();
  const before = await scenePixels(page);
  await page
    .getByRole("button", { name: "Convert Files", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Convert Files",
    exact: true,
  });
  await dialog.getByLabel("Files to convert").setInputFiles([
    {
      name: "bicyclic.molden",
      mimeType: "text/plain",
      buffer: fs.readFileSync(
        path.resolve("../tools/site/examples/bicyclic-c7h10.molden"),
      ),
    },
    {
      name: "water.xyz",
      mimeType: "text/plain",
      buffer: Buffer.from(
        "3\nWater\nO 0 0 0\nH 0.9572 0 0\nH -0.239 0.927 0\n",
      ),
    },
  ]);
  await dialog.getByRole("button", { name: "Convert", exact: true }).click();
  await expect(dialog.getByRole("status")).toHaveText("Processed 2 files");
  await expect(dialog.locator(".conversion-item.ready")).toHaveCount(2);
  const download = page.waitForEvent("download");
  await dialog
    .getByRole("button", { name: "Save water.eigenvista", exact: true })
    .click();
  const file = info.outputPath("converted-water.eigenvista");
  await (await download).saveAs(file);
  const converted = await decode(page, file);
  expect(converted.atoms.elements).toEqual([8, 1, 1]);
  expect(converted.bonds).toHaveLength(2);
  await dialog
    .getByRole("button", { name: "Close conversion queue", exact: true })
    .click();
  await expect(page.locator(".document-title")).toHaveText(title);
  expect((await scenePixels(page)).checksum).toBe(before.checksum);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
});
