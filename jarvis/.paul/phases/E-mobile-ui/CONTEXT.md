# Phase E Context — Multi-Domain Operating System

## Discussion Date: 2026-02-25

## Vision

Phase E is the ground-up design and construction of a multi-domain life and business operating system. This is NOT a UI facelift of the current Jarvis page. The current chat + orb + dashboard represents less than 10% of the actual scope. Jarvis must become the single control plane for a full-time anesthesia provider managing 6+ ventures, a nonprofit, and personal life in stolen minutes between patients.

## Goals

1. **Map the entire house** — Research and document every domain, sub-domain, data source, capability, and connection across all projects before any design work
2. **Design for full scope now** — Navigation, information architecture, and UI must anticipate ALL domains even if some rooms are empty at launch. No deferring to v5/v6 — building blind creates crowding later
3. **Two-tier intelligence architecture** — Design space for sentinel model (always-on, lightweight, local) + Claude big brain (periodic strategy, evaluation). Sentinel lives outside the UI like a ghost but the architecture must anticipate its integration points
4. **Research → Plan → Document → Research → Execute** — Multiple layers of understanding before touching code. The quality of the build depends on the quality of the preparation
5. **Both desktop and mobile must be exquisite** — Not "desktop first, mobile tolerable." Both first-class.

## Domains Jarvis Must Manage

### Personal
- Calendar, tasks (Notion-backed), habits, bills (eventually automated payment), health/wellness
- Morning briefings, nudges, check-ins, accountability

### Business — Active/In Progress
| Domain | Codebase | Status | Key Need |
|--------|----------|--------|----------|
| Ethereal Flame | `C:\Users\jonch\Projects\ethereal-flame-studio` | Active YouTube + multi-platform | Social media automation, content scheduling, analytics |
| Reset Biology | `C:\Users\jonch\reset-biology-website` | Running site, needs re-envisioning | Restructure for profitability (breathwork, exercise, eye healing, journaling, hypnosis) |
| CritFailVlogs | No codebase (content project) | Scripts + channel exist | Same multi-platform structure as Ethereal Flame |
| Visopscreen | `C:\Users\jonch\Visopscreen` | Fairly built out | Investment management, possibly future marketing |
| Entity Building | No codebase | In progress | Credit building, tracking, structuring |
| Satori Living | `C:\Users\jonch\Satori-Living-website` | Nonprofit website exists | Credit building, filings, tax planning, compliance tracking |

### Infrastructure
- **Notion Personal Template** (Life OS Bundle) — purchased, complex, Jarvis born from trying to bridge into it
- **Notion Business Template** (Client Content OS) — purchased, for business operations
- Both connected via Jarvis MCP — need audit of which databases are active
- **Tutorial system** — interactive AI-guided learning across projects (laser pointer vision in `jarvis/.planning/INTERACTIVE-TUTORIAL-VISION.md`)

### Sentinel Model (Design Space)
- Lightweight self-hosted model for continuous monitoring
- Persistent: nudges, schedule tracking, habit reminders, "you said X by 3pm"
- Claude gives sentinel instructions periodically, evaluates its reports, evolves strategy
- Lives outside the main UI — architecture must anticipate hooks but don't build yet

## Approach — Sub-Phase Structure

### E-01: Grand Research (Domain Atlas)
- Deep dive every codebase listed above
- Audit both Notion templates through live connections
- Read tutorial vision docs
- Produce a **Domain Atlas**: every domain, sub-domain, data source, connection, capability
- Identify cross-domain interactions (e.g., Reset Biology content → Ethereal Flame social media)

### E-02: Information Architecture
- Complete room map from the Atlas
- Navigation model (how to move between 7+ domains without getting lost)
- Domain hierarchy and sub-context design
- Notification and briefing flow architecture
- Sentinel integration points
- Cross-domain data flows

### E-03: UI System Design
- Research multi-domain OS patterns (Linear workspaces, Notion sidebar, mobile OS app switching)
- Component system and design language
- Layout system (responsive shell)
- Desktop command center vs mobile quick-action — feature parity strategy
- The orb: archive, miniaturize, or repurpose as status indicator

### E-04+: Build Waves
- Settings page (gear icon, toggleable features, user_settings DB)
- Navigation shell
- Domain views
- Dashboard framework
- Tutorial integration
- (Specific waves defined after E-03 architecture is complete)

## Open Questions (Resolve During Research)

1. Which Notion databases does Jarvis currently have active MCP access to?
2. What capabilities do the Life OS and Client Content OS templates actually offer?
3. How deep does the Reset Biology sub-business hierarchy go?
4. Tutorial laser pointer / MCP-B vision — coexist with main UI how?
5. Bill payment automation — what level of browser automation is realistic on Vercel?
6. Social media management — scheduling? analytics? content creation? cross-platform?
7. CritFailVlogs — same infrastructure as Ethereal Flame or separate?
8. Sentinel model — what self-hosted models are viable? What hardware does user have?

## Constraints

- **Deployment:** GitHub push → auto-deploy. No local test environments.
- **Tech stack:** Next.js + TypeScript on Vercel
- **Single user:** No multi-tenant auth complexity
- **Time:** User has limited windows (lunch breaks, between patients) — UI must be fast and obvious
- **Design:** No Figma/design plugins — built with taste and iteration. Hand-crafted Tailwind, no UI libraries.

## User Directive (Verbatim)

> "I need you with your massive brain to conceptualize the entire structure and how it will be built. When you plan and frame that out then understand what kind of UI will work for that."

> "Why do I not believe we should put off the scope to a v5 or v6? Because the size will later create crowding and destroy the UI we built out."

> "If we know what has to go in to the entire structure our UI can anticipate these connections and grow into a finished product that is worthy of you."
