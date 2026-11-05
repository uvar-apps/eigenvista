import { test, expect, type Page } from "@playwright/test";
import type { EigenVistaDocument, SampledGrid } from "../src/types";

type Progress = (
  stage: string,
  counts?: { completed: number; total: number },
) => void;
interface ScienceClient {
  request<T>(
    action: string,
    args: Record<string, unknown>,
    onProgress?: Progress,
    options?: { signal?: AbortSignal },
  ): Promise<T>;
  cancel(reason?: Error): void;
}
type Outcome<T> = { ok: true; result: T } | { ok: false; error: string };
interface Packet {
  worker: Worker;
  id?: number;
  action?: string;
  openShell?: boolean;
  marker?: string;
}
interface OwnershipProbe {
  create(): ScienceClient;
  settle<T>(promise: Promise<T>): Promise<Outcome<T>>;
  workers: Worker[];
  terminated: Worker[];
  packets: Packet[];
  progressIds: Map<Worker, number>;
  messageErrorHandlers: Map<Worker, EventListener>;
}
type ProbedWindow = Window & { ownershipProbe: OwnershipProbe };

async function prepare(page: Page, label: string) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.evaluate(async (label) => {
    const url = `/src/science.ts?ownership-case=${label}`;
    const science = (await import(/* @vite-ignore */ url)) as {
      createScienceClient(): ScienceClient;
    };
    const workers: Worker[] = [];
    const terminated: Worker[] = [];
    const packets: Packet[] = [];
    const progressIds = new Map<Worker, number>();
    const messageErrorHandlers = new Map<Worker, EventListener>();
    const NativeWorker = window.Worker;
    class ObservedWorker extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        workers.push(this);
        this.addEventListener("message", ({ data }) => {
          if (data.progress === "sampling" && Number.isSafeInteger(data.id))
            progressIds.set(this, data.id);
        });
        const add = this.addEventListener.bind(this);
        this.addEventListener = ((
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions,
        ) => {
          if (type === "messageerror" && typeof listener === "function")
            messageErrorHandlers.set(this, listener);
          add(type, listener, options);
        }) as Worker["addEventListener"];
        const post = this.postMessage.bind(this);
        this.postMessage = (
          message: unknown,
          options?: Transferable[] | StructuredSerializeOptions,
        ) => {
          const packet = message as {
            id?: number;
            action?: string;
            args?: { openShell?: boolean; marker?: string };
          };
          packets.push({
            worker: this,
            id: packet.id,
            action: packet.action,
            openShell: packet.args?.openShell,
            marker: packet.args?.marker,
          });
          if (Array.isArray(options)) post(message, options);
          else post(message, options);
        };
        const terminate = this.terminate.bind(this);
        this.terminate = () => {
          terminated.push(this);
          terminate();
        };
      }
    }
    window.Worker = ObservedWorker;
    (window as unknown as ProbedWindow).ownershipProbe = {
      workers,
      terminated,
      packets,
      progressIds,
      messageErrorHandlers,
      create: () => science.createScienceClient(),
      settle: <T>(promise: Promise<T>): Promise<Outcome<T>> =>
        promise.then(
          (result) => ({ ok: true, result }),
          (error) => ({ ok: false, error: String(error) }),
        ),
    };
  }, label);
}

test("queued and idle client cancellation preserves another owner's active calculation", async ({
  page,
}) => {
  await prepare(page, "queued-and-idle");
  const result = await page.evaluate(async () => {
    const probe = (window as unknown as ProbedWindow).ownershipProbe;
    const active = probe.create();
    const queued = probe.create();
    const idle = probe.create();
    const doc = await active.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    let cancelled = false;
    let progressEvents = 0;
    const calculation = probe.settle(
      active.request<SampledGrid>(
        "sample",
        { doc, field: "total", resolution: 128 },
        (stage) => {
          if (stage !== "sampling") return;
          progressEvents++;
          if (cancelled) return;
          cancelled = true;
          idle.cancel();
          queued.cancel(new Error("Queued owner cancelled"));
        },
      ),
    );
    const independent = probe.settle(
      queued.request<EigenVistaDocument>("example", { openShell: true }),
    );
    const [sampled, rejected] = await Promise.all([calculation, independent]);
    return {
      cancelled,
      progressEvents,
      sampled: sampled.ok
        ? {
            ok: true,
            dims: sampled.result.dims,
            values: sampled.result.values.length,
          }
        : sampled,
      rejected,
      workers: probe.workers.length,
      terminations: probe.terminated.length,
      queuedPosts: probe.packets.filter(
        (packet) => packet.action === "example" && packet.openShell,
      ).length,
    };
  });
  expect(result.cancelled).toBe(true);
  expect(result.progressEvents).toBeGreaterThanOrEqual(2);
  expect(result.sampled).toEqual({
    ok: true,
    dims: [128, 128, 128],
    values: 128 ** 3,
  });
  expect(result.rejected).toEqual({
    ok: false,
    error: "Error: Queued owner cancelled",
  });
  expect(result.workers).toBe(1);
  expect(result.terminations).toBe(0);
  expect(result.queuedPosts).toBe(0);
});

test("active client cancellation preserves queued owners and ignores old worker callbacks", async ({
  page,
}) => {
  await prepare(page, "active-and-stale");
  const result = await page.evaluate(async () => {
    const probe = (window as unknown as ProbedWindow).ownershipProbe;
    const cancelled = probe.create();
    const retained = probe.create();
    const doc = await cancelled.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const old = probe.workers[0];
    const oldMessage = old.onmessage;
    const oldError = old.onerror;
    const oldMessageError =
      probe.messageErrorHandlers.get(old) ?? old.onmessageerror;
    let cancelledId: number | undefined;
    let cancelling = false;
    let injected = false;
    let cancelledProgress = 0;
    const first = probe.settle(
      cancelled.request<SampledGrid>(
        "sample",
        { doc, field: "total", resolution: 256 },
        (stage) => {
          if (stage !== "sampling") return;
          cancelledProgress++;
          if (cancelling) return;
          cancelling = true;
          cancelledId = probe.progressIds.get(old);
          cancelled.cancel(new Error("Active owner cancelled"));
        },
      ),
    );
    const second = probe.settle(
      retained.request<SampledGrid>(
        "sample",
        { doc, field: "total", resolution: 128 },
        (stage) => {
          if (stage !== "sampling" || injected) return;
          injected = true;
          // Capture before termination so these calls simulate callbacks that
          // were already queued, even if teardown clears handler properties.
          oldMessage?.call(
            old,
            new MessageEvent("message", {
              data: {
                id: cancelledId,
                progress: "sampling",
                completed: 999,
                total: 1000,
              },
            }),
          );
          oldMessage?.call(
            old,
            new MessageEvent("message", {
              data: { id: cancelledId, result: { stale: true } },
            }),
          );
          oldMessage?.call(
            old,
            new MessageEvent("message", {
              data: { id: cancelledId, fatal: true, error: "late fatal" },
            }),
          );
          oldError?.call(
            old,
            new ErrorEvent("error", {
              message: "late old worker error",
              cancelable: true,
            }),
          );
          oldMessageError?.call(old, new MessageEvent("messageerror"));
        },
      ),
    );
    const sameOwnerQueued = probe.settle(
      cancelled.request<EigenVistaDocument>("example", { openShell: true }),
    );
    const [a, b, c] = await Promise.all([first, second, sameOwnerQueued]);
    return {
      a: a.ok ? { ok: true as const } : a,
      b: b.ok
        ? { ok: true, dims: b.result.dims, values: b.result.values.length }
        : b,
      c,
      injected,
      cancelledProgress,
      cancelledId,
      workers: probe.workers.length,
      terminations: probe.terminated.length,
      oldTerminated: probe.terminated[0] === old,
      sameOwnerPosts: probe.packets.filter(
        (packet) => packet.action === "example" && packet.openShell,
      ).length,
    };
  });
  expect(result.a).toEqual({
    ok: false,
    error: "Error: Active owner cancelled",
  });
  expect(result.c).toEqual(result.a);
  expect(result.b).toEqual({
    ok: true,
    dims: [128, 128, 128],
    values: 128 ** 3,
  });
  expect(result.injected).toBe(true);
  expect(result.cancelledId).toBeGreaterThan(0);
  expect(result.cancelledProgress).toBe(1);
  expect(result.workers).toBe(2);
  expect(result.terminations).toBe(1);
  expect(result.oldTerminated).toBe(true);
  expect(result.sameOwnerPosts).toBe(0);
});

test("AbortSignals cancel individual active and queued requests while same-owner siblings survive", async ({
  page,
}) => {
  await prepare(page, "request-abort-signals");
  const result = await page.evaluate(async () => {
    const probe = (window as unknown as ProbedWindow).ownershipProbe;
    const client = probe.create();
    const doc = await client.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const already = new AbortController();
    already.abort();
    const preAborted = await probe.settle(
      client.request(
        "example",
        { openShell: true, marker: "pre-aborted" },
        undefined,
        { signal: already.signal },
      ),
    );
    const active = new AbortController();
    const queued = new AbortController();
    let aborted = false;
    const first = probe.settle(
      client.request<SampledGrid>(
        "sample",
        { doc, field: "total", resolution: 256 },
        (stage) => {
          if (stage !== "sampling" || aborted) return;
          aborted = true;
          queued.abort();
          active.abort();
        },
        { signal: active.signal },
      ),
    );
    const second = probe.settle(
      client.request(
        "example",
        { openShell: false, marker: "queued-aborted" },
        undefined,
        { signal: queued.signal },
      ),
    );
    const sibling = probe.settle(
      client.request<EigenVistaDocument>("example", { openShell: true }),
    );
    const [a, b, c] = await Promise.all([first, second, sibling]);
    return {
      aborted,
      preAborted,
      a: a.ok ? { ok: true as const } : a,
      b,
      c: c.ok ? { ok: true, id: c.result.id } : c,
      neverPosted: probe.packets.filter((packet) => packet.marker).length,
      workers: probe.workers.length,
      terminations: probe.terminated.length,
    };
  });
  expect(result.aborted).toBe(true);
  for (const outcome of [result.preAborted, result.a, result.b]) {
    expect(outcome.ok).toBe(false);
    if (!outcome.ok) expect(outcome.error).toMatch(/abort|cancel/i);
  }
  expect(result.c).toEqual({ ok: true, id: "analytic-open-shell-v1" });
  expect(result.neverPosted).toBe(0);
  expect(result.workers).toBe(2);
  expect(result.terminations).toBe(1);
});

for (const failure of ["error", "messageerror", "fatal"] as const)
  test(`${failure} tears down all queued owners and a fresh worker recovers`, async ({
    page,
  }) => {
    await prepare(page, `fatal-${failure}`);
    const result = await page.evaluate(async (failure) => {
      const probe = (window as unknown as ProbedWindow).ownershipProbe;
      const active = probe.create();
      const queued = probe.create();
      const doc = await active.request<EigenVistaDocument>("example", {
        openShell: false,
      });
      let injected = false;
      const first = probe.settle(
        active.request<SampledGrid>(
          "sample",
          { doc, field: "total", resolution: 256 },
          (stage) => {
            if (stage !== "sampling" || injected) return;
            injected = true;
            const worker = probe.workers[0];
            if (failure === "error")
              worker.dispatchEvent(
                new ErrorEvent("error", {
                  message: "injected worker runtime failure",
                  cancelable: true,
                }),
              );
            else if (failure === "messageerror")
              worker.dispatchEvent(new MessageEvent("messageerror"));
            else {
              const id = probe.progressIds.get(worker);
              worker.dispatchEvent(
                new MessageEvent("message", {
                  data: { id, fatal: true, error: "injected fatal failure" },
                }),
              );
            }
          },
        ),
      );
      const second = probe.settle(
        queued.request<EigenVistaDocument>("example", { openShell: true }),
      );
      const [a, b] = await Promise.all([first, second]);
      const afterFailure = {
        workers: probe.workers.length,
        terminations: probe.terminated.length,
        queuedPosts: probe.packets.filter(
          (packet) => packet.action === "example" && packet.openShell,
        ).length,
      };
      const fresh = await queued.request<EigenVistaDocument>("example", {
        openShell: true,
      });
      return {
        injected,
        a: a.ok ? { ok: true as const } : a,
        b,
        afterFailure,
        fresh: fresh.id,
        workers: probe.workers.length,
      };
    }, failure);
    expect(result.injected).toBe(true);
    expect(result.a.ok).toBe(false);
    expect(result.b).toEqual(result.a);
    if (!result.a.ok) expect(result.a.error.length).toBeGreaterThan(6);
    expect(result.afterFailure).toEqual({
      workers: 1,
      terminations: 1,
      queuedPosts: 0,
    });
    expect(result.fresh).toBe("analytic-open-shell-v1");
    expect(result.workers).toBe(2);
  });

test("a queued DataCloneError rejects only its request and preserves other owners", async ({
  page,
}) => {
  await prepare(page, "post-failure");
  const result = await page.evaluate(async () => {
    const probe = (window as unknown as ProbedWindow).ownershipProbe;
    const active = probe.create();
    const invalid = probe.create();
    const retained = probe.create();
    const doc = await active.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const first = probe.settle(
      active.request<SampledGrid>("sample", {
        doc,
        field: "total",
        resolution: 128,
      }),
    );
    const bad = probe.settle(
      invalid.request("example", { openShell: false, uncloneable: () => 0 }),
    );
    const sibling = probe.settle(
      retained.request<EigenVistaDocument>("example", { openShell: true }),
    );
    const [a, b, c] = await Promise.all([first, bad, sibling]);
    return {
      a: a.ok ? { ok: true, values: a.result.values.length } : a,
      b,
      c: c.ok ? { ok: true, id: c.result.id } : c,
      workers: probe.workers.length,
      terminations: probe.terminated.length,
    };
  });
  expect(result.a).toEqual({ ok: true, values: 128 ** 3 });
  expect(result.b.ok).toBe(false);
  if (!result.b.ok) expect(result.b.error).toMatch(/clone|serializ|function/i);
  expect(result.c).toEqual({ ok: true, id: "analytic-open-shell-v1" });
  expect(result.workers).toBe(1);
  expect(result.terminations).toBe(0);
});

test("scoped worker construction failure rejects asynchronously and can retry", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const result = await page.evaluate(async () => {
    const url = "/src/science.ts?ownership-case=construction-failure";
    const science = (await import(/* @vite-ignore */ url)) as {
      createScienceClient(): ScienceClient;
    };
    const client = science.createScienceClient();
    const NativeWorker = window.Worker;
    let synchronousThrow = false;
    let rejection = "";
    window.Worker = function BrokenWorker() {
      throw new Error("scoped worker construction blocked");
    } as unknown as typeof Worker;
    try {
      let pending: Promise<unknown> | undefined;
      try {
        pending = client.request("example", { openShell: false });
      } catch {
        synchronousThrow = true;
      }
      if (pending)
        await pending.catch((error) => {
          rejection = String(error);
        });
    } finally {
      window.Worker = NativeWorker;
    }
    const fresh = await client.request<EigenVistaDocument>("example", {
      openShell: true,
    });
    return { synchronousThrow, rejection, fresh: fresh.id };
  });
  expect(result.synchronousThrow).toBe(false);
  expect(result.rejection).toContain("scoped worker construction blocked");
  expect(result.fresh).toBe("analytic-open-shell-v1");
});

test("failed WASM initialization rejects every owner and replacement fetch recovers", async ({
  page,
}) => {
  await prepare(page, "initialization-failure");
  let wasmRequests = 0;
  // Register after the App's independent worker has finished initialization.
  // Only the isolated test pool's first binary fetch is interrupted.
  await page.route(/\/eigenvista_wasm_bg\.wasm(?:\?|$)/, async (route) => {
    wasmRequests++;
    if (wasmRequests === 1) await route.abort("failed");
    else await route.continue();
  });
  const result = await page.evaluate(async () => {
    const probe = (window as unknown as ProbedWindow).ownershipProbe;
    const active = probe.create();
    const queued = probe.create();
    const first = probe.settle(
      active.request<EigenVistaDocument>("example", { openShell: false }),
    );
    const second = probe.settle(
      queued.request<EigenVistaDocument>("example", { openShell: true }),
    );
    const [a, b] = await Promise.all([first, second]);
    const afterFailure = {
      workers: probe.workers.length,
      terminations: probe.terminated.length,
      queuedPosts: probe.packets.filter(
        (packet) => packet.action === "example" && packet.openShell,
      ).length,
    };
    const fresh = await probe.settle(
      queued.request<EigenVistaDocument>("example", { openShell: true }),
    );
    return {
      a: a.ok ? { ok: true as const } : a,
      b: b.ok ? { ok: true as const } : b,
      fresh: fresh.ok ? { ok: true, id: fresh.result.id } : fresh,
      afterFailure,
      workers: probe.workers.length,
    };
  });
  expect(result.a.ok).toBe(false);
  expect(result.b).toEqual(result.a);
  expect(result.afterFailure).toEqual({
    workers: 1,
    terminations: 1,
    queuedPosts: 0,
  });
  expect(result.fresh).toEqual({ ok: true, id: "analytic-open-shell-v1" });
  expect(result.workers).toBe(2);
  expect(wasmRequests).toBeGreaterThanOrEqual(2);
});
