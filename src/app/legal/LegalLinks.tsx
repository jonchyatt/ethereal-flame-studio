/**
 * Who operates the store, shown on every legal page and under every program.
 * Hyatt Studio is Jonathan's Payhip/Stripe trade name (chosen 2026-10-19 for
 * the Entity store); change it here if a different entity runs this site.
 */
export const OPERATOR = {
  name: 'Hyatt Studio',
  contact: 'jonchyatt@gmail.com',
};

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
        <a href="/about" style={{ color: 'inherit' }}>About</a>
      </p>
    </footer>
  );
}
