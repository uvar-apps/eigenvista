import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { EigenVistaDocument } from "../src/types";
import type { ProteinBackbone } from "../src/useProteinBackbone";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

interface MicrohetProbe {
  actions: string[];
  imports: { key: string; name: string; document: EigenVistaDocument | null }[];
  backbones: { key: string; atoms: number; result: ProteinBackbone | null }[];
  errors: string[];
  draws: { method: string; mode: number; count: number; instances: number }[];
}
type ProbedWindow = Window & { microhetProbe: MicrohetProbe };
const fixture = path.resolve("tests/fixtures/structure-controls/microhet.cif");

async function ready(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.microhetProbe = {
      actions: [],
      imports: [],
      backbones: [],
      errors: [],
      draws: [],
    };
    const workers = new WeakMap<Worker, number>();
    let next = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      const probe = state.microhetProbe;
      probe.actions.push(message.action);
      if (["import_document", "backbone"].includes(message.action)) {
        if (!workers.has(this)) workers.set(this, ++next);
        const key = `${workers.get(this)}:${message.id}`;
        const imported =
          message.action === "import_document"
            ? {
                key,
                name: String(message.args.name),
                document: null as EigenVistaDocument | null,
              }
            : null;
        const backbone = imported
          ? null
          : {
              key,
              atoms: message.args.doc.atoms.positions.length,
              result: null as ProteinBackbone | null,
            };
        if (imported) probe.imports.push(imported);
        else probe.backbones.push(backbone!);
        const receive = ({ data }: MessageEvent) => {
          if (
            data.id !== message.id ||
            (!("result" in data) && !("error" in data))
          )
            return;
          this.removeEventListener("message", receive);
          if ("error" in data) probe.errors.push(String(data.error));
          else if (imported)
            imported.document = structuredClone(data.result.document);
          else backbone!.result = structuredClone(data.result);
        };
        this.addEventListener("message", receive);
      }
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >;
    const targets = new WeakMap<
      WebGL2RenderingContext,
      WebGLFramebuffer | null
    >();
    const bind = prototype.bindFramebuffer;
    prototype.bindFramebuffer = function (
      this: WebGL2RenderingContext,
      ...args: unknown[]
    ) {
      const result = Reflect.apply(bind, this, args);
      if (args[0] === this.FRAMEBUFFER || args[0] === this.DRAW_FRAMEBUFFER)
        targets.set(this, args[1] as WebGLFramebuffer | null);
      return result;
    };
    for (const method of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const draw = prototype[method];
      prototype[method] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        if ((targets.get(this) ?? null) === null) {
          state.microhetProbe.draws.push({
            method,
            mode: Number(args[0]),
            count: Number(args[method.startsWith("drawElements") ? 1 : 2]),
            instances: method.endsWith("Instanced")
              ? Number(args[method.startsWith("drawElements") ? 4 : 3])
              : 0,
          });
          if (state.microhetProbe.draws.length > 40)
            state.microhetProbe.draws.shift();
        }
        return Reflect.apply(draw, this, args);
      };
    }
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.addStyleTag({
    content:
      '.scene[data-testid="viewport"] { width:320px !important; height:240px !important; }',
  });
  const heading = page.getByRole("button", { name: "Document", exact: true });
  if ((await heading.getAttribute("aria-expanded")) !== "true")
    await heading.click();
  // Exclude the legitimate cold mathematical example's generated surface.
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).microhetProbe.actions = [];
  });
}
const probe = (page: Page) =>
  page.evaluate(() => (window as unknown as ProbedWindow).microhetProbe);
async function open(page: Page, file: string) {
  const before = (await probe(page)).imports.length;
  await page.getByLabel("Open molecular file").setInputFiles(file);
  await page.waitForFunction(
    ({ before, name }) => {
      const state = (window as unknown as ProbedWindow).microhetProbe;
      return (
        state.errors.length ||
        (state.imports
          .slice(before)
          .some((item) => item.name === name && item.document) &&
          document
            .querySelector("footer [role=status]")
            ?.textContent?.includes("Opened " + name))
      );
    },
    { before, name: path.basename(file) },
  );
  expect((await probe(page)).errors).toEqual([]);
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened " + path.basename(file),
  );
}
async function prepared(page: Page, count: number) {
  await page.waitForFunction((count) => {
    const state = (window as unknown as ProbedWindow).microhetProbe;
    return (
      state.errors.length ||
      (state.backbones.length >= count &&
        state.backbones.slice(0, count).every((item) => item.result))
    );
  }, count);
  const seen = await probe(page);
  expect(seen.errors).toEqual([]);
  expect(seen.backbones).toHaveLength(count);
  for (const job of seen.backbones) {
    expect(job.atoms).toBe(20);
    expect(
      job.result!.segments.map((segment) =>
        segment.points.map((point) => point.atom),
      ),
    ).toEqual([[1], [13, 17]]);
    expect(job.result!.warnings.join("\n")).toMatch(
      /multiple deposited residue identities/,
    );
    expect(job.result!.warnings.join("\n")).toMatch(/ambiguous/);
  }
  await expect(
    page.getByRole("status", { name: "Protein depiction status" }),
  ).toContainText(/ambiguous/);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await settleScene(page);
}

test("mmCIF microheterogeneity preserves both selected monomers and native data while trace stops at the ambiguous position", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await open(page, fixture);
  await expect(page.locator(".document-summary strong")).toHaveText("20 atoms");
  const original = (await probe(page)).imports[0].document!;
  expect(original.atoms.positions).toHaveLength(20);
  expect(original.atoms.elements).toEqual(
    Array.from({ length: 5 }, () => [7, 6, 6, 8]).flat(),
  );
  expect(original.structure!.atom_names).toEqual(
    Array.from({ length: 5 }, () => ["N", "CA", "C", "O"]).flat(),
  );
  expect(original.structure!.atom_residues).toEqual(
    Array.from({ length: 5 }, (_, index) => [
      index,
      index,
      index,
      index,
    ]).flat(),
  );
  expect(
    original.structure!.residues.map((residue) => [
      residue.name,
      residue.label_seq_id,
      residue.author_seq_id,
    ]),
  ).toEqual([
    ["ALA", 1, "9"],
    ["SER", 2, "10"],
    ["CYS", 2, "10"],
    ["GLY", 3, "11"],
    ["THR", 4, "12"],
  ]);
  const bohr = 0.529177210903;
  const alpha = [1, 5, 9, 13, 17].map((atom) =>
    original.atoms.positions[atom].map((value) => value * bohr),
  );
  expect(alpha.map((point) => point[0])).toEqual(
    [0, 3.8, 3.8, 7.6, 11.4].map((value) => expect.closeTo(value, 10)),
  );
  expect(alpha[2][1]).toBeCloseTo(0.2, 10);
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("trace");
  await prepared(page, 1);
  const native = info.outputPath("microhet-trace.eigenvista");
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await download).saveAs(native);
  const saved = await page.evaluate(async (base64) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(
      core.decode(
        Uint8Array.from(atob(base64), (value) => value.charCodeAt(0)),
      ),
    ) as EigenVistaDocument;
  }, fs.readFileSync(native).toString("base64"));
  expect(saved).toEqual({
    ...original,
    view: { ...original.view, representation: "trace" },
  });
  await open(page, native);
  await prepared(page, 2);
  await expect(page.getByLabel("Representation", { exact: true })).toHaveValue(
    "trace",
  );
  expect((await probe(page)).imports[1].document).toEqual(saved);
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).microhetProbe.draws = [];
  });
  const image = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  const png = info.outputPath("microhet-reopened-trace.png");
  await (await image).saveAs(png);
  expect(
    (await pngPixels(page, fs.readFileSync(png))).foreground12,
  ).toBeGreaterThan(10);
  const seen = await probe(page);
  // Only GLY13→THR17 is a line: the singleton ALA1 is a marker and neither
  // alternative anchor at source5/9 may connect across the ambiguous site.
  const lines = seen.draws.filter(
    (draw) => draw.method === "drawArrays" && draw.mode === 1,
  );
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) expect(line.count).toBe(2);
  expect(
    seen.draws.some((draw) => draw.method === "drawElements" && draw.count > 0),
  ).toBe(true);
  expect(seen.draws.filter((draw) => draw.instances > 0)).toEqual([]);
  expect(
    seen.actions.filter(
      (action) => action === "sample" || action === "generate",
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await info.attach("microheterogeneity-source-and-backbones", {
    contentType: "application/json",
    body: Buffer.from(JSON.stringify(seen)),
  });
});
