/**
 * [WHAT]
 * Security policy constants for forced password resets and password expiration limits.
 *
 * [WHY]
 * Centralizes security thresholds and route bypass whitelist definitions across API middleware.
 */

/** Whitelisted routes exempt from forced password reset and password expiration enforcement */
export const PASSWORD_BYPASS_ROUTES = new Set([
  '/api/v1/auth/logout',
  '/api/v1/auth/reset-password',
  '/api/v1/auth/password/change',
]);

/** Maximum allowed age in days before an account password expires */
export const PASSWORD_MAX_AGE_DAYS = 90;

/** Milliseconds in a single 24-hour day */
export const MS_PER_DAY = 86_400_000;
