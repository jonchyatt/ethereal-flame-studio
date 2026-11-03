import { cookies } from 'next/headers';
import { LegalLinks, NAV_LINK_STYLE, OPERATOR } from '@/app/legal/LegalLinks';
import { loadRecord, summarizeAccess } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';

export const metadata = {
  title: 'Support · What Am I Appreciating Now',
  description: 'How to get help with access, billing, refunds and your data.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/support' },
};

const link = { color: '#9cf' };

async function browserHasPurchase() {
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    return !!customerId && summarizeAccess(await loadRecord(customerId)).length > 0;
  } catch {
    return false;
  }
}

export default async function SupportPage() {
  const mail = <a href={`mailto:${OPERATOR.contact}`} style={link}>{OPERATOR.contact}</a>;
  const hasPurchase = await browserHasPurchase();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <nav aria-label="Site navigation" style={{ fontSize: 14, marginBottom: 24 }}>
        <a href="/" style={NAV_LINK_STYLE}>Home</a> · <a href="/store" style={NAV_LINK_STYLE}>Store</a>
      </nav>
      <p><a href="/" style={{ color: 'inherit' }}>← What Am I Appreciating Now</a></p>
      <h1>Support</h1>
      <p>Email {mail} for anything below. A person reads every message.</p>
      <h2 style={{ fontSize: 20 }}>Lost access after clearing cookies or changing device</h2>
      <p>There is no account; access lives in this browser. Email {mail} with your Stripe receipt and we will restore it by hand.</p>
      {hasPurchase && <>
        <h2 style={{ fontSize: 20 }}>Cancel a subscription or update your card</h2>
        <p>Open <a href="/programs/manage" style={link}>Manage my access</a> in the browser you bought with. You keep access to the end of the month you paid for.</p>
      </>}
      <h2 style={{ fontSize: 20 }}>Refunds</h2>
      <p>Charged in error, or a program did not work as described? Email {mail} within 14 days of the charge for a full refund. Details: <a href="/legal/refunds" style={link}>Refunds and cancellation</a>.</p>
      <h2 style={{ fontSize: 20 }}>Your data</h2>
      <p>To see, correct or delete what we hold, email {mail}. Patron listings can also be removed at <a href="/patrons/remove" style={link}>/patrons/remove</a> with your code. Details: <a href="/legal/privacy" style={link}>Privacy</a>.</p>
      <LegalLinks />
    </main>
  );
}
