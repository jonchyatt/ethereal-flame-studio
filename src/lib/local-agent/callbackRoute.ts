import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { getJobStore } from '@/lib/jobs';
import { getLeaseStore } from '@/lib/leases';
import { getStorageAdapter } from '@/lib/storage';
import { isAuthorizedLocalAgentRequest } from './auth';
import { LocalAgentCallbackError, type LocalAgentCallbackDeps } from './jobCallbacks';

type RouteContext = { params: Promise<{ jobId: string }> };
type CallbackHandler<T> = (
  deps: LocalAgentCallbackDeps,
  jobId: string,
  body: unknown,
) => Promise<T>;

export async function handleLocalAgentCallback<T>(
  request: NextRequest,
  context: RouteContext,
  handler: CallbackHandler<T>,
) {
  if (!isAuthorizedLocalAgentRequest(request)) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 },
    );
  }

  try {
    const [{ jobId }, body] = await Promise.all([context.params, request.json()]);
    const data = await handler(
      { jobs: getJobStore(), leases: getLeaseStore(), storage: getStorageAdapter() },
      jobId,
      body,
    );
    return NextResponse.json({ success: true, data });
  } catch (error) {
    if (error instanceof ZodError || error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error instanceof ZodError ? error.message : 'Request body must be valid JSON',
          },
        },
        { status: 400 },
      );
    }
    if (error instanceof LocalAgentCallbackError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    console.error('[local-agent/callback]', error);
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Local-agent callback failed' } },
      { status: 500 },
    );
  }
}
