// Example Blinn-Phong surface shader with live uniforms.
varying vec3 vNormal;
varying vec3 vView;

void main()
{
  vec4 ecpos = gl_ModelViewMatrix * gl_Vertex;
  vNormal = normalize(gl_NormalMatrix * gl_Normal);
  vView = -normalize(ecpos.xyz);
  gl_Position = ftransform();
}
