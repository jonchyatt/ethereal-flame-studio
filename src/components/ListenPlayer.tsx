'use client';

import { useRef, useState } from 'react';

const buttonStyle = { minHeight: 48, padding: '12px 22px', borderRadius: 8, border: 0, background: '#d6ad63', color: '#111', cursor: 'pointer', font: 'inherit', fontSize: 18, fontWeight: 700 } as const;

/** A plain "Play" button above the browser's own audio bar, with a sentence that says what is happening. */
export function ListenPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [status, setStatus] = useState('Press the Play button to start the session. It is free and takes ten minutes.');
  const [playing, setPlaying] = useState(false);

  async function toggle() {
    const audio = ref.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    try {
      await audio.play();
    } catch {
      setStatus('Your browser did not start the sound. Check that your volume is up and not muted, then press Play again.');
    }
  }

  return (
    <div>
      <button type="button" onClick={toggle} style={buttonStyle} aria-pressed={playing}>
        {playing ? 'Pause the session' : 'Play the session'}
      </button>
      <p role="status" aria-live="polite" style={{ fontSize: 16, margin: '12px 0 16px' }}>{status}</p>
      <audio
        ref={ref}
        controls
        preload="metadata"
        src={src}
        style={{ width: '100%' }}
        aria-label="A Gentle Reset, guided audio"
        onPlaying={() => { setPlaying(true); setStatus('Playing now. Sit down and close your eyes. Press Pause the session to stop.'); }}
        onPause={() => { setPlaying(false); if (!ref.current?.ended) setStatus('Paused. Press Play the session to carry on.'); }}
        onEnded={() => { setPlaying(false); setStatus('The session has finished. To get more sessions by email, type your email address in the box below and press Tell me when.'); }}
        onError={() => { setPlaying(false); setStatus('The audio file could not be loaded. Please reload the page, or write to us from the Support link at the bottom of the page.'); }}
      />
    </div>
  );
}
