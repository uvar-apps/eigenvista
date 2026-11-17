import { activateWidget } from "./workspace";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";

type ControlWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  controlProbe: {
    actions: string[];
    sampling: {
      id: number;
      completed: number;
      total: number;
      result: boolean;
    }[];
    active?: number;
    cancelJobId?: string;
    cancelled?: { id: number; hadResult: boolean };
  };
};
type State = {
  apiVersion: number;
  revision: number;
  document: {
    id: string;
    atomCount: number;
    bondCount: number;
    basisCount: number;
    orbitalCount: number;
    surfaceCount: number;
  } | null;
  dirty: boolean;
  busy: string;
  mode: string;
  resolution: number;
};
type Field = { id: string; kind: string; label: string; occupation?: number };
type Surface = { id: string; fieldId: string; visible?: boolean };
type Job = {
  jobId: string;
  status: string;
  result?: unknown;
  error?: { kind: string; message: string };
};

async function call<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const outcome = await page.evaluate(
    async ({ method, params }) => {
      const api = (window as unknown as ControlWindow).eigenvistaControl;
      if (!api) throw new Error("The opt-in application API is unavailable");
      try {
        return { ok: true, result: await api.request(method, params) };
      } catch (error) {
        const e = error as {
          kind?: string;
          code?: string;
          message?: string;
          data?: { kind?: string };
        };
        return {
          ok: false,
          error: {
            kind: e.kind ?? e.data?.kind ?? e.code,
            message: e.message ?? String(error),
          },
        };
      }
    },
    { method, params },
  );
  if (!outcome.ok)
    throw Object.assign(new Error(outcome.error?.message), outcome.error);
  return outcome.result as T;
}

async function waitJob(page: Page, receipt: { jobId: string }) {
  expect(receipt.jobId).toBeTruthy();
  let result: Job | undefined;
  await expect
    .poll(
      async () => {
        result = await call<Job>(page, "job.get", { jobId: receipt.jobId });
        return result.status;
      },
      { timeout: 45000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  if (result!.status !== "completed") throw new Error(JSON.stringify(result));
  return result!;
}

async function ready(page: Page) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ControlWindow;
    state.controlProbe = { actions: [], sampling: [] };
    const post = Worker.prototype.postMessage;
    const terminate = Worker.prototype.terminate;
    Worker.prototype.postMessage = function (...args) {
      const message = args[0];
      const probe = state.controlProbe;
      probe.actions.push(message.action);
      this.addEventListener("message", ({ data }) => {
        if (
          data.id !== message.id ||
          !["sample", "generate"].includes(message.action)
        )
          return;
        if (data.progress === "sampling") {
          probe.active = data.id;
          probe.sampling.push({
            id: data.id,
            completed: data.completed ?? 0,
            total: data.total ?? 0,
            result: false,
          });
          // Cancel in the same task as a real current-worker sampling checkpoint.
          if (probe.cancelJobId) {
            const jobId = probe.cancelJobId;
            probe.cancelJobId = undefined;
            void state.eigenvistaControl!.request("job.cancel", { jobId });
          }
        }
        if ("result" in data)
          for (const event of probe.sampling)
            if (event.id === data.id) event.result = true;
      });
      return Reflect.apply(post, this, args);
    };
    Worker.prototype.terminate = function () {
      const probe = state.controlProbe;
      if (probe.active !== undefined)
        probe.cancelled = {
          id: probe.active,
          hadResult: probe.sampling.some(
            (e) => e.id === probe.active && e.result,
          ),
        };
      return Reflect.apply(terminate, this, []);
    };
  });
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as unknown as ControlWindow).eigenvistaControl),
  );
  await expect
    .poll(async () => (await call<State>(page, "app.state")).busy)
    .toBe("");
}

async function open(page: Page, file: string, discardUnsaved = false) {
  const receipt = await call<{ jobId?: string }>(page, "document.open", {
    name: path.basename(file),
    bytes: Array.from(fs.readFileSync(file)),
    discardUnsaved,
  });
  if (receipt.jobId) await waitJob(page, { jobId: receipt.jobId });
}

async function molden(page: Page) {
  await ready(page);
  await open(
    page,
    path.resolve("../tools/site/examples/bicyclic-c7h10.molden"),
  );
  const first = await call<{ items: Field[] }>(page, "fields.list", {
    offset: 0,
    limit: 100,
  });
  const second = await call<{ items: Field[] }>(page, "fields.list", {
    offset: 100,
    limit: 100,
  });
  return [...first.items, ...second.items];
}

async function png(page: Page, transparent: boolean) {
  const image = await call<{ dataUrl: string; width: number; height: number }>(
    page,
    "image.export",
    { transparent },
  );
  expect(image.dataUrl).toMatch(/^data:image\/png;base64,/);
  return page.evaluate(async (image) => {
    const decoded = new Image();
    decoded.src = image.dataUrl;
    await decoded.decode();
    const canvas = document.createElement("canvas");
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(decoded, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let empty = 0,
      partial = 0,
      checksum = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] === 0) empty++;
      else if (pixels[i + 3] !== 255) partial++;
      for (let c = 0; c < 4; c++)
        checksum = (checksum + Math.imul(i + c + 1, pixels[i + c])) >>> 0;
    }
    return {
      width: decoded.width,
      height: decoded.height,
      corner: Array.from(pixels.slice(0, 4)),
      empty,
      partial,
      checksum,
    };
  }, image);
}

test("normal startup uses the approved four-tab pane without a public automation entry point", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  expect(
    await page.evaluate(
      () => (window as unknown as ControlWindow).eigenvistaControl,
    ),
  ).toBeUndefined();
  await expect(
    page.getByRole("button", { name: "Molecular data", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Workspace tools", exact: true })
      .getByRole("tab"),
  ).toHaveText(["Molecule", "Fields", "Surfaces", "Appearance"]);
  await activateWidget(page, "field-rendering");
  await expect(
    page.getByRole("button", { name: "Generate surfaces", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Export image", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("API imports and inspects real orbital metadata with explicit invalid/stale errors", async ({
  page,
}) => {
  const fields = await molden(page);
  const state = await call<State>(page, "app.state");
  expect(state.apiVersion).toBe(1);
  expect(state.document).toMatchObject({
    atomCount: 17,
    bondCount: 18,
    basisCount: 125,
    orbitalCount: 118,
    surfaceCount: 0,
  });
  expect(fields.filter((f) => f.kind === "orbital")).toHaveLength(118);
  expect(fields.find((f) => f.id === "molden-mo-26")).toMatchObject({
    kind: "orbital",
    occupation: 2,
  });
  expect(fields.find((f) => f.id === "molden-mo-27")).toMatchObject({
    kind: "orbital",
    occupation: 0,
  });
  expect(state.dirty).toBe(true);
  await expect(
    call(page, "scene.set", {
      opacity: 0.5,
      expectedRevision: state.revision - 1,
    }),
  ).rejects.toMatchObject({ kind: "stale_document" });
  await expect(call(page, "scene.set", { opacity: 2 })).rejects.toMatchObject({
    kind: "invalid_arguments",
  });
  await expect(
    call(page, "scene.set", { unexpected: true }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  await expect(
    call(page, "fields.list", { limit: 10000 }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  await expect(call(page, "missing.operation")).rejects.toMatchObject({
    kind: "method_not_found",
  });
  const cube = path.resolve("../fixtures/cube/signed-affine.cube");
  await expect(
    call(page, "document.open", {
      name: "signed-affine.cube",
      bytes: Array.from(fs.readFileSync(cube)),
    }),
  ).rejects.toMatchObject({ kind: "permission_required" });
  expect((await call<State>(page, "app.state")).document).toEqual(
    state.document,
  );
});

test("API sampled previews render real fields without creating meshes, including cube import", async ({
  page,
}) => {
  await molden(page);
  await call(page, "scene.set", { isovalue: 0.03, backgroundColor: "#17232d" });
  await page.evaluate(() => {
    (window as unknown as ControlWindow).controlProbe.actions = [];
  });
  await waitJob(
    page,
    await call(page, "field.preview", {
      fieldId: "molden-mo-26",
      mode: "volume",
      resolution: 24,
    }),
  );
  await expect(page.getByLabel("Rendering mode", { exact: true })).toHaveValue(
    "volume",
  );
  await expect(page.getByLabel("Grid resolution", { exact: true })).toHaveValue(
    "24",
  );
  expect(
    (await call<{ items: Surface[] }>(page, "surfaces.list")).items,
  ).toHaveLength(0);
  expect((await png(page, false)).corner).toEqual([23, 35, 45, 255]);
  await expect
    .poll(async () => {
      const p = await scenePixels(page);
      return p.positive + p.negative;
    })
    .toBeGreaterThan(25);
  expect(
    await page.evaluate(
      () => (window as unknown as ControlWindow).controlProbe.actions,
    ),
  ).not.toContain("generate");
  await open(page, path.resolve("../fixtures/cube/signed-affine.cube"), true);
  const state = await call<State>(page, "app.state");
  expect(state.document).toMatchObject({
    atomCount: 2,
    bondCount: 1,
    orbitalCount: 0,
  });
  const grids = await call<{ items: Field[] }>(page, "fields.list");
  expect(grids.items).toHaveLength(1);
  expect(grids.items[0].kind).toBe("grid");
  await waitJob(
    page,
    await call(page, "field.preview", {
      fieldId: grids.items[0].id,
      mode: "raycast",
      resolution: 24,
    }),
  );
  await expect(page.getByLabel("Rendering mode", { exact: true })).toHaveValue(
    "raycast",
  );
  await expect
    .poll(async () => {
      const p = await scenePixels(page);
      return p.positive + p.negative;
    })
    .toBeGreaterThan(25);
  expect((await png(page, false)).corner).toEqual([23, 35, 45, 255]);
});

test("API mesh jobs publish complete batches and cancellation preserves prior surfaces", async ({
  page,
}) => {
  await molden(page);
  await waitJob(
    page,
    await call(page, "surfaces.generate", {
      fieldIds: ["molden-mo-26", "molden-mo-27"],
      isovalue: 0.03,
      resolution: 32,
    }),
  );
  const surfaces = await call<{ items: Surface[] }>(page, "surfaces.list");
  expect(surfaces.items).toHaveLength(4);
  expect(new Set(surfaces.items.map((s) => s.fieldId))).toEqual(
    new Set(["molden-mo-26", "molden-mo-27"]),
  );
  await expect(page.locator(".surface-row")).toHaveCount(4);
  const cancelled = await page.evaluate(async () => {
    const control = window as unknown as ControlWindow;
    control.controlProbe.sampling = [];
    control.controlProbe.active = undefined;
    control.controlProbe.cancelled = undefined;
    const receipt = (await control.eigenvistaControl!.request(
      "surfaces.generate",
      { fieldIds: ["molden-mo-26"], isovalue: 0.03, resolution: 256 },
    )) as { jobId: string };
    control.controlProbe.cancelJobId = receipt.jobId;
    return receipt;
  });
  await expect
    .poll(
      async () =>
        (await call<Job>(page, "job.get", { jobId: cancelled.jobId })).status,
    )
    .toBe("cancelled");
  const observation = await page.evaluate(
    () => (window as unknown as ControlWindow).controlProbe,
  );
  expect(observation.cancelled).toBeTruthy();
  expect(observation.cancelled!.hadResult).toBe(false);
  expect(
    observation.sampling.some((s) => s.id === observation.cancelled!.id),
  ).toBe(true);
  expect(
    (await call<{ items: Surface[] }>(page, "surfaces.list")).items,
  ).toEqual(surfaces.items);
  await expect(page.locator(".surface-row")).toHaveCount(4);
});

test("API camera and appearance affect actual captures and preserve transparent/AO restoration", async ({
  page,
}) => {
  await molden(page);
  await waitJob(
    page,
    await call(page, "surfaces.generate", {
      fieldIds: ["molden-mo-26"],
      isovalue: 0.03,
      resolution: 32,
    }),
  );
  await page.addStyleTag({
    content:
      ".scene {width:360px!important;height:260px!important;right:auto!important;bottom:auto!important}",
  });
  await call(page, "scene.set", {
    backgroundColor: "#17232d",
    ambientOcclusion: { enabled: true, strength: 1, radiusAngstrom: 3 },
  });
  await call(page, "camera.fit");
  await settleScene(page);
  const before = await call<{ position: number[]; target: number[] }>(
    page,
    "camera.get",
  );
  const opaque = await png(page, false);
  expect(opaque.corner).toEqual([23, 35, 45, 255]);
  expect(opaque.empty).toBe(0);
  await call(page, "camera.orbit", {
    horizontalDegrees: 35,
    verticalDegrees: 15,
  });
  await call(page, "camera.zoom", { factor: 1.2 });
  const after = await call<{ position: number[]; target: number[] }>(
    page,
    "camera.get",
  );
  expect(after.position).not.toEqual(before.position);
  const moved = await png(page, false);
  expect(moved.checksum).not.toBe(opaque.checksum);
  const transparent = await png(page, true);
  expect(transparent.corner[3]).toBe(0);
  expect(transparent.empty).toBeGreaterThan(100);
  expect(transparent.partial).toBeGreaterThan(0);
  expect((await png(page, false)).checksum).toBe(moved.checksum);
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#17232d");
  await expect(
    call(page, "camera.set", { position: after.target, target: after.target }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  await expect(call(page, "camera.zoom", { factor: 0 })).rejects.toMatchObject({
    kind: "invalid_arguments",
  });
  const rejectedCamera = await call<{ position: number[] }>(page, "camera.get");
  // OrbitControls can round-trip spherical coordinates on a subsequent frame.
  for (const [axis, value] of rejectedCamera.position.entries())
    expect(value).toBeCloseTo(after.position[axis], 12);
  await call(page, "shader.apply", {
    preset: "surface-clip",
    uniforms: { factor: 0.24, zmax: 0.25 },
  });
  await expect(page.getByLabel("zmax", { exact: true })).toHaveValue("0.25");
  await expect(
    call(page, "shader.set_uniforms", { uniforms: { missingUniform: 1 } }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  await call(page, "shader.clear");
  const beforeUp = await call<{ position: number[]; target: number[] }>(
    page,
    "camera.get",
  );
  await call(page, "camera.set", {
    position: beforeUp.position,
    target: beforeUp.target,
    up: [0, 0, 1],
  });
  const changedUp = await call<{ up: number[] }>(page, "camera.orbit", {
    horizontalDegrees: 10,
    verticalDegrees: 5,
  });
  expect(changedUp.up).toEqual([0, 0, 1]);
});

test("browser API exports validated native bytes without falsely clearing unsaved state", async ({
  page,
}) => {
  await molden(page);
  const exported = await call<{
    saved: boolean;
    name: string;
    bytes: number[];
  }>(page, "document.save");
  expect(exported.saved).toBe(false);
  expect(exported.name).toMatch(/\.eigenvista$/);
  const document = await page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const d = JSON.parse(core.decode(new Uint8Array(bytes)));
    return {
      atoms: d.atoms.positions.length,
      basis: d.basis.length,
      orbitals: d.orbitals.length,
      surfaces: d.surfaces.length,
    };
  }, exported.bytes);
  expect(document).toEqual({
    atoms: 17,
    basis: 125,
    orbitals: 118,
    surfaces: 0,
  });
  expect((await call<State>(page, "app.state")).dirty).toBe(true);
});

test("API returns real identifiers at its boundary and rejects longer native IDs explicitly", async ({
  page,
}) => {
  await ready(page);
  const original = await call<{ bytes: number[] }>(page, "document.save");
  async function nativeWithId(kind: "field" | "surface", length: number) {
    const bytes = await page.evaluate(
      async ({ bytes, kind, length }) => {
        const url = "/src/wasm/eigenvista_wasm.js";
        const core = await import(/* @vite-ignore */ url);
        await core.default();
        const doc = JSON.parse(core.decode(new Uint8Array(bytes)));
        const id = "x".repeat(length);
        if (kind === "field") {
          const previous = doc.orbitals[0].id;
          doc.orbitals[0].id = id;
          if (doc.view.field === previous) doc.view.field = id;
          for (const surface of doc.surfaces)
            if (surface.field === previous) surface.field = id;
        } else doc.surfaces[0].id = id;
        return Array.from(core.encode(JSON.stringify(doc))) as number[];
      },
      { bytes: original.bytes, kind, length },
    );
    await call(page, "document.open", {
      name: "identifier-boundary.eigenvista",
      bytes,
      discardUnsaved: true,
    });
  }
  await nativeWithId("field", 512);
  const fields = await call<{ items: Field[] }>(page, "fields.list");
  expect(fields.items[0].id).toBe("x".repeat(512));
  await call(page, "field.select", { fieldId: fields.items[0].id });
  await nativeWithId("field", 513);
  await expect(call(page, "fields.list")).rejects.toMatchObject({
    kind: "limit_exceeded",
  });
  await expect(
    call(page, "field.select", { fieldId: "x".repeat(513) }),
  ).rejects.toMatchObject({ kind: "limit_exceeded" });
  await nativeWithId("surface", 513);
  await expect(call(page, "surfaces.list")).rejects.toMatchObject({
    kind: "limit_exceeded",
  });
});
