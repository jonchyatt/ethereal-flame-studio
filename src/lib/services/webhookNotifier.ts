/**
 * Webhook notifier for render completion.
 * Sends job metadata to n8n for workflow automation.
 *
 * Phase 5, Plan 05-03
 */

/**
 * Webhook payload sent on render completion.
 */
export interface WebhookPayload {
  jobId: string;
  status: 'complete' | 'failed';
  audioFile: string;
  outputFiles: Array<{
    format: string;
    path: string;
    driveUrl?: string;
  }>;
  template: string;
  whisperDescription?: string;
  duration: number;
  timestamp: string;
  batchId?: string;
  errorMessage?: string;
}

/**
 * Configuration for webhook delivery.
 */
interface WebhookConfig {
  url: string;
  authHeader?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

/**
 * Notify n8n webhook when a render job completes.
 * Implements retry logic with exponential backoff.
 *
 * @param payload - Job completion data
 * @param config - Optional webhook configuration (defaults to env vars)
 * @returns true if webhook delivered successfully, false otherwise
 */
export async function notifyRenderComplete(
  payload: WebhookPayload,
  config?: Partial<WebhookConfig>
): Promise<boolean> {
  const url = config?.url || process.env.N8N_WEBHOOK_RENDER_URL;
  const authHeader = config?.authHeader || process.env.N8N_WEBHOOK_SECRET;
  const maxRetries = config?.maxRetries ?? 3;
  const retryDelayMs = config?.retryDelayMs ?? 5000;

  if (!url) {
    console.log('[Webhook] No webhook URL configured, skipping notification');
    return false;
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (authHeader) {
        headers['X-Webhook-Secret'] = authHeader;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        console.log(`[Webhook] Delivered successfully (attempt ${attempt})`);
        return true;
      }

      // Log non-2xx responses
      const responseText = await response.text().catch(() => 'Unable to read response');
      console.warn(
        `[Webhook] Failed with status ${response.status} (attempt ${attempt}): ${responseText}`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[Webhook] Error (attempt ${attempt}):`, message);
    }

    // Wait before retry with exponential backoff
    if (attempt < maxRetries) {
      const delay = retryDelayMs * attempt;
      console.log(`[Webhook] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(`[Webhook] Delivery failed after ${maxRetries} attempts`);
  return false;
}

/**
 * Build webhook payload from render job data.
 *
 * @param jobId - Unique job identifier
 * @param status - Job completion status
 * @param data - Job data and results
 * @returns WebhookPayload ready to send
 */
export function buildWebhookPayload(
  jobId: string,
  status: 'complete' | 'failed',
  data: {
    audioFile: string;
    outputPath?: string;
    outputFormat?: string;
    driveUrl?: string;
    template: string;
    whisperDescription?: string;
    duration?: number;
    batchId?: string;
    errorMessage?: string;
  }
): WebhookPayload {
  return {
    jobId,
    status,
    audioFile: data.audioFile,
    outputFiles: data.outputPath
      ? [
          {
            format: data.outputFormat || 'unknown',
            path: data.outputPath,
            driveUrl: data.driveUrl,
          },
        ]
      : [],
    template: data.template,
    whisperDescription: data.whisperDescription,
    duration: data.duration || 0,
    timestamp: new Date().toISOString(),
    batchId: data.batchId,
    errorMessage: data.errorMessage,
  };
}
