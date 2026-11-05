import { getStorageAdapter } from '@/lib/storage';
import { listIntake } from '@/lib/patrons/intake';
import { readCounts } from '@/lib/merch/notify';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Patron sign-ups and merch interest', robots: { index: false, follow: false } };

/** Operator view, read-only. The operator lock (src/lib/waia/operator-pages.ts) covers /operator in middleware. */
async function load() {
  const storage = getStorageAdapter();
  const pending = (await listIntake(storage)).filter((r) => r.status === 'pending' && !r.removalRequestedAt);
  const slugs = (await storage.list('merch/notify/')).map((k) => k.replace(/^.*\//, '').replace(/\.json$/, ''));
  const counts = await Promise.all(slugs.map(async (slug) => ({ slug, ...(await readCounts(storage, slug)) })));
  return { pending, counts: counts.sort((a, b) => b.total - a.total) };
}

export default async function OperatorPatronsMerch() {
  const { pending, counts } = await load();
  const cell = { padding: '6px 10px', borderBottom: '1px solid #8884', textAlign: 'left' } as const;
  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Patron sign-ups and merch interest</h1>
      <h2>Pending patron sign-ups ({pending.length})</h2>
      {pending.length === 0 ? <p>No sign-ups waiting.</p> : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={cell}>Name</th><th style={cell}>Message</th><th style={cell}>Tier</th><th style={cell}>Submitted</th><th style={cell}>Code</th></tr></thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.consentRef}>
                <td style={cell}>{r.displayName}</td><td style={cell}>{r.message ?? ''}</td><td style={cell}>{r.tier}</td>
                <td style={cell}>{r.submittedAt}</td><td style={{ ...cell, fontFamily: 'monospace', fontSize: 12 }}>{r.consentRef}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <h2>&ldquo;I would buy this&rdquo; taps</h2>
      {counts.length === 0 ? <p>No taps yet.</p> : (
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead><tr><th style={cell}>Product</th><th style={cell}>Total</th><th style={cell}>By size</th></tr></thead>
          <tbody>
            {counts.map((c) => (
              <tr key={c.slug}>
                <td style={cell}>{c.slug}</td><td style={cell}>{c.total}</td>
                <td style={cell}>{Object.entries(c.sizes).map(([s, n]) => `${s}: ${n}`).join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
