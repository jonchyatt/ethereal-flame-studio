#!/usr/bin/env node
/**
 * End-to-end render pipeline test.
 * Adds a job directly to BullMQ and monitors its progress.
 */

import { addBatchJob, getJobStatus, getBatchStatus, closeQueue } from '../src/lib/queue/bullmqQueue';
import { startWorker, stopWorker } from '../src/lib/queue/renderWorker';

const TEST_AUDIO_PATH = 'C:/Users/jonch/Projects/ethereal-flame-studio/audio/test_1sec.wav';

async function testPipeline() {
  console.log('=== Ethereal Flame Studio - Pipeline Test ===\n');

  // Step 1: Add a test job
  console.log('1. Adding test job to queue...');
  const { batchId, jobIds } = await addBatchJob(
    [
      {
        id: 'test-audio-1',
        originalName: 'Short and clean (1).mp3',
        path: TEST_AUDIO_PATH,
      },
    ],
    'flame', // template
    ['flat-1080p'] // output format
  );

  console.log(`   Batch ID: ${batchId}`);
  console.log(`   Job IDs: ${jobIds.join(', ')}`);

  // Step 2: Start the worker
  console.log('\n2. Starting render worker...');
  startWorker();

  // Step 3: Monitor progress
  console.log('\n3. Monitoring job progress...');
  const jobId = jobIds[0];

  let lastState = '';
  let lastProgress = -1;
  const startTime = Date.now();
  const timeout = 15 * 60 * 1000; // 15 minute timeout (software rendering is slow)

  while (true) {
    const status = await getJobStatus(jobId);

    if (!status) {
      console.log('   Job not found!');
      break;
    }

    if (status.state !== lastState || status.progress !== lastProgress) {
      console.log(`   [${((Date.now() - startTime) / 1000).toFixed(1)}s] State: ${status.state}, Progress: ${status.progress}%`);
      lastState = status.state;
      lastProgress = status.progress;
    }

    if (status.state === 'completed') {
      console.log('\n✓ Job completed successfully!');
      break;
    }

    if (status.state === 'failed') {
      console.log(`\n✗ Job failed: ${status.failedReason}`);
      break;
    }

    if (Date.now() - startTime > timeout) {
      console.log('\n✗ Timeout waiting for job');
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Step 4: Get batch summary
  console.log('\n4. Batch summary:');
  const batchStatus = await getBatchStatus(batchId);
  console.log(`   Total: ${batchStatus.total}`);
  console.log(`   Completed: ${batchStatus.completed}`);
  console.log(`   Failed: ${batchStatus.failed}`);
  console.log(`   Pending: ${batchStatus.pending}`);
  console.log(`   Processing: ${batchStatus.processing}`);

  // Cleanup
  console.log('\n5. Cleaning up...');
  await stopWorker();
  await closeQueue();
  console.log('   Done.');
}

testPipeline().catch(console.error);
