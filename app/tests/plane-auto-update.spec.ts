import { expect, test, type Locator, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { FieldAnalysisItem } from "../src/inspectionTypes";
import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";
import { activateWidget } from "./workspace";

type Summary = Omit<FieldAnalysisItem, "values" | "valid"> & {
  sampleCount: number;
};
type Gate = {
  holdAction: string;
  held: boolean;
  release?: () => void;
  reject?: () => void;
  actions: string[];
};
type AppWindow = Window & {
  planeGate: Gate;
  eigenvistaControl: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
};

/** Independent sampled scalar f(x,y,z)=x+2y+3z on [-2,2]^3 bohr. */
function linearCube() {
  const values: number[] = [];
  for (let x = -2; x <= 2; x++)
    for (let y = -2; y <= 2; y++)
      for (let z = -2; z <= 2; z++) values.push(x + 2 * y + 3 * z);
  return Buffer.from(
    [
      "Independent linear scalar for automatic plane updates",
      "Scalar meaning and units intentionally unspecified",
      "3 -2 -2 -2",
      "5 1 0 0",
      "5 0 1 0",
      "5 0 0 1",
      "8 0 0 0 0",
      "1 0 1.432 1.107 0",
      "1 0 -1.432 1.107 0",
      values.join(" "),
      "",
    ].join("\n"),
  );
}

async function api<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  return page.evaluate(
    async ({ method, params }) =>
      (await (window as unknown as AppWindow).eigenvistaControl.request(
        method,
        params,
      )) as T,
    { method, params },
  );
}
async function item(page: Page) {
  const result = await api<{ items: Summary[] }>(page, "analysis.list");
  expect(result.items).toHaveLength(1);
  return result.items[0];
}
async function idle(page: Page) {
  await expect
    .poll(async () => (await api<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
}
function center(plane: Summary) {
  expect(plane.definition.kind).toBe("plane");
  if (plane.definition.kind !== "plane") throw new Error("Expected a plane");
  const definition = plane.definition;
  return definition.origin.map(
    (value, i) => value + (definition.u[i] + definition.v[i]) / 2,
  );
}
async function expectCenter(page: Page, expected: number[]) {
  await expect
    .poll(async () =>
      center(await item(page)).map((value) => +value.toFixed(10)),
    )
    .toEqual(expected);
  await idle(page);
  const plane = await item(page);
  const samples = await api<{
    items: { position: number[]; value: number | null; status: string }[];
  }>(page, "analysis.samples", { id: plane.id, limit: 100 });
  for (const row of samples.items) {
    expect(row.status).toBe("valid");
    expect(row.value).toBeCloseTo(
      row.position[0] + 2 * row.position[1] + 3 * row.position[2],
      10,
    );
  }
}

/** Observe real worker requests; optionally delay one genuine computed reply. */
async function installProbe(page: Page) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as AppWindow;
    const gate: Gate = { holdAction: "", held: false, actions: [] };
    state.planeGate = gate;
    const actions = new WeakMap<Worker, Map<number, string>>();
    const originalPost = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (...args) {
      const message = args[0];
      gate.actions.push(message.action);
      if (!actions.has(this)) actions.set(this, new Map());
      actions.get(this)!.set(message.id, message.action);
      return Reflect.apply(originalPost, this, args);
    };
    const descriptor = Object.getOwnPropertyDescriptor(
      Worker.prototype,
      "onmessage",
    )!;
    Object.defineProperty(Worker.prototype, "onmessage", {
      ...descriptor,
      set(handler: (event: MessageEvent) => void) {
        descriptor.set!.call(
          this,
          function (this: Worker, event: MessageEvent) {
            const action = actions.get(this)?.get(event.data.id);
            if (action === gate.holdAction && "result" in event.data) {
              gate.holdAction = "";
              gate.held = true;
              gate.release = () => {
                gate.held = false;
                handler.call(this, event);
              };
              gate.reject = () => {
                gate.held = false;
                handler.call(
                  this,
                  new MessageEvent("message", {
                    data: {
                      id: event.data.id,
                      error: "Simulated contour reply failure",
                      registrationPreserved: true,
                    },
                  }),
                );
              };
              return;
            }
            handler.call(this, event);
          },
        );
      },
    });
  });
}
async function arm(page: Page, action: string) {
  await page.evaluate((action) => {
    const gate = (window as unknown as AppWindow).planeGate;
    gate.held = false;
    gate.holdAction = action;
    gate.release = undefined;
    gate.reject = undefined;
  }, action);
}
async function held(page: Page) {
  await page.waitForFunction(
    () => (window as unknown as AppWindow).planeGate.held,
  );
}
async function release(page: Page) {
  await page.evaluate(() => {
    const gate = (window as unknown as AppWindow).planeGate;
    if (!gate.release) throw new Error("No actual worker reply was held");
    gate.release();
  });
}
async function analyzeCount(page: Page) {
  return page.evaluate(
    () =>
      (window as unknown as AppWindow).planeGate.actions.filter(
        (action) => action === "analyze",
      ).length,
  );
}
async function ready(page: Page) {
  await installProbe(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(
    () => !!(window as unknown as AppWindow).eigenvistaControl,
  );
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "live-plane.cube",
    mimeType: "text/plain",
    buffer: linearCube(),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened live-plane.cube",
  );
  const body = await activateWidget(page, "analysis");
  const panel = body.getByLabel("Quantitative field inspection", {
    exact: true,
  });
  await panel
    .getByRole("button", { name: "View meshes and analyses", exact: true })
    .click();
  await panel
    .getByLabel("Analysis type", { exact: true })
    .selectOption("plane");
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await panel.getByLabel("Analysis label", { exact: true }).fill("Live plane");
  await panel.getByLabel("Plane width", { exact: true }).fill("2");
  await panel.getByLabel("Plane height", { exact: true }).fill("2");
  await panel.getByLabel("Plane columns", { exact: true }).fill("9");
  await panel.getByLabel("Plane rows", { exact: true }).fill("9");
  await panel
    .getByRole("button", { name: "Create plane", exact: true })
    .click();
  await expect(
    panel.getByLabel("Analysis result Live plane", { exact: true }),
  ).toBeVisible();
  await expect(
    panel.getByLabel("Auto-update plane", { exact: true }),
  ).toBeChecked();
  await expect(
    panel.getByRole("button", { name: "Recompute analysis", exact: true }),
  ).toBeEnabled();
  // Creation deliberately leaves the same plane ready for subsequent live edits.
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await idle(page);
  return panel;
}
async function commit(input: Locator, value: string) {
  await input.fill(value);
  await input.press("Enter");
}
async function setContours(page: Page) {
  const plane = await item(page);
  await api(page, "analysis.set", {
    id: plane.id,
    appearance: {
      colormap: "viridis",
      range: [-4, 4],
      contour_levels: [-1, 0, 1],
      show_key: false,
      show_labels: false,
    },
  });
  await api(page, "camera.set", {
    position: [0, 0, 8],
    target: [0, 0, 0],
    up: [0, 1, 0],
  });
  // Export waits for the production contour/render pipeline to be complete.
  await api(page, "image.export");
  await settleScene(page);
  return (await item(page)).appearance;
}

test.afterEach(async ({ page }) => {
  if (!page.isClosed())
    await page.evaluate(() => {
      const gate = (window as unknown as AppWindow).planeGate;
      if (gate?.held) gate.release?.();
    });
});

test("plane drafts require Enter; spin controls update real samples and preserve editor focus", async ({
  page,
}) => {
  const panel = await ready(page);
  const z = panel.getByLabel("Plane center Z (bohr)", { exact: true });
  const before = await item(page);
  const requests = await analyzeCount(page);
  await z.fill("0.25");
  // Deliberately observe beyond the UI debounce: valid typing is still only a draft.
  await page.waitForTimeout(500);
  expect(await analyzeCount(page)).toBe(requests);
  expect((await item(page)).sample_hash).toBe(before.sample_hash);
  await z.press("Enter");
  await expectCenter(page, [0, 0, 0.25]);
  await expect(z).toBeFocused();
  await expect(z).toHaveValue("0.25");
  expect((await item(page)).id).toBe(before.id);

  // Keyboard arrows exercise the browser's actual number-input stepping path.
  await z.press("ArrowUp");
  const stepped = Number(await z.inputValue());
  expect(stepped).toBeGreaterThan(0.25);
  await expectCenter(page, [0, 0, +stepped.toFixed(10)]);
  await expect(z).toBeFocused();
  await z.press("ArrowDown");
  await expectCenter(page, [0, 0, +Number(await z.inputValue()).toFixed(10)]);

  // Click the native upper stepper arrow, rather than dispatching a synthetic input.
  const previous = Number(await z.inputValue());
  const bounds = await z.boundingBox();
  expect(bounds).not.toBeNull();
  await z.click({
    // Native steppers are inside the content box, inset by the input's padding.
    position: { x: bounds!.width - 14, y: bounds!.height * 0.3 },
  });
  const clicked = Number(await z.inputValue());
  expect(clicked).toBeGreaterThan(previous);
  await expectCenter(page, [0, 0, +clicked.toFixed(10)]);

  await panel.getByLabel("Analysis coordinate units").selectOption("angstrom");
  const unitsCount = await analyzeCount(page);
  await page.waitForTimeout(500);
  expect(await analyzeCount(page)).toBe(unitsCount);
  await expect(
    panel.getByRole("button", { name: "Cancel editing", exact: true }),
  ).toBeVisible();
});

test("manual plane mode and invalid drafts retain accepted data; live resolution survives Save and reopen", async ({
  page,
}) => {
  const panel = await ready(page);
  const auto = panel.getByLabel("Auto-update plane", { exact: true });
  const z = panel.getByLabel("Plane center Z (bohr)", { exact: true });
  const before = await item(page);
  await auto.uncheck();
  await commit(z, "0.5");
  await page.waitForTimeout(500);
  expect((await item(page)).sample_hash).toBe(before.sample_hash);
  await panel
    .getByRole("button", { name: "Recompute analysis", exact: true })
    .click();
  await expectCenter(page, [0, 0, 0.5]);
  await expect(auto).not.toBeChecked();
  await auto.check();

  const accepted = await item(page);
  const count = await analyzeCount(page);
  const width = panel.getByLabel("Plane width", { exact: true });
  await commit(width, "");
  await page.waitForTimeout(500);
  expect((await item(page)).sample_hash).toBe(accepted.sample_hash);
  expect(await analyzeCount(page)).toBe(count);
  await width.fill("2");
  await commit(panel.getByLabel("Plane columns", { exact: true }), "11");
  await expect.poll(async () => (await item(page)).sampleCount).toBe(99);
  const updated = await item(page);
  expect(updated.definition).toMatchObject({ kind: "plane", dims: [11, 9] });
  const saved = await api<{ bytes: number[] }>(page, "document.save");
  const sampled = await analyzeCount(page);
  await api(page, "document.open", {
    name: "automatic-plane.eigenvista",
    bytes: saved.bytes,
    discardUnsaved: true,
  });
  expect(await item(page)).toEqual(updated);
  expect(await analyzeCount(page)).toBe(sampled);
});

test("rapid plane commits supersede only owned work and keep the last complete plane until ready", async ({
  page,
}, info) => {
  const panel = await ready(page);
  const appearance = await setContours(page);
  const before = await item(page);
  const oldPixels = await scenePixels(page);
  const beforeCamera = await api(page, "camera.get");
  const canvas = page.getByLabel("Molecular scene", { exact: true });
  const beforeBounds = await canvas.boundingBox();
  const diagnosticDirectory = path.resolve("../tmp/plane-auto-update");
  fs.mkdirSync(diagnosticDirectory, { recursive: true });
  await canvas.screenshot({
    path: path.join(
      diagnosticDirectory,
      `rapid-${info.project.name}-before.png`,
    ),
  });
  const z = panel.getByLabel("Plane center Z (bohr)", { exact: true });
  await arm(page, "analyze");
  await commit(z, "0.25");
  await held(page);
  expect((await item(page)).sample_hash).toBe(before.sample_hash);
  const heldPixels = await scenePixels(page);
  const heldCamera = await api(page, "camera.get");
  const heldBounds = await canvas.boundingBox();
  await canvas.screenshot({
    path: path.join(diagnosticDirectory, `rapid-${info.project.name}-held.png`),
  });
  fs.writeFileSync(
    path.join(diagnosticDirectory, `rapid-${info.project.name}.json`),
    JSON.stringify(
      {
        beforeCamera,
        heldCamera,
        beforeBounds,
        heldBounds,
        oldPixels,
        heldPixels,
      },
      null,
      2,
    ),
  );
  expect(heldPixels.rgbChecksum).toBe(oldPixels.rgbChecksum);
  await expect(z).toBeEnabled();
  await expect(z).toBeFocused();
  await commit(z, "0.5");
  await commit(z, "-0.25");
  await expectCenter(page, [0, 0, -0.25]);
  expect((await item(page)).appearance).toEqual(appearance);
  await expect(z).toBeFocused();
  // Even late delivery from the terminated calculation cannot publish stale samples.
  await release(page);
  await expectCenter(page, [0, 0, -0.25]);
  expect((await item(page)).appearance).toEqual(appearance);
  await api(page, "image.export");
  await settleScene(page);
  expect((await scenePixels(page)).rgbChecksum).not.toBe(oldPixels.rgbChecksum);
});

test("a failed contour replacement retains the previous complete scene and reports the error", async ({
  page,
}) => {
  const panel = await ready(page);
  await setContours(page);
  const oldPixels = await scenePixels(page);
  const z = panel.getByLabel("Plane center Z (bohr)", { exact: true });
  await arm(page, "analysis_contours");
  await commit(z, "0.5");
  await held(page);
  await page.evaluate(() => {
    const gate = (window as unknown as AppWindow).planeGate;
    if (!gate.reject) throw new Error("No real contour result was held");
    // Inject only a transport failure at a real contour-completion boundary.
    // Actual sample values, geometry and contour results are never fabricated.
    gate.reject();
  });
  await expect(page.locator(".viewport-error")).toContainText(
    "Simulated contour reply failure",
  );
  expect((await scenePixels(page)).rgbChecksum).toBe(oldPixels.rgbChecksum);
  await expect(api(page, "image.export")).rejects.toThrow(/contour/i);

  await commit(z, "-0.25");
  await expectCenter(page, [0, 0, -0.25]);
  await api(page, "image.export");
  await settleScene(page);
  await expect(page.locator(".viewport-error")).toHaveCount(0);
  expect((await scenePixels(page)).rgbChecksum).not.toBe(oldPixels.rgbChecksum);
});

test("new contours replace the complete old plane together, and closing the editor cancels its pending update", async ({
  page,
}) => {
  const panel = await ready(page);
  await setContours(page);
  const oldPixels = await scenePixels(page);
  const z = panel.getByLabel("Plane center Z (bohr)", { exact: true });
  await arm(page, "analysis_contours");
  await commit(z, "0.5");
  await held(page);
  expect((await scenePixels(page)).rgbChecksum).toBe(oldPixels.rgbChecksum);
  await expect(z).toBeEnabled();
  await release(page);
  await expectCenter(page, [0, 0, 0.5]);
  await api(page, "image.export");
  await settleScene(page);
  const accepted = await item(page);
  expect((await scenePixels(page)).rgbChecksum).not.toBe(oldPixels.rgbChecksum);

  await arm(page, "analyze");
  await commit(z, "1");
  await held(page);
  await panel
    .getByRole("button", { name: "Cancel editing", exact: true })
    .click();
  await idle(page);
  expect((await item(page)).sample_hash).toBe(accepted.sample_hash);
  await release(page);
  expect((await item(page)).sample_hash).toBe(accepted.sample_hash);
  await panel
    .getByLabel("Analysis result Live plane", { exact: true })
    .getByRole("button", { name: "Edit sampling", exact: true })
    .click();
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await expect(
    panel.getByLabel("Plane center Z (bohr)", { exact: true }),
  ).toHaveValue("0.5");
});
