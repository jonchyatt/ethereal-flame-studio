import fs from 'fs';
import path from 'path';

const root = path.resolve(__dirname, '../../../..');
const publicSourceFiles = [
  'src/components/site/Listening.tsx',
  'src/components/scenes/orbAudio.ts',
  'src/components/scenes/LivingScene.tsx',
  'src/app/page.tsx',
  'src/app/listen/page.tsx',
  'src/app/from-reset-biology/page.tsx',
  'src/app/playlist-batches/page.tsx',
  'public/audio/ATTRIBUTION.md',
];
const publicSource = publicSourceFiles
  .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
  .join('\n');

const removedTerms = [
  ['Sere', 'nity'].join(''),
  ['Thin', 'keth'].join(''),
  ['James', ' Allen'].join(''),
  ['Libri', 'Vox'].join(''),
  ['Mark', ' Cawley'].join(''),
  ['first-', 'passage'].join(''),
];

describe('WAIA removed-reading guard', () => {
  it('does not expose the withdrawn reading or its attribution in public source', () => {
    for (const term of removedTerms) expect(publicSource).not.toMatch(new RegExp(term, 'i'));
  });

  it('keeps the orb behaviour while sourcing its voice meter from an approved clip', () => {
    const orbAudio = fs.readFileSync(
      path.join(root, 'src/components/scenes/orbAudio.ts'),
      'utf8',
    );
    expect(orbAudio).toContain("'/media/appreciation/19.mp4'");
    for (const clip of ['19', '12', '04']) {
      expect(fs.existsSync(path.join(root, 'public/media/appreciation', `${clip}.mp4`))).toBe(true);
    }
  });

  it('does not serve the withdrawn audio or transcript', () => {
    const reading = ['sere', 'nity'].join('');
    const voice = ['first-', 'passage'].join('');
    expect(fs.existsSync(path.join(root, 'public/media/reading', `${reading}.mp3`))).toBe(false);
    expect(fs.existsSync(path.join(root, 'public/media/reading', `${reading}.txt`))).toBe(false);
    expect(fs.existsSync(path.join(root, 'public/audio', `${voice}.mp3`))).toBe(false);
  });
});
