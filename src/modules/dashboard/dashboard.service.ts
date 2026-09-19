// import * as os from 'node:os';
// import { performance } from 'node:perf_hooks';

// import pidusage from 'pidusage';
// import { In } from 'typeorm';

// import * as layoutService from './layout/services/layout.service';
// import * as migrationService from './layout/services/migration.service';
// import * as widgetService from './layout/services/widget.service';
// import { dashboardPublisher, type SSEClient } from './services/publisher.service';

// import type { BuildDashboardResponse, PatchLayoutDto } from './dashboard.dto';
// // import type { DashboardWidget } from '@/database/entities/UserDashboardLayout';
// import type { DashboardTheme } from '@/types/enums';
// import { AppDataSource } from '@/config/database';
// // import { AuditLog } from '@/database/entities/AuditLog';
// // import { ExportJob } from '@/database/entities/ExportJob';
// // import { SecurityLog } from '@/database/entities/SecurityLog';
// import { Subscription } from '@/database/entities/Subscription';
// import { Tender } from '@/database/entities/Tender';
// // import { TenderVersion } from '@/database/entities/TenderVersion';
// import { Transaction } from '@/database/entities/Transaction';
// import { User } from '@/database/entities/User';
// // import { UserDashboardLayout } from '@/database/entities/UserDashboardLayout';
// import { CacheService } from '@/services/cache.service';
// import {
//   AccountType,
//   AuditSeverity,
//   AuditStatus,
//   ExportJobStatus,
//   SecurityEvent,
//   SubscriptionStatus,
//   TenderBiddingStatus,
//   TenderLifecycleStatus,
//   TenderProcessStatus,
//   TenderPublicationStatus,
//   TenderVersionStatus,
//   TransactionStatus,
//   UserStatus,
// } from '@/types/enums';

// const tenderRepo = AppDataSource.getRepository(Tender);
// // const tenderVersionRepo = AppDataSource.getRepository(TenderVersion);
// // const auditLogsRepo = AppDataSource.getRepository(AuditLog);
// const subscriptionRepo = AppDataSource.getRepository(Subscription);
// const transactionRepo = AppDataSource.getRepository(Transaction);
// // const securityLogRepo = AppDataSource.getRepository(SecurityLog);
// // const exportJobRepo = AppDataSource.getRepository(ExportJob);

// export function addSSEClient(client: SSEClient) {
//   dashboardPublisher.addClient(client);
// }

// export function getStreamDiagnostics() {
//   return dashboardPublisher.getDiagnostics();
// }

// // export function broadcastSSE(event: string, data: any, requiredPermission?: string) {
// //   const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
// //   sseClients.forEach((client) => {
// //     if (
// //       !requiredPermission
// //       // client.permissions.includes(requiredPermission) ??
// //       // client.roles.includes('super-admin')
// //     ) {
// //       client.res.write(payload);
// //     }
// //   });
// // }

// // ─── Services Orchestrator ────────────────────────────────────────────────────

// // const layoutRepo = AppDataSource.getRepository(UserDashboardLayout);

// async function buildDashboardResponse(
//   layout: UserDashboardLayout,
//   adminPermissions: string[],
//   roles: string[],
// ) {
//   // Upgrade if needed
//   layout = migrationService.migrateLayout(layout);

//   // Merge registry with user layout
//   const dashboard = widgetService.buildDashboardWidgets(layout, adminPermissions, roles);

//   return {
//     theme: layout.theme,
//     layoutVersion: layout.layoutVersion,
//     widgets: dashboard,
//   };
// }

// export async function getDashboardConfig(
//   userId: string,
//   adminPermissions: string[],
//   roles: string[],
// ) {
//   const layout = await layoutService.getOrCreateLayout(userId);

//   return buildDashboardResponse(layout, adminPermissions, roles);
// }

// export async function resetDashboardLayout(
//   userId: string,
//   adminPermissions: string[],
//   roles: string[],
// ): Promise<BuildDashboardResponse> {
//   const layout = await layoutService.resetToDefault(userId);

//   return buildDashboardResponse(layout, adminPermissions, roles);
// }

// export async function updateDashboardLayout(
//   userId: string,
//   widgets: PatchLayoutDto['widgets'],
//   theme?: DashboardTheme,
// ) {
//   const layout = await layoutRepo.findOneOrFail({ where: { userId } });

//   layout.widgets = layout.widgets.map((w: DashboardWidget) => {
//     const updated = widgets.find((uw) => uw.id === w.id);
//     if (updated) {
//       return {
//         ...w,
//         ...updated,
//       } as DashboardWidget;
//     }
//     return w;
//   });
//   if (theme) layout.theme = theme;

//   return layoutRepo.save(layout);
// }

// // ─── Composition Widgets Data APIs ──────────────────────────────────────────

// export async function getTenderData() {
//   const draftCount = await tenderVersionRepo.count({
//     where: { status: TenderVersionStatus.DRAFT },
//   });
//   const underReviewCount = await tenderVersionRepo.count({
//     where: { status: TenderVersionStatus.UNDER_REVIEW },
//   });

//   const publishedCount = await tenderRepo.count({
//     where: { publicationStatus: TenderPublicationStatus.PUBLISHED },
//   });
//   const openCount = await tenderRepo.count({
//     where: { biddingStatus: TenderBiddingStatus.OPEN },
//   });

//   const awardedCount = await tenderRepo.count({
//     where: { processStatus: TenderProcessStatus.AWARDED },
//   });
//   const archivedCount = await tenderRepo.count({
//     where: { status: TenderLifecycleStatus.ARCHIVED },
//   });

//   // Calculate closing today (closingDate is today)
//   const todayStart = new Date();
//   todayStart.setHours(0, 0, 0, 0);
//   const todayEnd = new Date();
//   todayEnd.setHours(23, 59, 59, 999);

//   const closingTodayCount = await tenderRepo
//     .createQueryBuilder('tender')
//     .leftJoin('tender.activeVersion', 'activeVersion')
//     .where('activeVersion.closingDate BETWEEN :todayStart AND :todayEnd', { todayStart, todayEnd })
//     .getCount();

//   return {
//     DRAFT: draftCount,
//     UNDER_REVIEW: underReviewCount,
//     PUBLISHED: publishedCount + openCount,
//     CLOSING_TODAY: closingTodayCount,
//     AWARDED: awardedCount,
//     ARCHIVED: archivedCount,
//   };
// }

// export async function getRevenueData() {
//   const subRepo = AppDataSource.getRepository(Subscription);
//   const activeSubs = await subRepo.find({
//     where: { status: SubscriptionStatus.ACTIVE },
//     relations: {
//       planVersion: true,
//     },
//   });

//   let totalMRR = 0;
//   const activeCount = activeSubs.length;

//   activeSubs.forEach((sub) => {
//     // if (sub.planVersion) {
//     const planPriceCents = sub.planVersion.priceCents;
//     const { durationDays } = sub.planVersion;

//     if (durationDays >= 360) {
//       totalMRR += planPriceCents / 12 / 100;
//     } else {
//       totalMRR += planPriceCents / 100;
//     }
//     // }
//   });

//   const totalARR = totalMRR * 12;
//   const avgPlanValue = activeCount > 0 ? totalMRR / activeCount : 0;

//   // Let's get subscription growth this month
//   const thisMonthStart = new Date();
//   thisMonthStart.setDate(1);
//   thisMonthStart.setHours(0, 0, 0, 0);

//   const thisMonthSubs = await subRepo
//     .createQueryBuilder('sub')
//     .where('sub.createdAt >= :thisMonthStart', { thisMonthStart })
//     .getCount();

//   return {
//     monthlyRevenue: totalMRR,
//     mrr: totalMRR,
//     arr: totalARR,
//     averagePlanValue: avgPlanValue,
//     growthThisMonth: thisMonthSubs,
//     activeCount,
//   };
// }

// export async function getUsersData() {
//   const userRepo = AppDataSource.getRepository(User);

//   const totalUsers = await userRepo.count();
//   const admins = await userRepo.count({ where: { accountType: AccountType.ADMIN } });
//   const pendingApprovals = await userRepo.count({ where: { status: UserStatus.PENDING_APPROVAL } });
//   const blockedUsers = await userRepo.count({ where: { isBlocked: true } });

//   return {
//     totalUsers,
//     admins,
//     pendingApprovals,
//     blockedUsers,
//   };
// }

// export async function getCriticalAlertsData() {
//   const todayStart = new Date();
//   todayStart.setHours(0, 0, 0, 0);
//   const todayEnd = new Date();
//   todayEnd.setHours(23, 59, 59, 999);

//   // 1. Security Threats: dynamic count of suspicious activities, failed logins, or critical audits today
//   const securityThreatsCount = await securityLogRepo
//     .createQueryBuilder('sec')
//     .where('sec.createdAt >= :todayStart', { todayStart })
//     .andWhere('sec.event IN (:...threatEvents)', {
//       threatEvents: [
//         SecurityEvent.LOGIN_FAILED,
//         SecurityEvent.UNAUTHORIZED_ACCESS,
//         SecurityEvent.SUSPICIOUS_ACTIVITY,
//         SecurityEvent.ACCOUNT_LOCKED,
//       ],
//     })
//     .getCount();

//   const criticalAuditsCount = await auditLogsRepo
//     .createQueryBuilder('audit')
//     .where('audit.createdAt >= :todayStart', { todayStart })
//     .andWhere('audit.severity = :criticalSeverity', {
//       criticalSeverity: AuditSeverity.CRITICAL,
//     })
//     .getCount();

//   const securityAlerts = securityThreatsCount + criticalAuditsCount;

//   // 2. Failed Payments: dynamic count of failed transactions
//   const failedPayments = await transactionRepo.count({
//     where: { status: TransactionStatus.FAILED },
//   });

//   // 3. Expired Subscriptions: dynamic count of expired subscriptions
//   const expiredSubscriptions = await subscriptionRepo.count({
//     where: { status: SubscriptionStatus.EXPIRED },
//   });

//   // 4. Closing Tenders Today: dynamic count of published & open tenders closing today
//   const closingTenders = await tenderRepo
//     .createQueryBuilder('tender')
//     .leftJoin('tender.activeVersion', 'activeVersion')
//     .where('tender.publicationStatus = :publishedStatus', {
//       publishedStatus: TenderPublicationStatus.PUBLISHED,
//     })
//     .andWhere('tender.biddingStatus = :biddingOpenStatus', {
//       biddingOpenStatus: TenderBiddingStatus.OPEN,
//     })
//     .andWhere('activeVersion.closingDate BETWEEN :todayStart AND :todayEnd', {
//       todayStart,
//       todayEnd,
//     })
//     .getCount();

//   // 5. Database System Errors: dynamic count of audit logs with ERROR/FAILURE plus DB connectivity state
//   const auditErrorsCount = await auditLogsRepo
//     .createQueryBuilder('log')
//     .where('log.createdAt >= :todayStart', { todayStart })
//     .andWhere('(log.severity = :errorSeverity OR log.status = :failureStatus)', {
//       errorSeverity: AuditSeverity.ERROR,
//       failureStatus: AuditStatus.FAILURE,
//     })
//     .getCount();

//   const dbOfflineWarning = AppDataSource.isInitialized ? 0 : 1;
//   const systemErrors = auditErrorsCount + dbOfflineWarning;

//   return [
//     {
//       type: 'security',
//       label: 'Security Threats',
//       value: securityAlerts,
//     },
//     {
//       type: 'billing',
//       label: 'Failed Payments',
//       value: failedPayments,
//     },
//     {
//       label: 'Expired Subscriptions',
//       value: expiredSubscriptions,
//       type: 'billing',
//     },
//     {
//       label: 'Closing Tenders Today',
//       value: closingTenders,
//       type: 'tender',
//     },
//     {
//       label: 'Database System Errors',
//       value: systemErrors,
//       type: 'system',
//     },
//   ];
// }

// // export async function getRecentActivityData() {
// //   const logRepo = AppDataSource.getRepository(AuditLog);
// //   const rawLogs = await logRepo.find({
// //     order: { createdAt: 'DESC' },
// //     take: 10,
// //   });

// //   return rawLogs.map((log) => {
// //     const friendlyText = (() => {
// //       switch (log.action) {
// //         case 'auth.login':
// //           return `User logged in from IP ${log.ipAddress}`;

// //         case 'auth.login_failed':
// //           return `Failed login attempt from IP ${log.ipAddress}`;

// //         case 'tender.create':
// //           return 'New Tender registered';

// //         case 'tender.publish':
// //           return 'Tender published successfully';

// //         case 'role.create':
// //           return 'New security role created';

// //         case 'subscription.create':
// //           return 'Subscription purchased';

// //         case 'subscription.upgrade':
// //           return 'Subscription upgraded';

// //         default:
// //           return `${log.action} performed in ${log.module}`;
// //       }
// //     })();

// //     return {
// //       id: log.id,
// //       timestamp: log.createdAt,
// //       description: friendlyText,
// //     };
// //   });
// // }

// const getUsageStatus = (value: number) => {
//   if (value >= 90) return 'critical';
//   if (value >= 75) return 'warning';
//   return 'healthy';
// };

// export async function getSystemHealthData() {
//   // 1. Dynamic Database Status & Ping Latency
//   const dbStart = performance.now();
//   let databaseStatus = 'Healthy';
//   try {
//     if (AppDataSource.isInitialized) {
//       await AppDataSource.query('SELECT 1');
//     } else {
//       databaseStatus = 'Offline';
//     }
//   } catch {
//     databaseStatus = 'Degraded';
//   }
//   const dbLatencyMs = Math.round(performance.now() - dbStart);
//   const apiLatencyMs = Math.max(1, dbLatencyMs);

//   // 2. Dynamic Background Queue Size (Pending or running background jobs)
//   let queueSize: number;
//   try {
//     queueSize = await exportJobRepo.count({
//       where: {
//         status: In([ExportJobStatus.PENDING, ExportJobStatus.PROCESSING, ExportJobStatus.RUNNING]),
//       },
//     });
//   } catch {
//     queueSize = 0;
//   }

//   // 3. Dynamic Redis Cache Status
//   let redisStatus: string;
//   try {
//     const pingKey = 'health_check_ping';
//     await CacheService.set(pingKey, 'pong', 5);
//     const pingRes = await CacheService.get<string>(pingKey);
//     redisStatus = pingRes === 'pong' ? 'Healthy' : 'Degraded';
//   } catch {
//     redisStatus = 'Degraded';
//   }

//   // 4. Memory Usage
//   const freeMem = os.freemem();
//   const totalMem = os.totalmem();
//   const memoryUsagePercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

//   // 5. CPU Usage & Process Memory
//   let cpuUsagePercent: number;
//   let memoryUsageMb: number;

//   try {
//     const stats = await pidusage(process.pid);
//     cpuUsagePercent = Math.min(100, Math.max(0, Math.round(stats.cpu)));
//     memoryUsageMb = Math.round(stats.memory / 1024 / 1024);
//   } catch {
//     const mem = process.memoryUsage();
//     memoryUsageMb = Math.round(mem.rss / 1024 / 1024);
//     cpuUsagePercent = Math.min(100, Math.round((os.loadavg()[0] ?? 0) * 10));
//   }

//   // 6. 1-minute load average (with Windows fallback)
//   const rawLoad = os.loadavg()[0] ?? 0;
//   const loadAverage1m =
//     rawLoad > 0 ? Number(rawLoad.toFixed(2)) : Number((cpuUsagePercent / 100).toFixed(2));

//   // 7. Storage Usage Percentage (estimated based on host metrics)
//   const storageUsagePercent = Math.min(
//     95,
//     Math.max(10, Math.round(((totalMem - freeMem) / totalMem) * 80)),
//   );

//   return {
//     generatedAt: new Date().toISOString(),
//     metrics: [
//       {
//         type: 'apiLatency',
//         label: 'API Latency',
//         value: apiLatencyMs,
//         unit: 'ms',
//         status: apiLatencyMs < 200 ? 'healthy' : 'warning',
//       },
//       {
//         type: 'queueSize',
//         label: 'Background Queue',
//         value: queueSize,
//         unit: 'jobs',
//         status: 'operational',
//       },
//       {
//         type: 'redis',
//         label: 'Redis Cache',
//         status: redisStatus.toLowerCase(),
//       },
//       {
//         type: 'database',
//         label: 'Database',
//         status: databaseStatus.toLowerCase(),
//       },
//       {
//         type: 'storageUsage',
//         label: 'Object Storage',
//         value: storageUsagePercent,
//         unit: '%',
//         status: 'healthy',
//       },
//       {
//         type: 'memoryUsagePercent',
//         label: 'Memory Usage',
//         value: memoryUsagePercent,
//         unit: '%',
//         status: getUsageStatus(memoryUsagePercent),
//       },
//       {
//         type: 'cpuUsagePercent',
//         label: 'CPU Usage',
//         value: cpuUsagePercent,
//         unit: '%',
//         status: getUsageStatus(cpuUsagePercent),
//       },
//       {
//         type: 'memoryUsageMb',
//         label: 'Memory Usage',
//         value: memoryUsageMb,
//         unit: 'MB',
//       },
//       {
//         type: 'loadAverage1m',
//         label: 'Load Average (1m)',
//         value: loadAverage1m,
//       },
//     ],
//   };
// }
