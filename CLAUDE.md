# Ethereal Flame Studio

## Dual-Host Rules

This repo is worked on from two machines. Check `.jarvis-host` in the repo root to know which you are. Missing file = assume Local.

### Local instance (master branch) — THE DEVELOPER
- All Next.js/React/Three.js code changes happen HERE. You own the web codebase.
- Work on `master` branch. Push triggers Vercel auto-deploy to production.
- Blender script development (Python, scene files) also happens here.

### Utah instance — THE RENDER FARM
- You run Blender renders, batch jobs, and GPU-intensive work. You do NOT change web source code.
- **NEVER push to master.** A push to master triggers a Vercel production deploy.
- Render outputs go to **R2 cloud storage**, not git. Use the render pipeline APIs.
- You may modify files in `blender/renders/`, `blender/cache/`, `blender/jobs/` — these are local working directories.
- If you create new Blender scenes or presets worth keeping, commit to a `utah` branch and let Local merge when ready.
- If you need a web code change, create a Notion task for the Local instance.

---

## Testing

- Production site: https://www.whatamiappreciatingnow.com/ (auto-deploys from GitHub push)
- Local access via Cloudflare tunnel + Parsec for iterative debugging
- `npm run dev` is allowed for local rendering, script testing, and Playwright automation
- `npm run build` for build validation

---

## Development Commands

- `npm run build` - Build check (local validation only, not for running a server)
- `git push` - Push to GitHub to trigger auto-deploy to production

---

## Chrome MCP — Authenticated Browser Access (via Jarvis)

Jarvis controls Jon's real Chrome browser via Chrome DevTools MCP. All logins, cookies, sessions intact. 200ms round trips, 35-200x fewer tokens than Playwright.

**Reference docs (in Jarvis repo at `C:/Users/jonch/Projects/jarvis/`):**

| File | What |
|------|------|
| `docs/chrome-mcp-architecture.md` | Capabilities, protocol stack, competitive analysis |
| `docs/chrome-146-154-virginia-setup.md` | Setup on this machine, spawn path rules |
| `~/.claude/skills/chrome-mcp/SKILL.md` | evaluate_script-first workflow, operational patterns |

**Ethereal Flame Studio capabilities:**

**Live QA (aligns with testing rule — test from production):**
- After `git push` → auto-deploy, use Chrome MCP to verify the live site visually
- `evaluate_script` to check DOM state, component dimensions, Three.js scene params — 20-500 tokens
- `take_screenshot` to capture visual result and compare against `/references/` targets
- Test responsive layouts by resizing viewport via CDP

**Real-Time Component Tuning:**
- Inject CSS via `evaluate_script` — test colors, spacing, animations without rebuild cycles
- Modify Three.js/WebGL parameters live (camera, lighting, particle counts) on the production site
- A/B test visual treatments by toggling DOM classes and screenshotting results

**Publishing Pipeline (Jon's authenticated sessions):**
- YouTube Studio: upload renders, set metadata, thumbnails, scheduling
- Social media distribution across authenticated platforms
- Stock footage site browsing with Jon's subscriptions

**Creative Research:**
- Navigate reference videos, extract timestamps via player DOM
- Pull color palettes from design reference sites
- Inspect competitor VR/WebGL experiences — extract shader params, scene graphs via `evaluate_script`

**Constraint:** The Chrome daemon must be connected before using chrome tools. Run the bash process from `docs/chrome-146-154-virginia-setup.md` first.

**Protocol:** `mcp__chrome__*` tools only (NEVER `mcp__claude-in-chrome__*`). `evaluate_script` first, `take_screenshot` second, `take_snapshot` last resort.

---

## Jarvis Integration (AI Orchestrator)

Jarvis serves as the central brain across all of Jon's projects.

- **Project:** `C:/Users/jonch/Projects/jarvis/`
- **Cross-Project Intelligence:** `~/.claude/skills/cross-project-intelligence/SKILL.md`
- **Karpathy AutoResearch:** `C:/Users/jonch/Projects/jarvis/docs/karpathy-autoresearch-pattern.md`

Jarvis can orchestrate Ethereal Flame Studio tasks: research visual techniques, generate content briefs, schedule YouTube uploads, and run Karpathy optimization loops on video performance metrics.

---

## Reference Images Location

`/references/` folder contains target visuals:
- `Beginsmall.png` - Flame at rest (small orb)
- `skybox-with-flame.png` - Flame with visible starfield
- `mist-mode.png` - Ethereal Mist mode
- `flame-over-water.png` - Target aesthetic
