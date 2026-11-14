import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import type { EigenVistaDocument, SampledGrid } from "../src/types";
import type { ProteinBackbone } from "../src/useProteinBackbone";
import type { StructureDisplayState } from "../src/molecularDisplay";
import { pngPixels, settleScene, trackSceneDraws } from "./scenePixels";

function source(offset = 0): EigenVistaDocument {
  const positions: [number, number, number][] = [];
  for (let residue = 0; residue < 3; residue++) {
    const x = offset - 20 + residue * 7;
    positions.push([x, 0, 0], [x + 1, 0, 0], [x + 1, 1, 0]);
  }
  positions.push([offset - 12, -5, 0]);
  return {
    id: "independent-protein-renderer",
    title: "Manufactured display control",
    atoms: {
      positions,
      elements: positions.map((_, i) => (i % 3 === 2 || i === 9 ? 8 : 6)),
    },
    bonds: [
      [0, 1],
      [1, 2],
      [3, 4],
      [4, 5],
      [6, 7],
      [7, 8],
    ],
    basis: [],
    orbitals: [],
    densities: [],
    grids: [],
    surfaces: [],
    provenance: [],
    view: {
      representation: "ball-stick",
      positive_color: "#00cf30",
      negative_color: "#d14a90",
      opacity: 0.25,
      isovalue: 0.5,
      field: null,
    },
    structure: {
      chains: [
        { label_id: "A", author_id: "A", entity_id: "1" },
        { label_id: "L", author_id: "L", entity_id: "2" },
      ],
      residues: [
        ...[0, 1, 2].map((i) => ({
          chain: 0,
          name: "GLY",
          label_seq_id: i + 1,
          author_seq_id: String(i + 1),
          insertion_code: null,
          segment: 0,
          kind: "protein" as const,
          secondary: "sheet" as const,
        })),
        {
          chain: 1,
          name: "LIG",
          label_seq_id: null,
          author_seq_id: "1",
          insertion_code: null,
          segment: 0,
          kind: "ligand",
          secondary: "unknown",
        },
      ],
      atom_names: ["CA", "C", "O", "CA", "C", "O", "CA", "C", "O", "O1"],
      atom_residues: [0, 0, 0, 1, 1, 1, 2, 2, 2, 3],
      secondary_source: "deposited",
    },
  };
}

// Resolve the same optimized React modules as production rather than create a
// second React copy. Only the blank harness document is supplied by the test.
async function blank(page: Page) {
  await page.route("http://127.0.0.1:5178/", (route) =>
    route.fulfill({
      contentType: "text/html",
      // Standard pinned Vite React development preamble; no App/renderer mounted.
      body: `<!doctype html><html><head><script type="module">
        import { injectIntoGlobalHook } from "/@react-refresh";
        injectIntoGlobalHook(window);
        window.$RefreshReg$ = () => {};
        window.$RefreshSig$ = () => (type) => type;
        </script></head><body><div id="root"></div></body></html>`,
    }),
  );
  await page.goto("/");
}
type Packet = {
  id: number;
  action: string;
  args: { doc?: EigenVistaDocument };
};
type Harness = Window & {
  proteinTest: {
    posts: Packet[];
    terminated: number;
    hold: boolean;
    held: { worker: Worker; packet: Packet }[];
    render: (source: number, needed: boolean) => void;
    unmount: () => void;
    snapshot: {
      loading: boolean;
      error: string;
      backbone: ProteinBackbone | null;
    };
    stale: () => void;
  };
};

test("protein preparation is lazy, cached, source-cancelled and immune to stale replies", async ({
  page,
}, info) => {
  await blank(page);
  await page.evaluate(
    async (documents) => {
      const reactSource = await (
        await fetch("/src/useProteinBackbone.ts")
      ).text();
      const mainSource = await (await fetch("/src/main.tsx")).text();
      const reactUrl = reactSource.match(
        /["']([^"']*\/react\.js(?:\?[^"']*)?)["']/,
      )![1];
      const rootUrl = mainSource.match(
        /["']([^"']*\/react-dom_client\.js(?:\?[^"']*)?)["']/,
      )![1];
      const reactModule = await import(/* @vite-ignore */ reactUrl);
      const React = (reactModule.default ??
        reactModule) as typeof import("react");
      const rootModule = await import(/* @vite-ignore */ rootUrl);
      const { createRoot } = (rootModule.default ??
        rootModule) as typeof import("react-dom/client");
      const providerUrl = "/src/useProteinBackbone.ts";
      const { useProteinBackbone } = (await import(
        /* @vite-ignore */ providerUrl
      )) as typeof import("../src/useProteinBackbone");
      const state: Harness["proteinTest"] = ((
        window as unknown as Harness
      ).proteinTest = {
        posts: [],
        terminated: 0,
        hold: false,
        held: [],
        render: () => {},
        unmount: () => {},
        stale: () => {},
        snapshot: { loading: false, error: "", backbone: null },
      });
      const post = Worker.prototype.postMessage;
      const terminate = Worker.prototype.terminate;
      Worker.prototype.postMessage = function (
        message,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        state.posts.push(structuredClone(message));
        if (message.action === "backbone" && state.hold) {
          state.held.push({ worker: this, packet: message });
          return;
        }
        post.call(
          this,
          message,
          Array.isArray(options) ? { transfer: options } : options,
        );
      };
      Worker.prototype.terminate = function () {
        state.terminated++;
        terminate.call(this);
      };
      const root = createRoot(document.getElementById("root")!);
      function Probe({
        doc,
        needed,
      }: {
        doc: EigenVistaDocument;
        needed: boolean;
      }) {
        state.snapshot = useProteinBackbone(doc, needed);
        return React.createElement(
          "output",
          null,
          state.snapshot.loading
            ? "preparing"
            : state.snapshot.error ||
                `${state.snapshot.backbone?.segments.length ?? 0} segments`,
        );
      }
      state.render = (index, needed) =>
        root.render(
          React.createElement(Probe, { doc: documents[index], needed }),
        );
      state.unmount = () => root.unmount();
      state.stale = () => {
        const old = state.held[0];
        old.worker.dispatchEvent(
          new MessageEvent("message", {
            data: {
              id: old.packet.id,
              result: { segments: [], warnings: ["Stale reply must not win"] },
            },
          }),
        );
      };
      state.render(0, false);
    },
    [source(), source(100), source(200), source(300)],
  );
  await expect(page.locator("output")).toHaveText("0 segments");
  expect(
    await page.evaluate(() => (window as unknown as Harness).proteinTest.posts),
  ).toEqual([]);
  await page.evaluate(() =>
    (window as unknown as Harness).proteinTest.render(0, true),
  );
  await expect(page.locator("output")).toHaveText("1 segments");
  const original = await page.evaluate(
    () => (window as unknown as Harness).proteinTest.posts,
  );
  expect(original).toHaveLength(1);
  expect(original[0].action).toBe("backbone");
  expect(original[0].args.doc?.atoms).toEqual(source().atoms);
  for (const key of [
    "bonds",
    "basis",
    "orbitals",
    "densities",
    "grids",
    "surfaces",
  ] as const)
    expect(original[0].args.doc?.[key]).toEqual([]);
  await page.evaluate(() =>
    (window as unknown as Harness).proteinTest.render(0, false),
  );
  await expect(page.locator("output")).toHaveText("1 segments");
  await page.evaluate(() =>
    (window as unknown as Harness).proteinTest.render(0, true),
  );
  await expect(page.locator("output")).toHaveText("1 segments");
  expect(
    await page.evaluate(
      () => (window as unknown as Harness).proteinTest.posts.length,
    ),
  ).toBe(1);
  await page.evaluate(() => {
    const state = (window as unknown as Harness).proteinTest;
    state.hold = true;
    state.render(1, true);
  });
  await expect(page.locator("output")).toHaveText("preparing");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Harness).proteinTest.held.length,
      ),
    )
    .toBe(1);
  await page.evaluate(() => {
    const state = (window as unknown as Harness).proteinTest;
    state.render(2, false);
  });
  await expect(page.locator("output")).toHaveText("0 segments");
  expect(
    await page.evaluate(
      () => (window as unknown as Harness).proteinTest.terminated,
    ),
  ).toBe(1);
  await page.evaluate(() => {
    const state = (window as unknown as Harness).proteinTest;
    state.stale();
    state.hold = false;
    state.render(2, true);
  });
  await expect(page.locator("output")).toHaveText("1 segments");
  const current = await page.evaluate(
    () => (window as unknown as Harness).proteinTest.snapshot,
  );
  expect(current.backbone?.segments[0].points[0].position[0]).toBe(180);
  expect(current.backbone?.warnings).not.toContain("Stale reply must not win");
  await page.evaluate(() => {
    const state = (window as unknown as Harness).proteinTest;
    state.hold = true;
    state.render(3, true);
  });
  await expect(page.locator("output")).toHaveText("preparing");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as Harness).proteinTest.held.length,
      ),
    )
    .toBe(2);
  await page.evaluate(() =>
    (window as unknown as Harness).proteinTest.unmount(),
  );
  await expect(page.locator("output")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => (window as unknown as Harness).proteinTest.terminated,
    ),
  ).toBe(2);
  await info.attach("provider-observations.json", {
    body: JSON.stringify({ original, current }),
    contentType: "application/json",
  });
});

type ViewHarness = Window & {
  proteinView: {
    render: (protein: boolean, ao: boolean, hidden?: boolean) => void;
    unmount: () => void;
    live: Record<string, number>;
    packets: string[];
    framebufferStatuses: number[];
    selected: string;
  };
};

test("protein depiction preserves sampled fields, custom shaders, AO isolation, PNG and GL cleanup", async ({
  page,
}, info) => {
  await trackSceneDraws(page);
  await blank(page);
  const doc = source();
  doc.surfaces = [
    {
      id: "custom-control",
      label: "Independent custom shader",
      field: null,
      source_hash: null,
      isovalue: null,
      algorithm: "manufactured",
      resolution: [],
      grid_origin: [],
      grid_axes: [],
      precision: "f32",
      positions: [9, 5, 0, 17, 5, 0, 13, 11, 0],
      normals: [0, 0, 1, 0, 0, 1, 0, 0, 1],
      indices: [0, 1, 2],
      color: "#ffffff",
      opacity: 1,
      visible: true,
    },
  ];
  const grid = {
    id: "manufactured",
    label: "Constant sampled field",
    quantity: "manufactured",
    origin: [10, -4, -3],
    axes: [
      [0.75, 0, 0],
      [0, 0.75, 0],
      [0, 0, 0.75],
    ],
    dims: [9, 9, 9],
    values: Array(9 ** 3).fill(1),
  };
  // Match actual App routing: a sampled field has a selected document grid ID.
  doc.grids = [grid];
  doc.view.field = grid.id;
  await page.evaluate(
    async ({ doc, grid }) => {
      const reactSource = await (
        await fetch("/src/useProteinBackbone.ts")
      ).text();
      const mainSource = await (await fetch("/src/main.tsx")).text();
      const reactUrl = reactSource.match(
        /["']([^"']*\/react\.js(?:\?[^"']*)?)["']/,
      )![1];
      const rootUrl = mainSource.match(
        /["']([^"']*\/react-dom_client\.js(?:\?[^"']*)?)["']/,
      )![1];
      const reactModule = await import(/* @vite-ignore */ reactUrl);
      const React = (reactModule.default ??
        reactModule) as typeof import("react");
      const rootModule = await import(/* @vite-ignore */ rootUrl);
      const { createRoot } = (rootModule.default ??
        rootModule) as typeof import("react-dom/client");
      const viewportUrl = "/src/Viewport.tsx";
      const { Viewport } = (await import(
        /* @vite-ignore */ viewportUrl
      )) as typeof import("../src/Viewport");
      const state: ViewHarness["proteinView"] = ((
        window as unknown as ViewHarness
      ).proteinView = {
        render: () => {},
        unmount: () => {},
        live: {},
        packets: [],
        framebufferStatuses: [],
        selected: "",
      });
      const style = document.createElement("style");
      style.textContent =
        ".scene-wrap{position:relative;width:320px;height:240px}.scene{width:320px;height:240px}.viewport-tools{position:absolute;top:0}.scene-label{display:none}";
      document.head.append(style);
      // Public GL allocation observers. Production uses the real methods unchanged.
      const prototype = WebGL2RenderingContext.prototype as unknown as Record<
        string,
        (...args: unknown[]) => unknown
      >;
      const checkFramebuffer = prototype.checkFramebufferStatus;
      prototype.checkFramebufferStatus = function (
        this: WebGL2RenderingContext,
        ...args
      ) {
        const status = Reflect.apply(checkFramebuffer, this, args) as number;
        state.framebufferStatuses.push(status);
        return status;
      };
      for (const kind of [
        "Buffer",
        "Texture",
        "Framebuffer",
        "Renderbuffer",
        "Program",
        "Shader",
      ]) {
        const live = new Set<unknown>();
        state.live[kind] = 0;
        const create = prototype[`create${kind}`],
          remove = prototype[`delete${kind}`];
        prototype[`create${kind}`] = function (
          this: WebGL2RenderingContext,
          ...args
        ) {
          const item = Reflect.apply(create, this, args);
          if (item) live.add(item);
          state.live[kind] = live.size;
          return item;
        };
        prototype[`delete${kind}`] = function (
          this: WebGL2RenderingContext,
          ...args
        ) {
          live.delete(args[0]);
          state.live[kind] = live.size;
          return Reflect.apply(remove, this, args);
        };
      }
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function (
        message,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        state.packets.push(message.action);
        post.call(
          this,
          message,
          Array.isArray(options) ? { transfer: options } : options,
        );
      };
      const root = createRoot(document.getElementById("root")!);
      const sampled: SampledGrid = {
        ...grid,
        values: Float32Array.from(grid.values),
      };
      const shader = {
        target: "custom-control",
        vertexName: "manufactured.vert",
        fragmentName: "manufactured.frag",
        vertexSource:
          "void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
        fragmentSource: "void main(){gl_FragColor=vec4(0.08,0.18,0.95,1.0);}",
        uniforms: [],
        values: {},
        transparent: false,
      };
      state.render = (protein, ao, hidden = false) => {
        const display: StructureDisplayState = {
          colorMode: "element",
          hiddenChains: hidden ? [0, 1] : [],
          hiddenKinds: [],
          chainStyles: protein ? { "0": "tube" } : {},
          kindStyles: {},
          isolatedChain: null,
          residueSelection: null,
          focus: null,
        };
        root.render(
          React.createElement(Viewport, {
            doc,
            grid: sampled,
            mode: "volume",
            shading: "diffuse",
            shader,
            reset: 0,
            structureDisplay: display,
            ambientOcclusion: { enabled: ao, strength: 1, radiusAngstrom: 3 },
            onSelect: (label: string) => {
              state.selected = label;
            },
          }),
        );
      };
      state.unmount = () => root.unmount();
      state.render(false, false);
    },
    { doc, grid },
  );
  await expect(
    page.getByLabel("Molecular scene", { exact: true }),
  ).toBeVisible();
  await settleScene(page);
  const capture = async (name: string) => {
    await settleScene(page);
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export image", exact: true })
      .click();
    const output = info.outputPath(`${name}.png`);
    await (await pending).saveAs(output);
    return fs.readFileSync(output);
  };
  const atomic = await capture("atomic-field-custom");
  const baseline = await page.evaluate(
    () => (window as unknown as ViewHarness).proteinView.live,
  );
  // Pinned WebGLRenderer creates three context-owned scratch framebuffers
  // before any AO target exists (WebGLRenderer.js initGLContext).
  expect(baseline.Framebuffer).toBe(3);
  // Empty4 + shared Standard-material DFG_LUT1 + field/ranges textures2.
  expect(baseline.Texture).toBe(7);
  await page.evaluate(() =>
    (window as unknown as ViewHarness).proteinView.render(true, false),
  );
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as ViewHarness).proteinView.packets.filter(
            (p) => p === "backbone",
          ).length,
      ),
    )
    .toBe(1);
  await expect(page.getByLabel("Protein depiction status")).not.toContainText(
    "Preparing",
  );
  const protein = await capture("tube-field-custom");
  await page.evaluate(() =>
    (window as unknown as ViewHarness).proteinView.render(true, true),
  );
  const ao = await capture("tube-ligand-ao-field-custom");
  await expect(page.getByRole("alert")).toHaveCount(0);
  const allocated = await page.evaluate(
    () => (window as unknown as ViewHarness).proteinView.live,
  );
  expect(allocated.Framebuffer).toBeGreaterThan(0);
  const glDiagnostics = await page.evaluate(() => {
    const canvas = document.querySelector(
      'canvas[aria-label="Molecular scene"]',
    ) as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2")!;
    return {
      statuses: (window as unknown as ViewHarness).proteinView
        .framebufferStatuses,
      complete: gl.FRAMEBUFFER_COMPLETE,
      error: gl.getError(),
    };
  });
  await info.attach("protein-gl-diagnostics.json", {
    body: JSON.stringify(glDiagnostics),
    contentType: "application/json",
  });
  expect(glDiagnostics.statuses.length).toBeGreaterThanOrEqual(3);
  expect(
    glDiagnostics.statuses.every((status) => status === glDiagnostics.complete),
  ).toBe(true);
  expect(glDiagnostics.error).toBe(0);
  await page.evaluate(() =>
    (window as unknown as ViewHarness).proteinView.render(true, false),
  );
  const restored = await capture("tube-ao-off");
  const visibleCanvas = await page
    .getByLabel("Molecular scene", { exact: true })
    .screenshot({
      style:
        '.viewport-tools, [aria-label="Protein depiction status"] { visibility: hidden !important; }',
    });
  await page.evaluate(() =>
    (window as unknown as ViewHarness).proteinView.render(true, false, true),
  );
  const fields = await capture("fields-only-control");
  const comparison = await page.evaluate(
    async (frames) => {
      const pixels = await Promise.all(
        frames.map(async (data) => {
          const image = new Image();
          image.src = `data:image/png;base64,${data}`;
          await image.decode();
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth;
          canvas.height = image.naturalHeight;
          const context = canvas.getContext("2d")!;
          context.drawImage(image, 0, 0);
          return context.getImageData(0, 0, canvas.width, canvas.height).data;
        }),
      );
      let green = 0,
        blue = 0,
        fieldMismatch = 0,
        atomicDifference = 0,
        offMismatch = 0,
        pngMismatch = 0;
      const reference = pixels[4];
      for (let i = 0; i < reference.length; i += 4) {
        const field =
          reference[i + 1] > reference[i] + 30 &&
          reference[i + 1] > reference[i + 2] + 15;
        const custom =
          reference[i + 2] > reference[i] + 70 &&
          reference[i + 2] > reference[i + 1] + 70;
        if (field) green++;
        if (custom) blue++;
        if (
          (field || custom) &&
          pixels
            .slice(0, 4)
            .some(
              (frame) =>
                frame[i] !== reference[i] ||
                frame[i + 1] !== reference[i + 1] ||
                frame[i + 2] !== reference[i + 2],
            )
        )
          fieldMismatch++;
        if (
          pixels[0][i] !== pixels[1][i] ||
          pixels[0][i + 1] !== pixels[1][i + 1] ||
          pixels[0][i + 2] !== pixels[1][i + 2]
        )
          atomicDifference++;
        if (
          pixels[1][i] !== pixels[3][i] ||
          pixels[1][i + 1] !== pixels[3][i + 1] ||
          pixels[1][i + 2] !== pixels[3][i + 2]
        )
          offMismatch++;
        if (
          [0, 1, 2, 3].some(
            (channel) => pixels[3][i + channel] !== pixels[5][i + channel],
          )
        )
          pngMismatch++;
      }
      return {
        green,
        blue,
        fieldMismatch,
        atomicDifference,
        offMismatch,
        pngMismatch,
      };
    },
    [atomic, protein, ao, restored, fields, visibleCanvas].map((frame) =>
      frame.toString("base64"),
    ),
  );
  await info.attach("protein-field-comparison.json", {
    body: JSON.stringify({ comparison, allocated }),
    contentType: "application/json",
  });
  expect(comparison.green).toBeGreaterThan(30);
  expect(comparison.blue).toBeGreaterThan(30);
  expect(comparison.fieldMismatch).toBe(0);
  expect(comparison.atomicDifference).toBeGreaterThan(100);
  expect(comparison.offMismatch).toBe(0);
  expect(comparison.pngMismatch).toBe(0);
  expect((await pngPixels(page, ao)).foreground12).toBeGreaterThan(100);
  expect(
    await page.evaluate(
      () => (window as unknown as ViewHarness).proteinView.packets,
    ),
  ).toEqual(["backbone"]);
  await page.evaluate(() =>
    (window as unknown as ViewHarness).proteinView.unmount(),
  );
  await expect(page.getByLabel("Molecular scene", { exact: true })).toHaveCount(
    0,
  );
  const released = await page.evaluate(
    () => (window as unknown as ViewHarness).proteinView.live,
  );
  await info.attach("protein-gl-lifecycle.json", {
    body: JSON.stringify({ baseline, allocated, released }),
    contentType: "application/json",
  });
  for (const kind of ["Buffer", "Renderbuffer", "Program", "Shader"])
    expect(released[kind], kind).toBe(0);
  expect(released.Framebuffer).toBe(baseline.Framebuffer);
  // Pinned Three owns four empty context textures and one shared 16x16 RG16F
  // DFG_LUT (WebGLRenderer getDFGLUT). renderer.dispose does not release those
  // nor its three scratch framebuffers. Both volume textures and all AO targets,
  // noise and depth textures must be gone; the fixed baseline cannot grow.
  expect(released.Texture).toBe(5);
  await info.attach("protein-field-isolation.json", {
    body: JSON.stringify({
      comparison,
      baseline,
      allocated,
      released,
      glDiagnostics,
    }),
    contentType: "application/json",
  });
});
