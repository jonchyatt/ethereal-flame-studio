# Feature Landscape: Persistent Memory System

**Domain:** Voice AI assistant memory and conversation continuity
**Target User:** Creator who gets deeply absorbed in work; needs external system to remember context
**Researched:** 2026-02-02
**Confidence:** MEDIUM-HIGH (WebSearch + multiple authoritative sources)

---

## Table Stakes

Features users expect from any AI assistant with memory. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies | Notes |
|---------|--------------|------------|--------------|-------|
| **Session Logging** | Users expect conversations to be reviewable; basic accountability | Low | Database/file storage | Store raw conversation history with timestamps. Essential for debugging and continuity. |
| **Basic Fact Retention** | "Remember I prefer morning meetings" should persist | Medium | Structured storage, retrieval system | Claude's native memory stores preferences, projects, context. Users expect this now. |
| **Explicit Memory Commands** | "Remember this" / "Forget that" must work | Low | Fact storage + deletion API | Users need control. Both ChatGPT and Claude support explicit memory instructions. |
| **Memory Transparency** | Users must see what the assistant remembers | Low | UI for memory display | Claude shows memory summary in settings. Users expect to view/edit. Trust requires transparency. |
| **Cross-Session Continuity** | "What were we working on yesterday?" must have an answer | Medium | Session retrieval + summarization | Users expect context to persist. Resetting every session feels broken in 2026. |
| **Privacy Controls** | Ability to delete memories, use incognito mode | Low | Delete API, session mode toggle | GDPR right to erasure. Claude has incognito mode. Non-negotiable. |
| **Preference Learning** | Assistant adapts to communication style over time | Medium | Pattern extraction, preference storage | Should notice: brevity vs detail, formal vs casual, morning vs evening check-ins |
| **Error Acknowledgment** | When memory is wrong, correction must work | Low | Update/delete APIs | "Actually, I changed jobs" must update the fact, not create conflict |

---

## Differentiators

Features that set Jarvis apart. Not expected, but create competitive advantage for executive function support.

| Feature | Value Proposition | Complexity | Dependencies | Notes |
|---------|-------------------|------------|--------------|-------|
| **Behavioral Pattern Recognition** | "You tend to skip lunch on Mondays" - notices user patterns | High | Pattern detection, temporal analysis | Key for ADHD support. Most assistants remember facts; Jarvis notices patterns. |
| **Contextual Correction Learning** | When user corrects, Jarvis learns not just the fact but the preference type | Medium | Correction logging, preference inference | "No, I meant Tuesday" teaches about scheduling preferences, not just this meeting |
| **Proactive Memory Surfacing** | "Last time you worked on X, you mentioned needing Y" without being asked | Medium | Relevance scoring, context matching | Surfaces relevant history at the right moment. Notion context + memory = powerful |
| **Life Area Memory** | Remembers neglect patterns, success patterns per life area | Medium | Life area integration (existing), temporal tracking | "You haven't touched Health in 2 weeks - similar to last month before the gym streak broke" |
| **Session Goal Tracking** | Remembers what user intended to accomplish in each session | Medium | Goal extraction, completion tracking | "You said you wanted to finish the proposal - did that happen?" |
| **Emotional Context Memory** | Notes when user seems stressed, overwhelmed, energized | High | Sentiment analysis, context tagging | Enables: "Last time you sounded this overwhelmed, a 15-min break helped" |
| **Decision History** | Remembers past decisions and their outcomes | Medium | Decision extraction, outcome linking | "You chose X over Y last quarter - how did that work out?" |
| **Intelligent Forgetting** | Actively forgets outdated/irrelevant info to prevent bloat | Medium | Decay functions, relevance scoring | Memory decay prevents "remember everything" becoming noise. Inspired by Ebbinghaus curve. |
| **Correction Confidence Tracking** | Knows which memories have been corrected vs original | Low | Correction metadata | Memories corrected multiple times might need re-verification |
| **Multi-Modal Memory Integration** | Facts from voice, dashboard interactions, and Notion changes unified | High | Event sourcing, cross-system sync | Jarvis remembers what you said AND what you did in Notion |

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in AI memory systems.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Total Recall ("Remember Everything")** | Memory bloat degrades performance. Research shows "add-all" strategies cause sustained performance decline. | Implement intelligent forgetting. Decay unaccessed memories. Prioritize by relevance and recency. |
| **Autonomous Fact Extraction Without Transparency** | Users feel surveilled when AI "learns" things they didn't explicitly share | Show what was remembered. "I noticed you prefer X - should I remember this?" |
| **Cross-Session Emotional Profiling** | "You seemed sad on Tuesday" feels invasive and could be wrong | Keep emotional context within-session only. Don't build a mood history. |
| **Behavioral Prediction Without Consent** | "I know you'll procrastinate so I'm reminding you early" feels manipulative | Offer patterns as observations: "I've noticed X pattern - would you like me to adjust?" |
| **Unencrypted Memory Storage** | Plain text personal data is a security risk. Recent incidents with LocalFirst tools exposed this. | Encrypt at rest. Use filesystem permissions as minimum. Consider user-controlled keys. |
| **Permanent Memory (No Decay)** | Outdated facts pollute context. "You work at Company X" wrong after job change. | Time-based relevance decay. Require confirmation for old memories used in reasoning. |
| **Memory Scope Creep** | Trying to remember everything about everything leads to context pollution | Scope memory to executive function support. Work patterns, preferences, goals - not life story. |
| **Automatic Sharing/Sync** | Memory leaking to other services or devices without consent | Memory stays local/controlled. No cloud sync without explicit opt-in. |
| **Inference Without Facts** | "You must be tired because you're being short" - dangerous assumptions | Only store observed facts and explicit user statements. No psychological inference. |
| **Hidden Memory Influence** | Using memories without indicating source | When memory informs response, indicate it: "Based on what you told me last week..." |

---

## Feature Dependencies

```
Existing v1 Features
        |
        v
+------------------+
| Session Logging  | <-- Foundation: Must log before anything else
+------------------+
        |
        v
+------------------+     +----------------------+
| Basic Fact       |---->| Memory Transparency  |
| Retention        |     | (View/Edit UI)       |
+------------------+     +----------------------+
        |
        |---> Explicit Memory Commands ("Remember X")
        |
        v
+------------------+
| Cross-Session    |
| Continuity       |
+------------------+
        |
        +---> Preference Learning
        |           |
        v           v
+------------------+     +----------------------+
| Intelligent      |     | Behavioral Pattern   |
| Forgetting       |     | Recognition          |
| (decay)          |     +----------------------+
+------------------+              |
                                  v
                    +----------------------+
                    | Proactive Memory     |
                    | Surfacing            |
                    +----------------------+
                              |
                              v
              +----------------------------------+
              | Life Area Memory + Decision     |
              | History + Session Goals         |
              +----------------------------------+
```

**Critical Path for v2 Memory:**
1. Session Logging (must have storage before memory)
2. Basic Fact Retention + Memory Transparency (table stakes)
3. Cross-Session Continuity (key user expectation)
4. Preference Learning + Intelligent Forgetting (quality of memory)
5. Pattern Recognition (differentiator)

---

## MVP Recommendation for v2 Memory

### Must Ship (Table Stakes)

| # | Feature | Rationale |
|---|---------|-----------|
| 1 | **Session Logging** | Foundation. Cannot have memory without storage. |
| 2 | **Basic Fact Retention** | Core expectation. "Remember I have a standup at 9am" |
| 3 | **Memory Transparency** | Trust. User must see what Jarvis remembers. |
| 4 | **Explicit Commands** | Control. "Remember this" and "Forget that" |
| 5 | **Cross-Session Continuity** | "What were we discussing yesterday?" |
| 6 | **Privacy Controls** | Delete all, incognito mode |

### Ship to Differentiate

| # | Feature | Rationale |
|---|---------|-----------|
| 7 | **Preference Learning** | Jarvis adapts to user patterns |
| 8 | **Intelligent Forgetting** | Prevents memory bloat, keeps context relevant |
| 9 | **Proactive Memory Surfacing** | "Last time we discussed X..." at the right moment |

### Defer to v3

| Feature | Why Defer |
|---------|-----------|
| **Behavioral Pattern Recognition** | Needs data collection over time. Build logging now, patterns later. |
| **Emotional Context Memory** | High risk of being wrong/invasive. Get basic memory right first. |
| **Multi-Modal Memory Integration** | Complex. Voice memory alone is v2 scope. |
| **Decision History** | Valuable but requires extraction logic. |

---

## Complexity Estimates

| Complexity | Features |
|------------|----------|
| **Low** | Session logging, explicit commands, privacy controls, memory transparency UI, error acknowledgment, correction confidence tracking |
| **Medium** | Basic fact retention (with retrieval), cross-session continuity, preference learning, intelligent forgetting, session goal tracking, life area memory, decision history, proactive memory surfacing, contextual correction learning |
| **High** | Behavioral pattern recognition, emotional context memory, multi-modal memory integration |

---

## Memory Architecture Considerations

### Storage Options

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Local Files (JSON/Markdown)** | Simple, user-controlled, inspectable | No search, no structure | Good for v2 MVP |
| **SQLite** | Structured, queryable, still local | More complex, but manageable | Good for v2 if queries needed |
| **Vector DB (Pinecone, Weaviate)** | Semantic search, scales | External dependency, cost | Overkill for single user |
| **Notion as Memory Store** | Leverages existing system | Slow, API limits, not ideal for memory | Avoid for memory storage |

**Recommendation:** Start with local files (JSON) for facts, SQLite for session logs. Keep it simple and user-inspectable. Add semantic search only if retrieval becomes a bottleneck.

### Memory Types to Implement

| Type | Description | Storage | Decay |
|------|-------------|---------|-------|
| **Facts** | Explicit user statements: "I work at X" | JSON file | Yearly review |
| **Preferences** | Inferred patterns: "prefers brevity" | JSON file | Never (until contradicted) |
| **Session Logs** | Full conversation history | SQLite | Archive after 30 days, summarize |
| **Session Summaries** | Compressed session context | SQLite | Keep indefinitely |
| **Working Memory** | Current conversation buffer | In-memory | Session end |

### Retrieval Strategy

1. **Working Memory**: Current conversation (full context)
2. **Recent Sessions**: Last 3 sessions summarized
3. **Relevant Facts**: Semantic match to current topic
4. **Preferences**: Always included in system prompt

---

## Integration with Existing v1 Features

| v1 Feature | Memory Enhancement |
|------------|-------------------|
| **Morning Briefing** | "Yesterday you mentioned wanting to focus on X" |
| **Evening Check-In** | "You captured 3 items this morning - did you process them?" |
| **Weekly Review** | "Your pattern this week: strong on Projects, light on Health" |
| **Life Areas** | "Finance neglect similar to pre-crisis pattern last quarter" |
| **Time Nudges** | "You asked me to be more persistent about meeting prep" |
| **Notion CRUD** | Remember task patterns, project preferences |

---

## Guardrails for Memory System

| Guardrail | Implementation |
|-----------|----------------|
| **No PII in prompts without consent** | Redact sensitive data before LLM processing |
| **User can delete any memory** | API endpoint + UI for deletion |
| **Memory source attribution** | "Based on what you said on [date]..." |
| **Correction takes precedence** | User corrections overwrite inferred facts |
| **Staleness warning** | Flag memories older than 6 months before use |
| **Scope limitation** | Only remember work/productivity context, not personal life unless explicit |

---

## Success Metrics

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Continuity Feel** | User doesn't repeat context | Qualitative: "Jarvis remembers" |
| **Memory Accuracy** | <5% corrections needed | Track correction rate |
| **Memory Relevance** | Surfaced memories are useful | User feedback on surfaced memories |
| **No Bloat** | <1000 active facts | Count active memories |
| **Privacy Confidence** | User comfortable with memory | Qualitative: user uses feature |

---

## Sources

### Memory Architecture & Patterns
- [Mem0 - The Memory Layer for AI Apps](https://mem0.ai/)
- [Redis - Build Smarter AI Agents with Memory](https://redis.io/blog/build-smarter-ai-agents-manage-short-term-and-long-term-memory-with-redis/)
- [Medium - Memory for AI Agents: Designing Persistent, Adaptive Memory Systems](https://medium.com/@20011002nimeth/memory-for-ai-agents-designing-persistent-adaptive-memory-systems-0fb3d25adab2)
- [OpenAI Cookbook - Session Memory Management](https://cookbook.openai.com/examples/agents_sdk/session_memory)
- [Towards Data Science - AI Agent with Multi-Session Memory](https://towardsdatascience.com/ai-agent-with-multi-session-memory/)

### Claude Memory Features
- [Anthropic - Bringing Memory to Teams](https://www.anthropic.com/news/memory)
- [Anthropic - Claude 4 Announcement](https://www.anthropic.com/news/claude-4)
- [MacRumors - Anthropic Automatic Memory](https://www.macrumors.com/2025/10/23/anthropic-automatic-memory-claude/)
- [Claude API Docs - Memory Tool](https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool)

### Memory Decay & Forgetting
- [Medium - The Agent's Memory Dilemma: Is Forgetting a Bug or a Feature?](https://tao-hpu.medium.com/the-agents-memory-dilemma-is-forgetting-a-bug-or-a-feature-a7e8421793d4)
- [GitHub - Memoripy: AI Memory with Decay](https://github.com/caspianmoon/memoripy)
- [arXiv - From Human Memory to AI Memory Survey](https://arxiv.org/html/2504.15965v2)

### Feedback Loops & Learning
- [IrisAgent - The Power of Feedback Loops in AI](https://irisagent.com/blog/the-power-of-feedback-loops-in-ai-learning-from-mistakes/)
- [Zendesk - How AI Uses Feedback Loops](https://www.zendesk.com/blog/ai-feedback-loop/)
- [Glean - Overcoming Challenges in AI Feedback Loop Integration](https://www.glean.com/perspectives/overcoming-challenges-in-ai-feedback-loop-integration)

### Self-Healing & Error Recovery
- [GoCodeo - Error Recovery and Fallback Strategies in AI Agent Development](https://www.gocodeo.com/post/error-recovery-and-fallback-strategies-in-ai-agent-development)
- [AIthority - Self-Healing AI Systems](https://aithority.com/machine-learning/self-healing-ai-systems-how-autonomous-ai-agents-detect-prevent-and-fix-operational-failures/)
- [arXiv - PALADIN: Self-Correcting Language Model Agents](https://arxiv.org/html/2509.25238v1)

### Privacy & Guardrails
- [IAPP - Engineering GDPR Compliance in Agentic AI](https://iapp.org/news/a/engineering-gdpr-compliance-in-the-age-of-agentic-ai)
- [IBM - Exploring Privacy Issues in AI](https://www.ibm.com/think/insights/ai-privacy)
- [UX Planet - Guardrails for AI Agents](https://uxplanet.org/guardrails-for-ai-agents-24349b93caeb)
- [DataCamp - What Are AI Guardrails](https://www.datacamp.com/blog/what-are-ai-guardrails)

### Voice AI Continuity
- [Telnyx - How AI Voice Assistants Use Memory and Personalization](https://telnyx.com/resources/ai-assistant-personalization)
- [Kardome - 2026 Voice AI Trends](https://www.kardome.com/resources/blog/voice-ai-engineering-the-interface-of-2026/)
- [Voiceflow - Conversational AI 2026](https://www.voiceflow.com/blog/conversational-ai)
