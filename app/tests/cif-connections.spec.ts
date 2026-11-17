// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { scenePixels } from "./scenePixels";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";

const geometry = `data_COORDINATION
loop_
_atom_site.id
_atom_site.type_symbol
_atom_site.label_asym_id
_atom_site.label_comp_id
_atom_site.label_seq_id
_atom_site.label_atom_id
_atom_site.auth_asym_id
_atom_site.auth_comp_id
_atom_site.auth_seq_id
_atom_site.auth_atom_id
_atom_site.label_alt_id
_atom_site.pdbx_PDB_ins_code
_atom_site.occupancy
_atom_site.pdbx_PDB_model_num
_atom_site.label_entity_id
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
1 Mg A LIG 1 MG X LEG 5 MG . . 1 1 1 -1.55 0 0
2 O A LIG 1 O1 X LEG 5 O1 . . 1 1 1 1.55 0 0
#
`;

const declared = `${geometry}loop_
_struct_conn.id
_struct_conn.conn_type_id
_struct_conn.ptnr1_label_asym_id
_struct_conn.ptnr1_label_comp_id
_struct_conn.ptnr1_label_seq_id
_struct_conn.ptnr1_label_atom_id
_struct_conn.ptnr2_label_asym_id
_struct_conn.ptnr2_label_comp_id
_struct_conn.ptnr2_label_seq_id
_struct_conn.ptnr2_label_atom_id
_struct_conn.ptnr1_symmetry
_struct_conn.ptnr2_symmetry
_struct_conn.pdbx_value_order
metalc_far metalc A LIG 1 MG A LIG 1 O1 1_555 1_555 ?
#
`;

const malformed = `${geometry}loop_
_struct_conn.id
_struct_conn.conn_type_id
broken_connection
#
`;

function upload(name: string, text: string) {
  return { name, mimeType: "chemical/x-cif", buffer: Buffer.from(text) };
}

async function ready(page: Page) {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  page.on("dialog", (dialog) => dialog.accept());
}

async function open(page: Page, name: string, text: string, bonds: number) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload(name, text));
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await expect(page.locator(".document-summary")).toContainText("2 atoms");
  await expect(page.locator(".document-summary")).toContainText(
    `${bonds} bond`,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
}

/** Equal atom sizes make the fitted camera target the midpoint of the two sites. */
async function connectorPixels(page: Page) {
  const { centerForeground, error } = await scenePixels(page);
  return { foreground: centerForeground, error };
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

function records(doc: EigenVistaDocument) {
  return doc.provenance.flatMap((entry) =>
    entry.startsWith("mmCIF struct_conn: ")
      ? [JSON.parse(entry.slice("mmCIF struct_conn: ".length))]
      : [],
  );
}

async function save(page: Page, label: string) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const file = path.resolve(
    `../artifacts/cif-connections-${test.info().project.name}-${label}.eigenvista`,
  );
  await (await download).saveAs(file);
  return { file, doc: await decode(page, file) };
}

test("deposited metal coordination renders beyond the perception cutoff and survives native save on desktop/mobile", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await open(page, "without-connections.cif", geometry, 0);
  await expect
    .poll(() => connectorPixels(page))
    .toEqual({ foreground: 0, error: 0 });

  await open(page, "coordination.cif", declared, 1);
  // At 3.1 Å, these Mg/O sites exceed the 2.47 Å inferred-bond cutoff.
  // The central pixel patch contains no atoms, so this probes the added rod.
  await expect
    .poll(async () => (await connectorPixels(page)).foreground)
    .toBeGreaterThan(10);
  expect((await connectorPixels(page)).error).toBe(0);
  const saved = await save(page, "saved");
  expect(saved.doc.bonds).toEqual([[0, 1]]);
  const entries = records(saved.doc);
  expect(entries).toHaveLength(1);
  expect(entries[0]).toMatchObject({
    status: "retained",
    bond: [0, 1],
    source: { id: "metalc_far", conn_type_id: "metalc", pdbx_value_order: "?" },
  });
  await page.screenshot({
    path: `../artifacts/cif-connections-${test.info().project.name}-desktop.png`,
  });

  await page.getByLabel("Open molecular file").setInputFiles(saved.file);
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened cif-connections-",
  );
  await expect(page.locator(".document-summary")).toContainText("1 bond");
  const reopened = await save(page, "reopened");
  expect(reopened.doc.bonds).toEqual(saved.doc.bonds);
  expect(records(reopened.doc)).toEqual(entries);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await expect
    .poll(async () => (await connectorPixels(page)).foreground)
    .toBeGreaterThan(10);
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  await page.screenshot({
    path: `../artifacts/cif-connections-${test.info().project.name}-mobile.png`,
  });
  expect(errors).toEqual([]);
});

test("conversion preserves deposited connections and malformed declarations retain the active scene", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await open(page, "active.cif", declared, 1);
  await expect
    .poll(async () => (await connectorPixels(page)).foreground)
    .toBeGreaterThan(10);
  const before = await save(page, "before-conversion");
  await page
    .getByRole("button", { name: "Convert Files", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Files to convert")
    .setInputFiles([
      upload("coordination.cif", declared),
      upload("malformed.cif", malformed),
    ]);
  await dialog.getByRole("button", { name: "Convert", exact: true }).click();
  const valid = dialog
    .locator(".conversion-item")
    .filter({ hasText: "coordination.cif" });
  const invalid = dialog
    .locator(".conversion-item")
    .filter({ hasText: "malformed.cif" });
  await expect(valid).toContainText("Ready to save");
  await expect(invalid).toContainText("Failed");
  const downloaded = page.waitForEvent("download");
  await valid
    .getByRole("button", { name: "Save coordination.eigenvista", exact: true })
    .click();
  const file = path.resolve(
    `../artifacts/cif-connections-${test.info().project.name}-converted.eigenvista`,
  );
  await (await downloaded).saveAs(file);
  const converted = await decode(page, file);
  expect(converted.bonds).toEqual([[0, 1]]);
  expect(records(converted)).toEqual(records(before.doc));
  await dialog
    .getByRole("button", { name: "Close conversion queue", exact: true })
    .click();
  const after = await save(page, "after-conversion");
  expect(after.doc).toEqual(before.doc);

  await page
    .getByLabel("Open molecular file")
    .setInputFiles(upload("bad.cif", malformed));
  await expect(page.getByRole("alert")).toContainText(/mmCIF|struct_conn|row/);
  await expect(page.locator(".document-summary")).toContainText("1 bond");
  await expect
    .poll(async () => (await connectorPixels(page)).foreground)
    .toBeGreaterThan(10);
  await open(page, "retry.cif", declared, 1);
  expect(errors).toEqual([]);
});
