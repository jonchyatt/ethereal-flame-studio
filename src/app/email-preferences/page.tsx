import { pageMetadata } from '@/lib/site/metadata';
export const metadata = {
  ...pageMetadata(
    'Email preferences',
    '/email-preferences',
    'Manage new-session email preferences.',
  ),
  robots: { index: false, follow: false },
};
export default async function Preferences({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; token?: string }>;
}) {
  const { status, token } = await searchParams;
  const retry = status === 'retry';
  return (
    <main className="narrow">
      <p className="eyebrow">Your inbox, your choice</p>
      <h1>{retry ? 'We could not save that change' : 'Email preferences'}</h1>
      <p>
        {retry
          ? 'Please retry the unsubscribe link. Your request has not been confirmed yet.'
          : 'If the link matched an email subscription, it is now unsubscribed from new-session updates.'}
      </p>
      <div className="actions">
        {retry && token && (
          <a
            className="button primary"
            href={'/api/unsubscribe?token=' + encodeURIComponent(token)}
          >
            Retry unsubscribe
          </a>
        )}
        <a className="button" href="/listen">
          Return to listening
        </a>
        <a className="text-link" href="/support">
          Contact Support →
        </a>
      </div>
    </main>
  );
}
