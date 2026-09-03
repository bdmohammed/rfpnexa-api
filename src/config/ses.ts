import { SESv2Client, type SESv2ClientConfig } from '@aws-sdk/client-sesv2';

import { env } from './env';

/**
 * [WHAT]
 * Configured AWS SESv2 (Simple Email Service v2) client instance.
 *
 * [WHY]
 * Provides transactional email dispatch capabilities (password resets, email verification, notifications).
 *
 * [CONSTRAINT]
 * 1. Prioritizes explicit IAM credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) when supplied.
 * 2. Falls back to AWS SDK Default Credentials Provider Chain (IRSA, IAM task roles) if keys are omitted.
 *
 * [SIDE EFFECTS]
 * Initializes AWS SESv2 SDK client connection pool.
 */
const sesConfig: SESv2ClientConfig = {
  region: env.AWS_REGION,
};

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  sesConfig.credentials = {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  };
}

export const sesClient = new SESv2Client(sesConfig);
