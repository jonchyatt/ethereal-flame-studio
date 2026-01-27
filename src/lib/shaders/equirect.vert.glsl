/**
 * Equirectangular Conversion Vertex Shader
 *
 * Simple fullscreen quad vertex shader that passes UV coordinates
 * to the fragment shader.
 *
 * Phase 3, Plan 03-04
 */

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
