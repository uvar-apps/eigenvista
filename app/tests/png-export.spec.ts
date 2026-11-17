// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { pngPixels, scenePixels } from "./scenePixels";

type CaptureProbe = Window & { captureDraws: number };

test("PNG pixel oracle distinguishes background and signed colours with WebGL row ordering", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d")!;
    context.putImageData(
      new ImageData(
        new Uint8ClampedArray([
          0, 255, 0, 255, 232, 237, 239, 255, 255, 255, 255, 255, 255, 0, 255,
          255,
        ]),
        2,
        2,
      ),
      0,
      0,
    );
    const signed = canvas.toDataURL("image/png").split(",")[1];
    context.fillStyle = "#e8edef";
    context.fillRect(0, 0, 2, 2);
    return { signed, blank: canvas.toDataURL("image/png").split(",")[1] };
  });
  const signed = await pngPixels(page, Buffer.from(encoded.signed, "base64"));
  expect(signed).toMatchObject({
    width: 2,
    height: 2,
    total: 4,
    colorful: 2,
    positive: 1,
    negative: 1,
    bright: 1,
    foreground: 2,
    foreground12: 3,
    centerForeground: 3,
    edgePixels: 2,
    checksum: 5293,
    rgbChecksum: 11204,
  });
  const blank = await pngPixels(page, Buffer.from(encoded.blank, "base64"));
  expect(blank).toMatchObject({
    colorful: 0,
    positive: 0,
    negative: 0,
    foreground: 0,
    foreground12: 0,
    centerForeground: 0,
    edgePixels: 0,
    bright: 0,
  });
});

async function ready(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as CaptureProbe;
    state.captureDraws = 0;
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => void
    >;
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const original = prototype[name];
      prototype[name] = function (this: WebGL2RenderingContext, ...args) {
        state.captureDraws++;
        return Reflect.apply(original, this, args);
      };
    }
  });
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(250);
  expect(
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate(
        (canvas) =>
          (canvas as HTMLCanvasElement)
            .getContext("webgl2")!
            .getContextAttributes()!.preserveDrawingBuffer,
      ),
  ).toBe(false);
}

/** The redraw-on-demand scene must really be idle before export is tested. */
async function settled(page: Page) {
  await page.evaluate(async () => {
    let previous = -1,
      stable = 0;
    for (let i = 0; i < 240; i++) {
      await new Promise(requestAnimationFrame);
      const draws = (window as unknown as CaptureProbe).captureDraws;
      stable = draws === previous ? stable + 1 : 0;
      previous = draws;
      if (stable === 5) return;
    }
    throw new Error("Scene did not stop drawing");
  });
}

async function capture(page: Page, label: string) {
  const dimensions = await page
    .getByLabel("Molecular scene", { exact: true })
    .evaluate((element) => {
      const canvas = element as HTMLCanvasElement;
      return { width: canvas.width, height: canvas.height };
    });
  const before = await page.evaluate(
    () => (window as unknown as CaptureProbe).captureDraws,
  );
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  const result = await download;
  expect(result.suggestedFilename()).toBe("eigenvista-view.png");
  const file = path.resolve(
    `../artifacts/png-export-${test.info().project.name}-${label}.png`,
  );
  await result.saveAs(file);
  const bytes = readFileSync(file);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const pixels = await pngPixels(page, bytes);
  expect({ width: pixels.width, height: pixels.height }).toEqual(dimensions);
  expect(pixels.colorful).toBeGreaterThan(250);
  expect(
    await page.evaluate(() => (window as unknown as CaptureProbe).captureDraws),
  ).toBeGreaterThan(before);
  return pixels;
}

for (const mode of ["mesh", "raycast", "volume"]) {
  test(`${mode} PNG export redraws idle discarded buffers, keeps the camera, and works after zoom and mobile resize`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page);
    await page.getByLabel("Rendering mode").selectOption(mode);
    await settled(page);
    const sceneBefore = await scenePixels(page);
    const dirty = await page.getByLabel("Unsaved changes").count();
    const initial = await capture(page, `${mode}-idle`);
    expect(initial.positive).toBeGreaterThan(100);
    expect(initial.negative).toBeGreaterThan(100);
    await settled(page);
    const repeated = await capture(page, `${mode}-repeated`);
    expect(repeated.checksum).toBe(initial.checksum);
    expect((await scenePixels(page)).checksum).toBe(sceneBefore.checksum);
    expect(await page.getByLabel("Unsaved changes").count()).toBe(dirty);

    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await settled(page);
    const zoomed = await capture(page, `${mode}-zoomed`);
    expect(zoomed.checksum).not.toBe(initial.checksum);
    expect(zoomed.colorful).toBeGreaterThan(initial.colorful * 1.03);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Fit scene", exact: true }).click();
    await settled(page);
    const mobile = await capture(page, `${mode}-mobile`);
    expect(mobile.width).toBeLessThan(initial.width);
    expect(mobile.positive).toBeGreaterThan(50);
    expect(mobile.negative).toBeGreaterThan(50);
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
    await page.screenshot({
      path: `../artifacts/png-export-${test.info().project.name}-${mode}-mobile-ui.png`,
    });
  });
}

for (const failure of ["exception", "empty-image"] as const) {
  test(`PNG encoder ${failure} is visible, retains the scene, and allows a later export`, async ({
    page,
  }) => {
    await ready(page);
    await settled(page);
    const before = await scenePixels(page);
    let downloads = 0;
    page.on("download", () => downloads++);
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((canvas, failure) => {
        (canvas as HTMLCanvasElement).toDataURL = () => {
          if (failure === "empty-image") return "data:,";
          throw new DOMException(
            "Controlled PNG encoder failure",
            "SecurityError",
          );
        };
      }, failure);
    await page
      .getByRole("button", { name: "Export image", exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Unable to export the scene image:",
    );
    expect(downloads).toBe(0);
    expect((await scenePixels(page)).checksum).toBe(before.checksum);
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((canvas) => {
        Reflect.deleteProperty(canvas, "toDataURL");
      });
    const recovered = await capture(page, `encoder-${failure}-recovered`);
    expect(recovered.checksum).toBe(before.checksum);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("lost graphics contexts reject PNG export without losing the document", async ({
  page,
}) => {
  await ready(page);
  const summary = await page.locator(".document-summary").innerText();
  const surfaces = await page.locator(".surface-row").count();
  let downloads = 0;
  page.on("download", () => downloads++);
  await page
    .getByLabel("Molecular scene", { exact: true })
    .evaluate((canvas) => {
      const extension = (canvas as HTMLCanvasElement)
        .getContext("webgl2")!
        .getExtension("WEBGL_lose_context");
      if (!extension)
        throw new Error("Context-loss testing extension unavailable");
      extension.loseContext();
    });
  await expect(page.getByRole("alert")).toContainText("Graphics context lost");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to export the scene image: Error: Graphics context is lost",
  );
  expect(downloads).toBe(0);
  expect(await page.locator(".document-summary").innerText()).toBe(summary);
  expect(await page.locator(".surface-row").count()).toBe(surfaces);
});
