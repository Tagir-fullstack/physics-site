import './env.js'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

const {
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_BUCKET,
  R2_ENDPOINT,
  R2_PUBLIC_URL,
} = process.env

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET || !R2_ENDPOINT) {
  throw new Error('R2 env vars are not fully set (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_ENDPOINT)')
}

export const r2 = new S3Client({
  region: 'auto',
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
})

export async function putObject(key: string, body: Buffer, contentType: string): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  )
  // If a public dev domain is set, return the CDN URL — otherwise the internal S3 URL.
  if (R2_PUBLIC_URL) return `${R2_PUBLIC_URL.replace(/\/$/, '')}/${key}`
  return `${R2_ENDPOINT!.replace(/\/$/, '')}/${R2_BUCKET}/${key}`
}
