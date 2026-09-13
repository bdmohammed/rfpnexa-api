import { Router } from 'express';

import * as controller from './dashboard.controller';
import { PatchLayoutSchema, updateDashboardThemeSchema } from './dashboard.dto';

import { DashboardPermissions, SystemPermissions } from '@/constants/permissions';
import { authenticate } from '@/middleware/authenticate';
import { loadPermissions, requirePermission } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';

const router = Router();

// Guard all dashboard routes with authentication & permission loading
router.use(authenticate);
router.use(loadPermissions);

/**
 * @swagger
 * /api/v1/dashboard/config:
 *   get:
 *     summary: Get dashboard layout configuration
 *     description: |
 *       Returns the authenticated admin's dashboard configuration.
 *
 *       The response includes:
 *       - Authorized dashboard widgets
 *       - Widget layout (position, size, collapsed state)
 *       - Dashboard theme
 *
 *       If the admin does not yet have a saved layout, a default layout
 *       is created automatically.
 *
 *       **Required Permission:** `dashboard.view`
 *     operationId: getDashboardConfig
 *     tags:
 *       - Dashboard
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard configuration retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardConfig'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get('/config', requirePermission(DashboardPermissions.VIEW.key), controller.getConfig);

/**
 * @swagger
 * /api/v1/dashboard/layout:
 *   patch:
 *     summary: Update dashboard layout order/widgets configuration
 *     description: |
 *       Updates the authenticated user's dashboard layout.
 *
 *       Only widget layout information is updated:
 *       - Position
 *       - Size
 *       - Collapsed state
 *
 *       Widget permissions, titles and metadata cannot be modified.
 *
 *       **Required Permission:** `dashboard.view`
 *     operationId: updateDashboardLayout
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDashboardLayoutRequest'
 *     responses:
 *       200:
 *         description: Dashboard layout updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardLayout'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch(
  '/layout',
  requirePermission(DashboardPermissions.VIEW.key),
  validate(PatchLayoutSchema, 'body'),
  controller.updateLayout,
);

/**
 * @swagger
 * /api/v1/dashboard/theme:
 *   patch:
 *     summary: Update dashboard theme
 *     description: |
 *       Updates the authenticated user's preferred dashboard theme.
 *
 *       **Required Permission:** `dashboard.view`
 *     operationId: updateDashboardTheme
 *     tags:
 *       - Dashboard
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDashboardThemeRequest'
 *     responses:
 *       200:
 *         description: Dashboard theme updated successfully.
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
 *                         theme:
 *                           $ref: '#/components/schemas/DashboardTheme'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.patch(
  '/theme',
  requirePermission(DashboardPermissions.VIEW.key),
  validate(updateDashboardThemeSchema, 'body'),
  controller.updateTheme,
);

/**
 * @swagger
 * /api/v1/dashboard/reset:
 *   post:
 *     summary: Reset dashboard layout to system default (alias)
 *     description: |
 *       Resets the authenticated user's dashboard layout and theme
 *       to the system defaults.
 *
 *       The default layout is generated based on the user's
 *       permissions and available widgets.
 *
 *       **Required Permission:** `dashboard.view`
 *     operationId: resetDashboardLayout
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Dashboard reset successfully.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/DashboardConfig'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/layout/reset',
  requirePermission(DashboardPermissions.VIEW.key),
  controller.resetLayout,
);

/**
 * @swagger
 * /api/v1/dashboard/stream:
 *   get:
 *     summary: Stream dashboard updates (SSE)
 *     description: |
 *       Initializes a Server-Sent Events (SSE) stream for real-time dashboard data updates (counters, logs, alerts).
 *
 *       **State Resynchronization vs. Event Replay:**
 *       This endpoint implements state snapshot resynchronization rather than historical event replay.
 *       Reconnecting clients that pass a `Last-Event-ID` header (or `?lastEventId=` query parameter)
 *       receive the latest server state snapshot if newer than the provided event timestamp, rather
 *       than an incremental replay of individual missed intermediate events.
 *
 *       **Required Permission:** `dashboard.view`
 *     operationId: streamDashboardUpdates
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: header
 *         name: Last-Event-ID
 *         schema:
 *           type: string
 *         description: Last received event identifier for state resynchronization.
 *       - in: query
 *         name: lastEventId
 *         schema:
 *           type: string
 *         description: Query fallback for Last-Event-ID if EventSource cannot set custom headers.
 *     responses:
 *       200:
 *         description: SSE connection established
 *         headers:
 *           Content-Type:
 *             schema: { type: string, example: "text/event-stream" }
 *           Cache-Control:
 *             schema: { type: string, example: "no-cache, no-transform" }
 *           Connection:
 *             schema: { type: string, example: "keep-alive" }
 *           X-Accel-Buffering:
 *             schema: { type: string, example: "no" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/stream',
  requirePermission(DashboardPermissions.VIEW.key),
  controller.streamDashboardUpdates,
);

/**
 * @swagger
 * /api/v1/dashboard/stream/status:
 *   get:
 *     summary: Get dashboard real-time stream operational status and telemetry
 *     description: |
 *       Returns current SSE metrics: active connection counts, polling health,
 *       average poll durations, and last broadcast timestamps.
 *       **Required Permission:** `system.view`
 *     operationId: getStreamStatus
 *     tags: [Dashboard]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Real-time stream telemetry resolved
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.get(
  '/stream/status',
  requirePermission(SystemPermissions.VIEW.key),
  controller.getStreamStatus,
);

// /**
//  * @swagger
//  * /api/v1/dashboard/tenders:
//  *   get:
//  *     summary: Get dashboard tender statistics
//  *     description: |
//  *       Resolves aggregate metrics for tenders (drafts, active, closing, completed).
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getTenderStats
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Tender statistics resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get('/tenders', requirePermission(DashboardPermissions.VIEW.key), controller.getTenderStats);

// /**
//  * @swagger
//  * /api/v1/dashboard/revenue:
//  *   get:
//  *     summary: Get dashboard revenue statistics
//  *     description: |
//  *       Resolves aggregate metrics for revenue, payments, and subscriptions.
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getRevenueStats
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Revenue stats resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get(
//   '/revenue',
//   requirePermission(DashboardPermissions.VIEW.key),
//   controller.getRevenueStats,
// );

// /**
//  * @swagger
//  * /api/v1/dashboard/users:
//  *   get:
//  *     summary: Get dashboard user growth and activity statistics
//  *     description: |
//  *       Resolves aggregate metrics for users (registrations, active, categories distribution).
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getUsersStats
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: User stats resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get('/users', requirePermission(DashboardPermissions.VIEW.key), controller.getUsersStats);

// /**
//  * @swagger
//  * /api/v1/dashboard/review-queue:
//  *   get:
//  *     summary: Get dashboard tender and plan review queue
//  *     description: |
//  *       Resolves items currently awaiting admin or supervisor review/action.
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getReviewQueue
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Review queue items resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get(
//   '/review-queue',
//   requirePermission(DashboardPermissions.VIEW.key),
//   controller.getReviewQueue,
// );

// /**
//  * @swagger
//  * /api/v1/dashboard/alerts:
//  *   get:
//  *     summary: Get dashboard critical system alerts
//  *     description: |
//  *       Resolves dynamic real-time critical system, security, billing, and tender alerts.
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getCriticalAlerts
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Critical alerts resolved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *               properties:
//  *                 data:
//  *                   type: array
//  *                   items:
//  *                     type: object
//  *                     required:
//  *                       - label
//  *                       - value
//  *                       - type
//  *                     properties:
//  *                      label:
//  *                         type: string
//  *                         description: Display label for the metric
//  *                         example: Security Alerts
//  *
//  *                       value:
//  *                         type: integer
//  *                         description: Metric value
//  *                         example: 2
//  *
//  *                       type:
//  *                         type: string
//  *                         description: Unique metric identifier
//  *                         example: securityAlerts
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get(
//   '/alerts',
//   requirePermission(DashboardPermissions.VIEW.key),
//   controller.getCriticalAlerts,
// );

// /**
//  * @swagger
//  * /api/v1/dashboard/recent-activity:
//  *   get:
//  *     summary: Get dashboard recent audit activity
//  *     description: |
//  *       Resolves brief list of recent audit logs and actions.
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getRecentActivity
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Recent activity resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get(
//   '/recent-activity',
//   requirePermission(DashboardPermissions.VIEW.key),
//   controller.getRecentActivity,
// );

// /**
//  * @swagger
//  * /api/v1/dashboard/system-health:
//  *   get:
//  *     summary: Get system health telemetry metrics
//  *     description: |
//  *       Resolves cpu, memory, database latency, and storage metrics.
//  *       **Required Permission:** `dashboard.view`
//  *     operationId: getSystemHealth
//  *     tags: [Dashboard]
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: System telemetry resolved
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       403:
//  *         $ref: '#/components/responses/Forbidden'
//  */
// router.get(
//   '/system-health',
//   requirePermission(DashboardPermissions.VIEW.key),
//   controller.getSystemHealth,
// );

export { router as dashboardRouter };
