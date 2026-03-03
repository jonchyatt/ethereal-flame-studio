---
phase: L-02-live-walkthrough-pass1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/jarvis/onboarding/SpotlightOverlay.tsx
  - src/lib/jarvis/academy/projects.ts
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/components/jarvis/academy/AcademyHub.tsx
autonomous: true
---

<objective>
## Goal
Fix all code-auditable issues that would cause the live onboarding walkthrough to fail — before Jonathan ever opens the app. Three categories: SpotlightOverlay can't find visible elements in dual-render layouts, spotlight target IDs mismatch between curriculum data and actual DOM, and Academy tab doesn't auto-select after onboarding.

## Purpose
L-02 is a live walkthrough phase — Jonathan clears localStorage and walks through the entire onboarding flow fresh. Every second spent hitting a bug we could have found from code analysis is a second wasted. This plan eliminates all predictable failures so the walkthrough can focus on discovering the *unpredictable* ones (UX friction, teaching quality, timing issues, data problems).

## Output
4 files modified. SpotlightOverlay resilient to dual-render DOM. All spotlight IDs in sync. Academy auto-selects Jarvis tab from onboarding. Ready for live walkthrough.
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/ROADMAP.md
@.paul/STATE.md

## Prior Work
@.paul/phases/L-01-foundation/L-01-02-SUMMARY.md
- L-01-02 built the spotlight bridge: spotlight_element tool → SSE → ChatOverlay intercept → tutorialStore → SpotlightOverlay
- Known concerns documented: dual-render querySelector, 500ms setTimeout timing
- All DOM annotations were added in L-01-02

## Source Files
@src/components/jarvis/onboarding/SpotlightOverlay.tsx
@src/lib/jarvis/academy/projects.ts
@src/lib/jarvis/intelligence/systemPrompt.ts
@src/components/jarvis/academy/AcademyHub.tsx
@src/components/jarvis/layout/DomainRail.tsx (read-only — understand dual-render)
@src/components/jarvis/layout/BottomTabBar.tsx (read-only — confirm tab IDs)
@src/components/jarvis/personal/TasksList.tsx (read-only — confirm checkbox ID)
</context>

<acceptance_criteria>

## AC-1: SpotlightOverlay Dual-Render Resilience
```gherkin
Given a spotlight target ID that exists on BOTH mobile and desktop DOM elements
  (e.g., data-tutorial-id="domain-rail" on both a hidden-mobile and visible-desktop nav)
When spotlight_element is called with that ID
Then SpotlightOverlay finds the VISIBLE element (non-zero dimensions)
  And the spotlight renders at the correct position around the visible element
  And if no visible element is found, the spotlight does not render (graceful no-op)
```

## AC-2: SpotlightOverlay Scroll-Into-View
```gherkin
Given a spotlight target element that exists in the DOM but is below the current viewport
When spotlight_element is called targeting that element
Then the browser scrolls the element into view (smooth, nearest)
  And the spotlight renders at the correct position after scrolling
```

## AC-3: Spotlight Target ID Consistency
```gherkin
Given the curriculum spotlightTargets in projects.ts
  And the available spotlight targets listed in systemPrompt.ts
When compared against actual data-tutorial-id attributes in the rendered DOM
Then every ID referenced in curriculum/prompt has a matching DOM element
  And no ID mismatches exist (no "bottom-tab-academy" when DOM has "bottom-tab-learn")
```

## AC-4: Academy Tab Auto-Selection from Onboarding
```gherkin
Given a user who just completed the OnboardingWizard
  And academyStore.activeProject was set to 'jarvis' during onboarding
When the user navigates to the Academy page (/jarvis/app/academy)
Then the Jarvis project tab is auto-selected (not "Tutorials")
  And the user sees the Jarvis curriculum topics immediately
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Harden SpotlightOverlay for dual-render DOM and off-viewport elements</name>
  <files>src/components/jarvis/onboarding/SpotlightOverlay.tsx</files>
  <action>
    Replace the `measure` callback's element lookup to handle dual-render layouts and off-viewport elements:

    1. **Use querySelectorAll instead of querySelector.** The dual-render pattern (DomainRail renders BOTH mobile + desktop navs in the DOM) means querySelector finds the first match — often the hidden mobile version on desktop, giving a zero-dimension rect.

    2. **Filter candidates for visibility.** Iterate all matches from querySelectorAll. For each candidate, call getBoundingClientRect(). Pick the first element with width > 0 AND height > 0. This automatically selects the visible variant in any dual-render layout — not just DomainRail but any future component using the same pattern.

    3. **scrollIntoView before final measurement.** After finding the visible element, call `el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })`. Then use a short RAF delay (requestAnimationFrame inside requestAnimationFrame — double-RAF) before calling getBoundingClientRect() for the final measurement. This ensures elements below the fold are visible before the spotlight renders.

    4. **Graceful fallback.** If NO candidate has non-zero dimensions (all hidden), set rect to null — same as "element not found." The spotlight simply doesn't render. No errors, no invisible box at (0,0).

    The updated measure callback should look approximately like:
    ```
    querySelectorAll('[data-tutorial-id="..."]')
    → filter for visible (width > 0 && height > 0)
    → if none visible, setRect(null) and return
    → scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    → double-RAF → getBoundingClientRect → setRect
    ```

    Also update the click-handler effect to use querySelectorAll + closest (same resilience) — though closest already works correctly since it traverses UP from click target, not from querySelectorAll. The existing click handler using `target?.closest(...)` is fine as-is.

    Avoid:
    - Don't add ResizeObserver or IntersectionObserver — RAF + scroll/resize listeners already handle repositioning
    - Don't change the spotlight visual styling (pulse/ring animations)
    - Don't change the tutorialStore interface
  </action>
  <verify>
    1. `npm run build` passes with no type errors
    2. Read the modified SpotlightOverlay.tsx and confirm:
       - querySelectorAll used instead of querySelector
       - Visible-element filtering (width > 0 && height > 0)
       - scrollIntoView called before measurement
       - Double-RAF for post-scroll measurement
       - Graceful null fallback when no visible candidates
  </verify>
  <done>AC-1 and AC-2 satisfied: SpotlightOverlay finds visible elements in dual-render layouts and scrolls off-viewport targets into view</done>
</task>

<task type="auto">
  <name>Task 2: Fix spotlight target ID mismatches between curriculum/prompt and DOM</name>
  <files>src/lib/jarvis/academy/projects.ts, src/lib/jarvis/intelligence/systemPrompt.ts</files>
  <action>
    Three confirmed ID mismatches exist between what Claude is told to use and what actually exists in the DOM:

    **Mismatch 1: `bottom-tab-academy` → `bottom-tab-learn`**
    - BottomTabBar defines tab ID as `'learn'` (line 19: `{ id: 'learn', label: 'Learn', ... }`)
    - DOM element has `data-tutorial-id="bottom-tab-learn"`
    - But curriculum `navigation-basics` topic in projects.ts (line ~585) lists `'bottom-tab-academy'`
    - And systemPrompt.ts (line ~438) lists `bottom-tab-academy` in available targets
    - **Fix:** Change both references from `bottom-tab-academy` to `bottom-tab-learn`

    **Mismatch 2: `tasks-first-checkbox-0` → `tasks-first-checkbox`**
    - TasksList.tsx (line 156) assigns `checkboxId = 'tasks-first-checkbox'` (no `-0` suffix)
    - But systemPrompt.ts (line ~440) lists `tasks-first-checkbox-0`
    - **Fix:** Change systemPrompt reference from `tasks-first-checkbox-0` to `tasks-first-checkbox`

    **Mismatch 3: Audit and correct any other ID inconsistencies**
    - Cross-reference ALL IDs in systemPrompt.ts "Available spotlight targets" against the actual `data-tutorial-id` attributes confirmed in the codebase
    - Known confirmed matches (no fix needed): domain-rail, domain-rail-personal, bottom-tabs, bottom-tab-home, bottom-tab-chat, home-priority-stack, home-domain-card-personal, personal-subprogram-tasks/habits/bills/calendar/meals, tasks-summary, habits-progress, bills-summary, chat-input, chat-send, header-search, header-settings
    - Fix any other mismatches found during audit

    Avoid:
    - Don't rename DOM attributes — the DOM is correct. Fix the references.
    - Don't change curriculum topic content (names, descriptions, keyFiles, verificationSteps)
    - Don't add new spotlight targets — only fix mismatches in existing ones
  </action>
  <verify>
    1. `npm run build` passes with no type errors
    2. Grep for `bottom-tab-academy` in src/ — should return 0 results
    3. Grep for `tasks-first-checkbox-0` in src/ — should return 0 results
    4. Every ID in the systemPrompt.ts "Available spotlight targets" section has a matching `data-tutorial-id` attribute somewhere in src/components/
  </verify>
  <done>AC-3 satisfied: All spotlight target IDs in curriculum and system prompt match actual DOM elements</done>
</task>

<task type="auto">
  <name>Task 3: Wire academyStore.activeProject into AcademyHub tab initialization</name>
  <files>src/components/jarvis/academy/AcademyHub.tsx</files>
  <action>
    AcademyHub currently hardcodes initial tab state:
    ```typescript
    const [activeTab, setActiveTab] = useState<string>('tutorials');
    ```

    But OnboardingWizard sets `academyStore.setActiveProject('jarvis')` during finishOnboarding(). When the user navigates to Academy after onboarding, they should see the Jarvis tab — not the Tutorials tab.

    **Fix:** Read `activeProject` from the academy store and use it as initial tab state if it matches a valid project:

    1. Import `useAcademyStore` (already likely imported for progress data)
    2. Read `activeProject` from the store
    3. Initialize `activeTab` to `activeProject` if it matches a project in the `projects` array, otherwise default to `'tutorials'`
    4. Something like:
       ```typescript
       const storeActiveProject = useAcademyStore((s) => s.activeProject);
       const [activeTab, setActiveTab] = useState<string>(() => {
         if (storeActiveProject && projects.some(p => p.id === storeActiveProject)) {
           return storeActiveProject;
         }
         return 'tutorials';
       });
       ```

    This is a one-line logical change — the store method already exists and OnboardingWizard already calls it. We just need to read it.

    Avoid:
    - Don't change OnboardingWizard's setActiveProject call
    - Don't change academyStore's interface or state shape
    - Don't add effects to sync tab state — just use it for initialization
    - Don't change tab rendering or styling logic
  </action>
  <verify>
    1. `npm run build` passes with no type errors
    2. Read AcademyHub.tsx and confirm:
       - activeProject read from useAcademyStore
       - Used as initializer for activeTab state
       - Validated against projects array before use
       - Default fallback to 'tutorials' preserved
  </verify>
  <done>AC-4 satisfied: Academy auto-selects Jarvis tab when activeProject is set from onboarding</done>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/lib/jarvis/tutorial/tutorialTools.ts` — Tool definitions stable from L-01-02
- `src/lib/jarvis/tutorial/toolExecutor.ts` — Server-side tool handling stable
- `src/lib/jarvis/intelligence/chatProcessor.ts` — Tool routing stable
- `src/components/jarvis/onboarding/OnboardingWizard.tsx` — Onboarding flow stable from L-01
- `src/components/jarvis/layout/ChatOverlay.tsx` — SSE bridge stable from L-01-02
- `src/lib/jarvis/stores/tutorialStore.ts` — Store interface stable
- `src/lib/jarvis/stores/academyStore.ts` — Store interface stable
- Any `data-tutorial-id` attributes on DOM elements — annotations are correct; fix references, not DOM

## SCOPE LIMITS
- No new data-tutorial-id annotations (all exist from E-05/L-01)
- No curriculum content changes (topic names, descriptions, keyFiles, verificationSteps)
- No UI visual changes (styling, layout, animations)
- No new tools or API routes
- This is a diagnostic fix plan — code-auditable issues only. UX/timing/teaching quality issues are for the live walkthrough checkpoint (L-02-02)

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` completes with no errors
- [ ] SpotlightOverlay uses querySelectorAll with visible-element filtering
- [ ] SpotlightOverlay calls scrollIntoView before measurement
- [ ] Zero grep results for `bottom-tab-academy` in src/
- [ ] Zero grep results for `tasks-first-checkbox-0` in src/
- [ ] All systemPrompt spotlight targets cross-checked against DOM attributes
- [ ] AcademyHub reads activeProject from store for initial tab
- [ ] All 4 acceptance criteria met
</verification>

<success_criteria>
- All 3 tasks completed
- All 8 verification checks pass
- No errors or warnings introduced
- `npm run build` clean
- Codebase ready for Jonathan's live walkthrough (L-02-02)
</success_criteria>

<output>
After completion, create `.paul/phases/L-02-live-walkthrough-pass1/L-02-01-SUMMARY.md`
</output>
