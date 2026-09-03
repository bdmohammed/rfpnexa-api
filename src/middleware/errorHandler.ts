import { QueryFailedError } from 'typeorm';
import { ZodError } from 'zod';

import type { NextFunction, Request, Response } from 'express';
import type { Logger } from 'pino';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode } from '@/core/AppError';
import { getContext } from '@/core/requestContext';
import { firstDefined } from '@/utils';

interface AppErrorWithErrors extends AppError {
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

interface ErrorContext {
  activeLogger: Logger;
  traceId: string;
  requestId: string;
  userId?: string;
  res: Response;
  method: string;
  path: string;
}

/** PostgreSQL error codes for constraint violation mapping */
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
} as const;

/**
 * [WHAT]
 * Global Express error handling middleware catching and formatting operational and unhandled exceptions.
 *
 * [WHY]
 * Guarantees a unified JSON error contract across all endpoints while logging errors with trace correlation.
 *
 * [CONSTRAINT]
 * 1. MUST be registered as the last middleware in `app.ts` (requires 4 parameters: `(err, req, res, next)`).
 * 2. MUST NOT leak stack traces or raw database credentials in production.
 * 3. MUST include `traceId` in every JSON error response.
 *
 * [SIDE EFFECTS]
 * Logs warning (`logger.warn`) or error (`logger.error`) telemetry to Pino.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const context = getErrorContext(req, res);

  if (err instanceof AppError) {
    return handleAppError(err, context);
  }

  if (err instanceof ZodError) {
    return handleZodError(err, context);
  }

  if (err instanceof QueryFailedError) {
    return handleQueryFailedError(err, context);
  }

  if (isCsrfError(err)) {
    return handleCsrfError(context);
  }

  return handleUnknownError(err, context);
};

/**
 * [WHAT]
 * Extracts request correlation context (`traceId`, `requestId`, `userId`, `method`, `path`) for error handling.
 *
 * [WHY]
 * Correlates error logs and response payloads directly with AsyncLocalStorage request context.
 */
function getErrorContext(req: Request, res: Response): ErrorContext {
  const ctx = getContext();

  return {
    activeLogger: req.log ?? logger,
    traceId: firstDefined<string>(ctx?.traceId, req.traceId, 'unknown'),
    requestId: firstDefined<string>(ctx?.requestId, req.requestId, req.id, 'unknown'),
    userId: firstDefined<string>(ctx?.userId, req.user?.userId),
    res,
    method: req.method,
    path: req.path,
  };
}

/**
 * [WHAT]
 * Formats expected operational `AppError` exceptions (e.g. 400, 401, 403, 404, 422).
 *
 * [WHY]
 * Returns structured JSON responses containing human-readable messages, error codes, and validation lists.
 */
function handleAppError(err: AppError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const appErr = err as AppErrorWithErrors;
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
      userId,
      statusCode: err.statusCode,
      code: err.code,
    },
    err.message,
  );
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
    error: err.code,
    ...(appErr.errors ? { errors: appErr.errors } : {}),
    traceId,
  });
}

/**
 * [WHAT]
 * Formats unhandled Zod schema validation errors into HTTP 422 Unprocessable Entity responses.
 *
 * [WHY]
 * Safety fallback ensuring Zod issues produce a standardized field-level validation error structure.
 */
function handleZodError(err: ZodError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const validationErrors = err.issues.map((i) => ({
    field: i.path.join('.'),
    message: i.message,
  }));
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
      userId,
      statusCode: 422,
      code: AppErrorCode.VALIDATION_ERROR,
      errors: validationErrors,
    },
    AppErrorCode.VALIDATION_FAILED,
  );
  res.status(422).json({
    success: false,
    message: AppErrorCode.VALIDATION_FAILED,
    error: AppErrorCode.VALIDATION_ERROR,
    errors: validationErrors,
    traceId,
  });
}

type PgQueryFailedError = QueryFailedError<Error> & {
  code?: string;
  detail?: string;
};

/** Extracts PostgreSQL error code from QueryFailedError */
function getPostgresCode(error: PgQueryFailedError): string | undefined {
  return typeof error.code === 'string' ? error.code : undefined;
}

/**
 * [WHAT]
 * Translates PostgreSQL constraint failures (unique key `23505`, foreign key `23503`) to HTTP 409.
 *
 * [WHY]
 * Provides user-friendly error messages for database duplication errors without exposing schema internals.
 *
 * [CONSTRAINT]
 * Detail strings are only included in JSON payloads in non-production environments (`local`, `dev`).
 */
function handleQueryFailedError(err: PgQueryFailedError, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const pgError = err;
  const code = getPostgresCode(err);

  if (code === PG_ERROR_CODES.UNIQUE_VIOLATION) {
    let friendlyMessage = 'A record with this value already exists';
    if (pgError.detail) {
      const match = pgError.detail.match(/Key \(([^)]+)\)=\(([^)]+)\)/);
      if (match) {
        const [, field, value] = match as [string, string, string];
        const cleanField = field.replace('_', ' ');
        friendlyMessage = `A record with ${cleanField} "${value}" already exists. Please choose a different ${cleanField}.`;
      }
    }

    activeLogger.warn(
      {
        requestId,
        traceId,
        method,
        path,
        userId,
        statusCode: 409,
        code: 'CONFLICT',
        detail: pgError.detail,
      },
      'Database unique constraint violation',
    );
    res.status(409).json({
      success: false,
      message: friendlyMessage,
      error: 'CONFLICT',
      traceId,
      ...(['local', 'dev'].includes(env.NODE_ENV) ? { detail: pgError.detail } : {}),
    });
    return;
  }

  if (code === PG_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    activeLogger.warn(
      {
        requestId,
        traceId,
        method,
        path,
        userId,
        statusCode: 409,
        code: 'FK_VIOLATION',
      },
      'Database foreign key constraint violation',
    );
    res.status(409).json({
      success: false,
      message: 'Referenced record does not exist',
      error: 'FK_VIOLATION',
      traceId,
    });
    return;
  }

  return handleUnknownError(err, context);
}

/** Checks if error represents a CSRF token verification failure */
function isCsrfError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const { code } = err as { code?: string };
    return (
      msg.includes('csrf') ||
      msg.includes('invalid csrf token') ||
      code === 'EBADCSRFTOKEN' ||
      code === 'invalid_csrf_token'
    );
  }
  return false;
}

/**
 * [WHAT]
 * Formats invalid CSRF token exceptions into HTTP 403 Forbidden responses.
 *
 * [WHY]
 * Informs clients to refresh anti-CSRF tokens when session validation fails.
 */
function handleCsrfError(context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  activeLogger.warn(
    {
      requestId,
      traceId,
      method,
      path,
      userId,
      statusCode: 403,
      code: 'CSRF_INVALID',
    },
    'CSRF validation failed',
  );
  res.status(403).json({
    success: false,
    message: 'CSRF validation failed. Refresh the page and try again.',
    error: 'CSRF_INVALID',
    traceId,
  });
}

/**
 * [WHAT]
 * Catches unhandled 500 server crashes and returns a safe HTTP 500 Internal Server Error response.
 *
 * [WHY]
 * Prevents technical stack trace leaks in production while logging full error details for diagnostics.
 *
 * [CONSTRAINT]
 * Stack traces are strictly suppressed in non-development environments (`prod`, `uat`).
 */
function handleUnknownError(err: unknown, context: ErrorContext): void {
  const { activeLogger, traceId, requestId, userId, res, method, path } = context;
  const error = err instanceof Error ? err : new Error(String(err));
  activeLogger.error(
    {
      err: error,
      requestId,
      traceId,
      method,
      path,
      userId,
      statusCode: 500,
    },
    'Unhandled error',
  );
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred',
    error: 'INTERNAL_ERROR',
    traceId,
    ...(['local', 'dev'].includes(env.NODE_ENV) ? { stack: error.stack } : {}),
  });
}
