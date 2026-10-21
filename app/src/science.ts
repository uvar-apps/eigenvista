let worker: Worker | null = null;
export type WorkProgress = { completed: number; total: number };
let nextId = 0;
const pending = new Map<
  number,
  {
    resolve: (v: unknown) => void;
    reject: (e: Error) => void;
    onProgress?: (stage: string, counts?: WorkProgress) => void;
  }
>();
function start() {
  const instance = new Worker(new URL("./science.worker.ts", import.meta.url), {
    type: "module",
  });
  worker = instance;
  instance.onmessage = ({ data }) => {
    if (worker !== instance) return;
    const p = pending.get(data.id);
    if (!p) return;
    if (data.fatal) {
      cancel(new Error(data.error || "Scientific worker failed"));
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
      p.onProgress?.(data.progress, counts);
      return;
    }
    pending.delete(data.id);
    if (data.error) p.reject(new Error(data.error));
    else p.resolve(data.result);
  };
  instance.onerror = (event) => {
    event.preventDefault();
    if (worker === instance)
      cancel(
        new Error(
          event.message ||
            "Scientific worker failed; reduce the grid resolution and retry",
        ),
      );
  };
  instance.onmessageerror = () => {
    if (worker === instance)
      cancel(
        new Error(
          "Unable to receive calculation results; reduce the grid resolution and retry",
        ),
      );
  };
}
export function cancel(reason = new Error("Calculation cancelled")) {
  worker?.terminate();
  worker = null;
  for (const p of pending.values()) p.reject(reason);
  pending.clear();
}
export function request<T>(
  action: string,
  args: Record<string, unknown>,
  onProgress?: (stage: string, counts?: WorkProgress) => void,
): Promise<T> {
  const id = ++nextId;
  // Worker construction and posting happen inside the executor so any failure
  // rejects this promise instead of throwing synchronously out of request(),
  // which a caller's .catch() would never see.
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: (v) => resolve(v as T), reject, onProgress });
    try {
      if (!worker) start();
      const instance = worker;
      if (!instance)
        throw new Error(
          "Scientific worker is unavailable; retry the calculation",
        );
      instance.postMessage({ id, action, args });
    } catch (error) {
      cancel(error instanceof Error ? error : new Error(String(error)));
    }
  });
}
