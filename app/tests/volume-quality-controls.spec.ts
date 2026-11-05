import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";

type QualityProbe = Window & { qualityActions: string[] };

async function saveDocument(page: Page, filename: string) {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await download).saveAs(filename);
  await expect(page.locator("footer [role=status]")).toContainText(
    "Saved quantum data, surfaces and appearance",
  );
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  return page.evaluate(
    async (bytes): Promise<EigenVistaDocument> => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(filename)),
  );
}

async function signedPixels(page: Page) {
  return page.locator("canvas").evaluate((canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2")!;
    const values = new Uint8Array(
      gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
    );
    gl.readPixels(
      0,
      0,
      gl.drawingBufferWidth,
      gl.drawingBufferHeight,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      values,
    );
    let positive = 0,
      negative = 0;
    for (let i = 0; i < values.length; i += 4) {
      if (values[i + 1] > values[i] + 20 && values[i + 1] > values[i + 2] + 8)
        positive++;
      if (values[i] > values[i + 1] + 20 && values[i + 2] > values[i + 1] + 8)
        negative++;
    }
    return { positive, negative };
  });
}

test("preview quality is a responsive session preference without worker jobs or document edits", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(() => {
    const state = window as unknown as QualityProbe;
    state.qualityActions = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      if (typeof message.action === "string")
        state.qualityActions.push(message.action);
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/cube/signed-affine.cube"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened signed-affine.cube",
  );
  await expect(page.getByLabel("Rendering mode")).toHaveValue("volume");
  const quality = page.getByLabel("Preview sampling quality", { exact: true });
  await expect(quality).toHaveValue("2");
  await expect(quality.locator("option:checked")).toHaveText("Standard");
  const resolution = await page
    .getByLabel("Grid resolution", { exact: true })
    .inputValue();
  const before = await saveDocument(
    page,
    path.resolve(
      `../artifacts/volume-quality-${testInfo.project.name}-before.eigenvista`,
    ),
  );
  expect(before.surfaces).toEqual([]);
  expect(before.grids).toHaveLength(1);
  expect(before.view.field).toBe(before.grids[0].id);
  const start = await page.evaluate(
    () => (window as unknown as QualityProbe).qualityActions.length,
  );

  const unchanged = async () => {
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
    await expect(page.locator(".surface-row")).toHaveCount(0);
    await expect(
      page.getByLabel("Grid resolution", { exact: true }),
    ).toHaveValue(resolution);
    expect(
      await page.evaluate(
        (start) =>
          (window as unknown as QualityProbe).qualityActions.slice(start),
        start,
      ),
    ).toEqual([]);
  };
  await quality.selectOption("1");
  await expect(quality.locator("option:checked")).toHaveText("Draft");
  await unchanged();
  await quality.selectOption("4");
  await expect(quality.locator("option:checked")).toHaveText("Fine");
  await page.getByLabel("Rendering mode").selectOption("raycast");
  await expect(quality).toHaveValue("4");
  await unchanged();
  await expect
    .poll(async () => (await signedPixels(page)).positive)
    .toBeGreaterThan(100);
  await expect
    .poll(async () => (await signedPixels(page)).negative)
    .toBeGreaterThan(100);
  await page.screenshot({
    path: `../artifacts/volume-quality-${testInfo.project.name}-desktop.png`,
  });

  await page.getByLabel("Rendering mode").selectOption("mesh");
  await expect(quality).toHaveCount(0);
  await unchanged();
  await page.getByLabel("Rendering mode").selectOption("volume");
  await expect(quality).toHaveValue("4");
  await quality.selectOption("1");
  await page.getByLabel("Rendering mode").selectOption("raycast");
  await expect(quality).toHaveValue("1");
  await page.getByLabel("Rendering mode").selectOption("volume");
  await expect(quality).toHaveValue("1");
  await unchanged();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await quality.selectOption("4");
  await expect(quality).toHaveValue("4");
  await expect
    .poll(async () => (await signedPixels(page)).positive)
    .toBeGreaterThan(35);
  await expect
    .poll(async () => (await signedPixels(page)).negative)
    .toBeGreaterThan(35);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const box = (await quality.boundingBox())!;
  const panel = (await page.locator(".right-panel").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(panel.x);
  expect(box.x + box.width).toBeLessThanOrEqual(panel.x + panel.width);
  const scene = (await page.locator("canvas").boundingBox())!;
  const controls = (await page.locator(".left-panel").boundingBox())!;
  expect(scene.y + scene.height).toBeLessThanOrEqual(controls.y);
  await page.screenshot({
    path: `../artifacts/volume-quality-${testInfo.project.name}-mobile.png`,
    fullPage: true,
  });
  await unchanged();

  const after = await saveDocument(
    page,
    path.resolve(
      `../artifacts/volume-quality-${testInfo.project.name}-after.eigenvista`,
    ),
  );
  expect(after).toEqual(before);
  expect(after.view.field).toBe(before.view.field);
  expect(after.grids[0].dims).toEqual(before.grids[0].dims);
  expect(
    await page.evaluate(
      (start) =>
        (window as unknown as QualityProbe).qualityActions.slice(start),
      start,
    ),
  ).toEqual(["encode"]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
