import { getStorageAdapter } from '@/lib/storage';
import { TIERS } from '@/lib/patrons/tiers';
import { readPublicWall } from '@/lib/patrons/wall';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Patron wall · What Am I Appreciating Now',
  description: 'The people who made What Am I Appreciating Now possible. Nothing is on sale yet.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/patrons' },
};

async function loadWall() {
  try {
    return await readPublicWall(getStorageAdapter());
  } catch {
    return { publishedAt: null, patrons: [] };
  }
}

export default async function PatronsPage() {
  const wall = await loadWall();
  const shell = { maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' } as const;
  return (
    <main style={shell}>
      <h1>Patron wall</h1>
      {/* Copy v2 (Voss/NEPQ, 2026-10-19): NEPQ situation question opens on the reader, then the fact. v1: docs/COPY-V2-VOSS-NEPQ-2026-10-19.md */}
      <p>Has a scene ever given you a quiet minute you did not expect? Turn away from the orb in a What Am I Appreciating Now scene and you find the people who made it possible. Here they are.</p>
      {wall.patrons.length === 0 ? (
        <p style={{ opacity: 0.8 }}>The wall is empty for now. The first names appear here once they have been read and approved by a person.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {wall.patrons.map((p) => (
            <li key={p.consentRef} data-tier={p.tier} style={{ margin: '14px 0' }}>
              <strong style={{ fontSize: p.tier === 'ethereal' ? 24 : 18 }}>{p.displayName}</strong>
              {p.message ? <div style={{ opacity: 0.8 }}>{p.message}</div> : null}
            </li>
          ))}
        </ul>
      )}
      <h2>Tiers</h2>
      <p style={{ opacity: 0.7, fontSize: 14 }}>These tiers are proposals and nothing is on sale yet. No payment is taken anywhere on this site.</p>
      {TIERS.map((t) => (
        <section key={t.tier} style={{ margin: '16px 0', padding: 16, border: '1px solid #333', borderRadius: 12 }}>
          <h3 style={{ margin: 0 }}>{t.label}</h3>
          <p style={{ margin: '6px 0' }}>{t.letters}</p>
          <ul>{t.benefits.map((b) => <li key={b}>{b}</li>)}</ul>
          <p style={{ fontSize: 14, opacity: 0.7, margin: 0 }}>Proposal · Not yet on sale</p>
        </section>
      ))}
      {/* Technique: Voss no-oriented question before the link, so "no" stays a safe answer. */}
      <p>Would you be opposed to seeing your own name behind the orb?</p>
      <p><a href="/patrons/join" style={{ color: '#c9b3ff' }}>Add your name</a> · <a href="/patrons/remove" style={{ color: '#c9b3ff' }}>Remove my name</a></p>
    </main>
  );
}
