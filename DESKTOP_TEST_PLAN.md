# Jarvis Desktop Migration — Test & Fix Plan

**Date:** 2026-03-12
**Status:** Onboarding disabled, ready for comprehensive testing
**Context:** Resume from fresh Claude Code session

---

## READ THIS FIRST

Onboarding redirect is **temporarily disabled** in `JarvisShell.tsx:65-69` (commented out).
The app will load directly to Priority Home without requiring the 6-step wizard.

**You MUST re-enable onboarding after testing is complete.** See TODO section below.

---

## What's Already Fixed (This Session)

1. **`jarvis/ecosystem.config.js`** — `CLAUDECODE: ''` in all env blocks; tunnel uses `cloudflared.exe` directly
2. **`jarvis/scripts/start-web.js`** — Builds clean env copy (not mutate process.env), strips CLAUDECODE
3. **`src/lib/jarvis/intelligence/ccodeBrain.ts`** — Strips CLAUDECODE + ANTHROPIC_API_KEY from SDK env
4. **`.env.local`** — Fixed trailing `\n` in ANTHROPIC_API_KEY
5. **Chat works** — Confirmed "Hey Jonathan" response via Max subscription ($0 cost)
6. **All 4 PM2 processes online** — jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel

---

## What Needs Testing Now

Run `node scripts/test-full-functionality.mjs` from the project directory.
This opens a **visible Chrome window** (not headless) and takes screenshots at every step.

### Tests to verify:

| Section | What to Check | Visual Confirmation |
|---------|--------------|-------------------|
| **Home / Priority Home** | Page renders, domain health cards, priority stack | Screenshot shows real UI, not onboarding |
| **Chat Panel** | Opens via Ctrl+Shift+C, input visible, send works | Type "hello", get Jarvis response (not "exited with code 1") |
| **Personal Dashboard** | All 8 subprogram cards (Tasks, Habits, Bills, Calendar, Meals, Journal, Goals, Health) | Cards visible with stats |
| **Tasks** | Task list renders, checkboxes work, toggle a task | Tasks from Notion appear, checkbox toggles |
| **Calendar** | Week strip, today highlight, events listed | Events from Google Calendar show |
| **Bills** | Bill sections (overdue/due/upcoming/paid), "Mark Paid" button | Bill data from Notion appears |
| **Meals** | Weekly tab, Shopping/Pantry/Recipes tabs all clickable | Meal plan data renders |
| **Goals, Habits, Health, Journal** | Each page loads with content | No blank pages or errors |
| **Academy** | Page loads, topics visible | May show 401 error (known issue, see below) |
| **Settings** | Page loads | Settings UI renders |
| **Chat CRUD** | "Add a task called 'Playwright test verification' due tomorrow" | Jarvis processes and creates task |
| **Verify CRUD** | Task appears on Tasks page after creation | Task list includes new item |
| **Tunnel** | `https://jarvis.whatamiappreciatingnow.com` serves the app | External access works |

### Screenshot review

After the test runs, screenshots are saved to `scripts/screenshots/full-test/`.
**Open each screenshot manually** to confirm visual correctness:
- UI renders properly (not blank, not error pages, not onboarding)
- Data is populated (tasks, bills, meals, events — not empty)
- Chat responses are real text (not error messages)

---

## Known Issues to Fix

### 1. Academy 401 Errors
- **Symptom:** `[AcademyStore] Failed to load progress: Error: HTTP 401`
- **Location:** Client-side fetch to `/api/jarvis/academy/progress` missing auth header
- **Fix needed:** Add `X-Jarvis-Secret` header to academy API calls in the store

### 2. Tunnel 502 Bad Gateway
- **Symptom:** `whatamiappreciatingnow.com | 502: Bad gateway`
- **Likely cause:** Cloudflare tunnel may need restart or DNS propagation after PM2 config change
- **Fix:** Check `pm2 logs jarvis-tunnel` for errors. May need `cloudflared tunnel cleanup jarvis` then restart.

### 3. Re-enable Onboarding (TODO — DO NOT SHIP WITHOUT THIS)
- **File:** `src/components/jarvis/layout/JarvisShell.tsx` line 65-69
- **Action:** Uncomment the onboarding redirect:
  ```tsx
  useEffect(() => {
    if (!onboarded && !isOnboarding) {
      router.replace(ONBOARDING_PATH);
    }
  }, [onboarded, isOnboarding, router]);
  ```
- **When:** After all testing passes and fixes are committed
- **Then:** Rebuild (`npm run build`) and restart (`pm2 restart jarvis-web --update-env`)

### 4. Onboarding + Tutorial Laser Pointer Testing
- The spotlight/laser pointer overlay in the guided tour was NOT tested
- Needs dedicated test after onboarding is re-enabled
- Test: Complete onboarding, start guided tour, verify spotlight highlights correct elements

### 5. Commit All Changes
- After everything passes, commit:
  - `ecosystem.config.js` (CLAUDECODE fix + tunnel exe)
  - `start-web.js` (clean env)
  - `ccodeBrain.ts` (strip ANTHROPIC_API_KEY)
  - `.env.local` (fixed API key — DO NOT commit this file if it has secrets)
  - `JarvisShell.tsx` (with onboarding re-enabled)
  - `scripts/test-full-functionality.mjs` (new test)

---

## Key Files

| File | Purpose |
|------|---------|
| `src/components/jarvis/layout/JarvisShell.tsx` | **HAS DISABLED ONBOARDING** — line 65-69 commented |
| `src/lib/jarvis/intelligence/ccodeBrain.ts` | SDK brain — strips CLAUDECODE + ANTHROPIC_API_KEY |
| `jarvis/scripts/start-web.js` | PM2 launcher — clean env build |
| `jarvis/ecosystem.config.js` | PM2 config — CLAUDECODE: '' + cloudflared.exe |
| `scripts/test-full-functionality.mjs` | Comprehensive headed Playwright test |
| `scripts/smoke-test.mjs` | Quick smoke test (15 basic checks) |
| `scripts/test-onboarding.mjs` | Onboarding wizard walkthrough test |
| `.env.local` | Secrets (fixed ANTHROPIC_API_KEY) |
| `DESKTOP_SETUP_HANDOFF.md` | Original detailed handoff from laptop migration |

---

## How to Resume

```bash
cd C:/Users/jonch/Projects/ethereal-flame-studio

# 1. Verify PM2 is running
pm2 list

# 2. If not running, start everything
pm2 start jarvis/ecosystem.config.js
pm2 save

# 3. Run the full test
node scripts/test-full-functionality.mjs

# 4. Review screenshots
# Open scripts/screenshots/full-test/ and check each image

# 5. Fix any failures, then re-enable onboarding (see TODO above)

# 6. Rebuild and restart
npm run build && pm2 restart jarvis-web --update-env
```

---

*Plan created: 2026-03-12 ~1:00 AM ET*
