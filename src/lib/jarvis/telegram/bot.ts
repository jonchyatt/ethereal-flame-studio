/**
 * Telegram Bot Instance + Handlers
 *
 * Lazy singleton bot with command handlers and plain text chat.
 * Uses grammY for TypeScript-native Telegram API.
 *
 * Phase 15: Telegram Control
 */

import { Bot } from 'grammy';
import { buildSystemPromptContext } from './context';
import { buildSystemPrompt } from '../intelligence/systemPrompt';
import { processChatMessage } from '../intelligence/chatProcessor';
import { getOrCreateSession } from '../memory/queries/sessions';
import { executeNotionTool } from '../notion/toolExecutor';
import { executeMemoryTool } from '../memory/toolExecutor';
import { buildMorningBriefing } from '../executive/BriefingBuilder';
import { formatBriefingForTelegram, splitMessage } from './formatter';

/** Lazy singleton — created on first use */
let botInstance: Bot | null = null;

export function getTelegramBot(): Bot {
  if (botInstance) return botInstance;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

  const bot = new Bot(token);
  const ownerId = process.env.TELEGRAM_OWNER_ID;

  // Owner-only middleware (single-user system)
  if (ownerId) {
    bot.use(async (ctx, next) => {
      const userId = ctx.from?.id?.toString();
      if (userId !== ownerId) {
        console.warn(`[Telegram] Unauthorized user: ${userId}`);
        await ctx.reply('This bot is private.');
        return;
      }
      await next();
    });
  }

  // --- Commands ---

  bot.command('start', async (ctx) => {
    await ctx.reply(
      'Welcome to Jarvis.\n\n' +
      'I can manage your tasks, bills, and memories. ' +
      'Just talk to me naturally, or use commands:\n\n' +
      '/briefing - Morning briefing\n' +
      '/tasks - Today\'s tasks\n' +
      '/bills - Upcoming bills\n' +
      '/remember <text> - Save a fact\n' +
      '/forget <text> - Remove a fact\n' +
      '/help - Show commands'
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Commands:\n\n' +
      '/briefing - Morning briefing with tasks, bills, habits\n' +
      '/tasks - Show today\'s tasks\n' +
      '/bills - Show upcoming unpaid bills\n' +
      '/remember <text> - Remember a fact\n' +
      '/forget <text> - Forget a fact\n' +
      '/help - This message\n\n' +
      'Or just send me a message and I\'ll respond naturally.'
    );
  });

  bot.command('briefing', async (ctx) => {
    try {
      const data = await buildMorningBriefing();
      const text = formatBriefingForTelegram(data);
      for (const chunk of splitMessage(text)) {
        await ctx.reply(chunk);
      }
    } catch (error) {
      console.error('[Telegram] Briefing error:', error);
      await ctx.reply('Had trouble fetching your briefing. Try again in a moment.');
    }
  });

  bot.command('tasks', async (ctx) => {
    try {
      const session = await getOrCreateSession();
      const result = await executeNotionTool('query_tasks', { filter: 'today' }, session.id);
      for (const chunk of splitMessage(result)) {
        await ctx.reply(chunk);
      }
    } catch (error) {
      console.error('[Telegram] Tasks error:', error);
      await ctx.reply('Had trouble fetching tasks.');
    }
  });

  bot.command('bills', async (ctx) => {
    try {
      const session = await getOrCreateSession();
      const result = await executeNotionTool('query_bills', {
        timeframe: 'this_month', unpaidOnly: true,
      }, session.id);
      for (const chunk of splitMessage(result)) {
        await ctx.reply(chunk);
      }
    } catch (error) {
      console.error('[Telegram] Bills error:', error);
      await ctx.reply('Had trouble fetching bills.');
    }
  });

  bot.command('remember', async (ctx) => {
    const text = ctx.match;
    if (!text) {
      await ctx.reply('Usage: /remember <fact to save>');
      return;
    }
    try {
      const session = await getOrCreateSession();
      const result = await executeMemoryTool('remember_fact', {
        content: text, category: 'other', source: 'user_explicit',
      }, session.id);
      try {
        const parsed = JSON.parse(result);
        await ctx.reply(parsed.success ? 'Got it, I\'ll remember that.' : `Error: ${parsed.error}`);
      } catch {
        await ctx.reply('Got it, I\'ll remember that.');
      }
    } catch (error) {
      console.error('[Telegram] Remember error:', error);
      await ctx.reply('Had trouble saving that.');
    }
  });

  bot.command('forget', async (ctx) => {
    const query = ctx.match;
    if (!query) {
      await ctx.reply('Usage: /forget <what to forget>');
      return;
    }
    try {
      const session = await getOrCreateSession();
      const result = await executeMemoryTool('forget_fact', { query }, session.id);
      try {
        const parsed = JSON.parse(result);
        if (parsed.candidates?.length > 0) {
          const list = parsed.candidates
            .map((c: { id: number; content: string }, i: number) => `${i + 1}. ${c.content} (ID: ${c.id})`)
            .join('\n');
          await ctx.reply(`Found matches:\n${list}\n\nTo delete, send: /forget_confirm <id>`);
        } else {
          await ctx.reply(`No memories matching "${query}".`);
        }
      } catch {
        await ctx.reply(result);
      }
    } catch (error) {
      console.error('[Telegram] Forget error:', error);
      await ctx.reply('Had trouble searching memories.');
    }
  });

  bot.command('forget_confirm', async (ctx) => {
    const idStr = ctx.match;
    if (!idStr) {
      await ctx.reply('Usage: /forget_confirm <id>');
      return;
    }
    try {
      const session = await getOrCreateSession();
      const result = await executeMemoryTool('forget_fact', {
        query: '_', confirm_ids: idStr,
      }, session.id);
      try {
        const parsed = JSON.parse(result);
        await ctx.reply(parsed.success ? 'Memory deleted.' : `Error: ${parsed.error}`);
      } catch {
        await ctx.reply('Memory deleted.');
      }
    } catch (error) {
      console.error('[Telegram] Forget confirm error:', error);
      await ctx.reply('Had trouble deleting that memory.');
    }
  });

  // --- Plain text: full Claude chat ---

  bot.on('message:text', async (ctx) => {
    const userText = ctx.message.text;
    try {
      const session = await getOrCreateSession();
      const promptContext = await buildSystemPromptContext(session.id);
      const systemPrompt = buildSystemPrompt(promptContext);

      const result = await processChatMessage({
        sessionId: session.id,
        systemPrompt,
        messages: [{ role: 'user', content: userText }],
      });

      const responseText = result.success
        ? result.responseText || 'Done.'
        : (result.error || 'Something went wrong.');

      for (const chunk of splitMessage(responseText)) {
        await ctx.reply(chunk);
      }
    } catch (error) {
      console.error('[Telegram] Message error:', error);
      await ctx.reply('Had trouble processing that. Try again.');
    }
  });

  botInstance = bot;
  return bot;
}
