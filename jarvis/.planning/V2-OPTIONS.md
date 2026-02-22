# Jarvis v2 Upgrade Options

*Generated: 2026-02-01*
*Status: Under consideration — not yet scoped*

## 🚀 Deployment & Production

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Production deployment** | Deploy Jarvis to `jarvis.whatareyouappreciatingnow.com` | Medium |
| **Domain/DNS setup** | Configure subdomain routing on Vercel | Low |
| **Environment configuration** | Production API keys, Notion OAuth for production | Medium |
| **Simplified setup** | Guided onboarding, reduce API key friction | Medium |

---

## 🔧 Bug Fixes & Technical Debt

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Fix inbox capture** | Captured items during check-ins actually sent to Notion inbox | Low |
| **Fix tomorrow preview** | Evening check-in shows real tomorrow data, not placeholders | Low |
| **Improve error recovery** | Graceful handling when Notion/APIs fail mid-conversation | Medium |
| **Latency optimization** | Hit the sub-300ms target consistently (currently variable) | Medium |

---

## 🎤 Voice & Activation

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Wake word detection** | "Hey Jarvis" activation instead of push-to-talk | High |
| **Barge-in support** | Interrupt Jarvis while speaking to correct/redirect | Medium |
| **Voice activity detection** | Auto-detect when user stops speaking (no manual release) | Medium |
| **Multiple voice options** | Choose Jarvis voice personality/tone | Low |

---

## 🧠 Proactive Intelligence

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Adaptive pushiness** | Learn when you need nudges vs space, adjust intervention frequency | High |
| **Absorption detection** | Recognize when you're "in the zone" and hold non-urgent interruptions | High |
| **Proactive suggestions** | "You have a meeting in 30 min, want a reminder at 15?" | Medium |
| **Pattern learning** | Notice your habits (always late to standup, forget lunch) and adapt | High |
| **Smart notification batching** | Group low-priority nudges instead of interrupting repeatedly | Medium |

---

## 🎯 Focus & Accountability

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Body doubling mode** | Timed check-ins during focus sessions ("Still on track?") | Medium |
| **Triage sessions** | Interactive priority sorting when overwhelmed ("What matters most?") | Medium |
| **Session goals** | "I'm working on X for the next 2 hours" with progress checks | Medium |
| **Pomodoro integration** | Built-in work/break cycles with Jarvis managing transitions | Low |
| **End-of-session summaries** | "You completed X, moved Y, still have Z" | Low |

---

## 📊 Deeper Notion Integration

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Project-level tracking** | Understand projects, not just tasks (status, blockers, progress) | Medium |
| **Goal-to-task linking** | Connect quarterly goals → projects → tasks in briefings | Medium |
| **Client context prep** | Surface relevant notes/history before scheduled client calls | Medium |
| **Cross-database queries** | "What's blocking my Q1 goals?" spanning multiple databases | High |
| **Habit streaks in briefings** | "You've meditated 12 days straight" encouragement | Low |
| **Bill payment reminders** | Smarter bill tracking with payment confirmation | Low |

---

## 📱 Experience & Polish

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Conversation history** | Review past conversations with Jarvis | Low |
| **Customizable briefing time** | Set when morning briefing triggers | Low |
| **Quiet hours** | No interruptions during defined periods | Low |
| **Mobile PWA improvements** | Better iOS/Android install experience | Medium |
| **Keyboard shortcuts** | Quick activation, mute, skip for desktop use | Low |

---

## 🔮 Advanced (Higher Risk)

| Upgrade | Description | Complexity |
|---------|-------------|------------|
| **Multi-device sync** | Conversation continues across phone/desktop | High |
| **Calendar write access** | Actually schedule things Jarvis suggests | Medium |
| **Email integration** | Surface important emails in briefings | High |
| **Location awareness** | Different behavior at home vs office vs commute | High |
| **Automated task creation** | Jarvis creates tasks from conversation without explicit ask | Medium |

---

## Summary by Theme

| Theme | Count | Key Upgrades |
|-------|-------|--------------|
| Deployment | 4 | Production deploy, domain setup, onboarding |
| Bug fixes | 4 | Inbox capture, tomorrow preview |
| Voice/Activation | 4 | Wake word, barge-in |
| Proactive Intelligence | 5 | Adaptive pushiness, absorption detection |
| Focus/Accountability | 5 | Body doubling, triage sessions |
| Deeper Notion | 6 | Project tracking, goal linking |
| Experience/Polish | 5 | Quiet hours, PWA |
| Advanced | 5 | Multi-device, calendar write |

**Total: 38 possible upgrades**

---

*Next step: Scope which upgrades make the cut for v2 milestone*
