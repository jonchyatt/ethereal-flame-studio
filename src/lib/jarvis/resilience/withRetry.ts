/**
 * Retry Utility for Jarvis Self-Healing (Phase 14)
 *
 * Wraps any async function with exponential backoff + jitter.
 * Uses classifyError() to decide whether to retry — non-retryable errors
 * throw immediately (no wasted attempts).
 */

import { classifyError } from './errorClassifier';
import { getJarvisConfig } from '../config';

export interface RetryOptions {
  /** Maximum number of attempts (default: 3) */
  maxAttempts?: number;
  /** Initial delay in ms before first retry (default: 200) */
  initialDelayMs?: number;
  /** Maximum delay in ms (default: 5000) */
  maxDelayMs?: number;
  /** Backoff multiplier per attempt (default: 2) */
  backoffMultiplier?: number;
  /** Add ±10% jitter to delay (default: true) */
  jitter?: boolean;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 200,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Sleep for a given number of milliseconds.
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Calculate delay with optional jitter (±10%).
 */
function calculateDelay(
  attempt: number,
  options: Required<RetryOptions>
): number {
  let delay = options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);
  delay = Math.min(delay, options.maxDelayMs);

  if (options.jitter) {
    const jitterRange = delay * 0.1;
    delay += (Math.random() * 2 - 1) * jitterRange;
  }

  return Math.round(delay);
}

/**
 * Execute fn with retry on transient errors.
 *
 * Backoff: 200ms → 400ms → 800ms (with jitter)
 * Non-retryable errors (auth, permanent) throw immediately.
 *
 * When enableSelfHealing is false, runs fn() once with no retry.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  serviceName: string,
  options?: RetryOptions
): Promise<T> {
  const config = getJarvisConfig();

  // Feature flag: when off, just run once
  if (!config.enableSelfHealing) {
    return fn();
  }

  const opts: Required<RetryOptions> = { ...DEFAULT_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      const classified = classifyError(error, serviceName);

      // Non-retryable: throw immediately
      if (!classified.retryable) {
        throw error;
      }

      // Last attempt: throw
      if (attempt >= opts.maxAttempts) {
        break;
      }

      // Calculate delay (use Retry-After if available, otherwise backoff)
      const delay = classified.retryAfterMs
        ? Math.min(classified.retryAfterMs, opts.maxDelayMs)
        : calculateDelay(attempt, opts);

      console.log(
        `[Retry] ${serviceName} attempt ${attempt}/${opts.maxAttempts}, retrying in ${delay}ms: ${classified.message.slice(0, 100)}`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}
