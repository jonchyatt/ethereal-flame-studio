/**
 * Who operates the store, shown on every legal page and under every program.
 * Hyatt Studio is Jonathan's Payhip/Stripe trade name (chosen 2026-10-19 for
 * the Entity store); change it here if a different entity runs this site.
 */
export const OPERATOR = {
  name: 'Hyatt Studio',
  contact: 'jonchyatt@gmail.com',
};

/** Shown in the Terms and on every program page. */
export const SAFETY_NOTE =
  'Sessions are for relaxation and personal reflection. They are not medical or psychological treatment and do not replace a clinician. Do not listen while driving, operating machinery, or anywhere you need to stay alert. You must be 18 or over to buy.';

export const LEGAL_DOCS = [
  { slug: 'terms', title: 'Terms of sale' },
  { slug: 'privacy', title: 'Privacy' },
  { slug: 'refunds', title: 'Refunds and cancellation' },
] as const;

export function LegalLinks() {
  return (
    <footer style={{ marginTop: 48, fontSize: 13, opacity: 0.7 }}>
      <p>
        {LEGAL_DOCS.map((d, i) => (
          <span key={d.slug}>{i > 0 && ' · '}<a href={`/legal/${d.slug}`} style={{ color: 'inherit' }}>{d.title}</a></span>
        ))}
      </p>
      <p>
        Operated by {OPERATOR.name} · <a href={`mailto:${OPERATOR.contact}`} style={{ color: 'inherit' }}>{OPERATOR.contact}</a> ·{' '}
        <a href="/about" style={{ color: 'inherit' }}>About</a> · <a href="/support" style={{ color: 'inherit' }}>Support</a>
      </p>
    </footer>
  );
}
