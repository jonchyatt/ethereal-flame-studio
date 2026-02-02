/**
 * Decay module tests
 *
 * Verifies that:
 * - Explicit memories never decay (CONTEXT.md decision)
 * - Inferred memories decay over time
 */

import { calculateDecay } from '../decay';
import type { MemoryEntry } from '../schema';

describe('calculateDecay', () => {
  const baseEntry: MemoryEntry = {
    id: 1,
    content: 'Test memory',
    contentHash: 'abc123',
    category: 'fact',
    source: 'jarvis_inferred',
    createdAt: new Date().toISOString(),
    lastAccessed: new Date().toISOString(),
    deletedAt: null,
  };

  it('should return 0 decay for user_explicit memories regardless of age', () => {
    const explicitEntry: MemoryEntry = {
      ...baseEntry,
      source: 'user_explicit',
      // Very old - 365 days ago
      lastAccessed: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    expect(calculateDecay(explicitEntry)).toBe(0);
  });

  it('should return 0 decay for fresh inferred memories', () => {
    const freshEntry: MemoryEntry = {
      ...baseEntry,
      source: 'jarvis_inferred',
      lastAccessed: new Date().toISOString(),
    };

    // Fresh memories should have very low decay
    expect(calculateDecay(freshEntry)).toBeLessThan(0.1);
  });

  it('should return positive decay for old inferred memories', () => {
    const oldEntry: MemoryEntry = {
      ...baseEntry,
      source: 'jarvis_inferred',
      // 60 days ago - should be well past half-life
      lastAccessed: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const decay = calculateDecay(oldEntry);
    expect(decay).toBeGreaterThan(0.5);  // Past half-life
    expect(decay).toBeLessThan(1);       // Not fully decayed
  });

  it('should use createdAt when lastAccessed is null', () => {
    const entryWithNullLastAccessed: MemoryEntry = {
      ...baseEntry,
      source: 'jarvis_inferred',
      lastAccessed: null,
      // Created 30 days ago (half-life)
      createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const decay = calculateDecay(entryWithNullLastAccessed);
    // At half-life, decay should be approximately 0.5
    expect(decay).toBeGreaterThan(0.4);
    expect(decay).toBeLessThan(0.6);
  });
});
