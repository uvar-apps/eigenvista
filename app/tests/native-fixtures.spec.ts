import { hideToolsForScene } from "./workspace";
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Atom, EigenVistaDocument } from "../src/types";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";

interface FrozenRecord {
  id: string;
  archive: string;
  document: string;
  archive_bytes: number;
  archive_sha256: string;
  counts: { surfaces: number };
}
type FrozenDocument = Omit<EigenVistaDocument, "atoms"> & {
  atoms: EigenVistaDocument["atoms"] | Atom[];
};
interface Client {
  request<T>(action: string, args: Record<string, unknown>): Promise<T>;
  cancel(): void;
}
interface ActionProbe {
  watch: boolean;
  actions: string[];
}
type ProbedWindow = Window & { nativeFixtureProbe: ActionProbe };

const directory = path.resolve("../fixtures/native");
const records: FrozenRecord[] = JSON.parse(
  readFileSync(path.join(directory, "manifest.json"), "utf8"),
).fixtures;

function archive(record: FrozenRecord) {
  return readFileSync(path.join(directory, record.archive));
}

function rawDocument(record: FrozenRecord): FrozenDocument {
  return JSON.parse(
    readFileSync(path.join(directory, record.document), "utf8"),
  );
}

/** Atom columns and JSON zero folding are existing browser transport contracts. */
function canonicalDocument(document: FrozenDocument): EigenVistaDocument {
  const atoms = Array.isArray(document.atoms)
    ? {
        elements: document.atoms.map((atom) => atom.element),
        positions: document.atoms.map((atom) => atom.position),
      }
    : document.atoms;
  return JSON.parse(JSON.stringify({ ...document, atoms }));
}

function negativeZeros(value: unknown): number {
  if (typeof value === "number") return Object.is(value, -0) ? 1 : 0;
  if (Array.isArray(value))
    return value.reduce((total, item) => total + negativeZeros(item), 0);
  if (value && typeof value === "object")
    return Object.values(value).reduce<number>(
      (total, item) => total + negativeZeros(item),
      0,
    );
  return 0;
}

async function ready(page: Page) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.nativeFixtureProbe = { watch: false, actions: [] };
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        if (
          state.nativeFixtureProbe.watch &&
          message &&
          typeof message === "object"
        ) {
          const action = (message as { action?: unknown }).action;
          if (typeof action === "string")
            state.nativeFixtureProbe.actions.push(action);
        }
        super.postMessage(
          message,
          Array.isArray(options) ? { transfer: options } : options,
        );
      }
    };
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).nativeFixtureProbe.watch = true;
  });
}

async function save(page: Page, filename: string): Promise<EigenVistaDocument> {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  const destination = path.resolve(`../artifacts/${filename}.eigenvista`);
  await (await download).saveAs(destination);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(destination)),
  );
}

async function actions(page: Page) {
  return page.evaluate(
    () => (window as unknown as ProbedWindow).nativeFixtureProbe.actions,
  );
}

test("frozen old and current archives preserve full documents through actual WASM and worker Save", async ({
  page,
}) => {
  expect(records.map((record) => record.id).sort()).toEqual(
    [
      "legacy-h2-0.3.2",
      "structure-0.5.12",
      "water-rhf-0.5.12",
      "hydroxyl-uhf-0.5.12",
    ].sort(),
  );
  await ready(page);
  let nativeNegativeZeros = 0;
  for (const record of records) {
    const bytes = archive(record);
    expect(bytes.length, record.id).toBe(record.archive_bytes);
    expect(createHash("sha256").update(bytes).digest("hex"), record.id).toBe(
      record.archive_sha256,
    );
    const expected = canonicalDocument(rawDocument(record));
    const result = await page.evaluate(async (bytes) => {
      const wasmUrl = "/src/wasm/eigenvista_wasm.js";
      const scienceUrl = "/src/science.ts?native-fixture-contract";
      const zipUrl = "/node_modules/three/examples/jsm/libs/fflate.module.js";
      const core = await import(/* @vite-ignore */ wasmUrl);
      const { createScienceClient } = await import(
        /* @vite-ignore */ scienceUrl
      );
      const { unzipSync } = await import(/* @vite-ignore */ zipUrl);
      await core.default();
      const client: Client = createScienceClient();
      try {
        const direct: EigenVistaDocument = JSON.parse(
          core.decode(new Uint8Array(bytes)),
        );
        const count = (value: unknown): number => {
          if (typeof value === "number") return Object.is(value, -0) ? 1 : 0;
          if (Array.isArray(value))
            return value.reduce((sum, item) => sum + count(item), 0);
          if (value && typeof value === "object")
            return Object.values(value).reduce<number>(
              (sum, item) => sum + count(item),
              0,
            );
          return 0;
        };
        const decoded = await client.request<EigenVistaDocument>("decode", {
          bytes: new Uint8Array(bytes),
        });
        await client.request("validate", { doc: decoded });
        const saved = await client.request<Uint8Array>("encode", {
          doc: decoded,
        });
        const reopened = await client.request<EigenVistaDocument>("decode", {
          bytes: saved,
        });
        const directSaved = JSON.parse(
          core.decode(core.encode(JSON.stringify(direct))),
        );
        const manifest = JSON.parse(
          new TextDecoder().decode(unzipSync(saved)["manifest.json"]),
        );
        return {
          direct: JSON.parse(JSON.stringify(direct)),
          decoded: JSON.parse(JSON.stringify(decoded)),
          reopened: JSON.parse(JSON.stringify(reopened)),
          directSaved,
          negativeZeros: count(direct),
          savedNegativeZeros: count(reopened),
          format: manifest.format,
          version: manifest.version,
          profiles: manifest.required_features,
        };
      } finally {
        client.cancel();
      }
    }, Array.from(bytes));
    expect(result.direct, record.id).toEqual(expected);
    expect(result.decoded, record.id).toEqual(expected);
    expect(result.reopened, record.id).toEqual(expected);
    expect(result.directSaved, record.id).toEqual(expected);
    expect(result.negativeZeros, record.id).toBe(
      negativeZeros(rawDocument(record)),
    );
    expect(result.savedNegativeZeros, record.id).toBe(0);
    expect(result.format).toBe("eigenvista");
    expect(result.version).toEqual([0, 1]);
    expect(result.profiles).toEqual(["eigenvista-preview-polynomial-v1"]);
    nativeNegativeZeros += result.negativeZeros;
  }
  expect(nativeNegativeZeros).toBeGreaterThan(0);
});

for (const record of records.filter((fixture) => fixture.counts.surfaces > 0)) {
  test(`frozen ${record.id} opens cached meshes and saves/reopens without regeneration`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page);
    const expected = canonicalDocument(rawDocument(record));
    await page
      .getByLabel("Open molecular file")
      .setInputFiles(path.join(directory, record.archive));
    await expect(page.locator("footer [role=status]")).toContainText(
      "saved geometry restored",
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
    await expect(page.getByLabel("Rendering mode")).toHaveValue("mesh");
    await expect(page.locator(".surface-row")).toHaveCount(
      record.counts.surfaces,
    );
    for (const [layout, viewport] of [
      ["desktop", { width: 1440, height: 960 }],
      ["mobile", { width: 390, height: 844 }],
    ] as const) {
      await page.setViewportSize(viewport);
      if (layout === "mobile") await hideToolsForScene(page);
      await settleScene(page);
      const pixels = await scenePixels(page);
      expect(pixels.error).toBe(0);
      // These fixtures have neutral atoms; the retained colored meshes supply
      // these pixels. Legacy signed surfaces intentionally share one color.
      expect(pixels.colorful).toBeGreaterThan(100);
      expect(pixels.positive).toBeGreaterThan(50);
      await page.screenshot({
        path: `../artifacts/native-fixture-${record.id}-${testInfo.project.name}-${layout}.png`,
        fullPage: true,
      });
    }
    const stem = `native-fixture-${record.id}-${testInfo.project.name}`;
    expect(await save(page, stem)).toEqual(expected);
    await page
      .getByLabel("Open molecular file")
      .setInputFiles(path.resolve(`../artifacts/${stem}.eigenvista`));
    await expect(page.locator("footer [role=status]")).toContainText(
      `Opened ${stem}.eigenvista / saved geometry restored`,
    );
    expect(await save(page, `${stem}-reopened`)).toEqual(expected);
    const posted = await actions(page);
    expect(posted).toContain("import_document");
    expect(posted).toContain("encode");
    expect(posted).not.toContain("generate");
    expect(posted).not.toContain("sample");
    expect(errors).toEqual([]);
  });
}

test("frozen structure Open reports only missing display-bond supplementation and preserves its scalar grid", async ({
  page,
}, testInfo) => {
  const record = records.find((fixture) =>
    fixture.archive.startsWith("structure-"),
  )!;
  const expected = canonicalDocument(rawDocument(record));
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.join(directory, record.archive));
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${record.archive}`,
  );
  await expect(page.locator(".document-summary")).toContainText("1 bond");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await expect(page.getByRole("alert")).toHaveCount(0);
  const stem = `native-fixture-structure-${testInfo.project.name}`;
  const enriched = await save(page, stem);
  expect(enriched.bonds).toEqual([[0, 1]]);
  expect(enriched.provenance.slice(0, expected.provenance.length)).toEqual(
    expected.provenance,
  );
  expect(enriched.provenance).toHaveLength(expected.provenance.length + 2);
  expect(enriched.provenance[expected.provenance.length]).toContain(
    "Added 1 missing display bonds",
  );
  expect({
    ...enriched,
    bonds: expected.bonds,
    provenance: expected.provenance,
  }).toEqual(expected);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve(`../artifacts/${stem}.eigenvista`));
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${stem}.eigenvista`,
  );
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  expect(await save(page, `${stem}-reopened`)).toEqual(enriched);
  expect(await actions(page)).not.toContain("generate");
  expect(await actions(page)).not.toContain("sample");
});

test("corrupted frozen entry bytes and saved-source metadata are rejected without losing the open native document", async ({
  page,
}, testInfo) => {
  const record = records.find((fixture) =>
    fixture.archive.endsWith(".molekel"),
  )!;
  const expected = canonicalDocument(rawDocument(record));
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.join(directory, record.archive));
  await expect(page.locator("footer [role=status]")).toContainText(
    "saved geometry restored",
  );
  const result = await page.evaluate(
    async (bytes) => {
      const wasmUrl = "/src/wasm/eigenvista_wasm.js";
      const scienceUrl = "/src/science.ts?native-fixture-rejection";
      const zipUrl = "/node_modules/three/examples/jsm/libs/fflate.module.js";
      const core = await import(/* @vite-ignore */ wasmUrl);
      const { createScienceClient } = await import(
        /* @vite-ignore */ scienceUrl
      );
      const { unzipSync, zipSync } = await import(/* @vite-ignore */ zipUrl);
      await core.default();
      const client: Client = createScienceClient();
      const damaged = unzipSync(new Uint8Array(bytes));
      const manifest = JSON.parse(
        new TextDecoder().decode(damaged["manifest.json"]),
      );
      const entry = (Object.values(manifest.arrays)[0] as { entry: string })
        .entry;
      damaged[entry][0] ^= 1;
      const badBytes: Uint8Array = zipSync(damaged);
      const source = unzipSync(new Uint8Array(bytes));
      const sourceManifest = JSON.parse(
        new TextDecoder().decode(source["manifest.json"]),
      );
      sourceManifest.document.surfaces[0].source_hash = "0".repeat(64);
      source["manifest.json"] = new TextEncoder().encode(
        JSON.stringify(sourceManifest),
      );
      const decisions = [];
      try {
        for (const candidate of [badBytes, zipSync(source)]) {
          let direct = "",
            worker = "";
          try {
            core.decode(candidate);
          } catch (error) {
            direct = String(error);
          }
          try {
            await client.request("decode", { bytes: candidate });
          } catch (error) {
            worker = String(error);
          }
          const recovered = await client.request<EigenVistaDocument>("decode", {
            bytes: new Uint8Array(bytes),
          });
          decisions.push({
            direct,
            worker,
            recovered: JSON.parse(JSON.stringify(recovered)),
          });
        }
        return { decisions, badBytes: Array.from(badBytes) };
      } finally {
        client.cancel();
      }
    },
    Array.from(archive(record)),
  );
  for (const decision of result.decisions) {
    expect(decision.direct).not.toBe("");
    expect(decision.worker).not.toBe("");
    expect(decision.recovered).toEqual(expected);
  }
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "corrupt-frozen.molekel",
    mimeType: "application/octet-stream",
    buffer: Buffer.from(result.badBytes),
  });
  await expect(page.getByRole("alert")).toContainText(/hash|checksum|digest/i);
  await expect(page.locator(".surface-row")).toHaveCount(
    record.counts.surfaces,
  );
  expect(
    await save(page, `native-fixture-after-rejection-${testInfo.project.name}`),
  ).toEqual(expected);
  expect(await actions(page)).not.toContain("generate");
});
