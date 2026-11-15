varying vec4 pos;
varying vec3 normal;
varying vec4 color;
uniform float xmax;
uniform float xmin;
uniform float ymax;
uniform float ymin;
uniform float zmax;
uniform float zmin;
void main()
{
  if (pos.x > xmax || pos.x < xmin) discard;
  if (pos.y > ymax || pos.y < ymin) discard;
  if (pos.z > zmax || pos.z < zmin) discard;
  float kd = abs(dot(normalize(normal), vec3(0.0, 0.0, 1.0)));
  gl_FragColor = vec4(color.rgb * kd, color.a);
}
