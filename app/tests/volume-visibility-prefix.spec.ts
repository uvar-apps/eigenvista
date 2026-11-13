import { expect, test } from "@playwright/test";
import {
  distanceFromDepth,
  renderAnalyticField,
  type FieldKind,
} from "./anisotropyReference";
import {
  assertColor,
  assertMaterial,
  attachDraw,
  centerIndex,
  centerRay,
  centerRgba,
  depthAllowance,
  expectedColor,
  opaqueAt,
  prepareScene,
  prefixReference,
  unitCube,
} from "./volume-visibility-reference";

for (const prefix of [0, 0.08] as const)
  for (const sign of [1, -1] as const) {
    test(`prefix ${prefix}, sign ${sign}: negligible front contributions do not become the depth marker`, async ({
      page,
    }, info) => {
      const errors = await prepareScene(page);
      const profile = unitCube(`prefix-${prefix}`);
      profile.dims = [17, 17, 65];
      const quality = sign === 1 ? 4 : 2;
      const filtered = sign === -1;
      const field: FieldKind = `${sign === 1 ? "positive" : "negative"}-${prefix === 0 ? "zero" : "small"}-prefix`;
      const opacity = 0.25;
      const reference = prefixReference(prefix, opacity);
      expect(reference.prefixAlpha).toBeLessThan(0.005);
      const h = 1 / (64 * quality);
      // Monotone right-endpoint integration can put the marker at most h early.
      // The fixed FP allowance is empirical, separate from that analytic bound.
      const floatingAllowance = 0.003;
      const alphaBudget = 1.4 * opacity * h + 1 / 255 + 0.0005;
      const gap = 0.04;
      expect(gap).toBeGreaterThan(3 * h + 2 * floatingAllowance);
      const diagnostic = await renderAnalyticField(
        page,
        profile,
        "volume",
        field,
        quality,
        opacity,
        97,
        filtered,
        { captureVolumeDepth: true },
      );
      await attachDraw(info, "prefix-depthWrite-only-capture", diagnostic);
      assertMaterial(diagnostic, true);
      const measured = distanceFromDepth(
        profile,
        centerRay(profile),
        diagnostic.depth[centerIndex],
      );
      const projection = depthAllowance(
        profile,
        reference.marker,
        false,
      ).projection;
      expect(Math.abs(measured - reference.marker)).toBeLessThan(
        h + floatingAllowance + projection,
      );
      assertColor(
        centerRgba(diagnostic.rgba),
        expectedColor(reference.alpha, sign, false),
        alphaBudget,
      );
      const observations: unknown[] = [
        {
          profile,
          prefix,
          sign,
          opacity,
          quality,
          filtered: diagnostic.filtered,
          reference,
          measured,
          h,
          floatingAllowance,
          projection,
          alphaBudget,
          maximumNodeRounding: diagnostic.maximumNodeRounding,
          observedAlpha: centerRgba(diagnostic.rgba)[3],
          backend: diagnostic.backend,
        },
      ];
      for (const position of ["before", "behind"] as const) {
        const distance =
          reference.marker + (position === "before" ? -gap : gap);
        const opaque = opaqueAt(profile, "plane", distance);
        const rendered = await renderAnalyticField(
          page,
          profile,
          "volume",
          field,
          quality,
          opacity,
          97,
          filtered,
          { opaque },
        );
        await attachDraw(
          info,
          `prefix-production-${position}-marker`,
          rendered,
        );
        assertMaterial(rendered);
        const expected =
          position === "before"
            ? [0, 0, 1, 1]
            : expectedColor(reference.alpha, sign, true);
        const actual = centerRgba(rendered.rgba);
        assertColor(actual, expected, alphaBudget);
        const opaqueDistance = distanceFromDepth(
          profile,
          centerRay(profile),
          rendered.depth[centerIndex],
        );
        expect(Math.abs(opaqueDistance - distance)).toBeLessThan(
          depthAllowance(profile, distance, false).total,
        );
        observations.push({
          position,
          opaque,
          distance,
          actual,
          expected,
          actualDepth: rendered.depth[centerIndex],
        });
      }
      await info.attach("independent-integrated-prefix-reference", {
        body: Buffer.from(JSON.stringify(observations, null, 2)),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
    });
  }
