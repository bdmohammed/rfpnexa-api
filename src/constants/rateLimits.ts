/**
 * [WHAT]
 * Rate limiting configuration constants including window durations, request limits, response headers,
 * and error messages.
 *
 * [WHY]
 * Centralizes rate limit configurations across the application to facilitate maintainability, consistency,
 * and easy adjustments.
 *
 * [CONSTRAINT]
 * Message objects must match standard API response format `{ success: false, code: 'RATE_LIMITED', message: string }`.
 */

/** Header configuration options for rate limiting responses */
export const RATE_LIMIT_HEADERS = {
  STANDARD: true,
  LEGACY: false,
} as const;

/** Rate limit threshold definitions for various API endpoints */
export const RATE_LIMITS = {
  LOGIN: {
    windowMs: 60 * 1000,
    max: 10,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many login attempts. Try again in 1 minute.',
    },
  },
  REGISTER: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many registration attempts. Try again in 1 hour.',
    },
  },
  PASSWORD_RESET: {
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many password reset attempts. Try again in 1 hour.',
    },
  },
  RESEND_VERIFICATION: {
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many verification link requests. Try again in 15 minutes.',
    },
  },
  CONTACT: {
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many contact form submissions. Try again later.',
    },
  },
  DOWNLOAD: {
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Download limit reached. Try again in 1 hour.',
    },
  },
  GLOBAL: {
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests. Slow down.',
    },
  },
  CSRF: {
    windowMs: 60 * 1000,
    max: 60,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many CSRF token requests. Try again in 1 minute.',
    },
  },
  REFRESH: {
    windowMs: 60 * 1000,
    max: 20,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many refresh attempts. Try again in 1 minute.',
    },
  },
  EMAIL_CHANGE: {
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: {
      success: false,
      code: 'RATE_LIMITED',
      message: 'Too many email change requests. Try again in 10 minutes.',
    },
  },
} as const;
