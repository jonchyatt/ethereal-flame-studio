'use client';

import { useState } from 'react';

export default function RemovePage() {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const field = { display: 'block', width: '100%', padding: 10, margin: '6px 0 16px', background: '#14142a', color: '#eee', border: '1px solid #333', borderRadius: 8 } as const;
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Remove my name from the patron wall</h1>
      {sent ? (
        <p>Received. If that code matches a name, it is removed before the next render. Names already in a published video stay unless that video is edited or withdrawn.</p>
      ) : (
        <form onSubmit={async (e) => {
          e.preventDefault();
          await fetch('/api/patrons/removal', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ consentRef: ref, note }) });
          setSent(true);
        }}>
          <label>The code you were given when you signed up
            <input style={field} value={ref} onChange={(e) => setRef(e.target.value)} required />
          </label>
          <label>Anything we should know (optional, no private details)
            <input style={field} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#c9b3ff', color: '#0b0b14', fontSize: 16 }}>Remove my name</button>
        </form>
      )}
    </main>
  );
}
