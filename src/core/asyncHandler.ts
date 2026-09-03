import type { NextFunction, Request, RequestHandler, Response } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

/**
 * [WHAT]
 * Type definition for asynchronous Express request handler functions.
 *
 * [WHY]
 * Provides strongly-typed generic signatures for request parameters, bodies, queries, and response types.
 */
type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
  res: Response<ResBody, Locals>,
  next: NextFunction,
) => unknown | Promise<unknown>;

/**
 * [WHAT]
 * Higher-order function wrapper for Express route handlers catching promise rejections and synchronous throws.
 *
 * [WHY]
 * Eliminates repetitive try/catch boilerplate in controllers by routing unhandled errors directly to `next(err)`.
 *
 * [CONSTRAINT]
 * Must forward all thrown or rejected errors to Express `next(error)` for processing by global `errorHandler`.
 *
 * [SIDE EFFECTS]
 * Wraps handler execution in `Promise.resolve().catch(next)` alongside synchronous exception safety.
 *
 * [ERRORS]
 * Forwards any unhandled synchronous or asynchronous error to Express error handling middleware.
 */
export const asyncHandler = <
  P = ParamsDictionary,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = ParsedQs,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  handler: AsyncRequestHandler<P, ResBody, ReqBody, ReqQuery, Locals>,
): RequestHandler<P, ResBody, ReqBody, ReqQuery, Locals> => {
  return (
    req: Request<P, ResBody, ReqBody, ReqQuery, Locals>,
    res: Response<ResBody, Locals>,
    next: NextFunction,
  ) => {
    try {
      Promise.resolve(handler(req, res, next)).catch(next);
    } catch (error) {
      next(error);
    }
  };
};
