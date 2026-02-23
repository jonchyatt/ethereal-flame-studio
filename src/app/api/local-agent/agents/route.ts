import { NextRequest, NextResponse } from 'next/server';
import { getLeaseStore } from '@/lib/leases';
import { isAuthorizedLocalAgentAdminRequest } from '@/lib/local-agent/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAuthorizedLocalAgentAdminRequest(request)) {
    return NextResponse.json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 });
  }

  try {
    const leaseStore = getLeaseStore();
    const now = Date.now();
    const [presenceLeases, disabledLeases] = await Promise.all([
      leaseStore.list('local-agent:presence:'),
      leaseStore.list('local-agent:disabled:'),
    ]);

    const disabledById = new Map(
      disabledLeases
        .filter((lease) => new Date(lease.expiresAt).getTime() > now)
        .map((lease) => [
          lease.leaseKey.replace('local-agent:disabled:', ''),
          {
            expiresAt: lease.expiresAt,
            metadata: lease.metadata || {},
          },
        ]),
    );

    const activeAgents = presenceLeases
      .filter((lease) => new Date(lease.expiresAt).getTime() > now)
      .map((lease) => {
        const metadata = (lease.metadata || {}) as Record<string, unknown>;
        const agentId = String(metadata.agentId || lease.ownerId);
        const disabled = disabledById.get(agentId);
        return {
          agentId,
          label: typeof metadata.label === 'string' ? metadata.label : null,
          lastSeenAt: typeof metadata.lastSeenAt === 'string' ? metadata.lastSeenAt : lease.updatedAt,
          expiresAt: lease.expiresAt,
          capabilities: (metadata.capabilities && typeof metadata.capabilities === 'object') ? metadata.capabilities : {},
          disabled: !!disabled,
          disabledExpiresAt: disabled?.expiresAt || null,
          disabledMetadata: disabled?.metadata || null,
          metadata,
        };
      })
    const seen = new Set(activeAgents.map((agent) => agent.agentId));
    const disabledOnlyAgents = Array.from(disabledById.entries())
      .filter(([agentId]) => !seen.has(agentId))
      .map(([agentId, disabled]) => ({
        agentId,
        label: null,
        lastSeenAt: null,
        expiresAt: null,
        capabilities: {},
        disabled: true,
        disabledExpiresAt: disabled.expiresAt,
        disabledMetadata: disabled.metadata || null,
        metadata: {},
      }));

    const agents = [...activeAgents, ...disabledOnlyAgents].sort((a, b) => a.agentId.localeCompare(b.agentId));

    return NextResponse.json({ success: true, data: { agents } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' } },
      { status: 500 },
    );
  }
}
