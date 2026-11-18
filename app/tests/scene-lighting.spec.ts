import { expect, test, type Page, type TestInfo } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { trackSceneDraws } from "./scenePixels";

type ControlWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
};
type Job = { jobId: string; status: string; error?: unknown };
type Camera = { position: number[]; target: number[] };
type Luminance = {
  count: number;
  total: number;
  mean: number;
  q10: number;
  q50: number;
  q90: number;
};
type Pattern = { radius: number; mean: number; rms: number; span: number }[];
type Frame = Luminance & {
  direction: number[];
  up: number[];
  shading: string;
  pattern?: Pattern;
};

// Opposed cardinal views expose the old dark-back lighting. The two diagonals
// prevent a camera rig that only happens to work along its three chosen axes.
const directions = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
  [1, 1, 1],
  [-1, -1, -1],
];
const neutralColor = "#a0a0a0";

const call = <T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
) =>
  page.evaluate(
    ({ method, params }) =>
      (window as ControlWindow).eigenvistaControl!.request(method, params),
    { method, params },
  ) as Promise<T>;

async function complete(page: Page, receipt: { jobId?: string }) {
  if (!receipt.jobId) return;
  let result: Job | undefined;
  await expect
    .poll(
      async () => {
        result = await call<Job>(page, "job.get", { jobId: receipt.jobId });
        return result.status;
      },
      { timeout: 45_000 },
    )
    .toMatch(/^(completed|failed|cancelled)$/);
  expect(result!.status, JSON.stringify(result)).toBe("completed");
}

async function ready(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /WebGL|shader|program/i.test(message.text())
    )
      errors.push(message.text());
  });
  await trackSceneDraws(page);
  page.on("dialog", (dialog) => dialog.accept());
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as ControlWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
  return errors;
}

async function open(page: Page, name: string, buffer: Buffer) {
  await page
    .getByLabel("Open molecular file")
    .setInputFiles({ name, mimeType: "application/octet-stream", buffer });
  await expect(page.locator("footer [role=status]")).toContainText(
    `Opened ${name}`,
  );
  await expect
    .poll(async () => (await call<{ busy: string }>(page, "app.state")).busy)
    .toBe("");
}

async function molecularSurface(page: Page) {
  await complete(
    page,
    await call(page, "molecularSurfaces.generate", {
      request: {
        id: "lighting-ses",
        label: "Lighting reference SES",
        kind: "ses",
        atom_indices: [],
        radii_set: "bondi",
        radii_overrides: [],
        probe_radius: 1.4,
        spacing: 0.25,
        color: neutralColor,
        opacity: 1,
      },
    }),
  );
  await call(page, "scene.set", {
    mode: "mesh",
    ambientOcclusion: { enabled: false },
  });
  await call(page, "camera.fit");
}

async function luminance(page: Page, dataUrl: string): Promise<Luminance> {
  return page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    const values: number[] = [];
    for (let i = 0; i < pixels.length; i += 4) {
      // Transparent exports supply a geometric foreground mask. Background and
      // antialiased edges do not bias brightness when projected protein area varies.
      if (pixels[i + 3] >= 250)
        values.push(
          (0.2126 * pixels[i] +
            0.7152 * pixels[i + 1] +
            0.0722 * pixels[i + 2]) /
            255,
        );
    }
    values.sort((a, b) => a - b);
    return {
      count: values.length,
      total: image.width * image.height,
      mean: values.reduce((a, b) => a + b, 0) / values.length,
      q10: values[Math.floor(values.length * 0.1)],
      q50: values[Math.floor(values.length * 0.5)],
      q90: values[Math.floor(values.length * 0.9)],
    };
  }, dataUrl);
}

async function radialPattern(page: Page, dataUrl: string): Promise<Pattern> {
  return page.evaluate(async (url) => {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width,
      right = 0,
      top = canvas.height,
      bottom = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        if (pixels[(y * canvas.width + x) * 4 + 3] >= 250) {
          left = Math.min(left, x);
          right = Math.max(right, x);
          top = Math.min(top, y);
          bottom = Math.max(bottom, y);
        }
      }
    }
    const centerX = (left + right) / 2,
      centerY = (top + bottom) / 2;
    const size = Math.min(right - left, bottom - top) / 2;
    if (size < 50)
      throw Error("Sphere is too small for a lighting quality check");
    return [0.3, 0.45, 0.6, 0.75].map((radius) => {
      const values = Array.from({ length: 180 }, (_, i) => {
        const angle = (i * Math.PI) / 90;
        const x = Math.round(centerX + size * radius * Math.cos(angle));
        const y = Math.round(centerY + size * radius * Math.sin(angle));
        const k = (y * canvas.width + x) * 4;
        return (
          (0.2126 * pixels[k] +
            0.7152 * pixels[k + 1] +
            0.0722 * pixels[k + 2]) /
          255
        );
      });
      const mean = values.reduce((a, b) => a + b) / values.length;
      const sorted = [...values].sort((a, b) => a - b);
      return {
        radius,
        mean,
        rms: Math.sqrt(
          values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
            values.length,
        ),
        span: sorted[171] - sorted[9],
      };
    });
  }, dataUrl);
}

async function views(
  page: Page,
  info: TestInfo,
  subject: string,
  shading: string,
  measurePattern = false,
) {
  await call(page, "scene.set", { shading });
  const { camera } = await call<{ camera: Camera }>(page, "app.state");
  const distance = Math.hypot(
    ...camera.position.map((v, i) => v - camera.target[i]),
  );
  expect(distance).toBeGreaterThan(0);
  const frames: Frame[] = [];
  const cameras = directions.map((direction) => ({
    direction,
    up:
      Math.abs(direction[1] / Math.hypot(...direction)) > 0.9
        ? [0, 0, 1]
        : [0, 1, 0],
  }));
  cameras.push(
    { direction: [0, 0, 1], up: [1, 0, 0] },
    { direction: [1, 1, 1], up: [Math.SQRT1_2, -Math.SQRT1_2, 0] },
  );
  for (let i = 0; i < cameras.length; i++) {
    const { direction, up } = cameras[i];
    const length = Math.hypot(...direction);
    await call(page, "camera.set", {
      position: direction.map(
        (v, axis) => camera.target[axis] + (v / length) * distance,
      ),
      target: camera.target,
      up,
    });
    const image = await call<{ dataUrl: string }>(page, "image.export", {
      transparent: true,
    });
    frames.push({
      direction,
      up,
      shading,
      ...(await luminance(page, image.dataUrl)),
      ...(measurePattern
        ? { pattern: await radialPattern(page, image.dataUrl) }
        : {}),
    });
    const file = info.outputPath(`${subject}-${shading}-${i}.png`);
    fs.writeFileSync(file, Buffer.from(image.dataUrl.split(",")[1], "base64"));
    await info.attach(`${subject}-${shading}-${i}.png`, {
      path: file,
      contentType: "image/png",
    });
  }
  const file = info.outputPath(`${subject}-${shading}-luminance.json`);
  fs.writeFileSync(file, JSON.stringify(frames, null, 2) + "\n");
  await info.attach(`${subject}-${shading}-luminance.json`, {
    path: file,
    contentType: "application/json",
  });
  return frames;
}

function balancedSphere(frames: Frame[]) {
  for (const frame of frames) {
    expect(frame.count, JSON.stringify(frame)).toBeGreaterThan(1000);
    expect(frame.count / frame.total, JSON.stringify(frame)).toBeGreaterThan(
      0.03,
    );
    expect(frame.q10, JSON.stringify(frame)).toBeGreaterThan(0.2);
    expect(frame.q90 - frame.q10, JSON.stringify(frame)).toBeGreaterThan(0.04);
  }
  const means = frames.map((frame) => frame.mean);
  // The same sphere presents the same normal distribution from every view.
  // Ten percent permits raster/mesh variation while rejecting the measured old
  // Diffuse key/hemisphere rig's >2x brightness change and Blinn's 16% change.
  expect(
    Math.max(...means) / Math.min(...means),
    JSON.stringify(frames),
  ).toBeLessThan(1.1);
  for (const quantile of ["q10", "q50", "q90"] as const) {
    const values = frames.map((frame) => frame[quantile]);
    expect(Math.max(...values) - Math.min(...values), quantile).toBeLessThan(
      0.06,
    );
  }
}

for (const element of ["H", "O"]) {
  test(`${element} atom has a smooth radial gradient without repeated highlights under orbit and roll`, async ({
    page,
  }, info) => {
    const errors = await ready(page);
    await open(
      page,
      `${element}-sphere.xyz`,
      Buffer.from(`1\nLighting quality reference\n${element} 0 0 0\n`),
    );
    const frames = await views(page, info, `${element}-atom`, "diffuse", true);
    balancedSphere(frames);
    for (const frame of frames) {
      expect(frame.pattern).toHaveLength(4);
      for (const ring of frame.pattern!) {
        // The old rig has RMS 0.026 (H) / 0.099 (O) and 3-fold peaks;
        // the headlight is smooth around a ring, while preserving radial shape.
        expect(ring.rms, JSON.stringify({ element, frame })).toBeLessThan(
          0.012,
        );
        expect(ring.span, JSON.stringify({ element, frame })).toBeLessThan(
          0.035,
        );
      }
      expect(frame.pattern![0].mean - frame.pattern![3].mean).toBeGreaterThan(
        0.025,
      );
    }
    if (element === "H") {
      await open(
        page,
        "hydroxyl-uhf-sto3g.molden",
        fs.readFileSync(
          path.resolve("../fixtures/molden/hydroxyl-uhf-sto3g.molden"),
        ),
      );
      const { document } = await call<{
        document: { atomCount: number; bondCount: number };
      }>(page, "app.state");
      expect(document.atomCount).toBe(2);
      expect(document.bondCount).toBe(1);
      const { dataUrl } = await call<{ dataUrl: string }>(
        page,
        "image.export",
        { transparent: true },
      );
      const file = info.outputPath("reported-hydroxyl.png");
      fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64"));
      await info.attach("reported-hydroxyl.png", {
        path: file,
        contentType: "image/png",
      });
    }
    expect(errors).toEqual([]);
  });
}

test("molecular sphere lighting preserves balanced brightness and depth cues from opposed and oblique views", async ({
  page,
}, info) => {
  const errors = await ready(page);
  await open(
    page,
    "lighting-sphere.xyz",
    Buffer.from("1\nIndependent sphere lighting\nC 0 0 0\n"),
  );
  await molecularSurface(page);
  for (const shading of ["diffuse", "blinn-phong"])
    balancedSphere(await views(page, info, "sphere-ses", shading));
  expect(errors).toEqual([]);
});

test("real crambin SES remains evenly readable from every side in both surface shading modes", async ({
  page,
}, info) => {
  const errors = await ready(page);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/bcif/1crn.bcif"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1crn.bcif",
  );
  expect(
    (await call<{ document: { atomCount: number } }>(page, "app.state"))
      .document.atomCount,
  ).toBe(327);
  await molecularSurface(page);
  for (const shading of ["diffuse", "blinn-phong"]) {
    const frames = await views(page, info, "crambin-ses", shading);
    for (const frame of frames) {
      expect(frame.count).toBeGreaterThan(1000);
      expect(frame.count / frame.total).toBeGreaterThan(0.03);
      expect(frame.q10, JSON.stringify(frame)).toBeGreaterThan(0.2);
      expect(frame.q90 - frame.q10, JSON.stringify(frame)).toBeGreaterThan(
        0.08,
      );
    }
    // Protein projections differ, so compare foreground brightness distributions
    // with a looser bound than the rotationally symmetric reference sphere.
    const means = frames.map((frame) => frame.mean);
    expect(
      Math.max(...means) / Math.min(...means),
      JSON.stringify(frames),
    ).toBeLessThan(1.25);
  }
  expect(errors).toEqual([]);
});

function radialCube() {
  const count = 33;
  const values: string[] = [];
  for (let x = 0; x < count; x++)
    for (let y = 0; y < count; y++)
      for (let z = 0; z < count; z++) {
        const p = [x, y, z].map((v) => -4 + v * 0.25);
        values.push(
          Math.exp(-p.reduce((sum, v) => sum + v * v, 0) / 4).toExponential(8),
        );
      }
  return Buffer.from(
    `Mathematical radial scalar field\nLighting reference, not a quantum chemistry result\n1 -4 -4 -4\n33 0.25 0 0\n33 0 0.25 0\n33 0 0 0.25\n6 6 0 0 0\n${values.join(" ")}\n`,
  );
}

test("ray-cast sphere lighting shares balanced view behavior without generating a mesh", async ({
  page,
}, info) => {
  const errors = await ready(page);
  await open(page, "lighting-radial.cube", radialCube());
  const { items } = await call<{ items: Array<{ id: string }> }>(
    page,
    "fields.list",
  );
  await call(page, "scene.set", {
    positiveColor: neutralColor,
    negativeColor: neutralColor,
    isovalue: 0.25,
    opacity: 1,
    ambientOcclusion: { enabled: false },
  });
  await complete(
    page,
    await call(page, "field.preview", {
      fieldId: items[0].id,
      mode: "raycast",
      resolution: 48,
    }),
  );
  await call(page, "camera.fit");
  for (const shading of ["diffuse", "blinn-phong"])
    balancedSphere(await views(page, info, "sphere-raycast", shading));
  expect(
    (await call<{ document: { surfaceCount: number } }>(page, "app.state"))
      .document.surfaceCount,
  ).toBe(0);
  expect(errors).toEqual([]);
});
