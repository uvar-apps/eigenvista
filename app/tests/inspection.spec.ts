import { activateWidget } from "./workspace";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type {
  AnnotationLabel,
  MeasurementDefinition,
  MeasurementResult,
} from "../src/inspectionTypes";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

type ControlWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
};
type Job = {
  jobId: string;
  status: string;
  result?: unknown;
  error?: { kind: string; message: string };
};
type Measured = MeasurementDefinition & { result: MeasurementResult };

const xyz = Buffer.from(`6
Independent inspection geometry in angstrom
C 0 0 0
N 1 0 0
O 0 1 0
H 0 1 -1
C 0 0 0
H 3 3 3
`);

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
          result: await (window as ControlWindow).eigenvistaControl!.request(
            method,
            params,
          ),
        };
      } catch (error) {
        const failure = error as {
          kind?: string;
          data?: { kind?: string };
          message?: string;
        };
        return {
          ok: false as const,
          kind: failure.kind ?? failure.data?.kind,
          message: failure.message ?? String(error),
        };
      }
    },
    { method, params },
  );
  if (!response.ok)
    throw Object.assign(new Error(response.message), { kind: response.kind });
  return response.result as T;
}

async function complete(page: Page, result: unknown) {
  const receipt = result as { jobId?: string } | null;
  if (!receipt?.jobId) return result;
  let job: Job | undefined;
  await expect
    .poll(async () => {
      job = await call<Job>(page, "job.get", { jobId: receipt.jobId });
      return job.status;
    })
    .toMatch(/^(completed|failed|cancelled)$/);
  if (job!.status !== "completed") throw new Error(JSON.stringify(job));
  return job!.result;
}

async function ready(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as ControlWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
}

async function openBytes(page: Page, name: string, bytes: Buffer) {
  await page.getByLabel("Open molecular file").setInputFiles({
    name,
    mimeType: "application/octet-stream",
    buffer: bytes,
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await settleScene(page);
}

async function expand(page: Page, label: string) {
  await activateWidget(page, "geometry");
  const summary = page
    .locator(".inspection-controls summary")
    .filter({ hasText: label });
  if (
    !(await summary.evaluate(
      (element) => (element.parentElement as HTMLDetailsElement).open,
    ))
  )
    await summary.click();
}

async function numbers(page: Page, text: string) {
  await page.getByLabel("Inspection atom numbers", { exact: true }).fill(text);
  await page
    .getByRole("button", { name: "Select atom numbers", exact: true })
    .click();
}

async function selected(page: Page) {
  const result = await call<{ items: number[]; orderedAtoms: number[] }>(
    page,
    "selection.get",
    { offset: 0, limit: 100 },
  );
  return result;
}

async function rows<T>(page: Page, method: string) {
  const response = await call<T[] | { items: T[] }>(page, method);
  return Array.isArray(response) ? response : response.items;
}

test("label texture preflight rejects an over-budget edit without publishing it", async ({
  page,
}) => {
  await ready(page);
  await openBytes(
    page,
    "label-budget.xyz",
    Buffer.from("1\nAnnotation memory boundary\nC 0 0 0\n"),
  );
  const source = await call<{ bytes: number[] }>(page, "document.save");
  const fixture = await page.evaluate(async (bytes) => {
    const wasmUrl = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ wasmUrl);
    await core.default();
    const doc = JSON.parse(core.decode(new Uint8Array(bytes)));
    const text = "W".repeat(250);
    const context = document.createElement("canvas").getContext("2d")!;
    context.font = "600 15px system-ui, sans-serif";
    // Derive the exact boundary from this browser's real font metrics.
    let characters = 1;
    while (context.measureText("W".repeat(characters + 1)).width <= 460)
      characters++;
    const width = Math.max(
      32,
      Math.ceil(context.measureText("W".repeat(characters)).width) + 16,
    );
    const height = Math.ceil(text.length / characters) * 21 + 10;
    const visibleCount = Math.floor((16 * 1024 * 1024) / (width * height * 4));
    if (visibleCount < 1 || visibleCount > 178)
      throw new Error("Unexpected font texture dimensions");
    doc.annotations = {
      selections: [],
      measurements: [],
      labels: Array.from({ length: visibleCount + 1 }, (_, index) => ({
        id: "budget-" + index,
        text,
        atom: 0,
        visible: index < visibleCount,
        color: "#667788",
        always_visible: false,
      })),
    };
    const renderingUrl = "/src/annotationRendering.ts";
    const rendering = await import(/* @vite-ignore */ renderingUrl);
    rendering.validateAnnotationRendering(doc, []);
    const hidden = doc.annotations.labels[visibleCount];
    let rejected = "";
    try {
      rendering.validateAnnotationRendering(
        {
          ...doc,
          annotations: {
            ...doc.annotations,
            labels: doc.annotations.labels.map((label: AnnotationLabel) =>
              label.id === hidden.id ? { ...label, visible: true } : label,
            ),
          },
        },
        [],
      );
    } catch (error) {
      rejected = String(error);
    }
    return {
      bytes: Array.from(core.encode(JSON.stringify(doc))) as number[],
      hidden,
      visibleCount,
      rejected,
    };
  }, source.bytes);
  expect(fixture.rejected).toContain("16 MiB");
  await openBytes(page, "label-budget.eigenvista", Buffer.from(fixture.bytes));
  await settleScene(page);
  const before = await call<{ revision: number }>(page, "app.state");
  const imageBefore = await call<{ dataUrl: string }>(page, "image.export");
  await expect(
    call(page, "labels.upsert", {
      label: { ...fixture.hidden, visible: true },
      expectedRevision: before.revision,
    }),
  ).rejects.toThrow(/16 MiB texture budget/);
  expect((await call<{ revision: number }>(page, "app.state")).revision).toBe(
    before.revision,
  );
  const labels = await rows<AnnotationLabel>(page, "labels.list");
  expect(labels.filter((label) => label.visible)).toHaveLength(
    fixture.visibleCount,
  );
  expect(labels.find((label) => label.id === fixture.hidden.id)?.visible).toBe(
    false,
  );
  expect((await call<{ dataUrl: string }>(page, "image.export")).dataUrl).toBe(
    imageBefore.dataUrl,
  );
});

test("a revision-guarded saved neighborhood completes its own publication and display update", async ({
  page,
}) => {
  await ready(page);
  await openBytes(
    page,
    "revision-neighborhood.pdb",
    fs.readFileSync(
      path.resolve("tests/fixtures/structure-controls/components.pdb"),
    ),
  );
  const before = await call<{ revision: number }>(page, "app.state");
  const result = await complete(
    page,
    await call(page, "selection.neighborhood", {
      expectedRevision: before.revision,
      seeds: [20],
      radiusAngstrom: 1.3,
      wholeResidues: true,
      id: "revision-shell",
      label: "Guarded shell",
      showOnly: true,
      focus: true,
    }),
  );
  expect(result).toMatchObject({ selectedCount: 2 });
  const chosen = [20, 21];
  expect((await selected(page)).items).toEqual(chosen);
  expect(
    await call(page, "selection.list", { id: "revision-shell" }),
  ).toMatchObject({
    id: "revision-shell",
    total: 2,
    items: chosen,
  });
  await settleScene(page);
  const accepted = await call<{
    revision: number;
    dirty: boolean;
    structureDisplay: { visibleAtomCount: number };
    camera: { target: number[] };
  }>(page, "app.state");
  expect(accepted.revision).toBeGreaterThan(before.revision);
  expect(accepted.dirty).toBe(true);
  expect(accepted.structureDisplay.visibleAtomCount).toBe(2);
  [-4.4 / 0.529177210903, 3 / 0.529177210903, 0].forEach((value, axis) =>
    expect(accepted.camera.target[axis]).toBeCloseTo(value, 6),
  );
});

test("renaming a saved neighborhood preserves provenance through native reopen until its atoms change", async ({
  page,
}) => {
  await ready(page);
  await openBytes(
    page,
    "neighborhood-provenance.pdb",
    fs.readFileSync(
      path.resolve("tests/fixtures/structure-controls/components.pdb"),
    ),
  );
  const id = "retained-neighborhood";
  await complete(
    page,
    await call(page, "selection.neighborhood", {
      id,
      label: "Original neighborhood",
      seeds: [20],
      radiusAngstrom: 1.3,
      wholeResidues: true,
    }),
  );
  const assertNeighborhood = async (label: string) => {
    expect(await call(page, "selection.list", { id })).toMatchObject({
      id,
      label,
      total: 2,
      items: [20, 21],
      neighborhood: {
        radius_angstrom: 1.3,
        whole_residues: true,
        seedCount: 1,
      },
    });
    expect(
      await call(page, "selection.list", { id, seeds: true }),
    ).toMatchObject({ total: 1, items: [20] });
  };
  await assertNeighborhood("Original neighborhood");
  await call(page, "selection.save", {
    id,
    label: "Renamed neighborhood",
    atoms: [21, 20, 21],
  });
  await assertNeighborhood("Renamed neighborhood");

  const saved = await call<{ bytes: number[] }>(page, "document.save");
  await openBytes(
    page,
    "renamed-neighborhood.eigenvista",
    Buffer.from(saved.bytes),
  );
  await assertNeighborhood("Renamed neighborhood");

  await call(page, "selection.save", {
    id,
    label: "Replaced atom set",
    atoms: [20],
  });
  const replacement = await call<{ neighborhood?: unknown }>(
    page,
    "selection.list",
    { id },
  );
  expect(replacement).toMatchObject({
    id,
    label: "Replaced atom set",
    total: 1,
    items: [20],
  });
  expect(replacement.neighborhood).toBeUndefined();
  expect(await call(page, "selection.list", { id, seeds: true })).toMatchObject(
    { total: 0, items: [] },
  );
});

test("overlapping additive selections are idempotent and retain ordered source picks", async ({
  page,
}) => {
  await ready(page);
  await openBytes(page, "selection-union.xyz", xyz);
  await call(page, "selection.set", { atoms: [5, 0, 4, 1, 3, 2] });
  await call(page, "selection.set", { atoms: [0, 3, 5], mode: "add" });
  expect(await selected(page)).toMatchObject({
    items: [0, 1, 2, 3, 4, 5],
    orderedAtoms: [5, 0, 4, 1, 3, 2],
  });
  await call(page, "selection.set", { atoms: [5, 0, 5, 0], mode: "replace" });
  expect(await selected(page)).toMatchObject({
    items: [0, 5],
    orderedAtoms: [5, 0],
  });
  await expect(
    call(page, "selection.set", { atoms: [6], mode: "add" }),
  ).rejects.toThrow(/invalid original atom/);
  expect(await selected(page)).toMatchObject({
    items: [0, 5],
    orderedAtoms: [5, 0],
  });
});

test("CSV chunks preserve Unicode labels across adjacent boundaries", async ({
  page,
}) => {
  await ready(page);
  await openBytes(page, "unicode-label.xyz", xyz);
  await call(page, "measure.upsert", {
    measurement: {
      id: "unicode-monitor",
      label: "A😀B",
      kind: "distance",
      atoms: [0, 1],
      visible: true,
      color: "#aabbcc",
      always_visible: false,
    },
  });
  const full = await call<{ text: string; totalCharacters: number }>(
    page,
    "table.export",
    { kind: "measurements" },
  );
  const boundary = full.text.indexOf("😀");
  expect(boundary).toBeGreaterThan(0);
  const pair = await call<typeof full>(page, "table.export", {
    kind: "measurements",
    offset: boundary,
    length: 1,
  });
  expect(pair.text).toBe("😀");
  expect(pair.text.length).toBe(2);
  const first = await call<typeof full>(page, "table.export", {
    kind: "measurements",
    offset: 0,
    length: boundary + 1,
  });
  const second = await call<typeof full>(page, "table.export", {
    kind: "measurements",
    offset: first.text.length,
  });
  expect(first.text + second.text).toBe(full.text);
  expect(first.text.length + second.text.length).toBe(full.totalCharacters);
  await expect(
    call(page, "table.export", { kind: "measurements", offset: boundary + 1 }),
  ).rejects.toThrow(/Unicode|surrogate/);
});

test("bond and backbone picks expose authoritative source identities through the API", async ({
  page,
}) => {
  await ready(page);
  await openBytes(
    page,
    "bond-pick.xyz",
    Buffer.from(
      "3\nOriginal bond endpoints\nHe 20 0 0\nC -0.7 0 0\nC 0.7 0 0\n",
    ),
  );
  await call(page, "selection.pick_mode", { enabled: true });
  // Stay inside the cylinder while avoiding its shared triangulation seam.
  await call(page, "camera.set", {
    position: [0, 0.04, 30],
    target: [0, 0.04, 0],
    up: [0, 1, 0],
  });
  await settleScene(page);
  const scene = page.getByLabel("Molecular scene", { exact: true });
  const clickCenter = async () => {
    const bounds = (await scene.boundingBox())!;
    await scene.click({
      position: { x: bounds.width / 2, y: bounds.height / 2 },
    });
  };
  await clickCenter();
  await expect.poll(async () => (await selected(page)).items).toEqual([1, 2]);
  type Pick = {
    kind: string;
    atoms?: number[];
    atom?: number;
    residue?: number;
    attribution?: string;
  };
  const bond = await call<{ items: number[]; lastPick: Pick }>(
    page,
    "selection.get",
  );
  expect(bond.items).toEqual([1, 2]);
  expect(bond.lastPick).toEqual({ kind: "bond", atoms: [1, 2] });
  expect(
    (await call<{ inspection: { lastPick: Pick } }>(page, "app.state"))
      .inspection.lastPick,
  ).toEqual(bond.lastPick);

  await openBytes(
    page,
    "backbone-pick.pdb",
    fs.readFileSync(
      path.resolve("tests/fixtures/structure-controls/components.pdb"),
    ),
  );
  expect(
    (await call<{ lastPick: Pick | null }>(page, "selection.get")).lastPick,
  ).toBeNull();
  await call(page, "structure.set", {
    hiddenChains: [0],
    hiddenKinds: ["ligand", "water", "ion"],
  });
  await call(page, "scene.set", { representation: "tube" });
  const scale = 1 / 0.529177210903;
  await call(page, "camera.set", {
    position: [1.9 * scale, 8 * scale, 30],
    target: [1.9 * scale, 8 * scale, 0],
    up: [0, 1, 0],
  });
  await settleScene(page);
  await clickCenter();
  const backbone = await call<{ items: number[]; lastPick: Pick }>(
    page,
    "selection.get",
  );
  expect(backbone.lastPick.kind).toBe("residue");
  expect(backbone.lastPick.attribution).toBe("backbone_CA");
  expect([13, 17]).toContain(backbone.lastPick.atom);
  expect(backbone.lastPick.residue).toBe(backbone.lastPick.atom === 13 ? 3 : 4);
  expect(backbone.items).toEqual([backbone.lastPick.atom]);
});

test("geometry GUI preserves ordered picks, edits measurements and labels, and exports saved results", async ({
  page,
}, info) => {
  await ready(page);
  await openBytes(page, "inspection-geometry.xyz", xyz);
  await expand(page, "Selection, measurements and labels");
  await numbers(page, "1, 2");
  await expect
    .poll(async () => (await selected(page)).orderedAtoms)
    .toEqual([0, 1]);

  await expand(page, "Named selections");
  await page
    .getByLabel("Named selection name", { exact: true })
    .fill("First bond");
  await page
    .getByRole("button", { name: "Save named selection", exact: true })
    .click();
  await expect(
    page.getByLabel("Named selections", { exact: true }),
  ).toContainText("First bond");
  await page
    .getByRole("button", { name: "Edit First bond", exact: true })
    .click();
  await page
    .getByLabel("Named selection name", { exact: true })
    .fill("Inspected bond");
  await page
    .getByRole("button", { name: "Update named selection", exact: true })
    .click();

  await expand(page, "Geometry measurements");
  await page.getByLabel("Measurement name", { exact: true }).fill("Unit bond");
  await page
    .getByRole("button", { name: "Add measurement", exact: true })
    .click();
  await expect(
    page.getByLabel("Value of Unit bond", { exact: true }),
  ).toHaveText("1.0000000 Å");
  await page
    .getByRole("button", { name: "Edit measurement Unit bond", exact: true })
    .click();
  await numbers(page, "2, 1, 3");
  await page
    .getByLabel("Measurement type", { exact: true })
    .selectOption("angle");
  await page
    .getByLabel("Measurement name", { exact: true })
    .fill("Right angle");
  await page
    .getByRole("button", { name: "Update measurement", exact: true })
    .click();
  await expect(
    page.getByLabel("Value of Right angle", { exact: true }),
  ).toHaveText("90.000000 °");

  await numbers(page, "2, 1, 3, 4");
  await page
    .getByLabel("Measurement type", { exact: true })
    .selectOption("torsion");
  await page
    .getByLabel("Measurement name", { exact: true })
    .fill("Quarter turn");
  await page
    .getByRole("button", { name: "Add measurement", exact: true })
    .click();
  await expect(
    page.getByLabel("Value of Quarter turn", { exact: true }),
  ).toHaveText("90.000000 °");
  const measured = await rows<Measured>(page, "measure.list");
  expect(
    measured.map((measurement) => [
      measurement.kind,
      measurement.atoms,
      measurement.result.value,
    ]),
  ).toEqual([
    ["angle", [1, 0, 2], 90],
    ["torsion", [1, 0, 2, 3], 90],
  ]);
  await page
    .getByRole("button", { name: "Move picked atom 4 earlier", exact: true })
    .click();
  await expect
    .poll(async () => (await selected(page)).orderedAtoms)
    .toEqual([1, 0, 3, 2]);
  expect((await rows<Measured>(page, "measure.list"))[1].atoms).toEqual([
    1, 0, 2, 3,
  ]);

  await expand(page, "Atom and residue labels");
  await page
    .getByLabel("Annotation text", { exact: true })
    .fill("Selected carbon");
  await page.getByLabel("Annotation target number", { exact: true }).fill("1");
  await page.getByLabel("Annotation color", { exact: true }).fill("#ff00ff");
  await page
    .getByRole("button", { name: "Add annotation label", exact: true })
    .click();
  await expect
    .poll(async () =>
      (await rows<AnnotationLabel>(page, "labels.list")).map(
        (label) => label.text,
      ),
    )
    .toEqual(["Selected carbon"]);
  await page
    .getByRole("button", { name: "Edit label Selected carbon", exact: true })
    .click();
  await page
    .getByLabel("Annotation text", { exact: true })
    .fill("Carbon anchor");
  await page
    .getByRole("button", { name: "Update annotation label", exact: true })
    .click();

  const downloading = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export measurement CSV", exact: true })
    .click();
  const csv = await downloading;
  const csvPath = info.outputPath("geometry.csv");
  await csv.saveAs(csvPath);
  const text = fs.readFileSync(csvPath, "utf8");
  expect(text).toContain("Right angle");
  expect(text).toContain("Quarter turn");
  expect(text).toContain("90");
  expect(text).toMatch(/degree/);

  const saved = await call<{ bytes: number[] }>(page, "document.save");
  await openBytes(
    page,
    "inspection-saved.eigenvista",
    Buffer.from(saved.bytes),
  );
  await expand(page, "Selection, measurements and labels");
  await expand(page, "Named selections");
  await expand(page, "Geometry measurements");
  await expand(page, "Atom and residue labels");
  expect(
    (await rows<Measured>(page, "measure.list")).map(
      (measurement) => measurement.result.value,
    ),
  ).toEqual([90, 90]);
  expect((await rows<AnnotationLabel>(page, "labels.list"))[0].text).toBe(
    "Carbon anchor",
  );
  await expect(
    page.getByLabel("Named selections", { exact: true }),
  ).toContainText("Inspected bond");
  await page
    .getByRole("button", {
      name: "Delete measurement Right angle",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Delete label Carbon anchor", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Delete selection Inspected bond",
      exact: true,
    })
    .click();
  await expect
    .poll(async () => (await rows<Measured>(page, "measure.list")).length)
    .toBe(1);
  expect(await rows(page, "labels.list")).toEqual([]);
});

test("particular ligand copies and whole-residue neighborhoods share GUI and API identities", async ({
  page,
}) => {
  await ready(page);
  const original = fs.readFileSync(
    path.resolve("tests/fixtures/structure-controls/components.pdb"),
    "utf8",
  );
  const secondCopy =
    "HETATM   25   C1 LIG M 501      30.000   3.000   0.000  1.00 20.00           C\nHETATM   26   O1 LIG M 501      31.200   3.000   0.000  1.00 20.00           O\nEND\n";
  await openBytes(
    page,
    "ligand-copies.pdb",
    Buffer.from(original.replace(/END\s*$/, secondCopy)),
  );
  await expand(page, "Selection, measurements and labels");
  await expand(page, "Ligands and neighborhoods");
  await expect(
    page.getByLabel("Ligand copies", { exact: true }).getByRole("button"),
  ).toHaveCount(2);
  await page.getByRole("button", { name: /^Select LIG · L:501/ }).click();
  await expect.poll(async () => (await selected(page)).items).toEqual([20, 21]);
  await page.getByLabel("Neighborhood radius (Å)", { exact: true }).fill("5");
  await page.getByLabel("Include complete residues", { exact: true }).check();
  await page
    .getByLabel("Neighborhood selection name", { exact: true })
    .fill("Ligand L site");
  await page
    .getByRole("button", { name: "Show neighborhood", exact: true })
    .click();
  await expect
    .poll(async () => (await selected(page)).items)
    .toEqual([0, 1, 2, 3, 20, 21]);
  const named = await rows<{ id: string; label: string; atomCount: number }>(
    page,
    "selection.list",
  );
  const site = named.find((selection) => selection.label === "Ligand L site")!;
  const siteAtoms = await call<{ items: number[] }>(page, "selection.list", {
    id: site.id,
    offset: 0,
    limit: 100,
  });
  expect(siteAtoms.items).toEqual([0, 1, 2, 3, 20, 21]);
  await page.getByLabel("Find ligand copy", { exact: true }).fill("M:501");
  await expect(
    page.getByLabel("Ligand copies", { exact: true }).getByRole("button"),
  ).toHaveCount(1);
  await page.getByRole("button", { name: /^Select LIG · M:501/ }).click();
  await expect.poll(async () => (await selected(page)).items).toEqual([24, 25]);
  await complete(
    page,
    await call(page, "selection.neighborhood", {
      radiusAngstrom: 0,
      wholeResidues: true,
    }),
  );
  expect((await selected(page)).items).toEqual([24, 25]);
  await call(page, "selection.set", {
    selectionId: site.id,
    showOnly: true,
    resetFilters: true,
  });
  expect((await selected(page)).items).toEqual(siteAtoms.items);
  const before = await rows<Measured>(page, "measure.list");
  await expect(
    call(page, "measure.evaluate", { kind: "distance", atoms: [20, 99] }),
  ).rejects.toThrow();
  expect(await rows<Measured>(page, "measure.list")).toEqual(before);
});

test("annotation captures include real label pixels and source replacement clears transient picks", async ({
  page,
}) => {
  await ready(page);
  await openBytes(page, "inspection-label.xyz", xyz);
  const label: AnnotationLabel = {
    id: "pixel-label",
    text: "SOURCE ATOM",
    atom: 0,
    visible: true,
    color: "#ff00ff",
    always_visible: true,
  };
  await call(page, "labels.upsert", { label });
  await call(page, "selection.set", { atoms: [1, 0, 2], focus: false });
  await settleScene(page);
  const frame = async (transparent: boolean) => {
    const output = await call<{
      dataUrl: string;
      width: number;
      height: number;
    }>(page, "image.export", { transparent });
    const png = Buffer.from(output.dataUrl.split(",")[1], "base64");
    const annotation = await page.evaluate(async (dataUrl) => {
      const image = new Image();
      image.src = dataUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d")!;
      context.drawImage(image, 0, 0);
      const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
      let magenta = 0;
      let transparent = 0;
      let partialAlpha = 0;
      for (let index = 0; index < rgba.length; index += 4) {
        const [r, g, b, a] = rgba.subarray(index, index + 4);
        if (a > 0 && r > 150 && g < 100 && b > 150) magenta++;
        if (a === 0) transparent++;
        if (a > 0 && a < 255) partialAlpha++;
      }
      return { magenta, transparent, partialAlpha };
    }, output.dataUrl);
    return { output, pixels: await pngPixels(page, png), annotation };
  };
  const labelled = await frame(false);
  await call(page, "labels.upsert", { label: { ...label, visible: false } });
  const hidden = await frame(false);
  expect(labelled.pixels.checksum).not.toBe(hidden.pixels.checksum);
  expect(labelled.annotation.magenta).toBeGreaterThan(
    hidden.annotation.magenta + 10,
  );
  expect(labelled.output.width).toBe(hidden.output.width);
  await call(page, "labels.upsert", { label });
  const transparent = await frame(true);
  expect(transparent.pixels.width).toBe(labelled.pixels.width);
  expect(transparent.pixels.height).toBe(labelled.pixels.height);
  expect(transparent.annotation.magenta).toBeGreaterThan(10);
  expect(transparent.annotation.transparent).toBeGreaterThan(
    transparent.pixels.total / 4,
  );
  expect(transparent.annotation.partialAlpha).toBeGreaterThan(0);
  await openBytes(
    page,
    "replacement.xyz",
    Buffer.from("1\nNew source\nHe 0 0 0\n"),
  );
  expect((await selected(page)).items).toEqual([]);
  expect((await selected(page)).orderedAtoms).toEqual([]);
  expect(await rows(page, "labels.list")).toEqual([]);
});

test("scene picks resolve original atom identity after biological display filtering", async ({
  page,
}) => {
  await ready(page);
  await openBytes(
    page,
    "pick-source.pdb",
    fs.readFileSync(
      path.resolve("tests/fixtures/structure-controls/components.pdb"),
    ),
  );
  await expand(page, "Selection, measurements and labels");
  await page.getByLabel("Pick atoms for inspection", { exact: true }).check();
  await call(page, "structure.set", {
    hiddenChains: [0],
    hiddenKinds: ["ligand", "water", "ion"],
  });
  // Source atom 13 is chain B's Cα at (0,8,0) Å. It is GPU instance 1
  // after chain A is removed; a compact instance index would select atom 1.
  const y = 8 / 0.529177210903;
  await call(page, "camera.set", {
    position: [0, y, 30],
    target: [0, y, 0],
    up: [0, 1, 0],
  });
  await settleScene(page);
  const scene = page.getByLabel("Molecular scene", { exact: true });
  const bounds = (await scene.boundingBox())!;
  await scene.click({
    position: { x: bounds.width / 2, y: bounds.height / 2 },
  });
  await expect.poll(async () => (await selected(page)).items).toEqual([13]);
  await expect(
    page.getByLabel("Measurement pick order", { exact: true }),
  ).toContainText("CA #14");
});
