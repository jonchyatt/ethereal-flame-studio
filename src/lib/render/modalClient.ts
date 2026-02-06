/**
 * Modal Cloud Render Client
 *
 * Submits render jobs to Modal.com and polls for status.
 * Gated behind MODAL_ENDPOINT_URL env var — when not set, unused.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ModalSubmitRequest {
  config: Record<string, unknown>;
  job_id: string;
  audio_url?: string;
  audio_base64?: string;
  callback_url?: string;
  gpu?: boolean;
  auth_token: string;
}

export interface ModalSubmitResponse {
  call_id: string;
  gpu: boolean;
  job_id: string;
  error?: string;
  status?: number;
}

export interface ModalStatusResponse {
  status: 'running' | 'completed' | 'failed' | 'unknown';
  result?: {
    status: string;
    r2_key: string;
  };
  error?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getSubmitUrl(): string {
  const url = process.env.MODAL_ENDPOINT_URL;
  if (!url) throw new Error('MODAL_ENDPOINT_URL is not configured');
  return url.replace(/\/+$/, '');
}

function getStatusUrl(): string {
  // Status endpoint URL: either explicit or derived from submit URL
  const statusUrl = process.env.MODAL_STATUS_URL;
  if (statusUrl) return statusUrl.replace(/\/+$/, '');
  // Derive from submit URL: replace "submit" label with "status"
  return getSubmitUrl().replace('ethereal-submit', 'ethereal-status');
}

function getAuthToken(): string {
  const token = process.env.MODAL_AUTH_TOKEN;
  if (!token) throw new Error('MODAL_AUTH_TOKEN is not configured');
  return token;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit a render job to Modal.
 *
 * @param options.config  - Render config object (version, audio, output, visual, options)
 * @param options.jobId   - Vercel job ID (used for callbacks)
 * @param options.audioUrl - URL to download audio from (mutually exclusive with audioBase64)
 * @param options.audioBase64 - Base64-encoded audio data
 * @param options.gpu     - Force GPU (auto-detected from format if omitted)
 */
export async function submitToModal(options: {
  config: Record<string, unknown>;
  jobId: string;
  audioUrl?: string;
  audioBase64?: string;
  gpu?: boolean;
}): Promise<ModalSubmitResponse> {
  const submitUrl = getSubmitUrl();
  const authToken = getAuthToken();

  // Determine callback URL — use VERCEL_URL if available
  const callbackBase =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);

  const body: ModalSubmitRequest = {
    config: options.config,
    job_id: options.jobId,
    audio_url: options.audioUrl,
    audio_base64: options.audioBase64,
    callback_url: callbackBase,
    gpu: options.gpu,
    auth_token: authToken,
  };

  const response = await fetch(submitUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Modal submit failed (${response.status}): ${text}`);
  }

  const data: ModalSubmitResponse = await response.json();

  if (data.error) {
    throw new Error(`Modal submit error: ${data.error}`);
  }

  return data;
}

/**
 * Check the status of a Modal render job via its call_id.
 */
export async function getModalJobStatus(callId: string): Promise<ModalStatusResponse> {
  const statusUrl = getStatusUrl();

  const response = await fetch(
    `${statusUrl}?call_id=${encodeURIComponent(callId)}`,
    { method: 'GET' },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Modal status check failed (${response.status}): ${text}`);
  }

  return response.json();
}
