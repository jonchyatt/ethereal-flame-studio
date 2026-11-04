'use client';

import { useState } from 'react';

export default function RemovePage() {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = { display: 'block', width: '100%', padding: 10, margin: '6px 0 16px', background: '#14142a', color: '#eee', border: '1px solid #8c8c9e', borderRadius: 8 } as const;
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 24 }}>
        <a href="/" style={{ color: 'inherit' }}>Home</a>
        <a href="/store" style={{ color: 'inherit' }}>Store</a>
        <a href="/patrons" style={{ color: 'inherit' }}>← Patron wall</a>
      </nav>
      <h1>Remove my name from the patron wall</h1>
      <div role="status">
      {sent && (
        <p>Received. If that code matches a name, it is removed before the next render. Names already in a published video stay unless that video is edited or withdrawn.</p>
      )}
      </div>
      {error && <p role="alert" style={{ color: '#ff9a9a' }}>{error}</p>}
      {!sent && (
        <form onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          try {
            const res = await fetch('/api/patrons/removal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consentRef: ref, note }) });
            if (res.ok) setSent(true);
            else setError(res.status === 429 ? 'Too many requests from here. Please try again in an hour.' : 'Something went wrong. Please try again.');
          } catch {
            setError('Could not reach the site. Please try again.');
          } finally {
            setBusy(false);
          }
        }}>
          <label>The code you were given when you signed up
            <input style={field} value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" spellCheck={false} required />
          </label>
          <label>Anything we should know (optional, no private details)
            <input style={field} value={note} maxLength={300} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#c9b3ff', color: '#0b0b14', fontSize: 16, opacity: busy ? 0.5 : 1 }} disabled={busy}>{busy ? 'Sending…' : 'Remove my name'}</button>
        </form>
      )}
    </main>
  );
}
