/**
 * Chrome CLI Daemon — Health Monitor & CDP Bridge
 *
 * PM2 daemon mode (jarvis-chrome): monitors Chrome on port 9222 every 5 min,
 * alerts via Telegram if it degrades, sends recovery notification when it comes back.
 *
 * CLI mode:
 *   npx tsx jarvis/scripts/chrome-cli.ts health    — one-shot health check
 *   npx tsx jarvis/scripts/chrome-cli.ts tabs      — list open tabs
 *   npx tsx jarvis/scripts/chrome-cli.ts version   — Chrome version info
 */

import http from 'node:http';
import https from 'node:https';
import { resolve } from 'node:path';
import { config } from 'dotenv';

config({ path: resolve(process.cwd(), '.env.local') });

const CHROME_PORT = parseInt(process.env.CHROME_DEBUG_PORT || '9222');
const HEALTH_CHECK_MS = 5 * 60 * 1000; // 5 minutes
const MAX_FAILURES = 3;

let consecutiveFailures = 0;
let alertedDown = false;

// ---------------------------------------------------------------------------
// Chrome CDP helpers
// ---------------------------------------------------------------------------

interface HealthResult {
  ok: boolean;
  version?: Record<string, string>;
  tabs?: number;
  error?: string;
}

function httpGet(url: string, timeoutMs = 5000): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = http.get(url, { timeout: timeoutMs }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms)`));
    });
  });
}

async function checkHealth(): Promise<HealthResult> {
  try {
    const versionRaw = await httpGet(`http://localhost:${CHROME_PORT}/json/version`);
    const version = JSON.parse(versionRaw);

    let tabs = 0;
    try {
      const tabsRaw = await httpGet(`http://localhost:${CHROME_PORT}/json`);
      tabs = JSON.parse(tabsRaw).length;
    } catch {
      // tabs endpoint failure is non-fatal
    }

    return { ok: true, version, tabs };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// Telegram alerts (direct API — no dependency on jarvis-web being up)
// ---------------------------------------------------------------------------

function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_OWNER_ID;

  if (!token || !chatId) {
    console.error('[Chrome Health] TELEGRAM_BOT_TOKEN or TELEGRAM_OWNER_ID not set, skipping alert');
    return Promise.resolve();
  }

  const payload = JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'HTML' });

  return new Promise((res) => {
    const req = https.request(
      {
        hostname: 'api.telegram.org',
        path: `/bot${token}/sendMessage`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
      },
      (resp) => {
        resp.resume();
        resp.on('end', res);
      },
    );
    req.on('error', (e) => {
      console.error('[Chrome Health] Telegram send failed:', e.message);
      res();
    });
    req.write(payload);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// Health monitor loop
// ---------------------------------------------------------------------------

async function runHealthCheck(): Promise<void> {
  const result = await checkHealth();
  const ts = new Date().toLocaleTimeString();

  if (result.ok) {
    if (consecutiveFailures > 0) {
      console.log(`[${ts}] Chrome recovered after ${consecutiveFailures} failure(s). Tabs: ${result.tabs}`);
    }
    if (alertedDown) {
      await sendTelegram('Chrome MCP recovered\nCDP port responding normally.');
      alertedDown = false;
    }
    consecutiveFailures = 0;
  } else {
    consecutiveFailures++;
    console.warn(`[${ts}] Health check failed (${consecutiveFailures}/${MAX_FAILURES}): ${result.error}`);

    if (consecutiveFailures >= MAX_FAILURES && !alertedDown) {
      await sendTelegram(
        `<b>Chrome MCP degraded</b>\n` +
          `Port ${CHROME_PORT} not responding after ${MAX_FAILURES} consecutive checks.\n` +
          `Error: <code>${result.error}</code>\n\n` +
          `Run <code>jarvis\\scripts\\start-chrome-debug.cmd</code> to recover.`,
      );
      alertedDown = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Daemon mode
// ---------------------------------------------------------------------------

function startDaemon(): void {
  console.log(`[Chrome Health] Daemon started — port ${CHROME_PORT}, check every ${HEALTH_CHECK_MS / 1000}s`);

  // Initial check immediately
  runHealthCheck();

  // Periodic checks
  setInterval(runHealthCheck, HEALTH_CHECK_MS);

  // Graceful shutdown
  const shutdown = () => {
    console.log('[Chrome Health] Shutting down');
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ---------------------------------------------------------------------------
// CLI mode
// ---------------------------------------------------------------------------

async function cli(): Promise<void> {
  const cmd = process.argv[2];

  if (!cmd) return startDaemon();

  switch (cmd) {
    case 'health': {
      const r = await checkHealth();
      if (r.ok) {
        console.log(`OK — ${r.version?.Browser ?? 'unknown'}, ${r.tabs} tab(s)`);
      } else {
        console.error(`FAIL — ${r.error}`);
      }
      process.exit(r.ok ? 0 : 1);
      break;
    }

    case 'tabs': {
      try {
        const raw = await httpGet(`http://localhost:${CHROME_PORT}/json`);
        const tabs: any[] = JSON.parse(raw);
        for (const [i, tab] of tabs.entries()) {
          console.log(`${i + 1}. [${tab.type}] ${tab.title}`);
          console.log(`   ${tab.url}`);
        }
        console.log(`\nTotal: ${tabs.length} tab(s)`);
      } catch (e: any) {
        console.error('Chrome not responding:', e.message);
        process.exit(1);
      }
      break;
    }

    case 'version': {
      try {
        const raw = await httpGet(`http://localhost:${CHROME_PORT}/json/version`);
        console.log(JSON.parse(raw));
      } catch (e: any) {
        console.error('Chrome not responding:', e.message);
        process.exit(1);
      }
      break;
    }

    default:
      console.error(`Unknown command: ${cmd}\nUsage: chrome-cli.ts [health|tabs|version]`);
      process.exit(1);
  }
}

cli();
