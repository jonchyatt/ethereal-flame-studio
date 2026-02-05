/**
 * Error Tracking Bridge for Jarvis Self-Healing (Phase 14)
 *
 * Bridges error classification with the existing observation pipeline.
 * Fire-and-forget — never blocks the caller.
 *
 * Only tracks transient errors (the ones that indicate service issues).
 * Auth and permanent errors are one-off problems, not patterns.
 *
 * After 3 observations in 7 days → stored as memory entry via observeAndInfer.
 */

import { classifyError } from './errorClassifier';
import { observeAndInfer } from '../memory/preferenceInference';

/**
 * Track a recurring error pattern via the observation pipeline.
 *
 * Pattern format: "{service}_{errorClass}_error" e.g. "notion_transient_error"
 */
export async function trackErrorPattern(
  error: unknown,
  serviceName: string,
  operation: string,
  sessionId?: number
): Promise<void> {
  try {
    const classified = classifyError(error, serviceName);

    // Only track transient errors as patterns (auth/permanent are one-offs)
    if (classified.class !== 'transient') return;

    const pattern = `${serviceName}_${classified.class}_error`;
    const evidence = `${operation} failed: ${classified.message.slice(0, 200)}`;

    await observeAndInfer(pattern, 'error_pattern', evidence, sessionId);
  } catch (trackingError) {
    // Never let tracking itself cause failures
    console.error('[ErrorTracking] Failed to track error pattern:', trackingError);
  }
}
