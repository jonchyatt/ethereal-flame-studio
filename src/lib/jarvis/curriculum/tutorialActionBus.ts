/**
 * Tutorial Action Bus — lightweight pub/sub for tutorial step verification.
 *
 * Tracks actions that can't be detected via route or store changes
 * (e.g. "user sent a chat message").
 */

type Callback = () => void;

const firedActions = new Set<string>();
const listeners = new Map<string, Set<Callback>>();

export const tutorialActionBus = {
  /** Fire an action (e.g. 'user-sent-chat-message') */
  emit(action: string): void {
    firedActions.add(action);
    const cbs = listeners.get(action);
    if (cbs) cbs.forEach((cb) => cb());
  },

  /** Has this action fired since last reset? */
  check(action: string): boolean {
    return firedActions.has(action);
  },

  /** Clear all fired actions (called on step/lesson change) */
  reset(): void {
    firedActions.clear();
  },

  /** Subscribe to an action. Returns an unsubscribe function. */
  on(action: string, cb: Callback): () => void {
    if (!listeners.has(action)) listeners.set(action, new Set());
    listeners.get(action)!.add(cb);
    return () => {
      listeners.get(action)?.delete(cb);
    };
  },
};
