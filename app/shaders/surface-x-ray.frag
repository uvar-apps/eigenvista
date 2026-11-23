// Show edges more strongly than areas facing the camera.
varying vec3 surfaceColor;
varying vec3 viewNormal;
varying vec3 toEye;

uniform float minOpacity;
uniform float maxOpacity;
uniform float da;

void main()
{
  float facing = abs(dot(normalize(viewNormal), normalize(toEye)));
  float opacity = clamp(1.0 - facing, minOpacity, maxOpacity);
  if (opacity < da) discard;
  gl_FragColor = vec4(surfaceColor, opacity);
  #include <colorspace_fragment>
}
