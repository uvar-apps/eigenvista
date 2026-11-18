import * as THREE from "three";

// One camera-aligned headlight gives a continuous, rotationally symmetric
// sphere gradient and one highlight. Neutral fill keeps limbs readable.
// Camera space preserves this illumination during orbit, pan and roll without
// the bands and repeated specular lobes of opposing directional-light pairs.
const ambient = 0.35;
const diffuse = 0.65;

/** Add one directional headlight and neutral fill in the camera's frame. */
export function addSceneLighting(scene: THREE.Scene, camera: THREE.Camera) {
  scene.add(new THREE.AmbientLight(0xffffff, Math.PI * ambient));
  const rig = new THREE.Group();
  // Three's Lambert BRDF divides incident irradiance by pi.
  const light = new THREE.DirectionalLight(0xffffff, Math.PI * diffuse);
  light.position.set(0, 0, 1);
  rig.add(light, light.target);
  camera.add(rig);
  scene.add(camera);
}

/** Same headlight direction/fill for built-in mesh and sampled-hit shaders. */
export const SURFACE_LIGHTING_GLSL = `
  float sceneSurfaceLighting(vec3 worldNormal, vec3 worldView, bool glossy) {
    vec3 n = normalize(mat3(viewMatrix) * worldNormal);
    vec3 v = normalize(mat3(viewMatrix) * worldView);
    if (dot(n, v) < 0.0) n = -n;
    vec3 light = vec3(0.0, 0.0, 1.0);
    float lambert = max(dot(n, light), 0.0);
    float specular = 0.0;
    if (glossy && lambert > 0.0) {
      vec3 halfVector = normalize(light + v);
      specular = pow(max(dot(n, halfVector), 0.0), 32.0);
    }
    return ${ambient} + ${diffuse} * lambert + 0.25 * specular;
  }
`;
