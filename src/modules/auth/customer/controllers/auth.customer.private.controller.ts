import * as authService from '../services/auth.customer.private.service';

import type { User } from '@/entities/User';
import type { ApiResponse } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { REFRESH_COOKIE_NAME } from '@/core/constants';
import { sendOk } from '@/core/response';

type SanitizedUser = Omit<
  User,
  'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'
>;

export const getMe = asyncHandler<
  {},
  ApiResponse<SanitizedUser & { roles: string[]; permissions: string[] }>
>(async (req, res) => {
  const user = await authService.getProfile(req.user!.userId);
  return sendOk(res, {
    ...user,
    roles: req.roles ?? [],
    permissions: req.permissions ?? [],
  });
});

export const logout = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.logoutUser(
    res,
    refreshToken,
    {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    },
    req.user?.userId,
  );
  return sendOk(res, null, 'Logged out successfully');
});
