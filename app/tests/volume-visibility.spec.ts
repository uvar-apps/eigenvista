import { expect, test } from "@playwright/test";
import {
  clipRay,
  exactConstantAlpha,
  pixelRay,
  renderAnalyticField,
  type GeometryCase,
} from "./anisotropyReference";
import {
  assertColor,
  assertMaterial,
  attachDraw,
  centerIndex,
  centerRgba,
  expectedColor,
  prepareScene,
  unitCube,
} from "./volume-visibility-reference";

// Promoted unchanged physical expectations from the original #55 reproducer.
// Six bounded tests per engine cover all 40 original production observations.
for (const input of [
  { id: "isotropic", dims: [33, 33, 33], opacity: 0.25 },
  { id: "fine-axis", dims: [2, 2, 256], opacity: 0.25 },
  { id: "low-opacity", dims: [33, 33, 33], opacity: 0.05 },
] as const) {
  for (const sign of [1, -1] as const) {
    test(`${input.id}, sign ${sign}: retains accumulated opacity across sample qualities`, async ({
      page,
    }, info) => {
      const errors = await prepareScene(page);
      const profile: GeometryCase = {
        id: input.id,
        basis: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        dims: [...input.dims],
        center: [0.5, 0.5, 0.5],
        eye: [0.5, 0.5, 2],
        target: [0.5, 0.5, 0.5],
        up: [0, 1, 0],
        gradient: [0, 0, 1],
      };
      const ray = pixelRay(profile, 48, 48, 97);
      const clip = clipRay(profile, ray)!;
      expect(clip.length).toBeCloseTo(1, 12);
      const expected = exactConstantAlpha(clip.length, input.opacity);
      const variants = [
        { quality: 1 as const, filtered: false },
        { quality: 2 as const, filtered: false },
        { quality: 4 as const, filtered: false },
        ...(input.id === "fine-axis"
          ? [{ quality: 2 as const, filtered: true }]
          : []),
      ];
      const observations = [];
      for (const variant of variants) {
        const rendered = await renderAnalyticField(
          page,
          profile,
          "volume",
          sign,
          variant.quality,
          input.opacity,
          97,
          variant.filtered,
        );
        const index = 48 * 97 + 48;
        const rgba = rendered.rgba.slice(index * 4, index * 4 + 4);
        observations.push({
          profile,
          sign,
          opacity: input.opacity,
          quality: variant.quality,
          requestedFiltered: variant.filtered,
          filtered: rendered.filtered,
          expected,
          observed: rgba[3] / 255,
          rgba,
          absoluteAlphaError: Math.abs(rgba[3] / 255 - expected),
          backend: rendered.backend,
          productionFragmentSha256: rendered.productionFragmentSha256,
          renderedFragmentSha256: rendered.renderedFragmentSha256,
        });
        await info.attach(
          `${input.id}-signed${sign}-q${variant.quality}-${variant.filtered ? "filtered" : "manual"}`,
          {
            body: Buffer.from(rendered.png, "base64"),
            contentType: "image/png",
          },
        );
        expect(rendered.glError).toBe(0);
        expect(rendered.captureVolumeDepth).toBe(false);
        expect(rendered.factoryDepthWrite).toBe(false);
        expect(rendered.materialDepthWrite).toBe(false);
        expect(rendered.renderedFragmentSha256).toBe(
          rendered.productionFragmentSha256,
        );
        expect(rendered.depth[index]).toBe(1);
        expect.soft(Math.abs(rgba[3] / 255 - expected)).toBeLessThan(2 / 255);
        expect
          .soft(Math.abs(rgba[sign === 1 ? 1 : 0] / 255 - expected))
          .toBeLessThan(2 / 255);
        expect.soft(rgba[sign === 1 ? 0 : 1]).toBe(0);
        expect.soft(rgba[2]).toBe(0);
      }
      await info.attach("fixed-analytic-opacity-observations", {
        body: Buffer.from(JSON.stringify(observations, null, 2)),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
    });
  }
}

test("zero sampled fields and zero opacity leave no color or depth", async ({
  page,
}, info) => {
  const errors = await prepareScene(page);
  const profile = unitCube("zero-controls");
  const observations = [];
  for (const input of [
    { field: 0, opacity: 0.25, capture: false },
    { field: 1, opacity: 0, capture: true },
    { field: -1, opacity: 0, capture: true },
  ]) {
    const rendered = await renderAnalyticField(
      page,
      profile,
      "volume",
      input.field,
      4,
      input.opacity,
      97,
      false,
      { captureVolumeDepth: input.capture },
    );
    await attachDraw(
      info,
      `zero-field${input.field}-opacity${input.opacity}-depthCapture${input.capture}`,
      rendered,
    );
    assertMaterial(rendered, input.capture);
    expect(centerRgba(rendered.rgba)).toEqual([0, 0, 0, 0]);
    expect(rendered.depth[centerIndex]).toBe(1);
    observations.push({
      input,
      rgba: centerRgba(rendered.rgba),
      depth: rendered.depth[centerIndex],
      backend: rendered.backend,
    });
  }
  await info.attach("zero-output-observations", {
    body: Buffer.from(JSON.stringify(observations, null, 2)),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

test("aggregate alpha below the visibility cutoff is discarded for both signs", async ({
  page,
}, info) => {
  const errors = await prepareScene(page);
  const profile = unitCube("below-visibility-cutoff");
  const expectedAlpha = 0.004;
  const opacity = -Math.log1p(-expectedAlpha) / 1.4;
  const observations = [];
  for (const sign of [1, -1] as const) {
    const rendered = await renderAnalyticField(
      page,
      profile,
      "volume",
      sign,
      4,
      opacity,
      97,
      true,
      { captureVolumeDepth: true },
    );
    await attachDraw(
      info,
      `subthreshold-sign${sign}-depthWrite-only-capture`,
      rendered,
    );
    assertMaterial(rendered, true);
    expect(centerRgba(rendered.rgba)).toEqual([0, 0, 0, 0]);
    expect(rendered.depth[centerIndex]).toBe(1);
    observations.push({
      sign,
      expectedAlpha,
      opacity,
      actual: centerRgba(rendered.rgba),
      depth: rendered.depth[centerIndex],
      filtered: rendered.filtered,
      diagnostic: "depthWrite-only; shader unchanged",
    });
  }
  await info.attach("below-cutoff-discard-observations", {
    body: Buffer.from(JSON.stringify(observations, null, 2)),
    contentType: "application/json",
  });
  expect(errors).toEqual([]);
});

for (const sign of [1, -1] as const)
  test(`aggregate alpha above the visibility cutoff stays visible, sign ${sign}`, async ({
    page,
  }, info) => {
    const errors = await prepareScene(page);
    const profile = unitCube("above-visibility-cutoff");
    const expectedAlpha = 0.006;
    const opacity = -Math.log1p(-expectedAlpha) / 1.4;
    const observations = [];
    for (const variant of [
      { quality: 1 as const, filtered: false },
      { quality: 4 as const, filtered: true },
    ]) {
      const rendered = await renderAnalyticField(
        page,
        profile,
        "volume",
        sign,
        variant.quality,
        opacity,
        97,
        variant.filtered,
      );
      await attachDraw(
        info,
        `above-cutoff-sign${sign}-q${variant.quality}`,
        rendered,
      );
      assertMaterial(rendered);
      const actual = centerRgba(rendered.rgba);
      // Error alone would accept blank alpha .006 within the 2/255 byte budget.
      expect(actual[3]).toBeGreaterThan(0);
      expect(actual[sign === 1 ? 1 : 0]).toBeGreaterThan(0);
      assertColor(actual, expectedColor(expectedAlpha, sign, false), 2 / 255);
      expect(rendered.depth[centerIndex]).toBe(1);
      observations.push({
        sign,
        opacity,
        expectedAlpha,
        quality: variant.quality,
        filtered: rendered.filtered,
        actual,
      });
    }
    await info.attach("above-cutoff-visibility-observations", {
      body: Buffer.from(JSON.stringify(observations, null, 2)),
      contentType: "application/json",
    });
    expect(errors).toEqual([]);
  });
