#!/usr/bin/env node
/**
 * Worker CLI entry point.
 * Starts render and/or transcription workers.
 *
 * Usage:
 *   npm run worker           # Both workers
 *   npm run worker:render    # Render only
 *   npm run worker:transcribe # Transcription only
 *
 * Phase 4, Plans 04-03 and 04-05
 */

import { startWorker, stopWorker } from '../src/lib/queue/renderWorker';
import { closeQueue } from '../src/lib/queue/bullmqQueue';

console.log('Starting Ethereal Flame workers...');

// Parse arguments
const args = process.argv.slice(2);
const runRender = args.length === 0 || args.includes('--render');
const runTranscribe = args.length === 0 || args.includes('--transcribe');

// Track active workers
let renderWorkerActive = false;
let transcribeWorkerActive = false;

// Graceful shutdown
let isShuttingDown = false;
const shutdown = async () => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  console.log('\nShutting down workers...');

  if (renderWorkerActive) {
    await stopWorker();
  }

  if (transcribeWorkerActive) {
    try {
      const { stopTranscriptionWorker, closeTranscriptionQueue } = await import('../src/lib/queue/transcriptionWorker');
      await stopTranscriptionWorker();
      await closeTranscriptionQueue();
    } catch {
      // Transcription worker not available
    }
  }

  await closeQueue();

  console.log('Workers stopped');
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start workers
async function start() {
  if (runRender) {
    startWorker();
    renderWorkerActive = true;
  }

  if (runTranscribe) {
    try {
      const { startTranscriptionWorker } = await import('../src/lib/queue/transcriptionWorker');
      startTranscriptionWorker();
      transcribeWorkerActive = true;
    } catch (error) {
      console.log('[Transcription] Worker not available:', (error as Error).message);
    }
  }

  console.log(`Workers running: render=${renderWorkerActive}, transcribe=${transcribeWorkerActive}`);
  console.log('Press Ctrl+C to stop.');
}

start().catch(console.error);
