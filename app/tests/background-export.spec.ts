import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";

const opaqueName = "Export image";
const transparentName = "Export image with transparent background";
type BackgroundProbe = Window & {
  sceneDraws: number;
  backgroundProbe: { workerPosts: number; bufferUploads: number };
};

/** Observe real registration and geometry uploads, without replacing workers. */
async function ready(page: Page, bounded = true) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as BackgroundProbe;
    state.backgroundProbe = { workerPosts: 0, bufferUploads: 0 };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      state.backgroundProbe.workerPosts++;
      return Reflect.apply(post, this, args);
    };
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => void
    >;
    const upload = prototype.bufferData;
    prototype.bufferData = function (this: WebGL2RenderingContext, ...args) {
      state.backgroundProbe.bufferUploads++;
      return Reflect.apply(upload, this, args);
    };
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  if (bounded) {
    await page.addStyleTag({
      content:
        ".scene { width:360px !important; height:260px !important; right:auto !important; bottom:auto !important; }",
    });
    await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  }
  await settleScene(page);
  const attributes = await page
    .getByLabel("Molecular scene", { exact: true })
    .evaluate((element) =>
      (element as HTMLCanvasElement)
        .getContext("webgl2")!
        .getContextAttributes(),
    );
  expect(attributes).toMatchObject({
    alpha: true,
    preserveDrawingBuffer: false,
  });
}

/** Native color dialogs are outside headless automation; dispatch real input. */
async function background(page: Page, color: string) {
  const input = page.getByLabel("Background color", { exact: true });
  await input.evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    setter.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }, color);
  await expect(input).toHaveValue(color);
  await settleScene(page);
}

/** Decode actual PNG bytes independently of WebGL backbuffer contents. */
async function rgba(page: Page, bytes: Buffer) {
  return page.evaluate(async (encoded) => {
    const image = new Image();
    image.src = `data:image/png;base64,${encoded}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let empty = 0,
      opaque = 0,
      partial = 0,
      positive = 0,
      negative = 0;
    let opaqueWhite = 0,
      checksum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      const [r, g, b, a] = pixels.subarray(i, i + 4);
      if (a === 0) empty++;
      else {
        if (a === 255) opaque++;
        else partial++;
        if (g > r + 20 && g > b + 8) positive++;
        if (r > g + 20 && b > g + 8) negative++;
        if (a === 255 && Math.min(r, g, b) > 240) opaqueWhite++;
      }
      checksum =
        (checksum + r * ((i % 97) + 1) + g * 3 + b * 7 + a * 11) % 2147483647;
    }
    const indices = [
      0,
      canvas.width - 1,
      (canvas.height - 1) * canvas.width,
      canvas.width * canvas.height - 1,
    ];
    return {
      width: canvas.width,
      height: canvas.height,
      total: pixels.length / 4,
      empty,
      opaque,
      partial,
      positive,
      negative,
      opaqueWhite,
      checksum,
      corners: indices.map((index) =>
        Array.from(pixels.subarray(index * 4, index * 4 + 4)),
      ),
    };
  }, bytes.toString("base64"));
}

/** Verify alpha by compositing decoded foreground independently over known RGB. */
async function compositeDifference(
  page: Page,
  transparent: Buffer,
  opaque: Buffer,
  color: string,
) {
  return page.evaluate(
    async ({ transparent, opaque, color }) => {
      async function decode(encoded: string) {
        const image = new Image();
        image.src = `data:image/png;base64,${encoded}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return {
          width: canvas.width,
          height: canvas.height,
          pixels: context.getImageData(0, 0, canvas.width, canvas.height).data,
        };
      }
      const first = await decode(transparent),
        second = await decode(opaque);
      if (first.width !== second.width || first.height !== second.height)
        throw Error("Different PNG dimensions");
      const background = [1, 3, 5].map((start) =>
        parseInt(color.slice(start, start + 2), 16),
      );
      let maximum = 0,
        total = 0,
        nonOpaque = 0;
      for (let i = 0; i < first.pixels.length; i += 4) {
        const alpha = first.pixels[i + 3] / 255;
        if (second.pixels[i + 3] !== 255) nonOpaque++;
        for (let channel = 0; channel < 3; channel++) {
          const expected = Math.round(
            first.pixels[i + channel] * alpha +
              background[channel] * (1 - alpha),
          );
          const difference = Math.abs(expected - second.pixels[i + channel]);
          maximum = Math.max(maximum, difference);
          total += difference;
        }
      }
      return {
        maximum,
        mean: total / ((first.pixels.length / 4) * 3),
        nonOpaque,
      };
    },
    {
      transparent: transparent.toString("base64"),
      opaque: opaque.toString("base64"),
      color,
    },
  );
}

async function clearState(page: Page) {
  return page
    .getByLabel("Molecular scene", { exact: true })
    .evaluate((node) => {
      const gl = (node as HTMLCanvasElement).getContext("webgl2")!;
      return {
        color: Array.from(
          gl.getParameter(gl.COLOR_CLEAR_VALUE) as Float32Array,
        ),
        error: gl.getError(),
        width: (node as HTMLCanvasElement).width,
        height: (node as HTMLCanvasElement).height,
      };
    });
}

/** Retain downloads in per-case/per-engine output, including original alpha. */
async function capture(page: Page, transparent: boolean, label: string) {
  await settleScene(page);
  const dimensions = await clearState(page);
  const before = await page.evaluate(
    () => (window as unknown as BackgroundProbe).sceneDraws,
  );
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: transparent ? transparentName : opaqueName,
      exact: true,
    })
    .click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe(
    transparent ? "eigenvista-view-transparent.png" : "eigenvista-view.png",
  );
  const file = test.info().outputPath(label + ".png");
  await download.saveAs(file);
  const bytes = fs.readFileSync(file);
  expect([...bytes.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  const stats = await rgba(page, bytes);
  expect({ width: stats.width, height: stats.height }).toEqual({
    width: dimensions.width,
    height: dimensions.height,
  });
  expect((await clearState(page)).error).toBe(0);
  const draws =
    (await page.evaluate(
      () => (window as unknown as BackgroundProbe).sceneDraws,
    )) - before;
  expect(draws).toBeGreaterThan(0);
  return { bytes, stats, draws };
}

function expectOpaqueBackground(
  stats: Awaited<ReturnType<typeof rgba>>,
  color: string,
) {
  const rgb = [1, 3, 5].map((start) =>
    parseInt(color.slice(start, start + 2), 16),
  );
  expect(stats.opaque).toBe(stats.total);
  for (const corner of stats.corners) expect(corner).toEqual([...rgb, 255]);
}

async function expectComposite(
  page: Page,
  transparent: Buffer,
  opaque: Buffer,
  color: string,
) {
  const difference = await compositeDifference(
    page,
    transparent,
    opaque,
    color,
  );
  // Each capture uses RGBA8 blending and PNG unpremultiplication. Three byte
  // levels bound their rounding; a mean gate rejects a broad systematic drift.
  expect(difference.nonOpaque).toBe(0);
  expect(difference.maximum).toBeLessThanOrEqual(3);
  expect(difference.mean).toBeLessThanOrEqual(0.35);
}

test("the RGBA oracle distinguishes empty, opaque white and fractional signed pixels", async ({
  page,
}) => {
  await page.goto("/");
  const encoded = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 2;
    const context = canvas.getContext("2d")!;
    function encode(pixels: number[]) {
      context.putImageData(
        new ImageData(new Uint8ClampedArray(pixels), 2, 2),
        0,
        0,
      );
      return canvas.toDataURL("image/png").split(",")[1];
    }
    return {
      transparent: encode([
        0, 0, 0, 0, 255, 255, 255, 255, 255, 0, 255, 128, 0, 255, 0, 64,
      ]),
      // Fixed independent expectations for the above samples over #204060.
      // Do not generate this control using the compositing helper/formula.
      opaque: encode([
        32, 64, 96, 255, 255, 255, 255, 255, 144, 32, 176, 255, 24, 112, 72,
        255,
      ]),
    };
  });
  const transparent = Buffer.from(encoded.transparent, "base64");
  const opaque = Buffer.from(encoded.opaque, "base64");
  expect(await rgba(page, transparent)).toMatchObject({
    width: 2,
    height: 2,
    total: 4,
    empty: 1,
    opaque: 1,
    partial: 2,
    opaqueWhite: 1,
    positive: 1,
    negative: 1,
  });
  expect(
    await compositeDifference(page, transparent, opaque, "#204060"),
  ).toEqual({ maximum: 0, mean: 0, nonOpaque: 0 });
  const wrongBackground = await compositeDifference(
    page,
    transparent,
    opaque,
    "#c08040",
  );
  expect(wrongBackground.maximum).toBeGreaterThan(50);
  expect(wrongBackground.mean).toBeGreaterThan(10);
});

test("background edits and reset redraw real pixels without geometry, worker or document changes", async ({
  page,
}) => {
  await ready(page);
  const original = await capture(page, false, "default-background");
  expectOpaqueBackground(original.stats, "#e8edef");
  const state = await page.evaluate(() => ({
    ...(window as unknown as BackgroundProbe).backgroundProbe,
  }));
  const summary = await page.locator(".document-summary").innerText();
  const dirty = await page.getByLabel("Unsaved changes").count();
  await background(page, "#20354a");
  const changed = await capture(page, false, "selected-background");
  expectOpaqueBackground(changed.stats, "#20354a");
  expect(changed.stats.checksum).not.toBe(original.stats.checksum);
  expect(
    await page.evaluate(
      () => (window as unknown as BackgroundProbe).backgroundProbe,
    ),
  ).toEqual(state);
  expect(await page.locator(".document-summary").innerText()).toBe(summary);
  expect(await page.getByLabel("Unsaved changes").count()).toBe(dirty);
  await page
    .getByRole("button", { name: "Reset background color", exact: true })
    .click();
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#e8edef");
  const restored = await capture(page, false, "reset-background");
  expect(restored.stats.checksum).toBe(original.stats.checksum);
  expect(
    await page.evaluate(
      () => (window as unknown as BackgroundProbe).backgroundProbe,
    ),
  ).toEqual(state);
});

for (const mode of ["mesh", "raycast", "volume"]) {
  test(`${mode} transparent PNG retains signed foreground and composites over the selected background`, async ({
    page,
  }) => {
    await ready(page);
    await page.getByLabel("Rendering mode").selectOption(mode);
    await expect(page.getByLabel("Rendering mode")).toHaveValue(mode);
    await background(page, "#294257");
    const before = await capture(page, false, mode + "-opaque");
    const visible = await scenePixels(page);
    const state = await clearState(page);
    const dirty = await page.getByLabel("Unsaved changes").count();
    const transparent = await capture(page, true, mode + "-transparent");
    expect(transparent.stats.empty).toBeGreaterThan(
      transparent.stats.total * 0.1,
    );
    expect(transparent.stats.partial).toBeGreaterThan(100);
    expect(transparent.stats.positive).toBeGreaterThan(50);
    expect(transparent.stats.negative).toBeGreaterThan(50);
    expect(transparent.stats.corners.every((pixel) => pixel[3] === 0)).toBe(
      true,
    );
    expect(transparent.draws).toBeGreaterThanOrEqual(before.draws * 2);
    await expectComposite(page, transparent.bytes, before.bytes, "#294257");
    expect(await clearState(page)).toEqual(state);
    expect((await scenePixels(page)).rgbChecksum).toBe(visible.rgbChecksum);
    expect(await page.getByLabel("Unsaved changes").count()).toBe(dirty);
    const after = await capture(page, false, mode + "-after-transparent");
    expect(after.stats.checksum).toBe(before.stats.checksum);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    const zoomed = await capture(page, true, mode + "-transparent-zoomed");
    expect(zoomed.stats.checksum).not.toBe(transparent.stats.checksum);
    expect(zoomed.stats.positive + zoomed.stats.negative).toBeGreaterThan(
      transparent.stats.positive + transparent.stats.negative,
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("transparent export preserves real molecular ambient occlusion and restores its background", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/bcif/1crn.cif"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1crn.cif",
  );
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await background(page, "#243343");
  const off = await capture(page, false, "1crn-ao-off");
  await page.getByLabel("Ambient occlusion", { exact: true }).check();
  const on = await capture(page, false, "1crn-ao-on");
  expect(on.stats.checksum).not.toBe(off.stats.checksum);
  const state = await clearState(page);
  const transparent = await capture(page, true, "1crn-ao-transparent");
  expect(transparent.stats.empty).toBeGreaterThan(100);
  expect(transparent.stats.opaque).toBeGreaterThan(500);
  expect(transparent.stats.partial).toBeGreaterThan(20);
  await expectComposite(page, transparent.bytes, on.bytes, "#243343");
  expect(await clearState(page)).toEqual(state);
  const after = await capture(page, false, "1crn-ao-restored");
  expect(after.stats.checksum).toBe(on.stats.checksum);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("white atoms remain opaque when exported from a white background", async ({
  page,
}) => {
  await ready(page);
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "white-atoms.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "3\nWater\nO 0 0 0\nH 0.757 0.586 0\nH -0.757 0.586 0\n",
    ),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened white-atoms.xyz",
  );
  await page.getByLabel("Atom colours file", { exact: true }).setInputFiles({
    name: "white-atom-colors.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "eigenvista-atom-colors",
        version: 1,
        colors: [
          { z: 1, color: "#ffffff" },
          { z: 8, color: "#ffffff" },
        ],
      }),
    ),
  });
  await expect(
    page.getByText(/Overridden by white-atom-colors\.json/),
  ).toBeVisible();
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await background(page, "#ffffff");
  const opaque = await capture(page, false, "white-atoms-opaque");
  const transparent = await capture(page, true, "white-atoms-transparent");
  expect(transparent.stats.empty).toBeGreaterThan(100);
  expect(transparent.stats.opaqueWhite).toBeGreaterThan(100);
  expect(transparent.stats.partial).toBeGreaterThan(20);
  await expectComposite(page, transparent.bytes, opaque.bytes, "#ffffff");
});

for (const failure of ["exception", "empty-image"] as const) {
  test(`transparent encoder ${failure} restores the selected scene and permits retry`, async ({
    page,
  }) => {
    await ready(page);
    await background(page, "#294257");
    const before = await capture(page, false, failure + "-before");
    const visible = await scenePixels(page);
    const state = await clearState(page);
    const dirty = await page.getByLabel("Unsaved changes").count();
    let downloads = 0;
    page.on("download", () => downloads++);
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((element, kind) => {
        (element as HTMLCanvasElement).toDataURL = () => {
          if (kind === "empty-image") return "data:,";
          throw new DOMException(
            "Controlled transparent PNG encoder failure",
            "SecurityError",
          );
        };
      }, failure);
    await page
      .getByRole("button", { name: transparentName, exact: true })
      .click();
    await expect(page.getByRole("alert")).toContainText(
      "Unable to export the scene image:",
    );
    expect(downloads).toBe(0);
    expect(await clearState(page)).toEqual(state);
    expect((await scenePixels(page)).rgbChecksum).toBe(visible.rgbChecksum);
    expect(await page.getByLabel("Unsaved changes").count()).toBe(dirty);
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((element) => {
        Reflect.deleteProperty(element, "toDataURL");
      });
    const retry = await capture(page, true, failure + "-transparent-retry");
    expect(retry.stats.empty).toBeGreaterThan(100);
    const after = await capture(page, false, failure + "-ordinary-retry");
    expect(after.stats.checksum).toBe(before.stats.checksum);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("mobile HiDPI background and export controls remain visible without horizontal overflow", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    baseURL: "http://127.0.0.1:5178",
  });
  try {
    const page = await context.newPage();
    await ready(page, false);
    await background(page, "#f4e6dd");
    for (const name of [opaqueName, transparentName, "Reset background color"])
      await expect(
        page.getByRole("button", { name, exact: true }),
      ).toBeVisible();
    await expect(
      page.getByLabel("Background color", { exact: true }),
    ).toBeVisible();
    const bounds = await page.locator(".viewport-tools").boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
    expect(
      await page.locator("body").evaluate((body) => body.scrollWidth),
    ).toBeLessThanOrEqual(390);
    const opaque = await capture(page, false, "mobile-hidpi-opaque");
    expect(opaque.stats.width).toBe(780);
    const transparent = await capture(page, true, "mobile-hidpi-transparent");
    expect(transparent.stats.empty).toBeGreaterThan(100);
    await expectComposite(page, transparent.bytes, opaque.bytes, "#f4e6dd");
    await page.screenshot({
      path: test.info().outputPath("background-toolbar-mobile.png"),
    });
  } finally {
    await context.close();
  }
});

test("lost graphics contexts reject transparent export while retaining the document", async ({
  page,
}) => {
  await ready(page);
  const summary = await page.locator(".document-summary").innerText();
  const surfaces = await page.locator(".surface-row").count();
  let downloads = 0;
  page.on("download", () => downloads++);
  await page.getByLabel("Molecular scene", { exact: true }).evaluate((node) => {
    const extension = (node as HTMLCanvasElement)
      .getContext("webgl2")!
      .getExtension("WEBGL_lose_context");
    if (!extension) throw Error("Context-loss extension unavailable");
    extension.loseContext();
  });
  await expect(page.getByRole("alert")).toContainText("Graphics context lost");
  await page
    .getByRole("button", { name: transparentName, exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to export the scene image: Error: Graphics context is lost",
  );
  expect(downloads).toBe(0);
  expect(await page.locator(".document-summary").innerText()).toBe(summary);
  expect(await page.locator(".surface-row").count()).toBe(surfaces);
});
