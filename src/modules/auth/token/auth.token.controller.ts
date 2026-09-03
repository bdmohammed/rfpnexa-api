import * as authService from './auth.token.service';

import type { ApiResponse } from '@/types/types';
import type { Request, Response } from 'express';
import { asyncHandler } from '@/core/asyncHandler';
import { CSRF_TOKEN_ISSUED, REFRESH_COOKIE_NAME } from '@/core/constants';
import { sendOk } from '@/core/response';
import { generateToken } from '@/middleware/csrf';

/**
 * Issues a fresh CSRF token to the client for authenticating subsequent state-changing HTTP requests.
 *
 * Business Rules:
 * - Must be invoked by client applications prior to submitting state-mutating requests (POST, PATCH, DELETE).
 *
 * Side Effects:
 * - Generates and sets a signed `rfpnexa.csrf` HTTP-only cookie on the client response.
 * - Sets strict anti-cache (`Cache-Control: no-store`) and `Vary: Cookie` headers.
 *
 * Failure Modes:
 * - Throws server error if CSRF secret configuration is missing or invalid.
 *
 * SECURITY: Serves as the public token distribution endpoint for double-submit cookie verification.
 */
export const getCsrfToken = (req: Request, res: Response) => {
  res.set({
    'Cache-Control': 'no-store, no-cache, must-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    Vary: 'Cookie',
  });

  const token = generateToken(req, res);
  return sendOk(res, { csrfToken: token }, CSRF_TOKEN_ISSUED);
};

/**
 * POST /api/v1/auth/refresh
 * Rotates the refresh token and issues a new access token.
 */
export const refresh = asyncHandler<{}, ApiResponse<null>>(async (req, res) => {
  const refreshToken = req.cookies[REFRESH_COOKIE_NAME] as string | undefined;
  await authService.refreshSession(refreshToken, res, {
    userAgent: req.headers['user-agent'] ?? null,
    ipAddress: req.ip ?? null,
  });
  return sendOk(res, null, 'Session refreshed successfully');
});
