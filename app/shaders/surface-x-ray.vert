// Pass the assigned diffuse color and the view-space geometry.
varying vec3 surfaceColor;
varying vec3 viewNormal;
varying vec3 toEye;

void main()
{
  vec4 viewPosition = gl_ModelViewMatrix * gl_Vertex;
  surfaceColor = gl_Color.rgb;
  viewNormal = gl_NormalMatrix * gl_Normal;
  toEye = -viewPosition.xyz;
  gl_Position = gl_ProjectionMatrix * viewPosition;
}
