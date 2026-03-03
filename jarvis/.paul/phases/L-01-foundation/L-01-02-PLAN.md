---
phase: L-01-foundation
plan: 02
type: execute
wave: 1
depends_on: ["L-01-01"]
files_modified:
  - src/lib/jarvis/tutorial/tutorialTools.ts
  - src/lib/jarvis/tutorial/toolExecutor.ts
  - src/lib/jarvis/intelligence/chatProcessor.ts
  - src/components/jarvis/layout/ChatOverlay.tsx
  - src/components/jarvis/layout/DomainRail.tsx
  - src/components/jarvis/layout/BottomTabBar.tsx
  - src/components/jarvis/home/PriorityStack.tsx
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/lib/jarvis/academy/toolExecutor.ts
  - src/components/jarvis/onboarding/OnboardingWizard.tsx
autonomous: true
---

<objective>
## Goal
Build the Academy-Spotlight bridge so Claude can visually guide users through Jarvis by highlighting UI elements during same-origin teaching sessions, enhance the teaching prompt with spotlight capabilities, and differentiate startTour() from finishOnboarding() so the guided tour actually starts.

## Purpose
L-01-01 created the curriculum DATA (8 topics with spotlightTargets and verificationSteps) but no RUNTIME — Claude can't highlight elements, the system prompt doesn't tell Claude about spotlight capabilities, and startTour() is identical to finishOnboarding(). This plan connects all the wires so that when Claude teaches about Jarvis, it can point at real UI elements while explaining them conversationally.

## Output
- Two new brain tools: `spotlight_element` and `clear_spotlight`
- Client-side SSE bridge that applies spotlights when Claude calls these tools
- `data-tutorial-id` attributes on all DOM elements referenced by curriculum spotlightTargets
- System prompt section telling Claude how to use same-origin teaching capabilities
- `academy_list_topics` enriched with spotlightTargets for same-origin projects
- startTour() opens chat with guided-tour message (differentiated from Skip)
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/L-01-foundation/L-01-01-SUMMARY.md
  - L-01-01 created: redirect, 8-topic Jarvis curriculum, OnboardingWizard → Academy handoff
  - spotlightTargets defined on topics but data-tutorial-id attributes NOT yet on DOM
  - startTour() currently equals finishOnboarding() — needs differentiation
  - basePath is 'src' (not 'jarvis/src/components/jarvis')

## Concept Doc
@.paul/concepts/guided-onboarding-v44.md (Sections 3, 7.2, 7.4)

## Source Files — Tutorial System (E-05)
@src/lib/jarvis/stores/tutorialStore.ts
  - SpotlightTarget interface: { elementId: string; type: 'pulse' | 'ring' }
  - setSpotlight(target) and clearSpotlight() methods
  - Persisted via Zustand with localStorage

@src/components/jarvis/onboarding/SpotlightOverlay.tsx
  - Reads spotlight from tutorialStore
  - Finds DOM element via `document.querySelector([data-tutorial-id="${elementId}"])`
  - Renders pulse animation or ring border
  - Auto-clears on click (line 59-69)
  - Already mounted in JarvisShell.tsx (line 85)

@src/lib/jarvis/curriculum/verificationEngine.ts
  - evaluateVerification(spec, ctx): route/store/action checks
  - Store verifiers registry keyed by check string
  - Available for future automated verification (not used in this plan)

## Source Files — Academy System (K)
@src/lib/jarvis/academy/projects.ts
  - CurriculumTopic has spotlightTargets?: string[] and verificationSteps? (added in L-01-01)
  - Jarvis project with 8 topics, each with spotlightTargets array

@src/lib/jarvis/academy/toolExecutor.ts
  - handleListTopics() at line 174: builds text output but does NOT include spotlightTargets

## Source Files — Chat Pipeline
@src/app/api/jarvis/chat/route.ts
  - SSE stream sends tool_use events to client (lines 88-91):
    `{ type: 'tool_use', tool_name: name, tool_input: input }`
  - Client receives these BEFORE tool execution completes

@src/components/jarvis/layout/ChatOverlay.tsx
  - SSE handler at lines 160-178: switches on event.type
  - tool_use events set activeTool for display (line 162-163)
  - THIS IS WHERE the spotlight bridge hooks in

## Source Files — Tool Registration
@src/lib/jarvis/tutorial/tutorialTools.ts
  - 9 existing tutorial tools (start_tutorial, teach_topic, start_lesson, etc.)
  - TutorialToolResult interface

@src/lib/jarvis/intelligence/chatProcessor.ts
  - tutorialToolNames set at line 56: routes to executeTutorialTool
  - createToolExecutor at line 129: 5-way routing

@src/lib/jarvis/intelligence/systemPrompt.ts
  - ACADEMY section at lines 388-469 (when academyConfigured)
  - buildStudentProgressSection() at line 105

## Source Files — DOM Elements (existing data-tutorial-id)
@src/components/jarvis/layout/DomainRail.tsx — NO data-tutorial-id (needs domain-rail, domain-rail-{id})
@src/components/jarvis/layout/BottomTabBar.tsx — individual tabs have bottom-tab-{id}, container has NONE (needs bottom-tabs)
@src/components/jarvis/home/PriorityStack.tsx — NO data-tutorial-id (needs home-priority-stack)

## Source Files — OnboardingWizard
@src/components/jarvis/onboarding/OnboardingWizard.tsx
  - startTour() at line 216: just calls finishOnboarding()
  - finishOnboarding() at line 184: sets academy active project, domains, schedule, navigates to /jarvis/app
  - chatStore.openWithMessage(text) exists and is the established pattern for programmatic chat

@src/lib/jarvis/stores/chatStore.ts
  - openWithMessage(message: string) at line 81: sets queuedMessage + opens chat panel
  - ChatOverlay auto-sends queued messages on panel open
</context>

<acceptance_criteria>

## AC-1: Spotlight Bridge End-to-End
```gherkin
Given Claude is teaching a Jarvis Academy topic in chat
When Claude calls the spotlight_element tool with elementId and style parameters
Then the SpotlightOverlay component highlights that DOM element with the specified animation
And the highlight auto-clears when the user clicks the spotlighted element
And Claude can call clear_spotlight to programmatically remove the highlight
```

## AC-2: Same-Origin Teaching Intelligence
```gherkin
Given the Academy is configured and Jarvis curriculum exists
When Claude's system prompt is built for a chat session
Then the prompt includes a SAME-ORIGIN TEACHING section describing spotlight capabilities
And academy_list_topics output includes spotlightTargets for same-origin projects
And Claude knows the teaching flow: spotlight → explain → user acts → continue
```

## AC-3: Guided Tour Initiation
```gherkin
Given a new user completes the OnboardingWizard (step 6)
When the user clicks "Start the Guided Tour"
Then the wizard finishes onboarding AND opens chat with a guided-tour seed message
And this triggers Claude to begin the welcome-tour teaching session with spotlights
And clicking "Skip tour" still works (finishOnboarding only, no chat opened)
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Spotlight tools, client-side bridge, and DOM attribute wiring</name>
  <files>
    src/lib/jarvis/tutorial/tutorialTools.ts,
    src/lib/jarvis/tutorial/toolExecutor.ts,
    src/lib/jarvis/intelligence/chatProcessor.ts,
    src/components/jarvis/layout/ChatOverlay.tsx,
    src/components/jarvis/layout/DomainRail.tsx,
    src/components/jarvis/layout/BottomTabBar.tsx,
    src/components/jarvis/home/PriorityStack.tsx
  </files>
  <action>
    **A. Add spotlight tools to tutorialTools.ts (append to the existing array):**

    ```typescript
    {
      name: 'spotlight_element',
      description: 'Highlight a UI element for the student during same-origin teaching. Use when guiding the user to find or interact with a specific part of the Jarvis interface. The element must have a data-tutorial-id attribute matching the elementId.',
      input_schema: {
        type: 'object',
        properties: {
          element_id: {
            type: 'string',
            description: 'The data-tutorial-id of the DOM element to highlight (e.g., "home-domain-card-personal", "bottom-tab-chat")'
          },
          style: {
            type: 'string',
            enum: ['pulse', 'ring'],
            description: 'Animation style — "pulse" for action targets (click me), "ring" for informational highlights (look at this)'
          }
        },
        required: ['element_id', 'style']
      }
    },
    {
      name: 'clear_spotlight',
      description: 'Remove the current spotlight highlight. Use after the student has found or interacted with the highlighted element, or when transitioning to a new teaching point.',
      input_schema: {
        type: 'object',
        properties: {}
      }
    }
    ```

    **B. Handle new tools in tutorial/toolExecutor.ts:**

    Read the existing toolExecutor.ts to understand its pattern, then add cases for:
    - `spotlight_element`: Validate that element_id is a non-empty string and style is 'pulse' or 'ring'. Return: `Spotlight set on "${element_id}" (${style}). The UI will highlight this element for the student.`
    - `clear_spotlight`: Return: `Spotlight cleared.`

    These tools are intentionally trivial server-side — the real work happens client-side via the SSE bridge (next step).

    **C. Register tool names in chatProcessor.ts:**

    Add `'spotlight_element'` and `'clear_spotlight'` to the `tutorialToolNames` Set (around line 56). This routes them to `executeTutorialTool` in the 5-way executor.

    **D. Client-side SSE bridge in ChatOverlay.tsx:**

    In the SSE event handler (around line 160-178), add spotlight interception INSIDE the existing `if (event.type === 'tool_use')` block:

    ```typescript
    if (event.type === 'tool_use') {
      // Spotlight bridge: apply spotlight side-effects from SSE stream
      if (event.tool_name === 'spotlight_element' && event.tool_input) {
        const { useTutorialStore } = await import('@/lib/jarvis/stores/tutorialStore');
        useTutorialStore.getState().setSpotlight({
          elementId: event.tool_input.element_id,
          type: event.tool_input.style || 'pulse',
        });
      } else if (event.tool_name === 'clear_spotlight') {
        const { useTutorialStore } = await import('@/lib/jarvis/stores/tutorialStore');
        useTutorialStore.getState().clearSpotlight();
      }
      setActiveTool(event.tool_name);
    }
    ```

    IMPORTANT: Use dynamic import `await import(...)` to avoid adding tutorialStore as a static dependency of ChatOverlay. If the existing code already imports it or if dynamic import causes issues in the sync SSE loop, use a static import at the top instead — check what pattern the file already uses.

    Actually, since this is inside a synchronous for-loop parsing SSE lines, dynamic import won't work cleanly. Instead:
    - Add a static import at the top: `import { useTutorialStore } from '@/lib/jarvis/stores/tutorialStore';`
    - Then call directly: `useTutorialStore.getState().setSpotlight(...)` and `useTutorialStore.getState().clearSpotlight()`

    **E. Add missing data-tutorial-id attributes on DOM elements:**

    1. **DomainRail.tsx** — Add to BOTH mobile and desktop nav containers:
       - Mobile nav (line 32): add `data-tutorial-id="domain-rail"`
       - Desktop nav (line 60): add `data-tutorial-id="domain-rail"`
       - Each domain button (both mobile line 39 and desktop line 68): add `data-tutorial-id={`domain-rail-${domain.id}`}`

    2. **BottomTabBar.tsx** — Add to the nav container (line 56): `data-tutorial-id="bottom-tabs"`

    3. **PriorityStack.tsx** — Read the file first to find the outermost container div, then add `data-tutorial-id="home-priority-stack"` to it.

    Do NOT modify any existing data-tutorial-id attributes. Only ADD missing ones.
    Do NOT change any component behavior, styling, or logic — purely additive attribute wiring.
  </action>
  <verify>
    npm run build passes with zero errors.
    Grep for 'spotlight_element' in tutorialTools.ts, toolExecutor.ts, and chatProcessor.ts — should appear in all three.
    Grep for 'data-tutorial-id="domain-rail"' in DomainRail.tsx — should appear.
    Grep for 'data-tutorial-id="bottom-tabs"' in BottomTabBar.tsx — should appear.
    Grep for 'data-tutorial-id="home-priority-stack"' in PriorityStack.tsx — should appear.
    Grep for 'spotlight_element' in ChatOverlay.tsx — should appear in SSE handler.
  </verify>
  <done>AC-1 satisfied: Claude can call spotlight_element/clear_spotlight → SSE event → client applies spotlight → SpotlightOverlay renders highlight → auto-clears on click</done>
</task>

<task type="auto">
  <name>Task 2: Same-origin teaching prompt, topic data enrichment, and startTour differentiation</name>
  <files>
    src/lib/jarvis/intelligence/systemPrompt.ts,
    src/lib/jarvis/academy/toolExecutor.ts,
    src/components/jarvis/onboarding/OnboardingWizard.tsx
  </files>
  <action>
    **A. Enhance system prompt with same-origin teaching section (systemPrompt.ts):**

    Inside the existing ACADEMY section (after the TEACHING CRAFT block, around line 401), add a new subsection. This should be INSIDE the `if (context.academyConfigured)` block:

    ```
    SAME-ORIGIN TEACHING (Jarvis project only):
    When teaching about the "jarvis" project, you have a special ability: you can highlight UI elements in real-time.

    Tools available:
    - spotlight_element(element_id, style): Highlights a UI element. Use "pulse" when the user should click/tap it, "ring" when they should just look at it.
    - clear_spotlight(): Removes the current highlight.

    Teaching flow with spotlights:
    1. Tell the user what to look for: "See the purple card labeled Personal?"
    2. Call spotlight_element to highlight it: spotlight_element("home-domain-card-personal", "pulse")
    3. Wait for the user to respond (they'll click it or tell you they see it)
    4. The spotlight auto-clears when clicked, or call clear_spotlight() before highlighting something new
    5. Continue teaching conversationally

    Available spotlight targets (by curriculum area):
    - Navigation: domain-rail, domain-rail-personal, bottom-tabs, bottom-tab-home, bottom-tab-chat, bottom-tab-academy, home-priority-stack
    - Personal features: home-domain-card-personal, personal-subprogram-tasks, personal-subprogram-habits, personal-subprogram-bills, personal-subprogram-calendar, personal-subprogram-meals
    - Task detail: tasks-summary, tasks-first-checkbox-0
    - Habit detail: habits-progress
    - Bill detail: bills-summary
    - Chat: chat-input, chat-send
    - Header: header-search, header-settings

    IMPORTANT: Only use spotlight_element when teaching Jarvis topics. It does NOT work for cross-origin projects (Visopscreen, Creator Workflow). For those projects, describe the UI verbally.

    When a user starts a "guided tour" or asks to learn Jarvis, begin with the welcome-tour topic and use spotlights to walk them through the interface step by step.
    ```

    Keep the text concise — this adds to every chat's system prompt when academy is configured. Avoid repeating information already in the TEACHING CRAFT section.

    **B. Enrich academy_list_topics output with spotlightTargets (academy/toolExecutor.ts):**

    In `handleListTopics()` (line 174), modify the topic line construction (around line 205) to include spotlight info for topics that have spotlightTargets:

    After the existing line that builds `let line = ...`:
    ```typescript
    if (t.spotlightTargets && t.spotlightTargets.length > 0) {
      line += `\n  _Spotlight targets: ${t.spotlightTargets.join(', ')}_`;
    }
    ```

    This lets Claude discover which elements it can highlight when planning a teaching session for a specific topic.

    **C. Differentiate startTour() from finishOnboarding() (OnboardingWizard.tsx):**

    Currently (line 216-218):
    ```typescript
    const startTour = () => {
      finishOnboarding();
    };
    ```

    Change to:
    ```typescript
    const startTour = () => {
      finishOnboarding();
      // Open chat with guided tour message — triggers Claude to begin welcome-tour with spotlights
      // Must be AFTER finishOnboarding() so the shell chrome is visible when chat opens
      setTimeout(() => {
        useChatStore.getState().openWithMessage('Start my guided tour of Jarvis');
      }, 500);
    };
    ```

    The setTimeout(500ms) is needed because:
    - finishOnboarding() calls router.push('/jarvis/app') which triggers a navigation
    - The shell chrome (DomainRail, BottomTabBar, ChatOverlay) renders after navigation completes
    - openWithMessage needs ChatOverlay to be mounted to auto-send the queued message

    Add the import at the top of OnboardingWizard.tsx:
    ```typescript
    import { useChatStore } from '@/lib/jarvis/stores/chatStore';
    ```

    Note: useChatStore may already be imported (check first). If not, add it alongside the existing useAcademyStore import.

    The "Skip tour and go to Home" button (line 620-625) continues to call bare `finishOnboarding()` — no change needed. Both paths set Academy active project to 'jarvis' (done in L-01-01), but only startTour opens the chat.

    Do NOT modify the 6 wizard step UIs.
    Do NOT change finishOnboarding() itself.
    Do NOT add any new API routes or brain tools beyond what Task 1 created.
  </action>
  <verify>
    npm run build passes with zero errors.
    Grep for 'SAME-ORIGIN TEACHING' in systemPrompt.ts — should appear once.
    Grep for 'spotlightTargets' in academy/toolExecutor.ts handleListTopics — should appear.
    Read OnboardingWizard.tsx startTour function — should call finishOnboarding() then openWithMessage.
    Confirm 'Skip tour' path still calls bare finishOnboarding() without openWithMessage.
  </verify>
  <done>AC-2 + AC-3 satisfied: System prompt includes spotlight teaching instructions, topic listing shows available targets, and startTour initiates guided chat while Skip remains lightweight</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- src/lib/jarvis/stores/tutorialStore.ts (SpotlightTarget interface is stable, setSpotlight/clearSpotlight work as-is)
- src/components/jarvis/onboarding/SpotlightOverlay.tsx (already handles rendering + auto-clear on click)
- src/lib/jarvis/stores/academyStore.ts (store interface is stable)
- src/lib/jarvis/academy/projects.ts (curriculum data from L-01-01 is stable)
- src/lib/jarvis/curriculum/verificationEngine.ts (available for future use, not modified now)
- src/lib/jarvis/curriculum/tutorialActionBus.ts (not used in this plan)
- src/components/jarvis/academy/AcademyHub.tsx (already handles topic clicks + openWithMessage)
- src/app/api/jarvis/chat/route.ts (SSE stream already sends tool_use events — no changes needed)
- Any existing ACADEMY_PROJECTS entries (visopscreen, creator-workflow)
- The 6 OnboardingWizard step UIs
- The finishOnboarding() function body

## SCOPE LIMITS
- NO automated verification polling (future enhancement — Claude teaches conversationally for now)
- NO new API routes
- NO changes to the chat streaming architecture
- NO changes to existing tutorial lesson data (tutorialLessons.ts)
- NO Tier 2-3 curriculum topics
- NO changes to Academy progress tracking or demotion guards
- NO useTutorialEngine modifications (the E-05 engine stays independent)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] spotlight_element tool defined in tutorialTools.ts
- [ ] clear_spotlight tool defined in tutorialTools.ts
- [ ] Both tools handled in tutorial/toolExecutor.ts
- [ ] Both tool names in tutorialToolNames set in chatProcessor.ts
- [ ] ChatOverlay.tsx intercepts spotlight tool_use SSE events and calls tutorialStore
- [ ] DomainRail has data-tutorial-id="domain-rail" on nav + domain-rail-{id} on buttons
- [ ] BottomTabBar has data-tutorial-id="bottom-tabs" on nav container
- [ ] PriorityStack has data-tutorial-id="home-priority-stack"
- [ ] systemPrompt.ts includes SAME-ORIGIN TEACHING section inside ACADEMY block
- [ ] handleListTopics includes spotlightTargets in output for topics that have them
- [ ] OnboardingWizard startTour calls finishOnboarding + openWithMessage
- [ ] OnboardingWizard "Skip" path unchanged (bare finishOnboarding)
- [ ] All acceptance criteria met
</verification>

<success_criteria>
- All 2 tasks completed
- All verification checks pass
- Build succeeds with zero type errors
- No existing tutorial or academy functionality broken
- Spotlight bridge works end-to-end: Claude tool call → SSE event → client bridge → tutorialStore → SpotlightOverlay renders
- System prompt teaches Claude how and when to use spotlights
- startTour is meaningfully different from Skip (opens chat with guided-tour message)
</success_criteria>

<output>
After completion, create `.paul/phases/L-01-foundation/L-01-02-SUMMARY.md`
</output>
