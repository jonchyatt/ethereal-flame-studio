---
phase: K-jarvis-academy
plan: 03
type: execute
wave: 1
depends_on: ["K-02"]
files_modified:
  - src/lib/jarvis/academy/projects.ts
  - src/lib/jarvis/academy/academyTools.ts
  - src/lib/jarvis/intelligence/systemPrompt.ts
autonomous: true
---

<objective>
## Goal
Add structured Creator Workflow curriculum (12 topics) and make the entire Academy multi-domain ready — any new project added to `ACADEMY_PROJECTS` automatically propagates to tool descriptions, system prompt, and curriculum browsing with zero manual wiring.

## Purpose
K-01 built the engine. K-02 filled Visopscreen with 16 teaching topics. But Creator Workflow still has `curriculum: []`, and every project reference is hard-coded ("Options: visopscreen, creator-workflow"). K-03 completes the content side AND removes the hard-coding so Jonathan can add Reset Biology, Satori Living, or any future project by adding one `ACADEMY_PROJECTS` entry — tools, system prompt, and curriculum all auto-discover it.

## Output
- 12 Creator Workflow curriculum topics in `projects.ts`
- Dynamic project options in all 6 academy tool descriptions (derived from registry)
- Dynamic project listing in system prompt ACADEMY section
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/K-jarvis-academy/K-02-SUMMARY.md
- CurriculumTopic interface established and proven with 16 Visopscreen topics
- academy_list_topics tool works for any project with curriculum data
- Topic hints in explore work automatically for any project with curriculum

## Source Files
@src/lib/jarvis/academy/projects.ts — Project registry with ProjectConfig + CurriculumTopic
@src/lib/jarvis/academy/academyTools.ts — 6 tool definitions with hard-coded project options
@src/lib/jarvis/intelligence/systemPrompt.ts — System prompt with hard-coded "Visopscreen, Creator Workflow"
@src/lib/jarvis/academy/toolExecutor.ts — Already dynamic (uses getProject/getAllProjects)
</context>

<acceptance_criteria>

## AC-1: Creator Workflow Has Comprehensive Curriculum
```gherkin
Given the creator-workflow project in ACADEMY_PROJECTS
When Jarvis calls academy_list_topics with project "creator-workflow"
Then it returns 12 topics across 4 categories with difficulty, prerequisites, keyFiles, and teaching notes
And each topic has 3-5 keyFiles with explanations
And prerequisite chains are logically ordered
```

## AC-2: Tool Descriptions Are Registry-Driven
```gherkin
Given a new project "reset-biology" added to ACADEMY_PROJECTS
When academyTools is imported
Then all 6 tool descriptions include "reset-biology" in the Options list
And no hard-coded project names remain in academyTools.ts
```

## AC-3: System Prompt Is Registry-Driven
```gherkin
Given ACADEMY_PROJECTS contains N projects
When the system prompt is built with academyConfigured=true
Then the ACADEMY section lists all N project names dynamically
And no hard-coded project names remain in the ACADEMY section
```

## AC-4: Build Passes
```gherkin
Given all changes are made
When npm run build executes
Then it exits 0 with no TypeScript errors
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Creator Workflow Curriculum + Dynamic Project Options</name>
  <files>src/lib/jarvis/academy/projects.ts, src/lib/jarvis/academy/academyTools.ts</files>
  <action>
    **Part A: Creator Workflow Curriculum (projects.ts)**

    Replace `curriculum: []` on the creator-workflow config with 12 CurriculumTopic entries.

    Categories and topics:

    **Getting Started (difficulty 1-2):**
    1. `dashboard-overview` — Batch Dashboard UI: per-pack status grid, one-click Sync/Recut/Publish, auto-refresh. keyFiles: `src/app/creator/dashboard/page.tsx`, `src/lib/creator/store.ts`, `src/lib/creator/sync.ts`
    2. `content-library` — Content Library: browsing packs, editing mood/BPM/topic/keyword tags, reviewing AI-suggested recuts. keyFiles: `src/app/creator/library/page.tsx`, `src/lib/creator/types.ts`, `src/lib/creator/recut.ts`
    3. `thumbnail-planner` — Thumbnail Planner: auto-picked candidate timestamps, manual scrubber, safe-zone overlays (YouTube/Shorts/Square), frame capture to PNG. keyFiles: `src/app/creator/thumbnail-planner/page.tsx`, `src/lib/creator/thumbnail.ts`

    **Render Pipeline (difficulty 2-4):**
    4. `render-pipeline-overview` — End-to-end render flow: audio pre-analysis → Puppeteer headless frame capture → FFmpeg encoding → optional VR metadata injection. keyFiles: `src/lib/render/renderVideo.ts`, `worker/pipelines/`, `scripts/render-cli.ts`
    5. `audio-analysis` — How audio drives the visual sync. Audio file parsing, BPM detection, beat mapping, reactive parameters. keyFiles: audio analysis files within src/lib/render/
    6. `frame-capture` — Puppeteer headless rendering: opening the Three.js flame scene, capturing frames at target FPS, compositing layers. keyFiles: PuppeteerRenderer files in src/lib/render/
    7. `ffmpeg-encoding` — FFmpeg pipeline: multi-format output (1080p/4K, landscape/portrait/square), quality settings, audio muxing. keyFiles: FFmpegEncoder, format config files

    **Publishing & Distribution (difficulty 2-3):**
    8. `recut-engine` — AI-powered recut: segment detection, AI suggestion via Claude, accept/reject/preview workflow, FFmpeg segment extraction. keyFiles: `src/lib/creator/recut.ts`, `src/lib/creator/ffmpegRecut.ts`
    9. `multi-platform-publish` — 7 platform targets with different aspect ratios, durations, and metadata. Publish connectors, channel presets, draft vs schedule modes. keyFiles: `src/lib/creator/publishConnectors.ts`, `src/lib/creator/metadata.ts`

    **Architecture (difficulty 3-5):**
    10. `presets-system` — Layered presets: bundle presets, export pack presets, channel metadata presets, safe zone presets. How they compose and override. keyFiles: `src/lib/creator/presets.ts`, `src/lib/creator/types.ts`
    11. `job-queue-worker` — Worker process architecture: job types (render/recut/sync/publish), queue management, pipeline routing, error handling. keyFiles: `src/lib/creator/jobs.ts`, `src/lib/creator/queue.ts`, `worker/pipelines/`, `scripts/start-worker.ts`
    12. `vr-rendering` — Full VR pipeline: CubemapCapture → EquirectangularConverter → StereoStacker → spatial metadata injection. Three.js VideoSkybox, luma/chroma key masking. keyFiles: VR-specific files in src/lib/render/

    Follow the exact CurriculumTopic interface pattern from the Visopscreen topics:
    - Each topic: id, name, category, difficulty (1-5), description (2-3 sentences), teachingNotes (paragraph with aha moments), keyFiles (3-5 with explanations), prerequisites (IDs of prior topics), conceptsIntroduced (string array)
    - Prerequisites should form logical learning paths within categories
    - Teaching notes should include the "aha moment" pattern established in K-02

    **Part B: Dynamic Project Options (academyTools.ts)**

    At the top of academyTools.ts, add:
    ```typescript
    import { getProjectIds } from './projects';
    const projectOptions = () => getProjectIds().join(', ');
    ```

    Replace every hard-coded `'Project to explore. Options: visopscreen, creator-workflow'` (and similar) with template strings using `projectOptions()`. There are 6 tool definitions — each has a `project` property with a hard-coded Options string. Replace all 6.

    Use a function call `projectOptions()` (not a const) so it evaluates at tool-definition access time, not module load time. This is defensive — if a future version adds runtime project registration, it still works.

    Also update `academyToolNames` — it's already a Set derived from the array, so it auto-updates.
  </action>
  <verify>
    1. `npm run build` passes with zero errors
    2. Grep for "visopscreen, creator-workflow" in academyTools.ts — should return 0 matches (all dynamic now)
    3. Count curriculum topics on creator-workflow — should be 12
  </verify>
  <done>AC-1 satisfied (12 topics), AC-2 satisfied (dynamic options), AC-4 satisfied (build passes)</done>
</task>

<task type="auto">
  <name>Task 2: Dynamic System Prompt Project Listing</name>
  <files>src/lib/jarvis/intelligence/systemPrompt.ts</files>
  <action>
    In systemPrompt.ts, find the hard-coded Academy section text:
    ```
    Available projects: Visopscreen, Creator Workflow.
    ```

    Replace it with a dynamic listing derived from the Academy registry. Import `getAllProjects` from the academy module and build the project list string:
    ```typescript
    import { getAllProjects } from '../academy';
    ```

    In the ACADEMY section builder (inside the `if (context.academyConfigured)` block), replace the hard-coded project names with:
    ```typescript
    const projectList = getAllProjects().map(p => p.name).join(', ');
    ```
    Then use `${projectList}` where "Visopscreen, Creator Workflow" was.

    **Avoid:** Changing any other part of the system prompt. The TEACHING CRAFT, READING CODE, and CODE SURGERY sections remain unchanged.
  </action>
  <verify>
    1. `npm run build` passes
    2. Grep for "Visopscreen, Creator Workflow" in systemPrompt.ts — should return 0 matches (dynamic now)
    3. Grep for "getAllProjects" in systemPrompt.ts — should return 1+ matches (import + usage)
  </verify>
  <done>AC-3 satisfied (dynamic system prompt), AC-4 satisfied (build passes)</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/lib/jarvis/academy/githubReader.ts` — GitHub API client is stable
- `src/lib/jarvis/academy/githubWriter.ts` — Git write client is stable
- `src/lib/jarvis/academy/toolExecutor.ts` — Already uses dynamic getProject/getAllProjects
- `src/lib/jarvis/intelligence/chatProcessor.ts` — Tool routing unchanged
- `src/lib/jarvis/intelligence/tools.ts` — Tool aggregation unchanged
- Visopscreen curriculum content (leave existing 16 topics untouched)
- Any non-Academy system prompt sections

## SCOPE LIMITS
- No new tools (no academy_register_project — overkill for static registry)
- No new npm dependencies
- No UI changes (Academy UI is K-04)
- No progress tracking or DB changes (K-04 scope)
- Creator Workflow keyFile paths are best-effort based on the project description (same approach as K-02 for Visopscreen — will validate when GitHub PAT is configured)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` exits 0
- [ ] Creator Workflow has 12 curriculum topics across 4 categories
- [ ] Zero hard-coded project lists remain in academyTools.ts
- [ ] Zero hard-coded project lists remain in systemPrompt.ts ACADEMY section
- [ ] Visopscreen 16 topics are unchanged
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All tasks completed
- All verification checks pass
- No errors or warnings introduced
- Adding a new project to ACADEMY_PROJECTS is the ONLY step needed for full Academy support
</success_criteria>

<output>
After completion, create `.paul/phases/K-jarvis-academy/K-03-SUMMARY.md`
</output>
