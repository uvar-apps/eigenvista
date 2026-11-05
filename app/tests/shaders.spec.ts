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

test("parameter type and arity failures retain the applied shader and document", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await loadShaderFiles(page, path.join(shadersDir, "surface-lambert.vert"), path.join(shadersDir, "surface-lambert.frag"), path.join(shadersDir, "surface-lambert.params"));
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  const before = await pixels(page);
  for (const [text, message] of [
    ["float saturation 0\nfloat lightDir 1\n", "expects vec3"],
    ["float saturation 0\nvec3 lightDir 1 0\n", "expects 3 components"],
    ["vec4 lightDir 1 0 0 1\n", "expects vec3"],
    ["bool lightDir true\n", "expects vec3"],
  ]) {
    await page.locator('[data-shader-input="params"]').setInputFiles({ name: "mismatch.params", mimeType: "text/plain", buffer: Buffer.from(text) });
    await expect(page.locator(".shader-log")).toContainText(message);
    await expect(page.getByLabel("lightDir[0]", { exact: true })).toHaveValue("0");
    await expect(page.getByLabel("saturation", { exact: true })).toHaveValue("1");
    await expect(page.locator("h1")).toHaveText("EigenVista");
    expect((await pixels(page)).checksum).toBe(before.checksum);
  }
  await page.screenshot({ path: "../artifacts/shader-type-rejection-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "../artifacts/shader-type-rejection-mobile.png", fullPage: true });
  await page.locator('[data-shader-input="params"]').setInputFiles({ name: "valid.params", mimeType: "text/plain", buffer: Buffer.from("vec3 lightDir 1 0 0\nfloat saturation 0.5\n") });
  await expect(page.locator(".shader-log")).toHaveCount(0);
  await expect(page.getByLabel("lightDir[0]", { exact: true })).toHaveValue("1");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save document" }).click();
  const saved = await download;
  expect(saved.suggestedFilename()).toMatch(/\.eigenvista$/);
  expect(errors).toEqual([]);
});

test("changing a shader uniform kind resets its editor value without breaking the applied shader", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "simple.vert", mimeType: "text/plain", buffer: Buffer.from("void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}") });
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "scalar.frag", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_FragColor=vec4(amount,0.2,0.3,1.);}") });
  await page.getByLabel("amount", { exact: true }).fill("0.8");
  const original = await pixels(page);
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await expect.poll(async () => (await pixels(page)).checksum).not.toBe(original.checksum);
  const before = await pixels(page);
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "vector.frag", mimeType: "text/plain", buffer: Buffer.from("uniform vec3 amount;\nvoid main(){gl_FragColor=vec4(amount,1.);}") });
  await expect(page.getByLabel("amount[0]", { exact: true })).toHaveValue("0");
  await page.getByLabel("amount[0]", { exact: true }).fill("1");
  expect((await pixels(page)).checksum).toBe(before.checksum);
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect.poll(async () => (await pixels(page)).checksum).not.toBe(before.checksum);
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "conflict.vert", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}") });
  await expect(page.locator(".shader-log")).toContainText("conflicting shader types");
  await expect(page.getByRole("button", { name: "simple.vert", exact: true })).toBeVisible();
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "scalar-again.frag", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_FragColor=vec4(amount,0.2,0.3,1.);}") });
  await expect(page.getByLabel("amount", { exact: true })).toHaveValue("0");
  await page.getByRole("button", { name: "Clear shader", exact: true }).click();
  await expect(page.locator(".shader-log")).toHaveCount(0);
  await expect(page.getByLabel("amount", { exact: true })).toHaveCount(0);
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "shared.vert", mimeType: "text/plain", buffer: Buffer.from("uniform vec3 amount;\nvoid main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}") });
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "shared.frag", mimeType: "text/plain", buffer: Buffer.from("uniform vec3 amount;\nvoid main(){gl_FragColor=vec4(amount,1.);}") });
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "changed-shared.frag", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_FragColor=vec4(amount,0.2,0.3,1.);}") });
  await expect(page.locator(".shader-log")).toContainText("conflicting shader types");
  await page.getByRole("button", { name: "Clear shader", exact: true }).click();
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "new-shared.vert", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}") });
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "new-shared.frag", mimeType: "text/plain", buffer: Buffer.from("uniform float amount;\nvoid main(){gl_FragColor=vec4(amount,0.2,0.3,1.);}") });
  await page.getByLabel("amount", { exact: true }).fill("0.5");
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-log")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("out-of-order shader reads compose and Clear discards pending reads", async ({ page }) => {
  await page.addInitScript(() => {
    const state = globalThis as unknown as {
      releaseShaderRead: () => void;
      pendingShaderRead: string;
      finishedShaderRead: string;
    };
    const read = File.prototype.text;
    File.prototype.text = async function () {
      const source = await read.call(this);
      if (this.name === "delayed.vert" || this.name === "cleared.vert") {
        state.pendingShaderRead = this.name;
        await new Promise<void>((resolve) => { state.releaseShaderRead = resolve; });
        state.finishedShaderRead = this.name;
      }
      return source;
    };
  });
  await ready(page);
  const vertex = Buffer.from("void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}");
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "delayed.vert", mimeType: "text/plain", buffer: vertex });
  await page.locator('[data-shader-input="fragment"]').setInputFiles({ name: "fast.frag", mimeType: "text/plain", buffer: Buffer.from("void main(){gl_FragColor=vec4(1.,0.,0.,1.);}") });
  await expect(page.getByRole("button", { name: "fast.frag", exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { pendingShaderRead: string }).pendingShaderRead)).toBe("delayed.vert");
  await page.evaluate(() => (globalThis as unknown as { releaseShaderRead: () => void }).releaseShaderRead());
  await expect(page.getByRole("button", { name: "delayed.vert", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await page.locator('[data-shader-input="vertex"]').setInputFiles({ name: "cleared.vert", mimeType: "text/plain", buffer: vertex });
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { pendingShaderRead: string }).pendingShaderRead)).toBe("cleared.vert");
  await page.getByRole("button", { name: "Clear shader", exact: true }).click();
  await page.evaluate(() => (globalThis as unknown as { releaseShaderRead: () => void }).releaseShaderRead());
  await expect.poll(() => page.evaluate(() => (globalThis as unknown as { finishedShaderRead: string }).finishedShaderRead)).toBe("cleared.vert");
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.getByRole("button", { name: "Apply shader", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "delayed.vert", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "cleared.vert", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "fast.frag", exact: true })).toHaveCount(0);
  await expect(page.locator(".shader-log")).toHaveCount(0);
});

for (const outcome of ["saved", "cancelled", "failed"] as const) {
  test(`native parameter export uses its text command and handles ${outcome}`, async ({ page }) => {
    await page.addInitScript((outcome) => {
      const state = globalThis as unknown as { isTauri: boolean; __TAURI_INTERNALS__: unknown; parameterExports: { command: string; args: { text: string } }[] };
      state.isTauri = true;
      state.parameterExports = [];
      state.__TAURI_INTERNALS__ = {
        invoke: async (command: string, args: { text: string }) => {
          if (command !== "save_shader_parameters") throw new Error(`Unexpected native command: ${command}`);
          state.parameterExports.push({ command, args });
          if (outcome === "failed") throw new Error("Deliberate parameter write failure");
          return outcome === "saved";
        },
      };
    }, outcome);
    await ready(page);
    await loadShaderFiles(page, path.join(shadersDir, "surface-lambert.vert"), path.join(shadersDir, "surface-lambert.frag"), path.join(shadersDir, "surface-lambert.params"));
    const status = await page.locator("footer [role=status]").innerText();
    await page.getByRole("button", { name: "Save parameters", exact: true }).click();
    if (outcome === "failed") await expect(page.locator(".shader-log")).toContainText("Deliberate parameter write failure");
    else await expect(page.locator(".shader-log")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => (globalThis as unknown as { parameterExports: unknown[] }).parameterExports.length)).toBe(1);
    const saved = await page.evaluate(() => (globalThis as unknown as { parameterExports: { args: { text: string } }[] }).parameterExports[0]);
    expect(saved.args.text).toContain("vec3 lightDir\t0 0 1");
    const roundtrip = await page.evaluate(async (text) => {
      const url = "/src/shaderTools.ts";
      const { parseParams, serializeParams } = await import(/* @vite-ignore */ url);
      const defs = [{ name: "lightDir", kind: "vec3" }, { name: "enabled", kind: "bool" }, { name: "count", kind: "int" }];
      const values = { ...parseParams(text), enabled: true, count: 3 };
      return parseParams(serializeParams(defs, values), defs);
    }, saved.args.text);
    expect(roundtrip).toEqual({ lightDir: [0, 0, 1], enabled: true, count: 3 });
    await expect(page.locator("footer [role=status]")).toHaveText(status);
  });
}
