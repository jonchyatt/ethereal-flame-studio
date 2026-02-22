/**
 * Agent Zero HTTP Client
 *
 * Communicates with Agent Zero REST API (Docker container, port 50001).
 * Methods: sendMessage(), searchMemory(), getStatus().
 * Graceful degradation: returns null/error when Agent Zero is unreachable.
 *
 * Phase M3: Agent Zero as Orchestration Brain
 */

const AGENT_ZERO_URL = process.env.AGENT_ZERO_URL || 'http://localhost:50001';
const AGENT_ZERO_TIMEOUT_MS = 30_000;

export interface AgentZeroResponse {
  success: boolean;
  message?: string;
  data?: unknown;
  error?: string;
}

/**
 * Send a message to Agent Zero for complex reasoning
 */
export async function sendMessage(
  message: string,
  context?: { sessionId?: number; project?: string }
): Promise<AgentZeroResponse> {
  try {
    const response = await fetchWithTimeout(`${AGENT_ZERO_URL}/api/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        project: context?.project || 'jarvis',
        context: context?.sessionId ? { sessionId: context.sessionId } : undefined,
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `Agent Zero returned ${response.status}`,
      };
    }

    const data = await response.json();
    return { success: true, message: data.response || data.message, data };
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.warn(`[AgentZero] Unreachable: ${msg}`);
    return { success: false, error: `Agent Zero unavailable: ${msg}` };
  }
}

/**
 * Search Agent Zero's memory/knowledge base
 */
export async function searchMemory(query: string): Promise<AgentZeroResponse> {
  try {
    const response = await fetchWithTimeout(`${AGENT_ZERO_URL}/api/memory/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, project: 'jarvis' }),
    });

    if (!response.ok) {
      return { success: false, error: `Agent Zero returned ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: `Memory search failed: ${error instanceof Error ? error.message : 'unknown'}` };
  }
}

/**
 * Check if Agent Zero is available
 */
export async function getStatus(): Promise<{ available: boolean; version?: string }> {
  try {
    const response = await fetchWithTimeout(`${AGENT_ZERO_URL}/api/status`, {
      method: 'GET',
    }, 5_000);

    if (!response.ok) {
      return { available: false };
    }

    const data = await response.json();
    return { available: true, version: data.version };
  } catch {
    return { available: false };
  }
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = AGENT_ZERO_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
