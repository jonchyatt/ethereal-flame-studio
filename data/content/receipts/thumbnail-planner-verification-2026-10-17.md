# Thumbnail planner verification receipt

Date: 2026-10-17. Backlog item 14.

## What was run

1. The existing planner, `createThumbnailPlan` (src/lib/creator/thumbnail.ts), on a 60 s test video generated with ffmpeg (a colour fractal that fades in from black over 6 s). This was a synthetic stand-in, not a real render: the real renders live on Jonathan's PC and are not reachable from the cloud.
2. The new scored path, `npx tsx scripts/thumbnail-options.ts <video> <outDir> --title "..."`, on the same video.

## What failed in the old planner

- It never opens the video. Candidates are evenly spaced timestamps with a bias to the middle, so every score is a function of position only.
- A black intro or outro gets a real candidate. On a 52 s video the early and late candidates land at 7.4 s and 44.6 s whatever the picture holds.
- `selectedTimestampSec` was set to the top candidate automatically, which is a pick made for Jonathan (HB-4).
- The API route falls back to a 180 s duration when the job has no estimate, so timestamps can fall past the end of the real video. Not changed here; the new CLI reads the real duration with ffprobe.

## What was built

- `src/lib/creator/thumbnails/score.ts`: scores a frame (rejects black, blown-out and flat frames; rewards a glow on a dark field, contrast, colour, and brightness in the primary subject zone of the safe-zone preset).
- `frames.ts`: ffmpeg grabs small frames to score, writes 1280x720 stills and a contact sheet.
- `options.ts`: samples the video, keeps the best frames that are spaced apart, writes `option-*.png`, `contact-sheet.png` and `options.json`. `selectedTimestampSec` is null: options only.
- `soul.ts`: HB-8 check for titles and thumbnail text (vlog framing, first person, clickbait, engagement bait, shouting, Crit Fail tone, outcome or health claims, listicle bait, shortened name). It cannot judge tone; a pass means no known violation.
- `scripts/thumbnail-options.ts`: the command above.

## Result

Tests: 58 pass under src/lib/creator, including a real ffmpeg run that skips the black intro. Still to do on the PC: run the command on the real owned-pilot draft render and attach the contact sheet.
