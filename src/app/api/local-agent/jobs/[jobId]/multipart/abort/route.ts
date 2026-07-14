import { NextRequest } from 'next/server';
import { handleLocalAgentCallback } from '@/lib/local-agent/callbackRoute';
import { abortLocalAgentMultipartUpload } from '@/lib/local-agent/jobCallbacks';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  return handleLocalAgentCallback(request, context, abortLocalAgentMultipartUpload);
}
