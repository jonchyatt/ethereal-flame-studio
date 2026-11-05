'use client';

import { useState } from 'react';
import { clips } from '@/lib/site/content';
import { ClipCredits, ClipPlayer, MediaPlayer } from './MediaPlayer';

export function Listening({ initialId = '19' }: { initialId?: string }) {
  const [id, setId] = useState(initialId);
  const [finished, setFinished] = useState(false);
  const clip = clips.find((item) => item.id === id) || clips[0];
  function select(next: string) {
    setId(next);
    setFinished(false);
    history.replaceState(null, '', `/listen?clip=${next}`);
    document.getElementById('selected-title')?.focus();
    document
      .getElementById('selected-title')
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  const currentIndex = clips.findIndex((item) => item.id === clip.id);
  const nextClip = clips[(currentIndex + 1) % clips.length];
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
          <a className="text-link" href="#longer">
            Stay for a longer reading ↓
          </a>
        </div>
        <ClipPlayer clip={clip} onEnded={() => setFinished(true)} />
      </section>
      {finished && (
        <section className="section quiet-panel" aria-live="polite">
          <h2>Continue with another moment</h2>
          <p>Take your time, then choose what is next.</p>
          <div className="actions">
            <button className="button primary" onClick={() => select(nextClip.id)}>
              Next: {nextClip.title} · {nextClip.duration}
            </button>
            <a className="button" href="/programs">
              Explore programs
            </a>
          </div>
        </section>
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
      <Reading />
      <section className="section quiet-panel">
        <h2>Looking for the food-related practice?</h2>
        <p>A Gentle Reset is a separate, ten-minute hypnosis sample.</p>
        <a className="text-link" href="/programs/advanced-hypnosis-sessions">
          Explore the food-relationship sample →
        </a>
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

export function Reading() {
  return (
    <section id="longer" className="section reading-section">
      <div>
        <p className="eyebrow">Stay longer</p>
        <h2>Serenity</h2>
        <p>Reading excerpt · 3:58</p>
        <p>
          From <em>As a Man Thinketh</em>, by James Allen. Read by Mark Cawley.
        </p>
        <p className="meta">
          A complete chapter reading, offered as an excerpt for reflection. The
          planned twenty-minute session is still in preparation.
        </p>
        <p className="meta">
          LibriVox recording · Public domain in the United States.{' '}
          <a href="https://librivox.org/pages/public-domain/">
            Recording licence ↗
          </a>
        </p>
        <a className="text-link" href="/media/reading/serenity.txt">
          Read the full text and provenance
        </a>
      </div>
      <MediaPlayer
        src="/media/reading/serenity.mp3"
        title="Serenity — Reading excerpt"
        duration="3:58"
        transcriptHref="/media/reading/serenity.txt"
      />
    </section>
  );
}
