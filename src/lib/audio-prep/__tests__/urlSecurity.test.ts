import { validateUrl } from '../urlSecurity';

describe('validateUrl', () => {
  test('accepts HTTPS URLs', async () => {
    await expect(validateUrl('https://example.com/audio.mp3')).resolves.toBeDefined();
  });

  test('rejects HTTP URLs', async () => {
    await expect(validateUrl('http://example.com/audio.mp3')).rejects.toThrow(/HTTPS required/);
  });

  test('rejects private IP 10.x', async () => {
    await expect(validateUrl('https://10.0.0.1/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects private IP 192.168.x', async () => {
    await expect(validateUrl('https://192.168.1.1/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects private IP 172.16-31.x', async () => {
    await expect(validateUrl('https://172.16.0.1/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects localhost', async () => {
    await expect(validateUrl('https://127.0.0.1/audio.mp3')).rejects.toThrow(/private/i);
    await expect(validateUrl('https://localhost/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects non-URL strings', async () => {
    await expect(validateUrl('not-a-url')).rejects.toThrow();
  });

  test('rejects metadata.google.internal', async () => {
    await expect(validateUrl('https://metadata.google.internal/something')).rejects.toThrow(/private|blocked/i);
  });
});
