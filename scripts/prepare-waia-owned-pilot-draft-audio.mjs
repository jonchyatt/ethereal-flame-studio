#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const sourcePath = 'C:/Users/jonch/Projects/jarvis/data/tts-render/masters/01-mmm1-reset-relationship-food.json';
const outputPath = path.join(repoRoot, 'data', 'waia-owned-pilot-draft', 'waia-owned-source-narration.txt');

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const narration = source.segments
  .filter((segment) => segment.type === 'text')
  .map((segment) => segment.text.replace(/---/g, ' ').replace(/\s+/g, ' ').trim())
  .filter(Boolean)
  .join('\n\n');

if (!narration) throw new Error('No narration text found in the owned-source segment index.');

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${narration}\n`, 'utf8');
console.log(`Wrote ${outputPath} (${narration.split(/\s+/).length} words) from ${sourcePath}.`);
