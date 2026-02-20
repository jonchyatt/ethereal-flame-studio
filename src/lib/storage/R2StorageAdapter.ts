/*
 * R2 CORS Configuration (apply via Cloudflare Dashboard -> R2 -> {bucket} -> Settings -> CORS Policy):
 *
 * [
 *   {
 *     "AllowedOrigins": ["http://localhost:3000", "https://your-vercel-domain.vercel.app"],
 *     "AllowedMethods": ["GET", "PUT", "HEAD"],
 *     "AllowedHeaders": ["Content-Type", "Content-Length"],
 *     "MaxAgeSeconds": 86400
 *   }
 * ]
 *
 * Update AllowedOrigins with your actual production domain before deploying.
 */

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { StorageAdapter, PutOptions, UploadUrlOptions, FileStat } from './types';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export interface R2AdapterConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
}

/** Default signed-URL expiry for downloads: 7 days. */
const DEFAULT_DOWNLOAD_EXPIRY = 604_800;
/** Default signed-URL expiry for uploads: 1 hour. */
const DEFAULT_UPLOAD_EXPIRY = 3_600;

// ---------------------------------------------------------------------------
// R2StorageAdapter
// ---------------------------------------------------------------------------

/**
 * Cloudflare R2-backed StorageAdapter for production.
 *
 * Uses the S3-compatible API via `@aws-sdk/client-s3`.  All keys are treated
 * as flat object keys (the "/" character is just part of the key name).
 */
export class R2StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: R2AdapterConfig) {
    this.bucket = config.bucketName;
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // Write
  // ---------------------------------------------------------------------------

  async put(key: string, data: Buffer | Uint8Array, options?: PutOptions): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: data,
        ContentType: options?.contentType,
      }),
    );
  }

  // ---------------------------------------------------------------------------
  // Read
  // ---------------------------------------------------------------------------

  async get(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!response.Body) return null;
      // Convert readable stream to Buffer
      const bytes = await response.Body.transformToByteArray();
      return Buffer.from(bytes);
    } catch (err: unknown) {
      if (isNoSuchKey(err)) return null;
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Delete
  // ---------------------------------------------------------------------------

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }

  async deletePrefix(prefix: string): Promise<void> {
    let continuationToken: string | undefined;

    do {
      const listResponse = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      const objects = listResponse.Contents;
      if (!objects || objects.length === 0) break;

      // Batch delete (max 1000 per request — already the S3 page default)
      await this.client.send(
        new DeleteObjectsCommand({
          Bucket: this.bucket,
          Delete: {
            Objects: objects.map((o) => ({ Key: o.Key! })),
            Quiet: true,
          },
        }),
      );

      continuationToken = listResponse.IsTruncated
        ? listResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);
  }

  // ---------------------------------------------------------------------------
  // List / Exists / Stat
  // ---------------------------------------------------------------------------

  async list(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        }),
      );

      if (response.Contents) {
        for (const obj of response.Contents) {
          if (obj.Key) keys.push(obj.Key);
        }
      }

      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return keys;
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (err: unknown) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }

  async stat(key: string): Promise<FileStat | null> {
    try {
      const response = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return {
        size: response.ContentLength ?? 0,
        lastModified: response.LastModified ?? new Date(0),
      };
    } catch (err: unknown) {
      if (isNotFound(err)) return null;
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // Presigned URLs
  // ---------------------------------------------------------------------------

  async getSignedUrl(key: string, expiresInSeconds?: number): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: expiresInSeconds ?? DEFAULT_DOWNLOAD_EXPIRY },
    );
  }

  async getUploadUrl(key: string, options?: UploadUrlOptions): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        ContentType: options?.contentType,
      }),
      { expiresIn: options?.expiresInSeconds ?? DEFAULT_UPLOAD_EXPIRY },
    );
  }
}

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

function isNoSuchKey(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  return name === 'NoSuchKey';
}

function isNotFound(err: unknown): boolean {
  const name = (err as { name?: string })?.name;
  // HeadObject throws "NotFound" (not "NoSuchKey")
  return name === 'NotFound' || name === 'NoSuchKey' || name === '404';
}
