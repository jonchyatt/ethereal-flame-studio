#!/usr/bin/env node
/**
 * Direct test of renderVideo function (bypasses queue)
 */

import * as path from 'path';
import { renderVideo } from '../src/lib/render/renderVideo';

const TEST_AUDIO = path.join(__dirname, '..', 'audio', 'test_1sec.wav');
const OUTPUT_PATH = path.join(__dirname, '..', 'test-output', 'test_render.mp4');

async function main() {
  console.log('=== Direct Render Test ===\n');
  console.log('Audio:', TEST_AUDIO);
  console.log('Output:', OUTPUT_PATH);
  console.log('');

  try {
    const result = await renderVideo({
      audioPath: TEST_AUDIO,
      outputPath: OUTPUT_PATH,
      format: 'flat-1080p',
      fps: 30,
      quality: 'fast',
      appUrl: 'http://localhost:3000',
      keepFrames: true, // Keep frames for debugging
      onProgress: (progress) => {
        console.log(`[${progress.stage}] ${progress.message} (${progress.overallProgress.toFixed(0)}%)`);
      },
    });

    console.log('\n=== Result ===');
    console.log('Success:', result.success);
    console.log('Duration:', result.duration.toFixed(1), 's');
    console.log('Stages:');
    console.log('  Analysis:', result.stages.analysis);
    console.log('  Capture:', result.stages.capture);
    console.log('  Encoding:', result.stages.encoding);
    if (result.stages.metadata) {
      console.log('  Metadata:', result.stages.metadata);
    }
    if (result.error) {
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
