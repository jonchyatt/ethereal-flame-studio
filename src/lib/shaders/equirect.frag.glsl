/**
 * Cubemap to Equirectangular Conversion Fragment Shader
 *
 * Converts a cubemap texture to equirectangular (lat-long) projection
 * for 360 video output.
 *
 * Phase 3, Plan 03-04
 */

precision highp float;

uniform samplerCube cubemap;
varying vec2 vUv;

#define PI 3.14159265359

void main() {
  // Convert UV to spherical coordinates
  // UV.x: 0 -> 1 maps to longitude 0 -> 2*PI
  // UV.y: 0 -> 1 maps to latitude PI -> 0 (top to bottom)
  float theta = vUv.x * 2.0 * PI;        // Longitude: 0 to 2*PI
  float phi = (1.0 - vUv.y) * PI;        // Latitude: 0 to PI (top to bottom)

  // Convert spherical to Cartesian direction
  // Standard spherical coordinate conversion:
  // x = sin(phi) * sin(theta)
  // y = cos(phi)
  // z = sin(phi) * cos(theta)
  vec3 dir;
  dir.x = sin(phi) * sin(theta);
  dir.y = cos(phi);
  dir.z = sin(phi) * cos(theta);

  // Sample the cubemap
  gl_FragColor = textureCube(cubemap, dir);
}
