import type { SampledGrid } from "./types";

export const VOLUME_BRICK_CELLS = 8;

export interface VolumeBrickRanges {
  dims: [number, number, number];
  values: Float32Array;
  cellSize: number;
}

/** Conservative scalar bounds for eight-cell bricks, including shared faces. */
export function volumeBrickRanges(
  grid: Pick<SampledGrid, "dims" | "values">,
): VolumeBrickRanges {
  if (
    !Array.isArray(grid.dims) ||
    grid.dims.length !== 3 ||
    grid.dims.some((n) => !Number.isInteger(n) || n < 2 || n > 256)
  ) {
    throw new Error(
      "Volume range dimensions must be three integers from 2 to 256",
    );
  }
  const [nx, ny, nz] = grid.dims;
  if (
    !(grid.values instanceof Float32Array) ||
    grid.values.length !== nx * ny * nz
  ) {
    throw new Error(
      "Volume range values must match the sampled grid dimensions",
    );
  }
  const dims = grid.dims.map((n) =>
    Math.ceil((n - 1) / VOLUME_BRICK_CELLS),
  ) as [number, number, number];
  const values = new Float32Array(dims[0] * dims[1] * dims[2] * 2);
  let output = 0;
  for (let bz = 0; bz < dims[2]; bz++) {
    const z0 = bz * VOLUME_BRICK_CELLS;
    const z1 = Math.min(z0 + VOLUME_BRICK_CELLS, nz - 1);
    for (let by = 0; by < dims[1]; by++) {
      const y0 = by * VOLUME_BRICK_CELLS;
      const y1 = Math.min(y0 + VOLUME_BRICK_CELLS, ny - 1);
      for (let bx = 0; bx < dims[0]; bx++) {
        const x0 = bx * VOLUME_BRICK_CELLS;
        const x1 = Math.min(x0 + VOLUME_BRICK_CELLS, nx - 1);
        let low = Infinity;
        let high = -Infinity;
        // Inclusive endpoints bound interpolation across every cell in the brick.
        for (let z = z0; z <= z1; z++) {
          for (let y = y0; y <= y1; y++) {
            const row = (z * ny + y) * nx;
            for (let x = x0; x <= x1; x++) {
              const value = grid.values[row + x];
              if (!Number.isFinite(value))
                throw new Error("Volume range values must be finite");
              low = Math.min(low, value);
              high = Math.max(high, value);
            }
          }
        }
        values[output++] = low;
        values[output++] = high;
      }
    }
  }
  return { dims, values, cellSize: VOLUME_BRICK_CELLS };
}
