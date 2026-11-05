// Persistent dye transport; no procedural density field.
export const FLUID_VERTEX = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const common = `
precision highp float;
varying vec2 v_uv;
uniform sampler2D u_source;
uniform sampler2D u_velocity;
uniform sampler2D u_dye;
uniform sampler2D u_curl;
uniform vec2 u_texel;
uniform vec2 u_source_texel;
uniform float u_aspect;
uniform float u_dt;
uniform float u_time;
// Manual bilinear sampling works without float-linear texture extensions.
vec4 bilerp(sampler2D field, vec2 uv, vec2 texel) {
  vec2 st = uv / texel - 0.5;
  vec2 base = (floor(st) + 0.5) * texel;
  vec2 f = fract(st);
  return mix(mix(texture2D(field, base), texture2D(field, base + vec2(texel.x, 0.0)), f.x),
             mix(texture2D(field, base + vec2(0.0, texel.y)), texture2D(field, base + texel), f.x), f.y);
}
`

export const FLUID_SHADERS = {
  blend: common + `
uniform sampler2D u_overlay;
uniform vec2 u_overlay_texel;
uniform vec4 u_eye;
void main() {
  vec4 curtains = bilerp(u_source, v_uv, u_source_texel);
  vec4 spiral = bilerp(u_overlay, v_uv, u_overlay_texel);
  float radius = length((v_uv - u_eye.xy) / u_eye.zw);
  // Let rising veils cross the arms while leaving air around the eye.
  // This weights real dye; it does not draw or warp a spiral image.
  float curtainWeight = 0.85 * mix(0.55, 1.0, smoothstep(0.2, 1.05, radius));
  gl_FragColor = curtains * curtainWeight + spiral * 0.95;
}`,
  advect: common + `
uniform float u_decay;
uniform float u_colour_decay;
uniform float u_dye_pass;
void main() {
  vec2 velocity = bilerp(u_velocity, v_uv, u_texel).xy;
  vec2 previous = v_uv - u_dt * velocity / vec2(u_aspect, 1.0);
  float inside = step(0.0, previous.x) * step(previous.x, 1.0) * step(0.0, previous.y) * step(previous.y, 1.0);
  vec4 value = bilerp(u_source, previous, u_source_texel) * exp(-u_decay * u_dt) * inside;
  value.rgb *= exp(-u_colour_decay * u_dt);
  if (u_dye_pass > 0.5) {
    // Feather the thin outskirts, without a threshold or a hard cutout.
    float density = u_dye_pass > 1.5 ? bilerp(u_dye, previous, u_source_texel).a * exp(-u_decay * u_dt) * inside : value.a;
    float edge = 0.65 * (1.0 - smoothstep(0.015, 0.18, density));
    float outlet = 2.5 * smoothstep(0.92, 1.0, v_uv.y);
    value *= exp(-(edge + outlet) * u_dt);
  }
  gl_FragColor = value;
}`,
  curl: common + `
void main() {
  float l = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.0)).y;
  float r = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.0)).y;
  float b = texture2D(u_velocity, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture2D(u_velocity, v_uv + vec2(0.0, u_texel.y)).x;
  gl_FragColor = vec4((r - l - t + b) * 0.5 / u_texel.y, 0.0, 0.0, 1.0);
}`,
  force: common + `
float noiseHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 curlNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = noiseHash(cell), b = noiseHash(cell + vec2(1.0, 0.0));
  float c = noiseHash(cell + vec2(0.0, 1.0)), d = noiseHash(cell + vec2(1.0));
  vec2 gradient = vec2(mix(b - a, d - c, u.y), mix(c - a, d - b, u.x)) * du;
  return vec2(gradient.y, -gradient.x);
}
void main() {
  float l = abs(texture2D(u_curl, v_uv - vec2(u_texel.x, 0.0)).x);
  float r = abs(texture2D(u_curl, v_uv + vec2(u_texel.x, 0.0)).x);
  float b = abs(texture2D(u_curl, v_uv - vec2(0.0, u_texel.y)).x);
  float t = abs(texture2D(u_curl, v_uv + vec2(0.0, u_texel.y)).x);
  float spin = texture2D(u_curl, v_uv).x;
  vec2 gradient = vec2(r - l, t - b);
  gradient /= max(length(gradient), 0.0001);
  vec2 force = 0.0008 * vec2(gradient.y, -gradient.x) * spin;
  float density = bilerp(u_dye, v_uv, u_source_texel).a;
  vec2 velocity = texture2D(u_velocity, v_uv).xy;
  // Curl of a small multiscale stream function: incompressible eddies fray
  // the veils instead of imparting a radial impulse to each new source.
  vec2 p = v_uv * vec2(u_aspect, 1.0);
  vec2 eddy = 0.075 * curlNoise(p * 17.0 + vec2(u_time * 0.21, -u_time * 0.17));
  eddy += 0.035 * curlNoise(p * 31.0 + vec2(-u_time * 0.13, u_time * 0.19));
  vec2 current = vec2(0.045 * sin(p.y * 11.0 + u_time * 0.27), 0.15) + eddy;
  force += (current - velocity) * 1.4;
  force.y += min(density, 0.6) * 0.025;
  velocity += force * u_dt;
  gl_FragColor = vec4(clamp(velocity, vec2(-0.35), vec2(0.35)), 0.0, 1.0);
}`,
  vortexAdvect: common + `
uniform vec4 u_eye;
uniform float u_decay;
uniform float u_colour_decay;
uniform float u_dye_pass;
void main() {
  vec2 velocity = bilerp(u_velocity, v_uv, u_texel).xy;
  vec2 previous = v_uv - u_dt * velocity / vec2(u_aspect, 1.0);
  float inside = step(0.0, previous.x) * step(previous.x, 1.0) * step(0.0, previous.y) * step(previous.y, 1.0);
  vec4 value = bilerp(u_source, previous, u_source_texel) * exp(-u_decay * u_dt) * inside;
  value.rgb *= exp(-u_colour_decay * u_dt);
  if (u_dye_pass > 0.5) {
    // Feather the thin outskirts, without a threshold or a hard cutout.
    float density = u_dye_pass > 1.5 ? bilerp(u_dye, previous, u_source_texel).a * exp(-u_decay * u_dt) * inside : value.a;
    float edge = 0.65 * (1.0 - smoothstep(0.015, 0.18, density));
    float outlet = 2.5 * smoothstep(0.92, 1.0, v_uv.y);
    vec2 q = (v_uv - u_eye.xy) / u_eye.zw;
    // Axial escape at the eye: this planar slice feeds a rising column.
    float eyeOutlet = 1.8 * (1.0 - smoothstep(0.06, 0.32, length(q)));
    value *= exp(-(edge + outlet + eyeOutlet) * u_dt);
  }
  gl_FragColor = value;
}`,
  vortexProject: common + `
uniform vec4 u_eye;
void main() {
  float l = texture2D(u_source, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture2D(u_source, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture2D(u_source, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture2D(u_source, v_uv + vec2(0.0, u_texel.y)).x;
  vec2 velocity = texture2D(u_velocity, v_uv).xy - vec2(r - l, t - b) * 0.5 / u_texel.y;
  // Resolved planar motion plus converging flow into an axial outlet.
  // Projection alone would erase this 3D funnel's in-plane convergence.
  vec2 q = (v_uv - u_eye.xy) / u_eye.zw;
  velocity -= q * u_eye.zw * vec2(u_aspect, 1.0) * (0.16 / (0.3 + dot(q, q)));
  if (v_uv.x < u_texel.x || v_uv.x > 1.0 - u_texel.x) velocity.x = 0.0;
  if (v_uv.y < u_texel.y) velocity.y = max(velocity.y, 0.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,
  vortexForce: common + `
uniform vec4 u_eye;
float noiseHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
vec2 curlNoise(vec2 p) {
  vec2 cell = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f), du = 6.0 * f * (1.0 - f);
  float a = noiseHash(cell), b = noiseHash(cell + vec2(1.0, 0.0));
  float c = noiseHash(cell + vec2(0.0, 1.0)), d = noiseHash(cell + vec2(1.0));
  vec2 gradient = vec2(mix(b - a, d - c, u.y), mix(c - a, d - b, u.x)) * du;
  return vec2(gradient.y, -gradient.x);
}
void main() {
  vec2 q = (v_uv - u_eye.xy) / u_eye.zw;
  float radius2 = dot(q, q);
  // Smooth Rankine profile: solid-body core, 1/r tangential falloff.
  // A long breathing cycle loosens the arms without reversing the flow.
  float breath = 0.78 + 0.22 * sin(u_time * 0.26 - 0.8);
  float release = 1.0 - 0.45 * pow(0.5 + 0.5 * sin(u_time * 0.11 - 1.7), 6.0);
  float angular = 0.88 * breath * release / (0.16 + radius2);
  vec2 orbit = vec2(-q.y, q.x) * angular;
  orbit -= q * (0.075 / (0.45 + radius2));
  vec2 current = orbit * u_eye.zw * vec2(u_aspect, 1.0);
  // Buoyancy gently carries the whole circulation upward. Small shear
  // prevents perfectly concentric bands while retaining a legible eye.
  current.y += 0.022;
  vec2 p = v_uv * vec2(u_aspect, 1.0);
  current += 0.065 * curlNoise(p * 17.0 + vec2(u_time * 0.16, -u_time * 0.12));
  current += 0.025 * curlNoise(p * 31.0 + vec2(-u_time * 0.11, u_time * 0.15));
  current.x += 0.012 * sin(q.y * 5.0 + u_time * 0.3);
  vec2 velocity = texture2D(u_velocity, v_uv).xy;
  float density = bilerp(u_dye, v_uv, u_source_texel).a;
  vec2 force = (current - velocity) * 2.2;
  force.y += min(density, 0.6) * 0.018;
  velocity += force * u_dt;
  gl_FragColor = vec4(clamp(velocity, vec2(-0.65), vec2(0.65)), 0.0, 1.0);
}`,
  divergence: common + `
void main() {
  vec2 c = texture2D(u_velocity, v_uv).xy;
  float l = texture2D(u_velocity, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture2D(u_velocity, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture2D(u_velocity, v_uv - vec2(0.0, u_texel.y)).y;
  float t = texture2D(u_velocity, v_uv + vec2(0.0, u_texel.y)).y;
  if (v_uv.x < u_texel.x) l = -c.x;
  if (v_uv.x > 1.0 - u_texel.x) r = -c.x;
  if (v_uv.y < u_texel.y) b = -c.y;
  // Open top boundary: rising air exits instead of rolling into a ceiling.
  if (v_uv.y > 1.0 - u_texel.y) t = c.y;
  gl_FragColor = vec4((r - l + t - b) * 0.5 / u_texel.y, 0.0, 0.0, 1.0);
}`,
  pressure: common + `
uniform sampler2D u_divergence;
void main() {
  float l = texture2D(u_source, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture2D(u_source, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture2D(u_source, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture2D(u_source, v_uv + vec2(0.0, u_texel.y)).x;
  float d = texture2D(u_divergence, v_uv).x;
  gl_FragColor = vec4((l + r + b + t - d * u_texel.y * u_texel.y) * 0.25, 0.0, 0.0, 1.0);
}`,
  project: common + `
void main() {
  float l = texture2D(u_source, v_uv - vec2(u_texel.x, 0.0)).x;
  float r = texture2D(u_source, v_uv + vec2(u_texel.x, 0.0)).x;
  float b = texture2D(u_source, v_uv - vec2(0.0, u_texel.y)).x;
  float t = texture2D(u_source, v_uv + vec2(0.0, u_texel.y)).x;
  vec2 velocity = texture2D(u_velocity, v_uv).xy - vec2(r - l, t - b) * 0.5 / u_texel.y;
  if (v_uv.x < u_texel.x || v_uv.x > 1.0 - u_texel.x) velocity.x = 0.0;
  if (v_uv.y < u_texel.y) velocity.y = max(velocity.y, 0.0);
  gl_FragColor = vec4(velocity, 0.0, 1.0);
}`,
  inject: common + `
uniform vec4 u_emitters[12];
uniform vec4 u_inks[12];
uniform float u_velocity_pass;
void main() {
  vec4 value = texture2D(u_source, v_uv);
  for (int i = 0; i < 12; i++) {
    vec4 emitter = u_emitters[i];
    vec2 q = (v_uv - emitter.xy) / max(vec2(emitter.z, 0.045), vec2(0.0001));
    float source = exp(-dot(q, q) * 1.2) * emitter.w * u_dt;
    if (u_velocity_pass > 0.5) value.xy += source * vec2(u_inks[i].w * 0.15, 0.012);
    else value += source * vec4(u_inks[i].rgb, 1.0) * 1.4;
  }
  gl_FragColor = value;
}`,
  blur: common + `
uniform vec2 u_direction;
void main() {
  vec4 value = bilerp(u_source, v_uv, u_source_texel) * 0.227027;
  value += bilerp(u_source, v_uv + u_direction * 1.384615, u_source_texel) * 0.316216;
  value += bilerp(u_source, v_uv - u_direction * 1.384615, u_source_texel) * 0.316216;
  value += bilerp(u_source, v_uv + u_direction * 3.230769, u_source_texel) * 0.070270;
  value += bilerp(u_source, v_uv - u_direction * 3.230769, u_source_texel) * 0.070270;
  gl_FragColor = value;
}`,
  trace: common + `
void main() {
  vec3 pigment = bilerp(u_source, v_uv, u_source_texel).rgb;
  float light = dot(pigment, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = vec4(vec3(light * 8.0), 1.0);
}`,
  display: common + `
uniform sampler2D u_bloom;
uniform vec2 u_bloom_texel;
uniform float u_intensity;
uniform float u_grain;
uniform float u_height;
uniform float u_position;
uniform float u_answer;
uniform float u_entry;
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
void main() {
  vec2 d = u_source_texel * 0.8;
  vec3 colour = bilerp(u_source, v_uv, u_source_texel).rgb * 0.25;
  colour += bilerp(u_source, v_uv + vec2(d.x, 0.0), u_source_texel).rgb * 0.125;
  colour += bilerp(u_source, v_uv - vec2(d.x, 0.0), u_source_texel).rgb * 0.125;
  colour += bilerp(u_source, v_uv + vec2(0.0, d.y), u_source_texel).rgb * 0.125;
  colour += bilerp(u_source, v_uv - vec2(0.0, d.y), u_source_texel).rgb * 0.125;
  colour += bilerp(u_source, v_uv + d, u_source_texel).rgb * 0.0625;
  colour += bilerp(u_source, v_uv - d, u_source_texel).rgb * 0.0625;
  colour += bilerp(u_source, v_uv + vec2(d.x, -d.y), u_source_texel).rgb * 0.0625;
  colour += bilerp(u_source, v_uv + vec2(-d.x, d.y), u_source_texel).rgb * 0.0625;
  vec3 bloom = bilerp(u_bloom, v_uv, u_bloom_texel).rgb;
  colour = colour * 1.3 + bloom * 0.85;
  float mask = smoothstep(0.0, 0.035, v_uv.y);
  if (u_position < 1.5) {
    float depth = u_position > 0.5 ? 1.0 - v_uv.y : v_uv.y;
    mask *= 1.0 - smoothstep(u_height * 0.66, u_height * 0.98, depth);
  }
  // Shared highlight shoulder preserves chromaticity of linear-light mixtures.
  colour *= 2.6;
  float peak = max(colour.r, max(colour.g, colour.b));
  colour *= (0.115 * (1.0 - exp(-peak / 0.115))) / max(peak, 0.00001);
  colour *= mask * u_intensity * u_entry;
  vec3 srgb = mix(colour * 12.92, 1.055 * pow(max(colour, vec3(0.0)), vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), colour));
  if (u_answer >= 0.0) {
    float flash = 1.0 - smoothstep(0.0, 0.5, u_answer);
    float visible = 1.0 - smoothstep(0.5, 1.0, u_answer);
    float flashMask = 1.0;
    if (u_position < 1.5) {
      float depth = u_position > 0.5 ? 1.0 - v_uv.y : v_uv.y;
      flashMask = 1.0 - smoothstep(u_height * 0.64, u_height, depth);
    }
    srgb = mix(srgb, vec3(18.0, 90.0, 80.0) / 255.0 * flashMask, flash) * visible;
  }
  float dither = (hash(gl_FragCoord.xy + floor(u_time * 24.0)) - 0.5) * max(u_grain, 0.12) / 64.0;
  gl_FragColor = vec4(clamp(srgb + dither, 0.0, 1.0), 1.0);
}`,
} as const
