import { getTraceId } from './requestContext';

import type { ApiResponse, PaginationMeta } from '@/types/types';
import type { Response } from 'express';

/**
 * [WHAT]
 * Internal helper that constructs a standardized success response object, attaching current trace context.
 *
 * [WHY]
 * Centralizes response payload composition and automatically binds request correlation trace IDs.
 *
 * [SIDE EFFECTS]
 * Reads active request context via `getTraceId()`.
 */
function buildSuccessResponse<T, U>(data: T, message: string, meta?: U): ApiResponse<T, U> {
  const response: ApiResponse<T, U> = {
    success: true,
    message,
    data,
    traceId: getTraceId(),
  };

  if (meta !== undefined) {
    response.meta = meta;
  }

  return response;
}

export type TypedResponse<
  TData = unknown,
  TMeta = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
> = Response<ApiResponse<TData, TMeta>, Locals>;

export type NoContentResponse<Locals extends Record<string, unknown> = Record<string, unknown>> =
  Response<void, Locals>;

/**
 * [WHAT]
 * Helper function for sending an HTTP 200 OK JSON response.
 *
 * [WHY]
 * Streamlines successful data delivery across controller actions while keeping consistent JSON formatting
 * and providing 100% generic inference from service return types to response bodies.
 *
 * [SIDE EFFECTS]
 * Writes status code 200 and JSON response payload to Express `Response`.
 */
export function sendOk<
  TData,
  TMeta = never,
  // ResBody = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  res: Response<ApiResponse<TData, TMeta>, Locals>,
  data: TData,
  message = 'Success',
  meta?: TMeta,
): Response<ApiResponse<TData, TMeta>, Locals> {
  return res.status(200).json(buildSuccessResponse<TData, TMeta>(data, message, meta));
}

/**
 * [WHAT]
 * Helper function for sending an HTTP 201 Created JSON response.
 *
 * [WHY]
 * Used upon successful resource creation to return the newly created entity
 * and 201 status code with full type inference.
 *
 * [SIDE EFFECTS]
 * Writes status code 201 and JSON response payload to Express `Response`.
 */
export function sendCreated<
  TData = unknown,
  TMeta = unknown,
  // ResBody = unknown,
  Locals extends Record<string, unknown> = Record<string, unknown>,
>(
  res: Response<ApiResponse<TData, TMeta>, Locals>,
  data: TData,
  message = 'Created successfully',
  meta?: TMeta,
): Response<ApiResponse<TData, TMeta>, Locals> {
  return res.status(201).json(buildSuccessResponse<TData, TMeta>(data, message, meta));
}

/**
 * [WHAT]
 * Helper function for sending an HTTP 204 No Content response.
 *
 * [WHY]
 * Returns HTTP 204 status without a body for successful operations producing no content (e.g. DELETE).
 *
 * [SIDE EFFECTS]
 * Sends an empty HTTP 204 response on Express `Response`.
 */
export function sendNoContent<Locals extends Record<string, unknown> = Record<string, unknown>>(
  res: Response<unknown, Locals>,
): void {
  res.status(204).send();
}

/**
 * [WHAT]
 * Helper function that calculates pagination metadata for list responses.
 *
 * [WHY]
 * Computes total pages and prev/next page flags from raw total counts, page numbers, and limits.
 */
export function paginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNextPage: page * limit < total,
    hasPrevPage: page > 1,
  };
}
