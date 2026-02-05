/**
 * Error Classifier for Jarvis Self-Healing (Phase 14)
 *
 * Classifies caught errors into categories that drive retry/circuit-breaker decisions.
 * Works with Anthropic SDK (APIError.status), Notion SDK (APIResponseError.status),
 * and generic fetch errors.
 */

export type ErrorClass = 'transient' | 'auth' | 'permanent' | 'unknown';

export interface ClassifiedError {
  class: ErrorClass;
  retryable: boolean;
  retryAfterMs?: number;
  message: string;
  serviceName: string;
}

/**
 * Extract HTTP status code from various error types.
 */
function getStatusCode(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    // Anthropic SDK: APIError.status, Notion SDK: APIResponseError.status
    const e = error as { status?: number; statusCode?: number };
    return e.status ?? e.statusCode;
  }
  return undefined;
}

/**
 * Extract Retry-After header value in milliseconds.
 */
function getRetryAfterMs(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null) {
    const e = error as { headers?: Record<string, string> };
    const retryAfter = e.headers?.['retry-after'];
    if (retryAfter) {
      const seconds = parseInt(retryAfter, 10);
      if (!isNaN(seconds)) return seconds * 1000;
    }
  }
  return undefined;
}

/**
 * Get the error message from any error type.
 */
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return String(error);
}

/**
 * Classify an error for retry/circuit-breaker decisions.
 *
 * Priority order:
 * 1. HTTP 429 → transient, retryAfterMs from header or 1000ms
 * 2. HTTP 401/403 → auth
 * 3. HTTP 404 → permanent
 * 4. HTTP 500-599 → transient
 * 5. Message contains timeout/network keywords → transient
 * 6. Message contains auth keywords → auth
 * 7. Everything else → unknown (not retryable)
 */
export function classifyError(error: unknown, serviceName: string): ClassifiedError {
  const status = getStatusCode(error);
  const message = getErrorMessage(error);
  const lowerMessage = message.toLowerCase();

  // 1. Rate limited
  if (status === 429) {
    return {
      class: 'transient',
      retryable: true,
      retryAfterMs: getRetryAfterMs(error) ?? 1000,
      message,
      serviceName,
    };
  }

  // 2. Auth errors
  if (status === 401 || status === 403) {
    return { class: 'auth', retryable: false, message, serviceName };
  }

  // 3. Not found
  if (status === 404) {
    return { class: 'permanent', retryable: false, message, serviceName };
  }

  // 4. Server errors (including 529 overloaded)
  if (status && status >= 500 && status <= 599) {
    return { class: 'transient', retryable: true, message, serviceName };
  }

  // 5. Network/timeout keywords
  if (/timeout|econnrefused|network|econnreset|overloaded|socket hang up|fetch failed/i.test(lowerMessage)) {
    return { class: 'transient', retryable: true, message, serviceName };
  }

  // 6. Auth keywords
  if (/token|auth|credential|unauthorized/i.test(lowerMessage)) {
    return { class: 'auth', retryable: false, message, serviceName };
  }

  // 7. Default: unknown, not retryable
  return { class: 'unknown', retryable: false, message, serviceName };
}
