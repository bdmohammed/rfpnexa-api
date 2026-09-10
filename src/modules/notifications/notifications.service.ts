import { RbacService } from '../rbac/rbac.service';
import { updateTenderStatus } from '../tenders/tenders.service';

import { notificationPublisher, type SSEClient } from './services/publisher.service';

import type { GetNotificationsQueryDto, UpdatePreferencesBodyDto } from './notifications.dto';
import type { NotificationPreferences } from '@/types/types';
import { AppDataSource } from '@/config/database';
import { logger } from '@/config/logger';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { Notification } from '@/database/entities/Notification';
import { NotificationAction } from '@/database/entities/NotificationAction';
import { NotificationRecipient } from '@/database/entities/NotificationRecipient';
import { RoleReview } from '@/database/entities/RoleReview';
import { User } from '@/database/entities/User';
import { UserRole } from '@/database/entities/UserRole';
import {
  NotificationActionType,
  NotificationCategory,
  NotificationRecipientStatus,
  NotificationSeverity,
  TenderVersionStatus,
} from '@/types/enums';

export interface NotificationListItem {
  id: string;
  recipientId: string;
  status: NotificationRecipientStatus;
  readAt: Date | null;
  createdAt: Date;
  title: string;
  message: string;
  category: NotificationCategory;
  severity: NotificationSeverity;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  actions: NotificationAction[];
}

export interface NotificationPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface GetNotificationsResponse {
  notifications: NotificationListItem[];
  pagination: NotificationPagination;
}

export interface GetNotificationStatisticsResponse {
  unread: number;
  total: number;
  critical: number;
  warning: number;
  info: number;
}

export interface NotificationCategoryOption {
  key: NotificationCategory;
  label: string;
}

export const sseClients: SSEClient[] = [];
const NotificationRecipientRepo = AppDataSource.getRepository(NotificationRecipient);
const UserRoleRepo = AppDataSource.getRepository(UserRole);
const UserRepo = AppDataSource.getRepository(User);
const NotificationActionRepo = AppDataSource.getRepository(NotificationAction);
const reviewRepo = AppDataSource.getRepository(RoleReview);

const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  [NotificationCategory.REVIEW]: 'Review Queue',
  [NotificationCategory.SECURITY]: 'Security & Compliance',
  [NotificationCategory.TENDER]: 'Tenders & Bidding',
  [NotificationCategory.BILLING]: 'Billing & Payments',
  [NotificationCategory.WORKSPACE]: 'Workspace',
  [NotificationCategory.ROLE]: 'Roles & RBAC',
  [NotificationCategory.SYSTEM]: 'System Health',
};

async function getUserRoleIds(userId: string): Promise<string[]> {
  const userRoles = await UserRoleRepo.find({ where: { userId } });
  return userRoles.map((ur) => ur.roleId);
}

export async function getNotifications(
  userId: string,
  query: GetNotificationsQueryDto,
): Promise<GetNotificationsResponse> {
  const { page, limit, status, category, severity } = query;

  const roleIds = await getUserRoleIds(userId);

  const qb = NotificationRecipientRepo.createQueryBuilder('recipient')
    .leftJoinAndSelect('recipient.notification', 'notification')
    .leftJoinAndSelect('notification.actions', 'actions')
    .where(
      `(recipient.userId = :userId
        OR recipient.groupName = :everyone
        ${roleIds.length > 0 ? 'OR recipient.roleId IN (:...roleIds)' : ''})`,
      {
        userId,
        everyone: 'everyone',
        roleIds,
      },
    );

  if (status) {
    qb.andWhere('recipient.status = :status', {
      status,
    });
  } else {
    qb.andWhere('recipient.status IN (:...statuses)', {
      statuses: [
        NotificationRecipientStatus.UNREAD,
        NotificationRecipientStatus.READ,
        NotificationRecipientStatus.ARCHIVED,
      ],
    });
  }

  if (category) {
    qb.andWhere('notification.category = :category', {
      category,
    });
  }

  if (severity) {
    qb.andWhere('notification.severity = :severity', {
      severity,
    });
  }

  qb.addSelect(
    `CASE
      WHEN notification.severity = '${NotificationSeverity.CRITICAL}' THEN 1
      WHEN notification.severity = '${NotificationSeverity.HIGH}' THEN 2
      WHEN notification.severity = '${NotificationSeverity.MEDIUM}' THEN 3
      WHEN notification.severity = '${NotificationSeverity.LOW}' THEN 4
      ELSE 5
    END`,
    'severity_priority',
  );

  qb.addSelect(
    `CASE
      WHEN recipient.status = '${NotificationRecipientStatus.UNREAD}' THEN 1
      ELSE 2
    END`,
    'status_priority',
  );

  qb.orderBy('severity_priority', 'ASC')
    .addOrderBy('status_priority', 'ASC')
    .addOrderBy('notification.createdAt', 'DESC');

  const [recipients, total] = await qb
    .skip((page - 1) * limit)
    .take(limit)
    .getManyAndCount();

  return {
    notifications: recipients.map((recipient) => ({
      id: recipient.notificationId,
      recipientId: recipient.id,
      status: recipient.status,
      readAt: recipient.readAt,
      createdAt: recipient.createdAt,
      title: recipient.notification.title,
      message: recipient.notification.message,
      category: recipient.notification.category,
      severity: recipient.notification.severity,
      entityType: recipient.notification.entityType,
      entityId: recipient.notification.entityId,
      metadata: recipient.notification.metadata,
      actions: recipient.notification.actions,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}

export async function getNotificationsStats(
  userId: string,
): Promise<GetNotificationStatisticsResponse> {
  const roleIds = await getUserRoleIds(userId);

  const qb = NotificationRecipientRepo.createQueryBuilder('recipient')
    .leftJoin('recipient.notification', 'notification')
    .where(
      `(recipient.userId = :userId OR recipient.groupName = :everyone${
        roleIds.length > 0 ? ' OR recipient.roleId IN (:...roleIds)' : ''
      })`,
      {
        userId,
        everyone: 'everyone',
        roleIds,
      },
    );

  const counts = await qb
    .select('recipient.status', 'status')
    .addSelect('notification.severity', 'severity')
    .addSelect('COUNT(*)', 'count')
    .groupBy('recipient.status')
    .addGroupBy('notification.severity')
    .getRawMany();

  let unreadCount = 0;
  let criticalCount = 0;
  let warningCount = 0;
  let infoCount = 0;
  let total = 0;

  for (const row of counts) {
    const count = Number(row.count);
    total += count;
    if (row.status === NotificationRecipientStatus.READ) {
      unreadCount += count;
    }
    if (row.severity === NotificationSeverity.CRITICAL) {
      criticalCount += count;
    } else if (
      row.severity === NotificationSeverity.HIGH ||
      row.severity === NotificationSeverity.MEDIUM
    ) {
      warningCount += count;
    } else {
      infoCount += count;
    }
  }

  return {
    unread: unreadCount,
    total,
    critical: criticalCount,
    warning: warningCount,
    info: infoCount,
  };
}

export function getCategories(): NotificationCategoryOption[] {
  return Object.values(NotificationCategory).map((category) => ({
    key: category,
    label: CATEGORY_LABELS[category],
  }));
}

export async function getPreferences(userId: string): Promise<NotificationPreferences> {
  const preferences = await UserRepo.findOneOrFail({
    where: { id: userId },
    select: { notificationPreferences: true },
  });

  return preferences.notificationPreferences;
}

export async function updatePreferences(
  userId: string,
  body: UpdatePreferencesBodyDto,
): Promise<NotificationPreferences> {
  const user = await UserRepo.findOneOrFail({
    where: { id: userId },
    select: {
      id: true,
      notificationPreferences: true,
    },
  });

  user.notificationPreferences = body;

  await UserRepo.save(user);

  return user.notificationPreferences;
}

export async function markAllNotificationAsRead(userId: string): Promise<void> {
  await NotificationRecipientRepo.update(
    {
      userId,
      status: NotificationRecipientStatus.UNREAD,
    },
    {
      status: NotificationRecipientStatus.READ,
      readAt: new Date(),
    },
  );
}

export async function markNotificationAsRead(
  userId: string,
  notificationId: string,
): Promise<void> {
  const recipient = await NotificationRecipientRepo.findOne({
    where: { notificationId, userId },
    select: {
      id: true,
      status: true,
      readAt: true,
    },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (recipient.status === NotificationRecipientStatus.READ) {
    return;
  }
  recipient.status = NotificationRecipientStatus.READ;
  recipient.readAt = new Date();
  await NotificationRecipientRepo.save(recipient);
}

export async function markNotificationAsArchive(
  userId: string,
  notificationId: string,
): Promise<void> {
  const recipient = await NotificationRecipientRepo.findOne({
    where: { notificationId, userId },
    select: {
      id: true,
      status: true,
      readAt: true,
    },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (recipient.status === NotificationRecipientStatus.ARCHIVED) {
    return;
  }
  recipient.status = NotificationRecipientStatus.ARCHIVED;
  await NotificationRecipientRepo.save(recipient);
}

export async function markNotificationAsDismiss(
  userId: string,
  notificationId: string,
): Promise<void> {
  const recipient = await NotificationRecipientRepo.findOne({
    where: { notificationId, userId },
    select: {
      id: true,
      status: true,
      readAt: true,
    },
  });

  if (!recipient)
    throw new AppError(
      AppErrorMessage.NOTIFICATION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  if (recipient.status === NotificationRecipientStatus.DISMISSED) {
    return;
  }
  recipient.status = NotificationRecipientStatus.DISMISSED;
  await NotificationRecipientRepo.save(recipient);
}

export async function executeNotificationAction(
  userId: string,
  permissions: string[],
  notificationId: string,
  actionId: string,
): Promise<void> {
  const action = await NotificationActionRepo.findOne({
    where: { id: actionId, notificationId },
    relations: {
      notification: true,
    },
  });

  if (!action) {
    throw new AppError(
      AppErrorMessage.ACTION_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  // Re-check action validation permissions
  if (action.requiredPermissionKey) {
    if (!permissions.includes(action.requiredPermissionKey)) {
      throw new AppError(
        AppErrorMessage.ACCESS_DENIED_PRIVILEGE,
        HttpStatusCode.FORBIDDEN,
        AppErrorCode.FORBIDDEN,
      );
    }
  }

  const payload = action.payload ?? {};

  // Decoupled delegation boundary
  if (action.type === NotificationActionType.TENDER_APPROVE) {
    const { tenderId } = payload;
    if (typeof tenderId !== 'string') {
      throw new AppError(
        AppErrorMessage.INVALID_TENDER_ACTION_PAYLOAD,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    await updateTenderStatus(tenderId, { status: TenderVersionStatus.APPROVED }, userId);
  } else if (action.type === NotificationActionType.TENDER_REJECT) {
    const { tenderId } = payload;
    if (typeof tenderId !== 'string') {
      throw new AppError(
        AppErrorMessage.INVALID_TENDER_ACTION_PAYLOAD,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    await updateTenderStatus(tenderId, { status: TenderVersionStatus.REJECTED }, userId);
  } else if (action.type === NotificationActionType.ROLE_APPROVE) {
    const { roleId } = payload;
    const versionVal = payload.version;
    const version = typeof versionVal === 'number' ? versionVal : Number(versionVal);
    if (typeof roleId !== 'string' || isNaN(version)) {
      throw new AppError(
        AppErrorMessage.INVALID_ROLE_ACTION_PAYLOAD,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    const review = await reviewRepo.findOne({
      where: { roleId, roleVersion: { version } },
    });
    if (!review)
      throw new AppError(
        AppErrorMessage.ROLE_REVIEW_WORKFLOW_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    await RbacService.reviewRoleVersion(
      review.id,
      'APPROVED',
      'Approved via quick action.',
      userId,
    );
  } else if (action.type === NotificationActionType.ROLE_REJECT) {
    const { roleId } = payload;
    const versionVal = payload.version;
    const version = typeof versionVal === 'number' ? versionVal : Number(versionVal);
    if (typeof roleId !== 'string' || isNaN(version)) {
      throw new AppError(
        'Invalid roleId or version in action payload',
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.VALIDATION_ERROR,
      );
    }
    const reviewRepo = AppDataSource.getRepository(RoleReview);
    const review = await reviewRepo.findOne({
      where: { roleId, roleVersion: { version } },
    });
    if (!review)
      throw new AppError(
        AppErrorMessage.ROLE_REVIEW_WORKFLOW_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.NOT_FOUND,
      );
    await RbacService.reviewRoleVersion(
      review.id,
      'REJECTED',
      'Rejected via quick action.',
      userId,
    );
  } else {
    throw new AppError(
      AppErrorMessage.UNSUPPORTED_ACTION_TYPE,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BAD_REQUEST,
    );
  }

  // Resolve recipient status to READ once completed
  const recipient = await NotificationRecipientRepo.findOne({
    where: { notificationId, userId },
  });
  if (recipient) {
    recipient.status = NotificationRecipientStatus.READ;
    recipient.readAt = new Date();
    await NotificationRecipientRepo.save(recipient);
  }
}

export function addSSEClient(client: SSEClient) {
  notificationPublisher.addClient(client);
}

export function getStreamDiagnostics() {
  return notificationPublisher.getDiagnostics();
}

// export function registerSSEClient(userId: string, res: Response) {
//   sseClients.push({ userId, res });
//   logger.info({ userId }, 'SSE client registered');
// }

// export function unregisterSSEClient(res: Response) {
//   const index = sseClients.findIndex((c) => c.res === res);
//   if (index !== -1) {
//     const client = sseClients[index];
//     if (client) {
//       sseClients.splice(index, 1);
//       logger.info({ userId: client.userId }, 'SSE client unregistered');
//     }
//   }
// }

// ─── Broadcasters ─────────────────────────────────────────────────────────────
export function broadcastToUser(userId: string, eventName: string, data: Record<string, string>) {
  const clients = sseClients.filter((c) => c.userId === userId);
  clients.forEach((c) => {
    try {
      c.res.write(`event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`);
    } catch (err) {
      logger.error({ err, userId }, 'Error writing to SSE stream');
    }
  });
}

export async function broadcastNotification(notificationId: string) {
  const notifRepo = AppDataSource.getRepository(Notification);
  const userRoleRepo = AppDataSource.getRepository(UserRole);

  const notif = await notifRepo.findOne({
    where: { id: notificationId },
    relations: {
      recipients: true,
      actions: true,
    },
  });

  if (!notif) return;

  // Resolve target users
  const targetUserIds = new Set<string>();

  for (const recipient of notif.recipients) {
    if (recipient.userId) {
      targetUserIds.add(recipient.userId);
    } else if (recipient.roleId) {
      const userRoles = await userRoleRepo.find({ where: { roleId: recipient.roleId } });
      userRoles.forEach((ur) => targetUserIds.add(ur.userId));
    } else if (recipient.groupName === 'everyone') {
      // Broadcast to all active SSE users
      sseClients.forEach((c) => targetUserIds.add(c.userId));
    }
  }

  // targetUserIds.forEach((uid) => {
  //   broadcastToUser(uid, 'notification:new', {
  //     ...notif,
  //     // Map user-specific status inside the payload
  //     status: 'UNREAD',
  //   });
  // });
}

// ─── Notification Creator ──────────────────────────────────────────────────────
// export async function createNotification(params: {
//   category: NotificationCategory;
//   severity: NotificationSeverity;
//   title: string;
//   message: string;
//   entityType?: string | null;
//   entityId?: string | null;
//   actionUrl?: string | null;
//   actionLabel?: string | null;
//   expiresAt?: Date | null;
//   metadata?: Record<string, string> | null;
//   recipients: Array<{ userId?: string; roleId?: string; groupName?: string }>;
//   actions?: Array<{
//     label: string;
//     type: NotificationActionType;
//     payload?: Record<string, string>;
//     permission?: string;
//     btnOrder?: number;
//   }>;
// }): Promise<Notification> {
//   return AppDataSource.transaction(async (manager) => {
//     const notif = manager.create(Notification, {
//       category: params.category,
//       severity: params.severity,
//       title: params.title,
//       message: params.message,
//       entityType: params.entityType ?? null,
//       entityId: params.entityId ?? null,
//       actionUrl: params.actionUrl ?? null,
//       actionLabel: params.actionLabel ?? null,
//       expiresAt: params.expiresAt ?? null,
//       metadata: params.metadata ?? null,
//     });

//     const savedNotif = await manager.save(Notification, notif);

//     // Save Recipients
//     const recipientsList = params.recipients.map((r) =>
//       manager.create(NotificationRecipient, {
//         notificationId: savedNotif.id,
//         userId: r.userId ?? null,
//         roleId: r.roleId ?? null,
//         groupName: r.groupName ?? null,
//         status: NotificationRecipientStatus.UNREAD,
//       }),
//     );
//     await manager.save(NotificationRecipient, recipientsList);

//     // Save Actions
//     if (params.actions && params.actions.length > 0) {
//       const actionsList = params.actions.map((a) =>
//         manager.create(NotificationAction, {
//           notificationId: savedNotif.id,
//           label: a.label,
//           type: a.type,
//           payload: a.payload ?? null,
//           requiredPermissionKey: a.permission ?? null,
//           btnOrder: a.btnOrder ?? 0,
//         }),
//       );
//       await manager.save(NotificationAction, actionsList);
//     }

//     // Trigger SSE broadcast in background
//     setImmediate(() => {
//       broadcastNotification(savedNotif.id).catch((err) => {
//         logger.error({ err }, 'Error broadcasting notification');
//       });
//     });

//     return savedNotif;
//   });
// }

// let listenersStarted = false;

// ─── Setup Listeners ──────────────────────────────────────────────────────────
// export function setupNotificationListeners() {
//   if (listenersStarted) return;

//   logger.info('Initializing notification listeners');

//   // 1. Tender submitted (Needs Review)
//   domainEvents.on(TENDER_EVENTS.SUBMITTED, async (event) => {
//     try {
//       const { tender } = event;
//       const title = 'Tender Submitted';
//       const message = `Tender Reference ${tender.referenceNo} is pending approval review.`;

//       // Find reviewer role or assign to group everyone / support
//       await createNotification({
//         category: NotificationCategory.REVIEW,
//         severity: NotificationSeverity.HIGH,
//         title,
//         message,
//         entityType: 'Tender',
//         entityId: tender.id,
//         actionUrl: `/tenders/${tender.id}/review`,
//         actionLabel: 'Review Tender',
//         recipients: [{ groupName: 'everyone' }], // Broadcast to all admins
//         actions: [
//           {
//             label: 'Approve',
//             type: NotificationActionType.TENDER_APPROVE,
//             payload: { tenderId: tender.id },
//             permission: 'approve_tender',
//             btnOrder: 1,
//           },
//           {
//             label: 'Reject',
//             type: NotificationActionType.TENDER_REJECT,
//             payload: { tenderId: tender.id },
//             permission: 'approve_tender',
//             btnOrder: 2,
//           },
//         ],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling TENDER_SUBMITTED notification');
//     }
//   });

//   // 2. Tender approved
//   domainEvents.on(TENDER_EVENTS.APPROVED, async (event) => {
//     try {
//       const { tender } = event;
//       const title = 'Tender Approved';
//       const message = `Tender Reference ${tender.referenceNo} has been successfully approved and scheduled/published.`;

//       await createNotification({
//         category: NotificationCategory.TENDER,
//         severity: NotificationSeverity.INFO,
//         title,
//         message,
//         entityType: 'Tender',
//         entityId: tender.id,
//         actionUrl: `/tenders/${tender.id}`,
//         actionLabel: 'View Tender',
//         recipients: [{ userId: tender.createdById }], // Send to submitter
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling TENDER_APPROVED notification');
//     }
//   });

//   // 3. Role version submitted for review
//   rbacEventEmitter.on('RoleSubmitted', async (event) => {
//     try {
//       const title = 'Role Request Submitted';
//       const message = `Role "${event.roleName}" version ${event.version} submitted by user.`;

//       // Target admins/reviewers
//       await createNotification({
//         category: NotificationCategory.REVIEW,
//         severity: NotificationSeverity.MEDIUM,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         actionUrl: `/roles/${event.roleId}/review`,
//         actionLabel: 'Review Role',
//         recipients: [{ groupName: 'everyone' }],
//         actions: [
//           {
//             label: 'Approve',
//             type: NotificationActionType.ROLE_APPROVE,
//             payload: { roleId: event.roleId, version: event.version },
//             permission: 'assign_permissions',
//             btnOrder: 1,
//           },
//           {
//             label: 'Reject',
//             type: NotificationActionType.ROLE_REJECT,
//             payload: { roleId: event.roleId, version: event.version },
//             permission: 'assign_permissions',
//             btnOrder: 2,
//           },
//         ],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleSubmitted notification');
//     }
//   });

//   // 4. Role approved
//   rbacEventEmitter.on('RoleApproved', async (event) => {
//     try {
//       const title = 'Role Approved';
//       const message = `Role "${event.roleName}" version ${event.version} has been approved.`;

//       await createNotification({
//         category: NotificationCategory.SYSTEM,
//         severity: NotificationSeverity.INFO,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         actionUrl: `/roles/${event.roleId}`,
//         actionLabel: 'View Role',
//         recipients: [{ userId: event.userId }],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleApproved notification');
//     }
//   });

//   // 5. Role rejected
//   rbacEventEmitter.on('RoleRejected', async (event) => {
//     try {
//       const title = 'Role Rejected';
//       const message = `Role "${event.roleName}" version ${event.version} has been rejected.`;

//       await createNotification({
//         category: NotificationCategory.ROLE,
//         severity: NotificationSeverity.HIGH,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         recipients: [{ userId: event.userId }],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleRejected notification');
//     }
//   });

//   // 6. Role Created Draft
//   rbacEventEmitter.on('RoleCreated', async (event) => {
//     try {
//       const title = 'New Role Created';
//       const message = `A new role "${event.roleName}" has been created as a draft.`;

//       await createNotification({
//         category: NotificationCategory.SYSTEM,
//         severity: NotificationSeverity.INFO,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         recipients: [{ groupName: 'everyone' }],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleCreated notification');
//     }
//   });

//   // 7. Role Reopened
//   rbacEventEmitter.on('RoleReopened', async (event) => {
//     try {
//       const title = 'Role Review Reopened';
//       const message = `Role "${event.roleName}" (V${event.version}) review workflow has been reopened.`;

//       await createNotification({
//         category: NotificationCategory.SYSTEM,
//         severity: NotificationSeverity.MEDIUM,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         recipients: [{ userId: event.userId }],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleReopened notification');
//     }
//   });

//   // 8. Role Archived
//   rbacEventEmitter.on('RoleArchived', async (event) => {
//     try {
//       const title = 'Role Archived';
//       const message = `Role "${event.roleName}" has been archived.`;

//       await createNotification({
//         category: NotificationCategory.SYSTEM,
//         severity: NotificationSeverity.INFO,
//         title,
//         message,
//         entityType: 'Role',
//         entityId: event.roleId,
//         recipients: [{ groupName: 'everyone' }],
//       });
//     } catch (err) {
//       logger.error({ err }, 'Error handling RoleArchived notification');
//     }
//   });

//   listenersStarted = true;
// }

/**
 * Removes notification listeners and closes active SSE streams during server shutdown.
 */
// export function stopNotificationListeners(): void {
//   if (!listenersStarted) return;

//   for (const client of sseClients) {
//     try {
//       client.res.end();
//     } catch {
//       // Ignore closing errors on terminating sockets
//     }
//   }
//   sseClients.length = 0;

//   domainEvents.removeAllListeners();
//   rbacEventEmitter.removeAllListeners();
//   listenersStarted = false;
//   logger.info('Notification listeners and active SSE streams closed');
// }
