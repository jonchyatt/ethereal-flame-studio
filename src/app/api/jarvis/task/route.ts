/**
 * Task Update API Route
 *
 * Direct API for updating task status from the dashboard UI.
 * Bypasses Claude for simple operations like marking tasks complete.
 */

import { updatePage } from '@/lib/jarvis/notion/NotionClient';
import { buildTaskStatusUpdate } from '@/lib/jarvis/notion/schemas';

export async function POST(request: Request): Promise<Response> {
  try {
    const { taskId, status } = await request.json();

    if (!taskId || !status) {
      return new Response(
        JSON.stringify({ error: 'taskId and status are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Validate status
    const validStatuses = ['pending', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[TaskAPI] Updating task ${taskId} to ${status}`);

    const properties = buildTaskStatusUpdate(status);
    await updatePage(taskId, properties);

    console.log(`[TaskAPI] Task ${taskId} updated successfully`);

    return new Response(
      JSON.stringify({ success: true, taskId, status }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[TaskAPI] Error:', error);

    // Don't leak internal error details (Notion SDK errors can contain tokens/URLs)
    return new Response(
      JSON.stringify({ error: 'Failed to update task' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
