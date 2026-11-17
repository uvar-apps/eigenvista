import * as THREE from "three";

// An octahedron rotated so three equal lights face the viewer, 120° apart.
// Opposite pairs remove a privileged side; camera space keeps the same setup
// during orbit, pan and roll. Neutral ambient preserves palette colors.
const frontDirections = [
  [Math.sqrt(2 / 3), 0, 1 / Math.sqrt(3)],
  [-1 / Math.sqrt(6), 1 / Math.sqrt(2), 1 / Math.sqrt(3)],
  [-1 / Math.sqrt(6), -1 / Math.sqrt(2), 1 / Math.sqrt(3)],
];
const directions = [
  ...frontDirections,
  ...frontDirections.map((direction) => direction.map((value) => -value)),
];
const ambient = 0.1;
const diffuse = 0.9 / Math.sqrt(3);

/** Add equal directional lights and their targets in the camera's frame. */
export function addSceneLighting(scene: THREE.Scene, camera: THREE.Camera) {
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * ambient));
  const rig = new THREE.Group();
  for (const direction of directions) {
    // Three's Lambert BRDF divides incident irradiance by pi.
    const light = new THREE.DirectionalLight(0xffffff, Math.PI * diffuse);
    light.position.fromArray(direction);
    rig.add(light, light.target);
  }
  camera.add(rig);
  scene.add(camera);
}

/** Same camera-space directions for built-in mesh and sampled-hit shaders. */
export const SURFACE_LIGHTING_GLSL = `
  const vec3 sceneLightDirections[6] = vec3[6](
    ${directions.map((direction) => `vec3(${direction.map((value) => value.toFixed(12)).join(", ")})`).join(",\n    ")}
  );
  float sceneSurfaceLighting(vec3 worldNormal, vec3 worldView, bool glossy) {
    vec3 n = normalize(mat3(viewMatrix) * worldNormal);
    vec3 v = normalize(mat3(viewMatrix) * worldView);
    if (dot(n, v) < 0.0) n = -n;
    float lambert = 0.0;
    float specular = 0.0;
    for (int i = 0; i < 6; i++) {
      vec3 light = sceneLightDirections[i];
      float ndl = max(dot(n, light), 0.0);
      lambert += ndl;
      if (glossy && ndl > 0.0) {
        vec3 halfVector = normalize(light + v);
        specular += pow(max(dot(n, halfVector), 0.0), 64.0);
      }
    }
    return ${ambient} + ${diffuse.toFixed(12)} * lambert + 0.55 * specular;
  }
`;
