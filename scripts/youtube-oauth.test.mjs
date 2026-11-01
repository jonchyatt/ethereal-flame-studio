import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, request } from 'node:http';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { parse } from 'dotenv';
import { main as mint } from './youtube-mint-token.mjs';
import { main as check } from './youtube-check-auth.mjs';
import {
  CHANNEL_KEYS, DEFAULT_REDIRECT_URI, SCOPES, SafeError, createProof, listBoundChannels, makeOAuthClient, readEnvironment,
  readSlot, requireVariables, safeErrorMessage, saveRefreshToken, slotVariables,
  startCallbackListener, updateEnvText, validateRedirectUri,
} from './lib/youtube-oauth.mjs';

async function envFixture(t, contents = '') {
  const directory = await mkdtemp(join(tmpdir(), 'youtube-oauth-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const envPath = join(directory, '.env.local');
  await writeFile(envPath, contents);
  return { directory, envPath };
}

function clientFixture(overrides = {}) {
  return {
    generateAuthUrl(options) { this.options = options; return 'https://accounts.google.com/o/oauth2/v2/auth?mock-consent'; },
    async getToken(options) { this.exchange = options; return { tokens: { refresh_token: 'new-refresh-token', access_token: 'new-access-token' } }; },
    setCredentials(credentials) { this.credentials = credentials; },
    ...overrides,
  };
}

function mintDependencies(envPath, client, extra = {}) {
  const logs = [];
  const state = { closed: false };
  return {
    logs, state,
    options: {
      envPath, log: (line) => logs.push(line), makeClient: async (options) => { state.clientOptions = options; return client; },
      listen: async (options) => { state.listenerOptions = options; return { code: Promise.resolve('mock-code'), close() { state.closed = true; } }; },
      listChannels: async () => [{ id: 'UC-fixture', title: 'Fixture channel' }],
      ...extra,
    },
  };
}

async function unusedPort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function callbackRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const call = request(url, options, (response) => {
      let text = '';
      response.setEncoding('utf8');
      response.on('data', (data) => { text += data; });
      response.on('end', () => resolve({ status: response.statusCode, text }));
    });
    call.on('error', reject);
    call.end();
  });
}

test('slots are exact and never fall back to primary credentials', () => {
  assert.equal(slotVariables('primary').CLIENT_ID, 'YOUTUBE_PUBLISH_CLIENT_ID');
  assert.equal(slotVariables('waia').REFRESH_TOKEN, 'YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN');
  assert.equal(slotVariables('critfail').CLIENT_SECRET, 'YOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET');
  const slot = readSlot('critfail', { YOUTUBE_PUBLISH_CLIENT_ID: 'primary-id', YOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET: '  ' });
  assert.throws(() => requireVariables(slot, ['CLIENT_ID', 'CLIENT_SECRET']), /YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID, YOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET/);
  for (const key of [undefined, '', 'unknown', 'WAIA']) assert.throws(() => slotVariables(key), SafeError);
});

test('environment loading does not inherit process credentials', async (t) => {
  const { envPath } = await envFixture(t);
  assert.deepEqual(await readEnvironment(envPath), {});
  await assert.rejects(mint(['waia'], { envPath }), /YOUTUBE_PUBLISH_WAIA_CLIENT_ID, YOUTUBE_PUBLISH_WAIA_CLIENT_SECRET/);
  await assert.rejects(mint([], { envPath }), /channel key is required/);
});

test('env updates preserve unrelated bytes and CRLF, replacing every duplicate target', () => {
  const original = '# header\r\nOTHER="a\r\nb" # keep\r\nexport YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN = "old" # old\r\nYOUTUBE_PUBLISH_REFRESH_TOKEN=primary\r\nYOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN=duplicate\r\nTAIL=end';
  const expected = '# header\r\nOTHER="a\r\nb" # keep\r\nexport YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN = "new-token"\r\nYOUTUBE_PUBLISH_REFRESH_TOKEN=primary\r\nYOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN="new-token"\r\nTAIL=end';
  assert.equal(updateEnvText(original, 'YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN', 'new-token'), expected);
  assert.equal(parse(expected).YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN, 'new-token');
});

test('env append handles missing final newline and target multiline values safely', () => {
  assert.equal(updateEnvText('OTHER=yes', 'YOUTUBE_PUBLISH_REFRESH_TOKEN', 'new'), 'OTHER=yes\nYOUTUBE_PUBLISH_REFRESH_TOKEN="new"\n');
  assert.equal(updateEnvText('OTHER=yes\r\n', 'YOUTUBE_PUBLISH_REFRESH_TOKEN', 'new'), 'OTHER=yes\r\nYOUTUBE_PUBLISH_REFRESH_TOKEN="new"\r\n');
  assert.equal(updateEnvText('YOUTUBE_PUBLISH_REFRESH_TOKEN="old\nvalue"\nAFTER=yes\n', 'YOUTUBE_PUBLISH_REFRESH_TOKEN', 'new'), 'YOUTUBE_PUBLISH_REFRESH_TOKEN="new"\nAFTER=yes\n');
  for (const token of ['', '  ', 'unsafe\nINJECT=yes', 'unsafe\rvalue']) assert.throws(() => updateEnvText('KEEP=yes', 'YOUTUBE_PUBLISH_REFRESH_TOKEN', token), SafeError);
  assert.throws(() => updateEnvText('KEEP=yes', 'OTHER_SECRET', 'new-token'), SafeError);
});

test('atomic token write uses the current file and cleans temporary artifacts', async (t) => {
  const { envPath, directory } = await envFixture(t, 'INITIAL=yes\r\n');
  await writeFile(envPath, 'INITIAL=yes\r\nCONCURRENT_UPDATE=preserved\r\n');
  await saveRefreshToken(envPath, 'YOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN', 'new-refresh-token');
  assert.equal(await readFile(envPath, 'utf8'), 'INITIAL=yes\r\nCONCURRENT_UPDATE=preserved\r\nYOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN="new-refresh-token"\r\n');
  assert.deepEqual(await readdir(directory), ['.env.local']);
});

test('failed writes preserve the original and do not remove another writer lock', async (t) => {
  const { envPath } = await envFixture(t, 'KEEP=yes\n');
  await writeFile(`${envPath}.youtube-oauth.lock`, 'another writer');
  await assert.rejects(saveRefreshToken(envPath, 'YOUTUBE_PUBLISH_REFRESH_TOKEN', 'new'), /Another token write is active/);
  assert.equal(await readFile(`${envPath}.youtube-oauth.lock`, 'utf8'), 'another writer');
  assert.equal(await readFile(envPath, 'utf8'), 'KEEP=yes\n');
});

test('redirect URLs allow loopback only and proof uses random state and SHA256 PKCE', () => {
  for (const url of [DEFAULT_REDIRECT_URI, 'http://localhost:8765/callback', 'http://[::1]:8765/callback']) assert.equal(validateRedirectUri(url).href, url);
  for (const url of ['https://example.com/callback', 'http://0.0.0.0:8765/callback', 'http://127.0.0.1:0/callback', 'http://user@localhost/callback', 'http://localhost/callback?secret=yes', 'http://localhost/callback#fragment', 'garbage']) assert.throws(() => validateRedirectUri(url), SafeError);
  const first = createProof();
  const second = createProof();
  assert.notEqual(first.state, second.state);
  assert.notEqual(first.verifier, second.verifier);
  assert.equal(first.verifier.length, 43);
  assert.equal(first.challenge, createHash('sha256').update(first.verifier).digest('base64url'));
});

test('callback ignores wrong path, state, and Host, then accepts one matching callback', async (t) => {
  const redirectUri = `http://127.0.0.1:${await unusedPort()}/callback`;
  const listener = await startCallbackListener({ redirectUri, state: 'correct-state', timeoutMs: 2000 });
  t.after(listener.close);
  assert.equal((await callbackRequest(`${redirectUri}-wrong?state=correct-state&code=secret-code`)).status, 404);
  assert.equal((await callbackRequest(`${redirectUri}?state=wrong&code=secret-code`)).status, 400);
  assert.equal((await callbackRequest(`${redirectUri}?state=correct-state&state=other&code=secret-code`)).status, 400);
  assert.equal((await callbackRequest(`${redirectUri}?state=correct-state&code=secret-code`, { headers: { Host: 'evil.example' } })).status, 400);
  const response = await callbackRequest(`${redirectUri}?state=correct-state&code=secret-code`);
  assert.equal(response.status, 200);
  assert.doesNotMatch(response.text, /secret-code/);
  assert.equal(await listener.code, 'secret-code');
});

test('callback denial and missing code fail without echoing provider error details', async (t) => {
  for (const params of ['error=secret-provider-error', 'unrelated=yes']) {
    const redirectUri = `http://127.0.0.1:${await unusedPort()}/callback`;
    const listener = await startCallbackListener({ redirectUri, state: 'state', timeoutMs: 2000 });
    t.after(listener.close);
    const rejection = assert.rejects(listener.code, (error) => error instanceof SafeError && !error.message.includes('secret-provider-error'));
    const response = await callbackRequest(`${redirectUri}?state=state&${params}`);
    assert.equal(response.status, 400);
    assert.doesNotMatch(response.text, /secret-provider-error/);
    await rejection;
  }
});

test('listener times out, releases its port, and reports busy port safely', async (t) => {
  const port = await unusedPort();
  const redirectUri = `http://127.0.0.1:${port}/callback`;
  const first = await startCallbackListener({ redirectUri, state: 'state', timeoutMs: 30 });
  t.after(first.close);
  await assert.rejects(startCallbackListener({ redirectUri, state: 'other' }), /Could not start the loopback listener/);
  await assert.rejects(first.code, /Timed out/);
  const next = await startCallbackListener({ redirectUri, state: 'state', timeoutMs: 2000 });
  const rejection = assert.rejects(next.code, /cancelled/);
  next.close();
  await rejection;
});

test('mock mint requests both scopes/offline/PKCE, writes only the selected slot, and prints channel identity', async (t) => {
  const { envPath } = await envFixture(t, 'KEEP=yes\r\nYOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID=slot-id\r\nYOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET=slot-secret\r\nYOUTUBE_PUBLISH_REFRESH_TOKEN=primary-refresh\r\n');
  const client = clientFixture();
  const fixture = mintDependencies(envPath, client);
  await mint(['critfail'], fixture.options);
  assert.deepEqual(client.options.scope, [...SCOPES]);
  assert.equal(client.options.access_type, 'offline');
  assert.match(client.options.prompt, /consent/);
  assert.equal(client.options.code_challenge_method, 'S256');
  assert.equal(client.options.code_challenge, createHash('sha256').update(client.exchange.codeVerifier).digest('base64url'));
  assert.equal(client.options.state, fixture.state.listenerOptions.state);
  assert.equal(client.exchange.code, 'mock-code');
  assert.deepEqual(fixture.state.clientOptions, { clientId: 'slot-id', clientSecret: 'slot-secret', redirectUri: DEFAULT_REDIRECT_URI });
  const updated = parse(await readFile(envPath, 'utf8'));
  assert.equal(updated.YOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN, 'new-refresh-token');
  assert.equal(updated.YOUTUBE_PUBLISH_REFRESH_TOKEN, 'primary-refresh');
  assert.equal(fixture.state.closed, true);
  assert.match(fixture.logs.join('\n'), /UC-fixture/);
  assert.doesNotMatch(fixture.logs.join('\n'), /slot-secret|new-refresh-token|new-access-token|mock-code/);
});

test('mint redirect override wins over slot setting, while other slots cannot supply clients', async (t) => {
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_WAIA_CLIENT_ID=waia-id\nYOUTUBE_PUBLISH_WAIA_CLIENT_SECRET=waia-secret\nYOUTUBE_PUBLISH_WAIA_REDIRECT_URI=http://localhost:9000/callback\n');
  const fixture = mintDependencies(envPath, clientFixture());
  await mint(['waia', '--redirect-uri', 'http://127.0.0.1:9001/callback'], fixture.options);
  assert.equal(fixture.state.clientOptions.redirectUri, 'http://127.0.0.1:9001/callback');
  const defaultFixture = mintDependencies(envPath, clientFixture());
  await mint(['waia'], defaultFixture.options);
  assert.equal(defaultFixture.state.clientOptions.redirectUri, 'http://localhost:9000/callback');
  await assert.rejects(mint(['critfail'], fixture.options), /YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID/);
  await assert.rejects(mint(['waia', '--unknown'], fixture.options), /Usage:/);
});

test('exchange failure or missing refresh token never overwrites existing token and closes listener', async (t) => {
  const original = 'YOUTUBE_PUBLISH_CLIENT_ID=id\nYOUTUBE_PUBLISH_CLIENT_SECRET=secret\nYOUTUBE_PUBLISH_REFRESH_TOKEN=old-token\n';
  const { envPath } = await envFixture(t, original);
  for (const getToken of [async () => { throw new Error('secret-response'); }, async () => ({ tokens: { access_token: 'secret-access' } })]) {
    const fixture = mintDependencies(envPath, clientFixture({ getToken }));
    await assert.rejects(mint(['primary'], fixture.options), (error) => error instanceof SafeError && !error.message.includes('secret-response'));
    assert.equal(await readFile(envPath, 'utf8'), original);
    assert.equal(fixture.state.closed, true);
    assert.doesNotMatch(fixture.logs.join('\n'), /secret-response|secret-access/);
  }
});

test('a channel probe failure after mint explicitly reports that the token was saved', async (t) => {
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_CLIENT_ID=id\nYOUTUBE_PUBLISH_CLIENT_SECRET=secret\n');
  const fixture = mintDependencies(envPath, clientFixture(), { listChannels: async () => { throw new Error('secret-channel-response'); } });
  await assert.rejects(mint(['primary'], fixture.options), /Saved YOUTUBE_PUBLISH_REFRESH_TOKEN, but the bound-channel check failed/);
  assert.equal(parse(await readFile(envPath, 'utf8')).YOUTUBE_PUBLISH_REFRESH_TOKEN, 'new-refresh-token');
});

test('interrupting an in-flight exchange does not save the resulting token', async (t) => {
  const original = 'YOUTUBE_PUBLISH_CLIENT_ID=id\nYOUTUBE_PUBLISH_CLIENT_SECRET=secret\n';
  const { envPath } = await envFixture(t, original);
  const before = process.listenerCount('SIGINT');
  const fixture = mintDependencies(envPath, clientFixture({ getToken: async () => {
    process.emit('SIGINT');
    return { tokens: { refresh_token: 'interrupted-token' } };
  } }));
  await assert.rejects(mint(['primary'], fixture.options), /interrupted/);
  assert.equal(await readFile(envPath, 'utf8'), original);
  assert.equal(process.listenerCount('SIGINT'), before);
  assert.equal(fixture.state.closed, true);
});

test('dry-run inventories all three slots without creating clients, networking, or printing values', async (t) => {
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_CLIENT_ID=never-print-id\nYOUTUBE_PUBLISH_WAIA_ACCESS_TOKEN=never-print-access\nYOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET=never-print-secret\n');
  const logs = [];
  await check([], { envPath, log: (line) => logs.push(line), makeClient: () => assert.fail('dry-run created a client'), listChannels: () => assert.fail('dry-run called the network') });
  assert.equal(logs.length, 15);
  for (const key of CHANNEL_KEYS) assert.ok(logs.some((line) => line.startsWith(slotVariables(key).CLIENT_ID)));
  assert.ok(logs.includes('YOUTUBE_PUBLISH_WAIA_ACCESS_TOKEN: present'));
  assert.ok(logs.includes('YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID: missing'));
  assert.doesNotMatch(logs.join('\n'), /never-print/);
});

test('probe uses full refresh trio first, static access token second, with no cross-slot fallback', async (t) => {
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_CLIENT_ID=primary-id\nYOUTUBE_PUBLISH_CLIENT_SECRET=primary-secret\nYOUTUBE_PUBLISH_REFRESH_TOKEN=primary-refresh\nYOUTUBE_PUBLISH_ACCESS_TOKEN=old-access\nYOUTUBE_PUBLISH_WAIA_ACCESS_TOKEN=waia-access\n');
  const clients = [];
  const logs = [];
  await assert.rejects(check(['--probe'], {
    envPath, log: (line) => logs.push(line),
    makeClient: async (options) => { const client = clientFixture(); clients.push({ options, client }); return client; },
    listChannels: async () => [{ id: 'UC-bound', title: 'Bound channel' }],
  }), /One or more YouTube credential probes failed/);
  assert.equal(clients.length, 2);
  assert.deepEqual(clients[0].client.credentials, { refresh_token: 'primary-refresh' });
  assert.deepEqual(clients[1].client.credentials, { access_token: 'waia-access' });
  assert.equal(clients[1].options.clientId, undefined);
  assert.match(logs.join('\n'), /YOUTUBE_PUBLISH_CRITFAIL_CLIENT_ID, YOUTUBE_PUBLISH_CRITFAIL_CLIENT_SECRET, YOUTUBE_PUBLISH_CRITFAIL_REFRESH_TOKEN/);
  assert.doesNotMatch(logs.join('\n'), /primary-secret|primary-refresh|waia-access|old-access/);
});

test('probe rejects an incomplete refresh trio even when a static access token is present', async (t) => {
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_WAIA_REFRESH_TOKEN=refresh\nYOUTUBE_PUBLISH_WAIA_ACCESS_TOKEN=access\n');
  const logs = [];
  await assert.rejects(check(['waia', '--probe'], { envPath, log: (line) => logs.push(line), makeClient: () => assert.fail('incomplete trio reached client') }), /probes failed/);
  assert.match(logs.join('\n'), /YOUTUBE_PUBLISH_WAIA_CLIENT_ID, YOUTUBE_PUBLISH_WAIA_CLIENT_SECRET/);
});

test('provider failures are replaced with a fixed message and invalid arguments fail early', async (t) => {
  assert.doesNotMatch(safeErrorMessage(new Error('Bearer secret')), /Bearer|secret/);
  const { envPath } = await envFixture(t, 'YOUTUBE_PUBLISH_WAIA_ACCESS_TOKEN=waia-access\n');
  const logs = [];
  await assert.rejects(check(['waia', '--probe'], { envPath, log: (line) => logs.push(line), makeClient: async () => clientFixture(), listChannels: async () => { throw new Error('Bearer waia-access'); } }), /probes failed/);
  assert.doesNotMatch(logs.join('\n'), /Bearer|waia-access/);
  await assert.rejects(check(['--unknown'], { envPath }), /channel key is required/);
  await assert.rejects(check(['waia', 'critfail'], { envPath }), /Usage:/);
});

test('installed Google library builds consent URL and channels.list uses a mocked transport', async () => {
  const client = await makeOAuthClient({ clientId: 'fixture-client', clientSecret: 'fixture-secret', redirectUri: DEFAULT_REDIRECT_URI });
  const url = new URL(client.generateAuthUrl({ access_type: 'offline', prompt: 'consent select_account', scope: [...SCOPES], state: 'fixture-state', code_challenge: 'fixture-challenge', code_challenge_method: 'S256' }));
  assert.equal(url.hostname, 'accounts.google.com');
  assert.equal(url.searchParams.get('access_type'), 'offline');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(url.searchParams.get('redirect_uri'), DEFAULT_REDIRECT_URI);
  assert.doesNotMatch(url.href, /fixture-secret/);
  assert.equal(client.transporter.defaults.timeout, 30_000);
  let requestOptions;
  const channels = await listBoundChannels({ request: async (options) => {
    requestOptions = options;
    return { data: { items: [{ id: 'UC-mock', snippet: { title: 'Mock channel' } }] } };
  } });
  assert.match(requestOptions.url.toString(), /youtube\/v3\/channels/);
  assert.equal(requestOptions.params.mine, true);
  assert.equal(requestOptions.timeout, 30_000);
  assert.deepEqual(channels, [{ id: 'UC-mock', title: 'Mock channel' }]);
  await assert.rejects(listBoundChannels({ request: async () => ({ data: { items: [] } }) }), /No YouTube channel/);
});
