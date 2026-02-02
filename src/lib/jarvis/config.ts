/**
 * Jarvis Feature Configuration
 *
 * Centralized feature flags for controlled rollout.
 * Read from environment variables with sensible defaults.
 */

export interface JarvisConfig {
  /** Enable memory loading from database at session start */
  enableMemoryLoading: boolean;
  /** Maximum tokens to use for memory context (default 1000) */
  memoryTokenBudget: number;
  /** Maximum number of memories to load (default 10) */
  maxMemories: number;
}

/**
 * Get Jarvis configuration from environment.
 *
 * Environment variables:
 * - JARVIS_ENABLE_MEMORY: "true" to enable (default: false during rollout)
 * - JARVIS_MEMORY_TOKEN_BUDGET: token limit (default: 1000)
 * - JARVIS_MAX_MEMORIES: entry limit (default: 10)
 */
export function getJarvisConfig(): JarvisConfig {
  return {
    enableMemoryLoading: process.env.JARVIS_ENABLE_MEMORY === 'true',
    memoryTokenBudget: parseInt(process.env.JARVIS_MEMORY_TOKEN_BUDGET || '1000', 10),
    maxMemories: parseInt(process.env.JARVIS_MAX_MEMORIES || '10', 10),
  };
}

// Singleton for convenience
export const jarvisConfig = getJarvisConfig();
