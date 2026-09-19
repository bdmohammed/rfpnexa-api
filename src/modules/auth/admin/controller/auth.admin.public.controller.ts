import * as authService from '../service/auth.admin.public.service';

import type {
  LoginDto,
  RegisterDto,
  // VerifyEmailDto
} from '../../auth.dto';
import type { ApiResponse, SanitizedUser } from '@/types/types';
import { asyncHandler } from '@/core/asyncHandler';
import { sendCreated, sendOk } from '@/core/response';

export const registerAdmin = asyncHandler<{}, ApiResponse<null>, RegisterDto>(async (req, res) => {
  const dto = req.body;
  await authService.registerAdmin(dto, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendCreated(res, null, 'Registration successful. Please verify your email.');
});

// export const verifyAdminEmail = asyncHandler<
//   {},
//   ApiResponse<{ superAdminExists: boolean }>,
//   VerifyEmailDto
// >(async (req, res) => {
//   const { token } = req.body;
//   const { superAdminExists } = await authService.verifyAdminEmail(token);
//   return sendOk(res, { superAdminExists }, 'Your email has been verified successfully.');
// });

export const loginAdmin = asyncHandler<{}, ApiResponse<SanitizedUser>, LoginDto>(
  async (req, res) => {
    const dto = req.body;
    const user = await authService.loginAdmin(dto, res, {
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });
    return sendOk(res, user, 'Login successful');
  },
);
