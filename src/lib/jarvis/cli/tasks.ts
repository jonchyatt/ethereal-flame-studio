#!/usr/bin/env tsx
/**
 * CLI: Tasks - Query, create, update tasks
 *
 * JSON stdout, diagnostics to stderr, exit code 0/1.
 * Container-path compatible (runs from Agent Zero Docker).
 *
 * Usage:
 *   npx tsx src/lib/jarvis/cli/tasks.ts list [--filter today|overdue|this_week]
 *   npx tsx src/lib/jarvis/cli/tasks.ts create --title "Buy milk" [--due 2026-02-23] [--priority high]
 *   npx tsx src/lib/jarvis/cli/tasks.ts complete --id 5
 *   npx tsx src/lib/jarvis/cli/tasks.ts update --id 5 --status in_progress
 *
 * Phase M2: Agent Zero Domain Skills
 */

import 'dotenv/config';
import { taskService } from '../data/services';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  try {
    switch (command) {
      case 'list': {
        const filter = getArg(args, '--filter') as 'today' | 'overdue' | 'this_week' | undefined;
        const status = getArg(args, '--status') as 'not_started' | 'in_progress' | 'completed' | undefined;
        const tasks = await taskService.getAll({ dueFilter: filter || 'all', status: status || 'all' });
        console.log(JSON.stringify({ success: true, count: tasks.length, tasks }));
        break;
      }
      case 'create': {
        const title = getArg(args, '--title');
        if (!title) { error('--title is required'); return; }
        const task = await taskService.create({
          title,
          dueDate: getArg(args, '--due') || undefined,
          priority: getArg(args, '--priority') || undefined,
        });
        console.log(JSON.stringify({ success: true, task }));
        break;
      }
      case 'complete': {
        const id = Number(getArg(args, '--id'));
        if (!id) { error('--id is required'); return; }
        const task = await taskService.complete(id);
        console.log(JSON.stringify({ success: !!task, task: task || null }));
        break;
      }
      case 'update': {
        const id = Number(getArg(args, '--id'));
        if (!id) { error('--id is required'); return; }
        const updates: Record<string, string> = {};
        for (const field of ['status', 'title', 'priority'] as const) {
          const val = getArg(args, `--${field}`);
          if (val) updates[field] = val;
        }
        const task = await taskService.update(id, updates);
        console.log(JSON.stringify({ success: !!task, task: task || null }));
        break;
      }
      case 'today': {
        const result = await taskService.getTodayAndOverdue();
        console.log(JSON.stringify({ success: true, ...result }));
        break;
      }
      default:
        error(`Unknown command: ${command}. Use: list, create, complete, update, today`);
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
  console.error(`[tasks-cli] ${msg}`);
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exitCode = 1;
}

main();
