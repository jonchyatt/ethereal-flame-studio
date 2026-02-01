/**
 * Notion MCP Client
 *
 * Singleton MCP client for communicating with the Notion MCP server.
 * Uses stdio transport to spawn `npx -y @notionhq/notion-mcp-server`.
 *
 * This module provides:
 * - ensureMCPRunning(): Start MCP process if not running
 * - sendMCPRequest(method, params): Send JSON-RPC request
 * - callMCPTool(name, args): Wrapper for tools/call
 * - closeMCPClient(): Clean shutdown
 */

import { spawn, ChildProcess } from 'child_process';

// MCP client state
let mcpProcess: ChildProcess | null = null;
let requestId = 0;
let initialized = false;
let initializePromise: Promise<void> | null = null;

// Pending requests map for JSON-RPC response matching
const pendingRequests = new Map<
  number,
  {
    resolve: (value: unknown) => void;
    reject: (error: Error) => void;
    timeoutId: ReturnType<typeof setTimeout>;
  }
>();

// Default timeout for MCP requests (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;

// Buffer for incomplete JSON lines
let stdoutBuffer = '';

/**
 * Ensure the MCP process is running and initialized
 */
export async function ensureMCPRunning(): Promise<void> {
  // If already initialized, return immediately
  if (initialized && mcpProcess && !mcpProcess.killed) {
    return;
  }

  // If initialization is in progress, wait for it
  if (initializePromise) {
    return initializePromise;
  }

  // Start new initialization
  initializePromise = new Promise<void>((resolve, reject) => {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
      reject(new Error('NOTION_TOKEN environment variable is required'));
      initializePromise = null;
      return;
    }

    console.log('[MCP] Starting Notion MCP server...');

    // Use spawn without shell for Windows compatibility
    mcpProcess = spawn('npx', ['-y', '@notionhq/notion-mcp-server'], {
      env: {
        ...process.env,
        NOTION_TOKEN: notionToken,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
      // Windows compatibility: use shell only on Windows
      shell: process.platform === 'win32',
    });

    // Handle stdout - parse JSON-RPC responses
    mcpProcess.stdout?.on('data', (data: Buffer) => {
      stdoutBuffer += data.toString();

      // Process complete lines
      const lines = stdoutBuffer.split('\n');
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const response = JSON.parse(line);

          // Handle responses with IDs (request responses)
          if (response.id !== undefined) {
            const pending = pendingRequests.get(response.id);
            if (pending) {
              clearTimeout(pending.timeoutId);
              pendingRequests.delete(response.id);

              if (response.error) {
                pending.reject(
                  new Error(response.error.message || 'MCP request failed')
                );
              } else {
                pending.resolve(response.result);
              }
            }
          }

          // Handle notifications (no ID)
          if (response.method) {
            console.log(`[MCP] Notification: ${response.method}`);
          }
        } catch {
          // Non-JSON output, log it
          if (line.trim()) {
            console.log('[MCP stdout]', line);
          }
        }
      }
    });

    // Handle stderr
    mcpProcess.stderr?.on('data', (data: Buffer) => {
      const message = data.toString().trim();
      if (message) {
        console.error('[MCP stderr]', message);
      }
    });

    // Handle process errors
    mcpProcess.on('error', (err) => {
      console.error('[MCP] Process error:', err);
      if (!initialized) {
        reject(err);
        initializePromise = null;
      }
    });

    // Handle process exit
    mcpProcess.on('exit', (code, signal) => {
      console.log(`[MCP] Process exited with code ${code}, signal ${signal}`);
      mcpProcess = null;
      initialized = false;
      initializePromise = null;

      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        clearTimeout(pending.timeoutId);
        pending.reject(new Error('MCP process exited'));
        pendingRequests.delete(id);
      }
    });

    // Send initialize request
    const initRequest = sendMCPRequestInternal('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'jarvis', version: '1.0.0' },
    });

    initRequest
      .then(() => {
        // Send initialized notification
        const notification = JSON.stringify({
          jsonrpc: '2.0',
          method: 'notifications/initialized',
        });
        mcpProcess?.stdin?.write(notification + '\n');

        initialized = true;
        console.log('[MCP] Notion MCP server initialized');
        resolve();
      })
      .catch((err) => {
        console.error('[MCP] Initialization failed:', err);
        closeMCPClient();
        reject(err);
        initializePromise = null;
      });
  });

  return initializePromise;
}

/**
 * Internal function to send MCP request (used during initialization)
 */
function sendMCPRequestInternal(
  method: string,
  params: unknown
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (!mcpProcess || mcpProcess.killed) {
      reject(new Error('MCP process not running'));
      return;
    }

    const id = ++requestId;

    // Set up timeout
    const timeoutId = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error(`MCP request timeout: ${method}`));
    }, REQUEST_TIMEOUT_MS);

    pendingRequests.set(id, { resolve, reject, timeoutId });

    const request = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    mcpProcess.stdin?.write(request + '\n');
  });
}

/**
 * Send a JSON-RPC request to the MCP server
 *
 * @param method - The JSON-RPC method name
 * @param params - The request parameters
 * @returns Promise resolving to the result
 */
export async function sendMCPRequest(
  method: string,
  params: unknown
): Promise<unknown> {
  await ensureMCPRunning();
  return sendMCPRequestInternal(method, params);
}

/**
 * Call an MCP tool
 *
 * @param name - The tool name
 * @param args - The tool arguments
 * @returns Promise resolving to the unwrapped tool result (parsed JSON from content)
 */
export async function callMCPTool(
  name: string,
  args: Record<string, unknown>
): Promise<unknown> {
  await ensureMCPRunning();
  const result = await sendMCPRequestInternal('tools/call', {
    name,
    arguments: args,
  });

  // MCP tools/call response format: { content: [{ type: "text", text: "...JSON..." }] }
  // We need to unwrap and parse the actual data
  return unwrapMCPContent(result);
}

/**
 * Unwrap MCP content response
 *
 * MCP tools return responses in format: { content: [{ type: "text", text: "...JSON..." }] }
 * This function extracts and parses the actual data.
 */
function unwrapMCPContent(result: unknown): unknown {
  // If result has content array, extract the text
  const mcpResult = result as {
    content?: Array<{ type: string; text?: string }>;
  };

  if (mcpResult?.content && Array.isArray(mcpResult.content)) {
    // Find text content (could be multiple, we take the first text type)
    const textContent = mcpResult.content.find((c) => c.type === 'text');
    if (textContent?.text) {
      try {
        // Parse the JSON string to get actual Notion data
        return JSON.parse(textContent.text);
      } catch {
        // If not valid JSON, return raw text
        console.warn('[MCP] Content is not valid JSON, returning raw text');
        return textContent.text;
      }
    }
  }

  // If no content wrapper, return as-is (shouldn't happen for tools/call)
  console.warn('[MCP] Unexpected response format, returning raw result');
  return result;
}

/**
 * List available tools from the MCP server
 *
 * @returns Promise resolving to the list of tools
 */
export async function listMCPTools(): Promise<unknown> {
  await ensureMCPRunning();
  return sendMCPRequestInternal('tools/list', {});
}

/**
 * Clean shutdown of the MCP client
 */
export function closeMCPClient(): void {
  if (mcpProcess && !mcpProcess.killed) {
    console.log('[MCP] Closing Notion MCP server...');

    // Reject all pending requests
    for (const [id, pending] of pendingRequests) {
      clearTimeout(pending.timeoutId);
      pending.reject(new Error('MCP client closed'));
      pendingRequests.delete(id);
    }

    mcpProcess.kill();
    mcpProcess = null;
  }

  initialized = false;
  initializePromise = null;
  stdoutBuffer = '';
}

/**
 * Check if the MCP client is currently running
 */
export function isMCPRunning(): boolean {
  return initialized && mcpProcess !== null && !mcpProcess.killed;
}
