// import { performance } from 'node:perf_hooks';

// // import {
// //   getCriticalAlertsData,
// //   getRevenueData,
// //   getSystemHealthData,
// //   getTenderData,
// //   getUsersData,
// // } from '../dashboard.service';

// import type { Request, Response } from 'express';
// import { logger } from '@/config/logger';
// import {
//   BillingPermissions,
//   DashboardPermissions,
//   SystemPermissions,
//   TenderPermissions,
//   UserPermissions,
// } from '@/constants/permissions';
// import { SUPER_ADMIN } from '@/core/constants';

// export interface SSEClient {
//   id: string;
//   res: Response;
//   req?: Request | undefined;
//   lastEventId?: string | undefined;
//   userId: string;
//   roles?: string[] | undefined;
//   permissions?: string[] | undefined;
// }

// export interface DashboardSnapshot {
//   tender: Awaited<ReturnType<typeof getTenderData>>;
//   revenue: Awaited<ReturnType<typeof getRevenueData>>;
//   user: Awaited<ReturnType<typeof getUsersData>>;
//   alerts: Awaited<ReturnType<typeof getCriticalAlertsData>>;
//   health: Awaited<ReturnType<typeof getSystemHealthData>>;
//   timestamp: number;
// }

// interface PreSerializedPayloads {
//   eventId: string;
//   alertsJson: string;
//   healthJson: string;
//   profilePayloadMap: Map<string, string>;
// }

// interface ClientEntry {
//   client: SSEClient;
//   heartbeat: NodeJS.Timeout;
//   drainTimeout: NodeJS.Timeout | null;
//   isBackpressured: boolean;
//   onDisconnect: () => void;
//   onError: (err: Error) => void;
// }

// export interface PublisherDiagnostics {
//   connectedClients: number;
//   activeClients: number;
//   uptimeSeconds: number;
//   cacheAgeMs: number | null;
//   pollIntervalMs: number;
//   heartbeatIntervalMs: number;
//   isPolling: boolean;
//   isShuttingDown: boolean;
//   hasCachedSnapshot: boolean;
//   cacheFresh: boolean;
//   pollCount: number;
//   failedPolls: number;
//   broadcastCount: number;
//   lastPollDurationMs: number;
//   averagePollDurationMs: number;
//   lastPollTimestamp: string | null;
//   lastBroadcastTimestamp: string | null;
// }

// /**
//  * Dashboard Publisher for real-time SSE stream.
//  *
//  * Implements a Publisher-Subscriber pattern with:
//  * - Non-overlapping sequential polling cycle with 5-second interval
//  * - In-memory snapshot cache with TTL expiration (15s) and equality checking
//  * - Centralized client lifecycle management with defensive listener cleanup and Last-Event-ID resync
//  * - Fan-out broadcaster with permission-profile-based JSON serialization caching
//  * - Backpressure tracking and automatic teardown of sluggish client streams
//  * - Explicit SSE protocol adherence (retry hint, bounded unique event IDs starting at 1, error events)
//  * - Compression middleware flush handling to prevent buffer stalling
//  * - Graceful shutdown orchestration for connection draining
//  * - Internal telemetry and operational diagnostics
//  */
// class DashboardPublisher {
//   private readonly clients: Map<string, ClientEntry> = new Map();
//   private pollerTimer: NodeJS.Timeout | null = null;
//   private snapshotCache: DashboardSnapshot | null = null;
//   private isPolling = false;
//   private isShuttingDown = false;
//   private eventSequence = 1;

//   private readonly POLL_INTERVAL_MS = 5000;
//   private readonly HEARTBEAT_INTERVAL_MS = 15000;
//   private readonly SNAPSHOT_CACHE_TTL_MS = 15000;
//   private readonly DRAIN_TIMEOUT_MS = 5000;
//   private readonly RETRY_INTERVAL_MS = 5000;

//   // Operational metrics
//   private pollCount = 0;
//   private failedPolls = 0;
//   private broadcastCount = 0;
//   private totalPollDurationMs = 0;
//   private lastPollDurationMs = 0;
//   private lastPollTimestamp = 0;
//   private lastBroadcastTimestamp = 0;

//   /**
//    * Register a new SSE client and manage its lifecycle
//    */
//   public addClient(client: SSEClient): void {
//     if (this.isShuttingDown) {
//       try {
//         client.res.status(503).end();
//       } catch {
//         // Ignore termination error on shutting down server
//       }
//       return;
//     }

//     // 1. Setup heartbeat keep-alive
//     const heartbeat = setInterval(() => {
//       try {
//         this.safeWrite(client, ':\n\n');
//       } catch (err) {
//         logger.error({ err, clientId: client.id }, 'Failed to send SSE heartbeat');
//         this.removeClient(client.id);
//       }
//     }, this.HEARTBEAT_INTERVAL_MS);

//     // 2. Centralized disconnect handlers on response and request
//     const onDisconnect = () => {
//       this.removeClient(client.id);
//     };

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
//     logger.info(
//       {
//         clientId: client.id,
//         activeClients: this.clients.size,
//         lastEventId: client.lastEventId ?? null,
//       },
//       'Dashboard SSE client connected',
//     );

//     // 3. Send single retry hint (milliseconds) to inform client reconnection interval
//     this.safeWrite(client, `retry: ${this.RETRY_INTERVAL_MS}\n\n`);

//     // 4. Handle Last-Event-ID state resynchronization or send fresh snapshot
//     if (this.snapshotCache && this.isSnapshotFresh(this.snapshotCache)) {
//       const clientLastTimestamp = client.lastEventId
//         ? parseInt(client.lastEventId.split('-')[0] ?? '0', 10)
//         : 0;

//       // If client didn't specify Last-Event-ID or cache is newer than client's last seen event
//       if (!clientLastTimestamp || this.snapshotCache.timestamp > clientLastTimestamp) {
//         this.sendSnapshotToClient(client, this.snapshotCache);
//       }
//     } else {
//       void this.pollAndBroadcast();
//     }

//     // 5. Ensure non-overlapping polling loop is running
//     this.startPoller();
//   }

//   /**
//    * Unregister an SSE client, clean up event listeners, and free associated network resources
//    */
//   public removeClient(clientId: string): void {
//     const entry = this.clients.get(clientId);
//     if (!entry) return;

//     clearInterval(entry.heartbeat);
//     if (entry.drainTimeout) {
//       clearTimeout(entry.drainTimeout);
//       entry.drainTimeout = null;
//     }

//     // Defensive listener removal to prevent any lingering references
//     entry.client.res.removeListener('close', entry.onDisconnect);
//     entry.client.res.removeListener('error', entry.onError);
//     if (entry.client.req) {
//       entry.client.req.removeListener('close', entry.onDisconnect);
//     }

//     this.clients.delete(clientId);
//     logger.info(
//       { clientId, activeClients: this.clients.size },
//       'Dashboard SSE client disconnected',
//     );

//     if (!entry.client.res.writableEnded && !entry.client.res.destroyed) {
//       try {
//         entry.client.res.end();
//       } catch {
//         // Ignore closing error
//       }
//     }

//     // Naturally pause polling and invalidate cache when no clients remain connected
//     if (this.clients.size === 0) {
//       this.stopPoller();
//       this.snapshotCache = null;
//     }
//   }

//   /**
//    * Start non-overlapping polling loop if not already running
//    */
//   private startPoller(): void {
//     if (this.pollerTimer || this.clients.size === 0 || this.isShuttingDown) return;

//     this.scheduleNextPoll(this.POLL_INTERVAL_MS);
//     logger.info('Dashboard poller started (interval: 5s)');
//   }

//   /**
//    * Schedules the next polling execution sequentially to prevent interval overlapping
//    */
//   private scheduleNextPoll(delayMs = this.POLL_INTERVAL_MS): void {
//     if (this.isShuttingDown || this.clients.size === 0) return;

//     if (this.pollerTimer) {
//       clearTimeout(this.pollerTimer);
//       this.pollerTimer = null;
//     }

//     this.pollerTimer = setTimeout(async () => {
//       this.pollerTimer = null;
//       try {
//         await this.pollAndBroadcast();
//       } finally {
//         if (this.clients.size > 0 && !this.isShuttingDown) {
//           this.scheduleNextPoll(this.POLL_INTERVAL_MS);
//         }
//       }
//     }, delayMs);
//   }

//   /**
//    * Stop polling loop when no clients are connected
//    */
//   private stopPoller(): void {
//     if (this.pollerTimer) {
//       clearTimeout(this.pollerTimer);
//       this.pollerTimer = null;
//       logger.info('Dashboard poller stopped (no connected clients)');
//     }
//   }

//   /**
//    * Poll DB for latest metrics, update cache, and broadcast to all connected clients
//    */
//   public async pollAndBroadcast(): Promise<void> {
//     if (this.isPolling || this.clients.size === 0 || this.isShuttingDown) return;
//     this.isPolling = true;

//     const pollStartTime = performance.now();
//     this.lastPollTimestamp = Date.now();
//     this.pollCount++;

//     try {
//       const [tender, revenue, user, alerts, health] = await Promise.all([
//         getTenderData(),
//         getRevenueData(),
//         getUsersData(),
//         getCriticalAlertsData(),
//         getSystemHealthData(),
//       ]);

//       const pollDuration = Math.round(performance.now() - pollStartTime);
//       this.lastPollDurationMs = pollDuration;
//       this.totalPollDurationMs += pollDuration;

//       const nextData = { tender, revenue, user, alerts, health };

//       // Snapshot equality check: avoid redundant broadcasts if metrics have not changed
//       if (this.snapshotCache && this.isSnapshotEqual(this.snapshotCache, nextData)) {
//         this.snapshotCache.timestamp = Date.now();
//         logger.debug({ pollDuration }, 'Dashboard snapshot unchanged; skipped broadcast');
//         return;
//       }

//       this.snapshotCache = {
//         ...nextData,
//         timestamp: Date.now(),
//       };

//       this.broadcast(this.snapshotCache);
//       this.broadcastCount++;
//       this.lastBroadcastTimestamp = Date.now();
//     } catch (err) {
//       this.failedPolls++;
//       logger.error({ err }, 'Error during dashboard poll cycle');
//       this.broadcastError({
//         message: 'Failed to refresh dashboard snapshot',
//         timestamp: Date.now(),
//       });
//     } finally {
//       this.isPolling = false;
//     }
//   }

//   /**
//    * Broadcast cached snapshot to all connected clients with permission-profile-based serialization caching
//    */
//   private broadcast(snapshot: DashboardSnapshot): void {
//     const seq = this.eventSequence;
//     this.eventSequence = (this.eventSequence % 1_000_000) + 1;
//     const eventId = `${snapshot.timestamp}-${seq}`;

//     // Pre-serialize shared payloads and maintain a profile cache for permission groups
//     const preSerialized: PreSerializedPayloads = {
//       eventId,
//       alertsJson: JSON.stringify(snapshot.alerts),
//       healthJson: JSON.stringify(snapshot.health),
//       profilePayloadMap: new Map<string, string>(),
//     };

//     for (const { client } of this.clients.values()) {
//       this.sendSnapshotToClient(client, snapshot, preSerialized);
//     }
//   }

//   /**
//    * Broadcast error event to all connected clients
//    */
//   private broadcastError(errorData: { message: string; timestamp: number }): void {
//     const eventId = `${Date.now()}-error`;
//     const payload = `id: ${eventId}\nevent: error\ndata: ${JSON.stringify(errorData)}\n\n`;

//     for (const { client } of this.clients.values()) {
//       this.safeWrite(client, payload);
//     }
//   }

//   /**
//    * Send snapshot events to a specific client based on their permissions/roles with profile serialization caching
//    */
//   // eslint-disable-next-line complexity, sonarjs/cognitive-complexity
//   private sendSnapshotToClient(
//     client: SSEClient,
//     snapshot: DashboardSnapshot,
//     preSerialized?: PreSerializedPayloads,
//   ): void {
//     try {
//       if (client.res.destroyed || client.res.writableEnded) {
//         this.removeClient(client.id);
//         return;
//       }

//       const clientRoles = client.roles ?? [];
//       const clientPermissions = client.permissions ?? [];
//       const isSuperAdmin = clientRoles.includes(SUPER_ADMIN);
//       const hasPermission = (permission: string) =>
//         isSuperAdmin || clientPermissions.includes(permission);

//       // Permission filtering on snapshot fields using strict permission constants
//       const canViewTender = hasPermission(TenderPermissions.VIEW.key);
//       const canViewRevenue = hasPermission(BillingPermissions.VIEW.key);
//       const canViewUser = hasPermission(UserPermissions.VIEW.key);
//       const canViewAlerts = hasPermission(DashboardPermissions.VIEW.key);
//       const canViewHealth =
//         hasPermission(SystemPermissions.VIEW.key) || hasPermission(DashboardPermissions.VIEW.key);

//       let eventId: string;
//       if (preSerialized) {
//         ({ eventId } = preSerialized);
//       } else {
//         const seq = this.eventSequence;
//         this.eventSequence = (this.eventSequence % 1_000_000) + 1;
//         eventId = `${snapshot.timestamp}-${seq}`;
//       }

//       // Permission profile caching: clients with identical permission profiles share the exact same serialized payload
//       const profileKey = `${canViewTender ? '1' : '0'}:${canViewRevenue ? '1' : '0'}:${canViewUser ? '1' : '0'}:${canViewAlerts ? '1' : '0'}:${canViewHealth ? '1' : '0'}`;

//       let dashboardPayload: string;
//       if (preSerialized?.profilePayloadMap.has(profileKey)) {
//         dashboardPayload = preSerialized.profilePayloadMap.get(profileKey)!;
//       } else {
//         const filteredSnapshot: Partial<DashboardSnapshot> & { timestamp: number } = {
//           timestamp: snapshot.timestamp,
//           ...(canViewTender ? { tender: snapshot.tender } : {}),
//           ...(canViewRevenue ? { revenue: snapshot.revenue } : {}),
//           ...(canViewUser ? { user: snapshot.user } : {}),
//           ...(canViewAlerts ? { alerts: snapshot.alerts } : {}),
//           ...(canViewHealth ? { health: snapshot.health } : {}),
//         };
//         dashboardPayload = JSON.stringify(filteredSnapshot);
//         if (preSerialized) {
//           preSerialized.profilePayloadMap.set(profileKey, dashboardPayload);
//         }
//       }

//       // Emit primary filtered dashboard snapshot event with event ID
//       this.sendEventToClient(client, 'dashboard', dashboardPayload, eventId, true);

//       // Emit granular alerts event if permitted (reusing pre-serialized JSON if available)
//       if (canViewAlerts) {
//         const alertsData = preSerialized ? preSerialized.alertsJson : snapshot.alerts;
//         this.sendEventToClient(
//           client,
//           'alerts',
//           alertsData,
//           `${eventId}-alerts`,
//           Boolean(preSerialized),
//         );
//       }

//       // Emit granular health telemetry event if permitted (reusing pre-serialized JSON if available)
//       if (canViewHealth) {
//         const healthData = preSerialized ? preSerialized.healthJson : snapshot.health;
//         this.sendEventToClient(
//           client,
//           'health',
//           healthData,
//           `${eventId}-health`,
//           Boolean(preSerialized),
//         );
//       }
//     } catch (err) {
//       logger.error({ err, clientId: client.id }, 'Failed to send snapshot to SSE client');
//       this.removeClient(client.id);
//     }
//   }

//   /**
//    * Send a formatted SSE event with event ID to client
//    */
//   private sendEventToClient(
//     client: SSEClient,
//     eventName: string,
//     data: unknown,
//     eventId: string,
//     isPreSerialized = false,
//   ): void {
//     const dataString = isPreSerialized ? (data as string) : JSON.stringify(data);
//     const payload = `id: ${eventId}\nevent: ${eventName}\ndata: ${dataString}\n\n`;
//     this.safeWrite(client, payload);
//   }

//   /**
//    * Safely write to client stream with Express compression flush and backpressure detection
//    */
//   private safeWrite(client: SSEClient, data: string): boolean {
//     if (client.res.destroyed || client.res.writableEnded) {
//       this.removeClient(client.id);
//       return false;
//     }

//     const ok = client.res.write(data);

//     // Compression check: if Express compression middleware is enabled, flush buffered chunks immediately
//     if (typeof (client.res as unknown as { flush?: () => void }).flush === 'function') {
//       (client.res as unknown as { flush: () => void }).flush();
//     }

//     // Check write backpressure
//     if (!ok) {
//       this.handleBackpressure(client);
//       return false;
//     }

//     return true;
//   }

//   /**
//    * Handles write backpressure to prevent unbounded buffer growth on slow connections
//    */
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

//   /**
//    * Evaluates if cached snapshot is still fresh (within TTL)
//    */
//   private isSnapshotFresh(snapshot: DashboardSnapshot | null): snapshot is DashboardSnapshot {
//     if (!snapshot) return false;
//     return Date.now() - snapshot.timestamp < this.SNAPSHOT_CACHE_TTL_MS;
//   }

//   /**
//    * Helper for deep data equality comparison
//    */
//   private isDataEqual(a: unknown, b: unknown): boolean {
//     if (a === b) return true;
//     if (!a || !b) return false;
//     return JSON.stringify(a) === JSON.stringify(b);
//   }

//   /**
//    * Snapshot equality: Check whether metrics data has changed since previous snapshot.
//    * Compares structured fields efficiently and compares full health object (excluding volatile generatedAt timestamp).
//    *
//    * [MAINTAINABILITY WARNING]
//    * Keep this comparison in sync with DashboardSnapshot fields.
//    * If new fields or metrics are added to getTenderData(), getRevenueData(), or getUsersData(),
//    * remember to update the corresponding equality checks below.
//    */
//   private isSnapshotEqual(
//     prev: DashboardSnapshot | null,
//     next: {
//       tender: DashboardSnapshot['tender'];
//       revenue: DashboardSnapshot['revenue'];
//       user: DashboardSnapshot['user'];
//       alerts: DashboardSnapshot['alerts'];
//       health: DashboardSnapshot['health'];
//     },
//   ): boolean {
//     if (!prev) return false;

//     // Fast-path shallow comparisons on counter objects
//     const isTenderEqual =
//       prev.tender.DRAFT === next.tender.DRAFT &&
//       prev.tender.UNDER_REVIEW === next.tender.UNDER_REVIEW &&
//       prev.tender.PUBLISHED === next.tender.PUBLISHED &&
//       prev.tender.CLOSING_TODAY === next.tender.CLOSING_TODAY &&
//       prev.tender.AWARDED === next.tender.AWARDED &&
//       prev.tender.ARCHIVED === next.tender.ARCHIVED;
//     if (!isTenderEqual) return false;

//     const isRevenueEqual =
//       prev.revenue.monthlyRevenue === next.revenue.monthlyRevenue &&
//       prev.revenue.mrr === next.revenue.mrr &&
//       prev.revenue.arr === next.revenue.arr &&
//       prev.revenue.averagePlanValue === next.revenue.averagePlanValue &&
//       prev.revenue.growthThisMonth === next.revenue.growthThisMonth &&
//       prev.revenue.activeCount === next.revenue.activeCount;
//     if (!isRevenueEqual) return false;

//     const isUserEqual =
//       prev.user.totalUsers === next.user.totalUsers &&
//       prev.user.admins === next.user.admins &&
//       prev.user.pendingApprovals === next.user.pendingApprovals &&
//       prev.user.blockedUsers === next.user.blockedUsers;
//     if (!isUserEqual) return false;

//     // Full health comparison excluding generatedAt (which naturally updates on every check)
//     const { generatedAt: _prevGen, ...prevHealthRest } = prev.health;
//     const { generatedAt: _nextGen, ...nextHealthRest } = next.health;
//     if (!this.isDataEqual(prevHealthRest, nextHealthRest)) return false;

//     // Critical alerts comparison
//     if (!this.isDataEqual(prev.alerts, next.alerts)) return false;

//     return true;
//   }

//   /**
//    * Graceful shutdown: Disconnects all active SSE clients cleanly and stops timers
//    */
//   public shutdown(): void {
//     if (this.isShuttingDown) return;
//     this.isShuttingDown = true;

//     logger.info(
//       { clientCount: this.clients.size },
//       'Shutting down DashboardPublisher and disconnecting SSE clients',
//     );

//     this.stopPoller();

//     for (const [, entry] of this.clients.entries()) {
//       clearInterval(entry.heartbeat);
//       if (entry.drainTimeout) {
//         clearTimeout(entry.drainTimeout);
//         entry.drainTimeout = null;
//       }

//       // Clean up event listeners
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
//     this.snapshotCache = null;
//     logger.info('DashboardPublisher shutdown completed');
//   }

//   /**
//    * Return number of currently connected SSE clients
//    */
//   public getConnectedClientsCount(): number {
//     return this.clients.size;
//   }

//   /**
//    * Return the latest cached dashboard snapshot
//    */
//   public getSnapshotCache(): DashboardSnapshot | null {
//     return this.snapshotCache;
//   }

//   /**
//    * Expose operational diagnostics and metrics
//    */
//   public getDiagnostics(): PublisherDiagnostics {
//     const avgPollTime =
//       this.pollCount > 0 ? Math.round(this.totalPollDurationMs / this.pollCount) : 0;
//     const now = Date.now();
//     const cacheAgeMs = this.snapshotCache ? now - this.snapshotCache.timestamp : null;

//     return {
//       connectedClients: this.clients.size,
//       activeClients: this.clients.size,
//       uptimeSeconds: Math.round(process.uptime()),
//       cacheAgeMs,
//       pollIntervalMs: this.POLL_INTERVAL_MS,
//       heartbeatIntervalMs: this.HEARTBEAT_INTERVAL_MS,
//       isPolling: this.isPolling,
//       isShuttingDown: this.isShuttingDown,
//       hasCachedSnapshot: this.snapshotCache !== null,
//       cacheFresh: this.isSnapshotFresh(this.snapshotCache),
//       pollCount: this.pollCount,
//       failedPolls: this.failedPolls,
//       broadcastCount: this.broadcastCount,
//       lastPollDurationMs: this.lastPollDurationMs,
//       averagePollDurationMs: avgPollTime,
//       lastPollTimestamp: this.lastPollTimestamp
//         ? new Date(this.lastPollTimestamp).toISOString()
//         : null,
//       lastBroadcastTimestamp: this.lastBroadcastTimestamp
//         ? new Date(this.lastBroadcastTimestamp).toISOString()
//         : null,
//     };
//   }
// }

// export const dashboardPublisher = new DashboardPublisher();
