// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { EigenVistaDocument, Grid, Surface } from "../src/types";

interface Client {
  request<T>(
    action: string,
    args: Record<string, unknown>,
    progress?: (stage: string) => void,
  ): Promise<T>;
}

async function ready(page: Page) {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
}

async function save(page: Page, filename: string): Promise<EigenVistaDocument> {
  const download = page.waitForEvent("download");
  await page.getByTitle("Save document", { exact: true }).click();
  const destination = path.resolve(`../artifacts/${filename}.eigenvista`);
  await (await download).saveAs(destination);
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  return page.evaluate(
    async (bytes) => {
      const url = "/src/wasm/eigenvista_wasm.js";
      const core = await import(/* @vite-ignore */ url);
      await core.default();
      return JSON.parse(core.decode(new Uint8Array(bytes)));
    },
    Array.from(readFileSync(destination)),
  );
}

test("publication validation and Save agree on real meshes, retained scientific data and invalid native documents", async ({
  page,
}) => {
  await ready(page);
  const result = await page.evaluate(async () => {
    const wasmUrl = "/src/wasm/eigenvista_wasm.js";
    const scienceUrl = "/src/science.ts?publication-validation-contract";
    const core = await import(/* @vite-ignore */ wasmUrl);
    const science = await import(/* @vite-ignore */ scienceUrl);
    await core.default();
    const client: Client = science.createScienceClient();
    const doc: EigenVistaDocument = JSON.parse(core.example(false));
    const originalJSON = JSON.stringify(doc);
    const sampled = new core.SampledField(originalJSON, "antibonding", 24);
    try {
      doc.surfaces = JSON.parse(sampled.surfaces(originalJSON, 0.08));
    } finally {
      sampled.free();
    }
    const retained: Grid = JSON.parse(core.sample(originalJSON, "bonding", 12));
    retained.id = "retained-source-grid";
    doc.grids.push(retained);
    const validJSON = JSON.stringify(doc);
    const rejected = (operation: () => unknown): string | null => {
      try {
        operation();
        return null;
      } catch (error) {
        return String(error);
      }
    };
    const badHash = structuredClone(doc);
    badHash.surfaces[0].source_hash = "0".repeat(64);
    const malformed = structuredClone(doc);
    malformed.densities[0].matrix.pop();
    const occupation = structuredClone(doc);
    occupation.orbitals[0].occupation = 3;
    const nonfinite = structuredClone(doc);
    nonfinite.basis[0].exponents[0] = Infinity;
    // JSON transports cannot spell Infinity. The API must also reject an
    // overflowing JSON number instead of silently admitting a nonfinite value.
    const nonfiniteJSON = JSON.stringify(nonfinite).replace(
      '"exponents":[null]',
      '"exponents":[1e999]',
    );
    const oversized = structuredClone(doc);
    oversized.provenance.push("x".repeat(8 * 1024 * 1024));
    const progress: string[] = [];
    const decisions = [];
    for (const [kind, candidate, json] of [
      ["valid", doc, validJSON],
      ["source hash", badHash, JSON.stringify(badHash)],
      ["malformed density", malformed, JSON.stringify(malformed)],
      ["occupation", occupation, JSON.stringify(occupation)],
      ["nonfinite", nonfinite, nonfiniteJSON],
      ["manifest", oversized, JSON.stringify(oversized)],
    ] as const) {
      const validation = rejected(() => core.validate_document(json));
      const encoding = rejected(() => core.encode(json));
      let worker: string | null = null;
      try {
        await client.request("validate", { doc: candidate }, (stage) =>
          progress.push(stage),
        );
      } catch (error) {
        worker = String(error);
      }
      // A rejected publication must leave the real worker usable for valid
      // validation and Save, with all scientific inputs and meshes retained.
      await client.request("validate", { doc });
      const saved = await client.request<Uint8Array>("encode", { doc });
      const recovered =
        JSON.stringify(JSON.parse(core.decode(saved))) === validJSON;
      decisions.push({ kind, validation, encoding, worker, recovered });
    }
    return {
      decisions,
      progress,
      oldModelAcceptsOversized:
        rejected(() => core.validate(JSON.stringify(oversized))) === null,
      signs: doc.surfaces.map((surface) => surface.isovalue).sort(),
      retainedSamples: doc.grids[0].values.length,
      scientificCounts: [
        doc.basis.length,
        doc.orbitals.length,
        doc.densities.length,
      ],
      sourceHashes: doc.surfaces.map((surface) => surface.source_hash),
      sourceUnchanged:
        originalJSON === JSON.stringify({ ...doc, surfaces: [], grids: [] }),
    };
  });
  expect(result.signs).toEqual([-0.08, 0.08]);
  expect(result.retainedSamples).toBe(12 ** 3);
  expect(result.scientificCounts).toEqual([2, 2, 1]);
  expect(
    result.sourceHashes.every((hash) => /^[0-9a-f]{64}$/.test(hash ?? "")),
  ).toBe(true);
  expect(result.sourceUnchanged).toBe(true);
  expect(result.oldModelAcceptsOversized).toBe(true);
  expect(result.progress).toContain("validating");
  for (const decision of result.decisions) {
    expect(decision.validation, decision.kind).toBe(decision.encoding);
    expect(decision.recovered, decision.kind).toBe(true);
    if (decision.kind === "valid") {
      expect(decision.validation).toBeNull();
      expect(decision.worker).toBeNull();
    } else {
      expect(decision.validation, decision.kind).not.toBeNull();
      expect(decision.worker, decision.kind).not.toBeNull();
    }
    if (decision.kind === "manifest") {
      expect(decision.validation).toContain(
        "Native document exceeds preview budget",
      );
      expect(decision.worker).toContain(
        "Native document exceeds preview budget",
      );
    }
  }
});

interface GenerationPacket {
  worker: number;
  registration?: number;
  hasDoc: boolean;
}
interface PublicationProbe {
  watch: boolean;
  holdValidation: boolean;
  validating: number;
  held: boolean;
  validatingWorker: number | null;
  generated: GenerationPacket[];
  stagedSurfaces: Surface[];
  terminated: number[];
}
type ProbeWindow = Window & { publicationProbe: PublicationProbe };

async function generateBatch(page: Page) {
  await page
    .getByRole("button", { name: "Browse orbitals", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Orbitals", exact: true });
  await dialog.getByRole("button", { name: "Clear orbital selection" }).click();
  for (const number of [1, 2]) {
    await dialog
      .getByRole("checkbox", { name: `Select orbital ${number}`, exact: true })
      .check();
  }
  await dialog.getByLabel("Orbital isovalue", { exact: true }).fill("0.04");
  await dialog
    .getByLabel("Orbital grid resolution", { exact: true })
    .selectOption("24");
  await dialog
    .getByRole("button", { name: "Generate selected", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
}

test("Cancel while actual publication validation is pending retains the saved document and retries with fresh registration", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    const probe: PublicationProbe = {
      watch: false,
      holdValidation: false,
      validating: 0,
      held: false,
      validatingWorker: null,
      generated: [],
      stagedSurfaces: [],
      terminated: [],
    };
    (window as unknown as ProbeWindow).publicationProbe = probe;
    const NativeWorker = window.Worker;
    let nextWorker = 0;
    window.Worker = class PublicationWorker extends NativeWorker {
      private probeId = ++nextWorker;
      private validationId: number | undefined;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        // Install before the bridge's onmessage handler so both engines observe
        // real progress but cannot publish the held actual validation result.
        this.addEventListener("message", (event: MessageEvent) => {
          if (event.data.id !== this.validationId) return;
          if (event.data.progress === "validating") probe.validating++;
          if (Object.hasOwn(event.data, "result") && probe.holdValidation) {
            probe.held = true;
            event.stopImmediatePropagation();
          }
        });
      }
      postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        const packet = message as {
          id: number;
          action: string;
          args: { registration?: number; doc?: EigenVistaDocument };
        };
        if (probe.watch && packet.action === "generate") {
          probe.generated.push({
            worker: this.probeId,
            registration: packet.args.registration,
            hasDoc: Object.hasOwn(packet.args, "doc"),
          });
        }
        if (packet.action === "validate" && probe.holdValidation) {
          this.validationId = packet.id;
          probe.validatingWorker = this.probeId;
          probe.stagedSurfaces = packet.args.doc!.surfaces;
        }
        super.postMessage(
          message,
          Array.isArray(options) ? { transfer: options } : options,
        );
      }
      terminate() {
        probe.terminated.push(this.probeId);
        super.terminate();
      }
    };
  });
  await ready(page);
  const before = await save(
    page,
    `publication-${testInfo.project.name}-before`,
  );
  expect(before.surfaces.length).toBeGreaterThan(0);
  const originalResolution = await page
    .getByLabel("Grid resolution", { exact: true })
    .inputValue();
  await page.evaluate(() => {
    const probe = (window as unknown as ProbeWindow).publicationProbe;
    probe.watch = true;
    probe.holdValidation = true;
  });
  await generateBatch(page);
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as ProbeWindow).publicationProbe.held,
      ),
    )
    .toBe(true);
  const pending = await page.evaluate(
    () => (window as unknown as ProbeWindow).publicationProbe,
  );
  expect(pending.validating).toBe(1);
  expect(pending.generated).toHaveLength(2);
  expect(pending.stagedSurfaces.length).toBeGreaterThan(before.surfaces.length);
  expect(
    pending.stagedSurfaces.every((surface) =>
      surface.resolution.every((n) => n === 24),
    ),
  ).toBe(true);
  await expect(
    page.getByRole("progressbar", { name: "Checking saved geometry" }),
  ).toBeVisible();
  await expect(page.locator(".surface-row")).toHaveCount(
    before.surfaces.length,
  );
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.locator("footer [role=status]")).toContainText(
    "previous surfaces retained",
  );
  await expect(page.getByLabel("Calculation progress")).toHaveCount(0);
  await expect(page.getByLabel("Grid resolution", { exact: true })).toHaveValue(
    originalResolution,
  );
  await page.evaluate(() => {
    (window as unknown as ProbeWindow).publicationProbe.holdValidation = false;
  });
  expect(
    await save(page, `publication-${testInfo.project.name}-cancelled`),
  ).toEqual(before);
  await generateBatch(page);
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  await expect(page.getByLabel("Unsaved changes")).toHaveCount(1);
  const retried = await save(
    page,
    `publication-${testInfo.project.name}-retry`,
  );
  expect(retried.surfaces).toEqual(pending.stagedSurfaces);
  expect(retried.basis).toEqual(before.basis);
  expect(retried.orbitals).toEqual(before.orbitals);
  expect(retried.densities).toEqual(before.densities);
  expect(retried.grids).toEqual(before.grids);
  const recovered = await page.evaluate(
    () => (window as unknown as ProbeWindow).publicationProbe,
  );
  expect(recovered.terminated).toContain(pending.validatingWorker);
  expect(recovered.generated).toHaveLength(4);
  expect(recovered.generated[2].worker).not.toBe(pending.validatingWorker);
  expect(recovered.generated[2].hasDoc).toBe(true);
  expect(recovered.generated[3].hasDoc).toBe(false);
});
