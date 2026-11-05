'use client';

import { useCallback, useRef, useState } from 'react';
import { HeroArt } from './AudioAtmosphere';
import { NextClipPanel, useClipSequence } from './Listening';
import { ClipPlayer } from './MediaPlayer';

export function HomeHero() {
  const [listening, setListening] = useState(false);
  const [begun, setBegun] = useState(false);
  const [clipPlaying, setClipPlaying] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const { clip, nextClip, finished, select, markEnded } = useClipSequence('19');
  const video = () => panel.current?.querySelector('video');
  const toggleScene = useCallback(() => {
    // One voice at a time: the scene and the clip never play together.
    if (!listening) panel.current?.querySelector('video')?.pause();
    document.dispatchEvent(new Event('waia:hero-orb-toggle'));
  }, [listening]);
  function begin() {
    // The player is already mounted (hidden), so play() runs inside this tap.
    if (listening) document.dispatchEvent(new Event('waia:hero-orb-toggle'));
    setBegun(true);
    void video()?.play().catch(() => {});
    panel.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  return (
    <section className="home-hero">
      <div className="hero-copy">
        <p className="eyebrow">A moment, just for you</p>
        <h1>
          Put one hand
          <br />
          on your chest
        </h1>
        <p className="lead">
          Notice what has carried you through today. Voice, ocean, and music
          meet in one living reflection.
        </p>
      </div>
      <HeroArt onListeningChange={setListening} followPage={clipPlaying} />
      <div className="hero-action">
        {!begun && (
          <button type="button" className="button primary" onClick={begin}>
            Begin · 41 sec
          </button>
        )}
        <button
          type="button"
          className={`button ${begun ? 'primary' : ''} ${listening ? 'is-listening' : ''}`}
          onClick={toggleScene}
          aria-pressed={listening}
        >
          {listening ? 'Pause scene' : 'Listen to the scene'}
        </button>
      </div>
      <div
        className="begin-panel"
        ref={panel}
        hidden={!begun}
        onPlay={() => setClipPlaying(true)}
        onPause={() => setClipPlaying(false)}
        onEnded={() => setClipPlaying(false)}
      >
        <p className="eyebrow">
          {clip.title} · {clip.duration}
        </p>
        <ClipPlayer clip={clip} onEnded={markEnded} />
        {finished && <NextClipPanel nextClip={nextClip} onNext={() => select(nextClip.id)} />}
      </div>
    </section>
  );
}
