import { test, expect } from "@playwright/test";
import type {
  EigenVistaDocument,
  SampledGrid,
  StructureMetadata,
} from "../src/types";

test("biological metadata replacements are validated before registered field reuse", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const observed = await page.evaluate(async () => {
    const NativeWorker = window.Worker;
    const packets: { action: string; hasDoc: boolean }[] = [];
    window.Worker = class extends NativeWorker {
      postMessage(
        message: unknown,
        options?: StructuredSerializeOptions | Transferable[],
      ) {
        const packet = message as { action: string; args: { doc?: unknown } };
        packets.push({
          action: packet.action,
          hasDoc: Object.hasOwn(packet.args, "doc"),
        });
        if (Array.isArray(options)) super.postMessage(message, options);
        else super.postMessage(message, options);
      }
    };
    const url = "/src/science.ts?structure-registration-validation";
    const { createScienceClient } = await import(/* @vite-ignore */ url);
    const client = createScienceClient();
    const doc: EigenVistaDocument = await client.request("example", {
      openShell: false,
    });
    const field = doc.densities[0].id;
    const before: SampledGrid = await client.request("sample", {
      doc,
      field,
      resolution: 16,
    });
    // One annotation for a two-atom document is independently malformed. It must
    // be rejected even though every existing scientific array reference is reused.
    const malformed: StructureMetadata = {
      chains: [{ label_id: null, author_id: "A", entity_id: null }],
      residues: [
        {
          chain: 0,
          name: "H2",
          label_seq_id: null,
          author_seq_id: "1",
          insertion_code: null,
          segment: 0,
          kind: "unknown",
          secondary: "unknown",
        },
      ],
      atom_names: ["H1"],
      atom_residues: [0],
      secondary_source: "none",
    };
    let invalidError = "";
    try {
      await client.request("sample", {
        doc: { ...doc, structure: malformed },
        field,
        resolution: 16,
      });
    } catch (error) {
      invalidError = String(error);
    }
    const valid = {
      ...malformed,
      atom_names: ["H1", "H2"],
      atom_residues: [0, 0],
    };
    const validDoc = { ...doc, structure: valid };
    const after: SampledGrid = await client.request("sample", {
      doc: validDoc,
      field,
      resolution: 16,
    });
    let backboneError = "";
    try {
      await client.request("backbone", {
        doc: { ...validDoc, structure: malformed },
      });
    } catch (error) {
      backboneError = String(error);
    }
    const retained: SampledGrid = await client.request("sample", {
      doc: validDoc,
      field,
      resolution: 16,
    });
    return {
      invalidError,
      backboneError,
      retainedEqual: before.values.every((v: number, i: number) =>
        Object.is(v, retained.values[i]),
      ),
      valuesEqual: before.values.every((v: number, i: number) =>
        Object.is(v, after.values[i]),
      ),
      samples: before.values.length,
      packets: packets.filter((p) => p.action === "sample"),
    };
  });
  expect(observed.invalidError).toMatch(
    /biological metadata.*(?:counts|selected atoms)/i,
  );
  expect(observed.backboneError).toMatch(
    /biological metadata.*(?:counts|selected atoms)/i,
  );
  expect(observed.retainedEqual).toBe(true);
  expect(observed.samples).toBe(16 ** 3);
  expect(observed.valuesEqual).toBe(true);
  expect(observed.packets).toEqual([
    { action: "sample", hasDoc: true },
    { action: "sample", hasDoc: true },
    { action: "sample", hasDoc: true },
    { action: "sample", hasDoc: false },
  ]);
});
