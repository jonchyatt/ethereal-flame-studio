# Research: n8n MCP + Skills Integration for Claude Code

**Phase:** 5
**Plan:** 05-05
**Created:** 2026-01-28
**Source:** Video transcripts provided by user

---

## Overview

This document captures how to set up n8n MCP Server and n8n Skills so that Claude Code can automatically build, edit, and deploy n8n workflows through natural language conversation.

**Key insight from videos:** Instead of manually building n8n workflows, we give Claude Code access to:
1. **n8n MCP Server** - API access to all n8n nodes, configurations, templates
2. **n8n Skills** - Knowledge of expression syntax, workflow patterns, validation

Then we can say "build me a workflow that does X" and Claude Code creates it.

---

## Prerequisites

1. **n8n instance** - Self-hosted (required for YouTube OAuth)
2. **n8n API key** - Generated from n8n settings
3. **Claude Code** - Running in VS Code with extension installed
4. **Domain with Cloudflare** - For secure tunnel access

---

## Step 1: n8n MCP Server Setup

### What It Does

The n8n MCP Server gives Claude Code:
- Complete node coverage (1100+ nodes with 99% property accuracy)
- 2,700+ workflow templates for reference
- Ability to CREATE, UPDATE, ACTIVATE, and MANAGE workflows

### GitHub Repository

```
https://github.com/[creator]/n8n-mcp-server
```

### Installation in Claude Code Project

Claude Code can install this automatically. Provide the URL and say:
> "Install the n8n MCP server from this GitHub repo and connect it to my n8n instance"

**Manual installation (if needed):**

1. Create `.mcp.json` in project root:

```json
{
  "n8n": {
    "command": "npx",
    "args": ["@n8n/mcp-server"],
    "env": {
      "N8N_API_URL": "https://n8n.yourdomain.com",
      "N8N_API_KEY": "${N8N_API_KEY}"
    }
  }
}
```

2. Add to `.env` (never commit this):

```
N8N_API_KEY=your_api_key_here
```

3. Restart Claude Code to load the MCP server

### Verification

After setup, ask Claude Code:
> "Can you search for the webhook node using the n8n MCP server?"

Should return node information, confirming connection works.

---

## Step 2: n8n Skills Setup

### What It Does

n8n Skills teach Claude Code HOW to use the MCP server properly:
- Expression syntax (n8n's unique {{ }} syntax)
- Workflow patterns (common node combinations)
- Validation rules (what makes a workflow valid)
- Node configuration (parameters, options)
- Coding in JavaScript/Python for code nodes

### GitHub Repository

```
https://github.com/[creator]/n8n-skills
```

### The 7 Skills

| Skill | Purpose |
|-------|---------|
| Expression Syntax | {{ $json.field }}, {{ $('node').item.json }} |
| MCP Server Usage | How to call the n8n API correctly |
| Workflow Patterns | Common combinations (webhook → transform → output) |
| Validation | Check workflow structure before deployment |
| Node Configuration | Parameters, authentication, options |
| JavaScript Coding | Code nodes with proper n8n context |
| Python Coding | Python code nodes |

### Installation

Claude Code installs skills globally (not per-project):

> "Clone the n8n-skills repository and install them so I can use them in any project"

**What happens:**
1. Skills are cloned to Claude Code's global skills directory
2. Available in all projects without needing to re-install
3. Claude Code reads them on-demand (not loaded into context every time)

### Verification

Ask Claude Code:
> "Do you have access to the n8n skills for building workflows?"

Should list the 7 skills and confirm they're available.

---

## Step 3: Claude.md System Prompt

Create a project-specific CLAUDE.md that tells Claude Code how to use these tools:

```markdown
# Ethereal Flame Studio - n8n Workflow Builder

## Environment

This project uses:
- n8n MCP Server for workflow management
- n8n Skills for building proper workflows
- Self-hosted n8n at n8n.yourdomain.com

## MCP Tools Available

- search_nodes: Find n8n nodes by name
- get_node_details: Get configuration for a specific node
- create_workflow: Create new workflow in n8n
- update_workflow: Modify existing workflow
- activate_workflow: Make workflow active
- list_workflows: See all workflows

## Workflow Building Process

1. Understand requirements (ask clarifying questions)
2. Search templates for similar patterns
3. Research required nodes and configurations
4. Build workflow JSON structure
5. Validate with validation skill
6. Deploy to n8n instance
7. Test webhook endpoint

## Safety Rules

- Never expose API keys in workflow JSON
- Always use environment variables for credentials
- Test in webhook-test mode before production
- Validate payload schemas before deployment
```

---

## Step 4: Building Workflows via Conversation

### Example Prompt

> "Build me an n8n workflow that:
> 1. Receives a webhook with render job details
> 2. Routes the job to the correct render machine based on 'machine' field
> 3. Polls for job status every 30 seconds
> 4. On completion, uploads video to YouTube
> 5. Sends me an email notification with the YouTube URL"

### What Claude Code Does

1. **Uses MCP to search for nodes:**
   - Webhook node
   - Switch node (for routing)
   - HTTP Request node (for polling)
   - YouTube node
   - Email/Gmail node

2. **Applies skills to:**
   - Write proper expressions for field mapping
   - Configure authentication correctly
   - Set up error handling branches

3. **Creates workflow JSON:**
   - Node positions, connections, parameters
   - Proper n8n structure

4. **Deploys to n8n:**
   - Uses create_workflow MCP tool
   - Returns workflow ID and link

5. **Provides test command:**
   ```bash
   curl -X POST https://n8n.yourdomain.com/webhook-test/render-job \
     -H "Content-Type: application/json" \
     -d '{"machine": "desktop", "audioFile": "test.mp3"}'
   ```

---

## Step 5: Iterating on Workflows

After deployment, you can refine through conversation:

> "The workflow is working but the YouTube upload is failing. The error says 'Invalid category ID'. Can you fix that?"

Claude Code will:
1. Look up the error
2. Research YouTube node configuration
3. Update the workflow with correct category
4. Redeploy

---

## Key Insights from Videos

1. **Don't install manually** - Tell Claude Code to do it:
   > "Here are the two GitHub repos. Install them and set up the connection to my n8n instance."

2. **Plan mode is essential** - Before building, use plan mode to:
   - Clarify requirements
   - Ask questions about missing details
   - Propose workflow structure

3. **Test with webhook-test URLs** - n8n provides test URLs that don't require workflow activation

4. **Claude Code fixes its own mistakes** - When something fails, it analyzes the error and fixes it automatically

5. **Large workflows can timeout** - For complex workflows (60+ nodes), the n8n API may timeout. Keep workflows modular.

---

## Integration with Ethereal Flame Studio

### Workflows to Build

| Workflow | Trigger | Actions |
|----------|---------|---------|
| Render Orchestrator | Web app "Render" button | Route to machine, monitor status |
| Render Complete Handler | Render server webhook | Upload to YouTube, notify user |
| YouTube Uploader | On video ready | Upload with metadata, schedule |
| Multi-Platform Poster | After YouTube | Post to TikTok, Instagram via Blotato |
| Health Monitor | Cron (every 5 min) | Check machine status, alert if down |

### Example: Render Orchestrator

```
Prompt to Claude Code:

"Build me the Render Orchestrator workflow:
1. Webhook receives: { machine, audioFile, template, format }
2. Validate the request (machine must be 'desktop' or 'laptop')
3. Check machine health via HTTP GET to machine's /health endpoint
4. If healthy, POST render job to machine's /api/render endpoint
5. Store job ID in workflow static data
6. Return { status: 'submitted', jobId } to caller
7. If machine unhealthy, return error"
```

---

## Next Steps

1. [ ] Set up n8n self-hosted instance (05-02-PLAN.md)
2. [ ] Configure Cloudflare Tunnel for n8n access (05-01-PLAN.md)
3. [ ] Install n8n MCP Server in Claude Code project
4. [ ] Install n8n Skills globally
5. [ ] Create CLAUDE.md for this project
6. [ ] Test by building a simple "Hello World" workflow
7. [ ] Build Render Orchestrator workflow
8. [ ] Build YouTube Upload workflow

---

## Resources

- n8n MCP Server: https://github.com/[creator]/n8n-mcp-server
- n8n Skills: https://github.com/[creator]/n8n-skills
- n8n Webhook Documentation: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/
- n8n Workflow Patterns: https://n8n.io/workflows/

---

*Research completed: 2026-01-28*
