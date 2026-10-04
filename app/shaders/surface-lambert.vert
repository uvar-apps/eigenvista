// Example surface shader (classic GLSL 1.x / Molekel-style).
// Works with EigenVista's Three.js compatibility preamble.
uniform float saturation;
varying vec4 color;
varying vec3 normal;
void main()
{
  gl_Position = ftransform();
  normal = normalize(gl_NormalMatrix * gl_Normal);
  color = vec4(saturation * gl_Color.rgb + (1.0 - saturation) * vec3(1.0), gl_Color.a);
}
