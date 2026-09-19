// import {
//   DeleteObjectCommand,
//   GetObjectCommand,
//   HeadObjectCommand,
//   PutObjectCommand,
//   S3Client,
//   type S3ClientConfig,
// } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// import { env } from '@/config/env';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { S3_URL_EXPIRY } from '@/core/constants';

// // ─── Local env: swap in dummy implementation (no real AWS calls) ─────────────
// if (env.NODE_ENV === 'local') {
//   module.exports = require('./mock/s3.mock');
// }

// const s3Config: S3ClientConfig = {
//   region: env.AWS_REGION,
// };

// if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
//   s3Config.credentials = {
//     accessKeyId: env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
//   };
// }

// const s3Client = new S3Client(s3Config);

// /**
//  * Helper to determine MIME type from filename extension.
//  */
// function getContentType(fileName: string): string {
//   const ext = fileName.toLowerCase().split('.').pop();
//   // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
//   switch (ext) {
//     case 'pdf':
//       return 'application/pdf';
//     case 'jpg':
//     case 'jpeg':
//       return 'image/jpeg';
//     case 'png':
//       return 'image/png';
//     case 'gif':
//       return 'image/gif';
//     case 'zip':
//       return 'application/zip';
//     case 'tar':
//       return 'application/x-tar';
//     case 'gz':
//       return 'application/gzip';
//     case 'doc':
//       return 'application/msword';
//     case 'docx':
//       return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
//     case 'xls':
//       return 'application/vnd.ms-excel';
//     case 'xlsx':
//       return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
//     case 'ppt':
//       return 'application/vnd.ms-powerpoint';
//     case 'pptx':
//       return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
//     case 'txt':
//       return 'text/plain';
//     case 'csv':
//       return 'text/csv';
//     case 'json':
//       return 'application/json';
//     default:
//       throw new AppError(
//         AppErrorMessage.INVALID_FILE_TYPE,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.INVALID_FILE_TYPE,
//       );
//   }
// }

// /**
//  * Sanitizes a filename for safe S3 key construction.
//  */
// function sanitizeFileName(fileName: string): string {
//   return fileName
//     .replace(/\s+/g, '_')
//     .replace(/[^a-zA-Z0-9._-]/g, '')
//     .toLowerCase();
// }

// /**
//  * Generates a pre-signed PUT URL for direct browser-to-S3 upload.
//  */
// export async function generateUploadUrl(fileName: string): Promise<{
//   uploadUrl: string;
//   documentKey: string;
//   originalFileName: string;
// }> {
//   const sanitized = sanitizeFileName(fileName);
//   const documentKey = `tenders/${crypto.randomUUID()}-${sanitized}`;

//   const command = new PutObjectCommand({
//     Bucket: env.AWS_S3_BUCKET,
//     Key: documentKey,
//     ContentType: getContentType(fileName),
//   });

//   const uploadUrl = await getSignedUrl(s3Client, command, {
//     expiresIn: S3_URL_EXPIRY.UPLOAD,
//   });

//   return { uploadUrl, documentKey, originalFileName: fileName };
// }

// /**
//  * Generates a pre-signed GET URL for secure PDF download.
//  * URL expires in 15 minutes — prevents link sharing.
//  *
//  * The Content-Disposition header triggers a browser download with the original filename.
//  */
// export async function generateDownloadUrl(
//   documentKey: string,
//   originalFileName: string,
// ): Promise<string> {
//   const command = new GetObjectCommand({
//     Bucket: env.AWS_S3_BUCKET,
//     Key: documentKey,
//     ResponseContentDisposition: `attachment; filename="${originalFileName}"`,
//     ResponseContentType: getContentType(originalFileName),
//   });

//   return getSignedUrl(s3Client, command, { expiresIn: S3_URL_EXPIRY.DOWNLOAD });
// }

// /**
//  * Deletes a file from S3.
//  * Called when an admin soft-deletes a tender that has a document.
//  */
// export async function deleteFile(documentKey: string): Promise<void> {
//   const command = new DeleteObjectCommand({
//     Bucket: env.AWS_S3_BUCKET,
//     Key: documentKey,
//   });
//   await s3Client.send(command);
// }

// /**
//  * Queries the S3 object metadata to verify and get the file size.
//  */
// export async function getFileSize(documentKey: string): Promise<number> {
//   const command = new HeadObjectCommand({
//     Bucket: env.AWS_S3_BUCKET,
//     Key: documentKey,
//   });
//   const response = await s3Client.send(command);
//   return response.ContentLength ?? 0;
// }
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { env, isLocalEnv } from '@/config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { S3_URL_EXPIRY } from '@/core/constants';

const s3Config: S3ClientConfig = {
  region: env.AWS_REGION,
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  s3Config.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

export const s3Client = new S3Client(s3Config);

/**
 * Determine MIME type from filename.
 */
export function getContentType(fileName: string): string {
  const ext = fileName.toLowerCase().split('.').pop() as string;

  switch (ext) {
    case 'pdf':
      return 'application/pdf';

    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';

    case 'png':
      return 'image/png';

    case 'gif':
      return 'image/gif';

    case 'zip':
      return 'application/zip';

    case 'tar':
      return 'application/x-tar';

    case 'gz':
      return 'application/gzip';

    case 'doc':
      return 'application/msword';

    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

    case 'xls':
      return 'application/vnd.ms-excel';

    case 'xlsx':
      return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    case 'ppt':
      return 'application/vnd.ms-powerpoint';

    case 'pptx':
      return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

    case 'txt':
      return 'text/plain';

    case 'csv':
      return 'text/csv';

    case 'json':
      return 'application/json';

    default:
      throw new AppError(
        AppErrorMessage.INVALID_FILE_TYPE,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_FILE_TYPE,
      );
  }
}

/**
 * Sanitize filename for S3 key.
 */
function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .toLowerCase();
}

/**
 * Generate Tender document S3 key.
 */
export function generateTenderDocumentKey(tenderId: string, fileName: string): string {
  const sanitized = sanitizeFileName(fileName);

  return `tenders/${tenderId}/documents/${crypto.randomUUID()}-${sanitized}`;
}

/**
 * Upload Multer file directly to S3.
 */
export async function uploadFileToS3(file: Express.Multer.File, documentKey: string) {
  if (isLocalEnv()) {
    return uploadFileToLocal(file, documentKey);
  }
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
    Body: file.buffer,
    ContentType: file.mimetype || getContentType(file.originalname),
    ContentLength: file.size,
  });

  await s3Client.send(command);

  return {
    key: documentKey,
    bucket: env.AWS_S3_BUCKET,
  };
}

/**
 * Generate signed download URL.
 */
export async function generateDownloadUrl(
  documentKey: string,
  originalFileName: string,
): Promise<string> {
  if (isLocalEnv()) {
    return `/api/v1/tenders/documents/${encodeURIComponent(documentKey)}/download`;
  }
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
    ResponseContentDisposition: `attachment; filename="${originalFileName}"`,
    ResponseContentType: getContentType(originalFileName),
  });

  return getSignedUrl(s3Client, command, {
    expiresIn: S3_URL_EXPIRY.DOWNLOAD,
  });
}

/**
 * Delete file from S3.
 */
export async function deleteFile(documentKey: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
  });

  await s3Client.send(command);
}

/**
 * Get S3 file size.
 */
export async function getFileSize(documentKey: string): Promise<number> {
  const command = new HeadObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: documentKey,
  });

  const response = await s3Client.send(command);

  return response.ContentLength ?? 0;
}

export async function uploadFileToLocal(file: Express.Multer.File, documentKey: string) {
  const uploadPath = path.join(process.cwd(), 'uploads', documentKey);

  await fs.mkdir(path.dirname(uploadPath), {
    recursive: true,
  });

  await fs.writeFile(uploadPath, file.buffer);

  return {
    key: documentKey,
    bucket: 'local',
  };
}
