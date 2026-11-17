// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { scenePixels } from "./scenePixels";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Playwright runs with the app directory as cwd; fixtures live at the repo root.
const cifDir = path.resolve("..", "fixtures", "cif");

async function ready(page: Page) {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
}

function cifUpload(name: string, contents: Buffer | string) {
  return {
    name,
    mimeType: "chemical/x-cif",
    buffer: Buffer.isBuffer(contents)
      ? contents
      : Buffer.from(contents, "utf8"),
  };
}

test("mmCIF opens through the same path as PDB and reports the structure", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);

  await page
    .getByLabel("Open molecular file")
    .setInputFiles(
      cifUpload("1BH3.cif", readFileSync(path.join(cifDir, "1BH3.cif"))),
    );

  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened 1BH3.cif",
    { timeout: 60000 },
  );
  await expect(page.getByRole("alert")).toHaveCount(0);

  // 2,395 _atom_site rows, 2,372 after alternate-location/occupancy selection.
  await expect(page.locator(".document-summary")).toContainText("2372 atoms");
  const summary = await page.locator(".document-summary").innerText();
  expect(summary).toMatch(/\d+ bonds/);

  // The structure must actually render, not just parse.
  const canvasNonBlank = (await scenePixels(page)).colorful > 500;
  expect(canvasNonBlank).toBe(true);

  expect(errors).toEqual([]);
  await page.screenshot({
    path: path.resolve("artifacts", "cif-1bh3-desktop.png"),
    fullPage: true,
  });
  await testInfo.attach("cif-desktop", {
    path: path.resolve("artifacts", "cif-1bh3-desktop.png"),
    contentType: "image/png",
  });
});

test("a file labelled .cif that is not mmCIF is rejected without losing the current document", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await ready(page);

  // Establish a known-good document first.
  await page.getByLabel("Open molecular file").setInputFiles({
    name: "water.xyz",
    mimeType: "chemical/x-xyz",
    buffer: Buffer.from("2\nWater\nH 0 0 0\nH 0 0 0.74\n", "utf8"),
  });
  await expect(page.locator(".document-summary")).toContainText("2 atoms");

  // Now a file with a .cif extension that is not mmCIF.
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(
      cifUpload("fake.cif", "this is not a crystallographic file\n"),
    );

  await expect(page.getByRole("alert")).not.toHaveCount(0, { timeout: 15000 });
  // The prior document must survive a rejected import untouched.
  await expect(page.locator(".document-summary")).toContainText("2 atoms");
  expect(errors).toEqual([]);
});

test("the open dialog accepts .cif extensions", async ({ page }) => {
  await ready(page);
  const accept = await page
    .getByLabel("Open molecular file")
    .getAttribute("accept");
  expect(accept).toContain(".cif");
  expect(accept).toContain(".mcif");
});
