/**
 * Recurring Task Hook — Intelligence Gem #13 relocated
 *
 * Extracted from toolExecutor.ts for use as a post-tool-result hook.
 * When a task is completed and has a recurring frequency (Daily/Weekly/Monthly),
 * automatically creates the next instance.
 *
 * Used by both:
 * - Local path: called directly after complete_task tool result
 * - MCP path: called after MCP tool result indicates task completion
 */

import { retrievePage, createPage } from './NotionClient';
import {
  LIFE_OS_DATABASE_IDS,
  buildTaskProperties,
  calculateNextDueDate,
  TASK_PROPS,
} from './schemas';

/**
 * Check if a completed task is recurring and create the next instance.
 *
 * @param taskId - The Notion page ID of the completed task
 * @returns Description of what was created, or null if not recurring
 */
export async function handleRecurringTaskCompletion(taskId: string): Promise<string | null> {
  try {
    const page = await retrievePage(taskId) as {
      properties: Record<string, unknown>;
    };

    if (!page?.properties) {
      console.log('[RecurringHook] Could not retrieve task properties for recurrence check');
      return null;
    }

    // Extract frequency
    const frequencyProp = page.properties[TASK_PROPS.frequency] as {
      select?: { name?: string };
    };
    const frequency = frequencyProp?.select?.name;

    if (!frequency || frequency === 'One-time') {
      return null;
    }

    if (!['Daily', 'Weekly', 'Monthly'].includes(frequency)) {
      console.log(`[RecurringHook] Unknown frequency: ${frequency}, skipping`);
      return null;
    }

    // Extract title
    const titleProp = page.properties[TASK_PROPS.title] as {
      title?: Array<{ plain_text?: string }>;
    };
    const title = titleProp?.title?.[0]?.plain_text || 'Recurring Task';

    // Extract current due date
    const dueDateProp = page.properties[TASK_PROPS.dueDate] as {
      date?: { start?: string };
    };
    const currentDueDate = dueDateProp?.date?.start || null;

    // Calculate next due date
    const nextDueDate = calculateNextDueDate(
      currentDueDate,
      frequency as 'Daily' | 'Weekly' | 'Monthly'
    );

    // Extract priority (to preserve it)
    const priorityProp = page.properties[TASK_PROPS.priority] as {
      select?: { name?: string };
    };
    const priority = priorityProp?.select?.name;

    // Extract project relation (to preserve it)
    const projectProp = page.properties[TASK_PROPS.project] as {
      relation?: Array<{ id: string }>;
    };
    const projectId = projectProp?.relation?.[0]?.id;

    // Create the next instance
    const databaseId = LIFE_OS_DATABASE_IDS.tasks;
    if (!databaseId) {
      console.error('[RecurringHook] Task database ID not configured');
      return null;
    }

    const newProperties = buildTaskProperties({
      title,
      due_date: nextDueDate,
      frequency: frequency as 'Daily' | 'Weekly' | 'Monthly',
      priority,
      project_id: projectId,
    });

    await createPage(databaseId, newProperties);

    const msg = `Created next ${frequency.toLowerCase()} occurrence of "${title}" due ${nextDueDate}`;
    console.log(`[RecurringHook] ${msg}`);
    return msg;
  } catch (error) {
    console.error('[RecurringHook] Error handling recurring task completion:', error);
    return null;
  }
}
