# M0: Architecture Lock

## Decision Record

### Architecture

```
[Phone/Browser] --> [Jarvis Web UI on Vercel]
                         |
                    [Jarvis API routes]
                         |
              +----------+-----------+
              |                      |
   [Local SQLite/Turso]    [Agent Zero Docker :50001]
   (canonical data)        (orchestration/scheduling)
              |                      |
              +----------+-----------+
                         |
                    [Notion API]
                    (sync bridge, not primary)
```

### What Lives Where

| Component | Runtime | Notes |
|-----------|---------|-------|
| Web UI (orb, dashboard, chat) | Vercel (Next.js) | Serverless functions |
| Telegram webhook | Vercel API route | `/api/jarvis/telegram/webhook` |
| Chat processor + Claude | Vercel API route | Tool execution loop |
| SQLite (memory, sessions) | Turso (prod) / file (dev) | Already exists |
| SQLite (Life OS domains) | Turso (prod) / file (dev) | Phase M1 adds this |
| Agent Zero | Docker container (local/VPS) | Port 50001, always-on |
| Deepgram STT proxy | Vercel API route | SSE + POST pattern |
| AWS Polly TTS | Called from Vercel | Neural voices |
| Notion API | Called from services | Sync bridge after M4 |

### Rationale

1. **Local SQLite as canonical store** - Eliminates Notion as single point of failure. Operations work offline. Sub-millisecond reads vs 200-500ms Notion API calls.

2. **Agent Zero for complex reasoning** - Claude Haiku handles simple CRUD. Agent Zero handles multi-step reasoning ("reorganize my week", "analyze spending trends"). Graceful degradation: if Agent Zero is down, fall back to Haiku direct.

3. **Notion as sync bridge** - User still sees data in Notion UI. Bidirectional sync with last-write-wins. Can retire Notion when local covers 80%+ of interactions.

4. **Keep Vercel for web + API** - Already deployed, works well. Serverless model fits the bursty usage pattern.

### Non-Decisions (Deferred)

- **Self-hosted TTS**: KittenTTS not mature enough. Keep AWS Polly for now.
- **Vector database**: Not needed yet. SQLite FTS5 covers current search needs.
- **Multi-user**: Jarvis is single-user. No auth system beyond owner ID checks.

### Constraints

- Vercel serverless: No WebSockets (workaround: SSE + POST for STT)
- Vercel cold starts: ~2-3s for first request after idle
- Notion rate limit: 3 requests/second average
- Agent Zero: Requires always-on container (Docker on local machine or VPS)
