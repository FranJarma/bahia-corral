import 'server-only';

import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type FileLocation = { bucket: string; objectKey: string };
export type StoragePort = {
  presignUpload(input: FileLocation & { contentType: string }): Promise<string>;
  presignDownload(input: FileLocation): Promise<string>;
  read(input: FileLocation): Promise<Uint8Array>;
  stat(input: FileLocation): Promise<{ sizeBytes: number; contentType: string }>;
};

function getClient() {
  const account = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!account || !key || !secret) throw new Error('Cloudflare R2 sin configurar');
  return new S3Client({
    endpoint: `https://${account}.r2.cloudflarestorage.com`,
    region: 'auto',
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
}
export function createR2StoragePort(): StoragePort {
  return {
    async presignUpload(input) {
      return getSignedUrl(
        getClient(),
        new PutObjectCommand({
          Bucket: input.bucket,
          Key: input.objectKey,
          ContentType: input.contentType,
        }),
        { expiresIn: 300 },
      );
    },
    async presignDownload(input) {
      return getSignedUrl(
        getClient(),
        new GetObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
        { expiresIn: 90 },
      );
    },
    async stat(input) {
      const response = await getClient().send(
        new HeadObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
      );
      return { sizeBytes: response.ContentLength ?? -1, contentType: response.ContentType ?? '' };
    },
    async read(input) {
      const response = await getClient().send(
        new GetObjectCommand({ Bucket: input.bucket, Key: input.objectKey }),
      );
      if (!response.Body) throw new Error('Archivo inexistente');
      return response.Body.transformToByteArray();
    },
  };
}
export function privateBucket() {
  const bucket = process.env.R2_PRIVATE_BUCKET;
  if (!bucket) throw new Error('Bucket privado sin configurar');
  return bucket;
}
export function publicBucket() {
  const bucket = process.env.R2_PUBLIC_BUCKET;
  if (!bucket) throw new Error('Bucket público sin configurar');
  return bucket;
}
