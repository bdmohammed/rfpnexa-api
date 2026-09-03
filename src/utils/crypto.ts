import crypto from 'node:crypto';

import { EMAIL_VERIFICATION_TOKEN_BYTES } from '@/core/constants';

/**
 * Pre-computed bcrypt hash of a random 32-byte string used for constant-time
 * dummy comparison when a login user email is not found in the database.
 */
export const DUMMY_PASSWORD_HASH = '$2a$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateEmailVerificationToken(): { rawToken: string; hashedToken: string } {
  const rawToken = crypto.randomBytes(EMAIL_VERIFICATION_TOKEN_BYTES).toString('hex');
  const hashedToken = hashToken(rawToken);
  return { rawToken, hashedToken };
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(64).toString('hex');
}

export function hashRefreshToken(rawToken: string): string {
  return hashToken(rawToken);
}
