import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { activateWidget } from "./workspace";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

// Dense original structures exercise the real macOS GPU rather than Chromium's
// software rasterizer. WebKit keeps its normal backend. Captures record the
// actual renderer; no atom, geometry, sample or quality reduction is performed.
test.use({
  launchOptions: async ({ browserName }, use) => {
    await use(
      process.platform === "darwin" && browserName === "chromium"
        ? { args: ["--use-angle=metal"] }
        : {},
    );
  },
});

const palette = path.resolve("../palettes/accessible-elements.json");
const paletteText = fs.readFileSync(palette, "utf8");
const expected = [
  [1, "H", "#e6e6e6"],
  [6, "C", "#333333"],
  [7, "N", "#0072b2"],
  [8, "O", "#d55e00"],
  [9, "F", "#009e73"],
  [12, "Mg", "#007d5a"],
  [15, "P", "#cc79a7"],
  [16, "S", "#f0e442"],
  [17, "Cl", "#56b4e9"],
  [20, "Ca", "#7ac99d"],
  [26, "Fe", "#e69f00"],
  [30, "Zn", "#999999"],
  [35, "Br", "#8c510a"],
  [53, "I", "#6c3a80"],
];
type ControlledWindow = Window & {
  eigenvistaControl: {
    request(method: string, params?: unknown): Promise<unknown>;
  };
};
const call = async <T = unknown>(
  page: Page,
  method: string,
  params = {},
): Promise<T> =>
  page.evaluate(
    ({ method, params }) =>
      (window as unknown as ControlledWindow).eigenvistaControl.request(
        method,
        params,
      ),
    { method, params },
  ) as Promise<T>;

const ready = async (page: Page, file: string) => {
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as unknown as ControlledWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.addStyleTag({
    content:
      '.scene[data-testid="viewport"] { width:480px !important; height:360px !important; }',
  });
  await call(page, "document.open", {
    name: path.basename(file),
    bytes: Array.from(fs.readFileSync(file)),
  });
  await call(page, "scene.set", {
    backgroundColor: "#e8edef",
    representation: "space-fill",
    ambientOcclusion: { enabled: false },
  });
  await call(page, "camera.fit");
  // Water lies in the yz plane; looking directly along z hides its bond angle.
  // Rotate the fitted camera, retaining its target and distance and all geometry.
  if (path.basename(file) === "water-rhf-ccpvdz.molden") {
    const pose = await call<{ position: number[]; target: number[] }>(
      page,
      "camera.get",
    );
    const distance = Math.hypot(
      ...pose.position.map((v, i) => v - pose.target[i]),
    );
    const direction = [1, 0.3, 0.5];
    const length = Math.hypot(...direction);
    await call(page, "camera.set", {
      position: pose.target.map(
        (v, i) => v + (distance * direction[i]) / length,
      ),
      target: pose.target,
      up: [0, 1, 0],
    });
  }
  await settleScene(page);
};

const frame = async (page: Page) => {
  await settleScene(page);
  const image = await call<{ dataUrl: string }>(page, "image.export");
  const bytes = Buffer.from(image.dataUrl.split(",")[1], "base64");
  const pixels = await pngPixels(page, bytes);
  expect(pixels.foreground12).toBeGreaterThan(100);
  return { bytes, hash: createHash("sha256").update(bytes).digest("hex") };
};

const science = async (page: Page) => {
  const saved = await call<{ bytes: number[] }>(page, "document.save");
  return page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const doc = JSON.parse(core.decode(new Uint8Array(bytes)));
    delete doc.view;
    return JSON.stringify(doc);
  }, saved.bytes);
};

test("Accessible elements has exact documented mappings and preserves every unlisted default", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const parsed = await page.evaluate(async (text) => {
    const url = "/src/atomColors.ts";
    const core = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/atomColors");
    const custom = core.parseAtomColors(text, "accessible-elements.json");
    return {
      mappings: [...custom],
      unlisted: Array.from({ length: 118 }, (_, i) => i + 1)
        .filter((z) => !custom.has(z))
        .map((z) => ({
          z,
          custom: core.resolveAtomColor(z, custom),
          builtin: core.resolveAtomColor(z),
        })),
    };
  }, paletteText);
  expect(
    JSON.parse(paletteText).colors.map(
      (c: { z: number; symbol: string; color: string }) => [
        c.z,
        c.symbol,
        c.color,
      ],
    ),
  ).toEqual(expected);
  expect(parsed.mappings).toEqual(expected.map(([z, , color]) => [z, color]));
  expect(parsed.unlisted).toHaveLength(104);
  for (const entry of parsed.unlisted)
    expect(entry.custom, `unlisted Z=${entry.z}`).toBe(entry.builtin);
});

test("GUI and API load the same optional palette without changing molecular data or session appearance", async ({
  page,
}) => {
  await ready(page, path.resolve("../fixtures/molden/water-rhf-ccpvdz.molden"));
  const originalScience = await science(page);
  await call(page, "scene.set", {
    ambientOcclusion: { enabled: true, strength: 0.6 },
    representation: "space-fill",
  });
  const builtin = await frame(page);
  await activateWidget(page, "atom-colours");
  await page.getByLabel("Atom colours file").setInputFiles(palette);
  await expect(
    page.getByText("Overridden by accessible-elements.json", { exact: true }),
  ).toBeVisible();
  const gui = await frame(page);
  expect(gui.hash).not.toBe(builtin.hash);
  expect(await science(page)).toBe(originalScience);
  const guiState = await call<{
    palette: unknown;
    ambientOcclusion: unknown;
    view: unknown;
  }>(page, "app.state");
  await call(page, "palette.reset");
  expect((await frame(page)).hash).toBe(builtin.hash);
  await call(page, "palette.load", {
    name: "accessible-elements.json",
    text: paletteText,
  });
  expect((await frame(page)).hash).toBe(gui.hash);
  const apiState = await call<typeof guiState>(page, "app.state");
  expect(apiState.palette).toEqual(guiState.palette);
  expect(apiState.ambientOcclusion).toEqual(guiState.ambientOcclusion);
  expect(apiState.view).toEqual(guiState.view);
  expect(await science(page)).toBe(originalScience);
  const bad = JSON.parse(paletteText);
  bad.colors[0].symbol = "C";
  await expect(
    call(page, "palette.load", { name: "bad.json", text: JSON.stringify(bad) }),
  ).rejects.toThrow();
  expect((await frame(page)).hash).toBe(gui.hash);
});

for (const subject of [
  { name: "water", file: "fixtures/molden/water-rhf-ccpvdz.molden", atoms: 3 },
  { name: "1aon", file: "fixtures/cif/1AON.cif", atoms: 58870 },
])
  test(`existing and accessible palettes retain real ${subject.name} geometry under ordinary shading and AO`, async ({
    page,
  }, info) => {
    test.setTimeout(180000);
    await ready(page, path.resolve("..", subject.file));
    const source = await science(page);
    const initial = await call<{ document: { atomCount: number } }>(
      page,
      "app.state",
    );
    expect(initial.document.atomCount).toBe(subject.atoms);
    const capture = process.env.EIGENVISTA_PALETTE_CAPTURE_DIR;
    const camera = await call(page, "camera.get");
    const rendering = await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((canvas) => {
        const gl = (canvas as HTMLCanvasElement).getContext("webgl2");
        if (!gl) throw new Error("WebGL2 unavailable");
        const extension = gl.getExtension("WEBGL_debug_renderer_info");
        return {
          vendor: gl.getParameter(gl.VENDOR),
          renderer: gl.getParameter(gl.RENDERER),
          unmaskedRenderer: extension
            ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL)
            : null,
          width: gl.drawingBufferWidth,
          height: gl.drawingBufferHeight,
        };
      });
    const hashes = [];
    for (const ao of [false, true]) {
      await call(page, "scene.set", {
        ambientOcclusion: { enabled: ao, strength: 0.6 },
      });
      for (const name of [
        "default",
        "matterviz-muted",
        "matterviz-pastel",
        "accessible-elements",
      ]) {
        if (name === "default") await call(page, "palette.reset");
        else
          await call(page, "palette.load", {
            name: `${name}.json`,
            text: fs.readFileSync(
              path.resolve("../palettes", `${name}.json`),
              "utf8",
            ),
          });
        const rendered = await frame(page);
        hashes.push(rendered.hash);
        const filename = `${info.project.name}-${subject.name}-${name}-${ao ? "ao" : "ordinary"}.png`;
        if (capture) {
          fs.mkdirSync(capture, { recursive: true });
          fs.writeFileSync(path.join(capture, filename), rendered.bytes);
        }
        await info.attach(filename, {
          body: rendered.bytes,
          contentType: "image/png",
        });
      }
    }
    expect(new Set(hashes).size).toBe(8);
    expect(await science(page)).toBe(source);
    if (capture) {
      fs.writeFileSync(
        path.join(
          capture,
          `${info.project.name}-${subject.name}-manifest.json`,
        ),
        JSON.stringify(
          {
            engine: info.project.name,
            platform: process.platform,
            source: subject.file,
            sourceSha256: createHash("sha256")
              .update(fs.readFileSync(path.resolve("..", subject.file)))
              .digest("hex"),
            atomCount: initial.document.atomCount,
            representation: "space-fill",
            background: "#e8edef",
            rendering,
            camera,
            hashes,
          },
          null,
          2,
        ) + "\n",
      );
    }
  });
