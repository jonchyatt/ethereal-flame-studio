/**
 * StorageAdapter — unified interface for file I/O across local filesystem and
 * Cloudflare R2.  Every consumer (AudioAssetService, render pipeline, etc.)
 * programs against this interface so the backing store can be swapped via a
 * single environment variable.
 */

// ---------------------------------------------------------------------------
// Core adapter interface
// ---------------------------------------------------------------------------

export interface StorageAdapter {
  /** Write bytes to a key. Creates parent "directories" as needed. */
  put(key: string, data: Buffer | Uint8Array, options?: PutOptions): Promise<void>;

  /** Read the full contents of a key. Returns null if not found. */
  get(key: string): Promise<Buffer | null>;

  /** Delete a single key. No-op if key doesn't exist. */
  delete(key: string): Promise<void>;

  /** Delete all keys under a prefix (recursive). */
  deletePrefix(prefix: string): Promise<void>;

  /** List all keys under a prefix. Returns relative keys (not full paths). */
  list(prefix: string): Promise<string[]>;

  /** Check if a key exists. */
  exists(key: string): Promise<boolean>;

  /** Get metadata (size, lastModified) for a key. Returns null if not found. */
  stat(key: string): Promise<FileStat | null>;

  /**
   * Generate a time-limited signed URL for downloading a key.
   * - LocalStorageAdapter returns a local API route URL.
   * - R2StorageAdapter returns a presigned S3 GetObject URL.
   */
  getSignedUrl(key: string, expiresInSeconds?: number): Promise<string>;

  /**
   * Generate a presigned URL for uploading directly to the storage backend.
   * - LocalStorageAdapter returns a local API route URL.
   * - R2StorageAdapter returns a presigned S3 PutObject URL.
   */
  getUploadUrl(key: string, options?: UploadUrlOptions): Promise<string>;
}

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export interface PutOptions {
  /** MIME content type (e.g. "audio/wav", "video/mp4"). */
  contentType?: string;
}

export interface UploadUrlOptions {
  /** MIME content type for the expected upload. */
  contentType?: string;
  /** Maximum allowed upload size in bytes. */
  maxSizeBytes?: number;
  /** Lifetime of the presigned URL in seconds (default varies by adapter). */
  expiresInSeconds?: number;
}

export interface FileStat {
  /** File size in bytes. */
  size: number;
  /** Last modification timestamp. */
  lastModified: Date;
}

export interface StorageConfig {
  /** Which backend to use. */
  backend: 'local' | 'r2';

  // -- Local config --
  /** Root directory for local file storage (default: "./storage"). */
  localBasePath?: string;
  /** Base URL for generating local download/upload URLs (default: "http://localhost:3000"). */
  localBaseUrl?: string;

  // -- R2 config --
  /** Cloudflare account ID. */
  r2AccountId?: string;
  /** R2 API access key ID. */
  r2AccessKeyId?: string;
  /** R2 API secret access key. */
  r2SecretAccessKey?: string;
  /** R2 bucket name. */
  r2BucketName?: string;
  /** Custom R2 S3-compatible endpoint (e.g. "https://{accountId}.r2.cloudflarestorage.com"). */
  r2Endpoint?: string;
}
