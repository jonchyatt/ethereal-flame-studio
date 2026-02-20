import { extractYouTubeAudio, validateYouTubeUrl } from '../ytdlp';

describe('validateYouTubeUrl', () => {
  test('accepts youtube.com watch URLs', () => {
    expect(validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtu.be short URLs', () => {
    expect(validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  test('rejects non-YouTube URLs', () => {
    expect(validateYouTubeUrl('https://vimeo.com/12345')).toBe(false);
  });

  test('rejects playlist URLs', () => {
    expect(validateYouTubeUrl('https://youtube.com/playlist?list=PLtest')).toBe(false);
  });

  test('rejects non-URL strings', () => {
    expect(validateYouTubeUrl('not-a-url')).toBe(false);
  });

  test('accepts m.youtube.com URLs', () => {
    expect(validateYouTubeUrl('https://m.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  test('rejects non-HTTPS YouTube URLs', () => {
    expect(validateYouTubeUrl('http://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(false);
  });
});

describe('extractYouTubeAudio', () => {
  test('rejects immediately when AbortSignal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(
      extractYouTubeAudio('https://www.youtube.com/watch?v=dQw4w9WgXcQ', process.cwd(), {
        signal: controller.signal,
      })
    ).rejects.toThrow(/cancelled/i);
  });
});
