import { expect, test, type Page } from "@playwright/test";
import { activateWidget, hideToolsForScene } from "./workspace";
import { settleScene, trackSceneDraws } from "./scenePixels";

type SavedSurface = {
  id: string;
  triangleCount: number;
  electrostaticPotential?: { enabled: boolean; range: number; units: string };
};

function call<T>(page: Page, method: string, params = {}): Promise<T> {
  return page.evaluate(
    ({ method, params }) => window.eigenvistaControl!.request(method, params),
    { method, params },
  ) as Promise<T>;
}

async function saved(page: Page) {
  return (await call<{ items: SavedSurface[] }>(page, "surfaces.list")).items;
}

/** Check the exported legend independently of the mapped pixels underneath it. */
async function exported(page: Page) {
  const { dataUrl } = await call<{ dataUrl: string }>(page, "image.export", {
    transparent: true,
  });
  return page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, image.width, image.height);
    const pixel = (x: number, y: number) =>
      Array.from(
        data.slice(4 * (y * image.width + x), 4 * (y * image.width + x) + 4),
      );
    const ratio =
      image.width / document.querySelector(".scene canvas")!.clientWidth;
    const at = (x: number, y: number) =>
      pixel(Math.round(x * ratio), Math.round(y * ratio));
    let red = 0;
    let blue = 0;
    let checksum = 0;
    for (
      let i = Math.ceil(100 * ratio) * image.width * 4;
      i < (image.height - Math.ceil(118 * ratio)) * image.width * 4;
      i += 4
    ) {
      const [r, g, b, a] = data.subarray(i, i + 4);
      if (a > 100 && r > g + 30 && r > b + 50) red++;
      if (a > 100 && b > g + 25 && b > r + 50) blue++;
      checksum =
        (checksum + (r + 3 * g + 7 * b) * ((i % 149) + 1)) % 2147483647;
    }
    return {
      red,
      blue,
      checksum,
      negative: at(15, image.height / ratio - 72),
      positive: at(230, image.height / ratio - 72),
    };
  }, dataUrl);
}

test("maps a density mesh with Phong, exports the color key, and restores map data", async ({
  page,
  browserName,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await page.waitForFunction(() => Boolean(window.eigenvistaControl));
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles("../fixtures/molden/water-rhf-ccpvdz.molden");
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened water-rhf-ccpvdz.molden",
  );
  const fields = await call<{
    items: Array<{ id: string; kind: string; densityKind?: string }>;
  }>(page, "fields.list");
  const density = fields.items.find((item) => item.kind === "density");
  expect(density).toBeDefined();
  await call(page, "field.select", { fieldId: density!.id });
  const rendering = await activateWidget(page, "field-rendering");
  await rendering.getByLabel("Isovalue", { exact: true }).fill("0.02");
  await rendering
    .getByLabel("Map electrostatic potential (all-electron density)")
    .check();
  await rendering
    .getByRole("button", { name: "Generate surfaces", exact: true })
    .click();
  await expect
    .poll(async () => (await saved(page))[0]?.electrostaticPotential?.enabled, {
      timeout: 45000,
    })
    .toBe(true);
  const [surface] = await saved(page);
  expect(surface.electrostaticPotential?.units).toBe("hartree/e");
  expect(surface.triangleCount).toBeGreaterThan(100);

  const appearance = await activateWidget(page, "appearance");
  await appearance.getByLabel("Surface shading").selectOption("blinn-phong");
  await hideToolsForScene(page);
  await settleScene(page);
  // A translucent mapped mesh should draw back faces in their own pass.
  // Interleaving front and back triangles produces visible strips at an angle.
  const backFacePass = await page.evaluate(async () => {
    const prototype = WebGL2RenderingContext.prototype;
    const original = prototype.frontFace;
    let drewBackFaces = false;
    prototype.frontFace = function (mode) {
      if (mode === this.CW) drewBackFaces = true;
      return original.call(this, mode);
    };
    try {
      await window.eigenvistaControl!.request("image.export");
      return drewBackFaces;
    } finally {
      prototype.frontFace = original;
    }
  });
  expect(backFacePass).toBe(true);
  const initial = await exported(page);
  await call(page, "surfaces.set_potential_appearance", {
    surfaceId: surface.id,
    range: 0.035,
  });
  const phong = await exported(page);
  expect(phong.checksum).not.toBe(initial.checksum);
  await page.screenshot({
    path: `../artifacts/electrostatic-water-${browserName}.png`,
  });
  expect(phong.negative[0]).toBeGreaterThan(phong.negative[2] + 50);
  expect(phong.positive[2]).toBeGreaterThan(phong.positive[0] + 50);
  expect(phong.red).toBeGreaterThan(100);
  expect(phong.blue).toBeGreaterThan(100);

  await call(page, "scene.set", { shading: "diffuse" });
  expect((await exported(page)).checksum).not.toBe(phong.checksum);
  const range = surface.electrostaticPotential!.range / 2;
  await call(page, "surfaces.set_potential_appearance", {
    surfaceId: surface.id,
    range,
    enabled: false,
  });
  expect((await exported(page)).negative[3]).toBe(0);
  const surfaces = await activateWidget(page, "saved-surfaces");
  await surfaces.getByLabel("Show electrostatic potential").check();
  const limit = surfaces.getByLabel(/Potential range for/);
  await expect(limit).toHaveValue(String(range));
  await limit.fill("0.08");
  await limit.press("Enter");
  const beforeSave = await saved(page);
  expect(beforeSave[0].electrostaticPotential).toEqual({
    enabled: true,
    range: 0.08,
    units: "hartree/e",
  });
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const download = await downloadPromise;
  await page
    .locator("input[type=file]")
    .first()
    .setInputFiles((await download.path())!);
  await expect(page.locator("footer [role=status]")).toContainText(
    "saved geometry restored",
  );
  expect(await saved(page)).toEqual(beforeSave);
  expect((await exported(page)).negative[0]).toBeGreaterThan(200);
  expect(errors).toEqual([]);
});

test("controller maps one total density and cancels a replacement at the mapping checkpoint", async ({
  page,
}) => {
  type Probe = { cancelId?: string; checkpoint?: number; completed?: boolean };
  await page.addInitScript(() => {
    const state = window as Window & { mepProbe?: Probe };
    const probe = (state.mepProbe = {} as Probe);
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      const request = args[0];
      if (
        request.action === "generate" &&
        request.args.electrostaticPotential
      ) {
        const observe = ({ data }: MessageEvent) => {
          if (data.id !== request.id) return;
          if (
            probe.cancelId &&
            data.progress === "mapping" &&
            data.completed === 0
          ) {
            probe.checkpoint = data.id;
            const jobId = probe.cancelId;
            delete probe.cancelId;
            void window.eigenvistaControl!.request("job.cancel", { jobId });
          }
          if (data.id === probe.checkpoint && "result" in data)
            probe.completed = true;
          if ("result" in data || "error" in data)
            this.removeEventListener("message", observe);
        };
        this.addEventListener("message", observe);
      }
      return Reflect.apply(post, this, args);
    };
  });
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const fields = await call<{ items: Array<{ id: string; kind: string }> }>(
    page,
    "fields.list",
  );
  const orbital = fields.items.find((f) => f.kind === "orbital")!;
  const density = fields.items.find((f) => f.kind === "density")!;
  const request = {
    fieldIds: [density.id],
    isovalue: 0.04,
    resolution: 32,
    electrostaticPotential: true,
  };
  await expect(
    call(page, "surfaces.generate", {
      ...request,
      fieldIds: [orbital.id],
    }),
  ).rejects.toThrow("total density matrix");
  const accepted = await call<{ jobId: string }>(
    page,
    "surfaces.generate",
    request,
  );
  await expect
    .poll(
      async () =>
        (
          await call<{ status: string }>(page, "job.get", {
            jobId: accepted.jobId,
          })
        ).status,
    )
    .toBe("completed");
  const before = await saved(page);
  expect(before.some((s) => s.electrostaticPotential?.enabled)).toBe(true);
  const cancelled = await page.evaluate(async (request) => {
    const state = window as Window & { mepProbe?: Probe };
    if (!state.mepProbe)
      throw new Error("Mapping checkpoint probe not installed");
    const job = (await window.eigenvistaControl!.request("surfaces.generate", {
      ...request,
      resolution: 96,
    })) as { jobId: string };
    state.mepProbe.cancelId = job.jobId;
    return job;
  }, request);
  await expect
    .poll(
      async () =>
        (
          await call<{ status: string }>(page, "job.get", {
            jobId: cancelled.jobId,
          })
        ).status,
      { timeout: 45000 },
    )
    .toBe("cancelled");
  const probe = await page.evaluate(
    () => (window as Window & { mepProbe?: Probe }).mepProbe,
  );
  expect(probe?.checkpoint).toBeGreaterThan(0);
  expect(probe?.completed).toBeUndefined();
  expect(await saved(page)).toEqual(before);
});
