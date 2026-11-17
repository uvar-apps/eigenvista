import { ScienceRegistration } from "./scienceRegistration";
import { auxiliaryScienceActions } from "./scienceActions";

export type WorkProgress = { completed: number; total: number };
type Progress = (stage: string, counts?: WorkProgress) => void;
export interface RequestOptions {
  signal?: AbortSignal;
}
interface Job {
  id: number;
  owner: symbol;
  action: string;
  args: Record<string, unknown>;
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  onProgress?: Progress;
  cleanup?: () => void;
  registration?: ReturnType<ScienceRegistration["prepare"]>["registration"];
}

let worker: Worker | null = null;
let active: Job | undefined;
let nextId = 0;
const pending = new Map<number, Job>();
const registration = new ScienceRegistration();
const asError = (error: unknown) =>
  error instanceof Error ? error : new Error(String(error));

function releaseWorker() {
  const instance = worker;
  worker = null;
  registration.clear();
  instance?.terminate();
}

function settle(job: Job, error?: Error, result?: unknown) {
  if (!pending.delete(job.id)) return;
  job.cleanup?.();
  if (active === job) active = undefined;
  if (error) job.reject(error);
  else job.resolve(result);
  queueMicrotask(pump);
}

/** Fatal runtime/transport failures invalidate every owner, unlike user cancel. */
function failWorker(error: Error) {
  releaseWorker();
  active = undefined;
  const jobs = [...pending.values()];
  pending.clear();
  for (const job of jobs) {
    job.cleanup?.();
    job.reject(error);
  }
}

function cancelJob(job: Job, reason: Error) {
  if (!pending.has(job.id)) return;
  if (active === job) releaseWorker();
  settle(job, reason);
}

function start() {
  const instance = new Worker(new URL("./science.worker.ts", import.meta.url), {
    type: "module",
  });
  worker = instance;
  instance.onmessage = ({ data }) => {
    const job = active;
    if (worker !== instance || !job || job.id !== data.id) return;
    if (data.fatal) {
      failWorker(new Error(data.error || "Scientific worker failed"));
      return;
    }
    if (typeof data.progress === "string") {
      const counts =
        Number.isSafeInteger(data.completed) &&
        Number.isSafeInteger(data.total) &&
        data.total > 0 &&
        data.completed >= 0 &&
        data.completed <= data.total
          ? { completed: data.completed, total: data.total }
          : undefined;
      try {
        job.onProgress?.(data.progress, counts);
      } catch (error) {
        cancelJob(job, asError(error));
      }
      return;
    }
    // A rejected depiction request never invalidates the resident quantum input.
    if (data.error) {
      if (
        !auxiliaryScienceActions.has(job.action) &&
        !data.registrationPreserved
      )
        registration.clear();
    } else registration.commit(job.registration);
    settle(job, data.error ? new Error(data.error) : undefined, data.result);
  };
  instance.onerror = (event) => {
    event.preventDefault();
    if (worker === instance)
      failWorker(
        new Error(
          event.message ||
            "Scientific worker failed; reduce the grid resolution and retry",
        ),
      );
  };
  // Chromium dispatches this event without exposing an onmessageerror property.
  instance.addEventListener("messageerror", () => {
    if (worker === instance)
      failWorker(
        new Error(
          "Unable to receive calculation results; reduce the grid resolution and retry",
        ),
      );
  });
}

/** Only one request is posted: queued jobs survive another owner's cancellation. */
function pump() {
  if (active || !pending.size) return;
  const job = pending.values().next().value!;
  active = job;
  try {
    if (!worker) start();
    const prepared = registration.prepare(job.action, job.args);
    job.registration = prepared.registration;
    worker!.postMessage({
      id: job.id,
      action: job.action,
      args: prepared.args,
    });
  } catch (error) {
    registration.clear();
    settle(job, asError(error));
  }
}

/** A consumer owns cancellation across its import/sample/mesh/validation pipeline. */
export function createScienceClient() {
  const owner = Symbol("scientific consumer");
  return {
    cancel(reason = new Error("Calculation cancelled")) {
      for (const job of [...pending.values()])
        if (job.owner === owner) cancelJob(job, reason);
    },
    request<T>(
      action: string,
      args: Record<string, unknown>,
      onProgress?: Progress,
      options: RequestOptions = {},
    ): Promise<T> {
      // Construction, preparation and posting must reject a promise, never
      // escape synchronously before a caller can attach its error handler.
      return new Promise<T>((resolve, reject) => {
        const signal = options.signal;
        if (signal?.aborted) {
          reject(asError(signal.reason ?? new Error("Calculation cancelled")));
          return;
        }
        const job: Job = {
          id: ++nextId,
          owner,
          action,
          args: { ...args },
          onProgress,
          resolve: (value) => resolve(value as T),
          reject,
        };
        if (signal) {
          const abort = () =>
            cancelJob(
              job,
              asError(signal.reason ?? new Error("Calculation cancelled")),
            );
          signal.addEventListener("abort", abort, { once: true });
          job.cleanup = () => signal.removeEventListener("abort", abort);
        }
        pending.set(job.id, job);
        pump();
      });
    },
  };
}

// Compatibility callers share one default owner; UI components use their own.
export const { request, cancel } = createScienceClient();
