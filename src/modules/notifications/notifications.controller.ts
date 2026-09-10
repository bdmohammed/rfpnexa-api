import * as notificationService from './notifications.service';

import type {
  ExecuteActionParamsDto,
  GetNotificationsQueryDto,
  NotificationIdParamDto,
  UpdatePreferencesBodyDto,
} from './notifications.dto';
import type { AuthenticatedUser } from '@/types/express';
import type { NotificationPreferences } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { sendNoContent, sendOk } from '@/core/response';

export const getNotifications = asyncHandler<{}, object, {}, GetNotificationsQueryDto>(
  async (req, res) => {
    const notifications = await notificationService.getNotifications(
      (req.user as AuthenticatedUser).userId,
      req.query,
    );

    return sendOk<notificationService.GetNotificationsResponse>(res, notifications);
  },
);

export const getNotificationsStats = asyncHandler(async (req, res) => {
  const notificationStatistics = await notificationService.getNotificationsStats(
    (req.user as AuthenticatedUser).userId,
  );

  return sendOk<notificationService.GetNotificationStatisticsResponse>(res, notificationStatistics);
});

export const markNotificationAsRead = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  await notificationService.markNotificationAsRead(
    (req.user as AuthenticatedUser).userId,
    req.params.id,
  );

  return sendNoContent(res);
});

export const markAllNotificationAsRead = asyncHandler(async (req, res) => {
  await notificationService.markAllNotificationAsRead((req.user as AuthenticatedUser).userId);

  return sendNoContent(res);
});

export const markNotificationAsArchive = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  await notificationService.markNotificationAsArchive(
    (req.user as AuthenticatedUser).userId,
    req.params.id,
  );

  return sendNoContent(res);
});

export const markNotificationAsDismiss = asyncHandler<NotificationIdParamDto>(async (req, res) => {
  await notificationService.markNotificationAsDismiss(
    (req.user as AuthenticatedUser).userId,
    req.params.id,
  );

  return sendNoContent(res);
});

// ─── Execute Smart Action (Decoupled Delegation) ──────────────────────────────
export const executeNotificationAction = asyncHandler<ExecuteActionParamsDto>(async (req, res) => {
  await notificationService.executeNotificationAction(
    (req.user as AuthenticatedUser).userId,
    req.permissions as string[],
    req.params.id,
    req.params.actionId,
  );

  return sendNoContent(res);
});

export const getCategories = asyncHandler(async (_req, res) => {
  return sendOk(res, notificationService.getCategories());
});

export const getPreferences = asyncHandler(async (req, res) => {
  const preferences = await notificationService.getPreferences(
    (req.user as AuthenticatedUser).userId,
  );

  return sendOk(res, preferences);
});

export const updatePreferences = asyncHandler<{}, unknown, UpdatePreferencesBodyDto>(
  async (req, res) => {
    const preferences = await notificationService.updatePreferences(
      (req.user as AuthenticatedUser).userId,
      req.body,
    );

    return sendOk<NotificationPreferences>(res, preferences);
  },
);

// ─── SSE Notification Stream ──────────────────────────────────────────────────
export const streamAppNotifications = asyncHandler(async (req, res) => {
  const { userId } = req.user as AuthenticatedUser;
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.status(200);
  res.flushHeaders();

  const clientId = crypto.randomUUID();

  // Initial connection acknowledgement with event ID
  res.write(
    `id: ${clientId}\nevent: connection\ndata: ${JSON.stringify({ status: 'connected', clientId })}\n\n`,
  );

  // Flush compression buffer if middleware is enabled
  if (typeof (res as unknown as { flush?: () => void }).flush === 'function') {
    (res as unknown as { flush: () => void }).flush();
  }

  // registerSSEClient(userId, res);

  // // Send initial ping/connection state
  // res.write('event: ping\ndata: connected\n\n');

  // req.on('close', () => {
  //   unregisterSSEClient(res);
  // });

  notificationService.addSSEClient({
    id: clientId,
    res,
    req,
    userId,
    roles: req.roles,
    permissions: req.permissions,
  });
});

export const getStreamAppNotificationsStatus = asyncHandler(async (_req, res) => {
  const diagnostics = notificationService.getStreamDiagnostics();
  return sendOk(res, diagnostics);
});
