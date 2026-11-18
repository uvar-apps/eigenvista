// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { test, expect } from "@playwright/test";

test("brick ranges include shared faces and partial final bricks", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  const result = await page.evaluate(async () => {
    const url = "/src/volumeRanges.ts";
    const { volumeBrickRanges } = await import(/* @vite-ignore */ url);
    const dims = [17, 9, 3];
    const values = new Float32Array(17 * 9 * 3);
    values[(2 * 9 + 8) * 17 + 8] = -9;
    values[16] = 13;
    const ranges = volumeBrickRanges({ dims, values });
    const partial = volumeBrickRanges({
      dims: [18, 11, 5],
      values: new Float32Array(18 * 11 * 5).fill(-3),
    });
    return {
      dims: ranges.dims,
      cells: ranges.cellSize,
      bounds: Array.from(ranges.values),
      partialDims: partial.dims,
      partialBounds: Array.from(partial.values),
    };
  });
  expect(result.dims).toEqual([2, 1, 1]);
  expect(result.cells).toBe(8);
  expect(result.bounds).toEqual([-9, 0, -9, 13]);
  expect(result.partialDims).toEqual([3, 2, 1]);
  expect(result.partialBounds).toEqual(Array(12).fill(-3));
});

test("brick bounds contain independent trilinear samples throughout signed nonsquare fields", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  const result = await page.evaluate(async () => {
    const url = "/src/volumeRanges.ts";
    const { volumeBrickRanges } = await import(/* @vite-ignore */ url);
    const dims = [18, 11, 5];
    const values = new Float32Array(dims[0] * dims[1] * dims[2]);
    for (let z = 0; z < dims[2]; z++)
      for (let y = 0; y < dims[1]; y++)
        for (let x = 0; x < dims[0]; x++)
          values[(z * dims[1] + y) * dims[0] + x] =
            Math.sin(x * 1.7 + z * 0.9) * 7 + Math.cos(y * 0.6) * 4;
    const ranges = volumeBrickRanges({ dims, values });
    const points: number[][] = [];
    for (let i = 0; i < 1000; i++)
      points.push([
        (((i * 337) % 1001) * (dims[0] - 1)) / 1000,
        (((i * 179) % 1001) * (dims[1] - 1)) / 1000,
        (((i * 797) % 1001) * (dims[2] - 1)) / 1000,
      ]);
    for (const x of [0, 8 - 1e-6, 8, 8 + 1e-6, 16, 17])
      for (const y of [0, 8 - 1e-6, 8, 8 + 1e-6, 10])
        for (const z of [0, 2.5, 4]) points.push([x, y, z]);
    let failures = 0;
    for (const point of points) {
      const lower = point.map(Math.floor);
      const fraction = point.map((p, axis) => p - lower[axis]);
      let interpolated = 0;
      for (let dz = 0; dz <= 1; dz++)
        for (let dy = 0; dy <= 1; dy++)
          for (let dx = 0; dx <= 1; dx++) {
            const x = Math.min(lower[0] + dx, dims[0] - 1);
            const y = Math.min(lower[1] + dy, dims[1] - 1);
            const z = Math.min(lower[2] + dz, dims[2] - 1);
            const weight =
              (dx ? fraction[0] : 1 - fraction[0]) *
              (dy ? fraction[1] : 1 - fraction[1]) *
              (dz ? fraction[2] : 1 - fraction[2]);
            interpolated += weight * values[(z * dims[1] + y) * dims[0] + x];
          }
      const brick = point.map((p, axis) =>
        Math.min(Math.floor(p / ranges.cellSize), ranges.dims[axis] - 1),
      );
      const index =
        ((brick[2] * ranges.dims[1] + brick[1]) * ranges.dims[0] + brick[0]) *
        2;
      if (
        interpolated < ranges.values[index] - 1e-12 ||
        interpolated > ranges.values[index + 1] + 1e-12
      )
        failures++;
    }
    return {
      checked: points.length,
      failures,
      bytes: ranges.values.byteLength,
    };
  });
  expect(result.checked).toBe(1090);
  expect(result.failures).toBe(0);
  expect(result.bytes).toBe(48);
});

test("brick range construction rejects malformed dimensions, layout, and nonfinite values", async ({
  page,
}) => {
  await page.goto("/?workspace=legacy");
  const rejected = await page.evaluate(async () => {
    const url = "/src/volumeRanges.ts";
    const { volumeBrickRanges } = await import(/* @vite-ignore */ url);
    const inputs = [
      { dims: [1, 2, 2], values: new Float32Array(4) },
      { dims: [Number.MAX_SAFE_INTEGER, 2, 2], values: new Float32Array(0) },
      { dims: [2.5, 2, 2], values: new Float32Array(8) },
      { dims: [2, 2], values: new Float32Array(4) },
      { dims: [2, 2, 2, 2], values: new Float32Array(16) },
      { dims: [2, 2, 2], values: new Float32Array(7) },
      { dims: [2, 2, 2], values: new Float64Array(8) },
      ...[NaN, Infinity, -Infinity].map((value) => {
        const values = new Float32Array(8);
        values[7] = value;
        return { dims: [2, 2, 2], values };
      }),
    ];
    return inputs.map((grid) => {
      try {
        volumeBrickRanges(grid);
        return false;
      } catch {
        return true;
      }
    });
  });
  expect(rejected).toEqual(Array(10).fill(true));
});
