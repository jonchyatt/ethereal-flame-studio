/**
 * Who operates the store, shown on every legal page and under every program.
 * Hyatt Studio is Jonathan's Payhip/Stripe trade name (chosen 2026-10-19 for
 * the Entity store); change it here if a different entity runs this site.
 */
export const OPERATOR = {
  name: 'Hyatt Studio',
  contact: 'support@whatamiappreciatingnow.com',
};

/** Shown in the Terms and on every program page. */
export const SAFETY_NOTE =
  'Sessions are for relaxation and personal reflection. They are not medical or psychological treatment and do not replace a clinician. Do not listen while driving, operating machinery, or anywhere you need to stay alert. You must be 18 or over to buy.';

export const LEGAL_DOCS = [
  { slug: 'terms', title: 'Terms of sale' },
  { slug: 'privacy', title: 'Privacy' },
  { slug: 'refunds', title: 'Refunds and cancellation' },
] as const;

export const NAV_LINK_STYLE = {
  color: 'inherit',
  display: 'inline-block',
  minHeight: 44,
  padding: '10px 8px',
  lineHeight: '24px',
  verticalAlign: 'middle',
} as const;

export const FOOTER_LINK_STYLE = NAV_LINK_STYLE;

export function LegalLinks() {
  return (
    <footer style={{ marginTop: 48, fontSize: 13, opacity: 0.7 }}>
      <nav aria-label="Legal links" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4px' }}>
        {LEGAL_DOCS.map((d) => (
          <a key={d.slug} href={`/legal/${d.slug}`} style={FOOTER_LINK_STYLE}>{d.title}</a>
        ))}
      </nav>
      <nav aria-label="Site details" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4px', alignItems: 'center' }}>
        <span>Operated by {OPERATOR.name}</span>
        <a href={`mailto:${OPERATOR.contact}`} style={FOOTER_LINK_STYLE}>{OPERATOR.contact}</a>
        <a href="/about" style={FOOTER_LINK_STYLE}>About</a>
        <a href="/support" style={FOOTER_LINK_STYLE}>Support</a>
      </nav>
    </footer>
  );
}
