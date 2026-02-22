# Ethereal Flame Studio

## TESTING RULE (MANDATORY — NO EXCEPTIONS)

**DO NOT spin up local dev servers, Vercel previews, or any test environments.**

Testing workflow:
1. Write the code
2. Push to GitHub
3. It auto-deploys to https://www.whatamiappreciatingnow.com/
4. Test from the live site

**What is FORBIDDEN:**
- `npm run dev` for testing purposes
- `vercel --yes` or any Vercel preview deploys
- Starting background dev servers
- Any local test environment whatsoever
- Playwright/browser automation against localhost

**Why:** Local/preview testing wastes tokens. The GitHub → auto-deploy pipeline is the only testing path.

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
