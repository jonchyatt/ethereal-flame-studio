# Feature Landscape

**Domain:** Voice-enabled AI personal assistant for executive function support
**Target User:** Creator who gets deeply absorbed in work and loses track of priorities
**Researched:** 2026-01-31
**Confidence:** MEDIUM (WebSearch-based, verified with multiple sources)

---

## Table Stakes

Features users expect. Missing = product feels incomplete or unusable.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Voice Input/Output** | Core interaction modality; users expect hands-free operation | High | Speech-to-text, text-to-speech APIs | Must support natural language, not rigid commands. 200ms latency target for natural conversation feel. |
| **Natural Language Understanding** | Users speak conversationally, not in commands | Medium | LLM integration | Must handle follow-up questions, pronouns, implicit references without repetition |
| **Context Retention** | Users expect assistant to remember what was just discussed | Medium | Conversation state management | Critical for multi-turn dialogues; "What about tomorrow?" must work |
| **Calendar Integration** | Basic scheduling is expected of any assistant | Low | Google/Outlook Calendar API | Read access minimum; write access for scheduling |
| **Task Management** | Adding/listing/completing tasks is foundational | Medium | Notion API for target user | Must sync bidirectionally with Notion |
| **Basic Reminders** | "Remind me at 5pm" is table stakes | Low | Notification system | Time-based and location-based |
| **Daily Briefing** | Morning summary of what's ahead | Medium | Calendar + task + weather APIs | Google's CC AI and Digest app have set user expectations here |
| **Wake Word or Activation** | Hands-free activation method | Medium | Always-on listening or push-to-talk | Privacy implications; consider both options |
| **Error Recovery** | Graceful handling when misunderstood | Low | None | "I didn't catch that" with retry, not failures |

---

## Differentiators

Features that set Jarvis apart. Not expected, but create competitive advantage.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Professional Butler Personality** | Distinct character vs generic assistant; creates emotional connection | Medium | Persona prompt engineering, consistent voice | NVIDIA PersonaPlex shows this is technically feasible. Calm, formal, discrete tone. |
| **Adaptive Pushiness** | Learns when user needs nudges vs space; solves "annoying assistant" problem | High | User behavior tracking, pattern recognition, ML | Key differentiator for ADHD users. Most assistants are either too passive or too aggressive. |
| **Deep Notion Integration** | Native understanding of user's entire knowledge system | High | Notion MCP/API (read/write) | Not just tasks - goals, projects, habits, content, clients. Leverages Notion 3.0's AI agent capabilities. |
| **Triage Sessions** | Interactive priority sorting when overwhelmed | High | Task analysis, decision support | Unique to exec function support. "What matters most right now?" |
| **Body Doubling Mode** | Virtual accountability presence for focus sessions | Medium | Timer system, gentle check-ins | Research shows 50% improvement from accountability check-ins. 95% goal completion with regular check-ins vs 25% without. |
| **Absorption Detection** | Recognizes when user is "in the zone" and adjusts behavior | High | Activity monitoring, heuristics | When working deeply: hold non-urgent items. When unfocused: gently redirect. |
| **Proactive Suggestions** | Anticipates needs before user asks | Medium | Pattern learning, calendar awareness | "You have a meeting in 30 minutes. Want me to remind you in 15?" |
| **Multi-Device Context Sync** | Conversation continues across phone/desktop/speaker | High | State synchronization, device detection | Work at desk, continue in kitchen seamlessly |
| **Habit Tracking Integration** | Connects daily habits to Notion system | Medium | Notion API, pattern visualization | "You've hit your morning routine 4 days in a row" |
| **Client Context Awareness** | Surfaces relevant info before client calls | Medium | Calendar + Notion clients database | "You have a call with Alex in 10 minutes. Last discussed: website redesign" |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **General-Purpose Assistant** | Trying to compete with Siri/Alexa/Google is unwinnable. 70-80% of AI projects fail by solving non-problems. | Stay focused on executive function support for creators. Do 5 things brilliantly, not 50 things poorly. |
| **Action-Taking Without Confirmation** | High risk of mistakes; Google's CC assistant explicitly cannot take actions for good reason | Always confirm destructive or external actions. "Should I send this email?" not just sending it. |
| **Excessive Notifications** | Defeats the purpose for users who are already overwhelmed | Batching, intelligent timing, "do not disturb" integration. Quality over quantity. |
| **Complex Voice Commands** | Users won't memorize syntax; this is the old Siri/Alexa failure mode | Natural conversation only. If you need documentation to use it, it's wrong. |
| **Screen-Heavy UI** | Target users get absorbed in screens; voice-first should mean voice-first | Minimal visual interface. Screen is for glanceability, not interaction. |
| **Gamification** | Can become noise; many ADHD users find badges/streaks stressful | Subtle positive reinforcement. "You've been consistent this week" not "Achievement Unlocked!" |
| **Social Features** | Comparing productivity with others adds pressure, not value | This is a personal tool. No leaderboards, no sharing, no social proof. |
| **Unrestricted API Access** | Security risk; prompt injection attacks can cause data loss | Scoped permissions, action confirmation, audit logging |
| **Feature Creep Before Core** | "Let's also add..." destroys focus. The restaurant booking assistant case study: year of work, nobody used it. | Nail the core loop (voice, Notion, exec function) before expanding |
| **Over-Reliance Enabling** | Research warns against replacing skill development | Balance tool assistance with user agency. Don't do thinking for them. |

---

## Feature Dependencies

```
Voice I/O ─────────────┬──────────────────────────────────────────────────────────┐
                       │                                                           │
                       v                                                           v
        Natural Language Understanding                                    Butler Personality
                       │                                                           │
                       v                                                           │
              Context Retention ────────────────────────────────────────┐          │
                       │                                                │          │
          ┌────────────┼────────────┬───────────────┐                   │          │
          v            v            v               v                   v          v
    Calendar      Task Mgmt     Reminders     Daily Briefing    Triage Sessions   ─┘
    Integration   (Notion)                                              │
          │            │                            │                   │
          │            v                            v                   v
          │    Deep Notion Integration ───> Client Context ───> Proactive Suggestions
          │            │
          v            v
    Multi-Device   Habit Tracking
    Context Sync       │
                       v
              Absorption Detection ───> Adaptive Pushiness
                                              │
                                              v
                                       Body Doubling Mode
```

**Critical Path:**
1. Voice I/O + NLU + Context Retention (foundation - nothing works without this)
2. Notion Integration + Basic Tasks (core value proposition)
3. Butler Personality (differentiation begins)
4. Daily Briefing + Triage Sessions (executive function value)
5. Adaptive Pushiness + Body Doubling (advanced differentiation)

---

## MVP Recommendation

For MVP, prioritize these features (in order):

### Must Ship (Table Stakes)
1. **Voice Input/Output** - The core modality
2. **Natural Language Understanding** - Conversational interaction
3. **Context Retention** - Multi-turn dialogue capability
4. **Basic Notion Task Integration** - Read/write tasks from Notion
5. **Daily Briefing** - Morning summary of day ahead

### Ship to Differentiate
6. **Butler Personality** - Professional, calm, discrete character
7. **Simple Triage** - "What's most important right now?" support

### Defer to Post-MVP
- **Adaptive Pushiness** - Requires learning from user patterns over time; needs data first
- **Body Doubling Mode** - Valuable but not core to initial value prop
- **Absorption Detection** - Complex; needs behavior heuristics developed
- **Deep Notion Integration** (beyond tasks) - Goals, habits, clients can come later
- **Multi-Device Sync** - Single device is fine for MVP
- **Proactive Suggestions** - Needs pattern learning infrastructure

---

## Complexity Estimates

| Complexity | Features |
|------------|----------|
| **Low** | Reminders, error recovery, calendar read-access |
| **Medium** | Context retention, basic Notion tasks, daily briefing, butler personality, habit tracking, body doubling, proactive suggestions |
| **High** | Voice I/O (full stack), deep Notion integration, adaptive pushiness, absorption detection, triage sessions, multi-device sync |

---

## Competitive Landscape Context

### Existing Players
- **Siri/Alexa/Google Assistant** - General purpose, broad but shallow. Jarvis should be narrow but deep.
- **Saner.AI** - ADHD-focused, combines notes/email/calendar. Claims "proactive planning."
- **Tiimo** - Visual planner for ADHD, won 2025 iPhone App of the Year. Focus on visual timelines, not voice.
- **Goblin Tools** - Task breakdown specialist. Good at micro-steps.
- **FocusMate/Deepwrk** - Body doubling platforms. Human-to-human, not AI.
- **Notion AI Agents** - Native to Notion 3.0. Can do multi-step actions within Notion.

### Jarvis's Unique Position
The combination of:
1. Voice-first (most ADHD tools are visual/text)
2. Butler personality (emotional connection, not utilitarian)
3. Deep Notion integration (leverages existing workflow)
4. Executive function focus (not general assistant)
5. Adaptive pushiness (learns optimal intervention timing)

No existing product combines all five. Each competitor has 1-2 of these.

---

## Sources

### Voice AI & Assistant Features
- [Morgen - 10 Best AI Assistants 2026](https://www.morgen.so/blog-posts/best-ai-planning-assistants)
- [Zendesk - 15 Best AI Voice Assistants 2026](https://www.zendesk.com/service/ai/ai-voice-assistants/)
- [ElevenLabs - Voice Agents 2026 Trends](https://elevenlabs.io/blog/voice-agents-and-conversational-ai-new-developer-trends-2025)
- [Kardome - 2026 Voice AI Trends](https://www.kardome.com/resources/blog/voice-ai-engineering-the-interface-of-2026/)
- [TechCrunch - OpenAI Audio Strategy](https://techcrunch.com/2026/01/01/openai-bets-big-on-audio-as-silicon-valley-declares-war-on-screens/)

### ADHD & Executive Function
- [ADDitude - ChatGPT for ADHD Executive Function](https://www.additudemag.com/chatgpt-ai-adhd-executive-function-support/)
- [Saner.AI - ADHD AI Assistant](https://www.saner.ai/)
- [Tiimo - Visual Planner for ADHD](https://www.tiimoapp.com/)
- [CHADD - Body Doubling for Productivity](https://chadd.org/adhd-news/adhd-news-adults/could-a-body-double-help-you-increase-your-productivity/)
- [ADDA - The ADHD Body Double](https://add.org/the-body-double/)
- [Morgen - ADHD Productivity Apps 2026](https://www.morgen.so/blog-posts/adhd-productivity-apps)

### Notion Integration
- [Notion 3.2 Release Notes](https://www.notion.com/releases/2026-01-20)
- [Notion MCP Documentation](https://developers.notion.com/docs/mcp)
- [OpenAI - Notion's Rebuild for Agentic AI](https://openai.com/index/notion/)

### Daily Briefing
- [The Outpost - Google CC AI Assistant](https://theoutpost.ai/news-story/google-tests-cc-an-ai-assistant-that-emails-you-a-personalized-daily-morning-briefing-22470/)
- [Digest App - AI Morning Assistant](https://apps.apple.com/us/app/digest-ai-morning-assistant/id6747050389)

### AI Personalization
- [IBM - AI Personalization](https://www.ibm.com/think/topics/ai-personalization)
- [Sapien - Tailoring LLM Responses](https://www.sapien.io/blog/tailoring-llm-responses-to-individual-user-preferences-and-needs)
- [NVIDIA PersonaPlex](https://research.nvidia.com/labs/adlr/personaplex/)

### Anti-Patterns & Mistakes
- [ISACA - Avoiding AI Pitfalls 2026](https://www.isaca.org/resources/news-and-trends/isaca-now-blog/2025/avoiding-ai-pitfalls-in-2026-lessons-learned-from-top-2025-incidents)
- [WildnetEdge - AI Agent Development Mistakes](https://www.wildnetedge.com/blogs/common-ai-agent-development-mistakes-and-how-to-avoid-them)
- [Towards Data Science - AI Integration Mistakes](https://towardsdatascience.com/critical-mistakes-companies-make-when-integrating-ai-ml-into-their-processes/)
