/**
 * Local preview only: writes a 3 s quiet tone and a manifest for one program into
 * the local storage adapter, so the audio player can be seen working without real
 * recordings. Run: npx tsx scripts/programs/seed-fixture-audio.ts [programId]
 * Never run this against production storage; real audio is handed over by Jonathan.
 */
import { LocalStorageAdapter } from '../../src/lib/storage/LocalStorageAdapter';
import { fixtureWav } from '../../src/lib/entitlements/audio-logic';

async function main() {
  const programId = process.argv[2] ?? 'advanced-hypnosis-sessions';
  const storage = new LocalStorageAdapter(process.env.STORAGE_LOCAL_PATH ?? './storage');
  await storage.put(`programs/${programId}/audio/fixture.wav`, fixtureWav(3));
  await storage.put(
    `programs/${programId}/audio.json`,
    Buffer.from(JSON.stringify({ tracks: [{ id: 'fixture', title: 'Fixture tone (not a session)', file: 'fixture.wav', contentType: 'audio/wav' }] }, null, 2)),
  );
  console.log(`Seeded fixture audio for ${programId}`);
}
main();
