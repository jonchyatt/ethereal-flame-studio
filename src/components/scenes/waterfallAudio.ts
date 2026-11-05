/** Original synthesis only. No sample, reference audio, fetch, or autoplay. */
export function createWaterfallAudio() {
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = 0;
  const compressor = context.createDynamicsCompressor();
  compressor.threshold.value = -18;
  compressor.knee.value = 18;
  compressor.ratio.value = 3;
  const capture = context.createMediaStreamDestination();
  master.connect(compressor);
  compressor.connect(context.destination);
  compressor.connect(capture);
  const sources: AudioScheduledSourceNode[] = [];
  let seed = 82571;
  const random = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const noise = context.createBuffer(2, context.sampleRate * 12, context.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = noise.getChannelData(channel);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      const white = random() * 2 - 1;
      brown = (brown + .018 * white) / 1.018;
      data[i] = white * .22 + brown * 2.8;
    }
    // Crossfade the seam of the reusable noise buffer.
    const fade = Math.floor(context.sampleRate * .12);
    for (let i = 0; i < fade; i++) {
      const mix = i / fade;
      data[data.length - fade + i] = data[data.length - fade + i] * (1 - mix) + data[i] * mix;
    }
  }
  const source = context.createBufferSource();
  source.buffer = noise;
  source.loop = true;
  const highpass = context.createBiquadFilter();
  highpass.type = 'highpass'; highpass.frequency.value = 95;
  const lowpass = context.createBiquadFilter();
  lowpass.type = 'lowpass'; lowpass.frequency.value = 3900; lowpass.Q.value = .35;
  const water = context.createGain(); water.gain.value = .33;
  source.connect(highpass).connect(lowpass).connect(water).connect(master);
  source.start(); sources.push(source);
  const swell = context.createOscillator(); swell.frequency.value = .083;
  const swellDepth = context.createGain(); swellDepth.gain.value = .045;
  swell.connect(swellDepth).connect(water.gain); swell.start(); sources.push(swell);

  // Overlapping Dmaj9 / Bm9 / Gmaj9 / A6 banks, breathing over 96 seconds.
  const chords = [[146.832, 184.997, 220, 277.183, 329.628],
    [123.471, 146.832, 184.997, 220, 277.183],
    [97.999, 146.832, 184.997, 246.942, 293.665],
    [110, 164.814, 220, 277.183, 369.994]];
  chords.forEach((chord, bank) => {
    const gain = context.createGain();
    gain.gain.value = .010;
    const pan = context.createStereoPanner(); pan.pan.value = (bank - 1.5) * .22;
    gain.connect(pan).connect(master);
    const lfo = context.createOscillator();
    const periodic = context.createPeriodicWave(new Float32Array([0, Math.cos(bank * Math.PI / 2)]),
      new Float32Array([0, Math.sin(bank * Math.PI / 2)]));
    lfo.setPeriodicWave(periodic); lfo.frequency.value = 1 / 96;
    const depth = context.createGain(); depth.gain.value = .009;
    lfo.connect(depth).connect(gain.gain); lfo.start(); sources.push(lfo);
    chord.forEach((frequency, voice) => {
      const oscillator = context.createOscillator();
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      oscillator.detune.value = (voice % 2 ? 1 : -1) * 3;
      oscillator.connect(gain); oscillator.start(); sources.push(oscillator);
    });
  });
  let muted = false;
  return {
    context,
    stream: capture.stream,
    async resume() {
      await context.resume();
      master.gain.setTargetAtTime(muted ? 0 : .68, context.currentTime, .8);
    },
    setMuted(value: boolean) {
      muted = value;
      master.gain.setTargetAtTime(value ? 0 : .68, context.currentTime, .12);
    },
    suspend() { if (context.state === 'running') void context.suspend(); },
    dispose() {
      sources.forEach(source => { source.stop(); source.disconnect(); });
      capture.stream.getTracks().forEach(track => track.stop());
      void context.close();
    },
  };
}

export type WaterfallAudio = ReturnType<typeof createWaterfallAudio>;
