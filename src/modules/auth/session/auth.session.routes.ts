// import { Router } from 'express';

// import { IdParamSchema } from '../auth.dto';

// import * as sessionController from './auth.session.controller';

// import { authenticate } from '@/middleware/authenticate';
// import { validate } from '@/middleware/validate';

// const router = Router();

// /**
//  * @swagger
//  * /api/v1/auth/sessions:
//  *   get:
//  *     summary: Get all active sessions
//  *     description: Returns a list of all active non-expired sessions for the current user.
//  *     operationId: getSessions
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Active sessions returned
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         $ref: '#/components/schemas/SessionItem'
//  *             example:
//  *               success: true
//  *               message: "Success"
//  *               data:
//  *                 - id: "session-uuid-1"
//  *                   browser: "Chrome"
//  *                   browserVersion: "128"
//  *                   os: "Windows"
//  *                   device: "desktop"
//  *                   ipAddress: "192.168.1.1"
//  *                   isCurrent: true
//  *                   createdAt: "2026-07-01T12:00:00.000Z"
//  *                   lastUsedAt: "2026-07-01T12:05:00.000Z"
//  *                   expiresAt: "2026-07-08T12:00:00.000Z"
//  *                 - id: "session-uuid-2"
//  *                   browser: "Safari"
//  *                   browserVersion: "17"
//  *                   os: "iOS"
//  *                   device: "mobile"
//  *                   ipAddress: "172.56.21.89"
//  *                   isCurrent: false
//  *                   createdAt: "2026-07-02T15:30:00.000Z"
//  *                   lastUsedAt: "2026-07-02T15:30:00.000Z"
//  *                   expiresAt: "2026-07-09T15:30:00.000Z"
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get('/sessions', authenticate, sessionController.getSessions);

// /**
//  * @swagger
//  * /api/v1/auth/sessions/{id}:
//  *   delete:
//  *     summary: Revoke a specific session
//  *     description: Revokes an active user session by session ID.
//  *     operationId: revokeSession
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     responses:
//  *       200:
//  *         description: Session revoked successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "Session revoked successfully"
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.delete(
//   '/sessions/:id',
//   authenticate,
//   validate(IdParamSchema, 'params'),
//   sessionController.revokeSession,
// );

// /**
//  * @swagger
//  * /api/v1/auth/sessions:
//  *   delete:
//  *     summary: Revoke all active sessions
//  *     description: Invalidates all active sessions for the user and logs out the caller.
//  *     operationId: revokeAllSessions
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     responses:
//  *       200:
//  *         description: All sessions revoked
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "All sessions revoked successfully"
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.delete('/sessions', authenticate, sessionController.revokeAllSessions);

// /**
//  * @swagger
//  * /api/v1/auth/devices:
//  *   get:
//  *     summary: Get recognized devices
//  *     description: Lists all recognized user devices and their trust statuses.
//  *     operationId: getDevices
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: List of recognized devices
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         $ref: '#/components/schemas/DeviceItem'
//  *             example:
//  *               success: true
//  *               message: "Success"
//  *               data:
//  *                 - id: "device-uuid-1"
//  *                   browser: "Chrome"
//  *                   browserVersion: "128"
//  *                   os: "Windows"
//  *                   osVersion: "10"
//  *                   device: "desktop"
//  *                   ipAddress: "192.168.1.xxx"
//  *                   isTrusted: true
//  *                   isCurrent: true
//  *                   lastSeenAt: "2026-07-07T12:00:00.000Z"
//  *                   createdAt: "2026-07-01T12:00:00.000Z"
//  *                 - id: "device-uuid-2"
//  *                   browser: "Safari"
//  *                   browserVersion: "17"
//  *                   os: "iOS"
//  *                   osVersion: "17.4"
//  *                   device: "mobile"
//  *                   ipAddress: "172.56.21.xxx"
//  *                   isTrusted: false
//  *                   isCurrent: false
//  *                   lastSeenAt: "2026-07-05T15:30:00.000Z"
//  *                   createdAt: "2026-07-02T10:00:00.000Z"
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get('/devices', authenticate, sessionController.getDevices);

// /**
//  * @swagger
//  * /api/v1/auth/devices/{id}/trust:
//  *   post:
//  *     summary: Trust a recognized device
//  *     description: Marks a recognized device as trusted to skip additional verification checks.
//  *     operationId: trustDevice
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     responses:
//  *       200:
//  *         description: Device trusted successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "Device marked as trusted."
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.post(
//   '/devices/:id/trust',
//   authenticate,
//   validate(IdParamSchema, 'params'),
//   sessionController.trustDevice,
// );

// /**
//  * @swagger
//  * /api/v1/auth/devices/{id}:
//  *   delete:
//  *     summary: Revoke a recognized device
//  *     description: Deletes/revokes a recognized device, causing sessions on it to invalidate.
//  *     operationId: revokeDevice
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     responses:
//  *       200:
//  *         description: Device revoked successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "Device revoked successfully."
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       404:
//  *         $ref: '#/components/responses/NotFound'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.delete(
//   '/devices/:id',
//   authenticate,
//   validate(IdParamSchema, 'params'),
//   sessionController.revokeDevice,
// );

// export { router as sessionAuthRoutes };
