/**
 * Claude Code SDK Brain — Jarvis v5.0
 *
 * Uses @anthropic-ai/claude-code SDK for $0 LLM cost on Max subscription.
 * Opus 4.6 brain with agent capabilities (browser, file system, shell).
 *
 * Session resumption: pass sessionId to resume a previous conversation.
 * Reference: C:/Users/jonch/Projects/claudeclaw/src/agent.ts
 */

import { query, type SDKMessage } from '@anthropic-ai/claude-code';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CCodeBrainRequest {
  systemPrompt: string;
  userMessage: string;
  cwd?: string;
  sessionId?: string;
  onToolUse?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string) => void;
}

export interface CCodeBrainResult {
  success: boolean;
  responseText: string;
  error?: string;
  toolsUsed: string[];
  sessionId?: string;
}

// Build a clean env for the Claude Code SDK subprocess:
// - Strip CLAUDECODE to allow nested process spawning
// - Strip ANTHROPIC_API_KEY so the SDK uses Max subscription auth
//   (the API key in .env.local is for other services; if passed to the SDK,
//   it overrides the subscription and hits a zero-credit direct API account)
const ENV_KEYS_TO_STRIP = new Set(['CLAUDECODE', 'ANTHROPIC_API_KEY']);

function getCleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (!ENV_KEYS_TO_STRIP.has(k) && v !== undefined) env[k] = v;
  }
  return env;
}

const JARVIS_ALLOWED_TOOLS = [
  'Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep',
  'WebSearch', 'WebFetch',
  'mcp__jarvis-tools__*',
];

// ---------------------------------------------------------------------------
// Core
// ---------------------------------------------------------------------------

export async function thinkWithSdk(request: CCodeBrainRequest): Promise<CCodeBrainResult> {
  const {
    systemPrompt, userMessage,
    cwd = process.cwd(), sessionId,
    onToolUse, onToolResult,
  } = request;

  const toolsUsed: string[] = [];
  let resultText: string | null = null;
  let newSessionId: string | undefined;

  try {
    const cleanEnv = getCleanEnv();

    const conversation = query({
      prompt: userMessage,
      options: {
        cwd,
        customSystemPrompt: systemPrompt,
        allowedTools: JARVIS_ALLOWED_TOOLS,
        permissionMode: 'bypassPermissions',
        env: cleanEnv,
        pathToClaudeCodeExecutable: 'C:\\Users\\jonch\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Anthropic.ClaudeCode_Microsoft.Winget.Source_8wekyb3d8bbwe\\claude.exe',
        stderr: (data: string) => console.error('[CCodeBrain stderr]', data),
        ...(sessionId ? { resume: sessionId } : {}),
      },
    });

    for await (const event of conversation) {
      if (event.type === 'system' && event.subtype === 'init') {
        newSessionId = event.session_id;
      } else if (event.type === 'assistant') {
        // SDKAssistantMessage has message.content with tool_use blocks
        const msg = event.message;
        if (msg?.content) {
          for (const block of msg.content) {
            if (block.type === 'tool_use') {
              toolsUsed.push(block.name);
              onToolUse?.(block.name, (block.input as Record<string, unknown>) || {});
            }
          }
        }
      } else if (event.type === 'result') {
        if ('result' in event && typeof event.result === 'string') {
          resultText = event.result;
        }
      }
    }

    return {
      success: !!resultText,
      responseText: resultText || 'No response from Claude Code SDK.',
      toolsUsed,
      sessionId: newSessionId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'SDK execution failed';
    console.error('[CCodeBrain] Error:', err);
    return { success: false, responseText: '', error: message, toolsUsed, sessionId: newSessionId };
  }
}
