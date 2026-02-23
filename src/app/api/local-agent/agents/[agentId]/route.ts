import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentAdminRequest } from '@/lib/local-agent/auth';
import { isLocalAgentDisabled, setLocalAgentDisabled } from '@/lib/local-agent/registry';

export const dynamic = 'force-dynamic';

const UpdateAgentSchema = z.object({
  disabled: z.boolean(),
  reason: z.string().max(500).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  if (!isAuthorizedLocalAgentAdminRequest(request)) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const { agentId } = await params;
    const body = await request.json();
    const parsed = UpdateAgentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } },
        { status: 400 },
      );
    }

    const leaseStore = getLeaseStore();
    const updated = await setLocalAgentDisabled(leaseStore, agentId, parsed.data.disabled, {
      reason: parsed.data.reason || null,
      actorId: 'admin-ui',
    });
    const current = await isLocalAgentDisabled(leaseStore, agentId);

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        disabled: current.disabled,
        disabledExpiresAt: updated.expiresAt,
        disabledMetadata: current.metadata || updated.metadata || null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
