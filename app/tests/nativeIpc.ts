import type { Page } from "@playwright/test";

type NativeOutcome = "saved" | "cancelled" | "failed" | "delayed";
type PickOptions = {
  multiple: boolean;
  filters: { name: string; extensions: string[] }[];
};

export type NativeIpcProbe = {
  pending: number | null;
  pendingReads: number;
  resolutions: { request: number; discard: boolean }[];
  approved: number[];
  saves: { bytes: number[]; name: string; protectedPaths: string[] }[];
  saveOutcome: NativeOutcome;
  failResolutions: number;
  clearOnResolutionError: boolean;
  holdNextResolution: boolean;
  resolutionHeld: boolean;
  pendingHeld: boolean;
  holdGeneration: boolean;
  generationHeld: boolean;
  terminations: number;
  requestExit: (request: number) => void;
  releaseSave: (saved: boolean) => void;
  releaseGeneration: () => void;
  releaseResolution: () => void;
  releasePending: () => void;
};

export type NativeIpcWindow = Window & { nativeIpc: NativeIpcProbe };

/** Mock only native IPC; App, scientific WASM, workers and dialog stay real. */
export async function installNativeIpc(
  page: Page,
  options: {
    pending?: number;
    saveOutcome?: NativeOutcome;
    parameterOutcome?: Exclude<NativeOutcome, "delayed">;
    failResolutions?: number;
    holdInitialPending?: boolean;
  } = {},
) {
  await page.addInitScript((options) => {
    type Callback = (event: {
      event: string;
      id: number;
      payload: number;
    }) => void;
    const state = window as unknown as NativeIpcWindow & {
      isTauri: boolean;
      nativePicks: PickOptions[];
      parameterExports: { command: string; args: { text: string } }[];
      __TAURI_INTERNALS__: unknown;
      __TAURI_EVENT_PLUGIN_INTERNALS__: unknown;
    };
    state.isTauri = true;
    state.nativePicks = [];
    state.parameterExports = [];
    const callbacks = new Map<number, Callback>();
    const listeners = new Map<number, { event: string; handler: number }>();
    let sequence = 0;
    let finishSave: ((saved: boolean) => void) | undefined;
    let finishGeneration: (() => void) | undefined;
    let finishResolution: (() => void) | undefined;
    let finishPending: (() => void) | undefined;
    const probe: NativeIpcProbe = {
      pending: options.pending ?? null,
      pendingReads: 0,
      resolutions: [],
      approved: [],
      saves: [],
      saveOutcome: options.saveOutcome ?? "saved",
      failResolutions: options.failResolutions ?? 0,
      clearOnResolutionError: false,
      holdNextResolution: false,
      resolutionHeld: false,
      pendingHeld: false,
      holdGeneration: false,
      generationHeld: false,
      terminations: 0,
      requestExit(request) {
        probe.pending ??= request;
        for (const [id, listener] of listeners)
          if (listener.event === "eigenvista-exit-requested")
            callbacks.get(listener.handler)?.({
              event: listener.event,
              id,
              payload: probe.pending,
            });
      },
      releaseSave(saved) {
        if (!finishSave) throw new Error("No native save is pending");
        finishSave(saved);
        finishSave = undefined;
      },
      releaseGeneration() {
        if (!finishGeneration) throw new Error("No generation result is held");
        finishGeneration();
        finishGeneration = undefined;
      },
      releaseResolution() {
        if (!finishResolution) throw new Error("No exit resolution is held");
        finishResolution();
        finishResolution = undefined;
      },
      releasePending() {
        if (!finishPending) throw new Error("No pending-exit response is held");
        finishPending();
        finishPending = undefined;
      },
    };
    state.nativeIpc = probe;
    state.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener: (_event: string, id: number) => listeners.delete(id),
    };
    state.__TAURI_INTERNALS__ = {
      transformCallback: (callback: Callback) => {
        const id = ++sequence;
        callbacks.set(id, callback);
        return id;
      },
      invoke: async (command: string, args: Record<string, unknown> = {}) => {
        if (command === "plugin:event|listen") {
          const id = ++sequence;
          listeners.set(id, {
            event: args.event as string,
            handler: args.handler as number,
          });
          return id;
        }
        if (command === "plugin:event|unlisten") {
          listeners.delete(args.eventId as number);
          return;
        }
        if (command === "pending_native_exit") {
          probe.pendingReads++;
          const pending = probe.pending;
          if (options.holdInitialPending && probe.pendingReads === 1) {
            probe.pendingHeld = true;
            await new Promise<void>((resolve) => {
              finishPending = resolve;
            });
            probe.pendingHeld = false;
          }
          return pending;
        }
        if (command === "resolve_native_exit") {
          const request = args.request as number;
          const discard = args.discard as boolean;
          if (request !== probe.pending)
            throw new Error("Native exit request is no longer pending");
          probe.resolutions.push({ request, discard });
          if (probe.failResolutions > 0) {
            probe.failResolutions--;
            if (probe.clearOnResolutionError) probe.pending = null;
            throw new Error("Deliberate exit-resolution failure");
          }
          probe.pending = null;
          if (discard) probe.approved.push(request);
          if (probe.holdNextResolution) {
            probe.holdNextResolution = false;
            probe.resolutionHeld = true;
            await new Promise<void>((resolve) => {
              finishResolution = resolve;
            });
            probe.resolutionHeld = false;
          }
          return;
        }
        if (command === "save_native") {
          probe.saves.push({
            bytes: args.bytes as number[],
            name: args.name as string,
            protectedPaths: args.protectedPaths as string[],
          });
          if (probe.saveOutcome === "failed")
            throw new Error("Deliberate native write failure");
          if (probe.saveOutcome === "delayed")
            return await new Promise<boolean>((resolve) => {
              finishSave = resolve;
            });
          return probe.saveOutcome === "saved";
        }
        if (command === "plugin:dialog|open") {
          state.nativePicks.push(args.options as PickOptions);
          return null;
        }
        if (command === "save_shader_parameters") {
          state.parameterExports.push({
            command,
            args: args as { text: string },
          });
          if (options.parameterOutcome === "failed")
            throw new Error("Deliberate parameter write failure");
          return options.parameterOutcome !== "cancelled";
        }
        throw new Error(`Unexpected native command: ${command}`);
      },
    };
    const OriginalWorker = Worker;
    const held = new WeakMap<Worker, number>();
    window.Worker = class extends OriginalWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        // Register before the bridge: Worker event listener ordering differs
        // between engines, so a late capture listener is not sufficient.
        this.addEventListener("message", (event: MessageEvent) => {
          if (event.data.id !== held.get(this) || !("result" in event.data))
            return;
          event.stopImmediatePropagation();
          held.delete(this);
          probe.generationHeld = true;
          finishGeneration = () => {
            probe.generationHeld = false;
            this.dispatchEvent(
              new MessageEvent("message", { data: event.data }),
            );
          };
        });
      }
      postMessage(
        message: { id: number; action: string },
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        if (message.action === "generate" && probe.holdGeneration) {
          probe.holdGeneration = false;
          held.set(this, message.id);
        }
        super.postMessage(
          message,
          Array.isArray(options) ? { transfer: options } : options,
        );
      }
      terminate() {
        probe.terminations++;
        super.terminate();
      }
    };
  }, options);
}
