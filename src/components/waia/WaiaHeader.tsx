export const CHANNEL_URL = 'https://www.youtube.com/@What_Am_I_Appreciating_Now';

/**
 * The index. On the home page every entry jumps to its object on the page (the
 * gallery index); everywhere else it goes straight to the branch. Studio routes
 * (/studio, /create, /pipeline) are never listed.
 */
const ENTRIES: { label: string; home: string; away: string; external?: boolean }[] = [
  { label: 'Practices', home: '#practices', away: '/#practices' },
  { label: 'Programs', home: '#programs', away: '/programs' },
  { label: 'VR and 360', home: '#vr', away: '/#vr' },
  { label: 'Health shop', home: '#shop', away: '/store/shelf' },
  { label: 'Merch and patrons', home: '#merch', away: '/merch' },
  { label: 'Channel', home: '#channel', away: CHANNEL_URL, external: true },
];

export function WaiaHeader({ home = false }: { home?: boolean }) {
  const links = ENTRIES.map((e) => {
    const href = home ? e.home : e.away;
    const out = !home && e.external;
    return (
      <li key={e.label}>
        <a href={href} {...(out ? { target: '_blank', rel: 'noopener' } : {})}>{e.label}</a>
      </li>
    );
  });
  return (
    <header className="waia-header">
      <a className="waia-header__brand" href={home ? '#top' : '/'}>
        {/* The mark: Jon's carved wood panel, traced (jarvis data/waia-health-shop/brand-roots-2026-11-04/04). */}
        <img className="waia-header__mark" src="/waia-home/mark-carving.webp" alt="" width={40} height={40} />
        <span>What Am I Appreciating Now</span>
      </a>
      <nav aria-label="Index" className="waia-header__index">
        <ul>{links}</ul>
      </nav>
      <details className="waia-header__menu">
        <summary>Index</summary>
        <nav aria-label="Index">
          <ul>{links}</ul>
        </nav>
      </details>
    </header>
  );
}
