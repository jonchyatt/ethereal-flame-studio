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
  /** Half-life in days for memory decay (default 30) */
  decayHalfLifeDays: number;

  /** Decay threshold above which memories are soft-deleted (default 0.9) */
  decayThreshold: number;
  /** Maximum tokens for conversation history (default 2000) */
  historyTokenBudget: number;
  /** Maximum messages to load from previous session for history (default 5) */
  maxHistoryMessages: number;
  /** Enable self-healing: retry, circuit breakers, error tracking (default true) */
  enableSelfHealing: boolean;
  /** Enable Telegram bot integration (default false) */
  enableTelegram: boolean;
  /** Enable Anthropic MCP Connector for Notion (default false) */
  enableMcpConnector: boolean;
  /** Notion MCP server URL */
  notionMcpUrl: string;
  /** Notion OAuth token for MCP Connector (empty = disabled) */
  notionOAuthToken: string;
  /** Enable self-improvement: conversation evaluation + behavior rules (default false) */
  enableSelfImprovement: boolean;
  /** Enable vector memory for semantic search (default: true when OPENAI_API_KEY is set) */
  enableVectorMemory: boolean;
  /** OpenAI API key for embedding generation (empty = disabled) */
  openaiApiKey: string;
}

/**
 * Get Jarvis configuration from environment.
 *
 * Environment variables:
 * - JARVIS_ENABLE_MEMORY: "false" to disable (default: true — stable since Phase C)
 * - JARVIS_MEMORY_TOKEN_BUDGET: token limit (default: 1000)
 * - JARVIS_MAX_MEMORIES: entry limit (default: 10)
 * - JARVIS_ENABLE_MCP: "true" to enable Notion MCP Connector (default: false)
 * - NOTION_MCP_URL: Notion MCP server URL (default: https://mcp.notion.com/mcp)
 * - NOTION_OAUTH_TOKEN: Notion OAuth token for MCP (empty = disabled)
 * - JARVIS_ENABLE_SELF_IMPROVEMENT: "true" to enable conversation evaluation + behavior rules
 */
export function getJarvisConfig(): JarvisConfig {
  return {
    enableMemoryLoading: process.env.JARVIS_ENABLE_MEMORY !== 'false',
    memoryTokenBudget: parseInt(process.env.JARVIS_MEMORY_TOKEN_BUDGET || '1000', 10),
    maxMemories: parseInt(process.env.JARVIS_MAX_MEMORIES || '10', 10),
    decayHalfLifeDays: parseInt(process.env.JARVIS_DECAY_HALF_LIFE || '30', 10),

    decayThreshold: parseFloat(process.env.JARVIS_DECAY_THRESHOLD || '0.9'),
    historyTokenBudget: parseInt(process.env.JARVIS_HISTORY_TOKEN_BUDGET || '2000', 10),
    maxHistoryMessages: parseInt(process.env.JARVIS_MAX_HISTORY_MESSAGES || '5', 10),
    enableSelfHealing: process.env.JARVIS_ENABLE_SELF_HEALING !== 'false', // ON by default
    enableTelegram: process.env.JARVIS_ENABLE_TELEGRAM === 'true',
    enableMcpConnector: process.env.JARVIS_ENABLE_MCP === 'true',
    notionMcpUrl: process.env.NOTION_MCP_URL || 'https://mcp.notion.com/mcp',
    notionOAuthToken: process.env.NOTION_OAUTH_TOKEN || '',
    enableSelfImprovement: process.env.JARVIS_ENABLE_SELF_IMPROVEMENT !== 'false', // ON by default
    enableVectorMemory: process.env.JARVIS_ENABLE_VECTOR_MEMORY !== 'false' && !!process.env.OPENAI_API_KEY,
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  };
}

// Note: Always call getJarvisConfig() instead of caching a singleton,
// since environment variables may differ between serverless invocations.
