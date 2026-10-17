'use client';

import { useState } from 'react';
import { CONSENT_TEXT } from '@/lib/patrons/consent';

interface Tier { tier: string; label: string; letters: string; allowsMessage: boolean }

export default function JoinForm({ tiers }: { tiers: Tier[] }) {
  const [tier, setTier] = useState(tiers[0].tier);
  const [displayName, setDisplayName] = useState('');
  const [message, setMessage] = useState('');
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const allowsMessage = tiers.find((t) => t.tier === tier)?.allowsMessage ?? false;
  const shownMessage = allowsMessage ? message.trim() : '';

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors([]);
    try {
      const res = await fetch('/api/patrons/intake', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ displayName, message: shownMessage || undefined, tier, consent, adult, website }),
      });
      const data = await res.json();
      if (data.ok) setDone(data.consentRef);
      else setErrors(data.errors ?? ['Something went wrong. Please try again.']);
    } catch {
      setErrors(['Could not reach the site. Please try again.']);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section style={{ marginTop: 24, padding: 20, border: '1px solid #333', borderRadius: 12 }}>
        <h2>Thank you</h2>
        <p>Your name is waiting for a person to read it. Nothing appears until it is approved.</p>
        <p>Keep this code. It is the only way to ask for removal later, and we store no email for you:</p>
        <p style={{ fontFamily: 'monospace', fontSize: 18 }}>{done}</p>
      </section>
    );
  }

  const field = { display: 'block', width: '100%', padding: 10, margin: '6px 0 16px', background: '#14142a', color: '#eee', border: '1px solid #333', borderRadius: 8 } as const;
  return (
    <form onSubmit={submit} style={{ marginTop: 24 }}>
      <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
        <legend>Tier</legend>
        {tiers.map((t) => (
          <label key={t.tier} style={{ display: 'block', margin: '8px 0', padding: 12, border: '1px solid #333', borderRadius: 8 }}>
            <input type="radio" name="tier" value={t.tier} checked={tier === t.tier} onChange={() => setTier(t.tier)} /> <strong>{t.label}</strong>
            <span style={{ display: 'block', opacity: 0.7, fontSize: 14 }}>{t.letters} Not yet on sale.</span>
          </label>
        ))}
      </fieldset>
      <label>Name or alias (up to 40 characters; no links or emails)
        <input style={field} value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      {allowsMessage && (
        <label>One short message (up to 120 characters)
          <input style={field} value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} />
        </label>
      )}
      {/* Honeypot: hidden from people. */}
      <input aria-hidden tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: 'absolute', left: -9999 }} />
      <div style={{ padding: 16, border: '1px dashed #555', borderRadius: 8, margin: '8px 0 16px' }}>
        <div style={{ opacity: 0.7, fontSize: 14 }}>Exactly as it will appear</div>
        <div style={{ fontSize: 22 }}>{displayName.trim() || '…'}</div>
        {shownMessage && <div style={{ opacity: 0.85 }}>{shownMessage}</div>}
      </div>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {CONSENT_TEXT}
      </label>
      <label style={{ display: 'block', margin: '8px 0' }}>
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> I am 18 or older.
      </label>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Not allowed: impersonating a person or brand, links, and private details such as addresses, phone numbers, emails or health information.</p>
      {errors.length > 0 && <ul role="alert" style={{ color: '#ff9a9a' }}>{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      <button type="submit" disabled={busy || !consent || !adult || !displayName.trim()} style={{ padding: '12px 24px', borderRadius: 8, border: 'none', background: '#c9b3ff', color: '#0b0b14', fontSize: 16 }}>
        {busy ? 'Sending…' : 'Send for approval'}
      </button>
      <p style={{ fontSize: 14, marginTop: 24 }}>Already on the wall and want out? <a href="/patrons/remove" style={{ color: 'inherit' }}>Ask for removal</a>.</p>
    </form>
  );
}
