import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadProgramContent } from '@/lib/entitlements/content';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';
import { BuyButton } from './BuyButton';
import { CounterBeacon } from '@/components/CounterBeacon';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const program = getProgram((await params).id);
  return program
    ? { title: `${program.title} · What Am I Appreciating Now`, description: program.summary }
    : { title: 'Program not found · What Am I Appreciating Now' };
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = getProgram(id);
  if (!program) notFound();

  let allowed = false;
  try {
    const customerId = verifyCustomerCookie((await cookies()).get(CUSTOMER_COOKIE)?.value);
    allowed = !!customerId && hasAccess(await loadRecord(customerId), id);
  } catch { /* storage or secret unavailable: fail closed */ }
  const content = allowed ? await loadProgramContent(id) : null;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px', color: '#eee', background: '#0b0b14', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <CounterBeacon page="program" slug={program.id} />
      <p><a href="/programs" style={{ color: 'inherit' }}>← Programs</a></p>
      <h1>{program.title}</h1>
      <p>{program.summary}</p>
      <p style={{ fontSize: 14, opacity: 0.7 }}>{program.provenance}</p>
      {allowed && program.guided && (
        <p><a href={`/programs/${id}/session`} style={{ color: 'inherit', fontWeight: 600 }}>Open the guided process →</a></p>
      )}
      {allowed ? (
        content ? <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{content}</pre>
          : <p>You have access. The program words have not been handed over yet.</p>
      ) : (
        <BuyButton programId={program.id} kind={program.kind} />
      )}
    </main>
  );
}
