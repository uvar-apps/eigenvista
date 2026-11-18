import { activateWidget } from "./workspace";
import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type {
  MolecularSurface,
  MolecularSurfaceRequest,
} from "../src/inspectionTypes";
import type { EigenVistaDocument } from "../src/types";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

type Job = {
  jobId: string;
  status: string;
  result?: unknown;
  error?: { message: string };
};
type SurfaceSummary = Omit<
  MolecularSurface,
  | "positions"
  | "normals"
  | "indices"
  | "vertex_atoms"
  | "atom_indices"
  | "radii_angstrom"
  | "warnings"
> & {
  atomCount: number;
  vertexCount: number;
  triangleCount: number;
  warningCount: number;
  warnings: string[];
};
type Probe = {
  actions: Array<{ action: string; supplied: boolean; id: number }>;
  cancelJob?: string;
  terminated: number[];
  active?: number;
  progress: string[];
  publication?: {
    jobId: string;
    armed: boolean;
    events: string[];
    cancel?: Promise<Job>;
  };
};
type AppWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  molecularSurfaceProbe: Probe;
};

async function call<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const result = await page.evaluate(
    async ({ method, params }) => {
      try {
        return {
          ok: true,
          value: await (
            window as unknown as AppWindow
          ).eigenvistaControl!.request(method, params),
        };
      } catch (error) {
        return { ok: false, error: String(error) };
      }
    },
    { method, params },
  );
  if (!result.ok) throw new Error(result.error);
  return result.value as T;
}

async function terminal(
  page: Page,
  receipt: { jobId: string },
  expected = "completed",
) {
  let job: Job | undefined;
  await expect
    .poll(
      async () => {
        job = await call<Job>(page, "job.get", { jobId: receipt.jobId });
        return job.status;
      },
      { timeout: 45_000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  expect(job!.status, JSON.stringify(job)).toBe(expected);
  return job!;
}

async function ready(page: Page) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as AppWindow;
    state.molecularSurfaceProbe = { actions: [], terminated: [], progress: [] };
    const post = Worker.prototype.postMessage;
    const terminate = Worker.prototype.terminate;
    Worker.prototype.postMessage = function (...args) {
      const message = args[0];
      state.molecularSurfaceProbe.actions.push({
        action: message.action,
        supplied: Boolean(message.args?.doc),
        id: message.id,
      });
      this.addEventListener("message", ({ data }) => {
        if (data.id !== message.id || message.action !== "molecular_surface")
          return;
        if (data.progress) {
          state.molecularSurfaceProbe.active = data.id;
          state.molecularSurfaceProbe.progress.push(data.progress);
          if (state.molecularSurfaceProbe.cancelJob) {
            const jobId = state.molecularSurfaceProbe.cancelJob;
            state.molecularSurfaceProbe.cancelJob = undefined;
            void state.eigenvistaControl!.request("job.cancel", { jobId });
          }
        }
      });
      return Reflect.apply(post, this, args);
    };
    Worker.prototype.terminate = function () {
      if (state.molecularSurfaceProbe.active !== undefined)
        state.molecularSurfaceProbe.terminated.push(
          state.molecularSurfaceProbe.active,
        );
      return Reflect.apply(terminate, this, []);
    };
  });
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as unknown as AppWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
}

async function open(page: Page, name: string, bytes: number[]) {
  const receipt = await call<{ jobId?: string }>(page, "document.open", {
    name,
    bytes,
    discardUnsaved: true,
  });
  if (receipt.jobId) await terminal(page, { jobId: receipt.jobId });
}

const openFile = (page: Page, file: string) =>
  open(page, path.basename(file), Array.from(fs.readFileSync(file)));
const list = (page: Page) =>
  call<{ total: number; items: SurfaceSummary[] }>(
    page,
    "molecularSurfaces.list",
  );
const request = (
  id: string,
  kind: "ses" | "sas" = "ses",
  atom_indices: number[] = [],
): MolecularSurfaceRequest => ({
  id,
  label: id,
  kind,
  atom_indices,
  radii_set: "bondi",
  radii_overrides: [],
  probe_radius: 1.4,
  spacing: 0.5,
  color: "#8aa7bb",
  opacity: 0.8,
});
async function generate(
  page: Page,
  value: MolecularSurfaceRequest,
  expected = "completed",
) {
  return terminal(
    page,
    await call<{ jobId: string }>(page, "molecularSurfaces.generate", {
      request: value,
    }),
    expected,
  );
}

async function savedDocument(page: Page) {
  const saved = await call<{ bytes: number[] }>(page, "document.save");
  const doc = await page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(core.decode(new Uint8Array(bytes))) as EigenVistaDocument;
  }, saved.bytes);
  return { ...saved, doc };
}

test("publication-boundary cancellation completes the accepted molecular result", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const descriptor = Object.getOwnPropertyDescriptor(
      Worker.prototype,
      "onmessage",
    )!;
    Object.defineProperty(Worker.prototype, "onmessage", {
      ...descriptor,
      set(handler: (event: MessageEvent) => void) {
        descriptor.set!.call(
          this,
          function (this: Worker, event: MessageEvent) {
            handler.call(this, event);
            const state = window as unknown as AppWindow;
            const proof = state.molecularSurfaceProbe.publication;
            const validation = state.molecularSurfaceProbe.actions.some(
              (action) =>
                action.id === event.data.id &&
                action.action === "inspection_validate",
            );
            if (
              proof?.armed &&
              validation &&
              Object.hasOwn(event.data, "result")
            ) {
              proof.armed = false;
              proof.events.push("validator-resolved");
              // The real validator resolution queues commit before this microtask;
              // cancellation then arrives while the outer async execute unwinds.
              queueMicrotask(() => {
                proof.events.push("cancel-after-validator");
                proof.cancel = state.eigenvistaControl!.request("job.cancel", {
                  jobId: proof.jobId,
                }) as Promise<Job>;
              });
            }
          },
        );
      },
    });
  });
  await ready(page);
  await open(
    page,
    "publication.xyz",
    Array.from(Buffer.from("1\nPublication boundary\nC 0 0 0\n")),
  );
  const receipt = await page.evaluate(async (value) => {
    const state = window as unknown as AppWindow;
    const receipt = (await state.eigenvistaControl!.request(
      "molecularSurfaces.generate",
      {
        request: value,
      },
    )) as { jobId: string };
    state.molecularSurfaceProbe.publication = {
      jobId: receipt.jobId,
      armed: true,
      events: [],
    };
    return receipt;
  }, request("publication-boundary"));
  const job = await terminal(page, receipt);
  const proof = await page.evaluate(async () => {
    const proof = (window as unknown as AppWindow).molecularSurfaceProbe
      .publication!;
    return {
      events: proof.events,
      cancel: proof.cancel ? await proof.cancel : null,
    };
  });
  expect(proof.events).toEqual([
    "validator-resolved",
    "cancel-after-validator",
  ]);
  expect(proof.cancel?.status).toBe("completed");
  expect(proof.cancel?.result).toEqual(job.result);
  expect((await list(page)).items.map((surface) => surface.id)).toEqual([
    "publication-boundary",
  ]);
});

test("molecular shader targets affect only the chosen mesh and survive uniform updates", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "shader-targets.xyz",
    Array.from(Buffer.from("2\nIndependent mesh targets\nC -3 0 0\nC 3 0 0\n")),
  );
  await generate(page, request("left", "ses", [0]));
  await generate(page, request("right", "ses", [1]));
  await call(page, "camera.fit");
  await settleScene(page);
  await activateWidget(page, "surface-shader");
  const panel = page.getByRole("button", {
    name: "Surface shader",
    exact: true,
  });
  if ((await panel.getAttribute("aria-expanded")) === "false")
    await panel.click();
  const targets = page.getByLabel("Shader target surfaces", { exact: true });
  await expect(targets.locator("option")).toHaveText([
    "All surfaces",
    "left",
    "right",
  ]);
  const frame = async () =>
    (await call<{ dataUrl: string }>(page, "image.export")).dataUrl;

  await call(page, "molecularSurfaces.set", { id: "left", visible: false });
  const unshadedRight = await frame();
  await call(page, "shader.apply", {
    preset: "surface-clip",
    target: "left",
    uniforms: { factor: 0.24, zmax: 0.25 },
  });
  expect(await frame()).toBe(unshadedRight);

  await call(page, "molecularSurfaces.set", { id: "right", visible: false });
  await call(page, "molecularSurfaces.set", { id: "left", visible: true });
  const clippedLeft = await frame();
  await call(page, "shader.clear");
  expect(await frame()).not.toBe(clippedLeft);
  await call(page, "shader.apply", { preset: "surface-clip", target: "left" });
  await targets.selectOption("right");
  await call(page, "shader.set_uniforms", { uniforms: { factor: 0.31 } });
  const accepted = await call<{
    shader: { target: string; uniforms: { factor: number } };
  }>(page, "app.state");
  expect(accepted.shader.target).toBe("right");
  expect(accepted.shader.uniforms.factor).toBe(0.31);
  await expect(
    call(page, "shader.apply", { preset: "x-ray", target: "missing" }),
  ).rejects.toThrow(/Unknown shader target/);
  expect(
    (await call<{ shader: { target: string } }>(page, "app.state")).shader
      .target,
  ).toBe("right");
});

test("large valid cached warning collections remain complete and fully pageable", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "warnings.xyz",
    Array.from(Buffer.from("1\nWarnings provenance\nC 0 0 0\n")),
  );
  await generate(page, request("warnings-source"));
  const { doc } = await savedDocument(page);
  const bytes = await page.evaluate(async (doc) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const source = doc.molecular_surfaces![0];
    doc.molecular_surfaces = Array.from({ length: 32 }, (_, surface) => ({
      ...source,
      id: "warnings-" + surface,
      label: "Cached warnings " + surface,
      visible: false,
      warnings: Array.from({ length: 128 }, (_, warning) =>
        (surface + ":" + warning + ":").padEnd(1024, "w"),
      ),
    }));
    return Array.from(core.encode(JSON.stringify(doc))) as number[];
  }, doc);
  await open(page, "warnings.eigenvista", bytes);
  const summaries = await list(page);
  expect(summaries.total).toBe(32);
  expect(summaries.items.map((surface) => surface.id)).toEqual(
    Array.from({ length: 32 }, (_, surface) => "warnings-" + surface),
  );
  for (const [surface, summary] of summaries.items.entries()) {
    expect(summary.warningCount).toBe(128);
    expect(
      summary.warnings,
      "Complete warnings for surface " + surface,
    ).toEqual(
      Array.from({ length: 128 }, (_, warning) =>
        (surface + ":" + warning + ":").padEnd(1024, "w"),
      ),
    );
  }
  const first = await call<{ total: number; offset: number; items: string[] }>(
    page,
    "molecularSurfaces.warnings",
    {
      id: "warnings-31",
      offset: 0,
      limit: 100,
    },
  );
  const next = await call<typeof first>(page, "molecularSurfaces.warnings", {
    id: "warnings-31",
    offset: 100,
    limit: 100,
  });
  expect(first.total).toBe(128);
  expect(first.offset).toBe(0);
  expect(first.items).toHaveLength(100);
  expect(next.total).toBe(128);
  expect(next.offset).toBe(100);
  expect(next.items).toHaveLength(28);
  expect([...first.items, ...next.items]).toEqual(
    Array.from({ length: 128 }, (_, warning) =>
      ("31:" + warning + ":").padEnd(1024, "w"),
    ),
  );
});

test("molecular surface picks preserve original atom attribution and invalidate replaced geometry", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "surface-pick.xyz",
    Array.from(
      Buffer.from("2\nSource index is not mesh index\nO 20 0 0\nC 0 0 0\n"),
    ),
  );
  await generate(page, request("picked", "ses", [1]));
  await call(page, "selection.pick_mode", { enabled: true });
  await call(page, "camera.set", {
    position: [0, 0, 30],
    target: [0, 0, 0],
    up: [0, 1, 0],
  });
  await settleScene(page);
  const scene = page.getByLabel("Molecular scene", { exact: true });
  const bounds = (await scene.boundingBox())!;
  await scene.click({
    position: { x: bounds.width / 2, y: bounds.height / 2 },
  });
  type Pick = {
    kind: string;
    atom: number;
    surface: string;
    attribution: string;
    point: number[];
  };
  const selection = await call<{ items: number[]; lastPick: Pick }>(
    page,
    "selection.get",
  );
  expect(selection.items).toEqual([1]);
  expect(selection.lastPick).toMatchObject({
    kind: "molecular_surface",
    atom: 1,
    surface: "picked",
    attribution: "mesh_vertex",
  });
  expect(selection.lastPick.point.every(Number.isFinite)).toBe(true);
  expect(Math.hypot(...selection.lastPick.point) * 0.529177210903).toBeCloseTo(
    1.7,
    1,
  );
  expect(
    (await call<{ inspection: { lastPick: Pick } }>(page, "app.state"))
      .inspection.lastPick,
  ).toEqual(selection.lastPick);
  await generate(page, { ...request("picked", "ses", [1]), spacing: 0.25 });
  expect(
    (await call<{ lastPick: Pick | null }>(page, "selection.get")).lastPick,
  ).toBeNull();
  expect(
    (await call<{ items: number[] }>(page, "selection.get")).items,
  ).toEqual([1]);
});

test("production worker SES/SAS preserves original atom identity and independent sphere geometry", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "separated.xyz",
    Array.from(
      new TextEncoder().encode(
        "2\nseparated oxygen and carbon\nO 20 0 0\nC 3 -2 1\n",
      ),
    ),
  );
  for (const kind of ["ses", "sas"] as const) {
    const value = request(kind, kind, [1]);
    value.spacing = 0.25;
    value.radii_overrides = [{ element: 6, radius_angstrom: 1.5 }];
    await generate(page, value);
  }
  const { doc } = await savedDocument(page);
  expect(doc.molecular_surfaces).toHaveLength(2);
  for (const mesh of doc.molecular_surfaces!) {
    expect(mesh.atom_indices).toEqual([1]);
    expect(new Set(mesh.vertex_atoms)).toEqual(new Set([1]));
    const radius = mesh.kind === "ses" ? 1.5 : 2.9;
    expect(
      Math.abs(mesh.stats.area_angstrom2 - 4 * Math.PI * radius ** 2) /
        (4 * Math.PI * radius ** 2),
    ).toBeLessThan(0.015);
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const distance = Math.hypot(
        ...mesh.positions
          .slice(i, i + 3)
          .map((v, axis) => v * 0.529177210903 - [3, -2, 1][axis]),
      );
      // Exact field refinement + the documented nondegenerate-edge clamp + f32 rounding.
      expect(Math.abs(distance - radius)).toBeLessThan(4.1e-5);
    }
    expect(mesh.engine).toBe("sesmesh-1.1.2+eigenvista-wasm-v1");
    expect(mesh.cavity_policy).toBe("keep");
  }
  const probe = await page.evaluate(
    () => (window as unknown as AppWindow).molecularSurfaceProbe,
  );
  for (const stage of ["geometry", "classify", "mesh", "assemble", "measure"])
    expect(probe.progress).toContain(stage);
  expect(
    probe.actions.filter((a) => a.action === "molecular_surface"),
  ).toHaveLength(2);
});

test("GUI and API share named selections, radius overrides and complete cached-surface editing", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "carbon.xyz",
    Array.from(new TextEncoder().encode("1\ncarbon\nC 0 0 0\n")),
  );
  await activateWidget(page, "molecular");
  await page
    .getByLabel("Molecular surface source", { exact: true })
    .selectOption("current");
  await page
    .getByRole("button", { name: "Generate molecular surface", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "nonempty" }),
  ).toBeVisible();
  expect((await list(page)).total).toBe(0);
  await call(page, "selection.set", { atoms: [0] });
  await call(page, "selection.save", { id: "carbon", label: "Chosen carbon" });
  await page
    .getByLabel("Molecular surface source", { exact: true })
    .selectOption("named");
  await page
    .getByLabel("Molecular surface named selection", { exact: true })
    .selectOption("carbon");
  await page
    .getByLabel("Molecular surface name", { exact: true })
    .fill("Carbon SES");
  await page.getByText("Explicit radius overrides", { exact: true }).click();
  await page
    .getByRole("button", { name: "Add radius override", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Generate molecular surface", exact: true })
    .click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Radius overrides require" }),
  ).toBeVisible();
  await page.getByLabel("Radius override value 1", { exact: true }).fill("1.7");
  await page
    .getByRole("button", { name: "Generate molecular surface", exact: true })
    .click();
  await expect.poll(async () => (await list(page)).total).toBe(1);
  const original = (await list(page)).items[0];
  expect(original).toMatchObject({
    label: "Carbon SES",
    kind: "ses",
    atomCount: 1,
    radii_overrides: [{ element: 6, radius_angstrom: 1.7 }],
  });
  await page.getByText(/^Carbon SES · SES ·/).click();
  await page.getByLabel("Show Carbon SES", { exact: true }).uncheck();
  await expect
    .poll(async () => (await list(page)).items[0].visible)
    .toBe(false);
  await page
    .getByLabel("Name for Carbon SES", { exact: true })
    .fill("Edited carbon");
  await page
    .getByLabel("Color for Carbon SES", { exact: true })
    .fill("#dd8899");
  await page.getByLabel("Opacity for Carbon SES", { exact: true }).fill("0.4");
  await expect
    .poll(async () => {
      const surface = (await list(page)).items[0];
      return {
        label: surface.label,
        color: surface.color,
        opacity: surface.opacity,
      };
    })
    .toEqual({ label: "Carbon SES", color: "#dd8899", opacity: 0.4 });
  await page
    .getByRole("button", { name: "Rename surface", exact: true })
    .click();
  await expect
    .poll(async () => (await list(page)).items[0].label)
    .toBe("Edited carbon");
  expect((await list(page)).items[0]).toMatchObject({
    id: original.id,
    source_hash: original.source_hash,
    color: "#dd8899",
    opacity: 0.4,
    visible: false,
  });
  await page
    .getByLabel("Molecular surface to edit", { exact: true })
    .selectOption(original.id);
  await expect(
    page.getByLabel("Molecular surface source", { exact: true }),
  ).toHaveValue("saved");
  await page
    .getByLabel("Molecular surface type", { exact: true })
    .selectOption("sas");
  await page
    .getByRole("button", { name: "Regenerate molecular surface", exact: true })
    .click();
  await expect.poll(async () => (await list(page)).items[0].kind).toBe("sas");
  expect((await list(page)).items[0].id).toBe(original.id);
  await page
    .getByRole("button", { name: "Remove molecular surface", exact: true })
    .click();
  await expect.poll(async () => (await list(page)).total).toBe(0);
});

test("real 1CRN saved-surface color and opacity update live, coalesce and persist without changing geometry", async ({
  page,
}, info) => {
  await ready(page);
  await openFile(page, path.resolve("../fixtures/bcif/1crn.bcif"));
  const source = await call<{ document: { atomCount: number } }>(
    page,
    "app.state",
  );
  expect(source.document.atomCount).toBe(327);
  await generate(page, {
    ...request("Live crambin SES"),
    color: "#d9534f",
    opacity: 1,
  });
  await call(page, "camera.fit");
  await settleScene(page);
  const original = (await savedDocument(page)).doc;
  const originalMesh = original.molecular_surfaces![0];
  await activateWidget(page, "molecular");
  await page.getByText(/^Live crambin SES · SES ·/).click();
  const color = page.getByLabel("Color for Live crambin SES", { exact: true });
  const opacity = page.getByLabel("Opacity for Live crambin SES", {
    exact: true,
  });
  const accepted = async () => {
    const surface = (await list(page)).items[0];
    return { color: surface.color, opacity: surface.opacity };
  };
  const image = () =>
    call<{ dataUrl: string; width: number; height: number }>(
      page,
      "image.export",
    );
  const before = await image();
  await color.fill("#3979e0");
  await expect(color).toBeFocused();
  await expect(color).toBeEnabled();
  await expect(opacity).toBeEnabled();
  await expect.poll(accepted).toEqual({ color: "#3979e0", opacity: 1 });
  await expect(color).toBeFocused();
  const recolored = await image();
  await opacity.fill("0.25");
  await expect(opacity).toBeFocused();
  await expect(color).toBeEnabled();
  await expect(opacity).toBeEnabled();
  await expect.poll(accepted).toEqual({ color: "#3979e0", opacity: 0.25 });
  await expect(opacity).toBeFocused();
  const translucent = await image();
  const difference = async (first: string, second: string) =>
    page.evaluate(
      async ({ first, second }) => {
        const pixels = async (url: string) => {
          const image = new Image();
          image.src = url;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return {
            width: image.width,
            height: image.height,
            rgba: context.getImageData(0, 0, image.width, image.height).data,
          };
        };
        const a = await pixels(first),
          b = await pixels(second);
        if (a.width !== b.width || a.height !== b.height)
          throw Error("Appearance edits changed image dimensions");
        let changed = 0,
          totalDifference = 0;
        for (let index = 0; index < a.rgba.length; index += 4) {
          const delta =
            Math.abs(a.rgba[index] - b.rgba[index]) +
            Math.abs(a.rgba[index + 1] - b.rgba[index + 1]) +
            Math.abs(a.rgba[index + 2] - b.rgba[index + 2]);
          if (delta > 36) changed++;
          totalDifference += delta;
        }
        return {
          changedFraction: changed / (a.width * a.height),
          meanDifference: totalDifference / (a.width * a.height * 3),
        };
      },
      { first, second },
    );
  for (const [first, second] of [
    [before, recolored],
    [recolored, translucent],
  ]) {
    const change = await difference(first.dataUrl, second.dataUrl);
    expect(change.changedFraction).toBeGreaterThan(0.03);
    expect(change.meanDifference).toBeGreaterThan(1);
  }
  for (const [name, capture] of [
    ["live-red", before],
    ["live-blue", recolored],
    ["live-opacity", translucent],
  ] as const) {
    const imagePath = info.outputPath(`${name}.png`);
    fs.writeFileSync(
      imagePath,
      Buffer.from(capture.dataUrl.split(",")[1], "base64"),
    );
    await info.attach(`${name}.png`, {
      path: imagePath,
      contentType: "image/png",
    });
  }

  // Real input events in one task arrive before the first validation can finish.
  // They must stay editable and preserve the latest color AND opacity together.
  const enabledDuringBurst = await page.evaluate(() => {
    const find = (label: string) =>
      document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    const color = find("Color for Live crambin SES"),
      opacity = find("Opacity for Live crambin SES");
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    const states: boolean[] = [];
    for (const [input, value] of [
      [color, "#aa3333"],
      [opacity, "0.8"],
      [color, "#3f91d1"],
      [opacity, "0.37"],
    ] as const) {
      set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
      states.push(
        !color.disabled &&
          !opacity.disabled &&
          !color.matches(":disabled") &&
          !opacity.matches(":disabled"),
      );
    }
    return states;
  });
  expect(enabledDuringBurst).toEqual([true, true, true, true]);
  await expect.poll(accepted).toEqual({ color: "#3f91d1", opacity: 0.37 });
  await expect(color).toHaveValue("#3f91d1");
  await expect(opacity).toHaveValue("0.37");
  for (const invalid of ["", "-0.1", "1.1"]) {
    await opacity.fill(invalid);
    await settleScene(page);
    expect(await accepted()).toEqual({ color: "#3f91d1", opacity: 0.37 });
    await expect(opacity).toBeEnabled();
  }
  await opacity.fill("0.37");
  await expect.poll(accepted).toEqual({ color: "#3f91d1", opacity: 0.37 });
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
  const saved = await savedDocument(page);
  const updated = saved.doc.molecular_surfaces![0];
  const { color: oldColor, opacity: oldOpacity, ...oldGeometry } = originalMesh;
  const { color: newColor, opacity: newOpacity, ...newGeometry } = updated;
  expect({ oldColor, oldOpacity }).toEqual({
    oldColor: "#d9534f",
    oldOpacity: 1,
  });
  expect({ newColor, newOpacity }).toEqual({
    newColor: "#3f91d1",
    newOpacity: 0.37,
  });
  expect(newGeometry).toEqual(oldGeometry);
  expect(saved.doc.atoms).toEqual(original.atoms);
  expect(saved.doc.structure).toEqual(original.structure);
  await open(page, "live-crambin.eigenvista", saved.bytes);
  expect(await accepted()).toEqual({ color: "#3f91d1", opacity: 0.37 });
  expect((await savedDocument(page)).doc.molecular_surfaces![0]).toEqual(
    updated,
  );
  const actions = await page.evaluate(
    () => (window as unknown as AppWindow).molecularSurfaceProbe.actions,
  );
  expect(
    actions.filter((action) => action.action === "molecular_surface"),
  ).toHaveLength(1);
});

test("live appearance queues isolate two surfaces, preserve partial input and follow API updates and source replacement", async ({
  page,
}) => {
  await ready(page);
  await open(
    page,
    "queue-carbon.xyz",
    Array.from(new TextEncoder().encode("1\nqueue isolation\nC 0 0 0\n")),
  );
  await generate(page, request("Queue A"));
  await generate(page, request("Queue B", "sas"));
  await activateWidget(page, "molecular");
  await page.getByText(/^Queue A · SES ·/).click();
  await page.getByText(/^Queue B · SAS ·/).click();
  const colorA = page.getByLabel("Color for Queue A", { exact: true });
  const opacityA = page.getByLabel("Opacity for Queue A", { exact: true });
  const colorB = page.getByLabel("Color for Queue B", { exact: true });
  const opacityB = page.getByLabel("Opacity for Queue B", { exact: true });
  await page.evaluate(() => {
    const input = (label: string) =>
      document.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    for (const [name, value] of [
      ["Color for Queue A", "#aa1111"],
      ["Opacity for Queue A", "0.46"],
      ["Color for Queue B", "#118833"],
      ["Opacity for Queue B", "0.62"],
      ["Color for Queue A", "#2266bb"],
      ["Opacity for Queue A", ""],
    ]) {
      const element = input(name);
      set.call(element, value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
  });
  const accepted = async () =>
    (await list(page)).items.map(({ id, color, opacity }) => ({
      id,
      color,
      opacity,
    }));
  await expect.poll(accepted).toEqual([
    { id: "Queue A", color: "#2266bb", opacity: 0.46 },
    { id: "Queue B", color: "#118833", opacity: 0.62 },
  ]);
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
  await expect(opacityA).toHaveValue("");
  for (const input of [colorA, opacityA, colorB, opacityB])
    await expect(input).toBeEnabled();
  await opacityA.focus();
  await opacityB.focus();
  await expect(opacityA).toHaveValue("0.46");

  await call(page, "molecularSurfaces.set", {
    id: "Queue A",
    color: "#aa88cc",
    opacity: 0.2,
  });
  await call(page, "molecularSurfaces.set", {
    id: "Queue B",
    color: "#ddaa33",
    opacity: 0.85,
  });
  await expect(colorA).toHaveValue("#aa88cc");
  await expect(opacityA).toHaveValue("0.2");
  await expect(colorB).toHaveValue("#ddaa33");
  await expect(opacityB).toHaveValue("0.85");
  const saved = await savedDocument(page);
  await call(page, "molecularSurfaces.set", { id: "Queue A", opacity: 0.75 });
  await expect(opacityA).toHaveValue("0.75");
  await opacityA.fill("");
  await expect(opacityA).toBeFocused();
  expect((await list(page)).items[0].opacity).toBe(0.75);
  // Open without a click/blur: identical persistent IDs must not retain another
  // document generation's blank draft instead of the reopened accepted value.
  await open(page, "queue-reopened.eigenvista", saved.bytes);
  await expect(opacityA).toHaveValue("0.2");
  await expect(colorA).toHaveValue("#aa88cc");
  await expect(opacityB).toHaveValue("0.85");
  expect((await list(page)).items[0].opacity).toBe(0.2);
});

test("molecular caches coexist with frozen QC meshes, survive native reopen and retain shader/transparent PNG support", async ({
  page,
}, info) => {
  await ready(page);
  await openFile(
    page,
    path.resolve("../fixtures/native/water-rhf-0.5.12.eigenvista"),
  );
  const original = (await savedDocument(page)).doc;
  expect(original.surfaces).toHaveLength(3);
  await generate(page, request("Water SES"));
  const saved = await savedDocument(page);
  expect(saved.doc.surfaces).toEqual(original.surfaces);
  for (const member of [
    "atoms",
    "basis",
    "orbitals",
    "densities",
    "grids",
  ] as const)
    expect(saved.doc[member]).toEqual(original[member]);
  const cached = saved.doc.molecular_surfaces![0];
  await open(page, "cached-water.eigenvista", saved.bytes);
  expect((await list(page)).items[0]).toMatchObject({
    id: cached.id,
    source_hash: cached.source_hash,
    vertexCount: cached.positions.length / 3,
  });
  expect((await savedDocument(page)).doc.molecular_surfaces![0]).toEqual(
    cached,
  );
  await call(page, "camera.fit");
  await settleScene(page);
  const image = async (transparent = false) =>
    call<{ dataUrl: string }>(page, "image.export", { transparent });
  const before = await image();
  await call(page, "molecularSurfaces.set", { id: cached.id, visible: false });
  const hidden = await image();
  expect(hidden.dataUrl).not.toBe(before.dataUrl);
  await call(page, "molecularSurfaces.set", { id: cached.id, visible: true });
  await call(page, "shader.apply", {
    preset: "surface-clip",
    target: "all",
    uniforms: { factor: 0.24, zmax: 0.25 },
  });
  const clipped = await image(true);
  expect(clipped.dataUrl).not.toBe(before.dataUrl);
  const pixels = await pngPixels(
    page,
    Buffer.from(clipped.dataUrl.split(",")[1], "base64"),
  );
  expect(pixels.total).toBeGreaterThan(100);
  expect(pixels.foreground).toBeGreaterThan(100);
  const alpha = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, image.width, image.height).data;
    let zero = 0,
      partial = 0;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] === 0) zero++;
      else if (data[i] < 255) partial++;
    }
    return { zero, partial };
  }, clipped.dataUrl);
  expect(alpha.zero).toBeGreaterThan(100);
  expect(alpha.partial).toBeGreaterThan(0);
  await info.attach("molecular-surface-clipped-transparent.png", {
    body: Buffer.from(clipped.dataUrl.split(",")[1], "base64"),
    contentType: "image/png",
  });
  await call(page, "shader.apply", { preset: "x-ray", target: "all" });
  expect((await image(true)).dataUrl).not.toBe(clipped.dataUrl);
  await call(page, "shader.clear");
  expect((await savedDocument(page)).doc.molecular_surfaces![0]).toEqual(
    cached,
  );
});

test("recoverable molecular-surface errors preserve the resident QC registration and prior mesh", async ({
  page,
}) => {
  await ready(page);
  await openFile(
    page,
    path.resolve("../fixtures/native/water-rhf-0.5.12.eigenvista"),
  );
  const fields = await call<{ items: Array<{ id: string }> }>(
    page,
    "fields.list",
  );
  const fieldId = fields.items[0].id;
  await terminal(
    page,
    await call(page, "field.preview", {
      fieldId,
      mode: "volume",
      resolution: 24,
    }),
  );
  await generate(page, request("retained"));
  const previous = (await list(page)).items[0];
  const assertVisibleInCurrentMode = async () => {
    await settleScene(page);
    const shown = await call<{ dataUrl: string }>(page, "image.export");
    await call(page, "molecularSurfaces.set", {
      id: previous.id,
      visible: false,
    });
    await settleScene(page);
    const hidden = await call<{ dataUrl: string }>(page, "image.export");
    expect(shown.dataUrl).not.toBe(hidden.dataUrl);
    await call(page, "molecularSurfaces.set", {
      id: previous.id,
      visible: true,
    });
  };
  await assertVisibleInCurrentMode();
  await page.evaluate(() => {
    (window as unknown as AppWindow).molecularSurfaceProbe.actions = [];
  });
  const invalid = request("retained");
  invalid.radii_overrides = [{ element: 8, radius_angstrom: 0 }];
  const failed = await generate(page, invalid, "failed");
  expect(failed.error?.message).toMatch(/Radius overrides/);
  expect((await list(page)).items[0]).toEqual(previous);
  await terminal(
    page,
    await call(page, "field.preview", {
      fieldId,
      mode: "raycast",
      resolution: 24,
    }),
  );
  const calls = await page.evaluate(
    () => (window as unknown as AppWindow).molecularSurfaceProbe.actions,
  );
  expect(calls.some((a) => a.action === "molecular_surface")).toBe(true);
  expect(calls.filter((a) => a.action === "sample")).toEqual([
    expect.objectContaining({ supplied: false }),
  ]);
  await assertVisibleInCurrentMode();
});

test("active molecular replacement cancellation retains accepted geometry and allows retry", async ({
  page,
}) => {
  await ready(page);
  await openFile(page, path.resolve("../fixtures/bcif/1crn.cif"));
  await generate(page, request("retained"));
  const previous = (await list(page)).items[0];
  const value = request("retained");
  value.spacing = 0.05;
  const receipt = await page.evaluate(async (request) => {
    const state = window as unknown as AppWindow;
    const receipt = (await state.eigenvistaControl!.request(
      "molecularSurfaces.generate",
      { request },
    )) as { jobId: string };
    state.molecularSurfaceProbe.cancelJob = receipt.jobId;
    return receipt;
  }, value);
  await terminal(page, receipt, "cancelled");
  expect((await list(page)).items[0]).toEqual(previous);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as AppWindow).molecularSurfaceProbe.terminated
          .length,
    ),
  ).toBeGreaterThan(0);
  await generate(page, request("retry", "sas"));
  expect((await list(page)).total).toBe(2);
});

test("a bounded original-index selection from 1AON generates its isolated molecular surface", async ({
  page,
}) => {
  await ready(page);
  // Use the real file input instead of transporting millions of JSON byte
  // numbers through Playwright. Generation/discovery still use the shared API.
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    await dialog.accept();
  });
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/cif/1AON.cif"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1AON.cif",
    { timeout: 45_000 },
  );
  const atoms = await call<{ items: Array<{ index: number }> }>(
    page,
    "atoms.list",
    { offset: 1000, limit: 100 },
  );
  const indices = atoms.items.map((atom) => atom.index);
  expect(indices[0]).toBe(1000);
  await call(page, "selection.set", {
    atoms: indices,
    showOnly: true,
    resetFilters: true,
    focus: true,
  });
  await generate(page, request("1AON local selection", "ses", indices));
  const mesh = (await list(page)).items[0];
  expect(mesh.atomCount).toBe(100);
  expect(mesh.vertexCount).toBeGreaterThan(100);
  expect(mesh.stats.estimated_engine_bytes).toBeLessThanOrEqual(
    256 * 1024 * 1024,
  );
});

test("coordinate-only GUI import clears stale quantum state before creating a molecular surface", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/bcif/1crn.cif"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1crn.cif",
  );
  await generate(page, request("Coordinate-only SES"));
  await activateWidget(page, "molecular");
  await expect(
    page.getByRole("alert").filter({ hasText: "Unknown field" }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Antibonding sigma*", { exact: true }),
  ).toHaveCount(0);
});
