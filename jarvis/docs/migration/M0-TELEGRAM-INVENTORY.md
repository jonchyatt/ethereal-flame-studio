# M0: Telegram Code Path Inventory

## Entry Point

`src/app/api/jarvis/telegram/webhook/route.ts` — POST handler receives Telegram updates, passes to bot.

## Bot Registration

`src/lib/jarvis/telegram/bot.ts:326` — `getTelegramBot()` lazy singleton. Creates grammY `Bot` instance.

## Middleware

`bot.ts:336-346` — Owner-only middleware. Checks `ctx.from?.id` against `TELEGRAM_OWNER_ID`.

## Commands

| Command | Line | Handler |
|---------|------|---------|
| `/start` | `bot.ts:350` | Welcome message + quick action keyboard |
| `/help` | `bot.ts:365` | Command list |
| `/briefing` | `bot.ts:379` | `sendBriefing()` → `buildMorningBriefing()` → `formatBriefingForTelegram()` |
| `/tasks` | `bot.ts:388` | `sendTasks()` → `executeNotionTool('query_tasks', {filter:'today'})` |
| `/bills` | `bot.ts:397` | `sendBills()` → `executeNotionTool('query_bills', {timeframe:'this_month'})` |
| `/goals` | `bot.ts:~407` | `executeNotionTool('query_goals', {status:'active'})` (Phase 2 new) |
| `/habits` | `bot.ts:~417` | `executeNotionTool('query_habits', {frequency:'daily'})` (Phase 2 new) |
| `/meal` | `bot.ts:~427` | `processChatWithProgress(ctx, "What's on my meal plan?")` (Phase 2 new) |
| `/remember` | `bot.ts:406` | `executeMemoryTool('remember_fact', ...)` |
| `/forget` | `bot.ts:429` | `executeMemoryTool('forget_fact', ...)` |
| `/forget_confirm` | `bot.ts:457` | `executeMemoryTool('forget_fact', {confirm_ids})` |

## Callback Queries (Inline Buttons)

`bot.ts:482` — `bot.on('callback_query:data', ...)`

| Pattern | Line | Action |
|---------|------|--------|
| `action:briefing` | `bot.ts:489` | `sendBriefing(ctx)` |
| `action:tasks` | `bot.ts:494` | `sendTasks(ctx)` |
| `action:bills` | `bot.ts:499` | `sendBills(ctx)` |
| `retry:last` | `bot.ts:504` | Replay last user message |
| `voice:confirm` | `bot.ts:514` | Process pending voice transcript |
| `voice:cancel` | `bot.ts:525` | Cancel pending voice |
| `task:done:<id>` | `bot.ts:535` | `executeNotionTool('update_task_status', {completed})` |
| `task:snooze:<id>` | `bot.ts:554` | `executeNotionTool('pause_task', {until: tomorrow})` |

## Voice Flow

1. `bot.ts:577` — `bot.on('message:voice', ...)` / `bot.ts:582` — `bot.on('message:audio', ...)`
2. `bot.ts:256` — `handleVoiceMessage()` downloads file, transcribes
3. `telegram/stt.ts` — `transcribeAudioBuffer()` calls Deepgram pre-recorded API
4. Shows confirm/cancel inline keyboard
5. On confirm → `processChatWithProgress(ctx, transcript)`

## Chat Flow

1. `bot.ts:589` — `bot.on('message:text', ...)` catches all text
2. `bot.ts:159` — `processChatWithProgress()`:
   - Creates "Working..." status message
   - Sets up tool tracking + typing indicator
   - Calls `chatProcessor.processChatMessage()` with callbacks
   - Sends final response with quick action keyboard
   - Extracts task actions from tool results for inline buttons

## Push Endpoint (Phase 2 New)

`src/app/api/jarvis/telegram/push/route.ts` — POST endpoint for Agent Zero scheduler:
- Auth: `X-Jarvis-Secret` header
- Body: `{ message, parse_mode? }`
- Sends to `TELEGRAM_OWNER_ID` via bot instance

## Key Dependencies

- `grammy` — Telegram Bot framework
- `@/lib/jarvis/intelligence/chatProcessor` — Claude tool loop
- `@/lib/jarvis/notion/toolExecutor` — Notion CRUD
- `@/lib/jarvis/memory/toolExecutor` — Memory operations
- `@/lib/jarvis/executive/BriefingBuilder` — Briefing data
- `@/lib/jarvis/telegram/stt` — Voice transcription
- `@/lib/jarvis/telegram/formatter` — Telegram message formatting
