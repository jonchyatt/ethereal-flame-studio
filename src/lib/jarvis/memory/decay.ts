/**
 * Memory Decay Module
 *
 * Implements MEM-10 (intelligent forgetting) via exponential decay.
 * Old, unaccessed memories have reduced retrieval priority.
 * Heavily decayed memories are soft-deleted during periodic cleanup.
 */

import type { MemoryEntry } from './schema';
import { getMemoryEntries, softDeleteMemoryEntry } from './queries/memoryEntries';
import { getJarvisConfig } from '../config';

/**
 * Calculate decay factor for a memory entry.
 * Returns 0-1 where 0 = no decay (fresh) and 1 = fully decayed.
 *
 * Factors:
 * - Days since last access (exponential decay with half-life)
 * - Source: explicit memories decay slower (multiplier < 1)
 *
 * @param entry - Memory entry to calculate decay for
 * @param now - Reference time (default: current time)
 * @returns Decay factor (0 = fresh, 1 = fully decayed)
 */
export function calculateDecay(entry: MemoryEntry, now: Date = new Date()): number {
  const config = getJarvisConfig();
  const lastAccessDate = new Date(entry.lastAccessed || entry.createdAt);
  const daysSinceAccess = Math.floor(
    (now.getTime() - lastAccessDate.getTime()) / (24 * 60 * 60 * 1000)
  );

  // Base decay: exponential with configurable half-life
  // At half-life days, decay = 0.5
  const baseDecay = 1 - Math.pow(0.5, daysSinceAccess / config.decayHalfLifeDays);

  // Source modifier: explicit memories decay slower
  const sourceModifier = entry.source === 'user_explicit'
    ? config.explicitDecayMultiplier
    : 1.0;

  return Math.min(1, baseDecay * sourceModifier);
}

/**
 * Apply decay penalty to a retrieval score.
 * Used in retrieval.ts to reduce scores of decayed memories.
 *
 * @param baseScore - Original score before decay
 * @param decay - Decay factor (0-1)
 * @returns Adjusted score (rounded integer)
 */
export function applyDecayToScore(baseScore: number, decay: number): number {
  // Decay reduces score: score * (1 - decay)
  // At decay=0, score unchanged; at decay=0.5, score halved
  return Math.round(baseScore * (1 - decay));
}

/**
 * Soft-delete memories that have decayed beyond threshold.
 * Run periodically (e.g., at session start) to clean up.
 *
 * @returns Number of memories archived
 */
export async function cleanupDecayedMemories(): Promise<number> {
  const config = getJarvisConfig();
  const entries = await getMemoryEntries(1000);
  const now = new Date();
  let archivedCount = 0;

  for (const entry of entries) {
    const decay = calculateDecay(entry, now);
    if (decay >= config.decayThreshold) {
      await softDeleteMemoryEntry(entry.id);
      archivedCount++;
      console.log(`[Decay] Archived memory ${entry.id}: "${entry.content.slice(0, 30)}..." (decay: ${decay.toFixed(2)})`);
    }
  }

  if (archivedCount > 0) {
    console.log(`[Decay] Archived ${archivedCount} decayed memories`);
  }

  return archivedCount;
}
