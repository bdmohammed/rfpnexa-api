import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

import type { Request } from 'express';
import type { Options } from 'express-rate-limit';
import { RATE_LIMIT_HEADERS, RATE_LIMITS } from '@/constants/rateLimits';

/**
 * [WHAT]
 * Configures Express rate limiting middleware instances across authentication,
 * public forms, downloads, and global API routes.
 *
 * [WHY]
 * Protects system resources from brute-force attacks, credential stuffing,
 * email/form spam, and DoS attempts. Operating in per-worker mode avoids
 * Redis dependency overhead during initial deployment scale.
 *
 * [CONSTRAINT]
 * 1. In PM2 cluster mode without a central Redis store, effective limit per
 *    IP equals worker_count × configured_limit.
 * 2. Express `app.set('trust proxy', 1)` (or appropriate proxy count) MUST be
 *    enabled when deployed behind reverse proxies (Nginx/Cloudflare/ALB).
 *
 * [SIDE EFFECTS]
 * Maintains request counters in-memory per worker process and appends
 * `RateLimit-*` standard headers to HTTP responses.
 */

/**
 * [WHAT]
 * Factory function for creating pre-configured Express rate limiting middleware instances.
 *
 * [WHY]
 * Eliminates duplicate configuration (headers, store settings) and ensures
 * consistent rate limiter instantiations.
 *
 * [CONSTRAINT]
 * Must enforce global header settings (`standardHeaders: true`, `legacyHeaders: false`)
 * and standard API error payload formatting.
 */
const createLimiter = (config: {
  windowMs: number;
  max: number;
  message: { success: boolean; code: string; message: string };
  keyGenerator?: Options['keyGenerator'];
  skip?: Options['skip'];
}) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: RATE_LIMIT_HEADERS.STANDARD,
    legacyHeaders: RATE_LIMIT_HEADERS.LEGACY,
    message: config.message,
    ...(config.keyGenerator ? { keyGenerator: config.keyGenerator } : {}),
    ...(config.skip ? { skip: config.skip } : {}),
  });
};

/**
 * [WHAT]
 * Helper that builds a key generator combining client IP with a target body identifier.
 *
 * [WHY]
 * Provides dual-layer protection: limits per IP and per targeted account identifier
 * to defend against distributed botnets targeting single accounts.
 *
 * [CONSTRAINT]
 * Identifiers must be normalized (lowercased and trimmed) to prevent throttling
 * bypass via casing or whitespace variations.
 */
const createIdentifierKeyGenerator = (fieldName: string = 'email') => {
  return (req: Request): string => {
    const rawIdentifier = req.body?.[fieldName];
    const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim().toLowerCase() : '';
    const ip = ipKeyGenerator(req.ip ?? '');
    return identifier ? `${ip}:${identifier}` : ip;
  };
};

/**
 * [WHAT]
 * Restricts login attempt frequency per IP address and targeted account identifier.
 *
 * [WHY]
 * Prevents automated credential stuffing, single-account targeting, and brute-force
 * password discovery attacks.
 *
 * [CONSTRAINT]
 * Standardized error payload structure must be returned when limit is exceeded
 * to prevent account enumeration.
 *
 * [ERRORS]
 * Returns HTTP status 429 when threshold is reached within 1 minute.
 */
export const loginLimiter = createLimiter({
  ...RATE_LIMITS.LOGIN,
  keyGenerator: createIdentifierKeyGenerator('email'),
});

/**
 * [WHAT]
 * Throttles account registration attempts per IP address and email.
 *
 * [WHY]
 * Mitigates bot creation of fake accounts, email abuse, and database spam.
 *
 * [CONSTRAINT]
 * Response payload structure must remain generic to prevent email existence enumeration.
 *
 * [ERRORS]
 * Returns HTTP status 429 when registration threshold is exceeded in 1 hour.
 */
export const registerLimiter = createLimiter({
  ...RATE_LIMITS.REGISTER,
  keyGenerator: createIdentifierKeyGenerator('email'),
});

/**
 * [WHAT]
 * Controls the frequency of password reset requests per IP address and email.
 *
 * [WHY]
 * Prevents user harassment, inbox spamming, and token generation abuse.
 *
 * [CONSTRAINT]
 * Must return generic 429 error messages without revealing user/account existence.
 *
 * [ERRORS]
 * Returns HTTP status 429 when password reset limits are breached in 1 hour.
 */
export const passwordResetLimiter = createLimiter({
  ...RATE_LIMITS.PASSWORD_RESET,
  keyGenerator: createIdentifierKeyGenerator('email'),
});

const createPerEmailKeyGenerator = (fieldName: string = 'email') => {
  return (req: Request): string => {
    const rawIdentifier = req.body?.[fieldName];
    const identifier = typeof rawIdentifier === 'string' ? rawIdentifier.trim().toLowerCase() : '';
    return identifier ? `email:${identifier}` : ipKeyGenerator(req.ip ?? '');
  };
};

/**
 * [WHAT]
 * Independent rate limiter restricting password reset requests per target email address.
 *
 * [WHY]
 * Protects single target email accounts against inbox flooding from distributed botnet IPs.
 */
export const passwordResetEmailLimiter = createLimiter({
  ...RATE_LIMITS.PASSWORD_RESET,
  keyGenerator: createPerEmailKeyGenerator('email'),
});

/**
 * [WHAT]
 * Limits requests for resending email verification links per IP address and combined email key.
 */
export const resendVerificationLimiter = createLimiter({
  ...RATE_LIMITS.RESEND_VERIFICATION,
  keyGenerator: createIdentifierKeyGenerator('email'),
});

/**
 * [WHAT]
 * Independent rate limiter restricting email verification resend requests per target email address.
 *
 * [WHY]
 * Protects single target email accounts against distributed botnet attacks from multiple IPs.
 */
export const resendVerificationEmailLimiter = createLimiter({
  ...RATE_LIMITS.RESEND_VERIFICATION,
  keyGenerator: createPerEmailKeyGenerator('email'),
});

/**
 * [WHAT]
 * Limits submission rates on public contact forms per IP address and email.
 *
 * [WHY]
 * Protects support queues and notification triggers against automated submission bots.
 *
 * [ERRORS]
 * Returns HTTP status 429 when contact form submission limit is reached in 1 hour.
 */
export const contactLimiter = createLimiter({
  ...RATE_LIMITS.CONTACT,
  keyGenerator: createIdentifierKeyGenerator('email'),
});

/**
 * [WHAT]
 * Restricts download URL generation frequency per authenticated user.
 *
 * [WHY]
 * Prevents S3 pre-signed URL generation abuse, bandwidth exhaustion, and asset scraping.
 *
 * [CONSTRAINT]
 * Requires authentication middleware (`authenticate`) to run prior in the route chain.
 * Key generator prioritizes `user:${req.user.userId}` and falls back to `ip:${req.ip}`.
 *
 * [ERRORS]
 * Returns HTTP status 429 when a user exceeds the hourly download generation cap.
 */
export const downloadLimiter = createLimiter({
  ...RATE_LIMITS.DOWNLOAD,
  keyGenerator: (req: Request) => {
    if (req.user?.userId) {
      return `user:${req.user.userId}`;
    }
    return `ip:${ipKeyGenerator(req.ip ?? '')}`;
  },
});

/**
 * [WHAT]
 * Serves as a global rate limiting safety net across all API endpoints per IP address.
 *
 * [WHY]
 * Prevents total service denial, unauthenticated API scraping, and runaway client polling.
 *
 * [CONSTRAINT]
 * Must be applied high in the middleware stack (e.g., `app.use('/api/', globalLimiter)`).
 *
 * [ERRORS]
 * Returns HTTP status 429 when an IP breaches the global limit (300 req / 15 min).
 */
export const globalLimiter = createLimiter(RATE_LIMITS.GLOBAL);

/**
 * [WHAT]
 * Restricts CSRF token issuance frequency per IP address.
 *
 * [WHY]
 * Prevents automated scraping and token distribution endpoint flooding.
 */
export const csrfLimiter = createLimiter(RATE_LIMITS.CSRF);

/**
 * [WHAT]
 * Restricts token refresh frequency per IP address.
 *
 * [WHY]
 * Prevents automated refresh token scraping and endpoint flooding attacks.
 */
export const refreshLimiter = createLimiter(RATE_LIMITS.REFRESH);

/**
 * [WHAT]
 * Restricts email change request frequency per IP / authenticated user context.
 */
export const emailChangeLimiter = createLimiter(RATE_LIMITS.EMAIL_CHANGE);
