// import { clearAuthCookies } from '../customer/services/auth.customer.private.service';

// import * as authService from './auth.session.service';

// import type { IdParamDto, UserDeviceDto, UserSessionDto } from '../auth.dto';
// import type { ApiResponse } from '@/types/types';
// import { asyncHandler } from '@/core/asyncHandler';
// import { REFRESH_COOKIE_NAME } from '@/core/constants';
// import { sendOk } from '@/core/response';

// /**
//  * GET /api/v1/auth/sessions
//  * Returns list of all active non-expired sessions.
//  */
// export const getSessions = asyncHandler<{}, ApiResponse<UserSessionDto[]>>(async (req, res) => {
//   const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
//   const sessions = await authService.getUserSessions(req.user!.userId, refreshToken);
//   return sendOk(res, sessions);
// });

// /**
//  * DELETE /api/v1/auth/sessions/:id
//  * Revokes a specific session.
//  */
// export const revokeSession = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
//   const { id } = req.params;
//   const connectionContext = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };
//   await authService.revokeSessionById(req.user!.userId, id, connectionContext);
//   return sendOk(res, null, 'Session revoked successfully');
// });

// /**
//  * DELETE /api/v1/auth/sessions
//  * Revokes all sessions for the current user.
//  */
// export const revokeAllSessions = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
//   const clientMetadata = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };
//   await authService.revokeAllUserSessions(req.user!.userId, clientMetadata);
//   clearAuthCookies(res);
//   return sendOk(res, null, 'All sessions revoked successfully');
// });

// /**
//  * GET /api/v1/auth/devices
//  * Lists recognized devices for the user.
//  */
// export const getDevices = asyncHandler<{}, ApiResponse<UserDeviceDto[]>>(async (req, res) => {
//   const currentContext = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };
//   const devices = await authService.getUserDevices(req.user!.userId, currentContext);
//   return sendOk(res, devices);
// });

// /**
//  * POST /api/v1/auth/devices/:id/trust
//  * Trusts a recognized device.
//  */
// export const trustDevice = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
//   const { id } = req.params;
//   const connectionContext = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };
//   await authService.trustDeviceById(req.user!.userId, id, connectionContext);
//   return sendOk(res, null, 'Device marked as trusted.');
// });

// /**
//  * DELETE /api/v1/auth/devices/:id
//  * Revokes a device.
//  */
// export const revokeDevice = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
//   const { id } = req.params;
//   const connectionContext = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };
//   const { isCurrentDevice } = await authService.revokeDeviceById(
//     req.user!.userId,
//     id,
//     connectionContext,
//   );
//   if (isCurrentDevice) {
//     clearAuthCookies(res);
//   }
//   return sendOk(res, null, 'Device revoked successfully.');
// });
