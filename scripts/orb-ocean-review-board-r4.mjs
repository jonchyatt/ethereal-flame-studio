/** Assemble the six unmodified round-4 evidence frames for independent review. */
import sharp from 'sharp';
import path from 'node:path';

const folder = process.argv[2] || 'C:/hal-jobs/FIREWATER/web/r4';
const output = process.argv[3] || 'argus-review-board-r4.png';
const panels = [
  ['Desktop / quiet voice', 'quiet-1920x1080.png', 0, 0],
  ['Desktop / loud voice', 'loud-1920x1080.png', 960, 0],
  ['Desktop / music high', 'music-high-1920x1080.png', 1920, 0],
  ['Phone / quiet voice', 'quiet-390x844.png', 0, 594],
  ['Phone / loud voice', 'loud-390x844.png', 960, 594],
  ['Phone / music high', 'music-high-390x844.png', 1920, 594],
];
const layers = [];
for (const [label, file, left, top] of panels) {
  layers.push({ input: Buffer.from(`<svg width="960" height="42"><text x="18" y="29" fill="#eff3ff" font-family="Arial" font-size="22">Round 4 — ${label}</text></svg>`), left, top });
  layers.push({ input: await sharp(path.join(folder, file)).resize(960, 540, { fit: 'contain' }).png().toBuffer(), left, top: top + 42 });
}
await sharp({ create: { width: 2880, height: 1176, channels: 3, background: '#0d111b' } })
  .composite(layers).png().toFile(path.join(folder, output));
console.log(path.join(folder, output));
