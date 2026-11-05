import { test, expect } from "@playwright/test";

test("the WASM decoder rejects malformed column references without wrapping indices", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const result = await page.evaluate(async () => {
    const wasmUrl = "/src/wasm/eigenvista_wasm.js";
    const zipUrl = "/node_modules/three/examples/jsm/libs/fflate.module.js";
    const core = await import(/* @vite-ignore */ wasmUrl);
    const { unzipSync, zipSync } = await import(/* @vite-ignore */ zipUrl);
    await core.default();
    const document = JSON.parse(core.example(false));
    document.surfaces = [];
    const bytes = core.encode(JSON.stringify(document));
    const valid = JSON.parse(core.decode(bytes));
    const attempts = ["4294967296", "4294967297", "18446744073709551615", "-1", "0.5", '"0"', "99"];
    const rejected = attempts.map((literal) => {
      const entries = unzipSync(bytes);
      const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
      manifest.document.basis[0].center.$index = "test-index";
      const json = JSON.stringify(manifest).replace('"test-index"', literal);
      entries["manifest.json"] = new TextEncoder().encode(json);
      try { core.decode(zipSync(entries)); return false; }
      catch { return true; }
    });
    const rejectedPairs = [[4294967297, 4294967296], [0, 0]].map(([first, second]) => {
      const entries = unzipSync(bytes);
      const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
      manifest.document.basis[0].center.$index = first;
      manifest.document.basis[1].center.$index = second;
      entries["manifest.json"] = new TextEncoder().encode(JSON.stringify(manifest));
      try { core.decode(zipSync(entries)); return false; }
      catch { return true; }
    });
    return { exact: JSON.stringify(valid) === JSON.stringify(document), rejected, rejectedPairs };
  });
  expect(result.exact).toBe(true);
  expect(result.rejected).toEqual(Array(7).fill(true));
  expect(result.rejectedPairs).toEqual([true, true]);
});
