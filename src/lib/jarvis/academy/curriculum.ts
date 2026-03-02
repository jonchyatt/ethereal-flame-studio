/**
 * Academy Curriculum Utilities
 *
 * Shared logic for curriculum navigation — used by both
 * server-side (toolExecutor) and client-side (academyStore).
 */

import type { CurriculumTopic } from './projects';

export interface TopicProgress {
  projectId: string;
  topicId: string;
  status: string;
}

/**
 * Find the next suggested topic for a project based on progress and prerequisites.
 *
 * Priority:
 * 1. In-progress (explored) topics — resume what you started
 * 2. Eligible topics — not completed, all prerequisites met, sorted by difficulty
 */
export function getNextSuggested(
  projectId: string,
  curriculum: CurriculumTopic[],
  progress: Record<string, TopicProgress>
): CurriculumTopic | null {
  const completedIds = new Set(
    Object.values(progress)
      .filter(p => p.projectId === projectId && p.status === 'completed')
      .map(p => p.topicId)
  );

  // In-progress topics take priority (resume what you started)
  const explored = curriculum.find(t =>
    progress[`${projectId}:${t.id}`]?.status === 'explored'
  );
  if (explored) return explored;

  // Eligible: not completed + all prerequisites completed
  const eligible = curriculum.filter(t =>
    !completedIds.has(t.id) &&
    t.prerequisites.every(p => completedIds.has(p))
  );

  if (eligible.length === 0) return null;

  // Sort by difficulty (ascending), then by curriculum order (stable sort preserves sequence)
  return eligible.sort((a, b) => a.difficulty - b.difficulty)[0];
}
