import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type {
  FieldAnalysisItem,
  FieldDescriptor,
} from "../src/inspectionTypes";

type ControlWindow = Window & {
  eigenvistaControl?: {
    request: (
      method: string,
      params?: Record<string, unknown>,
    ) => Promise<unknown>;
  };
};
type Summary = Omit<FieldAnalysisItem, "values" | "valid"> & {
  sampleCount: number;
  validCount: number;
};
type Rows = {
  items: {
    index: number;
    value: number | null;
    status: string;
    position: number[];
    distanceAngstrom: number | null;
  }[];
  total: number;
  profileLengthAngstrom: number | null;
};

/** Small physical water geometry plus an independently defined linear scalar. */
function cube(
  axes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ],
) {
  const values: number[] = [];
  for (let x = 0; x < 5; x++)
    for (let y = 0; y < 5; y++)
      for (let z = 0; z < 5; z++)
        values.push(x - 2 + 2 * (y - 2) + 3 * (z - 2));
  return Buffer.from(
    [
      "Quantitative field independent fixture",
      "Meaning and scalar units intentionally unspecified",
      "3 -2 -2 -2",
      ...axes.map((axis) => `5 ${axis.join(" ")}`),
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
  const result = await page.evaluate(
    async ({ method, params }) => {
      const control = (window as unknown as ControlWindow).eigenvistaControl;
      if (!control)
        throw new Error("Production application control is unavailable");
      try {
        return { ok: true, value: await control.request(method, params) };
      } catch (cause) {
        const error = cause as {
          message?: string;
          kind?: string;
          data?: { kind?: string };
        };
        return {
          ok: false,
          error: {
            message: error.message ?? String(cause),
            kind: error.kind ?? error.data?.kind,
          },
        };
      }
    },
    { method, params },
  );
  if (!result.ok)
    throw Object.assign(new Error(result.error?.message), result.error);
  return result.value as T;
}

async function complete(page: Page, receipt: { jobId: string }) {
  let job: { status: string; result?: unknown; error?: unknown } | undefined;
  await expect
    .poll(
      async () => {
        job = await api(page, "job.get", { jobId: receipt.jobId });
        return job!.status;
      },
      { timeout: 45000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  expect(job!.status, JSON.stringify(job)).toBe("completed");
  return job!.result;
}

async function analyses(page: Page) {
  return (await api<{ items: Summary[] }>(page, "analysis.list")).items;
}

async function centerImageDifference(
  page: Page,
  first: string,
  second: string,
) {
  return page.evaluate(
    async ({ first, second }) => {
      const pixels = async (url: string) => {
        const image = new Image();
        image.src = url;
        await image.decode();
        const canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;
        const context = canvas.getContext("2d")!;
        context.drawImage(image, 0, 0);
        return {
          bytes: context.getImageData(0, 0, canvas.width, canvas.height).data,
          width: canvas.width,
          height: canvas.height,
        };
      };
      const a = await pixels(first),
        b = await pixels(second);
      let changed = 0;
      for (let y = Math.floor(a.height * 0.25); y < a.height * 0.75; y++)
        for (let x = Math.floor(a.width * 0.25); x < a.width * 0.75; x++) {
          const i = (y * a.width + x) * 4;
          if (
            Math.abs(a.bytes[i] - b.bytes[i]) +
              Math.abs(a.bytes[i + 1] - b.bytes[i + 1]) +
              Math.abs(a.bytes[i + 2] - b.bytes[i + 2]) >
            20
          )
            changed++;
        }
      return changed;
    },
    { first, second },
  );
}
async function openPanel(page: Page) {
  const panel = page.getByLabel("Quantitative field inspection", {
    exact: true,
  });
  await panel.locator(":scope > details > summary").click();
  await expect(
    panel.getByLabel("Analysis field", { exact: true }),
  ).toBeVisible();
  return panel;
}
async function ready(page: Page, bytes = cube()) {
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(
    () => !!(window as unknown as ControlWindow).eigenvistaControl,
  );
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "quantitative-linear.cube",
    mimeType: "text/plain",
    buffer: bytes,
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened quantitative-linear.cube",
  );
  const fields = await api<{ items: { id: string }[] }>(page, "fields.list");
  return { field: fields.items[0].id, panel: await openPanel(page) };
}
async function create(
  page: Page,
  field: string,
  id: string,
  definition: Record<string, unknown>,
) {
  return complete(
    page,
    await api(page, "analysis.create", {
      request: { id, label: id, field, definition },
    }),
  );
}

test("collapsed field inspection starts no metadata work until first opening and stays activated", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const observed = window as unknown as { fieldMetadataActions: string[] };
    observed.fieldMetadataActions = [];
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      observed.fieldMetadataActions.push(message.action);
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  const actions = () =>
    page.evaluate(
      () =>
        (window as unknown as { fieldMetadataActions: string[] })
          .fieldMetadataActions,
    );
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  expect(await actions()).not.toContain("describe_field");
  await page.getByLabel("Open molecular file", { exact: true }).setInputFiles({
    name: "lazy-metadata.cube",
    mimeType: "text/plain",
    buffer: cube(),
  });
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened lazy-metadata.cube",
  );
  const panel = page.getByLabel("Quantitative field inspection", {
    exact: true,
  });
  await expect(panel.getByLabel("Analysis field", { exact: true })).toHaveCount(
    1,
  );
  await expect(
    panel.getByLabel("Analysis field", { exact: true }),
  ).toBeHidden();
  expect(await actions()).not.toContain("describe_field");
  const summary = panel.locator(":scope > details > summary");
  await summary.click();
  await expect
    .poll(
      async () =>
        (await actions()).filter((action) => action === "describe_field")
          .length,
    )
    .toBe(1);
  const meaning = panel
    .locator("summary")
    .filter({ hasText: "Field meaning and units:" });
  await expect(meaning).toBeVisible();
  await summary.click();
  await summary.click();
  await expect(meaning).toBeVisible();
  expect(
    (await actions()).filter((action) => action === "describe_field"),
  ).toHaveLength(1);
});

test("GUI probes preserve unknown cube meaning, source coordinates and explicit unit declarations", async ({
  page,
}) => {
  const { field, panel } = await ready(page);
  await expect(
    panel.getByText(/Field meaning and units: unspecified/),
  ).toBeVisible();
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await panel.getByLabel("Analysis label", { exact: true }).fill("Point A");
  await panel.getByLabel("Probe X (bohr)").fill("0.25");
  await panel.getByLabel("Probe Y (bohr)").fill("0.5");
  await panel.getByLabel("Probe Z (bohr)").fill("-0.25");
  await panel
    .getByRole("button", { name: "Create probe", exact: true })
    .click();
  await expect(panel.getByLabel("Probe value Point A")).toHaveText(
    "0.5 unspecified",
  );
  const before = (await analyses(page))[0];
  expect(before).not.toHaveProperty("values");
  expect(before.method).toBe("source_grid_trilinear");
  const samples = await api<Rows>(page, "analysis.samples", { id: before.id });
  expect(samples.items[0]).toMatchObject({
    value: 0.5,
    status: "valid",
    position: [0.25, 0.5, -0.25],
  });
  await panel.getByText(/Field meaning and units:/).click();
  await panel
    .getByLabel("Scalar quantity", { exact: true })
    .selectOption("electron_density");
  await panel
    .getByLabel("Source value unit", { exact: true })
    .selectOption("electron/bohr^3");
  await panel
    .getByLabel("Display and export unit", { exact: true })
    .selectOption("electron/angstrom^3");
  await panel
    .getByLabel("Interpretation note", { exact: true })
    .fill("Explicit independent producer declaration");
  await panel
    .getByRole("button", { name: "Apply field meaning", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (
          await api<FieldDescriptor>(page, "fields.describe", {
            fieldId: field,
          })
        ).origin,
    )
    .toBe("user_declared");
  const after = (await analyses(page))[0];
  expect(after.source_hash).toBe(before.source_hash);
  expect(after.sample_hash).toBe(before.sample_hash);
  expect(after.interpretation_hash).not.toBe(before.interpretation_hash);
  expect(
    (await api<Rows>(page, "analysis.samples", { id: before.id })).items[0]
      .value,
  ).toBe(0.5);
  await expect(panel.getByLabel("Probe value Point A")).toContainText(
    (0.5 * 0.529177210903 ** -3).toPrecision(8).slice(0, 7),
  );
  await panel.getByLabel("Show current field rendering key").check();
  await expect(
    panel.getByLabel("Show current field rendering key"),
  ).toBeEnabled();
  await expect
    .poll(
      async () =>
        (await api<{ bytes: number[] }>(page, "document.save")).bytes.length,
    )
    .toBeGreaterThan(100);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("GUI planes, fixed/automatic keys and real GPU contours render and export with transparent backgrounds", async ({
  page,
}, info) => {
  const { panel } = await ready(page);
  await panel
    .getByRole("button", { name: "View meshes and analyses", exact: true })
    .click();
  await expect
    .poll(async () => (await api<{ mode: string }>(page, "app.state")).mode)
    .toBe("mesh");
  await expect(
    panel.getByRole("button", {
      name: "View meshes and analyses",
      exact: true,
    }),
  ).toBeEnabled();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await panel
    .getByLabel("Analysis type", { exact: true })
    .selectOption("plane");
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await panel.getByLabel("Analysis label", { exact: true }).fill("Bond plane");
  await panel.getByLabel("Plane width", { exact: true }).fill("4");
  await panel.getByLabel("Plane height", { exact: true }).fill("4");
  await panel.getByLabel("Plane columns", { exact: true }).fill("33");
  await panel.getByLabel("Plane rows", { exact: true }).fill("33");
  await panel
    .getByRole("button", { name: "Create plane", exact: true })
    .click();
  const result = panel.getByLabel("Analysis result Bond plane", {
    exact: true,
  });
  await expect(result).toBeVisible();
  const item = (await analyses(page))[0];
  expect(item.sampleCount).toBe(1089);
  const samples = await api<Rows>(page, "analysis.samples", {
    id: item.id,
    limit: 100,
  });
  expect(samples.items[0]).toMatchObject({ value: -6, position: [-2, -2, 0] });
  for (const row of samples.items)
    expect(row.value).toBeCloseTo(row.position[0] + 2 * row.position[1], 10);
  await result.getByLabel("Colormap Bond plane").selectOption("viridis");
  await result.getByLabel("Automatic range Bond plane").uncheck();
  await result.getByLabel("Scale minimum Bond plane").fill("-6");
  await result.getByLabel("Scale maximum Bond plane").fill("6");
  await result.getByLabel("Contour levels Bond plane").fill("-3, 0, 3");
  await result
    .getByRole("button", { name: "Apply result settings", exact: true })
    .click();
  await expect(
    result.getByRole("button", { name: "Apply result settings", exact: true }),
  ).toBeEnabled();
  await expect
    .poll(async () => (await analyses(page))[0].appearance.contour_levels)
    .toEqual([-3, 0, 3]);
  await api(page, "camera.set", {
    position: [0, 0, 12],
    target: [0, 0, 0],
    up: [0, 1, 0],
  });
  const withContours = await api<{ dataUrl: string }>(page, "image.export", {
    transparent: true,
  });
  fs.writeFileSync(
    info.outputPath("quantitative-plane-transparent.png"),
    Buffer.from(withContours.dataUrl.split(",")[1], "base64"),
  );
  const alpha = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const rgba = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0,
      opaque = 0;
    for (let i = 3; i < rgba.length; i += 4) {
      if (rgba[i] === 0) transparent++;
      if (rgba[i] === 255) opaque++;
    }
    return { transparent, opaque };
  }, withContours.dataUrl);
  expect(alpha.transparent).toBeGreaterThan(10000);
  expect(alpha.opaque).toBeGreaterThan(10000);
  await api(page, "analysis.set", {
    id: item.id,
    appearance: { contour_levels: [] },
  });
  const withoutContours = await api<{ dataUrl: string }>(page, "image.export", {
    transparent: true,
  });
  expect(
    await centerImageDifference(
      page,
      withContours.dataUrl,
      withoutContours.dataUrl,
    ),
  ).toBeGreaterThan(20);
  await api(page, "analysis.set", {
    id: item.id,
    appearance: { show_key: false, show_labels: false, contour_levels: [] },
  });
  const shown = await api<{ dataUrl: string }>(page, "image.export");
  await api(page, "analysis.set", {
    id: item.id,
    appearance: { visible: false },
  });
  const hidden = await api<{ dataUrl: string }>(page, "image.export");
  const changed = await centerImageDifference(
    page,
    shown.dataUrl,
    hidden.dataUrl,
  );
  expect(changed).toBeGreaterThan(1000);
  const styled = (await analyses(page))[0].appearance;
  const previousRevision = (await api<{ revision: number }>(page, "app.state"))
    .revision;
  await result.getByRole("button", { name: "Recompute", exact: true }).click();
  await expect
    .poll(
      async () => (await api<{ revision: number }>(page, "app.state")).revision,
    )
    .toBeGreaterThan(previousRevision);
  await expect
    .poll(async () => (await analyses(page))[0].appearance)
    .toEqual(styled);
  await api(page, "analysis.set", {
    id: item.id,
    appearance: { visible: true },
  });
  await result.getByLabel("Automatic range Bond plane").check();
  await result
    .getByRole("button", { name: "Apply result settings", exact: true })
    .click();
  await expect
    .poll(async () => (await analyses(page))[0].appearance.range)
    .toBeUndefined();
  await expect(
    result.getByRole("button", { name: "Apply result settings", exact: true }),
  ).toBeEnabled();
  expect(errors).toEqual([]);
});

test("GUI profiles show outside-domain gaps, physical distance axes, bounded samples, CSV and editable sampling", async ({
  page,
}, info) => {
  const { panel } = await ready(page);
  await panel
    .getByLabel("Analysis type", { exact: true })
    .selectOption("profile");
  await panel.getByLabel("Analysis coordinate units").selectOption("bohr");
  await panel.getByLabel("Analysis label", { exact: true }).fill("Across bond");
  await panel.getByLabel("Profile start X (bohr)").fill("-3");
  await panel.getByLabel("Profile end X (bohr)").fill("3");
  await panel.getByLabel("Profile samples", { exact: true }).fill("7");
  await panel
    .getByRole("button", { name: "Create profile", exact: true })
    .click();
  const result = panel.getByLabel("Analysis result Across bond", {
    exact: true,
  });
  await expect(
    result.getByRole("img", { name: "Line profile Across bond", exact: true }),
  ).toBeVisible();
  await result
    .getByRole("img")
    .screenshot({ path: info.outputPath("profile-plot.png") });
  const item = (await analyses(page))[0];
  const rows = await api<Rows>(page, "analysis.samples", { id: item.id });
  expect(rows.items.map((row) => row.value)).toEqual([
    null,
    -2,
    -1,
    0,
    1,
    2,
    null,
  ]);
  expect(rows.profileLengthAngstrom).toBeCloseTo(6 * 0.529177210903, 12);
  expect(rows.items[6].distanceAngstrom).toBeCloseTo(6 * 0.529177210903, 12);
  await expect(result.getByRole("img")).toContainText(
    "Distance along line (Å)",
  );
  const downloaded = page.waitForEvent("download");
  await result
    .getByRole("button", { name: "Export analysis CSV", exact: true })
    .click();
  const file = info.outputPath("field-profile.csv");
  await (await downloaded).saveAs(file);
  const csv = fs.readFileSync(file, "utf8");
  expect(csv).toContain("source_grid_trilinear");
  expect(csv).toContain(',,"unspecified",outside,');
  expect(csv.split("\n")[2]).toContain(',-2,"unspecified",valid,');
  await result
    .getByRole("button", { name: "Edit sampling", exact: true })
    .click();
  await panel.getByLabel("Profile samples", { exact: true }).fill("13");
  await panel
    .getByRole("button", { name: "Recompute analysis", exact: true })
    .click();
  await expect.poll(async () => (await analyses(page))[0].sampleCount).toBe(13);
  await expect(
    result.getByRole("button", { name: "Remove analysis", exact: true }),
  ).toBeEnabled();
  await result
    .getByRole("button", { name: "Remove analysis", exact: true })
    .click();
  await expect.poll(async () => (await analyses(page)).length).toBe(0);
});

test("atom-based probe, plane and profile persist exact caches with declared meaning through native save/reopen", async ({
  page,
}) => {
  const { field, panel } = await ready(page);
  await api(page, "selection.set", { atoms: [0] });
  await panel.getByLabel("Analysis position source").selectOption("atoms");
  await panel
    .getByLabel("Analysis label", { exact: true })
    .fill("Oxygen probe");
  await panel
    .getByRole("button", { name: "Create probe", exact: true })
    .click();
  await expect(panel.getByLabel("Probe value Oxygen probe")).toHaveText(
    "0 unspecified",
  );
  await expect(
    panel.getByRole("button", { name: "Create probe", exact: true }),
  ).toBeEnabled();
  await api(page, "selection.set", { atoms: [0, 1, 2] });
  await panel
    .getByLabel("Analysis type", { exact: true })
    .selectOption("plane");
  await panel.getByLabel("Plane orientation").selectOption("atoms");
  await panel.getByLabel("Analysis label", { exact: true }).fill("Water plane");
  await panel.getByLabel("Plane columns", { exact: true }).fill("9");
  await panel.getByLabel("Plane rows", { exact: true }).fill("9");
  await panel.getByLabel("Plane width", { exact: true }).fill("1");
  await panel.getByLabel("Plane height", { exact: true }).fill("1");
  await panel
    .getByRole("button", { name: "Create plane", exact: true })
    .click();
  await expect.poll(async () => (await analyses(page)).length).toBe(2);
  await expect(
    panel.getByRole("button", { name: "Create plane", exact: true }),
  ).toBeEnabled();
  const plane = (await analyses(page)).find(
    (item) => item.label === "Water plane",
  )!;
  expect(plane.definition).toMatchObject({
    kind: "plane",
    atoms: [0, 1, 2],
    dims: [9, 9],
  });
  await api(page, "fields.set_metadata", {
    descriptor: {
      field,
      quantity: "dimensionless",
      value_unit: "1",
      origin: "user_declared",
      note: "Declared fixture scalar",
    },
  });
  const before = await analyses(page);
  const saved = await api<{ bytes: number[] }>(page, "document.save");
  await api(page, "document.open", {
    name: "inspection-roundtrip.eigenvista",
    bytes: saved.bytes,
    discardUnsaved: true,
  });
  const after = await analyses(page);
  expect(after).toEqual(before);
  const restored = await api<Rows>(page, "analysis.samples", {
    id: plane.id,
    offset: 40,
    limit: 1,
  });
  expect(
    restored.items[0].position.every((value) => Math.abs(value) < 1e-12),
  ).toBe(true);
  expect(restored.items[0].value).toBeCloseTo(0, 12);
  expect(
    (await api<FieldDescriptor>(page, "fields.describe", { fieldId: field }))
      .origin,
  ).toBe("user_declared");
});

test("production analytic sampling matches frozen independent PySCF values and cancellation preserves accepted records", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(
      path.resolve("../fixtures/native/water-rhf-0.5.12.eigenvista"),
    );
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened water-rhf-0.5.12.eigenvista",
  );
  const reference = JSON.parse(
    fs.readFileSync(
      path.resolve("../fixtures/pyscf/water-rhf-ccpvdz.json"),
      "utf8",
    ),
  ) as {
    reference: {
      points: number[][];
      fields: { id: string; samples: number[][] }[];
    };
  };
  const target = reference.reference.fields.find(
    (field) => field.id === "total",
  )!;
  await create(page, "total", "density-reference", {
    kind: "probe",
    point: reference.reference.points[0],
  });
  const rows = await api<Rows>(page, "analysis.samples", {
    id: "density-reference",
  });
  expect(Math.abs(rows.items[0].value! - target.samples[0][0])).toBeLessThan(
    1e-10 + 1e-8 * Math.abs(target.samples[0][0]),
  );
  const before = await analyses(page);
  const cancelled = await page.evaluate(async () => {
    const control = (window as unknown as ControlWindow).eigenvistaControl!;
    const receipt = (await control.request("analysis.create", {
      request: {
        id: "cancelled-plane",
        label: "cancelled-plane",
        field: "total",
        definition: {
          kind: "plane",
          origin: [-4, -4, 0],
          u: [8, 0, 0],
          v: [0, 8, 0],
          dims: [512, 512],
        },
      },
    })) as { jobId: string };
    await control.request("job.cancel", { jobId: receipt.jobId });
    return (await control.request("job.get", { jobId: receipt.jobId })) as {
      status: string;
    };
  });
  expect(cancelled.status).toBe("cancelled");
  expect(await analyses(page)).toEqual(before);
  await create(page, "total", "retry-probe", {
    kind: "probe",
    point: reference.reference.points[1],
  });
  expect(
    (await api<Rows>(page, "analysis.samples", { id: "retry-probe" })).items[0]
      .value,
  ).toBeCloseTo(target.samples[1][0], 8);
  await create(page, "total", "far-probe", {
    kind: "probe",
    point: [1e100, 0, 0],
  });
  const far = await api<Summary & { renderingWarning: string | null }>(
    page,
    "analysis.get",
    { id: "far-probe" },
  );
  expect(far.renderingWarning).toContain("exceed rendering precision");
  expect(
    (await api<Rows>(page, "analysis.samples", { id: "far-probe" })).items[0]
      .value,
  ).toBe(0);
  expect(
    (await api<{ dataUrl: string }>(page, "image.export")).dataUrl,
  ).toMatch(/^data:image\/png;base64,/);
  await expect(
    api(page, "analysis.create", {
      request: {
        id: "bad",
        label: "bad",
        field: "total",
        definition: {
          kind: "plane",
          origin: [0, 0, 0],
          u: [1, 0, 0],
          v: [0, 1, 0],
          dims: [513, 2],
        },
      },
    }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  expect((await analyses(page)).length).toBe(3);
});

test("field inspection remains readable on narrow displays with source metadata and profile axes", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const { field, panel } = await ready(page);
  await create(page, field, "mobile-profile", {
    kind: "profile",
    start: [-2, 0, 0],
    end: [2, 0, 0],
    count: 33,
  });
  const card = panel.getByLabel("Analysis result mobile-profile", {
    exact: true,
  });
  await card
    .getByText("Numerical samples and provenance", { exact: true })
    .click();
  await expect(card.getByRole("img")).toBeVisible();
  const widths = await panel.evaluate((node) => ({
    width: node.getBoundingClientRect().width,
    scroll: node.scrollWidth,
  }));
  expect(widths.scroll).toBeLessThanOrEqual(Math.ceil(widths.width) + 1);
  await expect(card.getByLabel("Samples mobile-profile")).toContainText("-2");
  await card.getByRole("img").scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("field-mobile.png") });
});

test("fixed ranges clip interpolated field values and profile segments rather than their samples", async ({
  page,
}, info) => {
  const fixture = Buffer.from(
    [
      "Independent fixed-range interpolation fixture",
      "Linear scalar 20x - 10",
      "1 0 0 0",
      "2 1 0 0",
      "2 0 1 0",
      "2 0 0 1",
      "6 0 5 5 5",
      "-10 -10 -10 -10 10 10 10 10",
      "",
    ].join("\n"),
  );
  const { field, panel } = await ready(page, fixture);
  await api(page, "scene.set", { mode: "mesh" });
  await create(page, field, "fixed-plane", {
    kind: "plane",
    origin: [0, 0, 0],
    u: [1, 0, 0],
    v: [0, 1, 0],
    dims: [2, 2],
  });
  await api(page, "analysis.set", {
    id: "fixed-plane",
    appearance: {
      range: [-1, 1],
      colormap: "grayscale",
      show_key: false,
      show_labels: false,
    },
  });
  await api(page, "camera.set", {
    position: [0.5, 0.5, 3],
    target: [0.5, 0.5, 0],
    up: [0, 1, 0],
  });
  const image = await api<{ dataUrl: string }>(page, "image.export");
  fs.writeFileSync(
    info.outputPath("fixed-range-physical-crossings.png"),
    Buffer.from(image.dataUrl.split(",")[1], "base64"),
  );
  const pixels = await page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    // The production perspective camera has a 35 degree vertical field of view.
    return [0.25, 0.5, 0.75].map((x) => {
      const column = Math.round(
        image.width / 2 +
          ((x - 0.5) * image.height) / (6 * Math.tan((35 * Math.PI) / 360)),
      );
      return Array.from(
        context.getImageData(column, Math.floor(image.height / 2), 1, 1).data,
      );
    });
  }, image.dataUrl);
  const expected = [
    [17, 24, 39, 255],
    [156, 163, 175, 255],
    [249, 250, 251, 255],
  ];
  for (let i = 0; i < expected.length; i++)
    for (let component = 0; component < 4; component++)
      expect(
        Math.abs(pixels[i][component] - expected[i][component]),
      ).toBeLessThanOrEqual(4);

  await create(page, field, "fixed-profile", {
    kind: "profile",
    start: [0, 0.5, 0],
    end: [1, 0.5, 0],
    count: 2,
  });
  await api(page, "analysis.set", {
    id: "fixed-profile",
    appearance: { range: [-1, 1] },
  });
  const profile = panel.getByRole("img", {
    name: "Line profile fixed-profile",
    exact: true,
  });
  await expect(profile).toBeVisible();
  const extent = await profile
    .locator("path")
    .last()
    .evaluate((path) => {
      const box = (path as SVGGraphicsElement).getBBox();
      return { x: box.x, width: box.width };
    });
  expect(extent.x).toBeCloseTo(42 + 0.45 * 222, 2);
  expect(extent.width).toBeCloseTo(0.1 * 222, 2);
  expect(
    (
      await api<Rows>(page, "analysis.samples", { id: "fixed-profile" })
    ).items.map((row) => row.value),
  ).toEqual([-10, 10]);

  await api(page, "analysis.set", {
    id: "fixed-plane",
    appearance: { range: [-1e-40, 1e-40] },
  });
  const unsupported = await api<{ renderingWarning: string | null }>(
    page,
    "analysis.get",
    { id: "fixed-plane" },
  );
  expect(unsupported.renderingWarning).toContain(
    "color scale exceeds rendering precision",
  );
  await expect(
    panel.getByLabel("Analysis result fixed-plane", { exact: true }),
  ).toContainText("Use an automatic or wider range");
  expect(
    (
      await api<Rows>(page, "analysis.samples", { id: "fixed-plane" })
    ).items.map((row) => row.value),
  ).toEqual([-10, 10, -10, 10]);
});
