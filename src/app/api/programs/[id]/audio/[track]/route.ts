import { NextRequest, NextResponse } from 'next/server';
import { getProgram } from '@/lib/entitlements/catalog';
import { loadAudioManifest, loadTrackBytes } from '@/lib/entitlements/audio';
import { parseRange } from '@/lib/entitlements/audio-logic';
import { hasAccess, loadRecord } from '@/lib/entitlements/model';
import { CUSTOMER_COOKIE, verifyCustomerCookie } from '@/lib/entitlements/session';

export const dynamic = 'force-dynamic';

const PRIVATE = { 'Cache-Control': 'private, no-store' };

/** Gated audio with Range support so seeking and resuming work. Fail-closed. */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string; track: string }> }) {
  const { id, track: trackId } = await ctx.params;
  if (!getProgram(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  let customerId: string | null = null;
  try { customerId = verifyCustomerCookie(req.cookies.get(CUSTOMER_COOKIE)?.value); } catch { /* secret unset: fail closed */ }
  let allowed = false;
  try { allowed = !!customerId && hasAccess(await loadRecord(customerId), id); } catch { /* storage down: fail closed */ }
  if (!allowed) return NextResponse.json({ error: 'Subscription or purchase required' }, { status: 402, headers: PRIVATE });

  const track = (await loadAudioManifest(id)).find((t) => t.id === trackId);
  const bytes = track ? await loadTrackBytes(id, track) : null;
  if (!track || !bytes) return NextResponse.json({ error: 'Audio not yet handed over' }, { status: 404, headers: PRIVATE });

  const base = { ...PRIVATE, 'Content-Type': track.contentType, 'Accept-Ranges': 'bytes' };
  const range = parseRange(req.headers.get('range'), bytes.length);
  if (range === 'unsatisfiable') {
    return new NextResponse(null, { status: 416, headers: { ...base, 'Content-Range': `bytes */${bytes.length}` } });
  }
  if (!range) {
    return new NextResponse(new Uint8Array(bytes), { headers: { ...base, 'Content-Length': String(bytes.length) } });
  }
  const part = bytes.subarray(range.start, range.end + 1);
  return new NextResponse(new Uint8Array(part), {
    status: 206,
    headers: { ...base, 'Content-Length': String(part.length), 'Content-Range': `bytes ${range.start}-${range.end}/${bytes.length}` },
  });
}
