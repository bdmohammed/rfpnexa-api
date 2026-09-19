// import type { Request, Response } from 'express';
// import { AppDataSource } from '@/config/database';
// import { logger } from '@/config/logger';
// import { Notification } from '@/database/entities/Notification';
// import { NotificationAction } from '@/database/entities/NotificationAction';
// import { NotificationRecipient } from '@/database/entities/NotificationRecipient';
// import { UserRole } from '@/database/entities/UserRole';
// import { rbacEventEmitter } from '@/modules/rbac/events/RbacEvents';
// import {
//   NotificationActionType,
//   NotificationCategory,
//   NotificationRecipientStatus,
//   NotificationSeverity,
// } from '@/types/enums';
// import { domainEvents, TENDER_EVENTS } from '@/utils/domainEvents';

// /**
//  * NIL UUID used as a safe placeholder for empty `IN (...)` clauses.
//  * TypeORM/Postgres chokes on `IN ()`, so when a client has no roles we
//  * substitute a value that will never match a real row.
//  */
// const NIL_UUID = '00000000-0000-0000-0000-000000000000';

// /**
//  * Which portal a connection belongs to. Set this when the SSE route is
//  * established — e.g. `/admin/notifications/stream` vs
//  * `/customer/notifications/stream` — based on which app/session issued it.
//  */
// export type NotificationAudience = 'admin' | 'customer';

// /**
//  * Recipient group names supported on `NotificationRecipient.groupName`.
//  * - 'admins'    -> every connected admin-portal client
//  * - 'customers' -> every connected customer-portal client
//  * - 'everyone'  -> both audiences
//  */
// export type NotificationGroup = 'admins' | 'customers' | 'everyone';

// export interface SSEClient {
//   id: string;
//   res: Response;
//   req?: Request | undefined;
//   userId: string;
//   // audience: NotificationAudience;
//   /** Role IDs (not names) the user currently holds — used for role-targeted recipients and initial sync. */
//   roles?: string[] | undefined;
//   permissions?: string[] | undefined;
// }

// interface ClientEntry {
//   client: SSEClient;
//   heartbeat: NodeJS.Timeout;
//   drainTimeout: NodeJS.Timeout | null;
//   isBackpressured: boolean;
//   onDisconnect: () => void;
//   onError: (err: Error) => void;
// }

// interface SerializedNotification {
//   id: string;
//   category: NotificationCategory;
//   severity: NotificationSeverity;
//   title: string;
//   message: string;
//   entityType: string | null;
//   entityId: string | null;
//   actionUrl: string | null;
//   actionLabel: string | null;
//   createdAt: string;
//   status: NotificationRecipientStatus;
//   actions: Array<{
//     label: string;
//     type: NotificationActionType;
//     payload: Record<string, string> | null;
//     permission: string | null;
//     btnOrder: number;
//   }>;
// }

// export interface PublisherDiagnostics {
//   connectedClients: number;
//   connectedUsers: number;
//   // adminClients: number;
//   // customerClients: number;
//   uptimeSeconds: number;
//   heartbeatIntervalMs: number;
//   isShuttingDown: boolean;
//   broadcastCount: number;
//   lastBroadcastTimestamp: string | null;
// }

// const notificationRepo = AppDataSource.getRepository(Notification);
// const notificationRecipientRepo = AppDataSource.getRepository(NotificationRecipient);
// const userRoleRepo = AppDataSource.getRepository(UserRole);

// /**
//  * Notification Publisher for real-time SSE stream.
//  *
//  * Event-driven (not polled): notifications are created via domain events,
//  * persisted, then fanned out immediately to whichever connected clients
//  * are eligible recipients (direct user, role, or admin/customer/everyone
//  * group). On connect, a client receives a one-time snapshot of their
//  * unread notifications pulled from the DB.
//  *
//  * Implements:
//  * - userId -> connection-id index so a user can have multiple live tabs/devices
//  * - Admin vs customer audience separation for group-targeted notifications
//  * - Backpressure tracking and automatic teardown of sluggish client streams
//  * - Explicit SSE protocol adherence (retry hint, unique event IDs, error events)
//  * - Compression middleware flush handling to prevent buffer stalling
//  * - Graceful shutdown orchestration for connection draining
//  */
// class NotificationPublisher {
//   private readonly clients: Map<string, ClientEntry> = new Map();
//   /** userId -> set of connection ids, supports multiple simultaneous connections per user */
//   private readonly userIndex: Map<string, Set<string>> = new Map();

//   private isShuttingDown = false;
//   private listenersStarted = false;
//   private eventSequence = 1;

//   private readonly HEARTBEAT_INTERVAL_MS = 15000;
//   private readonly DRAIN_TIMEOUT_MS = 5000;
//   private readonly RETRY_INTERVAL_MS = 5000;
//   private readonly UNREAD_SYNC_LIMIT = 50;

//   private broadcastCount = 0;
//   private lastBroadcastTimestamp = 0;

//   // ---------------------------------------------------------------------
//   // Notification creation
//   // ---------------------------------------------------------------------

//   private createNotification(params: {
//     category: NotificationCategory;
//     severity: NotificationSeverity;
//     title: string;
//     message: string;
//     entityType?: string | null;
//     entityId?: string | null;
//     actionUrl?: string | null;
//     actionLabel?: string | null;
//     expiresAt?: Date | null;
//     metadata?: Record<string, string> | null;
//     recipients: Array<{ userId?: string; roleId?: string; groupName?: NotificationGroup }>;
//     actions?: Array<{
//       label: string;
//       type: NotificationActionType;
//       payload?: Record<string, string>;
//       permission?: string;
//       btnOrder?: number;
//     }>;
//   }): Promise<Notification> {
//     return AppDataSource.transaction(async (manager) => {
//       const notif = manager.create(Notification, {
//         category: params.category,
//         severity: params.severity,
//         title: params.title,
//         message: params.message,
//         entityType: params.entityType ?? null,
//         entityId: params.entityId ?? null,
//         actionUrl: params.actionUrl ?? null,
//         actionLabel: params.actionLabel ?? null,
//         expiresAt: params.expiresAt ?? null,
//         metadata: params.metadata ?? null,
//       });

//       const savedNotif = await manager.save(Notification, notif);

//       const recipientsList = params.recipients.map((r) =>
//         manager.create(NotificationRecipient, {
//           notificationId: savedNotif.id,
//           userId: r.userId ?? null,
//           roleId: r.roleId ?? null,
//           groupName: r.groupName ?? null,
//           status: NotificationRecipientStatus.UNREAD,
//         }),
//       );
//       await manager.save(NotificationRecipient, recipientsList);

//       if (params.actions && params.actions.length > 0) {
//         const actionsList = params.actions.map((a) =>
//           manager.create(NotificationAction, {
//             notificationId: savedNotif.id,
//             label: a.label,
//             type: a.type,
//             payload: a.payload ?? null,
//             requiredPermissionKey: a.permission ?? null,
//             btnOrder: a.btnOrder ?? 0,
//           }),
//         );
//         await manager.save(NotificationAction, actionsList);
//       }

//       // Broadcast happens outside the transaction, once it's committed.
//       setImmediate(() => {
//         this.broadcastNotification(savedNotif.id).catch((err) => {
//           logger.error({ err }, 'Error broadcasting notification');
//         });
//       });

//       return savedNotif;
//     });
//   }

//   // ---------------------------------------------------------------------
//   // Domain event -> notification wiring
//   // ---------------------------------------------------------------------

//   public setupNotificationListeners(): void {
//     if (this.listenersStarted) return;

//     logger.info('Initializing notification listeners');

//     // 1. Tender submitted -> notify admins/reviewers
//     domainEvents.on(TENDER_EVENTS.SUBMITTED, async (event) => {
//       try {
//         const { tender } = event;
//         await this.createNotification({
//           category: NotificationCategory.REVIEW,
//           severity: NotificationSeverity.HIGH,
//           title: 'Tender Submitted',
//           message: `Tender Reference ${tender.referenceNo} is pending approval review.`,
//           entityType: 'Tender',
//           entityId: tender.id,
//           actionUrl: `/tenders/${tender.id}/review`,
//           actionLabel: 'Review Tender',
//           recipients: [{ groupName: 'admins' }],
//           actions: [
//             {
//               label: 'Approve',
//               type: NotificationActionType.TENDER_APPROVE,
//               payload: { tenderId: tender.id },
//               permission: 'approve_tender',
//               btnOrder: 1,
//             },
//             {
//               label: 'Reject',
//               type: NotificationActionType.TENDER_REJECT,
//               payload: { tenderId: tender.id },
//               permission: 'approve_tender',
//               btnOrder: 2,
//             },
//           ],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling TENDER_SUBMITTED notification');
//       }
//     });

//     // 2. Tender approved -> notify the customer who submitted it
//     domainEvents.on(TENDER_EVENTS.APPROVED, async (event) => {
//       try {
//         const { tender } = event;
//         await this.createNotification({
//           category: NotificationCategory.TENDER,
//           severity: NotificationSeverity.INFO,
//           title: 'Tender Approved',
//           message: `Tender Reference ${tender.referenceNo} has been successfully approved and scheduled/published.`,
//           entityType: 'Tender',
//           entityId: tender.id,
//           actionUrl: `/tenders/${tender.id}`,
//           actionLabel: 'View Tender',
//           recipients: [{ userId: tender.createdById }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling TENDER_APPROVED notification');
//       }
//     });

//     // 3. Role version submitted for review -> notify admins/reviewers
//     rbacEventEmitter.on('RoleSubmitted', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.REVIEW,
//           severity: NotificationSeverity.MEDIUM,
//           title: 'Role Request Submitted',
//           message: `Role "${event.roleName}" version ${event.version} submitted by user.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           actionUrl: `/roles/${event.roleId}/review`,
//           actionLabel: 'Review Role',
//           recipients: [{ groupName: 'admins' }],
//           actions: [
//             {
//               label: 'Approve',
//               type: NotificationActionType.ROLE_APPROVE,
//               payload: { roleId: event.roleId, version: String(event.version) },
//               permission: 'assign_permissions',
//               btnOrder: 1,
//             },
//             {
//               label: 'Reject',
//               type: NotificationActionType.ROLE_REJECT,
//               payload: { roleId: event.roleId, version: String(event.version) },
//               permission: 'assign_permissions',
//               btnOrder: 2,
//             },
//           ],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleSubmitted notification');
//       }
//     });

//     // 4. Role approved -> notify the requesting admin user
//     rbacEventEmitter.on('RoleApproved', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.SYSTEM,
//           severity: NotificationSeverity.INFO,
//           title: 'Role Approved',
//           message: `Role "${event.roleName}" version ${event.version} has been approved.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           actionUrl: `/roles/${event.roleId}`,
//           actionLabel: 'View Role',
//           recipients: [{ userId: event.userId }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleApproved notification');
//       }
//     });

//     // 5. Role rejected
//     rbacEventEmitter.on('RoleRejected', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.ROLE,
//           severity: NotificationSeverity.HIGH,
//           title: 'Role Rejected',
//           message: `Role "${event.roleName}" version ${event.version} has been rejected.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           recipients: [{ userId: event.userId }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleRejected notification');
//       }
//     });

//     // 6. Role created as draft -> notify admins
//     rbacEventEmitter.on('RoleCreated', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.SYSTEM,
//           severity: NotificationSeverity.INFO,
//           title: 'New Role Created',
//           message: `A new role "${event.roleName}" has been created as a draft.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           recipients: [{ groupName: 'admins' }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleCreated notification');
//       }
//     });

//     // 7. Role review reopened
//     rbacEventEmitter.on('RoleReopened', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.SYSTEM,
//           severity: NotificationSeverity.MEDIUM,
//           title: 'Role Review Reopened',
//           message: `Role "${event.roleName}" (V${event.version}) review workflow has been reopened.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           recipients: [{ userId: event.userId }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleReopened notification');
//       }
//     });

//     // 8. Role archived -> notify admins
//     rbacEventEmitter.on('RoleArchived', async (event) => {
//       try {
//         await this.createNotification({
//           category: NotificationCategory.SYSTEM,
//           severity: NotificationSeverity.INFO,
//           title: 'Role Archived',
//           message: `Role "${event.roleName}" has been archived.`,
//           entityType: 'Role',
//           entityId: event.roleId,
//           recipients: [{ groupName: 'admins' }],
//         });
//       } catch (err) {
//         logger.error({ err }, 'Error handling RoleArchived notification');
//       }
//     });

//     this.listenersStarted = true;
//   }

//   // ---------------------------------------------------------------------
//   // Broadcast
//   // ---------------------------------------------------------------------

//   /**
//    * Resolve a persisted notification's recipients and push it live to any
//    * of those recipients who currently have an open SSE connection.
//    * Users who aren't connected simply pick it up via the unread sync the
//    * next time they connect (or via a REST "list notifications" endpoint).
//    */
//   private async broadcastNotification(notificationId: string): Promise<void> {
//     const notif = await notificationRepo.findOne({
//       where: { id: notificationId },
//       relations: { actions: true, recipients: true },
//     });
//     if (!notif) return;

//     const targetUserIds = new Set<string>();
//     let broadcastAdmins = false;
//     let broadcastCustomers = false;

//     for (const recipient of notif.recipients) {
//       if (recipient.userId) {
//         targetUserIds.add(recipient.userId);
//         continue;
//       }
//       if (recipient.roleId) {
//         const userRoles = await userRoleRepo.find({ where: { roleId: recipient.roleId } });
//         userRoles.forEach((ur) => targetUserIds.add(ur.userId));
//         continue;
//       }
//       if (recipient.groupName === 'admins') broadcastAdmins = true;
//       else if (recipient.groupName === 'customers') broadcastCustomers = true;
//       else if (recipient.groupName === 'everyone') {
//         broadcastAdmins = true;
//         broadcastCustomers = true;
//       }
//     }

//     const payload = this.serializeNotification(notif);

//     // Directly targeted users (by userId or resolved role membership)
//     targetUserIds.forEach((uid) => this.broadcastToUser(uid, 'notification:new', payload));

//     // Audience-wide groups: walk live connections directly rather than
//     // resolving every admin/customer user id up front.
//     if (broadcastAdmins || broadcastCustomers) {
//       const eventId = this.nextEventId();
//       for (const { client } of this.clients.values()) {
//         if (targetUserIds.has(client.userId)) continue; // avoid double delivery
//         // const eligible =
//         //   (broadcastAdmins && client.audience === 'admin') ||
//         //   (broadcastCustomers && client.audience === 'customer');
//         // if (eligible) {
//         this.sendEventToClient(client, 'notification:new', payload, eventId);
//         // }
//       }
//     }

//     this.broadcastCount++;
//     this.lastBroadcastTimestamp = Date.now();
//   }

//   /** Push a payload to every live connection belonging to a given user. */
//   private broadcastToUser(userId: string, eventName: string, data: unknown): void {
//     const connectionIds = this.userIndex.get(userId);
//     if (!connectionIds || connectionIds.size === 0) return; // not connected right now; already persisted

//     const eventId = this.nextEventId();
//     const dataString = JSON.stringify(data);
//     const payload = `id: ${eventId}\nevent: ${eventName}\ndata: ${dataString}\n\n`;

//     for (const connectionId of connectionIds) {
//       const entry = this.clients.get(connectionId);
//       if (entry) this.safeWrite(entry.client, payload);
//     }
//   }

//   private broadcastError(errorData: { message: string; timestamp: number }): void {
//     const eventId = `${Date.now()}-error`;
//     const payload = `id: ${eventId}\nevent: error\ndata: ${JSON.stringify(errorData)}\n\n`;
//     for (const { client } of this.clients.values()) {
//       this.safeWrite(client, payload);
//     }
//   }

//   private serializeNotification(notif: Notification): SerializedNotification {
//     return {
//       id: notif.id,
//       category: notif.category,
//       severity: notif.severity,
//       title: notif.title,
//       message: notif.message,
//       entityType: notif.entityType ?? null,
//       entityId: notif.entityId ?? null,
//       createdAt:
//         notif.createdAt instanceof Date ? notif.createdAt.toISOString() : String(notif.createdAt),
//       status: NotificationRecipientStatus.UNREAD,
//       actions: notif.actions.map((a) => ({
//         label: a.label,
//         type: a.type,
//         payload: a.payload ?? null,
//         permission: a.requiredPermissionKey ?? null,
//         btnOrder: a.btnOrder,
//       })),
//     };
//   }

//   private nextEventId(): string {
//     const seq = this.eventSequence;
//     this.eventSequence = (this.eventSequence % 1_000_000) + 1;
//     return `${Date.now()}-${seq}`;
//   }

//   private sendEventToClient(
//     client: SSEClient,
//     eventName: string,
//     data: unknown,
//     eventId: string,
//   ): void {
//     const payload = `id: ${eventId}\nevent: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
//     this.safeWrite(client, payload);
//   }

//   // ---------------------------------------------------------------------
//   // Initial unread sync (replaces the old dashboard-snapshot resync)
//   // ---------------------------------------------------------------------

//   /**
//    * On connect, send the client a one-time snapshot of their unread
//    * notifications (direct, role-based, and group-based) so the UI has
//    * something to render before the next live event arrives.
//    *
//    * NOTE: assumes `NotificationRecipient.notification` is the ManyToOne
//    * relation back to `Notification` — adjust the relation name below if
//    * your entity names it differently.
//    */
//   private async sendUnreadSnapshot(client: SSEClient): Promise<void> {
//     try {
//       const roleIds = client.roles && client.roles.length > 0 ? client.roles : [NIL_UUID];
//       // const groupNames: NotificationGroup[] =
//       // client.audience === 'admin' ? ['admins', 'everyone'] : ['customers', 'everyone'];

//       const recipients = await notificationRecipientRepo
//         .createQueryBuilder('recipient')
//         .innerJoinAndSelect('recipient.notification', 'notification')
//         .leftJoinAndSelect('notification.actions', 'actions')
//         .where('recipient.status = :status', { status: NotificationRecipientStatus.UNREAD })
//         .andWhere(
//           '(recipient.userId = :userId OR recipient.roleId IN (:...roleIds))',
//           // '(recipient.userId = :userId OR recipient.roleId IN (:...roleIds) OR recipient.groupName IN (:...groupNames))',
//           { userId: client.userId, roleIds, groupNames: null },
//         )
//         .orderBy('notification.createdAt', 'DESC')
//         .take(this.UNREAD_SYNC_LIMIT)
//         .getMany();

//       const notifications = recipients.map((r) => this.serializeNotification(r.notification));

//       this.sendEventToClient(
//         client,
//         'notification:sync',
//         { notifications, unreadCount: notifications.length },
//         this.nextEventId(),
//       );
//     } catch (err) {
//       logger.error({ err, clientId: client.id }, 'Failed to send unread notification snapshot');
//     }
//   }

//   // ---------------------------------------------------------------------
//   // Client lifecycle
//   // ---------------------------------------------------------------------

//   public addClient(client: SSEClient): void {
//     if (this.isShuttingDown) {
//       try {
//         client.res.status(503).end();
//       } catch {
//         // Ignore termination error on shutting down server
//       }
//       return;
//     }

//     const heartbeat = setInterval(() => {
//       try {
//         this.safeWrite(client, ':\n\n');
//       } catch (err) {
//         logger.error({ err, clientId: client.id }, 'Failed to send SSE heartbeat');
//         this.removeClient(client.id);
//       }
//     }, this.HEARTBEAT_INTERVAL_MS);

//     const onDisconnect = () => this.removeClient(client.id);
//     const onError = (err: Error) => {
//       logger.error({ err, clientId: client.id }, 'SSE response socket error');
//       this.removeClient(client.id);
//     };

//     client.res.on('close', onDisconnect);
//     client.res.on('error', onError);
//     if (client.req) {
//       client.req.on('close', onDisconnect);
//     }

//     const clientEntry: ClientEntry = {
//       client,
//       heartbeat,
//       drainTimeout: null,
//       isBackpressured: false,
//       onDisconnect,
//       onError,
//     };

//     this.clients.set(client.id, clientEntry);

//     let userConnections = this.userIndex.get(client.userId);
//     if (!userConnections) {
//       userConnections = new Set();
//       this.userIndex.set(client.userId, userConnections);
//     }
//     userConnections.add(client.id);

//     logger.info(
//       {
//         clientId: client.id,
//         userId: client.userId,
//         // audience: client.audience,
//         activeClients: this.clients.size,
//       },
//       'Notification SSE client connected',
//     );

//     this.safeWrite(client, `retry: ${this.RETRY_INTERVAL_MS}\n\n`);

//     void this.sendUnreadSnapshot(client);
//   }

//   public removeClient(clientId: string): void {
//     const entry = this.clients.get(clientId);
//     if (!entry) return;

//     clearInterval(entry.heartbeat);
//     if (entry.drainTimeout) {
//       clearTimeout(entry.drainTimeout);
//       entry.drainTimeout = null;
//     }

//     entry.client.res.removeListener('close', entry.onDisconnect);
//     entry.client.res.removeListener('error', entry.onError);
//     if (entry.client.req) {
//       entry.client.req.removeListener('close', entry.onDisconnect);
//     }

//     this.clients.delete(clientId);

//     const userConnections = this.userIndex.get(entry.client.userId);
//     if (userConnections) {
//       userConnections.delete(clientId);
//       if (userConnections.size === 0) {
//         this.userIndex.delete(entry.client.userId);
//       }
//     }

//     logger.info(
//       { clientId, activeClients: this.clients.size },
//       'Notification SSE client disconnected',
//     );

//     if (!entry.client.res.writableEnded && !entry.client.res.destroyed) {
//       try {
//         entry.client.res.end();
//       } catch {
//         // Ignore closing error
//       }
//     }
//   }

//   // ---------------------------------------------------------------------
//   // Write handling / backpressure
//   // ---------------------------------------------------------------------

//   private safeWrite(client: SSEClient, data: string): boolean {
//     if (client.res.destroyed || client.res.writableEnded) {
//       this.removeClient(client.id);
//       return false;
//     }

//     const ok = client.res.write(data);

//     if (typeof (client.res as unknown as { flush?: () => void }).flush === 'function') {
//       (client.res as unknown as { flush: () => void }).flush();
//     }

//     if (!ok) {
//       this.handleBackpressure(client);
//       return false;
//     }

//     return true;
//   }

//   private handleBackpressure(client: SSEClient): void {
//     const entry = this.clients.get(client.id);
//     if (!entry) return;

//     if (entry.isBackpressured) {
//       logger.warn(
//         { clientId: client.id },
//         'SSE client write buffer severely backpressured; disconnecting slow client',
//       );
//       this.removeClient(client.id);
//       return;
//     }

//     entry.isBackpressured = true;
//     logger.warn({ clientId: client.id }, 'SSE client write buffer full (backpressure detected)');

//     entry.drainTimeout = setTimeout(() => {
//       logger.warn(
//         { clientId: client.id },
//         'SSE client failed to drain buffer within timeout, disconnecting',
//       );
//       this.removeClient(client.id);
//     }, this.DRAIN_TIMEOUT_MS);

//     client.res.once('drain', () => {
//       const current = this.clients.get(client.id);
//       if (current) {
//         if (current.drainTimeout) {
//           clearTimeout(current.drainTimeout);
//           current.drainTimeout = null;
//         }
//         current.isBackpressured = false;
//         logger.debug({ clientId: client.id }, 'SSE client write buffer drained successfully');
//       }
//     });
//   }

//   // ---------------------------------------------------------------------
//   // Shutdown / diagnostics
//   // ---------------------------------------------------------------------

//   public shutdown(): void {
//     if (this.isShuttingDown) return;
//     this.isShuttingDown = true;

//     logger.info(
//       { clientCount: this.clients.size },
//       'Shutting down NotificationPublisher and disconnecting SSE clients',
//     );

//     for (const [, entry] of this.clients.entries()) {
//       clearInterval(entry.heartbeat);
//       if (entry.drainTimeout) {
//         clearTimeout(entry.drainTimeout);
//         entry.drainTimeout = null;
//       }

//       entry.client.res.removeListener('close', entry.onDisconnect);
//       entry.client.res.removeListener('error', entry.onError);
//       if (entry.client.req) {
//         entry.client.req.removeListener('close', entry.onDisconnect);
//       }

//       try {
//         const shutdownPayload = `id: ${Date.now()}-shutdown\nevent: shutdown\ndata: ${JSON.stringify({ message: 'Server is shutting down' })}\n\n`;
//         entry.client.res.write(shutdownPayload);
//         if (typeof (entry.client.res as unknown as { flush?: () => void }).flush === 'function') {
//           (entry.client.res as unknown as { flush: () => void }).flush();
//         }
//         entry.client.res.end();
//       } catch {
//         // Ignore termination errors on closing sockets
//       }
//     }

//     this.clients.clear();
//     this.userIndex.clear();
//     logger.info('NotificationPublisher shutdown completed');
//   }

//   public getConnectedClientsCount(): number {
//     return this.clients.size;
//   }

//   public getDiagnostics(): PublisherDiagnostics {
//     // let adminClients = 0;
//     // let customerClients = 0;
//     // for (const { client } of this.clients.values()) {
//     //   // if (client.audience === 'admin') adminClients++;
//     //   // else customerClients++;
//     // }

//     return {
//       connectedClients: this.clients.size,
//       connectedUsers: this.userIndex.size,
//       // adminClients,
//       // customerClients,
//       uptimeSeconds: Math.round(process.uptime()),
//       heartbeatIntervalMs: this.HEARTBEAT_INTERVAL_MS,
//       isShuttingDown: this.isShuttingDown,
//       broadcastCount: this.broadcastCount,
//       lastBroadcastTimestamp: this.lastBroadcastTimestamp
//         ? new Date(this.lastBroadcastTimestamp).toISOString()
//         : null,
//     };
//   }
// }

// export const notificationPublisher = new NotificationPublisher();
