import { cookies } from 'next/headers';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadRecord, summarizeAccess, type AccessStatus } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { PortalButton } from './PortalButton';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Manage my access · What Am I Appreciating Now',
  description: 'See which programs this browser can open and cancel a subscription.',
  robots: { index: false, follow: false },
};

const WORDS: Record<AccessStatus, (end: string | null) => string> = {
  active: (end) => (end ? `Active, renews around ${day(end)}` : 'Yours to keep'),
  cancelling: (end) => `Cancelled; open until ${day(end)}`,
  grace: (end) => `Payment did not go through; kept open until ${day(end)} while the card is retried`,
  lapsed: () => 'Ended',
  revoked: () => 'Closed (cancelled or refunded)',
};

const day = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');

export default async function ManagePage() {
  let items: ReturnType<typeof summarizeAccess> = [];
  let manageable = false;
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    if (customerId) {
      const rec = await loadRecord(customerId);
      items = summarizeAccess(rec);
      manageable = !!rec.providerCustomerId && items.some((i) => i.kind === 'subscription');
    }
  } catch { /* storage or secret unavailable: show the empty state, open nothing */ }

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p><a href="/programs" style={{ color: 'inherit' }}>← Programs</a></p>
      <h1>Manage my access</h1>
      <p style={{ fontSize: 14, opacity: 0.7 }}>This browser is how we know it is you; no account or email is kept here.</p>
      {items.length === 0 ? (
        <p>No programs found on this browser. If you bought from another device, open this page there.</p>
      ) : (
        items.map((i) => (
          <section key={i.programId} style={{ margin: '24px 0', padding: 20, border: '1px solid #333', borderRadius: 12 }}>
            <h2>{getProgram(i.programId)?.title}</h2>
            <p>{WORDS[i.status](i.endsAt)}</p>
            {(i.status === 'active' || i.status === 'cancelling' || i.status === 'grace') && (
              <p><a href={`/programs/${i.programId}`} style={{ color: 'inherit' }}>Open program</a></p>
            )}
          </section>
        ))
      )}
      {manageable && <PortalButton />}
    </main>
  );
}
