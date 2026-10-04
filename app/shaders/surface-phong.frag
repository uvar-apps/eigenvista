varying vec3 vNormal;
varying vec3 vView;

uniform vec3 lightDir;
uniform vec3 lightColor;
uniform float ambient;
uniform float diffuseScale;
uniform float specularScale;
uniform float shininess;
uniform float opacity;

void main()
{
  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 L = normalize(lightDir);
  vec3 V = normalize(vView);
  vec3 H = normalize(L + V);
  float ndl = abs(dot(N, L));
  float ndh = pow(max(abs(dot(N, H)), 0.0), max(shininess, 1.0));
  float lighting = ambient + diffuseScale * ndl + specularScale * ndh;
  gl_FragColor = vec4(lightColor * lighting, opacity);
}
