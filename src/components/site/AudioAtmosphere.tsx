'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createOrbAudio, type OrbAudio, type OrbAudioLevels } from '../scenes/orbAudio';

declare global {
  interface Window {
    /** Home-scene diagnostics are opt-in so capture scripts can verify the real renderer. */
    __heroOrb?: {
      audioState: () => string;
      audioError: () => string | undefined;
      levels: () => OrbAudioLevels;
      stats: () => { frameIntervals: number[]; quality: string } | undefined;
    };
  }
}

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

type OrbRenderer = {
  dispose: () => void;
  setAudioLevels: (levels: OrbAudioLevels) => void;
  setPaused: (paused: boolean) => void;
  stats: () => { frameIntervals: number[]; quality: string };
};

// These are deliberately small, loopable envelopes sampled from the scene's
// two beds. They let the water and stars breathe before a browser gesture can
// release sound; a real analyser takes over as soon as the visitor listens.
const idleOceanEnvelope = [.29, .35, .43, .5, .46, .38, .31, .27, .33, .42, .48, .41];
const idleMusicEnvelope = [.12, .18, .26, .2, .32, .37, .27, .19, .24, .34, .29, .16];

function sampledEnvelope(values: number[], seconds: number) {
  const position = (seconds / 1.6) % values.length;
  const first = Math.floor(position);
  const next = (first + 1) % values.length;
  const blend = position - first;
  return values[first] * (1 - blend) + values[next] * blend;
}

function idleOrbLevels(now: number): OrbAudioLevels {
  const seconds = now / 1000;
  return {
    voice: 0,
    ocean: sampledEnvelope(idleOceanEnvelope, seconds),
    music: sampledEnvelope(idleMusicEnvelope, seconds + .45),
    voiceTone: .38,
  };
}

/** The home scene uses the judged renderer; the carving is strictly its fallback. */
export function HeroArt({
  onListeningChange,
}: {
  onListeningChange?: (listening: boolean) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<OrbRenderer | null>(null);
  const sound = useRef<OrbAudio | null>(null);
  const [live, setLive] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [listening, setListening] = useState(false);
  const audioError = useRef<string | undefined>(undefined);
  const { paused, reduced } = useContext(MotionContext);

  useEffect(() => {
    const target = canvas.current;
    if (!target || reduced) return;
    let cancelled = false;
    void import('../scenes/OrbOceanRenderer')
      .then(({ createOrbOceanRenderer }) => {
        if (cancelled || !canvas.current) return;
        renderer.current = createOrbOceanRenderer(canvas.current, () => {
          if (!cancelled) {
            renderer.current?.dispose();
            renderer.current = null;
            setLive(false);
            setFallback(true);
          }
        });
        if (new URLSearchParams(location.search).get('capture') === '1') {
          window.__heroOrb = {
            audioState: () => sound.current?.context.state ?? 'not-started',
            audioError: () => audioError.current,
            levels: () => sound.current?.levels() ?? idleOrbLevels(performance.now()),
            stats: () => renderer.current?.stats(),
          };
        }
        if (!cancelled) setLive(true);
      })
      .catch(() => {
        if (!cancelled) setFallback(true);
      });
    return () => {
      cancelled = true;
      renderer.current?.dispose();
      renderer.current = null;
      delete window.__heroOrb;
      setLive(false);
    };
  }, [reduced]);

  useEffect(() => {
    let frame = 0;
    const update = (now: number) => {
      renderer.current?.setAudioLevels(
        sound.current?.context.state === 'running'
          ? sound.current.levels()
          : idleOrbLevels(now),
      );
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    renderer.current?.setPaused(paused || reduced);
  }, [paused, reduced]);

  useEffect(
    () => () => {
      sound.current?.dispose();
      sound.current = null;
    },
    [],
  );

  const setSceneListening = useCallback((value: boolean) => {
    setListening(value);
    onListeningChange?.(value);
  }, [onListeningChange]);

  const toggleListening = useCallback(async () => {
    if (reduced) return;
    try {
      const active = (sound.current ??= createOrbAudio());
      // Chromium may create a running context during a gesture even before
      // any of its media elements have begun. The UI state—not context.state—
      // distinguishes that fresh context from an audible scene.
      if (listening) {
        active.suspend();
        setSceneListening(false);
        return;
      }
      await active.resume();
      setSceneListening(true);
      audioError.current = undefined;
    } catch (error) {
      audioError.current = error instanceof Error ? error.message : String(error);
      setSceneListening(false);
    }
  }, [listening, reduced, setSceneListening]);

  useEffect(() => {
    const toggle = () => { void toggleListening(); };
    document.addEventListener('waia:hero-orb-toggle', toggle);
    return () => document.removeEventListener('waia:hero-orb-toggle', toggle);
  }, [toggleListening]);

  return (
    <figure className="hero-art">
      <button
        type="button"
        className={`hero-orb ${live ? 'is-live' : ''} ${listening ? 'is-listening' : ''} ${fallback ? 'is-fallback' : ''}`}
        onClick={toggleListening}
        disabled={reduced || fallback}
        aria-label={listening ? 'Pause the living orb scene' : 'Listen to the living orb scene'}
      >
        <img
          className="hero-orb-fallback"
          src="/brand/carving/05.png"
          alt="Jonathan’s carved wooden vortex, with What Am I Appreciating Now in one continuous inward-facing ring"
          width="2048"
          height="1026"
          fetchPriority="high"
        />
        <canvas
          ref={canvas}
          className="hero-orb-canvas"
          data-presentation="home"
          aria-hidden={!live || reduced || fallback}
          aria-label="A living rainbow orb over a breathing ocean"
        />
      </button>
      <figcaption>
        <span>{listening ? 'The orb is listening with you' : 'Tap the orb, or use Listen'}</span>
      </figcaption>
      <details className="hero-credits">
        <summary aria-label="Scene credits">ⓘ<span className="sr-only">Scene credits</span></summary>
        <p>
          Ocean bed: kingsrow / Freesound #362300 (CC0). Music bed: Kevin
          MacLeod, “Meditation Impromptu 01” (CC BY 4.0).
        </p>
      </details>
    </figure>
  );
}
