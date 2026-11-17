import * as THREE from "three";
import type { EigenVistaDocument } from "./types";
import type {
  FieldAnalysisItem,
  FieldDescriptor,
  Vec3,
} from "./inspectionTypes";

const BOHR = 0.529177210903;
const PALETTES: Record<string, string[]> = {
  diverging: ["#2166ac", "#67a9cf", "#f7f7f7", "#ef8a62", "#b2182b"],
  viridis: ["#440154", "#3b528b", "#21918c", "#5ec962", "#fde725"],
  grayscale: ["#111827", "#4b5563", "#9ca3af", "#d1d5db", "#f9fafb"],
};

/** Display conversion only: all persisted values and numeric ranges remain raw. */
export const fieldDisplayFactor = (descriptor: FieldDescriptor): number => {
  const unit = descriptor.display_unit ?? descriptor.value_unit;
  if (unit === descriptor.value_unit) return 1;
  if (
    descriptor.value_unit === "electron/bohr^3" &&
    unit === "electron/angstrom^3"
  )
    return BOHR ** -3;
  if (
    descriptor.value_unit === "electron/angstrom^3" &&
    unit === "electron/bohr^3"
  )
    return BOHR ** 3;
  if (descriptor.value_unit === "bohr^-3/2" && unit === "angstrom^-3/2")
    return BOHR ** -1.5;
  if (descriptor.value_unit === "angstrom^-3/2" && unit === "bohr^-3/2")
    return BOHR ** 1.5;
  throw new Error("Unsupported field display-unit conversion");
};

export const fieldDisplayUnit = (descriptor: FieldDescriptor): string =>
  descriptor.display_unit ?? descriptor.value_unit;

/** Raw source-value range; null means no samples fall inside the field domain. */
export const fieldAnalysisRange = (
  item: FieldAnalysisItem,
): [number, number] | null => item.appearance.range ?? item.range;

/** Color interpolation happens in linear RGB, matching the shader and exported keys. */
export const fieldColor = (
  position: number,
  colormap = "diverging",
): THREE.Color => {
  const palette = PALETTES[colormap];
  if (!palette) throw new Error(`Unknown field colormap: ${colormap}`);
  const scaled = Math.max(0, Math.min(1, position)) * (palette.length - 1);
  const low = Math.min(Math.floor(scaled), palette.length - 2);
  return new THREE.Color(palette[low]).lerp(
    new THREE.Color(palette[low + 1]),
    scaled - low,
  );
};

export interface FieldAnalysisLegend {
  id: string;
  label: string;
  quantity: string;
  unit: string;
  min: number | null;
  max: number | null;
  colormap: string;
  kind: "probe" | "plane" | "profile";
  status: "ready" | "outside" | "conversion_overflow";
}

export const fieldAnalysisLegends = (
  doc: EigenVistaDocument,
): FieldAnalysisLegend[] =>
  (doc.field_analysis?.items ?? [])
    .filter((item) => item.appearance.visible && item.appearance.show_key)
    .map((item) => {
      const range = fieldAnalysisRange(item);
      const factor = fieldDisplayFactor(item.descriptor);
      const minimum = range ? range[0] * factor : null,
        maximum = range ? range[1] * factor : null;
      return {
        id: item.id,
        label: item.label,
        quantity: item.descriptor.quantity,
        unit: fieldDisplayUnit(item.descriptor),
        min: minimum !== null && Number.isFinite(minimum) ? minimum : null,
        max: maximum !== null && Number.isFinite(maximum) ? maximum : null,
        colormap: item.appearance.colormap,
        kind: item.definition.kind,
        status: !item.range
          ? "outside"
          : minimum !== null &&
              maximum !== null &&
              Number.isFinite(minimum) &&
              Number.isFinite(maximum)
            ? "ready"
            : "conversion_overflow",
      };
    });

/** Affine position in f64. Clamp only after spatial interpolation, never per sample. */
export const fieldValuePosition = (
  value: number,
  range: [number, number],
): number => {
  if (range[0] === range[1]) return 0.5;
  const difference = value - range[0],
    span = range[1] - range[0];
  // Preserve small differences on large offsets. Scaling is needed only when
  // subtraction overflows, not for the usual finite f64 arithmetic.
  if (Number.isFinite(difference) && Number.isFinite(span))
    return difference / span;
  const magnitude = Math.max(
    Math.abs(value),
    Math.abs(range[0]),
    Math.abs(range[1]),
    Number.MIN_VALUE,
  );
  return (
    (value / magnitude - range[0] / magnitude) /
    (range[1] / magnitude - range[0] / magnitude)
  );
};

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

/** Numerical f64 results remain valid when their coordinates cannot be depicted. */
export const fieldRenderingIssue = (item: FieldAnalysisItem): string | null => {
  const definition = item.definition;
  const points =
    definition.kind === "probe"
      ? [definition.point]
      : definition.kind === "profile"
        ? [definition.start, definition.end]
        : [
            definition.origin,
            add(definition.origin, definition.u),
            add(definition.origin, definition.v),
            add(add(definition.origin, definition.u), definition.v),
          ];
  if (
    points.some((point) =>
      point.some((value) => !Number.isFinite(Math.fround(value))),
    )
  )
    return "These coordinates exceed rendering precision. Numerical samples and exports remain available.";
  if (
    definition.kind === "plane" &&
    [points[1], points[2]].some((point) =>
      point.every(
        (value, i) => Math.fround(value) === Math.fround(points[0][i]),
      ),
    )
  )
    return "This plane is smaller than the world-coordinate rendering precision. Numerical samples and exports remain available.";
  const range = fieldAnalysisRange(item);
  if (
    definition.kind === "plane" &&
    range &&
    item.values.some(
      (value, index) =>
        item.valid[index] &&
        !Number.isFinite(Math.fround(2 * fieldValuePosition(value, range))),
    )
  )
    return "This color scale exceeds rendering precision. Use an automatic or wider range. Numerical samples and exports remain available.";
  return null;
};

const planeMesh = (item: FieldAnalysisItem): THREE.Mesh => {
  if (item.definition.kind !== "plane")
    throw new Error("Plane mesh requires a plane definition");
  const { origin, u, v, dims } = item.definition;
  const corners = [
    origin,
    add(origin, u),
    add(add(origin, u), v),
    add(origin, v),
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(corners.flat(), 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  const samples = new Float32Array(item.values.length * 4);
  const range = fieldAnalysisRange(item);
  for (let index = 0; index < item.values.length; index++) {
    samples[index * 4] =
      range && item.valid[index]
        ? fieldValuePosition(item.values[index], range)
        : 0.5;
    samples[index * 4 + 1] = item.valid[index];
  }
  const texture = new THREE.DataTexture(
    samples,
    dims[0],
    dims[1],
    THREE.RGBAFormat,
    THREE.FloatType,
  );
  texture.minFilter = texture.magFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;
  const palette = Array.from({ length: 5 }, (_, i) =>
    fieldColor(i / 4, item.appearance.colormap),
  );
  const material = new THREE.ShaderMaterial({
    glslVersion: THREE.GLSL3,
    side: THREE.DoubleSide,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
    uniforms: {
      samples: { value: texture },
      dimensions: { value: new THREE.Vector2(...dims) },
      palette: { value: palette },
    },
    vertexShader: `out vec2 planeUv;
      void main(){ planeUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `precision highp float;
      uniform sampler2D samples; uniform vec2 dimensions; uniform vec3 palette[5];
      in vec2 planeUv; out vec4 outputColor;
      #define gl_FragColor outputColor
      void main(){
        vec2 coordinate=clamp(planeUv,0.0,1.0)*(dimensions-1.0);
        ivec2 a=ivec2(floor(coordinate)); ivec2 b=min(a+ivec2(1),ivec2(dimensions)-1);
        vec2 f=coordinate-vec2(a);
        vec2 s00=texelFetch(samples,a,0).rg; vec2 s10=texelFetch(samples,ivec2(b.x,a.y),0).rg;
        vec2 s01=texelFetch(samples,ivec2(a.x,b.y),0).rg; vec2 s11=texelFetch(samples,b,0).rg;
        // Missing coverage is a hole, never interpolated into an apparent zero.
        if(min(min(s00.g,s10.g),min(s01.g,s11.g))<0.5) discard;
        float value=clamp(mix(mix(s00.r,s10.r,f.x),mix(s01.r,s11.r,f.x),f.y),0.0,1.0)*4.0;
        int low=min(int(floor(value)),3); vec3 color=mix(palette[low],palette[low+1],value-float(low));
        outputColor=vec4(color,1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.texture = texture;
  mesh.userData.label = `${item.label} | ${item.method} | ${fieldDisplayUnit(item.descriptor)}`;
  mesh.userData.analysisId = item.id;
  return mesh;
};

/** Owned geometry only. The caller disposes it through the viewport's normal path. */
export const buildFieldAnalysisGroup = (
  doc: EigenVistaDocument,
  contours: Map<string, Float64Array>,
): THREE.Group => {
  const group = new THREE.Group();
  group.name = "quantitative-field-analysis";
  for (const item of doc.field_analysis?.items ?? []) {
    if (!item.appearance.visible || fieldRenderingIssue(item)) continue;
    const definition = item.definition;
    if (definition.kind === "plane") {
      group.add(planeMesh(item));
      const packed = contours.get(item.id);
      if (packed?.length) {
        const positions = new Float32Array((packed.length / 7) * 6);
        for (let offset = 0, vertex = 0; offset < packed.length; offset += 7)
          for (let component = 1; component < 7; component++)
            positions[vertex++] = packed[offset + component];
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(positions, 3),
        );
        const lines = new THREE.LineSegments(
          geometry,
          new THREE.LineBasicMaterial({
            color: "#152d3a",
            depthTest: true,
            toneMapped: false,
          }),
        );
        lines.userData.label = `${item.label} | numeric contours`;
        group.add(lines);
      }
    } else if (definition.kind === "probe") {
      const marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 8),
        new THREE.MeshBasicMaterial({ color: "#cf6c16", toneMapped: false }),
      );
      marker.position.set(...definition.point);
      marker.userData.label = `${item.label} | ${item.valid[0] ? item.values[0].toPrecision(7) : "outside field domain"}`;
      marker.userData.analysisId = item.id;
      group.add(marker);
    } else {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(
          [...definition.start, ...definition.end],
          3,
        ),
      );
      const line = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: "#7b397b",
          depthTest: true,
          toneMapped: false,
        }),
      );
      line.userData.label = `${item.label} | field profile`;
      line.userData.analysisId = item.id;
      group.add(line);
    }
  }
  return group;
};
