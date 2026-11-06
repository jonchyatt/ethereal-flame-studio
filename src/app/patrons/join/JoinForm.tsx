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
      <section role="status" className="utility-surface utility-result">
        <h2>Thank you</h2>
        <p>Your name is waiting for a person to read it. Nothing appears until it is approved.</p>
        <p>Keep this code. It is the only way to ask for removal later, and we store no email for you:</p>
        <p className="utility-code">{done}</p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="patron-form utility-surface">
      <fieldset className="patron-options">
        <legend>Requested display style</legend>
        {tiers.map((t) => (
          <label key={t.tier} className="patron-option">
            <input type="radio" name="tier" value={t.tier} checked={tier === t.tier} onChange={() => setTier(t.tier)} /> <strong>{t.label}</strong>
            <span className="meta">{t.letters} Display style.</span>
          </label>
        ))}
      </fieldset>
      <label className="utility-field">Name or alias (up to 40 characters; no links or emails)
        <input style={{ borderColor: '#8c8c9e' }} value={displayName} maxLength={40} onChange={(e) => setDisplayName(e.target.value)} required />
      </label>
      {allowsMessage && (
        <label className="utility-field">One short message (up to 120 characters)
          <input style={{ borderColor: '#8c8c9e' }} value={message} maxLength={120} onChange={(e) => setMessage(e.target.value)} />
        </label>
      )}
      {/* Honeypot: hidden from people. */}
      <input aria-hidden tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} style={{ position: 'absolute', left: -9999 }} />
      <div className="patron-preview">
        <div className="meta">Exactly as it will appear</div>
        <div className="patron-preview-name">{displayName.trim() || '…'}</div>
        {shownMessage && <div>{shownMessage}</div>}
      </div>
      <label className="patron-consent">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} /> {CONSENT_TEXT}
      </label>
      <label className="patron-consent">
        <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> I am 18 or older.
      </label>
      <p className="meta">Not allowed: impersonating a person or brand, links, and private details such as addresses, phone numbers, emails or health information.</p>
      <p className="meta">
        Read <a href="/legal/privacy">Privacy</a>, <a href="/legal/terms">Terms</a>, or get help from <a href="/support">Support</a> before you send a display request.
      </p>
      {errors.length > 0 && <ul role="alert" className="form-message error">{errors.map((m) => <li key={m}>{m}</li>)}</ul>}
      <button className="button primary" type="submit" data-sc-primary disabled={busy || !consent || !adult || !displayName.trim()}>
        {busy ? 'Sending…' : 'Send for approval'}
      </button>
      <p className="meta">Already on the wall and want out? <a href="/patrons/remove">Ask for removal</a>.</p>
    </form>
  );
}
