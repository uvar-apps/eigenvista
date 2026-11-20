import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import { activateWidget } from "./workspace";
import { installNativeIpc, type NativeIpcWindow } from "./nativeIpc";
import type { EigenVistaDocument } from "../src/types";

type SaveWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  saveInspectionProbe: {
    hold: boolean;
    held: number;
    encodes: number;
    analyses: number;
    holdPlanePreparation: boolean;
    holdPlaneTimers: boolean;
    pendingPlaneTimers: number;
    result?: { ok: boolean; error?: string };
    release(fail?: boolean): void;
    releasePlaneTimers(): void;
  };
};

/** Delay only message delivery; application/controller/validation/WASM stay real. */
async function ready(page: Page, native = false) {
  if (native) await installNativeIpc(page, { controlEnabled: true });
  await page.addInitScript(() => {
    const state = window as unknown as SaveWindow;
    const post = Worker.prototype.postMessage;
    const timeout = window.setTimeout.bind(window);
    const clearTimeout = window.clearTimeout.bind(window);
    const planeTimers = new Map<number, () => void>();
    const held: Array<{
      worker: Worker;
      args: [
        { action: string; args: { doc: EigenVistaDocument } },
        (Transferable[] | StructuredSerializeOptions)?,
      ];
    }> = [];
    state.saveInspectionProbe = {
      hold: false,
      held: 0,
      encodes: 0,
      analyses: 0,
      holdPlanePreparation: false,
      holdPlaneTimers: false,
      pendingPlaneTimers: 0,
      releasePlaneTimers() {
        const callbacks = [...planeTimers.values()];
        planeTimers.clear();
        state.saveInspectionProbe.pendingPlaneTimers = 0;
        callbacks.forEach((run) => run());
      },
      release(fail = false) {
        const item = held.shift();
        if (!item) throw new Error("No inspection validation is held");
        if (fail) {
          // The real validator must reject a malformed candidate. The accepted
          // document was cloned when science.ts registered its worker request.
          item.args[0].args = structuredClone(item.args[0].args);
          item.args[0].args.doc.atoms.elements[0] = 0;
        }
        state.saveInspectionProbe.held = held.length;
        Reflect.apply(post, item.worker, item.args);
      },
    };
    Worker.prototype.postMessage = function (...args) {
      if (args[0].action === "encode") state.saveInspectionProbe.encodes++;
      if (args[0].action === "analyze") state.saveInspectionProbe.analyses++;
      if (
        (args[0].action === "inspection_validate" &&
          state.saveInspectionProbe.hold) ||
        (args[0].action === "analysis_plane_atoms" &&
          state.saveInspectionProbe.holdPlanePreparation)
      ) {
        held.push({ worker: this, args });
        state.saveInspectionProbe.held = held.length;
        return;
      }
      return Reflect.apply(post, this, args);
    };
    // Hold only the production plane debounce. Its real callback, cancellation,
    // controller, worker and numerical evaluation still run unchanged.
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) => {
      if (
        state.saveInspectionProbe.holdPlaneTimers &&
        delay === 180 &&
        typeof handler === "function"
      ) {
        const id = timeout(() => {}, 0);
        planeTimers.set(id, () => handler(...args));
        state.saveInspectionProbe.pendingPlaneTimers = planeTimers.size;
        return id;
      }
      return timeout(handler, delay, ...args);
    }) as typeof window.setTimeout;
    window.clearTimeout = ((id?: number) => {
      if (id !== undefined) planeTimers.delete(id);
      state.saveInspectionProbe.pendingPlaneTimers = planeTimers.size;
      clearTimeout(id);
    }) as typeof window.clearTimeout;
  });
  await page.goto(native ? "/" : "/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  if (native) {
    await page.waitForFunction(
      () => (window as unknown as NativeIpcWindow).nativeIpc.controlReady,
    );
  } else {
    await page.waitForFunction(() =>
      Boolean((window as unknown as SaveWindow).eigenvistaControl),
    );
  }
}

async function call<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    async ({ method, params }) => {
      const native = (window as unknown as NativeIpcWindow).nativeIpc;
      return native
        ? native.requestControl(method, params)
        : (window as unknown as SaveWindow).eigenvistaControl!.request(
            method,
            params,
          );
    },
    { method, params },
  ) as Promise<T>;
}

async function decode(
  page: Page,
  bytes: number[],
): Promise<EigenVistaDocument> {
  return page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(core.decode(new Uint8Array(bytes))) as EigenVistaDocument;
  }, bytes);
}

async function savedBrowserDocument(page: Page) {
  const download = page.waitForEvent("download");
  await saveButton(page).click();
  return decode(
    page,
    Array.from(fs.readFileSync((await (await download).path())!)),
  );
}

async function createSurface(page: Page) {
  const receipt = await call<{ jobId: string }>(
    page,
    "molecularSurfaces.generate",
    {
      request: {
        id: "save-surface",
        label: "Save surface",
        kind: "ses",
        atom_indices: [],
        radii_set: "bondi",
        radii_overrides: [],
        probe_radius: 1.4,
        spacing: 0.5,
        color: "#8aa7bb",
        opacity: 0.8,
      },
    },
  );
  await expect
    .poll(
      async () =>
        (
          await call<{ status: string }>(page, "job.get", {
            jobId: receipt.jobId,
          })
        ).status,
    )
    .toBe("completed");
  await activateWidget(page, "molecular");
  await page.getByText(/^Save surface · SES ·/).click();
}

const hold = (page: Page) =>
  page.evaluate(() => {
    (window as unknown as SaveWindow).saveInspectionProbe.hold = true;
  });
const saveButton = (page: Page) =>
  page.locator(".topbar").getByRole("button", { name: "Save", exact: true });
const held = (page: Page) =>
  expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as SaveWindow).saveInspectionProbe.held,
      ),
    )
    .toBe(1);
const release = (page: Page, fail = false) =>
  page.evaluate(
    (fail) =>
      (window as unknown as SaveWindow).saveInspectionProbe.release(fail),
    fail,
  );
const encodes = (page: Page) =>
  page.evaluate(
    () => (window as unknown as SaveWindow).saveInspectionProbe.encodes,
  );
const idle = (page: Page) =>
  expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
const label = {
  id: "saved-label",
  text: "Pending label",
  atom: 0,
  visible: true,
  color: "#ffffff",
  always_visible: true,
};

async function beginLabel(
  page: Page,
  params: Record<string, unknown> = { label },
) {
  await page.evaluate((params) => {
    const state = window as unknown as SaveWindow;
    const native = (window as unknown as NativeIpcWindow).nativeIpc;
    const request = native
      ? native.requestControl.bind(native)
      : state.eigenvistaControl!.request;
    void request("labels.upsert", params).then(
      () => {
        state.saveInspectionProbe.result = { ok: true };
      },
      (error) => {
        state.saveInspectionProbe.result = { ok: false, error: String(error) };
      },
    );
  }, params);
}

/** Independent f(x,y,z)=x+2y+3z scalar, with three noncollinear source atoms. */
function linearPlaneCube() {
  const values: number[] = [];
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) values.push(x + 2 * y + 3 * z);
  return Array.from(
    Buffer.from(
      [
        "Independent plane save scalar",
        "Scalar meaning intentionally unspecified",
        "3 -2 -2 -2",
        "5 1 0 0",
        "5 0 1 0",
        "5 0 0 1",
        "8 0 0 0 0",
        "1 0 1 0 0",
        "1 0 0 1 0",
        values.join(" "),
        "",
      ].join("\n"),
    ),
  );
}

async function planeForm(page: Page, create = true) {
  const bytes = linearPlaneCube();
  const native = await page.evaluate(() =>
    Boolean((window as unknown as NativeIpcWindow).nativeIpc),
  );
  if (native) {
    await page.evaluate((bytes) => {
      (window as unknown as NativeIpcWindow).nativeIpc.files[
        "/inputs/plane-save.cube"
      ] = bytes;
    }, bytes);
    await call(page, "document.open", {
      path: "/inputs/plane-save.cube",
      discardUnsaved: true,
    });
  } else {
    await call(page, "document.open", {
      name: "plane-save.cube",
      bytes,
      discardUnsaved: true,
    });
  }
  const body = await activateWidget(page, "analysis");
  const form = body.getByLabel("Quantitative field inspection", {
    exact: true,
  });
  await form.getByLabel("Analysis type", { exact: true }).selectOption("plane");
  await form
    .getByLabel("Analysis coordinate units", { exact: true })
    .selectOption("bohr");
  await form
    .getByLabel("Analysis label", { exact: true })
    .fill("Saved linear plane");
  await form.getByLabel("Plane width", { exact: true }).fill("2");
  await form.getByLabel("Plane height", { exact: true }).fill("2");
  await form.getByLabel("Plane columns", { exact: true }).fill("9");
  await form.getByLabel("Plane rows", { exact: true }).fill("9");
  if (create) {
    await form
      .getByRole("button", { name: "Create plane", exact: true })
      .click();
    await expect(
      form.getByLabel("Analysis result Saved linear plane", { exact: true }),
    ).toBeVisible();
    await expect(
      form.getByLabel("Auto-update plane", { exact: true }),
    ).toBeChecked();
    await form
      .getByLabel("Analysis coordinate units", { exact: true })
      .selectOption("bohr");
    await idle(page);
  }
  return form;
}

async function planeCenter(page: Page) {
  const result = await call<{
    items: Array<{
      definition: { origin: number[]; u: number[]; v: number[] };
    }>;
  }>(page, "analysis.list");
  const d = result.items[0].definition;
  return d.origin.map((v, i) => +(v + (d.u[i] + d.v[i]) / 2).toFixed(10));
}

test("queued plane commits block same-task GUI and API Save before debounce, then cache the final real samples", async ({
  page,
}) => {
  await ready(page);
  const form = await planeForm(page);
  const z = form.getByLabel("Plane center Z (bohr)", { exact: true });
  await z.fill("0.5");
  const before = await page.evaluate(() => ({
    encodes: (window as unknown as SaveWindow).saveInspectionProbe.encodes,
    analyses: (window as unknown as SaveWindow).saveInspectionProbe.analyses,
  }));
  await page.evaluate(() => {
    const state = window as unknown as SaveWindow;
    state.saveInspectionProbe.holdPlaneTimers = true;
    document
      .querySelector<HTMLInputElement>(
        'input[aria-label="Plane center Z (bohr)"]',
      )!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    document
      .querySelector<HTMLButtonElement>('button[title="Save document"]')!
      .click();
    void state.eigenvistaControl!.request("document.save").then(
      () => {
        state.saveInspectionProbe.result = { ok: true };
      },
      (error) => {
        state.saveInspectionProbe.result = { ok: false, error: String(error) };
      },
    );
  });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as SaveWindow).saveInspectionProbe
            .pendingPlaneTimers,
      ),
    )
    .toBe(1);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Wait for it to finish, then save again" }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as SaveWindow).saveInspectionProbe.result?.ok,
      ),
    )
    .toBe(false);
  expect(
    await page.evaluate(
      () => (window as unknown as SaveWindow).saveInspectionProbe.result?.error,
    ),
  ).toContain("still being applied");
  expect(await encodes(page)).toBe(before.encodes);
  expect(
    await page.evaluate(
      () => (window as unknown as SaveWindow).saveInspectionProbe.analyses,
    ),
  ).toBe(before.analyses);
  await page.evaluate(() =>
    (window as unknown as SaveWindow).saveInspectionProbe.releasePlaneTimers(),
  );
  await expect.poll(() => planeCenter(page)).toEqual([0, 0, 0.5]);
  await idle(page);
  const final = await savedBrowserDocument(page);
  expect(final.field_analysis!.items[0].definition).toMatchObject({
    kind: "plane",
    dims: [9, 9],
  });
  const samples = await call<{
    items: Array<{ position: number[]; value: number; status: string }>;
  }>(page, "analysis.samples", {
    id: final.field_analysis!.items[0].id,
    limit: 100,
  });
  expect(samples.items).toHaveLength(81);
  for (const [index, row] of samples.items.entries()) {
    const x = -1 + (index % 9) / 4;
    const y = -1 + Math.floor(index / 9) / 4;
    expect(row.status).toBe("valid");
    expect(row.position[0]).toBeCloseTo(x, 10);
    expect(row.position[1]).toBeCloseTo(y, 10);
    expect(row.position[2]).toBeCloseTo(0.5, 10);
    expect(row.value).toBeCloseTo(x + 2 * y + 1.5, 10);
  }
  // Uncommitted text is only a draft; invalid committed text and cancellation
  // must both release admission without publishing a different plane.
  await z.fill("0.75");
  expect((await savedBrowserDocument(page)).field_analysis).toEqual(
    final.field_analysis,
  );
  await z.fill("");
  await z.press("Enter");
  await expect(
    form.getByRole("alert").filter({ hasText: "finite number" }),
  ).toBeVisible();
  expect((await savedBrowserDocument(page)).field_analysis).toEqual(
    final.field_analysis,
  );
  await z.fill("1");
  await z.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as SaveWindow).saveInspectionProbe
            .pendingPlaneTimers,
      ),
    )
    .toBe(1);
  await form
    .getByRole("button", { name: "Cancel plane update", exact: true })
    .click();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as SaveWindow).saveInspectionProbe
          .pendingPlaneTimers,
    ),
  ).toBe(0);
  expect((await savedBrowserDocument(page)).field_analysis).toEqual(
    final.field_analysis,
  );
  const saved = await call<{ bytes: number[] }>(page, "document.save");
  await call(page, "document.open", {
    name: "accepted-plane.eigenvista",
    bytes: saved.bytes,
    discardUnsaved: true,
  });
  expect(await planeCenter(page)).toEqual([0, 0, 0.5]);
});

test("queued plane intent prevents clean native exit before the debounce starts", async ({
  page,
}) => {
  await ready(page, true);
  const form = await planeForm(page);
  await saveButton(page).click();
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  await form.getByLabel("Plane center Z (bohr)", { exact: true }).fill("0.5");
  await page.evaluate(() => {
    const state = window as unknown as SaveWindow;
    state.saveInspectionProbe.holdPlaneTimers = true;
    document
      .querySelector<HTMLInputElement>(
        'input[aria-label="Plane center Z (bohr)"]',
      )!
      .dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
      );
    (window as unknown as NativeIpcWindow).nativeIpc.requestExit(902);
  });
  const dialog = page.getByRole("dialog", {
    name: "Quit EigenVista?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.approved,
    ),
  ).toEqual([]);
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as SaveWindow).saveInspectionProbe
            .pendingPlaneTimers,
      ),
    )
    .toBe(1);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await form
    .getByRole("button", { name: "Cancel plane update", exact: true })
    .click();
  await saveButton(page).click();
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  expect(await planeCenter(page)).toEqual([0, 0, 0]);
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.requestExit(903),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.approved,
      ),
    )
    .toEqual([903]);
});

test("manual atom-plane preparation admits intent before its read-only worker preflight", async ({
  page,
}) => {
  await ready(page);
  const form = await planeForm(page, false);
  await call(page, "selection.set", { atoms: [0, 1, 2] });
  await form
    .getByLabel("Plane orientation", { exact: true })
    .selectOption("atoms");
  await page.evaluate(() => {
    (window as unknown as SaveWindow).saveInspectionProbe.holdPlanePreparation =
      true;
  });
  const before = await encodes(page);
  await page.evaluate(() => {
    const form = document.querySelector<HTMLElement>(
      'section[aria-label="Create quantitative analysis"]',
    )!;
    const create = [...form.querySelectorAll<HTMLButtonElement>("button")].find(
      (b) => b.textContent === "Create plane",
    )!;
    create.click();
    document
      .querySelector<HTMLButtonElement>('button[title="Save document"]')!
      .click();
  });
  await held(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Wait for it to finish, then save again" }),
  ).toBeVisible();
  expect(await encodes(page)).toBe(before);
  await expect(call(page, "document.save")).rejects.toThrow(
    /still being applied/,
  );
  await release(page);
  await expect(
    form.getByLabel("Analysis result Saved linear plane", { exact: true }),
  ).toBeVisible();
  await idle(page);
  // Publication precedes the GUI's terminal-job poll. The editor changes mode
  // only after that command settles and its admitted manual intent is released.
  await expect(
    form.getByRole("heading", {
      name: "Edit sampling definition",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    form.getByRole("button", { name: "Recompute analysis", exact: true }),
  ).toBeEnabled();
  expect(
    (await savedBrowserDocument(page)).field_analysis!.items[0].definition,
  ).toMatchObject({ kind: "plane", atoms: [0, 1, 2], dims: [9, 9] });
});

test("closing a preparing manual plane releases its intent and never publishes after the editor changes", async ({
  page,
}) => {
  await ready(page);
  const form = await planeForm(page);
  const initial = await call<{ items: Array<{ id: string; field: string }> }>(
    page,
    "analysis.list",
  );
  const receipt = await call<{ jobId: string }>(page, "analysis.create", {
    request: {
      id: "other-probe",
      label: "Other probe",
      field: initial.items[0].field,
      definition: { kind: "probe", point: [0, 0, 0] },
    },
  });
  await expect
    .poll(
      async () =>
        (
          await call<{ status: string }>(page, "job.get", {
            jobId: receipt.jobId,
          })
        ).status,
    )
    .toBe("completed");
  await form.getByLabel("Auto-update plane", { exact: true }).uncheck();
  await call(page, "selection.set", { atoms: [0, 1, 2] });
  await form
    .getByLabel("Plane orientation", { exact: true })
    .selectOption("atoms");
  await page.evaluate(() => {
    (window as unknown as SaveWindow).saveInspectionProbe.holdPlanePreparation =
      true;
  });
  const analyses = await page.evaluate(
    () => (window as unknown as SaveWindow).saveInspectionProbe.analyses,
  );
  await form
    .getByRole("button", { name: "Recompute analysis", exact: true })
    .click();
  await held(page);
  await form
    .getByLabel("Analysis result Other probe", { exact: true })
    .getByRole("button", { name: "Edit sampling", exact: true })
    .click();
  await expect(form.getByLabel("Analysis label", { exact: true })).toHaveValue(
    "Other probe",
  );
  const download = page.waitForEvent("download");
  await saveButton(page).click();
  // Save is admitted, queued behind the real read-only preflight; the abandoned
  // form cannot submit a late analysis when its definition finishes.
  await expect(saveButton(page)).toBeDisabled();
  await release(page);
  const saved = await decode(
    page,
    Array.from(fs.readFileSync((await (await download).path())!)),
  );
  expect(saved.field_analysis!.items).toHaveLength(2);
  const plane = saved.field_analysis!.items.find(
    (item) => item.id === initial.items[0].id,
  )!;
  expect(plane.definition).toMatchObject({ kind: "plane", dims: [9, 9] });
  expect(plane.definition).not.toHaveProperty("atoms");
  expect(
    await page.evaluate(
      () => (window as unknown as SaveWindow).saveInspectionProbe.analyses,
    ),
  ).toBe(analyses);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
});

test("same-task Save refuses pending live appearance and rapid queued edits, then persists the final values", async ({
  page,
}) => {
  await ready(page);
  await createSurface(page);
  await hold(page);
  const before = await encodes(page);
  await page.evaluate(() => {
    const set = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )!.set!;
    const color = document.querySelector<HTMLInputElement>(
      'input[aria-label="Color for Save surface"]',
    )!;
    const opacity = document.querySelector<HTMLInputElement>(
      'input[aria-label="Opacity for Save surface"]',
    )!;
    for (const [input, value] of [
      [color, "#cd7733"],
      [opacity, "0.4"],
      [color, "#396ad1"],
      [opacity, "0.27"],
    ] as const) {
      set.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }
    document
      .querySelector<HTMLButtonElement>('button[title="Save document"]')!
      .click();
  });
  await held(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Wait for it to finish, then save again" }),
  ).toBeVisible();
  expect(await encodes(page)).toBe(before);
  await release(page);
  await held(page);
  // The second coalesced operation is still pending; no partial snapshot may save.
  await saveButton(page).click();
  expect(await encodes(page)).toBe(before);
  await release(page);
  await idle(page);
  await expect(
    page.getByLabel("Opacity for Save surface", { exact: true }),
  ).toHaveValue("0.27");
  const saved = await savedBrowserDocument(page);
  expect(saved.molecular_surfaces![0]).toMatchObject({
    color: "#396ad1",
    opacity: 0.27,
  });
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  const bytes = await call<{ bytes: number[] }>(page, "document.save");
  await call(page, "document.open", {
    name: "saved-live.eigenvista",
    bytes: bytes.bytes,
    discardUnsaved: true,
  });
  expect(
    (
      await call<{ items: Array<{ color: string; opacity: number }> }>(
        page,
        "molecularSurfaces.list",
      )
    ).items[0],
  ).toMatchObject({ color: "#396ad1", opacity: 0.27 });
});

test("external inspection admission blocks same-task GUI Save before validation begins", async ({
  page,
}) => {
  await ready(page);
  await hold(page);
  const before = await encodes(page);
  await page.evaluate((label) => {
    const state = window as unknown as SaveWindow;
    void state.eigenvistaControl!.request("labels.upsert", { label }).then(
      () => {
        state.saveInspectionProbe.result = { ok: true };
      },
      (error) => {
        state.saveInspectionProbe.result = { ok: false, error: String(error) };
      },
    );
    document
      .querySelector<HTMLButtonElement>('button[title="Save document"]')!
      .click();
  }, label);
  await held(page);
  await expect(
    page
      .getByRole("alert")
      .filter({ hasText: "Wait for it to finish, then save again" }),
  ).toBeVisible();
  expect(await encodes(page)).toBe(before);
  await expect(call(page, "document.save")).rejects.toThrow(
    /active operation|still being applied/,
  );
  await release(page);
  await idle(page);
  expect((await savedBrowserDocument(page)).annotations!.labels).toEqual([
    label,
  ]);
});

test("failed validation preserves the accepted document and releases Save for a successful retry", async ({
  page,
}) => {
  await ready(page);
  await hold(page);
  const before = await encodes(page);
  await beginLabel(page);
  await held(page);
  await saveButton(page).click();
  expect(await encodes(page)).toBe(before);
  await release(page, true);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as SaveWindow).saveInspectionProbe.result?.ok,
      ),
    )
    .toBe(false);
  await idle(page);
  expect((await call<{ items: unknown[] }>(page, "labels.list")).items).toEqual(
    [],
  );
  expect((await savedBrowserDocument(page)).annotations?.labels ?? []).toEqual(
    [],
  );
  await page.evaluate(() => {
    (window as unknown as SaveWindow).saveInspectionProbe.hold = false;
  });
  await call(page, "labels.upsert", { label });
  expect((await savedBrowserDocument(page)).annotations!.labels).toEqual([
    label,
  ]);
});

test("a stale inspection edit cannot enter the saved newer document", async ({
  page,
}) => {
  await ready(page);
  const state = await call<{ revision: number }>(page, "app.state");
  await hold(page);
  await beginLabel(page, { label, expectedRevision: state.revision });
  await held(page);
  await activateWidget(page, "document");
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await saveButton(page).click();
  await release(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as SaveWindow).saveInspectionProbe.result?.ok,
      ),
    )
    .toBe(false);
  await idle(page);
  const saved = await savedBrowserDocument(page);
  expect(saved.annotations?.labels ?? []).toEqual([]);
  expect(saved.view.representation).toBe("space-fill");
});

test("clean native exit waits for an admitted edit and Save and Quit persists the accepted label", async ({
  page,
}) => {
  await ready(page, true);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  await hold(page);
  await beginLabel(page);
  await held(page);
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.requestExit(901),
  );
  const dialog = page.getByRole("dialog", {
    name: "Quit EigenVista?",
    exact: true,
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.approved,
    ),
  ).toEqual([]);
  await release(page);
  await idle(page);
  await expect(
    dialog.getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeEnabled();
  await dialog
    .getByRole("button", { name: "Save and Quit", exact: true })
    .click();
  // Existing source-identity protection asks for another review after publication.
  await expect(dialog.getByRole("status")).toContainText("document changed");
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.saves,
    ),
  ).toEqual([]);
  await dialog
    .getByRole("button", { name: "Save and Quit", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.approved,
      ),
    )
    .toEqual([901]);
  const saves = await page.evaluate(
    () => (window as unknown as NativeIpcWindow).nativeIpc.saves,
  );
  expect(saves).toHaveLength(1);
  expect((await decode(page, saves[0].bytes)).annotations!.labels).toEqual([
    label,
  ]);
});

test("native controller Save refuses pending inspection and later exports the complete accepted record", async ({
  page,
}) => {
  await ready(page, true);
  await hold(page);
  await beginLabel(page);
  await held(page);
  await expect(
    call(page, "document.save", { path: "/exports/pending.eigenvista" }),
  ).rejects.toThrow(/active operation|still being applied/);
  await saveButton(page).click();
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.controlSaves,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.saves,
    ),
  ).toEqual([]);
  await release(page);
  await idle(page);
  await call(page, "document.save", { path: "/exports/accepted.eigenvista" });
  const saves = await page.evaluate(
    () => (window as unknown as NativeIpcWindow).nativeIpc.controlSaves,
  );
  expect(saves).toHaveLength(1);
  expect(saves[0]).toMatchObject({
    path: "/exports/accepted.eigenvista",
    overwrite: false,
  });
  expect((await decode(page, saves[0].bytes)).annotations!.labels).toEqual([
    label,
  ]);
});
