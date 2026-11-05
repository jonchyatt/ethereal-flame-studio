/**
 * The orb's mix is deliberately made from three same-origin files. Keeping
 * every source local lets its own AnalyserNode work reliably, and gives the
 * recorder the exact mix that a visitor hears.
 */
export type OrbAudioLevels = {
  /** Speech RMS: orb radius and cloud spread. */
  voice: number;
  /** Low-frequency ocean energy: swell and white glint road. */
  ocean: number;
  /** Music mid/high energy: stars and the outer orb wisps. */
  music: number;
  /** Speech spectral centroid, normalised for the subtle colour lead. */
  voiceTone: number;
};

type SourceMeter = {
  element: HTMLAudioElement;
  source: MediaElementAudioSourceNode;
  analyser: AnalyserNode;
  gain: GainNode;
  time: Float32Array<ArrayBuffer>;
  frequency: Float32Array<ArrayBuffer>;
};

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

function rms(samples: Float32Array<ArrayBufferLike>) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
  return Math.sqrt(sum / samples.length);
}

function makeMeter(context: AudioContext, path: string, gainValue: number) {
  const element = new Audio(path);
  element.preload = 'auto';
  element.loop = true;
  const source = context.createMediaElementSource(element);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  const gain = context.createGain();
  gain.gain.value = gainValue;
  source.connect(analyser).connect(gain);
  return {
    element, source, analyser, gain,
    time: new Float32Array(analyser.fftSize) as Float32Array<ArrayBuffer>,
    frequency: new Float32Array(analyser.frequencyBinCount) as Float32Array<ArrayBuffer>,
  } satisfies SourceMeter;
}

function bandEnergy(meter: SourceMeter, fromHz: number, toHz: number, sampleRate: number) {
  meter.analyser.getFloatFrequencyData(meter.frequency);
  const binHz = sampleRate / meter.analyser.fftSize;
  const start = Math.max(0, Math.floor(fromHz / binHz));
  const end = Math.min(meter.frequency.length - 1, Math.ceil(toHz / binHz));
  let sum = 0;
  let count = 0;
  for (let i = start; i <= end; i++) {
    // dB -> amplitude, preserving peaks rather than averaging logarithms.
    sum += Math.pow(10, meter.frequency[i] / 20);
    count++;
  }
  return count ? sum / count : 0;
}

function spectralCentroid(meter: SourceMeter, fromHz: number, toHz: number, sampleRate: number) {
  meter.analyser.getFloatFrequencyData(meter.frequency);
  const binHz = sampleRate / meter.analyser.fftSize;
  const start = Math.max(0, Math.floor(fromHz / binHz));
  const end = Math.min(meter.frequency.length - 1, Math.ceil(toHz / binHz));
  let weighted = 0;
  let energy = 0;
  for (let i = start; i <= end; i++) {
    const amplitude = Math.pow(10, meter.frequency[i] / 20);
    weighted += i * binHz * amplitude;
    energy += amplitude;
  }
  return energy > 1e-6 ? weighted / energy : (fromHz + toHz) * .5;
}

/**
 * Voice is the focus. The two beds each sit 16 dB below it (0.16 linear) and
 * are mixed through a capture destination as well as the speakers.
 */
export function createOrbAudio() {
  const context = new AudioContext();
  const master = context.createGain();
  const capture = context.createMediaStreamDestination();
  master.gain.value = .58;
  master.connect(context.destination);
  master.connect(capture);

  const voice = makeMeter(context, '/audio/first-passage.mp3', 1);
  const ocean = makeMeter(context, '/audio/ocean-waves-kingsrow-362300.mp3', .16);
  const music = makeMeter(context, '/audio/meditation-impromptu-01-kevin-macleod.mp3', .16);
  voice.gain.connect(master); ocean.gain.connect(master); music.gain.connect(master);

  let previous = performance.now();
  let levels: OrbAudioLevels = { voice: 0, ocean: 0, music: 0, voiceTone: .38 };
  const smooth = (current: number, target: number, seconds: number, delta: number) =>
    current + (target - current) * (1 - Math.exp(-delta / seconds));

  function updateLevels() {
    const now = performance.now();
    const delta = Math.min(.1, Math.max(.001, (now - previous) / 1000));
    previous = now;
    voice.analyser.getFloatTimeDomainData(voice.time);
    ocean.analyser.getFloatTimeDomainData(ocean.time);
    music.analyser.getFloatTimeDomainData(music.time);

    // Speech uses quick attack / slower release, so its physical expansion is
    // immediate without turning loudness into emission brightness.
    const voiceTarget = clamp01((rms(voice.time) - .006) * 5.9);
    const oceanRms = rms(ocean.time);
    const oceanLow = bandEnergy(ocean, 38, 330, context.sampleRate);
    const oceanTarget = clamp01((oceanRms * 4.2 + oceanLow * 9.5 - .035) * 1.45);
    const musicRms = rms(music.time);
    const musicAir = bandEnergy(music, 720, 7600, context.sampleRate);
    const musicTarget = clamp01((musicRms * 4.8 + musicAir * 14. - .045) * 1.3);
    const centroid = spectralCentroid(voice, 180, 4200, context.sampleRate);
    // A small centroid-derived amount makes the edge race slightly ahead on
    // crisp speech, without making hue an audio meter.
    const toneTarget = clamp01((centroid - 360) / 2650);

    levels = {
      voice: smooth(levels.voice, voiceTarget, voiceTarget > levels.voice ? .03 : .4, delta),
      ocean: smooth(levels.ocean, oceanTarget, oceanTarget > levels.ocean ? .09 : .55, delta),
      music: smooth(levels.music, musicTarget, musicTarget > levels.music ? .075 : .32, delta),
      voiceTone: smooth(levels.voiceTone, toneTarget, .28, delta),
    };
    return levels;
  }

  return {
    context,
    stream: capture.stream,
    async resume() {
      await context.resume();
      // A single user gesture releases all three tracks together.
      await Promise.all([voice.element.play(), ocean.element.play(), music.element.play()]);
    },
    levels: updateLevels,
    level: () => updateLevels().voice,
    suspend() { if (context.state === 'running') void context.suspend(); },
    dispose() {
      for (const meter of [voice, ocean, music]) {
        meter.element.pause();
        meter.element.removeAttribute('src');
        meter.element.load();
        meter.source.disconnect(); meter.analyser.disconnect(); meter.gain.disconnect();
      }
      capture.stream.getTracks().forEach(track => track.stop());
      master.disconnect();
      void context.close();
    },
  };
}

export type OrbAudio = ReturnType<typeof createOrbAudio>;
