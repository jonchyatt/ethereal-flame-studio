import { pageMetadata } from '@/lib/site/metadata';
import { UtilityPage } from '@/components/site/scrollcraft/UtilityPage';
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
    <UtilityPage name="email-preferences">
      <header className="utility-intro">
        <p className="eyebrow">Your inbox, your choice</p>
        <h1>{retry ? 'We could not save that change' : 'Email preferences'}</h1>
      </header>
      <section className="utility-surface utility-result">
        <p role="status">
          {retry
            ? 'Please retry the unsubscribe link. Your request has not been confirmed yet.'
            : 'If the link matched an email subscription, it is now unsubscribed from new-session updates.'}
        </p>
        <div className="actions">
          {retry && token && (
            <a
              className="button primary"
              data-sc-primary
              href={'/api/unsubscribe?token=' + encodeURIComponent(token)}
            >
              Retry unsubscribe
            </a>
          )}
          <a className={retry && token ? 'button' : 'button primary'} href="/listen" data-sc-primary={!retry || !token || undefined}>
            Return to listening
          </a>
          <a className="text-link" href="/support">
            Contact Support →
          </a>
        </div>
      </section>
    </UtilityPage>
  );
}
