# Playwright MCP Production Tests

After restarting Claude Code, run these tests using the Playwright MCP tools.

## Test URL
https://jarvis.whatamiappreciatingnow.com

## Pre-verified (via curl)
- [x] API returns 401 without auth header
- [x] API returns 200 with correct X-Jarvis-Secret header
- [x] Main page returns 200

## Playwright MCP Tests to Run

### 1. Navigate to Jarvis and screenshot
```
Use playwright navigate to https://jarvis.whatamiappreciatingnow.com
Take a screenshot
```

### 2. Check Dashboard Elements
Look for:
- Tasks section with real data (not empty/placeholder)
- Calendar section with events
- Habits section
- Bills section

### 3. Check Voice UI
Look for:
- Push-to-talk button (microphone icon or "Talk" button)
- Chat/transcript area

### 4. Check Briefing Button
Look for:
- "Start Briefing" or similar button

### 5. Test Notion Integration
- The dashboard should show real Notion data
- If empty, check browser console for errors

## API Tests Already Passed

```bash
# Without auth - returns 401 ✓
curl -s https://jarvis.whatamiappreciatingnow.com/api/jarvis/session
# Response: {"error":"Unauthorized"}

# With auth - returns 200 ✓
curl -s -H "X-Jarvis-Secret: c6556c2ed60b7fc6ba9ecbcbbe3877f9c5980a80fe81c6616787a0aa2d197609" \
  https://jarvis.whatamiappreciatingnow.com/api/jarvis/session
# Response: {"id":1,"startedAt":"2026-02-02T15:59:10.592Z","active":true}
```

## Resume Command

After restart, say:
```
Resume Phase 11 execution - run Playwright tests on jarvis.whatamiappreciatingnow.com to verify:
1. Dashboard loads with Notion data
2. Voice UI elements present
3. Briefing button present
4. No console errors
```
