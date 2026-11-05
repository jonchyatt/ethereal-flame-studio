import { execFile } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/** Creates only an isolated file-backed libsql database; never uses DATABASE_URL from a developer shell. */
export default async function globalSetup() {
  const databasePath = path.resolve(process.cwd(), 'e2e', '.tmp', 'waia-email-e2e.db');
  await mkdir(path.dirname(databasePath), { recursive: true });
  await rm(databasePath, { force: true });
  const databaseUrl = `file:${databasePath.replace(/\\/g, '/')}`;
  await execFileAsync('cmd.exe', ['/d', '/s', '/c', 'npx drizzle-kit push --force'], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: databaseUrl, DATABASE_AUTH_TOKEN: '' },
  });
}
