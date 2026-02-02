# Phase 4: Data Integration - Research

**Researched:** 2026-02-01
**Domain:** Notion MCP Integration, Claude Tool Calling, Database CRUD Operations
**Confidence:** HIGH

## Summary

Phase 4 connects Jarvis to the user's Notion workspace using the official Notion MCP server (`@notionhq/notion-mcp-server`). The project already has the MCP server configured in `.mcp.json` with a valid token, and Phase 3 established tool definitions with placeholder handlers. The implementation requires: (1) integrating the MCP client into the API route to execute tools, (2) building the tool-result loop for Claude's tool use flow, and (3) mapping Notion database queries to the user's Life OS Bundle schema.

The key architectural challenge is handling the tool use loop server-side while maintaining the SSE streaming pattern. When Claude responds with `tool_use` blocks, the server must: execute the tool via MCP, send the `tool_result` back to Claude, and stream the final response. The Anthropic SDK's new `betaZodTool()` helper and tool runner simplify this significantly.

**Primary recommendation:** Use the Anthropic SDK's beta tool runner for automatic tool execution and conversation management. Execute Notion MCP tools via the `@modelcontextprotocol/sdk` client from the Next.js API route, keeping the MCP transport server-side to protect the Notion token.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @notionhq/notion-mcp-server | ^2.0.0 | Notion MCP server with v2025-09-03 API | Official Notion implementation, data source support |
| @modelcontextprotocol/sdk | ^1.25.2+ | MCP client for tool execution | Official MCP client, security fixes in 1.25.2+ |
| @anthropic-ai/sdk | ^0.61.x | Claude API with tool runner | Beta tool runner for automatic tool handling |
| zod | ^3.25.0 | Schema validation | Required for betaZodTool() type-safe tools |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| mcp-handler | latest | Vercel MCP adapter | If building your own MCP server on Next.js |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| MCP stdio transport | MCP HTTP transport | HTTP allows remote server but adds auth complexity |
| Manual tool loop | SDK tool runner (beta) | Tool runner handles loop automatically but is beta |
| Local MCP server | Notion hosted MCP | Hosted requires OAuth per-user, local uses single token |

**Installation:**
```bash
npm install @modelcontextprotocol/sdk@^1.25.2 zod@^3.25.0
# @anthropic-ai/sdk already installed from Phase 3
# @notionhq/notion-mcp-server runs via npx (already in .mcp.json)
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   └── api/
│       └── jarvis/
│           └── chat/
│               └── route.ts      # Add tool execution loop
├── lib/
│   └── jarvis/
│       ├── intelligence/
│       │   ├── tools.ts          # Update with tool implementations
│       │   └── toolExecutor.ts   # NEW: MCP client + tool routing
│       └── notion/
│           ├── NotionClient.ts   # NEW: MCP client wrapper
│           ├── queries.ts        # NEW: Database query builders
│           └── schemas.ts        # NEW: Life OS database schemas
```

### Pattern 1: Server-Side Tool Execution Loop
**What:** Execute Claude tool calls server-side, return final response
**When to use:** Always for tools that access external services (Notion)
**Example:**
```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
// src/app/api/jarvis/chat/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { executeNotionTool } from '@/lib/jarvis/notion/NotionClient';

const anthropic = new Anthropic();

export async function POST(request: Request): Promise<Response> {
  const { messages, systemPrompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      let currentMessages = [...messages];
      let continueLoop = true;

      while (continueLoop) {
        const response = await anthropic.messages.create({
          model: 'claude-3-5-haiku-20241022',
          max_tokens: 1024,
          system: systemPrompt,
          messages: currentMessages,
          tools: notionTools,
        });

        // Check for tool use
        const toolUseBlocks = response.content.filter(
          (block) => block.type === 'tool_use'
        );

        if (toolUseBlocks.length > 0 && response.stop_reason === 'tool_use') {
          // Execute tools and build results
          const toolResults = await Promise.all(
            toolUseBlocks.map(async (toolUse) => ({
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: await executeNotionTool(toolUse.name, toolUse.input),
            }))
          );

          // Add assistant response and tool results to messages
          currentMessages.push({ role: 'assistant', content: response.content });
          currentMessages.push({ role: 'user', content: toolResults });

          // Continue loop to get Claude's response to tool results
        } else {
          // No more tools - stream the final response
          for (const block of response.content) {
            if (block.type === 'text') {
              const data = JSON.stringify({ type: 'text', text: block.text });
              controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
            }
          }
          continueLoop = false;
        }
      }

      controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

### Pattern 2: MCP Client for Notion Operations
**What:** Use MCP SDK to call Notion MCP server tools
**When to use:** All Notion read/write operations
**Example:**
```typescript
// Source: https://ai-sdk.dev/cookbook/next/mcp-tools
// src/lib/jarvis/notion/NotionClient.ts

import { experimental_createMCPClient as createMCPClient } from 'ai/mcp';
import { Experimental_StdioMCPTransport as StdioTransport } from 'ai/mcp';

let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;

async function getMCPClient() {
  if (!mcpClient) {
    const transport = new StdioTransport({
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        NOTION_TOKEN: process.env.NOTION_TOKEN!,
      },
    });

    mcpClient = await createMCPClient({ transport });
  }
  return mcpClient;
}

export async function executeNotionTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  const client = await getMCPClient();
  const tools = await client.tools();

  // Map our tool names to MCP tool names
  const mcpToolMapping: Record<string, string> = {
    query_tasks: 'query-data-source',
    create_task: 'create-a-page',
    update_task_status: 'update-a-page',
    query_bills: 'query-data-source',
    mark_bill_paid: 'update-a-page',
  };

  const mcpToolName = mcpToolMapping[toolName];
  if (!mcpToolName) {
    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  }

  const tool = tools[mcpToolName];
  if (!tool) {
    return JSON.stringify({ error: `MCP tool not found: ${mcpToolName}` });
  }

  try {
    const result = await tool.execute(input);
    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : 'Tool execution failed',
    });
  }
}
```

### Pattern 3: Notion Query Building for Life OS
**What:** Build Notion API filters for tasks, bills based on user intent
**When to use:** Converting tool inputs to Notion query parameters
**Example:**
```typescript
// src/lib/jarvis/notion/queries.ts

interface NotionFilter {
  property: string;
  [key: string]: unknown;
}

// Task database property names (from Life OS Bundle)
const TASK_PROPS = {
  title: 'Task',           // Title property
  status: 'Status',        // Select: To Do, In Progress, Done
  dueDate: 'Due Date',     // Date property
  project: 'Project',      // Relation to Projects database
  priority: 'Priority',    // Select: Low, Medium, High
};

// Bills database property names
const BILL_PROPS = {
  title: 'Bill',           // Title property
  amount: 'Amount',        // Number property
  dueDate: 'Due Date',     // Date property
  status: 'Paid',          // Checkbox property
  category: 'Category',    // Select property
};

export function buildTaskQuery(input: {
  filter?: 'today' | 'this_week' | 'overdue' | 'all';
  status?: 'pending' | 'completed' | 'all';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];

  // Status filter
  if (input.status && input.status !== 'all') {
    filters.push({
      property: TASK_PROPS.status,
      status: {
        equals: input.status === 'pending' ? 'To Do' : 'Done',
      },
    });
  }

  // Date filter
  const today = new Date().toISOString().split('T')[0];
  if (input.filter === 'today') {
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { equals: today },
    });
  } else if (input.filter === 'this_week') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { on_or_before: nextWeek.toISOString().split('T')[0] },
    });
  } else if (input.filter === 'overdue') {
    filters.push({
      property: TASK_PROPS.dueDate,
      date: { before: today },
    });
    filters.push({
      property: TASK_PROPS.status,
      status: { does_not_equal: 'Done' },
    });
  }

  return filters.length > 0 ? { filter: { and: filters } } : {};
}

export function buildBillQuery(input: {
  timeframe?: 'this_week' | 'this_month' | 'overdue';
}): { filter?: { and: NotionFilter[] } } {
  const filters: NotionFilter[] = [];
  const today = new Date().toISOString().split('T')[0];

  // Only unpaid bills
  filters.push({
    property: BILL_PROPS.status,
    checkbox: { equals: false },
  });

  if (input.timeframe === 'this_week') {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextWeek.toISOString().split('T')[0] },
    });
  } else if (input.timeframe === 'this_month') {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { on_or_before: nextMonth.toISOString().split('T')[0] },
    });
  } else if (input.timeframe === 'overdue') {
    filters.push({
      property: BILL_PROPS.dueDate,
      date: { before: today },
    });
  }

  return { filter: { and: filters } };
}
```

### Anti-Patterns to Avoid
- **Exposing Notion token to browser:** Keep MCP execution server-side only
- **Blocking on tool execution:** For multiple tools, execute in parallel with `Promise.all()`
- **Hardcoding database IDs:** Discover via search or store in config
- **Ignoring tool errors:** Always return structured error responses to Claude
- **Infinite tool loops:** Set max iterations (3-5) to prevent runaway tool calling

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| MCP protocol implementation | Custom JSON-RPC over stdio | @modelcontextprotocol/sdk | Protocol details, transport handling |
| Tool use loop | Manual message array management | SDK tool runner (beta) | Automatic conversation state, error handling |
| Notion API client | Direct HTTP calls | MCP server tools | Handles auth, rate limits, pagination |
| Filter syntax | Custom filter builder | Notion filter reference | Complex nested filter rules |
| Task identification | Searching by title | Use page IDs from queries | Titles aren't unique, IDs are |

**Key insight:** The MCP abstraction handles all Notion API complexity. Focus on mapping user intent to the right MCP tool calls, not reimplementing Notion's API.

## Common Pitfalls

### Pitfall 1: Tool ID Mismatch in Results
**What goes wrong:** Claude's tool_use `id` doesn't match tool_result `tool_use_id`
**Why it happens:** Not preserving the ID from tool_use when building results
**How to avoid:** Always copy `toolUse.id` directly to `tool_result.tool_use_id`
**Warning signs:** "tool_use ids were found without tool_result blocks immediately after"

### Pitfall 2: Text Before Tool Results
**What goes wrong:** API rejects request with 400 error
**Why it happens:** Adding explanatory text before tool_result blocks in user message
**How to avoid:** tool_result blocks MUST come first in content array, text after
**Warning signs:** "In the user message containing tool results, the tool_result blocks must come FIRST"

### Pitfall 3: MCP Client Connection Lifecycle
**What goes wrong:** Connection hangs or resource leak
**Why it happens:** Not closing MCP client after use
**How to avoid:** Use singleton pattern with proper cleanup, or close after each request
**Warning signs:** Node process doesn't exit, memory growth

### Pitfall 4: Wrong Database/Data Source ID
**What goes wrong:** Query returns empty or wrong data
**Why it happens:** API v2025-09-03 uses data_source_id, not database_id for queries
**How to avoid:** Use `retrieve-a-database` to get data_source IDs first, then query
**Warning signs:** Empty results when database clearly has data

### Pitfall 5: Property Name Mismatch
**What goes wrong:** Filter queries return no results
**Why it happens:** Property names are case-sensitive and must match exactly
**How to avoid:** Retrieve schema first, use exact property names
**Warning signs:** "property does not exist" errors

### Pitfall 6: Rate Limiting
**What goes wrong:** 429 errors during heavy usage
**Why it happens:** Notion API limits: 180 req/min general, 30 req/min for search
**How to avoid:** Implement exponential backoff, batch operations where possible
**Warning signs:** Intermittent failures during rapid queries

## Code Examples

Verified patterns from official sources:

### Updated Tool Definitions with Zod
```typescript
// Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use
// src/lib/jarvis/intelligence/tools.ts

import { z } from 'zod';
import { betaZodTool } from '@anthropic-ai/sdk/helpers/beta/zod';
import { executeNotionTool } from '../notion/NotionClient';

export const queryTasksTool = betaZodTool({
  name: 'query_tasks',
  description: 'Search and retrieve tasks from Notion. Use when user asks about their todos, upcoming tasks, or overdue items.',
  inputSchema: z.object({
    filter: z.enum(['today', 'this_week', 'overdue', 'all']).describe('Time-based filter'),
    status: z.enum(['pending', 'completed', 'all']).optional().describe('Filter by status'),
  }),
  run: async (input) => {
    return executeNotionTool('query_tasks', input);
  },
});

export const createTaskTool = betaZodTool({
  name: 'create_task',
  description: 'Create a new task in Notion inbox. Use when user wants to add a todo, reminder, or action item.',
  inputSchema: z.object({
    title: z.string().describe('The task title/description'),
    due_date: z.string().optional().describe('Due date in YYYY-MM-DD format'),
    priority: z.enum(['low', 'medium', 'high']).optional().describe('Task priority'),
  }),
  run: async (input) => {
    return executeNotionTool('create_task', input);
  },
});

export const updateTaskStatusTool = betaZodTool({
  name: 'update_task_status',
  description: 'Mark a task as complete, in progress, or pending.',
  inputSchema: z.object({
    task_id: z.string().describe('The Notion task page ID'),
    new_status: z.enum(['pending', 'in_progress', 'completed']).describe('New status'),
  }),
  run: async (input) => {
    return executeNotionTool('update_task_status', input);
  },
});

export const queryBillsTool = betaZodTool({
  name: 'query_bills',
  description: 'Check upcoming bills and payment status.',
  inputSchema: z.object({
    timeframe: z.enum(['this_week', 'this_month', 'overdue']).describe('Time period'),
  }),
  run: async (input) => {
    return executeNotionTool('query_bills', input);
  },
});

export const markBillPaidTool = betaZodTool({
  name: 'mark_bill_paid',
  description: 'Mark a bill as paid.',
  inputSchema: z.object({
    bill_id: z.string().describe('The Notion bill page ID'),
  }),
  run: async (input) => {
    return executeNotionTool('mark_bill_paid', input);
  },
});

export const notionTools = [
  queryTasksTool,
  createTaskTool,
  updateTaskStatusTool,
  queryBillsTool,
  markBillPaidTool,
];
```

### Notion MCP Tool Executor
```typescript
// src/lib/jarvis/notion/NotionClient.ts

import { spawn, ChildProcess } from 'child_process';

// MCP client state
let mcpProcess: ChildProcess | null = null;
let requestId = 0;
const pendingRequests = new Map<number, {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}>();

// Database/Data Source IDs (configure based on user's Life OS setup)
const DATA_SOURCES = {
  tasks: process.env.NOTION_TASKS_DATA_SOURCE_ID!,
  bills: process.env.NOTION_BILLS_DATA_SOURCE_ID!,
  projects: process.env.NOTION_PROJECTS_DATA_SOURCE_ID!,
};

async function ensureMCPRunning(): Promise<void> {
  if (mcpProcess && !mcpProcess.killed) return;

  return new Promise((resolve, reject) => {
    mcpProcess = spawn('npx', ['-y', '@notionhq/notion-mcp-server'], {
      env: {
        ...process.env,
        NOTION_TOKEN: process.env.NOTION_TOKEN,
      },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let initialized = false;

    mcpProcess.stdout?.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const response = JSON.parse(line);
          if (response.id !== undefined) {
            const pending = pendingRequests.get(response.id);
            if (pending) {
              pendingRequests.delete(response.id);
              if (response.error) {
                pending.reject(new Error(response.error.message));
              } else {
                pending.resolve(response.result);
              }
            }
          }
          if (!initialized) {
            initialized = true;
            resolve();
          }
        } catch {
          // Not JSON, skip
        }
      }
    });

    mcpProcess.stderr?.on('data', (data) => {
      console.error('[MCP stderr]', data.toString());
    });

    mcpProcess.on('error', reject);
    mcpProcess.on('exit', (code) => {
      console.log(`[MCP] Process exited with code ${code}`);
      mcpProcess = null;
    });

    // Initialize MCP
    sendMCPRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'jarvis', version: '1.0.0' },
    });
  });
}

function sendMCPRequest(method: string, params: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = ++requestId;
    pendingRequests.set(id, { resolve, reject });

    const request = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method,
      params,
    });

    mcpProcess?.stdin?.write(request + '\n');
  });
}

async function callMCPTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  await ensureMCPRunning();
  return sendMCPRequest('tools/call', { name, arguments: args });
}

// High-level tool implementations
export async function executeNotionTool(
  toolName: string,
  input: Record<string, unknown>
): Promise<string> {
  try {
    let result: unknown;

    switch (toolName) {
      case 'query_tasks':
        result = await callMCPTool('query-data-source', {
          data_source_id: DATA_SOURCES.tasks,
          filter: buildTaskFilter(input as { filter?: string; status?: string }),
        });
        return formatTaskResults(result);

      case 'create_task':
        result = await callMCPTool('create-a-page', {
          parent: { type: 'data_source_id', data_source_id: DATA_SOURCES.tasks },
          properties: buildTaskProperties(input as { title: string; due_date?: string; priority?: string }),
        });
        return `Task created: ${(input as { title: string }).title}`;

      case 'update_task_status':
        result = await callMCPTool('update-a-page', {
          page_id: input.task_id,
          properties: {
            Status: { status: { name: mapStatus(input.new_status as string) } },
          },
        });
        return `Task updated to ${input.new_status}`;

      case 'query_bills':
        result = await callMCPTool('query-data-source', {
          data_source_id: DATA_SOURCES.bills,
          filter: buildBillFilter(input as { timeframe?: string }),
        });
        return formatBillResults(result);

      case 'mark_bill_paid':
        result = await callMCPTool('update-a-page', {
          page_id: input.bill_id,
          properties: {
            Paid: { checkbox: true },
          },
        });
        return 'Bill marked as paid';

      default:
        return JSON.stringify({ error: `Unknown tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      error: error instanceof Error ? error.message : 'Tool execution failed',
    });
  }
}

// Helper functions
function buildTaskFilter(input: { filter?: string; status?: string }) {
  // Implementation from queries.ts pattern
}

function buildBillFilter(input: { timeframe?: string }) {
  // Implementation from queries.ts pattern
}

function buildTaskProperties(input: { title: string; due_date?: string; priority?: string }) {
  return {
    Task: { title: [{ text: { content: input.title } }] },
    ...(input.due_date && { 'Due Date': { date: { start: input.due_date } } }),
    ...(input.priority && { Priority: { select: { name: capitalize(input.priority) } } }),
  };
}

function mapStatus(status: string): string {
  const map: Record<string, string> = {
    pending: 'To Do',
    in_progress: 'In Progress',
    completed: 'Done',
  };
  return map[status] || status;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatTaskResults(result: unknown): string {
  // Format Notion query results into human-readable text
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No tasks found.';

  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties.Task);
    const status = extractSelect(p.properties.Status);
    const dueDate = extractDate(p.properties['Due Date']);
    return `- ${title} (${status})${dueDate ? ` - Due: ${dueDate}` : ''} [id:${p.id}]`;
  }).join('\n');
}

function formatBillResults(result: unknown): string {
  const pages = (result as { results?: unknown[] })?.results || [];
  if (pages.length === 0) return 'No bills due.';

  return pages.map((page: unknown) => {
    const p = page as { properties: Record<string, unknown>; id: string };
    const title = extractTitle(p.properties.Bill);
    const amount = extractNumber(p.properties.Amount);
    const dueDate = extractDate(p.properties['Due Date']);
    return `- ${title}: $${amount}${dueDate ? ` - Due: ${dueDate}` : ''} [id:${p.id}]`;
  }).join('\n');
}

// Property extractors
function extractTitle(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text || 'Untitled';
}

function extractSelect(prop: unknown): string {
  const p = prop as { status?: { name?: string }; select?: { name?: string } };
  return p?.status?.name || p?.select?.name || 'Unknown';
}

function extractDate(prop: unknown): string | null {
  const p = prop as { date?: { start?: string } };
  return p?.date?.start || null;
}

function extractNumber(prop: unknown): number {
  const p = prop as { number?: number };
  return p?.number || 0;
}
```

### Updated Chat Route with Tool Loop
```typescript
// src/app/api/jarvis/chat/route.ts

import Anthropic from '@anthropic-ai/sdk';
import { notionTools } from '@/lib/jarvis/intelligence/tools';

const anthropic = new Anthropic();
const MAX_TOOL_ITERATIONS = 5;

interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

interface ContentBlock {
  type: string;
  [key: string]: unknown;
}

export async function POST(request: Request): Promise<Response> {
  const { messages, systemPrompt } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let currentMessages: Message[] = messages.map((m: { role: string; content: string }) => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        }));
        let iterations = 0;

        while (iterations < MAX_TOOL_ITERATIONS) {
          iterations++;

          const response = await anthropic.messages.create({
            model: 'claude-3-5-haiku-20241022',
            max_tokens: 1024,
            system: systemPrompt || 'You are a helpful assistant.',
            messages: currentMessages,
            tools: notionTools.map((t) => ({
              name: t.name,
              description: t.description,
              input_schema: t.inputSchema,
            })),
          });

          // Check for tool use
          const toolUseBlocks = response.content.filter(
            (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
          );

          if (toolUseBlocks.length > 0 && response.stop_reason === 'tool_use') {
            // Execute tools in parallel
            const toolResults = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                const tool = notionTools.find((t) => t.name === toolUse.name);
                let result: string;
                if (tool && 'run' in tool) {
                  result = await tool.run(toolUse.input as Record<string, unknown>);
                } else {
                  result = JSON.stringify({ error: `Tool not found: ${toolUse.name}` });
                }
                return {
                  type: 'tool_result' as const,
                  tool_use_id: toolUse.id,
                  content: result,
                };
              })
            );

            // Add assistant response and tool results to messages
            currentMessages.push({
              role: 'assistant',
              content: response.content as ContentBlock[],
            });
            currentMessages.push({
              role: 'user',
              content: toolResults as ContentBlock[],
            });

            // Continue loop
          } else {
            // No more tools - stream text blocks
            for (const block of response.content) {
              if (block.type === 'text') {
                const data = JSON.stringify({ type: 'text', text: block.text });
                controller.enqueue(new TextEncoder().encode(`data: ${data}\n\n`));
              }
            }
            break;
          }
        }

        controller.enqueue(new TextEncoder().encode('data: {"type":"done"}\n\n'));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorData = JSON.stringify({ type: 'error', error: errorMessage });
        controller.enqueue(new TextEncoder().encode(`data: ${errorData}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
```

## Configuration Requirements

### Environment Variables
```env
# Required for Notion MCP
NOTION_TOKEN=ntn_xxx  # Already in .mcp.json, move to .env

# Database/Data Source IDs (discover via MCP search or Notion UI)
NOTION_TASKS_DATA_SOURCE_ID=xxx
NOTION_BILLS_DATA_SOURCE_ID=xxx
NOTION_PROJECTS_DATA_SOURCE_ID=xxx

# Existing
ANTHROPIC_API_KEY=xxx
DEEPGRAM_API_KEY=xxx
```

### Discovering Data Source IDs
The user's Life OS Bundle databases need their data source IDs configured. Discovery process:

1. Use MCP `notion-search` tool to find databases by name
2. Use `retrieve-a-database` to get the data_sources array
3. Store the data_source_id for each database in env config

```typescript
// One-time discovery script
async function discoverDataSources() {
  const searchResult = await callMCPTool('notion-search', {
    query: 'Tasks',
    filter: { value: 'data_source', property: 'object' },
  });
  console.log('Tasks database:', searchResult);

  // Repeat for Bills, Projects, etc.
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| database_id for queries | data_source_id (v2025-09-03) | Sep 2025 | Must use new endpoint paths |
| Manual tool loop | SDK tool runner (beta) | Late 2025 | Automatic tool handling |
| Local integration token | OAuth per-user (hosted MCP) | 2025 | Better security, more setup |
| Single database schema | Multiple data sources per DB | Sep 2025 | More flexible schemas |

**Deprecated/outdated:**
- `POST /v1/databases/{id}/query` - Use `/v1/data_sources/{id}/query`
- `filter["value"] = "database"` in search - Use `"data_source"`
- Manual tool result formatting - SDK helpers handle this

## Open Questions

1. **Database property names for user's Life OS Bundle**
   - What we know: Life OS has Tasks, Projects, Bills, Goals, Habits databases with standard PARA structure
   - What's unclear: Exact property names (case-sensitive) for this user's setup
   - Recommendation: Build discovery step in 04-01 to fetch schemas for ALL databases and configure
   - **RESOLVED in plan:** Discovery script searches for all 5 Life OS databases

2. **OAuth vs Integration Token**
   - What we know: Project uses integration token (in .mcp.json), hosted MCP requires OAuth
   - What's unclear: Should support multiple users in future?
   - Recommendation: Keep integration token for v1 (single user), design for OAuth extensibility
   - **DECISION:** Integration token for v1. OAuth is v2 scope.

3. **Handling page ID references in voice**
   - What we know: Updates need page IDs, but voice can't dictate long IDs
   - What's unclear: Best UX for referencing tasks ("the first one", "call mom task")
   - Recommendation: Store recent query results in cache, match by title
   - **RESOLVED in plan:** recentResults.ts caches tasks, bills, projects for title lookup

4. **MCP process lifecycle**
   - What we know: MCP server runs as child process via stdio
   - What's unclear: Best pattern for serverless (Vercel) - process per request or keep alive?
   - Recommendation: Start with singleton, monitor cold start impact

5. **v2 Client & Content OS Extension**
   - What we know: v1 = Life OS Bundle only. v2 = Add Client & Content OS (EXE-ADV-04)
   - Architecture: LIFE_OS_DATABASES config is separate, extensible for CLIENT_OS_DATABASES
   - **RESOLVED in plan:** schemas.ts includes v2 extension point comments

## Tool Coverage (Updated)

**v1 Tools (10 total):**

| Tool | Database | Operation | Requirement |
|------|----------|-----------|-------------|
| query_tasks | Tasks | Read | NOT-02 |
| query_bills | Bills | Read | FIN-01 |
| query_projects | Projects | Read | NOT-02 |
| query_goals | Goals | Read | NOT-03 |
| query_habits | Habits | Read | NOT-03 |
| create_task | Tasks | Write | NOT-04, NOT-05 |
| update_task_status | Tasks | Write | NOT-06, NOT-09 |
| pause_task | Tasks | Write | NOT-07 |
| add_project_item | Tasks/Projects | Write | NOT-08 |
| mark_bill_paid | Bills | Write | FIN-02 |

**v2 Tools (future):**
- query_clients, query_content (Client & Content OS)
- create_client_task, update_content_status, etc.

## Sources

### Primary (HIGH confidence)
- [Notion MCP Supported Tools](https://developers.notion.com/docs/mcp-supported-tools) - Full tool list, parameters
- [Claude Tool Use Implementation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use) - Tool runner, Zod helpers
- [Notion API Filter Reference](https://developers.notion.com/reference/post-database-query-filter) - Filter syntax
- [Notion API 2025-09-03 Upgrade](https://developers.notion.com/docs/upgrade-guide-2025-09-03) - Data source changes

### Secondary (MEDIUM confidence)
- [AI SDK MCP Tools](https://ai-sdk.dev/cookbook/next/mcp-tools) - MCP client integration pattern
- [Notion MCP Getting Started](https://developers.notion.com/docs/get-started-with-mcp) - Setup guide
- [GitHub makenotion/notion-mcp-server](https://github.com/makenotion/notion-mcp-server) - v2.0.0 tool list

### Tertiary (LOW confidence)
- [Notion Life OS Bundle](https://www.bettercreating.com/lifeos) - General PARA structure (specific properties vary)
- [MCP Handler Vercel](https://github.com/vercel/mcp-handler) - Alternative MCP hosting pattern

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages, documented APIs
- Architecture: HIGH - Follows Claude tool use docs exactly
- MCP Integration: MEDIUM - Process lifecycle in serverless unclear
- Database Schema: LOW - User-specific property names need discovery

**Research date:** 2026-02-01
**Valid until:** 2026-03-01 (30 days - APIs stable, MCP server may update)
