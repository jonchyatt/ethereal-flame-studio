/**
 * Memory Retrieval Module
 *
 * Fetches relevant memories from the database with time-aware scoring
 * and token budgeting. Enables Jarvis to selectively load context at
 * session start without overflowing the context window.
 */

import { getMemoryEntries } from './queries/memoryEntries';
import type { MemoryEntry } from './schema';

/**
 * Scored memory with human-readable age
 */
export interface ScoredMemory {
  id: number;
  content: string;
  category: string;
  source: string;
  score: number;
  age: string; // "today", "yesterday", "2 days ago", "1 week ago", etc.
}

/**
 * Memory retrieval result with token tracking
 */
export interface MemoryContext {
  entries: ScoredMemory[];
  totalTokens: number;
  truncated: boolean;
}

/**
 * Options for memory retrieval
 */
export interface RetrievalOptions {
  maxTokens?: number; // Default: 1000
  maxEntries?: number; // Default: 10
  currentTime?: Date; // Default: new Date()
}

/**
 * Format a date as human-readable age string
 *
 * @param date - The date to format
 * @param now - Reference time (default: now)
 * @returns Human-readable age: "today", "yesterday", "3 days ago", etc.
 */
export function formatAge(date: Date, now: Date = new Date()): string {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / msPerDay);

  if (diffDays < 0) {
    return 'in the future';
  }

  if (diffDays === 0) {
    return 'today';
  }

  if (diffDays === 1) {
    return 'yesterday';
  }

  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }

  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) {
    return '1 week ago';
  }

  if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  }

  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) {
    return '1 month ago';
  }

  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }

  const diffYears = Math.floor(diffDays / 365);
  if (diffYears === 1) {
    return '1 year ago';
  }

  return `${diffYears} years ago`;
}

/**
 * Estimate token count for text
 *
 * Conservative heuristic: ~4 characters per token
 *
 * @param text - Text to estimate
 * @returns Estimated token count
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Calculate recency score based on when memory was last accessed/created
 *
 * Score range: 0-50 points
 * - Today: 50 points
 * - Yesterday: 40 points
 * - This week: 30 points
 * - This month: 15 points
 * - Older: 5 points
 *
 * @param entry - Memory entry
 * @param now - Reference time
 * @returns Recency score (0-50)
 */
export function calculateRecencyScore(entry: MemoryEntry, now: Date): number {
  const dateStr = entry.lastAccessed || entry.createdAt;
  const date = new Date(dateStr);
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor((now.getTime() - date.getTime()) / msPerDay);

  if (diffDays === 0) return 50; // Today
  if (diffDays === 1) return 40; // Yesterday
  if (diffDays <= 7) return 30; // This week
  if (diffDays <= 30) return 15; // This month
  return 5; // Older
}

/**
 * Calculate category score
 *
 * Score range: 0-30 points
 * - preference: 30 points (user explicitly told Jarvis)
 * - fact: 20 points (important facts)
 * - pattern: 10 points (inferred patterns)
 *
 * @param category - Memory category
 * @returns Category score (0-30)
 */
export function calculateCategoryScore(category: string): number {
  switch (category) {
    case 'preference':
      return 30;
    case 'fact':
      return 20;
    case 'pattern':
      return 10;
    default:
      return 0;
  }
}

/**
 * Calculate source score
 *
 * Score range: 0-20 points
 * - user_explicit: 20 points
 * - jarvis_inferred: 10 points
 *
 * @param source - Memory source
 * @returns Source score (0-20)
 */
export function calculateSourceScore(source: string): number {
  switch (source) {
    case 'user_explicit':
      return 20;
    case 'jarvis_inferred':
      return 10;
    default:
      return 0;
  }
}

/**
 * Calculate total score for a memory entry
 *
 * Combined score from:
 * - Recency (0-50 points)
 * - Category (0-30 points)
 * - Source (0-20 points)
 *
 * Max possible score: 100 points
 *
 * @param entry - Memory entry to score
 * @param now - Reference time
 * @returns Total score (0-100)
 */
export function scoreMemory(entry: MemoryEntry, now: Date): number {
  const recency = calculateRecencyScore(entry, now);
  const category = calculateCategoryScore(entry.category);
  const source = calculateSourceScore(entry.source);

  return recency + category + source;
}

/**
 * Retrieve relevant memories with scoring and token budgeting
 *
 * Fetches all memories, scores them, and returns the top entries
 * that fit within the token budget.
 *
 * @param options - Retrieval options
 * @returns MemoryContext with scored entries and token tracking
 */
export async function retrieveMemories(
  options?: RetrievalOptions
): Promise<MemoryContext> {
  const maxTokens = options?.maxTokens ?? 1000;
  const maxEntries = options?.maxEntries ?? 10;
  const currentTime = options?.currentTime ?? new Date();

  // Fetch all memory entries
  const entries = await getMemoryEntries();

  // Score and transform entries
  const scoredEntries: ScoredMemory[] = entries.map((entry) => {
    const dateStr = entry.lastAccessed || entry.createdAt;
    const date = new Date(dateStr);

    return {
      id: entry.id,
      content: entry.content,
      category: entry.category,
      source: entry.source,
      score: scoreMemory(entry, currentTime),
      age: formatAge(date, currentTime),
    };
  });

  // Sort by score descending
  scoredEntries.sort((a, b) => b.score - a.score);

  // Select entries within token budget
  const selectedEntries: ScoredMemory[] = [];
  let totalTokens = 0;
  let truncated = false;

  for (const entry of scoredEntries) {
    // Stop if we've reached max entries
    if (selectedEntries.length >= maxEntries) {
      truncated = true;
      break;
    }

    const entryTokens = estimateTokens(entry.content);

    // Stop if adding this entry would exceed token budget
    if (totalTokens + entryTokens > maxTokens) {
      truncated = true;
      break;
    }

    selectedEntries.push(entry);
    totalTokens += entryTokens;
  }

  return {
    entries: selectedEntries,
    totalTokens,
    truncated,
  };
}

/**
 * Format memory context for injection into system prompt
 *
 * Format per CONTEXT.md decisions:
 * ```
 * User context:
 * - Schedule: Therapy Thursdays 3pm with Dr. Chen (2 weeks ago, you told me)
 * - Preference: Brief responses (inferred, 3 days ago)
 * ```
 *
 * @param context - MemoryContext from retrieveMemories
 * @returns Formatted string for system prompt, or empty string if no memories
 */
export function formatMemoriesForPrompt(context: MemoryContext): string {
  if (context.entries.length === 0) {
    return '';
  }

  const lines = context.entries.map((entry) => {
    // Capitalize first letter of category
    const category =
      entry.category.charAt(0).toUpperCase() + entry.category.slice(1);

    // Map source to human-readable form
    const sourceText =
      entry.source === 'user_explicit' ? 'you told me' : 'inferred';

    return `- ${category}: ${entry.content} (${entry.age}, ${sourceText})`;
  });

  return `User context:\n${lines.join('\n')}`;
}
