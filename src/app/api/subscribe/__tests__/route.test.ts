import { NextRequest } from 'next/server';
import { POST } from '../route';
import { clearSubscribeRateLimitForTests } from '@/lib/subscribers/rateLimit';
import { notifyOwnerOfNewSubscriber } from '@/lib/subscribers/notify';
import { saveSubscriber } from '@/lib/subscribers/store';

jest.mock('@/lib/subscribers/store', () => ({ saveSubscriber: jest.fn() }));
jest.mock('@/lib/subscribers/notify', () => ({ notifyOwnerOfNewSubscriber: jest.fn() }));

const save = saveSubscriber as jest.MockedFunction<typeof saveSubscriber>;
const notify = notifyOwnerOfNewSubscriber as jest.MockedFunction<typeof notifyOwnerOfNewSubscriber>;

function request(body: Record<string, unknown>, ip = '198.51.100.10') {
  return new NextRequest('http://localhost/api/subscribe', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': ip, 'user-agent': 'route-test' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  clearSubscribeRateLimitForTests();
  jest.clearAllMocks();
  save.mockResolvedValue({ created: true });
  notify.mockResolvedValue();
});

test('stores a normalized valid email with its source page', async () => {
  const response = await POST(request({ email: '  PERSON@Example.TEST ', sourcePage: '/store' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, message: 'Thanks — you’re on the list.' });
  expect(save).toHaveBeenCalledWith(expect.objectContaining({ email: 'person@example.test', sourcePage: '/store', userAgent: 'route-test' }));
  expect(notify).toHaveBeenCalledWith('/store');
});

test('rejects an invalid email', async () => {
  const response = await POST(request({ email: 'not-an-email', sourcePage: '/store' }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ ok: false, error: 'Please enter a valid email address.' });
  expect(save).not.toHaveBeenCalled();
});

test('returns the exact same thank-you for a duplicate', async () => {
  save.mockResolvedValue({ created: false });
  const response = await POST(request({ email: 'person@example.test', sourcePage: '/' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, message: 'Thanks — you’re on the list.' });
  expect(notify).not.toHaveBeenCalled();
});

test('quietly accepts a honeypot submission without saving it', async () => {
  const response = await POST(request({ email: 'person@example.test', sourcePage: '/', website: 'https://spam.invalid' }));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true, message: 'Thanks — you’re on the list.' });
  expect(save).not.toHaveBeenCalled();
});

test('allows five attempts per IP per hour and rate limits the sixth', async () => {
  for (let n = 0; n < 5; n++) {
    expect((await POST(request({ email: `person${n}@example.test`, sourcePage: '/' }))).status).toBe(200);
  }
  const limited = await POST(request({ email: 'six@example.test', sourcePage: '/' }));
  expect(limited.status).toBe(429);
  expect(await limited.json()).toEqual({ ok: false, error: 'Too many attempts. Please try again in an hour.' });
});
