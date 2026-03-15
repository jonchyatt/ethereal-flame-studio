# Jarvis Host Switching Guide

Jarvis runs on one machine at a time via PM2 + Cloudflare tunnel. This guide covers switching between the desktop (Utah) and laptop (Virginia).

## Architecture

- PM2 runs 4 processes: jarvis-web, jarvis-mcp, jarvis-cron, jarvis-tunnel
- Cloudflare tunnel routes `jarvis.whatamiappreciatingnow.com` → `localhost:3001`
- Only ONE machine can hold the tunnel at a time
- `ecosystem.config.js` auto-detects cloudflared location (no hardcoded paths)

## Prerequisites (Both Machines)

- Node.js, npm, PM2 (`npm i -g pm2`)
- cloudflared (`winget install cloudflare.cloudflared`)
- Cloudflare tunnel named `jarvis` configured (credentials in `~/.cloudflared/`)
- `.env.local` at repo root with all API keys (Notion, Google, Anthropic, Turso, etc.)
- Claude Code SDK available (for the brain)

## Switch FROM current host (stop it)

```bash
pm2 stop all && pm2 save
```

That's it. This releases the Cloudflare tunnel so the other machine can claim it.

## Switch TO new host (start it)

```bash
cd C:/Users/jonch/Projects/ethereal-flame-studio
git pull origin master
npm install && npm run build
cloudflared tunnel cleanup jarvis
pm2 start jarvis/ecosystem.config.js && pm2 save
```

## Verify

```bash
# Local
curl http://localhost:3001
# Should return HTML

# External (wait ~10s for tunnel)
curl https://jarvis.whatamiappreciatingnow.com
# Should return HTML

# Process health
pm2 list
# All 4 processes should show "online"
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Tunnel 502 | `cloudflared tunnel cleanup jarvis` then `pm2 restart jarvis-tunnel` |
| Old host still holding tunnel | Stop PM2 on old host first, or wait ~2min for Cloudflare to release |
| cloudflared not found | `winget install cloudflare.cloudflared` or download from https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/ |
| Build fails | Check `.env.local` exists at repo root with all required keys |
| jarvis-web crashes | Check `pm2 logs jarvis-web` — usually missing env vars |
| CLAUDECODE env leak | Already handled in `ecosystem.config.js` and `start-web.js` — if brain errors, verify `CLAUDECODE: ''` in PM2 env |

## Machine-Specific Notes

### Desktop (Utah) — Always-On Server
- Path: `C:\Users\jonch\Projects\ethereal-flame-studio`
- cloudflared: `C:\Users\jonch\AppData\Local\cloudflared.exe`
- PM2 startup configured (`pm2-windows-startup`)
- Intended as primary host (always-on, plugged in)

### Laptop (Virginia) — Mobile Development
- Path: `C:\Users\jonch\Projects\ethereal-flame-studio`
- Use when desktop is unreachable or for active development
- Remember to stop PM2 before closing laptop lid

## Quick Reference

```
# Stop on current machine:
pm2 stop all && pm2 save

# Start on new machine:
git pull && npm install && npm run build && cloudflared tunnel cleanup jarvis && pm2 start jarvis/ecosystem.config.js && pm2 save
```
