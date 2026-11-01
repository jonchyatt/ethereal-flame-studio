import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  DEFAULT_REDIRECT_URI, SCOPES, SafeError, createProof, makeOAuthClient, listBoundChannels,
  printChannels, readEnvironment, readSlot, requireVariables, safeErrorMessage, saveRefreshToken,
  slotVariables, startCallbackListener, validateRedirectUri,
} from './lib/youtube-oauth.mjs';

const ENV_PATH = fileURLToPath(new URL('../.env.local', import.meta.url));

export async function main(args = process.argv.slice(2), dependencies = {}) {
  const { envPath = ENV_PATH, log = console.log, makeClient = makeOAuthClient, listChannels = listBoundChannels,
    listen = startCallbackListener, saveToken = saveRefreshToken } = dependencies;
  if (args.length === 1 && args[0] === '--help') {
    log('Usage: node scripts/youtube-mint-token.mjs <primary|waia|critfail> [--redirect-uri http://127.0.0.1:8765/oauth2callback]');
    log('Reads only this repository .env.local. Redirect: --redirect-uri, slot REDIRECT_URI, then http://127.0.0.1:8765/oauth2callback.');
    log('Keep the terminal open, then open the printed consent URL in Jon\'s Chrome profile and select the intended YouTube channel.');
    return;
  }
  const [channelKey, ...options] = args;
  slotVariables(channelKey);
  if (options.length && (options.length !== 2 || options[0] !== '--redirect-uri' || !options[1])) {
    throw new SafeError('Usage: node scripts/youtube-mint-token.mjs <primary|waia|critfail> [--redirect-uri URL]');
  }
  const slot = readSlot(channelKey, await readEnvironment(envPath));
  requireVariables(slot, ['CLIENT_ID', 'CLIENT_SECRET']);
  const redirectUri = validateRedirectUri(options[1] || slot.values.REDIRECT_URI || DEFAULT_REDIRECT_URI).href;
  const proof = createProof();
  const auth = await makeClient({ clientId: slot.values.CLIENT_ID, clientSecret: slot.values.CLIENT_SECRET, redirectUri });
  const consentUrl = auth.generateAuthUrl({ access_type: 'offline', prompt: 'consent select_account', scope: [...SCOPES],
    state: proof.state, code_challenge: proof.challenge, code_challenge_method: 'S256' });
  const listener = await listen({ redirectUri, state: proof.state });
  let interrupted = false;
  const interrupt = () => { interrupted = true; listener.close(); };
  process.once('SIGINT', interrupt);
  process.once('SIGTERM', interrupt);
  try {
    log(`${channelKey}: open this consent URL in Jon's Chrome profile; select the intended channel. Waiting up to five minutes:`);
    log(consentUrl);
    let tokens;
    try {
      ({ tokens } = await auth.getToken({ code: await listener.code, codeVerifier: proof.verifier, redirect_uri: redirectUri }));
    } catch (error) {
      if (error instanceof SafeError) throw error;
      throw new SafeError('Google token exchange failed. No token was saved; request details were withheld.');
    }
    if (interrupted) throw new SafeError('OAuth was interrupted. No token was saved.');
    if (!tokens?.refresh_token?.trim()) throw new SafeError('Google returned no refresh token. No token was saved; rerun consent with offline access.');
    await saveToken(envPath, slot.names.REFRESH_TOKEN, tokens.refresh_token);
    log(`Saved ${slot.names.REFRESH_TOKEN} to .env.local (value hidden).`);
    auth.setCredentials(tokens);
    try { printChannels(channelKey, await listChannels(auth), log); }
    catch { throw new SafeError(`Saved ${slot.names.REFRESH_TOKEN}, but the bound-channel check failed. Run node scripts/youtube-check-auth.mjs ${channelKey} --probe after checking YouTube Data API access.`); }
  } finally {
    listener.close();
    process.removeListener('SIGINT', interrupt);
    process.removeListener('SIGTERM', interrupt);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
}
