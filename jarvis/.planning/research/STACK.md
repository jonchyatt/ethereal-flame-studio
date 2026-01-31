# Technology Stack

**Project:** Jarvis - Voice-Enabled AI Personal Assistant
**Researched:** 2026-01-31

## Recommended Stack

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
npm install next@latest react@latest react-dom@latest
npm install @anthropic-ai/sdk ai @vercel/ai-sdk
npm install @modelcontextprotocol/sdk zod
npm install @react-three/fiber @react-three/drei three
npm install zustand @tanstack/react-query
npm install @clerk/nextjs
npm install @elevenlabs/elevenlabs-js
```

### Development Dependencies

```bash
npm install -D typescript @types/react @types/node
npm install -D tailwindcss @tailwindcss/postcss
npm install -D eslint prettier
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

---

## Version Compatibility Matrix

| Package | Min Version | Pairs With |
|---------|-------------|------------|
| Next.js | 16.0 | React 19.x |
| React | 19.0 | R3F 9.x |
| @react-three/fiber | 9.0 | React 19.x, Three.js 0.160+ |
| Tailwind CSS | 4.0 | Safari 16.4+, Chrome 111+, Firefox 128+ |
| @modelcontextprotocol/sdk | 1.x | zod 3.25+ |

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

---

## Sources

### Official Documentation
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
