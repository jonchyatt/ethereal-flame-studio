import { createClient, type Client } from '@libsql/client';
import { randomUUID } from 'crypto';
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

export class TursoLeaseStore implements LeaseStore {
  private client: Client;
  private initialized: Promise<void>;

  constructor(url: string, authToken?: string) {
    this.client = createClient({ url, authToken });
    this.initialized = this.init();
  }

  private async init(): Promise<void> {
    await this.client.execute(CREATE_TABLE_SQL);
    await this.client.execute(CREATE_INDEX_SQL);
  }

  private async ready(): Promise<void> {
    await this.initialized;
  }

  async acquire(
    leaseKey: string,
    ownerId: string,
    ttlMs: number,
    options?: AcquireLeaseOptions,
  ): Promise<AcquireLeaseResult> {
    await this.ready();
    const now = new Date();
    const nowIso = now.toISOString();
    const expiresIso = new Date(now.getTime() + ttlMs).toISOString();
    const metadataJson = options?.metadata ? JSON.stringify(options.metadata) : null;

    const tx = await this.client.transaction('write');
    try {
      const existingRes = await tx.execute({
        sql: 'SELECT * FROM distributed_leases WHERE leaseKey = ?',
        args: [leaseKey],
      });

      if (existingRes.rows.length === 0) {
        const token = randomUUID();
        await tx.execute({
          sql: `INSERT INTO distributed_leases (leaseKey, ownerId, token, expiresAt, metadata, createdAt, updatedAt)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [leaseKey, ownerId, token, expiresIso, metadataJson, nowIso, nowIso],
        });
      } else {
        const existing = rowToLease(existingRes.rows[0] as unknown as Record<string, unknown>);
        const expired = new Date(existing.expiresAt).getTime() <= now.getTime();
        if (!expired && existing.ownerId !== ownerId) {
          await tx.commit();
          return { acquired: false, reason: 'held-by-other' };
        }
        const token = existing.ownerId === ownerId ? existing.token : randomUUID();
        await tx.execute({
          sql: `UPDATE distributed_leases
                SET ownerId = ?, token = ?, expiresAt = ?, metadata = ?, updatedAt = ?
                WHERE leaseKey = ?`,
          args: [ownerId, token, expiresIso, metadataJson, nowIso, leaseKey],
        });
      }

      const leaseRes = await tx.execute({
        sql: 'SELECT * FROM distributed_leases WHERE leaseKey = ?',
        args: [leaseKey],
      });
      await tx.commit();

      if (leaseRes.rows.length === 0) {
        return { acquired: false, reason: 'held-by-other' };
      }
      return { acquired: true, lease: rowToLease(leaseRes.rows[0] as unknown as Record<string, unknown>) };
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async renew(
    leaseKey: string,
    token: string,
    ttlMs: number,
    metadata?: Record<string, unknown>,
  ): Promise<boolean> {
    await this.ready();
    const tx = await this.client.transaction('write');
    try {
      const existingRes = await tx.execute({
        sql: 'SELECT * FROM distributed_leases WHERE leaseKey = ?',
        args: [leaseKey],
      });
      if (existingRes.rows.length === 0) {
        await tx.commit();
        return false;
      }
      const existing = rowToLease(existingRes.rows[0] as unknown as Record<string, unknown>);
      if (existing.token !== token) { await tx.commit(); return false; }
      if (new Date(existing.expiresAt).getTime() <= Date.now()) { await tx.commit(); return false; }

      const nowIso = new Date().toISOString();
      const expiresIso = new Date(Date.now() + ttlMs).toISOString();
      const metadataJson = metadata
        ? JSON.stringify(metadata)
        : (existing.metadata ? JSON.stringify(existing.metadata) : null);

      const res = await tx.execute({
        sql: `UPDATE distributed_leases
              SET expiresAt = ?, updatedAt = ?, metadata = ?
              WHERE leaseKey = ? AND token = ?`,
        args: [expiresIso, nowIso, metadataJson, leaseKey, token],
      });
      await tx.commit();
      return res.rowsAffected > 0;
    } catch (err) {
      await tx.rollback();
      throw err;
    }
  }

  async release(leaseKey: string, token: string): Promise<boolean> {
    await this.ready();
    const res = await this.client.execute({
      sql: 'DELETE FROM distributed_leases WHERE leaseKey = ? AND token = ?',
      args: [leaseKey, token],
    });
    return res.rowsAffected > 0;
  }

  async get(leaseKey: string): Promise<LeaseRecord | undefined> {
    await this.ready();
    const res = await this.client.execute({
      sql: 'SELECT * FROM distributed_leases WHERE leaseKey = ?',
      args: [leaseKey],
    });
    if (res.rows.length === 0) return undefined;
    return rowToLease(res.rows[0] as unknown as Record<string, unknown>);
  }

  async list(prefix?: string): Promise<LeaseRecord[]> {
    await this.ready();
    const res = await this.client.execute({
      sql: prefix
        ? 'SELECT * FROM distributed_leases WHERE leaseKey LIKE ? ORDER BY leaseKey ASC'
        : 'SELECT * FROM distributed_leases ORDER BY leaseKey ASC',
      args: prefix ? [`${prefix}%`] : [],
    });
    return res.rows.map((r) => rowToLease(r as unknown as Record<string, unknown>));
  }
}

