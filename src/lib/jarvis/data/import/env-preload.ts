/**
 * Preload env vars before any module imports.
 * Used via: npx tsx --require ./src/lib/jarvis/data/import/env-preload.ts
 * Or:       npx tsx --import ./src/lib/jarvis/data/import/env-preload.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local', override: true });
config(); // .env fallback
