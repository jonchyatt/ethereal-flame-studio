import { FOOTER_LINK_STYLE } from '@/app/legal/LegalLinks';

export function WaiaFooter() {
  return (
    <footer style={{ marginTop: 48, fontSize: 13, opacity: 0.7 }}>
      <nav aria-label="Footer" style={{ display: 'flex', flexWrap: 'wrap', gap: '0 4px' }}>
        <a href="/legal/terms" style={FOOTER_LINK_STYLE}>Terms</a>
        <a href="/legal/privacy" style={FOOTER_LINK_STYLE}>Privacy</a>
        <a href="/legal/refunds" style={FOOTER_LINK_STYLE}>Refunds</a>
        <a href="/support" style={FOOTER_LINK_STYLE}>Support</a>
      </nav>
    </footer>
  );
}
