import {
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  AbortMultipartUploadCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

type R2MultipartConfig = {
  client: S3Client;
  bucket: string;
};

export type MultipartPartETag = {
  partNumber: number;
  etag: string;
};

function getR2Config(): R2MultipartConfig | null {
  const deployEnv = process.env.DEPLOY_ENV;
  const backend = process.env.STORAGE_BACKEND || (deployEnv === 'production' ? 'r2' : 'local');
  if (backend !== 'r2') return null;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET_NAME || 'ethereal-flame-studio';
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('R2 multipart upload requested but R2 credentials are not configured');
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
  return { client, bucket };
}

export function isR2MultipartAvailable(): boolean {
  const deployEnv = process.env.DEPLOY_ENV;
  const backend = process.env.STORAGE_BACKEND || (deployEnv === 'production' ? 'r2' : 'local');
  return backend === 'r2';
}

export function getLocalAgentMultipartThresholdBytes(): number {
  return Number(process.env.LOCAL_AGENT_MULTIPART_THRESHOLD_BYTES) || 1024 * 1024 * 1024; // 1 GB
}

export function getLocalAgentMultipartPartSizeBytes(): number {
  // S3/R2 minimum part size (except last part) is 5MB. Use a larger default to limit part count.
  return Math.max(5 * 1024 * 1024, Number(process.env.LOCAL_AGENT_MULTIPART_PART_SIZE_BYTES) || 64 * 1024 * 1024);
}

export async function createR2MultipartUpload(options: {
  key: string;
  contentType?: string;
  partCount: number;
  expiresInSeconds?: number;
}): Promise<{
  uploadId: string;
  partUrls: Array<{ partNumber: number; url: string }>;
}> {
  const cfg = getR2Config();
  if (!cfg) throw new Error('R2 multipart upload is not available for the current storage backend');

  const createRes = await cfg.client.send(
    new CreateMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: options.key,
      ContentType: options.contentType || 'video/mp4',
    }),
  );
  if (!createRes.UploadId) {
    throw new Error('Failed to create multipart upload (missing UploadId)');
  }

  const uploadId = createRes.UploadId;
  const expiresIn = options.expiresInSeconds ?? 60 * 60;
  const partUrls: Array<{ partNumber: number; url: string }> = [];

  for (let partNumber = 1; partNumber <= options.partCount; partNumber++) {
    const url = await getSignedUrl(
      cfg.client,
      new UploadPartCommand({
        Bucket: cfg.bucket,
        Key: options.key,
        UploadId: uploadId,
        PartNumber: partNumber,
      }),
      { expiresIn },
    );
    partUrls.push({ partNumber, url });
  }

  return { uploadId, partUrls };
}

export async function completeR2MultipartUpload(options: {
  key: string;
  uploadId: string;
  parts: MultipartPartETag[];
}): Promise<void> {
  const cfg = getR2Config();
  if (!cfg) throw new Error('R2 multipart upload is not available for the current storage backend');

  const normalizedParts = [...options.parts]
    .sort((a, b) => a.partNumber - b.partNumber)
    .map((p) => ({
      PartNumber: p.partNumber,
      ETag: p.etag,
    }));

  await cfg.client.send(
    new CompleteMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: options.key,
      UploadId: options.uploadId,
      MultipartUpload: {
        Parts: normalizedParts,
      },
    }),
  );
}

export async function abortR2MultipartUpload(options: {
  key: string;
  uploadId: string;
}): Promise<void> {
  const cfg = getR2Config();
  if (!cfg) return;

  await cfg.client.send(
    new AbortMultipartUploadCommand({
      Bucket: cfg.bucket,
      Key: options.key,
      UploadId: options.uploadId,
    }),
  );
}
