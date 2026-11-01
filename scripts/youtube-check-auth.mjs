import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  CHANNEL_KEYS, SafeError, makeOAuthClient, listBoundChannels, printChannels, readEnvironment,
  readSlot, requireVariables, safeErrorMessage, slotVariables,
} from './lib/youtube-oauth.mjs';

const ENV_PATH = fileURLToPath(new URL('../.env.local', import.meta.url));

export async function main(args = process.argv.slice(2), dependencies = {}) {
  const { envPath = ENV_PATH, log = console.log, makeClient = makeOAuthClient, listChannels = listBoundChannels } = dependencies;
  if (args.length === 1 && args[0] === '--help') {
    log('Usage: node scripts/youtube-check-auth.mjs [primary|waia|critfail] [--probe]');
    log('Default: report variable names and presence only, without network access. --probe prints the channel bound to each configured slot.');
    return;
  }
  const positional = args.filter((arg) => arg !== '--probe');
  if (positional.length > 1 || args.filter((arg) => arg === '--probe').length > 1) {
    throw new SafeError('Usage: node scripts/youtube-check-auth.mjs [primary|waia|critfail] [--probe]');
  }
  if (positional.length) slotVariables(positional[0]);
  const keys = positional.length ? positional : CHANNEL_KEYS;
  const environment = await readEnvironment(envPath);
  let failed = false;
  for (const channelKey of keys) {
    const slot = readSlot(channelKey, environment);
    for (const suffix of Object.keys(slot.names)) {
      log(`${slot.names[suffix]}: ${slot.values[suffix] ? 'present' : 'missing'}`);
    }
    if (!args.includes('--probe')) continue;
    try {
      if (slot.values.REFRESH_TOKEN || !slot.values.ACCESS_TOKEN) requireVariables(slot, ['CLIENT_ID', 'CLIENT_SECRET', 'REFRESH_TOKEN']);
      const auth = await makeClient({ clientId: slot.values.CLIENT_ID || undefined, clientSecret: slot.values.CLIENT_SECRET || undefined });
      auth.setCredentials(slot.values.REFRESH_TOKEN ? { refresh_token: slot.values.REFRESH_TOKEN } : { access_token: slot.values.ACCESS_TOKEN });
      printChannels(channelKey, await listChannels(auth), log);
    } catch (error) {
      failed = true;
      log(`${channelKey}: ${safeErrorMessage(error)}`);
    }
  }
  if (failed) throw new SafeError('One or more YouTube credential probes failed.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => { console.error(safeErrorMessage(error)); process.exitCode = 1; });
}
