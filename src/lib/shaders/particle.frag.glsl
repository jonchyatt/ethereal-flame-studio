uniform float uIntensity;

varying float vAlpha;
varying vec3 vColor;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);

  // Soft circular gradient with smooth falloff
  float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
  alpha = pow(alpha, 0.8); // Softer falloff for glow

  // Bright core + soft bloom + halo
  float core = exp(-dist * 4.0) * 0.8;
  float bloom = exp(-dist * 1.5) * 0.3;
  float halo = exp(-dist * 8.0) * 0.4;

  vec3 color = vColor * uIntensity * (1.0 + core + bloom);
  float finalAlpha = (alpha + halo) * vAlpha * 0.85;

  gl_FragColor = vec4(color, finalAlpha);
}
