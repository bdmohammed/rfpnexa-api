import {
  type AssignUserRolesBodyDto,
  type BlockUserDto,
  type CreateAdminDto,
  type CreateUserNoteDto,
  type IdParamDto,
  type ImpersonateUserDto,
  type ListUsersQueryDto,
  type PaginationQueryDto,
  type PreviewPermissionResponseDto,
  type ReviewApprovalBodyDto,
  type RoleParamDto,
  type SessionParamDto,
  type SubmitApprovalBodyDto,
  type UpdateUserDetailDto,
  type UserActivityDetailDto,
  type UserDeviceDto,
  type UserNoteDetailDto,
  type UserOverviewDto,
  type UserRolesDto,
  type UserSecurityDto,
  type UserSessionDto,
  type UserStatsDto,
  type UserSubscriptionOverviewDto,
  type UserTimelineEvent,
} from './admin.dto';
import * as service from './admin.service';

import type { AuditLog } from '@/entities/AuditLog';
import type { User } from '@/entities/User';
import type { UserNote } from '@/entities/UserNote';
import type { ApiResponse } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { paginationMeta, sendCreated, sendOk } from '@/core/response';

// ─── Users ────────────────────────────────────────────────────────────────────

export const listUsers = asyncHandler<{}, ApiResponse<User[]>, {}, ListUsersQueryDto>(
  async (req, res) => {
    const q = req.query;
    const { users, total } = await service.listUsers(q);
    return sendOk(res, users, 'OK', paginationMeta(total, q.page, q.limit));
  },
);

export const getUserById = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const user = await service.getUserById(req.params.id);
  return sendOk(res, user);
});

export const blockUser = asyncHandler<IdParamDto, ApiResponse<User>, BlockUserDto>(
  async (req, res) => {
    const { isBlocked } = req.body;
    res.locals['auditBefore'] = { isBlocked: !isBlocked };
    const user = await service.blockUser(req.params.id, isBlocked);
    return sendOk(res, user, isBlocked ? 'User blocked' : 'User unblocked');
  },
);

export const getUserStats = asyncHandler<{}, ApiResponse<UserStatsDto>>(async (_req, res) => {
  const stats = await service.getUserStats();
  return sendOk(res, stats);
});

export const getUserOverview = asyncHandler<IdParamDto, ApiResponse<UserOverviewDto>>(
  async (req, res) => {
    const overview = await service.getUserOverview(req.params.id);
    return sendOk(res, overview);
  },
);

export const getUserSecurity = asyncHandler<IdParamDto, ApiResponse<UserSecurityDto>>(
  async (req, res) => {
    const security = await service.getUserSecurity(req.params.id);
    return sendOk(res, security);
  },
);

export const getUserSessions = asyncHandler<IdParamDto, ApiResponse<UserSessionDto[]>>(
  async (req, res) => {
    const sessions = await service.getUserSessions(req.params.id);
    return sendOk(res, sessions);
  },
);

export const getUserDevices = asyncHandler<IdParamDto, ApiResponse<UserDeviceDto[]>>(
  async (req, res) => {
    const devices = await service.getUserDevices(req.params.id);
    return sendOk(res, devices);
  },
);

export const getUserActivity = asyncHandler<
  IdParamDto,
  ApiResponse<UserActivityDetailDto[]>,
  {},
  PaginationQueryDto
>(async (req, res) => {
  const { page, limit } = req.query;
  const { activities, total } = await service.getUserActivity(req.params.id, page, limit);
  return sendOk(res, activities, 'OK', paginationMeta(total, page, limit));
});

export const getUserTimeline = asyncHandler<IdParamDto, ApiResponse<UserTimelineEvent[]>>(
  async (req, res) => {
    const timeline = await service.getUserTimeline(req.params.id);
    return sendOk(res, timeline);
  },
);

export const getUserAuditLogs = asyncHandler<
  IdParamDto,
  ApiResponse<AuditLog[]>,
  {},
  PaginationQueryDto
>(async (req, res) => {
  const { page, limit } = req.query;
  const { logs, total } = await service.getUserAuditLogs(req.params.id, page, limit);
  return sendOk(res, logs, 'OK', paginationMeta(total, page, limit));
});

export const getUserSubscription = asyncHandler<
  IdParamDto,
  ApiResponse<UserSubscriptionOverviewDto>
>(async (req, res) => {
  const subscription = await service.getUserSubscription(req.params.id);
  return sendOk(res, subscription);
});

export const getUserNotes = asyncHandler<IdParamDto, ApiResponse<UserNoteDetailDto[]>>(
  async (req, res) => {
    const notes = await service.getUserNotes(req.params.id);
    return sendOk(res, notes);
  },
);

export const createUserNote = asyncHandler<IdParamDto, ApiResponse<UserNote>, CreateUserNoteDto>(
  async (req, res) => {
    const { note } = req.body;
    const userNote = await service.createUserNote(req.params.id, req.user!.userId, note);
    return sendCreated(res, userNote, 'Internal note added');
  },
);

export const updateUserDetail = asyncHandler<IdParamDto, ApiResponse<User>, UpdateUserDetailDto>(
  async (req, res) => {
    const dto = req.body;
    const before = await service.getUserOverview(req.params.id);
    res.locals.auditBefore = before;
    const user = await service.updateUserDetail(req.params.id, dto);
    return sendOk(res, user, 'User details updated successfully');
  },
);

export const suspendUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.suspendUser(req.params.id);
  return sendOk(res, user, 'User account suspended');
});

export const activateUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.unsuspendUser(req.params.id);
  return sendOk(res, user, 'User account activated');
});

export const archiveUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.archiveUser(req.params.id);
  return sendOk(res, user, 'User account archived');
});

export const unarchiveUser = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserOverview(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.unarchiveUser(req.params.id);
  return sendOk(res, user, 'User account unarchived');
});

export const forcePasswordChange = asyncHandler<IdParamDto, ApiResponse<User>>(async (req, res) => {
  const before = await service.getUserSecurity(req.params.id);
  res.locals.auditBefore = before;
  const user = await service.forcePasswordChange(req.params.id);
  return sendOk(res, user, 'Forced password change configured for next login');
});

export const sendResetPasswordEmail = asyncHandler<IdParamDto, ApiResponse<null>>(
  async (req, res) => {
    await service.sendResetPasswordEmailAction(req.params.id);
    return sendOk(res, null, 'Password reset email sent to user');
  },
);

export const sendUserVerification = asyncHandler<IdParamDto, ApiResponse<null>>(
  async (req, res) => {
    await service.sendUserVerificationAction(req.params.id);
    return sendOk(res, null, 'Verification email sent to user');
  },
);

export const revokeSession = asyncHandler<SessionParamDto, ApiResponse<null>>(async (req, res) => {
  const { id, sessionId } = req.params;
  await service.revokeSession(id, sessionId);
  return sendOk(res, null, 'User session revoked successfully');
});

export const revokeAllSessions = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  await service.revokeAllSessions(req.params.id);
  return sendOk(res, null, 'All user sessions revoked successfully');
});

export const impersonateUser = asyncHandler<
  IdParamDto,
  ApiResponse<{ token: string }>,
  ImpersonateUserDto
>(async (req, res) => {
  const { reason } = req.body;
  const result = await service.impersonateUser(req.params.id, req.user!.userId, reason);
  return sendOk(res, result, 'Impersonation session established');
});

export const createAdmin = asyncHandler<{}, ApiResponse<User>, CreateAdminDto>(async (req, res) => {
  const dto = req.body;
  const admin = await service.createAdmin(dto);
  return sendCreated(res, admin, 'Admin account created');
});

export const getUserRoles = asyncHandler<IdParamDto, ApiResponse<UserRolesDto>>(
  async (req, res) => {
    const data = await service.getUserRoles(req.params.id);
    return sendOk(res, data);
  },
);

export const assignUserRoles = asyncHandler<IdParamDto, ApiResponse<null>, AssignUserRolesBodyDto>(
  async (req, res) => {
    const dto = req.body;

    const beforeState = await service.getUserRoles(req.params.id);
    res.locals.auditBefore = beforeState.assigned;

    await service.assignUserRoles(req.params.id, dto, req.user!.userId);
    return sendOk(res, null, 'User roles updated successfully');
  },
);

export const revokeUserRole = asyncHandler<RoleParamDto, ApiResponse<null>>(async (req, res) => {
  const { id, roleId } = req.params;

  const beforeState = await service.getUserRoles(id);
  res.locals.auditBefore = beforeState.assigned;

  await service.revokeUserRole(id, roleId, req.user!.userId);
  return sendOk(res, null, 'User role revoked successfully');
});

export const previewUserPermissions = asyncHandler<
  IdParamDto,
  ApiResponse<PreviewPermissionResponseDto[]>
>(async (req, res) => {
  const data = await service.previewUserPermissions(req.params.id);
  return sendOk(res, data);
});

export const submitApproval = asyncHandler<IdParamDto, ApiResponse<null>, SubmitApprovalBodyDto>(
  async (req, res) => {
    const { id } = req.params;
    const { roleId, description, reviewerId } = req.body;
    await service.submitUserApprovalRequest(id, req.user!.userId, roleId, description, reviewerId);
    return sendOk(res, null, 'Approval request submitted successfully to reviewer');
  },
);

export const reviewApproval = asyncHandler<IdParamDto, ApiResponse<null>, ReviewApprovalBodyDto>(
  async (req, res) => {
    const { id } = req.params;
    const { action, comment } = req.body;
    await service.reviewUserApprovalRequest(id, req.user!.userId, action, comment);
    return sendOk(res, null, `Approval request ${action.toLowerCase()}d successfully`);
  },
);

export const getApprovalRequest = asyncHandler<IdParamDto, ApiResponse<unknown>>(
  async (req, res) => {
    const { id } = req.params;
    const request = await service.getUserApprovalRequest(id);
    return sendOk(res, request, 'Approval request details retrieved successfully');
  },
);
