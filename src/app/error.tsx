'use client';
export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="narrow">
      <p className="eyebrow">A pause in the connection</p>
      <h1>This page could not load</h1>
      <p>
        Please try again. You can also return to the listening collection or
        contact Support.
      </p>
      <div className="actions">
        <button className="button primary" onClick={reset}>
          Try again
        </button>
        <a className="button" href="/listen">
          Go to listening
        </a>
        <a className="text-link" href="/support">
          Get help →
        </a>
      </div>
    </main>
  );
}
