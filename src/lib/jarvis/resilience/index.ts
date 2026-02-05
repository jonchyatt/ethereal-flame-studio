/**
 * Resilience Module Exports (Phase 14)
 *
 * Self-healing utilities: retry, circuit breaker, error classification, error tracking.
 */

export { classifyError, type ClassifiedError, type ErrorClass } from './errorClassifier';
export { withRetry, type RetryOptions } from './withRetry';
export { CircuitBreaker, CircuitOpenError, getBreaker, getServiceHealth, type CircuitState } from './CircuitBreaker';
export { trackErrorPattern } from './errorTracking';
