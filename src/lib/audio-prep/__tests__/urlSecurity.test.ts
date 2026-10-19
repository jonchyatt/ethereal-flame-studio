import { validateUrl } from '../urlSecurity';

// Resolve public hostnames from a fixed table so the suite runs offline.
jest.mock('dns', () => {
  const actual = jest.requireActual('dns');
  const table: Record<string, string[]> = { 'example.com': ['93.184.216.34'] };
  const lookup = (host: string, cb: (err: any, addrs?: string[]) => void) => {
    if (table[host]) cb(null, table[host]);
    else cb(Object.assign(new Error('ENOTFOUND'), { code: 'ENOTFOUND' }));
  };
  return { ...actual, resolve4: lookup, resolve6: (_h: string, cb: any) => cb(Object.assign(new Error('ENODATA'), { code: 'ENODATA' })) };
});

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

  test('rejects IPv6 ULA fd00::/8', async () => {
    await expect(validateUrl('https://[fd00::1]/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects IPv4-mapped loopback', async () => {
    await expect(validateUrl('https://[::ffff:127.0.0.1]/audio.mp3')).rejects.toThrow(/private/i);
  });

  test('rejects non-URL strings', async () => {
    await expect(validateUrl('not-a-url')).rejects.toThrow();
  });

  test('rejects metadata.google.internal', async () => {
    await expect(validateUrl('https://metadata.google.internal/something')).rejects.toThrow(/private|blocked/i);
  });
});
