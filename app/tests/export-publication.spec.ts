import { test, expect, type Page } from "@playwright/test";
import { installNativeIpc, type NativeIpcWindow } from "./nativeIpc";

async function native(page: Page) {
  await installNativeIpc(page, { controlEnabled: true });
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.waitForFunction(
    () => (window as unknown as NativeIpcWindow).nativeIpc.controlReady,
  );
}
async function request<T>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
) {
  return page.evaluate(
    ({ method, params }) =>
      (window as unknown as NativeIpcWindow).nativeIpc.requestControl(
        method,
        params,
      ),
    { method, params },
  ) as Promise<T>;
}

test("native publication preserves default refusal and explicitly forwards replacement for documents, PNG and CSV", async ({
  page,
}) => {
  await native(page);
  const cap = await request<{
    files: { overwrite: boolean };
    methods: Array<{
      method: string;
      inputSchema: { properties: Record<string, unknown> };
    }>;
  }>(page, "app.capabilities");
  expect(cap.files.overwrite).toBe(true);
  for (const method of ["document.save", "image.export", "table.export"])
    expect(
      cap.methods.find((m) => m.method === method)!.inputSchema.properties
        .overwrite,
    ).toEqual({ type: "boolean" });
  for (const overwrite of [undefined, true]) {
    const params = overwrite === undefined ? {} : { overwrite };
    await request(page, "document.save", {
      path: "/exports/document.eigenvista",
      ...params,
    });
    await request(page, "image.export", {
      path: "/exports/figure.png",
      transparent: true,
      ...params,
    });
    await request(page, "table.export", {
      kind: "measurements",
      path: "/exports/measurements.csv",
      ...params,
    });
  }
  const probe = await page.evaluate(() => ({
    saves: (window as unknown as NativeIpcWindow).nativeIpc.controlSaves,
    exports: (window as unknown as NativeIpcWindow).nativeIpc.controlExports,
  }));
  expect(probe.saves.map((s) => s.overwrite)).toEqual([false, true]);
  expect(probe.exports.map((s) => [s.command, s.overwrite])).toEqual([
    ["control_write_image", false],
    ["control_write_csv", false],
    ["control_write_image", true],
    ["control_write_csv", true],
  ]);
  for (const save of probe.saves)
    expect(save.bytes.slice(0, 4)).toEqual([80, 75, 3, 4]);
  for (const record of probe.exports.filter(
    (r) => r.command === "control_write_image",
  ))
    expect(record.dataUrl).toMatch(/^data:image\/png;base64,/);
  for (const record of probe.exports.filter(
    (r) => r.command === "control_write_csv",
  ))
    expect(record.text).toContain("label");
});

test("replacement requires a boolean and never turns browser byte exports into file replacement", async ({
  page,
}) => {
  await native(page);
  for (const [method, params] of [
    ["document.save", { path: "/exports/document.eigenvista" }],
    ["image.export", { path: "/exports/image.png" }],
    ["table.export", { kind: "measurements", path: "/exports/table.csv" }],
  ] as const)
    await expect(
      request(page, method, { ...params, overwrite: "true" }),
    ).rejects.toThrow();
  // Use a fresh ordinary context, without the native IPC init script.
  const browser = await page.context().browser()!.newPage();
  try {
    await browser.goto(new URL("/?control=1", page.url()).href);
    await expect(browser.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const state = await browser.evaluate(async () => {
      const c = (
        window as unknown as {
          eigenvistaControl: {
            request(method: string, params?: unknown): Promise<unknown>;
          };
        }
      ).eigenvistaControl;
      const cap = await c.request("app.capabilities");
      const errors = [];
      for (const method of ["document.save", "image.export", "table.export"]) {
        try {
          await c.request(method, {
            overwrite: true,
            ...(method === "table.export" ? { kind: "measurements" } : {}),
          });
          errors.push(null);
        } catch (error) {
          errors.push(String(error));
        }
      }
      return { cap, errors };
    });
    expect(
      (state.cap as { files: { overwrite: boolean } }).files.overwrite,
    ).toBe(false);
    for (const error of state.errors)
      expect(error).toContain("Replacement applies only to native");
  } finally {
    await browser.close();
  }
});
