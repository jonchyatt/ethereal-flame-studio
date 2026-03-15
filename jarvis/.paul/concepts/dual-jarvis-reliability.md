# Dual-Jarvis Reliability Architecture

**Status:** Concept — design complete, not yet built
**Created:** 2026-03-15
**Priority:** Infrastructure — build before or during v4.5

---

## The Problem

Jonathan accesses Jarvis from Virginia. The brain (Claude Code SDK) runs on a desktop in St. George, Utah via PM2 + Cloudflare tunnel. Three failure modes:
1. Desktop sleeps, crashes, or restarts
2. Cloudflare tunnel drops
3. Power outage / internet outage in Utah

When any of these happen, Jarvis is completely dark. For a personal AI used in spare moments between hospital shifts, "completely dark" is unacceptable.

---

## Current Reliability Measures (Already Done)

- `powercfg` configured: sleep, hibernate, monitor all set to 0 — desktop never sleeps
- PM2 with `pm2-windows-startup` — processes restart on reboot
- Cloudflare tunnel with 4 connections — tolerates single connection drop
- PM2 `restart_delay` + `max_restarts` configured — processes self-heal

These are good. They handle the common cases (restart, tunnel hiccup). They don't handle catastrophic failure (power outage, extended connectivity loss).

---

## The Solution: Warm Fallback to Vercel

### Architecture

```
Client request → jarvis.whatamiappreciatingnow.com
                          │
                  Cloudflare Worker (health check)
                  ├── Desktop healthy? → route to Cloudflare tunnel (SDK brain, $0)
                  └── Desktop unreachable? → route to Vercel (API brain, ~$0.015/msg)
```

### Why This Works

- The `providerRouter.ts` already routes between `claude-code-sdk` and `anthropic-api`
- The Vercel deployment already exists (was primary before desktop migration)
- Cloudflare is already our DNS provider and tunnels provider — Workers are native
- Vercel fallback uses `anthropic-api` mode: costs ~$0.015/message with Sonnet, but is globally available, no local dependency

### The Cloudflare Worker Logic

```javascript
// Health check Worker (runs at edge, global)
export default {
  async fetch(request, env) {
    // Try desktop tunnel first
    const health = await fetch('https://jarvis.whatamiappreciatingnow.com/api/jarvis/health', {
      signal: AbortSignal.timeout(3000) // 3s timeout
    }).catch(() => null);

    if (health?.ok) {
      // Desktop is up — proxy to tunnel
      return fetch(request.url.replace('jarvis.', 'desktop-jarvis.'), request);
    }

    // Desktop unreachable — route to Vercel
    return fetch(request.url.replace('jarvis.', 'vercel-jarvis.'), request);
  }
}
```

Two DNS records:
- `desktop-jarvis.whatamiappreciatingnow.com` → Cloudflare tunnel (existing)
- `vercel-jarvis.whatamiappreciatingnow.com` → Vercel deployment (existing)
- `jarvis.whatamiappreciatingnow.com` → Cloudflare Worker (new)

### Status Indicator in Jarvis UI

Small indicator in the shell header showing which brain is active:
- 🟢 Local SDK (Utah desktop) — $0
- 🟡 API Fallback (Vercel) — costs apply

Implemented by checking the response for a `X-Brain-Mode` header the API sets.

---

## Vercel Fallback Requirements

For Vercel to work as fallback, it needs:
1. `JARVIS_BRAIN_PROVIDER=anthropic-api` (already the default when env var absent)
2. `ANTHROPIC_API_KEY` in Vercel env vars (already set)
3. All other secrets in Vercel env vars (Notion, Google Calendar, etc.) — already set from original deployment

**Nothing to add to Vercel.** It already works in API mode. Just needs DNS routing.

---

## Cost Model

Jonathan uses Jarvis heavily during rare free moments. Estimated usage:
- Normal day: ~20 messages (OR breaks, evening planning)
- Heavy day: ~50 messages

Fallback cost if desktop is down ALL day: 50 × $0.015 = $0.75/day
Monthly worst case (desktop down half the time): ~$11/month

Reality: with never-sleep configured, desktop should be up >99% of time. Fallback cost is noise.

---

## Parsec + Remote Access Note

Jonathan uses Parsec to access the desktop from Virginia. This adds complexity:
- Parsec connects to the desktop machine directly (game streaming layer)
- If Parsec is open, desktop is definitely reachable
- The reliability problem is when Parsec isn't running and Jarvis needs to work anyway (e.g., Telegram message from OR)

The dual-Jarvis architecture solves exactly this: Jarvis works from Telegram/web regardless of whether Parsec/desktop is up.

---

## Phase Plan

This is a small infrastructure build — estimate 2-3 plans:

### DualJ-01: Cloudflare Worker + DNS Setup
- Create Worker health check script
- Set up DNS routing (desktop subdomain + vercel subdomain + worker)
- Test failover manually

### DualJ-02: Vercel Validation
- Verify Vercel deployment works in API mode
- Confirm all env vars present
- Test end-to-end: Telegram → Vercel brain → Notion response

### DualJ-03: Status Indicator + Monitoring
- Add `X-Brain-Mode` header to API responses
- Add status dot to Jarvis shell
- Add health alert to morning briefing if desktop was down overnight

---

## When to Build

Options:
1. **Before v4.5** — makes sense if Virginia-to-Utah reliability is causing pain now
2. **Alongside W-01** (Scheduled Tasks) — natural infrastructure phase
3. **After v4.4** — keep scope focused, do it as v4.4.1

**Recommendation:** Build it as the first thing after v4.4. It's small (3 plans), infrastructure-only, and unblocks everything else with confidence that Jarvis is always reachable.

---

*Created: 2026-03-15. Context: Jonathan accesses from Virginia while brain runs in Utah. Parsec works but isn't always open. Need Jarvis available from anywhere at all times.*
