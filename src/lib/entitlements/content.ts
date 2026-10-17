import { getStorageAdapter } from '@/lib/storage';

/**
 * Program words are handed over by Jonathan and live in private storage
 * (`programs/<id>.md`), never in this public repo and never invented here.
 */
export async function loadProgramContent(programId: string): Promise<string | null> {
  const buf = await getStorageAdapter().get(`programs/${programId}.md`);
  return buf ? buf.toString('utf8') : null;
}
