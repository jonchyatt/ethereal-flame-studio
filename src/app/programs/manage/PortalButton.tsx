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
    <div className="actions utility-billing">
      <button className="button primary" type="button" data-sc-primary onClick={go}>
        Cancel, update card or see invoices
      </button>
      {msg && <p role="status">{msg}</p>}
    </div>
  );
}
