# Ethereal Flame Studio

## Testing

**Default testing tool: Vercel MCP**

---

## ITERATIVE TESTING PROTOCOL (MANDATORY)

**CRITICAL: ALWAYS follow this protocol for EVERY test iteration. Never skip steps.**

### STEP 1: KILL ALL BACKGROUND PROCESSES (ALWAYS DO THIS FIRST)

Before ANY testing, run these commands to prevent process buildup:

```bash
# Kill any running Next.js dev servers
taskkill /F /IM node.exe /FI "WINDOWTITLE eq *next*" 2>nul
# Kill any processes on common dev ports
npx kill-port 3000 3001 3002 3003 3004 3005
# Verify nothing is running
netstat -ano | findstr :3000 | findstr LISTENING
netstat -ano | findstr :3001 | findstr LISTENING
netstat -ano | findstr :3002 | findstr LISTENING
```

If processes are still running, use `taskkill /F /PID <pid>` to force kill them.

### STEP 2: START FRESH SERVER

```bash
cd C:\Users\jonch\Projects\ethereal-flame-studio
npm run dev
```

Wait for "Ready" message before proceeding.

### STEP 3: DEPLOY PREVIEW TO VERCEL

Use Vercel MCP or CLI to deploy a preview:

```bash
vercel --yes
```

This creates an isolated preview URL for testing.

### STEP 4: TEST THE SPECIFIC FEATURE

Test whatever is being worked on:
- **Buttons**: Click each button, verify expected behavior
- **Sliders**: Move sliders to min/max/middle, verify visual changes
- **Audio reactivity**: Upload audio, verify particles/skybox respond
- **Mode switches**: Switch between Flame/Mist modes
- **Presets**: Test each preset option

### STEP 5: TAKE SCREENSHOTS

Use Vercel MCP to capture screenshots at key states:
- Initial load state
- After each interaction
- Error states if any occur

Screenshots should be saved to `test-screenshots/` with descriptive names.

### STEP 6: VERIFY VISUAL EFFECTS

Check against reference images in `references/`:
- Orb size (should be 10-15% of screen)
- Colors visible (yellow → orange → red, NOT whited out)
- Skybox stars visible behind orb
- Animations smooth and responsive

### STEP 7: DOCUMENT ISSUES

If issues found:
1. Note the exact problem
2. Note which component/file likely causes it
3. Take a screenshot of the issue

### STEP 8: FIX AND RE-TEST

After making fixes:
1. **GO BACK TO STEP 1** - Kill all background processes
2. Start fresh server
3. Deploy new preview
4. Test again

**NEVER skip the kill step between iterations.**

---

## Quick Reference: Process Cleanup Commands

```bash
# Nuclear option - kill ALL node processes (use carefully)
taskkill /F /IM node.exe

# Kill specific port
npx kill-port 3000

# Check what's using a port
netstat -ano | findstr :3000

# Kill by PID
taskkill /F /PID 12345
```

---

## Development Commands

- `npm run dev` - Start local development server
- `npm run build` - Build for production
- `vercel --yes` - Deploy preview to Vercel (auto-confirm)
- `vercel --prod` - Deploy to production

---

## Reference Images Location

`/references/` folder contains target visuals:
- `Beginsmall.png` - Flame at rest (small orb)
- `skybox-with-flame.png` - Flame with visible starfield
- `mist-mode.png` - Ethereal Mist mode
- `flame-over-water.png` - Target aesthetic
