import * as THREE from "three";
import type { EigenVistaDocument } from "./types";
import type { AtomPalette } from "./atomColors";
import {
  atomDisplayColor,
  atomRepresentation,
  isAtomVisible,
  residueLabel,
  UNKNOWN_STRUCTURE_COLOR,
  type MolecularRepresentation,
  type StructureDisplayState,
} from "./molecularDisplay";
import type { BackbonePoint, ProteinBackbone } from "./useProteinBackbone";

export type ProteinRepresentation = "trace" | "tube" | "ribbon" | "cartoon";
export const isProteinRepresentation = (
  value: MolecularRepresentation,
): value is ProteinRepresentation =>
  value === "trace" ||
  value === "tube" ||
  value === "ribbon" ||
  value === "cartoon";

const BOHR = 0.529177210903;
const MAX_VERTICES = 2_000_000;
const SIDES = 8;
interface Run {
  points: BackbonePoint[];
  style: ProteinRepresentation;
}

function visibleRuns(
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  source: ProteinBackbone,
): Run[] {
  const result: Run[] = [];
  for (const segment of source.segments) {
    let current: Run | null = null;
    for (const point of segment.points) {
      const style = atomRepresentation(doc, state, point.atom);
      if (
        !isAtomVisible(doc, state, point.atom) ||
        !isProteinRepresentation(style)
      ) {
        current = null;
        continue;
      }
      if (!current || current.style !== style) {
        current = { points: [], style };
        result.push(current);
      }
      current.points.push(point);
    }
  }
  return result;
}

class MeshBuffers {
  readonly positions: Float32Array;
  readonly normals: Float32Array;
  readonly colors: Float32Array;
  readonly atoms: Uint32Array;
  readonly residues: Uint32Array;
  readonly unknown: Uint8Array;
  readonly indices: Uint32Array;
  vertices = 0;
  triangles = 0;
  constructor(vertices: number, indices: number) {
    this.positions = new Float32Array(vertices * 3);
    this.normals = new Float32Array(vertices * 3);
    this.colors = new Float32Array(vertices * 3);
    this.atoms = new Uint32Array(vertices);
    this.residues = new Uint32Array(vertices);
    this.unknown = new Uint8Array(vertices);
    this.indices = new Uint32Array(indices);
  }
  vertex(
    position: THREE.Vector3,
    normal: THREE.Vector3,
    color: THREE.Color,
    point: BackbonePoint,
    unknown: boolean,
  ) {
    const index = this.vertices++;
    if (
      index >= this.atoms.length ||
      !position.toArray().every((v) => Number.isFinite(Math.fround(v))) ||
      !normal.toArray().every(Number.isFinite)
    )
      throw new Error(
        "Protein geometry exceeds the display precision or allocation budget",
      );
    position.toArray(this.positions, index * 3);
    normal.toArray(this.normals, index * 3);
    color.toArray(this.colors, index * 3);
    this.atoms[index] = point.atom;
    this.residues[index] = point.residue;
    this.unknown[index] = unknown ? 1 : 0;
    return index;
  }
  triangle(a: number, b: number, c: number) {
    const offset = this.triangles * 3;
    if (offset + 3 > this.indices.length)
      throw new Error("Protein triangle allocation budget exceeded");
    const p = this.positions;
    const ux = p[b * 3] - p[a * 3],
      uy = p[b * 3 + 1] - p[a * 3 + 1],
      uz = p[b * 3 + 2] - p[a * 3 + 2];
    const vx = p[c * 3] - p[a * 3],
      vy = p[c * 3 + 1] - p[a * 3 + 1],
      vz = p[c * 3 + 2] - p[a * 3 + 2];
    if (
      Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx) <=
      1e-12
    )
      return;
    this.indices.set([a, b, c], offset);
    this.triangles++;
  }
  geometry() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(
        this.positions.subarray(0, this.vertices * 3),
        3,
      ),
    );
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(this.normals.subarray(0, this.vertices * 3), 3),
    );
    geometry.setAttribute(
      "color",
      new THREE.BufferAttribute(this.colors.subarray(0, this.vertices * 3), 3),
    );
    geometry.setIndex(
      new THREE.BufferAttribute(
        this.indices.subarray(0, this.triangles * 3),
        1,
      ),
    );
    geometry.userData.proteinAtoms = this.atoms.subarray(0, this.vertices);
    geometry.userData.proteinResidues = this.residues.subarray(
      0,
      this.vertices,
    );
    geometry.userData.proteinUnknown = this.unknown.subarray(0, this.vertices);
    const fallback = this.normals.slice(0, this.vertices * 3);
    geometry.computeVertexNormals();
    const normals = geometry.getAttribute("normal");
    for (let i = 0; i < normals.count; i++)
      if (Math.hypot(normals.getX(i), normals.getY(i), normals.getZ(i)) < 1e-10)
        normals.setXYZ(
          i,
          fallback[i * 3],
          fallback[i * 3 + 1],
          fallback[i * 3 + 2],
        );
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }
}

const MARKER_POINTS = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
] as const;
const MARKER_FACES = [
  [0, 2, 4],
  [2, 1, 4],
  [1, 3, 4],
  [3, 0, 4],
  [2, 0, 5],
  [1, 2, 5],
  [3, 1, 5],
  [0, 3, 5],
] as const;
function marker(
  buffer: MeshBuffers,
  point: BackbonePoint,
  color: THREE.Color,
  unknown = false,
) {
  const center = new THREE.Vector3(...point.position);
  const start = buffer.vertices;
  for (const xyz of MARKER_POINTS) {
    const normal = new THREE.Vector3(...xyz);
    buffer.vertex(
      center.clone().addScaledVector(normal, 0.18 / BOHR),
      normal,
      color,
      point,
      unknown,
    );
  }
  for (const face of MARKER_FACES)
    buffer.triangle(start + face[0], start + face[1], start + face[2]);
}

function perpendicular(
  tangent: THREE.Vector3,
  suggested?: THREE.Vector3 | null,
) {
  const width =
    suggested?.clone() ??
    new THREE.Vector3(
      Math.abs(tangent.x) < 0.8 ? 1 : 0,
      Math.abs(tangent.x) < 0.8 ? 0 : 1,
      0,
    );
  width.addScaledVector(tangent, -width.dot(tangent));
  if (width.lengthSq() < 1e-16) {
    width.set(0, 0, 1).addScaledVector(tangent, -tangent.z);
    if (width.lengthSq() < 1e-16)
      width.set(0, 1, 0).addScaledVector(tangent, -tangent.y);
  }
  return width.normalize();
}

function orientation(
  points: BackbonePoint[],
  parameter: number,
): THREE.Vector3 | null {
  const left = Math.min(points.length - 1, Math.floor(parameter)),
    right = Math.min(points.length - 1, left + 1);
  const a = points[left].orientation,
    b = points[right].orientation;
  if (!a || !b) return null;
  const first = new THREE.Vector3(...a),
    second = new THREE.Vector3(...b);
  if (first.dot(second) < 0) second.negate();
  return first.lerp(second, parameter - left).normalize();
}

function sheetEnds(points: BackbonePoint[]) {
  const ends = new Int32Array(points.length).fill(-1);
  for (let i = 0; i < points.length; ) {
    if (points[i].secondary !== "sheet" || !points[i].orientation) {
      i++;
      continue;
    }
    let end = i;
    while (
      end + 1 < points.length &&
      points[end + 1].secondary === "sheet" &&
      points[end + 1].orientation
    )
      end++;
    if (end > i) for (let k = i; k <= end; k++) ends[k] = end;
    i = end + 1;
  }
  return ends;
}

function profile(run: Run, parameter: number, ends: Int32Array) {
  let index = Math.min(run.points.length - 1, Math.floor(parameter + 1e-10));
  if (
    parameter > index + 1e-8 &&
    ends[index] === index &&
    index + 1 < run.points.length
  )
    index++;
  const point = run.points[index];
  let width = 0.32 / BOHR,
    height = width;
  const needsOrientation = run.style === "ribbon" || run.style === "cartoon";
  const unknown = needsOrientation && point.secondary === "unknown";
  if (needsOrientation) {
    if (unknown) width = height = 0.1 / BOHR;
    else if (
      !point.orientation ||
      !run.points[Math.min(run.points.length - 1, index + 1)].orientation
    )
      width = height = 0.16 / BOHR;
    else if (run.style === "ribbon") {
      width = 0.8 / BOHR;
      height = 0.14 / BOHR;
    } else if (point.secondary === "coil") width = height = 0.16 / BOHR;
    else {
      width = (point.secondary === "sheet" ? 1.1 : 1.0) / BOHR;
      height = 0.18 / BOHR;
    }
  }
  if (
    run.style === "cartoon" &&
    point.secondary === "sheet" &&
    point.orientation &&
    ends[index] >= 0
  ) {
    const end = ends[index];
    if (parameter >= end - 1 - 1e-8 && parameter <= end + 1e-8) {
      const remaining = Math.max(0, end - parameter);
      width *= 1.65 * remaining;
      height *= Math.min(1, remaining * 3);
    }
  }
  return { point, width, height, unknown };
}

function sweep(
  buffer: MeshBuffers,
  run: Run,
  steps: number,
  color: (point: BackbonePoint, unknown: boolean) => THREE.Color,
) {
  const curve = new THREE.CatmullRomCurve3(
    run.points.map((p) => new THREE.Vector3(...p.position)),
    false,
    "centripetal",
  );
  const count = (run.points.length - 1) * steps,
    ends = sheetEnds(run.points);
  let priorRing: number[] | null = null,
    priorTangent: THREE.Vector3 | null = null,
    widthAxis: THREE.Vector3 | null = null;
  for (let sample = 0; sample <= count; sample++) {
    const t = sample / count,
      parameter = t * (run.points.length - 1),
      center = curve.getPoint(t),
      tangent = curve.getTangent(t).normalize();
    if (!tangent.lengthSq() || !tangent.toArray().every(Number.isFinite)) {
      const index = Math.min(run.points.length - 2, Math.floor(parameter));
      tangent
        .subVectors(
          new THREE.Vector3(...run.points[index + 1].position),
          new THREE.Vector3(...run.points[index].position),
        )
        .normalize();
    }
    if (widthAxis && priorTangent)
      widthAxis.applyQuaternion(
        new THREE.Quaternion().setFromUnitVectors(priorTangent, tangent),
      );
    const desired = orientation(run.points, parameter);
    if (desired) {
      const projected = perpendicular(tangent, desired);
      if (widthAxis && projected.dot(widthAxis) < 0) projected.negate();
      widthAxis = projected;
    } else widthAxis = perpendicular(tangent, widthAxis);
    const normalAxis = new THREE.Vector3()
      .crossVectors(tangent, widthAxis)
      .normalize();
    const p = profile(run, parameter, ends),
      tint = color(p.point, p.unknown),
      ring: number[] = [];
    if (p.width < 1e-9 || p.height < 1e-9)
      ring.push(buffer.vertex(center, tangent, tint, p.point, p.unknown));
    else
      for (let side = 0; side < SIDES; side++) {
        const angle = (2 * Math.PI * side) / SIDES,
          c = Math.cos(angle),
          s = Math.sin(angle);
        const position = center
          .clone()
          .addScaledVector(widthAxis, p.width * c)
          .addScaledVector(normalAxis, p.height * s);
        const normal = widthAxis
          .clone()
          .multiplyScalar(c / p.width)
          .addScaledVector(normalAxis, s / p.height)
          .normalize();
        ring.push(buffer.vertex(position, normal, tint, p.point, p.unknown));
      }
    if (priorRing) {
      for (let side = 0; side < SIDES; side++) {
        const next = (side + 1) % SIDES;
        if (priorRing.length === 1 && ring.length === SIDES)
          buffer.triangle(priorRing[0], ring[next], ring[side]);
        else if (ring.length === 1 && priorRing.length === SIDES)
          buffer.triangle(priorRing[side], priorRing[next], ring[0]);
        else if (ring.length === SIDES && priorRing.length === SIDES) {
          buffer.triangle(priorRing[side], priorRing[next], ring[side]);
          buffer.triangle(priorRing[next], ring[next], ring[side]);
        }
      }
    } else if (ring.length === SIDES) {
      const normal = tangent.clone().negate();
      const cap = buffer.vertex(center, normal, tint, p.point, p.unknown);
      const capRing = ring.map((vertex) =>
        buffer.vertex(
          new THREE.Vector3().fromArray(buffer.positions, vertex * 3),
          normal,
          tint,
          p.point,
          p.unknown,
        ),
      );
      for (let side = 0; side < SIDES; side++)
        buffer.triangle(cap, capRing[(side + 1) % SIDES], capRing[side]);
    }
    if (sample === count && ring.length === SIDES) {
      const cap = buffer.vertex(center, tangent, tint, p.point, p.unknown);
      const capRing = ring.map((vertex) =>
        buffer.vertex(
          new THREE.Vector3().fromArray(buffer.positions, vertex * 3),
          tangent,
          tint,
          p.point,
          p.unknown,
        ),
      );
      for (let side = 0; side < SIDES; side++)
        buffer.triangle(cap, capRing[side], capRing[(side + 1) % SIDES]);
    }
    priorRing = ring;
    priorTangent = tangent;
  }
}

/** Batches all sweeps/markers into one matte mesh and all straight traces into one line draw. */
export function createProteinGeometry(
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  backbone: ProteinBackbone,
  palette?: AtomPalette,
) {
  const runs = visibleRuns(doc, state, backbone),
    group = new THREE.Group();
  group.name = "protein-depictions";
  const curved = runs.filter((r) => r.style !== "trace" && r.points.length > 1);
  const spans = curved.reduce((n, r) => n + r.points.length - 1, 0);
  const markerCount = runs.reduce(
    (n, r) =>
      n +
      (r.style === "trace" ? r.points.length : r.points.length === 1 ? 1 : 0),
    0,
  );
  const lineVertices = runs.reduce(
    (n, r) =>
      n + (r.style === "trace" ? Math.max(0, r.points.length - 1) * 2 : 0),
    0,
  );
  const baseVertices = markerCount * 6 + curved.length * 26 + lineVertices;
  const steps = spans
    ? Math.min(8, Math.floor((MAX_VERTICES - baseVertices) / (spans * SIDES)))
    : 8;
  if (baseVertices > MAX_VERTICES || steps < 1)
    throw new Error(
      "Protein depiction exceeds the display geometry budget; use fewer visible chains",
    );
  const capacity = markerCount * 6 + curved.length * 26 + spans * steps * SIDES;
  const buffer = new MeshBuffers(
    capacity,
    markerCount * 24 + spans * steps * SIDES * 6 + curved.length * SIDES * 6,
  );
  const linePositions = new Float32Array(lineVertices * 3),
    lineColors = new Float32Array(lineVertices * 3);
  const lineAtoms = new Uint32Array(lineVertices),
    lineResidues = new Uint32Array(lineVertices);
  let lineIndex = 0,
    missingOrientation = 0,
    unknownSecondary = 0;
  const tint = (point: BackbonePoint, unknown = false) =>
    new THREE.Color(
      unknown
        ? UNKNOWN_STRUCTURE_COLOR
        : atomDisplayColor(doc, state, point.atom, palette),
    );
  for (const run of runs) {
    if (run.style === "ribbon" || run.style === "cartoon")
      for (const point of run.points) {
        if (point.secondary === "unknown") unknownSecondary++;
        else if (!point.orientation) missingOrientation++;
      }
    if (run.style === "trace") {
      for (const point of run.points) marker(buffer, point, tint(point));
      for (let index = 0; index + 1 < run.points.length; index++)
        for (const point of [run.points[index], run.points[index + 1]]) {
          new THREE.Vector3(...point.position).toArray(
            linePositions,
            lineIndex * 3,
          );
          tint(point).toArray(lineColors, lineIndex * 3);
          lineAtoms[lineIndex] = point.atom;
          lineResidues[lineIndex] = point.residue;
          lineIndex++;
        }
    } else if (run.points.length === 1) {
      const unknown =
        (run.style === "ribbon" || run.style === "cartoon") &&
        run.points[0].secondary === "unknown";
      marker(buffer, run.points[0], tint(run.points[0], unknown), unknown);
    } else sweep(buffer, run, steps, tint);
  }
  if (buffer.triangles) {
    const mesh = new THREE.Mesh(
      buffer.geometry(),
      new THREE.MeshLambertMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
      }),
    );
    mesh.name = "protein-sweeps-and-markers";
    mesh.userData.protein = true;
    group.add(mesh);
  }
  if (lineVertices) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3),
    );
    geometry.setAttribute("color", new THREE.BufferAttribute(lineColors, 3));
    geometry.userData.proteinAtoms = lineAtoms;
    geometry.userData.proteinResidues = lineResidues;
    geometry.computeBoundingSphere();
    geometry.computeBoundingBox();
    const line = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ vertexColors: true }),
    );
    line.name = "protein-ca-trace";
    line.userData.protein = true;
    group.add(line);
  }
  group.userData.proteinStats = {
    runs: runs.length,
    vertices: buffer.vertices + lineVertices,
    triangles: buffer.triangles,
    steps,
  };
  const warnings: string[] = [];
  if (missingOrientation)
    warnings.push(
      `${missingOrientation} residues lack carbonyl orientation; those ribbon/cartoon portions use thin backbone tubes.`,
    );
  if (unknownSecondary)
    warnings.push(
      `${unknownSecondary} residues have no deposited secondary assignment and use thin gray unassigned loops.`,
    );
  if (steps < 8)
    warnings.push(
      "Curve subdivisions were reduced within the display vertex budget; all source alpha carbons are retained.",
    );
  return { group, warnings };
}

export function retintProteinGeometry(
  group: THREE.Object3D,
  doc: EigenVistaDocument,
  state: StructureDisplayState,
  palette?: AtomPalette,
) {
  const tint = new THREE.Color();
  group.traverse((object) => {
    if (
      !object.userData.protein ||
      !(object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
    )
      return;
    const geometry = object.geometry,
      atoms = geometry.userData.proteinAtoms as Uint32Array,
      unknown = geometry.userData.proteinUnknown as Uint8Array | undefined;
    const colors = geometry.getAttribute("color");
    for (let i = 0; i < atoms.length; i++) {
      tint.set(
        unknown?.[i]
          ? UNKNOWN_STRUCTURE_COLOR
          : atomDisplayColor(doc, state, atoms[i], palette),
      );
      colors.setXYZ(i, tint.r, tint.g, tint.b);
    }
    colors.needsUpdate = true;
  });
}

export function proteinHitLabel(
  hit: THREE.Intersection,
  doc: EigenVistaDocument,
): string | undefined {
  if (
    !hit.object.userData.protein ||
    !doc.structure ||
    !(
      hit.object instanceof THREE.Mesh ||
      hit.object instanceof THREE.LineSegments
    )
  )
    return;
  const geometry = hit.object.geometry;
  const vertex =
    hit.faceIndex != null && geometry.index
      ? geometry.index.getX(hit.faceIndex * 3)
      : hit.index;
  if (vertex == null) return;
  const atom = (geometry.userData.proteinAtoms as Uint32Array)[vertex],
    residue = (geometry.userData.proteinResidues as Uint32Array)[vertex];
  if (atom == null || residue == null) return;
  const secondary = doc.structure.residues[residue].secondary;
  return `${residueLabel(doc.structure, residue)} | CA atom ${atom + 1} | ${secondary === "unknown" ? "secondary unassigned" : secondary}`;
}
