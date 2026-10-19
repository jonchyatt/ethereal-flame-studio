'use client';

import { useMemo, useState } from 'react';
import { StoreItemCard, gridStyle } from '@/components/store/StoreItemCard';
import { itemsToSource, parseIntake, type ItemKind } from '@/lib/store/items';

const EXAMPLE = 'Item name | Merchant | https://merchant.com/item | One plain sentence the merchant itself says\nOther item | https://other.com/thing';
const field = { background: '#12121e', color: '#eee', border: '1px solid #333', borderRadius: 8, padding: 10, font: 'inherit' } as const;

export default function IntakeForm() {
  const today = new Date().toISOString().slice(0, 10);
  const [text, setText] = useState('');
  const [kind, setKind] = useState<ItemKind>('affiliate');
  const [commission, setCommission] = useState(true);
  const [provenance, setProvenance] = useState('Pasted by Jonathan from his own list; link as supplied.');
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => parseIntake(text, { kind, commission, provenance, today }), [text, kind, commission, provenance, today]);
  const good = rows.flatMap((r) => (r.item ? [r.item] : []));
  const bad = rows.filter((r) => r.error);
  const source = itemsToSource(good);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <label style={{ display: 'grid', gap: 6 }}>
        Items, one per line
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder={EXAMPLE} style={field} />
      </label>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <label style={{ display: 'grid', gap: 6 }}>
          Kind
          <select value={kind} onChange={(e) => setKind(e.target.value as ItemKind)} style={field}>
            <option value="affiliate">Affiliate or outbound link</option>
            <option value="wix">Our Wix store item</option>
          </select>
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="checkbox" checked={commission} onChange={(e) => setCommission(e.target.checked)} />
          These links earn a commission
        </label>
      </div>
      <label style={{ display: 'grid', gap: 6 }}>
        Where these came from (shown on each card)
        <input value={provenance} onChange={(e) => setProvenance(e.target.value)} style={field} />
      </label>

      {bad.length > 0 && (
        <ul role="alert" style={{ color: '#f99', margin: 0 }}>
          {bad.map((r) => <li key={r.line}>Line {r.line}: {r.error}{r.error === 'missing name' ? ' (put the name before the link)' : ''}</li>)}
        </ul>
      )}

      <h2 style={{ marginBottom: 0 }}>Preview ({good.length})</h2>
      {good.length === 0 ? <p style={{ opacity: 0.6 }}>Nothing to show yet.</p> : <div style={gridStyle}>{good.map((i) => <StoreItemCard key={i.id} item={i} />)}</div>}

      {good.length > 0 && (
        <>
          <h2 style={{ marginBottom: 0 }}>For the shelf file</h2>
          <p style={{ margin: 0, fontSize: 14, opacity: 0.7 }}>Paste inside the list in src/lib/store/shelf-items.ts, or send it to Claude.</p>
          <pre style={{ ...field, overflow: 'auto', fontSize: 12 }}>{source}</pre>
          <button type="button" style={{ ...field, cursor: 'pointer', width: 'fit-content' }}
            onClick={() => { navigator.clipboard?.writeText(source).then(() => setCopied(true), () => setCopied(false)); }}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </>
      )}
    </div>
  );
}
