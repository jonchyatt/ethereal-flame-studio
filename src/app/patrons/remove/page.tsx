'use client';

import { useState } from 'react';

export default function RemovePage() {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const field = { border: '1px solid #8c8c9e' } as const;
  return (
    <main className="narrow">
      <h1>Remove my name from the patron wall</h1>
      <p className="notice">
        Lost your code? <a href="/support">Contact Support</a> and say that you need help locating a display request. Do not send health information, passwords, or a government ID.
      </p>
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
          <button type="submit" disabled={busy}>{busy ? 'Sending…' : 'Remove my name'}</button>
        </form>
      )}
    </main>
  );
}
