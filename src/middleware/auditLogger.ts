// import { randomUUID } from 'node:crypto';

// import type { NextFunction, Request, Response } from 'express';
// import { AppDataSource } from '@/config/database';
// import { logger } from '@/config/logger';
// import { AuditLog } from '@/entities/AuditLog';

// const auditLogRepository = AppDataSource.getRepository(AuditLog);

// // enum AUDIT_ACTIONS {
// //   CREATE = 'create',
// //   UPDATE = 'update',
// //   DELETE = 'delete',
// //   APPROVE = 'approve',
// //   REJECT = 'reject',
// //   PUBLISH = 'publish',
// // }

// interface AuditResponse {
//   data?: unknown;
//   [key: string]: unknown;
// }

// function isRecord(value: unknown): value is Record<string, unknown> {
//   return typeof value === 'object' && value !== null && !Array.isArray(value);
// }

// /**
//  * Builds the immutable audit event from the authenticated request context.
//  *
//  * Audit records must contain enough information to answer:
//  *
//  *   WHO    → actorId / actorEmail
//  *   WHAT   → action
//  *   WHERE  → module / entityId
//  *   WHEN   → database createdAt
//  *   TRACE  → requestId / traceId
//  *   FROM   → IP address / user agent
//  *   CHANGE → before / after
//  */
// function buildAuditLogPayload(
//   req: Request,
//   res: Response,
//   action: string,
//   module: string,
//   responseBody: Record<string, unknown>,
// ): Partial<AuditLog> {
//   const { user } = req;

//   if (!user) {
//     throw new Error('Audit logging requires an authenticated user');
//   }

//   const rawEntityId = req.params['id'];

//   const entityId = Array.isArray(rawEntityId) ? (rawEntityId[0] ?? null) : (rawEntityId ?? null);

//   return {
//     eventId: randomUUID(),

//     actorId: user.userId,
//     actorUserId: user.userId,
//     actorEmail: user.email,

//     action,
//     module,

//     entityId,

//     before: res.locals['auditBefore'] ?? null,
//     after: isRecord(responseBody.data) ? responseBody.data : null,

//     requestId: req.requestId ?? null,
//     traceId: req.traceId ?? null,

//     endpoint: req.path,
//     userAgent: req.get('user-agent') ?? null,
//     ipAddress: req.ip ?? null,
//   };
// }

// /**
//  * Logs security-sensitive administrative actions.
//  *
//  * The middleware captures the final successful response and creates an
//  * immutable audit event containing:
//  *
//  * - authenticated actor
//  * - action
//  * - module/entity
//  * - before/after state
//  * - request/trace correlation
//  * - client metadata
//  *
//  * IMPORTANT:
//  * Audit logging is intentionally performed after the response has been
//  * generated. The audit failure is logged but must not modify the already
//  * completed HTTP response.
//  *
//  * Example:
//  *
//  * router.patch(
//  *   '/:id',
//  *   authenticate,
//  *   requirePermission(PermissionKey.EDIT_TENDER),
//  *   captureAuditBefore,
//  *   auditLogger(AUDIT_ACTIONS.UPDATE, 'tender'),
//  *   tenderController.update,
//  * );
//  */
// export const auditLogger =
//   (action: string, module: string) =>
//   (req: Request, res: Response, next: NextFunction): void => {
//     const originalJson = res.json.bind(res);

//     res.json = ((responseBody: AuditResponse) => {
//       const { statusCode } = res;

//       const result = originalJson(responseBody);

//       // Audit only successful state-changing operations.
//       if (statusCode >= 200 && statusCode < 300) {
//         const payload = buildAuditLogPayload(req, res, action, module, responseBody);

//         setImmediate(() => {
//           void auditLogRepository.save(payload).catch((error: unknown) => {
//             // Never expose audit persistence failures to the client.
//             // But NEVER silently discard them either.
//             logger.error(
//               {
//                 err: error,
//                 eventId: payload.eventId,
//                 action: payload.action,
//                 module: payload.module,
//                 entityId: payload.entityId,
//                 requestId: payload.requestId,
//                 traceId: payload.traceId,
//               },
//               'Failed to persist audit log',
//             );
//           });
//         });
//       }

//       return result;
//     }) as Response['json'];

//     next();
//   };
