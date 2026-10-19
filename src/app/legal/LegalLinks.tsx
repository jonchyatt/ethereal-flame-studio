/**
 * Who operates the store, shown on every legal page and under every program.
 * No business entity is recorded in this repo, so this is a marked placeholder
 * (docs/GO-LIVE.md, prerequisite 1). Fill in the real entity and a contact
 * address before going live; never guess one.
 */
export const OPERATOR = {
  name: '[OPERATOR ENTITY NOT YET RECORDED: Jonathan fills this in before live payments]',
  contact: '[CONTACT EMAIL NOT YET RECORDED]',
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
      <p>What Am I Appreciating Now is operated by {OPERATOR.name}.</p>
    </footer>
  );
}
