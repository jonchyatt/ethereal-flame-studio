# M0: Codebase Inventory

## Runtime Components

### API Routes (`src/app/api/jarvis/`)

| Route | Method | Purpose | Phase |
|-------|--------|---------|-------|
| `chat/route.ts` | POST | SSE Claude chat with tool loop | Existing |
| `stt/route.ts` | GET/POST/DELETE | Deepgram STT proxy (SSE + POST) | Phase 0 fix |
| `briefing/route.ts` | GET | Morning briefing data | Existing |
| `session/route.ts` | GET/POST | Session management | Existing |
| `telegram/webhook/route.ts` | POST | Telegram bot webhook | Existing |
| `telegram/push/route.ts` | POST | Push messages to owner | Phase 2 new |

### Intelligence Layer (`src/lib/jarvis/intelligence/`)

| File | Lines | Purpose |
|------|-------|---------|
| `chatProcessor.ts` | 215 | Core Claude tool execution loop. Model: claude-haiku-4-5-20251001. Max 5 tool iterations. |
| `systemPrompt.ts` | ~200 | Builds system prompt with context, memories, personality |
| `tools.ts` | ~300 | Tool definitions (notionTools + memoryTools) |
| `ClaudeClient.ts` | ~150 | Browser-side Claude client for voice pipeline |

### Notion Layer (`src/lib/jarvis/notion/`)

| File | Lines | Purpose |
|------|-------|---------|
| `toolExecutor.ts` | 1019 | Routes 17+ Claude tool calls to Notion SDK |
| `schemas.ts` | 1158 | Database schemas, filters, formatters, property maps |
| `NotionClient.ts` | ~100 | Notion SDK wrapper (query, create, update, retrieve) |
| `recentResults.ts` | ~80 | Query result cache for follow-up operations |
| `notionUrls.ts` | ~100 | Database URL resolution for panel navigation |

### Memory Layer (`src/lib/jarvis/memory/`)

| File | Lines | Purpose |
|------|-------|---------|
| `schema.ts` | 105 | Drizzle ORM tables: memory_entries, sessions, daily_logs, observations, messages |
| `toolExecutor.ts` | ~100 | Memory tool routing (remember, forget, list, observe) |
| `queries/sessions.ts` | ~50 | Session CRUD |
| `queries/messages.ts` | ~50 | Message persistence |
| `queries/dailyLogs.ts` | ~50 | Event logging |
| `summarization.ts` | ~80 | Auto-summarization at 20+ messages |

### Executive Layer (`src/lib/jarvis/executive/`)

| File | Lines | Purpose |
|------|-------|---------|
| `BriefingBuilder.ts` | 926 | Aggregates all databases for briefings (morning, midday, evening, weekly) |
| `BriefingClient.ts` | ~30 | Client-side briefing fetch |
| `BriefingFlow.ts` | ~100 | Voice briefing orchestration |
| `Scheduler.ts` | ~80 | Time-based event scheduler |
| `NudgeManager.ts` | ~100 | Proactive nudge system |
| `CheckInManager.ts` | ~80 | Midday/evening check-in flows |

### Telegram (`src/lib/jarvis/telegram/`)

| File | Lines | Purpose |
|------|-------|---------|
| `bot.ts` | 602 | grammY bot: commands, callbacks, voice, chat |
| `formatter.ts` | ~80 | Briefing text formatter for Telegram |
| `context.ts` | ~50 | System prompt context builder |
| `stt.ts` | ~60 | Deepgram pre-recorded transcription |

### Stores (`src/lib/jarvis/stores/`)

| File | Purpose |
|------|---------|
| `jarvisStore.ts` | Orb state, audio, pipeline, permissions |
| `dashboardStore.ts` | Dashboard refresh triggers, section visibility |
| `chatStore.ts` | Chat messages, typing state, panel visibility (Phase 1 new) |
| `notionPanelStore.ts` | Notion iframe panel state |
| `lifeAreaStore.ts` | Life area neglect tracking |
| `curriculumProgressStore.ts` | Tutorial progress |

### UI Components (`src/components/jarvis/`)

| Component | Purpose |
|-----------|---------|
| `JarvisOrb` | Three.js orb visualization |
| `Dashboard/DashboardPanel.tsx` | Dashboard with tasks, calendar, habits, bills |
| `Dashboard/TasksList.tsx` | Interactive task list with done/snooze |
| `ChatPanel.tsx` | Text chat panel (Phase 1 new) |
| `PushToTalk.tsx` | PTT button |
| `PermissionPrompt.tsx` | Microphone permission flow |
| `NotionPanel.tsx` | Notion iframe overlay |
| `NudgeOverlay.tsx` | Proactive nudge display |

## Database Schema (Current)

### SQLite (jarvis-local.db)

Tables via Drizzle ORM:
- `memory_entries` - Long-term facts/preferences
- `sessions` - Conversation boundaries
- `daily_logs` - Session events
- `observations` - Behavioral patterns
- `messages` - Full conversation history

### Notion Databases (10)

1. Tasks (CRUD via tools)
2. Subscriptions/Bills (CRUD via tools)
3. Projects (read + add items)
4. Goals (read)
5. Habits (read)
6. Recipes (read + meal plan)
7. Meal Plan (create entries)
8. Ingredients (relation resolution)
9. Shopping List (auto-populate)
10. Journal (not yet wired)

## External Dependencies

| Service | Purpose | Cost |
|---------|---------|------|
| Anthropic Claude | Chat reasoning | Per-token (Haiku) |
| Deepgram | Speech-to-text | Per-minute |
| AWS Polly | Text-to-speech | Per-character |
| Notion API | Life OS data | Free |
| Vercel | Hosting | Free tier |
| Telegram Bot API | Messaging | Free |
