import { expect, test, type Page } from "@playwright/test";
import type { EigenVistaDocument } from "../src/types";
import type { ProteinBackbone } from "../src/useProteinBackbone";
import type { StructureDisplayState } from "../src/molecularDisplay";
import type * as THREE from "three";

function fixture(style: "trace" | "tube" | "ribbon" | "cartoon", chains = 2) {
  const positions: [number, number, number][] = [];
  const backbone: ProteinBackbone = { segments: [], warnings: [] };
  for (let chain = 0; chain < chains; chain++) {
    const points = [];
    for (let i = 0; i < 4; i++) {
      const atom = positions.length;
      const position: [number, number, number] = [
        4 * i + 20 * (chain % 8),
        12 * Math.floor(chain / 8) + (chains === 2 ? 12 * chain : 0),
        0,
      ];
      positions.push(position);
      points.push({
        atom,
        residue: atom,
        position,
        secondary: "sheet" as const,
        orientation: [0, 0, 1] as [number, number, number],
      });
    }
    backbone.segments.push({ chain, segment: 0, points });
  }
  const doc: EigenVistaDocument = {
    id: "independent-protein-geometry",
    title: "Independent geometry controls",
    atoms: { elements: positions.map(() => 6), positions },
    bonds: [],
    basis: [],
    orbitals: [],
    densities: [],
    grids: [],
    surfaces: [],
    provenance: [],
    view: {
      representation: style,
      positive_color: "#259d86",
      negative_color: "#cb4e72",
      opacity: 0.78,
      isovalue: 0.08,
      field: null,
    },
    structure: {
      chains: Array.from({ length: chains }, (_, i) => ({
        label_id: String.fromCharCode(65 + i),
        author_id: `author-${i}`,
        entity_id: "1",
      })),
      residues: positions.map((_, i) => ({
        chain: Math.floor(i / 4),
        name: "GLY",
        label_seq_id: (i % 4) + 1,
        author_seq_id: String((i % 4) + 1),
        insertion_code: null,
        segment: 0,
        kind: "protein",
        secondary: "sheet",
      })),
      atom_names: positions.map(() => "CA"),
      atom_residues: positions.map((_, i) => i),
      secondary_source: "deposited",
    },
  };
  const state: StructureDisplayState = {
    colorMode: "element",
    hiddenChains: [],
    hiddenKinds: [],
    chainStyles: {},
    kindStyles: {},
    isolatedChain: null,
    residueSelection: null,
    focus: null,
  };
  return { doc, backbone, state };
}

// Qualify the actual production factory independently of App/UI orchestration.
// A blank same-origin page prevents a second, unrelated full-size App GL draw.
test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:5178/", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><body>Protein geometry reference</body></html>",
    }),
  );
  await page.goto("/");
});

interface GeometryData {
  kind: string;
  positions: number[];
  normals: number[];
  indices: number[];
  atoms: number[];
  residues: number[];
}
async function geometry(page: Page, input: ReturnType<typeof fixture>) {
  return page.evaluate(async (input) => {
    const url = "/src/proteinGeometry.ts";
    const api = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/proteinGeometry");
    const result = api.createProteinGeometry(
      input.doc,
      input.state,
      input.backbone,
    );
    const children: GeometryData[] = [];
    for (const child of result.group.children as (
      | THREE.Mesh
      | THREE.LineSegments
    )[]) {
      const g = child.geometry;
      children.push({
        kind: child.type,
        positions: Array.from(g.getAttribute("position").array),
        normals: g.hasAttribute("normal")
          ? Array.from(g.getAttribute("normal").array)
          : [],
        indices: g.index ? Array.from(g.index.array) : [],
        atoms: Array.from(g.userData.proteinAtoms),
        residues: Array.from(g.userData.proteinResidues),
      });
      g.dispose();
      for (const material of Array.isArray(child.material)
        ? child.material
        : [child.material])
        material.dispose();
    }
    return {
      children,
      warnings: result.warnings,
      stats: result.group.userData.proteinStats,
    };
  }, input);
}

test("trace masks retain source IDs, genuine breaks, picking and in-place colors", async ({
  page,
}, info) => {
  const input = fixture("trace");
  // Reverse segment presentation and hide a middle source residue. The surviving
  // B6->B7 line must not be reindexed or bridge the omitted B5.
  input.backbone.segments.reverse();
  input.state.hiddenChains = [0];
  input.state.residueSelection = [4, 6, 7];
  const result = await page.evaluate(async (input) => {
    const url = "/src/proteinGeometry.ts";
    const api = (await import(
      /* @vite-ignore */ url
    )) as typeof import("../src/proteinGeometry");
    const before = JSON.stringify(input);
    const { group } = api.createProteinGeometry(
      input.doc,
      input.state,
      input.backbone,
    );
    const line = group.children.find(
      (child) => child.type === "LineSegments",
    ) as THREE.LineSegments;
    const mesh = group.children.find(
      (child) => child.type === "Mesh",
    ) as THREE.Mesh;
    const geometries = group.children.map(
      (child) => (child as THREE.Mesh).geometry,
    );
    const colors = Array.from(mesh.geometry.getAttribute("color").array);
    api.retintProteinGeometry(group, input.doc, {
      ...input.state,
      colorMode: "chain",
    });
    const result = {
      childCount: group.children.length,
      runs: group.userData.proteinStats.runs,
      positions: Array.from(line.geometry.getAttribute("position").array),
      lineAtoms: Array.from(line.geometry.userData.proteinAtoms as Uint32Array),
      meshAtoms: Array.from(
        new Set(mesh.geometry.userData.proteinAtoms as Uint32Array),
      ),
      linePick: api.proteinHitLabel(
        {
          object: line,
          index: 0,
          distance: 0,
          point: line.geometry.boundingBox!.min.clone(),
        },
        input.doc,
      ),
      meshPick: api.proteinHitLabel(
        {
          object: mesh,
          faceIndex: 0,
          distance: 0,
          point: mesh.geometry.boundingBox!.min.clone(),
        },
        input.doc,
      ),
      geometryStable: group.children.every(
        (child, i) => (child as THREE.Mesh).geometry === geometries[i],
      ),
      retinted: colors.some(
        (v, i) => v !== mesh.geometry.getAttribute("color").array[i],
      ),
      unchanged: before === JSON.stringify(input),
    };
    for (const child of group.children as (THREE.Mesh | THREE.LineSegments)[]) {
      child.geometry.dispose();
      for (const material of Array.isArray(child.material)
        ? child.material
        : [child.material])
        material.dispose();
    }
    return result;
  }, input);
  expect(result.childCount).toBe(2);
  expect(result.runs).toBe(2);
  expect(result.positions).toEqual([28, 12, 0, 32, 12, 0]);
  expect(result.lineAtoms).toEqual([6, 7]);
  expect(result.meshAtoms.sort()).toEqual([4, 6, 7]);
  expect(result.linePick).toContain("CA atom 7");
  expect(result.linePick).toContain("chain B");
  expect(result.meshPick).toContain("CA atom 5");
  expect(result.geometryStable).toBe(true);
  expect(result.retinted).toBe(true);
  expect(result.unchanged).toBe(true);
  await info.attach("source-mask-picking-metrics", {
    body: Buffer.from(JSON.stringify(result)),
    contentType: "application/json",
  });
});

test("oriented ribbon geometry and normals obey an independent rigid coordinate transform", async ({
  page,
}, info) => {
  const first = fixture("ribbon", 1);
  const points: [number, number, number][] = [
    [0, 0, 0],
    [4, 1, 0],
    [8, 0, 1],
    [12, 1, 0],
  ];
  first.doc.atoms.positions = points;
  first.backbone.segments[0].points.forEach((p, i) => {
    p.position = points[i];
  });
  const second = structuredClone(first);
  const rotate = (p: number[]): [number, number, number] => [-p[1], p[0], p[2]];
  const transform = (p: number[]): [number, number, number] => {
    const r = rotate(p);
    return [r[0] + 19, r[1] - 11, r[2] + 3];
  };
  second.doc.atoms.positions = points.map(transform);
  second.backbone.segments[0].points.forEach((p) => {
    p.position = transform(p.position);
    p.orientation = rotate(p.orientation!);
  });
  const a = (await geometry(page, first)).children[0],
    b = (await geometry(page, second)).children[0];
  expect(a.kind).toBe("Mesh");
  expect(b.indices).toEqual(a.indices);
  expect(b.atoms).toEqual(a.atoms);
  expect(a.positions.length).toBeGreaterThan(100);
  expect(b.positions.length).toBe(a.positions.length);
  let positionError = 0,
    normalError = 0;
  for (let i = 0; i < a.positions.length; i += 3) {
    const p = transform(a.positions.slice(i, i + 3)),
      n = rotate(a.normals.slice(i, i + 3));
    for (let axis = 0; axis < 3; axis++) {
      positionError = Math.max(
        positionError,
        Math.abs(p[axis] - b.positions[i + axis]),
      );
      normalError = Math.max(
        normalError,
        Math.abs(n[axis] - b.normals[i + axis]),
      );
    }
    expect(Math.abs(Math.hypot(...a.normals.slice(i, i + 3)) - 1)).toBeLessThan(
      2e-5,
    );
  }
  expect(positionError).toBeLessThan(2e-5);
  expect(normalError).toBeLessThan(2e-5);
  expect(
    a.indices.every((index) => index >= 0 && index < a.positions.length / 3),
  ).toBe(true);
  await info.attach("rigid-transform-metrics", {
    body: Buffer.from(
      JSON.stringify({
        positionError,
        normalError,
        vertices: a.positions.length / 3,
        triangles: a.indices.length / 3,
        positionUnits: "bohr",
      }),
    ),
    contentType: "application/json",
  });
});

test("beta arrow points toward the last source residue with closed topology and tapered surface normals", async ({
  page,
}, info) => {
  const mesh = (await geometry(page, fixture("cartoon", 1))).children[0];
  const rows = Array.from({ length: mesh.positions.length / 3 }, (_, i) => ({
    p: mesh.positions.slice(i * 3, i * 3 + 3),
    n: mesh.normals.slice(i * 3, i * 3 + 3),
  }));
  expect(Math.min(...rows.map((r) => r.p[0]))).toBeCloseTo(0, 5);
  expect(Math.max(...rows.map((r) => r.p[0]))).toBeCloseTo(12, 5);
  const body = rows.filter((r) => Math.abs(r.p[0] - 4) < 1e-5),
    head = rows.filter((r) => Math.abs(r.p[0] - 8) < 1e-5),
    tip = rows.filter((r) => Math.abs(r.p[0] - 12) < 1e-5);
  expect(body.length).toBeGreaterThan(0);
  expect(head.length).toBeGreaterThan(0);
  expect(tip.length).toBeGreaterThan(0);
  const width = (rows: typeof body) =>
    Math.max(...rows.map((r) => Math.abs(r.p[2])));
  expect(width(head) / width(body)).toBeGreaterThan(1.4);
  expect(width(head) / width(body)).toBeLessThan(2);
  expect(tip.every((r) => Math.hypot(r.p[1], r.p[2]) < 1e-5)).toBe(true);
  const edge = rows
    .filter(
      (r) =>
        r.p[0] >= 9 && r.p[0] <= 10.5 && Math.abs(r.p[1]) < 1e-5 && r.p[2] > 0,
    )
    .sort((a, b) => a.p[0] - b.p[0]);
  expect(edge.length).toBeGreaterThanOrEqual(3);
  // A straight tapered edge is z(x). Its outward normal is proportional to
  // (-dz/dx,0,1), independent of the production normal-generation algorithm.
  const slope =
    (edge.at(-1)!.p[2] - edge[0].p[2]) / (edge.at(-1)!.p[0] - edge[0].p[0]);
  const length = Math.hypot(slope, 1),
    expected = [-slope / length, 0, 1 / length];
  expect(expected[0]).toBeGreaterThan(0.4);
  const normalDots = edge.map((row) =>
    row.n.reduce((sum, v, axis) => sum + v * expected[axis], 0),
  );
  for (const dot of normalDots) expect(dot).toBeGreaterThan(0.96);
  // Duplicate cap rings may be intentional: weld equal positions for this
  // topological oracle rather than requiring any particular buffer indexing.
  const welded = new Map<string, number>(),
    vertices = rows.map((r) => {
      const key = r.p.map((v) => v.toFixed(5)).join(",");
      if (!welded.has(key)) welded.set(key, welded.size);
      return welded.get(key)!;
    });
  const edges = new Map<string, number>();
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const face = mesh.indices.slice(i, i + 3).map((index) => vertices[index]);
    expect(new Set(face).size).toBe(3);
    for (let j = 0; j < 3; j++) {
      const a = face[j],
        b = face[(j + 1) % 3],
        key = `${Math.min(a, b)},${Math.max(a, b)}`;
      edges.set(key, (edges.get(key) ?? 0) + 1);
    }
  }
  expect([...edges.values()].every((count) => count === 2)).toBe(true);
  await info.attach("beta-arrow-metrics", {
    body: Buffer.from(
      JSON.stringify({
        bodyHalfWidth: width(body),
        headHalfWidth: width(head),
        taperSlope: slope,
        expectedTaperNormal: expected,
        sampledTaperNormals: edge.map((row) => row.n),
        tipVertices: tip.length,
        weldedEdges: edges.size,
        positionUnits: "bohr",
      }),
    ),
    contentType: "application/json",
  });
});

test("actual small GL draw batches many chains and consumer disposal releases geometry", async ({
  page,
}, info) => {
  const input = fixture("tube", 32);
  const result = await page.evaluate(async (input) => {
    const url = "/src/proteinGeometry.ts",
      threeUrl = "/node_modules/.vite/deps/three.js";
    const api = (await import(
        /* @vite-ignore */ url
      )) as typeof import("../src/proteinGeometry"),
      THREE = (await import(
        /* @vite-ignore */ threeUrl
      )) as typeof import("three");
    const before = JSON.stringify(input),
      { group } = api.createProteinGeometry(
        input.doc,
        input.state,
        input.backbone,
      );
    const renderer = new THREE.WebGLRenderer({ antialias: false });
    renderer.setSize(97, 97, false);
    renderer.setClearColor(0x000000, 1);
    const scene = new THREE.Scene();
    scene.add(group, new THREE.AmbientLight(0xffffff, 2));
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(76, 18, 210);
    camera.lookAt(76, 18, 0);
    renderer.render(scene, camera);
    const pixels = new Uint8Array(97 * 97 * 4),
      gl = renderer.getContext();
    gl.readPixels(0, 0, 97, 97, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let positive = 0;
    for (let i = 0; i < pixels.length; i += 4)
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 30) positive++;
    const result = {
      childCount: group.children.length,
      calls: renderer.info.render.calls,
      positive,
      glError: gl.getError(),
      beforeDispose: renderer.info.memory.geometries,
      materialTypes: group.children.map(
        (child) => ((child as THREE.Mesh).material as THREE.Material).type,
      ),
      sourceUnchanged: before === JSON.stringify(input),
      png: renderer.domElement.toDataURL("image/png"),
      afterDispose: -1,
    };
    for (const child of group.children as THREE.Mesh[]) {
      child.geometry.dispose();
      for (const material of Array.isArray(child.material)
        ? child.material
        : [child.material])
        material.dispose();
    }
    result.afterDispose = renderer.info.memory.geometries;
    renderer.dispose();
    renderer.forceContextLoss();
    return result;
  }, input);
  expect(result.childCount).toBe(1);
  expect(result.calls).toBe(1);
  expect(result.materialTypes).toEqual(["MeshLambertMaterial"]);
  expect(result.positive).toBeGreaterThan(20);
  expect(result.glError).toBe(0);
  expect(result.beforeDispose).toBe(1);
  expect(result.afterDispose).toBe(0);
  expect(result.sourceUnchanged).toBe(true);
  const { png, ...metrics } = result;
  await info.attach("bounded-production-batch-metrics", {
    body: Buffer.from(JSON.stringify(metrics)),
    contentType: "application/json",
  });
  await info.attach("bounded-97px-production-protein-batch", {
    body: Buffer.from(result.png.split(",")[1], "base64"),
    contentType: "image/png",
  });
});
