---
phase: L-03-live-walkthrough-pass2
plan: 04
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/jarvis/layout/ChatOverlay.tsx
  - src/lib/jarvis/intelligence/systemPrompt.ts
  - src/components/jarvis/academy/AcademyHub.tsx
autonomous: false
---

<objective>
## Goal
Fix the 4 deferred bugs from L-03-02/03: welcome-tour repeat (store sync timing),
Jarvis verbosity during walkthrough, Academy lock gating (explored topics),
and bottom-padding live verification on iPhone.

## Purpose
These are the last known blockers before L-04 (Wife Test). A clean walkthrough
end-to-end — no repeated topics, no walls of text, no locked lessons — is the
exit criterion for Pass 2.

## Output
3 code fixes committed + live iPhone verification checkpoint. Phase L-03 complete.
</objective>

<context>
## Project Context
@.paul/PROJECT.md
@.paul/STATE.md

## Prior Work
@.paul/phases/L-03-live-walkthrough-pass2/L-03-0203-SUMMARY.md

## Source Files
@src/components/jarvis/layout/ChatOverlay.tsx
@src/lib/jarvis/intelligence/systemPrompt.ts
@src/components/jarvis/academy/AcademyHub.tsx
</context>

<acceptance_criteria>

## AC-1: Welcome-tour doesn't repeat in same session
```gherkin
Given Jarvis has taught welcome-tour (called academy_update_progress for it)
When the user sends the next message
Then buildAppContext() includes "Already taught — welcome-tour" and Jarvis continues to the next topic
```

## AC-2: Jarvis stays concise during guided walkthrough
```gherkin
Given a tutorial is in progress and Jarvis is introducing a spotlight target
When Jarvis delivers the explanation
Then the text response is 1-3 sentences max — narration handles the description, text confirms/bridges
```

## AC-3: Explored topics unlock prerequisites
```gherkin
Given topic A has been explored (status: "explored", not "completed")
When viewing topic B that lists A as a prerequisite
Then topic B is NOT locked — the lock icon is gone and the Learn button is visible
```

## AC-4: Bottom padding — lists not buried on iPhone
```gherkin
Given the app is open on an iPhone
When navigating to Tasks, Habits, Bills, or Meals lists
Then the last item in the list is fully visible above the BottomTabBar with no content overlap
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Fix welcome-tour repeat (store sync) + walkthrough verbosity</name>
  <files>src/components/jarvis/layout/ChatOverlay.tsx, src/lib/jarvis/intelligence/systemPrompt.ts</files>
  <action>
    **ChatOverlay.tsx — store sync on done:**
    In the SSE stream handler, when `event.type === 'done'` fires (line ~287), add:
    ```typescript
    } else if (event.type === 'done') {
      // Refresh academy progress so buildAppContext() sees updated taught topics
      // on the user's very next message (fixes same-session tour repeat)
      useAcademyStore.getState().loadProgress();
    }
    ```
    `useAcademyStore` is already imported at the top of the file. `loadProgress()` is async
    but fire-and-forget is fine here — the user won't send another message in <100ms.

    **systemPrompt.ts — walkthrough conciseness:**
    Find the "SAME-ORIGIN TEACHING" section, near the line:
    `"When a user starts a "guided tour" or asks to learn Jarvis, begin with the welcome-tour topic..."`

    Add immediately after that line:
    ```
    GUIDED TOUR CONCISENESS:
    During a Jarvis walkthrough, spotlight narration carries the explanation — keep text responses SHORT:
    - Narration (spoken aloud) = full instruction ("Tap the Personal card to enter your life hub.")
    - Text response = 1-3 sentences that bridge or confirm: "That's your Personal domain — it holds everything." Then call the next spotlight.
    - Never write a paragraph when a sentence will do. The user is interacting, not reading.
    ```
    Avoid: adding this instruction to the Academy codebase teaching section (different flow).
  </action>
  <verify>
    - Build passes: npm run build
    - In ChatOverlay SSE handler, search for "event.type === 'done'" — should now call loadProgress()
    - In systemPrompt.ts, search for "GUIDED TOUR CONCISENESS" — should exist after the welcome-tour line
  </verify>
  <done>AC-1 (tour repeat) and AC-2 (verbosity) satisfied</done>
</task>

<task type="auto">
  <name>Task 2: Fix Academy lock — explored topics satisfy prerequisites</name>
  <files>src/components/jarvis/academy/AcademyHub.tsx</files>
  <action>
    In `AcademyHub.tsx`, in `ProjectCurriculumTab`, change the `completedTopicIds` set
    to include both `completed` AND `explored` statuses:

    Find:
    ```typescript
    const completedTopicIds = new Set(
      Object.values(academyProgress)
        .filter(p => p.projectId === projectId && p.status === 'completed')
        .map(p => p.topicId)
    );
    ```

    Replace with:
    ```typescript
    const completedTopicIds = new Set(
      Object.values(academyProgress)
        .filter(p => p.projectId === projectId && (p.status === 'completed' || p.status === 'explored'))
        .map(p => p.topicId)
    );
    ```

    Rationale: Jarvis marks topics as `explored` after teaching them (not `completed` until
    the user passes the verification question). Using explored-only status means topics lock
    even after Jarvis has taught the prerequisite — a confusing dead end during onboarding.
    Including `explored` unblocks the progression while still showing the topic as
    in-progress (amber ring).

    Avoid: touching `CurriculumTopicCard.tsx` — it correctly displays lock state based on
    the `isLocked` prop it receives. Only fix the computation, not the display.
  </action>
  <verify>
    - Build passes: npm run build
    - In AcademyHub.tsx, search for "completedTopicIds" in ProjectCurriculumTab —
      filter should include `|| p.status === 'explored'`
  </verify>
  <done>AC-3 satisfied: explored topics now unlock dependent topics</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    All 3 code fixes from Tasks 1+2 are live. git push → auto-deploy ~30s.
    This checkpoint verifies: bottom padding, tour continuity, and verbosity on a real iPhone.
  </what-built>
  <how-to-verify>
    1. Push to GitHub: `git push` → wait ~30s for auto-deploy
    2. Open https://jarvis.whatamiappreciatingnow.com on iPhone
    3. **Bottom padding test:**
       - Go to Personal → Tasks. Scroll to the bottom — is the last task fully visible above the tab bar?
       - Repeat for Habits, Bills, Meals lists.
    4. **Tour continuity test:**
       - Clear academyStore: Settings → clear local storage (or just test if Jarvis continues naturally)
       - Say: "Teach me about Jarvis" — Jarvis should start with welcome-tour spotlight
       - Complete welcome-tour, then send another message — Jarvis should move to next topic (tasks-basics), NOT restart welcome-tour
    5. **Verbosity test:**
       - During a spotlight step, check that Jarvis's text response is short (1-3 sentences)
       - Narration plays via TTS, text should just confirm/bridge
    6. **Academy unlock test:**
       - Go to Learn tab → pick a project (Visopscreen or Creator Workflow)
       - If you've explored any topics, their dependent topics should be unlocked (no lock icon)
  </how-to-verify>
  <resume-signal>Type "approved" if all pass, or describe any issues to fix</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- `src/components/jarvis/academy/CurriculumTopicCard.tsx` — lock display is correct, only fix the lock computation in AcademyHub
- `src/lib/jarvis/curriculum/tutorialLessons.ts` — tutorial lesson definitions unchanged
- `src/lib/jarvis/stores/academyStore.ts` — store interface unchanged
- L-02 spotlight/audio/safe-area fixes — do not regress any L-02 or L-03-02/03 fixes

## SCOPE LIMITS
- This plan is bug fixes only — no new features or curriculum changes
- Do not modify the Academy's `completed` verification flow — explored unlocks prereqs but verified understanding still requires the full Q&A to mark `completed`
- Do not change the `getNextSuggested` logic in academyStore — it already correctly excludes explored topics from the "already suggested" list

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `npm run build` passes with zero errors
- [ ] ChatOverlay: `event.type === 'done'` handler calls `loadProgress()`
- [ ] systemPrompt: "GUIDED TOUR CONCISENESS" section exists in SAME-ORIGIN TEACHING block
- [ ] AcademyHub: `completedTopicIds` filter includes `|| p.status === 'explored'`
- [ ] Human checkpoint: iPhone verification approved by Jonathan
</verification>

<success_criteria>
- All 3 code tasks committed and auto-deployed
- iPhone checkpoint approved
- No regressions to L-02 or L-03-02/03 fixes
- Phase L-03 loop closed — ready for L-04
</success_criteria>

<output>
After human checkpoint approval, create `.paul/phases/L-03-live-walkthrough-pass2/L-03-04-SUMMARY.md`
</output>
