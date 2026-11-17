import { activateWidget } from "./workspace";
import { test, expect, type Page } from "@playwright/test";
import { installNativeIpc, type NativeIpcWindow } from "./nativeIpc";

// These are real App/browser regressions at the native IPC boundary. They do
// not replace macOS close-button/Cmd+Q/native-save acceptance.
const quit = (page: Page) =>
  page.getByRole("dialog", { name: "Quit EigenVista?", exact: true });

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByRole("alert")).toHaveCount(0);
}

async function requestExit(page: Page, request: number) {
  await page.evaluate(
    (request) =>
      (window as unknown as NativeIpcWindow).nativeIpc.requestExit(request),
    request,
  );
}

async function approved(page: Page) {
  return page.evaluate(
    () => (window as unknown as NativeIpcWindow).nativeIpc.approved,
  );
}

async function dirty(page: Page) {
  await activateWidget(page, "document");
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
}

async function holdGeneration(page: Page) {
  await activateWidget(page, "field-rendering");
  await page.evaluate(() => {
    (window as unknown as NativeIpcWindow).nativeIpc.holdGeneration = true;
  });
  await page
    .getByRole("button", { name: "Generate surfaces", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.generationHeld,
      ),
    )
    .toBe(true);
}

test("clean native IPC exit is approved without a user confirmation", async ({
  page,
}) => {
  await installNativeIpc(page);
  await ready(page);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  await requestExit(page, 11);
  await expect.poll(() => approved(page)).toEqual([11]);
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.saves,
    ),
  ).toEqual([]);
});

test("dirty native IPC exit deduplicates prompts and Cancel preserves the document on desktop/mobile", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await installNativeIpc(page);
  await ready(page);
  await dirty(page);
  const title = await page.locator(".document-title").innerText();
  const surfaces = await page.locator(".surface-row").count();
  await requestExit(page, 21);
  await requestExit(page, 21);
  await expect(quit(page)).toHaveCount(1);
  await expect(quit(page)).toBeVisible();
  expect(
    await quit(page).evaluate((element) => element.matches(":modal")),
  ).toBe(true);
  await page.screenshot({
    path: `../artifacts/native-exit-${info.project.name}-desktop.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = (await quit(page).boundingBox())!;
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(391);
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(845);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `../artifacts/native-exit-${info.project.name}-mobile.png`,
  });
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
  expect(await approved(page)).toEqual([]);
  await expect(page.locator(".document-title")).toHaveText(title);
  await expect(page.locator(".surface-row")).toHaveCount(surfaces);
  await expect(page.getByLabel("Representation", { exact: true })).toHaveValue(
    "space-fill",
  );
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await requestExit(page, 22);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([22]);
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.resolutions,
    ),
  ).toEqual([
    { request: 21, discard: false },
    { request: 22, discard: true },
  ]);
  expect(errors).toEqual([]);
});

test("Escape cancels the pending native IPC exit", async ({ page }) => {
  await installNativeIpc(page);
  await ready(page);
  await dirty(page);
  await requestExit(page, 31);
  await expect(quit(page)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(quit(page)).not.toBeVisible();
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  expect(await approved(page)).toEqual([]);
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.resolutions,
    ),
  ).toEqual([{ request: 31, discard: false }]);
});

test("a native IPC request made before listener installation is recovered", async ({
  page,
}) => {
  await installNativeIpc(page, { pending: 41 });
  await page.goto("/");
  await expect(quit(page)).toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.pendingReads,
    ),
  ).toBe(1);
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  expect(await approved(page)).toEqual([]);
});

test("Save and Quit sends an actual encoded current document before approving native IPC exit", async ({
  page,
}) => {
  await installNativeIpc(page);
  await ready(page);
  await dirty(page);
  await requestExit(page, 51);
  await quit(page)
    .getByRole("button", { name: "Save and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([51]);
  const saved = await page.evaluate(async () => {
    const files = (window as unknown as NativeIpcWindow).nativeIpc.saves;
    if (files.length !== 1)
      throw new Error(`Expected one save, received ${files.length}`);
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const document = JSON.parse(core.decode(new Uint8Array(files[0].bytes)));
    return {
      document,
      name: files[0].name,
      protectedPaths: files[0].protectedPaths,
    };
  });
  expect(saved.document.view.representation).toBe("space-fill");
  expect(saved.document.surfaces).toHaveLength(2);
  expect(saved.name).toMatch(/\.eigenvista$/);
  expect(saved.protectedPaths).toEqual([]);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
});

for (const outcome of ["cancelled", "failed"] as const) {
  test(`${outcome} native save keeps the exit dialog and unsaved data, then a retry succeeds`, async ({
    page,
  }) => {
    await installNativeIpc(page, { saveOutcome: outcome });
    await ready(page);
    await dirty(page);
    const title = await page.locator(".document-title").innerText();
    await requestExit(page, 61);
    await quit(page)
      .getByRole("button", { name: "Save and Quit", exact: true })
      .click();
    await expect(quit(page)).toContainText("Save did not complete");
    await expect(quit(page)).toBeVisible();
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
    await expect(page.locator(".document-title")).toHaveText(title);
    expect(await approved(page)).toEqual([]);
    expect(
      await page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.saves.length,
      ),
    ).toBe(1);
    if (outcome === "failed")
      await expect(page.getByRole("alert")).toContainText(
        "Deliberate native write failure",
      );
    await page.evaluate(() => {
      (window as unknown as NativeIpcWindow).nativeIpc.saveOutcome = "saved";
    });
    await quit(page)
      .getByRole("button", { name: "Save and Quit", exact: true })
      .click();
    await expect.poll(() => approved(page)).toEqual([61]);
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  });
}

test("native exit waits for save completion and ignores repeated quit requests during the save", async ({
  page,
}) => {
  await installNativeIpc(page, { saveOutcome: "delayed" });
  await ready(page);
  await dirty(page);
  await requestExit(page, 71);
  await quit(page)
    .getByRole("button", { name: "Save and Quit", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.saves.length,
      ),
    )
    .toBe(1);
  expect(await approved(page)).toEqual([]);
  await requestExit(page, 71);
  await expect(quit(page)).toHaveCount(1);
  await expect(
    quit(page).getByRole("button", { name: "Discard and Quit", exact: true }),
  ).toBeDisabled();
  await expect(
    quit(page).getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releaseSave(false),
  );
  await expect(quit(page)).toContainText("Save did not complete");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  expect(await approved(page)).toEqual([]);
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
});

test("a document generated while the quit dialog is open requires fresh discard confirmation", async ({
  page,
}) => {
  await installNativeIpc(page);
  await ready(page);
  await holdGeneration(page);
  await requestExit(page, 81);
  await expect(quit(page)).toBeVisible();
  await expect(
    quit(page).getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeDisabled();
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releaseGeneration(),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect(quit(page)).toContainText("The document changed");
  expect(await approved(page)).toEqual([]);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([81]);
});

test("Cancel native quit retains an in-flight generation and lets it publish", async ({
  page,
}) => {
  await installNativeIpc(page);
  await ready(page);
  await holdGeneration(page);
  const terminations = await page.evaluate(
    () => (window as unknown as NativeIpcWindow).nativeIpc.terminations,
  );
  await requestExit(page, 91);
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.terminations,
    ),
  ).toBe(terminations);
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releaseGeneration(),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(
    page.getByRole("button", { name: "Generate surfaces", exact: true }),
  ).toBeEnabled();
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  expect(await approved(page)).toEqual([]);
});

test("a native exit-resolution error keeps the document and permits retry", async ({
  page,
}) => {
  await installNativeIpc(page, { failResolutions: 1 });
  await ready(page);
  await dirty(page);
  await requestExit(page, 101);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect(quit(page)).toContainText("Deliberate exit-resolution failure");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  expect(await approved(page)).toEqual([]);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([101]);
});

test("browser beforeunload cancellation preserves dirty data", async ({
  page,
}) => {
  await ready(page);
  await dirty(page);
  const beforeUnload = page.waitForEvent("dialog");
  await page.close({ runBeforeUnload: true });
  const warning = await beforeUnload;
  expect(warning.type()).toBe("beforeunload");
  await warning.dismiss();
  expect(page.isClosed()).toBe(false);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await expect(page.getByLabel("Representation", { exact: true })).toHaveValue(
    "space-fill",
  );
});

test("a new native exit received while cancellation settles is recovered", async ({
  page,
}) => {
  await installNativeIpc(page);
  await ready(page);
  await dirty(page);
  await requestExit(page, 111);
  await page.evaluate(() => {
    (window as unknown as NativeIpcWindow).nativeIpc.holdNextResolution = true;
  });
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.resolutionHeld,
      ),
    )
    .toBe(true);
  await requestExit(page, 112);
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releaseResolution(),
  );
  await expect(quit(page)).toBeVisible();
  await expect(
    quit(page).getByRole("button", { name: "Discard and Quit", exact: true }),
  ).toBeEnabled();
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([112]);
  expect(
    await page.evaluate(
      () => (window as unknown as NativeIpcWindow).nativeIpc.resolutions,
    ),
  ).toEqual([
    { request: 111, discard: false },
    { request: 112, discard: true },
  ]);
});

test("a stale startup handshake cannot reopen a resolved native exit request", async ({
  page,
}) => {
  await installNativeIpc(page, { pending: 121, holdInitialPending: true });
  await ready(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.pendingHeld,
      ),
    )
    .toBe(true);
  await dirty(page);
  await requestExit(page, 121);
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releasePending(),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.pendingHeld,
      ),
    )
    .toBe(false);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(quit(page)).not.toBeVisible();
  await requestExit(page, 122);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([122]);
});

test("a native resolution error after backend cancellation clears stale state and accepts a new request", async ({
  page,
}) => {
  await installNativeIpc(page, { failResolutions: 1 });
  await ready(page);
  await dirty(page);
  await page.evaluate(() => {
    (window as unknown as NativeIpcWindow).nativeIpc.clearOnResolutionError =
      true;
  });
  await requestExit(page, 131);
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(quit(page)).not.toBeVisible();
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  await expect(page.getByRole("alert")).toContainText(
    "Deliberate exit-resolution failure",
  );
  expect(await approved(page)).toEqual([]);
  await requestExit(page, 132);
  await quit(page)
    .getByRole("button", { name: "Discard and Quit", exact: true })
    .click();
  await expect.poll(() => approved(page)).toEqual([132]);
});

async function convertWater(page: Page, convert = true) {
  await page
    .getByRole("button", { name: "Convert Files", exact: true })
    .click();
  const converter = page.getByRole("dialog", {
    name: "Convert Files",
    exact: true,
  });
  await converter.getByLabel("Files to convert").setInputFiles({
    name: "water.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from("3\nwater\nO 0 0 0\nH 0.96 0 0\nH -0.24 0.93 0\n"),
  });
  if (convert) {
    await converter
      .getByRole("button", { name: "Convert", exact: true })
      .click();
    await expect(converter.locator(".conversion-item.ready")).toHaveCount(1);
  }
  return converter;
}

for (const state of ["queued", "ready"] as const) {
  test(`a clean scene still protects ${state} conversion work when its dialog is closed`, async ({
    page,
  }) => {
    await installNativeIpc(page);
    await ready(page);
    const converter = await convertWater(page, state === "ready");
    await converter
      .getByRole("button", { name: "Close conversion queue", exact: true })
      .click();
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
    await requestExit(page, 141);
    await expect(quit(page)).toBeVisible();
    await expect(quit(page)).toContainText(/conversion/i);
    await expect(
      quit(page).getByRole("button", { name: "Save and Quit", exact: true }),
    ).toBeDisabled();
    expect(await approved(page)).toEqual([]);
    await quit(page)
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Convert Files", exact: true })
      .click();
    await expect(converter.locator(`.conversion-item.${state}`)).toHaveCount(1);
    expect(
      await page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.saves,
      ),
    ).toEqual([]);
    await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  });
}

test("an in-flight converted-file save prevents native discard and cancellation preserves its output", async ({
  page,
}) => {
  await installNativeIpc(page, { saveOutcome: "delayed" });
  await ready(page);
  const converter = await convertWater(page);
  await converter.getByRole("button", { name: /^Save / }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as NativeIpcWindow).nativeIpc.saves.length,
      ),
    )
    .toBe(1);
  await requestExit(page, 151);
  await expect(quit(page)).toBeVisible();
  await expect(quit(page)).toContainText(
    "Finish or cancel the current save first",
  );
  await expect(
    quit(page).getByRole("button", { name: "Discard and Quit", exact: true }),
  ).toBeDisabled();
  await expect(
    quit(page).getByRole("button", { name: "Save and Quit", exact: true }),
  ).toBeDisabled();
  expect(await approved(page)).toEqual([]);
  await page.evaluate(() =>
    (window as unknown as NativeIpcWindow).nativeIpc.releaseSave(false),
  );
  await expect(
    quit(page).getByRole("button", { name: "Discard and Quit", exact: true }),
  ).toBeEnabled();
  await quit(page).getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(converter.locator(".conversion-item.ready")).toHaveCount(1);
  await expect(converter).toContainText("Save cancelled");
  await page.evaluate(() => {
    (window as unknown as NativeIpcWindow).nativeIpc.saveOutcome = "saved";
  });
  await converter.getByRole("button", { name: /^Save / }).click();
  await expect(converter.locator(".conversion-item.saved")).toHaveCount(1);
  await converter
    .getByRole("button", { name: "Close conversion queue", exact: true })
    .click();
  await requestExit(page, 152);
  await expect.poll(() => approved(page)).toEqual([152]);
  const document = await page.evaluate(async () => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return JSON.parse(
      core.decode(
        new Uint8Array(
          (window as unknown as NativeIpcWindow).nativeIpc.saves[1].bytes,
        ),
      ),
    );
  });
  expect(document.atoms.elements).toEqual([8, 1, 1]);
  expect(document.surfaces).toEqual([]);
});
