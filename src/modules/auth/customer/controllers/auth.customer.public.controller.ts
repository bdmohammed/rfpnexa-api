import * as authService from '../services/auth.customer.public.service';

import type { LoginDto, RegisterDto, VerifyEmailDto } from '../../auth.dto';
import type { ApiResponse, SanitizedUser } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { sendCreated, sendOk } from '@/core/response';

export const register = asyncHandler<{}, ApiResponse<null>, RegisterDto>(async (req, res) => {
  const dto = req.body;
  await authService.registerUser(dto, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendCreated(res, null, 'Registration successful. Please verify your email.');
});

export const verifyEmail = asyncHandler<{}, ApiResponse<null>, VerifyEmailDto>(async (req, res) => {
  const { token } = req.body;
  await authService.verifyEmail(token);
  return sendOk(res, null, 'Email verified successfully. You can now log in.');
});

export const login = asyncHandler<{}, ApiResponse<SanitizedUser>, LoginDto>(async (req, res) => {
  const dto = req.body;
  const user = await authService.loginUser(dto, res, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, user, 'Login successful');
});
