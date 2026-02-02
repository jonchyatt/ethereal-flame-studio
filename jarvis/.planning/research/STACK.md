# Technology Stack

**Project:** Jarvis - Voice-Enabled AI Personal Assistant
**Researched:** 2026-02-02 (v2.0 Update)

---

## v2.0 Stack Additions Summary

This update adds stack requirements for v2.0 features:
- **Persistent Memory** - Cross-session conversation continuity with SQLite
- **Messaging Gateway** - Optional Telegram integration for mobile access
- **Production Deployment** - Custom domain configuration for Vercel

**Critical Finding:** The existing `better-sqlite3` (already installed) **will NOT work in Vercel's serverless environment**. For production, we need `@libsql/client` which provides a unified API for local SQLite files (development) and Turso cloud database (production).

---

## Validated v1 Stack (DO NOT CHANGE)

| Technology | Version | Status |
|------------|---------|--------|
| Next.js | ^15.1.4 | Validated |
| TypeScript | ^5.7.2 | Validated |
| React | ^19.0.0 | Validated |
| @anthropic-ai/sdk | ^0.72.1 | Validated |
| @deepgram/sdk | ^4.11.3 | Validated |
| @modelcontextprotocol/sdk | ^1.25.3 | Validated |
| @react-three/fiber | ^9.0.0 | Validated |
| @react-three/drei | ^10.0.0 | Validated |
| better-sqlite3 | ^12.6.2 | **Development only** |
| Zustand | ^5.0.2 | Validated |
| Zod | ^4.3.6 | Validated |
| date-fns | ^4.1.0 | Validated |

---

## v2.0 New Dependencies

### 1. Persistent Memory System

#### Primary: @libsql/client + Drizzle ORM

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| `@libsql/client` | ^0.17.0 | Database driver | Unified API for local SQLite files AND Turso cloud. Works in serverless. | HIGH |
| `drizzle-orm` | ^0.45.1 | Type-safe ORM | Zero dependencies, tree-shakeable, excellent TypeScript inference | HIGH |
| `drizzle-kit` | (dev) | Migrations CLI | Schema management without runtime overhead | HIGH |

**Rationale:**

The existing `better-sqlite3` driver is synchronous and requires filesystem access, which **will not work on Vercel serverless functions**. Vercel's functions are stateless and ephemeral - each invocation may run on a different container with no shared storage.

`@libsql/client` solves this by providing:
- `file:local.db` - Local SQLite for development (same as better-sqlite3)
- `libsql://` - Remote Turso database for production
- Identical API for both environments

**Environment Configuration Pattern:**
```typescript
// lib/jarvis/memory/db.ts
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

const client = createClient({
  url: process.env.DATABASE_URL!, // file:./jarvis.db OR libsql://your-db.turso.io
  authToken: process.env.DATABASE_AUTH_TOKEN, // Only needed for Turso
});

export const db = drizzle(client);
```

**Installation:**
```bash
npm install @libsql/client drizzle-orm
npm install -D drizzle-kit
```

#### Optional: Embeddings for Semantic Search

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| `voyageai` | ^0.1.0 | Embedding generation | Anthropic's recommended provider, better quality than OpenAI for Claude context | MEDIUM |

**Rationale:**

Anthropic does not offer embeddings. They officially recommend Voyage AI. For hybrid search (keyword + semantic), we need embeddings stored alongside memory entries.

**However, this is OPTIONAL for v2.0.** BM25-style keyword search in SQLite can handle most use cases. Add embeddings only if:
- User explicitly requests "find things similar to X"
- Memory corpus exceeds 10,000 entries
- Keyword search proves insufficient

**If needed:**
```bash
npm install voyageai
```

**Vector Storage:**
For semantic search, vectors can be stored as JSON arrays in SQLite text columns. This is simpler than sqlite-vec and sufficient for <100k entries. The GOTCHA framework's hybrid search pattern uses:
- BM25 (0.7 weight) - Exact token matching via SQL LIKE/FTS5
- Semantic (0.3 weight) - Cosine similarity on vectors

---

### 2. Messaging Gateway (Optional)

#### Primary: grammY

| Library | Version | Purpose | Why | Confidence |
|---------|---------|---------|-----|------------|
| `grammy` | ^1.39.2 | Telegram Bot Framework | First-class TypeScript, modern API, runs in Edge/serverless | HIGH |

**Rationale:**

Compared to alternatives:
- **Telegraf** - Older, larger bundle, worse TypeScript support
- **node-telegram-bot-api** - Requires separate @types package, callback-based
- **grammY** - Native TypeScript, smaller bundle, works in Cloudflare Workers

grammY supports Next.js API routes directly via webhook mode (no long-polling required).

**Why Telegram over Slack/Discord:**
- Works on mobile without app switching
- Simple 1:1 conversation model matches Jarvis's design
- Webhook-based (serverless-compatible)
- Free, no workspace required

**Installation:**
```bash
npm install grammy
```

**Implementation Pattern:**
```typescript
// app/api/telegram/route.ts
import { Bot, webhookCallback } from 'grammy';

const bot = new Bot(process.env.TELEGRAM_BOT_TOKEN!);
bot.on('message:text', async (ctx) => {
  // Route to existing Jarvis chat handler
  const response = await jarvisChat(ctx.message.text);
  await ctx.reply(response);
});

export const POST = webhookCallback(bot, 'std/http');
```

---

### 3. Production Deployment

#### Platform: Vercel (already used)

No new dependencies required. Configuration changes only.

**Custom Domain Setup:**
1. Add `jarvis.whatareyouappreciatingnow.com` in Vercel Project Settings > Domains
2. Configure DNS (A record or CNAME as Vercel instructs)
3. SSL is automatic

#### Database: Turso (for production)

| Service | Tier | Purpose | Why | Confidence |
|---------|------|---------|-----|------------|
| Turso | Free/Starter | SQLite in the cloud | SQLite-compatible, Vercel-native integration, edge-ready | HIGH |

**Turso Free Tier:**
- 9 GB storage
- 500 databases
- 1 billion row reads/month
- Unlimited writes

This is more than sufficient for Jarvis's memory system.

**Setup:**
```bash
# Install Turso CLI (one-time)
brew install tursodatabase/tap/turso  # macOS
# Or: curl -sSfL https://get.tur.so/install.sh | bash

# Create database
turso db create jarvis
turso db show jarvis --url  # Get DATABASE_URL
turso db tokens create jarvis  # Get DATABASE_AUTH_TOKEN
```

---

## What NOT to Add for v2

| Rejected | Reason |
|----------|--------|
| `sqlite-vec` | Adds complexity for vector search. JSON arrays + manual cosine similarity work fine for <100k entries. |
| `Prisma` | Heavy ORM, worse TypeScript inference than Drizzle, connection pooling issues on serverless |
| `openai` (for embeddings) | Anthropic recommends Voyage AI. Also adds another API key to manage. |
| `Redis/BullMQ` for memory | Already in project for rendering. Don't use for memory - SQLite is simpler for single-user. |
| `socket.io` | SSE already works. WebSockets add complexity without benefit for voice assistant. |
| `Slack SDK` | Requires workspace. Telegram is simpler for personal assistant. |

---

## Database Schema (Drizzle)

```typescript
// lib/jarvis/memory/schema.ts
import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const memoryEntries = sqliteTable('memory_entries', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(), // 'fact' | 'preference' | 'event' | 'insight' | 'task'
  content: text('content').notNull(),
  contentHash: text('content_hash').unique(), // For deduplication
  source: text('source').notNull(), // 'user' | 'inferred' | 'session' | 'system'
  confidence: real('confidence').default(1.0),
  importance: integer('importance').default(5), // 1-10
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  lastAccessed: text('last_accessed'),
  accessCount: integer('access_count').default(0),
  embedding: text('embedding'), // JSON array, optional
  tags: text('tags'), // JSON array
  expiresAt: text('expires_at'),
  isActive: integer('is_active').default(1),
});

export const dailyLogs = sqliteTable('daily_logs', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  date: text('date').notNull().unique(), // 'YYYY-MM-DD'
  summary: text('summary'),
  rawLog: text('raw_log'),
  keyEvents: text('key_events'), // JSON array
  entryCount: integer('entry_count').default(0),
});

export const sessions = sqliteTable('sessions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  startedAt: text('started_at').notNull(),
  endedAt: text('ended_at'),
  messageCount: integer('message_count').default(0),
  summary: text('summary'),
  platform: text('platform').default('web'), // 'web' | 'telegram'
});
```

---

## Migration from Current MemoryStore

The existing `MemoryStore.ts` uses browser `localStorage`. This works but:
- Is browser-only (no server-side access)
- Doesn't persist across devices
- Limited storage (~5MB)
- No semantic search capability

**Migration Path:**
1. Keep `localStorage` for immediate UI state (keyFacts display)
2. Sync to SQLite on session end
3. Load from SQLite on session start
4. Gradually deprecate localStorage as SQLite becomes primary

---

## Installation Summary for v2

**Required for v2:**
```bash
npm install @libsql/client drizzle-orm
npm install -D drizzle-kit
```

**Optional (Telegram gateway):**
```bash
npm install grammy
```

**Optional (semantic search):**
```bash
npm install voyageai
```

**Total new dependencies:** 2-4 packages (minimal)

---

## Environment Variables for v2

Add to `.env.local` (development):
```env
# Database (local SQLite)
DATABASE_URL=file:./jarvis.db
```

Add to Vercel (production):
```env
# Database (Turso)
DATABASE_URL=libsql://jarvis-[account].turso.io
DATABASE_AUTH_TOKEN=eyJ...

# Optional: Telegram
TELEGRAM_BOT_TOKEN=123456:ABC...
TELEGRAM_WEBHOOK_SECRET=random_secret_string

# Optional: Embeddings
VOYAGE_API_KEY=pa-...
```

---

## Confidence Assessment for v2 Additions

| Area | Confidence | Reasoning |
|------|------------|-----------|
| @libsql/client | HIGH | Official Turso client, verified serverless compatibility, v0.17.0 published 2 days ago |
| Drizzle ORM | HIGH | Active development (v0.45.1), widespread adoption, zero-dep |
| Turso | HIGH | Official Vercel integration, SQLite-compatible, free tier sufficient |
| grammY | HIGH | v1.39.2 verified, excellent TypeScript support, modern API |
| Voyage AI | MEDIUM | Anthropic-recommended but not personally validated |
| sqlite-vec rejection | HIGH | JSON arrays simpler for expected scale (<100k entries) |

---

## Recommended Stack (Original v1)

### Core Framework

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Next.js | 16.1+ | Full-stack React framework | Turbopack stable, React 19 support, excellent streaming/SSR. Industry standard for 2026. | HIGH |
| React | 19.2+ | UI library | Server Components stable, concurrent rendering, improved hooks. Required for R3F v9+. | HIGH |
| TypeScript | 5.7+ | Type safety | Industry standard, excellent tooling, AI SDK type definitions. | HIGH |

**Rationale:** Next.js 16 is the current stable release with Turbopack as default bundler (5x faster builds). React 19.2 is required for @react-three/fiber v9 which powers the animated orb.

### AI/LLM Backend

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Anthropic SDK | 0.71+ | Claude API access | Structured outputs, MCP helpers built-in, excellent TypeScript support. | HIGH |
| Vercel AI SDK | 6.x | Streaming UI, useChat | Unified API across providers, ToolLoopAgent for agentic workflows. | HIGH |

**Rationale:** Claude excels at reasoning and instruction-following for personal assistant tasks. Vercel AI SDK 6 provides framework-agnostic streaming and tool execution loops. Use together: AI SDK for streaming/UI, Anthropic SDK for MCP integration.

**Alternative Considered:** OpenAI Realtime API offers native voice-to-voice with WebRTC, but requires restructuring around their agent model. Keep as optional enhancement for Phase 2+.

### Speech-to-Text (STT)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Web Speech API | Browser native | Voice input (primary) | Zero cost, zero latency network calls, works offline. Good for MVP. | MEDIUM |
| Deepgram Nova-3 | API | Production STT (upgrade path) | Sub-300ms latency, 90%+ accuracy on specialized vocab, $0.0043/min. | HIGH |

**Primary Recommendation:** Start with Web Speech API for MVP. It's free and built into Chrome/Edge/Safari.

**Limitations:** Web Speech API only works in Chromium browsers (Chrome, Edge). Audio is sent to Google/Microsoft servers. No offline mode despite documentation claims.

**Upgrade Path:** When you need:
- Cross-browser support
- Custom vocabulary (Notion-specific terms)
- Higher accuracy
- Self-hosted option

Switch to Deepgram Nova-3 (real-time streaming, WebSocket API).

**Why Not:**
- AssemblyAI: Better for batch transcription, less optimized for real-time voice agents
- Whisper (self-hosted): 500ms+ latency, requires engineering effort for streaming

### Text-to-Speech (TTS)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| ElevenLabs | Flash v2.5 | Voice output (recommended) | 75ms latency, excellent voice quality, streaming support. | HIGH |
| Web Speech API | Browser native | Fallback TTS | Free, works offline, but robotic voice quality. | MEDIUM |

**Primary Recommendation:** ElevenLabs Flash v2.5 for production-quality voice. $5/mo starter tier for 30 minutes.

**Alternatives Considered:**

| Service | Latency | Quality | Price | Notes |
|---------|---------|---------|-------|-------|
| ElevenLabs Flash v2.5 | 75ms | Excellent | $5-22/mo | Recommended |
| OpenAI TTS API | 200ms+ | Very Good | $15/1M chars | No voice cloning |
| Fish Audio | 100ms | Excellent | $9.99/mo | Cheaper, #1 TTS-Arena |
| Browser SpeechSynthesis | Instant | Poor | Free | Fallback only |

**Why ElevenLabs:** Best balance of latency, quality, and streaming support for voice agents. Flash v2.5 specifically designed for real-time applications.

### Notion Integration

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Notion MCP Server | Official | Notion workspace access | Official hosted MCP server at mcp.notion.com, OAuth, full API access. | HIGH |
| @modelcontextprotocol/sdk | 1.x | MCP client | Official TypeScript SDK, stable for production. v2 expected Q1 2026. | HIGH |

**Rationale:** Notion's official MCP server is the 2026 standard for AI-Notion integration. It provides:
- OAuth authentication (no API key management)
- Full read/write access to pages, databases, blocks
- Optimized for AI agents
- Enterprise audit logging

**Setup:** Connect via `https://mcp.notion.com/mcp` as custom MCP connection. Use `NOTION_TOKEN` environment variable for local development.

### Visual Avatar (Animated Orb)

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| @react-three/fiber | 9.5+ | React Three.js renderer | React 19 compatible, stable, excellent ecosystem. | HIGH |
| @react-three/drei | 9.x | R3F helpers | Useful abstractions for orb effects (shaders, post-processing). | HIGH |
| Three.js | 0.170+ | 3D graphics | Required peer dependency for R3F. | HIGH |

**Rationale:** You already have R3F experience from Ethereal Flame Studio. The orb component can reuse existing audio visualization patterns.

**Key Pattern:** Use `useAudioLevel` hook pattern to connect microphone/TTS audio to orb visual properties (scale, emission, displacement).

### State Management

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Zustand | 5.0+ | Client state | Lightweight, no boilerplate, 40% market share in 2026. | HIGH |
| TanStack Query | 5.90+ | Server state | Caching, background sync, optimistic updates. | HIGH |

**Rationale:** Zustand handles UI state (voice mode, conversation history, settings). TanStack Query handles server state (Notion data, AI responses). This is the dominant 2026 pattern.

**Why Not Redux:** Zustand + TanStack Query covers all use cases with less boilerplate. Redux Toolkit is reserved for large multi-team projects.

### Styling

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Tailwind CSS | 4.0+ | Utility-first CSS | 5x faster builds, CSS-first config, modern CSS features. | HIGH |
| shadcn/ui | Latest | UI components | Accessible, customizable, Tailwind-native. | HIGH |

**Rationale:** Tailwind 4 uses Lightning CSS and requires only one import line. shadcn/ui provides copy-paste components that you own.

### Authentication

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| Clerk | Latest | User auth | 30-minute setup, pre-built UI, excellent DX. | HIGH |

**Rationale:** For a personal assistant, you need:
- User identity (to scope Notion access)
- Session management
- Potentially multi-device sync

Clerk provides this out-of-box with minimal setup. If you're the only user, you could skip auth initially and add later.

**Alternative:** NextAuth.js v5 if you need self-hosted auth or have strict data residency requirements.

---

## Complete Package List

### Production Dependencies

```bash
# Core (already installed)
npm install next@latest react@latest react-dom@latest
npm install @anthropic-ai/sdk ai @vercel/ai-sdk
npm install @modelcontextprotocol/sdk zod
npm install @react-three/fiber @react-three/drei three
npm install zustand @tanstack/react-query
npm install @clerk/nextjs
npm install @elevenlabs/elevenlabs-js

# v2 Additions
npm install @libsql/client drizzle-orm
npm install grammy  # Optional: Telegram
npm install voyageai  # Optional: Embeddings
```

### Development Dependencies

```bash
npm install -D typescript @types/react @types/node
npm install -D tailwindcss @tailwindcss/postcss
npm install -D eslint prettier
npm install -D drizzle-kit  # v2 Addition
```

### Environment Variables

```bash
# AI
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-... # Optional, for fallback

# Notion MCP
NOTION_TOKEN=secret_...

# TTS
ELEVENLABS_API_KEY=...

# Auth
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...

# v2: Database
DATABASE_URL=file:./jarvis.db  # Development
# DATABASE_URL=libsql://jarvis-[account].turso.io  # Production
# DATABASE_AUTH_TOKEN=eyJ...  # Production only

# v2: Optional Telegram
# TELEGRAM_BOT_TOKEN=123456:ABC...
# TELEGRAM_WEBHOOK_SECRET=random_secret_string

# v2: Optional Embeddings
# VOYAGE_API_KEY=pa-...
```

---

## Alternatives NOT Recommended

| Technology | Why Not |
|------------|---------|
| OpenAI Realtime API | Good for voice-native apps, but adds complexity. Evaluate for Phase 2. |
| Whisper (self-hosted) | High latency (500ms+), requires GPU, engineering overhead. |
| Redux | Overkill for this project size. Zustand + TanStack Query suffices. |
| Auth0 | More complex than Clerk, enterprise-focused pricing. |
| Styled Components | Tailwind 4 is faster, simpler, and industry standard. |
| Jotai | Good alternative to Zustand, but Zustand has larger ecosystem. |
| Prisma | Heavy ORM, worse TypeScript inference than Drizzle for SQLite. |
| sqlite-vec | Over-engineering for <100k memory entries. |
| better-sqlite3 (production) | Does not work on Vercel serverless. Use @libsql/client. |

---

## Version Compatibility Matrix

| Package | Min Version | Pairs With |
|---------|-------------|------------|
| Next.js | 16.0 | React 19.x |
| React | 19.0 | R3F 9.x |
| @react-three/fiber | 9.0 | React 19.x, Three.js 0.160+ |
| Tailwind CSS | 4.0 | Safari 16.4+, Chrome 111+, Firefox 128+ |
| @modelcontextprotocol/sdk | 1.x | zod 3.25+ |
| @libsql/client | 0.17.0 | drizzle-orm 0.45+ |
| drizzle-orm | 0.45.1 | @libsql/client 0.15+ |

---

## Architecture Decision Records

### ADR-001: Claude over OpenAI for Primary LLM

**Decision:** Use Claude (Anthropic) as primary LLM backend.

**Context:** Both Claude and GPT-4 are capable. OpenAI has Realtime API for voice.

**Rationale:**
1. Claude's instruction-following is superior for assistant tasks
2. Anthropic SDK has MCP helpers built-in
3. Vercel AI SDK supports both, easy to switch
4. OpenAI Realtime API can be added later as enhancement

**Consequences:** Need to handle TTS separately (ElevenLabs). Can't use native voice-to-voice.

### ADR-002: Web Speech API for MVP STT

**Decision:** Use browser Web Speech API for initial voice recognition.

**Context:** Deepgram/AssemblyAI offer better accuracy and cross-browser support.

**Rationale:**
1. Zero cost for MVP development
2. No network latency for speech capture
3. Good enough for personal use
4. Easy upgrade path to Deepgram later

**Consequences:** Only works in Chrome/Edge. Audio sent to Google servers.

### ADR-003: MCP for Notion Integration

**Decision:** Use Notion's official MCP server for workspace integration.

**Context:** Could use Notion API directly or third-party integrations.

**Rationale:**
1. Official support from Notion
2. OAuth simplifies auth flow
3. Optimized for AI agent patterns
4. Enterprise audit logging
5. Future-proof (MCP is industry standard)

**Consequences:** Requires MCP client setup. Depends on Notion's hosted infrastructure.

### ADR-004: @libsql/client over better-sqlite3 for Production (v2)

**Decision:** Use @libsql/client for database access in production.

**Context:** better-sqlite3 is already installed and works locally.

**Rationale:**
1. better-sqlite3 requires filesystem access - not available on Vercel serverless
2. @libsql/client provides identical API for local files AND Turso cloud
3. Single codebase works in both development and production
4. Turso free tier (9GB, 1B reads/mo) exceeds Jarvis requirements

**Consequences:** Need Turso account for production. Local development uses SQLite file.

### ADR-005: grammY over Telegraf for Telegram (v2)

**Decision:** Use grammY for Telegram bot integration.

**Context:** Multiple Telegram bot libraries exist (Telegraf, node-telegram-bot-api, grammY).

**Rationale:**
1. First-class TypeScript support (types built-in)
2. Modern API design with excellent DX
3. Works in serverless/edge environments (webhook mode)
4. Smaller bundle size than Telegraf
5. Active development (v1.39.2, Jan 2026)

**Consequences:** None significant. Migration from other libraries is straightforward.

---

## Sources

### v2 Research Sources
- [@libsql/client npm](https://www.npmjs.com/package/@libsql/client) - v0.17.0 (published 2 days ago)
- [Turso + Next.js Guide](https://docs.turso.tech/sdk/ts/guides/nextjs)
- [Drizzle ORM SQLite](https://orm.drizzle.team/docs/get-started-sqlite)
- [drizzle-orm npm](https://www.npmjs.com/drizzle-orm) - v0.45.1
- [grammY Framework](https://grammy.dev/)
- [grammy npm](https://www.npmjs.com/package/grammy) - v1.39.2
- [Anthropic Embeddings Docs](https://docs.claude.com/en/docs/build-with-claude/embeddings) - Recommends Voyage AI
- [Voyage AI TypeScript SDK](https://github.com/voyage-ai/typescript-sdk)
- [Is SQLite supported in Vercel?](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) - No, use Turso
- [Turso Cloud for Vercel](https://vercel.com/marketplace/tursocloud)
- [Adding Custom Domain](https://vercel.com/docs/domains/working-with-domains/add-a-domain)
- [GOTCHA-ATLAS-ANALYSIS.md](./GOTCHA-ATLAS-ANALYSIS.md) - Memory system patterns

### Official Documentation (v1)
- [Next.js 16.1 Release](https://nextjs.org/blog/next-16-1)
- [React 19.2 Release](https://react.dev/blog/2025/10/01/react-19-2)
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript)
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6)
- [Notion MCP](https://developers.notion.com/docs/mcp)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [ElevenLabs JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js)
- [React Three Fiber v9](https://r3f.docs.pmnd.rs/)
- [Zustand v5](https://github.com/pmndrs/zustand)
- [TanStack Query v5](https://tanstack.com/query/latest)
- [Tailwind CSS v4](https://tailwindcss.com/blog/tailwindcss-v4)

### Comparison Resources
- [Speech-to-Text APIs 2026 Comparison](https://www.assemblyai.com/blog/best-api-models-for-real-time-speech-recognition-and-transcription)
- [ElevenLabs Alternatives](https://elevenlabs.io/blog/elevenlabs-alternatives)
- [Next.js Auth Comparison](https://clerk.com/articles/complete-authentication-guide-for-nextjs-app-router)
- [State Management 2026](https://www.nucamp.co/blog/state-management-in-2026-redux-context-api-and-modern-patterns)

### Web Speech API
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Browser Support](https://caniuse.com/speech-recognition)
