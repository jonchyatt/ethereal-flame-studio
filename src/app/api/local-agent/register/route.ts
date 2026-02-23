import { NextRequest, NextResponse } from 'next/server';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentRequest } from '@/lib/local-agent/auth';
import {
  LocalAgentPresencePayloadSchema,
  isLocalAgentDisabled,
  upsertLocalAgentPresence,
} from '@/lib/local-agent/registry';

export const dynamic = 'force-dynamic';

const RegisterSchema = LocalAgentPresencePayloadSchema;

export async function POST(request: NextRequest) {
  if (!isAuthorizedLocalAgentRequest(request)) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.message } }, { status: 400 });
    }

    const { agentId } = parsed.data;
    const leaseStore = getLeaseStore();

    const disabledState = await isLocalAgentDisabled(leaseStore, agentId);
    if (disabledState.disabled) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'AGENT_DISABLED', message: 'This local agent is disabled' },
          data: { disabled: true, disabledMeta: disabledState.metadata || {} },
        },
        { status: 403 },
      );
    }

    const lease = await upsertLocalAgentPresence(leaseStore, parsed.data);

    if (!lease.acquired || !lease.lease) {
      return NextResponse.json({ success: false, error: { code: 'LEASE_FAILED', message: 'Could not acquire presence lease' } }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      data: {
        agentId,
        leaseKey: lease.lease.leaseKey,
        leaseToken: lease.lease.token,
        expiresAt: lease.lease.expiresAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
