/**
 * Push notifications via ntfy.
 * Provides job status notifications for mobile users.
 *
 * Phase 4, Plan 04-07
 */

const NTFY_URL = process.env.NTFY_URL || 'https://ntfy.sh';
const NTFY_TOPIC = process.env.NTFY_TOPIC || '';

type Priority = 'min' | 'low' | 'default' | 'high' | 'urgent';

interface NotificationOptions {
  title: string;
  message: string;
  priority?: Priority;
  tags?: string[];
  click?: string;  // URL to open on click
  actions?: Array<{
    action: 'view' | 'http';
    label: string;
    url: string;
  }>;
}

/**
 * Send a notification via ntfy.
 */
export async function sendNotification(options: NotificationOptions): Promise<boolean> {
  if (!NTFY_TOPIC) {
    console.log('[Notify] Skipped - no topic configured');
    return false;
  }

  try {
    const headers: Record<string, string> = {
      'Title': options.title,
      'Priority': options.priority || 'default',
    };

    if (options.tags?.length) {
      headers['Tags'] = options.tags.join(',');
    }

    if (options.click) {
      headers['Click'] = options.click;
    }

    if (options.actions?.length) {
      headers['Actions'] = options.actions
        .map(a => `${a.action}, ${a.label}, ${a.url}`)
        .join('; ');
    }

    const response = await fetch(`${NTFY_URL}/${NTFY_TOPIC}`, {
      method: 'POST',
      headers,
      body: options.message,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    console.log(`[Notify] Sent: ${options.title}`);
    return true;

  } catch (error) {
    console.error('[Notify] Failed:', error);
    return false;
  }
}

/**
 * Batch status for notifications.
 */
export interface BatchStatus {
  batchId: string;
  total: number;
  completed: number;
  failed: number;
}

/**
 * Notify when a batch completes.
 */
export async function notifyBatchComplete(status: BatchStatus): Promise<void> {
  const allSucceeded = status.failed === 0;
  const allFailed = status.completed === 0;

  let title: string;
  let priority: Priority;
  let tags: string[];

  if (allSucceeded) {
    title = `Batch Complete: ${status.completed} videos`;
    priority = 'default';
    tags = ['white_check_mark', 'movie_camera'];
  } else if (allFailed) {
    title = `Batch Failed: ${status.total} videos`;
    priority = 'high';
    tags = ['x', 'warning'];
  } else {
    title = `Batch Partial: ${status.completed}/${status.total} succeeded`;
    priority = 'high';
    tags = ['warning', 'movie_camera'];
  }

  const message = [
    `Completed: ${status.completed}`,
    `Failed: ${status.failed}`,
    `Batch ID: ${status.batchId.slice(0, 8)}...`,
  ].join('\n');

  await sendNotification({
    title,
    message,
    priority,
    tags,
  });
}

/**
 * Notify when a job fails.
 */
export async function notifyJobFailed(
  jobId: string,
  audioName: string,
  errorMessage: string
): Promise<void> {
  await sendNotification({
    title: `Render Failed: ${audioName}`,
    message: `Error: ${errorMessage.slice(0, 200)}`,
    priority: 'high',
    tags: ['x', 'movie_camera'],
  });
}

/**
 * Notify when a batch starts.
 */
export async function notifyBatchStarted(
  batchId: string,
  fileCount: number,
  formatCount: number
): Promise<void> {
  const totalJobs = fileCount * formatCount;

  await sendNotification({
    title: `Batch Started: ${fileCount} files`,
    message: `Rendering ${totalJobs} videos (${formatCount} formats each)\nBatch ID: ${batchId.slice(0, 8)}...`,
    priority: 'low',
    tags: ['hourglass_flowing_sand', 'movie_camera'],
  });
}

/**
 * Check if notifications are configured.
 */
export function isNotificationsEnabled(): boolean {
  return Boolean(NTFY_TOPIC);
}
