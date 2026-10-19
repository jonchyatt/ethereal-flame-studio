'use client';

import { useEffect, useRef, useState } from 'react';
import { SLEEP_OPTIONS_MIN, parseResume, resumeSeconds, sleepVolume } from '@/lib/entitlements/audio-logic';

interface Track { id: string; title: string }

const fmt = (s: number) => (Number.isFinite(s) ? `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}` : '0:00');

/** Gated audio player: buffering state, resume where you left off, sleep timer with a slow fade. */
export function AudioPlayer({ programId, tracks }: { programId: string; tracks: Track[] }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [pos, setPos] = useState(0);
  const [dur, setDur] = useState(0);
  const [error, setError] = useState('');
  const [sleepEnds, setSleepEnds] = useState<number | null>(null);
  const [, tick] = useState(0);
  const storeKey = `waia:resume:${programId}`;
  const track = tracks[current];
  const src = `/api/programs/${encodeURIComponent(programId)}/audio/${encodeURIComponent(track.id)}`;

  // Sleep timer: fade the volume over the last seconds, then pause.
  useEffect(() => {
    if (sleepEnds === null) return;
    const t = setInterval(() => {
      const a = audio.current;
      const v = sleepVolume(Date.now(), sleepEnds);
      if (a) a.volume = v;
      if (v <= 0) {
        a?.pause();
        if (a) a.volume = 1;
        setSleepEnds(null);
      }
      tick((n) => n + 1);
    }, 500);
    return () => { clearInterval(t); if (audio.current) audio.current.volume = 1; };
  }, [sleepEnds]);

  function saveResume() {
    const a = audio.current;
    if (!a) return;
    try { localStorage.setItem(storeKey, JSON.stringify({ trackId: track.id, seconds: a.currentTime })); } catch { /* private mode */ }
  }

  function onLoaded() {
    const a = audio.current!;
    setDur(a.duration);
    let saved = null;
    try { saved = parseResume(localStorage.getItem(storeKey)); } catch { /* ignore */ }
    const at = resumeSeconds(saved, track.id, a.duration);
    if (at > 0) a.currentTime = at;
  }

  function toggle() {
    const a = audio.current!;
    if (a.paused) a.play().catch(() => setError('Playback could not start. Try again.'));
    else a.pause();
  }

  const minsLeft = sleepEnds === null ? 0 : Math.max(0, Math.ceil((sleepEnds - Date.now()) / 60000));

  return (
    <section aria-label="Audio player" style={{ margin: '24px 0', padding: 16, border: '1px solid #333', borderRadius: 12 }}>
      <audio
        ref={audio}
        key={track.id}
        src={src}
        preload="metadata"
        onLoadedMetadata={onLoaded}
        onDurationChange={(e) => setDur(e.currentTarget.duration)}
        onPlay={() => { setPlaying(true); setError(''); }}
        onPause={() => { setPlaying(false); saveResume(); }}
        onWaiting={() => setBuffering(true)}
        onCanPlay={() => setBuffering(false)}
        onPlaying={() => setBuffering(false)}
        onTimeUpdate={(e) => { setPos(e.currentTarget.currentTime); if (Math.floor(e.currentTarget.currentTime) % 5 === 0) saveResume(); }}
        onEnded={() => { setPlaying(false); try { localStorage.removeItem(storeKey); } catch { /* ignore */ } }}
        onError={() => setError(
          'This audio could not be loaded. If you have access, it may not have been handed over yet.',
        )}
      />
      {tracks.length > 1 && (
        <label style={{ display: 'block', marginBottom: 12 }}>
          Track{' '}
          <select value={current} onChange={(e) => { saveResume(); setCurrent(Number(e.target.value)); setPos(0); setDur(0); setPlaying(false); }}>
            {tracks.map((t, i) => <option key={t.id} value={i}>{t.title}</option>)}
          </select>
        </label>
      )}
      <p style={{ margin: '0 0 8px' }}><strong>{track.title}</strong></p>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={{ padding: '8px 18px', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <input
          type="range" aria-label="Seek" min={0} max={dur || 0} step={1} value={Math.min(pos, dur || 0)}
          onChange={(e) => { if (audio.current) audio.current.currentTime = Number(e.target.value); }}
          style={{ flex: 1 }}
        />
        <span aria-live="off" style={{ fontVariantNumeric: 'tabular-nums', fontSize: 14 }}>{fmt(pos)} / {fmt(dur)}</span>
      </div>
      {buffering && <p role="status" style={{ fontSize: 14, opacity: 0.8 }}>Buffering…</p>}
      {error && <p role="alert" style={{ fontSize: 14 }}>{error}</p>}
      <div style={{ marginTop: 12, fontSize: 14 }}>
        <label>
          Sleep timer{' '}
          <select
            value={sleepEnds === null ? '' : 'on'}
            onChange={(e) => {
              const m = Number(e.target.value);
              setSleepEnds(m > 0 ? Date.now() + m * 60000 : null);
            }}
          >
            <option value="">Off</option>
            {sleepEnds !== null && <option value="on" disabled>{minsLeft} min left</option>}
            {SLEEP_OPTIONS_MIN.map((m) => <option key={m} value={m}>{m} minutes</option>)}
          </select>
        </label>
        {sleepEnds !== null && <span style={{ marginLeft: 8, opacity: 0.8 }}>Fades out and pauses in about {minsLeft} min.</span>}
      </div>
    </section>
  );
}
