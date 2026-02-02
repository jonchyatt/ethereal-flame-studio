/**
 * Tests for memory retrieval module.
 * Run with: npx tsx src/lib/jarvis/memory/__tests__/retrieval.test.ts
 */

import {
  formatAge,
  estimateTokens,
  calculateRecencyScore,
  calculateCategoryScore,
  calculateSourceScore,
  scoreMemory,
  formatMemoriesForPrompt,
  type MemoryContext,
  type ScoredMemory,
} from '../retrieval.js';
import type { MemoryEntry } from '../schema.js';

// Test helper
function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function assertEquals<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `FAIL: ${message}\n  Expected: ${JSON.stringify(expected)}\n  Actual: ${JSON.stringify(actual)}`
    );
  }
  console.log(`PASS: ${message}`);
}

// Helper to create mock MemoryEntry
function createMockEntry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 1,
    content: 'Test memory content',
    contentHash: 'abc123',
    category: 'fact',
    source: 'user_explicit',
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    ...overrides,
  };
}

// Helper to create date relative to reference
function daysAgo(days: number, ref: Date = new Date()): Date {
  const d = new Date(ref);
  d.setDate(d.getDate() - days);
  return d;
}

console.log('\n=== formatAge tests ===\n');

const refDate = new Date('2026-02-02T12:00:00Z');

assertEquals(
  formatAge(new Date('2026-02-02T08:00:00Z'), refDate),
  'today',
  'formatAge: same day returns "today"'
);

assertEquals(
  formatAge(new Date('2026-02-01T12:00:00Z'), refDate),
  'yesterday',
  'formatAge: 1 day ago returns "yesterday"'
);

assertEquals(
  formatAge(daysAgo(3, refDate), refDate),
  '3 days ago',
  'formatAge: 3 days ago'
);

assertEquals(
  formatAge(daysAgo(5, refDate), refDate),
  '5 days ago',
  'formatAge: 5 days ago'
);

assertEquals(
  formatAge(daysAgo(7, refDate), refDate),
  '1 week ago',
  'formatAge: 7 days returns "1 week ago"'
);

assertEquals(
  formatAge(daysAgo(14, refDate), refDate),
  '2 weeks ago',
  'formatAge: 14 days returns "2 weeks ago"'
);

assertEquals(
  formatAge(daysAgo(21, refDate), refDate),
  '3 weeks ago',
  'formatAge: 21 days returns "3 weeks ago"'
);

assertEquals(
  formatAge(daysAgo(30, refDate), refDate),
  '1 month ago',
  'formatAge: 30 days returns "1 month ago"'
);

assertEquals(
  formatAge(daysAgo(60, refDate), refDate),
  '2 months ago',
  'formatAge: 60 days returns "2 months ago"'
);

assertEquals(
  formatAge(daysAgo(365, refDate), refDate),
  '1 year ago',
  'formatAge: 365 days returns "1 year ago"'
);

assertEquals(
  formatAge(daysAgo(730, refDate), refDate),
  '2 years ago',
  'formatAge: 730 days returns "2 years ago"'
);

console.log('\n=== estimateTokens tests ===\n');

assertEquals(
  estimateTokens(''),
  0,
  'estimateTokens: empty string is 0 tokens'
);

assertEquals(
  estimateTokens('test'),
  1,
  'estimateTokens: 4 chars is 1 token'
);

assertEquals(
  estimateTokens('hello world'),
  3,
  'estimateTokens: 11 chars is ~3 tokens'
);

assertEquals(
  estimateTokens('This is a longer string that should have more tokens'),
  13,
  'estimateTokens: 52 chars is ~13 tokens'
);

console.log('\n=== calculateRecencyScore tests ===\n');

const now = new Date('2026-02-02T12:00:00Z');

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: now.toISOString() }), now),
  50,
  'calculateRecencyScore: today = 50'
);

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: daysAgo(1, now).toISOString() }), now),
  40,
  'calculateRecencyScore: yesterday = 40'
);

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: daysAgo(3, now).toISOString() }), now),
  30,
  'calculateRecencyScore: 3 days ago (this week) = 30'
);

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: daysAgo(7, now).toISOString() }), now),
  30,
  'calculateRecencyScore: 7 days ago (this week boundary) = 30'
);

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: daysAgo(15, now).toISOString() }), now),
  15,
  'calculateRecencyScore: 15 days ago (this month) = 15'
);

assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: daysAgo(45, now).toISOString() }), now),
  5,
  'calculateRecencyScore: 45 days ago (older) = 5'
);

// Test fallback to createdAt when lastAccessed is null
assertEquals(
  calculateRecencyScore(createMockEntry({ lastAccessed: null, createdAt: now.toISOString() }), now),
  50,
  'calculateRecencyScore: uses createdAt when lastAccessed is null'
);

console.log('\n=== calculateCategoryScore tests ===\n');

assertEquals(
  calculateCategoryScore('preference'),
  30,
  'calculateCategoryScore: preference = 30'
);

assertEquals(
  calculateCategoryScore('fact'),
  20,
  'calculateCategoryScore: fact = 20'
);

assertEquals(
  calculateCategoryScore('pattern'),
  10,
  'calculateCategoryScore: pattern = 10'
);

assertEquals(
  calculateCategoryScore('unknown'),
  0,
  'calculateCategoryScore: unknown = 0'
);

console.log('\n=== calculateSourceScore tests ===\n');

assertEquals(
  calculateSourceScore('user_explicit'),
  20,
  'calculateSourceScore: user_explicit = 20'
);

assertEquals(
  calculateSourceScore('jarvis_inferred'),
  10,
  'calculateSourceScore: jarvis_inferred = 10'
);

assertEquals(
  calculateSourceScore('unknown'),
  0,
  'calculateSourceScore: unknown = 0'
);

console.log('\n=== scoreMemory tests ===\n');

// Maximum score: today + preference + user_explicit = 50 + 30 + 20 = 100
const maxScoreEntry = createMockEntry({
  category: 'preference',
  source: 'user_explicit',
  lastAccessed: now.toISOString(),
});
assertEquals(
  scoreMemory(maxScoreEntry, now),
  100,
  'scoreMemory: max score is 100 (today + preference + user_explicit)'
);

// Minimum realistic score: old + pattern + jarvis_inferred = 5 + 10 + 10 = 25
const minScoreEntry = createMockEntry({
  category: 'pattern',
  source: 'jarvis_inferred',
  lastAccessed: daysAgo(60, now).toISOString(),
});
assertEquals(
  scoreMemory(minScoreEntry, now),
  25,
  'scoreMemory: typical low score is 25 (old + pattern + jarvis_inferred)'
);

// Verify score ranking makes sense
const preferenceToday = scoreMemory(createMockEntry({
  category: 'preference',
  source: 'user_explicit',
  lastAccessed: now.toISOString(),
}), now);

const factYesterday = scoreMemory(createMockEntry({
  category: 'fact',
  source: 'user_explicit',
  lastAccessed: daysAgo(1, now).toISOString(),
}), now);

const patternOld = scoreMemory(createMockEntry({
  category: 'pattern',
  source: 'jarvis_inferred',
  lastAccessed: daysAgo(60, now).toISOString(),
}), now);

assert(
  preferenceToday > factYesterday,
  `scoreMemory: preference today (${preferenceToday}) > fact yesterday (${factYesterday})`
);

assert(
  factYesterday > patternOld,
  `scoreMemory: fact yesterday (${factYesterday}) > pattern old (${patternOld})`
);

console.log('\n=== formatMemoriesForPrompt tests ===\n');

// Empty array returns empty string
const emptyContext: MemoryContext = {
  entries: [],
  totalTokens: 0,
  truncated: false,
};
assertEquals(
  formatMemoriesForPrompt(emptyContext),
  '',
  'formatMemoriesForPrompt: empty entries returns empty string'
);

// Single entry formats correctly
const singleEntry: ScoredMemory = {
  id: 1,
  content: 'Therapy Thursdays 3pm with Dr. Chen',
  category: 'preference',
  source: 'user_explicit',
  score: 100,
  age: '2 weeks ago',
};
const singleContext: MemoryContext = {
  entries: [singleEntry],
  totalTokens: 10,
  truncated: false,
};
assertEquals(
  formatMemoriesForPrompt(singleContext),
  'User context:\n- Preference: Therapy Thursdays 3pm with Dr. Chen (2 weeks ago, you told me)',
  'formatMemoriesForPrompt: single entry with user_explicit source'
);

// Multiple entries with different sources
const multipleEntries: ScoredMemory[] = [
  {
    id: 1,
    content: 'Therapy Thursdays 3pm with Dr. Chen',
    category: 'fact',
    source: 'user_explicit',
    score: 90,
    age: '2 weeks ago',
  },
  {
    id: 2,
    content: 'Prefers brief responses',
    category: 'preference',
    source: 'jarvis_inferred',
    score: 70,
    age: '3 days ago',
  },
  {
    id: 3,
    content: 'Works at Acme Corp',
    category: 'fact',
    source: 'user_explicit',
    score: 60,
    age: 'yesterday',
  },
];
const multipleContext: MemoryContext = {
  entries: multipleEntries,
  totalTokens: 30,
  truncated: false,
};
const expectedMultiple = `User context:
- Fact: Therapy Thursdays 3pm with Dr. Chen (2 weeks ago, you told me)
- Preference: Prefers brief responses (3 days ago, inferred)
- Fact: Works at Acme Corp (yesterday, you told me)`;
assertEquals(
  formatMemoriesForPrompt(multipleContext),
  expectedMultiple,
  'formatMemoriesForPrompt: multiple entries with mixed sources'
);

// Source mapping verification
const inferredEntry: ScoredMemory = {
  id: 1,
  content: 'Test content',
  category: 'pattern',
  source: 'jarvis_inferred',
  score: 50,
  age: 'today',
};
const inferredContext: MemoryContext = {
  entries: [inferredEntry],
  totalTokens: 5,
  truncated: false,
};
assert(
  formatMemoriesForPrompt(inferredContext).includes('inferred'),
  'formatMemoriesForPrompt: jarvis_inferred maps to "inferred"'
);

const explicitEntry: ScoredMemory = {
  id: 1,
  content: 'Test content',
  category: 'fact',
  source: 'user_explicit',
  score: 50,
  age: 'today',
};
const explicitContext: MemoryContext = {
  entries: [explicitEntry],
  totalTokens: 5,
  truncated: false,
};
assert(
  formatMemoriesForPrompt(explicitContext).includes('you told me'),
  'formatMemoriesForPrompt: user_explicit maps to "you told me"'
);

console.log('\n=== Token budgeting simulation ===\n');

// Simulate token budgeting (can't call retrieveMemories without DB,
// but we can test the estimateTokens function)
const shortContent = 'Brief note';
const longContent = 'This is a much longer content string that would consume more tokens in the context window';

const shortTokens = estimateTokens(shortContent);
const longTokens = estimateTokens(longContent);

assert(
  shortTokens < longTokens,
  `Token estimation: short (${shortTokens}) < long (${longTokens})`
);

// Verify token budget math
const budgetExample = 100; // 100 token budget
const entry1Tokens = 20;
const entry2Tokens = 50;
const entry3Tokens = 40;

// entry1 + entry2 = 70, within budget
assert(entry1Tokens + entry2Tokens <= budgetExample, 'Budget: entries 1+2 fit');

// entry1 + entry2 + entry3 = 110, exceeds budget
assert(entry1Tokens + entry2Tokens + entry3Tokens > budgetExample, 'Budget: entries 1+2+3 exceed');

console.log('\n=== All tests passed! ===\n');
