/**
 * Local evidence capture for the living orb. The page itself joins the canvas
 * stream to Web Audio's mixed MediaStream; ffmpeg then remuxes the WebM so the
 * delivered evidence always contains the heard voice, sea, and music beds.
 *
 * Usage: node scripts/capture-orb-ocean-r3.mjs [base URL] [output folder]
 */
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.argv[2] || 'http://127.0.0.1:3103';
const output = path.resolve(process.argv[3] || 'C:/hal-jobs/FIREWATER/web/r3');
const mode = process.argv[4] || 'both';
const duration = 20_000;

const mean = values => values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
function pearson(a, b) {
  const aMean = mean(a), bMean = mean(b);
  let sum = 0, aSq = 0, bSq = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const x = a[i] - aMean, y = b[i] - bMean;
    sum += x * y; aSq += x * x; bSq += y * y;
  }
  return sum / Math.sqrt(Math.max(1e-12, aSq * bSq));
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-y', '-v', 'error', ...args], { stdio: 'inherit' });
}

async function capture(viewport, label) {
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: false,
    args: [
      '--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist',
      '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding',
      '--window-size=1920,1080',
    ],
  });
  try {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const quality = 'auto';
  await page.goto(`${base}/scenes/orb-ocean?capture=1&controls=1`, { waitUntil: 'networkidle' });
  await page.locator('canvas').waitFor();
  await page.waitForFunction(() => window.__livingScene?.stats().frames > 30);
  if (await page.evaluate(() => window.__livingScene.audioState()) !== 'not-started') throw new Error('Unexpected autoplay');
  await page.getByLabel('Quality').selectOption(quality);
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.waitForFunction(() => window.__livingScene?.audioState() === 'running');
  await page.waitForTimeout(750);

  // This metric reads a sparse grid from the real rendered pixels, not the
  // shader controls: centre cloud area, white glint road, and star brightness.
  const sample = () => page.evaluate(() => {
    const canvas = document.querySelector('canvas');
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl');
    if (!canvas || !gl || !window.__livingScene) throw new Error('Capture diagnostics unavailable');
    const pixels = new Uint8Array(canvas.width * canvas.height * 4);
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    let orb = 0, glint = 0, stars = 0, orbN = 0, glintN = 0, starsN = 0;
    const step = 2;
    for (let top = 0; top < canvas.height; top += step) {
      const y = 1 - top / canvas.height;
      for (let x = 0; x < canvas.width; x += step) {
        const nx = x / canvas.width;
        const index = ((canvas.height - 1 - top) * canvas.width + x) * 4;
        const r = pixels[index] / 255, g = pixels[index + 1] / 255, b = pixels[index + 2] / 255;
        const peak = Math.max(r, g, b), floor = Math.min(r, g, b);
        const lum = r * .2126 + g * .7152 + b * .0722;
        if (nx > .16 && nx < .84 && y > .40 && y < .86) {
          orbN++;
          if (peak > .34 && lum > .13) orb++;
        }
        if (nx > .25 && nx < .75 && y > .02 && y < .20) {
          glintN++;
          glint += Math.max(0, floor - .4) * (peak > .58 ? 1 : 0);
        }
        // Top corners stay outside even the loud cloud and its bloom. Keep the
        // mask fixed for both viewports; do not measure orb light as twinkle.
        if (y > .82 && (nx < .22 || nx > .78)) {
          starsN++;
          // Sum the rendered luminance above the dark-sky floor. Do not
          // down-weight whites: that inverted the very twinkle being measured.
          stars += Math.max(0, peak - .22);
        }
      }
    }
    return {
      at: performance.now(), levels: window.__livingScene.levels(),
      orbArea: orb / Math.max(1, orbN), glint: glint / Math.max(1, glintN), starTwinkle: stars / Math.max(1, starsN),
      stats: window.__livingScene.stats(), canvas: [canvas.width, canvas.height],
    };
  });

  const started = Date.now();
  await page.evaluate(() => {
    const diagnostics = window.__livingScene;
    const canvas = document.querySelector('canvas');
    if (!diagnostics || !canvas) throw new Error('Capture diagnostics unavailable');
    const visual = canvas.captureStream(30);
    const audio = diagnostics.audio();
    const mix = new MediaStream([...visual.getVideoTracks(), ...(audio?.getAudioTracks() || [])]);
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus' : 'video/webm;codecs=vp8,opus';
    const chunks = [];
    const recorder = new MediaRecorder(mix, { mimeType, videoBitsPerSecond: 11_000_000, audioBitsPerSecond: 192_000 });
    window.__orbR3Recording = new Promise(resolve => {
      recorder.ondataavailable = event => { if (event.data.size) chunks.push(event.data); };
      recorder.onstop = async () => {
        const bytes = new Uint8Array(await new Blob(chunks, { type: mimeType }).arrayBuffer());
        let binary = '';
        for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
        resolve(btoa(binary));
      };
    });
    recorder.start(1000);
    window.__orbR3Start = performance.now();
    window.__orbR3Stop = () => recorder.stop();
  });

  const samples = [];
  while (Date.now() - started < duration) {
    await page.waitForTimeout(250);
    samples.push(await sample());
  }
  const encoded = await page.evaluate(async () => {
    window.__orbR3Stop();
    return await window.__orbR3Recording;
  });
  const recordingStart = await page.evaluate(() => window.__orbR3Start);

  const prefix = path.join(output, 'recordings', `orb-ocean-full-mix-${label}`);
  const raw = `${prefix}-raw.webm`;
  const delivered = `${prefix}-20s.webm`;
  await writeFile(raw, Buffer.from(encoded, 'base64'));
  ffmpeg(['-i', raw, '-t', '20', '-map', '0:v:0', '-map', '0:a:0', '-c', 'copy', delivered]);
  await rm(raw, { force: true });

  const steady = samples.filter(({ at }) => at - samples[0].at > 3000);
  const quiet = steady.reduce((lowest, current) => current.levels.voice < lowest.levels.voice ? current : lowest);
  const loud = steady.reduce((highest, current) => current.levels.voice > highest.levels.voice ? current : highest);
  const quietSeconds = (quiet.at - recordingStart) / 1000;
  const loudSeconds = (loud.at - recordingStart) / 1000;
  const musicHigh = steady.reduce((a,b) => a.levels.music > b.levels.music ? a : b);
  const musicSeconds = (musicHigh.at - recordingStart) / 1000;
  ffmpeg(['-ss', quietSeconds.toFixed(3), '-i', delivered, '-frames:v', '1', path.join(output, `quiet-${label}.png`)]);
  ffmpeg(['-ss', loudSeconds.toFixed(3), '-i', delivered, '-frames:v', '1', path.join(output, `loud-${label}.png`)]);
  ffmpeg(['-ss', musicSeconds.toFixed(3), '-i', delivered, '-frames:v', '1', path.join(output, `music-high-${label}.png`)]);

  const intervals = samples.at(-1).stats.frameIntervals;
  const measurements = {
    viewport, canvas: samples.at(-1).canvas, recording: path.basename(delivered),
    errors, noAutoplay: true, quality: samples.at(-1).stats.quality,
    gpu: await page.evaluate(() => { const gl=document.querySelector('canvas').getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');return ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER); }),
    elapsedSeconds: (Date.now() - started) / 1000,
    frameIntervalMeanMs: mean(intervals), frameIntervalP95Ms: [...intervals].sort((a, b) => a - b)[Math.floor(intervals.length * .95)],
    renderCpuMeanMs: mean(samples.at(-1).stats.renderCpuTimes),
    correlations: {
      orbAreaVsVoiceRms: pearson(steady.map(s => s.orbArea), steady.map(s => s.levels.voice)),
      glintVsOceanRms: pearson(steady.map(s => s.glint), steady.map(s => s.levels.ocean)),
      starTwinkleVsMusicEnergy: pearson(steady.map(s => s.starTwinkle), steady.map(s => s.levels.music)),
    },
    quiet: { seconds: quietSeconds, levels: quiet.levels }, loud: { seconds: loudSeconds, levels: loud.levels },
    musicHigh: { seconds: musicSeconds, levels: musicHigh.levels }, samples,
  };
  await writeFile(path.join(output, `measurements-${label}.json`), JSON.stringify(measurements, null, 2));
  console.log(JSON.stringify({
    viewport: measurements.viewport, canvas: measurements.canvas, recording: measurements.recording,
    elapsedSeconds: measurements.elapsedSeconds, frameIntervalMeanMs: measurements.frameIntervalMeanMs,
    frameIntervalP95Ms: measurements.frameIntervalP95Ms, renderCpuMeanMs: measurements.renderCpuMeanMs,
    correlations: measurements.correlations, quiet: measurements.quiet, loud: measurements.loud,
  }, null, 2));

  return measurements;
  } finally { await browser.close(); }
}

await mkdir(path.join(output, 'recordings'), { recursive: true });
const results = {};
if (mode === 'both' || mode === 'desktop') results.desktop = await capture({ width: 1920, height: 1080 }, '1920x1080');
if (mode === 'both' || mode === 'phone') results.phone = await capture({ width: 390, height: 844 }, '390x844');
if (mode === 'both') await writeFile(path.join(output, 'measurements.json'), JSON.stringify(results, null, 2));
for (const [label, result] of Object.entries(results)) {
  assert.deepEqual(result.errors, [], `${label}: browser errors`);
  assert.ok(!/swiftshader|software/i.test(result.gpu), `${label}: hardware GPU required`);
  for (const [metric, value] of Object.entries(result.correlations)) {
    assert.ok(value >= .6, `${label} ${metric}: ${value} is below 0.6`);
  }
}
