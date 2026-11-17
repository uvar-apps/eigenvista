// Historical comparison UI (workspace=legacy); these reference oracles do not qualify the production pane.
import { scenePixels } from "./scenePixels";
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const source = (name: string) => fs.readFileSync(path.resolve(name), "utf8");

test("custom shader alpha blends independently of document opacity and opaque mode restores depth writes", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const result = await page.evaluate(
    async (sources) => {
      const threeUrl = "/node_modules/.vite/deps/three.js";
      const toolsUrl = "/src/shaderTools.ts";
      const THREE = await import(/* @vite-ignore */ threeUrl);
      const tools = await import(/* @vite-ignore */ toolsUrl);
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        preserveDrawingBuffer: true,
      });
      renderer.setSize(192, 192);
      renderer.setClearColor("#000000", 1);
      renderer.domElement.id = "alpha-pixel-probe";
      Object.assign(renderer.domElement.style, {
        position: "fixed",
        left: "8px",
        bottom: "40px",
        zIndex: "100",
      });
      document.body.append(renderer.domElement);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-2, 2, 2, -2, 0.1, 20);
      camera.position.set(0, 0, 5);
      const geometry = new THREE.PlaneGeometry(3, 3);
      const rearMaterial = new THREE.MeshBasicMaterial({
        color: "#0000ff",
        side: THREE.DoubleSide,
      });
      const rear = new THREE.Mesh(geometry, rearMaterial);
      scene.add(rear);
      const defs = tools.parseUniforms(
        sources.phongVertex,
        sources.phongFragment,
      );
      const values = {
        lightDir: [0, 0, 1],
        lightColor: [1, 0, 0],
        ambient: 1,
        diffuseScale: 0,
        specularScale: 0,
        shininess: 1,
        opacity: 0.5,
      };
      const material = tools.buildSurfaceMaterial(
        {
          vertexName: "phong.vert",
          fragmentName: "phong.frag",
          vertexSource: sources.phongVertex,
          fragmentSource: sources.phongFragment,
          uniforms: defs,
          values,
        },
        { color: "#ffffff", opacity: 1 },
      );
      const front = new THREE.Mesh(geometry, material);
      front.position.z = 1;
      scene.add(front);
      const pixel = (x = 96, y = 96) => {
        renderer.render(scene, camera);
        const rgba = new Uint8Array(4);
        const gl = renderer.getContext();
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
        return Array.from(rgba);
      };
      const blended = pixel();
      const initialFlags = {
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      };
      const beforeUniform = material.version;
      tools.applyUniformValues(material, defs, { ...values, opacity: 0.25 });
      const uniformVersion = material.version;
      const quarter = pixel();
      tools.applyShaderTransparency(material, false);
      const opaque = pixel();
      const opaqueFlags = {
        transparent: material.transparent,
        depthWrite: material.depthWrite,
      };
      const opaqueVersion = material.version;
      tools.applyShaderTransparency(material, false);
      const unchangedVersion = material.version;
      tools.applyShaderTransparency(material, true);
      const restored = pixel();

      const greenMaterial = new THREE.MeshBasicMaterial({ color: "#00ff00" });
      const foreground = new THREE.Mesh(geometry, greenMaterial);
      foreground.position.z = 2;
      scene.add(foreground);
      const builtInFront = pixel();
      scene.remove(foreground);
      scene.remove(rear);
      scene.remove(front);

      const simpleVertex =
        "void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}";
      const makeOpaque = (color: string) =>
        tools.buildSurfaceMaterial(
          {
            vertexName: "plane.vert",
            fragmentName: "plane.frag",
            vertexSource: simpleVertex,
            fragmentSource: `void main(){gl_FragColor=vec4(${color},0.2);}`,
            uniforms: [],
            values: {},
            transparent: false,
          },
          { color: "#ffffff", opacity: 1 },
        );
      const red = new THREE.Mesh(geometry, makeOpaque("1.,0.,0."));
      const blue = new THREE.Mesh(geometry, makeOpaque("0.,0.,1."));
      red.rotation.y = Math.PI / 4;
      blue.rotation.y = -Math.PI / 4;
      red.renderOrder = 1;
      blue.renderOrder = 2;
      scene.add(red, blue);
      const left = pixel(72, 96);
      const right = pixel(120, 96);
      red.renderOrder = 2;
      blue.renderOrder = 1;
      const leftReordered = pixel(72, 96);
      const rightReordered = pixel(120, 96);
      scene.remove(red, blue);

      const xrayDefs = tools.parseUniforms(
        sources.xrayVertex,
        sources.xrayFragment,
      );
      const xrayValues = {
        eyePosition: [0, 0, 0],
        color: [1, 0, 0],
        minOpacity: 0,
        maxOpacity: 1,
        da: 0,
      };
      const xrayMaterial = tools.buildSurfaceMaterial(
        {
          vertexName: "x-ray.vert",
          fragmentName: "x-ray.frag",
          vertexSource: sources.xrayVertex,
          fragmentSource: sources.xrayFragment,
          uniforms: xrayDefs,
          values: xrayValues,
        },
        { color: "#ffffff", opacity: 1 },
      );
      const xray = new THREE.Mesh(geometry, xrayMaterial);
      xray.position.z = 1;
      scene.add(rear, xray);
      const facing = pixel();
      xray.rotation.y = Math.PI / 3;
      const angled = pixel();
      // Leave the real rendered probe visible for screenshot inspection.
      geometry.dispose();
      for (const m of [
        rearMaterial,
        material,
        greenMaterial,
        red.material,
        blue.material,
        xrayMaterial,
      ])
        m.dispose();
      renderer.setAnimationLoop(null);
      return {
        blended,
        quarter,
        opaque,
        restored,
        builtInFront,
        left,
        right,
        leftReordered,
        rightReordered,
        facing,
        angled,
        initialFlags,
        opaqueFlags,
        beforeUniform,
        uniformVersion,
        opaqueVersion,
        unchangedVersion,
      };
    },
    {
      phongVertex: source("shaders/surface-phong.vert"),
      phongFragment: source("shaders/surface-phong.frag"),
      xrayVertex: source("../shaders/x-ray.vert"),
      xrayFragment: source("../shaders/x-ray.frag"),
    },
  );
  expect(result.initialFlags).toEqual({ transparent: true, depthWrite: false });
  expect(result.opaqueFlags).toEqual({ transparent: false, depthWrite: true });
  expect(result.uniformVersion).toBe(result.beforeUniform);
  expect(result.unchangedVersion).toBe(result.opaqueVersion);
  expect(result.blended[0]).toBeGreaterThan(100);
  expect(result.blended[2]).toBeGreaterThan(100);
  expect(result.quarter[0]).toBeLessThan(result.blended[0] - 30);
  expect(result.quarter[2]).toBeGreaterThan(result.blended[2] + 30);
  expect(result.opaque.slice(0, 3)).toEqual([255, 0, 0]);
  expect(result.opaque[3]).toBe(255);
  expect(result.restored).toEqual(result.quarter);
  expect(result.builtInFront.slice(0, 3)).toEqual([0, 255, 0]);
  expect(result.left.slice(0, 3)).toEqual([255, 0, 0]);
  expect(result.right.slice(0, 3)).toEqual([0, 0, 255]);
  expect(result.leftReordered).toEqual(result.left);
  expect(result.rightReordered).toEqual(result.right);
  // The bundled shader interpolates its vertex-normalized view direction.
  const facingAlpha = 1 - 4 / Math.sqrt(4 * 4 + 2 * 1.5 * 1.5);
  expect(
    Math.abs(result.facing[0] - Math.round(255 * facingAlpha)),
  ).toBeLessThanOrEqual(1);
  expect(
    Math.abs(result.facing[2] - Math.round(255 * (1 - facingAlpha))),
  ).toBeLessThanOrEqual(1);
  expect(result.angled[0]).toBeGreaterThan(result.facing[0] + 80);
  expect(result.angled[2]).toBeGreaterThan(80);
  await page.locator("#alpha-pixel-probe").screenshot({
    path: `../artifacts/shader-alpha-probe-${testInfo.project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("shader transparency is a live session control and resets with Clear", async ({
  page,
}, testInfo) => {
  await page.goto("/?workspace=legacy");
  await expect(page.locator("footer [role=status]")).toContainText("triangles");
  const mode = page.getByLabel("Shader transparency", { exact: true });
  await expect(mode).toBeChecked();
  const documentOpacity = page.getByLabel("Opacity", { exact: true });
  await documentOpacity.press("End");
  await expect(documentOpacity).toHaveValue("1");
  for (const [kind, name] of [
    ["vertex", "surface-phong.vert"],
    ["fragment", "surface-phong.frag"],
  ])
    await page.locator(`[data-shader-input="${kind}"]`).setInputFiles({
      name,
      mimeType: "text/plain",
      buffer: fs.readFileSync(path.resolve("shaders", name)),
    });
  await page.locator('[data-shader-input="params"]').setInputFiles({
    name: "surface-phong.params",
    mimeType: "text/plain",
    buffer: fs.readFileSync(path.resolve("shaders/surface-phong.params")),
  });
  const checksum = () =>
    scenePixels(page).then(({ rgbaChecksum }) => rgbaChecksum);
  const builtIn = await checksum();
  await page.getByRole("button", { name: "Apply shader", exact: true }).click();
  await expect(page.locator(".shader-status")).toContainText("Applied");
  await expect.poll(checksum).not.toBe(builtIn);
  const fullAlpha = await checksum();
  await page.getByLabel("opacity", { exact: true }).fill("0.25");
  await expect.poll(checksum).not.toBe(fullAlpha);
  const blended = await checksum();
  await mode.uncheck();
  await expect.poll(checksum).not.toBe(blended);
  const opaque = await checksum();
  await mode.check();
  await expect.poll(checksum).toBe(blended);
  await mode.uncheck();
  await expect.poll(checksum).toBe(opaque);
  await page.screenshot({
    path: `../artifacts/shader-alpha-control-${testInfo.project.name}.png`,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await mode.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await expect(mode).toBeVisible();
  await page.screenshot({
    path: `../artifacts/shader-alpha-control-mobile-${testInfo.project.name}.png`,
  });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await scenePixels(page).then(({ bright }) => bright);
  await page.screenshot({
    path: `../artifacts/shader-alpha-scene-mobile-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Clear shader", exact: true }).click();
  await expect(mode).toBeChecked();
  await expect(page.locator(".shader-log")).toHaveCount(0);
});
