import type { Page } from "@playwright/test";

/** Inspect actual PNG bytes, independently of the WebGL backbuffer lifetime. */
export async function pngPixels(page: Page, png: Buffer) {
  return page.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    const width = (canvas.width = image.naturalWidth);
    const height = (canvas.height = image.naturalHeight);
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, width, height).data;
    let colorful = 0,
      positive = 0,
      negative = 0,
      checksum = 0,
      rgbChecksum = 0,
      rgbaChecksum = 0,
      foreground = 0,
      foreground12 = 0,
      centerForeground = 0,
      bright = 0,
      edgePixels = 0;
    const centerX = Math.floor(width / 2) - 15;
    const centerY = Math.floor(height / 2) - 15;
    // Preserve the existing probes' bottom-left WebGL indexing/checksums even
    // though PNG and Canvas2D use top-left rows.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const source = ((height - y - 1) * width + x) * 4;
        const i = (y * width + x) * 4;
        const r = data[source],
          g = data[source + 1],
          b = data[source + 2],
          a = data[source + 3];
        if (Math.max(r, g, b) - Math.min(r, g, b) > 30) colorful++;
        if (g > r + 20 && g > b + 8) positive++;
        if (r > g + 20 && b > g + 8) negative++;
        if (Math.min(r, g, b) > 245) bright++;
        const difference = Math.max(
          Math.abs(r - 232),
          Math.abs(g - 237),
          Math.abs(b - 239),
        );
        if (difference > 12) foreground12++;
        if (difference > 30) {
          foreground++;
          if (x < 2 || y < 2 || x >= width - 2 || y >= height - 2) edgePixels++;
        }
        if (
          x >= centerX &&
          x < centerX + 31 &&
          y >= centerY &&
          y < centerY + 31 &&
          Math.abs(r - 232) + Math.abs(g - 237) + Math.abs(b - 239) > 30
        )
          centerForeground++;
        checksum = (checksum + r * ((i % 97) + 1) + g) % 2147483647;
        rgbChecksum = (rgbChecksum + r * 3 + g * 5 + b * 7) % 2147483647;
        rgbaChecksum =
          (rgbaChecksum +
            r * ((i % 97) + 1) +
            g * (((i + 1) % 97) + 1) +
            b * (((i + 2) % 97) + 1) +
            a * (((i + 3) % 97) + 1)) %
          2147483647;
      }
    }
    return {
      width,
      height,
      total: width * height,
      colorful,
      colored: colorful,
      positive,
      negative,
      checksum,
      rgbChecksum,
      rgbaChecksum,
      foreground,
      foreground12,
      centerForeground,
      bright,
      edgePixels,
    };
  }, png.toString("base64"));
}

/** Read the compositor's visible canvas, not a discarded WebGL backbuffer. */
export async function scenePixels(page: Page) {
  const canvas = page.getByLabel("Molecular scene", { exact: true });
  const error = await canvas.evaluate((element) => {
    const gl = (element as HTMLCanvasElement).getContext("webgl2");
    if (!gl) throw new Error("WebGL2 context unavailable");
    return gl.getError();
  });
  const result = await pngPixels(
    page,
    await canvas.screenshot({
      // Locator screenshots include DOM painted above the canvas. Match the
      // canvas-only export/readPixels oracle by hiding these separate overlays;
      // visibility preserves layout and does not touch the renderer or camera.
      style:
        ".viewport-tools, .scene-label, .viewport-error { visibility: hidden !important; }",
    }),
  );
  return { ...result, error };
}
