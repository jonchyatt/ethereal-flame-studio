import { listSubscribers } from '@/lib/subscribers/store';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Email subscribers', robots: { index: false, follow: false } };

function displayDate(value: string | null): string {
  return value ? new Date(value).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
}

/** The middleware's existing /operator Basic-auth gate protects this page. */
export default async function SubscribersPage() {
  let rows: Awaited<ReturnType<typeof listSubscribers>> = [];
  let loadError = false;
  try {
    rows = await listSubscribers();
  } catch {
    loadError = true;
  }

  return (
    <main style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Email subscribers</h1>
      <p><a href="/operator/subscribers/export">Download CSV</a></p>
      {loadError ? (
        <p role="alert">The subscriber list could not be loaded. Check the database configuration.</p>
      ) : rows.length === 0 ? (
        <p>No subscribers yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 680 }}>
            <thead>
              <tr><th align="left">Email</th><th align="left">Source</th><th align="left">Joined</th><th align="left">Status</th></tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ padding: '10px 8px', borderTop: '1px solid #ddd' }}>{row.email}</td>
                  <td style={{ padding: '10px 8px', borderTop: '1px solid #ddd' }}>{row.sourcePage}</td>
                  <td style={{ padding: '10px 8px', borderTop: '1px solid #ddd' }}>{displayDate(row.createdAt)}</td>
                  <td style={{ padding: '10px 8px', borderTop: '1px solid #ddd' }}>{row.unsubscribedAt ? `Unsubscribed ${displayDate(row.unsubscribedAt)}` : 'Subscribed'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
