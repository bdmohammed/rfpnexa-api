// import * as authEmailService from '../services/auth.email.service';

// import type {
//   ChangePasswordDto,
//   EmailChangeDto,
//   ResendVerificationDto,
//   VerifyEmailDto,
// } from '../../auth.dto';
// import type { ApiResponse } from '@/types/types';
// import { asyncHandler } from '@/core/asyncHandler';
// import { sendOk } from '@/core/response';
// import { clearAuthCookies } from '@/modules/auth/customer/services/auth.customer.private.service';

// /**
//  * POST /api/v1/auth/password/change
//  * Changes user password and revokes all active sessions.
//  */
// export const changePassword = asyncHandler<{}, ApiResponse<null>, ChangePasswordDto>(
//   async (req, res) => {
//     const { currentPassword, newPassword } = req.body;
//     const clientMetadata = {
//       userAgent: req.headers['user-agent'] ?? null,
//       ipAddress: req.ip ?? null,
//     };
//     await authEmailService.changeUserPassword(
//       req.user!.userId,
//       currentPassword,
//       newPassword,
//       clientMetadata,
//     );
//     clearAuthCookies(res);
//     return sendOk(res, null, 'Password changed successfully. Please log in again.');
//   },
// );

// /**
//  * POST /api/v1/auth/email/change
//  * Initiates email change verification.
//  */
// export const requestEmailChange = asyncHandler<{}, ApiResponse<null>, EmailChangeDto>(
//   async (req, res) => {
//     const { email } = req.body;
//     const clientMetadata = {
//       userAgent: req.headers['user-agent'] ?? null,
//       ipAddress: req.ip ?? null,
//     };
//     await authEmailService.requestEmailChange(req.user!.userId, email, clientMetadata);
//     return sendOk(res, null, 'Verification emails sent. Please check your inbox.');
//   },
// );

// /**
//  * POST /api/v1/auth/email/change/verify
//  * Completes email change verification.
//  */
// export const verifyEmailChange = asyncHandler<{}, ApiResponse<null>, VerifyEmailDto>(
//   async (req, res) => {
//     const { token } = req.body;
//     const clientMetadata = {
//       userAgent: req.headers['user-agent'] ?? null,
//       ipAddress: req.ip ?? null,
//     };
//     await authEmailService.verifyEmailChange(token, clientMetadata);
//     clearAuthCookies(res);
//     return sendOk(res, null, 'Email changed successfully. Please log in again.');
//   },
// );

// export const resendVerification = asyncHandler<{}, ApiResponse<null>, ResendVerificationDto>(
//   async (req, res) => {
//     const { email } = req.body;
//     await authEmailService.resendVerification(email, {
//       userAgent: req.headers['user-agent'] ?? null,
//       ipAddress: req.ip ?? null,
//     });
//     return sendOk(
//       res,
//       null,
//       'If the email exists and is not verified, a new verification link has been sent.',
//     );
//   },
// );
