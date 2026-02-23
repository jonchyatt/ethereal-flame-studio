import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import type { LeaseStore, LeaseRecord, AcquireLeaseOptions, AcquireLeaseResult } from './types';

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS distributed_leases (
    leaseKey TEXT PRIMARY KEY,
    ownerId TEXT NOT NULL,
    token TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    metadata TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  )
`;

const CREATE_INDEX_SQL = `
  CREATE INDEX IF NOT EXISTS idx_distributed_leases_expiresAt ON distributed_leases(expiresAt)
`;

function rowToLease(row: Record<string, unknown>): LeaseRecord {
  return {
    leaseKey: row.leaseKey as string,
    ownerId: row.ownerId as string,
    token: row.token as string,
    expiresAt: row.expiresAt as string,
    createdAt: row.createdAt as string,
    updatedAt: row.updatedAt as string,
    metadata: row.metadata ? (() => { try { return JSON.parse(row.metadata as string); } catch { return undefined; } })() : undefined,
  };
}

function ensureDbParentDir(dbPath: string): void {
  if (!dbPath || dbPath === ':memory:') return;
  const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(dbPath);
  const dir = path.dirname(absPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export class LocalLeaseStore implements LeaseStore {
  private db: Database.Database;

  constructor(dbPath = './audio-prep-jobs.db') {
    const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(dbPath);
    ensureDbParentDir(absPath);
    this.db = new Database(absPath);
    this.db.pragma('journal_mode = WAL');
    this.db.exec(CREATE_TABLE_SQL);
    this.db.exec(CREATE_INDEX_SQL);
  }

  async acquire(
    leaseKey: string,
    ownerId: string,
    ttlMs: number,
    options?: AcquireLeaseOptions,
  ): Promise<AcquireLeaseResult> {
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + ttlMs).toISOString();
    const metadataJson = options?.metadata ? JSON.stringify(options.metadata) : null;

    const tx = this.db.transaction(() => {
      const row = this.db
        .prepare('SELECT * FROM distributed_leases WHERE leaseKey = ?')
        .get(leaseKey) as Record<string, unknown> | undefined;

      if (!row) {
        const token = randomUUID();
        this.db
          .prepare(
            `INSERT INTO distributed_leases (leaseKey, ownerId, token, expiresAt, metadata, createdAt, updatedAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
          )
          .run(leaseKey, ownerId, token, expiresIso, metadataJson, nowIso, nowIso);

        const inserted = this.db
          .prepare('SELECT * FROM distributed_leases WHERE leaseKey = ?')
          .get(leaseKey) as Record<string, unknown>;
        return { acquired: true, lease: rowToLease(inserted) } satisfies AcquireLeaseResult;
      }

      const existing = rowToLease(row);
      const expired = new Date(existing.expiresAt).getTime() <= now.getTime();

      if (!expired && existing.ownerId !== ownerId) {
        return { acquired: false, reason: 'held-by-other' } satisfies AcquireLeaseResult;
      }

      const token = existing.ownerId === ownerId ? existing.token : randomUUID();
      this.db
        .prepare(
          `UPDATE distributed_leases
           SET ownerId = ?, token = ?, expiresAt = ?, metadata = ?, updatedAt = ?
           WHERE leaseKey = ?`,
        )
        .run(ownerId, token, expiresIso, metadataJson, nowIso, leaseKey);

      const updated = this.db
        .prepare('SELECT * FROM distributed_leases WHERE leaseKey = ?')
        .get(leaseKey) as Record<string, unknown>;
      return { acquired: true, lease: rowToLease(updated) } satisfies AcquireLeaseResult;
    });

    return tx();
  }

  async renew(
    leaseKey: string,
    token: string,
    ttlMs: number,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    const tx = this.db.transaction(() => {
      const row = this.db
        .prepare('SELECT * FROM distributed_leases WHERE leaseKey = ?')
        .get(leaseKey) as Record<string, unknown> | undefined;
      if (!row) return false;

      const existing = rowToLease(row);
      if (existing.token !== token) return false;
      if (new Date(existing.expiresAt).getTime() <= Date.now()) return false;

      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + ttlMs).toISOString();
      const metadataJson = metadata
        ? JSON.stringify(metadata)
        : (existing.metadata ? JSON.stringify(existing.metadata) : null);

      const result = this.db
        .prepare(
          `UPDATE distributed_leases
           SET expiresAt = ?, updatedAt = ?, metadata = ?
           WHERE leaseKey = ? AND token = ?`,
        )
        .run(expiresIso, nowIso, metadataJson, leaseKey, token);
      return result.changes > 0;
    });

    return tx();
  }

  async release(leaseKey: string, token: string): Promise<boolean> {
    const result = this.db
      .prepare('DELETE FROM distributed_leases WHERE leaseKey = ? AND token = ?')
      .run(leaseKey, token);
    return result.changes > 0;
  }

  async get(leaseKey: string): Promise<LeaseRecord | undefined> {
    const row = this.db
      .prepare('SELECT * FROM distributed_leases WHERE leaseKey = ?')
      .get(leaseKey) as Record<string, unknown> | undefined;
    if (!row) return undefined;
    return rowToLease(row);
  }

  async list(prefix?: string): Promise<LeaseRecord[]> {
    let rows: Record<string, unknown>[];
    if (prefix) {
      rows = this.db
        .prepare('SELECT * FROM distributed_leases WHERE leaseKey LIKE ? ORDER BY leaseKey ASC')
        .all(`${prefix}%`) as Record<string, unknown>[];
    } else {
      rows = this.db
        .prepare('SELECT * FROM distributed_leases ORDER BY leaseKey ASC')
        .all() as Record<string, unknown>[];
    }
    return rows.map(rowToLease);
  }
}

