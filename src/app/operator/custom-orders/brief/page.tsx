'use client';

import { useState } from 'react';

type Suggestion = { amountCents: number | null; currency: string; lines: { label: string; cents: number }[]; notes: string[] };

/** Operator view of one brief with the calculator's suggestion. The secret stays in memory only. */
export default function OperatorBrief() {
  const [secret, setSecret] = useState('');
  const [id, setId] = useState('');
  const [data, setData] = useState<{ brief: Record<string, unknown>; suggestion: Suggestion } | null>(null);
  const [msg, setMsg] = useState('');

  async function load(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`/api/custom-orders/${encodeURIComponent(id.trim())}/brief`, { headers: { Authorization: `Bearer ${secret}` } });
    if (!res.ok) { setData(null); setMsg(res.status === 404 ? 'No brief for that order.' : 'Not allowed.'); return; }
    setMsg(''); setData(await res.json());
  }

  const s = data?.suggestion;
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Session brief</h1>
      <form onSubmit={load}>
        <input type="password" placeholder="Operator secret" value={secret} onChange={(e) => setSecret(e.target.value)} />{' '}
        <input placeholder="ord_…" value={id} onChange={(e) => setId(e.target.value)} />{' '}
        <button type="submit">Open</button>
      </form>
      {msg && <p role="status">{msg}</p>}
      {data && s && (
        <>
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(data.brief, null, 2)}</pre>
          <h2>Suggested quote</h2>
          <p>{s.amountCents == null ? 'No estimate yet: set base prices in the session pricing config.' : `${(s.amountCents / 100).toFixed(2)} ${s.currency}`}</p>
          <ul>{s.lines.map((l) => <li key={l.label}>{l.label}: {(l.cents / 100).toFixed(2)}</li>)}</ul>
          {s.notes.map((n) => <p key={n}>{n}</p>)}
        </>
      )}
    </main>
  );
}
