import { getProgram } from '@/lib/entitlements/catalog';
import { ProgramView } from './ProgramView';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const program = getProgram((await params).id);
  return program
    ? { title: `${program.title} · What Am I Appreciating Now`, description: program.summary }
    : { title: 'Program not found · What Am I Appreciating Now' };
}

export default async function ProgramPage({ params }: { params: Promise<{ id: string }> }) {
  return <ProgramView id={(await params).id} />;
}
