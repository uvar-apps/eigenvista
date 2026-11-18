import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { settleScene, trackSceneDraws } from "./scenePixels";
import { activateWidget } from "./workspace";

type Pick = {
  kind: string;
  atom?: number;
  atoms?: number[];
  attribution?: string;
};
type Selection = {
  items: number[];
  orderedAtoms: number[];
  selectedCount: number;
  lastPick: Pick | null;
};
type State = { revision: number; dirty: boolean; busy: string };
type Probe = { actions: string[]; largeUploads: number[] };
type ControlWindow = Window & {
  eigenvistaControl: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  selectionProbe: Probe;
};
const BOHR = 0.529177210903;
const carbon = Buffer.from("1\nIndependent single source atom\nC 0 0 0\n");
const pair = Buffer.from(
  "2\nIndependent separated source atoms\nC -2 0 0\nC 2 0 0\n",
);

async function call<T = unknown>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const response = await page.evaluate(
    async ({ method, params }) => {
      try {
        return {
          ok: true as const,
          value: await (
            window as unknown as ControlWindow
          ).eigenvistaControl.request(method, params),
        };
      } catch (cause) {
        const error = cause as {
          message: string;
          kind?: string;
          data?: { kind?: string };
        };
        return {
          ok: false as const,
          message: error.message,
          kind: error.kind ?? error.data?.kind,
        };
      }
    },
    { method, params },
  );
  if (!response.ok)
    throw Object.assign(new Error(response.message), { kind: response.kind });
  return response.value as T;
}

async function ready(page: Page) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ControlWindow;
    state.selectionProbe = { actions: [], largeUploads: [] };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      state.selectionProbe.actions.push(args[0].action);
      return Reflect.apply(post, this, args);
    };
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    for (const name of ["bufferData", "bufferSubData"]) {
      const upload = prototype[name];
      prototype[name] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        for (const value of args)
          if (ArrayBuffer.isView(value) && value.byteLength > 1024)
            state.selectionProbe.largeUploads.push(value.byteLength);
        return Reflect.apply(upload, this, args);
      };
    }
  });
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(
    () => !!(window as unknown as ControlWindow).eigenvistaControl,
  );
  await expect
    .poll(async () => (await call<State>(page, "app.state")).busy)
    .toBe("");
}

async function open(page: Page, name: string, bytes: Buffer) {
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name,
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await settleScene(page);
}

async function pose(page: Page, target = [0, 0, 0], distance = 12) {
  await call(page, "camera.set", {
    position: [target[0], target[1], target[2] + distance],
    target,
    up: [0, 1, 0],
  });
  await settleScene(page);
}

async function clickCenter(page: Page) {
  const scene = page.getByLabel("Molecular scene", { exact: true });
  const bounds = (await scene.boundingBox())!;
  await scene.click({
    position: { x: bounds.width / 2, y: bounds.height / 2 },
  });
}

async function frame(page: Page, transparent = false) {
  const image = await call<{ dataUrl: string }>(page, "image.export", {
    transparent,
  });
  const pixels = await page.evaluate(async (url) => {
    const source = new Image();
    source.src = url;
    await source.decode();
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(source, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let amber = 0,
      cyan = 0,
      transparent = 0;
    const amberX: number[] = [],
      cyanX: number[] = [];
    for (let i = 0; i < rgba.length; i += 4) {
      const [r, g, b, a] = rgba.subarray(i, i + 4);
      if (a === 0) transparent++;
      if (a > 100 && r > 210 && g > 120 && g < 230 && b < 110 && r > g + 30) {
        amber++;
        amberX.push((i / 4) % canvas.width);
      }
      if (a > 100 && r < 100 && g > 150 && b > 190 && b > r + 80) {
        cyan++;
        cyanX.push((i / 4) % canvas.width);
      }
    }
    const center =
      (Math.floor(canvas.height / 2) * canvas.width +
        Math.floor(canvas.width / 2)) *
      4;
    return {
      amber,
      cyan,
      transparent,
      total: canvas.width * canvas.height,
      center: Array.from(rgba.subarray(center, center + 4)),
      amberLeft: amberX.filter((x) => x < canvas.width / 2).length,
      amberRight: amberX.filter((x) => x >= canvas.width / 2).length,
    };
  }, image.dataUrl);
  return { png: Buffer.from(image.dataUrl.split(",")[1], "base64"), ...pixels };
}

async function selected(page: Page) {
  return call<Selection>(page, "selection.get");
}

test("mouse inspection has a visible hollow cue without changing selection, source state or molecular geometry", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "ordinary-pick.xyz", carbon);
  await pose(page);
  const original = await frame(page);
  expect(original.amber).toBe(0);
  expect(original.cyan).toBe(0);
  const before = await call<State>(page, "app.state");
  const initialProbe = await page.evaluate(
    () => (window as unknown as ControlWindow).selectionProbe,
  );
  expect(initialProbe.actions.length).toBeGreaterThan(0);
  expect(initialProbe.largeUploads.length).toBeGreaterThan(0);
  await page.evaluate(() => {
    (window as unknown as ControlWindow).selectionProbe = {
      actions: [],
      largeUploads: [],
    };
  });

  await clickCenter(page);
  await expect
    .poll(async () => (await selected(page)).lastPick)
    .toMatchObject({ kind: "atom", atom: 0 });
  expect((await selected(page)).items).toEqual([]);
  const inspected = await frame(page);
  expect(inspected.cyan).toBeGreaterThan(20);
  expect(inspected.amber).toBe(0);
  expect(inspected.center).toEqual(original.center);
  const after = await call<State>(page, "app.state");
  expect(after.revision).toBe(before.revision);
  expect(after.dirty).toBe(before.dirty);
  // The sphere's positions/index buffers are thousands of bytes, whereas a
  // single marker needs one source point. Picking must not upload new spheres.
  expect(
    await page.evaluate(
      () => (window as unknown as ControlWindow).selectionProbe,
    ),
  ).toEqual({ actions: [], largeUploads: [] });

  await activateWidget(page, "geometry");
  await page.getByLabel("Pick atoms for inspection", { exact: true }).check();
  await clickCenter(page);
  await expect.poll(async () => (await selected(page)).items).toEqual([0]);
  const accumulated = await frame(page);
  expect(accumulated.amber).toBeGreaterThan(20);
  expect(accumulated.cyan).toBe(0);
  expect(accumulated.center).toEqual(original.center);
  // A marker in front of the atom must not intercept the next real atom pick.
  await clickCenter(page);
  expect((await selected(page)).orderedAtoms).toEqual([0]);
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  await expect.poll(async () => (await selected(page)).items).toEqual([]);
  expect((await selected(page)).lastPick).toBeNull();
  const cleared = await frame(page);
  expect(cleared.amber).toBe(0);
  expect(cleared.cyan).toBe(0);
  await info.attach("ordinary-inspection-cyan.png", {
    body: inspected.png,
    contentType: "image/png",
  });
  await info.attach("accumulated-selection-amber.png", {
    body: accumulated.png,
    contentType: "image/png",
  });
});

test("multiple mouse picks and transparent PNGs preserve source identities and clear on source replacement", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "two-picked-atoms.xyz", pair);
  await pose(page, [0, 0, 0], 30);
  await activateWidget(page, "geometry");
  await page.getByLabel("Pick atoms for inspection", { exact: true }).check();
  const scene = page.getByLabel("Molecular scene", { exact: true });
  const bounds = (await scene.boundingBox())!;
  // Independent pinhole projection: two atoms at ±2 Å, fixed 35° vertical
  // field of view and an axial camera 30 bohr from their common plane.
  const pixelsPerBohr =
    bounds.height / (2 * Math.tan((35 * Math.PI) / 360) * 30);
  for (const x of [-2 / BOHR, 2 / BOHR])
    await scene.click({
      position: {
        x: bounds.width / 2 + x * pixelsPerBohr,
        y: bounds.height / 2,
      },
    });
  await expect.poll(async () => (await selected(page)).items).toEqual([0, 1]);
  expect((await selected(page)).orderedAtoms).toEqual([0, 1]);
  const transparent = await frame(page, true);
  expect(transparent.amberLeft).toBeGreaterThan(20);
  expect(transparent.amberRight).toBeGreaterThan(20);
  expect(transparent.cyan).toBe(0);
  expect(transparent.transparent).toBeGreaterThan(transparent.total / 2);
  await info.attach("two-selected-atoms-transparent.png", {
    body: transparent.png,
    contentType: "image/png",
  });
  await open(
    page,
    "new-source.xyz",
    Buffer.from("1\nNew independent source\nHe 0 0 0\n"),
  );
  expect((await selected(page)).items).toEqual([]);
  expect((await selected(page)).lastPick).toBeNull();
  const replaced = await frame(page);
  expect(replaced.amber).toBe(0);
  expect(replaced.cyan).toBe(0);
});

test("API selection stays visible across atomic representations, pastel colors, backgrounds and AO", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, "selection-appearance.xyz", carbon);
  await call(page, "palette.load", {
    name: "independent-soft-carbon.json",
    text: JSON.stringify({
      format: "eigenvista-atom-colors",
      version: 1,
      colors: [{ z: 6, symbol: "C", color: "#b690bc" }],
    }),
  });
  await pose(page, [0, 0, 0], 20);
  for (const representation of ["ball-stick", "liquorice", "space-fill"])
    for (const backgroundColor of ["#ffffff", "#13202a"]) {
      await call(page, "selection.clear");
      await call(page, "scene.set", {
        representation,
        backgroundColor,
        ambientOcclusion: { enabled: true, strength: 1, radiusAngstrom: 3 },
      });
      const unselected = await frame(page);
      expect(unselected.amber).toBe(0);
      await call(page, "selection.set", { atoms: [0] });
      const chosen = await frame(page);
      expect(chosen.amber).toBeGreaterThan(20);
      expect(chosen.cyan).toBe(0);
      expect(chosen.center).toEqual(unselected.center);
      expect((await selected(page)).items).toEqual([0]);
      await info.attach(
        `${representation}-${backgroundColor.slice(1)}-ao.png`,
        {
          body: chosen.png,
          contentType: "image/png",
        },
      );
      await call(page, "scene.set", { ambientOcclusion: { enabled: false } });
      const noAo = await frame(page);
      // Antialiased edge pixels blend with the differently shaded atom beneath
      // the hollow cue. Test visible amber in both modes, not identical counts
      // from a color threshold at those composited edges.
      expect(noAo.amber).toBeGreaterThan(20);
      expect(noAo.cyan).toBe(0);
    }
});

test("filtered biological picks retain original identities and only visible source atoms receive markers", async ({
  page,
}, info) => {
  await ready(page);
  await open(
    page,
    "filtered-selection.pdb",
    fs.readFileSync(
      path.resolve("tests/fixtures/structure-controls/components.pdb"),
    ),
  );
  await call(page, "structure.set", {
    hiddenChains: [0],
    hiddenKinds: ["ligand", "water", "ion"],
  });
  await pose(page, [0, 8 / BOHR, 0], 30);
  await clickCenter(page);
  await expect
    .poll(async () => (await selected(page)).lastPick)
    .toMatchObject({ kind: "atom", atom: 13 });
  expect((await selected(page)).items).toEqual([]);
  expect((await frame(page)).cyan).toBeGreaterThan(20);
  await call(page, "selection.set", { atoms: [1, 13] });
  expect((await selected(page)).items).toEqual([1, 13]);
  const visible = await frame(page);
  expect(visible.amber).toBeGreaterThan(20);
  expect(visible.cyan).toBe(0);
  await call(page, "structure.set", { hiddenChains: [0, 1] });
  const hidden = await frame(page);
  expect(hidden.amber).toBe(0);
  expect(hidden.cyan).toBe(0);
  expect((await selected(page)).items).toEqual([1, 13]);

  await call(page, "selection.clear");
  await call(page, "structure.set", { hiddenChains: [0] });
  await call(page, "scene.set", { representation: "tube" });
  await pose(page, [1.9 / BOHR, 8 / BOHR, 0], 30);
  await clickCenter(page);
  const backbone = (await selected(page)).lastPick!;
  expect(backbone.kind).toBe("residue");
  expect(backbone.attribution).toBe("backbone_CA");
  expect([13, 17]).toContain(backbone.atom);
  const proxy = await frame(page);
  expect(proxy.cyan).toBeGreaterThan(20);
  expect(proxy.amber).toBe(0);
  await info.attach("visible-original-atom-selected.png", {
    body: visible.png,
    contentType: "image/png",
  });
  await info.attach("backbone-source-proxy-inspected.png", {
    body: proxy.png,
    contentType: "image/png",
  });
});
