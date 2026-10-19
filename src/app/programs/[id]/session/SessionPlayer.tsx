'use client';

import { useEffect, useState } from 'react';
import type { GuidedSession } from '@/lib/entitlements/guided';

/** Steps through a session one at a time. Notes live in this tab's memory only and are never sent anywhere. */
export function SessionPlayer({ session }: { session: GuidedSession }) {
  const [index, setIndex] = useState(-1); // -1 = preface, steps.length = closing
  const [left, setLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const step = session.steps[index];

  useEffect(() => {
    setRunning(false);
    setLeft(step?.seconds ?? null);
  }, [index, step]);

  useEffect(() => {
    if (!running || left === null) return;
    if (left <= 0) { setRunning(false); return; }
    const t = setTimeout(() => setLeft((l) => (l === null ? l : l - 1)), 1000);
    return () => clearTimeout(t);
  }, [running, left]);

  const btn = { padding: '10px 18px', borderRadius: 8, border: '1px solid #555', background: '#1a1a2a', color: '#eee', cursor: 'pointer', marginRight: 8 } as const;
  const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (index < 0) {
    return (
      <section>
        <h1>{session.title}</h1>
        {session.preface && <p style={{ whiteSpace: 'pre-wrap' }}>{session.preface}</p>}
        <p style={{ fontSize: 14, opacity: 0.7 }}>You can stop at any point by closing this page. Nothing you type here is saved or sent.</p>
        <button style={btn} onClick={() => setIndex(0)}>Begin</button>
      </section>
    );
  }
  if (!step) {
    return (
      <section>
        <h1>{session.title}</h1>
        {session.closing && <p style={{ whiteSpace: 'pre-wrap' }}>{session.closing}</p>}
        <button style={btn} onClick={() => { setNotes({}); setIndex(-1); }}>Start again</button>
      </section>
    );
  }
  return (
    <section>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Step {index + 1} of {session.steps.length}</p>
      <h1>{step.title}</h1>
      {step.body && <p style={{ whiteSpace: 'pre-wrap' }}>{step.body}</p>}
      {step.kind === 'prompt' && (
        <label style={{ display: 'block', margin: '16px 0' }}>
          <span style={{ display: 'block', fontSize: 14, opacity: 0.8 }}>{step.noteLabel ?? 'Your note (stays on this page only)'}</span>
          <textarea
            value={notes[step.id] ?? ''}
            onChange={(e) => setNotes((n) => ({ ...n, [step.id]: e.target.value }))}
            rows={4}
            style={{ width: '100%', background: '#12121e', color: '#eee', border: '1px solid #444', borderRadius: 8, padding: 10 }}
          />
        </label>
      )}
      {left !== null && (
        <p aria-live="polite" style={{ fontSize: 28 }}>
          {mmss(left)}{' '}
          {!running && left > 0 && <button style={btn} onClick={() => setRunning(true)}>{left === step.seconds ? 'Start timer' : 'Resume'}</button>}
          {running && <button style={btn} onClick={() => setRunning(false)}>Pause</button>}
        </p>
      )}
      <div style={{ marginTop: 24 }}>
        <button style={btn} onClick={() => setIndex(index - 1)}>Back</button>
        <button style={btn} onClick={() => setIndex(index + 1)}>{index + 1 === session.steps.length ? 'Finish' : 'Next'}</button>
      </div>
    </section>
  );
}
