// Four-light Phong shading using the surface's supplied vertex colors.
uniform float opacity;
varying vec3 vSurfaceTint;
varying vec3 vViewNormal;
varying vec3 vViewDirection;

vec3 toDisplayColor(vec3 color) {
  vec3 rgb = clamp(color, 0.0, 1.0);
  return mix(1.055 * pow(rgb, vec3(1.0 / 2.4)) - 0.055, 12.92 * rgb,
             lessThanEqual(rgb, vec3(0.0031308)));
}

vec3 toLinearColor(vec3 color) {
  vec3 rgb = clamp(color, 0.0, 1.0);
  return mix(pow((rgb + 0.055) / 1.055, vec3(2.4)), rgb / 12.92,
             lessThanEqual(rgb, vec3(0.04045)));
}

void addPhongLight(vec3 lightDirection, float strength, vec3 n, vec3 v,
                   inout float diffuse, inout float specular) {
  diffuse += strength * max(0.0, dot(n, lightDirection));
  vec3 reflection = reflect(-lightDirection, n);
  specular += strength * pow(max(0.0, dot(reflection, v)), 34.0);
}

void main() {
  vec3 n = normalize(vViewNormal);
  vec3 v = normalize(vViewDirection);
  if (dot(n, v) < 0.0) n = -n;

  float diffuse = 0.0;
  float specular = 0.0;
  addPhongLight(vec3(-1.0, 0.0, 0.2), 0.5, n, v, diffuse, specular);
  addPhongLight(vec3(0.0, 1.0, 0.2), 0.3, n, v, diffuse, specular);
  addPhongLight(vec3(0.3, 0.4, 0.9), 0.3, n, v, diffuse, specular);
  addPhongLight(vec3(0.0, -1.0, 0.2), 0.1, n, v, diffuse, specular);

  vec3 lit = toDisplayColor(vSurfaceTint) * (2.15 * diffuse)
           + vec3(0.085 + 1.30 * specular);
  gl_FragColor = vec4(toLinearColor(lit), clamp(opacity, 0.0, 1.0));
  #include <colorspace_fragment>
}
