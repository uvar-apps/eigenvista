import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

interface ProteinProbe {
  actions: string[];
  imports: { key: string; name: string; complete: boolean }[];
  backbones: { key: string; atoms: number }[];
  complete: string[];
  errors: string[];
  draws: { kind: string; count: number; instances: number }[];
}
type ProbedWindow = Window & { proteinViewProbe: ProteinProbe };
const crambin = path.resolve("../fixtures/bcif/1crn.cif");
const aon = path.resolve("../fixtures/cif/1AON.cif");
const pj = path.resolve("../fixtures/large-structure/4PJ1.pdb");

async function setup(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.proteinViewProbe = {
      actions: [],
      imports: [],
      backbones: [],
      complete: [],
      errors: [],
      draws: [],
    };
    const workers = new WeakMap<Worker, number>();
    let nextWorker = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      const probe = state.proteinViewProbe;
      probe.actions.push(message.action);
      if (
        message.action === "backbone" ||
        message.action === "import_document"
      ) {
        if (!workers.has(this)) workers.set(this, ++nextWorker);
        const key = `${workers.get(this)}:${message.id}`;
        const imported =
          message.action === "import_document"
            ? { key, name: String(message.args.name), complete: false }
            : null;
        if (imported) probe.imports.push(imported);
        else
          probe.backbones.push({
            key,
            atoms: message.args.doc.atoms.positions.length,
          });
        const receive = ({ data }: MessageEvent) => {
          if (
            data.id !== message.id ||
            (!("result" in data) && !("error" in data))
          )
            return;
          this.removeEventListener("message", receive);
          if ("error" in data) probe.errors.push(String(data.error));
          else if (imported) imported.complete = true;
          else probe.complete.push(key);
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
    // Contexts begin on the default draw framebuffer. Observe public binds
    // instead of synchronously reading GPU state on every production draw.
    const drawTargets = new WeakMap<
      WebGL2RenderingContext,
      WebGLFramebuffer | null
    >();
    const bindFramebuffer = prototype.bindFramebuffer;
    prototype.bindFramebuffer = function (
      this: WebGL2RenderingContext,
      ...args: unknown[]
    ) {
      const result = Reflect.apply(bindFramebuffer, this, args);
      if (args[0] === this.FRAMEBUFFER || args[0] === this.DRAW_FRAMEBUFFER)
        drawTargets.set(this, args[1] as WebGLFramebuffer | null);
      return result;
    };
    for (const kind of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const original = prototype[kind];
      prototype[kind] = function (
        this: WebGL2RenderingContext,
        ...args: unknown[]
      ) {
        if ((drawTargets.get(this) ?? null) === null) {
          const instanced = kind.endsWith("Instanced");
          state.proteinViewProbe.draws.push({
            kind,
            count: Number(args[kind.startsWith("drawElements") ? 1 : 2]),
            instances: instanced
              ? Number(args[kind.startsWith("drawElements") ? 4 : 3])
              : 0,
          });
          if (state.proteinViewProbe.draws.length > 100)
            state.proteinViewProbe.draws.shift();
        }
        return Reflect.apply(original, this, args);
      };
    }
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  // Bound GPU interaction cost without filtering atoms or changing the real
  // browser window, toolbar, import path, quality or per-test deadline.
  await page.addStyleTag({
    content:
      '.scene[data-testid="viewport"] { width:320px !important; height:240px !important; }',
  });
  const documentButton = page.getByRole("button", {
    name: "Molecular data",
    exact: true,
  });
  if ((await documentButton.getAttribute("aria-expanded")) !== "true")
    await documentButton.click();
  await expect(
    page.getByLabel("Molecular scene", { exact: true }),
  ).toHaveJSProperty("width", 320);
  // The initial mathematical example legitimately generates its own surface.
  // Start the no-QC ledger only after that cold fixture has been published.
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).proteinViewProbe.actions = [];
  });
}
async function open(page: Page, file: string) {
  const before = (await probe(page)).imports.length;
  await page.getByLabel("Open molecular file").setInputFiles(file);
  // Wait for this exact new worker transaction and its UI publication, using
  // the normal action wait budget within the unchanged60-second case limit.
  await page.waitForFunction(
    ({ before, name }) => {
      const state = (window as unknown as ProbedWindow).proteinViewProbe;
      return (
        state.imports
          .slice(before)
          .some((job) => job.name === name && job.complete) &&
        document
          .querySelector("footer [role=status]")
          ?.textContent?.includes("Opened " + name)
      );
    },
    { before, name: path.basename(file) },
  );
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened " + path.basename(file),
  );
  const documentButton = page.getByRole("button", {
    name: "Molecular data",
    exact: true,
  });
  if ((await documentButton.getAttribute("aria-expanded")) !== "true")
    await documentButton.click();
}
const probe = (page: Page) =>
  page.evaluate(() => (window as unknown as ProbedWindow).proteinViewProbe);
async function prepared(page: Page, jobs: number) {
  // Match the actual requested transaction keys; keep the existing30-second
  // action wait inside the unchanged60-second test budget.
  await page.waitForFunction((count) => {
    const state = (window as unknown as ProbedWindow).proteinViewProbe;
    return (
      state.errors.length > 0 ||
      (state.backbones.length >= count &&
        state.backbones
          .slice(0, count)
          .every((job) => state.complete.includes(job.key)))
    );
  }, jobs);
  expect((await probe(page)).complete.length).toBe(jobs);
  expect((await probe(page)).errors).toEqual([]);
  await expect(
    page.getByRole("status", { name: "Protein depiction status" }),
  ).not.toContainText(/Preparing|unavailable/);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await settleScene(page);
}
async function frame(page: Page, file: string, proteinOnly = false) {
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).proteinViewProbe.draws = [];
  });
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export image", exact: true }).click();
  await (await download).saveAs(file);
  const bytes = fs.readFileSync(file),
    pixels = await pngPixels(page, bytes),
    seen = await probe(page);
  expect(pixels.width).toBe(320);
  expect(pixels.height).toBe(240);
  expect(pixels.foreground12).toBeGreaterThan(50);
  expect(
    seen.draws.some(
      (draw) => !draw.kind.endsWith("Instanced") && draw.count > 0,
    ),
  ).toBe(true);
  if (proteinOnly)
    expect(
      seen.draws.filter(
        (draw) => draw.kind.endsWith("Instanced") && draw.instances > 0,
      ),
    ).toEqual([]);
  expect(
    await page
      .getByLabel("Molecular scene", { exact: true })
      .evaluate((canvas) =>
        (canvas as HTMLCanvasElement).getContext("webgl2")!.getError(),
      ),
  ).toBe(0);
  return bytes;
}
async function compositorParity(page: Page, exported: Buffer) {
  const compositor = await page
    .getByLabel("Molecular scene", { exact: true })
    .screenshot({
      style:
        '.viewport-tools, .scene-label, .viewport-error, [aria-label="Protein depiction status"] { visibility:hidden !important; }',
    });
  return page.evaluate(
    async ([first, second]) => {
      const decode = async (base64: string) => {
        const image = new Image();
        image.src = "data:image/png;base64," + base64;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return context.getImageData(0, 0, canvas.width, canvas.height);
      };
      const a = await decode(first),
        b = await decode(second);
      if (a.width !== b.width || a.height !== b.height)
        throw Error("PNG/compositor dimensions differ");
      let max = 0,
        sum = 0;
      for (let i = 0; i < a.data.length; i++) {
        const delta = Math.abs(a.data[i] - b.data[i]);
        max = Math.max(max, delta);
        sum += delta;
      }
      return { max, mean: sum / a.data.length };
    },
    [exported.toString("base64"), compositor.toString("base64")],
  );
}
async function nativeSave(page: Page, file: string) {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await download).saveAs(file);
  return page.evaluate(async (base64) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(
      core.decode(
        Uint8Array.from(atob(base64), (character) => character.charCodeAt(0)),
      ),
    );
  }, fs.readFileSync(file).toString("base64"));
}
async function expand(page: Page, label: RegExp) {
  const summary = page
    .locator(".structure-controls summary")
    .filter({ hasText: label });
  if (
    !(await summary.evaluate(
      (node) => (node.parentElement as HTMLDetailsElement).open,
    ))
  )
    await summary.click();
}

test("real 1CRN draws all four protein modes and preserves its global cartoon and identities through native Save/Open", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await open(page, crambin);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("secondary");
  const hashes = [];
  for (const representation of ["trace", "tube", "ribbon", "cartoon"]) {
    await page
      .getByLabel("Representation", { exact: true })
      .selectOption(representation);
    await prepared(page, 1);
    const bytes = await frame(
      page,
      info.outputPath(`1crn-${representation}.png`),
      true,
    );
    hashes.push(createHash("sha256").update(bytes).digest("hex"));
  }
  expect(new Set(hashes).size).toBe(4);
  expect((await probe(page)).backbones.map((job) => job.atoms)).toEqual([327]);
  const file = info.outputPath("1crn-cartoon.eigenvista"),
    saved = await nativeSave(page, file);
  expect(saved.view.representation).toBe("cartoon");
  expect(saved.structure.residues).toHaveLength(46);
  expect(saved.atoms.positions).toHaveLength(327);
  expect(saved.surfaces).toEqual([]);
  await open(page, file);
  await expect(page.getByLabel("Representation", { exact: true })).toHaveValue(
    "cartoon",
  );
  await prepared(page, 2);
  const reopened = await frame(
    page,
    info.outputPath("1crn-reopened.png"),
    true,
  );
  const parity = await compositorParity(page, reopened);
  expect(parity.max).toBeLessThanOrEqual(2);
  expect(parity.mean).toBeLessThanOrEqual(0.1);
  await info.attach("protein-png-parity", {
    body: Buffer.from(JSON.stringify(parity)),
    contentType: "application/json",
  });
  expect(
    (await probe(page)).actions.filter(
      (action) => action === "sample" || action === "generate",
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await info.attach("protein-worker-and-draws", {
    body: Buffer.from(JSON.stringify(await probe(page))),
    contentType: "application/json",
  });
});

test("full 1AON keeps source atoms while chain/entity colors, mixed detail and isolation reuse one prepared backbone", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await open(page, aon);
  await expect(page.locator(".document-summary strong")).toHaveText(
    "58870 atoms",
  );
  // Trace keeps this interaction matrix bounded for software GPUs. Full-size
  // cartoon visual qualification is a separate actual-app manual gate.
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("trace");
  await prepared(page, 1);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("chain");
  const chain = await frame(page, info.outputPath("1aon-chain-trace.png"));
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("entity");
  const entity = await frame(page, info.outputPath("1aon-entity-trace.png"));
  expect(chain.equals(entity)).toBe(false);
  await expand(page, /^Components$/);
  await page
    .getByLabel("Style for Ligand", { exact: true })
    .selectOption("space-fill");
  await expand(page, /^Chains/);
  await page
    .getByRole("button", { name: "Isolate chain A", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Focus chain A", exact: true })
    .click();
  await settleScene(page);
  const isolated = await frame(
    page,
    info.outputPath("1aon-isolated-A.png"),
    true,
  );
  // Select real geometry through pointer events, then independently verify its
  // reported CA source index against the unchanged deposited atom_site rows.
  const source = fs.readFileSync(aon, "utf8").split(/\r?\n/);
  let line = source.findIndex((text) => text.trim() === "_atom_site.group_PDB");
  const headers: string[] = [];
  while (source[line]?.trim().startsWith("_atom_site."))
    headers.push(source[line++].trim());
  const column = (name: string) => headers.indexOf(`_atom_site.${name}`);
  const expected = new Map<number, string>();
  let atom = 0;
  while (source[line] && !source[line].trim().startsWith("#")) {
    const values = source[line++].trim().split(/\s+/);
    if (!["ATOM", "HETATM"].includes(values[0])) continue;
    if (values[column("label_atom_id")] === "CA")
      expected.set(
        atom + 1,
        `${values[column("label_comp_id")]} ${values[column("auth_seq_id")]}`,
      );
    atom++;
  }
  const targets = await page.evaluate(async (base64) => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data,
      visible: number[] = [];
    for (let pixel = 0; pixel < canvas.width * canvas.height; pixel++) {
      const i = pixel * 4;
      if (
        Math.abs(data[i] - 232) +
          Math.abs(data[i + 1] - 237) +
          Math.abs(data[i + 2] - 239) >
        45
      )
        visible.push(pixel);
    }
    return Array.from({ length: Math.min(25, visible.length) }, (_, i) => {
      const pixel =
        visible[
          Math.floor(
            (i * (visible.length - 1)) /
              Math.max(1, Math.min(25, visible.length) - 1),
          )
        ];
      return {
        x: (pixel % canvas.width) + 0.5,
        y: Math.floor(pixel / canvas.width) + 0.5,
      };
    });
  }, isolated.toString("base64"));
  expect(targets.length).toBeGreaterThan(0);
  const canvas = page.getByLabel("Molecular scene", { exact: true }),
    box = (await canvas.boundingBox())!;
  let picked = "";
  for (const target of targets) {
    await page.mouse.click(
      box.x + (target.x * box.width) / 320,
      box.y + (target.y * box.height) / 240,
    );
    picked = await page.locator(".selection-status").innerText();
    if (/CA atom \d+/.test(picked)) break;
  }
  const match = picked.match(/CA atom (\d+)/);
  expect(match).not.toBeNull();
  expect(picked).toContain(expected.get(Number(match![1]))!);
  await page
    .getByRole("button", { name: "Show all components", exact: true })
    .click();
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await settleScene(page);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await settleScene(page);
  await frame(page, info.outputPath("1aon-restored-zoom.png"));
  await expect(page.locator(".document-summary strong")).toHaveText(
    "58870 atoms",
  );
  const seen = await probe(page);
  expect(seen.backbones.map((job) => job.atoms)).toEqual([58870]);
  expect(
    seen.actions.filter(
      (action) => action === "sample" || action === "generate",
    ),
  ).toEqual([]);
  expect(seen.errors).toEqual([]);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: info.outputPath("1aon-bounded-app.png"),
    fullPage: true,
  });
  await info.attach("protein-worker-and-draws", {
    body: Buffer.from(JSON.stringify(seen)),
    contentType: "application/json",
  });
});

test("full 4PJ1 PDB draws a deposited-secondary cartoon without losing source atoms", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await open(page, pj);
  await expect(page.locator(".document-summary strong")).toHaveText(
    "65963 atoms",
  );
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("cartoon");
  await prepared(page, 1);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("secondary");
  await frame(page, info.outputPath("4pj1-secondary-cartoon.png"));
  await expect(
    page.getByRole("list", { name: "Structure color legend" }),
  ).toContainText("sheet");
  const seen = await probe(page);
  expect(seen.backbones.map((job) => job.atoms)).toEqual([65963]);
  expect(
    seen.actions.filter(
      (action) => action === "sample" || action === "generate",
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.screenshot({
    path: info.outputPath("4pj1-bounded-app.png"),
    fullPage: true,
  });
  await info.attach("protein-worker-and-draws", {
    body: Buffer.from(JSON.stringify(seen)),
    contentType: "application/json",
  });
});
