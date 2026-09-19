// import * as bcrypt from 'bcryptjs';
// import * as jwt from 'jsonwebtoken';
// import { In } from 'typeorm';

import type {
  // AssignUserRolesBodyDto,
  // CreateAdminDto,
  ListUsersQueryDto,
  // UpdateUserDetailDto,
  // UserActivityDetailDto,
  // UserDeviceDto,
  // UserNoteDetailDto,
  // UserRolesDto,
  // UserSecurityDto,
  // UserSessionDto,
  // UserStatsDto,
  // UserSubscriptionOverviewDto,
  // UserTimelineEvent,
} from './admin.dto';
import { AppDataSource } from '@/config/database';
// import { env } from '@/config/env';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import {
// ACCESS_TOKEN_EXPIRY,
// BCRYPT_ROUNDS,
// } from '@/core/constants';
// import { AuditLog } from '@/entities/AuditLog';
// import { Country } from '@/entities/Country';
// import { DownloadHistory } from '@/entities/DownloadHistory';
// import { Permission } from '@/entities/Permission';
// import { PermissionModule } from '@/entities/PermissionModule';
// import { Role } from '@/entities/Role';
// import { RoleVersionPermission } from '@/entities/RoleVersionPermission';
// import { SecurityLog } from '@/entities/SecurityLog';
// import { Subscription } from '@/entities/Subscription';
// import { Tender } from '@/entities/Tender';
// import { Transaction } from '@/entities/Transaction';
import { User } from '@/entities/User';
// import {
//   // UserApprovalRequest,
//   // UserApprovalRequestStatus,
// } from '@/entities/UserApprovalRequest';
// import { UserNote } from '@/entities/UserNote';
// import { UserRole } from '@/entities/UserRole';
// import { UserSession } from '@/entities/UserSession';
// import { CacheService } from '@/services/cache.service';
// import {
//   sendAdminApprovalStatusEmail,
//   sendPasswordResetEmail,
//   sendVerificationEmail,
// } from '@/services/email.service';
// import { createEmailToken } from '@/services/token.service';
import {
  AccountType,
  // EmailTokenType,
  // RoleStatus,
  // SecurityEvent,
  // SubscriptionStatus,
  // UserStatus,
} from '@/types/enums';

const userRepo = AppDataSource.getRepository(User);
// const subRepo = AppDataSource.getRepository(Subscription);
// const txnRepo = AppDataSource.getRepository(Transaction);
// const countryRepo = AppDataSource.getRepository(Country);
// const tenderRepo = AppDataSource.getRepository(Tender);
// const auditRepo = AppDataSource.getRepository(AuditLog);

// ─── User Management ──────────────────────────────────────────────────────────

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function listUsers(opts: ListUsersQueryDto) {
  const page = Math.max(1, opts.page);
  const limit = Math.min(100, Math.max(1, opts.limit));
  const skip = (page - 1) * limit;

  const qb = userRepo.createQueryBuilder('user');

  qb.select([
    'user.id',
    'user.name',
    'user.email',
    'user.accountType',
    'user.companyName',
    // 'user.emailVerified',
    // 'user.isBlocked',
    // 'user.status',
    'user.createdAt',
    // 'user.lastLoginAt',

    'country.id',
    'country.name',
    'country.code',

    'userRole.id',
    'role.id',
    'role.key',
    // 'roleVersion.name',
  ]);

  qb.leftJoin('user.userRoles', 'userRole')
    .leftJoin('userRole.role', 'role')
    // .leftJoin('role.activeVersion', 'roleVersion')
    .leftJoin('user.country', 'country');
  // .leftJoinAndSelect(
  //   'user.subscriptions',
  //   'subscription',
  //   'subscription.status = :activeStatus',
  //   { activeStatus: SubscriptionStatus.ACTIVE },
  // )
  // .leftJoinAndSelect('subscription.planVersion', 'planVersion')
  // .leftJoinAndSelect('planVersion.plan', 'plan');

  if (opts.search) {
    qb.andWhere(
      '(user.name ILIKE :search OR user.email ILIKE :search OR user.companyName ILIKE :search OR user.id::text = :exactSearch)',
      { search: `%${opts.search}%`, exactSearch: opts.search },
    );
  }

  if (opts.accountType) {
    qb.andWhere('user.accountType = :accountType', { accountType: opts.accountType });
  } else {
    // Exclude automated system service accounts from user lists
    qb.andWhere('user.accountType != :systemAccountType', {
      systemAccountType: AccountType.SYSTEM,
    });
  }

  // if (opts.status) {
  //   if (opts.status === UserStatus.ACTIVE) {
  //     qb.andWhere(
  //       'user.status = :status AND user.emailVerified = true AND user.isBlocked = false',
  //       {
  //         status: UserStatus.ACTIVE,
  //       },
  //     );
  //   } else if (opts.status === UserStatus.PENDING_EMAIL_VERIFICATION) {
  //     qb.andWhere('user.emailVerified = false');
  //   } else if (opts.status === UserStatus.PENDING_APPROVAL) {
  //     qb.andWhere('user.status = :status AND user.emailVerified = true', { status: opts.status });
  //   } else if (opts.status === UserStatus.SUSPENDED) {
  //     qb.andWhere('user.status = :status', { status: opts.status });
  //   } else if (opts.status === UserStatus.BLOCKED) {
  //     qb.andWhere('user.isBlocked = true');
  //   } else if (opts.status === UserStatus.ARCHIVED) {
  //     qb.andWhere('user.status = :status', { status: opts.status });
  //   }
  // }

  if (opts.country) {
    qb.andWhere('user.country = :country', { country: opts.country });
  }

  // if (opts.verified !== undefined) {
  //   qb.andWhere('user.emailVerified = :verified', { verified: opts.verified });
  // }

  if (opts.dateFrom) {
    qb.andWhere('user.createdAt >= :dateFrom', { dateFrom: new Date(opts.dateFrom) });
  }

  if (opts.dateTo) {
    qb.andWhere('user.createdAt <= :dateTo', { dateTo: new Date(opts.dateTo) });
  }

  if (opts.roleId) {
    qb.andWhere('role.id = :roleId', { roleId: opts.roleId });
  }

  if (opts.permission) {
    qb.andWhere(
      `EXISTS (
      SELECT 1
      FROM "user_roles" "ur"
      INNER JOIN "role_permissions" "rp"
        ON "rp"."role_id" = "ur"."role_id"
      INNER JOIN "permissions" "p"
        ON "p"."id" = "rp"."permission_id"
      WHERE "ur"."user_id" = "user"."id"
        AND "p"."key" = :permissionKey
    )`,
      // INNER JOIN "role_version_permissions" "rvp" ON "rvp"."role_version_id" = "r"."active_version_id"
      { permissionKey: opts.permission },
    );
  }

  // if (opts.approvalStatus) {
  //   if (opts.approvalStatus === UserStatus.PENDING_APPROVAL) {
  //     qb.andWhere('user.status = :status AND user.emailVerified = true', {
  //       status: UserStatus.PENDING_APPROVAL,
  //     });
  //   } else if (opts.approvalStatus === UserStatus.APPROVED) {
  //     qb.andWhere(
  //       'EXISTS (SELECT 1 FROM "user_approval_requests" "req" WHERE "req"."target_user_id" = "user"."id" AND "req"."status" = :reqStatus)',
  //       { reqStatus: UserApprovalRequestStatus.APPROVED },
  //     );
  //   } else if (opts.approvalStatus === UserStatus.REJECTED_BY_ADMIN) {
  //     qb.andWhere('user.status = :status AND user.emailVerified = true', {
  //       status: UserStatus.REJECTED_BY_ADMIN,
  //     });
  //   }
  // }

  qb.orderBy('user.createdAt', 'DESC').skip(skip).take(limit);

  const [users, total] = await qb.getManyAndCount();
  const result = users.map((user) => ({
    ...user,
    userRoles: user.userRoles
      .map((userRole) => userRole.role.key)
      .filter(Boolean)
      .map((key) =>
        key
          .split('-')
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' '),
      )
      .join(', '),
  }));
  return { users: result, total };
}

export async function getUserById(id: string): Promise<User> {
  const user = await userRepo.findOne({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      companyName: true,
      country: true,
      // emailVerified: true,
      // isBlocked: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  if (!user)
    throw new AppError(
      AppErrorMessage.USER_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  return user;
}

// export async function blockUser(id: string, isBlocked: boolean): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   user.isBlocked = isBlocked;
//   if (isBlocked) {
//     user.tokenVersion += 1;
//   }
//   return userRepo.save(user);
// }

// export async function suspendUser(id: string): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   user.status = UserStatus.SUSPENDED;
//   user.tokenVersion += 1;
//   return userRepo.save(user);
// }

// export async function unsuspendUser(id: string): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   user.status = UserStatus.ACTIVE;
//   return userRepo.save(user);
// }

// export async function archiveUser(id: string): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   user.status = UserStatus.ARCHIVED;
//   user.tokenVersion += 1;
//   return userRepo.save(user);
// }

// export async function unarchiveUser(id: string): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   user.status = UserStatus.ACTIVE;
//   return userRepo.save(user);
// }

// export async function forcePasswordChange(id: string): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   user.mustResetPassword = true;
//   user.tokenVersion += 1;
//   return userRepo.save(user);
// }

// export async function sendResetPasswordEmailAction(id: string): Promise<void> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   const rawToken = await createEmailToken(user.id, EmailTokenType.PASSWORD_RESET);
//   await sendPasswordResetEmail({
//     to: user.email,
//     name: user.name,
//     userId: user.id,
//     token: rawToken,
//   });
// }

// export async function sendUserVerificationAction(id: string): Promise<void> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   const rawToken = await createEmailToken(user.id, EmailTokenType.EMAIL_VERIFICATION);
//   await sendVerificationEmail({
//     to: user.email,
//     name: user.name,
//     userId: user.id,
//     token: rawToken,
//   });
// }

// export async function revokeSession(userId: string, sessionId: string): Promise<void> {
//   const sessionRepo = AppDataSource.getRepository(UserSession);
//   const session = await sessionRepo.findOne({ where: { id: sessionId, userId } });
//   if (!session)
//     throw new AppError(
//       AppErrorMessage.SESSION_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   session.isRevoked = true;
//   await sessionRepo.save(session);
// }

// export async function revokeAllSessions(userId: string): Promise<void> {
//   const sessionRepo = AppDataSource.getRepository(UserSession);
//   await sessionRepo.update({ userId }, { isRevoked: true });
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (user) {
//     user.tokenVersion += 1;
//     await userRepo.save(user);
//   }
// }

// export async function impersonateUser(
//   userId: string,
//   adminId: string,
//   _reason: string,
// ): Promise<{ token: string }> {
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   const admin = await userRepo.findOneOrFail({ where: { id: adminId } });

//   const payload = {
//     sub: user.id,
//     userId: user.id,
//     email: user.email,
//     accountType: user.accountType,
//     role: user.accountType,
//     // tokenVersion: user.tokenVersion,
//     impersonatedBy: admin.email,
//     impersonatorId: admin.id,
//     type: 'access',
//   };

//   const token = jwt.sign(payload, env.JWT_SECRET, {
//     expiresIn: ACCESS_TOKEN_EXPIRY,
//     issuer: env.JWT_ISSUER,
//     audience: env.JWT_AUDIENCE,
//   });
//   return { token };
// }

// // eslint-disable-next-line complexity, sonarjs/cognitive-complexity
// export async function updateUserDetail(id: string, dto: UpdateUserDetailDto): Promise<User> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   if (dto.email && dto.email !== user.email) {
//     const exists = await userRepo.findOne({ where: { email: dto.email } });
//     if (exists && exists.id !== id) {
//       throw new AppError(
//         AppErrorMessage.EMAIL_IN_USE,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.EMAIL_TAKEN,
//       );
//     }
//     user.email = dto.email;
//   }

//   if (dto.name !== undefined) user.name = dto.name;
//   if (dto.companyName !== undefined && dto.companyName !== null) user.companyName = dto.companyName;
//   if (dto.country !== undefined && dto.country !== null) {
//     const countryObj = await countryRepo.findOne({
//       where: [{ id: dto.country }, { name: dto.country }, { code: dto.country }],
//     });
//     if (!countryObj) {
//       throw new AppError(
//         'Country not found',
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.VALIDATION_ERROR,
//       );
//     }
//     user.country = countryObj;
//   }

//   if (dto.status !== undefined) {
//     user.status = dto.status;
//     if (dto.status === 'suspended' || dto.status === 'archived') {
//       user.tokenVersion += 1;
//     }
//   }

//   if (dto.isBlocked !== undefined) {
//     user.isBlocked = dto.isBlocked;
//     if (dto.isBlocked) {
//       user.tokenVersion += 1;
//     }
//   }

//   return userRepo.save(user);
// }

// export async function getUserStats(): Promise<UserStatsDto> {
//   const total = await userRepo.count();
//   const active = await userRepo.count({
//     where: {
//       status: UserStatus.ACTIVE,
//       emailVerified: true,
//       isBlocked: false,
//       accountType: Not(AccountType.SYSTEM),
//     },
//   });
//   const inactive = await userRepo.count({
//     where: { status: UserStatus.PENDING_EMAIL_VERIFICATION, accountType: Not(AccountType.SYSTEM) },
//   });
//   const suspended = await userRepo.count({
//     where: { status: UserStatus.SUSPENDED, accountType: Not(AccountType.SYSTEM) },
//   });
//   const admins = await userRepo.count({ where: { accountType: AccountType.ADMIN } });
//   const customers = await userRepo.count({ where: { accountType: AccountType.USER } });
//   const pendingVerification = await userRepo.count({
//     where: { emailVerified: false, accountType: Not(AccountType.SYSTEM) },
//   });
//   const pendingApprovalAdmins = await userRepo.count({
//     where: { accountType: AccountType.ADMIN, status: UserStatus.PENDING_APPROVAL },
//   });

//   const subscribed = await userRepo
//     .createQueryBuilder('user')
//     .innerJoin('user.subscriptions', 'sub', "sub.status = 'active'")
//     .getCount();

//   const blocked = await userRepo.count({ where: { isBlocked: true } });

//   const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000);
//   const onlineNow = await AppDataSource.getRepository(UserSession)
//     .createQueryBuilder('session')
//     .select('DISTINCT session.userId')
//     .where(
//       'session.expiresAt > :now AND session.isRevoked = false AND session.updatedAt >= :fiveMinsAgo',
//       {
//         now: new Date(),
//         fiveMinsAgo,
//       },
//     )
//     .getCount();

//   const startOfToday = new Date();
//   startOfToday.setHours(0, 0, 0, 0);
//   const newToday = await userRepo
//     .createQueryBuilder('user')
//     .where('user.createdAt >= :startOfToday', { startOfToday })
//     .getCount();

//   const startOfMonth = new Date();
//   startOfMonth.setDate(1);
//   startOfMonth.setHours(0, 0, 0, 0);
//   const newThisMonth = await userRepo
//     .createQueryBuilder('user')
//     .where('user.createdAt >= :startOfMonth', { startOfMonth })
//     .getCount();

//   return {
//     total,
//     active,
//     inactive,
//     suspended,
//     admins,
//     customers,
//     pendingVerification,
//     pendingApprovalAdmins,
//     subscribed,
//     blocked,
//     onlineNow,
//     newToday,
//     newThisMonth,
//   };
// }

// export async function getUserOverview(id: string) {
//   const user = await userRepo.findOne({
//     where: { id },
//     relations: {
//       country: true,
//     },
//   });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   const approvalReq = await AppDataSource.getRepository(UserApprovalRequest).findOne({
//     where: { targetUser: { id } },
//     order: { createdAt: 'DESC' },
//     relations: {
//       reviewer: true,
//     },
//   });

//   const notesCount = await AppDataSource.getRepository(UserNote).count({ where: { userId: id } });

//   const createdTendersCount = await tenderRepo.count({ where: { createdById: id } });
//   const downloadCount = await AppDataSource.getRepository(DownloadHistory).count({
//     where: { userId: id },
//   });
//   const loginCount = await AppDataSource.getRepository(SecurityLog).count({
//     where: { userId: id, event: SecurityEvent.USER_LOGIN },
//   });

//   const storageResult = await AppDataSource.getRepository(DownloadHistory)
//     .createQueryBuilder('dl')
//     .select('SUM(dl.fileSize)', 'totalSize')
//     .where('dl.userId = :userId', { userId: id })
//     .getRawOne();

//   const storageUsedBytes = parseInt(storageResult?.totalSize ?? '0', 10);

//   return {
//     id: user.id,
//     name: user.name,
//     email: user.email,
//     accountType: user.accountType,
//     companyName: user.companyName,
//     country: user.country,
//     status: user.status,
//     emailVerified: user.emailVerified,
//     isBlocked: user.isBlocked,
//     createdAt: user.createdAt,
//     updatedAt: user.updatedAt,
//     lastLoginAt: user.lastLoginAt,
//     approvedBy: approvalReq?.reviewer
//       ? {
//           id: approvalReq.reviewer.id,
//           name: approvalReq.reviewer.name,
//           email: approvalReq.reviewer.email,
//         }
//       : null,
//     approvedAt: approvalReq?.decidedAt ?? null,
//     rejectionReason:
//       approvalReq?.status === UserApprovalRequestStatus.REJECTED
//         ? approvalReq.reviewerComment
//         : null,
//     notesCount,
//     stats: {
//       createdTendersCount,
//       downloadCount,
//       wonTendersCount: 0,
//       lostTendersCount: 0,
//       documentsCount: downloadCount,
//       loginsCount: loginCount,
//       storageUsedBytes,
//     },
//   };
// }

// export async function getUserSecurity(id: string): Promise<UserSecurityDto> {
//   const user = await userRepo.findOne({ where: { id } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   return {
//     emailVerified: user.emailVerified,
//     twoFactorEnabled: false,
//     passwordChangedAt: user.passwordChangedAt,
//     failedLoginAttempts: user.failedLoginAttempts,
//     lockoutUntil: user.lockoutUntil,
//     mustResetPassword: user.mustResetPassword,
//   };
// }

// export async function getUserSessions(id: string): Promise<UserSessionDto[]> {
//   const sessions = await AppDataSource.getRepository(UserSession).find({
//     where: { userId: id, isRevoked: false },
//     order: { createdAt: 'DESC' },
//   });
//   return sessions.map((s) => ({
//     id: s.id,
//     ipAddress: s.ipAddress,
//     userAgent: s.userAgent,
//     createdAt: s.createdAt,
//     expiresAt: s.expiresAt,
//   }));
// }

// export async function getUserDevices(id: string): Promise<UserDeviceDto[]> {
//   const logs = await AppDataSource.getRepository(SecurityLog).find({
//     where: { userId: id, event: SecurityEvent.USER_LOGIN },
//     order: { createdAt: 'DESC' },
//     take: 10,
//   });
//   return logs.map((l) => ({
//     id: l.id,
//     ipAddress: l.ipAddress,
//     userAgent: l.userAgent,
//     location:
//       // l.location ??
//       'Unknown',
//     lastUsedAt: l.createdAt,
//   }));
// }

// export async function getUserActivity(
//   id: string,
//   page: number = 1,
//   limit: number = 20,
// ): Promise<{ activities: UserActivityDetailDto[]; total: number }> {
//   const skip = (page - 1) * limit;
//   const qb = AppDataSource.getRepository(SecurityLog)
//     .createQueryBuilder('log')
//     .where('log.userId = :userId', { userId: id })
//     .orderBy('log.createdAt', 'DESC')
//     .skip(skip)
//     .take(limit);

//   const [logs, total] = await qb.getManyAndCount();
//   const activities = logs.map((l) => ({
//     id: l.id,
//     event: l.event,
//     ipAddress: l.ipAddress,
//     userAgent: l.userAgent,
//     details: l.details,
//     timestamp: l.createdAt,
//   }));
//   return { activities, total };
// }

// export async function getUserTimeline(id: string): Promise<UserTimelineEvent[]> {
//   const timeline: UserTimelineEvent[] = [];
//   const user = await userRepo.findOneOrFail({ where: { id } });

//   timeline.push({
//     event: 'Created',
//     timestamp: user.createdAt,
//     description: 'Account registered successfully.',
//   });

//   if (user.emailVerified) {
//     timeline.push({
//       event: 'Verified',
//       timestamp: user.emailChangedAt ?? user.createdAt,
//       description: 'Email address verified.',
//     });
//   }

//   const subs = await subRepo.find({
//     where: { userId: id },
//     relations: {
//       planVersion: true,
//     },
//     order: { createdAt: 'ASC' },
//   });
//   for (const sub of subs) {
//     const planName = sub.planVersion.name;
//     timeline.push({
//       event: 'Subscribed',
//       timestamp: sub.createdAt,
//       description: `Subscribed to ${planName} plan.`,
//     });
//   }

//   const logs = await auditRepo.find({
//     where: { entityType: 'user', entityId: id },
//     order: { createdAt: 'ASC' },
//   });
//   for (const l of logs) {
//     let description = l.action;
//     if (l.action === 'user.block') {
//       description = l.after?.['isBlocked'] ? 'User account blocked.' : 'User account unblocked.';
//     } else if (l.action === 'user.suspend') {
//       description = 'User status changed to suspended.';
//     } else if (l.action === 'user.archive') {
//       description = 'User status changed to archived.';
//     }
//     timeline.push({ event: l.action, timestamp: l.createdAt, description });
//   }

//   return timeline.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
// }

// export async function getUserAuditLogs(
//   id: string,
//   page: number = 1,
//   limit: number = 20,
// ): Promise<{ logs: AuditLog[]; total: number }> {
//   const skip = (page - 1) * limit;
//   const [logs, total] = await auditRepo.findAndCount({
//     where: [{ actorId: id }, { entityType: 'user', entityId: id }],
//     order: { createdAt: 'DESC' },
//     skip,
//     take: limit,
//   });
//   return { logs, total };
// }

// export async function getUserSubscription(id: string): Promise<UserSubscriptionOverviewDto> {
//   const activeSub = await subRepo.findOne({
//     where: { userId: id, status: SubscriptionStatus.ACTIVE },
//     relations: {
//       // planVersion: true,
//     },
//     order: { createdAt: 'DESC' },
//   });

//   const txns = await txnRepo.find({
//     where: { userId: id },
//     order: { createdAt: 'DESC' },
//   });

//   return {
//     activeSubscription: activeSub
//       ? {
//           id: activeSub.id,
//           // planName: activeSub.planVersion.name,
//           status: activeSub.status,
//           startedAt: activeSub.createdAt,
//           expiresAt: activeSub.endDate,
//         }
//       : null,
//     transactions: txns.map((t) => ({
//       id: t.id,
//       amountCents: t.amountCents,
//       type: t.type,
//       status: t.status,
//       createdAt: t.createdAt,
//     })),
//   };
// }

// export async function getUserNotes(id: string): Promise<UserNoteDetailDto[]> {
//   const notes = await AppDataSource.getRepository(UserNote).find({
//     where: { userId: id },
//     relations: {
//       admin: true,
//     },
//     order: { createdAt: 'DESC' },
//   });
//   return notes.map((n) => ({
//     id: n.id,
//     note: n.note,
//     createdAt: n.createdAt,
//     admin: n.admin ? { id: n.admin.id, name: n.admin.name, email: n.admin.email } : null,
//   }));
// }

// export async function createUserNote(
//   userId: string,
//   adminId: string,
//   note: string,
// ): Promise<UserNote> {
//   const noteRepo = AppDataSource.getRepository(UserNote);
//   const userNote = noteRepo.create({ userId, adminId, note });
//   return noteRepo.save(userNote);
// }

// export async function createAdmin(dto: CreateAdminDto): Promise<User> {
//   const exists = await userRepo.findOne({ where: { email: dto.email } });
//   if (exists)
//     throw new AppError(
//       AppErrorMessage.EMAIL_REGISTERED,
//       HttpStatusCode.CONFLICT,
//       AppErrorCode.EMAIL_TAKEN,
//     );

//   const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS.PASSWORD);

//   // Validate assigned roles
//   const roleRepo = AppDataSource.getRepository(Role);
//   const roles = await roleRepo
//     .createQueryBuilder('role')
//     .where('role.id IN (:...roleIds)', { roleIds: dto.roleIds })
//     .andWhere('role.isActive = true')
//     .getMany();

//   if (roles.length !== dto.roleIds.length) {
//     throw new AppError(
//       AppErrorMessage.ROLE_INVALID_OR_INACTIVE,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.VALIDATION_ERROR,
//     );
//   }

//   const saved = await AppDataSource.transaction(async (transactionManager) => {
//     const admin = transactionManager.create(User, {
//       name: dto.name,
//       email: dto.email,
//       passwordHash,
//       accountType: AccountType.ADMIN,
//       emailVerified: true,
//     });

//     const savedAdmin = await transactionManager.save(admin);

//     const userRoles = roles.map((role) => {
//       const ur = new UserRole();
//       ur.userId = savedAdmin.id;
//       ur.roleId = role.id;
//       ur.assignedAt = new Date();
//       return ur;
//     });

//     await transactionManager.save(UserRole, userRoles);
//     return savedAdmin;
//   });

//   return saved;
// }

// ─── RBAC Admin User Role Assignment & Previews ───────────────────────────────

// export async function getUserRoles(userId: string): Promise<UserRolesDto> {
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   if (user.accountType !== AccountType.ADMIN) {
//     throw new AppError(
//       AppErrorMessage.ROLES_MANAGED_FOR_ADMIN_ONLY,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.VALIDATION_ERROR,
//     );
//   }

//   const roleRepo = AppDataSource.getRepository(Role);
//   const userRoleRepo = AppDataSource.getRepository(UserRole);

//   const assigned = await userRoleRepo.find({
//     where: { userId },
//     relations: {
//       role: {
//         // activeVersion: true,
//       },
//     },
//   });

//   const available = await roleRepo.find({
//     where: { status: RoleStatus.ACTIVE },
//     relations: {
//       // activeVersion: true,
//     },
//   });

//   // return {
//     // assigned: assigned.map((ur) => ({
//     //   id: ur.role.id,
//     //   // name: ur.role.activeVersion.name,
//     //   key: ur.role.key,
//     //   // expiresAt: ur.expiresAt,
//     //   isSystemRole: ur.role.isSystemRole,
//     // })),
//     // available: available.map((r) => ({
//     //   id: r.id,
//     //   // name: r.activeVersion.name,
//     //   key: r.key,
//     //   isSystemRole: r.isSystemRole,
//     // })),
//   // };
// }

// export async function assignUserRoles(
//   userId: string,
//   dto: AssignUserRolesBodyDto,
//   currentUserId: string,
// ): Promise<void> {
//   const { assignments } = dto;
//   if (userId === currentUserId) {
//     throw new AppError(
//       AppErrorMessage.ROLE_SELF_MODIFICATION_FORBIDDEN,
//       HttpStatusCode.FORBIDDEN,
//       AppErrorCode.SELF_MODIFICATION_FORBIDDEN,
//     );
//   }

//   if (assignments.length === 0) {
//     throw new AppError(
//       AppErrorMessage.ADMIN_ROLE_MUTATION_REJECTED,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.VALIDATION_ERROR,
//     );
//   }

//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   if (user.accountType !== AccountType.ADMIN) {
//     throw new AppError(
//       AppErrorMessage.ROLES_ASSIGNED_TO_ADMIN_ONLY,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.VALIDATION_ERROR,
//     );
//   }

//   const roleRepo = AppDataSource.getRepository(Role);
//   const userRoleRepo = AppDataSource.getRepository(UserRole);
//   const roleIds = assignments.map((a) => a.roleId);

//   // Validate all roles are active
//   const roles = await roleRepo
//     .createQueryBuilder('role')
//     .where('role.id IN (:...roleIds)', { roleIds })
//     .andWhere("role.status = 'ACTIVE'")
//     .getMany();

//   if (roles.length !== roleIds.length) {
//     throw new AppError(
//       AppErrorMessage.ROLES_ASSIGNED_INVALID_OR_INACTIVE,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.VALIDATION_ERROR,
//     );
//   }

//   // Privilege Escalation Check: Compare against current user's max priority
//   // const currentUserRoles = await userRoleRepo.find({
//   //   where: { userId: currentUserId },
//   //   relations: ['role'],
//   // });
//   // const currentMaxPriority = currentUserRoles.reduce((max, ur) => {
//   //   return ur.role && ur.role.isActive ? Math.max(max, ur.role.priority ?? 0) : max;
//   // }, 0);

//   // for (const role of roles) {
//   //   if (role.priority > currentMaxPriority) {
//   //     throw new AppError('Forbidden: Cannot assign roles with a priority higher
//   //        than your own highest role priority.', 403, 'PRIVILEGE_ESCALATION');
//   //   }
//   // }

//   const targetUserRoles = await userRoleRepo.find({
//     where: { userId },
//     relations: {
//       role: true,
//     },
//   });
//   // for (const ur of targetUserRoles) {
//   //   if (ur.role && ur.role.priority > currentMaxPriority) {
//   //     throw new AppError('Forbidden: Cannot modify roles of an administrator
//   //      with a higher role priority than your own.', 403,
//   //      'PRIVILEGE_ESCALATION');
//   //   }
//   // }

//   // Last Super Admin Protection
//   const superAdminRole = await roleRepo.findOne({ where: { key: 'super-admin' } });
//   if (superAdminRole) {
//     const targetHasSuperAdmin = targetUserRoles.some((ur) => ur.roleId === superAdminRole.id);
//     const newHasSuperAdmin = roleIds.includes(superAdminRole.id);

//     if (targetHasSuperAdmin && !newHasSuperAdmin) {
//       const otherSuperAdminsCount = await userRoleRepo.count({
//         where: {
//           roleId: superAdminRole.id,
//           userId: In(
//             await userRepo
//               .find({
//                 where: {
//                   accountType: AccountType.ADMIN,
//                   // isBlocked: false
//                 },
//                 select: {
//                   id: true,
//                 },
//               })
//               .then((users) => users.map((u) => u.id).filter((id) => id !== userId)),
//           ),
//         },
//       });

//       if (otherSuperAdminsCount === 0) {
//         throw new AppError(
//           AppErrorMessage.FORBIDDEN_REVOKE_LAST_SUPER_ADMIN,
//           HttpStatusCode.FORBIDDEN,
//           AppErrorCode.LAST_SUPER_ADMIN_PROTECTION,
//         );
//       }
//     }
//   }

//   await AppDataSource.transaction(async (transactionManager) => {
//     // Delete existing roles
//     await transactionManager.query('DELETE FROM "user_roles" WHERE "user_id" = $1', [userId]);

//     const userRoles = assignments.map((a) => {
//       const ur = new UserRole();
//       ur.userId = userId;
//       ur.roleId = a.roleId;
//       // ur.expiresAt = a.expiresAt ? new Date(a.expiresAt) : null;
//       return ur;
//     });

//     await transactionManager.save(UserRole, userRoles);
//   });

//   // Invalidate permissions cache
//   CacheService.invalidateBackground(`permissions:${userId}`);
// }

// export async function revokeUserRole(
//   userId: string,
//   roleId: string,
//   currentUserId: string,
// ): Promise<void> {
//   if (userId === currentUserId) {
//     throw new AppError(
//       AppErrorMessage.ROLE_SELF_MODIFICATION_FORBIDDEN,
//       HttpStatusCode.FORBIDDEN,
//       AppErrorCode.SELF_MODIFICATION_FORBIDDEN,
//     );
//   }

//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   const userRoleRepo = AppDataSource.getRepository(UserRole);
//   const roleRepo = AppDataSource.getRepository(Role);
//   const activeRolesCount = await userRoleRepo.count({ where: { userId } });

//   if (activeRolesCount <= 1) {
//     throw new AppError(
//       AppErrorMessage.ADMIN_ROLE_REVOCATION_REJECTED,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.REVOCATION_REJECTED,
//     );
//   }

//   const roleToRevoke = await roleRepo.findOne({ where: { id: roleId } });
//   if (!roleToRevoke) {
//     throw new AppError(
//       AppErrorMessage.ROLE_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.ROLE_NOT_FOUND,
//     );
//   }

//   // Privilege Escalation Check
//   // const currentUserRoles = await userRoleRepo.find({
//   //   where: { userId: currentUserId },
//   //   relations: ['role'],
//   // });
//   // const currentMaxPriority = currentUserRoles.reduce((max, ur) => {
//   //   return ur.role && ur.role.isActive ? Math.max(max, ur.role.priority ?? 0) : max;
//   // }, 0);

//   // if (roleToRevoke.priority > currentMaxPriority) {
//   //   throw new AppError('Forbidden: Cannot revoke roles with a priority higher
//   //  than your own highest role priority.', 403, 'PRIVILEGE_ESCALATION');
//   // }

//   // const targetUserRoles = await userRoleRepo.find({
//   //   where: { userId },
//   //   relations: ['role'],
//   // });
//   // for (const ur of targetUserRoles) {
//   //   if (ur.role && ur.role.priority > currentMaxPriority) {
//   //     throw new AppError('Forbidden: Cannot modify roles of an administrator
//   //      with a higher role priority than your own.', 403,
//   //      'PRIVILEGE_ESCALATION');
//   //   }
//   // }

//   // Last Super Admin Protection
//   if (roleToRevoke.key === 'super-admin') {
//     const otherSuperAdminsCount = await userRoleRepo.count({
//       where: {
//         roleId: roleToRevoke.id,
//         userId: In(
//           await userRepo
//             .find({
//               where: {
//                 accountType: AccountType.ADMIN,
//                 // isBlocked: false
//               },
//               select: {
//                 id: true,
//               },
//             })
//             .then((users) => users.map((u) => u.id).filter((id) => id !== userId)),
//         ),
//       },
//     });

//     if (otherSuperAdminsCount === 0) {
//       throw new AppError(
//         AppErrorMessage.FORBIDDEN_REVOKE_LAST_SUPER_ADMIN,
//         HttpStatusCode.FORBIDDEN,
//         AppErrorCode.LAST_SUPER_ADMIN_PROTECTION,
//       );
//     }
//   }

//   await userRoleRepo.delete({ userId, roleId });

//   // Invalidate permissions cache
//   CacheService.invalidateBackground(`permissions:${userId}`);
// }

// export async function previewUserPermissions(userId: string) {
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user)
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );

//   const userRoleRepo = AppDataSource.getRepository(UserRole);
//   const userRoles = await userRoleRepo.find({
//     where: { userId },
//     relations: {
//       role: {
//         // activeVersion: true,
//       },
//     },
//   });

//   const activeUserRoles = userRoles.filter((ur) => {
//     if (ur.role.status !== RoleStatus.ACTIVE) return false;
//     // if (ur.expiresAt && ur.expiresAt.getTime() < Date.now()) return false;
//     return true;
//   });

//   // const roleNames = activeUserRoles.map((ur) => ur.role.activeVersion.name);
//   const isSuperAdmin = activeUserRoles.some((ur) => ur.role.isSystemRole === true);

//   const permRepo = AppDataSource.getRepository(Permission);
//   const modRepo = AppDataSource.getRepository(PermissionModule);

//   const modules = await modRepo.find({ order: { displayOrder: 'ASC' } });
//   let effectiveKeys = new Set<string>();

//   if (isSuperAdmin) {
//     const allPerms = await permRepo.find({
//       select: {
//         key: true,
//       },
//     });
//     effectiveKeys = new Set(allPerms.map((p) => p.key));
//   } else if (activeUserRoles.length > 0) {
//     // const activeVersionIds = activeUserRoles
//     //   // .map((ur) => ur.role.activeVersionId)
//     //   .filter((id): id is string => !!id);
//     // if (activeVersionIds.length > 0) {
//     //   const rvpRepo = AppDataSource.getRepository(RoleVersionPermission);
//     //   const rvpList = await rvpRepo.find({
//     //     where: { roleVersionId: In(activeVersionIds) },
//     //     select: {
//     //       permissionKey: true,
//     //     },
//     //   });
//     //   effectiveKeys = new Set(rvpList.map((p) => p.permissionKey));
//     // }
//   }

//   // Group all registry permissions and mark whether user has them
//   const allPermissions = await permRepo.find({
//     relations: {
//       module: true,
//     },
//   });

//   const preview = modules.map((mod) => {
//     const modPerms = allPermissions.filter((p) => p.moduleId === mod.id);
//     return {
//       moduleName: mod.name,
//       moduleSlug: mod.key,
//       permissions: modPerms.map((p) => ({
//         key: p.key,
//         name: p.name,
//         // action: p.action,
//         description: p.description,
//         granted: effectiveKeys.has(p.key),
//       })),
//     };
//   });

//   return {
//     // roles: roleNames,
//     isSuperAdmin,
//     permissions: preview,
//   };
// }

// export async function submitUserApprovalRequest(
//   userId: string,
//   submittedByUserId: string,
//   roleId: string,
//   description: string,
//   reviewerId: string,
// ): Promise<void> {
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user) {
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.USER_NOT_FOUND,
//     );
//   }

//   const reviewer = await userRepo.findOne({ where: { id: reviewerId } });
//   if (!reviewer) {
//     throw new AppError(
//       'Selected reviewer user not found',
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.USER_NOT_FOUND,
//     );
//   }

//   user.status = UserStatus.PENDING_REVIEW;
//   await userRepo.save(user);

//   const approvalReqRepo = AppDataSource.getRepository(UserApprovalRequest);

//   // Cancel any previous pending approval request for this user
//   await approvalReqRepo.update(
//     { targetUser: { id: userId }, status: UserApprovalRequestStatus.PENDING },
//     { status: UserApprovalRequestStatus.CANCELLED },
//   );

//   // Create new UserApprovalRequest entity record
//   const newRequest = approvalReqRepo.create({
//     targetUser: { id: userId } as User,
//     requestedRole: { id: roleId } as Role,
//     requestedDescription: description,
//     submittedBy: { id: submittedByUserId } as User,
//     reviewer: { id: reviewerId } as User,
//     status: UserApprovalRequestStatus.PENDING,
//   });
//   await approvalReqRepo.save(newRequest);

//   const submitter = await userRepo.findOne({ where: { id: submittedByUserId } });

//   // Create Audit Log entry
//   const audit = auditRepo.create({
//     eventId: crypto.randomUUID(),
//     actorId: submittedByUserId,
//     actorUserId: submittedByUserId,
//     actorEmail: submitter?.email ?? 'admin@rfpnexa.com',
//     module: 'user',
//     entityType: 'user',
//     entityId: user.id,
//     action: 'admin.approval_submitted',
//     before: { status: user.status },
//     after: {
//       status: 'pending_review',
//       approvalRequestId: newRequest.id,
//       requestedRoleId: roleId,
//       requestedDescription: description,
//       reviewerId,
//       submittedById: submittedByUserId,
//     },
//   });
//   await auditRepo.save(audit);
// }

// export async function reviewUserApprovalRequest(
//   userId: string,
//   reviewerUserId: string,
//   action: 'APPROVE' | 'REJECT',
//   comment?: string,
// ): Promise<void> {
//   const user = await userRepo.findOne({ where: { id: userId } });
//   if (!user) {
//     throw new AppError(
//       AppErrorMessage.USER_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.USER_NOT_FOUND,
//     );
//   }

//   const approvalReqRepo = AppDataSource.getRepository(UserApprovalRequest);
//   const pendingReq = await approvalReqRepo.findOne({
//     where: { targetUser: { id: userId }, status: UserApprovalRequestStatus.PENDING },
//     relations: {
//       submittedBy: true,
//       reviewer: true,
//       requestedRole: true,
//     },
//   });

//   if (!pendingReq) {
//     throw new AppError(
//       'No pending approval request found for this user',
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.BAD_REQUEST,
//     );
//   }

//   // Reviewer authorization check
//   if (pendingReq.reviewerId && pendingReq.reviewerId !== reviewerUserId) {
//     throw new AppError(
//       'Only the assigned reviewer can evaluate or decide on this approval request.',
//       HttpStatusCode.FORBIDDEN,
//       AppErrorCode.FORBIDDEN,
//     );
//   }

//   if (action === 'APPROVE') {
//     if (!pendingReq.requestedRoleId) {
//       throw new AppError(
//         'No role assigned to this approval request',
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.BAD_REQUEST,
//       );
//     }

//     user.status = UserStatus.ACTIVE;
//     await userRepo.save(user);

//     // Update approval request entity status
//     pendingReq.status = UserApprovalRequestStatus.APPROVED;
//     pendingReq.reviewerComment = comment ?? null;
//     pendingReq.decidedAt = new Date();
//     await approvalReqRepo.save(pendingReq);

//     // Assign requested role
//     const userRoleRepo = AppDataSource.getRepository(UserRole);
//     await userRoleRepo.delete({ userId: user.id });

//     const assignment = userRoleRepo.create({
//       userId: user.id,
//       roleId: pendingReq.requestedRoleId,
//       assignedBy: { id: reviewerUserId } as User,
//       assignedAt: new Date(),
//     });
//     await userRoleRepo.save(assignment);

//     const reviewerUser = await userRepo.findOne({ where: { id: reviewerUserId } });

//     // Audit log
//     const audit = auditRepo.create({
//       eventId: crypto.randomUUID(),
//       actorId: reviewerUserId,
//       actorUserId: reviewerUserId,
//       actorEmail: reviewerUser?.email ?? 'admin@rfpnexa.com',
//       module: 'user',
//       entityType: 'user',
//       entityId: user.id,
//       action: 'admin.approve',
//       before: { status: 'pending_review' },
//       after: {
//         status: 'active',
//         approvalRequestId: pendingReq.id,
//         roleId: pendingReq.requestedRoleId,
//         comment: comment ?? null,
//       },
//     });
//     await auditRepo.save(audit);

//     await sendAdminApprovalStatusEmail({
//       to: user.email,
//       name: user.name,
//       status: 'approved',
//     });
//   } else {
//     user.status = UserStatus.REJECTED;
//     await userRepo.save(user);

//     // Update approval request entity status
//     pendingReq.status = UserApprovalRequestStatus.REJECTED;
//     pendingReq.reviewerComment = comment ?? null;
//     pendingReq.decidedAt = new Date();
//     await approvalReqRepo.save(pendingReq);

//     const reviewerUser = await userRepo.findOne({ where: { id: reviewerUserId } });

//     // Audit log
//     const audit = auditRepo.create({
//       eventId: crypto.randomUUID(),
//       actorId: reviewerUserId,
//       actorUserId: reviewerUserId,
//       actorEmail: reviewerUser?.email ?? 'admin@rfpnexa.com',
//       module: 'user',
//       entityType: 'user',
//       entityId: user.id,
//       action: 'admin.reject',
//       before: { status: 'pending_review' },
//       after: {
//         status: 'rejected',
//         approvalRequestId: pendingReq.id,
//         comment: comment ?? null,
//       },
//     });
//     await auditRepo.save(audit);

//     await sendAdminApprovalStatusEmail({
//       to: user.email,
//       name: user.name,
//       status: 'rejected',
//       reason: comment ?? 'Request denied by reviewer',
//     });
//   }
// }

// export async function getUserApprovalRequest(userId: string): Promise<UserApprovalRequest | null> {
//   const approvalReqRepo = AppDataSource.getRepository(UserApprovalRequest);
//   return approvalReqRepo.findOne({
//     where: { targetUser: { id: userId } },
//     order: { createdAt: 'DESC' },
//     relations: {
//       submittedBy: true,
//       reviewer: true,
//       requestedRole: true,
//     },
//   });
// }
