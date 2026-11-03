export default function NotFound() {
  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', lineHeight: 1.6 }}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 48 }}>
        <a href="/" style={{ color: 'inherit' }}>Home</a>
        <a href="/store" style={{ color: 'inherit' }}>Store</a>
        <a href="/support" style={{ color: 'inherit' }}>Support</a>
      </nav>
      <p style={{ fontSize: 14, opacity: 0.7 }}>What Am I Appreciating Now</p>
      <h1>Page not found</h1>
      <p>The page you were looking for is not here.</p>
    </main>
  );
}
