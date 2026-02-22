# Atlas Framework Integration Preparation

> Preparing to integrate GOTCHA/Atlas framework with Jarvis
> Status: Ready to implement when MacBook available
> Target: Full autonomous agentic operation

---

## What We Need

### Hardware
- [ ] Always-on MacBook (M1 MacBook Pro mentioned)
- [ ] Reliable internet connection
- [ ] Power management configured (prevent sleep)

### Software Prerequisites
- [ ] VS Code installed
- [ ] Claude Code extension installed
- [ ] Claude Max subscription active
- [ ] Python 3.x with pip
- [ ] Git configured
- [ ] Telegram account + bot token

### Accounts
- [ ] Anthropic Max subscription ($100/month)
- [ ] Telegram bot via @BotFather
- [ ] OpenAI API key (for embeddings only - optional)

---

## Directory Structure to Create

```
atlas-workspace/
├── CLAUDE.md                    # System handbook (GOTCHA framework)
├── .env                         # API keys and secrets
│
├── goals/                       # Process definitions (SOPs)
│   ├── manifest.md              # Index of all goals
│   ├── build_app.md             # ATLAS workflow for building
│   ├── morning_briefing.md      # Daily briefing process
│   ├── memory_management.md     # Memory operations
│   └── jarvis_integration.md    # Jarvis-specific workflows
│
├── tools/                       # Deterministic Python scripts
│   ├── manifest.md              # Index of all tools
│   ├── memory/
│   │   ├── memory_db.py         # SQLite CRUD
│   │   ├── memory_read.py       # Load memory at session start
│   │   ├── memory_write.py      # Write to logs and DB
│   │   ├── embed_memory.py      # Generate embeddings
│   │   ├── semantic_search.py   # Vector search
│   │   └── hybrid_search.py     # BM25 + vector combined
│   ├── messaging/
│   │   ├── telegram_send.py     # Send messages
│   │   ├── telegram_receive.py  # Receive/poll messages
│   │   └── telegram_handler.py  # Handler daemon
│   ├── notion/
│   │   ├── notion_query.py      # Query databases
│   │   ├── notion_create.py     # Create items
│   │   └── notion_update.py     # Update items
│   └── system/
│       ├── health_check.py      # System health
│       └── dashboard_data.py    # Dashboard metrics
│
├── context/                     # Domain knowledge
│   ├── jarvis_personality.md    # How Jarvis behaves
│   ├── user_preferences.md      # User-specific context
│   └── notion_life_os.md        # Life OS structure
│
├── hardprompts/                 # Reusable instruction templates
│   ├── briefing_outline.md      # Morning briefing format
│   ├── task_summary.md          # Task summarization
│   └── conversation_style.md    # Response style
│
├── args/                        # Runtime behavior settings
│   ├── jarvis_settings.yaml     # Core settings
│   ├── security_guardrails.yaml # Security rules
│   └── messaging.yaml           # Telegram config
│
├── memory/                      # Persistent memory
│   ├── MEMORY.md                # Long-term facts
│   ├── index.json               # Fast lookup
│   └── logs/                    # Daily session logs
│       └── YYYY-MM-DD.md
│
├── data/                        # Databases
│   ├── memory.db                # Memory entries + embeddings
│   ├── messages.db              # Conversation history
│   └── activity.db              # Task/workflow tracking
│
└── dashboard/                   # System dashboard (optional)
    └── index.html               # Simple web dashboard
```

---

## CLAUDE.md Template (System Handbook)

```markdown
# System Handbook: Jarvis + GOTCHA Framework

## The GOTCHA Framework

This system uses the **GOTCHA Framework** — a 6-layer architecture for agentic systems:

**GOT** (The Engine):
- **Goals** (`goals/`) — What needs to happen (process definitions)
- **Orchestration** — The AI manager (Claude) that coordinates execution
- **Tools** (`tools/`) — Deterministic scripts that do the actual work

**CHA** (The Context):
- **Context** (`context/`) — Reference material and domain knowledge
- **Hard prompts** (`hardprompts/`) — Reusable instruction templates
- **Args** (`args/`) — Behavior settings that shape how the system acts

---

## Why This Structure Exists

When AI tries to do everything itself, errors compound fast.
90% accuracy per step = ~59% accuracy over 5 steps.

The solution:
- Push **reliability** into deterministic code (tools)
- Push **flexibility and reasoning** into the LLM (orchestrator)
- Push **process clarity** into goals
- Push **behavior settings** into args
- Push **domain knowledge** into context

You make smart decisions. Tools execute perfectly.

---

## How to Operate

### 1. Check for existing goals first
Before starting a task, check `goals/manifest.md` for a relevant workflow.
If a goal exists, follow it.

### 2. Check for existing tools
Before writing new code, read `tools/manifest.md`.
If a tool exists, use it.
If you create a new tool, add it to the manifest.

### 3. When tools fail, fix and document
- Read the error carefully
- Update the tool to handle the issue
- Add what you learned to the goal
- Retry until success

### 4. Memory Protocol
At session start:
1. Read `memory/MEMORY.md` for core facts
2. Read today's log: `memory/logs/YYYY-MM-DD.md`
3. Read yesterday's log for continuity

During session:
- Append notable events via `memory_write.py`
- Update MEMORY.md for explicit new preferences

### 5. Guardrails
- Always check manifests before creating new scripts
- Never delete without 3 confirmations
- Block dangerous patterns (rm -rf, git push --force)
- Rate limit external API calls

---

## Jarvis Integration

This system extends Jarvis with:
- Remote control via Telegram
- Persistent memory across sessions
- Self-healing loops with documentation
- Autonomous overnight operation

When receiving Telegram messages:
1. Validate sender against whitelist
2. Load conversation history (last 20 messages)
3. Load memory context
4. Execute with GOTCHA framework
5. Send response back to Telegram
6. Update memory with notable events
```

---

## Setup Checklist

### Day 1: Basic Setup
```bash
# 1. Create directory structure
mkdir -p atlas-workspace/{goals,tools/{memory,messaging,notion,system},context,hardprompts,args,memory/logs,data,dashboard}

# 2. Copy Atlas framework files
cp -r jarvis/atlas_framework/atlas_framework/memory/* atlas-workspace/tools/memory/

# 3. Create CLAUDE.md
# (Use template above)

# 4. Create .env file
echo "TELEGRAM_BOT_TOKEN=your_token_here" >> atlas-workspace/.env
echo "TELEGRAM_USER_ID=your_user_id" >> atlas-workspace/.env
echo "OPENAI_API_KEY=your_key_here" >> atlas-workspace/.env  # Optional, for embeddings

# 5. Initialize memory
echo "# Persistent Memory" > atlas-workspace/memory/MEMORY.md
echo "## User Preferences" >> atlas-workspace/memory/MEMORY.md
echo "## Key Facts" >> atlas-workspace/memory/MEMORY.md
```

### Day 2: Telegram Integration
```bash
# 1. Create Telegram bot via @BotFather
# 2. Get your user ID via @userinfobot
# 3. Configure messaging.yaml with whitelist
# 4. Test telegram_send.py
# 5. Set up telegram_handler.py as daemon
```

### Day 3: Test Full Loop
```bash
# 1. Send message to Telegram bot
# 2. Verify Claude session spawns
# 3. Verify memory loads
# 4. Verify response returns
# 5. Verify memory updates
```

### Day 4: Jarvis Integration
```bash
# 1. Connect to Notion databases
# 2. Set up briefing workflow
# 3. Test voice → Telegram → Claude → response flow
# 4. Configure dashboard
```

---

## Telegram Handler Daemon

```python
#!/usr/bin/env python3
"""
Telegram Handler Daemon
Polls for messages, spawns Claude sessions, returns responses
"""

import os
import json
import sqlite3
import subprocess
from datetime import datetime
from pathlib import Path
import requests
import time
import yaml

# Load config
CONFIG_PATH = Path(__file__).parent.parent / "args" / "messaging.yaml"
with open(CONFIG_PATH) as f:
    config = yaml.safe_load(f)

BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN")
WHITELIST = config["telegram"]["whitelist_users"]
RATE_LIMIT = config["telegram"]["rate_limit"]
TIMEOUT = config["security"]["timeout_seconds"]

# Messages DB
MESSAGES_DB = Path(__file__).parent.parent / "data" / "messages.db"

def init_db():
    conn = sqlite3.connect(str(MESSAGES_DB))
    conn.execute('''
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY,
            chat_id INTEGER,
            role TEXT,
            content TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    return conn

def get_conversation_history(conn, chat_id, limit=20):
    cursor = conn.cursor()
    cursor.execute('''
        SELECT role, content FROM messages
        WHERE chat_id = ?
        ORDER BY timestamp DESC
        LIMIT ?
    ''', (chat_id, limit))
    rows = cursor.fetchall()
    return list(reversed([{"role": r[0], "content": r[1]} for r in rows]))

def save_message(conn, chat_id, role, content):
    conn.execute(
        'INSERT INTO messages (chat_id, role, content) VALUES (?, ?, ?)',
        (chat_id, role, content)
    )
    conn.commit()

def spawn_claude_session(message: str, history: list, memory_context: str) -> str:
    """Spawn Claude Code session with context"""

    # Build prompt with history
    prompt_parts = []

    if memory_context:
        prompt_parts.append(f"## Memory Context\n{memory_context}\n")

    if history:
        prompt_parts.append("## Conversation History")
        for msg in history:
            prompt_parts.append(f"{msg['role']}: {msg['content']}")
        prompt_parts.append("")

    prompt_parts.append(f"## Current Request\n{message}")

    full_prompt = "\n".join(prompt_parts)

    # Spawn Claude Code
    result = subprocess.run(
        ["claude", "--dangerously-skip-permissions", "-p", full_prompt],
        capture_output=True,
        text=True,
        timeout=TIMEOUT,
        cwd=str(Path(__file__).parent.parent)
    )

    return result.stdout.strip()

def load_memory_context() -> str:
    """Load memory for injection into prompt"""
    memory_script = Path(__file__).parent / "memory" / "memory_read.py"
    result = subprocess.run(
        ["python", str(memory_script), "--format", "markdown"],
        capture_output=True,
        text=True
    )
    return result.stdout

def send_telegram(chat_id: int, text: str):
    """Send message to Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    requests.post(url, json={"chat_id": chat_id, "text": text[:4096]})

def poll_updates(offset: int = 0):
    """Poll for new messages"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/getUpdates"
    response = requests.get(url, params={"offset": offset, "timeout": 30})
    return response.json().get("result", [])

def main():
    conn = init_db()
    offset = 0

    print("Telegram handler daemon started...")

    while True:
        try:
            updates = poll_updates(offset)

            for update in updates:
                offset = update["update_id"] + 1

                if "message" not in update:
                    continue

                msg = update["message"]
                chat_id = msg["chat"]["id"]
                user_id = msg["from"]["id"]
                text = msg.get("text", "")

                # Validate whitelist
                if user_id not in WHITELIST:
                    continue

                print(f"[{datetime.now()}] Received: {text[:50]}...")

                # Save incoming message
                save_message(conn, chat_id, "user", text)

                # Load context
                history = get_conversation_history(conn, chat_id)
                memory = load_memory_context()

                # Spawn Claude
                response = spawn_claude_session(text, history, memory)

                # Save response
                save_message(conn, chat_id, "assistant", response)

                # Send response
                send_telegram(chat_id, response)

                print(f"[{datetime.now()}] Responded: {response[:50]}...")

        except Exception as e:
            print(f"Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    main()
```

---

## Integration with Jarvis v3

Once Atlas is running on the MacBook:

```
┌─────────────────────────────────────────────────────────────────┐
│                    JARVIS v3 + ATLAS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Interfaces                                                 │
│  ├── Voice (web app) ──────────────▶ Jarvis API (Vercel)        │
│  ├── Dashboard (web) ─────────────▶ Jarvis API (Vercel)         │
│  └── Telegram (phone) ────────────▶ Atlas (MacBook)             │
│                                                                  │
│  Jarvis API (Vercel)                                            │
│  ├── Voice pipeline (existing)                                  │
│  ├── Claude API for conversation                                │
│  ├── Notion tools for Life OS                                   │
│  └── Memory sync with Atlas                                     │
│                                                                  │
│  Atlas (MacBook - Always On)                                    │
│  ├── Telegram handler daemon                                    │
│  ├── Full GOTCHA framework                                      │
│  ├── Persistent memory system                                   │
│  ├── Self-healing loops                                         │
│  ├── Build/automation capabilities                              │
│  └── Overnight autonomous operation                             │
│                                                                  │
│  Shared State                                                    │
│  ├── Turso database (cloud SQLite) - memory entries             │
│  ├── Notion - Life OS data                                      │
│  └── Memory sync between Jarvis and Atlas                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Copy from atlas_framework/

Already have these in `jarvis/atlas_framework/atlas_framework/`:

- [x] `memory/memory_db.py` - SQLite CRUD
- [x] `memory/memory_read.py` - Load memory
- [x] `memory/memory_write.py` - Write memory
- [x] `memory/embed_memory.py` - Embeddings
- [x] `memory/semantic_search.py` - Vector search
- [x] `memory/hybrid_search.py` - BM25 + vector
- [x] `CLAUDE.md` - System handbook
- [x] `build_app.md` - ATLAS workflow

---

## Next Steps When MacBook Available

1. **Day 1**: Set up directory structure, copy files, configure CLAUDE.md
2. **Day 2**: Set up Telegram bot, test basic messaging
3. **Day 3**: Implement handler daemon, test full loop
4. **Day 4**: Connect to Jarvis Notion databases, sync memory
5. **Day 5**: Test overnight autonomous operation
6. **Day 6**: Create system dashboard
7. **Day 7**: Document and refine based on usage

---

## Security Checklist

- [ ] Telegram whitelist configured (only you)
- [ ] Rate limiting enabled
- [ ] Dangerous patterns blocked
- [ ] .env not committed to git
- [ ] Audit logging enabled
- [ ] Confirmation required for destructive operations
