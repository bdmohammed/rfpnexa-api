import { randomBytes } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';
import { TRACE_HEADERS, TRACE_PATTERNS } from '@/constants/trace';
import { runWithContext } from '@/core/requestContext';

/**
 * Returns a normalized HTTP header value.
 */
function getHeader(req: Request, name: string): string | undefined {
  const value = req.headers[name];

  return typeof value === 'string' ? value.trim() : undefined;
}

/**
 * Generates a W3C-compatible 16-character span ID.
 */
function generateSpanId(): string {
  return randomBytes(8).toString('hex');
}

/**
 * Generates a normalized 32-character trace ID.
 */
function generateTraceId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

/**
 * [WHAT]
 * Validates whether a raw trace ID string conforms to strict security and format rules.
 *
 * [WHY]
 * Prevents log injection, collision attacks, and arbitrary header manipulation from untrusted clients.
 *
 * [CONSTRAINT]
 * Must be a 32-character hexadecimal string or valid UUID v4. All-zero values (`0000...`) are rejected.
 */
export function isValidTraceId(rawTraceId: string): boolean {
  if (!rawTraceId) return false;
  const traceId = rawTraceId.trim().toLowerCase();

  // Reject all-zero trace IDs (violates W3C Trace Context spec)
  if (
    traceId === TRACE_PATTERNS.INVALID_ZERO_TRACE_32 ||
    traceId === TRACE_PATTERNS.INVALID_ZERO_UUID
  ) {
    return false;
  }

  // Accept strictly formatted 32-character hex trace ID or UUID v4
  return TRACE_PATTERNS.STRICT_HEX_32.test(traceId) || TRACE_PATTERNS.UUID_V4.test(traceId);
}

/**
 * [WHAT]
 * Validates whether an incoming raw request ID string conforms to safe format limits.
 *
 * [WHY]
 * Ensures client-supplied request IDs are safe against log injection and payload tampering.
 *
 * [CONSTRAINT]
 * Must be an alphanumeric, hyphen, or underscore string between 8 and 128 characters.
 */
export function isValidRequestId(rawRequestId: string): boolean {
  if (!rawRequestId) return false;
  const requestId = rawRequestId.trim();
  return /^[a-zA-Z0-9\-_]{8,128}$/.test(requestId);
}

/**
 * [WHAT]
 * Parses and validates W3C traceparent header (`version-traceId-parentId-traceFlags`).
 *
 * [WHY]
 * Supports distributed tracing standards while enforcing W3C spec constraints.
 *
 * [CONSTRAINT]
 * Rejects version `ff` and all-zero traceId or parentId values per W3C specification.
 */
export function parseTraceparent(traceparent: string):
  | {
      version: string;
      traceId: string;
      parentId: string;
      traceFlags: string;
    }
  | undefined {
  if (!traceparent) return undefined;
  const match = TRACE_PATTERNS.TRACEPARENT.exec(traceparent.trim().toLowerCase());
  if (!match) return undefined;

  const [, version, traceId, parentId, traceFlags] = match;

  if (!version || !traceId || !parentId || !traceFlags) {
    return undefined;
  }

  // W3C Spec Constraint: Version 'ff' is reserved and invalid
  if (version === 'ff') return undefined;

  // Only accept W3C version 00.
  if (version !== TRACE_PATTERNS.W3C_VERSION) {
    return undefined;
  }
  // W3C Spec Constraint: traceId and parentId MUST NOT be all zeros
  if (
    traceId === TRACE_PATTERNS.INVALID_ZERO_TRACE_32 ||
    parentId === TRACE_PATTERNS.ZERO_PARENT_ID
  ) {
    return undefined;
  }

  return {
    version,
    traceId,
    parentId,
    traceFlags,
  };
}

/**
 * [WHAT]
 * Express middleware initializing request correlation tracing with distinct traceId and requestId.
 *
 * [WHY]
 * Separates end-to-end distributed trace context (`traceId`) from individual HTTP request ID (`requestId`).
 *
 * [CONSTRAINT]
 * MUST be registered as the first middleware in `app.ts` to ensure all logging captures validated context.
 *
 * [SIDE EFFECTS]
 * 1. Attaches `traceId` and `requestId` to `req`.
 * 2. Sets `X-Trace-Id`, `X-Request-Id`, and `traceparent` headers on `res`.
 * 3. Wraps downstream execution in AsyncLocalStorage context scope.
 */
export const traceContext = (req: Request, res: Response, next: NextFunction): void => {
  let traceId: string;
  let parentId: string | undefined;
  let traceFlags = '01';

  // 1. Extract and strictly validate incoming X-Trace-Id header
  const rawTraceparent = getHeader(req, TRACE_HEADERS.TRACEPARENT);
  const parsedTraceparent = rawTraceparent ? parseTraceparent(rawTraceparent) : undefined;

  if (parsedTraceparent) {
    // eslint-disable-next-line prefer-destructuring
    traceId = parsedTraceparent.traceId;
    // eslint-disable-next-line prefer-destructuring
    parentId = parsedTraceparent.parentId;
    // eslint-disable-next-line prefer-destructuring
    traceFlags = parsedTraceparent.traceFlags;
  } else {
    // ── 2. Fall back to custom X-Trace-Id header ─────────────────────────────

    const rawTraceId = getHeader(req, TRACE_HEADERS.TRACE_ID);

    if (rawTraceId && isValidTraceId(rawTraceId)) {
      traceId = rawTraceId.toLowerCase().replace(/-/g, '');
    } else {
      // ── 3. Generate server-side trace ID ──────────────────────────────────

      traceId = generateTraceId();
    }
  }

  // 4. Extract or generate a distinct X-Request-Id specifically for this HTTP request
  const requestId = crypto.randomUUID();

  const spanId = generateSpanId();
  const outgoingTraceparent = `${TRACE_PATTERNS.W3C_VERSION}-${traceId}-${spanId}-${traceFlags}`;

  // Stash on Express request object
  req.traceId = traceId;
  req.requestId = requestId;

  // Set response headers for client correlation & distributed tracing propagation
  res.setHeader(TRACE_HEADERS.TRACE_ID, traceId);
  res.setHeader(TRACE_HEADERS.TRACEPARENT, outgoingTraceparent);

  // Initialize lightweight AsyncLocalStorage context scope
  runWithContext({ traceId, requestId, parentId, spanId, traceFlags }, next);
};
