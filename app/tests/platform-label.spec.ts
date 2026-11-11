import { test, expect } from "@playwright/test";
import { installNativeIpc } from "./nativeIpc";

for (const native of [false, true]) {
  test(`runtime badge describes ${native ? "Tauri" : "browser"} without a platform support claim`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    if (native) await installNativeIpc(page);
    await page.addInitScript((native) => {
      (globalThis as unknown as { isTauri: boolean }).isTauri = native;
    }, native);
    await page.goto("/");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    await expect(page.locator("footer .runtime")).toHaveText(
      native ? "Rust / Native (Tauri)" : "Rust / WebAssembly",
    );
    await expect(page.getByRole("alert")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
