# Ethereal Flame Studio

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

## Reference Images Location

`/references/` folder contains target visuals:
- `Beginsmall.png` - Flame at rest (small orb)
- `skybox-with-flame.png` - Flame with visible starfield
- `mist-mode.png` - Ethereal Mist mode
- `flame-over-water.png` - Target aesthetic
