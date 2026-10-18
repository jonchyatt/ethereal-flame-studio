import { LANDING } from '@/lib/store/resetBiologyKit';

export const metadata = {
  title: LANDING.title,
  description: LANDING.description,
  // Stays out of search until Jonathan places the link on resetbiology.com.
  robots: { index: false, follow: true },
};

export default function FromResetBiologyPage() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <h1>{LANDING.heading}</h1>
      <p>{LANDING.intro}</p>
      {LANDING.paragraphs.map((t) => <p key={t}>{t}</p>)}
      <nav aria-label="Next steps">
        <ul style={{ paddingLeft: 20 }}>
          {LANDING.links.map((l) => (
            <li key={l.href} style={{ margin: '8px 0' }}>
              <a href={l.href} style={{ color: '#c9b8ff' }}>{l.label}</a>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
