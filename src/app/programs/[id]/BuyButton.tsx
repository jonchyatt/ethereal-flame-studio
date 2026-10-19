'use client';

import { useState } from 'react';

// `live` is still passed by callers; the label no longer changes with it (no "test mode" text for buyers).
export function BuyButton({ programId, kind }: { programId: string; kind: 'subscription' | 'one_time'; live?: boolean }) {
  const [msg, setMsg] = useState('');
  async function go() {
    setMsg('');
    const res = await fetch('/api/programs/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ programId }),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.url) { window.location.href = json.url; return; }
    setMsg(res.status === 503 ? 'Not yet on sale.' : 'Checkout is unavailable right now.');
  }
  return (
    <div>
      <button onClick={go} style={{ padding: '12px 24px', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}>
        {kind === 'subscription' ? 'Subscribe' : 'Buy'}
      </button>
      <p role="status">{msg}</p>
    </div>
  );
}
