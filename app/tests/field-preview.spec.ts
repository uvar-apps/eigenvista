import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";

type Probe = {
  requests: { action: string; field?: string; resolution?: number }[];
  meshing: number;
  samples: { field: string; dims: number[]; count: number }[];
  sampling: boolean;
  completed: boolean;
  terminated: boolean;
};
type ProbedWindow = Window & {
  previewProbe: Probe;
  failPreview: () => void;
};

async function openMolden(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(() => {
    const control = window as unknown as ProbedWindow;
    control.previewProbe = {
      requests: [],
      meshing: 0,
      samples: [],
      sampling: false,
      completed: false,
      terminated: false,
    };
    let samplingWorker: Worker | null = null;
    const post = Worker.prototype.postMessage;
    const terminate = Worker.prototype.terminate;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      const probe = control.previewProbe;
      probe.requests.push({
        action: message.action,
        field: message.args.field,
        resolution: message.args.resolution,
      });
      if (message.action === "sample" && message.args.resolution === 256) {
        samplingWorker = this;
        probe.sampling = false;
        probe.completed = false;
        probe.terminated = false;
        control.failPreview = () =>
          this.dispatchEvent(
            new ErrorEvent("error", {
              message: "Deliberate sampled-field worker failure",
            }),
          );
      }
      this.addEventListener("message", ({ data }) => {
        if (data.id !== message.id) return;
        if (data.progress === "meshing") probe.meshing++;
        if (message.action !== "sample") return;
        if (message.args.resolution === 256) {
          if (data.progress === "sampling") probe.sampling = true;
          if ("result" in data || "error" in data) probe.completed = true;
        }
        if (data.result)
          probe.samples.push({
            field: message.args.field,
            dims: data.result.dims,
            count: data.result.values.length,
          });
      });
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
    Worker.prototype.terminate = function () {
      if (this === samplingWorker) control.previewProbe.terminated = true;
      terminate.call(this);
    };
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/legacy/data/molden.input"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened molden.input",
  );
  await page.evaluate(() => {
    const probe = (window as unknown as ProbedWindow).previewProbe;
    probe.requests = [];
    probe.meshing = 0;
    probe.samples = [];
  });
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("24");
}

async function probe(page: Page) {
  return page.evaluate(() => (window as unknown as ProbedWindow).previewProbe);
}

async function pixels(page: Page) {
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
    let colored = 0;
    for (let i = 0; i < values.length; i += 4) {
      const r = values[i],
        g = values[i + 1],
        b = values[i + 2];
      if ((g > r + 20 && g > b + 8) || (r > g + 20 && b > g + 8)) colored++;
    }
    return colored;
  });
}

async function save(page: Page, filename: string): Promise<EigenVistaDocument> {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await download).saveAs(filename);
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(filename)),
  );
}

test("Molden orbitals and densities preview directly without marching cubes, including after reopen", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openMolden(page);
  const modes = page.getByLabel("Rendering mode");
  await expect(modes.locator('option[value="volume"]')).toHaveJSProperty(
    "disabled",
    false,
  );
  await expect(modes.locator('option[value="raycast"]')).toHaveJSProperty(
    "disabled",
    false,
  );
  await page.getByLabel("Isovalue", { exact: true }).fill("0.01");
  await modes.selectOption("volume");
  await expect(modes).toHaveValue("volume");
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  await expect(page.locator(".surface-row")).toHaveCount(0);
  let observed = await probe(page);
  expect(observed.samples).toHaveLength(1);
  expect(observed.samples[0].dims).toEqual([24, 24, 24]);
  await page.screenshot({
    path: `../artifacts/direct-preview-${testInfo.project.name}-desktop.png`,
  });
  await modes.selectOption("raycast");
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  expect((await probe(page)).samples).toHaveLength(1);

  await page.getByLabel("Grid resolution", { exact: true }).selectOption("32");
  await expect(page.getByLabel("Grid resolution", { exact: true })).toHaveValue(
    "32",
  );
  await expect(modes).toHaveValue("raycast");
  observed = await probe(page);
  expect(observed.samples.at(-1)?.dims).toEqual([32, 32, 32]);
  const orbitals = page.locator(".orbital-field-list");
  const next = orbitals.locator(".field-row:not(.selected)").last();
  const nextLabel = (await next.textContent())!;
  await next.click();
  await expect(orbitals.locator(".selected")).toHaveText(nextLabel);
  await expect(modes).toHaveValue("raycast");
  expect((await probe(page)).samples.at(-1)?.field).not.toBe(
    observed.samples.at(-1)?.field,
  );

  await modes.selectOption("mesh");
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("40");
  await modes.selectOption("raycast");
  await expect(modes).toHaveValue("raycast");
  expect((await probe(page)).samples.at(-1)?.dims).toEqual([40, 40, 40]);

  await modes.selectOption("volume");
  const densities = page.locator(".field-group").filter({
    has: page.getByRole("heading", { name: "Density matrices", exact: true }),
  });
  await densities.getByRole("button").first().click();
  await expect(densities.locator(".selected")).toHaveCount(1);
  await expect(modes).toHaveValue("volume");
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  await expect(page.locator(".surface-row")).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  await page.screenshot({
    path: `../artifacts/direct-preview-${testInfo.project.name}-mobile.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();

  const filename = path.resolve(
    `../artifacts/direct-preview-${testInfo.project.name}.eigenvista`,
  );
  const saved = await save(page, filename);
  expect(saved.surfaces).toEqual([]);
  expect(saved.grids).toEqual([]);
  await page.getByLabel("Open molecular file").setInputFiles(filename);
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened direct-preview",
  );
  await expect(modes).toHaveValue("mesh");
  await modes.selectOption("volume");
  await expect(modes).toHaveValue("volume");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  observed = await probe(page);
  expect(observed.requests.filter((r) => r.action === "generate")).toEqual([]);
  expect(observed.meshing).toBe(0);
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "water.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from("3\nwater\nO 0 0 0\nH 0.96 0 0\nH -0.24 0.93 0\n"),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened water.xyz",
  );
  await expect(modes.locator('option[value="volume"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  await expect(modes.locator('option[value="raycast"]')).toHaveJSProperty(
    "disabled",
    true,
  );
  expect(errors).toEqual([]);
});

test("raycast can be the first preview of an imported orbital", async ({
  page,
}) => {
  await openMolden(page);
  await page.getByLabel("Isovalue", { exact: true }).fill("0.01");
  await page.getByLabel("Rendering mode").selectOption("raycast");
  await expect(page.getByLabel("Rendering mode")).toHaveValue("raycast");
  await expect.poll(() => pixels(page)).toBeGreaterThan(25);
  await expect(page.locator(".surface-row")).toHaveCount(0);
  const observed = await probe(page);
  expect(observed.requests.map((r) => r.action)).toEqual(["sample"]);
  expect(observed.meshing).toBe(0);
});

for (const failure of ["cancel", "worker-error"] as const) {
  test(`sampling-only ${failure} preserves the previous preview and saved geometry`, async ({
    page,
  }, testInfo) => {
    await openMolden(page);
    const densities = page.locator(".field-group").filter({
      has: page.getByRole("heading", {
        name: "Density matrices",
        exact: true,
      }),
    });
    await densities.getByRole("button").first().click();
    await page.getByLabel("Isovalue", { exact: true }).fill("0.08");
    await page
      .getByRole("button", { name: "Generate surfaces", exact: true })
      .click();
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    await page.getByLabel("Rendering mode").selectOption("volume");
    await expect.poll(() => pixels(page)).toBeGreaterThan(25);
    const filename = path.resolve(
      `../artifacts/preview-${failure}-${testInfo.project.name}`,
    );
    const before = await save(page, `${filename}-before.eigenvista`);
    await page
      .getByLabel("Grid resolution", { exact: true })
      .selectOption("256");
    await page.waitForFunction(
      () => (window as unknown as ProbedWindow).previewProbe.sampling,
    );
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeEnabled();
    const frames = await page.evaluate(async () => {
      let count = 0;
      const until = performance.now() + 100;
      await new Promise<void>((resolve) => {
        const frame = () => {
          count++;
          if (performance.now() < until) requestAnimationFrame(frame);
          else resolve();
        };
        requestAnimationFrame(frame);
      });
      return count;
    });
    expect(frames).toBeGreaterThan(1);
    expect((await probe(page)).completed).toBeFalsy();
    if (failure === "cancel")
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    else
      await page.evaluate(() =>
        (window as unknown as ProbedWindow).failPreview(),
      );
    await expect(
      page.getByRole("button", { name: "Generate surfaces", exact: true }),
    ).toBeEnabled();
    if (failure === "worker-error")
      await expect(page.getByRole("alert")).toContainText(
        "Deliberate sampled-field worker failure",
      );
    expect((await probe(page)).terminated).toBeTruthy();
    await expect(page.getByLabel("Rendering mode")).toHaveValue("volume");
    await expect(
      page.getByLabel("Grid resolution", { exact: true }),
    ).toHaveValue("24");
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
    await expect.poll(() => pixels(page)).toBeGreaterThan(25);
    expect(await save(page, `${filename}-after.eigenvista`)).toEqual(before);
    const previousRequests = (await probe(page)).requests.length;
    await page
      .getByLabel("Grid resolution", { exact: true })
      .selectOption("32");
    await expect(
      page.getByLabel("Grid resolution", { exact: true }),
    ).toHaveValue("32");
    await expect(page.getByRole("alert")).toHaveCount(0);
    const requests = (await probe(page)).requests.slice(previousRequests);
    expect(requests.map((r) => r.action)).toEqual(["sample"]);
    expect((await probe(page)).samples.at(-1)?.count).toBe(32 ** 3);
    await expect(page.locator(".surface-row")).toHaveCount(
      before.surfaces.length,
    );
  });
}
