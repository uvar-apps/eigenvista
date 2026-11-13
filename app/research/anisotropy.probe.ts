// OPT-IN reproducer: failure means the unmodified renderer disagrees with the
// fixed closed-form expectation. These probes are outside normal CI discovery.
// Tracked product defect: https://github.com/uvar-apps/eigenvista/issues/55
import { expect, test } from "@playwright/test";
import {
  clipRay,
  exactConstantAlpha,
  pixelRay,
  renderAnalyticField,
  type GeometryCase,
} from "../tests/anisotropyReference";

for (const sign of [1, -1] as const) {
  test(`constant ${sign}: high quality must retain accumulated physical opacity`, async ({
    page,
  }, info) => {
    await page.goto("/");
    await expect(page.locator("footer [role=status]")).toContainText(
      "triangles",
    );
    const results = [];
    for (const input of [
      { dims: [33, 33, 33], opacity: 0.25 },
      { dims: [2, 2, 256], opacity: 0.25 },
      { dims: [33, 33, 33], opacity: 0.05 },
    ] as const) {
      const { dims, opacity } = input;
      const profile: GeometryCase = {
        id: `unit-${dims.join("x")}`,
        basis: [
          [1, 0, 0],
          [0, 1, 0],
          [0, 0, 1],
        ],
        dims: [...dims],
        center: [0.5, 0.5, 0.5],
        eye: [0.5, 0.5, 2],
        target: [0.5, 0.5, 0.5],
        up: [0, 1, 0],
        gradient: [0, 0, 1],
      };
      const ray = pixelRay(profile, 48, 48, 97);
      const clip = clipRay(profile, ray)!;
      const expected = exactConstantAlpha(clip.length, opacity);
      expect(clip.length).toBeCloseTo(1, 12);
      expect(expected).toBeGreaterThan(0.06);
      for (const quality of [1, 2, 4] as const) {
        const rendered = await renderAnalyticField(
          page,
          profile,
          "volume",
          sign,
          quality,
          opacity,
        );
        expect(rendered.glError).toBe(0);
        const at = (48 * 97 + 48) * 4;
        const center = rendered.rgba.slice(at, at + 4);
        results.push({
          dims,
          opacity,
          quality,
          sign,
          expected,
          center,
          observed: center[3] / 255,
          absoluteAlphaError: Math.abs(center[3] / 255 - expected),
          backend: rendered.backend,
          variant: "unmodified-production",
          productionFragmentSha256: rendered.productionFragmentSha256,
          renderedFragmentSha256: rendered.renderedFragmentSha256,
        });
        await info.attach(`${profile.id}-opacity${opacity}-q${quality}`, {
          body: Buffer.from(rendered.png, "base64"),
          contentType: "image/png",
        });
        if (quality === 4 || (dims[2] === 256 && quality === 2)) {
          // Fresh experimental instance; only the first-marker predicate differs.
          // This is causal evidence, never the expected renderer or a product fix.
          const counterfactual = await renderAnalyticField(
            page,
            profile,
            "volume",
            sign,
            quality,
            opacity,
            97,
            false,
            true,
          );
          const center = counterfactual.rgba.slice(at, at + 4);
          expect(counterfactual.glError).toBe(0);
          expect(counterfactual.productionFragmentSha256).toBe(
            rendered.productionFragmentSha256,
          );
          expect(counterfactual.renderedFragmentSha256).not.toBe(
            rendered.renderedFragmentSha256,
          );
          const error = Math.abs(center[3] / 255 - expected);
          results.push({
            dims,
            opacity,
            quality,
            sign,
            expected,
            center,
            observed: center[3] / 255,
            absoluteAlphaError: error,
            backend: counterfactual.backend,
            variant: "counterfactual-first-positive-alpha",
            productionFragmentSha256: counterfactual.productionFragmentSha256,
            renderedFragmentSha256: counterfactual.renderedFragmentSha256,
          });
          expect(error).toBeLessThan(2 / 255);
        }
        if (dims[2] === 256 && quality === 2) {
          for (const control of [false, true]) {
            const hardware = await renderAnalyticField(
              page,
              profile,
              "volume",
              sign,
              quality,
              opacity,
              97,
              true,
              control,
            );
            const center = hardware.rgba.slice(at, at + 4);
            expect(hardware.glError).toBe(0);
            results.push({
              dims,
              opacity,
              quality,
              sign,
              expected,
              center,
              observed: center[3] / 255,
              absoluteAlphaError: Math.abs(center[3] / 255 - expected),
              backend: hardware.backend,
              filtered: hardware.filtered,
              variant: control
                ? "counterfactual-first-positive-alpha-filtered"
                : "unmodified-production-filtered",
              productionFragmentSha256: hardware.productionFragmentSha256,
              renderedFragmentSha256: hardware.renderedFragmentSha256,
            });
          }
        }
      }
    }
    await info.attach("fixed-expectation-observations", {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: "application/json",
    });
    // Soft assertions preserve every measured quality/sign before failing.
    // Do not change the expected value to legitimize a blank high-quality view.
    for (const result of results)
      expect
        .soft(result.absoluteAlphaError, JSON.stringify(result))
        .toBeLessThan(2 / 255);
  });
}
