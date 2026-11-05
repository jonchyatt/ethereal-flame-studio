export default function NotFound() {
  return (
    <main className="narrow">
      <p className="eyebrow">A different turn</p>
      <h1>Page not found</h1>
      <p>
        The page you were looking for is not here. There is a moment of
        appreciation waiting for you.
      </p>
      <div className="actions">
        <a className="button primary" href="/listen">
          Explore listening
        </a>
        <a className="button" href="/">
          Home
        </a>
        <a className="text-link" href="/support">
          Get help →
        </a>
      </div>
    </main>
  );
}
