import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type {
  EigenVistaDocument,
  Generation,
  ImportResult,
  SampledGrid,
} from "../src/types";

interface Packet {
  worker: number;
  id: number;
  action: string;
  registration?: number;
  hasDoc: boolean;
  bytes: number;
  field?: string;
  resolution?: number;
}
interface Client {
  request<T>(
    action: string,
    args: Record<string, unknown>,
    progress?: (
      stage: string,
      counts?: { completed: number; total: number },
    ) => void,
  ): Promise<T>;
  cancel(reason?: Error): void;
}
interface RegistrationProbe {
  client: Client;
  packets: Packet[];
}
type ProbeWindow = Window & { registrationProbe: RegistrationProbe };

async function prepare(page: Page, label: string) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await page.evaluate(async (label) => {
    const packets: Packet[] = [];
    const NativeWorker = window.Worker;
    let nextWorker = 0;
    window.Worker = class ObservedWorker extends NativeWorker {
      private probeId = ++nextWorker;
      postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        const packet = message as {
          id: number;
          action: string;
          args: {
            doc?: unknown;
            registration?: number;
            field?: string;
            resolution?: number;
          };
        };
        packets.push({
          worker: this.probeId,
          id: packet.id,
          action: packet.action,
          registration: packet.args.registration,
          hasDoc: Object.hasOwn(packet.args, "doc"),
          bytes: ["sample", "generate"].includes(packet.action)
            ? JSON.stringify(packet).length
            : 0,
          field: packet.args.field,
          resolution: packet.args.resolution,
        });
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
    // The isolated bridge owns a separate actual worker from the rendered App.
    const url = `/src/science.ts?registration-case=${label}`;
    const science = await import(/* @vite-ignore */ url);
    (window as unknown as ProbeWindow).registrationProbe = {
      client: science.createScienceClient(),
      packets,
    };
  }, label);
}

test("queued requests retain submitted primitive parameters while another owner samples", async ({
  page,
}) => {
  await prepare(page, "argument-snapshot");
  const result = await page.evaluate(async () => {
    const { client, packets } = (window as unknown as ProbeWindow)
      .registrationProbe;
    const url = "/src/science.ts?registration-case=argument-snapshot";
    const science = await import(/* @vite-ignore */ url);
    const active: Client = science.createScienceClient();
    const doc = await active.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const progress: string[] = [];
    const sampling = active.request<SampledGrid>(
      "sample",
      { doc, field: doc.densities[0].id, resolution: 128 },
      (stage) => progress.push(stage),
    );
    const parameters = { openShell: true };
    const queued = client.request<EigenVistaDocument>("example", parameters);
    // Worker delivery is deferred by the other owner's active calculation.
    parameters.openShell = false;
    const [grid, example] = await Promise.all([sampling, queued]);
    return { id: example.id, values: grid.values.length, progress, packets };
  });
  expect(result.id).toBe("analytic-open-shell-v1");
  expect(result.values).toBe(128 ** 3);
  expect(result.progress).toContain("sampling");
  expect(result.packets.map((packet) => packet.action)).toEqual([
    "example",
    "sample",
    "example",
  ]);
  expect(new Set(result.packets.map((packet) => packet.worker)).size).toBe(1);
});

test("real Molden requests register once and reuse small messages for current appearance and isovalue", async ({
  page,
}) => {
  await prepare(page, "molden-reuse");
  const bytes = Array.from(
    fs.readFileSync(path.resolve("../fixtures/legacy/data/molden.input")),
  );
  const result = await page.evaluate(async (bytes) => {
    const { client, packets } = (window as unknown as ProbeWindow)
      .registrationProbe;
    const imported = await client.request<ImportResult>("import_document", {
      bytes: new Uint8Array(bytes),
      name: "molden.input",
    });
    const doc = imported.document;
    const field = doc.orbitals[0].id;
    const firstProgress: string[] = [];
    const original = await client.request<SampledGrid>(
      "sample",
      { doc, field, resolution: 24 },
      (stage) => firstProgress.push(stage),
    );
    const edited = {
      ...doc,
      view: {
        ...doc.view,
        positive_color: "#1234ab",
        negative_color: "#ab3412",
        opacity: 0.35,
      },
      surfaces: [],
    };
    const meshProgress: string[] = [];
    const generated = await client.request<Generation>(
      "generate",
      { doc: edited, field, resolution: 24, iso: 0.06 },
      (stage) => meshProgress.push(stage),
    );
    const repeatedProgress: string[] = [];
    const repeated = await client.request<SampledGrid>(
      "sample",
      { doc: edited, field, resolution: 24 },
      (stage) => repeatedProgress.push(stage),
    );
    const coreUrl = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ coreUrl);
    await core.default();
    const json = JSON.stringify(edited);
    const legacy = new core.SampledField(json, field, 24);
    try {
      const reference: Float32Array = legacy.display_values();
      const expectedSurfaces = JSON.parse(legacy.surfaces(json, 0.06));
      const stored = { ...edited, surfaces: generated.surfaces };
      const encoded = await client.request<Uint8Array>("encode", {
        doc: stored,
      });
      const reopened: EigenVistaDocument = JSON.parse(core.decode(encoded));
      return {
        samples: [original, repeated, generated.grid].every((grid) =>
          grid.values.every((value, i) => Object.is(value, reference[i])),
        ),
        meshes:
          JSON.stringify(generated.surfaces) ===
          JSON.stringify(expectedSurfaces),
        hashes: generated.surfaces.every((surface) =>
          /^[a-f0-9]{64}$/.test(surface.source_hash ?? ""),
        ),
        material:
          generated.surfaces.length > 0 &&
          generated.surfaces.every(
            (surface) =>
              surface.opacity === 0.35 &&
              surface.color ===
                ((surface.isovalue ?? 0) > 0 ? "#1234ab" : "#ab3412"),
          ),
        saved: JSON.stringify(reopened) === JSON.stringify(stored),
        packets: packets.filter((packet) =>
          ["sample", "generate"].includes(packet.action),
        ),
        firstProgress,
        meshProgress,
        repeatedProgress,
      };
    } finally {
      legacy.free();
    }
  }, bytes);
  expect(result.samples).toBe(true);
  expect(result.meshes).toBe(true);
  expect(result.hashes).toBe(true);
  expect(result.material).toBe(true);
  expect(result.saved).toBe(true);
  expect(result.firstProgress).toContain("sampling");
  expect(result.meshProgress).not.toContain("sampling");
  expect(result.meshProgress).toContain("meshing");
  expect(result.repeatedProgress).not.toContain("sampling");
  expect(result.packets.map((packet) => packet.hasDoc)).toEqual([
    true,
    false,
    false,
  ]);
  expect(
    new Set(result.packets.map((packet) => packet.registration)).size,
  ).toBe(1);
  expect(result.packets[0].bytes).toBeGreaterThan(100_000);
  expect(result.packets.slice(1).every((packet) => packet.bytes < 1000)).toBe(
    true,
  );
});

test("field and resolution changes resample without resending the immutable source", async ({
  page,
}) => {
  await prepare(page, "field-resolution");
  const report = await page.evaluate(async () => {
    const { client, packets } = (window as unknown as ProbeWindow)
      .registrationProbe;
    const doc = await client.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const fields = [
      doc.orbitals[0].id,
      doc.orbitals[0].id,
      doc.orbitals[1].id,
      doc.orbitals[1].id,
      doc.densities[0].id,
    ];
    const resolutions = [12, 12, 12, 16, 16];
    const results = [];
    for (let i = 0; i < fields.length; i++) {
      const stages: string[] = [];
      const grid = await client.request<SampledGrid>(
        "sample",
        { doc, field: fields[i], resolution: resolutions[i] },
        (stage) => stages.push(stage),
      );
      const reference = JSON.parse(
        core.sample(JSON.stringify(doc), fields[i], resolutions[i]),
      );
      results.push({
        sampled: stages.includes("sampling"),
        size: grid.values.length,
        matches: grid.values.every((value, j) =>
          Object.is(value, Math.fround(reference.values[j])),
        ),
      });
    }
    return {
      results,
      packets: packets.filter((packet) => packet.action === "sample"),
    };
  });
  expect(report.results.map((result) => result.sampled)).toEqual([
    true,
    false,
    true,
    true,
    true,
  ]);
  expect(report.results.map((result) => result.size)).toEqual([
    12 ** 3,
    12 ** 3,
    12 ** 3,
    16 ** 3,
    16 ** 3,
  ]);
  expect(report.results.every((result) => result.matches)).toBe(true);
  expect(report.packets.map((packet) => packet.hasDoc)).toEqual([
    true,
    false,
    false,
    false,
    false,
  ]);
  expect(
    new Set(report.packets.map((packet) => packet.registration)).size,
  ).toBe(1);
});

test("replaced basis, orbital, density and grid arrays re-register even with identical document IDs and array lengths", async ({
  page,
}) => {
  await prepare(page, "source-replacement");
  const cube = Array.from(
    fs.readFileSync(path.resolve("../fixtures/cube/signed-affine.cube")),
  );
  const result = await page.evaluate(async (cube) => {
    const { client, packets } = (window as unknown as ProbeWindow)
      .registrationProbe;
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    let doc = await client.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const id = doc.id;
    const title = doc.title;
    const orbital = doc.orbitals[0].id;
    const density = doc.densities[0].id;
    const reports: {
      label: string;
      sampled: boolean;
      id: string;
      title: string;
      matches: boolean;
      values: number[];
    }[] = [];
    const sample = async (label: string, field: string) => {
      const progress: string[] = [];
      const grid = await client.request<SampledGrid>(
        "sample",
        { doc, field, resolution: 12 },
        (stage) => progress.push(stage),
      );
      const reference = JSON.parse(core.sample(JSON.stringify(doc), field, 12));
      reports.push({
        label,
        sampled: progress.includes("sampling"),
        id: doc.id,
        title: doc.title,
        matches: grid.values.every((value, i) =>
          Object.is(value, Math.fround(reference.values[i])),
        ),
        values: Array.from(grid.values),
      });
    };
    await sample("original", orbital);
    doc = {
      ...doc,
      basis: doc.basis.map((basis, i) =>
        i
          ? basis
          : {
              ...basis,
              coefficients: basis.coefficients.map((value) => value * 1.125),
            },
      ),
    };
    await sample("basis", orbital);
    doc = {
      ...doc,
      orbitals: doc.orbitals.map((value, i) =>
        i
          ? value
          : {
              ...value,
              coefficients: value.coefficients.map(
                (coefficient) => coefficient * 1.125,
              ),
            },
      ),
    };
    await sample("orbital", orbital);
    doc = {
      ...doc,
      densities: doc.densities.map((value, i) =>
        i
          ? value
          : {
              ...value,
              matrix: value.matrix.map((coefficient) => coefficient * 1.125),
            },
      ),
    };
    await sample("density", density);
    const imported = await client.request<ImportResult>("import_document", {
      bytes: new Uint8Array(cube),
      name: "signed-affine.cube",
    });
    doc = imported.document;
    await sample("cube-original", doc.grids[0].id);
    doc = {
      ...doc,
      grids: doc.grids.map((grid) => ({
        ...grid,
        values: grid.values.map((value) => value * 1.125),
      })),
    };
    await sample("grid", doc.grids[0].id);
    return {
      id,
      title,
      reports,
      packets: packets.filter((packet) => packet.action === "sample"),
    };
  }, cube);
  expect(
    result.reports.every((report) => report.sampled && report.matches),
  ).toBe(true);
  expect(
    result.reports
      .slice(0, 4)
      .every(
        (report) => report.id === result.id && report.title === result.title,
      ),
  ).toBe(true);
  expect(result.reports[0].values).not.toEqual(result.reports[1].values);
  expect(result.reports[1].values).not.toEqual(result.reports[2].values);
  expect(result.reports[4].values).not.toEqual(result.reports[5].values);
  expect(result.reports[4].id).toBe(result.reports[5].id);
  expect(result.reports[4].title).toBe(result.reports[5].title);
  expect(result.packets.every((packet) => packet.hasDoc)).toBe(true);
  expect(
    new Set(result.packets.map((packet) => packet.registration)).size,
  ).toBe(6);
});

test("active cancellation and invalid registration force a fresh source before cache reuse", async ({
  page,
}) => {
  await prepare(page, "restart-error");
  const result = await page.evaluate(async () => {
    const { client, packets } = (window as unknown as ProbeWindow)
      .registrationProbe;
    const doc = await client.request<EigenVistaDocument>("example", {
      openShell: false,
    });
    const field = doc.densities[0].id;
    await client.request<SampledGrid>("sample", { doc, field, resolution: 12 });
    let cancelled = false;
    const cancellation = await client
      .request<SampledGrid>(
        "sample",
        { doc, field, resolution: 256 },
        (stage) => {
          if (stage === "sampling" && !cancelled) {
            cancelled = true;
            client.cancel();
          }
        },
      )
      .then(
        () => "",
        (error) => String(error),
      );
    const fresh = await client.request<SampledGrid>("sample", {
      doc,
      field,
      resolution: 12,
    });
    const invalid = {
      ...doc,
      basis: doc.basis.map((basis, i) =>
        i ? basis : { ...basis, exponents: basis.exponents.map(() => -1) },
      ),
    };
    const invalidError = await client
      .request("sample", { doc: invalid, field, resolution: 12 })
      .then(
        () => "",
        (error) => String(error),
      );
    const recovered = await client.request<SampledGrid>("sample", {
      doc,
      field,
      resolution: 12,
    });
    const badAppearance = { ...doc, view: { ...doc.view, opacity: -1 } };
    const materialError = await client
      .request("generate", {
        doc: badAppearance,
        field,
        resolution: 12,
        iso: 0.08,
      })
      .then(
        () => "",
        (error) => String(error),
      );
    const final = await client.request<Generation>("generate", {
      doc,
      field,
      resolution: 12,
      iso: 0.08,
    });
    return {
      cancelled,
      cancellation,
      invalidError,
      materialError,
      matches: [recovered, final.grid].every((grid) =>
        grid.values.every((value, i) => Object.is(value, fresh.values[i])),
      ),
      meshes: final.surfaces.length,
      packets: packets.filter((packet) =>
        ["sample", "generate"].includes(packet.action),
      ),
    };
  });
  expect(result.cancelled).toBe(true);
  expect(result.cancellation).toMatch(/cancelled/i);
  expect(result.invalidError).not.toBe("");
  expect(result.materialError).toContain("Invalid surface view settings");
  expect(result.matches).toBe(true);
  expect(result.meshes).toBeGreaterThan(0);
  expect(result.packets.map((packet) => packet.hasDoc)).toEqual([
    true,
    false,
    true,
    true,
    true,
    false,
    true,
  ]);
  expect(result.packets[0].worker).not.toBe(result.packets[2].worker);
  expect(
    new Set(result.packets.slice(2).map((packet) => packet.worker)).size,
  ).toBe(1);
  expect(result.packets[2].registration).not.toBe(
    result.packets[4].registration,
  );
});
