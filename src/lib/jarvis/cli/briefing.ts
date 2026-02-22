#!/usr/bin/env tsx
/**
 * CLI: Briefing - Generate morning/evening briefings
 *
 * Usage:
 *   npx tsx src/lib/jarvis/cli/briefing.ts morning
 *   npx tsx src/lib/jarvis/cli/briefing.ts evening
 *
 * Phase M2: Agent Zero Domain Skills
 */

import 'dotenv/config';
import { taskService, billService, goalService, habitService } from '../data/services';

async function main() {
  const [type] = process.argv.slice(2);

  try {
    switch (type) {
      case 'morning': {
        const { today, overdue } = await taskService.getTodayAndOverdue();
        const upcomingBills = await billService.getAll({ timeframe: 'this_week', unpaidOnly: true });
        const billTotal = await billService.getUpcomingTotal(7);
        const activeGoals = await goalService.getAll({ status: 'in_progress' });
        const dailyHabits = await habitService.getAll({ frequency: 'daily' });

        console.log(JSON.stringify({
          success: true,
          type: 'morning',
          briefing: {
            tasks: { today: today.length, overdue: overdue.length, items: [...overdue, ...today] },
            bills: { upcoming: upcomingBills.length, total: billTotal, items: upcomingBills },
            goals: { active: activeGoals.length, items: activeGoals },
            habits: { daily: dailyHabits.length, items: dailyHabits },
          },
        }));
        break;
      }
      case 'evening': {
        const allTasks = await taskService.getAll({ status: 'all' });
        const completedToday = allTasks.filter((t) =>
          t.status === 'completed' &&
          t.updatedAt.startsWith(new Date().toISOString().split('T')[0])
        );
        const { today: remaining } = await taskService.getTodayAndOverdue();

        console.log(JSON.stringify({
          success: true,
          type: 'evening',
          briefing: {
            completed: { count: completedToday.length, items: completedToday },
            remaining: { count: remaining.length, items: remaining },
          },
        }));
        break;
      }
      default:
        error(`Unknown briefing type: ${type}. Use: morning, evening`);
    }
  } catch (err) {
    error(err instanceof Error ? err.message : 'Unknown error');
  }
}

function error(msg: string) {
  console.error(`[briefing-cli] ${msg}`);
  console.log(JSON.stringify({ success: false, error: msg }));
  process.exitCode = 1;
}

main();
