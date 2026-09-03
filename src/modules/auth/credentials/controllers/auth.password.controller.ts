import * as authPasswordService from '../services/auth.password.service';

import type { ForgotPasswordDto, ResetPasswordDto } from '../../auth.dto';
import type { ApiResponse } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { sendOk } from '@/core/response';

export const forgotPassword = asyncHandler<{}, ApiResponse<null>, ForgotPasswordDto>(
  async (req, res) => {
    const { email } = req.body;
    await authPasswordService.forgotPassword(email, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, null, 'If that email is registered, a reset link has been sent.');
  },
);

export const resetPassword = asyncHandler<{}, ApiResponse<null>, ResetPasswordDto>(
  async (req, res) => {
    const { token, password } = req.body;
    await authPasswordService.resetPassword(token, password, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, null, 'Password reset successfully. Please log in.');
  },
);
