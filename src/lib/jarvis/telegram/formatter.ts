/**
 * Telegram Message Formatter
 *
 * Formats briefing data and tool results for Telegram's plain text display.
 * Uses plain text (not MarkdownV2) for most responses to avoid escaping issues.
 *
 * Phase 15: Telegram Control
 */

import type { BriefingData } from '../executive/types';

/**
 * Format BriefingData for Telegram (plain text, no markdown).
 */
export function formatBriefingForTelegram(data: BriefingData): string {
  const lines: string[] = ['Good morning. Here\'s your briefing:\n'];

  // Tasks
  if (data.tasks.today.length > 0 || data.tasks.overdue.length > 0) {
    lines.push('TASKS:');
    if (data.tasks.overdue.length > 0) {
      lines.push(`  Overdue (${data.tasks.overdue.length}):`);
      data.tasks.overdue.slice(0, 3).forEach(t =>
        lines.push(`  ! ${t.title}${t.dueDate ? ` (was due ${t.dueDate})` : ''}`)
      );
    }
    if (data.tasks.today.length > 0) {
      lines.push(`  Today (${data.tasks.today.length}):`);
      data.tasks.today.slice(0, 5).forEach(t =>
        lines.push(`  - ${t.title}${t.priority ? ` [${t.priority}]` : ''}`)
      );
      if (data.tasks.today.length > 5) {
        lines.push(`  ... and ${data.tasks.today.length - 5} more`);
      }
    }
    lines.push('');
  }

  // Bills
  if (data.bills.thisWeek.length > 0) {
    lines.push('BILLS DUE:');
    data.bills.thisWeek.forEach(b =>
      lines.push(`  - ${b.title}: $${b.amount}${b.dueDate ? ` (${b.dueDate})` : ''}`)
    );
    lines.push('');
  }

  // Habits
  if (data.habits.active.length > 0) {
    lines.push('HABITS:');
    data.habits.active.slice(0, 5).forEach(h =>
      lines.push(`  - ${h.title}${h.streak > 0 ? ` (${h.streak}-day streak)` : ''}`)
    );
    lines.push('');
  }

  // Goals
  if (data.goals.active.length > 0) {
    lines.push('GOALS:');
    data.goals.active.slice(0, 3).forEach(g =>
      lines.push(`  - ${g.title}: ${g.status}`)
    );
  }

  return lines.join('\n');
}

/**
 * Split a message into chunks (Telegram 4096 char limit).
 * Splits at newlines to preserve structure.
 */
export function splitMessage(text: string, maxLength = 4000): string[] {
  if (text.length <= maxLength) return [text];

  const chunks: string[] = [];
  let current = '';

  for (const line of text.split('\n')) {
    if ((current + '\n' + line).length > maxLength) {
      if (current) chunks.push(current.trim());
      current = line;
    } else {
      current += (current ? '\n' : '') + line;
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}
