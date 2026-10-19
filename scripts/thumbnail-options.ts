/**
 * Builds thumbnail options (scored stills + contact sheet) from a rendered video.
 * Usage: npx tsx scripts/thumbnail-options.ts <video> <outDir> [--title "..."] [--samples 24] [--options 3]
 * Options only: nothing is selected or published; Jonathan picks (HB-4).
 */
import { buildThumbnailOptions } from '../src/lib/creator/thumbnails/options';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const [video, outDir] = process.argv.slice(2).filter((a, i, all) => !a.startsWith('--') && !(i > 0 && all[i - 1].startsWith('--')));
  if (!video || !outDir) {
    console.error('usage: tsx scripts/thumbnail-options.ts <video> <outDir> [--title "..."] [--samples N] [--options N]');
    process.exit(2);
  }
  const r = await buildThumbnailOptions({
    videoPath: video,
    outDir,
    title: arg('title'),
    samples: arg('samples') ? Number(arg('samples')) : undefined,
    optionCount: arg('options') ? Number(arg('options')) : undefined,
  });
  for (const o of r.options) console.log(`${o.file}  t=${o.timestampSec}s  score=${o.frame.score}  ${o.frame.reason}`);
  if (r.titleProblems.length) console.log(`TITLE PROBLEMS: ${r.titleProblems.join('; ')}`);
  console.log(`Wrote ${r.options.length} options and options.json to ${outDir}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
