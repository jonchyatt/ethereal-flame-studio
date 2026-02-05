/**
 * Circuit Breaker for Jarvis Self-Healing (Phase 14)
 *
 * Prevents hammering a failing service. Simple state machine:
 * - CLOSED: normal operation, count consecutive failures
 * - OPEN: reject immediately, wait for cooldown
 * - HALF_OPEN: allow one probe request, close on success or re-open on failure
 */

import { getJarvisConfig } from '../config';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private consecutiveSuccesses = 0;
  private lastFailureTime = 0;
  private lastErrorMessage?: string;

  constructor(
    public readonly serviceName: string,
    private failureThreshold = 5,
    private successThreshold = 2,
    private openDurationMs = 30_000
  ) {}

  /**
   * Execute fn through the circuit breaker.
   *
   * CLOSED: pass through, count failures
   * OPEN: reject immediately with CircuitOpenError
   * HALF_OPEN: allow one attempt, close on success or re-open on failure
   *
   * When enableSelfHealing is false, passes through without tracking.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const config = getJarvisConfig();

    // Feature flag: when off, just pass through
    if (!config.enableSelfHealing) {
      return fn();
    }

    // Check if we should transition from OPEN → HALF_OPEN
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed >= this.openDurationMs) {
        this.state = 'HALF_OPEN';
        this.consecutiveSuccesses = 0;
        console.log(`[CircuitBreaker] ${this.serviceName} HALF_OPEN (cooldown elapsed)`);
      } else {
        throw new CircuitOpenError(this.serviceName, this.lastErrorMessage);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.consecutiveSuccesses++;
      if (this.consecutiveSuccesses >= this.successThreshold) {
        this.state = 'CLOSED';
        this.consecutiveFailures = 0;
        console.log(`[CircuitBreaker] ${this.serviceName} CLOSED (recovered)`);
      }
    } else {
      // CLOSED: reset failure count on success
      this.consecutiveFailures = 0;
    }
  }

  private onFailure(error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    this.lastErrorMessage = msg.slice(0, 200);
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN re-opens the circuit
      this.state = 'OPEN';
      console.log(`[CircuitBreaker] ${this.serviceName} OPEN (half-open probe failed)`);
    } else {
      // CLOSED: count consecutive failures
      this.consecutiveFailures++;
      if (this.consecutiveFailures >= this.failureThreshold) {
        this.state = 'OPEN';
        console.log(
          `[CircuitBreaker] ${this.serviceName} OPEN after ${this.consecutiveFailures} consecutive failures`
        );
      }
    }
  }

  /** Current state for health reporting */
  getHealth(): { state: CircuitState; failures: number; lastError?: string } {
    return {
      state: this.state,
      failures: this.consecutiveFailures,
      lastError: this.lastErrorMessage,
    };
  }

  /** Is this service currently available? */
  isAvailable(): boolean {
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      return elapsed >= this.openDurationMs;
    }
    return true;
  }
}

/**
 * Error thrown when circuit breaker is OPEN and blocking requests.
 */
export class CircuitOpenError extends Error {
  constructor(serviceName: string, lastError?: string) {
    super(
      `Circuit breaker OPEN for ${serviceName}. Service is temporarily unavailable.${
        lastError ? ` Last error: ${lastError}` : ''
      }`
    );
    this.name = 'CircuitOpenError';
  }
}

// --- Service Registry (singleton Map) ---

const registry = new Map<string, CircuitBreaker>();

/** Get or create a circuit breaker for a service */
export function getBreaker(serviceName: string): CircuitBreaker {
  let breaker = registry.get(serviceName);
  if (!breaker) {
    breaker = new CircuitBreaker(serviceName);
    registry.set(serviceName, breaker);
  }
  return breaker;
}

/** Get health status of all tracked services */
export function getServiceHealth(): Record<string, { state: CircuitState; failures: number; lastError?: string }> {
  const health: Record<string, { state: CircuitState; failures: number; lastError?: string }> = {};
  for (const [name, breaker] of registry) {
    health[name] = breaker.getHealth();
  }
  return health;
}
