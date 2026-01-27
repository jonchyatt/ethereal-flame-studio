/**
 * Render Server
 *
 * Persistent server process that watches for render jobs and processes them.
 * Uses file-based job queue for simplicity.
 *
 * Usage:
 *   npx ts-node scripts/render-server.ts --jobs-dir ./jobs
 *
 * Phase 3, Plan 03-07
 */

import * as fs from 'fs';
import * as path from 'path';
import { RenderConfig } from './render-config';

/**
 * Job file structure
 */
interface RenderJobFile {
  id: string;
  config: RenderConfig;
  status: 'pending' | 'processing' | 'complete' | 'failed';
  progress?: number;
  output?: string;
  error?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
}

/**
 * Server configuration
 */
interface ServerConfig {
  jobsDir: string;
  pollInterval: number; // ms
}

/**
 * Parse server arguments
 */
function parseServerArgs(args: string[]): ServerConfig {
  const config: ServerConfig = {
    jobsDir: './jobs',
    pollInterval: 5000,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case '--jobs-dir':
        config.jobsDir = args[++i];
        break;
      case '--poll-interval':
        config.pollInterval = parseInt(args[++i]);
        break;
    }
  }

  return config;
}

/**
 * Ensure job directories exist
 */
function ensureDirectories(jobsDir: string): void {
  const dirs = ['pending', 'processing', 'complete', 'failed'];
  for (const dir of dirs) {
    const fullPath = path.join(jobsDir, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
}

/**
 * Get pending jobs
 */
function getPendingJobs(jobsDir: string): string[] {
  const pendingDir = path.join(jobsDir, 'pending');
  if (!fs.existsSync(pendingDir)) {
    return [];
  }
  return fs.readdirSync(pendingDir)
    .filter(f => f.endsWith('.json'))
    .map(f => path.join(pendingDir, f));
}

/**
 * Move job file between directories
 */
function moveJob(jobPath: string, jobsDir: string, status: 'processing' | 'complete' | 'failed'): string {
  const filename = path.basename(jobPath);
  const newPath = path.join(jobsDir, status, filename);
  fs.renameSync(jobPath, newPath);
  return newPath;
}

/**
 * Update job file
 */
function updateJob(jobPath: string, updates: Partial<RenderJobFile>): void {
  const job: RenderJobFile = JSON.parse(fs.readFileSync(jobPath, 'utf-8'));
  Object.assign(job, updates);
  fs.writeFileSync(jobPath, JSON.stringify(job, null, 2));
}

/**
 * Process a single job
 */
async function processJob(jobPath: string, jobsDir: string): Promise<void> {
  const job: RenderJobFile = JSON.parse(fs.readFileSync(jobPath, 'utf-8'));

  console.log(`\nProcessing job: ${job.id}`);
  console.log(`  Type: ${job.config.exportType}`);
  console.log(`  Template: ${job.config.templateId}`);

  // Move to processing
  const processingPath = moveJob(jobPath, jobsDir, 'processing');
  updateJob(processingPath, {
    status: 'processing',
    startedAt: new Date().toISOString(),
  });

  try {
    // Simulate processing (in real implementation, this would call headless-render)
    console.log('  Rendering...');

    // Update progress periodically
    for (let i = 0; i <= 100; i += 10) {
      updateJob(processingPath, { progress: i });
      await new Promise(resolve => setTimeout(resolve, 500));
      process.stdout.write(`\r  Progress: ${i}%`);
    }
    console.log('');

    // Mark complete
    const completePath = moveJob(processingPath, jobsDir, 'complete');
    updateJob(completePath, {
      status: 'complete',
      progress: 100,
      output: job.config.outputPath,
      completedAt: new Date().toISOString(),
    });

    console.log(`  Complete: ${job.config.outputPath}`);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Mark failed
    const failedPath = moveJob(processingPath, jobsDir, 'failed');
    updateJob(failedPath, {
      status: 'failed',
      error: errorMessage,
      completedAt: new Date().toISOString(),
    });

    console.error(`  Failed: ${errorMessage}`);
  }
}

/**
 * Main server loop
 */
async function main(): Promise<void> {
  console.log('Ethereal Flame Studio - Render Server');
  console.log('=====================================\n');

  const config = parseServerArgs(process.argv.slice(2));

  console.log('Configuration:');
  console.log(`  Jobs directory: ${config.jobsDir}`);
  console.log(`  Poll interval: ${config.pollInterval}ms`);
  console.log('');

  // Ensure directories exist
  ensureDirectories(config.jobsDir);
  console.log('Job directories ready.');

  // Handle graceful shutdown
  let shuttingDown = false;
  let currentJobPath: string | null = null;

  process.on('SIGINT', () => {
    console.log('\nReceived SIGINT. Shutting down gracefully...');
    shuttingDown = true;
    if (!currentJobPath) {
      process.exit(0);
    }
    console.log('Waiting for current job to complete...');
  });

  process.on('SIGTERM', () => {
    console.log('\nReceived SIGTERM. Shutting down gracefully...');
    shuttingDown = true;
    if (!currentJobPath) {
      process.exit(0);
    }
    console.log('Waiting for current job to complete...');
  });

  console.log('Watching for jobs...');
  console.log('Press Ctrl+C to stop.\n');

  // Main loop
  while (!shuttingDown) {
    const pendingJobs = getPendingJobs(config.jobsDir);

    if (pendingJobs.length > 0) {
      // Process first pending job
      currentJobPath = pendingJobs[0];
      await processJob(currentJobPath, config.jobsDir);
      currentJobPath = null;

      if (shuttingDown) {
        break;
      }
    }

    // Wait before checking again
    await new Promise(resolve => setTimeout(resolve, config.pollInterval));
  }

  console.log('Server stopped.');
}

// Run main function
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
