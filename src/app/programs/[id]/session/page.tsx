import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProgram, programSlug } from '@/lib/entitlements/catalog';
import { loadGuidedSession } from '@/lib/entitlements/guided';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { LegalLinks, NAV_LINK_STYLE } from '@/app/legal/LegalLinks';
import { SessionPlayer } from './SessionPlayer';

export const dynamic = 'force-dynamic';

export default async function GuidedSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = getProgram(id);
  if (!program?.guided) notFound();
  const slug = programSlug(program.id);

  let allowed = false;
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    allowed = !!customerId && hasAccess(await loadRecord(customerId), program.id);
  } catch { /* storage or secret unavailable: fail closed */ }
  const session = allowed ? await loadGuidedSession(program.id) : null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <nav aria-label="Site navigation" style={{ alignItems: 'center', display: 'flex', flexWrap: 'wrap', fontSize: 14, gap: 8, marginBottom: 24 }}>
        <a href="/" style={NAV_LINK_STYLE}>Home</a>
        <a href={`/programs/${slug}`} style={NAV_LINK_STYLE}>← {program.title}</a>
      </nav>
      {!allowed ? (
        <p>This guided process opens after purchase. <a href={`/programs/${slug}`} style={{ color: 'inherit' }}>Back to the program page</a>.</p>
      ) : session ? (
        <SessionPlayer session={session} />
      ) : (
        <p>You have access. The guided steps have not been handed over yet.</p>
      )}
      <LegalLinks />
    </main>
  );
}
