import { activateWidget } from "./workspace";
import { expect, test, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

type Pose = { position: number[]; target: number[]; up: number[] };
type Display = {
  colorMode: string;
  hiddenChains: number[];
  hiddenKinds: string[];
  isolatedChain: number | null;
  selectedResidueCount: number | null;
  chainStyles: Record<string, string>;
  componentStyles: Record<string, string>;
  visibleAtomCount: number;
};
type State = {
  revision: number;
  document: { atomCount: number; bondCount: number; orbitalCount: number };
  dirty: boolean;
  busy: string;
  palette: { custom: boolean; name: string };
  structureDisplay: Display;
  ambientOcclusion: {
    enabled: boolean;
    strength: number;
    automaticRadius: boolean;
    radiusAngstrom: number;
    surfaceRadiusAngstrom: number;
  };
};
type ProbeWindow = Window & {
  eigenvistaControl?: {
    request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  };
  presentationProbe: {
    actions: string[];
    backbones: string[];
    completed: string[];
    errors: string[];
  };
};
const crambin = path.resolve("../fixtures/bcif/1crn.cif");
const components = path.resolve(
  "tests/fixtures/structure-controls/components.pdb",
);
const pinkCarbon = JSON.stringify({
  format: "eigenvista-atom-colors",
  version: 1,
  colors: [{ z: 6, symbol: "C", color: "#ff00ff" }],
});

async function call<T = unknown>(
  page: Page,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const outcome = await page.evaluate(
    async ({ method, params }) => {
      try {
        return {
          ok: true,
          result: await (
            window as unknown as ProbeWindow
          ).eigenvistaControl!.request(method, params),
        };
      } catch (error) {
        const failure = error as {
          kind?: string;
          data?: { kind?: string };
          message?: string;
        };
        return {
          ok: false,
          error: {
            kind: failure.kind ?? failure.data?.kind,
            message: failure.message ?? String(error),
          },
        };
      }
    },
    { method, params },
  );
  if (!outcome.ok)
    throw Object.assign(new Error(outcome.error?.message), outcome.error);
  return outcome.result as T;
}

async function ready(page: Page, file: string) {
  await trackSceneDraws(page);
  await page.addInitScript(() => {
    const state = window as unknown as ProbeWindow;
    state.presentationProbe = {
      actions: [],
      backbones: [],
      completed: [],
      errors: [],
    };
    const workers = new WeakMap<Worker, number>();
    let nextWorker = 0;
    const original = Worker.prototype.postMessage;
    Worker.prototype.postMessage = function (
      message,
      options?: Transferable[] | StructuredSerializeOptions,
    ) {
      const probe = state.presentationProbe;
      probe.actions.push(String(message.action));
      if (message.action === "backbone") {
        if (!workers.has(this)) workers.set(this, ++nextWorker);
        const key = `${workers.get(this)}:${message.id}`;
        probe.backbones.push(key);
        const receive = ({ data }: MessageEvent) => {
          if (
            data.id !== message.id ||
            (!("result" in data) && !("error" in data))
          )
            return;
          this.removeEventListener("message", receive);
          if ("error" in data) probe.errors.push(String(data.error));
          else probe.completed.push(key);
        };
        this.addEventListener("message", receive);
      }
      return Reflect.apply(original, this, [message, options]);
    };
  });
  await page.goto("/?control=1");
  await page.waitForFunction(() =>
    Boolean((window as unknown as ProbeWindow).eigenvistaControl),
  );
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.addStyleTag({
    content:
      '.scene[data-testid="viewport"] { width:320px !important; height:240px !important; }',
  });
  await call(page, "document.open", {
    name: path.basename(file),
    bytes: Array.from(fs.readFileSync(file)),
  });
  await call(page, "scene.set", {
    backgroundColor: "#e8edef",
    ambientOcclusion: { enabled: false },
  });
  await settleScene(page);
  await expect
    .poll(async () => (await call<State>(page, "app.state")).busy)
    .toBe("");
}

async function frame(page: Page, pose?: Pose) {
  if (pose)
    await call(page, "camera.set", {
      position: pose.position,
      target: pose.target,
      up: pose.up,
    });
  await settleScene(page);
  const result = await call<{ dataUrl: string; width: number; height: number }>(
    page,
    "image.export",
  );
  expect(result.dataUrl).toMatch(/^data:image\/png;base64,/);
  const bytes = Buffer.from(result.dataUrl.split(",")[1], "base64");
  const pixels = await pngPixels(page, bytes);
  expect([pixels.width, pixels.height]).toEqual([320, 240]);
  expect(pixels.foreground12).toBeGreaterThan(30);
  return { hash: createHash("sha256").update(bytes).digest("hex"), ...pixels };
}

async function scientificSnapshot(page: Page) {
  const saved = await call<{ bytes: number[] }>(page, "document.save");
  return page.evaluate(async (bytes) => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const document = JSON.parse(core.decode(new Uint8Array(bytes)));
    delete document.view;
    return JSON.stringify(document);
  }, saved.bytes);
}

async function expand(page: Page, name: RegExp) {
  const summary = page
    .locator(".structure-controls summary")
    .filter({ hasText: name });
  if (
    !(await summary.evaluate(
      (node) => (node.parentElement as HTMLDetailsElement).open,
    ))
  )
    await summary.click();
}

test("palette API matches GUI rendering, rejects malformed input atomically and restores built-in colors without science", async ({
  page,
}) => {
  await ready(page, crambin);
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  await download;
  await expect
    .poll(async () => (await call<State>(page, "app.state")).dirty)
    .toBe(false);
  const scientific = await scientificSnapshot(page);
  const before = await call<State>(page, "app.state");
  const pose = await call<Pose>(page, "camera.get");
  const builtin = await frame(page, pose);
  await page.evaluate(() => {
    (window as unknown as ProbeWindow).presentationProbe.actions = [];
  });

  await call(page, "palette.load", {
    name: "pink-carbon.json",
    text: pinkCarbon,
  });
  await activateWidget(page, "atom-colours");
  await expect(
    page.getByText("Overridden by pink-carbon.json", { exact: true }),
  ).toBeVisible();
  expect((await call<State>(page, "app.state")).palette).toEqual({
    custom: true,
    name: "pink-carbon.json",
  });
  const api = await frame(page, pose);
  expect(api.hash).not.toBe(builtin.hash);
  expect(api.negative).toBeGreaterThan(builtin.negative + 25);

  await expect(
    call(page, "palette.load", {
      name: "broken.json",
      text: JSON.stringify({
        format: "eigenvista-atom-colors",
        version: 1,
        colors: [
          { z: 6, color: "#0000ff" },
          { z: 8, color: "hotpink" },
        ],
      }),
    }),
  ).rejects.toMatchObject({ kind: "validation_error" });
  expect((await call<State>(page, "app.state")).palette).toEqual({
    custom: true,
    name: "pink-carbon.json",
  });
  expect((await frame(page, pose)).hash).toBe(api.hash);

  await call(page, "palette.reset");
  await activateWidget(page, "atom-colours");
  await expect(
    page.getByText(/^Built-in default \(\d+ elements\)$/),
  ).toBeVisible();
  expect((await frame(page, pose)).hash).toBe(builtin.hash);
  await page.getByLabel("Atom colours file", { exact: true }).setInputFiles({
    name: "pink-carbon.json",
    mimeType: "application/json",
    buffer: Buffer.from(pinkCarbon),
  });
  await expect(
    page.getByText("Overridden by pink-carbon.json", { exact: true }),
  ).toBeVisible();
  expect((await frame(page, pose)).hash).toBe(api.hash);
  await page
    .getByRole("button", { name: "Reset to defaults", exact: true })
    .click();
  expect((await frame(page, pose)).hash).toBe(builtin.hash);
  const after = await call<State>(page, "app.state");
  expect(after.document).toEqual(before.document);
  expect(after.revision).toBe(before.revision);
  expect(after.dirty).toBe(false);
  expect(
    await page.evaluate(
      () => (window as unknown as ProbeWindow).presentationProbe.actions,
    ),
  ).toEqual([]);
  expect(await scientificSnapshot(page)).toBe(scientific);
});

test("residue-class coloring is shared by the GUI and connector and recolors atoms and cartoons", async ({
  page,
}) => {
  await ready(page, crambin);
  await activateWidget(page, "document");
  const original = await scientificSnapshot(page);
  const pose = await call<Pose>(page, "camera.get");
  const element = await frame(page, pose);
  const coloring = page.getByLabel("Structure coloring", { exact: true });
  await coloring.selectOption("residue-class");
  expect((await call<State>(page, "app.state")).structureDisplay).toMatchObject(
    { colorMode: "residue-class", visibleAtomCount: 327 },
  );
  const legend = page.getByRole("list", { name: "Structure color legend" });
  await expect(legend.getByRole("listitem")).toHaveText([
    "Hydrophobic / nonpolar",
    "Polar uncharged",
    "Acidic",
    "Basic",
    "Unclassified protein residue",
  ]);
  expect((await frame(page, pose)).hash).not.toBe(element.hash);

  await call(page, "structure.set", {
    colorMode: "secondary",
    componentStyles: { protein: "cartoon" },
  });
  await expect(coloring).toHaveValue("secondary");
  await expect(page.getByText(/unassigned loops/).first()).toBeVisible();
  const secondary = await frame(page, pose);
  await call(page, "structure.set", { colorMode: "residue-class" });
  await expect(coloring).toHaveValue("residue-class");
  const classes = await frame(page, pose);
  expect(classes.hash).not.toBe(secondary.hash);
  expect(await scientificSnapshot(page)).toBe(original);
});

test("biological API filters, inserted-residue selection, focus and style inheritance match visible GUI geometry", async ({
  page,
}) => {
  await ready(page, components);
  const original = await scientificSnapshot(page);
  const listed = await call<{
    items: { index: number; authorId: string; atomCount: number }[];
  }>(page, "structure.list");
  expect(
    listed.items.map(({ authorId, atomCount }) => [authorId, atomCount]),
  ).toEqual([
    ["A", 12],
    ["B", 8],
    ["L", 2],
    ["W", 1],
    ["I", 1],
  ]);
  const chainA = listed.items.find((chain) => chain.authorId === "A")!.index;
  const chainB = listed.items.find((chain) => chain.authorId === "B")!.index;
  await expand(page, /^Components$/);
  await expand(page, /^Chains/);
  const initialPose = await call<Pose>(page, "camera.get");
  const element = await frame(page, initialPose);
  await call(page, "structure.set", { colorMode: "chain" });
  await expect(
    page.getByLabel("Structure coloring", { exact: true }),
  ).toHaveValue("chain");
  await expect(
    page
      .getByRole("list", { name: "Structure color legend" })
      .getByRole("listitem"),
  ).toHaveCount(5);
  expect((await frame(page, initialPose)).hash).not.toBe(element.hash);
  await page
    .getByLabel("Structure coloring", { exact: true })
    .selectOption("element");
  expect(
    (await call<State>(page, "app.state")).structureDisplay.colorMode,
  ).toBe("element");
  expect((await frame(page, initialPose)).hash).toBe(element.hash);

  await call(page, "structure.set", {
    hiddenKinds: ["water", "ion"],
    hiddenChains: [chainB],
  });
  expect(
    (await call<State>(page, "app.state")).structureDisplay.visibleAtomCount,
  ).toBe(14);
  await expect(
    page.getByRole("checkbox", { name: "Show Water", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Show chain B", exact: true }),
  ).not.toBeChecked();
  await call(page, "structure.set", {
    residueRange: { chainIndex: chainA, first: "ALA 10", last: "GLY 10A" },
  });
  await call(page, "structure.set", {
    hiddenKinds: ["protein", "water", "ion"],
    hiddenChains: [chainA],
  });
  expect(
    (await call<State>(page, "app.state")).structureDisplay.visibleAtomCount,
  ).toBe(0);
  await call(page, "structure.set", { isolatedChain: chainA });
  expect((await call<State>(page, "app.state")).structureDisplay).toMatchObject(
    {
      visibleAtomCount: 12,
      selectedResidueCount: null,
      hiddenChains: [],
      hiddenKinds: ["water", "ion"],
    },
  );
  await expect(
    page.getByRole("button", { name: "Isolate chain A", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("button", { name: "Focus chain B", exact: true }),
  ).toBeDisabled();
  await call(page, "structure.focus", { target: "chain", chainIndex: chainA });
  const focused = await call<Pose>(page, "camera.get");
  // Declared chain-A input bounds are x=-1.1..9.3, y=0..0.6, z=0 angstrom.
  expect(focused.target[0] * 0.529177210903).toBeCloseTo(4.1, 6);
  expect(focused.target[1] * 0.529177210903).toBeCloseTo(0.3, 6);
  expect(focused.target[2]).toBeCloseTo(0, 10);
  expect((await frame(page, focused)).foreground12).toBeGreaterThan(100);

  await call(page, "structure.set", { isolatedChain: chainB });
  await call(page, "structure.set", {
    hiddenKinds: ["protein"],
    hiddenChains: [chainA],
  });
  expect(
    (await call<State>(page, "app.state")).structureDisplay.visibleAtomCount,
  ).toBe(0);
  await call(page, "structure.set", {
    residueRange: { chainIndex: chainA, first: "ALA 10", last: "GLY 10A" },
  });
  const selected = await call<State>(page, "app.state");
  expect(selected.structureDisplay).toMatchObject({
    selectedResidueCount: 2,
    visibleAtomCount: 8,
    isolatedChain: null,
    hiddenChains: [],
    hiddenKinds: [],
  });
  const selectedFrame = await frame(page, focused);
  await expect(
    call(page, "structure.set", {
      colorMode: "chain",
      hiddenKinds: ["protein"],
      residueRange: { chainIndex: chainA, first: "ALA 10", last: "GLY 999" },
    }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  expect((await call<State>(page, "app.state")).structureDisplay).toEqual(
    selected.structureDisplay,
  );
  expect((await frame(page, focused)).hash).toBe(selectedFrame.hash);
  await expect(
    call(page, "structure.set", {
      colorMode: "chain",
      hiddenKinds: ["protein"],
      componentStyles: { ligand: "cartoon" },
    }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  expect((await call<State>(page, "app.state")).structureDisplay).toEqual(
    selected.structureDisplay,
  );
  expect((await frame(page, focused)).hash).toBe(selectedFrame.hash);

  await call(page, "structure.set", {
    showAll: true,
    isolatedChain: chainA,
    componentStyles: { protein: "liquorice" },
    chainStyles: [{ chainIndex: chainA, representation: "space-fill" }],
  });
  await expect(
    page.getByLabel("Style for Protein", { exact: true }),
  ).toHaveValue("liquorice");
  await expect(
    page.getByLabel("Style for chain A", { exact: true }),
  ).toHaveValue("space-fill");
  const chainStyle = await frame(page, focused);
  await call(page, "structure.set", {
    chainStyles: [{ chainIndex: chainA, representation: null }],
  });
  const componentStyle = await frame(page, focused);
  expect(componentStyle.hash).not.toBe(chainStyle.hash);
  await call(page, "scene.set", { representation: "space-fill" });
  await call(page, "structure.set", { clearStyles: true });
  expect((await frame(page, focused)).hash).toBe(chainStyle.hash);
  await call(page, "scene.set", { representation: "liquorice" });
  expect((await frame(page, focused)).hash).toBe(componentStyle.hash);
  await call(page, "structure.set", {
    componentStyles: { protein: "space-fill" },
    chainStyles: [{ chainIndex: chainA, representation: "liquorice" }],
  });
  expect((await frame(page, focused)).hash).toBe(componentStyle.hash);
  await call(page, "structure.set", { showAll: true, clearStyles: true });
  expect(
    (await call<State>(page, "app.state")).structureDisplay.visibleAtomCount,
  ).toBe(24);
  expect(await scientificSnapshot(page)).toBe(original);
});

test("real protein representations prepare distinct scenes and automatic AO radius round-trips through GUI", async ({
  page,
}) => {
  await ready(page, crambin);
  const document = (await call<State>(page, "app.state")).document;
  expect(document.atomCount).toBe(327);
  const pose = await call<Pose>(page, "camera.get");
  const hashes = new Set<string>();
  await page.evaluate(() => {
    (window as unknown as ProbeWindow).presentationProbe.actions = [];
  });
  for (const representation of [
    "ball-stick",
    "liquorice",
    "space-fill",
    "trace",
    "tube",
    "ribbon",
    "cartoon",
  ]) {
    await call(page, "scene.set", { representation });
    await expect(
      page.getByLabel("Representation", { exact: true }),
    ).toHaveValue(representation);
    if (["trace", "tube", "ribbon", "cartoon"].includes(representation)) {
      await expect
        .poll(async () =>
          page.evaluate(() => {
            const probe = (window as unknown as ProbeWindow).presentationProbe;
            return (
              probe.backbones.length > 0 &&
              probe.backbones.every((key) => probe.completed.includes(key))
            );
          }),
        )
        .toBe(true);
      await expect(
        page.getByRole("status", { name: "Protein depiction status" }),
      ).not.toContainText(/Preparing|unavailable/);
    }
    hashes.add((await frame(page, pose)).hash);
  }
  expect(hashes.size).toBe(7);
  expect((await call<State>(page, "app.state")).document).toEqual(document);
  const probe = await page.evaluate(
    () => (window as unknown as ProbeWindow).presentationProbe,
  );
  expect(probe.errors).toEqual([]);
  expect(
    probe.actions.filter((action) => /sample|generate|register/.test(action)),
  ).toEqual([]);

  await activateWidget(page, "appearance");
  await call(page, "scene.set", {
    representation: "space-fill",
    ambientOcclusion: { enabled: true, strength: 0.6, radiusAngstrom: 0.5 },
  });
  await expect(
    page.getByLabel("Automatic AO radius", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue("0.5");
  const manual = await call<State>(page, "app.state");
  expect(manual.ambientOcclusion).toMatchObject({
    automaticRadius: false,
    radiusAngstrom: 0.5,
    strength: 0.6,
  });
  await expect(
    call(page, "scene.set", {
      backgroundColor: "#ffffff",
      ambientOcclusion: { automaticRadius: true, radiusAngstrom: 5 },
    }),
  ).rejects.toMatchObject({ kind: "invalid_arguments" });
  expect((await call<State>(page, "app.state")).ambientOcclusion).toEqual(
    manual.ambientOcclusion,
  );
  await expect(
    page.getByLabel("Background color", { exact: true }),
  ).toHaveValue("#e8edef");
  await call(page, "scene.set", {
    ambientOcclusion: { automaticRadius: true },
  });
  await expect(
    page.getByLabel("Automatic AO radius", { exact: true }),
  ).toBeChecked();
  const automatic = (await call<State>(page, "app.state")).ambientOcclusion;
  expect(automatic.automaticRadius).toBe(true);
  expect(automatic.radiusAngstrom).toBeGreaterThan(0.5);
  await call(page, "scene.set", {
    ambientOcclusion: { automaticRadius: false },
  });
  expect((await call<State>(page, "app.state")).ambientOcclusion).toEqual({
    ...automatic,
    automaticRadius: false,
    surfaceRadiusAngstrom: automatic.radiusAngstrom,
  });
  await expect(
    page.getByLabel("AO radius (angstrom)", { exact: true }),
  ).toHaveValue(String(automatic.radiusAngstrom));
  await call(page, "scene.set", {
    ambientOcclusion: { automaticRadius: true },
  });
  await page.getByLabel("Automatic AO radius", { exact: true }).uncheck();
  expect(
    (await call<State>(page, "app.state")).ambientOcclusion.automaticRadius,
  ).toBe(false);
  await page.getByLabel("Automatic AO radius", { exact: true }).check();
  expect((await call<State>(page, "app.state")).ambientOcclusion).toEqual(
    automatic,
  );
  await frame(page, pose);
  await expect(page.getByRole("alert")).toHaveCount(0);
});
