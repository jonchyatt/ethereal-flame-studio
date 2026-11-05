import { mkdir, rm } from 'fs/promises';
import path from 'path';

/** Gives the sign-up tests an empty, isolated local storage folder; never touches R2. */
export default async function globalSetup() {
  const storagePath = path.resolve(process.cwd(), 'e2e', '.tmp', 'storage');
  await rm(storagePath, { recursive: true, force: true });
  await mkdir(storagePath, { recursive: true });
}
