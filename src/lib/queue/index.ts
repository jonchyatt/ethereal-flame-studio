/**
 * Queue module exports.
 *
 * This module provides:
 * - RenderQueue: Browser-side queue with IndexedDB persistence (Phase 3)
 * - BullMQ-based queue: Server-side queue with Redis persistence (Phase 4)
 */

// Phase 3: Browser-side queue
export * from './RenderQueue';
export * from './JobStore';

// Phase 4: Server-side BullMQ queue
export * from './connection';
export * from './types';
export * from './bullmqQueue';
export * from './shutdown';
