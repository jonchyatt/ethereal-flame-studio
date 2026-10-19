import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadGuidedSession } from '@/lib/entitlements/guided';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { SessionPlayer } from './SessionPlayer';

export const dynamic = 'force-dynamic';

export default async function GuidedSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = getProgram(id);
  if (!program?.guided) notFound();

  let allowed = false;
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    allowed = !!customerId && hasAccess(await loadRecord(customerId), id);
  } catch { /* storage or secret unavailable: fail closed */ }
  const session = allowed ? await loadGuidedSession(id) : null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <p><a href={`/programs/${id}`} style={{ color: 'inherit' }}>← {program.title}</a></p>
      {!allowed ? (
        <p>This guided process opens after purchase. <a href={`/programs/${id}`} style={{ color: 'inherit' }}>Back to the program page</a>.</p>
      ) : session ? (
        <SessionPlayer session={session} />
      ) : (
        <p>You have access. The guided steps have not been handed over yet.</p>
      )}
    </main>
  );
}
