'use client';

import { usePathname } from 'next/navigation';
import { useId, useState } from 'react';

const formStyle = { display: 'grid', gap: 10, width: '100%', maxWidth: 520 } as const;
const rowStyle = { display: 'flex', flexWrap: 'wrap' as const, gap: 10, width: '100%' };
const inputStyle = { flex: '1 1 220px', minWidth: 0, padding: '12px 14px', borderRadius: 8, border: '1px solid #777', font: 'inherit' };
const buttonStyle = { minHeight: 44, padding: '10px 18px', borderRadius: 8, border: 0, background: '#d6ad63', color: '#111', cursor: 'pointer', font: 'inherit', fontWeight: 700 };

/** The React counterpart of public/waia-email-signup.js. */
export function EmailSignup({ question }: { question?: string }) {
  const pathname = usePathname() || 'unknown';
  const id = useId();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setBusy(true);
    const form = event.currentTarget;
    const website = new FormData(form).get('website');
    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, sourcePage: pathname, website }),
      });
      const result = await response.json().catch(() => ({}));
      if (response.ok && result.ok) {
        setMessage(result.message || 'Thanks — you’re on the list.');
        setEmail('');
      } else {
        setMessage(result.error || 'We could not save that right now. Please try again shortly.');
      }
    } catch {
      setMessage('We could not save that right now. Please try again shortly.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ margin: '16px 0', width: '100%' }}>
      {question && <p style={{ fontSize: 15, margin: '0 0 10px' }}>{question}</p>}
      <form onSubmit={submit} style={formStyle} noValidate>
        <label htmlFor={id}>Email address</label>
        <div style={rowStyle}>
          <input id={id} name="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required style={inputStyle} />
          <button type="submit" disabled={busy} style={{ ...buttonStyle, opacity: busy ? 0.7 : 1 }}>{busy ? 'Joining…' : 'Tell me when'}</button>
        </div>
        <div aria-hidden="true" style={{ position: 'absolute', left: -10000 }}>
          <label>Leave this empty <input name="website" tabIndex={-1} autoComplete="off" /></label>
        </div>
        <p style={{ fontSize: 14, margin: 0, opacity: 0.8 }}>Get new sessions when they are released. You can unsubscribe anytime.</p>
        {message && <p role="status" aria-live="polite" style={{ margin: 0 }}>{message}</p>}
      </form>
    </div>
  );
}
