'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';

const MotionContext = createContext({
  paused: false,
  reduced: false,
  toggle: () => {},
});

/** One audio graph per mounted public shell. Every same-origin player feeds it. */
export function AudioAtmosphere({ children }: { children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    let context: AudioContext | undefined;
    let analyser: AnalyserNode | undefined;
    let active: HTMLMediaElement | undefined;
    const sources = new Map<HTMLMediaElement, MediaElementAudioSourceNode>();
    let frame = 0,
      smoothed = 0;
    const samples = new Float32Array(512);
    const play = (event: Event) => {
      const media = event.target;
      if (
        !(media instanceof HTMLMediaElement) ||
        !root.current?.contains(media)
      )
        return;
      root.current.querySelectorAll('audio,video').forEach((other) => {
        if (other !== media) (other as HTMLMediaElement).pause();
      });
      active = media;
      try {
        if (
          new URL(media.currentSrc || media.src, location.href).origin !==
          location.origin
        )
          return;
        context ??= new AudioContext();
        if (!analyser) {
          analyser = context.createAnalyser();
          analyser.fftSize = 1024;
          analyser.connect(context.destination);
        }
        if (!sources.has(media)) {
          const source = context.createMediaElementSource(media);
          source.connect(analyser);
          sources.set(media, source);
        }
        void context.resume().catch(() => {});
      } catch {
        /* Native playback remains usable when Web Audio is unavailable. */
      }
    };
    const tick = (time: number) => {
      let level = 0;
      if (analyser && active && !active.paused && !active.ended) {
        analyser.getFloatTimeDomainData(samples);
        level = Math.min(
          1,
          Math.sqrt(
            samples.reduce((sum, sample) => sum + sample * sample, 0) /
              samples.length,
          ) * 5,
        );
      }
      smoothed += (level - smoothed) * (level > smoothed ? 0.3 : 0.09);
      root.current?.style.setProperty('--audio-level', smoothed.toFixed(4));
      root.current?.style.setProperty(
        '--breath',
        (0.5 + 0.5 * Math.sin(time / 2200)).toFixed(4),
      );
      frame = requestAnimationFrame(tick);
    };
    document.addEventListener('play', play, true);
    frame = requestAnimationFrame(tick);
    return () => {
      document.removeEventListener('play', play, true);
      cancelAnimationFrame(frame);
      sources.forEach((source, media) => {
        media.pause();
        source.disconnect();
      });
      void context?.close();
    };
  }, []);
  return (
    <MotionContext.Provider
      value={{
        paused: paused || reduced,
        reduced,
        toggle: () => setPaused((value) => !value),
      }}
    >
      <div
        ref={root}
        className="public-site"
        data-motion={paused || reduced ? 'off' : 'on'}
      >
        {children}
      </div>
    </MotionContext.Provider>
  );
}

export function MotionControl() {
  const { paused, reduced, toggle } = useContext(MotionContext);
  return (
    <button
      className="motion-control"
      onClick={toggle}
      aria-pressed={paused}
      disabled={reduced}
      title={
        reduced ? 'Motion is off because of your device preference' : undefined
      }
    >
      {reduced ? 'Motion off' : paused ? 'Resume motion' : 'Pause motion'}
    </button>
  );
}

/** The sole hero-art swap point. Replace only after the living scene passes its judge. */
export function HeroArt() {
  return (
    <figure className="hero-art">
      <div className="reactive-art">
        <img
          src="/brand/carving/05.png"
          alt="Jonathan’s carved wooden vortex, with What Am I Appreciating Now in one continuous inward-facing ring"
          width="2048"
          height="1026"
          fetchPriority="high"
        />
      </div>
      <figcaption>
        <span>From Jonathan’s original carving</span>
        <MotionControl />
      </figcaption>
    </figure>
  );
}
