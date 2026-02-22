import { extractYouTubeAudio, validateYouTubeUrl, extractVideoId } from '../ytdlp';

describe('validateYouTubeUrl', () => {
  test('accepts youtube.com watch URLs', () => {
    expect(validateYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtu.be short URLs', () => {
    expect(validateYouTubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtube.com/shorts/ URLs', () => {
    expect(validateYouTubeUrl('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(validateYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtube.com/live/ URLs', () => {
    expect(validateYouTubeUrl('https://youtube.com/live/dQw4w9WgXcQ')).toBe(true);
  });

  test('accepts youtube.com/embed/ URLs', () => {
    expect(validateYouTubeUrl('https://youtube.com/embed/dQw4w9WgXcQ')).toBe(true);
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

describe('extractVideoId', () => {
  test('extracts from ?v= param', () => {
    expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts from youtu.be', () => {
    expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts from /shorts/ path', () => {
    expect(extractVideoId('https://youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('extracts from /live/ path', () => {
    expect(extractVideoId('https://youtube.com/live/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });

  test('returns null for invalid URL', () => {
    expect(extractVideoId('not-a-url')).toBeNull();
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
