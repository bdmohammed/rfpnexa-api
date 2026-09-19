// import crypto from 'node:crypto';

// import { trackDeviceAndDetectSuspicious } from '../security/auth.security.service';
// import * as authTokenService from '../token/auth.token.service';

// import {
//   authenticateOAuthUser,
//   generateCodeChallenge,
//   generateCodeVerifier,
//   generateNonce,
//   getAuthorizationUrl,
//   OAUTH_PROVIDERS,
//   verifyCallbackAndGetUser,
// } from './auth.oauth.service';

// import type { OAuthCallbackQueryDto, OAuthProviderDto } from '../auth.dto';
// import type { User } from '@/entities/User';
// import type { Response } from 'express';
// import { env, isProdEnv, isUatEnv } from '@/config/env';
// import { asyncHandler } from '@/core/asyncHandler';

// const OAUTH_COOKIE_PATH = '/api/v1/auth/oauth';

// /**
//  * GET /api/v1/auth/oauth/:provider
//  * Redirects client to chosen OAuth provider with PKCE code_challenge and OIDC nonce.
//  */
// export const redirectToProvider = asyncHandler<OAuthProviderDto, void>(async (req, res) => {
//   const { provider } = req.params;
//   const config = OAUTH_PROVIDERS[provider];

//   const state = crypto.randomBytes(32).toString('hex');
//   const codeVerifier = generateCodeVerifier();
//   const codeChallenge = generateCodeChallenge(codeVerifier);
//   const nonce = config?.supportsOIDC ? generateNonce() : undefined;

//   const cookieOptions = {
//     httpOnly: true,
//     secure: ['prod', 'uat'].includes(env.NODE_ENV),
//     sameSite: 'lax' as const,
//     maxAge: 10 * 60 * 1000,
//     path: OAUTH_COOKIE_PATH,
//     domain: env.NODE_ENV === 'prod' || env.NODE_ENV === 'uat' ? '.rfpnexa.com' : undefined,
//   };

//   res.cookie(`oauth_state_${provider}`, state, cookieOptions);
//   res.cookie(`oauth_pkce_${provider}`, codeVerifier, cookieOptions);
//   if (nonce) {
//     res.cookie(`oauth_nonce_${provider}`, nonce, cookieOptions);
//   }

//   const authUrl = getAuthorizationUrl(provider, { state, codeChallenge, nonce });
//   res.redirect(authUrl);
// });

// /**
//  * GET /api/v1/auth/oauth/:provider/callback
//  * Handles OAuth callback, verifies state/PKCE/nonce, exchanges code for user profile,
//  * establishes a session, and redirects to frontend.
//  */
// export const handleCallback = asyncHandler<OAuthProviderDto, void, {}, OAuthCallbackQueryDto>(
//   // eslint-disable-next-line sonarjs/cognitive-complexity
//   async (req, res) => {
//     const { provider } = req.params;
//     const { code, state } = req.query;

//     const cookieStateName = `oauth_state_${provider}`;
//     const cookiePkceName = `oauth_pkce_${provider}`;
//     const cookieNonceName = `oauth_nonce_${provider}`;

//     const savedState = req.cookies[cookieStateName] as string | undefined;
//     const savedCodeVerifier = req.cookies[cookiePkceName] as string | undefined;
//     const savedNonce = req.cookies[cookieNonceName] as string | undefined;

//     const clearCookieOptions = {
//       path: OAUTH_COOKIE_PATH,
//       domain: isProdEnv() || isUatEnv() ? '.rfpnexa.com' : undefined,
//     };

//     // Always clear provider OAuth cookies on callback completion (success or error)
//     res.clearCookie(cookieStateName, clearCookieOptions);
//     res.clearCookie(cookiePkceName, clearCookieOptions);
//     res.clearCookie(cookieNonceName, clearCookieOptions);

//     const config = OAUTH_PROVIDERS[provider];

//     // Constant-time CSRF state token verification (bypassed ONLY in test environment)
//     if (env.NODE_ENV !== 'test') {
//       const stateBuf = state ? Buffer.from(state) : null;
//       const savedStateBuf = savedState ? Buffer.from(savedState) : null;
//       const isStateValid =
//         !!stateBuf &&
//         !!savedStateBuf &&
//         stateBuf.length === savedStateBuf.length &&
//         crypto.timingSafeEqual(stateBuf, savedStateBuf);

//       if (!isStateValid) {
//         res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=mismatched_state`);
//         return;
//       }

//       // Early validation for missing PKCE verifier or OIDC nonce
//       if (config?.supportsPKCE && !savedCodeVerifier) {
//         res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=missing_pkce_verifier`);
//         return;
//       }
//       if (config?.supportsOIDC && !savedNonce) {
//         res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=missing_oidc_nonce`);
//         return;
//       }
//     }

//     try {
//       // Exchange authorization code for user profile using PKCE code_verifier and OIDC nonce
//       const profile = await verifyCallbackAndGetUser(provider, code, {
//         codeVerifier: savedCodeVerifier as string,
//         nonce: savedNonce as string,
//       });

//       // Register or link user
//       const user = await authenticateOAuthUser(provider, profile, {
//         userAgent: req.headers['user-agent'] ?? null,
//         ipAddress: req.ip ?? null,
//       });

//       // Track device and set session JWT cookies
//       await establishOAuthSession(res, user, {
//         userAgent: req.headers['user-agent'] ?? null,
//         ipAddress: req.ip ?? null,
//       });

//       res.redirect(`${env.FRONTEND_CUSTOMER_URL}/auth/callback`);
//     } catch (err) {
//       const errMsg = err instanceof Error ? err.message : 'authentication_failed';
//       res.redirect(`${env.FRONTEND_CUSTOMER_URL}/login?error=${encodeURIComponent(errMsg)}`);
//     }
//   },
// );

// /**
//  * Completes the OAuth login session initialization process.
//  */
// export async function establishOAuthSession(
//   res: Response,
//   user: User,
//   connectionContext: { userAgent: string | null; ipAddress: string | null },
// ): Promise<void> {
//   // Track device & detect suspicious logins
//   await trackDeviceAndDetectSuspicious(
//     user,
//     connectionContext.userAgent,
//     connectionContext.ipAddress,
//   );

//   // Generate tokens, store session, set cookies
//   // need attaintion
//   await authTokenService.generateAndSetTokens(res, user, {
//     userAgent: connectionContext.userAgent,
//     ipAddress: connectionContext.ipAddress,
//     rememberMe: true,
//   });
// }
