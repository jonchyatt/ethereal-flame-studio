// Star Nest by Pablo Román Andrioli
// Ported from Shadertoy: https://www.shadertoy.com/view/XlfGRj
// Unity 5.x shader adaptation by Jonathan Cohen
// Now ported to WebGL / GLSL ES for Three.js

// Constants
#define MAX_ITERATIONS 20
#define MAX_VOLSTEPS 20

// Uniforms
uniform float uTime;
uniform float uIterations;
uniform float uVolsteps;
uniform float uFormuparam;
uniform float uStepSize;
uniform float uTile;
uniform float uBrightness;
uniform float uDarkmatter;
uniform float uDistfading;
uniform float uSaturation;
uniform vec3 uColor;
uniform vec4 uCenter;
uniform vec4 uScroll;
uniform vec4 uRotation;
// HSV parameters (optional)
uniform float uHueShift;
uniform float uHueSpeed;
uniform float uPostSaturation;

varying vec3 vRayDir;

// ==========================================
// HSV Conversion Functions
// ==========================================
vec3 toHSV(vec3 rgb) {
  float maxC = max(rgb.r, max(rgb.g, rgb.b));
  float minC = min(rgb.r, min(rgb.g, rgb.b));
  float delta = maxC - minC;

  vec3 hsv;
  hsv.z = maxC; // Value

  if (delta < 0.00001) {
    hsv.x = 0.0;
    hsv.y = 0.0;
    return hsv;
  }

  hsv.y = delta / maxC; // Saturation

  // Hue calculation
  if (rgb.r >= maxC) {
    hsv.x = (rgb.g - rgb.b) / delta;
  } else if (rgb.g >= maxC) {
    hsv.x = 2.0 + (rgb.b - rgb.r) / delta;
  } else {
    hsv.x = 4.0 + (rgb.r - rgb.g) / delta;
  }

  hsv.x /= 6.0;
  if (hsv.x < 0.0) hsv.x += 1.0;

  return hsv;
}

vec3 toRGB(vec3 hsv) {
  if (hsv.y <= 0.0) {
    return vec3(hsv.z);
  }

  float h = hsv.x * 6.0;
  float c = hsv.z * hsv.y;
  float x = c * (1.0 - abs(mod(h, 2.0) - 1.0));
  float m = hsv.z - c;

  vec3 rgb;
  if (h < 1.0) rgb = vec3(c, x, 0.0);
  else if (h < 2.0) rgb = vec3(x, c, 0.0);
  else if (h < 3.0) rgb = vec3(0.0, c, x);
  else if (h < 4.0) rgb = vec3(0.0, x, c);
  else if (h < 5.0) rgb = vec3(x, 0.0, c);
  else rgb = vec3(c, 0.0, x);

  return rgb + m;
}

void main() {
  vec3 dir = normalize(vRayDir);
  float time = uCenter.w + uTime * 0.05;

  // Scale parameters (Unity shader scales these)
  float brightness = uBrightness / 1000.0;
  float stepSize = uStepSize / 1000.0;
  vec3 tile = abs(vec3(uTile)) / 1000.0;
  float formparam = uFormuparam / 1000.0;
  float darkmatter = uDarkmatter / 100.0;
  float distFade = uDistfading / 100.0;

  vec3 from = uCenter.xyz;

  // Scroll over time
  from += uScroll.xyz * uScroll.w * time;

  // Apply rotation if enabled
  vec3 rot = uRotation.xyz * uRotation.w * time * 0.1;
  if (length(rot) > 0.0) {
    float cx = cos(rot.x), sx = sin(rot.x);
    float cy = cos(rot.y), sy = sin(rot.y);
    float cz = cos(rot.z), sz = sin(rot.z);

    // Z rotation
    mat2 rz = mat2(cz, sz, -sz, cz);
    dir.xy = rz * dir.xy;
    from.xy = rz * from.xy;

    // Y rotation
    mat2 ry = mat2(cy, sy, -sy, cy);
    dir.xz = ry * dir.xz;
    from.xz = ry * from.xz;

    // X rotation
    mat2 rx = mat2(cx, sx, -sx, cx);
    dir.yz = rx * dir.yz;
    from.yz = rx * from.yz;
  }

  // Volumetric rendering
  float s = 0.1;
  float fade = 1.0;
  vec3 v = vec3(0.0);

  int volsteps = int(uVolsteps);
  int iterations = int(uIterations);

  for (int r = 0; r < MAX_VOLSTEPS; r++) {
    if (r >= volsteps) break;

    vec3 p = abs(from + s * dir * 0.5);
    p = abs(tile - mod(p, tile * 2.0));

    float pa = 0.0;
    float a = 0.0;

    for (int i = 0; i < MAX_ITERATIONS; i++) {
      if (i >= iterations) break;
      p = abs(p) / dot(p, p) - formparam;
      a += abs(length(p) - pa);
      pa = length(p);
    }

    // Dark matter
    float dm = max(0.0, darkmatter - a * a * 0.001);
    if (r > 6) {
      fade *= 1.0 - dm;
    }

    a *= a * a; // Add contrast

    v += fade;

    // Coloring based on distance
    v += vec3(s, s*s, s*s*s*s) * a * brightness * fade;

    // Distance fading
    fade *= distFade;
    s += stepSize;
  }

  float len = length(v);
  // Saturation
  v = mix(vec3(len), v, uSaturation / 100.0);
  v *= uColor * 0.01;

  // ==========================================
  // HSV Post-Processing (optional)
  // ==========================================
  if (uHueSpeed > 0.0 || uHueShift != 0.0) {
    // Convert to HSV
    vec3 hsv = toHSV(v);

    // Apply animated hue shift
    float animatedHue = uHueShift + uTime * uHueSpeed;
    hsv.x = fract(hsv.x + animatedHue);

    // Apply post-saturation adjustment
    hsv.y = clamp(hsv.y + uPostSaturation, 0.0, 1.0);

    // Convert back to RGB
    v = toRGB(hsv);
  }

  gl_FragColor = vec4(v, 1.0);
}
