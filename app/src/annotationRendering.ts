import * as THREE from "three";
import type { EigenVistaDocument } from "./types";
import type {
  MeasurementDefinition,
  MeasurementResult,
} from "./inspectionTypes";
import { elementDisplay } from "./elements";

type Monitor = MeasurementDefinition & { result: MeasurementResult };

/** Sparse labels use real scene sprites, so depth testing and PNG agree. */
/** Dispose owned textures/materials without disposing Three's shared Sprite geometry. */
const disposeAnnotations = (group: THREE.Group): void => {
  group.traverse((node) => {
    const object = node as THREE.Mesh;
    if (!(node instanceof THREE.Sprite)) object.geometry?.dispose();
    const materials = object.material
      ? Array.isArray(object.material)
        ? object.material
        : [object.material]
      : [];
    for (const material of materials) {
      if ("map" in material) (material.map as THREE.Texture | null)?.dispose();
      material.dispose();
    }
  });
};

/** Use the actual layout before committing durable annotation edits.
 * These CPU textures are disposed before publication and never uploaded to WebGL.
 */
export const validateAnnotationRendering = (
  doc: EigenVistaDocument,
  monitors: Monitor[],
): void => {
  disposeAnnotations(buildAnnotations(doc, monitors, []));
};

export function buildAnnotations(
  doc: EigenVistaDocument,
  monitors: Monitor[],
  selected: number[],
): THREE.Group {
  const group = new THREE.Group();
  const sprite = (
    text: string,
    color: string,
    always: boolean,
    point: number[],
    radius = 0.7,
  ) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Text rendering is unavailable");
    context.font = "600 15px system-ui, sans-serif";
    const lines: string[] = [];
    let line = "";
    for (const character of text) {
      if (
        character === "\n" ||
        context.measureText(line + character).width > 460
      ) {
        lines.push(line);
        line = character === "\n" ? "" : character;
      } else line += character;
    }
    if (line || !lines.length) lines.push(line);
    canvas.width = Math.min(
      512,
      Math.max(
        32,
        Math.ceil(Math.max(...lines.map((l) => context.measureText(l).width))) +
          16,
      ),
    );
    canvas.height = lines.length * 21 + 10;
    context.font = "600 15px system-ui, sans-serif";
    context.textBaseline = "top";
    context.lineJoin = "round";
    context.lineWidth = 3;
    context.strokeStyle = "rgba(255,255,255,0.95)";
    context.fillStyle = color;
    lines.forEach((value, index) => {
      context.strokeText(value, 8, index * 21 + 5);
      context.fillText(value, 8, index * 21 + 5);
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: !always,
      depthWrite: false,
      toneMapped: false,
    });
    const label = new THREE.Sprite(material);
    label.userData.annotation = {
      anchor: new THREE.Vector3(...point),
      radius,
      width: canvas.width,
      height: canvas.height,
    };
    label.userData.texture = texture;
    label.renderOrder = always ? 1000 : 10;
    label.position.fromArray(point);
    group.add(label);
  };
  try {
    for (const item of doc.annotations?.labels ?? []) {
      if (!item.visible) continue;
      const atom =
        item.atom ??
        doc.structure?.atom_residues.findIndex((r) => r === item.residue) ??
        -1;
      const point = doc.atoms.positions[atom];
      if (point)
        sprite(
          item.text,
          item.color,
          item.always_visible,
          point,
          elementDisplay(doc.atoms.elements[atom]).radius / 0.529177210903,
        );
    }
    for (const monitor of monitors) {
      if (!monitor.visible) continue;
      const points = monitor.atoms.map(
        (i) => new THREE.Vector3(...doc.atoms.positions[i]),
      );
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      group.add(
        new THREE.Line(
          geometry,
          new THREE.LineBasicMaterial({
            color: monitor.color,
            depthTest: !monitor.always_visible,
            depthWrite: false,
          }),
        ),
      );
      const anchor = points
        .reduce((sum, p) => sum.add(p), new THREE.Vector3())
        .multiplyScalar(1 / points.length);
      const result = monitor.result;
      sprite(
        `${monitor.label}: ${result.value === null ? "undefined" : result.value.toFixed(monitor.kind === "distance" ? 3 : 2)} ${result.unit}`,
        monitor.color,
        monitor.always_visible,
        anchor.toArray(),
      );
    }
    // Selection halos are depiction, never a replacement source atom array.
    if (selected.length) {
      const geometry = new THREE.BufferGeometry().setFromPoints(
        selected.map((atom) => new THREE.Vector3(...doc.atoms.positions[atom])),
      );
      group.add(
        new THREE.Points(
          geometry,
          new THREE.PointsMaterial({
            color: "#d39700",
            size: 7,
            sizeAttenuation: false,
            depthWrite: false,
          }),
        ),
      );
    }
    return group;
  } catch (cause) {
    disposeAnnotations(group);
    throw cause;
  }
}

/** Maintain readable pixel size while preserving real scene depth/occlusion. */
export function updateAnnotationScale(
  group: THREE.Group,
  camera: THREE.PerspectiveCamera,
  height: number,
): void {
  const direction = new THREE.Vector3();
  group.traverse((object) => {
    const annotation = object.userData.annotation;
    if (!annotation || !(object instanceof THREE.Sprite)) return;
    const distance = camera.position.distanceTo(annotation.anchor);
    direction.subVectors(camera.position, annotation.anchor).normalize();
    object.position
      .copy(annotation.anchor)
      .addScaledVector(direction, annotation.radius + 0.15);
    const scale =
      (2 *
        Math.max(distance, 0.01) *
        Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) /
      Math.max(height, 1);
    object.scale.set(annotation.width * scale, annotation.height * scale, 1);
  });
}
