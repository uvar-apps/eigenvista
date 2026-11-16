import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { native } from "./files";
import { controlErrorResponse, type ApplicationControl } from "./control";

interface NativeRequest { requestId: number; method: string; params: Record<string, unknown> }

/** Native startup is inert unless the explicitly enabled broker reports a connection. */
export async function attachDesktopControl(control: ApplicationControl, signal?: AbortSignal): Promise<() => void> {
  if (!native || signal?.aborted) return () => {};
  const connection = await invoke<{ enabled: boolean; instanceId: string }>("control_connection");
  if (!connection.enabled || signal?.aborted) return () => {};
  control.setInstanceId(connection.instanceId);
  let active = true;
  const unlisten = await listen<NativeRequest>("eigenvista-control-request", ({ payload }) => {
    if (!active || signal?.aborted) return;
    void (async () => {
      let response: { result: unknown } | { error: ReturnType<typeof controlErrorResponse> };
      try { response = { result: await control.request(payload.method, payload.params) }; }
      catch (error) { response = { error: controlErrorResponse(error) }; }
      if (active && !signal?.aborted) await invoke("control_respond", { requestId: payload.requestId, response });
    })().catch((error) => console.error("Application control response failed", error));
  });
  const stop = () => { active = false; unlisten(); signal?.removeEventListener("abort", stop); };
  if (signal?.aborted) { stop(); return () => {}; }
  signal?.addEventListener("abort", stop, { once: true });
  try { await invoke("control_ready"); }
  catch (error) { stop(); throw error; }
  return stop;
}
