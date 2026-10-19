import { PRICE_KEYS, formatPrice, type PriceKey } from '@/lib/prices/config';
import { PRICE_OPTIONS } from '@/lib/prices/options';
import { PROGRAMS } from '@/lib/entitlements/catalog';
import { TIERS } from '@/lib/patrons/tiers';

export const metadata = {
  title: 'Price ladder preview · What Am I Appreciating Now',
  robots: { index: false, follow: false },
};

function label(key: PriceKey): string {
  const [kind, id] = key.split(':');
  if (kind === 'patron') return `Patron wall: ${TIERS.find((t) => t.tier === id)?.label ?? id}`;
  const p = PROGRAMS.find((x) => x.id === id);
  return `${p?.title ?? id}${p?.kind === 'subscription' ? ' (per month)' : ' (one time)'}`;
}

const cell = { padding: '8px 10px', borderBottom: '1px solid #333', textAlign: 'left' as const };

export default function PriceLadderPreview() {
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Price ladder options</h1>
      <p>Three proposals side by side. Nothing here is on sale and no checkout reads these numbers; the real prices live in one config file and are blank until chosen.</p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={cell}>Item</th>
              {PRICE_OPTIONS.map((o) => <th key={o.id} style={cell}>{o.id}: {o.name}</th>)}
              <th style={cell}>Today</th>
            </tr>
            <tr>
              <td style={cell} />
              {PRICE_OPTIONS.map((o) => <td key={o.id} style={{ ...cell, fontSize: 13, opacity: 0.7 }}>{o.idea}</td>)}
              <td style={cell} />
            </tr>
          </thead>
          <tbody>
            {PRICE_KEYS.map((k) => (
              <tr key={k}>
                <td style={cell}>{label(k)}</td>
                {PRICE_OPTIONS.map((o) => <td key={o.id} style={cell}>{formatPrice(o.prices[k])}</td>)}
                <td style={cell}>{formatPrice(null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Not yet on sale. Proposals only; Jonathan chooses.</p>
    </main>
  );
}
