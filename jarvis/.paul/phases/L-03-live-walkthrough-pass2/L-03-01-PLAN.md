---
phase: L-03-live-walkthrough-pass2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/lib/jarvis/intelligence/systemPrompt.ts
autonomous: false
---

<objective>
## Goal
Audit and fix code-auditable issues in the second-half curriculum topics (Calendar, Meals, Morning Briefing) before the live walkthrough, then run the live walkthrough to discover runtime bugs.

## Purpose
L-02 caught 7 bugs before and during the first walkthrough. L-03 repeats the pattern: audit by code inspection first, then live-test what code can't reveal. This front-loads fixes so the walkthrough surfaces real UX issues, not avoidable code bugs.

## Output
- systemPrompt.ts: fix `"meet-jarvis"` example ID → `"welcome-tour"` (keeps Claude's internal docs accurate)
- Live walkthrough checkpoint: Jonathan walks Calendar → Meals → Morning Briefing → Chat
- Bug list for L-03-02+ fix plans
</objective>

<context>
## Source Files
@src/lib/jarvis/intelligence/systemPrompt.ts
@src/lib/jarvis/academy/projects.ts

## Verified DOM IDs (all exist — no mismatches found)
- `personal-subprogram-calendar` ✓ SubProgramCard.tsx
- `personal-subprogram-meals` ✓ SubProgramCard.tsx
- `bottom-tab-chat` ✓ BottomTabBar.tsx
- `chat-input` ✓ ChatOverlay.tsx

## Known State
- L-02 fixed: querySelectorAll dual-render, 21 spotlight IDs, TTS singleton, scrim pointer-events, conditional pb
- Calendar IS working (7 events confirmed in production from Jenny's Awesome Calendar/iCloud via Google Calendar)
- Meals data depends on Notion meal_plan database content
- `teach_topic` correctly routes via `academy_get_topics` (system 1) for onboarding topics
</context>

<acceptance_criteria>

## AC-1: systemPrompt example ID is accurate
```gherkin
Given a developer reads systemPrompt.ts curriculum routing docs
When they see topic ID examples
Then all examples match actual IDs in projects.ts
  And "meet-jarvis" is not present (correct ID is "welcome-tour")
```

## AC-2: Calendar lesson runs without stalling
```gherkin
Given the tutorial is active teaching calendar-basics
When Claude calls teach_topic with topic_id "calendar-basics"
Then the lesson runs, spotlights personal-subprogram-calendar, and Claude explains the calendar
  And the lesson completes (does not require non-existent data to verify)
```

## AC-3: Meals lesson runs without stalling
```gherkin
Given the tutorial is active teaching meals-basics
When Claude calls teach_topic with topic_id "meals-basics"
Then the lesson runs, spotlights personal-subprogram-meals, and Claude explains meals
  And empty state (no meal data) is handled gracefully — lesson does not stall
```

## AC-4: Morning briefing lesson completes
```gherkin
Given the tutorial is active teaching morning-briefing
When Claude calls teach_topic with topic_id "morning-briefing"
Then the lesson spotlights bottom-tab-chat, opens chat, and Claude demonstrates "brief me"
  And the lesson completes without requiring a specific briefing response format
```

</acceptance_criteria>

<tasks>

<task type="auto">
  <name>Task 1: Fix meet-jarvis → welcome-tour in systemPrompt example</name>
  <files>src/lib/jarvis/intelligence/systemPrompt.ts</files>
  <action>
    On the line that reads:
    ```
    - Curriculum lives in projects.ts — topic IDs like "meet-jarvis", "tasks-basics", "morning-briefing"
    ```
    Change `"meet-jarvis"` to `"welcome-tour"` so the example matches the actual ID in projects.ts.

    This is a comment/documentation line — the routing logic on the line that starts "When a user starts a guided tour" already correctly uses `welcome-tour`. This change just aligns the example.

    Avoid: changing any other lines in systemPrompt.ts.
  </action>
  <verify>
    1. `grep "meet-jarvis" src/lib/jarvis/intelligence/systemPrompt.ts` returns zero results
    2. `grep "welcome-tour" src/lib/jarvis/intelligence/systemPrompt.ts` shows at least 2 matches (routing line + example line)
    3. `npm run build` passes with zero errors
  </verify>
  <done>AC-1 satisfied: systemPrompt example IDs match actual curriculum IDs</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>
    Pre-walkthrough fix applied. Second-half topic spotlight IDs verified against DOM (all correct). Ready for live walkthrough of Calendar → Meals → Morning Briefing → Chat.
  </what-built>
  <how-to-verify>
    **Setup:** Make sure you're on the live site (auto-deploy from previous commit will be live).

    **Step 1 — Start fresh tutorial session:**
    Open Jarvis → navigate to Academy → start the Jarvis guided tour from the beginning OR open chat and say "Continue my Jarvis tour" (it should pick up from where you left off after bills lesson).

    **Step 2 — Calendar lesson:**
    - Ask Claude to teach `calendar-basics` if not auto-advancing
    - Does the spotlight appear on the Calendar card in Personal?
    - Does Claude explain the calendar clearly?
    - Does the lesson complete without stalling?
    - Are calendar events visible when you tap through to Calendar?

    **Step 3 — Meals lesson:**
    - Does the spotlight appear on the Meals card?
    - Does the lesson handle empty/populated meal data gracefully?
    - Does Claude explain meals without requiring specific data?

    **Step 4 — Morning Briefing lesson:**
    - Does the spotlight appear on the Chat tab?
    - Does Claude demonstrate "brief me"?
    - Does the actual briefing come back correctly?

    **Step 5 — General chat:**
    - Ask a few natural questions: "What do I have today?", "Any bills due?", "What's for dinner?"
    - Does the chat handle these naturally?

    **Document all friction points, bugs, or unexpected behavior.**
  </how-to-verify>
  <resume-signal>Type "done" with a description of what you found (bugs, friction, what worked). Even "all good" is useful.</resume-signal>
</task>

</tasks>

<boundaries>

## DO NOT CHANGE
- Any curriculum topic definitions in projects.ts (spotlight IDs verified, no changes needed)
- Any tutorial step content or verification logic
- JarvisShell.tsx, SpotlightOverlay.tsx, ChatOverlay.tsx (L-02 fixes stable)
- CalendarView.tsx, MealsView.tsx (no code issues found by inspection)

## SCOPE LIMITS
- Only the one-word ID fix in systemPrompt.ts for Task 1
- Bug fixes from the walkthrough go in L-03-02+ plans (not this plan)
- Voice/PushToTalk integration: explicitly OUT OF SCOPE for L-03 unless Jonathan specifically requests it

</boundaries>

<verification>
Before declaring plan complete:
- [ ] `grep "meet-jarvis" src/lib/jarvis/intelligence/systemPrompt.ts` → zero results
- [ ] `npm run build` passes clean
- [ ] Walkthrough checkpoint completed — bugs documented
- [ ] No other files modified
</verification>

<success_criteria>
- systemPrompt ID example fixed
- Live walkthrough completed
- Bug list captured for L-03-02+ plans
</success_criteria>

<output>
After completion, create `jarvis/.paul/phases/L-03-live-walkthrough-pass2/L-03-01-SUMMARY.md`
</output>
