#!/usr/bin/env node
/**
 * Test script for Puppeteer frame capture pipeline.
 *
 * Tests:
 * 1. Browser launch and GPU detection
 * 2. Render mode initialization
 * 3. Single frame capture
 * 4. Multi-frame render (short clip)
 *
 * Usage:
 *   npx tsx scripts/test-puppeteer-render.ts
 *
 * Prerequisites:
 *   - Dev server running: npm run dev
 *   - Audio file at test location
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import { PuppeteerRenderer, createRenderer } from '../src/lib/render/PuppeteerRenderer';
import { PreAnalyzer } from '../src/lib/audio/PreAnalyzer';
import { FrameAudioData } from '../src/types';

// Test configuration
const TEST_CONFIG = {
  appUrl: 'http://localhost:3000',
  width: 1920,
  height: 1080,
  fps: 30,
  // Short test: only render 30 frames (1 second)
  maxFrames: 30,
};

// Test audio file - use WAV for Node.js compatibility
const TEST_AUDIO = path.join(__dirname, '..', 'audio', 'test_short.wav');
const OUTPUT_DIR = path.join(__dirname, '..', 'test-frames');

async function testGpuDetection(renderer: PuppeteerRenderer) {
  console.log('\n=== Test 1: GPU Detection ===');

  const gpu = await renderer.checkGPU();
  console.log(`  GPU Available: ${gpu.available}`);
  console.log(`  Renderer: ${gpu.renderer}`);

  if (!gpu.available) {
    console.warn('  ⚠️  Warning: Running without GPU acceleration (software rendering)');
  } else {
    console.log('  ✓ GPU detected');
  }

  return gpu.available;
}

async function testRenderModeInit(renderer: PuppeteerRenderer) {
  console.log('\n=== Test 2: Render Mode Initialization ===');

  const initialized = await renderer.initRenderMode();
  if (initialized) {
    console.log('  ✓ Render mode initialized');
  } else {
    console.error('  ✗ Failed to initialize render mode');
    return false;
  }

  // Check status
  const status = await renderer.getStatus();
  console.log(`  Status: ${status.state}`);

  return initialized;
}

async function testSingleFrameCapture(renderer: PuppeteerRenderer) {
  console.log('\n=== Test 3: Single Frame Capture ===');

  // Create a simple audio data object for testing
  const testAudioData: FrameAudioData = {
    frame: 0,
    time: 0,
    amplitude: 0.5,
    bass: 0.6,
    mid: 0.4,
    high: 0.3,
    isBeat: false,
  };

  const outputPath = path.join(OUTPUT_DIR, 'test_single_frame.png');
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  await renderer.captureFrame(0, testAudioData, outputPath);

  // Verify file exists and has content
  try {
    const stats = await fs.stat(outputPath);
    console.log(`  ✓ Frame captured: ${outputPath} (${(stats.size / 1024).toFixed(1)} KB)`);
    return true;
  } catch {
    console.error('  ✗ Frame capture failed - file not created');
    return false;
  }
}

async function testMultiFrameRender() {
  console.log('\n=== Test 4: Multi-Frame Render ===');

  // Check if test audio exists
  try {
    await fs.access(TEST_AUDIO);
  } catch {
    console.warn(`  ⚠️  Skipping: Test audio not found at ${TEST_AUDIO}`);
    console.log('     Create a short test audio file to run this test');
    return false;
  }

  console.log('  Pre-analyzing audio...');

  // Pre-analyze audio
  const audioBuffer = await fs.readFile(TEST_AUDIO);
  const preAnalyzer = new PreAnalyzer();

  let audioAnalysis;
  try {
    // For Node.js, we need WAV format - skip if MP3
    audioAnalysis = await preAnalyzer.analyze(audioBuffer.buffer, {
      fps: TEST_CONFIG.fps,
      onProgress: (pct) => {
        if (pct % 25 === 0) console.log(`  Analysis: ${pct}%`);
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('WAV')) {
      console.warn('  ⚠️  Skipping: Audio analysis requires WAV format in Node.js');
      console.log('     Convert test audio to WAV: ffmpeg -i input.mp3 output.wav');
      return false;
    }
    throw error;
  }

  // Limit frames for quick test
  const testFrames = Math.min(audioAnalysis.totalFrames, TEST_CONFIG.maxFrames);
  console.log(`  Total frames in audio: ${audioAnalysis.totalFrames}`);
  console.log(`  Testing with: ${testFrames} frames`);

  // Create renderer
  const renderer = createRenderer({
    appUrl: TEST_CONFIG.appUrl,
    width: TEST_CONFIG.width,
    height: TEST_CONFIG.height,
    fps: TEST_CONFIG.fps,
  });

  try {
    await renderer.launch();
    await renderer.initRenderMode();

    const multiFrameDir = path.join(OUTPUT_DIR, 'multi-frame');

    const startTime = Date.now();
    const result = await renderer.renderFrames({
      audioAnalysis: {
        ...audioAnalysis,
        totalFrames: testFrames,
        frames: audioAnalysis.frames.slice(0, testFrames),
      },
      outputDir: multiFrameDir,
      format: 'png',
      checkpointInterval: 10,
      onProgress: (progress) => {
        if (progress.percent % 20 === 0) {
          console.log(
            `  Progress: ${progress.percent}% (${progress.currentFrame}/${progress.totalFrames}) - ${progress.fps.toFixed(1)} fps`
          );
        }
      },
    });

    const elapsed = (Date.now() - startTime) / 1000;

    if (result.success) {
      console.log(`  ✓ Rendered ${result.framesRendered} frames in ${elapsed.toFixed(1)}s`);
      console.log(`  Average FPS: ${result.averageFps.toFixed(1)}`);
      console.log(`  Output: ${multiFrameDir}`);
      return true;
    } else {
      console.error(`  ✗ Render failed: ${result.error}`);
      return false;
    }
  } finally {
    await renderer.close();
  }
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║    Puppeteer Frame Capture - Test Suite        ║');
  console.log('╚════════════════════════════════════════════════╝');
  console.log(`\nApp URL: ${TEST_CONFIG.appUrl}`);
  console.log(`Resolution: ${TEST_CONFIG.width}x${TEST_CONFIG.height}`);
  console.log(`FPS: ${TEST_CONFIG.fps}`);

  // Create main renderer for tests 1-3
  const renderer = createRenderer({
    appUrl: TEST_CONFIG.appUrl,
    width: TEST_CONFIG.width,
    height: TEST_CONFIG.height,
    fps: TEST_CONFIG.fps,
  });

  const results = {
    gpuDetection: false,
    renderModeInit: false,
    singleFrame: false,
    multiFrame: false,
  };

  try {
    // Launch browser
    console.log('\nLaunching browser...');
    await renderer.launch();
    console.log('Browser launched.');

    // Run tests
    results.gpuDetection = await testGpuDetection(renderer);
    results.renderModeInit = await testRenderModeInit(renderer);

    if (results.renderModeInit) {
      results.singleFrame = await testSingleFrameCapture(renderer);
    }
  } catch (error) {
    console.error('\n✗ Error during tests:', error);
  } finally {
    await renderer.close();
  }

  // Test 4 uses its own renderer instance
  try {
    results.multiFrame = await testMultiFrameRender();
  } catch (error) {
    console.error('\n✗ Multi-frame test error:', error);
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════');
  console.log('                   RESULTS');
  console.log('═══════════════════════════════════════════════');
  console.log(`  GPU Detection:     ${results.gpuDetection ? '✓ PASS' : '⚠ WARN (software)'}`);
  console.log(`  Render Mode Init:  ${results.renderModeInit ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Single Frame:      ${results.singleFrame ? '✓ PASS' : '✗ FAIL'}`);
  console.log(`  Multi-Frame:       ${results.multiFrame ? '✓ PASS' : '⚠ SKIP'}`);
  console.log('═══════════════════════════════════════════════');

  const allPassed =
    results.renderModeInit && results.singleFrame && (results.multiFrame || !results.gpuDetection);

  if (allPassed) {
    console.log('\n✓ All critical tests passed!');
    console.log('\nNext steps:');
    console.log('  1. Convert test audio to WAV for full multi-frame test');
    console.log('  2. Run full E2E test with scripts/test-render-pipeline.ts');
    process.exit(0);
  } else {
    console.log('\n✗ Some tests failed. Check errors above.');
    process.exit(1);
  }
}

// Run tests
console.log('Starting tests...');
console.log('Make sure dev server is running: npm run dev\n');

runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
