'use client';

import { useState } from 'react';

export function PortalButton() {
  const [msg, setMsg] = useState('');
  async function go() {
    setMsg('');
    const res = await fetch('/api/programs/manage/portal', { method: 'POST' });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json.url) { window.location.href = json.url; return; }
    setMsg(res.status === 503 ? 'Not yet on sale.' : 'Billing management is unavailable right now.');
  }
  return (
    <div>
      <button onClick={go} style={{ padding: '10px 20px', fontSize: 16, borderRadius: 8, cursor: 'pointer' }}>
        Cancel, update card or see invoices (test mode)
      </button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
