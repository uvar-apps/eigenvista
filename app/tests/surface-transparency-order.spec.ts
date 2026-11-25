import { expect, test, type Page } from "@playwright/test";
import type { EigenVistaDocument } from "../src/types";
import { settleScene, trackSceneDraws } from "./scenePixels";
import { activateWidget, hideToolsForScene } from "./workspace";

const document: EigenVistaDocument = {
  id: "overlap",
  title: "Overlapping parts of one surface",
  atoms: { elements: [6], positions: [[1.25, 0, 0]] },
  bonds: [],
  basis: [],
  orbitals: [],
  densities: [],
  grids: [],
  surfaces: [
    {
      id: "two-sheets",
      label: "Two overlapping sheets",
      field: null,
      source_hash: null,
      isovalue: null,
      algorithm: "manufactured",
      resolution: [2, 2, 2],
      grid_origin: [-2, -2, -1],
      grid_axes: [
        [4, 0, 0],
        [0, 4, 0],
        [0, 0, 2],
      ],
      precision: "f32",
      // Both sheets share a winding and a material. The red sheet is
      // submitted first, so drawing in index order incorrectly favors blue.
      positions: [
        -2, -2, 1, 2, -2, 1, 2, 2, 1, -2, 2, 1, -2, -2, -1, 2, -2, -1, 2, 2, -1,
        -2, 2, -1,
      ],
      normals: Array.from({ length: 8 }, () => [0, 0, 1]).flat(),
      indices: [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7],
      color: "#ffffff",
      opacity: 1,
      visible: true,
    },
  ],
  view: {
    representation: "ball-stick",
    positive_color: "#00ff00",
    negative_color: "#ff0000",
    opacity: 1,
    isovalue: 0.03,
    field: null,
  },
  provenance: [],
};

function call<T>(page: Page, method: string, params = {}) {
  return page.evaluate(
    ({ method, params }) => window.eigenvistaControl!.request(method, params),
    { method, params },
  ) as Promise<T>;
}

async function probe(page: Page, png: string) {
  return page.evaluate(
    async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode();
      const canvas = window.document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const pixel = (x: number, y: number) =>
        Array.from(ctx.getImageData(x, y, 1, 1).data);
      return {
        center: pixel(image.width / 2 + 8, image.height / 2),
        atom: pixel(
          image.width / 2 +
            (image.height * 1.25) / (16 * Math.tan((35 * Math.PI) / 360)),
          image.height / 2,
        ),
        corner: pixel(0, 0),
      };
    },
    `data:image/png;base64,${png.replace(/^data:image\/png;base64,/, "")}`,
  );
}

function expectChannels(actual: number[], expected: number[], tolerance = 2) {
  actual.forEach((value, index) =>
    expect(
      Math.abs(value - expected[index]),
      `RGBA channel ${index}`,
    ).toBeLessThanOrEqual(tolerance),
  );
}

test("custom shader fragments composite by depth in the viewport and exported PNG", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await page.waitForFunction(() => Boolean(window.eigenvistaControl));
  const bytes = await page.evaluate(async (document) => {
    const wasm = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ wasm);
    await core.default();
    return Array.from(core.encode(JSON.stringify(document)) as Uint8Array);
  }, document);
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "overlap.eigenvista",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(bytes),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened overlap.eigenvista",
  );
  await call(page, "scene.set", { backgroundColor: "#000000" });
  const panel = await activateWidget(page, "surface-shader");
  const sources = {
    vertex: `
      varying vec3 paint;
      void main() {
        paint = position.z > 0.0 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragment: `
      uniform float layerAlpha;
      uniform float redAlphaScale;
      varying vec3 paint;
      void main() {
        gl_FragColor = vec4(paint, paint.r > 0.0 ? layerAlpha * redAlphaScale : layerAlpha);
      }`,
    params: "float layerAlpha 0.88\nfloat redAlphaScale 1\n",
  };
  for (const [kind, source] of Object.entries(sources)) {
    await panel.locator(`[data-shader-input="${kind}"]`).setInputFiles({
      name: `depth.${kind}`,
      mimeType: "text/plain",
      buffer: Buffer.from(source),
    });
  }
  await expect(panel.getByLabel("Shader transparency")).toBeChecked();
  await expect(panel.getByLabel("layerAlpha")).toHaveValue("0.88");
  await panel
    .getByRole("button", { name: "Apply shader", exact: true })
    .click();
  await expect(panel.locator(".shader-status")).toContainText("Applied");
  await hideToolsForScene(page);
  const camera = (z: number) =>
    call(page, "camera.set", {
      position: [0, 0, z],
      target: [0, 0, 0],
      up: [0, 1, 0],
    });
  await camera(8);
  const image = async (transparent = false) =>
    probe(
      page,
      (await call<{ dataUrl: string }>(page, "image.export", { transparent }))
        .dataUrl,
    );
  const fromFront = await image();
  expectChannels(fromFront.center, [224, 0, 27, 255]);
  // The atom sits between the sheets. No blue from the far sheet reaches it.
  expect(fromFront.atom[0]).toBeGreaterThan(223);
  expect(fromFront.atom[1]).toBeGreaterThan(0);
  expect(fromFront.atom[2]).toBeLessThan(26);
  await settleScene(page);
  const canvas = await page
    .getByLabel("Molecular scene", { exact: true })
    .screenshot({
      style:
        ".viewport-tools, .scene-label, .workspace-activity { visibility: hidden !important; }",
    });
  expectChannels(
    (await probe(page, canvas.toString("base64"))).center,
    fromFront.center,
  );
  const transparent = await image(true);
  expectChannels(transparent.center, [228, 0, 27, 251]);
  expect(transparent.corner).toEqual([0, 0, 0, 0]);

  await camera(-8);
  expectChannels((await image()).center, [27, 0, 224, 255]);
  await camera(8);
  await call(page, "shader.set_uniforms", { uniforms: { layerAlpha: 1 } });
  expect((await image()).center).toEqual([255, 0, 0, 255]);
  await call(page, "shader.set_uniforms", {
    uniforms: { redAlphaScale: 1e-9 },
  });
  expect((await image()).center).toEqual([0, 0, 255, 255]);
  await call(page, "shader.set_uniforms", { uniforms: { redAlphaScale: 0 } });
  expect((await image()).center).toEqual([0, 0, 255, 255]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(errors).toEqual([]);
});
