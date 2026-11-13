import { expect, test } from "@playwright/test";
import {
  add,
  clipRay,
  crossingTolerance,
  distanceFromDepth,
  exactConstantAlpha,
  fieldGrid,
  geometryCases,
  linearRaycastReference,
  pixelRay,
  renderAnalyticField,
  scale,
  type GeometryCase,
} from "./anisotropyReference";

// Every profile is a separate bounded case. These passing controls certify the
// stated envelope; the independently discovered first-marker defect lives in
// the opt-in research reproducer, whose fixed correctness assertions fail.
for (const profile of geometryCases) {
  for (const mode of ["volume", "raycast"] as const) {
    test(`${profile.id}: ${mode} agrees with independent physical-space reference`, async ({
      page,
    }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      await page.goto("/");
      await expect(page.locator("footer [role=status]")).toContainText(
        "triangles",
      );
      const metrics = [];
      for (const variant of [0, 1] as const) {
        const quality = variant === 0 ? 2 : 4;
        const field = mode === "raycast" ? "linear" : variant === 0 ? 1 : -1;
        const opacity = mode === "raycast" ? 0.55 : 0.4;
        const rendered = await renderAnalyticField(
          page,
          profile,
          mode,
          field,
          quality,
          opacity,
          97,
          variant === 1,
        );
        expect(rendered.glError).toBe(0);
        expect(rendered.firstMarkerControl).toBe(false);
        expect(rendered.renderedFragmentSha256).toBe(
          rendered.productionFragmentSha256,
        );
        const samples = [];
        for (const y of [40, 44, 48, 52, 56])
          for (const x of [40, 44, 48, 52, 56]) {
            const direction = pixelRay(profile, x, y, 97);
            const clip = clipRay(profile, direction);
            if (!clip) continue;
            const index = y * 97 + x;
            const actual = rendered.rgba
              .slice(index * 4, index * 4 + 4)
              .map((v) => v / 255);
            if (mode === "volume") {
              const expected = exactConstantAlpha(clip.length, opacity);
              // Keep saturation/early termination out of this closed-form control.
              expect(expected).toBeLessThan(0.95);
              expect(Math.abs(actual[3] - expected)).toBeLessThan(2 / 255);
              const color = field === 1 ? 1 : 0;
              expect(Math.abs(actual[color] - expected)).toBeLessThan(2 / 255);
              expect(actual[1 - color]).toBe(0);
              expect(actual[2]).toBe(0);
              // The production volume material has depthWrite:false.
              expect(rendered.depth[index]).toBe(1);
              samples.push({
                x,
                y,
                path: clip.length,
                expectedAlpha: expected,
                actualAlpha: actual[3],
                absoluteAlphaError: Math.abs(actual[3] - expected),
              });
            } else {
              const reference = linearRaycastReference(
                profile,
                direction,
                0.25,
                opacity,
              );
              if (!reference) continue;
              expect(actual[3]).toBeGreaterThan(0.5);
              const colorError = Math.max(
                ...actual.map((v, i) => Math.abs(v - reference.rgba[i])),
              );
              expect(colorError).toBeLessThan(5 / 255);
              const measured = distanceFromDepth(
                profile,
                direction,
                rendered.depth[index],
              );
              const expected = reference.hits[0].t;
              const budget = crossingTolerance(
                profile,
                direction,
                expected,
                rendered.maximumNodeRounding,
                quality,
              );
              // Filtered texture interpolation has its own implementation precision;
              // record it separately from the manual trilinear/field-rounding bound.
              const tolerance = rendered.filtered
                ? Math.max(0.003, budget.total)
                : budget.total;
              expect(Math.abs(measured - expected)).toBeLessThan(tolerance);
              const position = add(profile.eye, scale(direction, measured));
              samples.push({
                x,
                y,
                hitCount: reference.hits.length,
                firstLevel: reference.hits[0].level,
                expectedDistance: expected,
                measuredDistance: measured,
                position,
                absoluteDistanceError: Math.abs(measured - expected),
                tolerance,
                budget,
                colorError,
              });
            }
          }
        expect(samples.length).toBeGreaterThanOrEqual(15);
        metrics.push({
          field,
          quality,
          filtered: rendered.filtered,
          backend: rendered.backend,
          maximumNodeRounding: rendered.maximumNodeRounding,
          samples,
        });
        await info.attach(`${profile.id}-${mode}-q${quality}`, {
          body: Buffer.from(rendered.png, "base64"),
          contentType: "image/png",
        });
      }
      await info.attach("physical-reference-comparison", {
        body: Buffer.from(JSON.stringify({ profile, mode, metrics }, null, 2)),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
    });
  }
}

test("equal-memory isotropic resampling can erase a known thin feature before rendering", async ({
  page,
}, info) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const common: Omit<GeometryCase, "id" | "dims"> = {
    basis: [
      [8, 0, 0],
      [0, 2, 0],
      [0, 0, 1],
    ],
    center: [0, 0, 0],
    eye: [0, 0, 3],
    target: [0, 0, 0],
    up: [0, 1, 0],
    gradient: [0, 0, 1],
  };
  const fine: GeometryCase = {
    ...common,
    id: "fine-short-axis",
    dims: [17, 17, 65],
  };
  const isotropic: GeometryCase = {
    ...common,
    id: "isotropic-budget",
    dims: [81, 21, 11],
  };
  const fineCount = fine.dims.reduce((p, n) => p * n, 1);
  const isotropicCount = isotropic.dims.reduce((p, n) => p * n, 1);
  expect(fineCount).toBe(18785);
  expect(isotropicCount).toBe(18711);
  expect(Math.abs(fineCount - isotropicCount) / fineCount).toBeLessThan(0.004);
  const metrics = [];
  for (const sign of [1, -1] as const) {
    const field = sign === 1 ? "positive-tent" : "negative-tent";
    const fineGrid = fieldGrid(fine, field);
    const coarseGrid = fieldGrid(isotropic, field);
    expect(Math.max(...fineGrid.values.map(Math.abs))).toBe(1);
    expect(coarseGrid.values.every((v) => v === 0)).toBe(true);
    const actualFine = await renderAnalyticField(
      page,
      fine,
      "raycast",
      field,
      2,
      1,
    );
    const actualCoarse = await renderAnalyticField(
      page,
      isotropic,
      "raycast",
      field,
      2,
      1,
    );
    expect(actualFine.glError).toBe(0);
    expect(actualCoarse.glError).toBe(0);
    const index = 48 * 97 + 48;
    const rgba = actualFine.rgba.slice(index * 4, index * 4 + 4);
    const coarseRgba = actualCoarse.rgba.slice(index * 4, index * 4 + 4);
    expect(rgba[3]).toBe(255);
    expect(rgba[sign === 1 ? 1 : 0]).toBeGreaterThan(190);
    expect(coarseRgba).toEqual([0, 0, 0, 0]);
    expect(actualCoarse.depth[index]).toBe(1);
    const direction = pixelRay(fine, 48, 48, 97);
    const expectedZ = 3 / 64 + (1 - 0.25) / 64;
    const expectedDistance = 3 - expectedZ;
    const measuredDistance = distanceFromDepth(
      fine,
      direction,
      actualFine.depth[index],
    );
    const budget = crossingTolerance(
      fine,
      direction,
      expectedDistance,
      fineGrid.maximumNodeRounding,
      2,
    );
    expect(Math.abs(measuredDistance - expectedDistance)).toBeLessThan(
      budget.total,
    );
    metrics.push({
      sign,
      fineDims: fine.dims,
      isotropicDims: isotropic.dims,
      fineCount,
      isotropicCount,
      expectedZ,
      expectedDistance,
      measuredDistance,
      absoluteDistanceError: Math.abs(measuredDistance - expectedDistance),
      budget,
      finePeak: 1,
      isotropicPeak: 0,
      rgba,
      coarseRgba,
      backend: actualFine.backend,
    });
    for (const [label, result] of [
      ["fine", actualFine],
      ["isotropic", actualCoarse],
    ] as const)
      await info.attach(`signed${sign}-${label}`, {
        body: Buffer.from(result.png, "base64"),
        contentType: "image/png",
      });
  }
  await info.attach("sampling-allocation-control", {
    body: Buffer.from(JSON.stringify(metrics, null, 2)),
    contentType: "application/json",
  });
});
