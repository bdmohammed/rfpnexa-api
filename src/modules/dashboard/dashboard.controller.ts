import crypto from 'node:crypto';

import { updateTheme as updateAppTheme } from './layout/services/layout.service';
import { type PatchLayoutDto } from './dashboard.dto';
import * as dashboardService from './dashboard.service';

import type { UserDashboardLayout } from '@/database/entities/UserDashboardLayout';
import type { DashboardTheme } from '@/types/enums';
import type { AuthenticatedUser } from '@/types/express';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { asyncHandler } from '@/core/asyncHandler';
import { sendOk } from '@/core/response';

export const getConfig = asyncHandler<{}, object, {}>(async (req, res) => {
  const config = await dashboardService.getDashboardConfig(
    (req.user as AuthenticatedUser).userId,
    req.permissions as string[],
    req.roles as string[],
  );

  return sendOk(res, config);
});

export const updateLayout = asyncHandler<{}, object, PatchLayoutDto>(async (req, res) => {
  const { widgets, theme } = req.body;

  const layout = await dashboardService.updateDashboardLayout(
    (req.user as AuthenticatedUser).userId,
    widgets,
    theme,
  );

  return sendOk(res, layout);
});

export const updateTheme = asyncHandler<{}, object, { theme: DashboardTheme }>(async (req, res) => {
  const theme = await updateAppTheme((req.user as AuthenticatedUser).userId, req.body.theme);

  return sendOk(res, theme);
});

export const resetLayout = asyncHandler<{}, UserDashboardLayout, {}>(async (req, res) => {
  const layout = await dashboardService.resetDashboardLayout(
    (req.user as AuthenticatedUser).userId,
    req.permissions as string[],
    req.roles as string[],
  );

  return sendOk(res, layout);
});

// ─── Widget Specific Composition Endpoints ────────────────────────────────────

// export const getTenderStats = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getTenderData();
//   return sendOk(res, data);
// });

// export const getRevenueStats = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getRevenueData();
//   return sendOk(res, data);
// });

// export const getUsersStats = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getUsersData();
//   return sendOk(res, data);
// });

// export const getReviewQueue = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getReviewQueueData();
//   return sendOk(res, data);
// });

// export const getCriticalAlerts = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getCriticalAlertsData();
//   return sendOk(res, data);
// });

// export const getRecentActivity = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getRecentActivityData();
//   return sendOk(res, data);
// });

// export const getSystemHealth = asyncHandler(async (req, res) => {
//   const data = await dashboardService.getSystemHealthData();
//   return sendOk(res, data);
// });

// ─── Real-Time Stream (SSE) ───────────────────────────────────────────────────

export const streamDashboardUpdates = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.AUTHENTICATION_REQUIRED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHENTICATED,
    );
  }

  const userId = req.user.userId || req.user.sub;
  const roles = Array.isArray(req.roles) ? req.roles : [];
  const permissions = Array.isArray(req.permissions) ? req.permissions : [];

  // Setup Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);
  res.flushHeaders();

  const clientId = crypto.randomUUID();
  const lastEventId =
    (req.headers['last-event-id'] as string) ||
    (typeof req.query['lastEventId'] === 'string' ? req.query['lastEventId'] : undefined);

  // Initial connection acknowledgement with event ID
  res.write(
    `id: ${clientId}\nevent: connection\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`,
  );

  // Flush compression buffer if middleware is enabled
  if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
    (res as unknown as { flush: () => void }).flush();
  }

  dashboardService.addSSEClient({
    id: clientId,
    res,
    req,
    lastEventId,
    userId,
    roles,
    permissions,
  });
});

export const getStreamStatus = asyncHandler(async (_req, res) => {
  const diagnostics = dashboardService.getStreamDiagnostics();
  return sendOk(res, diagnostics);
});
