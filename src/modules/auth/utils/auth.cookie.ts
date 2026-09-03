import type { Response } from 'express';
import { env } from '@/config/env';
import { ACCESS_COOKIE_MAX_AGE, JWT_COOKIE_NAME, REFRESH_COOKIE_NAME } from '@/core/constants';

const isProductionEnv = ['prod', 'uat'].includes(env.NODE_ENV);
const cookieDomain = isProductionEnv ? '.rfpnexa.com' : undefined;

/**
 * Sets secure HTTP-only cookies for access and refresh tokens.
 */
export function setAuthCookies(
  res: Response,
  accessToken: string,
  rawRefreshToken: string,
  refreshTtl: number,
): void {
  res.cookie(JWT_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'lax',
    maxAge: ACCESS_COOKIE_MAX_AGE,
    path: '/',
    domain: cookieDomain,
  });

  res.cookie(REFRESH_COOKIE_NAME, rawRefreshToken, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'lax',
    maxAge: refreshTtl,
    path: '/api/v1/auth',
    domain: cookieDomain,
  });
}

/**
 * Clears HTTP-only access and refresh authentication cookies.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie(JWT_COOKIE_NAME, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'lax',
    path: '/',
    domain: cookieDomain,
  });

  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProductionEnv,
    sameSite: 'lax',
    path: '/api/v1/auth',
    domain: cookieDomain,
  });
}
