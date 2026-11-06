import { OPERATOR } from '@/app/legal/LegalLinks';
import { UtilityPage } from '@/components/site/scrollcraft/UtilityPage';

export const metadata = {
  title: 'Support · What Am I Appreciating Now',
  description: 'A clear, low-friction way to get help from What Am I Appreciating Now.',
  alternates: { canonical: 'https://www.whatamiappreciatingnow.com/support' },
};

export default function SupportPage() {
  const mail = <a href={`mailto:${OPERATOR.contact}`}>{OPERATOR.contact}</a>;
  return (
    <UtilityPage name="support">
      <p className="utility-back"><a href="/">← What Am I Appreciating Now</a></p>
      <header className="utility-intro">
        <h1>Support</h1>
        <p>A person reads every message. Use the short note below or email {mail}.</p>
      </header>
      <div className="utility-workspace">
        <form action={`mailto:${OPERATOR.contact}`} method="get" className="utility-surface">
          <h2>Send a support note</h2>
          <p className="meta">This opens your email app; nothing is stored by this form. Please do not include card details, passwords, health details, or private information.</p>
          <div className="utility-field">
            <label htmlFor="support-topic">What can we help with?</label>
            <select id="support-topic" name="subject" defaultValue="Support request">
              <option>Support request</option>
              <option>Listening or downloads</option>
              <option>Legacy access</option>
              <option>Privacy or patron listing</option>
              <option>Something else</option>
            </select>
          </div>
          <div className="utility-field">
            <label htmlFor="support-note">A short description</label>
            <textarea id="support-note" name="body" rows={5} placeholder="What happened, what page you were on, and what you expected." />
          </div>
          <button className="button primary" type="submit" data-sc-primary>Open an email to Support</button>
        </form>
        <div className="utility-reference">
          <section>
            <h2>Listening or legacy access</h2>
            <p>There is no account to sign into. If you need help with an earlier program or a playback issue, tell us the page and device you used. We will reply with the next step.</p>
          </section>
          <section>
            <h2>Refunds</h2>
            <p>If you are asking about an earlier charge, email {mail}. The existing policy is at <a href="/legal/refunds">Refunds and cancellation</a>.</p>
          </section>
          <section>
            <h2>Your data</h2>
            <p>To see, correct or delete what we hold, email {mail}. Patron listings can also be removed at <a href="/patrons/remove">/patrons/remove</a> with your code. Details: <a href="/legal/privacy">Privacy</a>.</p>
          </section>
        </div>
      </div>
    </UtilityPage>
  );
}
