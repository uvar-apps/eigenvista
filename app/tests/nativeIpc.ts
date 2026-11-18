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
  controlSaves: {
    bytes: number[];
    path: string;
    protectedPaths: string[];
    overwrite: false;
  }[];
  files: Record<string, number[]>;
  controlReady: boolean;
  requestControl: (
    method: string,
    params?: Record<string, unknown>,
  ) => Promise<unknown>;
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
    controlEnabled?: boolean;
  } = {},
) {
  await page.addInitScript((options) => {
    type Callback = (event: {
      event: string;
      id: number;
      payload:
        | number
        | {
            requestId: number;
            method: string;
            params: Record<string, unknown>;
          };
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
    const requests = new Map<
      number,
      { resolve: (value: unknown) => void; reject: (error: Error) => void }
    >();
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
      controlSaves: [],
      files: {},
      controlReady: false,
      requestControl(method, params = {}) {
        if (!probe.controlReady)
          throw new Error("Native controller is not ready");
        const requestId = ++sequence;
        return new Promise((resolve, reject) => {
          requests.set(requestId, { resolve, reject });
          for (const [id, listener] of listeners)
            if (listener.event === "eigenvista-control-request")
              callbacks.get(listener.handler)?.({
                event: listener.event,
                id,
                payload: { requestId, method, params },
              });
        });
      },
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
    // Production passes a raw Uint8Array. Decode only these small test archives
    // into the historic number[] probe shape used by the lifecycle assertions.
    function documentTransfer(input: unknown) {
      if (!(input instanceof Uint8Array))
        throw new Error("Native document IPC must be binary");
      if (
        input.byteLength < 12 ||
        new TextDecoder().decode(input.subarray(0, 4)) !== "EVT1"
      )
        throw new Error("Invalid native document transfer prefix");
      const length = Number(
        new DataView(
          input.buffer,
          input.byteOffset,
          input.byteLength,
        ).getBigUint64(4, true),
      );
      const end = 12 + length;
      if (!Number.isSafeInteger(end) || end > input.byteLength)
        throw new Error("Invalid native document metadata length");
      const metadata = JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(
          input.subarray(12, end),
        ),
      ) as Record<string, unknown>;
      if (
        !Array.isArray(metadata.protectedPaths) ||
        metadata.protectedPaths.some((path) => typeof path !== "string")
      )
        throw new Error("Missing protected source paths in native metadata");
      return { metadata, bytes: Array.from(input.subarray(end)) };
    }
    state.__TAURI_EVENT_PLUGIN_INTERNALS__ = {
      unregisterListener: (_event: string, id: number) => listeners.delete(id),
    };
    state.__TAURI_INTERNALS__ = {
      transformCallback: (callback: Callback) => {
        const id = ++sequence;
        callbacks.set(id, callback);
        return id;
      },
      invoke: async (
        command: string,
        input: Record<string, unknown> | Uint8Array = {},
      ) => {
        const args = input as Record<string, unknown>;
        if (command === "control_connection")
          return {
            enabled: options.controlEnabled === true,
            instanceId: "native-transfer-test",
          };
        if (command === "control_ready") {
          probe.controlReady = true;
          return;
        }
        if (command === "control_respond") {
          const request = requests.get(args.requestId as number);
          if (!request) throw new Error("Unknown native control request");
          requests.delete(args.requestId as number);
          const response = args.response as {
            result?: unknown;
            error?: { message: string };
          };
          if (response.error)
            request.reject(
              Object.assign(new Error(response.error.message), response.error),
            );
          else request.resolve(response.result);
          return;
        }
        if (command === "control_read_file") {
          const bytes = probe.files[args.path as string];
          if (!bytes) throw new Error("Native test source does not exist");
          return new Uint8Array(bytes);
        }
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
        if (command === "save_native" || command === "control_save_document") {
          const { metadata, bytes } = documentTransfer(input);
          if (command === "save_native") {
            if (typeof metadata.name !== "string")
              throw new Error("Missing native save name");
            probe.saves.push({
              bytes,
              name: metadata.name,
              protectedPaths: metadata.protectedPaths as string[],
            });
          } else {
            if (
              typeof metadata.path !== "string" ||
              metadata.overwrite !== false
            )
              throw new Error("Missing native save path/no-overwrite metadata");
            probe.controlSaves.push({
              bytes,
              path: metadata.path,
              protectedPaths: metadata.protectedPaths as string[],
              overwrite: false,
            });
          }
          if (probe.saveOutcome === "failed")
            throw new Error("Deliberate native write failure");
          const saved =
            probe.saveOutcome === "delayed"
              ? await new Promise<boolean>((resolve) => {
                  finishSave = resolve;
                })
              : probe.saveOutcome === "saved";
          if (command === "save_native") return saved;
          if (!saved) throw new Error("Native control save cancelled");
          return { path: metadata.path, bytes: bytes.length };
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
