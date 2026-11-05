'use client';

import { useRef, useState } from 'react';
import { Clip, MUSIC_CREDIT, VOICE_CREDIT } from '@/lib/site/content';
import { MotionControl } from './AudioAtmosphere';
import { FOOD_TRANSCRIPT } from '@/lib/site/food-transcript';

type Props = {
  src: string;
  title: string;
  duration: string;
  poster?: string;
  portrait?: boolean;
  captions?: string;
  label?: string;
  onEnded?: () => void;
};
export function MediaPlayer({
  src,
  title,
  duration,
  poster,
  portrait,
  captions,
  label = 'Play',
  onEnded,
}: Props) {
  const media = useRef<HTMLVideoElement & HTMLAudioElement>(null);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [loading, setLoading] = useState(false);
  async function play() {
    setError(false);
    setEnded(false);
    if (!media.current) return;
    if (media.current.error) media.current.load();
    if (playing) media.current.pause();
    else {
      setLoading(true);
      try {
        await media.current.play();
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
  }
  const handlers = {
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onError: () => {
      setError(true);
      setLoading(false);
    },
    onEnded: () => {
      setPlaying(false);
      setEnded(true);
      onEnded?.();
    },
    onWaiting: () => setLoading(true),
    onPlaying: () => setLoading(false),
  };
  return (
    <div
      className={`media-player ${portrait ? 'portrait' : 'landscape'}`}
      data-player-title={title}
    >
      {poster ? (
        <div className="reactive-art media-frame">
          <video
            ref={media}
            controls
            playsInline
            preload="metadata"
            poster={poster}
            src={src}
            aria-label={`${title} · ${duration}`}
            {...handlers}
          >
            {captions && (
              <track
                kind="captions"
                src={captions}
                srcLang="en"
                label="English"
              />
            )}
          </video>
        </div>
      ) : (
        <>
          <div className="reactive-art audio-art">
            <img
              src="/brand/carving/05.png"
              alt="The original carved wooden mark"
              width="2048"
              height="1026"
            />
          </div>
          <audio
            ref={media}
            controls
            preload="metadata"
            src={src}
            aria-label={`${title} · ${duration}`}
            {...handlers}
          />
        </>
      )}
      <div className="player-actions">
        <button
          className="button primary"
          onClick={play}
          aria-label={`${playing ? 'Pause' : ended ? 'Replay' : label} ${title} · ${duration}`}
        >
          {loading ? 'Loading…' : playing ? 'Pause' : ended ? 'Replay' : label}{' '}
          · {duration}
        </button>
        <MotionControl />
      </div>
      {error && (
        <div role="alert" className="notice error">
          <p>That recording could not play. Your place on the page is safe.</p>
          <button className="button" onClick={play}>
            Retry playback
          </button>
          <a href={src} className="text-link">
            Open the media file
          </a>
          <a href="/support" className="text-link">
            Get help
          </a>
        </div>
      )}
    </div>
  );
}

export function ClipPlayer({ clip, label }: { clip: Clip; label?: string }) {
  return (
    <MediaPlayer
      key={clip.id}
      src={`/media/appreciation/${clip.id}.mp4`}
      poster={`/media/appreciation/${clip.id}.png`}
      title={clip.title}
      duration={clip.duration}
      portrait
      label={label}
    />
  );
}

export function ClipCredits({ clip }: { clip: Clip }) {
  return (
    <div className="credits">
      <p>
        {VOICE_CREDIT} Original words and visuals from the studio. Flat portrait
        video.
      </p>
      <details>
        <summary>Read the spoken script and credits</summary>
        <p className="transcript">{clip.transcript}</p>
        <p>
          {MUSIC_CREDIT}{' '}
          <a href="https://archive.org/details/CalmPills">
            Source and licence record ↗
          </a>
        </p>
        <p>Script text is provided for reading; it is not timed captions.</p>
      </details>
    </div>
  );
}

export function FoodSample({ compact = false }: { compact?: boolean }) {
  return (
    <figure className={compact ? 'food-sample compact' : 'food-sample'}>
      <figcaption>
        <p className="eyebrow">Food-relationship sample · 10:35</p>
        <h3>A Gentle Reset: Making Peace with Food</h3>
      </figcaption>
      <MediaPlayer
        src="/samples/gentle-reset-listen.m4a"
        title="A Gentle Reset: Making Peace with Food"
        duration="10:35"
      />
      <p className="meta">
        Audio · {VOICE_CREDIT} Words: Reset Biology, “Reset Your Relationship
        with Food”.
      </p>
      <p className="meta">
        A topic-specific practice about food, eating and your relationship with
        it.
      </p>
      <details className="credits">
        <summary>Read the sample transcript</summary>
        <p>{FOOD_TRANSCRIPT}</p>
        <a className="text-link" href="/samples/gentle-reset-free-sample.vtt">
          Original timed caption file
        </a>
      </details>
    </figure>
  );
}
