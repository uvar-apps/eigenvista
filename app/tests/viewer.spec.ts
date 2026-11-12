import { scenePixels, settleScene, trackSceneDraws } from "./scenePixels";
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
}
async function pixels(page: Page) {
  const { colorful, checksum, total } = await scenePixels(page);
  return { colorful, checksum, total };
}
test("desktop scene, orbit interaction, raycast and volume are nonblank", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  await trackSceneDraws(page);
  await ready(page);
  await settleScene(page);
  const initial = await pixels(page);
  expect(initial.colorful).toBeGreaterThan(initial.total * 0.01);
  await page.screenshot({ path: "../artifacts/desktop.png" });
  const canvas = await page.locator("canvas").boundingBox();
  await page.mouse.move(
    canvas!.x + canvas!.width * 0.4,
    canvas!.y + canvas!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    canvas!.x + canvas!.width * 0.7,
    canvas!.y + canvas!.height * 0.6,
    { steps: 15 },
  );
  await page.mouse.up();
  // Finish the real gesture and Fit damping while mesh rendering is still
  // active. Entering raycast mid-damping otherwise makes every expensive
  // software-GL frame compete with the compositor pixel capture.
  await settleScene(page);
  expect((await pixels(page)).checksum).not.toBe(initial.checksum);
  await page.getByRole("button", { name: "Fit scene", exact: true }).click();
  await settleScene(page);
  for (const mode of ["raycast", "volume"]) {
    const previousDraws = await page.evaluate(
      () => (window as unknown as { sceneDraws: number }).sceneDraws,
    );
    await page.getByLabel("Rendering mode").selectOption(mode);
    await expect(page.locator(".scene-label")).toContainText(
      mode === "raycast" ? "Sampled raycast" : "Volume preview",
    );
    await page.waitForFunction(
      (before) =>
        (window as unknown as { sceneDraws: number }).sceneDraws > before,
      previousDraws,
      { timeout: 20000 },
    );
    // Complete one actual compositor capture before asserting. A screenshot
    // callback that has not returned is not a failed nonblank-pixel predicate.
    const rendered = await pixels(page);
    expect(rendered.colorful).toBeGreaterThan(500);
    await page.screenshot({ path: `../artifacts/${mode}.png` });
  }
  expect(errors).toEqual([]);
});
test("surface shading switches mesh and raycast lighting", async ({ page }) => {
  await ready(page);
  const diffuse = await pixels(page);
  expect(diffuse.colorful).toBeGreaterThan(500);
  await page.getByLabel("Surface shading").selectOption("blinn-phong");
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(diffuse.checksum);
  const phong = await pixels(page);
  expect(phong.colorful).toBeGreaterThan(500);
  await page.screenshot({ path: "../artifacts/surface-blinn-phong.png" });
  await page.getByLabel("Rendering mode").selectOption("raycast");
  await expect(page.locator(".scene-label")).toContainText("Sampled raycast");
  const raycastPhong = await pixels(page);
  expect(raycastPhong.colorful).toBeGreaterThan(500);
  await page.screenshot({
    path: "../artifacts/raycast-blinn-phong.png",
  });
  await page.getByLabel("Surface shading").selectOption("diffuse");
  await expect
    .poll(async () => (await pixels(page)).checksum, { timeout: 10000 })
    .not.toBe(raycastPhong.checksum);
  expect((await pixels(page)).colorful).toBeGreaterThan(500);
});
test("portable save/reopen retains both orbital signs without calculation", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("slider", { name: "Opacity" }).press("End");
  await page.getByRole("slider", { name: "Opacity" }).press("ArrowLeft");
  await expect(page.locator("output")).toHaveText("99%");
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const saved = await download;
  const filename = path.resolve("../artifacts/roundtrip.eigenvista");
  await saved.saveAs(filename);
  await page
    .getByRole("button", { name: /Delete antibonding/ })
    .first()
    .click();
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("Open molecular file").setInputFiles(filename);
  await expect(page.locator("footer [role=status]")).toContainText(
    "saved geometry restored",
  );
  await expect(
    page.getByRole("button", { name: /Delete antibonding/ }),
  ).toHaveCount(2);
  await expect(
    page.getByLabel("Rendering mode").locator("option[value=raycast]"),
  ).toHaveJSProperty("disabled", false);
  await expect(page.locator("output")).toHaveText("99%");
  expect((await pixels(page)).colorful).toBeGreaterThan(500);
});
test("cancelling a worker retains the scene and a fresh worker can run", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const url = "/src/science.ts";
    const science = await import(/* @vite-ignore */ url);
    const doc = await science.request("example", { openShell: false });
    const pending = science.request("generate", {
      doc,
      field: "total",
      resolution: 48,
      iso: 0.08,
    });
    science.cancel();
    let cancelled = false;
    try {
      await pending;
    } catch (error) {
      cancelled = String(error).includes("cancelled");
    }
    const fresh = await science.request("example", { openShell: true });
    return { cancelled, id: fresh.id };
  });
  expect(result).toEqual({ cancelled: true, id: "analytic-open-shell-v1" });
  await expect(
    page.getByRole("button", { name: /Delete antibonding/ }),
  ).toHaveCount(2);
  expect((await pixels(page)).colorful).toBeGreaterThan(500);
});
test("native chemistry reference opens cached orbital and density meshes", async ({
  page,
}) => {
  await ready(page);
  page.on("dialog", (d) => d.accept());
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(
      path.resolve("../artifacts/references/water-rhf-ccpvdz.eigenvista"),
    );
  await expect(page.locator("footer [role=status]")).toContainText(
    "saved geometry restored",
  );
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Delete spatial-5/ }),
  ).toHaveCount(2);
  await expect(page.getByRole("button", { name: /Delete total/ })).toHaveCount(
    1,
  );
  await expect(
    page.getByLabel("Rendering mode").locator("option[value=raycast]"),
  ).toHaveJSProperty("disabled", false);
  await expect
    .poll(async () => (await pixels(page)).colorful)
    .toBeGreaterThan(500);
  await page.screenshot({ path: "../artifacts/water-reference.png" });
});
test("explicit density matrix renders and invalid import keeps current document", async ({
  page,
}) => {
  await ready(page);
  await page
    .getByRole("button", { name: "Total electron density total" })
    .click();
  await page.getByRole("button", { name: "Generate surfaces" }).click();
  await expect(page.getByRole("button", { name: /Delete total/ })).toHaveCount(
    1,
  );
  page.on("dialog", (d) => d.accept());
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "broken.xyz",
    mimeType: "text/plain",
    buffer: Buffer.from("2\nbad\nH 0 0 0\n"),
  });
  await expect(page.getByRole("alert")).toContainText("Truncated XYZ");
  await expect(page.getByRole("button", { name: /Delete total/ })).toHaveCount(
    1,
  );
});
test("mobile layout and Rust WASM analytic reference", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBeTruthy();
  await expect
    .poll(async () => (await pixels(page)).colorful)
    .toBeGreaterThan(300);
  await page.screenshot({ path: "../artifacts/mobile.png", fullPage: true });
  const value = await page.evaluate(async () => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    return core.point(core.example(true), "spin", 0.4, 0.1, 0.7);
  });
  const expected =
    0.75 * Math.pow(2 / Math.PI, 1.5) * Math.exp(-2 * (0.16 + 0.01 + 0.49));
  expect(Math.abs(value - expected)).toBeLessThan(1e-12);
});
test("cold start is clean and the first real edit marks unsaved changes", async ({
  page,
}) => {
  await ready(page);
  // The built-in example regenerates identically on every load, so generating its
  // starting surfaces must not leave the session marked as having unsaved edits.
  await expect(page.locator(".dirty")).toHaveCount(0);
  // A real user edit must mark the document unsaved again.
  await page.getByLabel("Isovalue").fill("0.05");
  await expect(page.locator(".dirty")).toHaveCount(1);
  // Loading a built-in example returns to a clean state.
  page.on("dialog", (d) => d.accept());
  await page.locator("details.examples > summary").click();
  await page.getByRole("button", { name: "Fractional open shell" }).click();
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expect(page.locator(".dirty")).toHaveCount(0);
});
test("a worker construction failure rejects the request instead of throwing synchronously", async ({
  page,
}) => {
  await page.goto("/");
  const result = await page.evaluate(async () => {
    const spec = "/src/science.ts?isolated=1";
    const mod = (await import(/* @vite-ignore */ spec)) as unknown as {
      cancel: () => void;
      request: (
        action: string,
        args: Record<string, unknown>,
      ) => Promise<unknown>;
    };
    const original = window.Worker;
    // Simulate a Worker that cannot be constructed (blocked CSP, exhausted
    // resource limit) so the failure path is exercised deterministically.
    window.Worker = function BrokenWorker() {
      throw new Error("worker construction blocked");
    } as unknown as typeof Worker;
    let synchronousThrow = false;
    let rejection = "";
    try {
      mod.cancel();
      const promise = mod.request("example", {});
      try {
        await promise;
      } catch (e) {
        rejection = String(e);
      }
    } catch {
      synchronousThrow = true;
    }
    window.Worker = original;
    return { synchronousThrow, rejection };
  });
  expect(result.synchronousThrow).toBe(false);
  expect(result.rejection).toContain("worker construction blocked");
});
test("clicking an instanced atom resolves its per-instance selection label", async ({
  page,
}) => {
  await page.goto("/");
  // A structure-only document has no surfaces to occlude the atoms. Atoms render
  // as a single InstancedMesh, so the label must come from the raycast
  // instanceId rather than a per-object userData.label.
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../fixtures/legacy/data/guanine.pdb"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened guanine.pdb",
    { timeout: 45000 },
  );
  // The scene draws on an animation loop, so wait until something is actually on
  // screen before clicking into it.
  await scenePixels(page).then(({ foreground12 }) => foreground12);
  await page.getByLabel("Fit scene").click();
  await page.waitForTimeout(400);
  const box = await page.locator("canvas").boundingBox();
  expect(box).not.toBeNull();
  const cx = box!.x + box!.width / 2;
  const cy = box!.y + box!.height / 2;
  // Scan a grid so the assertion does not depend on where the camera lands.
  let selected = "";
  outer: for (let dx = -160; dx <= 160 && !selected; dx += 10) {
    for (let dy = -160; dy <= 160 && !selected; dy += 10) {
      await page.mouse.click(cx + dx, cy + dy);
      const text = (await page.locator(".selection-status").innerText()).trim();
      if (/\|.*angstrom/.test(text)) selected = text;
    }
  }
  expect(selected.split("\n")[0]).toMatch(
    /^[A-Za-z]{1,2} \d+ \| -?\d+\.\d+, -?\d+\.\d+, -?\d+\.\d+ angstrom$/,
  );
});
