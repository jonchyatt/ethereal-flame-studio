import { NextRequest, NextResponse } from 'next/server';
import { getJobStore } from '@/lib/jobs';
import { buildApprovalQueue } from '@/lib/playlist-batch/approvalQueue';
import { authenticateWaiaOperator } from '@/lib/waia/operator-auth';

export const dynamic = 'force-dynamic';

/** Read-only: lists items awaiting the curation gate. Approve/reject go through the existing review route. */
export async function GET(request: NextRequest) {
  const auth = authenticateWaiaOperator(request);
  if (!auth.ok) return NextResponse.json({ success: false, error: auth }, { status: auth.status });
  try {
    const queue = await buildApprovalQueue(getJobStore());
    return NextResponse.json({ success: true, data: { queue } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
