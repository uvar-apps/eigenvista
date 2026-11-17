import { activateWidget } from "./workspace";
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

type Event = {
  id: number;
  progress?: string;
  completed?: number;
  total?: number;
  result?: unknown;
};
type ProbeWindow = Window & {
  progressEvents: Event[];
  progressRequest?: number;
  interruptedProgress?: { id: number; events: Event[] };
  calculationLabels: string[];
  progressFailure: () => void;
  staleProgress: () => void;
};

test("orbital batches report each field and finish without a stale progress panel", async ({
  page,
}) => {
  await openMolden(page);
  await page.evaluate(() => {
    const state = window as unknown as ProbeWindow;
    state.calculationLabels = [];
    new MutationObserver(() => {
      const label = document.querySelector(".calculation-label")?.textContent;
      if (label && state.calculationLabels.at(-1) !== label)
        state.calculationLabels.push(label);
    }).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  });
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  for (const number of [25, 26])
    await dialog
      .getByRole("checkbox", { name: `Select orbital ${number}`, exact: true })
      .check();
  await dialog
    .getByLabel("Orbital grid resolution", { exact: true })
    .selectOption("64");
  await dialog.getByLabel("Orbital isovalue", { exact: true }).fill("0.02");
  await dialog
    .getByRole("button", { name: "Generate selected", exact: true })
    .click();
  await waitForGenerationResults(page, 2);
  await expect(page.locator("footer [role=status]")).toContainText(
    "2 orbitals /",
  );
  await expect(
    page.getByLabel("Calculation progress", { exact: true }),
  ).toHaveCount(0);
  const result = await page.evaluate(() => ({
    labels: (window as unknown as ProbeWindow).calculationLabels,
    events: (window as unknown as ProbeWindow).progressEvents,
  }));
  expect(
    result.labels.some((label) => label.startsWith("Orbital 1 of 2:")),
  ).toBe(true);
  expect(
    result.labels.some((label) => label.startsWith("Orbital 2 of 2:")),
  ).toBe(true);
  const completions = result.events.filter(
    (e) => e.progress === "sampling" && e.completed === e.total,
  );
  expect(completions).toHaveLength(2);
  expect(completions.every((e) => e.total === 64)).toBe(true);
  expect(new Set(completions.map((e) => e.id)).size).toBe(2);
  await expect(page.locator(".surface-row")).toHaveCount(4);
});

async function openMolden(page: Page) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(() => {
    const state = window as unknown as ProbeWindow;
    state.progressEvents = [];
    let watchedWorker: Worker | null = null;
    let watchedRequest: number | null = null;
    const post = Worker.prototype.postMessage;
    const terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      // Observe the actual interruption, synchronously with the real UI handler.
      // A screenshot/driver delay must not let a completed job count as Cancel.
      if (this === watchedWorker && watchedRequest !== null) {
        state.interruptedProgress = {
          id: watchedRequest,
          events: state.progressEvents.filter(
            (event) => event.id === watchedRequest,
          ),
        };
        watchedWorker = null;
        watchedRequest = null;
      }
      terminate.call(this);
    };
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      if (["sample", "generate"].includes(message.action)) {
        const instance = this;
        watchedWorker = instance;
        watchedRequest = message.id;
        state.progressRequest = message.id;
        state.progressFailure = () =>
          instance.dispatchEvent(
            new ErrorEvent("error", {
              message: "Deliberate progress test failure",
            }),
          );
        state.staleProgress = () =>
          instance.dispatchEvent(
            new MessageEvent("message", {
              data: {
                id: message.id,
                progress: "sampling",
                completed: 256,
                total: 256,
              },
            }),
          );
        this.addEventListener("message", ({ data }) => {
          if (data.id !== message.id) return;
          state.progressEvents.push({
            id: data.id,
            progress: data.progress,
            completed: data.completed,
            total: data.total,
            result: "result" in data ? true : undefined,
          });
          if (
            ("result" in data || "error" in data) &&
            watchedWorker === instance &&
            watchedRequest === message.id
          ) {
            watchedWorker = null;
            watchedRequest = null;
          }
        });
      }
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/legacy/data/molden.input"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened molden.input",
  );
  await activateWidget(page, "field-rendering");
  await page.evaluate(() => {
    const state = window as unknown as ProbeWindow;
    state.progressEvents = [];
    state.progressRequest = undefined;
    state.interruptedProgress = undefined;
  });
}

async function waitForGenerationResults(page: Page, count: number) {
  // Real work is bounded by the existing test deadline, not the five-second
  // UI assertion window. A previous footer can also outlive its generation.
  await page.waitForFunction(
    (expected) =>
      (window as unknown as ProbeWindow).progressEvents.filter(
        (event) => event.result === true,
      ).length === expected,
    count,
  );
}

test("WASM progress callbacks preserve samples and meshes and reject callback failures", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const result = await page.evaluate(async () => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const json = core.example(false);
    const doc = JSON.parse(json);
    const samples: number[][] = [],
      meshes: number[][] = [];
    const old = new core.SampledField(json, doc.view.field, 24);
    const measured = core.SampledField.with_progress(
      json,
      doc.view.field,
      24,
      (done: number, total: number) => samples.push([done, total]),
    );
    try {
      const values = measured.display_values();
      const expected = old.display_values();
      const exactSamples = values.every((v: number, i: number) =>
        Object.is(v, expected[i]),
      );
      const exactMeshes =
        measured.surfaces_with_progress(
          json,
          0.08,
          (done: number, total: number) => meshes.push([done, total]),
        ) === old.surfaces(json, 0.08);
      let failed = false;
      try {
        core.SampledField.with_progress(json, doc.view.field, 24, () => {
          throw new Error("Observer failure");
        });
      } catch {
        failed = true;
      }
      return { exactSamples, exactMeshes, samples, meshes, failed };
    } finally {
      old.free();
      measured.free();
    }
  });
  expect(result.exactSamples).toBe(true);
  expect(result.exactMeshes).toBe(true);
  expect(result.failed).toBe(true);
  expect(result.samples).toEqual(Array.from({ length: 25 }, (_, i) => [i, 24]));
  expect(result.meshes).toEqual([
    [0, 2],
    [1, 2],
    [2, 2],
  ]);
});

for (const failure of ["cancel", "worker-error"] as const) {
  test(`real orbital progress advances before ${failure}, clears and retries`, async ({
    page,
  }, info) => {
    await openMolden(page);
    if (failure === "worker-error")
      await page.setViewportSize({ width: 390, height: 844 });
    const modes = page.getByLabel("Rendering mode");
    await page
      .getByLabel("Grid resolution", { exact: true })
      .selectOption("256");
    // Exercise both meshes and sampling-only volume jobs.
    if (failure === "cancel")
      await page
        .getByRole("button", { name: "Generate surfaces", exact: true })
        .click();
    else await modes.selectOption("volume");
    const bar = page.getByRole("progressbar", {
      name: "Sampling field",
      exact: true,
    });
    // The worker throttles intermediate updates. The first positive progress
    // value alone does not imply two intermediate checkpoints have arrived.
    await page.waitForFunction(() => {
      const events = (window as unknown as ProbeWindow).progressEvents;
      const sampling = events.filter((event) => event.progress === "sampling");
      const latest = sampling.at(-1);
      return (
        sampling.length > 2 &&
        latest?.completed !== undefined &&
        latest.completed > 0 &&
        latest.completed < 256 &&
        !events.some((event) => event.result)
      );
    });
    await expect
      .poll(async () => Number(await bar.getAttribute("value")))
      .toBeGreaterThan(0);
    expect(Number(await bar.getAttribute("value"))).toBeLessThan(256);
    await expect(page.getByLabel("Elapsed calculation time")).not.toHaveText(
      "0 s elapsed",
    );
    await expect(
      page.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeEnabled();
    const observed = await page.evaluate(
      () => (window as unknown as ProbeWindow).progressEvents,
    );
    const sampling = observed.filter((e) => e.progress === "sampling");
    expect(sampling.length).toBeGreaterThan(2);
    expect(sampling[0].completed).toBe(0);
    expect(sampling.every((e) => e.total === 256)).toBe(true);
    expect(observed.some((e) => e.result)).toBe(false);
    for (let i = 1; i < sampling.length; i++)
      expect(sampling[i].completed!).toBeGreaterThan(
        sampling[i - 1].completed!,
      );
    await page
      .getByLabel("Calculation progress", { exact: true })
      .scrollIntoViewIfNeeded();
    await page.screenshot({
      path: `../artifacts/progress-${info.project.name}-${failure}.png`,
      fullPage: true,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    if (failure === "cancel")
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
    else
      await page.evaluate(() =>
        (window as unknown as ProbeWindow).progressFailure(),
      );
    const { request, interrupted } = await page.evaluate(() => {
      const state = window as unknown as ProbeWindow;
      return {
        request: state.progressRequest,
        interrupted: state.interruptedProgress,
      };
    });
    expect(request).toBeDefined();
    expect(interrupted).toBeDefined();
    expect(interrupted!.id).toBe(request);
    expect(interrupted!.events.some((event) => event.result)).toBe(false);
    const checkpoint = interrupted!.events
      .filter((event) => event.progress === "sampling")
      .at(-1)!;
    expect(checkpoint.completed).toBeGreaterThan(0);
    expect(checkpoint.completed).toBeLessThan(256);
    expect(checkpoint.total).toBe(256);
    await expect(
      page.getByLabel("Calculation progress", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator(".surface-row")).toHaveCount(0);
    await expect(modes).toHaveValue("mesh");
    await page.evaluate(() =>
      (window as unknown as ProbeWindow).staleProgress(),
    );
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await page
      .getByLabel("Grid resolution", { exact: true })
      .selectOption("24");
    await page
      .getByRole("button", { name: "Generate surfaces", exact: true })
      .click();
    await waitForGenerationResults(page, 1);
    await expect(
      page.getByLabel("Calculation progress", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    await expect(page.getByRole("progressbar")).toHaveCount(0);
    await expect(page.getByRole("alert")).toHaveCount(0);
    // A cached grid skips sampling but still reports real mesh checkpoints.
    await page.evaluate(() => {
      (window as unknown as ProbeWindow).progressEvents = [];
    });
    await page
      .getByRole("button", { name: "Generate surfaces", exact: true })
      .click();
    await waitForGenerationResults(page, 1);
    await expect(
      page.getByLabel("Calculation progress", { exact: true }),
    ).toHaveCount(0);
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const cached = await page.evaluate(
      () => (window as unknown as ProbeWindow).progressEvents,
    );
    expect(cached.some((e) => e.progress === "sampling")).toBe(false);
    expect(cached.filter((e) => e.progress === "meshing").at(-1)).toMatchObject(
      { completed: 2, total: 2 },
    );
  });
}
