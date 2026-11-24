import 'server-only';

import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export type FileLocation = { bucket: string; objectKey: string };
export type StoragePort = {
  presignUpload(input: FileLocation & { contentType: string }): Promise<string>;
  presignDownload(input: FileLocation): Promise<string>;
  read(input: FileLocation): Promise<Uint8Array>;
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
export function checkFileSignature(data: Uint8Array, type: string) {
  const prefix = Buffer.from(data.subarray(0, 12));
  if (type === 'application/pdf') return prefix.subarray(0, 5).toString() === '%PDF-';
  if (type === 'image/png')
    return prefix.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (type === 'image/jpeg') return prefix[0] === 0xff && prefix[1] === 0xd8 && prefix[2] === 0xff;
  return false;
}
