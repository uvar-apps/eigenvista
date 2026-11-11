(() => {
  if (globalThis.__eigenvistaSmokeStarted) return;
  globalThis.__eigenvistaSmokeStarted = true;
  const scenario = globalThis.__eigenvistaSmokeScenario;
  const invoke = (command, args) =>
    globalThis.__TAURI_INTERNALS__.invoke(command, args);
  const report = (step, ok, detail = "") =>
    invoke("smoke_report", { step, ok, detail });
  const waitFor = async (predicate, description) => {
    const end = performance.now() + 15000;
    while (performance.now() < end) {
      if (await predicate()) return;
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    throw new Error(`Timed out: ${description}`);
  };
  const dialog = () => document.querySelector(".native-exit-dialog");
  const click = (text) => {
    const button = [...dialog().querySelectorAll("button")].find(
      (element) => element.textContent.trim() === text,
    );
    if (!button || button.disabled)
      throw new Error(`Unavailable button: ${text}`);
    button.click();
  };
  void (async () => {
    if (
      location.protocol !== "tauri:" &&
      location.hostname !== "tauri.localhost"
    )
      throw new Error("Build this probe with --features tauri/custom-protocol");
    await waitFor(
      () =>
        document.querySelector('[aria-label="Isovalue"]') &&
        !document.querySelector('[title="Open document"]').disabled,
      "actual example and worker ready",
    );
    await report("frontend_ready", true, location.href);
    if (scenario === "clean-close") {
      await report(
        "clean_document",
        !document.querySelector('[aria-label="Unsaved changes"]'),
      );
      await report("expect_exit", true, "clean native close");
      await invoke("smoke_request", { kind: "close" });
      return;
    }
    const input = document.querySelector('[aria-label="Isovalue"]');
    const isovalue = String(Number(input.value) + 0.01);
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    ).set.call(input, isovalue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await waitFor(
      () => document.querySelector('[aria-label="Unsaved changes"]'),
      "real React isovalue edit marks document dirty",
    );
    await report("dirty_edit", true, isovalue);
    await invoke("smoke_request", { kind: scenario });
    await waitFor(() => dialog()?.open, "native close/quit opens actual modal");
    const first = await invoke("pending_native_exit");
    await report("native_modal_open", first > 0, String(first));
    await invoke("smoke_request", { kind: "close" });
    await invoke("smoke_request", { kind: "exit" });
    await report(
      "native_requests_deduplicated",
      (await invoke("pending_native_exit")) === first &&
        document.querySelectorAll(".native-exit-dialog[open]").length === 1,
    );
    click("Cancel");
    await waitFor(() => !dialog().open, "Cancel retains window");
    await report(
      "cancel_preserves_document",
      document.querySelector('[aria-label="Isovalue"]').value === isovalue &&
        !!document.querySelector('[aria-label="Unsaved changes"]') &&
        (await invoke("pending_native_exit")) === null,
    );
    await invoke("smoke_request", { kind: scenario });
    await waitFor(() => dialog().open, "new native request after cancel");
    const second = await invoke("pending_native_exit");
    await report("native_new_token", second > first, `${first} -> ${second}`);
    await report("expect_exit", true, "actual Discard and Quit");
    click("Discard and Quit");
  })().catch((error) => {
    void report("failed", false, String(error));
  });
})();
