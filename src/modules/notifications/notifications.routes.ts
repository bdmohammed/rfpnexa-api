import { Router } from 'express';

import * as controller from './notifications.controller';
import {
  ExecuteActionParamsSchema,
  GetNotificationsQuerySchema,
  NotificationIdParamSchema,
  UpdatePreferencesBodySchema,
} from './notifications.dto';

import { authenticate } from '@/middleware/authenticate';
import { loadPermissions } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';

const router = Router();

// Guard all notification routes with authentication and user permission resolving
router.use(authenticate);
router.use(loadPermissions);

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: List notifications for current user
 *     description: Returns a list of notifications for the authenticated user.
 *     operationId: getNotifications
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notifications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/NotificationItem'
 */
router.get('/', validate(GetNotificationsQuerySchema, 'query'), controller.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/statistics:
 *   get:
 *     summary: Get user notifications statistics
 *     description: Returns aggregate counts of unread and read notifications.
 *     operationId: getNotificationsStats
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Notification statistics resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         unread: { type: integer, example: 1 }
 *                         critical: { type: integer, example: 2 }
 *                         warning: { type: integer, example: 3 }
 *                         info: { type: integer, example: 4 }
 *                         total: { type: integer, example: 100 }
 */
router.get('/statistics', controller.getNotificationsStats);

/**
 * @swagger
 * /api/v1/notifications/categories:
 *   get:
 *     summary: List notification categories
 *     description: Returns a list of supported notification categories (e.g. Tenders, Payments, System).
 *     operationId: getNotificationCategories
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of categories resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                        items:
 *                          type: object
 *                          required:
 *                            - key
 *                            - label
 *                          properties:
 *                            key:
 *                              type: string
 *                              enum:
 *                                - SYSTEM
 *                                - TENDER
 *                                - BILLING
 *                                - SECURITY
 *                                - WORKSPACE
 *                                - REVIEW
 *                                - ROLE
 *                              example: TENDER
 *                            label:
 *                              type: string
 *                              example: Tenders & Bidding
 */
router.get('/categories', controller.getCategories);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   get:
 *     summary: Get notification preferences
 *     description: Retrieves the current user's email, push, and SMS channels settings.
 *     operationId: getNotificationPreferences
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Preferences settings resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreferences'
 *
 *   patch:
 *     summary: Update notification preferences
 *     description: Modifies email, push, and SMS channels settings.
 *     operationId: updateNotificationPreferences
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NotificationPreferences'
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/NotificationPreferences'
 */
router.get('/preferences', controller.getPreferences);
router.patch(
  '/preferences',
  validate(UpdatePreferencesBodySchema, 'body'),
  controller.updatePreferences,
);

// /**
//  * @swagger
//  * /api/v1/notifications/stream:
//  *   get:
//  *     summary: Initialize real-time notification stream (SSE)
//  *     description: Establishes a Server-Sent Events (SSE) stream to receive live notification events.
//  *     operationId: initializeNotificationStream
//  *     tags: [Notifications]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: SSE connection established
//  *         headers:
//  *           Content-Type:
//  *             schema: { type: string, example: "text/event-stream" }
//  *           Cache-Control:
//  *             schema: { type: string, example: "no-cache, no-transform" }
//  *           Connection:
//  *             schema: { type: string, example: "keep-alive" }
//  *           X-Accel-Buffering:
//  *             schema: { type: string, example: "no" }
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get('/stream', controller.streamAppNotifications);

// /**
//  * @swagger
//  * /api/v1/notifications/stream/status:
//  *   get:
//  *     summary: Get dashboard real-time stream operational status and telemetry
//  *     description: |
//  *       Returns current SSE metrics: active connection counts, polling health,
//  *       average poll durations, and last broadcast timestamps.
//  *       **Required Permission:** `system.view`
//  *     operationId: getStreamStatus
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Real-time stream telemetry resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get('/stream/status', controller.getStreamAppNotificationsStatus);

/**
 * @swagger
 * /api/v1/notifications/read-all:
 *   patch:
 *     summary: Mark all notifications as read
 *     description: Updates all unread notifications of the user to read status.
 *     operationId: markAllAsRead
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch('/read-all', controller.markAllNotificationAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Marks the specified notification as read for the authenticated
 *     user by updating its status and read timestamp.
 *     operationId: markNotificationAsRead
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       204:
 *         description: Notification marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/read',
  validate(NotificationIdParamSchema, 'params'),
  controller.markNotificationAsRead,
);

/**
 * @swagger
 * /api/v1/notifications/{id}/archive:
 *   patch:
 *     summary: Archive a notification
 *     description: Sets a notification as archived, hiding it from the default list.
 *     operationId: markNotificationAsArchive
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       204:
 *         description: Notification marked as archive successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/archive',
  validate(NotificationIdParamSchema, 'params'),
  controller.markNotificationAsArchive,
);

/**
 * @swagger
 * /api/v1/notifications/{id}/dismiss:
 *   patch:
 *     summary: Dismiss/Delete a notification
 *     description: Deletes a specific notification record.
 *     operationId: markNotificationAsDismiss
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       204:
 *         description: Notification marked as dismiss successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.patch(
  '/:id/dismiss',
  validate(NotificationIdParamSchema, 'params'),
  controller.markNotificationAsDismiss,
);

/**
 * @swagger
 * /api/v1/notifications/{id}/actions/{actionId}/execute:
 *   post:
 *     summary: Execute an action trigger on a notification
 *     description: Performs a user response action attached to an interactive notification
 *     (e.g. accepting invitation, approving draft).
 *     operationId: executeNotificationAction
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: actionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *         description: Unique action trigger identifier
 *     responses:
 *       204:
 *         description: Action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/:id/actions/:actionId/execute',
  validate(ExecuteActionParamsSchema, 'params'),
  controller.executeNotificationAction,
);

export { router as notificationsRouter };
