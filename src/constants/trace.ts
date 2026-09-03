/**
 * [WHAT]
 * Configuration constants for request tracing, correlation IDs, and W3C traceparent headers.
 *
 * [WHY]
 * Centralizes header keys, default values, and strict security validation patterns for distributed tracing.
 *
 * [CONSTRAINT]
 * W3C traceparent pattern must adhere to the W3C Trace Context specification (`version-traceId-parentId-traceFlags`).
 */

/** Header keys for tracing and request correlation */
export const TRACE_HEADERS = {
  TRACE_ID: 'x-trace-id',
  REQUEST_ID: 'x-request-id',
  TRACEPARENT: 'traceparent',
} as const;

/** Strict validation regex patterns and invalid values for trace IDs */
export const TRACE_PATTERNS = {
  /** 32-character hexadecimal string (W3C standard trace ID format) */
  STRICT_HEX_32: /^[0-9a-fA-F]{32}$/,
  /** Standard UUID v4 format */
  UUID_V4: /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89ab][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/i,
  /** All-zero 32-hex trace ID (invalid per W3C specification) */
  INVALID_ZERO_TRACE_32: '00000000000000000000000000000000',
  /** All-zero UUID (invalid per W3C specification) */
  INVALID_ZERO_UUID: '00000000-0000-0000-0000-000000000000',
  /** W3C Traceparent format: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01 */
  TRACEPARENT: /^([0-9a-fA-F]{2})-([0-9a-fA-F]{32})-([0-9a-fA-F]{16})-([0-9a-fA-F]{2})$/,
  W3C_VERSION: '00',
  ZERO_PARENT_ID: '0000000000000000',
} as const;
