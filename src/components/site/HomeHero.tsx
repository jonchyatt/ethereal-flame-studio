'use client';

import { useCallback, useState } from 'react';
import { HeroArt } from './AudioAtmosphere';

export function HomeHero() {
  const [listening, setListening] = useState(false);
  const toggleScene = useCallback(() => {
    document.dispatchEvent(new Event('waia:hero-orb-toggle'));
  }, []);

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
      <HeroArt onListeningChange={setListening} />
      <div className="hero-action">
        <button
          type="button"
          className={`button primary ${listening ? 'is-listening' : ''}`}
          onClick={toggleScene}
          aria-pressed={listening}
        >
          {listening ? 'Pause scene' : 'Listen to the scene'} <span aria-hidden="true">{listening ? '' : '→'}</span>
        </button>
      </div>
    </section>
  );
}
