#!/usr/bin/env tsx
/**
 * CLI: Bills - Query and manage bills/subscriptions
 *
 * Usage:
 *   npx tsx src/lib/jarvis/cli/bills.ts list [--timeframe this_week|this_month]
 *   npx tsx src/lib/jarvis/cli/bills.ts create --title "Netflix" --amount 15.99 [--due 2026-03-01]
 *   npx tsx src/lib/jarvis/cli/bills.ts pay --id 3
 *   npx tsx src/lib/jarvis/cli/bills.ts total [--days 30]
 *
 * Phase M2: Agent Zero Domain Skills
 */

import 'dotenv/config';
import { billService } from '../data/services';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'list': {
        const timeframe = getArg(args, '--timeframe') as 'this_week' | 'this_month' | undefined;
        const unpaid = args.includes('--unpaid');
        const bills = await billService.getAll({ timeframe: timeframe || 'all', unpaidOnly: unpaid });
        console.log(JSON.stringify({ success: true, count: bills.length, bills }));
        break;
      }
      case 'create': {
        const title = getArg(args, '--title');
        if (!title) { error('--title is required'); return; }
        const bill = await billService.create({
          title,
          amount: getArg(args, '--amount') ? Number(getArg(args, '--amount')) : undefined,
          dueDate: getArg(args, '--due') || undefined,
          category: getArg(args, '--category') || undefined,
        });
        console.log(JSON.stringify({ success: true, bill }));
        break;
      }
      case 'pay': {
        const id = Number(getArg(args, '--id'));
        if (!id) { error('--id is required'); return; }
        const bill = await billService.markPaid(id);
        console.log(JSON.stringify({ success: !!bill, bill: bill || null }));
        break;
      }
      case 'total': {
        const days = Number(getArg(args, '--days') || '30');
        const total = await billService.getUpcomingTotal(days);
        console.log(JSON.stringify({ success: true, total, days }));
        break;
      }
      default:
        error(`Unknown command: ${command}. Use: list, create, pay, total`);
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
  console.error(`[bills-cli] ${msg}`);
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exitCode = 1;
}

main();
