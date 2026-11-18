import { expect, test, type Page } from "@playwright/test";
import type {
  ControlExecution,
  ControlHost,
  ControlSnapshot,
} from "../src/control";
import type { EigenVistaDocument } from "../src/types";

type Job = {
  jobId: string;
  status: string;
  error?: { data: { kind: string } };
};
type HarnessState = {
  started: string[];
  aborted: boolean[];
  published: string[];
  executing: number;
  maximumExecuting: number;
};
type Harness = {
  request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  finish(index: number): void;
  publish(index: number): void;
  replaceSource(): void;
  changeRevision(): void;
  dispose(): void;
  state(): HarnessState;
};
type HarnessWindow = Window & { planeHarness: Harness };

const plane = (label: string, id = "plane", supersede = true) => ({
  ...(supersede ? { supersede: true } : {}),
  request: {
    id,
    label,
    field: "orbital",
    definition: {
      kind: "plane",
      origin: [0, 0, 0],
      u: [1, 0, 0],
      v: [0, 1, 0],
      dims: [8, 8],
    },
  },
});

async function call<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const outcome = await page.evaluate(
    async ({ method, params }) => {
      try {
        return {
          value: await (
            window as unknown as HarnessWindow
          ).planeHarness.request(method, params),
        };
      } catch (cause) {
        const error = cause as { message: string; data: { kind: string } };
        return { error: { message: error.message, kind: error.data.kind } };
      }
    },
    { method, params },
  );
  if (outcome.error)
    throw Object.assign(new Error(outcome.error.message), outcome.error);
  return outcome.value as T;
}

const state = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as HarnessWindow).planeHarness.state(),
  );
const finish = (page: Page, index: number) =>
  page.evaluate(
    (index) => (window as unknown as HarnessWindow).planeHarness.finish(index),
    index,
  );
async function terminal(page: Page, receipt: Job) {
  let job: Job | undefined;
  await expect
    .poll(async () => {
      job = await call<Job>(page, "job.get", { jobId: receipt.jobId });
      return job.status;
    })
    .toMatch(/^(completed|cancelled|failed)$/);
  return job!;
}

// Exercise the production controller with explicit host publication/unwind gates.
// Scientific sampling and rendering have independent real-application tests.
// Controllable gates make same-task cancellation races deterministic in both JS engines.
test.beforeEach(async ({ page }) => {
  await page.route("**/__plane-controller-test", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Plane jobs</title>",
    }),
  );
  await page.goto("/__plane-controller-test");
  await page.evaluate(async () => {
    const url = "/src/control.ts";
    const { createApplicationControl } = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/control");
    const document: EigenVistaDocument = {
      id: "source",
      title: "Controller publication contract",
      atoms: { elements: [1], positions: [[0, 0, 0]] },
      bonds: [],
      basis: [],
      orbitals: [],
      densities: [],
      grids: [],
      surfaces: [],
      provenance: [],
      view: {
        representation: "ball-stick",
        positive_color: "#00ff00",
        negative_color: "#ff0000",
        opacity: 1,
        isovalue: 0.1,
        field: null,
      },
    };
    const snapshot: ControlSnapshot = {
      document,
      revision: 1,
      dirty: false,
      busy: "",
      progress: null,
      mode: "mesh",
      resolution: 24,
      shading: "diffuse",
      ambientOcclusion: null,
      shader: null,
      palette: null,
      volumeQuality: 1,
      structureDisplay: null,
    };
    const operations: {
      label: string;
      context: ControlExecution;
      finish(): void;
      published: boolean;
    }[] = [];
    const published: string[] = [];
    let executing = 0,
      maximumExecuting = 0;
    const publish = (index: number) => {
      const operation = operations[index];
      operation.context.assertCurrent();
      if (operation.published)
        throw new Error("Host already published this job");
      operation.published = true;
      published.push(operation.label);
      snapshot.revision++;
      operation.context.markPublished();
    };
    const host: ControlHost = {
      native: false,
      snapshot: () => ({ ...snapshot }),
      viewport: () => null,
      synchronize: async () => {},
      async execute(_method, params, context) {
        const label = (params.request as { label: string }).label;
        let finish!: () => void;
        const done = new Promise<void>((resolve) => {
          finish = resolve;
        });
        const index = operations.length;
        operations.push({ label, context, finish, published: false });
        snapshot.busy = "Scientific inspection";
        maximumExecuting = Math.max(maximumExecuting, ++executing);
        try {
          await done;
          if (!operations[index].published) publish(index);
          return { label };
        } finally {
          executing--;
          snapshot.busy = "";
        }
      },
    };
    const controller = createApplicationControl(() => host);
    (window as unknown as HarnessWindow).planeHarness = {
      request: (method, params) => controller.request(method, params),
      finish: (index) => operations[index].finish(),
      publish,
      replaceSource: () => {
        snapshot.document = {
          ...snapshot.document!,
          atoms: { elements: [1], positions: [[1, 0, 0]] },
        };
        snapshot.revision++;
      },
      changeRevision: () => {
        snapshot.revision++;
      },
      dispose: () => controller.dispose(),
      state: () => ({
        started: operations.map((operation) => operation.label),
        aborted: operations.map(
          (operation) => operation.context.signal.aborted,
        ),
        published: [...published],
        executing,
        maximumExecuting,
      }),
    };
  });
});

test("latest same-plane update waits for unwind and skips obsolete queued sampling", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  await expect.poll(async () => (await state(page)).started).toEqual(["first"]);
  const middle = await call<Job>(page, "analysis.create", plane("middle"));
  const latest = await call<Job>(page, "analysis.create", plane("latest"));
  expect(await state(page)).toMatchObject({
    started: ["first"],
    aborted: [true],
    published: [],
    executing: 1,
  });
  await finish(page, 0);
  expect((await terminal(page, first)).status).toBe("cancelled");
  expect((await terminal(page, middle)).status).toBe("cancelled");
  await expect
    .poll(async () => (await state(page)).started)
    .toEqual(["first", "latest"]);
  await finish(page, 1);
  expect((await terminal(page, latest)).status).toBe("completed");
  expect(await state(page)).toMatchObject({
    published: ["latest"],
    maximumExecuting: 1,
    executing: 0,
  });
});

test("different planes, ordinary requests and invalid supersession cannot cancel owned work", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  await expect(
    call(page, "analysis.create", plane("different", "other")),
  ).rejects.toMatchObject({ kind: "busy" });
  await expect(
    call(page, "analysis.create", plane("manual", "plane", false)),
  ).rejects.toMatchObject({ kind: "busy" });
  const invalid = plane("probe");
  Object.assign(invalid.request, {
    definition: { kind: "probe", point: [0, 0, 0] },
  });
  await expect(call(page, "analysis.create", invalid)).rejects.toMatchObject({
    kind: "invalid_arguments",
  });
  expect((await state(page)).aborted).toEqual([false]);
  await finish(page, 0);
  expect((await terminal(page, first)).status).toBe("completed");
});

test("a live update cannot take over an ordinary manual analysis job", async ({
  page,
}) => {
  const manual = await call<Job>(
    page,
    "analysis.create",
    plane("manual", "plane", false),
  );
  await expect(
    call(page, "analysis.create", plane("automatic")),
  ).rejects.toMatchObject({ kind: "busy" });
  expect((await state(page)).aborted).toEqual([false]);
  await finish(page, 0);
  expect((await terminal(page, manual)).status).toBe("completed");
});

test("cancelling a queued receipt leaves neither obsolete job able to publish", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  const latest = await call<Job>(page, "analysis.create", plane("latest"));
  const cancelled = await page.evaluate(async (jobId) => {
    const harness = (window as unknown as HarnessWindow).planeHarness;
    // Abort the queued receipt in the same JS task, before releasing its
    // predecessor. This tests ownership rather than browser transport timing.
    const cancellation = harness.request("job.cancel", { jobId });
    harness.finish(0);
    return (await cancellation) as Job;
  }, latest.jobId);
  expect(cancelled.status).toBe("cancelled");
  expect((await terminal(page, first)).status).toBe("cancelled");
  expect(await state(page)).toMatchObject({
    started: ["first"],
    published: [],
    maximumExecuting: 1,
  });
});

test("queued updates reject a replaced source before entering the host", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  const latest = await call<Job>(page, "analysis.create", plane("latest"));
  await page.evaluate(() =>
    (window as unknown as HarnessWindow).planeHarness.replaceSource(),
  );
  await expect(
    call(page, "analysis.create", plane("new source")),
  ).rejects.toMatchObject({ kind: "busy" });
  await finish(page, 0);
  expect((await terminal(page, first)).status).toBe("cancelled");
  expect(await terminal(page, latest)).toMatchObject({
    status: "failed",
    error: { data: { kind: "stale_document" } },
  });
  expect(await state(page)).toMatchObject({
    started: ["first"],
    published: [],
  });
});

test("explicit revision preconditions are rechecked after predecessor cleanup", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  const latest = await call<Job>(page, "analysis.create", {
    ...plane("latest"),
    expectedRevision: 1,
  });
  await page.evaluate(() =>
    (window as unknown as HarnessWindow).planeHarness.changeRevision(),
  );
  await finish(page, 0);
  expect((await terminal(page, first)).status).toBe("cancelled");
  expect(await terminal(page, latest)).toMatchObject({
    status: "failed",
    error: { data: { kind: "stale_document" } },
  });
  expect((await state(page)).started).toEqual(["first"]);
});

test("already published results stay completed when a newer update arrives", async ({
  page,
}) => {
  const first = await call<Job>(page, "analysis.create", plane("first"));
  await page.evaluate(() =>
    (window as unknown as HarnessWindow).planeHarness.publish(0),
  );
  const latest = await call<Job>(page, "analysis.create", plane("latest"));
  expect(await state(page)).toMatchObject({
    aborted: [false],
    published: ["first"],
    started: ["first"],
  });
  await finish(page, 0);
  expect((await terminal(page, first)).status).toBe("completed");
  await expect
    .poll(async () => (await state(page)).started)
    .toEqual(["first", "latest"]);
  await finish(page, 1);
  expect((await terminal(page, latest)).status).toBe("completed");
  expect(await state(page)).toMatchObject({
    published: ["first", "latest"],
    maximumExecuting: 1,
  });
});

test("controller disposal aborts queued supersession and capability discovery exposes the option", async ({
  page,
}) => {
  const capabilities = await call<{
    methods: {
      method: string;
      inputSchema: { properties?: Record<string, { type: string }> };
    }[];
  }>(page, "app.capabilities");
  expect(
    capabilities.methods.find((method) => method.method === "analysis.create")!
      .inputSchema.properties!.supersede.type,
  ).toBe("boolean");
  const first = await call<Job>(page, "analysis.create", plane("first"));
  await call<Job>(page, "analysis.create", plane("latest"));
  await page.evaluate(() =>
    (window as unknown as HarnessWindow).planeHarness.dispose(),
  );
  expect((await state(page)).aborted).toEqual([true]);
  await finish(page, 0);
  await expect.poll(async () => (await state(page)).executing).toBe(0);
  expect((await state(page)).published).toEqual([]);
  await expect(
    call(page, "job.get", { jobId: first.jobId }),
  ).rejects.toMatchObject({ kind: "unavailable" });
});
