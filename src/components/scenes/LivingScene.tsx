'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { Quality, SceneKind, SceneStats, createSceneRenderer } from './renderer';
import { createOrbAudio, type OrbAudio, type OrbAudioLevels } from './orbAudio';
import { createWaterfallAudio, type WaterfallAudio } from './waterfallAudio';
import styles from './scenes.module.css';
import './public-scene.css';

declare global {
  interface Window {
    /** Read-only diagnostics and capture output; only installed with ?capture=1. */
    __livingScene?: {
      stats: () => SceneStats; audio: () => MediaStream | undefined; audioState: () => string;
      level: () => number; levels: () => OrbAudioLevels;
    };
  }
}

export default function LivingScene({ kind, title, publicControls = false }: { kind: SceneKind; title?: string; publicControls?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<ReturnType<typeof createSceneRenderer> | null>(null);
  const sound = useRef<(WaterfallAudio | OrbAudio) | null>(null);
  const [controls, setControls] = useState(publicControls);
  const [started, setStarted] = useState(false);
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let audioFrame = 0;
    const query = new URLSearchParams(location.search);
    setControls(publicControls || query.get('controls') === '1');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    // Keep the waterfall's original renderer and bundle independent of the
    // reflective three-dimensional orb scene.
    const renderer = kind === 'orb-ocean'
      ? import('./OrbOceanRenderer').then(({ createOrbOceanRenderer }) =>
          (target: HTMLCanvasElement, _kind: SceneKind, onFailure: () => void) => createOrbOceanRenderer(target, onFailure))
      : import('./renderer').then(module => module.createSceneRenderer);
    renderer.then(createSceneRenderer => {
      if (cancelled || !canvas.current) return;
      try {
        const scene = createSceneRenderer(canvas.current, kind, () => setFailed(true));
        engine.current = scene;
        if (query.get('capture') === '1') {
          window.__livingScene = { stats: scene.stats, audio: () => {
            const active = sound.current;
            return active && 'stream' in active ? active.stream : undefined;
          },
            audioState: () => sound.current?.context.state ?? 'not-started',
            level: () => {
              const active = sound.current;
              return active && 'level' in active ? active.level() : 0;
            },
            levels: () => {
              const active = sound.current;
              return active && 'levels' in active ? active.levels() : { voice: 0, ocean: 0, music: 0, voiceTone: .38 };
            } };
        }
      } catch { setFailed(true); }
    }).catch(() => { if (!cancelled) setFailed(true); });
    const visibility = () => {
      if (document.hidden) sound.current?.suspend();
      else void sound.current?.resume().catch(() => { /* A fresh gesture can resume audio. */ });
    };
    document.addEventListener('visibilitychange', visibility);
    const sampleAudio = () => {
      audioFrame = 0;
      const active = sound.current;
      engine.current?.setAudioLevels(active && 'levels' in active
        ? active.levels() : { voice: 0, ocean: 0, music: 0, voiceTone: .38 });
      audioFrame = requestAnimationFrame(sampleAudio);
    };
    const motionChange = () => {
      setReducedMotion(motion.matches);
      if (!audioFrame) audioFrame = requestAnimationFrame(sampleAudio);
    };
    motionChange(); motion.addEventListener('change', motionChange);
    return () => {
      cancelled = true; engine.current?.dispose(); engine.current = null;
      sound.current?.dispose(); sound.current = null;
      delete window.__livingScene;
      document.removeEventListener('visibilitychange', visibility);
      motion.removeEventListener('change', motionChange);
      cancelAnimationFrame(audioFrame);
    };
  }, [kind, publicControls]);

  const startSound = useCallback(() => {
    if (kind === 'orb-ocean' && reducedMotion) return;
    try {
      sound.current ??= kind === 'orb-ocean' ? createOrbAudio() : createWaterfallAudio();
      void sound.current.resume().then(() => setStarted(true)).catch(() => setStarted(false));
    } catch { setStarted(false); }
  }, [kind, reducedMotion]);

  const toggleMute = () => {
    const value = !muted;
    setMuted(value);
    const active = sound.current;
    if (active && 'setMuted' in active) active.setMuted(value);
  };

  return (
    <main className={`${styles.scene} ${kind === 'rainbow-falls' ? styles.falls : styles.orb}`}
      data-scene-ui={publicControls ? kind : undefined}
      aria-label={kind === 'orb-ocean' ? 'A living rainbow orb on a starry ocean' : 'Rainbow light falling from a storm cloud into water'}
      onPointerDown={kind === 'rainbow-falls' ? startSound : undefined}
      onKeyDown={event => { if (kind === 'rainbow-falls' && (event.key === 'Enter' || event.key === ' ')) startSound(); }}
      tabIndex={kind === 'rainbow-falls' ? 0 : undefined}>
      <header className={publicControls ? 'scene-toolbar' : undefined}
        onKeyDown={publicControls ? event => event.stopPropagation() : undefined}>
        {publicControls && title ? <h1 className="scene-title">{title}</h1> : null}
        {publicControls ? <Link className="button primary scene-home" href="/" data-sc-primary>Home</Link> : null}
        {controls ? <aside className={`${styles.controls} scene-control-panel`} aria-label="Scene controls" onPointerDown={event => event.stopPropagation()}>
          <label>Quality <select defaultValue="auto" onChange={event => engine.current?.setQuality(event.target.value as Quality)}>
            <option value="auto">Automatic</option><option value="low">Low</option>
            <option value="medium">Medium</option><option value="high">High</option>
          </select></label>
          <button type="button" data-sc-primary={publicControls || undefined} onClick={() => { engine.current?.setPaused(!paused); setPaused(!paused); }}>
            {paused ? 'Resume motion' : 'Pause motion'}</button>
          {kind === 'rainbow-falls' && !started ? <button type="button" onClick={startSound}>Start sound</button> : null}
        </aside> : null}
      </header>
      <canvas ref={canvas} className={styles.canvas} style={failed ? { opacity: 0 } : undefined} aria-hidden="true" />
      <span className={failed && publicControls ? 'scene-status' : styles.srOnly}>{failed ? 'The animated scene is unavailable; a still ambient glow is shown.' :
        kind === 'rainbow-falls' ? 'Tap or press Enter to start the waterfall sound. A mute button appears after sound starts.' :
          'A living rainbow orb, a breathing ocean, and twinkling stars.'}</span>
      {kind === 'orb-ocean' ? <div className={`${styles.orbAudio} scene-audio`}>
        {!started ? <button type="button" className={styles.begin} onClick={startSound} disabled={reducedMotion}>
          {reducedMotion ? 'Motion reduced' : 'Begin'}
        </button> : null}
        <p>Ocean: kingsrow / Freesound #362300 (CC0) · Music: Kevin MacLeod, CC BY 4.0</p>
      </div> : null}
      {kind === 'rainbow-falls' && started ? (
        <button type="button" className={`${styles.mute} scene-mute`} onPointerDown={event => event.stopPropagation()}
          onKeyDown={publicControls ? event => event.stopPropagation() : undefined}
          onClick={toggleMute} aria-label={muted ? 'Unmute waterfall' : 'Mute waterfall'} aria-pressed={muted}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
            <path d="M11 5 6 9H3v6h3l5 4z" />
            {muted ? <path d="m16 9 5 6m0-6-5 6" /> : <><path d="M15 8a6 6 0 0 1 0 8" /><path d="M18 5a10 10 0 0 1 0 14" /></>}
          </svg>
          {publicControls ? <span>{muted ? 'Unmute waterfall' : 'Mute waterfall'}</span> : null}
        </button>
      ) : null}
    </main>
  );
}
