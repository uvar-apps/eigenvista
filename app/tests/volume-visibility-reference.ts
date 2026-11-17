import { expect, type Page, type TestInfo } from "@playwright/test";
import {
  add,
  clipRay,
  cross,
  dot,
  pixelRay,
  scale,
  unit,
  renderAnalyticField,
  type GeometryCase,
  type OpaqueControl,
} from "./anisotropyReference";

export const visibilityCutoff = 0.005;
export const targetSize = 97;
export const centerIndex = 48 * targetSize + 48;
export const thresholdOpticalDepth = -Math.log1p(-visibilityCutoff);

export function unitCube(id: string, inside = false): GeometryCase {
  return {
    id,
    basis: [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    dims: [2, 2, 256],
    center: [0.5, 0.5, 0.5],
    eye: inside ? [0.5, 0.5, 0.5] : [0.5, 0.5, 2],
    target: inside ? [0.5, 0.5, 0] : [0.5, 0.5, 0.5],
    up: [0, 1, 0],
    gradient: [0, 0, 1],
  };
}

export const centerRay = (profile: GeometryCase) =>
  pixelRay(profile, 48, 48, targetSize);

/** Closed-form full-band optical threshold, independent of the marching grid. */
export function constantMarker(profile: GeometryCase, opacity: number) {
  const ray = centerRay(profile);
  const clip = clipRay(profile, ray)!;
  return {
    ray,
    clip,
    distance: clip.enter + thresholdOpticalDepth / (1.4 * opacity),
  };
}

/** Perspective projection; GLES clamps fragment depth to [0,1]. */
export function projectedDepth(profile: GeometryCase, distance: number) {
  const ray = centerRay(profile);
  const forward = unit(add(profile.target, scale(profile.eye, -1)));
  const eyeDepth = distance * dot(ray, forward);
  const near = 0.04,
    far = 40;
  return Math.max(
    0,
    Math.min(1, far / (far - near) - (far * near) / ((far - near) * eyeDepth)),
  );
}

/** Empirical GPU allowance is explicitly separate from analytic expectations. */
export function depthAllowance(
  profile: GeometryCase,
  distance: number,
  filtered: boolean,
) {
  const ray = centerRay(profile);
  const cosine = dot(ray, unit(add(profile.target, scale(profile.eye, -1))));
  const z = distance * cosine;
  const projection =
    (16 * 2 ** -23 * z * z * (40 - 0.04)) / (40 * 0.04 * cosine) + 0.00002;
  const hardware = filtered ? 0.003 : 0.0002;
  return { projection, hardware, total: projection + hardware };
}

/** Place the analytic nearest opaque intersection at a chosen ray distance. */
export function opaqueAt(
  profile: GeometryCase,
  kind: OpaqueControl["kind"],
  distance: number,
): OpaqueControl {
  const ray = centerRay(profile);
  const center = add(profile.eye, scale(ray, distance));
  if (kind === "plane") return { kind, center, normal: scale(ray, -1) };
  if (kind === "sphere")
    return { kind, center: add(center, scale(ray, 0.1)), radius: 0.1 };
  const normal = scale(ray, -1);
  const tangent = unit(
    cross(normal, Math.abs(normal[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]),
  );
  const vertical = cross(normal, tangent);
  return {
    kind,
    vertices: [
      add(center, add(scale(tangent, -2), scale(vertical, -2))),
      add(center, add(scale(tangent, 2), scale(vertical, -2))),
      add(center, scale(vertical, 2)),
    ],
  };
}

/** Geometry reference uses physical ray/plane or ray/sphere equations. */
export function opaqueIntersection(
  profile: GeometryCase,
  opaque: OpaqueControl,
) {
  const ray = centerRay(profile);
  if (opaque.kind === "sphere") {
    const offset = add(profile.eye, scale(opaque.center, -1));
    const b = dot(offset, ray);
    return -b - Math.sqrt(b * b - dot(offset, offset) + opaque.radius ** 2);
  }
  const origin = opaque.kind === "plane" ? opaque.center : opaque.vertices[0];
  const normal =
    opaque.kind === "plane"
      ? opaque.normal
      : cross(
          add(opaque.vertices[1], scale(origin, -1)),
          add(opaque.vertices[2], scale(origin, -1)),
        );
  return dot(normal, add(origin, scale(profile.eye, -1))) / dot(normal, ray);
}

export function expectedColor(
  alpha: number,
  sign: 1 | -1,
  blueBackground: boolean,
) {
  return [
    sign === -1 ? alpha : 0,
    sign === 1 ? alpha : 0,
    blueBackground ? 1 - alpha : 0,
    blueBackground ? 1 : alpha,
  ];
}

/** Antiderivative of smoothstep(.075,.25,s), with physical field slope one. */
export function bandPrimitive(s: number) {
  const lower = 0.075,
    upper = 0.25,
    width = upper - lower;
  if (s <= lower) return 0;
  if (s >= upper) return width / 2 + s - upper;
  const u = (s - lower) / width;
  return width * (u ** 3 - u ** 4 / 2);
}

export function transferBand(s: number) {
  const u = Math.max(0, Math.min(1, (s - 0.075) / 0.175));
  return u * u * (3 - 2 * u);
}

/** Exact optical integral/root for c+max(0,t-entry-.5); no sampled marcher. */
export function prefixReference(prefix: 0 | 0.08, opacity: number) {
  const integral = (insideDistance: number) =>
    Math.min(insideDistance, 0.5) * transferBand(prefix) +
    bandPrimitive(prefix + Math.max(0, insideDistance - 0.5)) -
    bandPrimitive(prefix);
  const totalIntegral = integral(1);
  const target = thresholdOpticalDepth / (1.4 * opacity);
  let lo = 0,
    hi = 1;
  for (let i = 0; i < 64; i++) {
    const mid = (lo + hi) / 2;
    if (integral(mid) < target) lo = mid;
    else hi = mid;
  }
  return {
    marker: 1 + (lo + hi) / 2,
    alpha: -Math.expm1(-1.4 * opacity * totalIntegral),
    totalIntegral,
    prefixAlpha: -Math.expm1(-1.4 * opacity * integral(0.5)),
  };
}

export const centerRgba = (rgba: number[]) =>
  rgba.slice(centerIndex * 4, centerIndex * 4 + 4).map((v) => v / 255);

export type RenderedField = Awaited<ReturnType<typeof renderAnalyticField>>;

export async function prepareScene(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  return errors;
}

export function assertMaterial(rendered: RenderedField, capture = false) {
  expect(rendered.glError).toBe(0);
  expect(rendered.factoryDepthWrite).toBe(false);
  expect(rendered.captureVolumeDepth).toBe(capture);
  expect(rendered.materialDepthWrite).toBe(capture);
  expect(rendered.renderedFragmentSha256).toBe(
    rendered.productionFragmentSha256,
  );
}

export function assertColor(
  actual: number[],
  expected: number[],
  tolerance: number,
) {
  for (let i = 0; i < 4; i++)
    expect(Math.abs(actual[i] - expected[i])).toBeLessThan(tolerance);
}

export async function attachDraw(
  info: TestInfo,
  label: string,
  rendered: RenderedField,
) {
  await info.attach(label, {
    body: Buffer.from(rendered.png, "base64"),
    contentType: "image/png",
  });
}
