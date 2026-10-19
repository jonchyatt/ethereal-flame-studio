'use client';

import { useState } from 'react';

export function NotifyButton({ slug, sizes }: { slug: string; sizes: string[] }) {
  const [size, setSize] = useState('');
  const [msg, setMsg] = useState('');
  async function tap() {
    setMsg('');
    const res = await fetch('/api/merch/notify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(size ? { slug, size } : { slug }),
    });
    setMsg(res.ok ? 'Counted. We do not keep your name or email, so this only tells us people want it.' : 'Could not count that right now.');
  }
  return (
    <div>
      {sizes.length > 0 && (
        <p>
          <label>Size{' '}
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="">Any</option>
              {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </p>
      )}
      <button onClick={tap} style={{ padding: '10px 20px', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}>I would buy this</button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
