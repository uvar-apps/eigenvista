import { expect, test, type Locator, type Page } from "@playwright/test";
import { activateWidget, hideToolsForScene } from "./workspace";

type Progress = {
  id: number;
  progress: string;
  completed?: number;
  total?: number;
};
type Job = {
  jobId: string;
  status: string;
  progress?: { stage: string; counts?: { completed: number; total: number } };
  error?: { message: string };
};
type Surface = {
  id: string;
  source_hash: string;
  kind: string;
  atomCount: number;
  stats: { area_angstrom2: number };
};
type Probe = {
  events: Progress[];
  results: number[];
  actions: string[];
  terminated: number;
  binaryHeld: boolean;
  release?: () => void;
};
type ControlWindow = Window & {
  molecularProgressProbe: Probe;
  eigenvistaControl: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
};

const carbon = Buffer.from("1\nIndependent surface progress input\nC 0 0 0\n");
const request = (id: string, label = id, kind: "ses" | "sas" = "ses") => ({
  id,
  label,
  kind,
  atom_indices: [],
  radii_set: "bondi",
  radii_overrides: [],
  probe_radius: 1.4,
  spacing: 0.25,
  color: "#8aa7bb",
  opacity: 0.8,
});

async function call<T = unknown>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    async ({ method, params }) =>
      (await (window as unknown as ControlWindow).eigenvistaControl.request(
        method,
        params,
      )) as T,
    { method, params },
  );
}

async function terminal(page: Page, jobId: string, status = "completed") {
  let job: Job | undefined;
  await expect
    .poll(
      async () => {
        job = await call<Job>(page, "job.get", { jobId });
        return job.status;
      },
      { timeout: 45000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  expect(job!.status, JSON.stringify(job)).toBe(status);
  return job!;
}

async function surfaces(page: Page) {
  return (await call<{ items: Surface[] }>(page, "molecularSurfaces.list"))
    .items;
}

async function ready(page: Page) {
  await page.addInitScript(() => {
    const state = window as unknown as ControlWindow;
    const probe: Probe = {
      events: [],
      results: [],
      actions: [],
      terminated: 0,
      binaryHeld: false,
    };
    state.molecularProgressProbe = probe;
    const labels = new WeakMap<Worker, Map<number, string>>();
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      const message = args[0];
      probe.actions.push(message.action);
      if (!labels.has(this)) labels.set(this, new Map());
      if (message.action === "molecular_surface")
        labels.get(this)!.set(message.id, message.args.request.label);
      this.addEventListener("message", ({ data }) => {
        if (data.id !== message.id || message.action !== "molecular_surface")
          return;
        if (data.progress) probe.events.push({ ...data });
        if (Object.hasOwn(data, "result")) probe.results.push(data.id);
      });
      return Reflect.apply(post, this, args);
    };
    const terminate = Worker.prototype.terminate;
    Worker.prototype.terminate = function () {
      probe.terminated++;
      return Reflect.apply(terminate, this, []);
    };

    // Deliver the genuine geometry checkpoint, then queue that job's subsequent
    // real events. This exposes a short binary phase without fabricating counts
    // or changing the scientific result; releasing resumes normal publication.
    const descriptor = Object.getOwnPropertyDescriptor(
      Worker.prototype,
      "onmessage",
    )!;
    Object.defineProperty(Worker.prototype, "onmessage", {
      ...descriptor,
      set(handler: (event: MessageEvent) => void) {
        let heldId: number | undefined;
        const queued: MessageEvent[] = [];
        descriptor.set!.call(
          this,
          function (this: Worker, event: MessageEvent) {
            if (heldId === event.data.id) {
              queued.push(event);
              return;
            }
            handler.call(this, event);
            if (
              labels.get(this)?.get(event.data.id) === "Gate binary SAS" &&
              event.data.progress === "geometry" &&
              event.data.completed === 0
            ) {
              heldId = event.data.id;
              probe.binaryHeld = true;
              probe.release = () => {
                heldId = undefined;
                probe.binaryHeld = false;
                for (const item of queued.splice(0)) handler.call(this, item);
              };
            }
          },
        );
      },
    });
  });
  await page.route(
    (url) => url.pathname.endsWith("/science.worker.ts"),
    async (route) => {
      const response = await route.fetch();
      const source = await response.text();
      // Real Rust/WASM runs to its second partial mesh checkpoint. Hold waits
      // inside that owned worker until ordinary Cancel terminates it. Fail
      // throws through the real progress callback and exercises normal cleanup.
      const checkpoint = `
        let surfaceCheckpointLabel = '';
        let surfacePartialReports = 0;
        self.addEventListener('message', event => {
          const message = event.data;
          surfaceCheckpointLabel = message.action === 'molecular_surface' ? message.args.request.label : '';
          surfacePartialReports = 0;
        });
        const surfaceCheckpointPost = self.postMessage.bind(self);
        self.postMessage = (...args) => {
          surfaceCheckpointPost(...args);
          const data = args[0];
          if (data.progress === 'mesh' && data.completed > 0 && data.completed < data.total) {
            surfacePartialReports++;
            if (surfacePartialReports === 2 && surfaceCheckpointLabel.startsWith('Hold ')) { while (true) {} }
            if (surfacePartialReports === 2 && surfaceCheckpointLabel === 'Fail surface callback') {
              throw new Error('Injected molecular progress callback failure');
            }
          }
        };
      `;
      await route.fulfill({ response, body: checkpoint + source });
    },
  );
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(
    () => !!(window as unknown as ControlWindow).eigenvistaControl,
  );
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "surface-progress.xyz",
    mimeType: "text/plain",
    buffer: carbon,
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened surface-progress.xyz",
  );
  await activateWidget(page, "molecular");
}

const fullProgress = (page: Page) =>
  page.getByRole("region", { name: "Molecular surface progress", exact: true });
const activity = (page: Page) =>
  page.getByRole("region", { name: "Molecular surface activity", exact: true });
const elapsed = async (region: Locator) =>
  Number(
    (
      await region
        .getByLabel("Elapsed surface time", { exact: true })
        .innerText()
    ).match(/^\d+/)![0],
  );

async function checkpoint(page: Page) {
  await page.waitForFunction(() => {
    const events = (window as unknown as ControlWindow).molecularProgressProbe
      .events;
    return (
      events.filter(
        (e) =>
          e.progress === "mesh" && e.completed! > 0 && e.completed! < e.total!,
      ).length >= 2
    );
  });
  return page.evaluate(
    () =>
      (window as unknown as ControlWindow).molecularProgressProbe.events
        .filter((e) => e.progress === "mesh" && e.completed! < e.total!)
        .at(-1)!,
  );
}

async function assertCounts(region: Locator, report: Progress) {
  await expect(region).toBeVisible();
  await expect(region).toContainText("Generating surface mesh");
  const bar = region.getByRole("progressbar", {
    name: "Current molecular surface stage",
    exact: true,
  });
  await expect(bar).toHaveAttribute("max", String(report.total));
  await expect(bar).toHaveAttribute("value", String(report.completed));
  await expect(region).toContainText(
    `${report.completed} / ${report.total} blocks`,
  );
  await expect(region).toContainText(
    `Current stage · ${Math.floor((100 * report.completed!) / report.total!)}%`,
  );
}

async function cleared(page: Page) {
  await expect(fullProgress(page)).toHaveCount(0);
  await expect(activity(page)).toHaveCount(0);
  await expect
    .poll(
      async () =>
        (await call<{ progress: unknown }>(page, "app.state")).progress,
    )
    .toBeNull();
}

test.afterEach(async ({ page }) => {
  if (!page.isClosed())
    await page.evaluate(() => {
      (window as unknown as ControlWindow).molecularProgressProbe?.release?.();
    });
});

test("GUI SES reports genuine stage counts and elapsed time, and cancellation preserves accepted geometry", async ({
  page,
}, info) => {
  await ready(page);
  const saved = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("accepted", "Accepted SAS", "sas"),
  });
  await terminal(page, saved.jobId);
  const accepted = await surfaces(page);
  await page.evaluate(() => {
    (window as unknown as ControlWindow).molecularProgressProbe.events = [];
  });
  await page
    .getByLabel("Molecular surface name", { exact: true })
    .fill("Hold GUI SES");
  await page
    .getByLabel("Molecular surface grid spacing", { exact: true })
    .fill("0.25");
  await page
    .getByRole("button", { name: "Generate molecular surface", exact: true })
    .click();
  const held = await checkpoint(page);
  await assertCounts(fullProgress(page), held);
  await assertCounts(activity(page), held);
  const partial = await page.evaluate(() =>
    (window as unknown as ControlWindow).molecularProgressProbe.events.filter(
      (event) => event.progress === "mesh" && event.completed! > 0,
    ),
  );
  expect(partial[1].completed!).toBeGreaterThan(partial[0].completed!);
  expect(
    await page.evaluate(
      (id) =>
        (
          window as unknown as ControlWindow
        ).molecularProgressProbe.results.includes(id),
      held.id,
    ),
  ).toBe(false);
  await expect
    .poll(() => elapsed(fullProgress(page)))
    .toBeGreaterThanOrEqual(1);
  const state = await call<{
    progress: { operation: string; label: string; elapsedSeconds: number };
  }>(page, "app.state");
  expect(state.progress).toMatchObject({
    operation: "molecularSurfaces.generate",
    label: "SES · Hold GUI SES",
  });
  expect(state.progress.elapsedSeconds).toBeGreaterThanOrEqual(1);
  await info.attach("surface-progress-current-stage.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page
    .getByRole("button", { name: "Cancel molecular surface", exact: true })
    .click();
  await cleared(page);
  expect(await surfaces(page)).toEqual(accepted);
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "replacement.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from("1\nReplacement source\nHe 0 0 0\n"),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened replacement.xyz",
  );
  await cleared(page);
});

test("API SAS shows binary phases honestly and completes with real mesh-stage advancement", async ({
  page,
}, info) => {
  await ready(page);
  const job = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("sas", "Gate binary SAS", "sas"),
  });
  await page.waitForFunction(
    () =>
      (window as unknown as ControlWindow).molecularProgressProbe.binaryHeld,
  );
  const region = fullProgress(page);
  await expect(region).toBeVisible();
  const bar = region.getByRole("progressbar", {
    name: "Current molecular surface stage",
    exact: true,
  });
  await expect(bar).not.toHaveAttribute("value");
  await expect(region).toContainText("Working…");
  await expect(region).not.toContainText(/\d+%/);
  await expect.poll(() => elapsed(region)).toBeGreaterThanOrEqual(1);
  await info.attach("surface-progress-indeterminate-phase.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await page.evaluate(() => {
    (window as unknown as ControlWindow).molecularProgressProbe.release!();
  });
  await terminal(page, job.jobId);
  await cleared(page);
  const events = await page.evaluate(
    () => (window as unknown as ControlWindow).molecularProgressProbe.events,
  );
  for (const stage of [
    "geometry",
    "classify",
    "mesh",
    "assemble",
    "measure",
    "transferring",
  ])
    expect(events.some((event) => event.progress === stage)).toBe(true);
  const meshes = events.filter((event) => event.progress === "mesh");
  expect(meshes.length).toBeGreaterThan(2);
  expect(meshes[0].completed).toBe(0);
  expect(meshes.at(-1)!.completed).toBe(meshes.at(-1)!.total);
  for (let i = 1; i < meshes.length; i++)
    expect(meshes[i].completed!).toBeGreaterThanOrEqual(
      meshes[i - 1].completed!,
    );
  const mesh = (await surfaces(page))[0];
  expect(mesh).toMatchObject({ id: "sas", kind: "sas", atomCount: 1 });
  expect(mesh.source_hash).not.toBe("");
  const expectedArea = 4 * Math.PI * (1.7 + 1.4) ** 2;
  expect(
    Math.abs(mesh.stats.area_angstrom2 - expectedArea) / expectedArea,
  ).toBeLessThan(0.015);
});

test("held SAS keeps progress and Cancel reachable in hidden-tools Zen and a narrow window", async ({
  page,
}, info) => {
  await ready(page);
  const job = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("hidden-sas", "Hold hidden SAS", "sas"),
  });
  const held = await checkpoint(page);
  await assertCounts(activity(page), held);
  expect(
    (await call<Job>(page, "job.get", { jobId: job.jobId })).progress,
  ).toEqual({
    stage: "mesh",
    counts: { completed: held.completed, total: held.total },
  });
  await expect.poll(() => elapsed(activity(page))).toBeGreaterThanOrEqual(1);
  const before = await elapsed(activity(page));
  await hideToolsForScene(page);
  await page.getByRole("button", { name: "Zen mode", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 700 });
  await assertCounts(activity(page), held);
  expect(await elapsed(activity(page))).toBeGreaterThanOrEqual(before);
  const cancel = page.getByRole("button", {
    name: "Cancel calculation",
    exact: true,
  });
  await expect(cancel).toBeVisible();
  await expect(cancel).toBeEnabled();
  const bounds = (await cancel.boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(390);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(700);
  await info.attach("surface-progress-hidden-zen-narrow.png", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  await cancel.click();
  await terminal(page, job.jobId, "cancelled");
  await cleared(page);
  expect(await surfaces(page)).toHaveLength(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as ControlWindow).molecularProgressProbe.terminated,
    ),
  ).toBeGreaterThan(0);
});

test("a real progress-callback failure clears activity, retains previous surfaces and permits retry", async ({
  page,
}) => {
  await ready(page);
  const saved = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("retained", "Retained surface"),
  });
  await terminal(page, saved.jobId);
  const accepted = await surfaces(page);
  const failure = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("failed", "Fail surface callback"),
  });
  const failed = await terminal(page, failure.jobId, "failed");
  expect(failed.error?.message).toContain(
    "Injected molecular progress callback failure",
  );
  await cleared(page);
  expect(await surfaces(page)).toEqual(accepted);
  const retry = await call<Job>(page, "molecularSurfaces.generate", {
    request: request("retry", "Recovered surface"),
  });
  await terminal(page, retry.jobId);
  await cleared(page);
  expect((await surfaces(page)).map((surface) => surface.id)).toEqual([
    "retained",
    "retry",
  ]);
});
