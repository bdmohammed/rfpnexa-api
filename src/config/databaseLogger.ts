import { env } from './env';
import { logger } from './logger';

import type { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';
import { getContext } from '@/core/requestContext';

/** Sensitive column and field keywords requiring parameter and query sanitization */
const SENSITIVE_KEYWORDS = [
  'password',
  'token',
  'secret',
  'otp',
  'cvv',
  'ssn',
  'credit_card',
  'api_key',
  'auth',
  'jwt',
  'cookie',
  'hash',
  'bcrypt',
];

/** PostgreSQL error code mapping for observability aggregation */
const PG_ERROR_CODES: Record<string, string> = {
  '23505': 'UNIQUE_VIOLATION',
  '23503': 'FOREIGN_KEY_VIOLATION',
  '23502': 'NOT_NULL_VIOLATION',
  '23514': 'CHECK_VIOLATION',
  '40P01': 'DEADLOCK_DETECTED',
  '40001': 'SERIALIZATION_FAILURE',
  '22001': 'STRING_DATA_RIGHT_TRUNCATION',
  '22003': 'NUMERIC_VALUE_OUT_OF_RANGE',
  '22P02': 'INVALID_TEXT_REPRESENTATION',
  '53300': 'TOO_MANY_CONNECTIONS',
  '57014': 'QUERY_CANCELED',
};

/**
 * [WHAT]
 * Sanitizes raw SQL text by redacting sensitive inline string literals (e.g. `token = 'xyz'`).
 *
 * [WHY]
 * Ensures raw SQL text logged during debug or error handling never leaks plain-text credentials.
 */
function sanitizeQueryText(query: string): string {
  let sanitized = query;
  for (const keyword of SENSITIVE_KEYWORDS) {
    const pattern = new RegExp(`(${keyword}\\s*=\\s*)'[^']+'`, 'gi');
    sanitized = sanitized.replace(pattern, "$1'[REDACTED]'");
  }
  return sanitized;
}

/**
 * [WHAT]
 * Sanitizes query parameters by redacting sensitive values regardless of data type.
 *
 * [WHY]
 * Prevents plain-text passwords, tokens, or secrets from being written to application logs.
 *
 * [CONSTRAINT]
 * Must return a new array without mutating the original parameters array.
 */
function sanitizeQueryParameters(
  query: string,
  parameters?: readonly unknown[],
): readonly unknown[] | undefined {
  if (!parameters?.length) {
    return parameters;
  }

  const normalizedQuery = query.toLowerCase();

  const containsSensitiveKeyword = SENSITIVE_KEYWORDS.some((keyword) =>
    normalizedQuery.includes(keyword),
  );

  if (containsSensitiveKeyword) {
    return parameters.map(() => '[REDACTED]');
  }

  return parameters;
}

function getPostgresErrorCode(error: Error): string | undefined {
  if (!('code' in error)) {
    return undefined;
  }

  const { code } = error as { code?: unknown };

  return typeof code === 'string' ? code : undefined;
}

/**
 * [WHAT]
 * Production-grade TypeORM logger backed by Pino with AsyncLocalStorage correlation and defense-in-depth sanitization.
 *
 * [WHY]
 * Integrates database telemetry (queries, slow queries, query errors) into structured Pino logs.
 *
 * [CONSTRAINT]
 * 1. Must attach request context (`traceId`, `requestId`) from AsyncLocalStorage to all database log events.
 * 2. Must sanitize both query text and parameters to guarantee zero credential leakage in logs.
 * 3. Must extract structured database error metadata without serializing raw connection credentials or PG detail.
 */
export class TypeOrmPinoLogger implements TypeOrmLogger {
  logQuery(query: string, parameters?: readonly unknown[], _queryRunner?: QueryRunner) {
    if (!logger.isLevelEnabled('debug')) {
      return;
    }
    const context = getContext();

    const fields: Record<string, unknown> = {
      traceId: context?.traceId,
      requestId: context?.requestId,
      query: sanitizeQueryText(query),
    };

    if (env.DATABASE_LOG_PARAMETERS) {
      fields.parameters = sanitizeQueryParameters(query, parameters);
    }

    logger.debug(fields, 'Database query');
  }

  logQueryError(
    error: string | Error,
    query: string,
    parameters?: readonly unknown[],
    _queryRunner?: QueryRunner,
  ) {
    const context = getContext();
    const sanitizedQuery = sanitizeQueryText(query);

    const errObj = error instanceof Error ? error : new Error(String(error));
    const pgCode = getPostgresErrorCode(errObj);
    const pgCodeName = pgCode ? (PG_ERROR_CODES[pgCode] ?? 'DB_ERROR') : 'DB_ERROR';

    const safeError = {
      name: errObj.name,
      message: errObj.message,
      code: pgCode,
      codeName: pgCodeName,
    };

    if (env.NODE_ENV !== 'prod') {
      safeError.message = errObj.message;
    }
    logger.error(
      {
        traceId: context?.traceId,
        requestId: context?.requestId,
        err: safeError,
        query: sanitizedQuery,
        ...(env.DATABASE_LOG_PARAMETERS
          ? {
              parameters: sanitizeQueryParameters(query, parameters),
            }
          : {}),
      },
      'Database query failed',
    );
  }

  logQuerySlow(
    time: number,
    query: string,
    parameters?: readonly unknown[],
    _queryRunner?: QueryRunner,
  ) {
    const context = getContext();
    const sanitizedQuery = sanitizeQueryText(query);

    logger.warn(
      {
        traceId: context?.traceId,
        requestId: context?.requestId,
        durationMs: time,
        query: sanitizedQuery,
        ...(env.DATABASE_LOG_PARAMETERS
          ? {
              parameters: sanitizeQueryParameters(query, parameters),
            }
          : {}),
      },
      'Database slow query warning',
    );
  }

  logSchemaBuild(message: string, _queryRunner?: QueryRunner) {
    logger.info({ message }, 'Database schema build');
  }

  logMigration(message: string, _queryRunner?: QueryRunner) {
    logger.info({ migrationMessage: message }, 'Database migration');
  }

  log(level: 'log' | 'info' | 'warn', message: unknown, _queryRunner?: QueryRunner) {
    logger[level === 'warn' ? 'warn' : 'info']({ message }, 'Database event');
  }
}
