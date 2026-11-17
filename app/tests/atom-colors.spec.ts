// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { scenePixels } from "./scenePixels";
import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Playwright runs with the app directory as cwd, matching how the other specs
// resolve fixture paths relative to the repository root.
const tmp = path.resolve("../tmp");
fs.mkdirSync(tmp, { recursive: true });

async function ready(page: Page) {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
}

/**
 * Checksum of one rendered canvas frame. A palette change rewrites per-instance
 * atom colours, so the frame contents must change; a reset must restore them.
 */
async function frameChecksum(page: Page): Promise<number> {
  return (await scenePixels(page)).rgbChecksum;
}

/**
 * The scene draws on an animation loop, so a single read can land on a stale
 * frame. Poll until the predicate holds instead of trusting one sample.
 */
async function pollFor(
  page: Page,
  predicate: (sum: number) => boolean,
  timeoutMs = 8000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let last = await frameChecksum(page);
  while (Date.now() < deadline) {
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, 50));
    last = await frameChecksum(page);
  }
  return last;
}

function paletteFile(name: string, body: unknown): string {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, JSON.stringify(body));
  return file;
}

const colorsInput = 'input[aria-label="Atom colours file"]';

test("the built-in palette is reported when nothing is loaded", async ({
  page,
}) => {
  await ready(page);
  await expect(page.getByText("Built-in default (118 elements)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset to defaults" }),
  ).toHaveCount(0);
});

test("a partial palette file recolours atoms; reset restores", async ({
  page,
}) => {
  await ready(page);
  const before = await pollFor(page, (s) => s !== 0);
  expect(before).not.toBe(0);

  // The cold-start example is a hydrogen pair, so override hydrogen; every
  // other element must keep its default colour.
  const file = paletteFile("hydrogen-pink.json", {
    format: "eigenvista-atom-colors",
    version: 1,
    colors: [{ z: 1, symbol: "H", color: "#ff00aa" }],
  });
  await page.setInputFiles(colorsInput, file);
  await expect(
    page.getByText(/Overridden by hydrogen-pink\.json/),
  ).toBeVisible();
  const after = await pollFor(page, (s) => s !== before);
  expect(after).not.toBe(before);

  await page.getByRole("button", { name: "Reset to defaults" }).click();
  await expect(page.getByText("Built-in default (118 elements)")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reset to defaults" }),
  ).toHaveCount(0);
  const restored = await pollFor(page, (s) => s === before);
  expect(restored).toBe(before);
});

test("an invalid file is rejected and leaves the palette untouched", async ({
  page,
}) => {
  await ready(page);
  const before = await pollFor(page, (s) => s !== 0);

  const bad = paletteFile("bad.json", {
    format: "eigenvista-atom-colors",
    version: 1,
    colors: [{ z: 6, color: "hotpink" }],
  });
  await page.setInputFiles(colorsInput, bad);
  await expect(page.getByRole("alert")).toContainText(
    "not a #rrggbb hex triplet",
  );
  await expect(page.getByText("Built-in default (118 elements)")).toBeVisible();
  // Give any stray re-tint a chance to land, then confirm nothing changed.
  const unchanged = await pollFor(page, (s) => s === before, 2000);
  expect(unchanged).toBe(before);
});

test("parseAtomColors rejects every documented failure in the browser", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  const results = await page.evaluate(async () => {
    // Runtime-only specifier: the dev server serves and transforms the module,
    // and a variable keeps tsc from trying to resolve the app path itself.
    const specifier = "/src/atomColors.ts";
    const mod = (await import(
      /* @vite-ignore */ specifier
    )) as typeof import("../src/atomColors");
    const wrap = (text: string) => {
      try {
        mod.parseAtomColors(text, "case");
        return null;
      } catch (error) {
        return String(error);
      }
    };
    const ok = (colors: unknown) =>
      JSON.stringify({
        format: "eigenvista-atom-colors",
        version: 1,
        colors,
      });
    return {
      valid: wrap(ok([{ z: 1, symbol: "H", color: "#ffffff" }])),
      partial: (() => {
        const p = mod.parseAtomColors(
          ok([{ z: 8, color: "#0000ff" }]),
          "partial",
        );
        return p.size;
      })(),
      resolvesOverride: mod.resolveAtomColor(8, new Map([[8, "#123456"]])),
      resolvesDefault: mod.resolveAtomColor(8),
      resolvesUnknown: mod.resolveAtomColor(999),
      badJson: wrap("{not json"),
      badFormat: wrap(
        JSON.stringify({ format: "other", version: 1, colors: [] }),
      ),
      badVersion: wrap(
        JSON.stringify({
          format: "eigenvista-atom-colors",
          version: 2,
          colors: [],
        }),
      ),
      emptyColors: wrap(ok([])),
      duplicateZ: wrap(
        ok([
          { z: 1, color: "#000000" },
          { z: 1, color: "#ffffff" },
        ]),
      ),
      outOfRange: wrap(ok([{ z: 200, color: "#000000" }])),
      uppercaseHex: wrap(ok([{ z: 1, color: "#FFFFFF" }])),
      symbolMismatch: wrap(ok([{ z: 1, symbol: "C", color: "#ffffff" }])),
    };
  });

  expect(results.valid).toBeNull();
  expect(results.partial).toBe(1);
  expect(results.resolvesOverride).toBe("#123456");
  expect(results.resolvesDefault).toBe("#df5153");
  expect(results.resolvesUnknown).toBe("#b294b9");
  for (const [label, message] of Object.entries(results)) {
    if (
      label.startsWith("resolves") ||
      label === "valid" ||
      label === "partial"
    )
      continue;
    expect(message, label).toContain("case:");
  }
  expect(results.badJson).toContain("not valid JSON");
  expect(results.badFormat).toContain("expected format");
  expect(results.badVersion).toContain("unsupported version");
  expect(results.emptyColors).toContain("empty");
  expect(results.duplicateZ).toContain("duplicate");
  expect(results.outOfRange).toContain("outside the supported range");
  expect(results.uppercaseHex).toContain("lowercase");
  expect(results.symbolMismatch).toContain("is H, not");
});
