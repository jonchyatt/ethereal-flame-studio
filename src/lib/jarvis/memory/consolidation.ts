/**
 * Memory Consolidation Engine
 *
 * Detects semantically similar memories using stored embeddings (zero API calls
 * for detection), synthesizes merged versions via Haiku, and supports two-phase
 * consolidation (preview candidates -> confirm merges).
 *
 * Graceful degradation: returns empty results when vector search is unavailable.
 */

import Anthropic from '@anthropic-ai/sdk';
import { sql } from 'drizzle-orm';
import { getDb } from './db';
import { isVectorSearchAvailable, ensureEmbeddingsTable, generateAndStoreEmbedding } from './embeddings';
import {
  getMemoryEntries,
  softDeleteMemoryEntry,
  updateMemoryContent,
} from './queries/memoryEntries';
import type { MemoryEntry } from './schema';

/** A candidate pair for consolidation. */
export interface ConsolidationCandidate {
  groupId: string;
  keepId: number;
  removeId: number;
  distance: number;
  keepContent: string;
  removeContent: string;
}

/**
 * Find memory pairs that are semantically similar enough to consolidate.
 * Uses stored embeddings — zero OpenAI API calls for detection.
 *
 * @param threshold - Cosine distance threshold (0-1). Lower = stricter. Default 0.15.
 * @returns Array of candidate pairs for consolidation
 */
export async function findConsolidationCandidates(
  threshold = 0.15
): Promise<ConsolidationCandidate[]> {
  if (!isVectorSearchAvailable()) return [];

  await ensureEmbeddingsTable();

  // Get all active memories
  const activeMemories = await getMemoryEntries(500);
  if (activeMemories.length < 2) return [];

  const activeMap = new Map<number, MemoryEntry>(activeMemories.map(m => [m.id, m]));

  // Get memory IDs that have stored embeddings
  const db = getDb();
  const embeddingRows = await db.all(
    sql.raw('SELECT memory_id FROM memory_embeddings')
  ) as Array<{ memory_id: number }>;

  // Filter to only active memories with embeddings
  const embeddedIds = embeddingRows
    .map(r => r.memory_id)
    .filter(id => activeMap.has(id));

  if (embeddedIds.length < 2) return [];

  // For each embedded memory, find nearest neighbors using stored embeddings
  const seenPairs = new Set<string>();
  const candidates: ConsolidationCandidate[] = [];

  for (const entryId of embeddedIds) {
    try {
      const results = await db.all(
        sql.raw(
          `SELECT memory_id, distance FROM vector_top_k('memory_embeddings_idx', (SELECT embedding FROM memory_embeddings WHERE memory_id = ${entryId}), 4) JOIN memory_embeddings ON memory_embeddings.rowid = id`
        )
      ) as Array<{ memory_id: number; distance: number }>;

      for (const result of results) {
        // Exclude self-match
        if (result.memory_id === entryId) continue;
        // Exclude results above threshold
        if (result.distance >= threshold) continue;

        // Check partner is active
        const partner = activeMap.get(result.memory_id);
        if (!partner) continue;

        // Deduplicate pair via sorted ID key
        const pairKey = `${Math.min(entryId, result.memory_id)}-${Math.max(entryId, result.memory_id)}`;
        if (seenPairs.has(pairKey)) continue;
        seenPairs.add(pairKey);

        const entry = activeMap.get(entryId)!;

        // Determine keep/remove: longer content wins, tiebreak on more recent lastAccessed
        let keepId: number;
        let removeId: number;
        if (entry.content.length > partner.content.length) {
          keepId = entry.id;
          removeId = partner.id;
        } else if (entry.content.length < partner.content.length) {
          keepId = partner.id;
          removeId = entry.id;
        } else {
          const entryAccessed = entry.lastAccessed ? new Date(entry.lastAccessed).getTime() : 0;
          const partnerAccessed = partner.lastAccessed ? new Date(partner.lastAccessed).getTime() : 0;
          keepId = entryAccessed >= partnerAccessed ? entry.id : partner.id;
          removeId = keepId === entry.id ? partner.id : entry.id;
        }

        candidates.push({
          groupId: `${keepId}-${removeId}`,
          keepId,
          removeId,
          distance: result.distance,
          keepContent: activeMap.get(keepId)!.content,
          removeContent: activeMap.get(removeId)!.content,
        });
      }
    } catch (err) {
      console.error(`[Consolidation] Error querying neighbors for memory ${entryId}:`, err);
    }
  }

  console.log(`[Consolidation] Found ${candidates.length} candidate pairs`);
  return candidates;
}

/**
 * Synthesize a merged memory from two similar entries using Claude Haiku.
 * Falls back to the longer entry if API call fails.
 *
 * @param contentA - First memory content
 * @param contentB - Second memory content
 * @returns Synthesized merged content
 */
export async function synthesizeMergedMemory(
  contentA: string,
  contentB: string
): Promise<string> {
  try {
    const anthropic = new Anthropic();
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 128,
      system: 'You merge similar memory entries into one concise fact. Output ONLY the merged memory, nothing else. Preserve all specific details (times, names, quantities). Keep it to 1-2 sentences max.',
      messages: [{
        role: 'user',
        content: `Merge these two memories into one:\n1. "${contentA}"\n2. "${contentB}"`,
      }],
    });

    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    return text || (contentA.length >= contentB.length ? contentA : contentB);
  } catch (err) {
    console.warn('[Consolidation] Haiku synthesis failed, keeping longer entry:', err);
    return contentA.length >= contentB.length ? contentA : contentB;
  }
}

/**
 * Execute consolidation on confirmed candidate pairs.
 * For each pair: synthesize merged content, update kept entry, soft-delete removed entry.
 *
 * @param candidates - Array of candidate pairs to merge
 * @returns Stats on merged/failed counts
 */
export async function executeConsolidation(
  candidates: Array<{ keepId: number; removeId: number; keepContent: string; removeContent: string }>
): Promise<{ merged: number; failed: number }> {
  let merged = 0;
  let failed = 0;

  for (const candidate of candidates) {
    try {
      const synthesized = await synthesizeMergedMemory(candidate.keepContent, candidate.removeContent);
      await updateMemoryContent(candidate.keepId, synthesized);
      await softDeleteMemoryEntry(candidate.removeId);
      console.log(`[Consolidation] Merged #${candidate.keepId} + #${candidate.removeId} → "${synthesized.slice(0, 50)}..."`);
      merged++;
    } catch (err) {
      console.error(`[Consolidation] Failed to merge #${candidate.keepId} + #${candidate.removeId}:`, err);
      failed++;
    }
  }

  return { merged, failed };
}

/**
 * Run full consolidation: find candidates + execute merges.
 * Convenience function for automated or manual consolidation runs.
 *
 * @param threshold - Cosine distance threshold (default 0.15)
 * @returns Combined stats
 */
export async function runConsolidation(
  threshold?: number
): Promise<{ candidatesFound: number; merged: number; failed: number }> {
  const candidates = await findConsolidationCandidates(threshold);
  if (candidates.length === 0) {
    return { candidatesFound: 0, merged: 0, failed: 0 };
  }

  const stats = await executeConsolidation(candidates);
  return { candidatesFound: candidates.length, ...stats };
}
