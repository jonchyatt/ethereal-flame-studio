# Phase E Domain Atlas
## The Complete Map of Every Room in the House

**Generated:** 2026-02-25
**Purpose:** Foundation document for Jarvis multi-domain operating system architecture
**Method:** 5 parallel research agents explored all codebases + Notion + tutorials

---

## EXECUTIVE SUMMARY

Jonathan is a full-time anesthesia provider (12-hour shifts, 5 days/week) managing 7 domains across personal life, 4 businesses, a nonprofit, and creative projects — all in stolen minutes between patients. This atlas documents every domain, every data source, every capability, and every connection point that Jarvis must manage.

### The Domains at a Glance

| # | Domain | Tech Stack | Database | Status | Complexity |
|---|--------|-----------|----------|--------|------------|
| 1 | Personal Life | Notion (Life OS) | 38 Notion DBs | Active via Jarvis | High |
| 2 | Ethereal Flame | Next.js 15 + Three.js + BullMQ | Turso + R2 | Active, building YouTube | Very High |
| 3 | Reset Biology | Next.js 15 + Prisma + Auth0 + Stripe | MongoDB Atlas | Production site | Very High |
| 4 | CritFailVlogs | None (content project) | None | Scripts + channel exist | Low (reuses EF pipeline) |
| 5 | Visopscreen | Vanilla JS + Python HMM | LocalStorage + R2 | Fairly built out | High |
| 6 | Satori Living | Next.js 15 (static) | None | Marketing site only | Medium |
| 7 | Entity Building | None | None | Conceptual | Low |

### Total Data Surface

- **38 Notion databases** (personal life OS)
- **50+ MongoDB/Prisma models** (Reset Biology)
- **8 Turso/SQLite tables** (Jarvis memory + self-improvement)
- **In-memory + LocalStorage + R2** (Visopscreen)
- **Turso + R2 + Google Drive + Google Sheets** (Ethereal Flame pipeline)
- **15+ AI agents** (Reset Biology voice agents)
- **3-layer self-improvement** (Jarvis intelligence)
- **HMM regime detection** (Visopscreen)

---

## DOMAIN 1: PERSONAL LIFE (Notion Life OS)

### Data Source
38 Notion databases connected via Jarvis MCP, organized in 6 clusters:

**Cluster 1 — Daily Action (5 DBs)**
- Tasks (with recurring hook — auto-creates next instance)
- Projects
- Habits
- Areas
- Daily Habits

**Cluster 2 — Financial (6 DBs)**
- Budgets | Subscriptions (Bills) | Income | Expenditure | Financial Years | Invoice Items
- Bills have: Paid checkbox, Amount, Category, Due Date

**Cluster 3 — Knowledge (6 DBs)**
- Notes & References | Journal | CRM | Topics & Resources | Notebooks | Wish List

**Cluster 4 — Tracking (10 DBs)**
- Workout Sessions | Weights Log | Cardio Log | Classes & Sports | Fitness Records
- Weekly Meal Plan | Recipes | Ingredients
- Timesheets | Days

**Cluster 5 — Planning (6 DBs)**
- Goals | Years | Wheel of Life | Fear Setting | Dream Setting | Significant Events

**Cluster 6 — Business (4 DBs)**
- Content | Channels | Tweets | Client Portal

### Current Jarvis Capabilities
- CRUD on all databases via NotionClient.ts (query, create, update, retrieve, search)
- Circuit breaker + retry logic (3 attempts, 500ms initial delay)
- Recurring task completion hook (marks Done → auto-creates next)
- Executive functions: morning briefing, midday/evening check-ins, weekly review
- Nudges: contextual reminders for deadlines, habits, follow-ups

### UI Surface Needed
- Task dashboard (today, this week, by project)
- Habit tracker with streaks
- Bill tracker with due dates and payment status
- Calendar view
- Goal progress
- Briefing display
- Quick-add for tasks, notes, journal entries

---

## DOMAIN 2: ETHEREAL FLAME (Content Creation Platform)

### Codebase: `C:\Users\jonch\Projects\ethereal-flame-studio`
### Stack: Next.js 15 + React 19 + Three.js + R3F + BullMQ + Puppeteer + FFmpeg

### What It Is
A complete content creation and distribution platform — NOT just a YouTube channel. Includes:

**3D Visual Experience**
- Audio-reactive particle orb (ParticleLayer.tsx)
- Procedural Star Nest skybox with 20+ presets
- Video skybox with masking/keying
- VR support (gyroscope, stereoscopic rendering)
- Water plane, bloom post-processing, orbital camera

**Rendering Pipeline**
- Headless rendering via Puppeteer → FFmpeg encoding
- Output: 1080p, 4K, 360 VR mono, 360 VR stereoscopic
- Aspect ratios: 16:9, 9:16, 1:1
- Batch rendering via BullMQ + Redis
- Multiple render targets: Vercel, Docker, Modal, Render.com, Local Agent

**Audio Pipeline**
- Ingest from YouTube (yt-dlp), URL, or upload
- FFprobe analysis → normalization → peak generation
- Audio editing: trim, crossfade, filter chains
- Whisper transcription (Docker GPU service)

**Publishing Automation**
- Platforms: YouTube, YouTube Shorts, YouTube VR, TikTok, Instagram Reels, Instagram Feed
- Channel presets with per-platform metadata optimization
- n8n workflow automation (render → metadata → upload → log → notify)
- Google Sheets analytics logging
- Google Drive sync (rclone)
- Metadata generation: title variants, descriptions, hashtags, CTAs

**Creator Tools**
- Render pack management (multiple variants per audio)
- Content library with quality metrics
- Thumbnail auto-generation (planned)
- Recut suggestions (AI-driven)

### Data Sources
- Turso/SQLite: render jobs, audio prep jobs
- Cloudflare R2: rendered videos, audio assets
- Google Sheets: analytics logging
- Google Drive: file sync
- Notion: cross-project data (via Jarvis)

### Automation Potential for Jarvis
- Monitor rendering queue health
- Auto-generate metadata from Whisper transcripts
- Schedule multi-platform publishing
- Track YouTube analytics (views, retention, CTR)
- Suggest content optimizations
- Cross-promote with Reset Biology content

### UI Surface Needed
- Content pipeline status (queue, rendering, published)
- Publishing calendar
- Analytics dashboard (views, subscribers, engagement per platform)
- Render job management
- Template/preset browser

---

## DOMAIN 3: RESET BIOLOGY (Wellness Business)

### Codebase: `C:\Users\jonch\reset-biology-website`
### Stack: Next.js 15 + TypeScript + Prisma + MongoDB + Auth0 + Stripe + OpenAI
### URL: https://www.resetbiology.com

### What It Is
The most feature-rich domain. A production wellness platform with 6 active sub-programs:

**Sub-Program 1: Breathwork**
- 6+ exercises (Vagal Reset, 4-7-8, Box Breathing, etc.)
- Real-time animated orb visualization
- Session logging, daily tracking, gamification (25 pts/session)
- Custom exercise creation (admin)

**Sub-Program 2: Exercise & Workouts**
- 8-12 week structured protocols with phases
- Pre-workout readiness checks (sleep, HRV, soreness, mood)
- Exercise library with form cues, tempo control, RPE targets
- Session logging, progression logic, gamification (20 pts/session)

**Sub-Program 3: Vision Training (Eye Healing)**
- 12-week Vision Master program
- 6 phases, 5 exercise categories (downshift, mechanics, peripheral, speed, integration)
- Snellen testing, convergence drills, accommodation work
- Baseline → current measurements, reader glasses stage (0-5)

**Sub-Program 4: Nutrition**
- Food search (USDA FDC + Open Food Facts)
- Meal logging with macro tracking
- Meal plan templates (Muscle Building, Fat Loss, Keto, etc.)
- AI analysis (vision-based meal recognition, voice logging)

**Sub-Program 5: Peptide Management**
- 50+ peptide catalog with research data
- Protocol creation (dosage, frequency, timing, administration type)
- Dose logging with time-of-day precision
- Push notification reminders (timezone-aware)
- Inventory management, bundle protocols, education library

**Sub-Program 6: Journaling**
- Rich text editor, mood/weight tracking
- Date-based organization, trend analysis

**Cross-Cutting Systems**
- Gamification: points, streaks, success deposits, daily spinner, affiliate program
- 15+ AI voice agents (BioCoach, PeptideAgent, VisionTutor, etc.)
- Google Drive vault (per-user folders for backups)
- N-Back mental training (dual/triple modes)
- Admin suite (product management, protocol builder, inventory)
- E-commerce: Stripe checkout, inventory, bundles, waitlists, order fulfillment

### Data Model Size
50+ Prisma models including: User, Peptide, Product, Order, WorkoutProtocol, WorkoutAssignment, WorkoutSession, VisionProgramEnrollment, VisionSession, BreathExercise, BreathSession, FoodLog, MealPlan, JournalEntry, NBackSession, GamificationPoint, AffiliateTracking, and many more.

### Revenue Model
- Monthly subscription: $12.99/user
- Product sales: peptides (40-50% wholesale margins)
- Affiliate commissions
- Needs: tier expansion, retention optimization, bundle pricing

### Automation Potential for Jarvis
- Dose reminders with compliance tracking and escalation
- Workout auto-adjustment based on readiness scores
- Nutrition gap filling (macro deficit → meal suggestions)
- Vision training compliance alerts
- Peptide effectiveness analytics (correlate doses ↔ gains ↔ mood)
- Supply chain management (low-stock alerts, demand prediction)
- Cohort analysis, LTV optimization, churn prediction
- Cross-domain: peptide timing ↔ workout peaks, nutrition ↔ recovery

### UI Surface Needed
- Business health dashboard (revenue, subscribers, churn rate)
- Program compliance overview (which users are on track?)
- Inventory alerts
- Order fulfillment status
- Content/education management
- User engagement metrics

---

## DOMAIN 4: CRITFAILVLOGS (D&D Content Channel)

### Status: Scripts + channel exist, no codebase
### Concept: AI-generated hyper-realistic vlogs from first-person perspective of D&D monsters

### Architecture Decision
CritFailVlogs should **reuse the Ethereal Flame content pipeline**:
- Same rendering infrastructure (or adapted for non-3D content)
- Same multi-platform publishing system
- Same n8n automation workflows
- New channel presets for D&D content metadata
- Ethereal Flame's channel preset system already supports this

### UI Surface Needed
- Same as Ethereal Flame: pipeline status, publishing calendar, analytics
- Separate channel analytics view
- Content library for D&D-specific assets

---

## DOMAIN 5: VISOPSCREEN (Investment Platform)

### Codebase: `C:\Users\jonch\Visopscreen`
### Stack: Vanilla JS + Plotly.js + Python (Flask/HMM) + Vercel Serverless
### Purpose: Personal stock option investment management

### What It Is
A sophisticated options analysis platform with:

**Screening Engine**
- 12 strategy screeners: Vega Hedge (BWB), Ratio Diagonal, Dipper, Weekly-27, Option Insanity, Butterfly, Calendar, Jade Lizard, and more
- Black-Scholes Greeks engine (Delta through Veta)
- Multi-factor scoring system for ranking candidates
- Regime-gated screening (auto-suppress strategies inappropriate for current market)

**Regime Detection (HMM)**
- Hidden Markov Model classifying market into 5 archetypes: Compression, Trending, Elevated, Crisis, Uncertain
- Feature engineering: price, IV, volatility across 3 tiers (Schwab+VIX, Yahoo+VIX, Price-only)
- Confidence gating (entropy + top-2 margin thresholds)
- YAML-driven policy router (screener activation/suppression per regime)
- Walk-forward validation

**Data Sources**
- ThinkOrSwim: Real-time Excel RTD feed (primary)
- Schwab API: OAuth2, full Greeks, bid/ask
- Yahoo Finance: Free fallback (15-min delay)
- Chain archive: Historical snapshots for backtesting

**Analysis Tools**
- 2D sensitivity grid (strike x time)
- 3D Plotly surface visualization
- P&L curves at multiple time horizons
- IV slider (0.5x-3x sensitivity)
- Date slider (today → expiration simulation)
- Strategy builder with drag-drop legs

**Automation**
- Daily cron scan (2 PM ET weekdays) via Vercel
- Cloudflare R2 for model storage and scan results
- Email alerts (nodemailer, configured but not fully wired)

### UI: 5-tab layout
1. Find Trades (screener)
2. Build Strategy (manual leg builder)
3. Analysis (2D/3D visualization)
4. LEAP Cycles (multi-year tracking, WIP)
5. Research (market research, planned)

### Automation Potential for Jarvis
- Poll regime status hourly, alert on transitions
- Run daily screener, email top 10 winners
- Track open positions (manual import initially)
- Monitor P&L, alert on max loss breaches
- Suggest closing trades at 70% profit
- Generate strategy comparison reports
- Historical pattern recognition by regime

### UI Surface Needed
- Regime status badge (current archetype + confidence)
- Daily screener results summary
- Portfolio P&L overview
- Alert/notification log
- Quick link to full Visopscreen app

---

## DOMAIN 6: SATORI LIVING (Nonprofit)

### Codebase: `C:\Users\jonch\Satori-Living-website`
### Stack: Next.js 15 + TypeScript + Tailwind + Framer Motion (static, NO backend)
### URL: https://satoriliving.org

### What It Is
A beautifully designed static marketing site for a longevity medicine nonprofit. Currently has:
- Mission/values pages
- Two elite programs: PINNACLE ($100K certification) and CATALYST ($50K PhD mastery)
- Education hub: 4 courses + 3 coming soon (all locked, no LMS)
- Research & compliance framework pages
- Contact form (logs to console only — no backend processing)

### What It Lacks (Everything Backend)
- No database, no authentication, no payment processing
- No member portal, no course delivery (LMS)
- No donation handling (despite "100% to research" promise)
- No email service (contact form is client-side only)
- No compliance tracking system
- No admin dashboard

### Compliance Tracking Needs (Significant)
- IRS 990 filing deadlines
- State charitable registration
- ACCME accreditation for CME credits
- Donor acknowledgment letters (tax deductibility)
- Restricted fund tracking
- D&O insurance renewals
- GDPR/CCPA data protection
- Elite program service agreements

### Automation Potential for Jarvis
- Compliance calendar with filing deadline alerts
- Donation tracking with tax acknowledgment generation
- CME certificate issuance on course completion
- Email automation (contact responses, receipts)
- Research project monitoring
- Board-level reporting dashboards

### UI Surface Needed
- Compliance calendar (upcoming filings, deadlines)
- Donation tracker (if/when payments added)
- Program enrollment status
- Research funding allocation view

---

## DOMAIN 7: ENTITY BUILDING (Business Credit)

### Status: Conceptual, no codebase

### What It Needs
- Business entity status tracking (EIN, state registration, credit score)
- Credit building milestones and task lists
- Filing deadlines and compliance calendar
- Tax planning integration
- D&B, Experian business credit monitoring

### Shared Infrastructure
Overlaps with Satori Living's compliance needs — same pattern (deadlines, filings, renewals).

### UI Surface Needed
- Entity health dashboard (credit score, filing status)
- Milestone tracker
- Deadline calendar (shared with Satori compliance view)

---

## CROSS-DOMAIN CONNECTIONS

### Content Pipeline Sharing
```
Ethereal Flame pipeline ──→ CritFailVlogs (same infra, different presets)
                         ──→ Reset Biology (educational content distribution)
                         ──→ Satori Living (research communication)
```

### Financial Tracking Convergence
```
Notion Financial DBs (personal bills, budgets)
Reset Biology Stripe (business revenue, orders)
Satori Living (donations, when implemented)
Visopscreen (investment P&L)
Entity Building (credit, filings)
```
All feed into a unified financial picture.

### Compliance Calendar Convergence
```
Satori Living: IRS 990, state registration, ACCME, insurance
Entity Building: credit filings, state registrations, tax planning
Reset Biology: FDA awareness, FTC advertising, HIPAA if applicable
Personal: bill due dates, subscription renewals
```
One compliance/deadline system serves all domains.

### Health & Wellness Data Flow
```
Reset Biology workouts → Notion fitness tracking
Reset Biology nutrition → Notion meal plans
Reset Biology peptides → Notion health tracking
Reset Biology journaling → Notion journal
Breathwork ↔ Vision training (parasympathetic integration)
Peptide timing ↔ Workout scheduling (GH release windows)
```

### AI Agent Ecosystem
```
Jarvis (Claude) — master orchestrator, periodic genius
Reset Biology agents (OpenAI) — 15 specialized voice agents
Sentinel model (future) — always-on lightweight monitor
Visopscreen HMM — regime detection (statistical, not LLM)
```

### Notification Convergence
```
All domains → single notification system → user
Channels: push, email, Telegram, in-app, (future: SMS)
Priority: urgent (bill due, regime change) vs. routine (daily briefing)
```

---

## NOTION DATABASE MAP (Complete)

### Life OS Template (Personal — 33 DBs)

| Cluster | Database | Key Properties | Jarvis Use |
|---------|----------|---------------|------------|
| Daily Action | Tasks | Name, Status, Do Dates, Project, Priority, Frequency | Task management, recurring hook |
| Daily Action | Projects | Name, Status, Area, Timeline | Project tracking |
| Daily Action | Habits | Name, Frequency, Streak | Habit tracking |
| Daily Action | Areas | Name, Description | Life area organization |
| Daily Action | Daily Habits | Date, Habits completed | Daily check-in |
| Financial | Budgets | Name, Amount, Period | Budget tracking |
| Financial | Subscriptions | Name, Amount, Due Date, Paid, Category | Bill management |
| Financial | Income | Source, Amount, Date | Income tracking |
| Financial | Expenditure | Item, Amount, Category, Date | Expense tracking |
| Financial | Financial Years | Year, Summary | Annual overview |
| Financial | Invoice Items | Description, Amount, Status | Invoice management |
| Knowledge | Notes & References | Title, Content, Tags | Knowledge base |
| Knowledge | Journal | Date, Content, Mood | Journaling |
| Knowledge | CRM | Name, Company, Contact Info | Contact management |
| Knowledge | Topics & Resources | Topic, URL, Notes | Learning resources |
| Knowledge | Notebooks | Name, Content | Note collections |
| Knowledge | Wish List | Item, Priority, Price | Wish tracking |
| Tracking | Workout Sessions | Date, Exercises, Duration | Fitness logging |
| Tracking | Weights Log | Exercise, Weight, Reps | Strength tracking |
| Tracking | Cardio Log | Activity, Duration, Distance | Cardio tracking |
| Tracking | Classes & Sports | Activity, Date, Duration | Class tracking |
| Tracking | Fitness Records | Exercise, PR, Date | Personal records |
| Tracking | Weekly Meal Plan | Day, Meals | Meal planning |
| Tracking | Recipes | Name, Ingredients, Steps | Recipe collection |
| Tracking | Ingredients | Name, Category, Nutrition | Ingredient database |
| Tracking | Timesheets | Date, Hours, Project | Time tracking |
| Tracking | Days | Date, Summary, Rating | Daily log |
| Planning | Goals | Name, Timeline, Status, Area | Goal tracking |
| Planning | Years | Year, Theme, Goals | Annual planning |
| Planning | Wheel of Life | Area, Score (1-10) | Life balance |
| Planning | Fear Setting | Fear, Worst Case, Plan | Decision making |
| Planning | Dream Setting | Dream, Timeline, Steps | Vision planning |
| Planning | Significant Events | Event, Date, Impact | Life milestones |

### Client Content OS (Business — 4+ DBs)

| Database | Key Properties | Jarvis Use |
|----------|---------------|------------|
| Content | Title, Platform, Status, Publish Date | Content calendar |
| Channels | Name, Platform, URL, Metrics | Channel management |
| Tweets | Content, Scheduled, Published | Social media |
| Client Portal | Client, Project, Status | Client management |

---

## TUTORIAL SYSTEM (Existing Infrastructure)

### Current State
- 30+ lessons written in `lessonContent.ts` with full narration text
- TeachModeContent in NotionPanel with step progression
- Progress tracking via curriculumProgressStore
- 8 lesson clusters covering tasks, projects, habits, bills, goals, weekly review

### Vision (from INTERACTIVE-TUTORIAL-VISION.md)
**Layer 1:** TTS narration (wire ElevenLabs to step content) — quick win
**Layer 2:** Tutorial context injection into system prompt — quick win
**Layer 3:** MCP-B semantic UI map + laser pointer (red dot guidance) — foundation for any agent to navigate UI

### Implication for Phase E
The tutorial system must survive the UI redesign. New components need MCP-B registrations so the laser pointer can guide users through the new multi-domain interface. The lesson content may need expansion for new domains.

---

## SENTINEL MODEL (Design Space)

### Concept
Lightweight, always-on, self-hosted model for continuous monitoring. Lives outside the UI like a ghost.

### Responsibilities
- Real-time nudges ("you said you'd do X by 3pm")
- Schedule tracking and accountability
- Habit check-in prompts
- Bill payment reminders
- Dose reminders (Reset Biology)
- Regime change alerts (Visopscreen)
- Content pipeline monitoring (Ethereal Flame)

### Architecture
```
Sentinel (always-on, local, lightweight)
    │
    ├── Monitors: Notion tasks, Reset Bio protocols, Visopscreen regime,
    │            EF render queue, Satori compliance calendar
    │
    ├── Acts: push notifications, email, Telegram, in-app nudges
    │
    └── Reports to: Claude (periodic review, strategy updates)

Claude (periodic genius)
    │
    ├── Reviews: sentinel reports, user patterns, system health
    │
    ├── Evolves: sentinel instructions, notification rules, priorities
    │
    └── Self-improves: L1 evaluate → L2 reflect → L3 meta-evaluate
```

### UI Integration Points
- Status indicator (is sentinel running? last heartbeat?)
- Notification preferences per domain
- Sentinel instruction viewer (what rules is it following?)
- Override controls (snooze, pause domain monitoring)

---

## TECHNOLOGY LANDSCAPE SUMMARY

### Databases in Play

| System | Tech | Location | Access Pattern |
|--------|------|----------|---------------|
| Personal Life | Notion API | Cloud (Notion) | MCP Connector |
| Jarvis Memory | Turso/SQLite | Cloud (Turso) | Direct (drizzle-orm) |
| Reset Biology | MongoDB Atlas | Cloud (MongoDB) | Prisma ORM |
| Visopscreen | LocalStorage + R2 | Browser + Cloud | REST API |
| Satori Living | None | N/A | Needs backend |
| Ethereal Flame | Turso + R2 | Cloud | Direct + S3 |
| Entity Building | None | N/A | Needs backend |

### Auth Systems

| System | Auth | Pattern |
|--------|------|---------|
| Jarvis | None (single user) | Direct access |
| Reset Biology | Auth0 | OAuth2 + session cookies |
| Satori Living | None | No auth yet |
| Visopscreen | None | No auth (personal tool) |
| Ethereal Flame | None | No auth (personal tool) |

### API Patterns

| System | Pattern | Endpoints |
|--------|---------|-----------|
| Jarvis | Next.js API routes (SSE) | ~10 routes |
| Reset Biology | Next.js API routes | 20+ routes |
| Ethereal Flame | Next.js API routes | 60+ routes |
| Visopscreen | Vercel serverless | ~10 routes |
| Satori Living | None | No API |

---

## OPEN QUESTIONS RESOLVED

| Question | Answer |
|----------|--------|
| Which Notion DBs are active? | All 38 — mapped in notionUrls.ts with IDs |
| Life OS vs Client Content OS? | Life OS = 33 personal DBs, Client Content OS = 4+ business DBs |
| Reset Biology sub-business depth? | 6 sub-programs, each with own data model, all in one MongoDB |
| Tutorial vision? | 3-layer: TTS → context injection → MCP-B laser pointer |
| CritFailVlogs infrastructure? | Reuses Ethereal Flame pipeline with new presets |
| Current Jarvis UI model? | Orb + ChatPanel (slide-up) + NotionPanel (side overlay) + Dashboard |

## OPEN QUESTIONS REMAINING

| Question | Needs |
|----------|-------|
| Bill payment automation — realistic on Vercel? | Research: browser automation in serverless |
| Sentinel model — what hardware? | User input: what local machine is available? |
| Social media management — scope? | Ethereal Flame pipeline covers publishing; analytics monitoring TBD |
| Desktop vs mobile feature parity? | Architecture decision in E-02 |
| The orb — what becomes of it? | Architecture decision in E-02 |

---

## IMPLICATIONS FOR UI ARCHITECTURE

### Navigation Model Must Handle
- 7+ top-level domains
- Sub-programs within domains (Reset Biology alone has 6)
- Cross-domain actions (peptide timing ↔ workout scheduling)
- Quick-switch between contexts (patient waiting → check Visopscreen → back to tasks)
- Deep links (jump directly to a specific bill, a specific trade, a specific protocol)

### Dashboard Must Surface
- Cross-domain priorities (what's most urgent across ALL domains?)
- Domain health indicators (red/yellow/green per domain)
- Quick actions (mark task done, log dose, check regime)
- Briefing data (morning summary across all domains)

### Notification System Must Unify
- All domains feed into one notification pipeline
- Priority levels (urgent → important → routine)
- Channel preferences per domain (email for bills, push for doses, Telegram for trades)
- Snooze/dismiss per notification, per domain

### Mobile Must Be First-Class
- User often works from phone between patients
- Quick actions must be one-tap (log dose, mark task, check regime)
- Dashboard must be scannable in 10 seconds
- Voice input critical (hands may not be free)

### The Settings Page (Still Needed, But Not First)
- Feature toggles (self-improvement, MCP, memory, voice)
- Per-domain notification preferences
- Sentinel model controls (when built)
- Theme/display preferences

---

*This atlas is the foundation for E-02 (Information Architecture). Every room is now mapped.*
*Next step: Design how the rooms connect — navigation, hierarchy, data flows.*
