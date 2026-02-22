#!/usr/bin/env tsx
/**
 * CLI: Habits - Query and track habits
 *
 * Usage:
 *   npx tsx src/lib/jarvis/cli/habits.ts list [--frequency daily|weekly]
 *   npx tsx src/lib/jarvis/cli/habits.ts done --id 3
 *
 * Phase M2: Agent Zero Domain Skills
 */

import 'dotenv/config';
import { habitService } from '../data/services';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'list': {
        const frequency = getArg(args, '--frequency') as 'daily' | 'weekly' | 'monthly' | undefined;
        const habits = await habitService.getAll({ frequency: frequency || 'all' });
        console.log(JSON.stringify({ success: true, count: habits.length, habits }));
        break;
      }
      case 'done': {
        const id = Number(getArg(args, '--id'));
        if (!id) { error('--id is required'); return; }
        const habit = await habitService.logCompletion(id);
        console.log(JSON.stringify({ success: !!habit, habit: habit || null }));
        break;
      }
      default:
        error(`Unknown command: ${command}. Use: list, done`);
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
  console.error(`[habits-cli] ${msg}`);
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exitCode = 1;
}

main();
