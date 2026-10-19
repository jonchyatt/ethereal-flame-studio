'use client';

import { useEffect, useState } from 'react';

type View = {
  id: string; kind: string; details: string; status: string; updatedAt: string;
  quote: { amountCents: number; currency: string; note: string } | null;
};

const LABEL: Record<string, string> = {
  received: 'Received', in_review: 'Being read', quoted: 'Quote ready', accepted: 'Accepted', declined: 'Declined', closed: 'Closed',
};

export default function CustomOrderStatus() {
  const [ref, setRef] = useState('');
  const [view, setView] = useState<View | null>(null);
  const [msg, setMsg] = useState('');

  async function load(reference: string) {
    const id = reference.split('.')[0];
    const res = await fetch(`/api/custom-orders/${encodeURIComponent(id)}?t=${encodeURIComponent(reference)}`);
    if (!res.ok) { setView(null); setMsg('No request found for that reference.'); return; }
    setMsg(''); setView((await res.json()).order);
  }

  useEffect(() => {
    const r = new URLSearchParams(window.location.hash.slice(1)).get('ref');
    if (r) { setRef(r); void load(r); }
  }, []);

  async function respond(status: 'accepted' | 'declined') {
    const res = await fetch(`/api/custom-orders/${encodeURIComponent(ref.split('.')[0])}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference: ref, status }),
    });
    if (res.ok) setView((await res.json()).order); else setMsg('That did not go through.');
  }

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Your custom session request</h1>
      <p>What Am I Appreciating Now. Nothing is charged here. A quote is a price offered, not a payment taken.</p>
      <form onSubmit={(e) => { e.preventDefault(); void load(ref.trim()); }}>
        <label>Your reference
          <input value={ref} onChange={(e) => setRef(e.target.value)} autoComplete="off" spellCheck={false} style={{ display: 'block', width: '100%', padding: 10, margin: '6px 0 12px', background: '#14142a', color: '#eee', border: '1px solid #8c8c9e', borderRadius: 8 }} />
        </label>
        <button type="submit" style={{ padding: '10px 20px', fontSize: 16, borderRadius: 8 }}>Look up</button>
      </form>
      <p role="status">{msg}</p>
      <div aria-live="polite">
      {view && (
        <section aria-label="Your request" style={{ marginTop: 24, padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h2>{view.kind}</h2>
          <p>{view.details}</p>
          <p><strong>{LABEL[view.status] ?? view.status}</strong></p>
          {view.quote && (
            <p>Quote: {(view.quote.amountCents / 100).toFixed(2)} {view.quote.currency}. {view.quote.note}</p>
          )}
          {view.status === 'quoted' && (
            <p>
              <button onClick={() => respond('accepted')}>Accept this quote</button>{' '}
              <button onClick={() => respond('declined')}>Decline</button>
            </p>
          )}
          {view.status === 'accepted' && <p>Thank you. Payment is not set up yet, so nothing has been charged.</p>}
        </section>
      )}
      </div>
    </main>
  );
}
