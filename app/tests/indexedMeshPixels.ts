import type { Page } from "@playwright/test";
import type { EigenVistaDocument } from "../src/types";

/** IDs use a base-seven palette so consecutive triangle corners differ. */
export const vertexIdShader = {
  vertex: `flat varying vec3 identityColor;
void main() {
  int ordinal = gl_VertexID;
  identityColor = vec3(float(ordinal % 7), float((ordinal / 7) % 7),
    float((ordinal / 49) % 7)) / 6.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`,
  fragment: `flat varying vec3 identityColor;
void main() { gl_FragColor = vec4(identityColor, 1.0); }`,
};

export type MeshVariant = "raw" | "compact" | "naive" | "restored";

/** Four bounded real draws, with synchronous readback in the render task. */
export async function indexedMeshPixels(
  page: Page,
  documents: Record<MeshVariant, EigenVistaDocument>,
) {
  return page.evaluate(async ({ documents, sources }) => {
    const threeUrl = "/node_modules/.vite/deps/three.js";
    const toolsUrl = "/src/shaderTools.ts";
    const THREE = await import(/* @vite-ignore */ threeUrl);
    const tools = await import(/* @vite-ignore */ toolsUrl);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      preserveDrawingBuffer: true,
    });
    renderer.setPixelRatio(1);
    renderer.setSize(192, 192);
    renderer.setClearColor("#000000", 1);
    renderer.domElement.style.position = "fixed";
    document.body.append(renderer.domElement);
    const scene = new THREE.Scene();
    const points = new THREE.BufferGeometry();
    points.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(documents.raw.surfaces[0].positions, 3),
    );
    points.computeBoundingSphere();
    const { center, radius } = points.boundingSphere!;
    const half = radius * 1.15;
    const camera = new THREE.OrthographicCamera(-half, half, half, -half, 0.01, 100);
    camera.position.copy(center).add(
      new THREE.Vector3(4, 3, 5).normalize().multiplyScalar(radius * 4),
    );
    camera.lookAt(center);
    camera.updateProjectionMatrix();
    const gl = renderer.getContext();
    const debug = gl.getExtension("WEBGL_debug_renderer_info");
    const rendererName = debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const captures = {} as Record<
      string,
      { rgba: number[]; png: string; positionBits: number[]; normalBits: number[];
        indices: number[]; drawCalls: number; error: number }
    >;
    try {
      for (const [name, doc] of Object.entries(documents)) {
        const surface = doc.surfaces[0];
        // Match Viewport's real attribute/index construction, including f32 VBOs.
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(surface.positions, 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(surface.normals, 3));
        geometry.setIndex(surface.indices);
        const material = tools.buildSurfaceMaterial({
          vertexName: "qualification-vertex-id.vert",
          fragmentName: "qualification-vertex-id.frag",
          vertexSource: sources.vertex,
          fragmentSource: sources.fragment,
          uniforms: [], values: {}, transparent: false,
        }, surface);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        try {
          renderer.render(scene, camera);
          const rgba = new Uint8Array(192 * 192 * 4);
          gl.readPixels(0, 0, 192, 192, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
          const positions = geometry.getAttribute("position").array as Float32Array;
          const normals = geometry.getAttribute("normal").array as Float32Array;
          captures[name] = {
            rgba: Array.from(rgba),
            png: renderer.domElement.toDataURL("image/png").split(",")[1],
            positionBits: Array.from(new Uint32Array(positions.buffer)),
            normalBits: Array.from(new Uint32Array(normals.buffer)),
            indices: Array.from(geometry.index!.array as Uint16Array | Uint32Array),
            drawCalls: renderer.info.render.calls,
            error: gl.getError(),
          };
        } finally {
          scene.remove(mesh);
          geometry.dispose();
          material.dispose();
        }
      }
      return { captures, renderer: rendererName };
    } finally {
      points.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
  }, { documents, sources: vertexIdShader });
}
