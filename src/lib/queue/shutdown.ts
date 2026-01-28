/**
 * Graceful shutdown handlers for queue connections.
 * Prevents stalled jobs when server restarts.
 */

import { closeQueue } from './bullmqQueue';

let isShuttingDown = false;

/**
 * Set up graceful shutdown handlers for SIGTERM and SIGINT.
 * Call this once when starting the worker process.
 */
export function setupGracefulShutdown(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n[${signal}] Graceful shutdown initiated...`);

    try {
      // Close queue connections (waits for active jobs)
      await closeQueue();
      console.log('Queue connections closed');

      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

/**
 * Check if shutdown is in progress.
 */
export function isShutdownInProgress(): boolean {
  return isShuttingDown;
}
