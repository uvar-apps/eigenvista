import { expect, test } from "@playwright/test";
import {
  distanceFromDepth,
  exactConstantAlpha,
  geometryCases,
  renderAnalyticField,
  type OpaqueControl,
} from "./anisotropyReference";
import {
  assertColor,
  assertMaterial,
  attachDraw,
  centerIndex,
  centerRgba,
  constantMarker,
  depthAllowance,
  expectedColor,
  opaqueAt,
  opaqueIntersection,
  prepareScene,
  projectedDepth,
  unitCube,
} from "./volume-visibility-reference";

const profiles = [
  {
    id: "outside-plane",
    profile: unitCube("outside-plane"),
    opacity: 0.25,
    quality: 1 as const,
    filtered: false,
    kind: "plane" as const,
  },
  {
    id: "outside-atom",
    profile: unitCube("outside-atom"),
    opacity: 0.25,
    quality: 4 as const,
    filtered: true,
    kind: "sphere" as const,
  },
  {
    id: "inside-mesh",
    profile: unitCube("inside-mesh", true),
    opacity: 0.05,
    quality: 4 as const,
    filtered: false,
    kind: "mesh" as const,
  },
  {
    id: "inside-before-near",
    profile: unitCube("inside-before-near", true),
    opacity: 0.25,
    quality: 2 as const,
    filtered: true,
    kind: "plane" as const,
  },
  {
    id: "skew-oblique-plane",
    profile: geometryCases[3],
    opacity: 0.25,
    quality: 2 as const,
    filtered: false,
    kind: "plane" as const,
  },
  {
    id: "rotated-inside-atom",
    profile: geometryCases[5],
    opacity: 0.05,
    quality: 4 as const,
    filtered: true,
    kind: "sphere" as const,
  },
];

for (const input of profiles)
  for (const sign of [1, -1] as const) {
    test(`${input.id}, sign ${sign}: cumulative marker controls whole-ray depth and opaque occlusion`, async ({
      page,
    }, info) => {
      const errors = await prepareScene(page);
      const { profile, opacity, quality, filtered } = input;
      const marker = constantMarker(profile, opacity);
      const alpha = exactConstantAlpha(marker.clip.length, opacity);
      const expectedDepth = projectedDepth(profile, marker.distance);
      const diagnostic = await renderAnalyticField(
        page,
        profile,
        "volume",
        sign,
        quality,
        opacity,
        97,
        filtered,
        { captureVolumeDepth: true },
      );
      await attachDraw(
        info,
        "depthWrite-only-capture-unmodified-shader",
        diagnostic,
      );
      assertMaterial(diagnostic, true);
      assertColor(
        centerRgba(diagnostic.rgba),
        expectedColor(alpha, sign, false),
        2 / 255,
      );
      const allowance = depthAllowance(
        profile,
        marker.distance,
        diagnostic.filtered,
      );
      const observedDepth = diagnostic.depth[centerIndex];
      const beforeNear = input.id === "inside-before-near";
      let measuredDistance: number | null = null;
      if (beforeNear) {
        expect(marker.distance).toBeLessThan(0.04);
        expect(expectedDepth).toBe(0);
        expect(observedDepth).toBe(0);
      } else {
        measuredDistance = distanceFromDepth(
          profile,
          marker.ray,
          observedDepth,
        );
        expect(Math.abs(measuredDistance - marker.distance)).toBeLessThan(
          allowance.total,
        );
      }
      const observations: unknown[] = [
        {
          profile,
          sign,
          opacity,
          quality,
          filtered: diagnostic.filtered,
          alpha,
          expectedMarker: marker.distance,
          expectedDepth,
          observedDepth,
          measuredDistance,
          allowance,
          diagnostic: "depthWrite-only; shader unchanged",
          backend: diagnostic.backend,
          productionFragmentSha256: diagnostic.productionFragmentSha256,
        },
      ];
      const positions = beforeNear
        ? (["unoccluded", "behind"] as const)
        : (["before", "behind"] as const);
      for (const position of positions) {
        const distance = beforeNear
          ? 0.08
          : marker.distance + (position === "before" ? -0.006 : 0.006);
        const opaque: OpaqueControl | undefined =
          position === "unoccluded"
            ? undefined
            : opaqueAt(profile, input.kind, distance);
        if (opaque)
          expect(opaqueIntersection(profile, opaque)).toBeCloseTo(distance, 10);
        const rendered = await renderAnalyticField(
          page,
          profile,
          "volume",
          sign,
          quality,
          opacity,
          97,
          filtered,
          { opaque },
        );
        await attachDraw(
          info,
          `production-depthWrite-false-${position}-${input.kind}`,
          rendered,
        );
        assertMaterial(rendered);
        const actual = centerRgba(rendered.rgba);
        const expected =
          position === "before"
            ? [0, 0, 1, 1]
            : expectedColor(alpha, sign, !!opaque);
        assertColor(actual, expected, 2 / 255);
        if (opaque) {
          const measuredOpaque = distanceFromDepth(
            profile,
            marker.ray,
            rendered.depth[centerIndex],
          );
          expect(Math.abs(measuredOpaque - distance)).toBeLessThan(
            depthAllowance(profile, distance, false).total,
          );
        } else expect(rendered.depth[centerIndex]).toBe(1);
        observations.push({
          position,
          opaque,
          analyticOpaqueDistance: opaque ? distance : null,
          actual,
          expected,
          actualDepth: rendered.depth[centerIndex],
          actualDepthWrite: rendered.materialDepthWrite,
          expectedMarker: marker.distance,
          fullRayAlpha: alpha,
        });
      }
      await info.attach("cumulative-depth-and-whole-ray-composition", {
        body: Buffer.from(JSON.stringify(observations, null, 2)),
        contentType: "application/json",
      });
      expect(errors).toEqual([]);
    });
  }
