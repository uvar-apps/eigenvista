import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

async function saveEvidence(label: string, value: unknown) {
  const file = path.resolve(
    `../artifacts/adaptive-volume-${test.info().project.name}-${label}.json`,
  );
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");
  await test
    .info()
    .attach(label, { path: file, contentType: "application/json" });
}

type Exercise =
  | { suite: "thin" }
  | { suite: "skipping"; mode: "volume" | "raycast"; quality: 1 | 2 | 4 };

async function exercise(page: Page, exercise: Exercise) {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  return page.evaluate(async (exercise) => {
    const sourceUrl = "/src/volume.ts";
    const threeUrl = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find(
        (url) => new URL(url).pathname === "/node_modules/.vite/deps/three.js",
      );
    if (!threeUrl) throw new Error("Three.js module was not loaded");
    const { volumeObject } = await import(/* @vite-ignore */ sourceUrl);
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    const width = 129;
    renderer.setSize(width, width);
    renderer.setClearColor("#101018");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const filtered = renderer.extensions.has("OES_texture_float_linear");
    const ordinary = [
      [2, 0, 0],
      [0, 2, 0],
      [0, 0, 2],
    ];
    const skewed = [
      [2, 0.3, 0],
      [0.4, 1.5, 0.2],
      [0.3, -0.2, 2],
    ];
    const reflected = [
      [-2, -0.3, 0],
      [0.4, 1.5, 0.2],
      [0.3, -0.2, 2],
    ];
    const profiles = [
      { label: "outside", basis: ordinary, cameraZ: 1.5 },
      { label: "reverse", basis: ordinary, cameraZ: -0.5 },
      { label: "inside", basis: ordinary, cameraZ: 0.75 },
      { label: "brick-face", basis: ordinary, cameraZ: 128 / 255 },
      { label: "skewed", basis: skewed, cameraZ: 1.5 },
      { label: "reflected-inside", basis: reflected, cameraZ: 0.75 },
    ];
    const volume = (values: Float32Array, basis: number[][]) => {
      const origin = [0, 1, 2].map(
        (axis) => -0.5 * basis.reduce((sum, vector) => sum + vector[axis], 0),
      );
      return {
        id: "adaptive-ray-test",
        label: "Analytic planar scalar field",
        quantity: "scalar",
        dims: [2, 2, 256],
        values,
        origin,
        axes: basis.map((axis, i) => axis.map((v) => v / (i === 2 ? 255 : 1))),
      };
    };
    const world = (
      grid: ReturnType<typeof volume>,
      basis: number[][],
      coordinates: number[],
    ) => {
      const out = new THREE.Vector3(...grid.origin);
      for (let i = 0; i < 3; i++)
        out.addScaledVector(new THREE.Vector3(...basis[i]), coordinates[i]);
      return out;
    };
    const render = (
      values: Float32Array,
      profile: (typeof profiles)[number],
      mode: "volume" | "raycast",
      quality: 1 | 2 | 4,
      skip: boolean,
      legacy = false,
      timing = false,
    ) => {
      const grid = volume(values, profile.basis);
      const camera = new THREE.PerspectiveCamera(45, 1, 0.00001, 100);
      camera.position.copy(
        world(grid, profile.basis, [0.5, 0.5, profile.cameraZ]),
      );
      camera.up.copy(new THREE.Vector3(...profile.basis[1]).normalize());
      camera.lookAt(
        world(grid, profile.basis, [
          0.5,
          0.5,
          profile.cameraZ > 0.5 ? 0.25 : 0.75,
        ]),
      );
      const scene = new THREE.Scene();
      const object = volumeObject(
        grid,
        mode,
        0.7,
        "#00ff00",
        "#ff0000",
        mode === "raycast" ? 1 : 0.6,
        profile.label === "inside" ? false : filtered,
        "diffuse",
        quality,
      );
      object.material.defines.SKIP_EMPTY_BRICKS = skip ? 1 : 0;
      if (legacy) {
        const statement =
          "float stepCount = ceil(length(voxelDirection) * (end-start) * samplesPerVoxel);";
        if (!object.material.fragmentShader.includes(statement))
          throw new Error(
            "Adaptive step statement changed; review the independent fixed-step benchmark",
          );
        object.material.fragmentShader = object.material.fragmentShader.replace(
          statement,
          "float stepCount = 160.0;",
        );
      }
      object.material.needsUpdate = true;
      scene.add(object);
      const draw = () => {
        renderer.render(scene, camera);
        gl.finish();
      };
      draw();
      const samples: number[] = [];
      if (timing) {
        const syncPixel = new Uint8Array(4);
        const synchronizedDraw = () => {
          draw();
          // Readback forces actual completion even on implementations where
          // finish() itself returns before command submission reaches the GPU.
          gl.readPixels(64, 64, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, syncPixel);
        };
        synchronizedDraw();
        for (let i = 0; i < 3; i++) {
          const start = performance.now();
          for (let frame = 0; frame < 3; frame++) synchronizedDraw();
          samples.push((performance.now() - start) / 3);
        }
      }
      const pixels = new Uint8Array(width * width * 4);
      gl.readPixels(0, 0, width, width, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      const offset = (64 * width + 64) * 4;
      const center = Array.from(pixels.subarray(offset, offset + 4));
      let green = 0,
        red = 0;
      for (let y = 60; y <= 68; y++)
        for (let x = 60; x <= 68; x++) {
          const at = (y * width + x) * 4;
          if (
            pixels[at + 1] > pixels[at] + 20 &&
            pixels[at + 1] > pixels[at + 2] + 20
          )
            green++;
          if (
            pixels[at] > pixels[at + 1] + 20 &&
            pixels[at] > pixels[at + 2] + 20
          )
            red++;
        }
      const result = {
        center,
        green,
        red,
        glError: gl.getError(),
        milliseconds: samples.sort((a, b) => a - b)[1] ?? null,
      };
      object.geometry.dispose();
      object.material.dispose();
      object.userData.texture.dispose();
      object.userData.rangesTexture.dispose();
      return result;
    };
    const makeValues = (zValue: (z: number) => number) => {
      const values = new Float32Array(2 * 2 * 256);
      for (let z = 0; z < 256; z++)
        for (let xy = 0; xy < 4; xy++) values[z * 4 + xy] = zValue(z);
      return values;
    };
    try {
      if (exercise.suite === "thin") {
        // Independent linear interpolation on the axial tent: the old center ray
        // samples closest at voxel 127.5, where its value is only 0.5.
        const legacyMaximum = Math.max(
          ...Array.from({ length: 161 }, (_, i) =>
            Math.max(0, 1 - Math.abs((255 * i) / 160 - 127)),
          ),
        );
        const results = [];
        for (const sign of [1, -1]) {
          const values = makeValues(
            (z) => sign * Math.max(0, 1 - Math.abs(z - 127)),
          );
          for (const profile of profiles)
            for (const quality of [2, 4] as const)
              results.push({
                label: profile.label,
                sign,
                quality,
                ...render(values, profile, "raycast", quality, true),
              });
          results.push({
            label: "legacy160",
            sign,
            quality: 0,
            ...render(values, profiles[0], "raycast", 2, false, true),
          });
        }
        return { legacyMaximum, results, comparisons: [], timings: [] };
      }
      const values = makeValues((z) =>
        z >= 64 && z <= 96 ? 1 : z >= 160 && z <= 168 ? -1 : 0,
      );
      const { mode, quality } = exercise;
      const comparisons = [];
      for (const profile of [
        profiles[0],
        profiles[3],
        profiles[4],
        profiles[5],
      ]) {
        const skipped = render(values, profile, mode, quality, true);
        const dense = render(values, profile, mode, quality, false);
        comparisons.push({
          label: profile.label,
          mode,
          quality,
          skipped,
          dense,
        });
      }
      const timings = [];
      for (const skip of [false, true])
        timings.push({
          mode,
          quality,
          skip,
          legacy: false,
          ...render(values, profiles[0], mode, quality, skip, false, true),
        });
      // The fixed160 baseline is mode-dependent, not quality-dependent. Keep
      // one fully warmed/measured baseline per mode in its first quality case.
      if (quality === 1)
        timings.push({
          mode,
          quality: 0,
          skip: false,
          legacy: true,
          ...render(values, profiles[0], mode, 2, false, true, true),
        });
      return { legacyMaximum: null, results: [], comparisons, timings };
    } finally {
      renderer.dispose();
    }
  }, exercise);
}

test("voxel-aware raycasting resolves signed features missed by fixed160 across affine and inside-camera views", async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const result = await exercise(page, { suite: "thin" });
  expect(result.legacyMaximum).toBeLessThan(0.7);
  for (const sample of result.results) {
    expect(sample.glError, JSON.stringify(sample)).toBe(0);
    if (sample.label === "legacy160") {
      expect(sample.center.slice(0, 3), JSON.stringify(sample)).toEqual([
        16, 16, 24,
      ]);
    } else {
      const dominant = sample.sign > 0 ? 1 : 0;
      expect(sample.center[dominant], JSON.stringify(sample)).toBeGreaterThan(
        60,
      );
      expect(
        sample.center[dominant] - sample.center[1 - dominant],
        JSON.stringify(sample),
      ).toBeGreaterThan(40);
      expect(
        sample.sign > 0 ? sample.green : sample.red,
        JSON.stringify(sample),
      ).toBeGreaterThan(60);
    }
  }
  expect(errors).toEqual([]);
  await saveEvidence("thin-field-pixels", result);
});

// Each independent mode/quality case keeps the same pixel comparisons and all
// timing draws. A software renderer must not complete the entire matrix within
// one monolithic evaluate deadline before any case can report its result.
for (const mode of ["volume", "raycast"] as const) {
  for (const quality of [1, 2, 4] as const) {
    test(
      `empty-brick skipping preserves dense traversal and reports warmed GPU timings: ${mode} quality ${quality}`,
      async ({ page }) => {
        test.setTimeout(120000);
        const errors: string[] = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const result = await exercise(page, { suite: "skipping", mode, quality });
        expect(result.comparisons.map((sample) => sample.label)).toEqual([
          "outside", "brick-face", "skewed", "reflected-inside",
        ]);
        expect(result.timings).toHaveLength(quality === 1 ? 3 : 2);
        for (const comparison of result.comparisons) {
          expect(comparison.skipped.glError, JSON.stringify(comparison)).toBe(0);
          expect(comparison.dense.glError, JSON.stringify(comparison)).toBe(0);
          expect(
            Math.max(...comparison.skipped.center.slice(0, 3)),
            JSON.stringify(comparison),
          ).toBeGreaterThan(30);
          for (let i = 0; i < 4; i++)
            expect(
              Math.abs(comparison.skipped.center[i] - comparison.dense.center[i]),
              JSON.stringify(comparison),
            ).toBeLessThanOrEqual(5);
        }
        for (const measurement of result.timings)
          expect(measurement.milliseconds).toBeGreaterThanOrEqual(0);
        expect(errors).toEqual([]);
        await saveEvidence(`measurements-${mode}-${quality}`, result);
        console.log(
          "Adaptive volume timings (median ms/frame with synchronized pixel readback):",
          JSON.stringify(
            result.timings.map(({ mode, quality, skip, legacy, milliseconds }) => ({
              mode,
              quality,
              skip,
              legacy,
              milliseconds,
            })),
          ),
        );
      },
    );
  }
}

test("coarse ray segments composite both signed roots in order and retain exact-entry roots", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const samples = await page.evaluate(async () => {
    const sourceUrl = "/src/volume.ts";
    const threeUrl = performance
      .getEntriesByType("resource")
      .map((entry) => entry.name)
      .find(
        (url) => new URL(url).pathname === "/node_modules/.vite/deps/three.js",
      );
    if (!threeUrl) throw new Error("Three.js module was not loaded");
    const { volumeObject } = await import(/* @vite-ignore */ sourceUrl);
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const renderer = new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
    renderer.setSize(65, 65);
    renderer.setClearColor("#101018");
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const gl = renderer.getContext() as WebGL2RenderingContext;
    const render = (
      low: number,
      high: number,
      cameraSign: number,
      opacity: number,
      skip: boolean,
      probeZ?: number,
    ) => {
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 20);
      camera.position.set(0, 0, 3 * cameraSign);
      camera.lookAt(0, 0, 0);
      const scene = new THREE.Scene();
      const values = new Float32Array([
        low,
        low,
        low,
        low,
        high,
        high,
        high,
        high,
      ]);
      const object = volumeObject(
        {
          id: "two-signed-roots",
          label: "Linear scalar field",
          quantity: "scalar",
          origin: [-1, -1, -1],
          axes: [
            [2, 0, 0],
            [0, 2, 0],
            [0, 0, 2],
          ],
          dims: [2, 2, 2],
          values,
        },
        "raycast",
        1,
        "#00ff00",
        "#ff0000",
        opacity,
        false,
        "diffuse",
        2,
      );
      object.material.defines.SKIP_EMPTY_BRICKS = skip ? 1 : 0;
      object.material.needsUpdate = true;
      object.renderOrder = 0;
      scene.add(object);
      let probe;
      if (probeZ !== undefined) {
        probe = new THREE.Mesh(
          new THREE.PlaneGeometry(1.8, 1.8),
          new THREE.MeshBasicMaterial({
            color: "#0000ff",
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 1,
            depthWrite: true,
          }),
        );
        probe.position.z = probeZ;
        // Force the depth probe after the volume so its visibility tests the
        // shader's actual gl_FragDepth rather than Three.js object sorting.
        probe.renderOrder = 1;
        scene.add(probe);
      }
      renderer.render(scene, camera);
      const pixel = new Uint8Array(4);
      gl.readPixels(32, 32, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
      const result = { rgba: Array.from(pixel), glError: gl.getError() };
      object.geometry.dispose();
      object.material.dispose();
      object.userData.texture.dispose();
      object.userData.rangesTexture.dispose();
      if (probe) {
        probe.geometry.dispose();
        probe.material.dispose();
      }
      return result;
    };
    const results = [];
    try {
      for (const skip of [false, true])
        for (const cameraSign of [-1, 1]) {
          const nearPositive = cameraSign > 0;
          const nearRoot = -1 + (2 * ((nearPositive ? 1 : -1) + 30)) / 100;
          results.push({
            kind: "opaque",
            skip,
            cameraSign,
            nearPositive,
            ...render(-30, 70, cameraSign, 1, skip),
          });
          results.push({
            kind: "transparent",
            skip,
            cameraSign,
            nearPositive,
            ...render(-30, 70, cameraSign, 0.5, skip),
          });
          results.push({
            kind: "probe-front",
            skip,
            cameraSign,
            nearPositive,
            ...render(
              -30,
              70,
              cameraSign,
              1,
              skip,
              nearRoot + cameraSign * 0.003,
            ),
          });
          results.push({
            kind: "probe-back",
            skip,
            cameraSign,
            nearPositive,
            ...render(
              -30,
              70,
              cameraSign,
              1,
              skip,
              nearRoot - cameraSign * 0.003,
            ),
          });
        }
      for (const sign of [-1, 1]) {
        results.push({
          kind: "entry",
          skip: true,
          cameraSign: -1,
          nearPositive: sign > 0,
          ...render(sign, sign * 11, -1, 1, true),
        });
        results.push({
          kind: "flat",
          skip: true,
          cameraSign: -1,
          nearPositive: sign > 0,
          ...render(sign, sign, -1, 1, true),
        });
      }
      return results;
    } finally {
      renderer.dispose();
    }
  });
  // This central ray sees a world-Z linear field along either camera-Z direction.
  // The eye-facing normal points along the headlight: neutral fill 0.35 plus
  // directional diffuse 0.65 equals 1, independently of camera sign.
  const light = 1;
  const srgb = (linear: number) =>
    linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055;
  for (const sample of samples) {
    expect(sample.glError, JSON.stringify(sample)).toBe(0);
    if (sample.kind === "flat")
      expect(sample.rgba.slice(0, 3)).toEqual([16, 16, 24]);
    else if (sample.kind === "probe-front")
      expect(sample.rgba.slice(0, 3)).toEqual([0, 0, 255]);
    else if (sample.kind === "transparent") {
      const near = sample.nearPositive ? 1 : 0;
      const linear = [0, 0, 0];
      linear[near] = (light * 2) / 3;
      linear[1 - near] = light / 3;
      const background = [16, 16, 24];
      const expected = linear.map((value, i) =>
        Math.round(255 * srgb(value) * 0.75 + background[i] * 0.25),
      );
      for (let i = 0; i < 3; i++)
        expect(
          Math.abs(sample.rgba[i] - expected[i]),
          JSON.stringify({ sample, expected }),
        ).toBeLessThanOrEqual(3);
    } else {
      const near = sample.nearPositive ? 1 : 0;
      expect(sample.rgba[near], JSON.stringify(sample)).toBeGreaterThan(150);
      expect(sample.rgba[1 - near], JSON.stringify(sample)).toBeLessThan(3);
      expect(sample.rgba[2], JSON.stringify(sample)).toBeLessThan(3);
    }
  }
  await saveEvidence("signed-crossing-depth", samples);
});
