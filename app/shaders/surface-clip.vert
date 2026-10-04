// Exercises writable classic built-ins (clip vertex + fog coord).
uniform float factor;
varying vec4 pos;
varying vec3 normal;
varying vec4 color;
void main()
{
  pos = gl_Vertex;
  pos.xyz /= gl_Vertex.w;
  pos.xyz *= factor;
  normal = normalize(gl_NormalMatrix * gl_Normal);
  color = gl_Color;
  gl_ClipVertex = gl_ModelViewMatrix * gl_Vertex;
  gl_FogFragCoord = abs((gl_ModelViewMatrix * gl_Vertex).z);
  gl_Position = ftransform();
}
