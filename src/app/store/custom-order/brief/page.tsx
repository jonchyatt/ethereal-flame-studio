'use client';
import { ScrollPage } from '@/components/site/scrollcraft/ScrollPage';
import '@/components/site/scrollcraft/commerce.css';


import { useEffect, useState } from 'react';
import {
  LENGTHS,
  MUSIC,
  VOICES,
  VR_SCENES,
} from '@/lib/custom-orders/brief-options';

const field = {
  display: 'block',
  width: '100%',
  padding: 8,
  margin: '6px 0 16px',
} as const;

export default function CustomSessionBrief() {
  const [kind, setKind] = useState<'hypnosis' | 'vr'>('hypnosis');
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('kind') === 'vr') {
      setKind('vr');
    }
  }, []);
  const [f, setF] = useState({
    goal: '',
    lengthMinutes: 20,
    voice: 'no-preference',
    music: 'no-preference',
    vrScene: 'forest',
    vrSceneNote: '',
    vrComfortFlag: false,
    safetyNotes: '',
    acknowledgeSafeUse: false,
    contact: '',
    website: '',
  });
  const [msg, setMsg] = useState('');
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    const { contact, website, vrScene, vrSceneNote, vrComfortFlag, ...rest } =
      f;
    const brief = {
      kind,
      ...rest,
      ...(kind === 'vr' ? { vrScene, vrSceneNote, vrComfortFlag } : {}),
    };
    try {
      const res = await fetch('/api/custom-orders/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief, contact, website }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.reference) setReference(data.reference);
      else
        setMsg(
          (
            data.issues ?? [
              data.error ?? 'That did not go through. Please try again.',
            ]
          ).join(' '),
        );
    } catch {
      setMsg(
        'We could not connect. Your answers are still here; please try again.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <ScrollPage name="brief" className="narrow">
      <h1>Describe your custom session</h1>
      <p>
        Describe the session you have in mind. Sending a brief does not take
        payment.
      </p>
      {reference ? (
        <section role="status">
          <h2>Your brief is in.</h2>
          <p>We reply by email within a few days. Nothing is charged.</p>
          <p>Keep this private reference to check the response:</p>
          <p>
            <code>{reference}</code>
          </p>
          <p>
            <a
              data-sc-primary href={`/store/custom-order#ref=${encodeURIComponent(reference)}`}
              style={{ color: '#9cf' }}
            >
              See where your request stands
            </a>
          </p>
        </section>
      ) : (
        <form onSubmit={submit} data-sc-act="brief" data-sc-flow>
          <label>
            Kind of session
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as 'hypnosis' | 'vr')}
              style={field}
            >
              <option value="hypnosis">Hypnosis (audio)</option>
              <option value="vr">VR</option>
            </select>
          </label>
          <label>
            What would you like it to help with? (up to 300 characters)
            <textarea
              required
              maxLength={300}
              value={f.goal}
              onChange={(e) => set('goal', e.target.value)}
              style={field}
              rows={3}
              aria-describedby="brief-goal-count"
            />
          </label>
          <p id="brief-goal-count" className="meta">
            {300 - f.goal.length} characters remaining.
          </p>
          <label>
            Your email (we reply here; never shown publicly)
            <input
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              value={f.contact}
              onChange={(e) => set('contact', e.target.value)}
              style={field}
            />
          </label>
          <details className="brief-options">
            <summary>Optional preferences</summary>
            <p className="meta">
              These are requests. Feasibility, timing and revisions are
              discussed before any agreement.
            </p>
            <label>
              Length
              <select
                value={f.lengthMinutes}
                onChange={(e) => set('lengthMinutes', Number(e.target.value))}
                style={field}
              >
                {LENGTHS.map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
              </select>
            </label>
            <label>
              Voice
              <select
                value={f.voice}
                onChange={(e) => set('voice', e.target.value)}
                style={field}
              >
                {Object.entries(VOICES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Music
              <select
                value={f.music}
                onChange={(e) => set('music', e.target.value)}
                style={field}
              >
                {Object.entries(MUSIC).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            {kind === 'vr' && (
              <>
                <label>
                  Scene
                  <select
                    value={f.vrScene}
                    onChange={(e) => set('vrScene', e.target.value)}
                    style={field}
                  >
                    {Object.entries(VR_SCENES).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Anything to add about the scene (up to 100 characters)
                  <input
                    maxLength={100}
                    value={f.vrSceneNote}
                    onChange={(e) => set('vrSceneNote', e.target.value)}
                    style={field}
                    aria-describedby="brief-scene-count"
                  />
                </label>
                <p id="brief-scene-count" className="meta">
                  {100 - f.vrSceneNote.length} characters remaining.
                </p>
                <label style={{ display: 'block', marginBottom: 16 }}>
                  <input
                    type="checkbox"
                    checked={f.vrComfortFlag}
                    onChange={(e) => set('vrComfortFlag', e.target.checked)}
                  />{' '}
                  I am sensitive to motion sickness or flashing light
                </label>
              </>
            )}
            <label>
              Anything we should know for your safety or comfort (optional, up to 300 characters)
              <textarea
                maxLength={300}
                value={f.safetyNotes}
                onChange={(e) => set('safetyNotes', e.target.value)}
                style={field}
                rows={2}
                aria-describedby="brief-safety-help brief-safety-count"
              />
            </label>
            <p id="brief-safety-help" className="meta">
              Please share only production preferences. Do not include diagnoses,
              medical history, or anything else you would not want read.{' '}
              <a href="/legal/privacy">Privacy</a>
            </p>
            <p id="brief-safety-count" className="meta">
              {300 - f.safetyNotes.length} characters remaining.
            </p>
            <input
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={f.website}
              onChange={(e) => set('website', e.target.value)}
              style={{ position: 'absolute', left: '-9999px' }}
            />
          </details>
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input
              type="checkbox"
              required
              checked={f.acknowledgeSafeUse}
              onChange={(e) => set('acknowledgeSafeUse', e.target.checked)}
            />{' '}
            I understand a session is never to be used while driving or
            operating anything
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Send my brief'}
          </button>
          {msg && <p role="status">{msg}</p>}
        </form>
      )}
      <p>
        <a href="/store/custom-order">← Custom sessions and request lookup</a>
      </p>
      <p className="meta">
        Your request and email stay private.{' '}
        <a href="/legal/privacy">Privacy</a> · <a href="/support">Support</a>
      </p>
    </ScrollPage>
  );
}
