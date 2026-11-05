'use client';

import { useRef, useState } from 'react';

export type Practice = { title: string; seconds: number; src: string; poster: string; youtube: string };

/**
 * The front door's one button. A tap opens the first practice in a native
 * dialog and plays it with sound (the tap is the permission; nothing plays on
 * its own). When one ends, the next is offered as a button, never started
 * automatically. Without JavaScript the link opens the first clip directly.
 */
export function BeginPlayer({ practices, channel }: { practices: Practice[]; channel: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [i, setI] = useState(0);
  const [ended, setEnded] = useState(false);
  const p = practices[i];
  const next = practices[i + 1];

  const play = (n: number) => {
    const v = video.current;
    if (!v) return;
    setI(n);
    setEnded(false);
    v.src = practices[n].src;
    v.poster = practices[n].poster;
    void v.play().catch(() => {}); // a refused play leaves the controls up for a second tap
  };

  return (
    <>
      <a className="begin" href={practices[0].src}
        onClick={(e) => { e.preventDefault(); dialog.current?.showModal(); play(0); }}>
        Begin · {practices[0].seconds} sec
      </a>
      <dialog ref={dialog} className="player" aria-labelledby="player-title"
        onClose={() => video.current?.pause()}>
        <video ref={video} className="player__video" controls playsInline preload="none" onEnded={() => setEnded(true)} />
        <div className="player__bar">
          <p id="player-title" className="player__title">{p.title} <span>{p.seconds} sec</span></p>
          {ended && next ? (
            <button type="button" className="begin begin--next" onClick={() => play(i + 1)}>
              Next · {next.title} · {next.seconds} sec
            </button>
          ) : null}
          {ended && !next ? <p className="player__done">That is all three. New pieces arrive on the channel.</p> : null}
          <p className="player__links">
            <a href={ended && !next ? channel : p.youtube} target="_blank" rel="noopener">
              {ended && !next ? 'Visit the channel' : 'Also on YouTube'}
            </a>
            <button type="button" className="player__close" onClick={() => dialog.current?.close()}>Close</button>
          </p>
        </div>
      </dialog>
    </>
  );
}
