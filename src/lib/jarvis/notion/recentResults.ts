/**
 * Recent Results Cache for Voice Item Identification
 *
 * When user says "Mark the call mom task as complete" or "Add something to
 * the website project", we need to find the item ID. Solution: cache recent
 * query results and match by title using fuzzy matching.
 *
 * NOTE: In-memory cache, per-request in serverless. This works because:
 * 1. Claude often queries then updates in same request (tool loop)
 * 2. User can always re-query if cache is stale
 */

export interface CachedItem {
  id: string;
  title: string;
  type: 'task' | 'bill' | 'project' | 'goal' | 'habit';
  cachedAt: number;
}

// In-memory cache
let recentResults: CachedItem[] = [];

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Add items to the cache, deduplicating by ID
 */
export function cacheResults(items: CachedItem[]): void {
  const now = Date.now();

  // Remove expired items first
  recentResults = recentResults.filter(
    (item) => now - item.cachedAt < CACHE_TTL
  );

  // Add new items, updating existing ones by ID
  for (const newItem of items) {
    const existingIndex = recentResults.findIndex(
      (item) => item.id === newItem.id
    );
    if (existingIndex >= 0) {
      recentResults[existingIndex] = { ...newItem, cachedAt: now };
    } else {
      recentResults.push({ ...newItem, cachedAt: now });
    }
  }

  console.log(
    `[RecentResults] Cached ${items.length} items, total: ${recentResults.length}`
  );
}

/**
 * Find a task by title using fuzzy matching
 *
 * Match priority:
 * 1. Exact match (case-insensitive)
 * 2. Starts with search term
 * 3. Contains search term
 *
 * @param searchTerm - The title or partial title to search for
 * @returns The task ID if found, null otherwise
 */
export function findTaskByTitle(searchTerm: string): string | null {
  return findByTitle(searchTerm, 'task');
}

/**
 * Find a bill by title using fuzzy matching
 */
export function findBillByTitle(searchTerm: string): string | null {
  return findByTitle(searchTerm, 'bill');
}

/**
 * Find a project by title using fuzzy matching
 */
export function findProjectByTitle(searchTerm: string): string | null {
  return findByTitle(searchTerm, 'project');
}

/**
 * Find a goal by title using fuzzy matching
 */
export function findGoalByTitle(searchTerm: string): string | null {
  return findByTitle(searchTerm, 'goal');
}

/**
 * Find a habit by title using fuzzy matching
 */
export function findHabitByTitle(searchTerm: string): string | null {
  return findByTitle(searchTerm, 'habit');
}

/**
 * Internal function to find items by title with fuzzy matching
 */
function findByTitle(
  searchTerm: string,
  type: CachedItem['type']
): string | null {
  const now = Date.now();

  // Clean expired items
  recentResults = recentResults.filter(
    (item) => now - item.cachedAt < CACHE_TTL
  );

  // Filter to matching type
  const items = recentResults.filter((item) => item.type === type);

  if (items.length === 0) {
    console.log(`[RecentResults] No cached ${type}s to search`);
    return null;
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();

  // Priority 1: Exact match (case-insensitive)
  const exactMatch = items.find(
    (item) => item.title.toLowerCase() === normalizedSearch
  );
  if (exactMatch) {
    console.log(
      `[RecentResults] Exact match found: "${exactMatch.title}" -> ${exactMatch.id}`
    );
    return exactMatch.id;
  }

  // Priority 2: Starts with search term
  const startsWithMatch = items.find((item) =>
    item.title.toLowerCase().startsWith(normalizedSearch)
  );
  if (startsWithMatch) {
    console.log(
      `[RecentResults] Starts-with match found: "${startsWithMatch.title}" -> ${startsWithMatch.id}`
    );
    return startsWithMatch.id;
  }

  // Priority 3: Contains search term
  const containsMatch = items.find((item) =>
    item.title.toLowerCase().includes(normalizedSearch)
  );
  if (containsMatch) {
    console.log(
      `[RecentResults] Contains match found: "${containsMatch.title}" -> ${containsMatch.id}`
    );
    return containsMatch.id;
  }

  // Priority 4: Search term contains item title (for partial references)
  // e.g., "the call mom task" contains "call mom"
  const reverseContainsMatch = items.find((item) =>
    normalizedSearch.includes(item.title.toLowerCase())
  );
  if (reverseContainsMatch) {
    console.log(
      `[RecentResults] Reverse contains match found: "${reverseContainsMatch.title}" -> ${reverseContainsMatch.id}`
    );
    return reverseContainsMatch.id;
  }

  console.log(
    `[RecentResults] No match found for "${searchTerm}" in ${items.length} ${type}s`
  );
  return null;
}

/**
 * Clear the cache (for testing/reset)
 */
export function clearCache(): void {
  recentResults = [];
  console.log('[RecentResults] Cache cleared');
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): {
  total: number;
  byType: Record<string, number>;
} {
  const byType: Record<string, number> = {};
  for (const item of recentResults) {
    byType[item.type] = (byType[item.type] || 0) + 1;
  }
  return { total: recentResults.length, byType };
}
