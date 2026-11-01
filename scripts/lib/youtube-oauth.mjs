import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { parse } from 'dotenv';

export const CHANNEL_KEYS = Object.freeze(['primary', 'waia', 'critfail']);
export const DEFAULT_REDIRECT_URI = 'http://127.0.0.1:8765/oauth2callback';
export const SCOPES = Object.freeze([
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
]);

export class SafeError extends Error {}

// Never print Google errors: their request configuration can contain credentials.
export function safeErrorMessage(error) {
  return error instanceof SafeError ? error.message : 'YouTube OAuth operation failed; credentials and request details were withheld.';
}

export function slotVariables(channelKey) {
  if (!CHANNEL_KEYS.includes(channelKey)) {
    throw new SafeError('A channel key is required: primary, waia, or critfail.');
  }
  const prefix = channelKey === 'primary' ? 'YOUTUBE_PUBLISH_' : `YOUTUBE_PUBLISH_${channelKey.toUpperCase()}_`;
  return Object.fromEntries(['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN', 'ACCESS_TOKEN', 'REDIRECT_URI'].map((suffix) => [suffix, `${prefix}${suffix}`]));
}

export async function readEnvironment(envPath) {
  try {
    return parse(await readFile(envPath, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return {};
    throw new SafeError('Could not read the repository .env.local file.');
  }
}

export function readSlot(channelKey, environment) {
  const names = slotVariables(channelKey);
  const values = Object.fromEntries(Object.entries(names).map(([suffix, name]) => [suffix, environment[name]?.trim() || '']));
  return { names, values };
}

export function requireVariables(slot, suffixes) {
  const missing = suffixes.filter((suffix) => !slot.values[suffix]).map((suffix) => slot.names[suffix]);
  if (missing.length) throw new SafeError(`Missing .env.local variables: ${missing.join(', ')}`);
}

export function validateRedirectUri(value) {
  let uri;
  try { uri = new URL(value); } catch { throw new SafeError('Redirect URI must be an HTTP loopback URL.'); }
  if (uri.protocol !== 'http:' || !['127.0.0.1', '[::1]', 'localhost'].includes(uri.hostname)
    || uri.username || uri.password || uri.search || uri.hash || uri.port === '0') {
    throw new SafeError('Redirect URI must use HTTP on 127.0.0.1, [::1], or localhost, with no credentials, query, or fragment and a nonzero port.');
  }
  return uri;
}

export function createProof() {
  const verifier = randomBytes(32).toString('base64url');
  return { state: randomBytes(32).toString('base64url'), verifier, challenge: createHash('sha256').update(verifier).digest('base64url') };
}

function stateMatches(actual, expected) {
  if (!actual) return false;
  const left = Buffer.from(actual);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function startCallbackListener({ redirectUri, state, timeoutMs = 300_000 }) {
  const uri = validateRedirectUri(redirectUri);
  let finish;
  let settled = false;
  let timer;
  const code = new Promise((resolve, reject) => {
    finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      server.close();
      server.closeIdleConnections();
      if (error) reject(error); else resolve(value);
    };
  });
  // A bind failure can occur before the caller receives the code promise.
  code.catch(() => {});
  const server = createServer((request, response) => {
    const reply = (status, message) => {
      response.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Connection': 'close' });
      response.end(message);
    };
    let callback;
    try { callback = new URL(request.url, uri.origin); } catch { reply(400, 'Invalid callback.'); return; }
    if (request.method !== 'GET' || callback.pathname !== uri.pathname) { reply(404, 'Not found.'); return; }
    if (request.headers.host !== uri.host || callback.origin !== uri.origin
      || callback.searchParams.getAll('state').length !== 1
      || !stateMatches(callback.searchParams.get('state'), state)) {
      reply(400, 'Invalid OAuth state or callback origin.'); return;
    }
    if (callback.searchParams.has('error')) {
      reply(400, 'Consent was not granted. You can close this tab.');
      finish(new SafeError('Google consent was denied or failed. No token was saved.'));
      return;
    }
    const authorizationCode = callback.searchParams.get('code');
    if (!authorizationCode || callback.searchParams.getAll('code').length !== 1) {
      reply(400, 'Missing or ambiguous authorization code.');
      finish(new SafeError('OAuth callback did not contain one authorization code. No token was saved.'));
      return;
    }
    reply(200, 'Callback received. Return to the terminal for the channel check; you can close this tab.');
    finish(null, authorizationCode);
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  const close = () => {
    finish(new SafeError('OAuth callback cancelled. No token was saved.'));
    server.closeAllConnections();
  };
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(Number(uri.port || 80), uri.hostname === '[::1]' ? '::1' : uri.hostname, resolve);
    });
  } catch {
    close();
    throw new SafeError('Could not start the loopback listener. Check the redirect port or pass --redirect-uri with an available port.');
  }
  server.on('error', () => finish(new SafeError('The loopback listener failed. No token was saved.')));
  if (!settled) timer = setTimeout(() => {
    finish(new SafeError('Timed out waiting for Google consent. No token was saved.'));
    server.closeAllConnections();
  }, timeoutMs);
  return { code, close };
}

export function updateEnvText(contents, name, token) {
  if (!/^YOUTUBE_PUBLISH_(?:(?:WAIA|CRITFAIL)_)?REFRESH_TOKEN$/.test(name)
    || typeof token !== 'string' || !token.trim() || /[\r\n\0]/.test(token)) {
    throw new SafeError('Invalid refresh token or destination variable; .env.local was not changed.');
  }
  const encoded = JSON.stringify(token);
  if (parse(`${name}=${encoded}`)[name] !== token) {
    throw new SafeError('Refresh token could not be safely encoded; .env.local was not changed.');
  }
  // Match dotenv assignments, including quoted multiline values, while retaining all other bytes.
  const assignments = /^([\t ]*(?:export[\t ]+)?)([\w.-]+)([\t ]*=[\t ]*)("(?:\\.|[^"\\])*"|'[^']*'|`[^`]*`|[^\r\n]*)([^\r\n]*)/gm;
  let found = false;
  const updated = contents.replace(assignments, (assignment, lead, key, equals) => {
    if (key !== name) return assignment;
    found = true;
    return `${lead}${name}${equals}${encoded}`;
  });
  if (found) return updated;
  const newline = contents.includes('\r\n') ? '\r\n' : '\n';
  return `${contents}${contents && !contents.endsWith('\n') ? newline : ''}${name}=${encoded}${newline}`;
}

export async function saveRefreshToken(envPath, name, token) {
  // Re-read after consent, not from the startup snapshot: other setup may have changed the file.
  const lockPath = `${envPath}.youtube-oauth.lock`;
  let locked = false;
  let temporary;
  try {
    await writeFile(lockPath, '', { flag: 'wx', mode: 0o600 });
    locked = true;
    const before = await readFile(envPath, 'utf8');
    const after = updateEnvText(before, name, token);
    temporary = `${envPath}.youtube-oauth-${randomBytes(8).toString('hex')}.tmp`;
    await writeFile(temporary, after, { flag: 'wx', mode: 0o600 });
    if (await readFile(envPath, 'utf8') !== before) {
      throw new SafeError('.env.local changed during the token write. No changes were applied; rerun consent.');
    }
    await rename(temporary, envPath);
  } catch (error) {
    if (error instanceof SafeError) throw error;
    throw new SafeError(error.code === 'EEXIST'
      ? 'Another token write is active (.env.local.youtube-oauth.lock). Retry after it finishes.'
      : 'Could not save the refresh token atomically to .env.local. No token was printed.');
  } finally {
    if (temporary) await unlink(temporary).catch(() => {});
    if (locked) await unlink(lockPath).catch(() => {});
  }
}

export async function makeOAuthClient({ clientId, clientSecret, redirectUri }) {
  // Load only YouTube from the installed googleapis package to keep CLI startup bounded.
  const { auth } = await import('googleapis/build/src/apis/youtube/index.js');
  return new auth.OAuth2({ clientId, clientSecret, redirectUri, transporterOptions: { timeout: 30_000 } });
}

export async function listBoundChannels(auth) {
  const { youtube } = await import('googleapis/build/src/apis/youtube/index.js');
  const result = await youtube({ version: 'v3', auth }).channels.list({ part: ['snippet'], mine: true }, { timeout: 30_000 });
  const channels = (result.data.items || []).map((channel) => ({ id: channel.id, title: channel.snippet?.title }));
  if (!channels.length) throw new SafeError('No YouTube channel was returned for this credential.');
  return channels;
}

export function printChannels(channelKey, channels, log) {
  for (const channel of channels) log(`${channelKey}: channel ${JSON.stringify({ id: channel.id, title: channel.title })}`);
}
