// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import type { EigenVistaDocument, Surface } from "../src/types";
import {
  indexedMeshPixels,
  vertexIdShader,
  type MeshVariant,
} from "./indexedMeshPixels";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

interface SemanticRecord {
  case_file: string;
  case_sha256: string;
  case_bytes: number;
  case_uncompressed_sha256: string;
  case_uncompressed_bytes: number;
}
interface FixtureRecord extends SemanticRecord {
  id: string;
  archives: Record<
    MeshVariant,
    { file: string; bytes: number; sha256: string }
  >;
}
interface Client {
  request<T>(action: string, args: Record<string, unknown>): Promise<T>;
  cancel(): void;
}
const directory = path.resolve("../fixtures/indexed-mesh-qualification");
const manifest = JSON.parse(
  readFileSync(path.join(directory, "manifest.json"), "utf8"),
);
const records: FixtureRecord[] = manifest.cases;
if (
  records
    .map((record) => record.id)
    .sort()
    .join(",") !==
  "ordinary-negative,ordinary-positive,reflected-negative,reflected-positive"
) {
  throw new Error(
    "Indexed-mesh qualification requires all four immutable cases",
  );
}
const variants: MeshVariant[] = ["raw", "compact", "naive", "restored"];
const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const canonical = <T>(value: T): T => JSON.parse(JSON.stringify(value));

/** Trusted frozen inputs still have explicit compressed/decompressed bounds. */
function semantic(record: SemanticRecord) {
  const bytes = readFileSync(path.join(directory, record.case_file));
  expect(bytes.length).toBe(record.case_bytes);
  expect(bytes.length).toBeLessThan(512 * 1024);
  expect(digest(bytes)).toBe(record.case_sha256);
  const json = gunzipSync(bytes, { maxOutputLength: 4 * 1024 * 1024 });
  expect(json.length).toBe(record.case_uncompressed_bytes);
  expect(digest(json)).toBe(record.case_uncompressed_sha256);
  return JSON.parse(json.toString());
}

/** Compare the browser JSON contract's f64 bits, after its documented zero fold. */
function floatBits(values: number[]) {
  const bytes = Buffer.alloc(values.length * 8);
  values.forEach((value, i) =>
    bytes.writeDoubleLE(value === 0 ? 0 : value, i * 8),
  );
  return bytes;
}

/** Data replay checks attributes in actual index order; it computes no new mesh. */
function triangleBits(surface: Surface) {
  return floatBits(
    surface.indices.flatMap((index) => [
      ...surface.positions.slice(index * 3, index * 3 + 3),
      ...surface.normals.slice(index * 3, index * 3 + 3),
    ]),
  );
}

/** Count every differing RGBA pixel, avoiding probabilistic checksum equality. */
function differentPixels(left: number[], right: number[]) {
  expect(left.length).toBe(right.length);
  let count = 0;
  for (let i = 0; i < left.length; i += 4) {
    if (left.slice(i, i + 4).some((value, j) => value !== right[i + j]))
      count++;
  }
  return count;
}

async function open(page: Page, filename: string) {
  await page
    .getByLabel("Open molecular file", { exact: true })
    .setInputFiles(filename);
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${path.basename(filename)}`,
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await settleScene(page);
}

async function scene(page: Page) {
  return page.getByLabel("Molecular scene", { exact: true }).screenshot({
    style:
      ".viewport-tools, .scene-label, .viewport-error { visibility: hidden !important; }",
  });
}

async function roundTrips(page: Page, archives: Record<string, number[]>) {
  return page.evaluate(async (archives) => {
    const wasmUrl = "/src/wasm/eigenvista_wasm.js";
    const scienceUrl = "/src/science.ts?indexed-mesh-qualification";
    const core = await import(/* @vite-ignore */ wasmUrl);
    const { createScienceClient } = await import(/* @vite-ignore */ scienceUrl);
    await core.default();
    const client: Client = createScienceClient();
    const result = {} as Record<
      string,
      { direct: EigenVistaDocument; reopened: EigenVistaDocument }
    >;
    try {
      for (const [variant, bytes] of Object.entries(archives)) {
        const direct: EigenVistaDocument = JSON.parse(
          core.decode(new Uint8Array(bytes)),
        );
        const decoded = await client.request<EigenVistaDocument>("decode", {
          bytes: new Uint8Array(bytes),
        });
        await client.request("validate", { doc: decoded });
        const encoded = await client.request<Uint8Array>("encode", {
          doc: decoded,
        });
        const reopened = await client.request<EigenVistaDocument>("decode", {
          bytes: encoded,
        });
        result[variant] = {
          direct: JSON.parse(JSON.stringify(direct)),
          reopened,
        };
      }
      return result;
    } finally {
      client.cancel();
    }
  }, archives);
}

test("old marker-free arbitrary indices remain untouched through WASM Save/reopen", async ({
  page,
}) => {
  const control = manifest.arbitrary_indexed;
  const expected: EigenVistaDocument = canonical(semantic(control));
  const bytes = readFileSync(path.join(directory, control.file));
  expect(bytes.length).toBe(control.bytes);
  expect(digest(bytes)).toBe(control.sha256);
  expect(expected.surfaces[0].algorithm).not.toBe(
    "qualification-mcubes-0.1.7-exact-tuples-v1",
  );
  expect(expected.surfaces[0].indices.length).toBeGreaterThan(
    expected.surfaces[0].positions.length / 3,
  );
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const saved = await roundTrips(page, { arbitrary: Array.from(bytes) });
  expect(canonical(saved.arbitrary.direct)).toEqual(expected);
  expect(canonical(saved.arbitrary.reopened)).toEqual(expected);
});

for (const record of records) {
  test(`${record.id}: preserve shader vertex identity through native Save/reopen`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    const fixture = semantic(record);
    const expected: Record<MeshVariant, EigenVistaDocument> = canonical(
      fixture.documents,
    );
    const archives = Object.fromEntries(
      variants.map((variant) => {
        const entry = record.archives[variant];
        const bytes = readFileSync(path.join(directory, entry.file));
        expect(bytes.length).toBe(entry.bytes);
        expect(digest(bytes)).toBe(entry.sha256);
        return [variant, Array.from(bytes)];
      }),
    );
    await trackSceneDraws(page);
    await page.goto("/?workspace=legacy");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const saved = await roundTrips(page, archives);
    for (const variant of variants) {
      expect(canonical(saved[variant].direct), variant).toEqual(
        expected[variant],
      );
      expect(canonical(saved[variant].reopened), variant).toEqual(
        expected[variant],
      );
    }
    const documents = Object.fromEntries(
      variants.map((variant) => [variant, saved[variant].reopened]),
    ) as Record<MeshVariant, EigenVistaDocument>;
    const raw = documents.raw.surfaces[0];
    const restored = documents.restored.surfaces[0];
    expect(documents.compact.surfaces[0].algorithm).toBe(
      "qualification-mcubes-0.1.7-exact-tuples-v1",
    );
    expect(documents.compact.surfaces[0].positions.length).toBeLessThan(
      raw.positions.length,
    );
    for (const variant of variants)
      expect(triangleBits(documents[variant].surfaces[0]), variant).toEqual(
        triangleBits(raw),
      );
    expect(floatBits(restored.positions)).toEqual(floatBits(raw.positions));
    expect(floatBits(restored.normals)).toEqual(floatBits(raw.normals));
    expect(restored.indices).toEqual(raw.indices);
    expect(raw.indices.slice(0, 3)).toEqual(
      fixture.reflected ? [0, 2, 1] : [0, 1, 2],
    );

    const probe = await indexedMeshPixels(page, documents);
    const baseline = probe.captures.raw;
    for (const variant of variants) {
      const capture = probe.captures[variant];
      expect(capture.error, variant).toBe(0);
      expect(capture.drawCalls, variant).toBe(1);
      expect(
        capture.rgba.filter((value, i) => i % 4 !== 3 && value > 0).length,
        variant,
      ).toBeGreaterThan(1000);
      await testInfo.attach(`${record.id}-${variant}`, {
        body: Buffer.from(capture.png, "base64"),
        contentType: "image/png",
      });
    }
    expect(probe.captures.restored.positionBits).toEqual(baseline.positionBits);
    expect(probe.captures.restored.normalBits).toEqual(baseline.normalBits);
    expect(probe.captures.restored.indices).toEqual(baseline.indices);
    const differences = Object.fromEntries(
      variants.map((variant) => [
        variant,
        differentPixels(baseline.rgba, probe.captures[variant].rgba),
      ]),
    );
    expect(differences.restored).toBe(0);
    expect(differences.compact).toBeGreaterThan(100);
    if (fixture.reflected) {
      expect(probe.captures.naive.indices).not.toEqual(baseline.indices);
      expect(differences.naive).toBeGreaterThan(100);
    } else expect(differences.naive).toBe(0);
    await testInfo.attach(`${record.id}-pixel-differences`, {
      body: Buffer.from(
        JSON.stringify({ renderer: probe.renderer, differences }),
      ),
      contentType: "application/json",
    });

    // Also exercise the actual application renderer and user Open/Save path.
    await open(page, path.join(directory, record.archives.raw.file));
    for (const [kind, source] of Object.entries(vertexIdShader)) {
      await page.locator(`[data-shader-input="${kind}"]`).setInputFiles({
        name: `qualification.${kind}`,
        mimeType: "text/plain",
        buffer: Buffer.from(source),
      });
    }
    await page
      .getByRole("button", { name: "Apply shader", exact: true })
      .click();
    await expect(page.locator(".shader-status")).toContainText("Applied");
    await page.getByLabel("Shader transparency", { exact: true }).uncheck();
    await settleScene(page);
    const uiRaw = await scene(page);
    expect((await pngPixels(page, uiRaw)).foreground).toBeGreaterThan(1000);
    // An Open that silently cleared the shader would fail this control.
    await open(page, path.join(directory, record.archives.compact.file));
    const uiCompact = await scene(page);
    expect(uiCompact.equals(uiRaw)).toBe(false);
    await testInfo.attach(`${record.id}-application-compact-control`, {
      body: uiCompact,
      contentType: "image/png",
    });
    if (fixture.reflected) {
      await open(page, path.join(directory, record.archives.naive.file));
      expect((await scene(page)).equals(uiRaw)).toBe(false);
    }
    await open(page, path.join(directory, record.archives.restored.file));
    expect(await scene(page)).toEqual(uiRaw);
    const destination = path.resolve(
      `../tmp/2026-11-12-panels-mesh37/shader37/${testInfo.project.name}-${record.id}.saved.eigenvista`,
    );
    mkdirSync(path.dirname(destination), { recursive: true });
    const download = page.waitForEvent("download");
    await page.getByTitle("Save document", { exact: true }).click();
    await (await download).saveAs(destination);
    const uiSaved = await page.evaluate(
      async (bytes) => {
        const url = "/src/wasm/eigenvista_wasm.js";
        const core = await import(/* @vite-ignore */ url);
        await core.default();
        return JSON.parse(core.decode(new Uint8Array(bytes)));
      },
      Array.from(readFileSync(destination)),
    );
    expect(canonical(uiSaved)).toEqual(expected.restored);
    await open(page, destination);
    expect(await scene(page)).toEqual(uiRaw);
    await testInfo.attach(`${record.id}-application-save-reopen`, {
      body: uiRaw,
      contentType: "image/png",
    });
    await testInfo.attach(`${record.id}-renderer`, {
      body: Buffer.from(String(probe.renderer)),
      contentType: "text/plain",
    });
    expect(errors).toEqual([]);
  });
}
