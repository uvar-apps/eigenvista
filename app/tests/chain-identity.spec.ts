import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import type { EigenVistaDocument, StructureChain } from "../src/types";
import { settleScene, trackSceneDraws } from "./scenePixels";

const firstLabel =
  'A [label "A"; author unavailable; entity "1"; chain record 1]';
const secondLabel =
  'A [label unavailable; author "A"; entity "2"; chain record 2]';

function identityDocument(extended = false): EigenVistaDocument {
  const chains: StructureChain[] = [
    { label_id: "A", author_id: null, entity_id: "1" },
    { label_id: null, author_id: "A", entity_id: "2" },
  ];
  if (extended)
    chains.push(
      { label_id: "Z", author_id: "Z", entity_id: "3" },
      // A literal input name that equals the first generated disambiguation.
      { label_id: firstLabel, author_id: null, entity_id: "4" },
      { label_id: null, author_id: null, entity_id: null },
      { label_id: "Unassigned 5", author_id: null, entity_id: "5" },
      { label_id: "C", author_id: "D", entity_id: "6" },
      { label_id: "C (author D)", author_id: null, entity_id: "7" },
    );
  return {
    id: "namespace-identities",
    title: "Namespace identity diagnostic",
    atoms: {
      elements: chains.map(() => 6),
      positions: chains.map((_, i) => [(i - 0.5) * 16, 0, 0]),
    },
    bonds: [],
    basis: [],
    orbitals: [],
    densities: [],
    grids: [],
    surfaces: [],
    provenance: [],
    view: {
      representation: "ball-stick",
      positive_color: "#259d86",
      negative_color: "#cb4e72",
      opacity: 0.78,
      isovalue: 0.08,
      field: null,
    },
    structure: {
      chains,
      residues: chains.map((_, chain) => ({
        chain,
        name: "GLY",
        label_seq_id: 1,
        author_seq_id: "1",
        insertion_code: null,
        segment: 0,
        kind: "protein",
        secondary: "unknown",
      })),
      atom_names: chains.map(() => "CA"),
      atom_residues: chains.map((_, i) => i),
      secondary_source: "none",
    },
  };
}

async function encode(page: Page, doc: EigenVistaDocument) {
  return page.evaluate(async (document) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    core.validate_document(JSON.stringify(document));
    const bytes = core.encode(JSON.stringify(document)) as Uint8Array;
    return {
      bytes: Array.from(bytes),
      decoded: JSON.parse(core.decode(bytes)) as EigenVistaDocument,
    };
  }, doc);
}

async function ready(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await trackSceneDraws(page);
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
}

async function open(page: Page, name: string, bytes: number[]) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles({
      name,
      mimeType: "application/octet-stream",
      buffer: Buffer.from(bytes),
    });
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await settleScene(page);
}

async function expand(page: Page, name: string) {
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

test("valid source namespaces and literal label collisions have unique context names and stable colors", async ({
  page,
}, info) => {
  await ready(page);
  const doc = identityDocument(true);
  const native = await encode(page, doc);
  expect(native.decoded).toEqual(doc);
  const result = await page.evaluate(async (document) => {
    const url = "/src/molecularDisplay.ts";
    const display = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/molecularDisplay");
    const structure = document.structure!;
    const before = JSON.stringify(document);
    const labels = structure.chains.map((chain, index) =>
      display.chainLabel(chain, index, structure),
    );
    const colors = structure.chains.map((chain) =>
      display.chainColor(chain, structure),
    );
    const state = {
      ...display.defaultStructureDisplay(),
      colorMode: "chain" as const,
    };
    const rendered = structure.chains.map((_, atom) =>
      display.atomDisplayColor(document, state, atom),
    );
    const filtered = structure.chains.map((_, atom) =>
      display.atomDisplayColor(
        document,
        { ...state, hiddenChains: [0], isolatedChain: 1 },
        atom,
      ),
    );
    return {
      labels,
      colors,
      rendered,
      filtered,
      residueLabels: structure.residues.map((_, index) =>
        display.residueLabel(structure, index),
      ),
      clonedLabel: display.chainLabel({ ...structure.chains[0] }, 0, structure),
      clonedColor: display.chainColor({ ...structure.chains[0] }, structure),
      ordinaryLabel: display.chainLabel(structure.chains[2], 2),
      ordinaryColor: display.chainColor(structure.chains[2]),
      compatible: [
        display.chainColor({ label_id: null, author_id: "A", entity_id: null }),
        display.chainColor({ label_id: "A", author_id: "A", entity_id: "1" }),
      ],
      unknown: display.UNKNOWN_STRUCTURE_COLOR,
      unchanged: JSON.stringify(document) === before,
    };
  }, native.decoded);
  expect(result.labels.slice(0, 2)).toEqual([firstLabel, secondLabel]);
  expect(new Set(result.labels).size).toBe(8);
  expect(result.labels[3]).toContain("chain record 4]");
  expect(result.labels[2]).toBe("Z");
  expect(result.labels[2]).toBe(result.ordinaryLabel);
  expect(result.colors[2]).toBe(result.ordinaryColor);
  expect(result.colors[4]).toBe(result.unknown);
  expect(new Set(result.colors).size).toBe(8);
  expect(result.rendered).toEqual(result.colors);
  expect(result.filtered).toEqual(result.colors);
  expect(result.compatible[0]).toBe(result.compatible[1]);
  expect(result.clonedLabel).toBe(firstLabel);
  expect(result.clonedColor).toBe(result.colors[0]);
  expect(result.residueLabels[0]).toBe(`GLY 1 · chain ${firstLabel}`);
  expect(result.residueLabels[1]).toBe(`GLY 1 · chain ${secondLabel}`);
  expect(result.unchanged).toBe(true);
  await info.attach("validated-namespace-labels-colors", {
    body: Buffer.from(JSON.stringify(result)),
    contentType: "application/json",
  });
});

type MatrixWindow = Window & {
  chainMatrices: { projection: number[]; modelView: number[] };
};

async function pickSource(page: Page, position: number[]) {
  const point = await page.evaluate((position) => {
    const { projection, modelView } = (window as unknown as MatrixWindow)
      .chainMatrices;
    if (projection.length !== 16 || modelView.length !== 16)
      throw new Error("Actual molecular draw matrices unavailable");
    const multiply = (matrix: number[], vector: number[]) =>
      Array.from({ length: 4 }, (_, row) =>
        vector.reduce(
          (sum, value, column) => sum + matrix[column * 4 + row] * value,
          0,
        ),
      );
    const clip = multiply(projection, multiply(modelView, [...position, 1]));
    const rect = document
      .querySelector<HTMLCanvasElement>(".scene canvas")!
      .getBoundingClientRect();
    return {
      x: rect.x + ((clip[0] / clip[3] + 1) * rect.width) / 2,
      y: rect.y + ((1 - clip[1] / clip[3]) * rect.height) / 2,
    };
  }, position);
  await page.mouse.click(point.x, point.y);
}

test("ambiguous chain controls and picking stay distinct through filtering, actions, native Save and long residue ranges", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.addInitScript(() => {
    (window as unknown as MatrixWindow).chainMatrices = {
      projection: [],
      modelView: [],
    };
    const names = new WeakMap<WebGLUniformLocation, string>();
    const lookup = WebGL2RenderingContext.prototype.getUniformLocation;
    WebGL2RenderingContext.prototype.getUniformLocation = function (
      program,
      name,
    ) {
      const location = lookup.call(this, program, name);
      if (location) names.set(location, name);
      return location;
    };
    const upload = WebGL2RenderingContext.prototype.uniformMatrix4fv;
    WebGL2RenderingContext.prototype.uniformMatrix4fv = function (
      location,
      transpose,
      values,
      ...rest
    ) {
      const matrices = (window as unknown as MatrixWindow).chainMatrices;
      if (location && names.get(location) === "projectionMatrix")
        matrices.projection = Array.from(values).slice(0, 16);
      if (location && names.get(location) === "modelViewMatrix")
        matrices.modelView = Array.from(values).slice(0, 16);
      return Reflect.apply(upload, this, [
        location,
        transpose,
        values,
        ...rest,
      ]);
    };
  });
  await ready(page);
  const doc = identityDocument();
  const native = await encode(page, doc);
  expect(native.decoded).toEqual(doc);
  await open(page, "namespace-identities.eigenvista", native.bytes);
  await expect(page.locator(".dirty")).toHaveCount(0);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("chain");
  await expand(page, "Chains (");
  const legend = page.getByRole("list", { name: "Structure color legend" });
  await expect(legend.getByRole("listitem")).toHaveText([
    `Chain ${firstLabel}`,
    `Chain ${secondLabel}`,
  ]);
  const swatches = () =>
    legend
      .locator(".structure-swatch")
      .evaluateAll((elements) =>
        elements.map((element) => getComputedStyle(element).backgroundColor),
      );
  const colors = await swatches();
  expect(colors[0]).not.toBe(colors[1]);
  await page
    .getByRole("checkbox", { name: `Show chain ${firstLabel}`, exact: true })
    .uncheck();
  await settleScene(page);
  await pickSource(page, doc.atoms.positions[1]);
  await expect(page.locator(".selection-status")).toContainText(`C 2`);
  await expect(page.locator(".selection-status")).toContainText(secondLabel);
  await page
    .getByLabel("Filter chains", { exact: true })
    .fill("chain record 2]");
  await expect(
    page.getByRole("checkbox", { name: /^Show chain / }),
  ).toHaveCount(1);
  expect(await swatches()).toEqual(colors);
  await page.getByLabel("Filter chains", { exact: true }).fill("");
  await page
    .getByRole("button", { name: `Isolate chain ${firstLabel}`, exact: true })
    .click();
  await settleScene(page);
  await pickSource(page, doc.atoms.positions[0]);
  await expect(page.locator(".selection-status")).toContainText(`C 1`);
  await expect(page.locator(".selection-status")).toContainText(firstLabel);
  await expect(
    page.getByRole("checkbox", {
      name: `Show chain ${secondLabel}`,
      exact: true,
    }),
  ).not.toBeChecked();
  await page
    .getByRole("button", { name: `Focus chain ${firstLabel}`, exact: true })
    .click();
  await page
    .getByRole("button", { name: "Show all components", exact: true })
    .click();
  await page
    .getByLabel(`Style for chain ${secondLabel}`, { exact: true })
    .selectOption("space-fill");
  expect(await swatches()).toEqual(colors);
  await expect(page.locator(".dirty")).toHaveCount(0);
  const pending = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  const saved = info.outputPath("namespace-after-display.eigenvista");
  await (await pending).saveAs(saved);
  const decoded = await page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(Uint8Array.from(bytes)));
    },
    [...fs.readFileSync(saved)],
  );
  expect(decoded).toEqual(native.decoded);
  await open(page, "namespace-after-display.eigenvista", [
    ...fs.readFileSync(saved),
  ]);
  await expect(legend.getByRole("listitem")).toHaveText([
    `Chain ${firstLabel}`,
    `Chain ${secondLabel}`,
  ]);
  const long = identityDocument();
  long.atoms.elements.length = 1;
  long.atoms.positions.length = 1;
  const structure = long.structure!;
  structure.chains.length = 1;
  structure.residues.length = 1;
  structure.atom_names.length = 1;
  structure.atom_residues.length = 1;
  structure.residues[0].name = "R".repeat(128);
  structure.residues[0].author_seq_id = "9".repeat(64);
  structure.residues[0].insertion_code = "I".repeat(16);
  const identifier = `${structure.residues[0].author_seq_id}${structure.residues[0].insertion_code}`,
    named = `${structure.residues[0].name} ${identifier}`;
  expect(identifier.length).toBe(80);
  expect(named.length).toBe(209);
  const longNative = await encode(page, long);
  expect(longNative.decoded).toEqual(long);
  await open(page, "long-residue.eigenvista", longNative.bytes);
  await expand(page, "Residue range");
  await page.getByLabel("First residue", { exact: true }).fill(named);
  await page.getByLabel("Last residue", { exact: true }).fill(identifier);
  await expect(page.getByLabel("First residue", { exact: true })).toHaveValue(
    named,
  );
  await expect(page.getByLabel("Last residue", { exact: true })).toHaveValue(
    identifier,
  );
  await page
    .getByRole("button", { name: "Show residue range", exact: true })
    .click();
  await expect(
    page.getByText("Residue range: 1 selected residues.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page.locator(".dirty")).toHaveCount(0);
  expect(errors).toEqual([]);
  await info.attach("native-identity-control-proof", {
    body: Buffer.from(
      JSON.stringify({
        colors,
        labels: [firstLabel, secondLabel],
        longIdentifierLength: identifier.length,
        namedResidueLength: named.length,
        nativeSaveUnchanged: true,
        errors,
      }),
    ),
    contentType: "application/json",
  });
});
