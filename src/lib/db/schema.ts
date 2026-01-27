/**
 * SQLite schema for render metadata tracking.
 * Uses better-sqlite3 for synchronous, high-performance database access.
 */

export const SCHEMA = `
-- Renders table: tracks all batch render jobs
CREATE TABLE IF NOT EXISTS renders (
  id TEXT PRIMARY KEY,
  batch_id TEXT,
  audio_name TEXT NOT NULL,
  audio_path TEXT NOT NULL,
  template TEXT NOT NULL,
  output_format TEXT NOT NULL,
  output_path TEXT,
  gdrive_url TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
  whisper_description TEXT,
  duration_seconds REAL,
  render_started_at TEXT,
  render_completed_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_renders_batch ON renders(batch_id);
CREATE INDEX IF NOT EXISTS idx_renders_status ON renders(status);
CREATE INDEX IF NOT EXISTS idx_renders_created ON renders(created_at);
`;

/**
 * Type for render records from the database.
 */
export interface Render {
  id: string;
  batch_id: string | null;
  audio_name: string;
  audio_path: string;
  template: string;
  output_format: string;
  output_path: string | null;
  gdrive_url: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  whisper_description: string | null;
  duration_seconds: number | null;
  render_started_at: string | null;
  render_completed_at: string | null;
  error_message: string | null;
  created_at: string;
}

/**
 * Type for creating new render records.
 */
export interface NewRender {
  batch_id?: string;
  audio_name: string;
  audio_path: string;
  template: string;
  output_format: string;
}

/**
 * Type for updating existing render records.
 */
export type RenderUpdate = Partial<Omit<Render, 'id' | 'created_at'>>;
