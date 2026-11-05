'use client';

import { useRef, useState } from 'react';
import { Clip, MUSIC_CREDIT, VOICE_CREDIT } from '@/lib/site/content';
import { MotionControl } from './AudioAtmosphere';

type Props = {
  src: string;
  title: string;
  duration: string;
  poster?: string;
  portrait?: boolean;
  captions?: string;
  transcriptHref?: string;
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
  transcriptHref,
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
    onPlay: () => {
      setPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title,
          artist: 'What Am I Appreciating Now',
          album: 'Original listening',
          artwork: poster
            ? [{ src: poster, sizes: '1080x1920', type: 'image/png' }]
            : [{ src: '/brand/carving/04.png', sizes: '1024x1024', type: 'image/png' }],
        });
        navigator.mediaSession.playbackState = 'playing';
      }
    },
    onPause: () => {
      setPlaying(false);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
    },
    onError: () => {
      setError(true);
      setLoading(false);
    },
    onEnded: () => {
      setPlaying(false);
      setEnded(true);
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
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
        {transcriptHref && (
          <a className="button" href={transcriptHref}>
            Read transcript
          </a>
        )}
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

export function ClipPlayer({
  clip,
  label,
  onEnded,
}: {
  clip: Clip;
  label?: string;
  onEnded?: () => void;
}) {
  return (
    <MediaPlayer
      key={clip.id}
      src={`/media/appreciation/${clip.id}.mp4`}
      poster={`/media/appreciation/${clip.id}.png`}
      title={clip.title}
      duration={clip.duration}
      portrait
      label={label}
      transcriptHref={`/listen#clip-${clip.id}-transcript`}
      onEnded={onEnded}
    />
  );
}

export function ClipCredits({ clip }: { clip: Clip }) {
  return (
    <div className="credits" id={`clip-${clip.id}-transcript`}>
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
