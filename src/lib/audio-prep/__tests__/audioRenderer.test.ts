import { renderRecipe } from '../audioRenderer';
import type { EditRecipe } from '../types';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { promises as fs } from 'fs';

const testAudio = path.resolve('audio/SirAnthony.mp3');

function hasFFmpeg(): boolean {
  try { execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch { return false; }
}

function hasFixture(): boolean {
  try { require('fs').accessSync(testAudio); return true; } catch { return false; }
}

const canRun = hasFFmpeg() && hasFixture();

const describeIfReady = canRun ? describe : describe.skip;

describeIfReady('renderRecipe', () => {
  test('renders a trim recipe to WAV file', async () => {
    const outputDir = path.join(os.tmpdir(), `render-test-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'output.wav');

    try {
      const recipe: EditRecipe = {
        version: 1,
        assetId: '00000000-0000-0000-0000-000000000001',
        clips: [
          {
            id: 'clip-1',
            sourceAssetId: '00000000-0000-0000-0000-000000000001',
            startTime: 0,
            endTime: 2,
            volume: 1,
            fadeIn: 0,
            fadeOut: 0,
          },
        ],
        normalize: false,
        outputFormat: 'wav',
        outputSampleRate: 44100,
      };

      await renderRecipe(recipe, {
        '00000000-0000-0000-0000-000000000001': testAudio,
      }, outputPath);

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  }, 30000);

  test('renders a preview as low-quality MP3', async () => {
    const outputDir = path.join(os.tmpdir(), `render-test-${Date.now()}`);
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'preview.mp3');

    try {
      const recipe: EditRecipe = {
        version: 1,
        assetId: '00000000-0000-0000-0000-000000000001',
        clips: [
          {
            id: 'clip-1',
            sourceAssetId: '00000000-0000-0000-0000-000000000001',
            startTime: 0,
            endTime: 2,
            volume: 1,
            fadeIn: 0.3,
            fadeOut: 0.3,
          },
        ],
        normalize: false,
        outputFormat: 'wav',
        outputSampleRate: 44100,
      };

      await renderRecipe(recipe, {
        '00000000-0000-0000-0000-000000000001': testAudio,
      }, outputPath, { preview: true });

      const stat = await fs.stat(outputPath);
      expect(stat.size).toBeGreaterThan(0);
    } finally {
      await fs.rm(outputDir, { recursive: true, force: true });
    }
  }, 30000);
});
