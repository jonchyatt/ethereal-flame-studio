import { cookies } from 'next/headers';
import { PROGRAMS } from '@/lib/entitlements/catalog';
import { loadRecord, summarizeAccess } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { paymentsLive } from '@/lib/entitlements/stripe';
import { formatPrice } from '@/lib/prices/config';
import { CounterBeacon } from '@/components/CounterBeacon';
import { LegalLinks, NAV_LINK_STYLE } from '@/app/legal/LegalLinks';

export const metadata = {
  title: 'Programs · What Am I Appreciating Now',
  description: 'Advanced hypnosis sessions and guided processes from What Am I Appreciating Now.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/programs' },
};

async function browserHasPurchase() {
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    return !!customerId && summarizeAccess(await loadRecord(customerId)).length > 0;
  } catch {
    return false;
  }
}

export default async function ProgramsPage() {
  const live = paymentsLive();
  const hasPurchase = await browserHasPurchase();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" style={{ fontSize: 14, marginBottom: 24 }}>
        <a href="/" style={NAV_LINK_STYLE}>Home</a> · <a href="/store" style={NAV_LINK_STYLE}>Store</a>
      </nav>
      <CounterBeacon page="programs" />
      <h1>Programs</h1>
      <p>What Am I Appreciating Now programs.{live ? '' : ' Nothing here is on sale yet.'}</p>
      {PROGRAMS.map((p) => (
        <section key={p.id} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
          <h2><a href={`/programs/${p.id}`} style={{ color: 'inherit' }}>{p.title}</a></h2>
          <p>{p.summary}</p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>
            {p.kind === 'subscription' ? 'Subscription' : 'One-time purchase'} ·{' '}
            {live && p.priceCents !== null ? `${formatPrice(p.priceCents)}${p.kind === 'subscription' ? ' a month' : ''}` : 'Not yet on sale'}
          </p>
          <p style={{ fontSize: 14, opacity: 0.7 }}>{p.provenance}</p>
        </section>
      ))}
      {hasPurchase && <p style={{ fontSize: 14, opacity: 0.7 }}><a href="/programs/manage" style={NAV_LINK_STYLE}>Manage my access</a></p>}
      <p style={{ fontSize: 14, opacity: 0.7 }}>The free Reset Biology tools stay free.</p>
      <LegalLinks />
    </main>
  );
}
