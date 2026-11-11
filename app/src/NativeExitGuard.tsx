import { useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { native } from "./files";
import type { EigenVistaDocument } from "./types";

interface Snapshot {
  document: EigenVistaDocument | null;
  dirty: boolean;
  busy: boolean;
  saving: boolean;
  conversionPending: boolean;
}
interface Options {
  snapshot: () => Snapshot;
  save: () => Promise<boolean>;
  beforeExit: () => void;
  onError: (message: string) => void;
}
interface Pending {
  request: number;
  document: EigenVistaDocument | null;
}

/** Rust vetoes OS close/quit; only this current-document decision releases it. */
export function NativeExitGuard(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  const dialog = useRef<HTMLDialogElement>(null);
  const active = useRef(false);
  const pending = useRef<Pending | null>(null);
  const resolved = useRef(0);
  const deferred = useRef<number | null>(null);
  const working = useRef(false);
  const [request, setRequest] = useState<Pending | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [message, setMessage] = useState("");

  function fail(error: unknown, value?: Pending) {
    if (
      !active.current ||
      (value && pending.current?.request !== value.request)
    )
      return;
    working.current = false;
    setWaiting(false);
    setMessage(String(error));
    latest.current.onError(`Native close protection: ${String(error)}`);
  }
  function retire(value: Pending) {
    resolved.current = Math.max(resolved.current, value.request);
    if (pending.current?.request !== value.request) return;
    pending.current = null;
    setRequest(null);
    setMessage("");
    dialog.current?.close();
    working.current = false;
    setWaiting(false);
  }
  function receive(id: number) {
    if (!active.current) return;
    if (!Number.isInteger(id) || id < 1 || id > 0xffffffff) {
      fail("Invalid native exit request");
      return;
    }
    // A delayed startup query must never reopen a request already cancelled.
    if (id <= resolved.current) return;
    if (pending.current) {
      // Rust can accept a new close after cancellation but before its IPC reply.
      if (id > pending.current.request)
        deferred.current = Math.max(deferred.current ?? 0, id);
      return;
    }
    const snapshot = latest.current.snapshot();
    const value = { request: id, document: snapshot.document };
    pending.current = value;
    setRequest(value);
    setMessage("");
    // showModal blocks editing immediately, before the next React render.
    dialog.current?.showModal();
    if (!snapshot.dirty && !snapshot.busy && !snapshot.saving)
      void finish(value);
  }
  function receiveDeferred() {
    const id = deferred.current;
    deferred.current = null;
    if (id !== null) receive(id);
  }
  async function synchronize(failed?: Pending) {
    try {
      const id = await invoke<number | null>("pending_native_exit");
      if (!active.current) return;
      // An IPC reply may fail after Rust has already resolved the request.
      // Only retire that same UI request; never clear a newer prompt.
      if (
        failed &&
        (id === null ||
          id > failed.request ||
          (deferred.current ?? 0) > failed.request)
      )
        retire(failed);
      if (id !== null) receive(id);
      receiveDeferred();
    } catch (error) {
      if (active.current)
        latest.current.onError(
          `Native close protection could not resynchronize: ${String(error)}`,
        );
    }
  }
  function unchanged(value: Pending) {
    if (pending.current?.request !== value.request) return false;
    const snapshot = latest.current.snapshot();
    if (snapshot.document === value.document) return true;
    const refreshed = { ...value, document: snapshot.document };
    pending.current = refreshed;
    setRequest(refreshed);
    setMessage(
      "The document changed while this prompt was open. Review it before quitting.",
    );
    return false;
  }
  async function finish(value: Pending) {
    if (!active.current || !unchanged(value)) return;
    working.current = true;
    setWaiting(true);
    setMessage("Quitting EigenVista…");
    // Invalidate asynchronous publication before authorizing native termination.
    latest.current.beforeExit();
    try {
      await invoke("resolve_native_exit", {
        request: value.request,
        discard: true,
      });
    } catch (error) {
      fail(error, value);
      await synchronize(value);
    }
  }
  async function cancel() {
    const value = pending.current;
    if (!value || working.current) return;
    working.current = true;
    setWaiting(true);
    try {
      await invoke("resolve_native_exit", {
        request: value.request,
        discard: false,
      });
      if (!active.current) return;
      retire(value);
      receiveDeferred();
      await synchronize();
    } catch (error) {
      fail(error, value);
      await synchronize(value);
    }
  }
  async function discard() {
    const value = pending.current;
    if (!value || working.current || latest.current.snapshot().saving) return;
    await finish(value);
  }
  async function saveAndQuit() {
    const value = pending.current;
    const snapshot = latest.current.snapshot();
    if (
      !value ||
      working.current ||
      snapshot.busy ||
      snapshot.saving ||
      !unchanged(value)
    )
      return;
    working.current = true;
    setWaiting(true);
    setMessage("Saving document…");
    try {
      const saved = await latest.current.save();
      if (!active.current) return;
      working.current = false;
      setWaiting(false);
      if (!unchanged(value)) return;
      const current = latest.current.snapshot();
      if (!saved || current.dirty || current.saving || current.busy) {
        setMessage("Save did not complete. Your document is still open.");
        return;
      }
      await finish(value);
    } catch (error) {
      fail(error, value);
    }
  }
  useEffect(() => {
    if (!native) return;
    active.current = true;
    const subscription = listen<number>("eigenvista-exit-requested", (event) =>
      receive(event.payload),
    );
    void subscription
      .then(async (unlisten) => {
        if (!active.current) {
          unlisten();
          return;
        }
        // Recover a request emitted before the listener was installed.
        await synchronize();
      })
      .catch(fail);
    return () => {
      active.current = false;
      void subscription.then((unlisten) => unlisten()).catch(() => {});
    };
  }, []);

  if (!native) return null;
  const snapshot = options.snapshot();
  return (
    <dialog
      ref={dialog}
      className="native-exit-dialog"
      aria-labelledby="native-exit-title"
      aria-describedby="native-exit-description"
      onCancel={(event) => {
        event.preventDefault();
        void cancel();
      }}
    >
      <h2 id="native-exit-title">Quit EigenVista?</h2>
      <p id="native-exit-description">
        {request?.document?.title ? `“${request.document.title}”: ` : ""}
        {snapshot.dirty
          ? "Unsaved changes will be lost unless you save."
          : "Work is in progress. Quitting will cancel it."}
      </p>
      {message && <p role="status">{message}</p>}
      {snapshot.conversionPending && (
        <p>
          The conversion queue has unfinished work or files that have not been
          saved. Cancel quitting to finish or save them, or discard them to quit.
        </p>
      )}
      {snapshot.saving && <p>Finish or cancel the current save first.</p>}
      <div className="native-exit-actions">
        <button autoFocus disabled={waiting} onClick={() => void cancel()}>
          Cancel
        </button>
        <button
          disabled={waiting || snapshot.saving}
          onClick={() => void discard()}
        >
          Discard and Quit
        </button>
        <button
          disabled={
            waiting || snapshot.busy || snapshot.saving || !snapshot.document
          }
          onClick={() => void saveAndQuit()}
        >
          Save and Quit
        </button>
      </div>
    </dialog>
  );
}
