attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vAlpha = aAlpha;
  vColor = aColor;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Distance-based size attenuation
  float distanceScale = 100.0 / length(mvPosition.xyz);
  gl_PointSize = aSize * distanceScale;
}
