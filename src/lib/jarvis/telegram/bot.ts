/**
 * Telegram Bot Instance + Handlers
 *
 * Lazy singleton bot with command handlers and plain text chat.
 * Uses grammY for TypeScript-native Telegram API.
 *
 * Phase 15: Telegram Control
 */

import { Bot, InlineKeyboard, Context } from 'grammy';
import { buildSystemPromptContext } from './context';
import { buildSystemPrompt } from '../intelligence/systemPrompt';
import { processChatMessage } from '../intelligence/chatProcessor';
import { getOrCreateSession } from '../memory/queries/sessions';
import { executeNotionTool } from '../notion/toolExecutor';
import { executeMemoryTool } from '../memory/toolExecutor';
import { buildMorningBriefing } from '../executive/BriefingBuilder';
import { getDateInTimezone } from '../notion/schemas';
import { formatBriefingForTelegram, splitMessage } from './formatter';
import { transcribeAudioBuffer } from './stt';

type TaskAction = { id: string; title: string };
type ToolRunStatus = 'running' | 'done' | 'error';
type TelegramContext = Context;

const MAX_TASK_ACTIONS = 5;
const STATUS_EDIT_THROTTLE_MS = 1200;
const pendingVoiceByChatId = new Map<string, { text: string; createdAt: number }>();
const lastUserMessageByChatId = new Map<string, string>();

function buildQuickActionsKeyboard(): InlineKeyboard {
  return new InlineKeyboard()
    .text('Briefing', 'action:briefing')
    .text("Today's tasks", 'action:tasks')
    .row()
    .text('Bills', 'action:bills');
}

function buildTaskActionsKeyboard(tasks: TaskAction[]): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  tasks.forEach((task, index) => {
    const label = `${index + 1}. ${truncateLabel(task.title, 24)}`;
    keyboard
      .text(`Done ${label}`, `task:done:${task.id}`)
      .text(`Snooze ${label}`, `task:snooze:${task.id}`)
      .row();
  });
  return keyboard;
}

function buildRetryKeyboard(): InlineKeyboard {
  return new InlineKeyboard().text('Retry', 'retry:last');
}

function buildRetryActionKeyboard(callbackData: string): InlineKeyboard {
  return new InlineKeyboard().text('Retry', callbackData);
}

function truncateLabel(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1)}...`;
}

function extractTasksFromToolResult(result: string): TaskAction[] {
  const tasks: TaskAction[] = [];
  const lines = result.split('\n');

  for (const line of lines) {
    const idMatch = line.match(/\[id:([0-9a-f-]+)\]/i);
    if (!idMatch) continue;

    const id = idMatch[1];
    let title = line.replace(/\s*\[id:[^\]]+\]\s*$/, '');
    title = title.replace(/^-\s*/, '');
    title = title.split('(')[0].trim();
    if (!title) continue;

    tasks.push({ id, title });
    if (tasks.length >= MAX_TASK_ACTIONS) break;
  }

  return tasks;
}

function isLikelyToolError(result: string): boolean {
  const lower = result.toLowerCase();
  return lower.includes('error') || lower.includes('trouble') || lower.includes('failed');
}

function renderStatusText(
  tools: Array<{ name: string; status: ToolRunStatus }>,
  state: ToolRunStatus
): string {
  const header =
    state === 'done'
      ? 'Done.'
      : state === 'error'
        ? 'Something went wrong.'
        : 'Working...';
  const lines = [header];
  for (const tool of tools) {
    lines.push(`- ${tool.name}: ${tool.status}`);
  }
  return lines.join('\n');
}

async function sendChunksWithKeyboard(
  ctx: TelegramContext,
  text: string,
  keyboard?: InlineKeyboard
): Promise<void> {
  const chunks = splitMessage(text);
  for (let i = 0; i < chunks.length; i += 1) {
    const isLast = i === chunks.length - 1;
    if (isLast && keyboard) {
      await ctx.reply(chunks[i], { reply_markup: keyboard });
    } else {
      await ctx.reply(chunks[i]);
    }
  }
}

async function sendTaskActions(
  ctx: TelegramContext,
  tasks: TaskAction[]
): Promise<void> {
  if (tasks.length === 0) return;

  const lines = ['Task actions:'];
  tasks.forEach((task, index) => {
    lines.push(`${index + 1}. ${task.title}`);
  });

  await ctx.reply(lines.join('\n'), {
    reply_markup: buildTaskActionsKeyboard(tasks),
  });
}

async function downloadTelegramFile(
  ctx: TelegramContext,
  fileId: string
): Promise<Buffer> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN not set');

  const file = await ctx.api.getFile(fileId);
  if (!file.file_path) throw new Error('Telegram file path missing');

  const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function processChatWithProgress(
  ctx: TelegramContext,
  userText: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  lastUserMessageByChatId.set(String(chatId), userText);

  const statusMessage = await ctx.reply('Working...');
  const statusMessageId = statusMessage.message_id;

  const toolRuns: Array<{ name: string; status: ToolRunStatus }> = [];
  const toolTasks: TaskAction[] = [];
  let finalState: ToolRunStatus = 'running';
  let lastStatusText = '';
  let lastEditAt = 0;
  let editTimer: NodeJS.Timeout | null = null;

  const updateStatus = async (force = false) => {
    const now = Date.now();
    if (!force && now - lastEditAt < STATUS_EDIT_THROTTLE_MS) {
      if (!editTimer) {
        editTimer = setTimeout(() => updateStatus(true), STATUS_EDIT_THROTTLE_MS - (now - lastEditAt));
      }
      return;
    }

    editTimer = null;
    const text = renderStatusText(toolRuns, finalState);
    if (text === lastStatusText) return;

    try {
      await ctx.api.editMessageText(chatId, statusMessageId, text);
      lastStatusText = text;
      lastEditAt = Date.now();
    } catch (error) {
      console.warn('[Telegram] Failed to update status message:', error);
    }
  };

  const typingInterval = setInterval(() => {
    ctx.api.sendChatAction(chatId, 'typing').catch(() => {});
  }, 4000);

  try {
    const session = await getOrCreateSession();
    const promptContext = await buildSystemPromptContext(session.id);
    const systemPrompt = buildSystemPrompt(promptContext);

    const result = await processChatMessage({
      sessionId: session.id,
      systemPrompt,
      messages: [{ role: 'user', content: userText }],
      onToolUse: (name) => {
        toolRuns.push({ name, status: 'running' });
        updateStatus().catch(() => {});
      },
      onToolResult: (name, resultText) => {
        const entry = toolRuns.find((tool) => tool.name === name && tool.status === 'running');
        const status: ToolRunStatus = isLikelyToolError(resultText) ? 'error' : 'done';
        if (entry) {
          entry.status = status;
        } else {
          toolRuns.push({ name, status });
        }

        if (name === 'query_tasks') {
          toolTasks.splice(0, toolTasks.length, ...extractTasksFromToolResult(resultText));
        }

        updateStatus().catch(() => {});
      },
    });

    finalState = result.success ? 'done' : 'error';
    await updateStatus(true);

    if (result.success) {
      const responseText = result.responseText || 'Done.';
      await sendChunksWithKeyboard(ctx, responseText, buildQuickActionsKeyboard());
    } else {
      const errorMessage = result.error || result.responseText || 'Unknown error';
      const summary = errorMessage.length > 200 ? `${errorMessage.slice(0, 200)}...` : errorMessage;
      await ctx.reply(`Sorry, I ran into a problem. ${summary}`, {
        reply_markup: buildRetryKeyboard(),
      });
    }

    if (toolTasks.length > 0) {
      await sendTaskActions(ctx, toolTasks);
    }
  } finally {
    clearInterval(typingInterval);
  }
}

async function handleVoiceMessage(
  ctx: TelegramContext,
  fileId: string,
  mimeType: string
): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const statusMessage = await ctx.reply('Transcribing voice note...');

  try {
    const buffer = await downloadTelegramFile(ctx, fileId);
    const transcript = await transcribeAudioBuffer(buffer, mimeType || 'audio/ogg');

    if (!transcript) {
      await ctx.api.editMessageText(chatId, statusMessage.message_id, 'I could not detect any speech.');
      return;
    }

    pendingVoiceByChatId.set(String(chatId), { text: transcript, createdAt: Date.now() });
    const keyboard = new InlineKeyboard()
      .text('Confirm', 'voice:confirm')
      .text('Cancel', 'voice:cancel');

    await ctx.api.editMessageText(
      chatId,
      statusMessage.message_id,
      `I heard:\n"${transcript}"\n\nSend it?`,
      { reply_markup: keyboard }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await ctx.api.editMessageText(
      chatId,
      statusMessage.message_id,
      `Voice transcription failed: ${message}`
    );
  }
}

async function sendBriefing(ctx: TelegramContext): Promise<void> {
  const data = await buildMorningBriefing();
  const text = formatBriefingForTelegram(data);
  await sendChunksWithKeyboard(ctx, text, buildQuickActionsKeyboard());
}

async function sendTasks(ctx: TelegramContext): Promise<void> {
  const session = await getOrCreateSession();
  const result = await executeNotionTool('query_tasks', { filter: 'today' }, session.id);
  await sendChunksWithKeyboard(ctx, result, buildQuickActionsKeyboard());

  const tasks = extractTasksFromToolResult(result);
  if (tasks.length > 0) {
    await sendTaskActions(ctx, tasks);
  }
}

async function sendBills(ctx: TelegramContext): Promise<void> {
  const session = await getOrCreateSession();
  const result = await executeNotionTool(
    'query_bills',
    { timeframe: 'this_month', unpaidOnly: true },
    session.id
  );
  await sendChunksWithKeyboard(ctx, result, buildQuickActionsKeyboard());
}

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
      'I can manage your tasks, bills, goals, habits, and memories. ' +
      'Just talk to me naturally, or use commands:\n\n' +
      '/briefing - Morning briefing\n' +
      '/tasks - Today\'s tasks\n' +
      '/bills - Upcoming bills\n' +
      '/goals - Active goals\n' +
      '/habits - Daily habits\n' +
      '/meal - Today\'s meal plan\n' +
      '/remember <text> - Save a fact\n' +
      '/forget <text> - Remove a fact\n' +
      '/help - Show commands',
      { reply_markup: buildQuickActionsKeyboard() }
    );
  });

  bot.command('help', async (ctx) => {
    await ctx.reply(
      'Commands:\n\n' +
      '/briefing - Morning briefing with tasks, bills, habits\n' +
      '/tasks - Show today\'s tasks\n' +
      '/bills - Show upcoming unpaid bills\n' +
      '/goals - Show active goals\n' +
      '/habits - Show daily habits\n' +
      '/meal - Today\'s meal plan\n' +
      '/remember <text> - Remember a fact\n' +
      '/forget <text> - Forget a fact\n' +
      '/help - This message\n\n' +
      'Or just send me a message and I\'ll respond naturally.',
      { reply_markup: buildQuickActionsKeyboard() }
    );
  });

  bot.command('briefing', async (ctx) => {
    try {
      await sendBriefing(ctx);
    } catch (error) {
      console.error('[Telegram] Briefing error:', error);
      await ctx.reply('Had trouble fetching your briefing. Try again in a moment.');
    }
  });

  bot.command('tasks', async (ctx) => {
    try {
      await sendTasks(ctx);
    } catch (error) {
      console.error('[Telegram] Tasks error:', error);
      await ctx.reply('Had trouble fetching tasks.');
    }
  });

  bot.command('bills', async (ctx) => {
    try {
      await sendBills(ctx);
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

  bot.command('goals', async (ctx) => {
    try {
      const session = await getOrCreateSession();
      const result = await executeNotionTool('query_goals', { status: 'active' }, session.id);
      await sendChunksWithKeyboard(ctx, result, buildQuickActionsKeyboard());
    } catch (error) {
      console.error('[Telegram] Goals error:', error);
      await ctx.reply('Had trouble fetching goals.');
    }
  });

  bot.command('habits', async (ctx) => {
    try {
      const session = await getOrCreateSession();
      const result = await executeNotionTool('query_habits', { frequency: 'daily' }, session.id);
      await sendChunksWithKeyboard(ctx, result, buildQuickActionsKeyboard());
    } catch (error) {
      console.error('[Telegram] Habits error:', error);
      await ctx.reply('Had trouble fetching habits.');
    }
  });

  bot.command('meal', async (ctx) => {
    try {
      await processChatWithProgress(ctx, "What's on my meal plan for today?");
    } catch (error) {
      console.error('[Telegram] Meal error:', error);
      await ctx.reply('Had trouble fetching meal plan.');
    }
  });

  // --- Inline button callbacks ---

  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data;
    const chatId = ctx.chat?.id;

    await ctx.answerCallbackQuery().catch(() => {});
    if (!chatId || !data) return;

    if (data === 'action:briefing') {
      await sendBriefing(ctx);
      return;
    }

    if (data === 'action:tasks') {
      await sendTasks(ctx);
      return;
    }

    if (data === 'action:bills') {
      await sendBills(ctx);
      return;
    }

    if (data === 'retry:last') {
      const lastMessage = lastUserMessageByChatId.get(String(chatId));
      if (!lastMessage) {
        await ctx.reply('Nothing to retry yet.');
        return;
      }
      await processChatWithProgress(ctx, lastMessage);
      return;
    }

    if (data === 'voice:confirm') {
      const pending = pendingVoiceByChatId.get(String(chatId));
      if (!pending) {
        await ctx.reply('No pending voice note to confirm.');
        return;
      }
      pendingVoiceByChatId.delete(String(chatId));
      await processChatWithProgress(ctx, pending.text);
      return;
    }

    if (data === 'voice:cancel') {
      pendingVoiceByChatId.delete(String(chatId));
      try {
        await ctx.editMessageText('Canceled.');
      } catch {
        await ctx.reply('Canceled.');
      }
      return;
    }

    if (data.startsWith('task:done:')) {
      const taskId = data.replace('task:done:', '');
      try {
        const session = await getOrCreateSession();
        const result = await executeNotionTool(
          'update_task_status',
          { task_id: taskId, new_status: 'completed' },
          session.id
        );
        await ctx.reply(result);
      } catch (error) {
        console.error('[Telegram] Task complete error:', error);
        await ctx.reply('Had trouble marking that task complete.', {
          reply_markup: buildRetryActionKeyboard(`task:done:${taskId}`),
        });
      }
      return;
    }

    if (data.startsWith('task:snooze:')) {
      const taskId = data.replace('task:snooze:', '');
      try {
        const session = await getOrCreateSession();
        const until = getDateInTimezone(1);
        const result = await executeNotionTool(
          'pause_task',
          { task_id: taskId, until },
          session.id
        );
        await ctx.reply(result);
      } catch (error) {
        console.error('[Telegram] Task snooze error:', error);
        await ctx.reply('Had trouble snoozing that task.', {
          reply_markup: buildRetryActionKeyboard(`task:snooze:${taskId}`),
        });
      }
      return;
    }
  });

  // --- Voice input ---

  bot.on('message:voice', async (ctx) => {
    const voice = ctx.message.voice;
    await handleVoiceMessage(ctx, voice.file_id, voice.mime_type || 'audio/ogg');
  });

  bot.on('message:audio', async (ctx) => {
    const audio = ctx.message.audio;
    await handleVoiceMessage(ctx, audio.file_id, audio.mime_type || 'audio/mpeg');
  });

  // --- Plain text: full Claude chat ---

  bot.on('message:text', async (ctx) => {
    const userText = ctx.message.text;
    try {
      await processChatWithProgress(ctx, userText);
    } catch (error) {
      console.error('[Telegram] Message error:', error);
      await ctx.reply('Had trouble processing that. Try again.');
    }
  });

  botInstance = bot;
  return bot;
}
