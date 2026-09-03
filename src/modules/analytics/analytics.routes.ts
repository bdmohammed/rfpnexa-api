import { Router } from 'express';

import * as controller from './analytics.controller';
import {
  AlertIdParamSchema,
  AnalyticsQuerySchema,
  CreateScheduledReportSchema,
  FilenameParamSchema,
  RequestExportSchema,
  SaveDashboardLayoutSchema,
} from './analytics.dto';

import { AnalyticsPermissions } from '@/constants/permissions';
import { authenticate } from '@/middleware/authenticate';
import { requirePermission } from '@/middleware/permissions';
import { validate } from '@/middleware/validate';

const router = Router();

// Require active authentication session for all BI analytics
router.use(authenticate);

// ─── Metrics resource-oriented endpoints ─────────────────────────────────────

/**
 * @swagger
 * /api/v1/analytics/overview:
 *   get:
 *     summary: Get high-level BI analytics overview
 *     description: |
 *       Resolves aggregate values of active users, tender values, and total subscription collections.
 *       **Required Permission:** `analytics.view`
 *     operationId: getOverviewAnalytics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Overview stats resolved
 */
router.get(
  '/overview',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getOverview,
);

/**
 * @swagger
 * /api/v1/analytics/tenders:
 *   get:
 *     summary: Get tender metrics
 *     description: |
 *       Resolves analytics on tender publications, category spread, and regional distributions.
 *       **Required Permission:** `analytics.view`
 *     operationId: getTendersAnalytics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tender analytics resolved
 */
router.get(
  '/tenders',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getTenders,
);

/**
 * @swagger
 * /api/v1/analytics/users:
 *   get:
 *     summary: Get user registration metrics
 *     description: |
 *       Resolves active vs passive users, growth curves, and user acquisition metrics.
 *       **Required Permission:** `analytics.users`
 *     operationId: getUsersMetrics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User growth metrics resolved
 */
router.get(
  '/users',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getUsersMetrics,
);

/**
 * @swagger
 * /api/v1/analytics/revenue:
 *   get:
 *     summary: Get financial revenue metrics
 *     description: |
 *       Resolves MRR, ARR, active subscription revenues, and billing histories.
 *       **Required Permission:** `analytics.financial`
 *     operationId: getRevenueMetrics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Financial metrics resolved
 */
router.get(
  '/revenue',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getRevenueMetrics,
);

/**
 * @swagger
 * /api/v1/analytics/categories:
 *   get:
 *     summary: Get category-specific engagement metrics
 *     description: |
 *       Resolves metrics on most active tender categories and search trends.
 *       **Required Permission:** `analytics.view`
 *     operationId: getCategoriesMetrics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Categories analytics resolved
 */
router.get(
  '/categories',
  requirePermission(AnalyticsPermissions.VIEW.key),
  controller.getCategoriesMetrics,
);

/**
 * @swagger
 * /api/v1/analytics/system:
 *   get:
 *     summary: Get database query and CPU load analytics
 *     description: |
 *       Resolves system execution time graphs and memory profiles.
 *       **Required Permission:** `analytics.system`
 *     operationId: getSystemMetrics
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: System metrics resolved
 */
router.get(
  '/system',
  requirePermission(AnalyticsPermissions.VIEW.key),
  controller.getSystemMetrics,
);

// ─── Personalization Layouts ──────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/analytics/dashboard:
 *   get:
 *     summary: Get analytics dashboard layout configuration
 *     description: |
 *       Retrieves custom BI layout grid preferences for the user.
 *       **Required Permission:** `analytics.view`
 *     operationId: getAnalyticsDashboard
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Config resolved
 *
 *   post:
 *     summary: Save analytics dashboard layout config
 *     description: |
 *       Saves custom BI layout grid preferences.
 *       **Required Permission:** `analytics.view`
 *     operationId: saveAnalyticsDashboard
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [layout]
 *             properties:
 *               layout: { type: array, items: { type: object } }
 *     responses:
 *       200:
 *         description: Config saved successfully
 */
router.get('/dashboard', requirePermission(AnalyticsPermissions.VIEW.key), controller.getDashboard);
router.post(
  '/dashboard',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(SaveDashboardLayoutSchema, 'body'),
  controller.saveDashboard,
);

// ─── Alerts triggers ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/analytics/alerts:
 *   get:
 *     summary: List trigger alerts log
 *     description: |
 *       Lists threshold trigger alerts (e.g. database CPU spike, high failing subscription captures).
 *       **Required Permission:** `analytics.view`
 *     operationId: getAlertsList
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Trigger alerts list
 */
router.get('/alerts', requirePermission(AnalyticsPermissions.VIEW.key), controller.getAlertsList);

/**
 * @swagger
 * /api/v1/analytics/alerts/{alertId}/resolve:
 *   post:
 *     summary: Mark alert trigger as resolved
 *     description: |
 *       Acknowledges and resolves a specific trigger alert.
 *       **Required Permission:** `analytics.view`
 *     operationId: resolveAlertTrigger
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: alertId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Alert marked resolved
 */
router.post(
  '/alerts/:alertId/resolve',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AlertIdParamSchema, 'params'),
  controller.resolveAlertTrigger,
);

// ─── Asynchronous Exports & downloads ─────────────────────────────────────────

/**
 * @swagger
 * /api/v1/analytics/exports/request:
 *   post:
 *     summary: Request BI report excel export
 *     description: |
 *       Enqueues background worker to extract metrics data into an Excel sheet.
 *       **Required Permission:** `analytics.export`
 *     operationId: requestDataExport
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [exportType]
 *             properties:
 *               exportType: { type: string, enum: [overview, tenders, users, revenue] }
 *     responses:
 *       202:
 *         description: Export job enqueued successfully
 */
router.post(
  '/exports/request',
  requirePermission(AnalyticsPermissions.MANAGE.key),
  validate(RequestExportSchema, 'body'),
  controller.requestDataExport,
);

/**
 * @swagger
 * /api/v1/analytics/exports/jobs:
 *   get:
 *     summary: Get list of active export jobs
 *     description: |
 *       Returns status and S3 download links of requested data export sheets.
 *       **Required Permission:** `analytics.export`
 *     operationId: getExportJobs
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Active export jobs list resolved
 */
router.get(
  '/exports/jobs',
  requirePermission(AnalyticsPermissions.MANAGE.key),
  controller.getExportJobs,
);

/**
 * @swagger
 * /api/v1/analytics/exports/download/{filename}:
 *   get:
 *     summary: Download exported report sheet file (Public Link)
 *     description: Directly downloads the completed report file. Bypass CSRF checking.
 *     operationId: downloadExportFile
 *     tags: [Analytics]
 *     security: []
 *     parameters:
 *       - name: filename
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Download file content stream
 *         headers:
 *           Content-Disposition:
 *             schema: { type: string, example: "attachment; filename=report.xlsx" }
 */
router.get(
  '/exports/download/:filename',
  validate(FilenameParamSchema, 'params'),
  controller.downloadExportFile,
);

// ─── Scheduled reports schedules ─────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/analytics/reports/schedules:
 *   post:
 *     summary: Create recurring report schedule
 *     description: |
 *       Saves settings to automatically send BI emails weekly/monthly.
 *       **Required Permission:** `analytics.reports`
 *     operationId: createReportSchedule
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reportType, frequency, recipientEmails]
 *             properties:
 *               reportType: { type: string, example: "revenue" }
 *               frequency: { type: string, enum: [daily, weekly, monthly] }
 *               recipientEmails: { type: array, items: { type: string } }
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *
 *   get:
 *     summary: Get report schedules list
 *     description: |
 *       Retrieves all configured recurring BI report schedules.
 *       **Required Permission:** `analytics.reports`
 *     operationId: listReportSchedules
 *     tags: [Analytics]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Report schedules list resolved
 */
router.post(
  '/reports/schedules',
  requirePermission(AnalyticsPermissions.MANAGE.key),
  validate(CreateScheduledReportSchema, 'body'),
  controller.createReportSchedule,
);
router.get(
  '/reports/schedules',
  requirePermission(AnalyticsPermissions.MANAGE.key),
  controller.listReportSchedules,
);

/**
 * @swagger
 * /api/v1/analytics/user-growth:
 *   get:
 *     summary: Get user growth analytics metrics
 *     description: |
 *       Resolves new registration curves.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetUserGrowth
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User growth resolved
 */
router.get(
  '/user-growth',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getUserGrowth,
);

/**
 * @swagger
 * /api/v1/analytics/revenue-legacy:
 *   get:
 *     summary: Get revenue analytics (Legacy Admin API)
 *     description: |
 *       Resolves revenue graphs.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetRevenue
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Revenue stats
 */
router.get(
  '/revenue-legacy',
  requirePermission(AnalyticsPermissions.VIEW.key),
  validate(AnalyticsQuerySchema, 'query'),
  controller.getRevenue,
);

/**
 * @swagger
 * /api/v1/analytics/downloads:
 *   get:
 *     summary: Get top downloaded tenders metrics
 *     description: |
 *       Lists tenders with the highest number of document downloads.
 *       **Required Permission:** `analytics.view`
 *     operationId: adminGetTopDownloads
 *     tags: [Analytics Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Download metrics list
 */
router.get(
  '/downloads',
  requirePermission(AnalyticsPermissions.VIEW.key),
  controller.getTopDownloads,
);

export { router as analyticsRouter };
