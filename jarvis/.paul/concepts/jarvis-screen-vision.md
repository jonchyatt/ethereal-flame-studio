# Jarvis Screen Vision — Concept

**Captured:** 2026-03-03
**Triggered by:** VisionClaw (https://github.com/sseanliu/VisionClaw)
**Status:** Tier 1 shipping in v4.4. Tiers 2+3 queued — Jonathan committed to solving the technical barriers.

---

## The Inspiration

VisionClaw is an open-source project that turns Meta Ray-Ban smart glasses into an agentic AI
assistant. It streams the glasses camera at ~1 FPS via WebRTC to Gemini Live, which reasons about
what the user sees and triggers a local gateway called OpenClaw (56+ tools: Amazon, WhatsApp,
Home Assistant, browser automation, etc.) to act on it.

The concept is called **ambient agentic computation**: an always-on system that perceives your
world through your eyes and acts on your behalf without you touching a screen.

**Why VisionClaw's code itself isn't worth adopting:**
- Built around Gemini Live, not Claude
- The complexity is all in the hardware bridge (glasses → phone → cloud)
- OpenClaw is a gateway we don't need — Jarvis already has its tool executor

**What IS worth stealing:** The vision-to-action pipeline concept, applied to the computer screen.

---

## The Insight: Screen Vision Is Already Within Reach

VisionClaw's pipeline for glasses:
```
Glasses camera → WebRTC stream → Gemini Live multimodal → OpenClaw tools
```

Jarvis screen vision equivalent:
```
getDisplayMedia() → base64 PNG → Claude API (already wired) → Jarvis tools (already exist)
```

The browser's `getDisplayMedia()` API captures the screen. Claude already accepts image content
blocks. Jarvis already has the tools. The implementation delta is small.

---

## Three Tiers

### Tier 1 — Dynamic Route Context (SHIPPING — v4.4, L-02-04)

**No vision model. No screenshots. ~$0 cost.**

Since Jarvis is a web app we fully control, we already know everything meaningful:
- Current route (`/jarvis/app/personal`, `/jarvis/app`, etc.)
- Active domain (Personal, Home, etc.)
- Visible components

Serialize this as structured text, inject into every chat API call:

```
CURRENT APP STATE:
- Route: /jarvis/app/personal
- Domain: Personal
- Visible: TasksList, HabitTracker
- Bottom tab: personal
```

Claude is now spatially aware without a single pixel being sent. Navigation bugs like
"go to Home" (meaning Personal) become impossible — it knows exactly where you are.

**Cost:** ~100-150 tokens/message (~$0.0003). Essentially free.
**Scope:** ~1 plan. One `usePathname()` hook, serialized into the chat API payload.
**Fixes:** BUG 3 class bugs permanently, for all future features.

---

### Tier 2 — On-Demand Screen Vision (2 plans)

User clicks a "Share screen" button in ChatOverlay. Single screenshot captured, sent with the
chat message as an image content block. Claude sees the screen, responds, calls tools.

**Client side (ChatOverlay.tsx):**
```ts
const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
const track = stream.getVideoTracks()[0];
const bitmap = await new ImageCapture(track).grabFrame();
const canvas = document.createElement('canvas');
canvas.width = bitmap.width;
canvas.height = bitmap.height;
canvas.getContext('2d')!.drawImage(bitmap, 0, 0);
const base64 = canvas.toDataURL('image/png').split(',')[1];
stream.getTracks().forEach(t => t.stop()); // release immediately
// include base64 in chat message as image content block
```

**API side (chat/route.ts):**
Accept `image` content blocks in ChatMessage, pass through to Claude unchanged. Claude's
multimodal capability handles it natively. No new infrastructure.

**UX:** Camera icon in the chat input row. One-time browser permission prompt. Releases capture
immediately after grabbing one frame — not recording, just snapshotting.

**Estimated scope:** 2 plans (client UI + API passthrough)

### Tier 3 — Ambient Screen Monitoring (own milestone)

Instead of user-initiated, poll a screenshot every 10-30 seconds when Jarvis is open and the
user hasn't recently sent a message. Claude watches passively and surfaces relevant context
proactively without being asked:

- "You're looking at a patient chart — your pending task for this has a due date tomorrow."
- "I see you're in email — the Visopscreen deploy from 4 hours ago has a build error."
- "That lab value on your screen is flagged for interaction with the med you reviewed earlier."

This is the real VisionClaw innovation applied to desktop: **ambient + proactive**, not reactive.

Requires:
- Background polling loop with configurable frequency
- "Ambient mode" toggle so it's opt-in
- Smart suppression (don't interrupt when user is actively typing/speaking)
- Cost controls (1 FPS × Claude API cost = needs throttling logic)

**Estimated scope:** 3-4 plans, own milestone

---

## Technical Barriers — Jonathan Will Solve These

### Tier 2 Barriers
- **iOS Safari:** No `getDisplayMedia()` — programmatic screenshots are not possible in mobile Safari.
  The user must manually share a screenshot via the chat image input, or we use `html2canvas`
  which renders the DOM client-side (works on iOS, but misses some CSS and media).
  **Resolution path:** Jonathan owns — will decide between `html2canvas` fallback vs manual share
  flow vs waiting for iOS API expansion.

- **Permission UX:** `getDisplayMedia()` requires an explicit browser permission popup every time
  on desktop. Can't be silently captured — user must consciously choose to share.
  This is a security feature, not a bug. The UX must guide users through it clearly.
  **Resolution path:** Jonathan owns — will design the share flow and decide if this is acceptable
  or if we invest in a native wrapper (Capacitor) to get a smoother permission model.

### Tier 3 Barriers
- **Web PWA can't background-capture:** Browsers suspend JS and block `getDisplayMedia()` when
  the tab is not active. True ambient monitoring requires either:
  - A native app wrapper (Capacitor/React Native) with screen recording permissions, OR
  - A desktop companion app (Electron), OR
  - Staying limited to "Jarvis tab is open" monitoring
  **Resolution path:** Jonathan owns — will decide on native wrapper timing. The VisionClaw
  architecture (glasses → phone sidecar → cloud) remains the long-term path if ambient monitoring
  across all apps (not just Jarvis) is the goal.

---

## The Jonathan Use Case

Jonathan is an anesthesiologist coding between patients in the OR. Screen vision means:

- Glance at a lab value or drug reference → ask Jarvis "what's this?" → answer without switching context
- Screen-aware morning brief: Jarvis sees the schedule view and gives a genuinely contextual brief
- Chart review: Jarvis sees a patient chart and surfaces relevant cross-references from his notes
- Code review: Jarvis watches a build log or error and proactively flags what broke
- General "second brain on my screen" — the thing he actually needs while multitasking

---

## Meta Ray-Ban Integration (Separate Path)

Jonathan has Ray-Ban Metas. VisionClaw does use these — its iPhone mode is just a fallback.
If the glasses camera path becomes interesting, the research is already documented:

- `jarvis/.paul/concepts/jarvis-vision-research/00-SYNTHESIS.md` — full research
- Phase 2 (Ring Snapshots equivalent) = glasses camera via sidecar service
- Sidecar options: Fly.io (~$2.17/mo), Oracle Cloud Free, or future Pi at home
- Battery camera limitation: use recording clips, not snapshots

VisionClaw's glasses → phone app code would be the relevant reference for this path.
The iPhone mode (phone camera held up or strapped to chest) is an easy experiment before
buying into the full glasses pipeline.

---

## Priority

| Tier | Complexity | Cost | Value | When |
|------|-----------|------|-------|------|
| Tier 1: Dynamic route context | Trivial (~1 plan) | ~$0 | High — eliminates nav bugs | v4.4 shipping now |
| Tier 2: On-demand screenshots | Low (2 plans) | ~$0.50/mo | High — content-aware help | After v4.4, barriers resolved |
| Tier 3: Ambient monitoring | Medium (4 plans) | $$$ + infra | Very high — proactive | Own milestone, native wrapper |
| Ray-Ban / glasses camera | Medium-High | Sidecar + $ | High but niche | v4.7+ |

Tier 1 ships now. Tiers 2 and 3 are queued — Jonathan committed to solving the iOS and
permission barriers on his own timeline. When those barriers are cleared, the code delta
is small — the Brain already accepts image content blocks natively.

---

## Reference

- **VisionClaw repo:** https://github.com/sseanliu/VisionClaw
- **Creator:** Xiaoan Liu (sseanliu on GitHub)
- **Architecture:** Meta Ray-Bans → WebRTC → Gemini Live → OpenClaw (56 tools)
- **Key concept:** Ambient agentic computation — always-on perception + action
- **Notable stat from security audit:** 18.7% of community-built agent skills contained malware
  indicators — relevant warning for any open-source tool registry we build
- **Their iPhone mode:** Phone camera as fallback — proves concept without glasses hardware
