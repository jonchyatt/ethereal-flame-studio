import { createClient } from '@libsql/client';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env.local') });

const client = createClient({
  url: process.env.DATABASE_URL,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

// Check existing tables
const existing = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('Existing tables:', existing.rows.map(r => r.name).join(', '));

// Create academy_progress if missing
await client.execute(`
  CREATE TABLE IF NOT EXISTS academy_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id TEXT NOT NULL,
    topic_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started',
    started_at TEXT,
    completed_at TEXT,
    interaction_count INTEGER NOT NULL DEFAULT 0,
    teaching_notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);
await client.execute('CREATE UNIQUE INDEX IF NOT EXISTS academy_progress_project_topic_idx ON academy_progress(project_id, topic_id)');
console.log('academy_progress: OK');

// Verify
const after = await client.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
console.log('Tables after migration:', after.rows.map(r => r.name).join(', '));

process.exit(0);
