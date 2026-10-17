import { NextRequest } from 'next/server';
import { isAuthorizedLocalAgentRequest } from '../auth';

describe('local-agent shared-secret authorization', () => {
  const originalSecret = process.env.LOCAL_AGENT_SHARED_SECRET;

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.LOCAL_AGENT_SHARED_SECRET;
    else process.env.LOCAL_AGENT_SHARED_SECRET = originalSecret;
  });

  function request(token?: string): NextRequest {
    return new NextRequest('http://localhost/api/local-agent/poll', {
      headers: token ? { authorization: `Bearer ${token}` } : undefined,
    });
  }

  it('accepts only the exact configured secret', () => {
    process.env.LOCAL_AGENT_SHARED_SECRET = 'expected-secret';

    expect(isAuthorizedLocalAgentRequest(request('expected-secret'))).toBe(true);
    expect(isAuthorizedLocalAgentRequest(request('wrong'))).toBe(false);
    expect(isAuthorizedLocalAgentRequest(request('expected-secret-with-suffix'))).toBe(false);
    expect(isAuthorizedLocalAgentRequest(request())).toBe(false);
  });
});
