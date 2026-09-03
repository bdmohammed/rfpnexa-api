import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped distributed tracing context.
 *
 *
 * RFPNexa Tender
 * │
 * ├── traceId
 * │   └── "Which complete tender operation?"
 * │
 * ├── requestId
 * │   └── "Which HTTP request?"
 * │
 * ├── parentId
 * │   └── "Which operation called me?"
 * │
 * ├── spanId
 * │   └── "Which operation am I?"
 * │
 * └── traceFlags
 *  └── "Should this trace be sampled?"
 *
 * Scenario:
 *
 * A buyer publishes a tender on RFPNexa:
 *
 *   Buyer
 *     │
 *     │ POST /api/v1/tenders
 *     ▼
 *   RFPNexa API
 *     │
 *     ├── PostgreSQL
 *     │
 *     ├── Notification Service
 *     │
 *     └── Email Service
 *
 * One business operation can therefore involve multiple internal operations.
 *
 *
 * 1. TRACE ID
 * ----------------------------------------------------------------------------
 *
 * `traceId` identifies the complete tender-publishing journey.
 *
 * Example:
 *
 *   traceId = "4bf92f3577b34da6a3ce929d0e0e4736"
 *
 * The same traceId can be used by:
 *
 *   POST /tenders
 *        │
 *        ├── TenderService.create()
 *        ├── PostgreSQL INSERT
 *        ├── NotificationService.publish()
 *        └── EmailService.send()
 *
 * WHY:
 *   Searching logs by this traceId should show the complete operation.
 *
 * USE WHEN:
 *   - Debugging a tender creation failure
 *   - Investigating why notifications were not sent
 *   - Following a request across services
 *   - Correlating application and database logs
 *
 *
 * 2. REQUEST ID
 * ----------------------------------------------------------------------------
 *
 * `requestId` identifies the specific HTTP request handled by RFPNexa.
 *
 * Example:
 *
 *   requestId = "550e8400-e29b-41d4-a716-446655440000"
 *
 * If the buyer sends:
 *
 *   POST /api/v1/tenders
 *
 * that HTTP request receives one requestId.
 *
 * If the same buyer sends another request:
 *
 *   POST /api/v1/tenders/:id/publish
 *
 * it receives a different requestId.
 *
 * WHY:
 *   A single trace can contain multiple HTTP requests, while a requestId
 *   identifies one specific HTTP request.
 *
 * USE WHEN:
 *   - Debugging a particular API request
 *   - Returning a correlation ID to support/debugging tools
 *   - Searching application logs for one HTTP request
 *
 *
 * 3. PARENT ID
 * ----------------------------------------------------------------------------
 *
 * `parentId` identifies the operation that initiated the current operation.
 *
 * Example:
 *
 *   Buyer Request
 *       │
 *       │ spanId = "aaa111"
 *       ▼
 *   RFPNexa Tender API
 *       │
 *       │ parentId = "aaa111"
 *       ▼
 *   Notification Service
 *
 * The Notification Service knows that its operation was triggered by the
 * Tender API operation.
 *
 * WHY:
 *   Allows tracing systems to reconstruct the parent → child relationship.
 *
 * USE WHEN:
 *   - Continuing a W3C distributed trace
 *   - Calling another RFPNexa service
 *   - Reconstructing distributed operation hierarchy
 *
 * NOTE:
 *   For a request that starts a completely new trace, parentId is undefined.
 *
 *
 * 4. SPAN ID
 * ----------------------------------------------------------------------------
 *
 * `spanId` identifies the current operation within the trace.
 *
 * Example:
 *
 *   traceId = "TRACE-123"
 *
 *   Tender API
 *       spanId = "SPAN-001"
 *
 *       ├── PostgreSQL INSERT
 *       │     spanId = "SPAN-002"
 *       │
 *       ├── Notification Service
 *       │     spanId = "SPAN-003"
 *       │
 *       └── Email Service
 *             spanId = "SPAN-004"
 *
 * All operations belong to the same trace, but each operation has its own
 * spanId.
 *
 * WHY:
 *   Allows individual operations inside a distributed trace to be identified.
 *
 * USE WHEN:
 *   - Implementing distributed tracing
 *   - Using OpenTelemetry
 *   - Measuring individual operation duration
 *   - Identifying which internal operation failed
 *
 * IMPORTANT:
 *   If RFPNexa only uses request/trace correlation and does not implement
 *   span-based tracing, spanId may not be required at the application level.
 *
 *
 * 5. TRACE FLAGS
 * ----------------------------------------------------------------------------
 *
 * `traceFlags` contains W3C Trace Context flags.
 *
 * Common values:
 *
 *   "01" → trace is sampled
 *   "00" → trace is not sampled
 *
 * Example:
 *
 *   traceFlags = "01"
 *
 * WHY:
 *   Allows tracing infrastructure to decide whether the trace should be
 *   recorded/sampled.
 *
 * USE WHEN:
 *   - Propagating W3C traceparent
 *   - Integrating OpenTelemetry
 *   - Controlling distributed trace sampling
 *
 *
 * ============================================================================
 * COMPLETE RFPNEXA EXAMPLE
 * ============================================================================
 *
 * Buyer publishes a tender:
 *
 *   POST /api/v1/tenders
 *
 * Incoming:
 *
 *   traceparent:
 *   00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
 *
 * RFPNexa creates:
 *
 *   {
 *     traceId:    "4bf92f3577b34da6a3ce929d0e0e4736",
 *     requestId:  "550e8400-e29b-41d4-a716-446655440000",
 *     parentId:   "00f067aa0ba902b7",
 *     spanId:     "a1b2c3d4e5f60708",
 *     traceFlags: "01"
 *   }
 *
 *
 * LOG FLOW
 * ----------------------------------------------------------------------------
 *
 * API:
 *
 *   {
 *     "traceId": "4bf92f...",
 *     "requestId": "550e8400...",
 *     "spanId": "a1b2c3d4...",
 *     "message": "Creating tender"
 *   }
 *
 * Database:
 *
 *   {
 *     "traceId": "4bf92f...",
 *     "requestId": "550e8400...",
 *     "message": "Database query"
 *   }
 *
 * Notification:
 *
 *   {
 *     "traceId": "4bf92f...",
 *     "message": "Tender notification published"
 *   }
 *
 * Email:
 *
 *   {
 *     "traceId": "4bf92f...",
 *     "message": "Tender notification email queued"
 *   }
 *
 *
 * RESULT
 * ----------------------------------------------------------------------------
 *
 * Searching:
 *
 *   traceId = "4bf92f..."
 *
 * allows an engineer to reconstruct the complete RFPNexa tender operation:
 *
 *   Buyer
 *      ↓
 *   Tender API
 *      ↓
 *   PostgreSQL
 *      ↓
 *   Notification
 *      ↓
 *   Email
 *
 * This is the primary reason request tracing exists.
 *
 * ============================================================================
 *
 * SECURITY
 * ============================================================================
 *
 * These fields are correlation metadata only.
 *
 * NEVER store:
 *
 *   - Passwords
 *   - JWTs
 *   - Access tokens
 *   - Refresh tokens
 *   - API keys
 *   - Session secrets
 *   - Payment credentials
 *   - Tender confidential data
 *
 * inside traceId, requestId, parentId, spanId, or traceFlags.
 */

export interface RequestContext {
  traceId: string;
  requestId: string;
  userId?: string;
  parentId?: string | undefined;
  spanId?: string;
  traceFlags?: string;
}

const asyncLocalStorage = new AsyncLocalStorage<RequestContext>();

/**
 * [WHAT]
 * Runs a function within an AsyncLocalStorage request context scope.
 *
 * [WHY]
 * Binds context lifecycle to the duration of the callback execution.
 *
 * [SIDE EFFECTS]
 * Attaches the context store to the current asynchronous execution chain.
 */
export function runWithContext<T>(context: RequestContext, callback: () => T): T {
  return asyncLocalStorage.run(context, callback);
}

/**
 * [WHAT]
 * Retrieves the current request context store.
 *
 * [WHY]
 * Allows loggers, error handlers, and services to access trace and user context.
 */
export function getContext(): RequestContext | undefined {
  return asyncLocalStorage.getStore();
}

/**
 * [WHAT]
 * Retrieves the current request trace ID.
 *
 * [WHY]
 * Enables correlation of logs and responses with the incoming request trace.
 */
export function getTraceId(): string | undefined {
  return getContext()?.traceId;
}

/**
 * [WHAT]
 * Attaches or updates the authenticated user ID in the current request context.
 *
 * [WHY]
 * Allows logging and auditing utilities to attribute actions once auth middleware completes.
 *
 * [SIDE EFFECTS]
 * Mutates the active AsyncLocalStorage store object for the current request.
 */
export function setUserId(userId: string): void {
  const context = getContext();

  if (context) {
    context.userId = userId;
  }
}

/**
 * [WHAT]
 * Retrieves the authenticated user ID from the active request context.
 */
export function getUserId(): string | undefined {
  return getContext()?.userId;
}

/**
 * [WHAT]
 * Retrieves the active request context, throwing an error if uninitialized.
 *
 * [ERRORS]
 * Throws Error if invoked outside an active request context scope.
 */
export function requireContext(): RequestContext {
  const context = getContext();

  if (!context) {
    throw new Error('Request context is not initialized');
  }

  return context;
}
