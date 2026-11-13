import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const left = ["document", "quantum-fields", "provenance"];
const right = [
  "field-rendering",
  "appearance",
  "atom-colours",
  "surface-shader",
  "saved-surfaces",
];
const labels: Record<string, string> = {
  document: "Document",
  "quantum-fields": "Quantum fields",
  provenance: "Provenance",
  "field-rendering": "Field rendering",
  appearance: "Appearance",
  "atom-colours": "Atom colours",
  "surface-shader": "Surface shader",
  "saved-surfaces": "Saved surfaces",
};
const storageKey = "eigenvista:panel-order:v1";
type Pane = "left" | "right";
interface OrderProbe {
  posts: number;
  drags: { type: string; panel?: string; trusted: boolean }[];
}
type ProbedWindow = Window & { panelOrderProbe: OrderProbe };
const handle = (page: Page, id: string) =>
  page.getByRole("button", { name: `Reorder ${labels[id]}`, exact: true });
const sections = (page: Page, pane: Pane) =>
  page.locator(`.${pane}-panel [data-panel-id]`);

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    {
      timeout: 45000,
    },
  );
  await expect(
    page.getByRole("button", { name: "Field rendering", exact: true }),
  ).toBeEnabled();
  await expect(page.getByRole("alert")).toHaveCount(0);
}

async function order(page: Page, pane: Pane) {
  return sections(page, pane).evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).dataset.panelId),
  );
}

async function expectOrder(page: Page, pane: Pane, expected: string[]) {
  await expect.poll(() => order(page, pane)).toEqual(expected);
  expect(new Set(expected).size).toBe(pane === "left" ? 3 : 5);
}

async function collapse(page: Page, tap = false) {
  for (const title of Object.values(labels)) {
    const button = page.getByRole("button", { name: title, exact: true });
    if ((await button.getAttribute("aria-expanded")) === "true") {
      if (tap) await button.tap();
      else await button.click();
    }
  }
}

async function announcement(
  page: Page,
  title: string,
  position: number,
  total: number,
  pane: Pane,
) {
  await expect(
    page.getByRole("status", {
      name: `${pane === "left" ? "Left" : "Right"} sidebar order`,
      exact: true,
    }),
  ).toContainText(
    `${title}, position ${position} of ${total} in ${pane} sidebar`,
  );
}

async function tabOrder(
  page: Page,
  pane: Pane,
  expected: string[],
  key: "Tab" | "Alt+Tab",
) {
  await handle(page, expected[0]).focus();
  const encountered = [expected[0]];
  for (
    let steps = 0;
    steps < 32 && encountered.length < expected.length;
    steps++
  ) {
    await page.keyboard.press(key);
    const current = await page.evaluate(() => {
      const active = document.activeElement;
      return active?.getAttribute("aria-label")?.startsWith("Reorder ")
        ? (active.closest("[data-panel-id]") as HTMLElement | null)?.dataset
            .panelId
        : undefined;
    });
    if (current) encountered.push(current);
  }
  expect(encountered).toEqual(expected);
  const tops = await sections(page, pane).evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect().top),
  );
  for (let index = 1; index < tops.length; index++)
    expect(tops[index]).toBeGreaterThan(tops[index - 1]);
}

async function save(page: Page, file: string) {
  const pending = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await (await pending).saveAs(file);
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(file)),
  );
}

test("keyboard moves actual sections, retains focus, announces position and respects pane boundaries", async ({
  page,
  browserName,
}, info) => {
  // Cocoa WebKit uses Option-Tab for all controls; GTK and Chromium use Tab.
  // https://support.apple.com/guide/safari/keyboard-shortcuts-and-gestures-cpsh003/mac
  const tabKey =
    browserName === "webkit" && process.platform === "darwin"
      ? "Alt+Tab"
      : "Tab";
  info.annotations.push({
    type: "native-keyboard-policy",
    description: `${process.platform}/${browserName}: ${tabKey}`,
  });
  await ready(page);
  await collapse(page);
  await handle(page, "document").focus();
  await handle(page, "document").press("ArrowUp");
  await expectOrder(page, "left", left);
  await handle(page, "document").press("ArrowDown");
  await expectOrder(page, "left", ["quantum-fields", "document", "provenance"]);
  await expect(handle(page, "document")).toBeFocused();
  await announcement(page, "Document", 2, 3, "left");
  await handle(page, "document").press("End");
  const movedLeft = ["quantum-fields", "provenance", "document"];
  await expectOrder(page, "left", movedLeft);
  await handle(page, "document").press("ArrowDown");
  await expectOrder(page, "left", movedLeft);
  await expect(handle(page, "document")).toBeFocused();
  await handle(page, "document").click();
  await expect(
    page.getByRole("button", { name: "Move Document down", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Move Document up", exact: true }),
  ).toBeEnabled();
  const moveUp = page.getByRole("button", {
    name: "Move Document up",
    exact: true,
  });
  await moveUp.focus();
  await expect(moveUp).toBeFocused();
  await moveUp.press("Escape");
  await expect(handle(page, "document")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(handle(page, "document")).toBeFocused();
  await tabOrder(page, "left", movedLeft, tabKey);
  await handle(page, "surface-shader").focus();
  await handle(page, "surface-shader").press("Home");
  await expectOrder(page, "right", [
    "surface-shader",
    ...right.filter((id) => id !== "surface-shader"),
  ]);
  await expect(handle(page, "surface-shader")).toBeFocused();
  await announcement(page, "Surface shader", 1, 5, "right");
  await handle(page, "surface-shader").click();
  await expect(
    page.getByRole("button", { name: "Move Surface shader up", exact: true }),
  ).toBeDisabled();
  await handle(page, "surface-shader").press("Escape");
  await handle(page, "surface-shader").press("End");
  const movedRight = [
    ...right.filter((id) => id !== "surface-shader"),
    "surface-shader",
  ];
  await expectOrder(page, "right", movedRight);
  await expectOrder(page, "left", movedLeft);
  await tabOrder(page, "right", movedRight, tabKey);
});

test("native pointer drag moves only handles within their own pane", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.panelOrderProbe = { posts: 0, drags: [] };
    for (const type of ["dragstart", "drop"])
      document.addEventListener(
        type,
        (event) => {
          state.panelOrderProbe.drags.push({
            type,
            trusted: event.isTrusted,
            panel: (
              (event.target as HTMLElement).closest(
                "[data-panel-id]",
              ) as HTMLElement | null
            )?.dataset.panelId,
          });
        },
        true,
      );
  });
  await ready(page);
  await collapse(page);
  await page
    .getByRole("button", { name: "Provenance", exact: true })
    .dragTo(page.getByRole("button", { name: "Document", exact: true }));
  await expectOrder(page, "left", left);
  expect(
    await page.evaluate(
      () => (window as unknown as ProbedWindow).panelOrderProbe.drags,
    ),
  ).toEqual([]);
  await expect(handle(page, "provenance")).toHaveAttribute("draggable", "true");
  await handle(page, "provenance").click();
  await expect(handle(page, "provenance")).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await handle(page, "provenance").dragTo(handle(page, "document"), {
    targetPosition: { x: 4, y: 4 },
  });
  const movedLeft = ["provenance", "document", "quantum-fields"];
  await expectOrder(page, "left", movedLeft);
  await expect(handle(page, "provenance")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await handle(page, "saved-surfaces").dragTo(handle(page, "appearance"), {
    targetPosition: { x: 4, y: 4 },
  });
  const movedRight = [
    "field-rendering",
    "saved-surfaces",
    "appearance",
    "atom-colours",
    "surface-shader",
  ];
  await expectOrder(page, "right", movedRight);
  const below = page.locator('[data-panel-id="quantum-fields"]');
  const bounds = await below.boundingBox();
  expect(bounds).not.toBeNull();
  await handle(page, "provenance").dragTo(below, {
    targetPosition: { x: 4, y: bounds!.height - 2 },
  });
  await expectOrder(page, "left", left);
  const samePane = await page.evaluate(
    () => (window as unknown as ProbedWindow).panelOrderProbe.drags,
  );
  expect(
    samePane
      .filter((event) => event.type === "dragstart")
      .map((event) => event.panel),
  ).toEqual(["provenance", "saved-surfaces", "provenance"]);
  expect(samePane.filter((event) => event.type === "drop")).toHaveLength(3);
  expect(samePane.every((event) => event.trusted)).toBe(true);
  await handle(page, "provenance").dragTo(handle(page, "field-rendering"));
  await expectOrder(page, "left", left);
  await expectOrder(page, "right", movedRight);
  const attempts = await page.evaluate(
    () => (window as unknown as ProbedWindow).panelOrderProbe.drags,
  );
  expect(attempts.filter((event) => event.type === "dragstart")).toHaveLength(
    4,
  );
  expect(attempts.every((event) => event.trusted)).toBe(true);
  await page.screenshot({
    path: info.outputPath("reordered-panels-desktop.png"),
    fullPage: true,
  });
});

test.describe("touch panel ordering", () => {
  test.use({ hasTouch: true, viewport: { width: 390, height: 844 } });
  test("tap move controls work on mobile without horizontal overflow", async ({
    page,
  }, info) => {
    await ready(page);
    await collapse(page, true);
    await handle(page, "provenance").tap();
    await page
      .getByRole("button", { name: "Move Provenance up", exact: true })
      .tap();
    await expectOrder(page, "left", [
      "document",
      "provenance",
      "quantum-fields",
    ]);
    await announcement(page, "Provenance", 2, 3, "left");
    await handle(page, "saved-surfaces").tap();
    await page
      .getByRole("button", { name: "Move Saved surfaces up", exact: true })
      .tap();
    await expectOrder(page, "right", [
      "field-rendering",
      "appearance",
      "atom-colours",
      "saved-surfaces",
      "surface-shader",
    ]);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath("reordered-panels-mobile.png"),
      fullPage: true,
    });
  });
});

test("pane order and independent expansion preferences survive Open and reload", async ({
  page,
}) => {
  await ready(page);
  await handle(page, "provenance").press("Home");
  await handle(page, "saved-surfaces").press("Home");
  const stored = {
    left: ["provenance", "document", "quantum-fields"],
    right: ["saved-surfaces", ...right.slice(0, -1)],
  };
  await page.getByRole("button", { name: "Document", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!),
        storageKey,
      ),
    )
    .toEqual(stored);
  await page
    .getByLabel("Open molecular file")
    .setInputFiles(path.resolve("../packaging/examples/water.xyz"));
  await expect(page.locator("footer [role=status]")).toContainText(
    "Opened water.xyz",
  );
  await expectOrder(page, "left", stored.left);
  await expectOrder(page, "right", stored.right);
  await expect(
    page.getByRole("button", { name: "Document", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expectOrder(page, "left", stored.left);
  await expectOrder(page, "right", stored.right);
  await expect(
    page.getByRole("button", { name: "Document", exact: true }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("corrupt and bounded oversized stored preferences restore usable default panes", async ({
  page,
}) => {
  await ready(page);
  const reversed = { left: [...left].reverse(), right: [...right].reverse() };
  for (const stored of [
    "{",
    "[]",
    JSON.stringify({ left: null, right: 42 }),
    " ".repeat(4096) + JSON.stringify(reversed),
  ]) {
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: storageKey,
      value: stored,
    });
    await page.reload();
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
      { timeout: 45000 },
    );
    await expectOrder(page, "left", left);
    await expectOrder(page, "right", right);
    await expect(page.getByRole("alert")).toHaveCount(0);
  }
  await handle(page, "document").press("End");
  await expectOrder(page, "left", ["quantum-fields", "provenance", "document"]);
});

test("duplicates, wrong-pane, unknown and incomplete orders reject only their invalid pane", async ({
  page,
}) => {
  await ready(page);
  const reversedRight = [...right].reverse();
  for (const invalid of [
    ["document", "document", "provenance"],
    ["appearance", "quantum-fields", "provenance"],
    ["unknown-panel", "quantum-fields", "provenance"],
    ["provenance", "document"],
  ]) {
    await page.evaluate(
      ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
      {
        key: storageKey,
        value: { left: invalid, right: reversedRight },
      },
    );
    await page.reload();
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
      { timeout: 45000 },
    );
    await expectOrder(page, "left", left);
    await expectOrder(page, "right", reversedRight);
  }
  const reversedLeft = [...left].reverse();
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, JSON.stringify(value)),
    {
      key: storageKey,
      value: {
        left: reversedLeft,
        right: [
          "field-rendering",
          "appearance",
          "atom-colours",
          "surface-shader",
          "surface-shader",
        ],
      },
    },
  );
  await page.reload();
  await expect(page.locator("footer [role=status]")).toContainText(
    "triangles",
    { timeout: 45000 },
  );
  await expectOrder(page, "left", reversedLeft);
  await expectOrder(page, "right", right);
  await expect(page.getByRole("alert")).toHaveCount(0);
});

for (const failure of ["denied", "full"] as const) {
  test(`${failure} storage retains working in-memory pane ordering`, async ({
    page,
  }) => {
    await page.addInitScript((mode) => {
      if (mode === "denied")
        Object.defineProperty(window, "localStorage", {
          get() {
            throw new DOMException("Denied profile", "SecurityError");
          },
        });
      else
        Storage.prototype.setItem = () => {
          throw new DOMException("Full profile", "QuotaExceededError");
        };
    }, failure);
    await ready(page);
    await handle(page, "document").press("End");
    await handle(page, "saved-surfaces").press("Home");
    await expectOrder(page, "left", [
      "quantum-fields",
      "provenance",
      "document",
    ]);
    await expectOrder(page, "right", ["saved-surfaces", ...right.slice(0, -1)]);
    await expect(page.getByRole("alert")).toHaveCount(0);
    await expect(page.locator(".dirty")).toHaveCount(0);
    await page
      .getByLabel("Open molecular file")
      .setInputFiles(path.resolve("../packaging/examples/water.xyz"));
    await expect(page.locator("footer [role=status]")).toContainText(
      "Opened water.xyz",
    );
    await expectOrder(page, "left", [
      "quantum-fields",
      "provenance",
      "document",
    ]);
    await expectOrder(page, "right", ["saved-surfaces", ...right.slice(0, -1)]);
    await expect(page.getByRole("alert")).toHaveCount(0);
  });
}

test("reordering retains mounted content, clean scientific data and zero worker requests", async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const state = window as unknown as ProbedWindow;
    state.panelOrderProbe = { posts: 0, drags: [] };
    const post = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: StructuredSerializeOptions | Transferable[],
    ) {
      state.panelOrderProbe.posts++;
      post.call(
        this,
        message,
        Array.isArray(options) ? { transfer: options } : options,
      );
    };
  });
  await ready(page);
  const before = await save(page, info.outputPath("before-order.eigenvista"));
  const documentBody = await page
    .locator("#panel-document-content")
    .elementHandle();
  await page.evaluate(() => {
    (window as unknown as ProbedWindow).panelOrderProbe.posts = 0;
  });
  await handle(page, "document").press("End");
  await handle(page, "saved-surfaces").press("Home");
  await expectOrder(page, "left", ["quantum-fields", "provenance", "document"]);
  await expectOrder(page, "right", ["saved-surfaces", ...right.slice(0, -1)]);
  expect(
    await documentBody!.evaluate(
      (node) =>
        node.isConnected &&
        document.querySelector("#panel-document-content") === node,
    ),
  ).toBe(true);
  await expect(page.locator(".dirty")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as ProbedWindow).panelOrderProbe.posts,
    ),
  ).toBe(0);
  const after = await save(page, info.outputPath("after-order.eigenvista"));
  expect(after).toEqual(before);
});
