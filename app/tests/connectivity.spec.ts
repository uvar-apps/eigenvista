import { scenePixels } from "./scenePixels";
import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";

const inputs = [
  {
    name: "water.xyz",
    text: "3\nWater\nO 0 0 0\nH 0.9572 0 0\nH -0.239 0.927 0\n",
    atoms: 3,
    bonds: 2,
  },
  {
    name: "guanine.PDB",
    text: readFileSync(
      path.resolve("../fixtures/legacy/data/guanine.pdb"),
      "utf8",
    ),
    atoms: 33,
    bonds: 35,
  },
];

for (const input of inputs) {
  test(`${input.name} automatically displays bonds and persists them`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    page.on("dialog", (dialog) => dialog.accept());
    await page.getByLabel("Open molecular file").setInputFiles({
      name: input.name,
      mimeType: "text/plain",
      buffer: Buffer.from(input.text),
    });
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".document-summary")).toContainText(
      `${input.atoms} atoms`,
    );
    await expect(page.locator(".document-summary")).toContainText(
      `${input.bonds} bonds`,
    );
    await expect(
      page.getByRole("button", { name: "Generate surfaces" }),
    ).toBeDisabled();
    for (const mode of ["ball-stick", "liquorice"]) {
      await page.getByLabel("Representation").selectOption(mode);
      await scenePixels(page).then(({ colored }) => colored);
      await page.screenshot({ path: `../artifacts/${input.name}-${mode}.png` });
    }
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    const saved = await download;
    const file = path.resolve(`../artifacts/${input.name}.eigenvista`);
    await saved.saveAs(file);
    const doc = await page.evaluate(
      async (bytes) => {
        const url = "/src/wasm/eigenvista_wasm.js";
        const core = await import(/* @vite-ignore */ url);
        await core.default();
        return JSON.parse(
          core.decode(new Uint8Array(bytes)),
        ) as EigenVistaDocument;
      },
      Array.from(readFileSync(file)),
    );
    expect(doc.bonds).toHaveLength(input.bonds);
    expect(new Set(doc.bonds.map((pair) => pair.join(","))).size).toBe(
      input.bonds,
    );
    expect(doc.provenance.join(" ")).toContain("Automatic bonds");
    await page.getByLabel("Open molecular file").setInputFiles(file);
    await expect(page.locator("footer [role=status]")).toHaveText(
      `Opened ${input.name}.eigenvista`,
    );
    await expect(page.locator(".document-summary")).toContainText(
      `${input.bonds} bonds`,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await expect
      .poll(() =>
        page.locator("canvas").evaluate((canvas) => {
          const bounds = canvas.getBoundingClientRect();
          const host = canvas.parentElement!.getBoundingClientRect();
          const ratio = Math.min(window.devicePixelRatio, 2);
          return (
            Math.abs(bounds.width - host.width) < 1 &&
            Math.abs(bounds.height - host.height) < 1 &&
            Math.abs((canvas as HTMLCanvasElement).width / ratio - host.width) <
              1 &&
            Math.abs(
              (canvas as HTMLCanvasElement).height / ratio - host.height,
            ) < 1
          );
        }),
      )
      .toBeTruthy();
    await page.getByRole("button", { name: "Fit scene", exact: true }).click();
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const mobilePixels = await scenePixels(page);
    expect(mobilePixels.colored).toBeGreaterThan(100);
    expect(mobilePixels.foreground).toBeGreaterThan(300);
    expect(mobilePixels.edgePixels).toBe(0);
    const scene = await page.locator("canvas").boundingBox();
    const panel = await page.locator(".left-panel").boundingBox();
    expect(scene!.y + scene!.height).toBeLessThanOrEqual(panel!.y);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    await page.screenshot({
      path: `../artifacts/${input.name}-mobile.png`,
      fullPage: true,
    });
    expect(errors).toEqual([]);
  });
}

test("PDB error preserves the current connected structure", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  page.on("dialog", (dialog) => dialog.accept());
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "water.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from(inputs[0].text),
  });
  await expect(page.locator(".document-summary")).toContainText("2 bonds");
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "bad.pdb",
    mimeType: "text/plain",
    buffer: Buffer.from("ATOM      1\n"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "Truncated or invalid PDB",
  );
  await expect(page.locator(".document-summary")).toContainText("2 bonds");
});

test("legacy protein and multiple-model PDB files use the same WASM path", async ({
  page,
}) => {
  const files = ["3POR", "alaninemulti", "URIDINE-VANADATE"].map((name) => ({
    name: `${name}.pdb`,
    text: readFileSync(
      path.resolve(`../fixtures/legacy/data/${name}.pdb`),
      "utf8",
    ),
  }));
  await page.goto("/");
  const counts = await page.evaluate(async (files) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return files.map(({ name, text }) => {
      const doc = JSON.parse(
        core.import_text(text, name),
      ) as EigenVistaDocument;
      return [doc.atoms.positions.length, doc.bonds.length];
    });
  }, files);
  expect(counts).toEqual([
    [2325, 2285],
    [66, 65],
    [31, 33],
  ]);
});
