'use client';

import { useState } from 'react';
import { Clip, clips } from '@/lib/site/content';
import { ClipCredits, ClipPlayer } from './MediaPlayer';

/** Which clip is current, and whether it just ended. Shared by /listen and the home hero. */
export function useClipSequence(initialId = '19') {
  const [id, setId] = useState(initialId);
  const [finished, setFinished] = useState(false);
  const clip = clips.find((item) => item.id === id) || clips[0];
  const currentIndex = clips.findIndex((item) => item.id === clip.id);
  const nextClip = clips[(currentIndex + 1) % clips.length];
  const select = (next: string) => {
    setId(next);
    setFinished(false);
  };
  return { clip, nextClip, finished, select, markEnded: () => setFinished(true) };
}

/** The "Continue with another moment" offer: one tap for the next piece. */
export function NextClipPanel({
  nextClip,
  onNext,
}: {
  nextClip: Clip;
  onNext: () => void;
}) {
  return (
    <section className="section quiet-panel" aria-live="polite">
      <h2>Continue with another moment</h2>
      <p>Take your time, then choose what is next.</p>
      <div className="actions">
        <button className="button primary" onClick={onNext}>
          Next: {nextClip.title} · {nextClip.duration}
        </button>
        <a className="button" href="/programs">
          Explore programs
        </a>
      </div>
    </section>
  );
}

export function Listening({ initialId = '19' }: { initialId?: string }) {
  const { clip, nextClip, finished, select: choose, markEnded } =
    useClipSequence(initialId);
  function select(next: string) {
    choose(next);
    history.replaceState(null, '', `/listen?clip=${next}`);
    document.getElementById('selected-title')?.focus();
    document
      .getElementById('selected-title')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  return (
    <>
      <section className="listen-intro">
        <div>
          <p className="eyebrow">Original appreciation · {clip.duration}</p>
          <h1 id="selected-title" tabIndex={-1}>
            {clip.title}
          </h1>
          <p className="lead">{clip.description}</p>
          <p className="meta">
            Jonathan’s voice, made with his own-recording AI clone. No account
            needed.
          </p>
        </div>
        <ClipPlayer clip={clip} onEnded={markEnded} />
      </section>
      {finished && (
        <NextClipPanel nextClip={nextClip} onNext={() => select(nextClip.id)} />
      )}
      <section className="section">
        <div className="section-heading">
          <h2>Your next moment</h2>
          <span className="meta">Choose your own pace</span>
        </div>
        <div className="clip-choices">
          {clips.map((item, index) => (
            <button
              key={item.id}
              onClick={() => select(item.id)}
              className="clip-choice"
              aria-pressed={item.id === clip.id}
            >
              <span className="choice-number">0{index + 1}</span>
              <span>
                <strong>{item.title}</strong>
                <span className="meta">
                  {item.topic} · {item.duration}
                </span>
              </span>
              <span aria-hidden="true">{item.id === clip.id ? '●' : '↗'}</span>
            </button>
          ))}
        </div>
        <ClipCredits clip={clip} />
      </section>
      <section className="section quiet-panel">
        <h2>Free tools from Reset Biology</h2>
        <p>
          Reset Biology is a separate site with free daily tools. What Am I
          Appreciating Now earns nothing from this link.
        </p>
        <a className="text-link" href="https://resetbiology.com/">
          Open the free Reset Biology tools ↗
        </a>
      </section>
    </>
  );
}
