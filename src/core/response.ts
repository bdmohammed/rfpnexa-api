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

/**
 * [WHAT]
 * Helper function for sending an HTTP 200 OK JSON response.
 *
 * [WHY]
 * Streamlines successful data delivery across controller actions while keeping consistent JSON formatting.
 *
 * [SIDE EFFECTS]
 * Writes status code 200 and JSON response payload to Express `Response`.
 */
export function sendOk<T = unknown, U = unknown>(
  res: Response,
  data: T,
  message = 'Success',
  meta?: U,
): Response {
  return res.status(200).json(buildSuccessResponse<T, U>(data, message, meta));
}

/**
 * [WHAT]
 * Helper function for sending an HTTP 201 Created JSON response.
 *
 * [WHY]
 * Used upon successful resource creation to return the newly created entity and 201 status code.
 *
 * [SIDE EFFECTS]
 * Writes status code 201 and JSON response payload to Express `Response`.
 */
export function sendCreated<T, U>(
  res: Response,
  data: T,
  message = 'Created successfully',
  meta?: U,
): Response {
  return res.status(201).json(buildSuccessResponse<T, U>(data, message, meta));
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
export function sendNoContent(res: Response): Response {
  return res.status(204).send();
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
