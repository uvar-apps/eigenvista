import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const shadersDir = path.resolve("../app/shaders");

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
}

async function pixels(page: Page) {
  return page.locator("canvas").evaluate(async (canvas) => {
    const gl = (canvas as HTMLCanvasElement).getContext("webgl2")!;
    const data = new Uint8Array(
      gl.drawingBufferWidth * gl.drawingBufferHeight * 4,
    );
    const read = () => {
      gl.readPixels(
        0,
        0,
        gl.drawingBufferWidth,
        gl.drawingBufferHeight,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        data,
      );
      let colorful = 0,
        checksum = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (
          Math.max(data[i], data[i + 1], data[i + 2]) -
            Math.min(data[i], data[i + 1], data[i + 2]) >
          30
        )
          colorful++;
        checksum =
          (checksum + data[i] * ((i % 97) + 1) + data[i + 1]) % 2147483647;
      }
      return { colorful, checksum };
    };
    // The scene draws on an animation loop, so a single read can land before the
    // first frame reaches the buffer. Poll until a frame is present; a genuinely
    // blank canvas still reports 0 and fails the caller's threshold.
    let last = read();
    for (let attempt = 0; attempt < 60 && last.colorful === 0; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      last = read();
    }
    return last;
  });
}

async function loadShaderFiles(
  page: Page,
  vertex: string,
  fragment: string,
  params?: string,
) {
  await page.locator('[data-shader-input="vertex"]').setInputFiles({
    name: path.basename(vertex),
    mimeType: "text/plain",
    buffer: fs.readFileSync(vertex),
  });
  await page.locator('[data-shader-input="fragment"]').setInputFiles({
    name: path.basename(fragment),
    mimeType: "text/plain",
    buffer: fs.readFileSync(fragment),
  });
  if (params) {
    await page.locator('[data-shader-input="params"]').setInputFiles({
      name: path.basename(params),
      mimeType: "text/plain",
      buffer: fs.readFileSync(params),
    });
  }
}

test("custom surface shader applies with live uniforms and parameter files", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await ready(page);
  const base = await pixels(page);
  expect(base.colorful).toBeGreaterThan(500);

  await loadShaderFiles(
    page,
    path.join(shadersDir, "surface-lambert.vert"),
    path.join(shadersDir, "surface-lambert.frag"),
    path.join(shadersDir, "surface-lambert.params"),
  );
  await expect(page.getByLabel("saturation")).toHaveValue("1");
  await expect(page.getByLabel("lightDir[0]")).toHaveValue("0");
  await page.getByRole("button", { name: "Apply shader" }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(base.checksum);
  const applied = await pixels(page);
  expect(applied.colorful).toBeGreaterThan(300);
  await page.screenshot({ path: "../artifacts/custom-shader-lambert.png" });

  await page.getByLabel("saturation").fill("0");
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(applied.checksum);
  await page.screenshot({ path: "../artifacts/custom-shader-saturation0.png" });

  await loadShaderFiles(
    page,
    path.join(shadersDir, "surface-phong.vert"),
    path.join(shadersDir, "surface-phong.frag"),
    path.join(shadersDir, "surface-phong.params"),
  );
  await expect(page.getByLabel("shininess")).toHaveValue("64");
  await page.getByRole("button", { name: "Apply shader" }).click();
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(base.checksum);
  await page.screenshot({ path: "../artifacts/custom-shader-phong.png" });

  await page.getByLabel("specularScale").fill("0");
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(base.checksum);

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save parameters" }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toBe("surface-shader.params");
  const savedPath = path.resolve("../artifacts/custom-shader.params");
  await saved.saveAs(savedPath);
  const text = fs.readFileSync(savedPath, "utf8");
  expect(text).toContain("float specularScale");
  expect(text).toContain("float shininess\t64");

  await page.getByRole("button", { name: "Clear shader" }).click();
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .toBe(base.checksum);
  await expect(page.locator(".shader-status")).toContainText("Cleared");
  expect(errors).toEqual([]);
});

test("classic clip/fog shaders compile and GLSL errors are shown", async ({
  page,
}) => {
  await ready(page);
  await loadShaderFiles(
    page,
    path.join(shadersDir, "surface-clip.vert"),
    path.join(shadersDir, "surface-clip.frag"),
    path.join(shadersDir, "surface-clip.params"),
  );
  await page.getByRole("button", { name: "Apply shader" }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const ok = await pixels(page);
  expect(ok.colorful).toBeGreaterThan(300);

  await page.locator('[data-shader-input="vertex"]').setInputFiles({
    name: "broken.vert",
    mimeType: "text/plain",
    buffer: Buffer.from(
      "varying vec3 n;\nvoid main(){\n  gl_Position = ftransform();\n  n = gl_NormalMatrix * gl_Normal;\n  n = notAFunction();\n}\n",
    ),
  });
  await page.getByRole("button", { name: "Apply shader" }).click();
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible({ timeout: 10000 });
  const text = (await alert.innerText()).toLowerCase();
  expect(text).toMatch(/error|not compiled|not linked|shader/);
  await page.screenshot({
    path: "../artifacts/custom-shader-compile-error.png",
  });
});
test("a malformed parameter file is rejected instead of pushing NaN into a uniform", async ({
  page,
}) => {
  await ready(page);
  await loadShaderFiles(
    page,
    path.join(shadersDir, "surface-lambert.vert"),
    path.join(shadersDir, "surface-lambert.frag"),
  );
  const before = await page.getByLabel("saturation").inputValue();
  await page.locator('[data-shader-input="params"]').setInputFiles({
    name: "broken.params",
    mimeType: "text/plain",
    buffer: Buffer.from("# deliberately malformed\nfloat saturation nonsense\n"),
  });
  await expect(page.locator(".shader-log")).toContainText("non-numeric value");
  await expect(page.locator(".shader-log")).toContainText("line 2");
  // The previously valid value survives instead of becoming NaN.
  await expect(page.getByLabel("saturation")).toHaveValue(before);
  // An unsupported kind is reported rather than silently dropped.
  await page.locator('[data-shader-input="params"]').setInputFiles({
    name: "unknown-kind.params",
    mimeType: "text/plain",
    buffer: Buffer.from("mat3 tint 1 0 0 0 1 0 0 0 1\n"),
  });
  await expect(page.locator(".shader-log")).toContainText(
    'Unsupported parameter kind "mat3"',
  );
  await page.screenshot({ path: "../artifacts/malformed-params.png" });
});
