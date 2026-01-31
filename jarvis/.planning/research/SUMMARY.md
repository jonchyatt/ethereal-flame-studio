# Project Research Summary

**Project:** Jarvis - Voice-Enabled AI Personal Assistant
**Domain:** Voice AI assistant, executive function support, Notion integration
**Researched:** 2026-01-31
**Confidence:** MEDIUM-HIGH

## Executive Summary

Jarvis is a voice-first AI personal assistant designed for executive function support, targeting creators who get deeply absorbed in work and lose track of priorities. The product combines three well-established technologies in a novel way: voice I/O (STT/TTS), Claude API for reasoning, and deep Notion integration for personal knowledge management. The architecture follows the industry-standard chained pipeline (Speech-to-Text -> LLM -> Text-to-Speech) which provides modularity, debuggability, and predictable costs compared to experimental end-to-end speech models.

The recommended approach is to start with browser-based voice using Deepgram (not Web Speech API) for STT, ElevenLabs Flash v2.5 for TTS, Claude API with tool calling for reasoning, and Notion MCP for data access. The existing Ethereal Flame orb provides a ready-made visual avatar with audio-reactive capabilities. The critical success factors are: maintaining sub-300ms latency for conversational feel, designing graceful error recovery flows (voice has no visual context for self-correction), and building trust through transparent privacy indicators. The biggest risk is latency creep - if total voice-to-voice latency exceeds 300ms, users will perceive the assistant as broken regardless of feature quality.

The competitive advantage comes from combining voice-first interaction (most ADHD tools are visual/text), butler personality (emotional connection), deep Notion integration (leverages existing workflow), and adaptive pushiness (learns optimal intervention timing). No existing product combines all four elements. Start with table stakes (voice I/O, natural language, context retention, basic Notion tasks, daily briefing) plus one differentiator (butler personality) for MVP. Defer advanced features like adaptive pushiness and body doubling until patterns can be learned from user data.

## Key Findings

### Recommended Stack

The stack is anchored by Next.js 16 (Turbopack default, React 19 support) as the full-stack framework, already in use for Ethereal Flame Studio. For AI capabilities, use Anthropic SDK for Claude API access (superior instruction-following for assistant tasks, MCP helpers built-in) and Vercel AI SDK 6 for streaming UI and agentic workflows. The voice pipeline uses Deepgram Nova-3 for production STT (sub-300ms latency, cross-browser WebSocket support) and ElevenLabs Flash v2.5 for TTS (75ms latency, streaming support). Notion integration is handled through the official Notion MCP server at mcp.notion.com, which provides OAuth, full API access, and enterprise audit logging.

**Core technologies:**
- Next.js 16.1 + React 19.2: Full-stack framework with Turbopack, required for @react-three/fiber v9
- Anthropic SDK + Vercel AI SDK: Claude for reasoning, AI SDK for streaming UI, use together
- Deepgram Nova-3: Production STT with sub-300ms latency, WebSocket streaming, cross-browser
- ElevenLabs Flash v2.5: 75ms latency TTS, streaming support, natural voices
- Notion MCP Server: Official integration via mcp.notion.com, OAuth flow, optimized for AI agents
- @react-three/fiber 9.5: Orb avatar reusing Ethereal Flame patterns with audio reactivity
- Zustand 5 + TanStack Query 5: Client state + server state, dominant 2026 pattern

**Critical version requirements:**
- React 19.0+ required for @react-three/fiber v9
- Next.js 16.0+ for Turbopack and React 19 support
- @modelcontextprotocol/sdk 1.x (v2 expected Q1 2026)

**Key ADR:** Use Claude over OpenAI as primary LLM despite OpenAI having Realtime API for voice. Rationale: Claude's instruction-following is superior for assistant tasks, Anthropic SDK has MCP helpers, and Vercel AI SDK allows easy switching. OpenAI Realtime API can be added later as optional enhancement. Start with Web Speech API for MVP prototyping but switch to Deepgram before production - Web Speech API only works in Chrome/Edge and has no Firefox/Safari support.

### Expected Features

The feature landscape divides into three tiers: table stakes (expected by users, missing means incomplete product), differentiators (create competitive advantage), and anti-features (explicitly avoid).

**Must have (table stakes):**
- Voice Input/Output: Core interaction modality, hands-free operation, 200ms latency target
- Natural Language Understanding: Conversational speech not rigid commands, handle follow-ups/pronouns
- Context Retention: Remember what was just discussed for multi-turn dialogues
- Calendar Integration: Basic scheduling expected of any assistant, minimum read access
- Task Management: Adding/listing/completing tasks, must sync with Notion bidirectionally
- Basic Reminders: Time-based and location-based, table stakes feature
- Daily Briefing: Morning summary of calendar + tasks + weather (Google CC AI sets expectations)
- Wake Word or Activation: Either always-on listening or push-to-talk, privacy implications
- Error Recovery: Graceful handling when misunderstood, "I didn't catch that" with retry

**Should have (differentiators):**
- Professional Butler Personality: Calm, formal, discrete tone creates emotional connection (NVIDIA PersonaPlex shows feasibility)
- Adaptive Pushiness: Learns when user needs nudges vs space, key for ADHD users, solves "annoying assistant" problem
- Deep Notion Integration: Native understanding of entire PARA system - goals, projects, habits, clients, not just tasks
- Triage Sessions: Interactive priority sorting when overwhelmed, unique to exec function support
- Body Doubling Mode: Virtual accountability presence for focus sessions (research shows 50% improvement from check-ins)
- Absorption Detection: Recognizes when user is "in the zone" and adjusts behavior accordingly
- Proactive Suggestions: Anticipates needs, e.g., "You have a meeting in 30 minutes. Want me to remind you in 15?"

**Defer (v2+):**
- Multi-Device Context Sync: Conversation continues across phone/desktop/speaker (high complexity, not MVP)
- Habit Tracking Integration: Connects daily habits to Notion system (medium complexity, nice-to-have)
- Client Context Awareness: Surfaces relevant info before calls (medium complexity, builds on basic Notion integration)

**Anti-features (explicitly avoid):**
- General-Purpose Assistant: Competing with Siri/Alexa is unwinnable, stay focused on exec function support
- Action-Taking Without Confirmation: High risk of mistakes, always confirm destructive operations
- Excessive Notifications: Defeats purpose for overwhelmed users, use batching and intelligent timing
- Complex Voice Commands: Users won't memorize syntax, natural conversation only
- Gamification: Many ADHD users find badges/streaks stressful, use subtle positive reinforcement
- Social Features: This is personal tool, no leaderboards or sharing
- Feature Creep Before Core: Nail voice + Notion + exec function before expanding

**MVP Recommendation:**
Ship these in order: (1) Voice I/O, (2) Natural Language Understanding, (3) Context Retention, (4) Basic Notion Task Integration, (5) Daily Briefing, (6) Butler Personality, (7) Simple Triage. Defer adaptive pushiness, body doubling, absorption detection, deep Notion integration beyond tasks, multi-device sync, and proactive suggestions - these require learning from user patterns over time.

### Architecture Approach

Voice AI assistants follow a well-established chained pipeline architecture: Speech-to-Text -> Language Model -> Text-to-Speech. This modular approach is recommended over end-to-end speech-to-speech models because it's easier to debug, allows swapping individual components, and provides predictable costs. For Jarvis, the architecture integrates browser-based voice I/O (microphone capture, audio playback), real-time STT via Deepgram WebSocket, Claude API with tool calling, Notion MCP for data layer, and the Ethereal Flame orb for visual feedback, all hosted on Vercel with Next.js.

**Major components:**
1. Audio Capture (Browser): Microphone access via MediaStream API, audio chunk buffering, send to STT WebSocket
2. STT Client: Deepgram WebSocket for real-time transcription, return interim + final transcripts, trigger conversation turns
3. Orchestration Layer (React + Zustand): State machine for turn management, conversation context, coordinates all components
4. Chat API Route (Vercel Serverless): Claude reasoning with tool calling enabled, dispatch to Notion MCP, return responses
5. TTS Streaming: ElevenLabs streaming synthesis, chunk audio for immediate playback (~75ms first chunk)
6. Audio Playback (Browser): AudioContext for streaming output, AudioAnalyzer extracts amplitude/frequency data
7. Orb Animation (R3F): Visual feedback synchronized to audio via beat detection from existing AudioAnalyzer
8. Notion MCP Client (Server-side): Read/write Notion databases via official MCP server, OAuth authentication

**Critical patterns:**
- Streaming-First Audio Pipeline: Process audio as streams not files, start TTS playback before full response generated, reduces perceived latency
- WebSocket for STT, REST for LLM: Persistent WebSocket for continuous bidirectional STT, REST API routes for LLM (fits Vercel serverless 60s timeout)
- Tool Calling for Data Access: Define Notion operations as Claude tools, let Claude decide when to query/update, handles intent parsing naturally
- Audio-Visual Sync via Analyzer: Feed TTS audio through existing AudioAnalyzer to drive orb animation with amplitude/bass/beat detection
- Conversation Context Management: Maintain sliding window of history (last 10 turns), include system context about user preferences and current time

**Turn-taking state machine:** IDLE (listening for voice) -> LISTENING (capturing audio) -> PROCESSING (Claude thinking) -> SPEAKING (TTS playback) -> IDLE. User can interrupt during SPEAKING to jump back to LISTENING (barge-in).

### Critical Pitfalls

Research identified 14 domain pitfalls ranging from critical (cause rewrites/abandonment) to minor (fixable without refactoring). The top 5 by severity and phase impact:

1. **The 300ms Latency Cliff** — Voice assistants with response latency >300ms feel broken to users. 68% drop interactions when systems feel slow (J.D. Power). Latency compounds across pipeline: STT (100-500ms) + LLM (350ms-1s+) + TTS (75-200ms). Prevention: Set latency budgets upfront, use streaming responses (time-to-first-token matters more than total generation), choose low-latency models (flash TTS ~75ms), measure P95 not averages. Phase 1 critical - latency architecture cannot be retrofitted.

2. **Web Speech API Browser Lock-in** — Building on browser's SpeechRecognition API only to discover it only works in Chrome/Chromium. Firefox explicitly refuses to implement, Safari PWA breaks, making product unusable for 30-40% of users. Prevention: Use dedicated STT APIs (Deepgram, AssemblyAI) from day one, design for cloud STT with WebSocket streaming, test Firefox/Safari early. Phase 1 critical - STT architecture decision cannot be changed later.

3. **Notion API Rate Limit Cascade** — Hitting Notion's 3 requests/second average rate limit during normal operation, causing random failures. Daily briefings require multiple database/page/block fetches, burst operations exceed limits. Prevention: Implement request queue with exponential backoff, cache frequently accessed data, batch operations (max 100 items per request), pre-fetch daily briefing data before user wakes, respect Retry-After headers. Phase 2-3 critical - must be designed before building Notion features.

4. **Context Amnesia in Conversations** — Assistant forgets context mid-conversation (95% of AI tools operate statelessly). User says "Find hotels in London" then "What's the weather there?" and assistant doesn't know what "there" means. Voice can't scroll back like text. Prevention: Implement per-conversation context tracking, session storage for current conversation, vector database for long-term memory, summarize/compress old context rather than dropping. Phase 2 critical - memory architecture determines conversation quality.

5. **Microphone Permission UX Failure** — Asking for microphone permission on page load with no context leads to blocks and no recovery path. 14% lower grant rates vs contextual requests (Google Meet study). Modern browsers remember "Block" decisions permanently. Prevention: Never request on page load, show explanatory UI first, request only when user initiates voice interaction, provide recovery instructions, always offer text input alternative, require HTTPS. Phase 1 critical - permission flow is first interaction, sets tone.

**Additional pitfalls by phase:**
- Phase 2: Repeat-yourself death spiral (5% STT error creates correction cycles, users abandon after 2-3 failures), notification fatigue (71% uninstall apps for excessive notifications, 64% uninstall after 5+ per week)
- Phase 3: Wake word false activations (no mature browser APIs, trade-off between false accepts/rejects), avatar-audio lip sync lag (for orb use audio-reactive not lip sync)
- Phase 4: Body doubling dependency without fallback (80% improved completion but users feel shame if unavailable, frame as growth tool not crutch)

## Implications for Roadmap

Based on research, suggested phase structure follows clear dependency chains and risk mitigation:

### Phase 1: Audio Foundation (Voice I/O Infrastructure)
**Rationale:** Must prove voice capture/playback works before adding AI complexity. Latency architecture and browser compatibility decisions made here cannot be changed later without rewrite. Permission UX and privacy trust indicators are foundational.

**Delivers:** Microphone capture (MediaStream API), audio playback infrastructure, orb integration connecting existing AudioAnalyzer, basic UI shell with permission flow, latency monitoring instrumentation

**Addresses:** Voice I/O (table stakes), privacy indicators (Pitfall 14), microphone permission UX (Pitfall 4)

**Avoids:** Web Speech API browser lock-in (Pitfall 2), premature permission requests (Pitfall 4), privacy anxiety (Pitfall 14)

**Stack decisions:** Next.js 16 + React 19, @react-three/fiber 9 for orb, Web Audio API, establish latency budget of 300ms total pipeline

**Research flag:** Standard patterns, no additional research needed (well-documented Web Audio API)

### Phase 2: Voice Pipeline (STT + TTS Integration)
**Rationale:** Need reliable transcription and synthesis before LLM can process. This phase establishes the streaming-first architecture that prevents latency cliff. Turn-taking state machine is core conversational UX.

**Delivers:** Deepgram WebSocket integration for STT, ElevenLabs streaming TTS, turn-taking state machine (IDLE -> LISTENING -> PROCESSING -> SPEAKING), basic echo test (speak, transcribe, speak back), interruption handling (barge-in detection)

**Addresses:** Voice I/O completion (table stakes), error recovery flows (table stakes)

**Avoids:** 300ms latency cliff (Pitfall 1), blocking TTS generation (Anti-pattern 3)

**Stack decisions:** Deepgram Nova-3 for STT, ElevenLabs Flash v2.5 for TTS, WebSocket for STT + REST for LLM pattern

**Research flag:** Standard patterns with some implementation details to validate (WebSocket reconnection strategy, exact barge-in detection approach)

### Phase 3: Intelligence Layer (Claude + Context)
**Rationale:** Tool calling architecture must work before adding tool implementations. Conversation context management determines quality of multi-turn dialogues. Butler personality differentiates from generic assistants.

**Delivers:** Chat API route with Claude, tool definitions for Notion (not implementations yet), conversation context management (sliding window, system prompt with time awareness), butler personality prompting, simple Q&A without data access

**Addresses:** Natural Language Understanding (table stakes), Context Retention (table stakes), Butler Personality (differentiator)

**Avoids:** Context amnesia (Pitfall 6), stateless conversations (Anti-pattern 4)

**Stack decisions:** Anthropic SDK for Claude, Vercel AI SDK for streaming, Zustand for conversation state, system prompt engineering for Jarvis personality

**Research flag:** Prompt engineering for personality may need iteration, but no additional research needed for architecture

### Phase 4: Data Integration (Notion MCP)
**Rationale:** Basic Notion operations (tasks, inbox capture, daily briefing) provide core value proposition. Must implement rate limiting and caching before building advanced features.

**Delivers:** MCP client setup in API routes, OAuth flow, tool implementations (query tasks, create inbox item, update task status), morning briefing workflow (calendar + tasks + weather summary), inbox capture workflow ("Jarvis, remember...")

**Addresses:** Task Management (table stakes), Daily Briefing (table stakes), Deep Notion Integration (differentiator, basic level)

**Avoids:** Notion rate limit cascade (Pitfall 5), direct MCP from browser (Anti-pattern 5)

**Stack decisions:** @modelcontextprotocol/sdk, Notion MCP Server at mcp.notion.com, TanStack Query for caching, request queue with exponential backoff

**Research flag:** **NEEDS RESEARCH** - Notion MCP OAuth flow with Vercel serverless (stateless) needs validation, rate limiting strategy needs detailed design, cache invalidation strategy

### Phase 5: Triage & Scheduling
**Rationale:** Triage sessions provide executive function value beyond basic task management. Calendar integration enables proactive scheduling suggestions.

**Delivers:** Interactive triage session ("What's most important right now?"), priority sorting support, calendar read access, scheduling suggestions, task deadline awareness

**Addresses:** Triage Sessions (differentiator), Calendar Integration (table stakes), Proactive Suggestions (differentiator, basic level)

**Avoids:** Task definition ambiguity (Pitfall 13), action-taking without confirmation (Anti-feature)

**Stack decisions:** Google/Outlook Calendar API, task decomposition prompting

**Research flag:** Standard patterns, clarification flow design may need UX iteration

### Phase 6: Advanced Behaviors (Post-MVP)
**Rationale:** Adaptive pushiness and body doubling require learning from user patterns, only possible after data collected. These are advanced differentiators for later iterations.

**Delivers:** Body doubling mode with timed check-ins, user preference learning for pushiness levels, absorption detection heuristics, evening wrap workflow

**Addresses:** Body Doubling Mode (differentiator), Adaptive Pushiness (differentiator), Absorption Detection (differentiator)

**Avoids:** Body doubling dependency without fallback (Pitfall 10), notification fatigue (Pitfall 9), over-reliance enabling (Anti-feature)

**Stack decisions:** User behavior tracking, pattern recognition, potentially lightweight ML

**Research flag:** **NEEDS RESEARCH** - Absorption detection heuristics undefined, adaptive pushiness algorithm needs design, body doubling best practices from ADHD research

### Phase Ordering Rationale

1. **Audio before AI:** Must prove voice capture/playback works before adding complexity (architectural foundation)
2. **STT/TTS before Claude:** Need reliable transcription/synthesis before LLM can process (pipeline dependency)
3. **Claude before Notion:** Tool calling architecture must work before adding tool implementations (architectural dependency)
4. **Basic Notion before Advanced:** Morning briefing simpler than adaptive pushiness, need user data to personalize (data dependency)
5. **Table stakes before differentiators:** Voice I/O + NLU + Context before butler personality (MVP viability)
6. **Learned behaviors last:** Adaptive pushiness and absorption detection require user pattern data (temporal dependency)

This ordering avoids the critical pitfalls by addressing latency, browser compatibility, and privacy early (Phase 1-2), prevents context amnesia and rate limiting before they become blockers (Phase 3-4), and defers complex personalization until foundation is solid (Phase 6).

### Research Flags

**Phases likely needing deeper research during planning:**

- **Phase 4 (Notion MCP):** Notion MCP OAuth flow with stateless serverless functions needs validation - may require session storage strategy. Rate limiting and caching patterns need detailed design for 3 req/sec limit. Cache invalidation strategy for bidirectional sync.

- **Phase 6 (Advanced Behaviors):** Absorption detection heuristics are undefined - needs research into activity patterns and user signals. Adaptive pushiness algorithm design requires ADHD behavior research and personalization patterns.

**Phases with standard patterns (skip research-phase):**

- **Phase 1 (Audio Foundation):** Web Audio API is well-documented, MediaStream API has clear patterns, microphone permission flow has established best practices.

- **Phase 2 (Voice Pipeline):** Deepgram and ElevenLabs have official Next.js starters and documented streaming patterns, turn-taking state machines are common in voice agent literature.

- **Phase 3 (Intelligence Layer):** Claude tool calling is well-documented, conversation context management has established patterns (sliding window, system prompts).

- **Phase 5 (Triage & Scheduling):** Calendar APIs are well-documented, task clarification flows follow standard conversational design patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations backed by official documentation, current stable versions verified, existing Ethereal Flame experience with R3F/Next.js |
| Features | MEDIUM | WebSearch-based research verified across multiple sources, competitive landscape understood, but some ADHD-specific features (body doubling, adaptive pushiness) have limited formal research |
| Architecture | MEDIUM-HIGH | Industry patterns for voice agents well-established (chained pipeline, streaming-first), Deepgram/ElevenLabs have official Next.js starters, but some integration details need validation (MCP OAuth with serverless, exact barge-in detection) |
| Pitfalls | HIGH | Critical pitfalls verified across authoritative sources (AssemblyAI, Google Meet, Notion docs), quantitative data from multiple studies, consistent patterns across sources |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

Research identified several areas needing validation during implementation:

- **Notion MCP OAuth with Vercel Serverless:** MCP documentation doesn't explicitly cover stateless serverless environments. Need to validate OAuth flow works or requires session storage workaround. Test during Phase 4 planning with minimal MCP client setup.

- **Barge-in Detection Mechanics:** Exact implementation of interruption handling during TTS playback unclear. Research mentions Voice Activity Detection during playback but specific browser API integration needs validation. Prototype during Phase 2 with simple VAD library.

- **WebSocket Reconnection Strategy:** How to handle Deepgram WebSocket interruption on network drop needs detailed strategy. Test network interruption scenarios during Phase 2 planning.

- **Mobile Safari Microphone Behavior:** MediaStream API reliability on iOS Safari PWA needs testing - research indicates potential issues but not definitive. Test on iOS during Phase 1 to understand constraints.

- **Latency Budget Allocation:** 300ms total budget is clear, but exact allocation across STT (target X ms) + LLM (target Y ms) + TTS (target Z ms) needs measurement. Establish baselines in Phase 1-2 and optimize per component.

- **Absorption Detection Signals:** What signals indicate user is "in the zone" vs unfocused? Research mentions activity monitoring and heuristics but doesn't provide specifics. Requires Phase 6 research or user study to define.

- **Adaptive Pushiness Algorithm:** How to learn optimal intervention timing from user behavior patterns? Needs personalization strategy research in Phase 6 planning.

**Handling strategy:** Address architectural gaps (MCP OAuth, barge-in, WebSocket reconnection) during phase planning with prototypes. Address behavioral gaps (absorption detection, adaptive pushiness) with Phase 6 dedicated research or user studies. Track latency continuously from Phase 1 to stay within budget.

## Sources

### Primary (HIGH confidence)

**Official Documentation:**
- [Next.js 16.1 Release](https://nextjs.org/blog/next-16-1) - Framework choice and Turbopack
- [Anthropic TypeScript SDK](https://github.com/anthropics/anthropic-sdk-typescript) - Claude integration
- [Vercel AI SDK 6](https://vercel.com/blog/ai-sdk-6) - Streaming UI patterns
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp) - Official MCP integration
- [Notion API Request Limits](https://developers.notion.com/reference/request-limits) - Rate limiting (3 req/sec)
- [ElevenLabs JavaScript SDK](https://github.com/elevenlabs/elevenlabs-js) - TTS integration
- [Deepgram Next.js Starter](https://github.com/deepgram-starters/nextjs-live-transcription) - STT patterns
- [Claude Tool Use Documentation](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview) - Tool calling
- [MDN Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) - Browser API limitations
- [MDN WebRTC Microphone Permissions](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Build_a_phone_with_peerjs/Connect_peers/Get_microphone_permission) - Permission UX

**Quantitative Research:**
- [AssemblyAI: 300ms Latency Rule](https://www.assemblyai.com/blog/low-latency-voice-ai) - Latency impact data
- [AssemblyAI: 2026 Voice Agent Insights](https://www.assemblyai.com/blog/new-2026-insights-report-what-actually-makes-a-good-voice-agent) - Error recovery patterns
- [Google Meet Permissions Best Practices](https://web.dev/case-studies/google-meet-permissions-best-practices) - 14% grant rate improvement
- [Cresta: Engineering Real-Time Voice Latency](https://cresta.com/blog/engineering-for-real-time-voice-agent-latency) - Latency breakdown
- [Can I Use: Speech Recognition](https://caniuse.com/speech-recognition) - Browser support data

### Secondary (MEDIUM confidence)

**Feature Research:**
- [Morgen: 10 Best AI Assistants 2026](https://www.morgen.so/blog-posts/best-ai-planning-assistants) - Competitive landscape
- [ADDitude: ChatGPT for ADHD](https://www.additudemag.com/chatgpt-ai-adhd-executive-function-support/) - Executive function use cases
- [CHADD: Body Doubling Productivity](https://chadd.org/adhd-news/adhd-news-adults/could-a-body-double-help-you-increase-your-productivity/) - Body doubling efficacy
- [ADDA: The ADHD Body Double](https://add.org/the-body-double/) - Body doubling best practices
- [NVIDIA PersonaPlex](https://research.nvidia.com/labs/adlr/personaplex/) - AI personality feasibility
- [ElevenLabs: Voice Agents 2026 Trends](https://elevenlabs.io/blog/voice-agents-and-conversational-ai-new-developer-trends-2025) - Industry trends
- [FreJun: Conversational Context](https://frejun.ai/best-practices-for-conversational-context-with-voice/) - Context management patterns
- [Voiceflow: Memory Documentation](https://docs.voiceflow.com/docs/memory) - Memory architecture patterns

**Pitfall Research:**
- [Telnyx: Low Latency Voice AI](https://telnyx.com/resources/low-latency-voice-ai) - Latency impact
- [Thomas Frank: Notion API Rate Limits](https://thomasjfrank.com/how-to-handle-notion-api-request-limits/) - Rate limiting strategies
- [MagicBell: Notification Fatigue](https://www.magicbell.com/blog/help-your-users-avoid-notification-fatigue) - 71% uninstall data
- [Courier: Notification Fatigue Strategies](https://www.courier.com/blog/how-to-reduce-notification-fatigue-7-proven-product-strategies-for-saas) - Mitigation patterns
- [Picovoice: Wake Word Detection Guide](https://picovoice.ai/blog/complete-guide-to-wake-word/) - Wake word implementation

### Tertiary (LOW confidence, needs validation)

- Mobile Safari PWA microphone behavior - mentioned in community discussions but no definitive documentation
- Exact latency allocation across pipeline components - industry examples vary, needs benchmarking
- Notion MCP OAuth with stateless serverless - documented for stateful servers, serverless needs validation
- Absorption detection heuristics - conceptual descriptions but no implementation specifics
- Adaptive pushiness algorithms - personalization patterns exist but no ADHD-specific standards

---
*Research completed: 2026-01-31*
*Ready for roadmap: yes*
