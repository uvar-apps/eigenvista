import { test, expect, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import type { EigenVistaDocument } from "../src/types";
import { scenePixels } from "./scenePixels";

const raw = readFileSync(path.resolve("../fixtures/bcif/1crn.bcif"));
const policy = readFileSync(path.resolve("../fixtures/bcif/policy.bcif"));
const compressed = gzipSync(raw);
const truncated = raw.subarray(0, Math.floor(raw.length / 2));
// Independent text source-row mapping for the three deposited disulfides.
const disulfides = [
  [19, 281],
  [25, 228],
  [115, 187],
];

function upload(name: string, bytes: Buffer) {
  return { name, mimeType: "application/octet-stream", buffer: bytes };
}

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  page.on("dialog", (dialog) => dialog.accept());
}

function records(document: EigenVistaDocument) {
  return document.provenance.flatMap((line) =>
    line.startsWith("mmCIF struct_conn: ")
      ? [JSON.parse(line.slice("mmCIF struct_conn: ".length))]
      : [],
  );
}

function assertCrambin(
  document: EigenVistaDocument,
  source: Buffer,
  name: string,
) {
  expect(document.atoms.elements).toHaveLength(327);
  expect(document.atoms.positions).toHaveLength(327);
  const counts = document.atoms.elements.reduce<Record<number, number>>(
    (counts, element) => {
      counts[element] = (counts[element] ?? 0) + 1;
      return counts;
    },
    {},
  );
  expect(counts).toEqual({ 6: 202, 7: 55, 8: 64, 16: 6 });
  const connections = records(document);
  expect(connections).toHaveLength(3);
  for (const [index, pair] of disulfides.entries()) {
    expect(document.bonds).toContainEqual(pair);
    expect(
      connections.find((entry) => entry.source.id === `disulf${index + 1}`),
    ).toMatchObject({
      status: "retained",
      bond: pair,
      source: { conn_type_id: "disulf" },
    });
  }
  for (const field of [
    "basis",
    "orbitals",
    "densities",
    "grids",
    "surfaces",
  ] as const)
    expect(document[field]).toHaveLength(0);
  const digest = createHash("sha256").update(source).digest("hex");
  expect(
    document.provenance.some((line) =>
      line.startsWith(`Import source: ${name}; SHA-256 ${digest};`),
    ),
  ).toBe(true);
}

async function decode(page: Page, file: string): Promise<EigenVistaDocument> {
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(file)),
  );
}

async function save(page: Page, label: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const file = path.resolve(
    `../artifacts/bcif-${test.info().project.name}-${label}.eigenvista`,
  );
  await (await download).saveAs(file);
  return { file, document: await decode(page, file) };
}

test("real BinaryCIF opens, renders and retains declared links through native save on desktop/mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  const extensions = (await page
    .getByLabel("Open molecular file")
    .getAttribute("accept"))!.split(",");
  expect(extensions).toContain(".bcif");
  expect(extensions).toContain(".gz");
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload("1crn.bcif", raw));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1crn.bcif",
  );
  await expect(page.locator(".document-summary")).toContainText("327 atoms");
  await expect(page.locator(".import-report")).toContainText("BCIF");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(500);
  expect((await scenePixels(page)).error).toBe(0);
  const saved = await save(page, "opened");
  assertCrambin(saved.document, raw, "1crn.bcif");
  await page.screenshot({
    path: `../artifacts/bcif-${test.info().project.name}-desktop.png`,
  });

  await page.getByLabel("Open molecular file").setInputFiles(saved.file);
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened bcif-",
  );
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  const reopened = await save(page, "reopened");
  expect(reopened.document).toEqual(saved.document);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(500);
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: `../artifacts/bcif-${test.info().project.name}-mobile.png`,
  });
  expect(errors).toEqual([]);
});

test("content and gzip conversion retain the active document and truncated BinaryCIF recovers", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  const before = await save(page, "before-conversion");
  await page
    .getByRole("button", { name: "Convert Files", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  expect(
    (await dialog.getByLabel("Files to convert").getAttribute("accept"))!.split(
      ",",
    ),
  ).toContain(".bcif");
  await dialog
    .getByLabel("Files to convert")
    .setInputFiles([
      upload("download.payload", raw),
      upload("wrapped.bcif.gz", compressed),
      upload("truncated.bcif", truncated),
    ]);
  await dialog.getByRole("button", { name: "Convert", exact: true }).click();
  const bad = dialog
    .locator(".conversion-item")
    .filter({ hasText: "truncated.bcif" });
  await expect(bad).toContainText("Failed");
  for (const [name, bytes, label] of [
    ["download.payload", raw, "raw"],
    ["wrapped.bcif.gz", compressed, "gzip"],
  ] as const) {
    const row = dialog.locator(".conversion-item").filter({ hasText: name });
    await expect(row).toContainText("Ready to save");
    const download = page.waitForEvent("download");
    await row.getByRole("button", { name: /^Save / }).click();
    const file = path.resolve(
      `../artifacts/bcif-${test.info().project.name}-converted-${label}.eigenvista`,
    );
    await (await download).saveAs(file);
    assertCrambin(await decode(page, file), bytes, name);
  }
  await dialog
    .getByRole("button", { name: "Close conversion queue", exact: true })
    .click();
  const after = await save(page, "after-conversion");
  expect(after.document).toEqual(before.document);

  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload("truncated.bcif", truncated));
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expect(page.locator(".document-summary")).toContainText("2 atoms");
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(500);
  const retained = await save(page, "after-failed-open");
  expect(retained.document).toEqual(before.document);

  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload("policy.bcif", policy));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened policy.bcif",
  );
  await expect(page.locator(".document-summary")).toContainText("4 atoms");
  await expect(page.locator(".document-summary")).toContainText("1 bond");
  const selected = (await save(page, "selected-policy")).document;
  expect(selected.atoms.elements).toEqual([6, 7, 16, 8]);
  expect(selected.bonds).toEqual([[0, 1]]);
  expect(
    records(selected).find((entry) => entry.source.id === "selected_B"),
  ).toMatchObject({
    status: "retained",
    selected_atom_site_ids: ["1", "3"],
    bond: [0, 1],
  });
  expect(
    records(selected).find((entry) => entry.source.id === "omitted_A"),
  ).toMatchObject({ status: "unresolved" });

  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload("recovered.payload", raw));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened recovered.payload",
  );
  await expect(page.locator(".document-summary")).toContainText("327 atoms");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect
    .poll(async () => (await scenePixels(page)).colorful)
    .toBeGreaterThan(500);
  expect(errors).toEqual([]);
});

test("native Open and Convert pickers both offer BinaryCIF and gzip extensions", async ({
  page,
}) => {
  await page.addInitScript(() => {
    type Options = {
      multiple: boolean;
      filters: { name: string; extensions: string[] }[];
    };
    const state = globalThis as unknown as {
      isTauri: boolean;
      nativePicks: Options[];
      __TAURI_INTERNALS__: unknown;
    };
    state.isTauri = true;
    state.nativePicks = [];
    state.__TAURI_INTERNALS__ = {
      invoke: async (command: string, args: { options: Options }) => {
        if (command !== "plugin:dialog|open")
          throw new Error(`Unexpected native command: ${command}`);
        state.nativePicks.push(args.options);
        return null; // Cancel the real adapter's dialog request; no import is simulated.
      },
    };
  });
  await ready(page);
  await page.getByRole("button", { name: "Open", exact: true }).click();
  await page
    .getByRole("button", { name: "Convert Files", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Add files", exact: true })
    .click();
  const options = await page.evaluate(
    () =>
      (
        globalThis as unknown as {
          nativePicks: {
            multiple: boolean;
            filters: { extensions: string[] }[];
          }[];
        }
      ).nativePicks,
  );
  expect(options).toHaveLength(2);
  expect(options.map((option) => option.multiple)).toEqual([false, true]);
  for (const option of options) {
    expect(option.filters[0].extensions).toContain("bcif");
    expect(option.filters[0].extensions).toContain("gz");
  }
  await expect(page.getByRole("alert")).toHaveCount(0);
});
