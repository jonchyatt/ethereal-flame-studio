import { notFound } from 'next/navigation';
import { LEGAL_DOCS, LegalLinks, OPERATOR } from '../LegalLinks';

/**
 * Terms, privacy and refunds for the store. Every statement describes what the
 * code actually does (anonymous cookie, Stripe-hosted checkout, private storage).
 * The refund terms are a plain default for Jonathan to confirm (docs/GO-LIVE.md).
 */

type Doc = (typeof LEGAL_DOCS)[number]['slug'];

const UPDATED = '2026-10-18';

const BODY: Record<Doc, { h: string; p: string[] }[]> = {
  terms: [
    { h: 'Who you are buying from', p: [`What Am I Appreciating Now (whatamiappreciatingnow.com) is operated by ${OPERATOR.name}. Contact: ${OPERATOR.contact}.`] },
    { h: 'What is sold', p: [
      'Digital programs: advanced hypnosis sessions (a monthly subscription) and guided processes (one-time purchases). Custom sessions are quoted first; nothing is charged for a custom session through this site until you accept a quote.',
      'Prices are shown in US dollars before you pay. Payment is taken by Stripe on its own checkout page.',
    ] },
    { h: 'How access works', p: [
      'There is no account. When you buy, this browser gets a private cookie that holds an anonymous customer number, and your access is tied to it. If you clear cookies or change device, contact us with your Stripe receipt and we will restore access by hand.',
      'A subscription renews monthly until you cancel. A one-time purchase does not expire.',
    ] },
    { h: 'Health and safety', p: [
      'Sessions are for relaxation and personal reflection. They are not medical or psychological treatment and do not replace a clinician. Do not listen while driving, operating machinery, or anywhere you need to stay alert. You must be 18 or over to buy.',
    ] },
    { h: 'Use of the content', p: [
      'Your purchase is a personal licence to listen and use the program. Please do not copy, resell or redistribute it.',
    ] },
    { h: 'Changes', p: ['If these terms change, the new version is posted here with its date. Changes never shorten a period you have already paid for.'] },
  ],
  privacy: [
    { h: 'Who is responsible', p: [`${OPERATOR.name}. Contact: ${OPERATOR.contact}.`] },
    { h: 'What we keep', p: [
      'A purchase: an anonymous customer number (cus_ followed by random characters) in a signed cookie named waia_customer, plus a private access record saying which programs it may open, until when, and the Stripe subscription or payment reference. No name or email is stored by this site for a purchase.',
      'Payment details: you type your card into Stripe, not into this site. Stripe handles them under its own privacy policy (stripe.com/privacy) and tells us only whether the payment succeeded.',
      'Patron sign-up (optional): the name or alias, optional short message, tier and consent ticks you submit, kept privately until reviewed. You can ask for removal at /patrons/remove with the code you were given.',
      'Custom session request (optional): what you write in the form and any contact details you choose to add, kept privately and never shown on the site.',
      'Page counts: we count page views and "notify me" taps per day and page. No cookie, address, browser details or visitor id are kept for this, and requests sent with Do Not Track or Global Privacy Control are not counted.',
    ] },
    { h: 'Where it is kept', p: ['The site runs on Vercel. Private records are kept in Cloudflare R2 storage. We do not sell or share your information for advertising, and there are no ad or tracking scripts on the store.'] },
    { h: 'Your choices', p: [`To see, correct or delete what we hold about you, contact ${OPERATOR.contact}. Clearing the waia_customer cookie removes the link between this browser and your access.`] },
  ],
  refunds: [
    { h: 'Subscriptions', p: [
      'Cancel any time from Manage my access (/programs/manage), which opens Stripe\'s billing page. You keep access until the end of the month you paid for and are not charged again.',
      'If a renewal payment fails, access stays open for 7 days while the payment is retried, then closes until it is paid.',
    ] },
    { h: 'Refunds', p: [
      `If you were charged in error, or a program did not work as described, contact ${OPERATOR.contact} within 14 days of the charge for a full refund of that charge. Refunds go back to the card you paid with, through Stripe.`,
    ] },
    { h: 'Custom sessions', p: ['No payment is taken for a custom session until you accept a quote. Once work has started on an accepted quote, refunds are handled case by case.'] },
  ],
};

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const d = LEGAL_DOCS.find((x) => x.slug === doc);
  return { title: `${d?.title ?? 'Not found'} · What Am I Appreciating Now` };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const meta = LEGAL_DOCS.find((x) => x.slug === doc);
  if (!meta) notFound();
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <p><a href="/programs" style={{ color: 'inherit' }}>← Programs</a></p>
      <h1>{meta.title}</h1>
      <p style={{ fontSize: 14, opacity: 0.7 }}>Last updated {UPDATED}</p>
      {BODY[meta.slug].map((s) => (
        <section key={s.h}>
          <h2 style={{ fontSize: 20 }}>{s.h}</h2>
          {s.p.map((t) => <p key={t}>{t}</p>)}
        </section>
      ))}
      <LegalLinks />
    </main>
  );
}
