import { expect, type Page } from "@playwright/test";

const widgets = {
  document: ["Molecule", "Molecular data"],
  geometry: ["Molecule", "Selections and measurements"],
  provenance: ["Molecule", "Provenance"],
  "quantum-fields": ["Fields", "Quantum fields"],
  "field-rendering": ["Fields", "Field rendering"],
  analysis: ["Fields", "Quantitative field inspection"],
  molecular: ["Surfaces", "Molecular surfaces"],
  "saved-surfaces": ["Surfaces", "Saved surfaces"],
  appearance: ["Appearance", "Appearance"],
  "atom-colours": ["Appearance", "Atom colours"],
  "surface-shader": ["Appearance", "Surface shader"],
} as const;

/** Follow the production UI exactly: reopen the pane, choose a tab, disclose one widget. */
export async function activateWidget(page: Page, id: keyof typeof widgets) {
  const pane = page.getByRole("region", {
    name: "Workspace tools",
    exact: true,
    includeHidden: true,
  });
  await expect(pane).toHaveCount(1);
  if (await pane.isHidden()) {
    await page.getByRole("button", { name: "Show tools", exact: true }).click();
  }
  await expect(pane).toBeVisible();
  const [tab, title] = widgets[id];
  await pane.getByRole("tab", { name: tab, exact: true }).click();
  const section = pane.locator(`[data-panel-id="${id}"]`);
  const disclosure = section
    .locator(":scope > .section-title")
    .getByRole("button", {
      name: title,
      exact: true,
    });
  if ((await disclosure.getAttribute("aria-expanded")) !== "true") {
    await disclosure.click();
  }
  const body = section.locator(":scope > .panel-body");
  await expect(body).toBeVisible();
  if (["geometry", "analysis", "molecular"].includes(id)) {
    // The production wrapper opens its specialist details after React commits.
    // Observe that supported UI state; never force a hidden details element open.
    await expect(
      body
        .locator(":scope > .structure-controls > details.structure-group")
        .first(),
    ).toHaveJSProperty("open", true);
  }
  return body;
}

/** Close the narrow overlay through the same visible launcher used by a person. */
export async function hideToolsForScene(page: Page) {
  const pane = page.getByRole("region", {
    name: "Workspace tools",
    exact: true,
    includeHidden: true,
  });
  await expect(pane).toHaveCount(1);
  if (await pane.isVisible()) {
    await page
      .locator(".topbar")
      .getByRole("button", { name: "Hide tools", exact: true })
      .click();
  }
  await expect(pane).toBeHidden();
}
