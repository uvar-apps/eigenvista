// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";
import type { EigenVistaDocument, ImportResult } from "../src/types";

const componentFile = path.resolve(
  "tests/fixtures/structure-controls/components.pdb",
);
const chainFile = path.resolve(
  "tests/fixtures/structure-controls/many-chains.cif",
);
const smallXyz = path.resolve("tests/fixtures/structure-controls/small.xyz");
const waterOnly = path.resolve(
  "tests/fixtures/structure-controls/water-only.pdb",
);
const crambin = path.resolve("../fixtures/bcif/1crn.cif");
const aon = path.resolve("../fixtures/cif/1AON.cif");
type ProbedWindow = Window & { structurePosts: string[] };

async function ready(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await trackSceneDraws(page);
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
}
async function open(page: Page, file: string) {
  await page.getByLabel("Open molecular file").setInputFiles(file);
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${path.basename(file)}`,
  );
  await settleScene(page);
}
async function importDocument(
  page: Page,
  file: string,
): Promise<EigenVistaDocument> {
  return page.evaluate(
    async ({ bytes, name }) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      const raw = Uint8Array.from(atob(bytes), (value) => value.charCodeAt(0));
      return (JSON.parse(core.import_document(raw, name)) as ImportResult)
        .document;
    },
    {
      bytes: fs.readFileSync(file).toString("base64"),
      name: path.basename(file),
    },
  );
}
async function save(page: Page, file: string): Promise<EigenVistaDocument> {
  const pending = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await pending).saveAs(file);
  return page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(
      core.decode(Uint8Array.from(atob(bytes), (value) => value.charCodeAt(0))),
    );
  }, fs.readFileSync(file).toString("base64"));
}
async function expand(page: Page, name: RegExp | string) {
  const summary = page
    .locator(".structure-controls summary")
    .filter({ hasText: name });
  if (
    !(await summary.evaluate(
      (element) => (element.parentElement as HTMLDetailsElement).open,
    ))
  )
    await summary.click();
}
async function image(page: Page) {
  await settleScene(page);
  return page.getByLabel("Molecular scene", { exact: true }).screenshot({
    style:
      ".viewport-tools, .scene-label, .viewport-error { visibility: hidden !important; }",
  });
}

test("display helpers preserve declared source identities, visibility, style precedence and element overrides", async ({
  page,
}) => {
  await ready(page);
  const doc = await importDocument(page, componentFile);
  expect(doc.atoms.positions).toHaveLength(24);
  expect(doc.structure?.residues).toHaveLength(8);
  const result = await page.evaluate(async (document) => {
    const url = "/src/molecularDisplay.ts";
    const display = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/molecularDisplay");
    const structure = document.structure!;
    const initial = JSON.stringify(document);
    const state = display.defaultStructureDisplay();
    const visible = (settings: typeof state) =>
      structure.atom_residues
        .map((_, index) => index)
        .filter((index) => display.isAtomVisible(document, settings, index));
    const chains = structure.chains.map((chain, index) => ({
      label: display.chainLabel(chain, index),
      atoms: visible({ ...state, isolatedChain: index }),
    }));
    const a = structure.chains.findIndex((chain) => chain.author_id === "A");
    const selected = display.selectResidueRange(
      structure,
      a,
      "ALA 10",
      "GLY 10A",
    );
    const opaque = structuredClone(structure);
    ["1e2", "2", "0x10"].forEach((id, index) => {
      opaque.residues[index].author_seq_id = id;
      opaque.residues[index].label_seq_id = null;
    });
    const styles = {
      ...state,
      kindStyles: { protein: "liquorice" as const },
      chainStyles: { [a]: "space-fill" as const },
    };
    return {
      chains,
      opaqueAuthorRange: display.selectResidueRange(
        opaque,
        a,
        "ALA 1e2",
        "THR 0x10",
      ),
      selectedAtoms: visible({ ...state, residueSelection: selected }),
      noWater: visible({ ...state, hiddenKinds: ["water"] }),
      chainStyle: display.atomRepresentation(document, styles, 0),
      kindStyle: display.atomRepresentation(document, styles, 12),
      ligandFallback: display.atomRepresentation(
        { ...document, view: { ...document.view, representation: "cartoon" } },
        state,
        20,
      ),
      elementOverride: display.atomDisplayColor(
        document,
        state,
        3,
        new Map([[8, "#123456"]]),
      ),
      unknownEntity: display.atomDisplayColor(
        document,
        { ...state, colorMode: "entity" },
        0,
      ),
      unknownSecondary: display.atomDisplayColor(
        document,
        { ...state, colorMode: "secondary" },
        0,
      ),
      residueClass: display.atomDisplayColor(
        document,
        { ...state, colorMode: "residue-class" },
        0,
      ),
      waterInResidueClasses: display.atomDisplayColor(
        document,
        { ...state, colorMode: "residue-class" },
        22,
        new Map([[8, "#123456"]]),
      ),
      equivalentChainColors: [
        display.chainColor({ label_id: null, author_id: "A", entity_id: null }),
        display.chainColor({ label_id: "A", author_id: "A", entity_id: "1" }),
      ],
      distinctChainColors: [
        display.chainColor(structure.chains[a]),
        display.chainColor(
          structure.chains.find((chain) => chain.author_id === "B")!,
        ),
      ],
      unchanged: JSON.stringify(document) === initial,
    };
  }, doc);
  expect(result.chains).toEqual([
    { label: "A", atoms: Array.from({ length: 12 }, (_, i) => i) },
    { label: "B", atoms: Array.from({ length: 8 }, (_, i) => i + 12) },
    { label: "L", atoms: [20, 21] },
    { label: "W", atoms: [22] },
    { label: "I", atoms: [23] },
  ]);
  expect(result.opaqueAuthorRange).toEqual([0, 1, 2]);
  expect(result.selectedAtoms).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(result.noWater).toEqual(
    Array.from({ length: 24 }, (_, i) => i).filter((i) => i !== 22),
  );
  expect(result.chainStyle).toBe("space-fill");
  expect(result.kindStyle).toBe("liquorice");
  expect(result.ligandFallback).toBe("ball-stick");
  expect(result.elementOverride).toBe("#123456");
  expect(result.unknownEntity).toBe("#8a939a");
  expect(result.unknownSecondary).toBe("#8a939a");
  expect(result.residueClass).toBe("#e69f00");
  expect(result.waterInResidueClasses).toBe("#123456");
  expect(result.equivalentChainColors[0]).toBe(result.equivalentChainColors[1]);
  expect(result.distinctChainColors[0]).not.toBe(result.distinctChainColors[1]);
  expect(result.unchanged).toBe(true);
});

test("real chain colors match the legend and element mode exactly restores the visible frame", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as Window & {
      structureColorUploads: number[][];
    };
    state.structureColorUploads = [];
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    for (const name of ["bufferData", "bufferSubData"]) {
      const original = prototype[name];
      prototype[name] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        const colors = args.find(
          (value) => value instanceof Float32Array && value.length === 72,
        );
        if (colors) {
          state.structureColorUploads.push(Array.from(colors as Float32Array));
          if (state.structureColorUploads.length > 20)
            state.structureColorUploads.shift();
        }
        return Reflect.apply(original, this, args);
      };
    }
  });
  await ready(page);
  await open(page, componentFile);
  const before = await image(page);
  await page.evaluate(() => {
    (
      window as unknown as Window & { structureColorUploads: number[][] }
    ).structureColorUploads = [];
  });
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("chain");
  const legend = page.getByRole("list", { name: "Structure color legend" });
  await expect(legend.getByRole("listitem")).toHaveCount(5);
  await expect(legend).toContainText("Chain A");
  await expect(legend).toContainText("Chain B");
  const swatches = await legend
    .getByRole("listitem")
    .evaluateAll((items) =>
      items.map(
        (item) =>
          getComputedStyle(item.querySelector(".structure-swatch")!)
            .backgroundColor,
      ),
    );
  const linear = swatches.map((color) =>
    color
      .match(/\d+/g)!
      .slice(0, 3)
      .map((channel) => {
        const srgb = Number(channel) / 255;
        return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
      }),
  );
  const expectedColors = [12, 8, 2, 1, 1].flatMap((count, chain) =>
    Array.from({ length: count }, () => linear[chain]).flat(),
  );
  await expect
    .poll(async () =>
      page.evaluate((expected) => {
        const uploads = (
          window as unknown as Window & { structureColorUploads: number[][] }
        ).structureColorUploads;
        return uploads.some((values) =>
          values.every(
            (value, index) => Math.abs(value - expected[index]) < 0.000002,
          ),
        );
      }, expectedColors),
    )
    .toBe(true);
  const chain = await image(page);
  expect(chain.equals(before)).toBe(false);
  const pixels = await scenePixels(page);
  expect(pixels.colorful).toBeGreaterThan(30);
  expect(pixels.error).toBe(0);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("entity");
  await expect(legend.getByRole("listitem")).toHaveCount(1);
  await expect(legend).toContainText("Unknown entity");
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("secondary");
  await expect(page.getByText(/Secondary structure unavailable/)).toBeVisible();
  await expect(legend).toContainText("Unknown / unassigned");
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("element");
  expect((await image(page)).equals(before)).toBe(true);
});

test("component and chain controls hide actual geometry, preserve mixed atomic styles and select inserted residues", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, componentFile);
  await expand(page, /^Components$/);
  await expand(page, /^Chains/);
  for (const name of ["Protein", "Ligand", "Water", "Ion"])
    await page
      .getByRole("checkbox", { name: `Show ${name}`, exact: true })
      .uncheck();
  await settleScene(page);
  expect((await scenePixels(page)).foreground12).toBe(0);
  await page
    .getByRole("button", { name: "Show all components", exact: true })
    .click();
  expect((await scenePixels(page)).foreground12).toBeGreaterThan(100);
  await page
    .getByRole("checkbox", { name: "Show Protein", exact: true })
    .uncheck();
  await page
    .getByRole("button", { name: "Isolate chain A", exact: true })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Show Protein", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("button", { name: "Focus chain B", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("checkbox", { name: "Show chain B", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "Isolate chain A", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page
    .getByRole("button", { name: "Show all components", exact: true })
    .click();
  await page
    .getByLabel("Style for Protein", { exact: true })
    .selectOption("liquorice");
  await page
    .getByLabel("Style for chain A", { exact: true })
    .selectOption("space-fill");
  await expect(
    page.getByLabel("Style for chain B", { exact: true }),
  ).toHaveValue("");
  await expect(
    page
      .getByLabel("Style for Water", { exact: true })
      .locator('option[value="cartoon"]'),
  ).toBeDisabled();
  await expand(page, /^Residue range$/);
  await page
    .getByRole("checkbox", { name: "Show Protein", exact: true })
    .uncheck();
  await page
    .getByLabel("Residue chain", { exact: true })
    .selectOption({ label: "A" });
  await page.getByLabel("First residue", { exact: true }).fill("ALA 10");
  await page.getByLabel("Last residue", { exact: true }).fill("GLY 10A");
  await page
    .getByRole("button", { name: "Show residue range", exact: true })
    .click();
  await expect(
    page.getByText("Residue range: 2 selected residues.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Focus chain A", exact: true })
    .click();
  await settleScene(page);
  expect((await scenePixels(page)).foreground12).toBeGreaterThan(100);
  await page.getByLabel("Last residue", { exact: true }).fill("999");
  await page
    .getByRole("button", { name: "Show residue range", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("was not found");
  await expect(
    page.getByText("Residue range: 2 selected residues.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear residue range", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("structure-controls-desktop.png"),
    fullPage: true,
  });
});

test("session appearance posts no science work, preserves clean decoded Save, and resets indexed settings on Open", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.structurePosts = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      state.structurePosts.push(message.action);
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await ready(page);
  await open(page, componentFile);
  const saved = info.outputPath("before-structure-display.eigenvista");
  const before = await save(page, saved);
  await open(page, saved);
  await expect(page.locator(".dirty")).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).structurePosts = [];
  });
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("chain");
  await expand(page, /^Chains/);
  await expand(page, /^Components$/);
  await page
    .getByRole("checkbox", { name: "Show chain B", exact: true })
    .uncheck();
  await page
    .getByLabel("Style for Protein", { exact: true })
    .selectOption("liquorice");
  await page
    .getByRole("button", { name: "Focus chain A", exact: true })
    .click();
  await expect(page.locator(".dirty")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as ProbedWindow).structurePosts,
    ),
  ).toEqual([]);
  expect(
    await save(page, info.outputPath("after-structure-display.eigenvista")),
  ).toEqual(before);
  await open(page, saved);
  await expect(
    page.getByLabel("Structure coloring", { exact: true }),
  ).toHaveValue("chain");
  await expand(page, /^Chains/);
  await expand(page, /^Components$/);
  await expect(
    page.getByRole("checkbox", { name: "Show chain B", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Style for Protein", { exact: true }),
  ).toHaveValue("");
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(
    page.getByText(/Chain and protein views are unavailable for this file/),
  ).toBeVisible();
  await expect(
    page.getByLabel("Structure coloring", { exact: true }),
  ).toHaveCount(0);
  for (const representation of ["trace", "tube", "ribbon", "cartoon"]) {
    await expect(
      page
        .getByLabel("Representation", { exact: true })
        .locator('option[value="' + representation + '"]'),
    ).toHaveJSProperty("disabled", true);
  }
  await open(page, saved);
  await expect(
    page.getByLabel("Structure coloring", { exact: true }),
  ).toHaveValue("element");
  await expand(page, /^Chains/);
  await page
    .getByRole("button", { name: "Focus chain B", exact: true })
    .click();
  await open(page, smallXyz);
  await expect(page.getByText("3 atoms", { exact: true })).toBeVisible();
  await expect(
    page.getByText(/Chain and protein views are unavailable for this file/),
  ).toBeVisible();
  const replaced = await image(page);
  expect((await scenePixels(page)).foreground12).toBeGreaterThan(100);
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await open(page, smallXyz);
  expect((await image(page)).equals(replaced)).toBe(true);
  await open(page, waterOnly);
  await expect(
    page.getByLabel("Structure coloring", { exact: true }),
  ).toHaveValue("element");
  await expand(page, /^Components$/);
  await expect(
    page.getByRole("checkbox", { name: "Show Water", exact: true }),
  ).toBeChecked();
  for (const representation of ["trace", "tube", "ribbon", "cartoon"]) {
    await expect(
      page
        .getByLabel("Representation", { exact: true })
        .locator('option[value="' + representation + '"]'),
    ).toHaveJSProperty("disabled", true);
  }
  expect(errors).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("real 1CRN annotations and 1AON source chain identities survive import and produce distinct stable palette entries", async ({
  page,
}, info) => {
  await ready(page);
  const small = await importDocument(page, crambin);
  expect(small.atoms.positions).toHaveLength(327);
  expect(small.structure?.residues).toHaveLength(46);
  const residues = small.structure!.residues;
  expect(
    residues.filter((r) => r.secondary === "helix").map((r) => r.label_seq_id),
  ).toEqual([
    7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 23, 24, 25, 26, 27, 28, 29,
    30,
  ]);
  expect(
    residues.filter((r) => r.secondary === "sheet").map((r) => r.label_seq_id),
  ).toEqual([1, 2, 3, 4, 32, 33, 34, 35]);
  expect(residues.filter((r) => r.secondary === "unknown")).toHaveLength(17);
  await open(page, crambin);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("secondary");
  await expect(page.getByText(/uses deposited annotations/)).toBeVisible();
  const large = await importDocument(page, aon);
  expect(large.atoms.positions).toHaveLength(58870);
  // Independent atom_site source rows: no production tokenizer or display helper
  // determines the expected label/auth/entity identities.
  const lines = fs.readFileSync(aon, "utf8").split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line.trim() === "_atom_site.group_PDB",
  );
  const headers: string[] = [];
  let row = start;
  while (lines[row]?.trim().startsWith("_atom_site."))
    headers.push(lines[row++].trim());
  const columns = ["label_asym_id", "auth_asym_id", "label_entity_id"].map(
    (name) => headers.indexOf(`_atom_site.${name}`),
  );
  const expected = new Set<string>();
  while (lines[row] && !lines[row].trim().startsWith("#")) {
    const values = lines[row++].trim().split(/\s+/);
    if (values[0] === "ATOM" || values[0] === "HETATM")
      expected.add(JSON.stringify(columns.map((index) => values[index])));
  }
  expect(
    large
      .structure!.chains.map((chain) =>
        JSON.stringify([chain.label_id, chain.author_id, chain.entity_id]),
      )
      .sort(),
  ).toEqual([...expected].sort());
  const colors = await page.evaluate(async (structure) => {
    const url = "/src/molecularDisplay.ts";
    const display = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/molecularDisplay");
    return structure.chains.map((chain) => ({
      chain: display.chainColor(chain),
      entity: display.entityColor(chain.entity_id),
    }));
  }, large.structure!);
  expect(new Set(colors.map((entry) => entry.chain)).size).toBe(colors.length);
  // Independent RGB→HSV hue measurement catches visually clustered colors even
  // when every hex triplet differs.35uniform identities normally cover~11of12
  // sectors;8is conservative. First8source IDs additionally require4sectors,
  // catching alternating two-color families among nearby simple identifiers.
  const hue = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map(
      (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
    );
    const high = Math.max(r, g, b),
      low = Math.min(r, g, b),
      delta = high - low;
    if (delta === 0) return 0;
    const sector =
      high === r
        ? ((g - b) / delta) % 6
        : high === g
          ? (b - r) / delta + 2
          : (r - g) / delta + 4;
    return (sector * 60 + 360) % 360;
  };
  const hues = colors.map((entry) => hue(entry.chain));
  const buckets = new Set(hues.map((value) => Math.floor(value / 30)));
  expect(
    large.structure!.chains.slice(0, 8).map((chain) => chain.label_id),
  ).toEqual(["A", "B", "C", "D", "E", "F", "G", "H"]);
  expect(buckets.size).toBeGreaterThanOrEqual(8);
  expect(
    new Set(hues.slice(0, 8).map((value) => Math.floor(value / 30))).size,
  ).toBeGreaterThanOrEqual(4);
  await info.attach("1aon-palette", {
    contentType: "application/json",
    body: Buffer.from(
      JSON.stringify({
        chains: large.structure!.chains,
        colors,
        hues,
        buckets: [...buckets],
      }),
    ),
  });
  const byEntity = new Map<string | null, string>();
  large.structure!.chains.forEach((chain, index) => {
    const prior = byEntity.get(chain.entity_id);
    if (prior) expect(colors[index].entity).toBe(prior);
    byEntity.set(chain.entity_id, colors[index].entity);
  });
});

test("chain lists and residue choices stay bounded and searchable on a real narrow layout", async ({
  page,
}, info) => {
  await ready(page);
  await open(page, chainFile);
  await page.setViewportSize({ width: 390, height: 850 });
  await expand(page, /^Chains/);
  await expand(page, /^Residue range$/);
  await expect(
    page.getByRole("checkbox", { name: /^Show chain / }),
  ).toHaveCount(50);
  expect(
    await page
      .getByLabel("Residue chain", { exact: true })
      .locator("option")
      .count(),
  ).toBeLessThanOrEqual(51);
  await page.getByLabel("Filter chains", { exact: true }).fill("C59");
  await expect(
    page.getByRole("checkbox", { name: /^Show chain / }),
  ).toHaveCount(1);
  await expect(
    page.getByRole("checkbox", { name: "Show chain C59", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("checkbox", { name: "Show chain C59", exact: true })
    .uncheck();
  await expect(
    page.getByRole("checkbox", { name: "Show chain C59", exact: true }),
  ).not.toBeChecked();
  await page
    .getByLabel("Residue chain", { exact: true })
    .selectOption({ label: "C59" });
  await page.getByLabel("First residue", { exact: true }).fill("ALA 1");
  await page.getByLabel("Last residue", { exact: true }).fill("1");
  await page
    .getByRole("button", { name: "Show residue range", exact: true })
    .click();
  await expect(
    page.getByText("Residue range: 1 selected residues.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("structure-controls-mobile.png"),
    fullPage: true,
  });
});
