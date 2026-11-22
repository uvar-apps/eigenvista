import type { Page } from "@playwright/test";

export type Point = [number, number, number];
export const receiver: Point = [1, 0, 0];
export const isolated: Point = [-3.8, 0, 0];
export const neighbors: Point[] = [
  [2.3, 0, 0.65],
  [1, 1.3, 0.65],
];
// The additional real-lighting case declares a genuinely deeper visible pocket.
// Original ambient/field/resource/matte geometry above remains unchanged.
export const litNeighbors: Point[] = [
  [2.3, 0, 1.5],
  [1, 1.3, 1.5],
];
const eye: Point = [0, 0, 14];

const subtract = (a: Point, b: Point): Point =>
  a.map((v, i) => v - b[i]) as Point;
const dot = (a: Point, b: Point) => a.reduce((sum, v, i) => sum + v * b[i], 0);
const scale = (a: Point, s: number): Point => a.map((v) => v * s) as Point;
const add = (a: Point, b: Point): Point => a.map((v, i) => v + b[i]) as Point;
const unit = (a: Point) => scale(a, 1 / Math.hypot(...a));
const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Finite independent cosine-hemisphere visibility, not a GTAO implementation. */
export function analyticVisibility(
  center: Point,
  occluders: Point[],
  radius = 3,
) {
  const normal = unit(subtract(eye, center));
  const origin = add(center, scale(normal, 1.0001));
  const tangent = unit(cross(normal, [0, 1, 0]));
  const bitangent = cross(normal, tangent);
  let visible = 0;
  for (let index = 0; index < 256; index++) {
    const r = Math.sqrt((index + 0.5) / 256),
      angle = index * Math.PI * (3 - Math.sqrt(5));
    const direction = add(
      add(
        scale(tangent, r * Math.cos(angle)),
        scale(bitangent, r * Math.sin(angle)),
      ),
      scale(normal, Math.sqrt(1 - r * r)),
    );
    const blocked = occluders.some((sphere) => {
      const relative = subtract(origin, sphere),
        b = dot(relative, direction);
      const discriminant = b * b - dot(relative, relative) + 1;
      if (discriminant < 0) return false;
      const hit = -b - Math.sqrt(discriminant);
      return hit > 0 && hit < radius;
    });
    if (!blocked) visible++;
  }
  return visible / 256;
}

/** Positive camera-ray control, independently of the renderer/AO implementation. */
export function cameraSeesReceiver(center: Point, occluders: Point[]): boolean {
  const direction = unit(subtract(center, eye));
  const receiverHit = Math.hypot(...subtract(center, eye)) - 1;
  return !occluders.some((sphere) => {
    const relative = subtract(eye, sphere),
      b = dot(relative, direction);
    const discriminant = b * b - dot(relative, relative) + 1;
    if (discriminant < 0) return false;
    const hit = -b - Math.sqrt(discriminant);
    return hit > 0 && hit < receiverHit;
  });
}

/** Perspective projection of a declared sphere-center ray, in bottom-left pixels. */
function projected(center: Point, size = 256) {
  const focal = size / (2 * Math.tan(Math.PI / 8));
  return {
    x: Math.round(size / 2 + (focal * center[0]) / (14 - center[2])),
    y: Math.round(size / 2 + (focal * center[1]) / (14 - center[2])),
  };
}

export interface ProbeFrame {
  label: string;
  checksum: number;
  foreground: number;
  background: number[];
  patches: Record<string, number>;
  colors: Record<string, number[]>;
  materials: {
    atomsLambert: boolean;
    bondsLambert: boolean;
    atomsOriginal: boolean;
    bondsOriginal: boolean;
  };
  instancedDraws: number;
  ordinaryDraws: number;
  error: number;
  png: string;
  resources: {
    textures: number;
    framebuffers: number;
    programs: number;
    allocations: { width: number; height: number }[];
  };
}
export interface MolecularProbeResult {
  frames: ProbeFrame[];
  picks: unknown[];
  beforeConstructor: ProbeFrame["resources"];
  afterConstructor: ProbeFrame["resources"];
  afterDispose: ProbeFrame["resources"];
  backend: string;
  counts: { atoms: number; bonds: number };
  elapsed: number[];
}

export async function molecularProbe(
  page: Page,
  kind:
    | "contacts"
    | "fields"
    | "resources"
    | "dense"
    | "lit"
    | "matte" = "contacts",
): Promise<MolecularProbeResult> {
  return page.evaluate(
    async ({ centers, patches, kind }) => {
      const threeUrl = "/node_modules/.vite/deps/three.js";
      const controllerUrl = "/src/molecularAmbientOcclusion.ts";
      const THREE = await import(/* @vite-ignore */ threeUrl);
      const { MolecularAmbientOcclusion } = await import(
        /* @vite-ignore */ controllerUrl
      );
      const renderer = new THREE.WebGLRenderer({
        antialias: false,
        preserveDrawingBuffer: false,
      });
      renderer.setSize(256, 256);
      const productLighting = kind === "lit" || kind === "matte";
      renderer.outputColorSpace = productLighting
        ? THREE.SRGBColorSpace
        : THREE.LinearSRGBColorSpace;
      renderer.setClearColor(new THREE.Color(0.9, 0.9, 0.9), 1);
      renderer.domElement.id = "molecular-ao-reference";
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const textureIds = new Set<unknown>(),
        framebufferIds = new Set<unknown>(),
        programs = new Set<unknown>();
      const allocations = new Map<unknown, { width: number; height: number }>();
      const methods = gl as unknown as Record<
        string,
        (...args: unknown[]) => unknown
      >;
      let bound: unknown,
        instancedDraws = 0,
        ordinaryDraws = 0;
      for (const [create, remove, ids] of [
        ["createTexture", "deleteTexture", textureIds],
        ["createFramebuffer", "deleteFramebuffer", framebufferIds],
        ["createProgram", "deleteProgram", programs],
      ] as const) {
        const originalCreate = methods[create],
          originalRemove = methods[remove];
        methods[create] = function (...args) {
          const value = Reflect.apply(originalCreate, gl, args);
          ids.add(value);
          return value;
        };
        methods[remove] = function (...args) {
          ids.delete(args[0]);
          if (remove === "deleteTexture") allocations.delete(args[0]);
          return Reflect.apply(originalRemove, gl, args);
        };
      }
      const bindTexture = methods.bindTexture;
      methods.bindTexture = function (...args) {
        if (args[0] === gl.TEXTURE_2D) bound = args[1];
        return Reflect.apply(bindTexture, gl, args);
      };
      for (const name of ["texImage2D", "texStorage2D"]) {
        const original = methods[name];
        methods[name] = function (...args) {
          if (
            bound &&
            typeof args[3] === "number" &&
            typeof args[4] === "number"
          )
            allocations.set(bound, { width: args[3], height: args[4] });
          return Reflect.apply(original, gl, args);
        };
      }
      for (const name of [
        "drawElementsInstanced",
        "drawArraysInstanced",
        "drawElements",
        "drawArrays",
      ]) {
        const original = methods[name];
        methods[name] = function (...args) {
          if (name.endsWith("Instanced")) instancedDraws++;
          else ordinaryDraws++;
          return Reflect.apply(original, gl, args);
        };
      }
      const resources = () => ({
        textures: textureIds.size,
        framebuffers: framebufferIds.size,
        programs: programs.size,
        allocations: [...allocations.values()],
      });
      const scene = new THREE.Scene();
      if (!productLighting) scene.add(new THREE.AmbientLight(0xffffff, 2));
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 40);
      camera.position.set(0, 0, 14);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
      if (productLighting) {
        const lightingUrl = "/src/sceneLighting.ts";
        const { addSceneLighting } = await import(
          /* @vite-ignore */ lightingUrl
        );
        addSceneLighting(scene, camera);
      }
      const geometry = new THREE.SphereGeometry(1, 24, 16);
      const material = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: kind === "matte" ? 0.05 : 1,
      });
      const positions =
        kind === "dense"
          ? Array.from({ length: 512 }, (_, i) => [
              ((i % 8) - 3.5) * 0.7,
              ((Math.floor(i / 8) % 8) - 3.5) * 0.7,
              (Math.floor(i / 64) - 3.5) * 0.7,
            ])
          : centers;
      const atoms = new THREE.InstancedMesh(
        geometry,
        material,
        positions.length,
      );
      const matrix = new THREE.Matrix4();
      for (let index = 0; index < positions.length; index++) {
        matrix.makeScale(
          kind === "dense" ? 0.3 : 1,
          kind === "dense" ? 0.3 : 1,
          kind === "dense" ? 0.3 : 1,
        );
        matrix.setPosition(...positions[index]);
        atoms.setMatrixAt(index, matrix);
      }
      const bondGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
      const bondMaterial = new THREE.MeshStandardMaterial({
        color: 0xaaaaaa,
        roughness: kind === "matte" ? 0.05 : 1,
      });
      const bonds = new THREE.InstancedMesh(
        bondGeometry,
        bondMaterial,
        kind === "dense" ? 511 : 1,
      );
      const direction = new THREE.Vector3(1, 0.35, 0.2).normalize();
      const rotation = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction,
      );
      for (let index = 0; index < bonds.count; index++) {
        if (kind === "dense") {
          const first = new THREE.Vector3(...positions[index]),
            last = new THREE.Vector3(...positions[index + 1]);
          const delta = last.clone().sub(first);
          matrix.compose(
            first.add(last).multiplyScalar(0.5),
            new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              delta.clone().normalize(),
            ),
            new THREE.Vector3(0.07, delta.length(), 0.07),
          );
        } else
          matrix.compose(
            new THREE.Vector3(-1.1, -1.8, 0),
            rotation,
            new THREE.Vector3(0.18, 2.6, 0.18),
          );
        bonds.setMatrixAt(index, matrix);
      }
      atoms.instanceMatrix.needsUpdate =
        bonds.instanceMatrix.needsUpdate = true;
      scene.add(atoms, bonds);
      const extras: {
        geometry: { dispose(): void };
        material: { dispose(): void };
        userData?: Record<string, { dispose(): void }>;
      }[] = [];
      let cover: typeof atoms | undefined;
      if (kind === "fields") {
        const toolsUrl = "/src/shaderTools.ts",
          volumeUrl = "/src/volume.ts";
        const tools = await import(/* @vite-ignore */ toolsUrl);
        const { volumeObject } = await import(/* @vite-ignore */ volumeUrl);
        cover = new THREE.Mesh(
          new THREE.PlaneGeometry(0.7, 0.7),
          new THREE.MeshStandardMaterial({
            color: 0x0000ff,
            roughness: 1,
            side: THREE.DoubleSide,
          }),
        );
        cover.position.set(11 / 14, 0, 3);
        scene.add(cover);
        extras.push(cover);
        const fieldMaterial = tools.buildSurfaceMaterial(
          {
            vertexName: "control.vert",
            fragmentName: "control.frag",
            uniforms: [],
            values: {},
            transparent: false,
            vertexSource:
              "void main(){gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
            fragmentSource: "void main(){gl_FragColor=vec4(0.1,0.3,0.9,1.0);}",
          },
          { color: "#ffffff", opacity: 1 },
        );
        const custom = new THREE.Mesh(
          new THREE.PlaneGeometry(1.5, 1.5),
          fieldMaterial,
        );
        custom.position.set(3.5, -1.5, 3);
        scene.add(custom);
        extras.push(custom);
        const volume = volumeObject(
          {
            dims: [2, 2, 2],
            origin: [-4, -2, 2],
            axes: [
              [1, 0, 0],
              [0, 1, 0],
              [0, 0, 1],
            ],
            values: new Float32Array(8).fill(1),
          },
          "volume",
          0.25,
          "#00ff00",
          "#ff0000",
          0.5,
          false,
          "diffuse",
          2,
        );
        scene.add(volume);
        extras.push(volume);
      }
      renderer.render(scene, camera);
      const beforeConstructor = resources();
      const controller = new MolecularAmbientOcclusion(renderer, scene, camera);
      controller.setMeshes([atoms, bonds]);
      const afterConstructor = resources();
      const extension = gl.getExtension("WEBGL_debug_renderer_info");
      const backend = extension
        ? String(gl.getParameter(extension.UNMASKED_RENDERER_WEBGL))
        : String(gl.getParameter(gl.RENDERER));
      const frames: ProbeFrame[] = [],
        picks: unknown[] = [],
        elapsed: number[] = [];
      const freshMaterials: { dispose(): void }[] = [];
      function draw(label: string, enabled: boolean, strength = 1) {
        instancedDraws = ordinaryDraws = 0;
        const started = performance.now();
        controller.render({ enabled, strength, radius: 3 });
        renderer.render(scene, camera);
        gl.finish();
        elapsed.push(performance.now() - started);
        const width = renderer.domElement.width,
          height = renderer.domElement.height;
        const data = new Uint8Array(width * height * 4);
        gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, data);
        let checksum = 0;
        for (let i = 0; i < data.length; i++)
          checksum = (checksum + data[i] * ((i % 97) + 1)) % 2147483647;
        let foreground = 0;
        const corner = (2 * width + 2) * 4;
        for (let i = 0; i < data.length; i += 4)
          if (
            Math.max(
              Math.abs(data[i] - data[corner]),
              Math.abs(data[i + 1] - data[corner + 1]),
              Math.abs(data[i + 2] - data[corner + 2]),
            ) > 12
          )
            foreground++;
        const means: Record<string, number> = {};
        const colors: Record<string, number[]> = {};
        if (width === 256 && height === 256)
          for (const [name, p] of Object.entries(patches)) {
            let sum = 0;
            const rgb = [0, 0, 0];
            for (let y = p.y - 2; y <= p.y + 2; y++)
              for (let x = p.x - 2; x <= p.x + 2; x++) {
                const offset = (y * width + x) * 4;
                sum +=
                  data[offset] * 0.2126 +
                  data[offset + 1] * 0.7152 +
                  data[offset + 2] * 0.0722;
                for (let channel = 0; channel < 3; channel++)
                  rgb[channel] += data[offset + channel];
              }
            means[name] = sum / 25;
            colors[name] = rgb.map((value) => value / 25);
          }
        frames.push({
          label,
          checksum,
          foreground,
          background: Array.from(
            data.slice((2 * width + 2) * 4, (2 * width + 2) * 4 + 4),
          ),
          patches: means,
          colors,
          materials: {
            atomsLambert: atoms.material instanceof THREE.MeshLambertMaterial,
            bondsLambert: bonds.material instanceof THREE.MeshLambertMaterial,
            atomsOriginal: atoms.material === (freshMaterials[0] ?? material),
            bondsOriginal:
              bonds.material === (freshMaterials[1] ?? bondMaterial),
          },
          instancedDraws,
          ordinaryDraws,
          error: gl.getError(),
          png: renderer.domElement.toDataURL("image/png").split(",")[1],
          resources: resources(),
        });
        const ray = new THREE.Raycaster();
        ray.setFromCamera(
          new THREE.Vector2(
            -1.1 / (14 * Math.tan(Math.PI / 8)),
            -1.8 / (14 * Math.tan(Math.PI / 8)),
          ),
          camera,
        );
        picks.push(ray.intersectObject(bonds)[0]?.instanceId ?? null);
      }
      try {
        draw("off", false);
        draw("on", true);
        draw("restored", false);
        draw("zero", true, 0);
        if (kind === "lit") {
          // Both positive strengths activate the same Lambert style; their
          // contact difference therefore cannot come from removing specular.
          draw("lit-weak", true, 0.05);
          draw("lit-full", true, 1);
        }
        if (kind === "matte") {
          // Positive epsilon isolates active matte style from AO attenuation
          // at RGBA8 precision without reimplementing either lighting shader.
          draw("gloss-matte", true, 0.000001);
          draw("gloss-restored", false);
          material.roughness = bondMaterial.roughness = 1;
          material.needsUpdate = bondMaterial.needsUpdate = true;
          draw("rough-off", false);
          draw("rough-matte", true, 0.000001);
          draw("rough-restored", false);
          draw("rough-zero", true, 0);
        }
        if (kind === "fields" && cover) {
          cover.material.transparent = true;
          cover.material.opacity = 0.5;
          cover.material.depthWrite = false;
          cover.material.needsUpdate = true;
          draw("transparent-off", false);
          draw("transparent-on", true);
        }
        if (kind === "resources") {
          renderer.setPixelRatio(2);
          renderer.setSize(1100, 128);
          camera.aspect = 1100 / 128;
          camera.updateProjectionMatrix();
          draw("capped", true);
          renderer.setPixelRatio(1);
          renderer.setSize(256, 256);
          camera.aspect = 1;
          camera.updateProjectionMatrix();
          draw("small-again", true);
          draw("off-again", false);
          draw("cycle", true);
          draw("cycle-off", false);
          // A newly opened document can compile its very first frame with AO on.
          // Fresh materials exercise that path without a prewarmed legacy program.
          controller.setMeshes([]);
          atoms.material = material.clone();
          bonds.material = bondMaterial.clone();
          freshMaterials.push(atoms.material, bonds.material);
          controller.setMeshes([atoms, bonds]);
          draw("on-first", true);
          draw("first-off", false);
          draw("first-on-again", true);
          draw("first-off-again", false);
        }
        controller.dispose();
        return {
          frames,
          picks,
          beforeConstructor,
          afterConstructor,
          afterDispose: resources(),
          backend,
          counts: { atoms: atoms.count, bonds: bonds.count },
          elapsed,
        };
      } finally {
        controller.dispose();
        geometry.dispose();
        material.dispose();
        bondGeometry.dispose();
        bondMaterial.dispose();
        for (const fresh of freshMaterials) fresh.dispose();
        atoms.dispose();
        bonds.dispose();
        for (const object of extras) {
          object.geometry.dispose();
          object.material.dispose();
          object.userData?.texture?.dispose();
          object.userData?.rangesTexture?.dispose();
        }
        renderer.dispose();
      }
    },
    {
      centers: [
        receiver,
        ...(kind === "lit" ? litNeighbors : neighbors),
        isolated,
      ],
      patches: {
        contact: projected(receiver),
        isolated: projected(isolated),
        custom: projected([3.5, -1.5, 3]),
        volume: projected([-3.5, -1.5, 2.5]),
      },
      kind,
    },
  );
}
