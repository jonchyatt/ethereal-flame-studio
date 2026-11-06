'use client';

import { useState } from 'react';
import { UtilityPage } from '@/components/site/scrollcraft/UtilityPage';

export default function RemovePage() {
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <UtilityPage name="patrons-remove">
      <div className="utility-workspace">
        <header className="utility-intro">
          <h1>Remove my name from the patron wall</h1>
          <p className="notice">
            Lost your code? <a href="/support">Contact Support</a> and say that you need help locating a display request. Do not send health information, passwords, or a government ID.
          </p>
        </header>
        <div className="utility-surface">
          <div role="status" className="utility-result">
            {sent && (
              <p>Received. If that code matches a name, it is removed before the next render. Names already in a published video stay unless that video is edited or withdrawn.</p>
            )}
          </div>
          {error && <p role="alert" className="form-message error">{error}</p>}
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
              <label className="utility-field">The code you were given when you signed up
                <input style={{ borderColor: '#8c8c9e' }} value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" spellCheck={false} required />
              </label>
              <label className="utility-field">Anything we should know (optional, no private details)
                <input style={{ borderColor: '#8c8c9e' }} value={note} maxLength={300} autoComplete="off" onChange={(e) => setNote(e.target.value)} />
              </label>
              <button className="button primary" type="submit" data-sc-primary disabled={busy}>{busy ? 'Sending…' : 'Remove my name'}</button>
            </form>
          )}
        </div>
      </div>
    </UtilityPage>
  );
}
