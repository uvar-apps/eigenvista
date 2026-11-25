import * as THREE from "three";
import type { Surface } from "./types";

// Negative red, zero green, positive blue, with intermediate yellow and cyan.
const palette = ["#ff341f", "#ffe325", "#37c755", "#25d6e6", "#2647ff"];
const stops = palette.map((color) => new THREE.Color(color));
export const potentialSwatch = `linear-gradient(to right, ${palette.join(", ")})`;
const segments = stops.length - 1;

function ramp(t: number, target: THREE.Color) {
  const x = Math.max(0, Math.min(1, t)) * segments;
  const i = Math.min(Math.floor(x), segments - 1);
  return target.copy(stops[i]).lerp(stops[i + 1], x - i);
}

/** Use the same linear-sRGB stops for the scene and its color bar. */
export const POTENTIAL_RAMP_GLSL = `
  uniform vec3 potentialStops[${stops.length}];
  vec3 potentialColor(float value) {
    float x = (0.5 + 0.5 * clamp(value, -1.0, 1.0)) * ${segments}.0;
    int i = min(int(x), ${segments - 1});
    return mix(potentialStops[i], potentialStops[i + 1], x - float(i));
  }
`;
export const potentialColors = { value: stops };

export function attachPotential(
  geometry: THREE.BufferGeometry,
  potential: NonNullable<Surface["electrostatic_potential"]>,
  customShader: boolean,
) {
  if (customShader) {
    const colors = new Float32Array(potential.values.length * 3);
    const color = new THREE.Color();
    potential.values.forEach((value, i) => {
      ramp(0.5 + 0.5 * (value / potential.range), color).toArray(colors, i * 3);
    });
    geometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    return;
  }
  const values = new Float32Array(potential.values.length);
  // Interpolate the scalar before applying the ramp. Keep even very narrow
  // user ranges finite in WebGL's single-precision vertex attributes.
  const maxFloat = 3.4028234663852886e38;
  potential.values.forEach((value, i) => {
    values[i] = Math.max(
      -maxFloat,
      Math.min(maxFloat, value / potential.range),
    );
  });
  geometry.setAttribute("potential", new THREE.BufferAttribute(values, 1));
}

export type PotentialKey = { range: number; label: string };

export function drawPotentialKey(
  context: CanvasRenderingContext2D,
  key: PotentialKey,
  x: number,
  y: number,
  width: number,
) {
  const label = `Electrostatic potential · hartree/e`;
  const color = new THREE.Color();
  const gradient = context.createLinearGradient(x, y, x + width, y);
  for (let i = 0; i <= 32; i++)
    gradient.addColorStop(i / 32, ramp(i / 32, color).getStyle());

  context.beginPath();
  context.roundRect(x - 6, y - 6, width + 12, 74, 5);
  context.fillStyle = "rgba(247,250,251,0.92)";
  context.fill();
  context.fillStyle = "#172f35";
  const text = (value: string, left: number, top: number, maxWidth?: number) =>
    context.fillText(value, left, top, maxWidth);
  text(label, x, y, width);
  text(key.label, x, y + 15, width);
  context.fillStyle = gradient;
  context.fillRect(x, y + 34, width, 12);
  context.fillStyle = "#172f35";
  text((-key.range).toPrecision(3), x, y + 50);
  context.textAlign = "center";
  text("0", x + width / 2, y + 50);
  context.textAlign = "right";
  text(key.range.toPrecision(3), x + width, y + 50);
  context.textAlign = "left";
}
