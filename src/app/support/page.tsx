import { OPERATOR } from '@/app/legal/LegalLinks';

export const metadata = {
  title: 'Support · What Am I Appreciating Now',
  description: 'A clear, low-friction way to get help from What Am I Appreciating Now.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/support' },
};

const link = { color: '#9cf' };

export default function SupportPage() {
  const mail = <a href={`mailto:${OPERATOR.contact}`} style={link}>{OPERATOR.contact}</a>;
  return (
    <main className="narrow" style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <p><a href="/" style={{ color: 'inherit' }}>← What Am I Appreciating Now</a></p>
      <h1>Support</h1>
      <p>A person reads every message. Use the short note below or email {mail}.</p>
      <form action={`mailto:${OPERATOR.contact}`} method="get" style={{ margin: '24px 0', padding: 20, border: '1px solid #4a5f63', borderRadius: 12, background: '#10151d' }}>
        <h2 style={{ fontSize: 20, marginTop: 0 }}>Send a support note</h2>
        <p style={{ fontSize: 14, opacity: 0.8 }}>This opens your email app; nothing is stored by this form. Please do not include card details, passwords, health details, or private information.</p>
        <label htmlFor="support-topic" style={{ display: 'block', marginTop: 16 }}>What can we help with?</label>
        <select id="support-topic" name="subject" defaultValue="Support request" style={{ display: 'block', boxSizing: 'border-box', width: '100%', minHeight: 48, marginTop: 6 }}>
          <option>Support request</option>
          <option>Listening or downloads</option>
          <option>Legacy access</option>
          <option>Privacy or patron listing</option>
          <option>Something else</option>
        </select>
        <label htmlFor="support-note" style={{ display: 'block', marginTop: 16 }}>A short description</label>
        <textarea id="support-note" name="body" rows={5} style={{ display: 'block', boxSizing: 'border-box', width: '100%', marginTop: 6 }} placeholder="What happened, what page you were on, and what you expected." />
        <button type="submit" style={{ minHeight: 48, marginTop: 16 }}>Open an email to Support</button>
      </form>
      <h2 style={{ fontSize: 20 }}>Listening or legacy access</h2>
      <p>There is no account to sign into. If you need help with an earlier program or a playback issue, tell us the page and device you used. We will reply with the next step.</p>
      <h2 style={{ fontSize: 20 }}>Refunds</h2>
      <p>If you are asking about an earlier charge, email {mail}. The existing policy is at <a href="/legal/refunds" style={link}>Refunds and cancellation</a>.</p>
      <h2 style={{ fontSize: 20 }}>Your data</h2>
      <p>To see, correct or delete what we hold, email {mail}. Patron listings can also be removed at <a href="/patrons/remove" style={link}>/patrons/remove</a> with your code. Details: <a href="/legal/privacy" style={link}>Privacy</a>.</p>
    </main>
  );
}
