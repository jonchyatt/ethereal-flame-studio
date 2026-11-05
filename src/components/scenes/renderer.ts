import {
  BufferAttribute, BufferGeometry, Camera, DataTexture, LinearFilter,
  Mesh, RepeatWrapping, RGBAFormat, Scene, ShaderMaterial, Vector2, WebGLRenderer,
} from 'three';
import fragmentShader from './scene.frag.glsl';

export type SceneKind = 'orb-ocean' | 'rainbow-falls';
export type Quality = 'auto' | 'low' | 'medium' | 'high';
export type SceneStats = {
  frames: number; time: number; quality: string; resolution: number[];
  reducedMotion: boolean; paused: boolean; contextLost: boolean;
  frameIntervals: number[]; renderCpuTimes: number[]; audioLevel: number;
  oceanLevel: number; musicLevel: number; voiceTone: number;
};

export type SceneAudioLevels = { voice: number; ocean: number; music: number; voiceTone: number };

const levels = [
  { name: 'low', ratio: .65, pixels: 500_000, octaves: 0 },
  { name: 'medium', ratio: 1, pixels: 1_000_000, octaves: 1 },
  { name: 'high', ratio: 1.4, pixels: 2_100_000, octaves: 2 },
];

export function createSceneRenderer(canvas: HTMLCanvasElement, kind: SceneKind, onFailure: () => void) {
  // Pixel-analysis captures need the final buffer after presentation. This is
  // opt-in and never changes the production rendering path.
  const capture = new URLSearchParams(location.search).get('capture') === '1';
  const renderer = new WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: capture });
  renderer.setClearColor(0x030610);
  const scene = new Scene();
  const camera = new Camera();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1,-1,0, 3,-1,0, -1,3,0]), 3));
  const bytes = new Uint8Array(256 * 256 * 4);
  let seed = 714895;
  for (let i = 0; i < bytes.length; i += 4) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    bytes[i] = bytes[i + 1] = bytes[i + 2] = (seed >>> 0) % 256;
    bytes[i + 3] = 255;
  }
  const texture = new DataTexture(bytes, 256, 256, RGBAFormat);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.magFilter = texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  const uniforms = {
    uResolution: { value: new Vector2(1, 1) }, uTime: { value: 0 },
    uQuality: { value: 2 }, uFalls: { value: kind === 'rainbow-falls' ? 1 : 0 },
    uVoice: { value: 0 }, uOcean: { value: 0 }, uMusic: { value: 0 }, uVoiceTone: { value: .38 },
    uBlueGold: { value: new URLSearchParams(location.search).get('sky') === 'bluegold' ? 1 : 0 },
    uNoise: { value: texture },
  };
  const material = new ShaderMaterial({
    vertexShader: 'varying vec2 vUv; void main(){vUv=position.xy*.5+.5;gl_Position=vec4(position,1.);}',
    fragmentShader, uniforms, depthTest: false, depthWrite: false,
  });
  scene.add(new Mesh(geometry, material));
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = motion.matches;
  let mode: Quality = 'auto';
  let level = navigator.hardwareConcurrency <= 4 || innerWidth < 700 ? 1 : 2;
  let disposed = false, paused = false, lost = false, raf = 0, previous = 0;
  let elapsed = 0, frames = 0, sampleCount = 0, sampleDuration = 0, cooldown = 180;
  let audio: SceneAudioLevels = { voice: 0, ocean: 0, music: 0, voiceTone: .38 };
  const intervals: number[] = [], cpuTimes: number[] = [];

  const resize = () => {
    const { width, height } = canvas.getBoundingClientRect();
    const tier = levels[level];
    const ratio = Math.min(devicePixelRatio || 1, tier.ratio, Math.sqrt(tier.pixels / Math.max(1, width * height)));
    renderer.setPixelRatio(ratio);
    renderer.setSize(Math.max(1, width), Math.max(1, height), false);
    uniforms.uResolution.value.set(canvas.width, canvas.height);
    uniforms.uQuality.value = tier.octaves;
    if (!lost) renderer.render(scene, camera);
  };
  const draw = (now: number) => {
    raf = 0;
    if (disposed || document.hidden || paused || lost) return;
    const dt = previous ? now - previous : 0;
    previous = now;
    if (dt > 0 && dt < 250) {
      intervals.push(dt); if (intervals.length > 1200) intervals.shift();
      // Reduced-motion retains a slow breathing sea as part of the baseline
      // experience; audio remains opt-in and all rapid motion is suppressed.
      elapsed += Math.min(dt, 50) / 1000 * (reduced ? .14 : 1);
      sampleCount++; sampleDuration += dt;
      if (mode === 'auto' && --cooldown <= 0 && sampleCount >= 90) {
        const mean = sampleDuration / sampleCount;
        if (mean > 19.2 && level > 0) { level--; resize(); }
        cooldown = 300; sampleCount = 0; sampleDuration = 0;
      }
    }
    uniforms.uTime.value = elapsed;
    const start = performance.now();
    renderer.render(scene, camera);
    cpuTimes.push(performance.now() - start); if (cpuTimes.length > 1200) cpuTimes.shift();
    frames++;
    raf = requestAnimationFrame(draw);
  };
  const restart = () => {
    cancelAnimationFrame(raf); raf = 0; previous = 0;
    if (!document.hidden && !paused && !lost && !disposed) raf = requestAnimationFrame(draw);
  };
  const visibility = () => restart();
  const motionChange = () => { reduced = motion.matches; restart(); };
  const contextLost = (event: Event) => { event.preventDefault(); lost = true; cancelAnimationFrame(raf); };
  const contextRestored = () => { lost = false; resize(); restart(); };
  renderer.debug.onShaderError = () => onFailure();
  const observer = new ResizeObserver(resize); observer.observe(canvas);
  document.addEventListener('visibilitychange', visibility);
  motion.addEventListener('change', motionChange);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  resize(); restart();
  return {
    setQuality(value: Quality) {
      mode = value;
      level = value === 'auto' ? (innerWidth < 700 ? 1 : 2) : ['low', 'medium', 'high'].indexOf(value);
      resize(); restart();
    },
    setAudioLevels(value: SceneAudioLevels) {
      audio = {
        voice: Math.min(1, Math.max(0, value.voice)),
        ocean: Math.min(1, Math.max(0, value.ocean)),
        music: Math.min(1, Math.max(0, value.music)),
        voiceTone: Math.min(1, Math.max(0, value.voiceTone)),
      };
      uniforms.uVoice.value = audio.voice;
      uniforms.uOcean.value = audio.ocean;
      uniforms.uMusic.value = audio.music;
      uniforms.uVoiceTone.value = audio.voiceTone;
    },
    setPaused(value: boolean) { paused = value; restart(); },
    stats(): SceneStats {
      return { frames, time: elapsed, quality: levels[level].name, resolution: [canvas.width, canvas.height],
        reducedMotion: reduced, paused: paused || document.hidden, contextLost: lost,
        frameIntervals: [...intervals], renderCpuTimes: [...cpuTimes], audioLevel: audio.voice,
        oceanLevel: audio.ocean, musicLevel: audio.music, voiceTone: audio.voiceTone };
    },
    dispose() {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', motionChange);
      canvas.removeEventListener('webglcontextlost', contextLost);
      canvas.removeEventListener('webglcontextrestored', contextRestored);
      geometry.dispose(); material.dispose(); texture.dispose(); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
