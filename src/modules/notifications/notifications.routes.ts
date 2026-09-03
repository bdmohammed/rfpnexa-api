import { Router } from 'express';

import * as controller from './notifications.controller';
import {
  ExecuteActionParamsSchema,
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
 * components:
 *   schemas:
 *     NotificationItem:
 *       type: object
 *       required: [id, recipientId, status, createdAt, title, message, category, severity]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "b2c3d4e5-f6a7-8901-bcde-f12345678901"
 *         recipientId:
 *           type: string
 *           format: uuid
 *           example: "c7b395e8-5b4d-4952-b88a-36fb2e46b9a1"
 *         status:
 *           type: string
 *           enum: [UNREAD, READ, ARCHIVED, DISMISSED]
 *           example: "UNREAD"
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: "2026-07-22T20:37:30Z"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2026-07-22T20:30:00Z"
 *         title:
 *           type: string
 *           example: "Tender Bid Submitted"
 *         message:
 *           type: string
 *           example: "Your proposal for Tender #9876 has been recorded successfully."
 *         category:
 *           type: string
 *           example: "Tenders"
 *         severity:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *           example: "MEDIUM"
 *         entityType:
 *           type: string
 *           nullable: true
 *           example: "tender"
 *         entityId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         metadata:
 *           type: object
 *           nullable: true
 *         actions:
 *           type: array
 *           items:
 *             type: object
 *
 *     NotificationPreferences:
 *       type: object
 *       required: [email, inApp]
 *       properties:
 *         email:
 *           type: object
 *           additionalProperties:
 *             type: boolean
 *           example: { review: true, security: true, system: false }
 *         inApp:
 *           type: object
 *           additionalProperties:
 *             type: boolean
 *           example: { review: true, security: true, system: true }
 */

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
// router.get('/', validate(GetNotificationsQuerySchema, 'query'), controller.getNotifications);

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
 *                         unreadCount: { type: integer, example: 5 }
 *                         totalCount: { type: integer, example: 120 }
 */
router.get('/statistics', controller.getStatistics);

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

/**
 * @swagger
 * /api/v1/notifications/stream:
 *   get:
 *     summary: Initialize real-time notification stream (SSE)
 *     description: Establishes a Server-Sent Events (SSE) stream to receive live notification events.
 *     operationId: initializeNotificationStream
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: SSE connection established
 *         headers:
 *           Content-Type:
 *             schema: { type: string, example: "text/event-stream" }
 *           Cache-Control:
 *             schema: { type: string, example: "no-cache" }
 *           Connection:
 *             schema: { type: string, example: "keep-alive" }
 */
router.get('/stream', controller.initializeNotificationStream);

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
router.patch('/read-all', controller.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     description: Sets the status of a specific notification to read.
 *     operationId: markAsRead
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Notification updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch('/:id/read', validate(NotificationIdParamSchema, 'params'), controller.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}/archive:
 *   patch:
 *     summary: Archive a notification
 *     description: Sets a notification as archived, hiding it from the default list.
 *     operationId: archiveNotification
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Notification archived
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch(
  '/:id/archive',
  validate(NotificationIdParamSchema, 'params'),
  controller.archiveNotification,
);

/**
 * @swagger
 * /api/v1/notifications/{id}/dismiss:
 *   patch:
 *     summary: Dismiss/Delete a notification
 *     description: Deletes a specific notification record.
 *     operationId: dismissNotification
 *     tags: [Notifications]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Notification dismissed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.patch(
  '/:id/dismiss',
  validate(NotificationIdParamSchema, 'params'),
  controller.dismissNotification,
);

/**
 * @swagger
 * /api/v1/notifications/{id}/actions/{actionId}/execute:
 *   post:
 *     summary: Execute an action trigger on a notification
 *     description: Performs a user response action attached to an interactive notification (e.g. accepting invitation, approving draft).
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
 *       200:
 *         description: Action executed successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.post(
  '/:id/actions/:actionId/execute',
  validate(ExecuteActionParamsSchema, 'params'),
  controller.executeAction,
);

export { router as notificationsRouter };
