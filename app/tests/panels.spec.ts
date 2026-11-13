import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";

const titles = [
  "Document",
  "Quantum fields",
  "Provenance",
  "Field rendering",
  "Appearance",
  "Atom colours",
  "Surface shader",
  "Saved surfaces",
] as const;
const storageKey = "eigenvista:panel-expansion:v1";
const disclosure = (page: Page, name: (typeof titles)[number]) =>
  page.getByRole("button", { name, exact: true });

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    {
      timeout: 45000,
    },
  );
  await expect(disclosure(page, "Field rendering")).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
}

async function save(page: Page, filename: string) {
  const pending = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await pending).saveAs(filename);
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(filename)),
  );
}

async function settleDisclosures(page: Page) {
  await page.locator(".panel-disclosure > svg").evaluateAll(async (icons) => {
    await Promise.all(
      icons
        .flatMap((icon) => icon.getAnimations())
        .map((animation) => animation.finished),
    );
  });
}

test("all eight sections disclose with the keyboard while content stays mounted", async ({
  page,
}) => {
  await ready(page);
  for (const title of titles) {
    const button = disclosure(page, title);
    await expect(
      page.getByRole("heading", {
        name: title === "Saved surfaces" ? /^Saved surfaces \d+$/ : title,
        exact: true,
      }),
    ).toBeVisible();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    const contentId = await button.getAttribute("aria-controls");
    const body = page.locator(`#${contentId}`);
    await body.evaluate((element) =>
      element.setAttribute("data-mounted-probe", "retained"),
    );
    await button.focus();
    await button.press("Space");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(body).toBeHidden();
    await expect(body).toHaveAttribute("data-mounted-probe", "retained");
    await button.press("Tab");
    expect(
      await body.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(false);
    await button.focus();
    await button.press("Enter");
    await expect(body).toBeVisible();
    await expect(body).toHaveAttribute("data-mounted-probe", "retained");
  }
  await disclosure(page, "Document").click();
  await expect(page.getByLabel("Representation", { exact: true })).toBeHidden();
  // The example menu is independent of the Document disclosure, even collapsed.
  await page.getByTitle("Open example", { exact: true }).click();
  await page
    .getByRole("button", { name: "Fractional open shell", exact: true })
    .click();
  await expect(disclosure(page, "Field rendering")).toBeEnabled();
  await expect(disclosure(page, "Document")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".surfaces .panel-count")).toBeVisible();
});

test("layout changes leave clean documents, saved data and the scientific worker untouched", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = window as unknown as { panelWorkerPosts: number };
    state.panelWorkerPosts = 0;
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      state.panelWorkerPosts++;
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await ready(page);
  const before = await save(page, info.outputPath("before.eigenvista"));
  await page.evaluate(
    () =>
      ((window as unknown as { panelWorkerPosts: number }).panelWorkerPosts =
        0),
  );
  for (const title of titles) {
    await disclosure(page, title).click();
    await expect(disclosure(page, title)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  }
  await expect(page.locator(".dirty")).toHaveCount(0);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { panelWorkerPosts: number }).panelWorkerPosts,
    ),
  ).toBe(0);
  await settleDisclosures(page);
  await page.screenshot({
    path: info.outputPath("collapsed-panels-desktop.png"),
    fullPage: true,
  });
  // Compare the complete decoded document, independent of ZIP metadata/compression.
  const after = await save(page, info.outputPath("after.eigenvista"));
  expect(after).toEqual(before);
});

test("collapse preserves the selected orbital, sampled preview and real control values", async ({
  page,
}) => {
  await trackSceneDraws(page);
  await ready(page);
  await page
    .locator(".orbital-field-list .field-row:not(.selected)")
    .first()
    .click();
  const selected = await page.locator(".field-row.selected").textContent();
  await page
    .getByLabel("Rendering mode", { exact: true })
    .selectOption("volume");
  await expect(page.getByLabel("Rendering mode", { exact: true })).toHaveValue(
    "volume",
    { timeout: 45000 },
  );
  await expect(disclosure(page, "Field rendering")).toBeEnabled({
    timeout: 45000,
  });
  await page
    .getByLabel("Preview sampling quality", { exact: true })
    .selectOption("4");
  await page
    .getByLabel("Surface shading", { exact: true })
    .selectOption("blinn-phong");
  await settleScene(page);
  const before = await scenePixels(page);
  expect(before.colorful).toBeGreaterThan(300);
  for (const title of [
    "Quantum fields",
    "Field rendering",
    "Appearance",
  ] as const)
    await disclosure(page, title).click();
  await expect(page.getByLabel("Rendering mode", { exact: true })).toBeHidden();
  await expect(page.locator(".field-row.selected")).toHaveText(selected!);
  await settleScene(page);
  expect((await scenePixels(page)).checksum).toBe(before.checksum);
  for (const title of [
    "Quantum fields",
    "Field rendering",
    "Appearance",
  ] as const)
    await disclosure(page, title).click();
  await expect(page.getByLabel("Rendering mode", { exact: true })).toHaveValue(
    "volume",
  );
  await expect(
    page.getByLabel("Preview sampling quality", { exact: true }),
  ).toHaveValue("4");
  await expect(page.getByLabel("Surface shading", { exact: true })).toHaveValue(
    "blinn-phong",
  );
  await expect(page.locator(".field-row.selected")).toHaveText(selected!);
});

test("nested shader state and file errors survive reorder and collapse, and Clear keeps preferences", async ({
  page,
}) => {
  await ready(page);
  for (const [kind, filename] of [
    ["vertex", "surface-lambert.vert"],
    ["fragment", "surface-lambert.frag"],
  ])
    await page
      .locator(`[data-shader-input="${kind}"]`)
      .setInputFiles(path.resolve("shaders", filename));
  await expect(page.getByLabel("saturation", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await page.getByLabel("saturation", { exact: true }).fill("0.25");
  await page
    .getByLabel("Shader target surfaces", { exact: true })
    .selectOption({ index: 1 });
  const target = await page
    .getByLabel("Shader target surfaces", { exact: true })
    .inputValue();
  await page.getByLabel("Shader transparency", { exact: true }).uncheck();
  await page.locator('[data-shader-input="params"]').setInputFiles({
    name: "invalid.params",
    mimeType: "text/plain",
    buffer: Buffer.from("this is not a valid parameter declaration"),
  });
  const alert = page.locator(".shader-log");
  await expect(alert).toBeVisible();
  const error = await alert.textContent();
  const errorNode = await alert.elementHandle();
  const vertexInput = page.locator('[data-shader-input="vertex"]');
  const paramsInput = page.locator('[data-shader-input="params"]');
  const vertexNode = await vertexInput.elementHandle();
  const paramsNode = await paramsInput.elementHandle();
  const filesBefore = {
    vertex: await vertexInput.evaluate((node) =>
      Array.from((node as HTMLInputElement).files ?? [], (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    ),
    params: await paramsInput.evaluate((node) =>
      Array.from((node as HTMLInputElement).files ?? [], (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    ),
  };
  await page
    .getByRole("button", { name: "Reorder Surface shader", exact: true })
    .press("Home");
  await expect(
    page.locator(".right-panel [data-panel-id]").first(),
  ).toHaveAttribute("data-panel-id", "surface-shader");
  expect(
    await errorNode!.evaluate(
      (node) =>
        node.isConnected && document.querySelector(".shader-log") === node,
    ),
  ).toBe(true);
  expect(
    await vertexNode!.evaluate(
      (node) =>
        node.isConnected &&
        document.querySelector('[data-shader-input="vertex"]') === node,
    ),
  ).toBe(true);
  expect(
    await paramsNode!.evaluate(
      (node) =>
        node.isConnected &&
        document.querySelector('[data-shader-input="params"]') === node,
    ),
  ).toBe(true);
  expect(
    await vertexInput.evaluate((node) =>
      Array.from((node as HTMLInputElement).files ?? [], (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    ),
  ).toEqual(filesBefore.vertex);
  expect(
    await paramsInput.evaluate((node) =>
      Array.from((node as HTMLInputElement).files ?? [], (file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
      })),
    ),
  ).toEqual(filesBefore.params);
  await expect(alert).toHaveText(error!);
  await disclosure(page, "Appearance").click();
  await disclosure(page, "Surface shader").click();
  await expect(alert).toBeHidden();
  await expect(page.getByLabel("saturation", { exact: true })).toBeHidden();
  await disclosure(page, "Surface shader").click();
  await expect(alert).toHaveText(error!);
  await expect(page.getByLabel("saturation", { exact: true })).toHaveValue(
    "0.25",
  );
  await expect(
    page.getByLabel("Shader target surfaces", { exact: true }),
  ).toHaveValue(target);
  await expect(
    page.getByLabel("Shader transparency", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("button", { name: "surface-lambert.vert", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await page.getByRole("button", { name: "Clear shader", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Vertex shader…", exact: true }),
  ).toBeVisible();
  await expect(disclosure(page, "Appearance")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.locator(".dirty")).toHaveCount(0);
  await expect(
    page.locator(".right-panel [data-panel-id]").first(),
  ).toHaveAttribute("data-panel-id", "surface-shader");
});

test("profile preferences survive opening another document, clearing selection and reloading", async ({
  page,
}) => {
  await ready(page);
  for (const title of ["Document", "Provenance", "Saved surfaces"] as const)
    await disclosure(page, title).click();
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/legacy/data/molden.input"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened molden.input",
  );
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  await dialog
    .getByRole("button", { name: "Clear orbital selection", exact: true })
    .click();
  await expect(
    dialog.getByRole("button", { name: "Generate selected", exact: true }),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Close orbitals", exact: true })
    .click();
  for (const title of ["Document", "Provenance", "Saved surfaces"] as const)
    await expect(disclosure(page, title)).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  for (const title of titles)
    await expect(disclosure(page, title)).toHaveAttribute(
      "aria-expanded",
      ["Document", "Provenance", "Saved surfaces"].includes(title)
        ? "false"
        : "true",
    );
  await expect(page.locator(".dirty")).toHaveCount(0);
});

test("corrupt, oversized and partially invalid profile values cannot break the controls", async ({
  page,
}) => {
  await ready(page);
  for (const stored of [
    "{",
    "[]",
    "x".repeat(1025),
    JSON.stringify({ document: false, appearance: "false", unknown: false }),
  ]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: stored,
    });
    await page.reload();
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
      { timeout: 45000 },
    );
    await expect(disclosure(page, "Field rendering")).toBeEnabled();
    for (const title of titles)
      await expect(disclosure(page, title)).toHaveAttribute(
        "aria-expanded",
        title === "Document" && stored.startsWith('{"document"')
          ? "false"
          : "true",
      );
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await disclosure(page, "Appearance").click();
  await expect(page.getByLabel("Opacity", { exact: true })).toBeHidden();
  await disclosure(page, "Appearance").click();
  await expect(page.getByLabel("Opacity", { exact: true })).toBeVisible();
});

for (const failure of ["denied", "full"] as const) {
  test(`${failure} profile storage leaves working in-memory disclosures`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      if (mode === "denied") {
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Profile storage denied", "SecurityError");
          },
        });
      } else {
        Storage.prototype.setItem = () => {
          throw new DOMException("Profile storage full", "QuotaExceededError");
        };
      }
    }, failure);
    await ready(page);
    await disclosure(page, "Surface shader").click();
    await expect(
      page.getByRole("button", { name: "Vertex shader…", exact: true }),
    ).toBeHidden();
    await disclosure(page, "Surface shader").click();
    await expect(
      page.getByRole("button", { name: "Vertex shader…", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".dirty")).toHaveCount(0);
  });
}

test("background orbital work keeps reordered calculation controls open until current-job cancellation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state = window as unknown as {
      panelJob?: {
        id: number;
        progress?: number;
        finished?: boolean;
        cancelled?: number;
        cancelledId?: number;
      };
    };
    const post = Worker.prototype.postMessage;
    const terminate = Worker.prototype.terminate;
    let active: { worker: Worker; id: number } | undefined;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      if (message.action === "generate") {
        active = { worker: this, id: message.id };
        state.panelJob = { id: message.id };
        this.addEventListener("message", ({ data }) => {
          if (data.id !== message.id || state.panelJob?.id !== message.id)
            return;
          if (data.progress === "sampling")
            state.panelJob!.progress = data.completed;
          if ("result" in data || "error" in data) {
            state.panelJob!.finished = true;
            active = undefined;
          }
        });
      }
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
    Worker.prototype.terminate = function () {
      if (this === active?.worker && state.panelJob?.id === active.id) {
        state.panelJob.cancelled = state.panelJob.progress;
        state.panelJob.cancelledId = active.id;
      }
      terminate.call(this);
    };
  });
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/legacy/data/molden.input"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened molden.input",
  );
  const dirtyBefore = await page.locator(".dirty").count();
  await disclosure(page, "Field rendering").click();
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  await dialog
    .getByRole("button", { name: "Clear orbital selection", exact: true })
    .click();
  await dialog
    .getByRole("checkbox", { name: "Select orbital 25", exact: true })
    .check();
  await dialog
    .getByLabel("Orbital grid resolution", { exact: true })
    .selectOption("256");
  await dialog
    .getByRole("button", { name: "Generate selected", exact: true })
    .click();
  await page.waitForFunction(() => {
    const job = (
      window as unknown as {
        panelJob?: { progress?: number; finished?: boolean };
      }
    ).panelJob;
    return (
      job?.progress !== undefined &&
      job.progress > 0 &&
      job.progress < 256 &&
      !job.finished
    );
  });
  await expect(disclosure(page, "Field rendering")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(disclosure(page, "Field rendering")).toBeDisabled();
  await expect(
    page.getByLabel("Calculation progress", { exact: true }),
  ).toBeVisible();
  const activeId = await page.evaluate(
    () => (window as unknown as { panelJob: { id: number } }).panelJob.id,
  );
  await page
    .getByRole("button", { name: "Reorder Field rendering", exact: true })
    .press("End");
  await expect(
    page.locator(".right-panel [data-panel-id]").last(),
  ).toHaveAttribute("data-panel-id", "field-rendering");
  await expect(disclosure(page, "Field rendering")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await expect(disclosure(page, "Field rendering")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  const checkpoint = await page.evaluate(
    () =>
      (
        window as unknown as {
          panelJob: {
            id: number;
            cancelled?: number;
            cancelledId?: number;
            finished?: boolean;
          };
        }
      ).panelJob,
  );
  expect(checkpoint.id).toBe(activeId);
  expect(checkpoint.cancelledId).toBe(activeId);
  expect(checkpoint.finished).not.toBe(true);
  expect(checkpoint.cancelled).toBeGreaterThan(0);
  expect(checkpoint.cancelled).toBeLessThan(256);
  await expect(disclosure(page, "Field rendering")).toBeEnabled();
  await expect(disclosure(page, "Field rendering")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(
    page.getByLabel("Calculation progress", { exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".surface-row")).toHaveCount(0);
  await expect(page.locator(".dirty")).toHaveCount(dirtyBefore);
});

test("mobile headings, counts and hidden focus targets fit the available width", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  for (const title of titles) {
    const button = disclosure(page, title);
    await button.focus();
    await button.press("Enter");
    await expect(button).toHaveAttribute("aria-expanded", "false");
    await expect(button).toBeVisible();
  }
  await expect(page.locator(".surfaces .panel-count")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await settleDisclosures(page);
  await page.screenshot({
    path: info.outputPath("collapsed-panels-mobile.png"),
    fullPage: true,
  });
  await disclosure(page, "Document").focus();
  await disclosure(page, "Document").press("Tab");
  await expect(page.getByTitle("Open example", { exact: true })).toBeFocused();
  await disclosure(page, "Document").focus();
  await disclosure(page, "Document").press("Space");
  await expect(
    page.getByLabel("Representation", { exact: true }),
  ).toBeVisible();
});
