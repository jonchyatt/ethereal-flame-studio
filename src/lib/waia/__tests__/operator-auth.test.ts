import { NextRequest } from 'next/server';
import { authenticateWaiaOperator } from '../operator-auth';

const priorSecret = process.env.WAIA_OPERATOR_SECRET;
const priorActor = process.env.WAIA_OPERATOR_ID;

afterEach(() => {
  if (priorSecret === undefined) delete process.env.WAIA_OPERATOR_SECRET;
  else process.env.WAIA_OPERATOR_SECRET = priorSecret;
  if (priorActor === undefined) delete process.env.WAIA_OPERATOR_ID;
  else process.env.WAIA_OPERATOR_ID = priorActor;
});

function request(token?: string): NextRequest {
  return new NextRequest('http://localhost/api/playlist-batches', {
    headers: token ? { authorization: `Bearer ${token}` } : undefined,
  });
}

test('fails closed when the operator secret is unset or empty', () => {
  delete process.env.WAIA_OPERATOR_SECRET;
  expect(authenticateWaiaOperator(request())).toMatchObject({ ok: false, status: 503 });

  process.env.WAIA_OPERATOR_SECRET = '   ';
  expect(authenticateWaiaOperator(request())).toMatchObject({ ok: false, status: 503 });
});

test('rejects missing and incorrect credentials', () => {
  process.env.WAIA_OPERATOR_SECRET = 'correct-secret';
  expect(authenticateWaiaOperator(request())).toMatchObject({ ok: false, status: 401 });
  expect(authenticateWaiaOperator(request('wrong-secret'))).toMatchObject({ ok: false, status: 401 });
});

test('derives the actor from server configuration after authentication', () => {
  process.env.WAIA_OPERATOR_SECRET = 'correct-secret';
  process.env.WAIA_OPERATOR_ID = 'jon-server-principal';
  expect(authenticateWaiaOperator(request('correct-secret'))).toEqual({
    ok: true,
    actor: 'jon-server-principal',
  });
});
