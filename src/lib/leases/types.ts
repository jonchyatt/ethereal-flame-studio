export interface LeaseRecord {
  leaseKey: string;
  ownerId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface AcquireLeaseOptions {
  metadata?: Record<string, unknown>;
}

export interface AcquireLeaseResult {
  acquired: boolean;
  lease?: LeaseRecord;
  reason?: 'held-by-other';
}

export interface LeaseStore {
  acquire(leaseKey: string, ownerId: string, ttlMs: number, options?: AcquireLeaseOptions): Promise<AcquireLeaseResult>;
  renew(leaseKey: string, token: string, ttlMs: number, metadata?: Record<string, unknown>): Promise<boolean>;
  release(leaseKey: string, token: string): Promise<boolean>;
  get(leaseKey: string): Promise<LeaseRecord | undefined>;
  list(prefix?: string): Promise<LeaseRecord[]>;
}

