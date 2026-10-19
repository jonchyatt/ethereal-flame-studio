'use client';

import { useState } from 'react';
import { LENGTHS, MUSIC, VOICES, VR_SCENES } from '@/lib/custom-orders/brief-options';

const field = { display: 'block', width: '100%', padding: 8, margin: '6px 0 16px' } as const;

export default function CustomSessionBrief() {
  const [kind, setKind] = useState<'hypnosis' | 'vr'>('hypnosis');
  const [f, setF] = useState({ goal: '', lengthMinutes: 20, voice: 'no-preference', music: 'no-preference', vrScene: 'forest', vrSceneNote: '', vrComfortFlag: false, safetyNotes: '', acknowledgeSafeUse: false, contact: '', website: '' });
  const [msg, setMsg] = useState('');
  const [reference, setReference] = useState('');
  const set = (k: string, v: unknown) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg('');
    const { contact, website, vrScene, vrSceneNote, vrComfortFlag, ...rest } = f;
    const brief = { kind, ...rest, ...(kind === 'vr' ? { vrScene, vrSceneNote, vrComfortFlag } : {}) };
    const res = await fetch('/api/custom-orders/brief', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ brief, contact, website }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setReference(data.reference);
    else setMsg(res.status === 503 ? 'Custom sessions are not open yet.' : (data.issues ?? [data.error ?? 'That did not go through.']).join(' '));
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Describe your custom session</h1>
      <p>What Am I Appreciating Now. Not yet on sale: nothing is charged here. You will get a reference to check where your request stands, and a quote is an offer, not a payment taken.</p>
      {reference ? (
        <section role="status">
          <p>Thank you. Keep this reference; it is shown once:</p>
          <p><code>{reference}</code></p>
          <p><a href={`/store/custom-order#ref=${encodeURIComponent(reference)}`} style={{ color: '#9cf' }}>See where your request stands</a></p>
        </section>
      ) : (
        <form onSubmit={submit}>
          <label>Kind of session
            <select value={kind} onChange={(e) => setKind(e.target.value as 'hypnosis' | 'vr')} style={field}>
              <option value="hypnosis">Hypnosis (audio)</option>
              <option value="vr">VR</option>
            </select>
          </label>
          <label>What would you like it to help with?
            <textarea required maxLength={300} value={f.goal} onChange={(e) => set('goal', e.target.value)} style={field} rows={3} />
          </label>
          <label>Length
            <select value={f.lengthMinutes} onChange={(e) => set('lengthMinutes', Number(e.target.value))} style={field}>
              {LENGTHS.map((n) => <option key={n} value={n}>{n} minutes</option>)}
            </select>
          </label>
          <label>Voice
            <select value={f.voice} onChange={(e) => set('voice', e.target.value)} style={field}>
              {Object.entries(VOICES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>Music
            <select value={f.music} onChange={(e) => set('music', e.target.value)} style={field}>
              {Object.entries(MUSIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          {kind === 'vr' && (
            <>
              <label>Scene
                <select value={f.vrScene} onChange={(e) => set('vrScene', e.target.value)} style={field}>
                  {Object.entries(VR_SCENES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label>Anything to add about the scene
                <input maxLength={100} value={f.vrSceneNote} onChange={(e) => set('vrSceneNote', e.target.value)} style={field} />
              </label>
              <label style={{ display: 'block', marginBottom: 16 }}>
                <input type="checkbox" checked={f.vrComfortFlag} onChange={(e) => set('vrComfortFlag', e.target.checked)} /> I am sensitive to motion sickness or flashing light
              </label>
            </>
          )}
          <label>Anything we should know for your safety or comfort (optional)
            <textarea maxLength={300} value={f.safetyNotes} onChange={(e) => set('safetyNotes', e.target.value)} style={field} rows={2} />
          </label>
          <label>How can we reach you (optional)
            <input maxLength={200} value={f.contact} onChange={(e) => set('contact', e.target.value)} style={field} />
          </label>
          <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" value={f.website} onChange={(e) => set('website', e.target.value)} style={{ position: 'absolute', left: '-9999px' }} />
          <label style={{ display: 'block', marginBottom: 16 }}>
            <input type="checkbox" required checked={f.acknowledgeSafeUse} onChange={(e) => set('acknowledgeSafeUse', e.target.checked)} /> I understand a session is never to be used while driving or operating anything
          </label>
          <button type="submit">Send my brief</button>
          {msg && <p role="status">{msg}</p>}
        </form>
      )}
    </main>
  );
}
