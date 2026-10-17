'use client';

import { useState } from 'react';

type Row = {
  id: string; kind: string; details: string; contact: string; status: string; createdAt: string;
  quote: { amountCents: number; currency: string; note: string } | null;
};

const NEXT: Record<string, string[]> = {
  received: ['in_review', 'declined', 'closed'], in_review: ['declined', 'closed'],
  quoted: ['in_review', 'closed'], accepted: ['closed'], declined: ['closed'], closed: [],
};

/** Operator view. The secret stays in this page's memory only; nothing is stored in the browser. */
export default function OperatorCustomOrders() {
  const [secret, setSecret] = useState('');
  const [rows, setRows] = useState<Row[]>([]);
  const [msg, setMsg] = useState('');
  const [quotes, setQuotes] = useState<Record<string, { amount: string; note: string }>>({});
  const auth = { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' };

  async function refresh() {
    const res = await fetch('/api/custom-orders', { headers: auth });
    if (!res.ok) { setMsg(res.status === 503 ? 'Operator access is not configured.' : 'Not allowed.'); return; }
    setMsg(''); setRows((await res.json()).orders);
  }
  async function patch(id: string, body: object) {
    const res = await fetch(`/api/custom-orders/${id}`, { method: 'PATCH', headers: auth, body: JSON.stringify(body) });
    if (!res.ok) setMsg((await res.json().catch(() => ({}))).error ?? 'Update failed');
    await refresh();
  }
  async function sendQuote(id: string) {
    const q = quotes[id];
    const cents = Math.round(parseFloat(q?.amount ?? '') * 100);
    if (!Number.isFinite(cents) || cents < 0) { setMsg('Enter the quote amount.'); return; }
    await patch(id, { quote: { amountCents: cents, note: q?.note ?? '' } });
    await patch(id, { status: 'quoted' });
  }

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Custom session requests</h1>
      <form onSubmit={(e) => { e.preventDefault(); void refresh(); }}>
        <input type="password" placeholder="Operator secret" value={secret} onChange={(e) => setSecret(e.target.value)} />{' '}
        <button type="submit">Load queue</button>
      </form>
      {msg && <p role="status">{msg}</p>}
      {rows.map((r) => (
        <section key={r.id} style={{ margin: '16px 0', padding: 16, border: '1px solid #8884', borderRadius: 8 }}>
          <h3>{r.kind === 'vr' ? 'Custom VR session' : 'Custom hypnosis session'} · {r.status}</h3>
          <p style={{ whiteSpace: 'pre-wrap' }}>{r.details}</p>
          <p style={{ fontSize: 13, opacity: 0.7 }}>{r.id} · {r.createdAt} · contact: {r.contact || 'none given'}</p>
          {r.quote && <p>Quote: {(r.quote.amountCents / 100).toFixed(2)} {r.quote.currency} {r.quote.note}</p>}
          {r.status === 'received' && <button onClick={() => patch(r.id, { status: 'in_review' })}>Start review</button>}
          {(r.status === 'in_review' || r.status === 'quoted') && (
            <p>
              <input placeholder="Amount (USD)" size={10} onChange={(e) => setQuotes({ ...quotes, [r.id]: { amount: e.target.value, note: quotes[r.id]?.note ?? '' } })} />{' '}
              <input placeholder="Note for the customer" size={30} onChange={(e) => setQuotes({ ...quotes, [r.id]: { amount: quotes[r.id]?.amount ?? '', note: e.target.value } })} />{' '}
              <button onClick={() => sendQuote(r.id)}>{r.status === 'quoted' ? 'Re-quote' : 'Send quote'}</button>
            </p>
          )}
          {NEXT[r.status].filter((s) => s !== 'in_review' || r.status === 'quoted').map((s) => (
            <button key={s} onClick={() => patch(r.id, { status: s })} style={{ marginRight: 8 }}>Mark {s.replace('_', ' ')}</button>
          ))}
        </section>
      ))}
    </main>
  );
}
