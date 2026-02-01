/**
 * ConversationManager - Sliding window context management for Jarvis
 *
 * Maintains conversation history with a sliding window approach:
 * - Recent messages are kept in full
 * - Older messages can be summarized to stay within token limits
 * - Integrates with MemoryStore for cross-session persistence
 */

import { MemoryStore, SessionMemory } from './MemoryStore';

/**
 * Represents a single conversation message
 */
export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

/** Maximum number of recent messages to keep in full */
const MAX_RECENT_MESSAGES = 10;

/** Maximum number of key facts to track */
const MAX_KEY_FACTS = 20;

/**
 * ConversationManager handles conversation context with a sliding window.
 *
 * Key features:
 * - Maintains recent messages in memory for multi-turn conversation
 * - Loads prior context (summary + key facts) from MemoryStore
 * - Provides context messages formatted for Claude API
 * - Signals when summarization should occur
 */
export class ConversationManager {
  private messages: Message[] = [];
  private memoryStore: MemoryStore | null;
  private loadedMemory: SessionMemory | null = null;
  private maxRecentMessages: number;
  private maxKeyFacts: number;

  /**
   * Create a ConversationManager
   * @param memoryStore - Optional MemoryStore for cross-session persistence
   * @param options - Optional configuration overrides
   */
  constructor(
    memoryStore?: MemoryStore,
    options?: {
      maxRecentMessages?: number;
      maxKeyFacts?: number;
    }
  ) {
    this.memoryStore = memoryStore || null;
    this.maxRecentMessages = options?.maxRecentMessages || MAX_RECENT_MESSAGES;
    this.maxKeyFacts = options?.maxKeyFacts || MAX_KEY_FACTS;

    // Load any existing memory on construction
    if (this.memoryStore) {
      this.loadedMemory = this.memoryStore.load();
    }
  }

  /**
   * Add a message to the conversation history
   * @param message - The message to add
   */
  addMessage(message: Message): void {
    this.messages.push(message);
  }

  /**
   * Get messages formatted for Claude API context
   *
   * If a prior summary exists, it's prepended as a synthetic exchange:
   * - user: "[Previous conversation summary: {summary}]"
   * - assistant: "I understand. I have context from our previous conversation."
   *
   * Then recent messages (up to maxRecentMessages) are appended.
   *
   * @returns Array of messages ready for Claude API
   */
  getContextMessages(): Message[] {
    const contextMessages: Message[] = [];

    // Add summary as synthetic exchange if exists
    if (this.loadedMemory?.summary) {
      contextMessages.push({
        role: 'user',
        content: `[Previous conversation summary: ${this.loadedMemory.summary}]`
      });
      contextMessages.push({
        role: 'assistant',
        content: 'I understand. I have context from our previous conversation.'
      });
    }

    // Add recent messages (sliding window)
    const recentMessages = this.messages.slice(-this.maxRecentMessages);
    contextMessages.push(...recentMessages);

    return contextMessages;
  }

  /**
   * Get key facts from persisted memory
   * @returns Array of key facts, or empty array if none
   */
  getKeyFacts(): string[] {
    return this.loadedMemory?.keyFacts || [];
  }

  /**
   * Extract and persist a key fact from the conversation
   * @param fact - The fact to store
   */
  extractKeyFact(fact: string): void {
    if (!this.memoryStore) {
      return;
    }

    this.memoryStore.addKeyFact(fact);

    // Refresh loaded memory to include new fact
    this.loadedMemory = this.memoryStore.load();
  }

  /**
   * Check if summarization should be triggered
   *
   * Returns true when messages exceed 2x the sliding window size,
   * indicating that older messages should be summarized.
   *
   * Note: Actual summarization logic is implemented in plan 03-03
   * which integrates with Claude API.
   *
   * @returns true if summarization should happen
   */
  shouldSummarize(): boolean {
    return this.messages.length > this.maxRecentMessages * 2;
  }

  /**
   * Get the current message count
   * @returns Number of messages in current session
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  /**
   * Get all messages (for summarization)
   * @returns Copy of all messages array
   */
  getAllMessages(): Message[] {
    return [...this.messages];
  }

  /**
   * Set the summary after summarization
   * Clears old messages and updates persisted memory
   * @param summary - The summarized text
   * @param keepRecent - Number of recent messages to keep after summarization
   */
  setSummary(summary: string, keepRecent: number = 5): void {
    if (this.memoryStore) {
      this.memoryStore.updateSummary(summary);
      this.loadedMemory = this.memoryStore.load();
    }

    // Keep only the most recent messages after summarization
    this.messages = this.messages.slice(-keepRecent);
  }

  /**
   * Clear conversation history
   * @param clearPersisted - Also clear MemoryStore if true
   */
  clear(clearPersisted: boolean = false): void {
    this.messages = [];

    if (clearPersisted && this.memoryStore) {
      this.memoryStore.clear();
      this.loadedMemory = null;
    }
  }
}
