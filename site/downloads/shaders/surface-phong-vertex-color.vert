attribute vec3 aColor;
varying vec3 vSurfaceTint;
varying vec3 vViewNormal;
varying vec3 vViewDirection;

void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vSurfaceTint = aColor;
  vViewNormal = normalMatrix * normal;
  vViewDirection = -viewPosition.xyz;
  gl_Position = projectionMatrix * viewPosition;
}
