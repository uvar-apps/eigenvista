import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import type { EigenVistaDocument, Grid, Surface } from "../src/types";

for (const fixture of [
  { name: "Molden", file: "legacy/data/molden.input", analytic: true },
  { name: "cube", file: "legacy/data/h2o-dens.cube", analytic: false },
]) {
  test(`registered ${fixture.name} fields retain legacy samples, meshes, hashes and native scientific data`, async ({
    page,
  }) => {
    const bytes = Array.from(
      fs.readFileSync(path.resolve("../fixtures", fixture.file)),
    );
    await page.goto("/");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const reports = await page.evaluate(
      async ({ bytes, fixture }) => {
        const url = "/src/wasm/eigenvista_wasm.js";
        const core = await import(/* @vite-ignore */ url);
        await core.default();
        const { document }: { document: EigenVistaDocument } = JSON.parse(
          core.import_document(
            new Uint8Array(bytes),
            fixture.file.split("/").at(-1),
          ),
        );
        const json = JSON.stringify(document);
        const science = (doc: EigenVistaDocument) =>
          JSON.stringify([
            doc.atoms,
            doc.bonds,
            doc.basis,
            doc.orbitals,
            doc.densities,
            doc.grids,
          ]);
        const originalScience = science(document);
        const fields = fixture.analytic
          ? [document.view.field!, document.densities[0].id]
          : [document.grids[0].id];
        const registered = new core.RegisteredDocument(json);
        const reports = [];
        try {
          for (const field of fields) {
            const sampling: [number, number][] = [];
            const prepared = registered.prepare(
              field,
              24,
              (done: number, total: number) => sampling.push([done, total]),
            );
            let hitCallbacks = 0;
            const repeated = registered.prepare(field, 24, () => {
              hitCallbacks++;
              throw new Error("A cache hit must not invoke sampling");
            });
            const legacyJSON = core.sample(json, field, 24);
            const { values, ...metadata }: Grid = JSON.parse(legacyJSON);
            const display: Float32Array = registered.display_values();
            const legacy = new core.SampledField(json, field, 24);
            try {
              const positive = "#1234ab";
              const negative = "#ab3412";
              const opacity = 0.35;
              const iso = document.view.isovalue;
              const edited = {
                ...document,
                view: {
                  ...document.view,
                  field,
                  positive_color: positive,
                  negative_color: negative,
                  opacity,
                },
              };
              const meshing: [number, number][] = [];
              const generated = registered.surfaces(
                iso,
                positive,
                negative,
                opacity,
                (done: number, total: number) => meshing.push([done, total]),
              );
              const expected = legacy.surfaces(JSON.stringify(edited), iso);
              const surfaces: Surface[] = JSON.parse(generated);
              const reopened: EigenVistaDocument = JSON.parse(
                core.decode(
                  core.encode(JSON.stringify({ ...edited, surfaces })),
                ),
              );
              const unchanged: Float32Array = registered.display_values();
              // Exporting display values cannot mutate the resident f64 samples.
              display[0] = 12345;
              const independent: Float32Array = registered.display_values();
              reports.push({
                field,
                prepared,
                repeated,
                hitCallbacks,
                sampling,
                meshing,
                metadata: JSON.parse(registered.metadata()),
                expectedMetadata: metadata,
                typed: display instanceof Float32Array,
                samplesMatch: unchanged.every((value, index) =>
                  Object.is(value, Math.fround(values[index])),
                ),
                displayIndependent: independent.every((value, index) =>
                  Object.is(value, Math.fround(values[index])),
                ),
                meshesExactlyMatch: generated === expected,
                hashesMatch: reopened.surfaces.every(
                  (surface, index) =>
                    surface.source_hash === surfaces[index].source_hash &&
                    /^[0-9a-f]{64}$/.test(surface.source_hash ?? ""),
                ),
                nonempty: surfaces.length > 0,
                materialMatches: surfaces.every(
                  (surface) =>
                    surface.opacity === opacity &&
                    surface.color ===
                      ((surface.isovalue ?? 0) > 0 ? positive : negative),
                ),
                nativeScienceUnchanged: science(reopened) === originalScience,
                inputUnchanged: JSON.stringify(document) === json,
                stillCached: !registered.prepare(field, 24, undefined),
              });
            } finally {
              legacy.free();
            }
          }
        } finally {
          registered.free();
        }
        return reports;
      },
      { bytes, fixture },
    );

    expect(reports).toHaveLength(fixture.analytic ? 2 : 1);
    for (const report of reports) {
      expect(report.prepared).toBe(true);
      expect(report.repeated).toBe(false);
      expect(report.hitCallbacks).toBe(0);
      expect(report.metadata).toEqual(report.expectedMetadata);
      expect(report.sampling[0]).toEqual([0, 24]);
      expect(report.sampling.at(-1)).toEqual([24, 24]);
      expect(report.sampling).toHaveLength(25);
      expect(report.meshing).toEqual([
        [0, 2],
        [1, 2],
        [2, 2],
      ]);
      for (const name of [
        "typed",
        "samplesMatch",
        "displayIndependent",
        "meshesExactlyMatch",
        "hashesMatch",
        "nonempty",
        "materialMatches",
        "nativeScienceUnchanged",
        "inputUnchanged",
        "stillCached",
      ] as const)
        expect(report[name], `${report.field}: ${name}`).toBe(true);
    }
    const evidence = path.resolve(
      `../artifacts/registered-document-${test.info().project.name}-${fixture.name.toLowerCase()}.json`,
    );
    fs.mkdirSync(path.dirname(evidence), { recursive: true });
    fs.writeFileSync(evidence, JSON.stringify(reports, null, 2) + "\n");
    await test.info().attach("registered-parity", {
      path: evidence,
      contentType: "application/json",
    });
  });
}

test("registered ownership invalidates field, resolution and replaced sources without retaining stale samples", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const result = await page.evaluate(async () => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const original = core.example(false);
    const document: EigenVistaDocument = JSON.parse(original);
    const firstField = document.orbitals[0].id;
    const nextField = document.orbitals[1].id;
    const owner = new core.RegisteredDocument(original);
    const prepare = (field: string, resolution: number) =>
      owner.prepare(field, resolution, undefined);
    try {
      const states = [
        prepare(firstField, 12),
        prepare(firstField, 12),
        prepare(nextField, 12),
        prepare(nextField, 12),
        prepare(nextField, 16),
        prepare(nextField, 16),
        prepare(firstField, 12),
      ];
      const initial: Float32Array = owner.display_values();
      document.basis[0].coefficients[0] *= 1.125;
      // The Rust-owned source remains the original snapshot even if JS changes.
      const retainsSnapshot = !prepare(firstField, 12);
      const retained: Float32Array = owner.display_values();
      const replacement = new core.RegisteredDocument(JSON.stringify(document));
      try {
        const replacementPrepared = replacement.prepare(
          firstField,
          12,
          undefined,
        );
        const updated: Float32Array = replacement.display_values();
        const expected: Grid = JSON.parse(
          core.sample(JSON.stringify(document), firstField, 12),
        );
        return {
          states,
          retainsSnapshot,
          retainedValues: initial.every((value, index) =>
            Object.is(value, retained[index]),
          ),
          replacementPrepared,
          replacementChanged: updated.some(
            (value, index) => !Object.is(value, initial[index]),
          ),
          replacementMatches: updated.every((value, index) =>
            Object.is(value, Math.fround(expected.values[index])),
          ),
        };
      } finally {
        replacement.free();
      }
    } finally {
      owner.free();
    }
  });
  expect(result.states).toEqual([true, false, true, false, true, false, true]);
  expect(result.retainsSnapshot).toBe(true);
  expect(result.retainedValues).toBe(true);
  expect(result.replacementPrepared).toBe(true);
  expect(result.replacementChanged).toBe(true);
  expect(result.replacementMatches).toBe(true);
});

test("registered documents reject invalid sources and material, and recover from progress callback failures", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const report = await page.evaluate(async () => {
    const url = "/src/wasm/eigenvista_wasm.js";
    const core = await import(/* @vite-ignore */ url);
    await core.default();
    const json = core.example(false);
    const document: EigenVistaDocument = JSON.parse(json);
    const field = document.orbitals[0].id;
    const failure = (action: () => unknown) => {
      try {
        action();
        return "";
      } catch (error) {
        return String(error);
      }
    };
    const invalid = structuredClone(document);
    invalid.basis[0].exponents[0] = -1;
    const invalidSources = ["{", "{}", JSON.stringify(invalid)].map((source) =>
      failure(() => {
        const unexpected = new core.RegisteredDocument(source);
        unexpected.free();
      }),
    );
    const owner = new core.RegisteredDocument(json);
    try {
      const missing = [
        failure(() => owner.metadata()),
        failure(() => owner.display_values()),
        failure(() => owner.surfaces(0.08, "#123456", "#abcdef", 0.5)),
      ];
      const sampleCallback = failure(() =>
        owner.prepare(field, 12, (done: number) => {
          if (done === 1) throw new Error("Sampling observer rejected");
        }),
      );
      const noPartial = failure(() => owner.display_values());
      const retry = owner.prepare(field, 12, undefined);
      const before: Float32Array = owner.display_values();
      const invalidMaterials = [
        ["red", "#abcdef", 0.5, 0.08],
        ["#123456", "#zzzzzz", 0.5, 0.08],
        ["#123456", "#abcdef", -0.1, 0.08],
        ["#123456", "#abcdef", 1.1, 0.08],
        ["#123456", "#abcdef", NaN, 0.08],
        ["#123456", "#abcdef", Infinity, 0.08],
        ["#123456", "#abcdef", 0.5, 0],
        ["#123456", "#abcdef", 0.5, -0.08],
        ["#123456", "#abcdef", 0.5, NaN],
        ["#123456", "#abcdef", 0.5, Infinity],
        ["#123456", "#abcdef", 0.5, Number.MAX_VALUE],
      ].map(([positive, negative, opacity, iso]) =>
        failure(() => owner.surfaces(iso, positive, negative, opacity)),
      );
      const meshCallback = failure(() =>
        owner.surfaces(0.08, "#123456", "#abcdef", 0.5, (done: number) => {
          if (done === 1) throw new Error("Meshing observer rejected");
        }),
      );
      const after: Float32Array = owner.display_values();
      const reusedAfterFailures = !owner.prepare(field, 12, undefined);
      const recoveredJSON = owner.surfaces(0.08, "#123456", "#abcdef", 0.5);
      const surfaces: Surface[] = JSON.parse(recoveredJSON);
      const stale = {
        ...structuredClone(document),
        surfaces,
      };
      stale.basis[0].coefficients[0] *= 1.125;
      const staleSavedSource = failure(() => {
        const unexpected = new core.RegisteredDocument(JSON.stringify(stale));
        unexpected.free();
      });
      const badField = failure(() => owner.prepare("missing", 12, undefined));
      const clearedAfterField = failure(() => owner.metadata());
      const afterBadField = owner.prepare(field, 12, undefined);
      const badResolution = failure(() => owner.prepare(field, 257, undefined));
      const clearedAfterResolution = failure(() => owner.metadata());
      const afterBadResolution = owner.prepare(field, 12, undefined);
      return {
        invalidSources,
        missing,
        sampleCallback,
        noPartial,
        retry,
        invalidMaterials,
        meshCallback,
        reusedAfterFailures,
        retained: before.every((value, index) =>
          Object.is(value, after[index]),
        ),
        recovered: surfaces.length > 0,
        staleSavedSource,
        badField,
        clearedAfterField,
        afterBadField,
        badResolution,
        clearedAfterResolution,
        afterBadResolution,
      };
    } finally {
      owner.free();
    }
  });
  expect(report.invalidSources.every(Boolean)).toBe(true);
  expect(report.missing).toEqual(Array(3).fill("No sampled field is prepared"));
  expect(report.sampleCallback).toContain("Sampling observer rejected");
  expect(report.noPartial).toBe("No sampled field is prepared");
  expect(report.retry).toBe(true);
  expect(report.invalidMaterials).toEqual(
    Array(11).fill("Invalid surface view settings"),
  );
  expect(report.meshCallback).toContain("Meshing observer rejected");
  expect(report.reusedAfterFailures).toBe(true);
  expect(report.retained).toBe(true);
  expect(report.recovered).toBe(true);
  expect(report.staleSavedSource).toContain(
    "Saved surface source hash does not match its scientific inputs",
  );
  expect(report.badField).not.toBe("");
  expect(report.clearedAfterField).toBe("No sampled field is prepared");
  expect(report.afterBadField).toBe(true);
  expect(report.badResolution).toContain("between 12 and 256");
  expect(report.clearedAfterResolution).toBe("No sampled field is prepared");
  expect(report.afterBadResolution).toBe(true);
});
