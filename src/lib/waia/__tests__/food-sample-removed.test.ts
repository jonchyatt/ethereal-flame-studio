import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const publicSourceFiles = [
  'src/components/site/MediaPlayer.tsx',
  'src/components/site/Listening.tsx',
  'src/components/site/ProgramCards.tsx',
  'src/app/page.tsx',
  'src/app/from-reset-biology/page.tsx',
  'src/app/programs/page.tsx',
  'src/app/programs/advanced-hypnosis-sessions/page.tsx',
  'src/app/store/bundles/page.tsx',
];

const publicSource = publicSourceFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

describe('WAIA food-sample removal', () => {
  it('does not expose the Reset Biology food sample in public WAIA source', () => {
    expect(publicSource).not.toMatch(
      /A Gentle Reset|gentle-reset|FoodSample|food-relationship|food-related practice/i,
    );
  });

  it('keeps the Advanced Hypnosis route and its neutral recording notice', () => {
    const page = fs.readFileSync(
      path.join(root, 'src/app/programs/advanced-hypnosis-sessions/page.tsx'),
      'utf8',
    );
    expect(page).toContain('ProgramView id={HYPNOSIS_PROGRAM_ID}');
    expect(page).toContain('Sessions are being recorded.');
  });

  it('leaves the Reset Biology media files in place without linking to them', () => {
    expect(fs.existsSync(path.join(root, 'public/samples/gentle-reset-listen.m4a'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'public/samples/gentle-reset-free-sample.vtt'))).toBe(true);
    expect(publicSource).not.toContain('/samples/gentle-reset-');
  });
});
