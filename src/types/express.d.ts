import type { AccountType } from './enums';

import 'express-serve-static-core';

/**
 * Cryptographically verified JWT access-token claims.
 *
 * [TRUST BOUNDARY]
 * The payload is considered application-trusted only after:
 * 1. JWT signature verification.
 * 2. Algorithm, issuer, and audience validation.
 * 3. Required claim validation.
 *
 * Database-backed user properties MUST NOT be trusted from this payload
 * when the latest value is required.
 */
export interface AccessTokenPayload {
  /** JWT subject — canonical user ID */
  sub: string;

  /** Account classification encoded when the token was issued */
  accountType: AccountType;

  /** Session version used for server-side token revocation */
  tokenVersion: number;

  /** JWT token type — access token only */
  type: 'access';

  /** Issued-at timestamp in Unix seconds */
  iat: number;

  /** Expiration timestamp in Unix seconds */
  exp: number;

  /** Token issuer */
  iss: string;

  /** Token audience */
  aud: string;

  /** Unique JWT identifier */
  jti?: string;

  /**
   * Legacy claim retained only if existing tokens contain it.
   * Prefer removing it from newly issued tokens.
   */
  email?: string;
}

/**
 * Application-level authenticated identity attached to `req.user`.
 *
 * [SOURCE OF TRUTH]
 * Identity fields should be populated from the validated database user
 * rather than directly copied from potentially stale JWT claims.
 */
export interface AuthenticatedUser {
  /** Canonical user ID */
  sub: string;

  /** Backward-compatible alias for `sub` */
  userId: string;

  /** Current verified email address */
  email: string;

  /** Current account classification */
  accountType: AccountType;

  /** Backward-compatible alias for `accountType` */
  role: AccountType;

  /** Legacy admin-role placeholder */
  adminRole: unknown | null;

  /** Current database session/token version */
  tokenVersion: number;
}

/**
 * @deprecated Use `AuthenticatedUser` for `req.user`.
 */
export type JwtPayload = AuthenticatedUser;

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user identity attached by `authenticate`. */
      user?: AuthenticatedUser;

      /** Application-level HTTP request identifier. */
      requestId?: string;

      /** W3C trace ID — identifies the complete distributed trace. */
      traceId?: string;

      /** W3C span ID — identifies the current operation/span. */
      spanId?: string;

      /** W3C parent span ID — identifies the operation that created this span. */
      parentId?: string | undefined;

      /** W3C trace flags. */
      traceFlags?: string;

      /** Resolved permission keys for the authenticated user. */
      permissions?: string[];

      /** Resolved role identifiers for the authenticated user. */
      roles?: string[];
    }
  }
}

declare module 'express-serve-static-core' {
  interface Request {
    /** Pino HTTP request identifier. */
    id?: string;
  }
}
