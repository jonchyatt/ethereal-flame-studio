#!/usr/bin/env tsx
/**
 * CLI: Goals - Query and track goals
 *
 * Usage:
 *   npx tsx src/lib/jarvis/cli/goals.ts list [--status active|achieved]
 *   npx tsx src/lib/jarvis/cli/goals.ts progress --id 2 --value 75
 *
 * Phase M2: Agent Zero Domain Skills
 */

import 'dotenv/config';
import { goalService } from '../data/services';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'list': {
        const status = getArg(args, '--status') as 'not_started' | 'in_progress' | 'achieved' | undefined;
        const goals = await goalService.getAll({ status: status || 'all' });
        console.log(JSON.stringify({ success: true, count: goals.length, goals }));
        break;
      }
      case 'progress': {
        const id = Number(getArg(args, '--id'));
        const value = Number(getArg(args, '--value'));
        if (!id) { error('--id is required'); return; }
        if (isNaN(value)) { error('--value is required (0-100)'); return; }
        const goal = await goalService.updateProgress(id, value);
        console.log(JSON.stringify({ success: !!goal, goal: goal || null }));
        break;
      }
      default:
        error(`Unknown command: ${command}. Use: list, progress`);
    }
  } catch (err) {
    error(err instanceof Error ? err.message : 'Unknown error');
  }
}

function getArg(args: string[], flag: string): string | null {
  const idx = args.indexOf(flag);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : null;
}

function error(msg: string) {
  console.error(`[goals-cli] ${msg}`);
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exitCode = 1;
}

main();
