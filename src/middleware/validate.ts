import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';
import type { ZodType } from 'zod';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';

export type Target = 'body' | 'query' | 'params';

/**
 * [WHAT]
 * Express request validation middleware factory that validates request data
 * (`req.body`, `req.query`, or `req.params`) against a Zod schema.
 *
 * [WHY]
 * Ensures input payloads strictly conform to system contracts before reaching controllers,
 * preventing unvalidated or malformed data processing.
 *
 * [CONSTRAINT]
 * 1. Must replace `req[target]` with Zod's `result.data` output, ensuring defaults,
 * transformations, and field stripping are preserved.
 * 2. On failure, passes a 422 Unprocessable Entity `AppError` populated with field error details to `next()`.
 * 3. Unknown fields are stripped by default unless the Zod schema explicitly uses `.passthrough()` or `.strict()`.
 *
 * [SIDE EFFECTS]
 * Replaces `req.body`, `req.query`, or `req.params` with the parsed and cleansed Zod output.
 *
 * [ERRORS]
 * Forwards an `AppError` with status 422 (`UNPROCESSABLE_ENTITY`), code `VALIDATION_ERROR`,
 * and flattened field error metadata when validation fails.
 */
export function validate<T>(
  schema: ZodType<T>,
  target: 'body',
): RequestHandler<ParamsDictionary, unknown, T, ParsedQs>;
export function validate<T>(
  schema: ZodType<T>,
  target: 'query',
): RequestHandler<ParamsDictionary, unknown, unknown, T>;
export function validate<T extends ParamsDictionary>(
  schema: ZodType<T>,
  target: 'params',
): RequestHandler<T>;
export function validate(schema: ZodType<unknown>, target: Target = 'body'): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const errors = result.error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));

      return next(
        new AppError(
          AppErrorMessage.VALIDATION_FAILED,
          HttpStatusCode.UNPROCESSABLE_ENTITY,
          AppErrorCode.VALIDATION_ERROR,
          errors,
        ),
      );
    }

    try {
      (req as Record<Target, unknown>)[target] = result.data;
    } catch {
      Object.defineProperty(req, target, {
        value: result.data,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
    next();
  };
}
