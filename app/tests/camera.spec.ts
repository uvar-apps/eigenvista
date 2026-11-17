// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { scenePixels } from "./scenePixels";
import { test, expect, type Page } from "@playwright/test";

type CameraProbe = Window & {
  cameraProbe: { draws: number; canvasPointerDowns: number };
};

async function ready(page: Page) {
  await page.addInitScript(() => {
    const probe = ((window as unknown as CameraProbe).cameraProbe = {
      draws: 0,
      canvasPointerDowns: 0,
    });
    const prototype = WebGL2RenderingContext.prototype as unknown as Record<
      string,
      (...args: unknown[]) => void
    >;
    for (const name of [
      "drawElements",
      "drawArrays",
      "drawElementsInstanced",
      "drawArraysInstanced",
    ]) {
      const original = prototype[name];
      prototype[name] = function (this: WebGL2RenderingContext, ...args) {
        probe.draws++;
        return Reflect.apply(original, this, args);
      };
    }
    document.addEventListener("pointerdown", (event) => {
      if (event.target instanceof HTMLCanvasElement) probe.canvasPointerDowns++;
    });
  });
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await settled(page);
}

async function settled(page: Page) {
  await page.evaluate(async () => {
    let previous = -1;
    let stable = 0;
    for (let frame = 0; frame < 240; frame++) {
      await new Promise(requestAnimationFrame);
      const draws = (window as unknown as CameraProbe).cameraProbe.draws;
      stable = draws === previous ? stable + 1 : 0;
      previous = draws;
      if (stable === 4) return;
    }
    throw new Error("Camera did not settle within 240 animation frames");
  });
}

async function pixels(page: Page) {
  const { colorful, checksum } = await scenePixels(page);
  return { colorful, checksum };
}

async function zoom(
  page: Page,
  direction: "in" | "out",
  action: () => Promise<void>,
) {
  await settled(page);
  const before = await pixels(page);
  const draws = await page.evaluate(
    () => (window as unknown as CameraProbe).cameraProbe.draws,
  );
  await action();
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as CameraProbe).cameraProbe.draws),
    )
    .toBeGreaterThan(draws);
  await settled(page);
  const after = await pixels(page);
  expect(after.checksum).not.toBe(before.checksum);
  expect(after.colorful).toBeGreaterThan(250);
  if (direction === "in")
    expect(after.colorful).toBeGreaterThan(before.colorful * 1.03);
  else expect(after.colorful).toBeLessThan(before.colorful * 0.97);
}

for (const mode of ["mesh", "raycast", "volume"]) {
  test(`${mode} wheel zoom redraws without a click, with keyboard buttons and middle-drag alternatives`, async ({
    page,
  }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await ready(page);
    if (mode !== "mesh")
      await page.getByLabel("Rendering mode").selectOption(mode);
    await settled(page);
    const canvas = (await page.locator("canvas").boundingBox())!;
    const x = canvas.x + canvas.width * 0.5;
    const y = canvas.y + canvas.height * 0.5;
    await page.mouse.move(x, y);
    await zoom(page, "in", () => page.mouse.wheel(0, -120));
    await zoom(page, "out", () => page.mouse.wheel(0, 120));
    expect(
      await page.evaluate(
        () => (window as unknown as CameraProbe).cameraProbe.canvasPointerDowns,
      ),
    ).toBe(0);
    await zoom(page, "in", async () => {
      await page.getByRole("button", { name: "Zoom in", exact: true }).focus();
      await page.keyboard.press("Enter");
    });
    await zoom(page, "out", async () => {
      await page.getByRole("button", { name: "Zoom out", exact: true }).focus();
      await page.keyboard.press("Space");
    });
    expect(
      await page.evaluate(
        () => (window as unknown as CameraProbe).cameraProbe.canvasPointerDowns,
      ),
    ).toBe(0);
    for (const [direction, delta] of [
      ["in", -80],
      ["out", 80],
    ] as const) {
      await zoom(page, direction, async () => {
        await page.mouse.move(x, y);
        await page.mouse.down({ button: "middle" });
        await page.mouse.move(x, y + delta, { steps: 3 });
        await page.mouse.up({ button: "middle" });
      });
    }
    await expect(page.getByRole("alert")).toHaveCount(0);
    await page.screenshot({
      path: `../artifacts/camera-${mode}-${testInfo.project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}

test("mobile zoom buttons fit the viewport and respond to activation", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await ready(page);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("button", { name: "Fit scene", exact: true }).click();
    await settled(page);
    const layout = await page.locator(".viewport-tools").evaluate((toolbar) => {
      const controls = Array.from(
        toolbar.querySelectorAll('button, input[type="color"]'),
        (control) => {
          const box = control.getBoundingClientRect();
          return {
            name: control.getAttribute("aria-label"),
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          };
        },
      );
      return {
        controls,
        viewport: window.innerWidth,
        pageWidth: document.documentElement.scrollWidth,
      };
    });
    expect(layout.pageWidth).toBeLessThanOrEqual(layout.viewport);
    expect(layout.controls.map((control) => control.name)).toEqual([
      "Background color",
      "Reset background color",
      "Zoom in",
      "Zoom out",
      "Fit scene",
      "Reset view",
      "Export image",
      "Export image with transparent background",
    ]);
    for (const [i, control] of layout.controls.entries()) {
      expect(control.left).toBeGreaterThanOrEqual(0);
      expect(control.right).toBeLessThanOrEqual(width);
      expect(control.top).toBeGreaterThanOrEqual(0);
      expect(control.bottom).toBeLessThanOrEqual(844);
      // Extra controls may wrap at 320px; every pair must remain separate.
      for (const previous of layout.controls.slice(0, i)) {
        expect(
          control.left >= previous.right ||
            control.right <= previous.left ||
            control.top >= previous.bottom ||
            control.bottom <= previous.top,
        ).toBe(true);
      }
    }
    await zoom(page, "in", () =>
      page.getByRole("button", { name: "Zoom in", exact: true }).click(),
    );
    await zoom(page, "out", () =>
      page.getByRole("button", { name: "Zoom out", exact: true }).click(),
    );
    await page.screenshot({
      path: `../artifacts/camera-mobile-${width}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});
