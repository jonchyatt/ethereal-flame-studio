import { cookies } from 'next/headers';
import { getProgram, programSlug } from '@/lib/entitlements/catalog';
import { loadRecord, summarizeAccess, type AccessStatus } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { PortalButton } from './PortalButton';
import { UtilityPage } from '@/components/site/scrollcraft/UtilityPage';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Manage my access · What Am I Appreciating Now',
  description: 'See which legacy programs this browser can open.',
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
    <UtilityPage name="programs-manage">
      <p className="utility-back"><a href="/programs">← Programs</a></p>
      <header className="utility-intro">
        <h1>Manage my access</h1>
        <p>This browser is how legacy access is recognized; no account or email is kept here.</p>
      </header>
      <div className="utility-ledger">
        {items.length === 0 ? (
          <p className="utility-surface">No program access is connected to this browser. If you have legacy access, try the browser or device you used before. Otherwise, <a href="/support" data-sc-primary>Support</a> can help you find the next step.</p>
        ) : (
          items.map((i) => (
            <section key={i.programId} className="utility-surface utility-access">
              <h2>{getProgram(i.programId)?.title}</h2>
              <p>{WORDS[i.status](i.endsAt)}</p>
              {(i.status === 'active' || i.status === 'cancelling' || i.status === 'grace') && (
                <p><a className="button primary" href={`/programs/${programSlug(i.programId)}`} data-sc-primary>Open program</a></p>
              )}
            </section>
          ))
        )}
        {manageable && <PortalButton />}
      </div>
    </UtilityPage>
  );
}
