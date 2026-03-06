/**
 * Jarvis MCP Server
 *
 * Wraps all 40+ Jarvis tools into a standalone MCP server.
 * Tool definitions in tools.ts already have { name, description, input_schema }
 * which maps 1:1 to MCP tool schema.
 *
 * Usage:
 *   node dist/lib/jarvis/mcp/index.js
 *
 * The server communicates via stdio (StdioServerTransport).
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { getAllToolDefinitions, executeTool } from './toolBridge.js';

export function createMcpServer(): Server {
  const server = new Server(
    {
      name: 'jarvis-tools',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  // -------------------------------------------------------------------------
  // tools/list — Return all Jarvis tool definitions
  // -------------------------------------------------------------------------
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const defs = getAllToolDefinitions();

    return {
      tools: defs.map((def) => ({
        name: def.name,
        description: def.description,
        inputSchema: {
          type: 'object' as const,
          properties: def.input_schema.properties,
          ...(def.input_schema.required
            ? { required: def.input_schema.required }
            : {}),
        },
      })),
    };
  });

  // -------------------------------------------------------------------------
  // tools/call — Route to the correct executor
  // -------------------------------------------------------------------------
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const input = (args ?? {}) as Record<string, unknown>;

    try {
      const result = await executeTool(name, input);
      return {
        content: [{ type: 'text' as const, text: result }],
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Tool execution failed';
      return {
        content: [{ type: 'text' as const, text: `Error: ${message}` }],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server on stdio.
 */
export async function startServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[Jarvis MCP] Server started on stdio');
}
