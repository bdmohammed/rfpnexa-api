import { doubleCsrf } from 'csrf-csrf';

import type { Request } from 'express';
import { env } from '@/config/env';

/**
 * Configures double-submit cookie CSRF protection to prevent cross-site request forgery.
 *
 * Business Rules & Security Context:
 * - Requires clients to present matching tokens in both HTTP-only cookies and the `x-csrf-token` header.
 * - Exempts safe HTTP methods (GET, HEAD, OPTIONS) and external payment webhooks.
 *
 * Side Effects:
 * - Mutates outgoing response headers to append the signed CSRF cookie upon token generation.
 *
 * Failure Modes:
 * - Rejects state-mutating requests (POST, PUT, PATCH, DELETE) with 403 Forbidden if cookie and header tokens are
 * missing or mismatched.
 *
 * SECURITY: Critical defense mechanism guarding all state-mutating API routes against unauthorized cross-site actions.
 */
export const { generateCsrfToken: generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,

  /**
   * SECURITY: Binds CSRF token cryptographic signing to authenticated user ID
   * without binding to client IP (preventing mobile/LTE IP change verification breaks).
   */
  getSessionIdentifier: (req: Request) => req.user?.userId ?? '',
  cookieName: 'rfpnexa.csrf',
  cookieOptions: {
    sameSite: 'lax',
    secure: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat',
    httpOnly: true,
    path: '/',
    domain: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat' ? '.rfpnexa.com' : undefined,
  },
  size: 64,

  // NOTE: Safe HTTP methods do not alter backend state, so CSRF token verification is omitted.
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});
