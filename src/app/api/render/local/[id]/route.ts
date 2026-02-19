/**
 * Local Render Job Status - GET for status, DELETE to cancel
 */
import { NextRequest, NextResponse } from 'next/server';
import { getLocalRenderJob, cancelLocalRender } from '@/lib/render/localRenderManager';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = getLocalRenderJob(id);

  if (!job) {
    return NextResponse.json(
      { success: false, error: 'Job not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: { job } });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cancelled = cancelLocalRender(id);

  if (!cancelled) {
    return NextResponse.json(
      { success: false, error: 'Job not found or already completed' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
