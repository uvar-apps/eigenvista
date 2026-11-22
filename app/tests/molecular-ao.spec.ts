// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";
import {
  analyticVisibility,
  cameraSeesReceiver,
  isolated,
  litNeighbors,
  molecularProbe,
  neighbors,
  receiver,
} from "./molecularAoReference";

test("molecular AO darkens geometric contacts rather than isolated patches and restores the exact legacy frame", async ({
  page,
}, info) => {
  expect(analyticVisibility(isolated, [receiver, ...neighbors])).toBe(1);
  expect(analyticVisibility(receiver, neighbors)).toBeLessThan(0.95);
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page);
  const [off, on, restored, zero] = result.frames;
  const contact = off.patches.contact - on.patches.contact;
  const alone = off.patches.isolated - on.patches.isolated;
  expect(off.patches.contact).toBeGreaterThan(10);
  expect(off.patches.isolated).toBeGreaterThan(10);
  expect(contact).toBeGreaterThan(2);
  expect(contact / off.patches.contact).toBeGreaterThanOrEqual(0.15);
  expect(alone).toBeLessThan(contact * 0.75);
  expect(on.background).toEqual(off.background);
  expect(restored.checksum).toBe(off.checksum);
  expect(zero.checksum).toBe(off.checksum);
  expect(restored.png).toBe(off.png);
  expect(zero.png).toBe(off.png);
  expect(on.materials).toEqual({
    atomsLambert: true,
    bondsLambert: true,
    atomsOriginal: false,
    bondsOriginal: false,
  });
  for (const frame of [off, restored, zero])
    expect(frame.materials).toEqual({
      atomsLambert: false,
      bondsLambert: false,
      atomsOriginal: true,
      bondsOriginal: true,
    });
  expect(result.picks).toEqual([0, 0, 0, 0]);
  expect(result.frames.every((frame) => frame.error === 0)).toBe(true);
  expect(result.afterConstructor).toEqual(result.beforeConstructor);
  for (const frame of result.frames)
    await info.attach(`${frame.label}.png`, {
      body: Buffer.from(frame.png, "base64"),
      contentType: "image/png",
    });
  await info.attach("contact-observations.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("Lambert AO gives substantial localized contact contrast under the balanced scene lighting", async ({
  page,
}, info) => {
  // A deep, visible pocket is declared independently before rendering. The
  // original shallow ambient-only fixture still has its separate unchanged gate.
  expect(analyticVisibility(isolated, [receiver, ...litNeighbors])).toBe(1);
  expect(analyticVisibility(receiver, litNeighbors)).toBeLessThan(0.7);
  expect(cameraSeesReceiver(receiver, litNeighbors)).toBe(true);
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page, "lit");
  const [off, , restored, zero, weak, full] = result.frames;
  const contact = weak.patches.contact - full.patches.contact;
  const alone = weak.patches.isolated - full.patches.isolated;
  for (const frame of result.frames)
    await info.attach(`${frame.label}.png`, {
      body: Buffer.from(frame.png, "base64"),
      contentType: "image/png",
    });
  await info.attach("directional-contact-observations.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
        contrast: { contact, alone, relative: contact / weak.patches.contact },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  expect(weak.patches.contact).toBeGreaterThan(50);
  expect(contact).toBeGreaterThanOrEqual(12);
  expect(contact / weak.patches.contact).toBeGreaterThanOrEqual(0.15);
  expect(Math.abs(alone)).toBeLessThanOrEqual(2);
  expect(alone).toBeLessThan(contact * 0.25);
  expect(full.background).toEqual(weak.background);
  expect(restored.png).toBe(off.png);
  expect(zero.png).toBe(off.png);
  expect(result.frames.every((frame) => frame.error === 0)).toBe(true);
});

test("active Lambert shading removes a positive legacy gloss signal independently of AO and restores both original roughness states", async ({
  page,
}, info) => {
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page, "matte");
  const frames = Object.fromEntries(
    result.frames.map((frame) => [frame.label, frame]),
  );
  async function difference(a: string, b: string) {
    return page.evaluate(
      async ({ a, b }) => {
        async function pixels(value: string) {
          const image = new Image();
          image.src = `data:image/png;base64,${value}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        }
        const first = await pixels(a),
          second = await pixels(b);
        let maximum = 0,
          total = 0,
          changed = 0;
        for (let i = 0; i < first.length; i++) {
          const delta = Math.abs(first[i] - second[i]);
          maximum = Math.max(maximum, delta);
          total += delta;
          if (delta) changed++;
        }
        return { maximum, mean: total / first.length, changed };
      },
      { a, b },
    );
  }
  const legacy = await difference(frames.off.png, frames["rough-off"].png);
  expect(legacy.maximum).toBeGreaterThanOrEqual(20);
  expect(legacy.changed).toBeGreaterThan(100);
  const matte = await difference(
    frames["gloss-matte"].png,
    frames["rough-matte"].png,
  );
  expect(matte.maximum).toBeLessThanOrEqual(1);
  expect(matte.mean).toBeLessThanOrEqual(0.01);
  expect(frames.restored.png).toBe(frames.off.png);
  expect(frames.zero.png).toBe(frames.off.png);
  expect(frames["gloss-restored"].png).toBe(frames.off.png);
  expect(frames["rough-restored"].png).toBe(frames["rough-off"].png);
  expect(frames["rough-zero"].png).toBe(frames["rough-off"].png);
  expect(result.frames.every((frame) => frame.error === 0)).toBe(true);
  for (const frame of result.frames)
    await info.attach(`${frame.label}.png`, {
      body: Buffer.from(frame.png, "base64"),
      contentType: "image/png",
    });
  await info.attach("matte-gloss-observations.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
        differences: { legacy, matte },
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("AO leaves field-only and opaque custom/surface pixels intact while preserving transparent molecular backdrops", async ({
  page,
}, info) => {
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page, "fields");
  const [off, on, restored, zero, transparentOff, transparentOn] =
    result.frames;
  // Positive color controls prevent an absent/blank field from satisfying the
  // preservation assertions below. Both receivers are genuine drawn fields.
  expect(off.colors.custom[2]).toBeGreaterThan(200);
  expect(off.colors.custom[2] - off.colors.custom[0]).toBeGreaterThan(100);
  expect(off.colors.custom[2] - off.colors.custom[1]).toBeGreaterThan(100);
  expect(off.colors.volume[1]).toBeGreaterThan(200);
  expect(off.colors.volume[1] - off.colors.volume[0]).toBeGreaterThan(80);
  expect(off.colors.volume[1] - off.colors.volume[2]).toBeGreaterThan(80);
  expect(off.colors.contact[2]).toBeGreaterThan(100);
  expect(off.colors.contact[0]).toBeLessThan(5);
  expect(off.colors.contact[1]).toBeLessThan(5);
  for (const frame of result.frames) {
    expect(frame.error).toBe(0);
    expect(frame.colors.custom).toEqual(off.colors.custom);
    expect(frame.colors.volume).toEqual(off.colors.volume);
    expect(frame.background).toEqual(off.background);
  }
  expect(on.colors.contact).toEqual(off.colors.contact);
  expect(on.checksum).not.toBe(off.checksum);
  expect(restored.checksum).toBe(off.checksum);
  expect(zero.checksum).toBe(off.checksum);
  expect(restored.png).toBe(off.png);
  expect(zero.png).toBe(off.png);
  expect(transparentOff.colors.contact).not.toEqual(off.colors.contact);
  expect(transparentOn.patches.contact).toBeLessThan(
    transparentOff.patches.contact,
  );
  for (const frame of result.frames)
    await info.attach(`${frame.label}.png`, {
      body: Buffer.from(frame.png, "base64"),
      contentType: "image/png",
    });
  await info.attach("recipient-observations.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

const xyz = Buffer.from(
  "4\nAO contact control\nC 1.7 0 0\nC 3.91 0 1.105\nC 1.7 2.21 1.105\nC -6.46 0 0\n",
);
type AoWindow = Window & {
  aoWorkerPosts: number;
  aoFault: {
    kind: string;
    armed: boolean;
    calls: number;
    actual: number[];
    receiverSelected: boolean;
    receiverActualLink: boolean | null;
  };
};

async function ready(page: Page) {
  await trackSceneDraws(page);
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expect(
    page.getByLabel("Atom and bond ambient occlusion", { exact: true }),
  ).not.toBeChecked();
  await openContact(page, "ao-contact.xyz");
}

async function openContact(page: Page, name: string, buffer = xyz) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles({ name, mimeType: "text/plain", buffer });
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await settleScene(page);
}

async function save(page: Page, file: string) {
  const pending = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await pending).saveAs(file);
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

async function settleAoScene(page: Page) {
  await settleScene(page);
  // Contact AO can reveal residual OrbitControls motion below its per-update
  // change threshold. Require a longer real idle interval after the drag/fit
  // sequence before comparing two separately captured current frames.
  await page.evaluate(async () => {
    let previous = -1,
      stable = 0;
    for (let frame = 0; frame < 240; frame++) {
      await new Promise(requestAnimationFrame);
      const draws = (window as unknown as Window & { sceneDraws: number })
        .sceneDraws;
      stable = draws === previous ? stable + 1 : 0;
      previous = draws;
      if (stable === 32) return;
    }
    throw new Error("AO capture did not remain idle for32 animation frames");
  });
}

async function capture(page: Page, file: string) {
  await settleAoScene(page);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  await (await pending).saveAs(file);
  const clip = await page
    .getByLabel("Molecular scene", { exact: true })
    .evaluate((node) => {
      const canvas = node as HTMLCanvasElement;
      const bounds = canvas.getBoundingClientRect();
      const ratio = devicePixelRatio;
      // A responsive CSS height can end on a fractional physical pixel. Clip
      // the compositor to the actual drawing buffer, rather than asking the
      // locator screenshot to round its bounding rectangle outwards.
      return {
        x: Math.round((bounds.x + scrollX) * ratio) / ratio,
        y: Math.round((bounds.y + scrollY) * ratio) / ratio,
        width: canvas.width / ratio,
        height: canvas.height / ratio,
      };
    });
  const visible = await page.screenshot({
    fullPage: true,
    scale: "device",
    style:
      ".viewport-tools, .scene-label, .viewport-error { visibility: hidden !important; }",
  });
  fs.writeFileSync(`${file}.compositor.png`, visible);
  const difference = await page.evaluate(
    async ({ exported, visible, clip, ratio }) => {
      async function decode(value: string, crop = false) {
        const image = new Image();
        image.src = `data:image/png;base64,${value}`;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        const x = crop ? Math.round(clip.x * ratio) : 0;
        const y = crop ? Math.round(clip.y * ratio) : 0;
        const width = crop ? Math.round(clip.width * ratio) : canvas.width;
        const height = crop ? Math.round(clip.height * ratio) : canvas.height;
        if (x + width > canvas.width || y + height > canvas.height)
          throw new Error(
            "Actual canvas extends beyond the compositor screenshot",
          );
        return {
          width,
          height,
          bytes: context.getImageData(x, y, width, height).data,
        };
      }
      const a = await decode(exported),
        b = await decode(visible, true);
      if (a.width !== b.width || a.height !== b.height)
        throw new Error(
          `PNG/compositor dimension mismatch ${a.width}x${a.height}/${b.width}x${b.height}`,
        );
      let maximum = 0,
        total = 0;
      for (let i = 0; i < a.bytes.length; i++) {
        const error = Math.abs(a.bytes[i] - b.bytes[i]);
        maximum = Math.max(maximum, error);
        total += error;
      }
      return {
        width: a.width,
        height: a.height,
        maximum,
        mean: total / a.bytes.length,
      };
    },
    {
      exported: fs.readFileSync(file).toString("base64"),
      visible: visible.toString("base64"),
      clip,
      ratio: await page.evaluate(() => devicePixelRatio),
    },
  );
  fs.writeFileSync(
    `${file}.parity.json`,
    JSON.stringify({ clip, difference }, null, 2),
  );
  expect(difference.maximum).toBeLessThanOrEqual(2);
  expect(difference.mean).toBeLessThanOrEqual(0.1);
  return { bytes: fs.readFileSync(file), difference };
}

test("the real AO controls are session-only and preserve clean documents and scientific worker traffic", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = window as unknown as AoWindow;
    state.aoWorkerPosts = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      state.aoWorkerPosts++;
      original.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await ready(page);
  const baseline = await save(page, info.outputPath("ao-before.eigenvista"));
  const off = await scenePixels(page);
  await page.evaluate(() => {
    (window as unknown as AoWindow).aoWorkerPosts = 0;
  });
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .check();
  await expect(page.getByLabel("AO strength", { exact: true })).toHaveValue(
    "1",
  );
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("1.5");
  const automatic = page.getByLabel("Automatic AO radius", { exact: true });
  await expect(automatic).toBeChecked();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toBeDisabled();
  for (const [name, min, max, step] of [
    ["AO strength", "0", "1", "0.05"],
    ["AO radius (angstrom)", "0.25", "50", "0.25"],
  ]) {
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      "min",
      min,
    );
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      "max",
      max,
    );
    await expect(page.getByLabel(name, { exact: true })).toHaveAttribute(
      "step",
      step,
    );
  }
  await settleScene(page);
  const enabled = await scenePixels(page);
  expect(enabled.checksum).not.toBe(off.checksum);
  await page.getByLabel("AO strength", { exact: true }).press("Home");
  await expect(page.getByLabel("AO strength", { exact: true })).toHaveValue(
    "0",
  );
  await settleScene(page);
  expect((await scenePixels(page)).checksum).toBe(off.checksum);
  await page.getByLabel("AO strength", { exact: true }).press("End");
  await automatic.uncheck();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("1.5");
  await page.getByLabel("AO radius (angstrom)", { exact: true }).press("End");
  await settleScene(page);
  await expect(page.locator(".dirty")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as AoWindow).aoWorkerPosts),
  ).toBe(0);
  expect(await save(page, info.outputPath("ao-after.eigenvista"))).toEqual(
    baseline,
  );
  await openContact(page, "ao-next.xyz");
  await expect(
    page.getByLabel("Atom and bond ambient occlusion", { exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("50");
  await expect(automatic).not.toBeChecked();
  await automatic.check();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("1.5");
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toBeDisabled();
  page.once("dialog", (dialog) => dialog.accept());
  await openContact(
    page,
    "ao-automatic-scale.xyz",
    Buffer.from("2\nKnown200angstrom atom extent\nC -100 0 0\nC 100 0 0\n"),
  );
  await expect(automatic).toBeChecked();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("10");
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toBeDisabled();
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expect(
    page.getByLabel("Atom and bond ambient occlusion", { exact: true }),
  ).not.toBeChecked();
  await expect(page.getByLabel("AO strength", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("AO desktop PNGs match the actual current compositor when idle, repeated and zoomed at HiDPI", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 900, height: 650 },
    deviceScaleFactor: 2,
    baseURL: "http://127.0.0.1:5178",
  });
  try {
    const page = await context.newPage();
    await ready(page);
    await page
      .getByLabel("Atom and bond ambient occlusion", { exact: true })
      .check();
    const first = await capture(page, info.outputPath("ao-idle.png"));
    const repeated = await capture(page, info.outputPath("ao-repeated.png"));
    expect(repeated.bytes).toEqual(first.bytes);
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    const zoomed = await capture(page, info.outputPath("ao-zoomed.png"));
    expect(zoomed.bytes).not.toEqual(first.bytes);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await info.attach("png-compositor-parity.json", {
      body: JSON.stringify([
        first.difference,
        repeated.difference,
        zoomed.difference,
      ]),
      contentType: "application/json",
    });
  } finally {
    await context.close();
  }
});

test("bounded AO PNGs match the actual current compositor after orbit, HiDPI resize and strength changes", async ({
  browser,
}, info) => {
  const context = await browser.newContext({
    viewport: { width: 900, height: 650 },
    deviceScaleFactor: 2,
    baseURL: "http://127.0.0.1:5178",
  });
  try {
    const page = await context.newPage();
    await ready(page);
    // Bound only this interaction diagnostic's rendering work on software
    // GPUs. The real toolbar/layout remains full-sized; the separate desktop
    // case keeps all three original full-resolution PNG samples.
    await page.addStyleTag({
      content: `
        .scene[data-testid="viewport"] {
          right: auto;
          bottom: auto;
          width: 240px;
          height: 128px;
        }
        @media (max-width: 720px) {
          .scene[data-testid="viewport"] {
            width: 160px;
            height: 160px;
          }
        }
      `,
    });
    await expect
      .poll(() =>
        page
          .getByLabel("Molecular scene", { exact: true })
          .evaluate((node) => ({
            width: (node as HTMLCanvasElement).width,
            height: (node as HTMLCanvasElement).height,
          })),
      )
      .toEqual({ width: 480, height: 256 });
    await page
      .getByLabel("Atom and bond ambient occlusion", { exact: true })
      .check();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await settleAoScene(page);
    const beforeResize = await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((node) => ({
        width: (node as HTMLCanvasElement).width,
        height: (node as HTMLCanvasElement).height,
      }));
    expect(beforeResize).toEqual({ width: 480, height: 256 });
    const canvas = (await page
      .getByLabel("Molecular scene", { exact: true })
      .boundingBox())!;
    await page.mouse.move(
      canvas.x + canvas.width / 2,
      canvas.y + canvas.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(
      canvas.x + canvas.width / 2 + 30,
      canvas.y + canvas.height / 2 + 15,
      { steps: 3 },
    );
    await page.mouse.up();
    // Keep the original responsive browser layout while the fixture's render
    // host changes aspect and size through the real viewport resize.
    await page.setViewportSize({ width: 390, height: 850 });
    await page.getByRole("button", { name: "Fit scene", exact: true }).click();
    const resized = await capture(page, info.outputPath("ao-mobile-hidpi.png"));
    expect(resized.difference).toMatchObject({ width: 320, height: 320 });
    expect(resized.difference.width).toBeLessThan(beforeResize.width);
    await page.getByLabel("AO strength", { exact: true }).press("Home");
    const zero = await capture(page, info.outputPath("ao-zero-strength.png"));
    expect(zero.difference).toMatchObject({ width: 320, height: 320 });
    expect(zero.bytes).not.toEqual(resized.bytes);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await info.attach("png-compositor-parity.json", {
      body: JSON.stringify([resized.difference, zero.difference]),
      contentType: "application/json",
    });
    await page.screenshot({
      path: info.outputPath("ao-mobile-ui.png"),
      fullPage: true,
    });
  } finally {
    await context.close();
  }
});

test("AO targets are lazy, sized to device capabilities and released through resize and toggle cycles", async ({
  page,
}, info) => {
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page, "resources");
  const byName = Object.fromEntries(
    result.frames.map((frame) => [frame.label, frame]),
  );
  expect(result.afterConstructor).toEqual(result.beforeConstructor);
  for (const name of [
    "restored",
    "zero",
    "off-again",
    "cycle-off",
    "first-off",
    "first-off-again",
  ]) {
    expect(byName[name].resources.textures).toBe(byName.off.resources.textures);
    expect(byName[name].resources.framebuffers).toBe(
      byName.off.resources.framebuffers,
    );
    expect(byName[name].png).toBe(byName.off.png);
  }
  for (const name of ["on-first", "first-on-again"]) {
    expect(
      byName["first-off"].patches.contact - byName[name].patches.contact,
    ).toBeGreaterThan(2);
    expect(byName[name].background).toEqual(byName.off.background);
  }
  expect(
    byName.capped.resources.allocations.some(
      (size) => size.width === 2200 && size.height === 256,
    ),
  ).toBe(true);
  expect(
    byName.capped.resources.allocations.every(
      (size) => Math.max(size.width, size.height) <= 2200,
    ),
  ).toBe(true);
  expect(
    byName["small-again"].resources.allocations.some(
      (size) => size.width === 256 && size.height === 256,
    ),
  ).toBe(true);
  expect(byName["off-again"].resources.programs).toBe(
    byName["cycle-off"].resources.programs,
  );
  expect(result.afterDispose.textures).toBe(byName.off.resources.textures);
  expect(result.frames.every((frame) => frame.error === 0)).toBe(true);
  await info.attach("resources.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
});

test("injected FBO and driver-link failures retain the scene and recover on new inputs and Off", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = window as unknown as AoWindow;
    state.aoFault = {
      kind: "",
      armed: false,
      calls: 0,
      actual: [],
      receiverSelected: false,
      receiverActualLink: null,
    };
    const prototype = WebGL2RenderingContext.prototype;
    const status = prototype.checkFramebufferStatus;
    prototype.checkFramebufferStatus = function (target) {
      const actual = status.call(this, target);
      if (state.aoFault.armed && state.aoFault.kind === "fbo") {
        state.aoFault.calls++;
        state.aoFault.actual.push(actual);
        return this.FRAMEBUFFER_UNSUPPORTED;
      }
      return actual;
    };
    const parameter = prototype.getProgramParameter;
    prototype.getProgramParameter = function (program, name) {
      const actual = parameter.call(this, program, name);
      if (
        state.aoFault.armed &&
        state.aoFault.kind === "link" &&
        name === this.LINK_STATUS &&
        this.getAttachedShaders(program)?.some((shader) =>
          this.getShaderSource(shader)?.includes("eigenvistaMolecularAo"),
        )
      ) {
        // Select the actual molecular receiver program, leaving normal/GTAO
        // producer linking untouched. Record the real driver's result first.
        state.aoFault.receiverSelected = true;
        state.aoFault.receiverActualLink = Boolean(actual);
        state.aoFault.armed = false;
        state.aoFault.calls++;
        return false;
      }
      return actual;
    };
  });
  await ready(page);
  const initial = await scenePixels(page);
  await page.evaluate(() =>
    Object.assign((window as unknown as AoWindow).aoFault, {
      kind: "fbo",
      armed: true,
    }),
  );
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .check();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to apply atom and bond ambient occlusion:",
  );
  await page.evaluate(() => {
    (window as unknown as AoWindow).aoFault.armed = false;
  });
  await settleScene(page);
  expect((await scenePixels(page)).checksum).toBe(initial.checksum);
  page.once("dialog", (dialog) => dialog.accept());
  await openContact(page, "ao-recover.xyz");
  await expect(
    page.getByLabel("Atom and bond ambient occlusion", { exact: true }),
  ).toBeChecked();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await scenePixels(page)).checksum).not.toBe(initial.checksum);
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .uncheck();
  await settleScene(page);
  const beforeLink = await scenePixels(page);
  await page.evaluate(() =>
    Object.assign((window as unknown as AoWindow).aoFault, {
      kind: "link",
      armed: true,
    }),
  );
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .check();
  await expect(page.getByRole("alert")).toContainText(
    "Unable to apply atom and bond ambient occlusion:",
  );
  await settleScene(page);
  expect((await scenePixels(page)).checksum).toBe(beforeLink.checksum);
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .uncheck();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByLabel("Atom and bond ambient occlusion", { exact: true })
    .check();
  await settleScene(page);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect((await scenePixels(page)).checksum).not.toBe(beforeLink.checksum);
  const fault = await page.evaluate(
    () => (window as unknown as AoWindow).aoFault,
  );
  expect(fault.calls).toBeGreaterThanOrEqual(2);
  expect(fault.receiverSelected).toBe(true);
  expect(fault.receiverActualLink).toBe(true);
  await info.attach("injected-faults-not-hardware-exhaustion.json", {
    body: JSON.stringify(fault),
    contentType: "application/json",
  });
});

test("dense molecular AO retains instancing and bounded targets instead of per-atom draws", async ({
  page,
}, info) => {
  await page.goto("/?workspace=legacy");
  const result = await molecularProbe(page, "dense");
  const [off, on, restored, zero] = result.frames;
  expect(result.counts).toEqual({ atoms: 512, bonds: 511 });
  expect(off.instancedDraws).toBe(2);
  expect(on.instancedDraws).toBe(4);
  expect(on.ordinaryDraws).toBe(2);
  expect(on.resources.textures).toBeLessThanOrEqual(off.resources.textures + 8);
  expect(on.resources.framebuffers).toBeLessThanOrEqual(
    off.resources.framebuffers + 4,
  );
  expect(off.foreground).toBeGreaterThan(1000);
  expect(on.foreground).toBe(off.foreground);
  expect(on.background).toEqual(off.background);
  expect(on.checksum).not.toBe(off.checksum);
  expect(restored.checksum).toBe(off.checksum);
  expect(zero.checksum).toBe(off.checksum);
  expect(restored.png).toBe(off.png);
  expect(zero.png).toBe(off.png);
  expect(result.frames.every((frame) => frame.error === 0)).toBe(true);
  await info.attach("dense-observations.json", {
    body: JSON.stringify(
      {
        ...result,
        frames: result.frames.map(({ png: _png, ...frame }) => frame),
      },
      null,
      2,
    ),
    contentType: "application/json",
  });
  await info.attach("dense-on.png", {
    body: Buffer.from(on.png, "base64"),
    contentType: "image/png",
  });
});
