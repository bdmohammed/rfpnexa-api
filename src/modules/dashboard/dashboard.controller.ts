import { type PatchLayoutDto } from './dashboard.dto';
import * as dashboardService from './dashboard.service';

import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { asyncHandler } from '@/core/asyncHandler';
import { sendOk } from '@/core/response';

// ─── Config & Layout ──────────────────────────────────────────────────────────

export const getConfig = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const config = await dashboardService.getDashboardConfig(
    req.user.userId,
    req.roles ?? [],
    req.permissions ?? [],
  );

  return sendOk(res, config);
});

export const updateLayout = asyncHandler<{}, object, PatchLayoutDto>(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const { widgets, theme } = req.body;

  const layout = await dashboardService.updateDashboardLayout(req.user.userId, widgets, theme);

  return sendOk(res, layout);
});

export const resetLayout = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const layout = await dashboardService.resetDashboardLayout(req.user.userId, req.roles ?? []);

  return sendOk(res, layout);
});

// ─── Widget Specific Composition Endpoints ────────────────────────────────────

export const getTenderStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getTenderData();
  return sendOk(res, data);
});

export const getRevenueStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRevenueData();
  return sendOk(res, data);
});

export const getUsersStats = asyncHandler(async (req, res) => {
  const data = await dashboardService.getUsersData();
  return sendOk(res, data);
});

export const getReviewQueue = asyncHandler(async (req, res) => {
  const data = await dashboardService.getReviewQueueData();
  return sendOk(res, data);
});

export const getCriticalAlerts = asyncHandler(async (req, res) => {
  const data = await dashboardService.getCriticalAlertsData();
  return sendOk(res, data);
});

export const getRecentActivity = asyncHandler(async (req, res) => {
  const data = await dashboardService.getRecentActivityData();
  return sendOk(res, data);
});

export const getSystemHealth = asyncHandler(async (req, res) => {
  const data = await dashboardService.getSystemHealthData();
  return sendOk(res, data);
});

export const getQuickActionsList = asyncHandler(async (req, res) => {
  const data = dashboardService.getQuickActions(req.permissions ?? []);
  return sendOk(res, data);
});

// ─── Real-Time Stream (SSE) ───────────────────────────────────────────────────

export const streamDashboardUpdates = asyncHandler(async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError(
        AppErrorMessage.AUTHENTICATION_REQUIRED,
        HttpStatusCode.UNAUTHORIZED,
        AppErrorCode.UNAUTHENTICATED,
      ),
    );
  }

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const clientId = `client_${Date.now()}`;

  dashboardService.addSSEClient({
    id: clientId,
    res,
    userId: req.user.userId,
    roles: req.roles ?? [],
    permissions: req.permissions ?? [],
  });

  // Push immediate connection acknowledgement
  res.write(`event: connection\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`);

  // Emulating typed live data push on connection
  setTimeout(async () => {
    try {
      const reviewQueue = await dashboardService.getReviewQueueData();
      const alerts = await dashboardService.getCriticalAlertsData();
      const health = dashboardService.getSystemHealthData();

      res.write(`event: review_queue\ndata: ${JSON.stringify(reviewQueue)}\n\n`);
      res.write(`event: alerts\ndata: ${JSON.stringify(alerts)}\n\n`);
      res.write(`event: health\ndata: ${JSON.stringify(health)}\n\n`);
    } catch (err) {
      // Slently ignore push failure
      logger.error(err, 'Failed to push dashboard updates');
    }
  }, 1000);
});
