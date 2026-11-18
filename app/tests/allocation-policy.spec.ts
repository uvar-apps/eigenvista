import { expect, test } from "@playwright/test";

test("camera frames avoid synchronous allocation queries while exports still validate resources", async ({
  page,
}) => {
  const { trackSceneDraws, settleScene } = await import("./scenePixels");
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await settleScene(page);
  const installed = await page.evaluate(() => {
    const prototype = WebGL2RenderingContext.prototype;
    const getError = prototype.getError;
    const getParameter = prototype.getParameter;
    (window as any).allocationQueries = { errors: 0, limits: 0 };
    prototype.getError = function () {
      (window as any).allocationQueries.errors++;
      return getError.call(this);
    };
    prototype.getParameter = function (parameter) {
      if (parameter === this.MAX_RENDERBUFFER_SIZE)
        (window as any).allocationQueries.limits++;
      return getParameter.call(this, parameter);
    };
    const canvas = document.querySelector<HTMLCanvasElement>(
      'canvas[aria-label="Molecular scene"]',
    )!;
    const gl = canvas.getContext("webgl2")!;
    gl.getError();
    gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
    return { ...(window as any).allocationQueries };
  });
  expect(installed).toEqual({ errors: 1, limits: 1 });
  for (const enabled of [false, true]) {
    await page.evaluate(async (enabled) => {
      await (window as any).eigenvistaControl.request("scene.set", {
        ambientOcclusion: { enabled, strength: 1, automaticRadius: true },
      });
    }, enabled);
    await settleScene(page);
    const before = await page.evaluate(() => {
      (window as any).allocationQueries = { errors: 0, limits: 0 };
      return (window as any).sceneDraws as number;
    });
    await page.evaluate(async () => {
      await (window as any).eigenvistaControl.request("camera.orbit", {
        horizontalDegrees: 12,
        verticalDegrees: 7,
      });
    });
    await settleScene(page);
    const after = await page.evaluate(() => ({
      draws: (window as any).sceneDraws as number,
      ...(window as any).allocationQueries,
    }));
    expect(after.draws).toBeGreaterThan(before);
    expect(after.errors).toBe(0);
    expect(after.limits).toBe(0);
    const image = await page.evaluate(async () =>
      (window as any).eigenvistaControl.request("image.export"),
    );
    expect(image.dataUrl).toMatch(/^data:image\/png;base64,/);
    expect(
      await page.evaluate(() => (window as any).allocationQueries.errors),
    ).toBeGreaterThan(0);
    await expect(page.locator(".viewport-error")).toHaveCount(0);
  }
});

test("scene and quantitative keys retain device resolution beyond former pixel caps", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 1000 },
    deviceScaleFactor: 3,
  });
  try {
    const page = await context.newPage();
    await page.goto("http://127.0.0.1:5178/?control=1");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const receipt = await page.evaluate(async () => {
      const api = (window as any).eigenvistaControl;
      const fields = await api.request("fields.list");
      return api.request("analysis.create", {
        request: {
          id: "device-resolution",
          label: "Device resolution",
          field: fields.items[0].id,
          definition: {
            kind: "plane",
            origin: [-1, -1, 0],
            u: [2, 0, 0],
            v: [0, 2, 0],
            dims: [3, 3],
          },
        },
      });
    });
    await expect
      .poll(() =>
        page.evaluate(async (jobId) => {
          const job = await (window as any).eigenvistaControl.request(
            "job.get",
            {
              jobId,
            },
          );
          return job.status;
        }, receipt.jobId),
      )
      .toBe("completed");
    await expect
      .poll(() =>
        page.evaluate(() => {
          const scene = document.querySelector<HTMLCanvasElement>(
            'canvas[aria-label="Molecular scene"]',
          )!;
          const keys = document.querySelector<HTMLCanvasElement>(
            'canvas[aria-label="Quantitative field keys"]',
          );
          return Boolean(
            keys &&
              scene.height > 2048 &&
              scene.width === Math.floor(scene.clientWidth * 3) &&
              keys.width === scene.width &&
              keys.height === scene.height,
          );
        }),
      )
      .toBe(true);
    const exported = await page.evaluate(() =>
      (window as any).eigenvistaControl.request("image.export"),
    );
    expect(exported.dataUrl).toMatch(/^data:image\/png;base64,/);
    await expect(page.getByRole("alert")).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("larger range arrays retain all source cells without a preview ceiling", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const result = await page.evaluate(async () => {
    const url = "/src/volumeRanges.ts";
    const { volumeBrickRanges } = await import(/* @vite-ignore */ url);
    const dims = [1025, 2, 2];
    const values = new Float32Array(1025 * 4);
    values[1024] = -7;
    values[values.length - 1] = 11;
    const result = volumeBrickRanges({ dims, values });
    return { dims: result.dims, last: Array.from(result.values.slice(-2)) };
  });
  expect(result.dims).toEqual([128, 1, 1]);
  expect(result.last).toEqual([-7, 11]);
});

test("controller accepts analyses and pages beyond the former fixed allowances", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.waitForFunction(() => Boolean((window as any).eigenvistaControl));
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const state = await (window as any).eigenvistaControl.request(
          "app.state",
        );
        return Boolean(state.document && !state.busy);
      }),
    )
    .toBe(true);
  const result = await page.evaluate(async () => {
    const api = (window as any).eigenvistaControl;
    const capabilities = await api.request("app.capabilities");
    const fields = await api.request("fields.list", { limit: 10000 });
    const field = fields.items[0].id;
    const jobs = [];
    for (const [id, definition] of [
      [
        "wide-plane",
        {
          kind: "plane",
          origin: [-1, -1, 0],
          u: [2, 0, 0],
          v: [0, 2, 0],
          dims: [1025, 2],
        },
      ],
      [
        "long-profile",
        { kind: "profile", start: [-1, 0, 0], end: [1, 0, 0], count: 4097 },
      ],
    ] as const) {
      const receipt = await api.request("analysis.create", {
        request: { id, label: "Analysis ".repeat(100), field, definition },
      });
      let job;
      do {
        await new Promise((resolve) => setTimeout(resolve, 10));
        job = await api.request("job.get", { jobId: receipt.jobId });
      } while (["accepted", "running"].includes(job.status));
      jobs.push(job);
    }
    const plane = await api.request("analysis.samples", {
      id: "wide-plane",
      limit: 10000,
    });
    const profile = await api.request("analysis.samples", {
      id: "long-profile",
      limit: 10000,
    });
    return {
      capabilities,
      jobs,
      planeCount: plane.items.length,
      profileCount: profile.items.length,
    };
  });
  expect(result.capabilities.allocationPolicy).toBe("allocation-driven");
  expect(result.capabilities).not.toHaveProperty("limits");
  expect(result.jobs.map((job) => job.status)).toEqual([
    "completed",
    "completed",
  ]);
  expect(result.planeCount).toBe(2050);
  expect(result.profileCount).toBe(4097);
});

test("unrepresentable WASM inputs fail without wrapping and the worker remains usable", async ({
  page,
}) => {
  await page.goto("/?control=1");
  const report = await page.evaluate(async () => {
    const wasmUrl = "/src/wasm/eigenvista_wasm.js";
    const scienceUrl = "/src/science.ts";
    const core = await import(/* @vite-ignore */ wasmUrl);
    const { createScienceClient } = await import(/* @vite-ignore */ scienceUrl);
    await core.default();
    const doc = JSON.parse(core.example(false));
    const client = createScienceClient();
    const errors = [];
    for (const [action, args] of [
      [
        "analysis_plane_atoms",
        { doc, atoms: [0, 1, 2], extent: [2, 2], dims: [4294967298, 2] },
      ],
      ["sample", { doc, field: doc.view.field, resolution: 4294967298 }],
    ]) {
      try {
        await client.request(action, args);
        errors.push("unexpected success");
      } catch (error) {
        errors.push(String(error));
      }
    }
    const grid = await client.request("sample", {
      doc,
      field: doc.view.field,
      resolution: 12,
    });
    return { errors, dims: grid.dims, count: grid.values.length };
  });
  expect(report.errors).toHaveLength(2);
  expect(report.errors.every((error) => error.includes("WASM32"))).toBe(true);
  expect(report.dims).toEqual([12, 12, 12]);
  expect(report.count).toBe(12 ** 3);
});

test("custom grid editing applies a complete value without launching intermediate calculations", async ({
  page,
}) => {
  await page.goto("/?control=1");
  await page.waitForFunction(() => Boolean((window as any).eigenvistaControl));
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const state = await (window as any).eigenvistaControl.request(
          "app.state",
        );
        return Boolean(state.document && !state.busy);
      }),
    )
    .toBe(true);
  await page.evaluate(async () => {
    const api = (window as any).eigenvistaControl;
    const state = await api.request("app.state");
    const receipt = await api.request("field.preview", {
      fieldId: state.view.field,
      resolution: 12,
      mode: "volume",
    });
    let job;
    do {
      await new Promise((resolve) => setTimeout(resolve, 10));
      job = await api.request("job.get", { jobId: receipt.jobId });
    } while (["accepted", "running"].includes(job.status));
    if (job.status !== "completed") throw new Error(JSON.stringify(job));
  });
  const { activateWidget } = await import("./workspace");
  await activateWidget(page, "field-rendering");
  const input = page.getByLabel("Custom grid resolution", { exact: true });
  await input.fill("13");
  const before = await page.evaluate(() =>
    (window as any).eigenvistaControl.request("app.state"),
  );
  expect(before).toMatchObject({ resolution: 12, busy: "" });
  await input.press("Enter");
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).eigenvistaControl.request("app.state"),
      ),
    )
    .toMatchObject({ resolution: 13, busy: "", mode: "volume" });
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("a reported GPU allocation failure retains the previous scene and permits retry", async ({
  page,
}) => {
  const { trackSceneDraws, settleScene, pngPixels } = await import(
    "./scenePixels"
  );
  const { activateWidget } = await import("./workspace");
  await trackSceneDraws(page);
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await activateWidget(page, "document");
  await settleScene(page);
  const actualCanvas = page.locator('canvas[aria-label="Molecular scene"]');
  // Clip the rendered pixels without painting the separately asserted HTML error overlay.
  const capture = () =>
    actualCanvas.screenshot({
      style: ".viewport-error { visibility: hidden !important; }",
    });
  const before = await capture();
  expect((await pngPixels(page, before)).foreground).toBeGreaterThan(100);
  await page.evaluate(() => {
    const prototype = WebGL2RenderingContext.prototype;
    const bufferData = prototype.bufferData;
    const getError = prototype.getError;
    let armed = true,
      pending = false;
    (window as any).allocationFault = { consumed: false };
    prototype.bufferData = function (...args: any[]) {
      if (armed) {
        armed = false;
        pending = true;
      }
      return Reflect.apply(bufferData, this, args);
    };
    prototype.getError = function () {
      if (pending) {
        pending = false;
        (window as any).allocationFault.consumed = true;
        return this.OUT_OF_MEMORY;
      }
      return getError.call(this);
    };
  });
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("space-fill");
  await expect(page.getByRole("alert")).toContainText(
    "could not allocate memory",
  );
  expect(
    await page.evaluate(() => (window as any).allocationFault.consumed),
  ).toBe(true);
  await settleScene(page);
  expect(await capture()).toEqual(before);
  await page
    .getByLabel("Representation", { exact: true })
    .selectOption("liquorice");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const image = await page.evaluate(() =>
    (window as any).eigenvistaControl.request("image.export"),
  );
  expect(image.dataUrl).toMatch(/^data:image\/png;base64,/);
});

test("the connector returns complete shader settings and import warnings beyond former summary caps", async ({
  page,
}) => {
  const { activateWidget } = await import("./workspace");
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await activateWidget(page, "surface-shader");
  await page.locator('[data-shader-input="vertex"]').setInputFiles({
    name: "complete.vert",
    mimeType: "text/plain",
    buffer: Buffer.from("void main() { gl_Position = ftransform(); }"),
  });
  const declarations = Array.from(
    { length: 65 },
    (_, i) => `uniform float control${i};`,
  ).join("\n");
  await page.locator('[data-shader-input="fragment"]').setInputFiles({
    name: "complete.frag",
    mimeType: "text/plain",
    buffer: Buffer.from(
      declarations +
        "\nvoid main() { gl_FragColor = vec4(0.3, 0.7, 0.6, 1.0); }",
    ),
  });
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  const shader = await page.evaluate(async () => {
    const api = (window as any).eigenvistaControl;
    await api.request("shader.set_uniforms", { uniforms: { control64: 0.75 } });
    return (await api.request("app.state")).shader;
  });
  expect(Object.keys(shader.uniforms)).toHaveLength(65);
  expect(shader.uniforms.control64).toBe(0.75);
  const sections = Array.from(
    { length: 36 },
    (_, i) => `[EXTRA-${i}${i === 35 ? "_" + "A".repeat(2200) : ""}]\n0\n`,
  ).join("");
  const molden =
    "[Molden Format]\n[Atoms] AU\nH 1 1 0 0 0\n[GTO]\n1 0\ns 1 1.0\n1.0 1.0\n[MO]\nSym=1a\nSpin=Alpha\nEne=-0.5\nOccup=1\n1 1\n" +
    sections;
  const warnings = await page.evaluate(
    async ({ bytes }) => {
      const api = (window as any).eigenvistaControl;
      const result = await api.request("document.open", {
        name: "complete-warnings.molden",
        bytes,
        discardUnsaved: true,
      });
      return result.report.warnings as string[];
    },
    { bytes: Array.from(Buffer.from(molden)) },
  );
  expect(warnings.filter((w) => w.startsWith("[EXTRA-"))).toHaveLength(36);
  expect(warnings.find((w) => w.startsWith("[EXTRA-35_"))).toContain(
    "A".repeat(2200),
  );
});
