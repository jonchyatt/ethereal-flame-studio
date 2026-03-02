---
phase: K-jarvis-academy
plan: 02
type: execute
wave: 1
depends_on: ["K-01"]
files_modified:
  - src/lib/jarvis/academy/projects.ts
  - src/lib/jarvis/academy/toolExecutor.ts
  - src/lib/jarvis/academy/academyTools.ts
autonomous: true
---

<objective>
## Goal

Add structured teaching curriculum to the Visopscreen project — topic manifest with file mappings, prerequisites, teaching notes, and difficulty levels — so Jarvis teaches systematically instead of randomly browsing files.

## Purpose

K-01 gave Jarvis eyes (read code, search, explore). But without a curriculum, Jarvis has no pedagogical structure — it's like giving a teacher a library but no lesson plan. K-02 adds the lesson plan: what topics exist, what order to teach them, which files matter for each topic, and what to emphasize. This transforms "I can read your code" into "Let me walk you through how the screener scoring works."

## Output

- `CurriculumTopic` type with file mappings, prerequisites, teaching notes, difficulty
- Visopscreen project expanded with ~12-15 structured topics across 5 categories
- `academy_list_topics` tool so user can ask "what can you teach me?"
- `academy_explore_project` enhanced to suggest relevant topics when browsing directories
- Topic context injected into `academy_read_files` responses so Jarvis knows WHY a file matters
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/K-jarvis-academy/K-01-SUMMARY.md
- K-01: 5 tools (explore, read, search, edit, commit), project registry, GitHub reader/writer
- ProjectConfig has: id, name, repo, basePath, description, techStack, architecture, workflows, complexAreas
- Projects: visopscreen, creator-workflow (both registered)

## Source Files
@src/lib/jarvis/academy/projects.ts — ProjectConfig interface, ACADEMY_PROJECTS registry, getProject/getAllProjects/getProjectIds
@src/lib/jarvis/academy/academyTools.ts — 5 tool definitions, academyToolNames Set
@src/lib/jarvis/academy/toolExecutor.ts — executeAcademyTool router, handleExploreProject, handleReadFiles, handleSearchCode, handleEditFile, handleCommitFiles
@src/lib/jarvis/academy/index.ts — barrel exports
</context>

<acceptance_criteria>

## AC-1: Curriculum Data Model
```gherkin
Given the Academy project registry
When a project has curriculum topics defined
Then each topic has: id, name, category, difficulty (1-5), description, teachingNotes (what to emphasize), keyFiles (file paths with explanations), prerequisites (topic IDs), and conceptsIntroduced (list of concepts this topic teaches)
And topics are grouped by category (e.g., "Data Sources", "Screeners", "Analysis", "Architecture", "Advanced")
```

## AC-2: Visopscreen Curriculum Content
```gherkin
Given the Visopscreen project config
When curriculum topics are loaded
Then at least 12 topics exist covering the core teachable areas:
  - Data connection flow (demo, Yahoo, TOS, Schwab, Archive)
  - Strategy builder fundamentals (legs, P&L graph, Greeks)
  - Shape-based scoring system (hump height/width, angle steepness)
  - PPD and time value mechanics
  - Individual screener types (Weekly Income, Option Insanity, Vega Hedge, etc.)
  - Analysis tools (Grid, Overlay, 3D, time slider)
  - LEAP cycles and projection
  - Regime detection and parameter gating
  - Dual architecture (browser + headless)
  - Global state management (the 5-place price problem)
And each topic maps to 2-5 specific files with explanations of what each file contributes
And prerequisite chains are correct (e.g., scoring requires builder fundamentals)
```

## AC-3: List Topics Tool
```gherkin
Given a user asks "what can you teach me about Visopscreen?"
When Jarvis calls academy_list_topics with project=visopscreen
Then it returns all topics grouped by category with difficulty indicators
And optionally filtered by category
And shows prerequisite chains so the user knows where to start
```

## AC-4: Enhanced Explore with Topic Hints
```gherkin
Given a user explores a Visopscreen directory (e.g., "screeners/")
When academy_explore_project returns the directory listing
Then it also includes a "Related topics" section showing which curriculum topics cover files in that directory
And each hint includes the topic name and difficulty
```

## AC-5: Build Passes
```gherkin
Given all K-02 changes are complete
When npm run build executes
Then zero errors and zero warnings
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Curriculum Data Model + Visopscreen Content</name>
  <files>src/lib/jarvis/academy/projects.ts</files>
  <action>
    **1. Define CurriculumTopic interface (projects.ts):**
    ```typescript
    export interface CurriculumTopic {
      id: string;                    // e.g., "strategy-builder"
      name: string;                  // e.g., "Strategy Builder Fundamentals"
      category: string;              // e.g., "Core Concepts"
      difficulty: 1 | 2 | 3 | 4 | 5; // 1=beginner, 5=expert
      description: string;           // What this topic covers
      teachingNotes: string;         // Pedagogy: what to emphasize, common misconceptions, suggested approach
      keyFiles: Array<{
        path: string;                // Relative to project root
        explanation: string;         // Why this file matters for this topic
      }>;
      prerequisites: string[];       // Topic IDs that should be understood first
      conceptsIntroduced: string[];  // Concepts this topic teaches (for cross-referencing)
    }
    ```

    **2. Add `curriculum` field to ProjectConfig:**
    Add optional `curriculum?: CurriculumTopic[]` to the ProjectConfig interface.

    **3. Build Visopscreen curriculum (12-15 topics across 5 categories):**

    Categories and topics (use Visopscreen's actual file structure from the project config):

    **Getting Started (difficulty 1-2):**
    - `data-sources`: How Visopscreen connects to market data — 5 sources, each completely different flow
    - `strategy-builder-basics`: Building option strategies — legs, strikes, expirations, P&L graph, Greeks display
    - `ui-navigation`: 5-tab structure, page flow, user interaction patterns

    **Core Concepts (difficulty 2-3):**
    - `pnl-curves`: P&L curve generation — how strikes, premiums, and ratios produce the curve shape
    - `ppd-time-value`: Price Per Day mechanics — time value decay, PPD inversions, why far-term can decay faster
    - `greeks-calculation`: Greek calculations and display — delta, gamma, theta, vega across strategy legs
    - `shape-scoring`: Shape-based P&L scoring system — hump height, hump width, angle steepness, bisection sharpness

    **Screeners (difficulty 3-4):**
    - `weekly-income-screener`: Weekly income strategies — covered calls, credit spreads, scoring for consistent premium
    - `option-insanity-screener`: Option Insanity strategies — PPD inversions as signal, counter-intuitive time value patterns
    - `vega-hedge-screener`: Vega hedge strategies — volatility plays, vega exposure management
    - `diagonal-butterfly-screener`: Diagonals and butterflies — complex multi-leg structures, risk profiles

    **Analysis & Research (difficulty 3-4):**
    - `analysis-tools`: Grid, Overlay, 3D visualization — time slider for P&L evolution, strike variations
    - `leap-cycles`: LEAP cycles — intrinsic/extrinsic breakdown, PPD comparison, multi-cycle projection
    - `regime-detection`: Market regime system — HMM classification, compression/trending/elevated/crisis, parameter gating

    **Architecture (difficulty 4-5):**
    - `dual-architecture`: Browser + Node.js — window.* globals vs headless engine, shims.js bridging
    - `global-state`: The 5-place price problem — where price is stored, why state-access.js exists, reconciliation challenges

    For each topic, provide:
    - 2-5 keyFiles with specific file paths from the Visopscreen codebase (use paths from the project config's architecture/workflows descriptions — e.g., `spread-analyzer.js`, `headless/engine.js`, `screeners/` directory files, `skills/` modules)
    - Teaching notes focused on what's non-obvious, common misconceptions, and the "aha moment"
    - Correct prerequisite chains (start topics have none, advanced topics chain back)
    - conceptsIntroduced for cross-referencing

    **4. Keep Creator Workflow curriculum empty for now** (K-03 scope):
    Set `curriculum: []` on creator-workflow project config.
  </action>
  <verify>npm run build — zero errors; CurriculumTopic interface exported; Visopscreen has 12+ topics with keyFiles, prerequisites, teachingNotes</verify>
  <done>AC-1 and AC-2 satisfied: data model defined, Visopscreen has comprehensive structured curriculum</done>
</task>

<task type="auto">
  <name>Task 2: List Topics Tool + Enhanced Explore</name>
  <files>
    src/lib/jarvis/academy/academyTools.ts,
    src/lib/jarvis/academy/toolExecutor.ts,
    src/lib/jarvis/academy/index.ts
  </files>
  <action>
    **1. Add academy_list_topics tool definition (academyTools.ts):**
    - Name: `academy_list_topics`
    - Description: "List available teaching topics for a project, grouped by category with difficulty and prerequisites. Call this when the user asks what you can teach them, or to suggest a learning path."
    - Parameters:
      - `project` (required): Project ID
      - `category` (optional): Filter to specific category
    - Add to academyTools array (before academy_edit_file — keep write tools at end)

    **2. Implement handleListTopics (toolExecutor.ts):**
    - Import CurriculumTopic from projects
    - If project has no curriculum or empty array: return "No structured curriculum available yet for {project}. You can still explore and read code — use academy_explore_project to start."
    - Group topics by category
    - Format each topic: `[★★☆☆☆] Topic Name — description`
      - Difficulty shown as filled/empty stars (★ for filled, ☆ for empty)
      - Show prerequisites inline: `(requires: Strategy Builder Basics)`
    - If category filter provided: only show that category
    - Add footer: "Ask me to teach you any topic, or start with the ★☆☆☆☆ topics if you're new."
    - Add to the switch statement in executeAcademyTool

    **3. Enhance handleExploreProject with topic hints (toolExecutor.ts):**
    - After the directory listing in handleExploreProject, check if the project has curriculum
    - If curriculum exists AND a specific path was requested (not root):
      - Find topics whose keyFiles paths overlap with the explored directory
      - A file overlaps if it starts with the explored path (e.g., exploring "screeners/" matches topic with keyFile "screeners/weekly-income.js")
      - If matches found, append a "Related Topics" section:
        ```
        ## Related Topics
        Files in this directory are covered by these teaching topics:
        - [★★★☆☆] Shape-Based Scoring System — how the screener evaluates P&L curves
        - [★★★★☆] Weekly Income Screener — scoring for consistent weekly premium collection
        ```
    - If no matches or no curriculum: don't add anything (backward compatible)

    **4. Update barrel exports (index.ts):**
    - Add CurriculumTopic to the exports from projects.ts

    **Avoid:**
    - Changing tool parameter schemas for existing tools (explore, read, search, edit, commit)
    - Modifying githubReader.ts or githubWriter.ts
    - Adding any new API calls or external dependencies
    - Changing system prompt (curriculum awareness comes through tool responses, not prompt injection)
  </action>
  <verify>npm run build — zero errors; academy_list_topics in academyToolNames Set; handleExploreProject shows related topics; handleListTopics formats topics with stars and prerequisites</verify>
  <done>AC-3 and AC-4 satisfied: list topics tool works with category filter, explore shows topic hints for directories</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- githubReader.ts (caching, API client — stable from K-01)
- githubWriter.ts (edit/commit — stable from K-01)
- System prompt ACADEMY section (K-01 established, still correct)
- chatProcessor.ts routing (academy tool routing works)
- Existing tool parameter schemas (explore, read, search, edit, commit)
- Any non-academy code (meals, bills, tasks, memory, self-improvement)

## SCOPE LIMITS
- Creator Workflow curriculum is K-03 scope — set empty array, do not populate
- Academy UI (AcademyHub, progress page) is K-04 scope — no UI changes
- DB-backed progress tracking is K-04 scope — no database changes
- Teaching effectiveness metrics are K-04 scope
- Visopscreen file paths in keyFiles are best-effort — they'll be verified when GitHub PAT is configured
- Do NOT add topics for strategies that haven't been built yet (only the 14 existing templates)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` — zero errors, zero warnings
- [ ] CurriculumTopic interface exported from projects.ts
- [ ] ProjectConfig has optional curriculum field
- [ ] Visopscreen has 12+ topics across 5 categories
- [ ] Each topic has: id, name, category, difficulty, description, teachingNotes, keyFiles (2-5), prerequisites, conceptsIntroduced
- [ ] Prerequisite chains are acyclic (no circular dependencies)
- [ ] Creator Workflow has `curriculum: []`
- [ ] academy_list_topics tool defined with project + optional category params
- [ ] academy_list_topics in academyToolNames Set
- [ ] handleListTopics formats with difficulty stars and prerequisite display
- [ ] handleExploreProject appends Related Topics when exploring subdirectories
- [ ] Existing tools (explore, read, search, edit, commit) unchanged
</verification>

<success_criteria>
- Both tasks completed
- All 5 acceptance criteria satisfied
- Build clean (zero errors, zero warnings)
- No regressions to K-01 functionality
- Visopscreen has a complete, structured teaching curriculum
</success_criteria>

<output>
After completion, create `.paul/phases/K-jarvis-academy/K-02-SUMMARY.md`
</output>
