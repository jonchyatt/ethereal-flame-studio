/**
 * MemoryStore - Cross-session persistence for Jarvis conversation memory
 *
 * Stores conversation summaries and key facts in localStorage for persistence
 * across page refreshes and sessions.
 */

/**
 * Represents the stored memory structure
 */
export interface SessionMemory {
  /** Summarized older conversation context */
  summary: string;
  /** Important facts extracted from conversations */
  keyFacts: string[];
  /** ISO timestamp of last update */
  lastUpdated: string;
}

const MEMORY_KEY = 'jarvis_memory';
const MAX_KEY_FACTS = 20;

/**
 * MemoryStore handles localStorage-based persistence for conversation memory.
 *
 * SSR-safe: All methods guard against server-side rendering by checking
 * for the presence of the window object.
 */
export class MemoryStore {
  /**
   * Load stored memory from localStorage
   * @returns SessionMemory if exists, null if no data or SSR
   */
  load(): SessionMemory | null {
    if (typeof window === 'undefined') {
      return null;
    }

    try {
      const stored = localStorage.getItem(MEMORY_KEY);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored) as SessionMemory;

      // Validate structure
      if (
        typeof parsed.summary !== 'string' ||
        !Array.isArray(parsed.keyFacts) ||
        typeof parsed.lastUpdated !== 'string'
      ) {
        console.warn('[MemoryStore] Invalid stored data structure, returning null');
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('[MemoryStore] Error loading memory:', error);
      return null;
    }
  }

  /**
   * Save memory to localStorage with current timestamp
   * @param memory - The memory object to persist
   */
  save(memory: SessionMemory): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const toSave: SessionMemory = {
        ...memory,
        lastUpdated: new Date().toISOString()
      };

      localStorage.setItem(MEMORY_KEY, JSON.stringify(toSave));
    } catch (error) {
      console.error('[MemoryStore] Error saving memory:', error);
    }
  }

  /**
   * Add a key fact to memory if not already present
   * Maintains a maximum of MAX_KEY_FACTS (20) most recent facts
   * @param fact - The fact to add
   */
  addKeyFact(fact: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const memory = this.load() || {
      summary: '',
      keyFacts: [],
      lastUpdated: ''
    };

    // Check for duplicate (exact match)
    if (memory.keyFacts.includes(fact)) {
      return;
    }

    // Add fact and keep only most recent MAX_KEY_FACTS
    memory.keyFacts.push(fact);
    if (memory.keyFacts.length > MAX_KEY_FACTS) {
      memory.keyFacts = memory.keyFacts.slice(-MAX_KEY_FACTS);
    }

    this.save(memory);
  }

  /**
   * Update the summary field and save to storage
   * @param summary - The new summary text
   */
  updateSummary(summary: string): void {
    if (typeof window === 'undefined') {
      return;
    }

    const memory = this.load() || {
      summary: '',
      keyFacts: [],
      lastUpdated: ''
    };

    memory.summary = summary;
    this.save(memory);
  }

  /**
   * Clear all stored memory
   */
  clear(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      localStorage.removeItem(MEMORY_KEY);
    } catch (error) {
      console.error('[MemoryStore] Error clearing memory:', error);
    }
  }
}
