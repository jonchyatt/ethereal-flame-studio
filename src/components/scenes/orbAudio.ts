/**
 * The reading is a local copy of the public-domain LibriVox recording. Keeping
 * it same-origin makes Web Audio analysis reliable on every supported browser.
 */
export function createOrbAudio() {
  const context = new AudioContext();
  const element = new Audio('/audio/first-passage.mp3');
  element.preload = 'auto';
  element.loop = true;
  const source = context.createMediaElementSource(element);
  const analyser = context.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  const gain = context.createGain();
  // Present but deliberately quiet: the visual response should do the talking.
  gain.gain.value = 0.18;
  source.connect(analyser);
  analyser.connect(gain).connect(context.destination);

  const samples = new Float32Array(analyser.fftSize);
  let smoothed = 0;
  let previous = performance.now();

  return {
    context,
    async resume() {
      await context.resume();
      await element.play();
    },
    level() {
      const now = performance.now();
      const delta = Math.min(.1, Math.max(.001, (now - previous) / 1000));
      previous = now;
      analyser.getFloatTimeDomainData(samples);
      let sum = 0;
      for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i];
      // Lift spoken-word RMS into a useful 0..1 control range without using it
      // as a brightness signal. Attack is 30ms; release is 400ms.
      const target = Math.min(1, Math.max(0, (Math.sqrt(sum / samples.length) - .008) * 4.5));
      const timeConstant = target > smoothed ? .03 : .4;
      smoothed += (target - smoothed) * (1 - Math.exp(-delta / timeConstant));
      return smoothed;
    },
    suspend() { if (context.state === 'running') void context.suspend(); },
    dispose() {
      element.pause();
      element.removeAttribute('src');
      element.load();
      source.disconnect(); analyser.disconnect(); gain.disconnect();
      void context.close();
    },
  };
}

export type OrbAudio = ReturnType<typeof createOrbAudio>;
