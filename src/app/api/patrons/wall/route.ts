import { NextRequest, NextResponse } from 'next/server';
import { getStorageAdapter } from '@/lib/storage';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';
import { publishWallSnapshot } from '@/lib/patrons/wall';

export const dynamic = 'force-dynamic';

/** Operator: freeze the currently approved patrons (no removal request) as the public wall snapshot. */
export async function POST(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status });
  const wall = await publishWallSnapshot(getStorageAdapter());
  return NextResponse.json({ publishedAt: wall.publishedAt, hash: wall.hash, count: wall.list.patrons.length });
}
