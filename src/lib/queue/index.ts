/**
 * Queue module exports.
 *
 * This module provides:
 * - RenderQueue: Browser-side queue with IndexedDB persistence (Phase 3)
 * - BullMQ-based queue: Server-side queue with Redis persistence (Phase 4)
 */

// Phase 3: Browser-side queue
export * from './RenderQueue';
export { JobStore, type RenderJob } from './JobStore';
// Use JobStatus from JobStore for browser-side (Phase 3)
export { type JobStatus } from './JobStore';

// Phase 4: Server-side BullMQ queue
export * from './connection';
// Export types except JobStatus (already exported from JobStore)
export { type AudioFile, type BatchJobData, type RenderJobData } from './types';
export * from './bullmqQueue';
export * from './shutdown';
