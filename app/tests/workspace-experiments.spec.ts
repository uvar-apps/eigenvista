import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

type AppState = {
  revision: number;
  dirty: boolean;
  busy: string;
  document: { atomCount: number; surfaceCount: number };
  camera: unknown;
};
type Job = { jobId: string; status: string; error?: unknown };
type Probe = {
  actions: string[];
  progress: Array<{ id: number; completed: number; total: number }>;
  terminated: number;
  results: number[];
};
type AppWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  workspaceProbe: Probe;
};
const sides = ["left", "right"] as const;
const lab = (page: Page) => page.locator(".workspace-lab");
const tools = (page: Page) =>
  page.getByRole("region", {
    name: "Workspace tools",
    exact: true,
    includeHidden: true,
  });
const canvas = (page: Page) =>
  page.getByLabel("Molecular scene", { exact: true });
const state = (page: Page) => call<AppState>(page, "app.state");
const group = (page: Page, name: string) =>
  page.getByRole("tab", { name, exact: true });

async function call<T = unknown>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    ({ method, params }) =>
      (window as unknown as AppWindow).eigenvistaControl!.request(
        method,
        params,
      ),
    { method, params },
  ) as Promise<T>;
}
async function complete(page: Page, receipt: { jobId?: string }) {
  if (!receipt.jobId) return;
  let job: Job | undefined;
  await expect
    .poll(
      async () =>
        (job = await call<Job>(page, "job.get", { jobId: receipt.jobId }))
          .status,
      { timeout: 45000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  expect(job!.status, JSON.stringify(job)).toBe("completed");
}
async function ready(page: Page, hold = false) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const probe: Probe = {
      actions: [],
      progress: [],
      terminated: 0,
      results: [],
    };
    (window as unknown as AppWindow).workspaceProbe = probe;
    const post = Worker.prototype.postMessage,
      terminate = Worker.prototype.terminate;
    Worker.prototype.postMessage = function (...args) {
      const message = args[0];
      if (message?.action) probe.actions.push(message.action);
      this.addEventListener("message", ({ data }) => {
        if (data.id !== message.id) return;
        if (data.progress && data.completed > 0 && data.completed < data.total)
          probe.progress.push({
            id: data.id,
            completed: data.completed,
            total: data.total,
          });
        if ("result" in data) probe.results.push(data.id);
      });
      return Reflect.apply(post, this, args);
    };
    Worker.prototype.terminate = function () {
      probe.terminated++;
      return Reflect.apply(terminate, this, []);
    };
  });
  if (hold)
    await page.route(
      (url) => url.pathname.endsWith("/science.worker.ts"),
      async (route) => {
        const response = await route.fetch();
        const source = await response.text();
        // The real WASM callback emits its genuine partial progress, then remains
        // inside that owned worker until Cancel terminates it. No fake result/job.
        const checkpoint = `
      let workspaceHold = false;
      self.addEventListener('message', event => { const m = event.data; workspaceHold = ['sample','generate'].includes(m.action) && m.args?.resolution === 256; });
      const workspacePost = self.postMessage.bind(self);
      self.postMessage = (...args) => { workspacePost(...args); const d = args[0]; if (workspaceHold && d.progress && d.completed > 0 && d.completed < d.total) { while (true) {} } };
    `;
        await route.fulfill({ response, body: checkpoint + source });
      },
    );
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as unknown as AppWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect.poll(async () => (await state(page)).busy).toBe("");
  await expect(lab(page)).toBeVisible();
}
async function openFile(page: Page, file: string) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve(file));
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${path.basename(file)}`,
  );
  await expect.poll(async () => (await state(page)).busy).toBe("");
}
async function choose(page: Page, task: string) {
  await group(page, task).click();
}
async function expandPanel(page: Page, title: string) {
  const button = page
    .locator(".panel-disclosure")
    .and(page.getByRole("button", { name: title, exact: true }));
  if ((await button.getAttribute("aria-expanded")) !== "true")
    await button.click();
}
async function side(page: Page, value: string) {
  await page
    .getByLabel("Workspace pane side", { exact: true })
    .selectOption(value);
  await expect(lab(page)).toHaveAttribute("data-side", value);
}
const activeStack = (page: Page) => tools(page).getByRole("tabpanel");
const activeScroller = (page: Page) =>
  activeStack(page).locator(".workspace-widgets");
const panelOrder = (page: Page) =>
  activeStack(page)
    .locator("[data-panel-id]")
    .evaluateAll((nodes) =>
      nodes.map((node) => (node as HTMLElement).dataset.panelId),
    );
async function box(page: Page) {
  return (await canvas(page).boundingBox())!;
}
async function evidence(
  page: Page,
  info: TestInfo,
  name: string,
  extra: unknown = {},
) {
  const png = info.outputPath(`${name}.png`),
    json = info.outputPath(`${name}.json`);
  await page.screenshot({ path: png });
  fs.writeFileSync(
    json,
    JSON.stringify(
      {
        viewport: page.viewportSize(),
        side: await lab(page).getAttribute("data-side"),
        zen: await lab(page).getAttribute("data-zen"),
        canvas: await box(page),
        tools: await tools(page).boundingBox(),
        extra,
      },
      null,
      2,
    ) + "\n",
  );
  await info.attach(name, { path: png, contentType: "image/png" });
  await info.attach(`${name} geometry`, {
    path: json,
    contentType: "application/json",
  });
}

async function renderedField(page: Page, info: TestInfo, name: string) {
  await settleScene(page);
  const screenshot = await canvas(page).screenshot({
    // Hide only overlapping chrome for this canvas oracle. Visibility preserves
    // layout and does not trigger scientific work or an explicit renderer draw.
    style:
      ".workspace-tools-host, .viewport-tools, .scene-label { visibility:hidden !important; }",
  });
  const pixels = await page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const output = document.createElement("canvas");
    output.width = image.width;
    output.height = image.height;
    const context = output.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, output.width, output.height).data;
    let colorful = 0;
    // Exclude the numeric key, toolbar and edges. A surviving colorbar alone
    // cannot satisfy this actual molecular/field rendering assertion.
    for (let y = Math.ceil(image.height * 0.2); y < image.height * 0.8; y++)
      for (let x = Math.ceil(image.width * 0.2); x < image.width * 0.8; x++) {
        const i = (y * image.width + x) * 4;
        if (
          Math.max(rgba[i], rgba[i + 1], rgba[i + 2]) -
            Math.min(rgba[i], rgba[i + 1], rgba[i + 2]) >
          35
        )
          colorful++;
      }
    const scene = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Molecular scene"]',
    )!;
    const key = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Quantitative field keys"]',
    );
    return {
      colorful,
      width: image.width,
      height: image.height,
      scene: { width: scene.width, height: scene.height },
      key: key ? { width: key.width, height: key.height } : null,
    };
  }, screenshot.toString("base64"));
  const file = info.outputPath(`${name}-canvas.png`),
    json = info.outputPath(`${name}-canvas.json`);
  fs.writeFileSync(file, screenshot);
  fs.writeFileSync(json, JSON.stringify(pixels, null, 2) + "\n");
  await info.attach(`${name} actual scene`, {
    path: file,
    contentType: "image/png",
  });
  expect(pixels.colorful, JSON.stringify(pixels)).toBeGreaterThan(300);
  expect(pixels.key).toEqual(pixels.scene);
}

test("one left or right pane preserves the viewport, drafts, shader files and original application chrome", async ({
  page,
}, info) => {
  await ready(page);
  await page.setViewportSize({ width: 1600, height: 1000 });
  const viewport = await canvas(page).elementHandle(),
    host = await tools(page).elementHandle();
  const header = await page.locator(".topbar").elementHandle(),
    footer = await page.locator("footer").elementHandle();
  await expect(tools(page).getByRole("tab")).toHaveText([
    "Molecule",
    "Fields",
    "Surfaces",
    "Appearance",
  ]);
  await expect(page.locator(".workspace-commandbar")).toHaveCount(0);
  await expect(
    page.getByLabel("Workspace layout", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".file-actions")
      .getByRole("button", { name: "Hide tools", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".viewport-tools")).toHaveCount(1);
  await choose(page, "Surfaces");
  await page
    .getByLabel("Molecular surface name", { exact: true })
    .fill("Unsubmitted shape draft");
  await page
    .getByLabel("Molecular surface grid spacing", { exact: true })
    .fill("0.37");
  const draft = page.getByLabel("Molecular surface name", { exact: true });
  await draft.press("Shift+Z");
  await expect(lab(page)).toHaveAttribute("data-zen", "false");
  await draft.press("Backspace");
  await choose(page, "Appearance");
  await expandPanel(page, "Surface shader");
  const vertex = page.locator('[data-shader-input="vertex"]');
  await vertex.setInputFiles(path.resolve("shaders/surface-lambert.vert"));
  await expect(
    page.getByRole("button", { name: "surface-lambert.vert", exact: true }),
  ).toBeVisible();
  const fileInput = await vertex.elementHandle();
  // The chooser deliberately clears after loading to permit same-file reselection.
  const files = await fileInput!.evaluate((node) =>
    Array.from((node as HTMLInputElement).files ?? [], (file) => file.name),
  );
  const before = await state(page);
  const actions = await page.evaluate(
    () => (window as unknown as AppWindow).workspaceProbe.actions,
  );
  for (const position of sides) {
    await side(page, position);
    for (const node of [viewport, host, header, footer, fileInput])
      expect(await node!.evaluate((element) => element.isConnected)).toBe(true);
    expect(
      await fileInput!.evaluate((node) =>
        Array.from((node as HTMLInputElement).files ?? [], (file) => file.name),
      ),
    ).toEqual(files);
    await choose(page, "Appearance");
    await page
      .getByRole("button", { name: "Reorder Surface shader", exact: true })
      .press("Home");
    await expect
      .poll(() => panelOrder(page))
      .toEqual(["surface-shader", "appearance", "atom-colours"]);
    expect(await fileInput!.evaluate((node) => node.isConnected)).toBe(true);
    await expect(
      page.getByRole("button", { name: "surface-lambert.vert", exact: true }),
    ).toBeVisible();
    await choose(page, "Surfaces");
    await expect(draft).toHaveValue("Unsubmitted shape draft");
    await expect(
      page.getByLabel("Molecular surface grid spacing", { exact: true }),
    ).toHaveValue("0.37");
    const shown = await box(page),
      panel = (await tools(page).boundingBox())!;
    expect(Math.abs(panel.width - 480)).toBeLessThan(2);
    if (position === "left")
      expect(panel.x + panel.width).toBeLessThanOrEqual(shown.x + 2);
    else expect(shown.x + shown.width).toBeLessThanOrEqual(panel.x + 2);
    const tabs = (await tools(page).getByRole("tab").first().boundingBox())!;
    expect(tabs.y).toBeGreaterThanOrEqual(panel.y);
    expect(tabs.y + tabs.height).toBeLessThanOrEqual(panel.y + panel.height);
    await evidence(page, info, `pane-${position}`);
    await page.getByRole("button", { name: "Hide tools", exact: true }).click();
    await expect(tools(page)).toBeHidden();
    await expect
      .poll(async () => (await box(page)).width - shown.width)
      .toBeGreaterThan(250);
    await page.getByRole("button", { name: "Show tools", exact: true }).click();
    await expect(tools(page)).toBeVisible();
    await expect(draft).toHaveValue("Unsubmitted shape draft");
  }
  expect(await state(page)).toMatchObject({
    revision: before.revision,
    dirty: before.dirty,
    camera: before.camera,
    document: before.document,
  });
  expect(
    await page.evaluate(
      () => (window as unknown as AppWindow).workspaceProbe.actions,
    ),
  ).toEqual(actions);
});

test("four pane tabs and the vertical divider support keyboard, pointer and responsive placement", async ({
  page,
}, info) => {
  await ready(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await group(page, "Molecule").focus();
  await page.keyboard.press("ArrowRight");
  await expect(group(page, "Fields")).toBeFocused();
  await expect(group(page, "Fields")).toHaveAttribute("aria-selected", "true");
  await page.keyboard.press("End");
  await expect(group(page, "Appearance")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(group(page, "Molecule")).toBeFocused();
  await page.keyboard.press("Control+ArrowRight");
  await expect(group(page, "Molecule")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  for (const position of sides) {
    await side(page, position);
    const separator = page.getByRole("separator", {
      name: "Resize tool dock",
      exact: true,
    });
    const previous = Number(await separator.getAttribute("aria-valuenow"));
    await separator.focus();
    await separator.press(position === "left" ? "ArrowRight" : "ArrowLeft");
    const next = Number(await separator.getAttribute("aria-valuenow"));
    expect(next).toBeGreaterThan(previous);
    expect(next).toBeLessThanOrEqual(
      Number(await separator.getAttribute("aria-valuemax")),
    );
    const prior = (await tools(page).boundingBox())!;
    const grip = (await separator.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + grip.width / 2 + (position === "left" ? 28 : -28),
      grip.y + grip.height / 2,
      { steps: 5 },
    );
    await page.mouse.up();
    await expect
      .poll(async () => (await tools(page).boundingBox())!.width)
      .toBeGreaterThan(prior.width + 15);
  }
  for (const width of [1600, 1280, 820, 390]) {
    await page.setViewportSize({ width, height: width === 1600 ? 1000 : 800 });
    for (const position of sides) {
      await side(page, position);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      const panel = (await tools(page).boundingBox())!;
      expect(panel.width).toBeGreaterThan(250);
      expect(panel.x).toBeGreaterThanOrEqual(0);
      expect(panel.x + panel.width).toBeLessThanOrEqual(width + 1);
      await expect(
        page.getByRole("button", { name: "Close tools", exact: true }),
      ).toBeInViewport();
      await evidence(page, info, `pane-${position}-${width}`);
    }
  }
});

test("original widgets retain collapse, keyboard/menu order and trusted pointer dragging inside each tab", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    (
      window as unknown as {
        workspaceDrags: Array<{ type: string; trusted: boolean }>;
      }
    ).workspaceDrags = [];
    for (const type of ["dragstart", "drop"])
      document.addEventListener(
        type,
        (event) => {
          (
            window as unknown as {
              workspaceDrags: Array<{ type: string; trusted: boolean }>;
            }
          ).workspaceDrags.push({ type, trusted: event.isTrusted });
        },
        true,
      );
  });
  await ready(page);
  await choose(page, "Molecule");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["document", "geometry", "provenance"]);
  for (const title of [
    "Molecular data",
    "Selections and measurements",
    "Provenance",
  ]) {
    const disclosure = page
      .locator(".panel-disclosure")
      .and(page.getByRole("button", { name: title, exact: true }));
    if ((await disclosure.getAttribute("aria-expanded")) === "true")
      await disclosure.click();
    await expect(disclosure).toHaveAttribute("aria-expanded", "false");
  }
  await expect(page.getByLabel("Representation", { exact: true })).toBeHidden();
  const documentHandle = page.getByRole("button", {
    name: "Reorder Molecular data",
    exact: true,
  });
  const body = await page
    .locator('[data-panel-id="document"] .panel-body')
    .elementHandle();
  await documentHandle.focus();
  await documentHandle.press("End");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["geometry", "provenance", "document"]);
  await expect(documentHandle).toBeFocused();
  await documentHandle.click();
  await page
    .getByRole("button", { name: "Move Molecular data up", exact: true })
    .click();
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["geometry", "document", "provenance"]);
  await page
    .getByRole("button", { name: "Move Molecular data up", exact: true })
    .press("Escape");
  await expect(documentHandle).toHaveAttribute("aria-expanded", "false");
  await page
    .getByRole("button", { name: "Reorder Provenance", exact: true })
    .dragTo(
      page.getByRole("button", {
        name: "Reorder Selections and measurements",
        exact: true,
      }),
      { targetPosition: { x: 4, y: 4 } },
    );
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["provenance", "geometry", "document"]);
  const drags = await page.evaluate(
    () =>
      (
        window as unknown as {
          workspaceDrags: Array<{ type: string; trusted: boolean }>;
        }
      ).workspaceDrags,
  );
  expect(
    drags.some((event) => event.type === "dragstart" && event.trusted),
  ).toBe(true);
  expect(drags.some((event) => event.type === "drop" && event.trusted)).toBe(
    true,
  );
  expect(await body!.evaluate((node) => node.isConnected)).toBe(true);
  await expandPanel(page, "Molecular data");
  await expect(
    page.getByLabel("Representation", { exact: true }),
  ).toBeVisible();
  await choose(page, "Fields");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["quantum-fields", "field-rendering", "analysis"]);
  await choose(page, "Appearance");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["appearance", "atom-colours", "surface-shader"]);
  await choose(page, "Molecule");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["provenance", "geometry", "document"]);
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["provenance", "geometry", "document"]);
  await evidence(page, info, "original-widget-order");
});

test("real crambin SES generation and live saved appearance work in the Surfaces tab", async ({
  page,
}, info) => {
  await ready(page);
  await openFile(page, "../fixtures/bcif/1crn.bcif");
  await choose(page, "Surfaces");
  await expandPanel(page, "Molecular surfaces");
  await page
    .getByLabel("Molecular surface name", { exact: true })
    .fill("Workspace crambin");
  await page
    .getByLabel("Molecular surface grid spacing", { exact: true })
    .fill("0.35");
  await page
    .getByRole("button", { name: "Generate molecular surface", exact: true })
    .click();
  const meshes = () =>
    call<{
      total: number;
      items: Array<{ opacity: number; color: string; atomCount: number }>;
    }>(page, "molecularSurfaces.list");
  await expect.poll(async () => (await meshes()).total).toBe(1);
  await expect.poll(async () => (await state(page)).busy).toBe("");
  expect((await meshes()).items[0].atomCount).toBe(327);
  await page.getByText(/^Workspace crambin · SES ·/).click();
  await call(page, "camera.fit");
  const image = () =>
    call<{ dataUrl: string }>(page, "image.export", { transparent: true });
  const before = await image();
  await page
    .getByLabel("Color for Workspace crambin", { exact: true })
    .fill("#4f99cc");
  await page
    .getByLabel("Opacity for Workspace crambin", { exact: true })
    .fill("0.45");
  await expect
    .poll(async () => (await meshes()).items[0])
    .toMatchObject({ color: "#4f99cc", opacity: 0.45 });
  await expect.poll(async () => (await state(page)).busy).toBe("");
  const after = await image();
  const first = await pngPixels(
      page,
      Buffer.from(before.dataUrl.split(",")[1], "base64"),
    ),
    second = await pngPixels(
      page,
      Buffer.from(after.dataUrl.split(",")[1], "base64"),
    );
  expect(second.foreground).toBeGreaterThan(1000);
  expect(second.rgbChecksum).not.toBe(first.rgbChecksum);
  fs.writeFileSync(
    info.outputPath("crambin-live.png"),
    Buffer.from(after.dataUrl.split(",")[1], "base64"),
  );
  await evidence(page, info, "crambin-wide-tool", (await meshes()).items[0]);
});

test("C7H10 orbitals, true field planes and unobstructed Zen keys work with either pane side", async ({
  page,
}, info) => {
  await ready(page);
  await openFile(page, "../tools/site/examples/bicyclic-c7h10.molden");
  await choose(page, "Fields");
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  await dialog
    .getByRole("checkbox", { name: "Select orbital 26", exact: true })
    .check();
  await dialog
    .getByLabel("Orbital grid resolution", { exact: true })
    .selectOption("24");
  await dialog.getByLabel("Orbital isovalue", { exact: true }).fill("0.03");
  await dialog
    .getByRole("button", { name: "Generate selected", exact: true })
    .click();
  await expect
    .poll(async () => (await state(page)).document.surfaceCount)
    .toBeGreaterThan(0);
  await expect.poll(async () => (await state(page)).busy).toBe("");
  await choose(page, "Fields");
  await expandPanel(page, "Quantitative field inspection");
  await page
    .getByLabel("Analysis field", { exact: true })
    .selectOption("molden-mo-26");
  await page.getByLabel("Analysis type", { exact: true }).selectOption("plane");
  await page
    .getByLabel("Analysis label", { exact: true })
    .fill("Workspace HOMO section");
  await page.getByLabel("Plane columns", { exact: true }).fill("32");
  await page.getByLabel("Plane rows", { exact: true }).fill("32");
  await page.getByRole("button", { name: "Create plane", exact: true }).click();
  await expect
    .poll(
      async () => (await call<{ total: number }>(page, "analysis.list")).total,
    )
    .toBe(1);
  await expect.poll(async () => (await state(page)).busy).toBe("");
  await call(page, "scene.set", { mode: "mesh" });
  for (const position of sides) {
    await side(page, position);
    await renderedField(page, info, `quantitative-${position}`);
    await evidence(
      page,
      info,
      `quantitative-${position}`,
      await call(page, "analysis.list"),
    );
  }
  await page.getByRole("button", { name: "Zen mode", exact: true }).click();
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await settleScene(page);
    const legend = await page
      .getByLabel("Quantitative field keys", { exact: true })
      .evaluate((node) => {
        const key = node as HTMLCanvasElement;
        const bounds = key.getBoundingClientRect();
        const rgba = key
          .getContext("2d")!
          .getImageData(0, 0, key.width, key.height).data;
        let minX = key.width,
          minY = key.height,
          maxX = -1,
          maxY = -1;
        for (let y = 0; y < key.height; y++)
          for (let x = 0; x < key.width; x++) {
            if (rgba[(y * key.width + x) * 4 + 3] > 0) {
              minX = Math.min(minX, x);
              minY = Math.min(minY, y);
              maxX = Math.max(maxX, x);
              maxY = Math.max(maxY, y);
            }
          }
        return {
          x: bounds.x + (minX * bounds.width) / key.width,
          y: bounds.y + (minY * bounds.height) / key.height,
          width: ((maxX - minX + 1) * bounds.width) / key.width,
          height: ((maxY - minY + 1) * bounds.height) / key.height,
        };
      });
    expect(legend.width).toBeGreaterThan(100);
    expect(legend.height).toBeGreaterThan(20);
    const controls = (await page
      .getByLabel("Zen controls", { exact: true })
      .boundingBox())!;
    const overlapWidth = Math.max(
      0,
      Math.min(legend.x + legend.width, controls.x + controls.width) -
        Math.max(legend.x, controls.x),
    );
    const overlapHeight = Math.max(
      0,
      Math.min(legend.y + legend.height, controls.y + controls.height) -
        Math.max(legend.y, controls.y),
    );
    await evidence(page, info, `quantitative-zen-${width}`, {
      legend,
      controls,
      overlapArea: overlapWidth * overlapHeight,
    });
    expect(overlapWidth * overlapHeight).toBe(0);
  }
});

test("Zen and real fullscreen are independent and keep an explicit exit and workspace restoration", async ({
  page,
}, info) => {
  await ready(page);
  await page.getByRole("button", { name: "Zen mode", exact: true }).click();
  await expect(lab(page)).toHaveAttribute("data-zen", "true");
  await expect(
    page.getByRole("button", { name: "Exit Zen mode", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(
    false,
  );
  await page
    .getByRole("button", { name: "Exit Zen mode", exact: true })
    .click();
  const supported = await page.evaluate(
    () =>
      typeof document.documentElement.requestFullscreen === "function" &&
      document.fullscreenEnabled !== false,
  );
  const enter = page.getByRole("button", {
    name: "Enter fullscreen",
    exact: true,
  });
  if (supported) {
    await enter.click();
    await expect
      .poll(async () =>
        page.evaluate(() => Boolean(document.fullscreenElement)),
      )
      .toBe(true);
    await expect(lab(page)).toHaveAttribute("data-zen", "false");
    await page.getByRole("button", { name: "Zen mode", exact: true }).click();
    await page
      .getByRole("button", { name: "Exit Zen mode", exact: true })
      .click();
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(
      true,
    );
    await page
      .getByRole("button", { name: "Exit fullscreen", exact: true })
      .click();
    await expect
      .poll(async () =>
        page.evaluate(() => Boolean(document.fullscreenElement)),
      )
      .toBe(false);
  } else {
    if (await enter.isEnabled()) await enter.click();
    expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(
      false,
    );
    await expect(
      page.getByText(
        /fullscreen.*(?:unavailable|not supported|not available)/i,
      ),
    ).toBeVisible();
  }
  if (await tools(page).isHidden())
    await page.getByRole("button", { name: "Show tools", exact: true }).click();
  await expect(tools(page)).toBeVisible();
  await evidence(page, info, "fullscreen-capability", {
    supported,
    fullscreen: await page.evaluate(() => Boolean(document.fullscreenElement)),
  });
});

test("genuine held worker progress and Cancel remain reachable when tools are hidden and Zen is active", async ({
  page,
}, info) => {
  await ready(page, true);
  await openFile(page, "../fixtures/legacy/data/molden.input");
  await choose(page, "Fields");
  await page.getByLabel("Grid resolution", { exact: true }).selectOption("256");
  await page
    .getByRole("button", { name: "Generate surfaces", exact: true })
    .click();
  await page.waitForFunction(() =>
    (window as unknown as AppWindow).workspaceProbe.progress.some(
      (row) => row.total === 256 && row.completed > 0 && row.completed < 256,
    ),
  );
  const held = await page.evaluate(
    () => (window as unknown as AppWindow).workspaceProbe.progress.at(-1)!,
  );
  expect(
    await page.evaluate(
      (id) =>
        (window as unknown as AppWindow).workspaceProbe.results.includes(id),
      held.id,
    ),
  ).toBe(false);
  await page
    .getByRole("button", { name: "Reorder Field rendering", exact: true })
    .press("Home");
  await expect
    .poll(() => panelOrder(page))
    .toEqual(["field-rendering", "quantum-fields", "analysis"]);
  await page.getByRole("button", { name: "Hide tools", exact: true }).click();
  const report = page.getByRole("status", {
    name: "Workspace activity",
    exact: true,
  });
  await expect(report).toBeVisible();
  await expect(report).toContainText(/sampling/i);
  await expect(
    page.getByRole("button", { name: "Cancel calculation", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Zen mode", exact: true }).click();
  await expect(report).toBeVisible();
  await evidence(page, info, "hidden-zen-held-progress", held);
  await page
    .getByRole("button", { name: "Cancel calculation", exact: true })
    .click();
  await expect.poll(async () => (await state(page)).busy).toBe("");
  expect(
    await page.evaluate(
      () => (window as unknown as AppWindow).workspaceProbe.terminated,
    ),
  ).toBeGreaterThan(0);
  expect((await state(page)).document.surfaceCount).toBe(0);
  await page
    .getByRole("button", { name: "Exit Zen mode", exact: true })
    .click();
  await page.getByRole("button", { name: "Show tools", exact: true }).click();
  await complete(
    page,
    await call(page, "field.preview", {
      fieldId: "molden-mo-1",
      mode: "raycast",
      resolution: 24,
    }),
  );
  await expect.poll(async () => (await state(page)).busy).toBe("");
});

test("the explicit legacy comparison retains the historical sidebar interface", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.locator(".workspace-lab")).toHaveCount(0);
  await expect(
    page.getByLabel("Workspace pane side", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Browse orbitals", exact: true }),
  ).toBeVisible();
});

test("each tab retains its own scroll while the four tab buttons remain reachable", async ({
  page,
}, info) => {
  await ready(page);
  await openFile(page, "../tools/site/examples/bicyclic-c7h10.molden");
  await page.setViewportSize({ width: 1280, height: 800 });
  await choose(page, "Fields");
  await expandPanel(page, "Quantitative field inspection");
  await page.getByLabel("Analysis type", { exact: true }).selectOption("plane");
  const fields = activeScroller(page);
  const fieldBeforeWheel = await fields.evaluate(
    (element) => element.scrollTop,
  );
  await fields.hover();
  await page.mouse.wheel(0, 500);
  await expect
    .poll(() => fields.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(fieldBeforeWheel + 20);
  const fieldTop = await fields.evaluate((element) => element.scrollTop);
  await expect(
    tools(page).getByRole("tab", { name: "Fields", exact: true }),
  ).toBeInViewport();
  await choose(page, "Appearance");
  const appearance = activeScroller(page);
  await expect
    .poll(() => appearance.evaluate((element) => element.scrollTop))
    .toBe(0);
  const appearanceBeforeWheel = await appearance.evaluate(
    (element) => element.scrollTop,
  );
  await appearance.hover();
  await page.mouse.wheel(0, 250);
  await expect
    .poll(() => appearance.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(appearanceBeforeWheel + 20);
  const appearanceTop = await appearance.evaluate(
    (element) => element.scrollTop,
  );
  await choose(page, "Fields");
  await expect
    .poll(() => activeScroller(page).evaluate((element) => element.scrollTop))
    .toBe(fieldTop);
  await choose(page, "Appearance");
  await expect
    .poll(() => activeScroller(page).evaluate((element) => element.scrollTop))
    .toBe(appearanceTop);
  await expect(
    tools(page).getByRole("tab", { name: "Appearance", exact: true }),
  ).toBeInViewport();
  await evidence(page, info, "independent-tab-scroll", {
    fieldTop,
    appearanceTop,
  });
});

test("hiding tools and Zen restore visible keyboard focus for both shortcuts and pointer controls", async ({
  page,
}, info) => {
  await ready(page);
  await choose(page, "Surfaces");
  await expandPanel(page, "Molecular surfaces");
  const button = page.getByRole("button", {
    name: "Generate molecular surface",
    exact: true,
  });
  await button.focus();
  await page.keyboard.press("Shift+T");
  await expect(
    page.getByRole("button", { name: "Show tools", exact: true }),
  ).toBeFocused();
  await expect(tools(page)).toBeHidden();
  await page.keyboard.press("Shift+T");
  await expect(
    page.getByRole("button", { name: "Hide tools", exact: true }),
  ).toBeFocused();
  await expect(tools(page)).toBeVisible();
  const zen = page.getByRole("button", { name: "Zen mode", exact: true });
  const exit = page.getByRole("button", { name: "Exit Zen mode", exact: true });
  await zen.click();
  await expect(exit).toBeFocused();
  await exit.click();
  await expect(
    page.getByRole("button", { name: "Hide tools", exact: true }),
  ).toBeFocused();
  await button.focus();
  await page.keyboard.press("Shift+Z");
  await expect(exit).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Hide tools", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Shift+Z");
  await expect(exit).toBeFocused();
  await page.keyboard.press("Shift+Z");
  await expect(
    page.getByRole("button", { name: "Hide tools", exact: true }),
  ).toBeFocused();
  await expect(lab(page)).toHaveAttribute("data-zen", "false");
  await evidence(
    page,
    info,
    "restored-keyboard-focus",
    await page.evaluate(() => ({
      role: document.activeElement?.getAttribute("role"),
      label: document.activeElement?.getAttribute("aria-label"),
    })),
  );
});

test("short laptop and native-minimum windows keep a drawable scene and reachable tool close controls", async ({
  page,
}, info) => {
  await ready(page);
  for (const [width, height] of [
    [1024, 600],
    [600, 520],
  ]) {
    await page.setViewportSize({ width, height });
    for (const position of sides) {
      await side(page, position);
      const close = page.getByRole("button", {
        name: "Close tools",
        exact: true,
      });
      await expect(close).toBeVisible();
      const button = (await close.boundingBox())!;
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(width);
      expect(button.y + button.height).toBeLessThanOrEqual(height);
      const shown = await box(page);
      expect(shown.width).toBeGreaterThan(260);
      expect(shown.height).toBeGreaterThan(120);
      const panel = (await tools(page).boundingBox())!;
      const overlapWidth = Math.max(
        0,
        Math.min(shown.x + shown.width, panel.x + panel.width) -
          Math.max(shown.x, panel.x),
      );
      const overlapHeight = Math.max(
        0,
        Math.min(shown.y + shown.height, panel.y + panel.height) -
          Math.max(shown.y, panel.y),
      );
      const unoccludedArea =
        shown.width * shown.height - overlapWidth * overlapHeight;
      await evidence(page, info, `${position}-${width}x${height}`, {
        unoccludedArea,
        unoccludedFraction: unoccludedArea / (shown.width * shown.height),
      });
      expect(unoccludedArea).toBeGreaterThan(shown.width * shown.height * 0.2);
      await close.click();
      await expect(tools(page)).toBeHidden();
      await expect
        .poll(async () => {
          const hidden = await box(page);
          return hidden.width * hidden.height;
        })
        .toBeGreaterThan(unoccludedArea * 1.1);
      await expect(
        page.getByRole("button", { name: "Show tools", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Show tools", exact: true })
        .click();
      await expect(tools(page)).toBeVisible();
    }
  }
});

test("Saving shows status without advertising cancellation of a noncancellable file operation", async ({
  page,
}, info) => {
  type SaveGate = { armed: boolean; held: boolean; release?: () => void };
  await page.addInitScript(() => {
    const state = window as unknown as Window & { workspaceSaveGate: SaveGate };
    const gate: SaveGate = { armed: false, held: false };
    state.workspaceSaveGate = gate;
    const ids = new WeakMap<Worker, number>();
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      if (args[0]?.action === "encode") ids.set(this, args[0].id);
      return Reflect.apply(post, this, args);
    };
    const descriptor = Object.getOwnPropertyDescriptor(
      Worker.prototype,
      "onmessage",
    )!;
    Object.defineProperty(Worker.prototype, "onmessage", {
      configurable: true,
      get() {
        return descriptor.get!.call(this);
      },
      set(handler: (event: MessageEvent) => void) {
        descriptor.set!.call(
          this,
          function (this: Worker, event: MessageEvent) {
            if (
              gate.armed &&
              event.data.id === ids.get(this) &&
              "result" in event.data
            ) {
              gate.held = true;
              gate.release = () => {
                gate.armed = false;
                handler.call(this, event);
              };
              return;
            }
            handler.call(this, event);
          },
        );
      },
    });
  });
  await ready(page);
  await page.evaluate(() => {
    (
      window as unknown as Window & { workspaceSaveGate: SaveGate }
    ).workspaceSaveGate.armed = true;
  });
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await page.waitForFunction(
    () =>
      (window as unknown as Window & { workspaceSaveGate: SaveGate })
        .workspaceSaveGate.held,
  );
  await expect(page.locator("footer [role=status]")).toContainText(/saving/i);
  await expect(
    page.getByRole("button", { name: "Cancel calculation", exact: true }),
  ).toHaveCount(0);
  await evidence(page, info, "saving-without-false-cancel");
  await page.evaluate(() => {
    (window as unknown as Window & { workspaceSaveGate: SaveGate })
      .workspaceSaveGate.release!();
  });
  const file = info.outputPath("actual-saved-document.eigenvista");
  await (await download).saveAs(file);
  expect(fs.statSync(file).size).toBeGreaterThan(100);
  await expect.poll(async () => (await state(page)).busy).toBe("");
});
