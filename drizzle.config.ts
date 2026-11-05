import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

const databaseUrl = process.env.DATABASE_URL!;
const localFileDatabase = databaseUrl.startsWith('file:');

export default defineConfig({
  out: './drizzle',
  schema: [
    './src/lib/jarvis/memory/schema.ts',
    './src/lib/jarvis/data/schema.ts',
    './src/lib/subscribers/schema.ts',
  ],
  // Production remains Turso. The isolated Playwright database is an SQLite
  // file, so drizzle-kit can prepare it without ever receiving a cloud URL.
  dialect: localFileDatabase ? 'sqlite' : 'turso',
  dbCredentials: localFileDatabase
    ? { url: databaseUrl }
    : { url: databaseUrl, authToken: process.env.DATABASE_AUTH_TOKEN },
});
