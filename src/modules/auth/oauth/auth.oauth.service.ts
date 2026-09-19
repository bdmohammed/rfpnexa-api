// import crypto from 'node:crypto';

// import bcrypt from 'bcryptjs';

// import { savePasswordToHistory } from '../security/auth.security.service';
// import { logSecurityEvent } from '../security/auth.securityLog.service';

// import { AppDataSource } from '@/config/database';
// import { env, isTestEnv } from '@/config/env';
// import { logger } from '@/config/logger';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { BCRYPT_ROUNDS } from '@/core/constants';
// import { Country } from '@/entities/Country';
// import { User } from '@/entities/User';
// import { AccountType, SecurityEvent } from '@/types/enums';

// export interface OAuthProfile {
//   providerId: string;
//   email: string;
//   name: string;
// }

// export interface OAuthProviderConfig {
//   authorizationEndpoint: string;
//   tokenEndpoint: string;
//   userInfoEndpoint: string;
//   supportsOIDC: boolean;
//   supportsPKCE: boolean;
//   scopes: string[];
//   extraAuthParams?: Record<string, string>;
//   getClientId: () => string | undefined;
//   getClientSecret: () => string | undefined;
// }

// export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
//   google: {
//     authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
//     tokenEndpoint: 'https://oauth2.googleapis.com/token',
//     userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
//     supportsOIDC: true,
//     supportsPKCE: true,
//     scopes: ['openid', 'email', 'profile'],
//     extraAuthParams: {
//       prompt: 'select_account',
//       access_type: 'offline',
//       include_granted_scopes: 'true',
//     },
//     getClientId: () => env.GOOGLE_CLIENT_ID,
//     getClientSecret: () => env.GOOGLE_CLIENT_SECRET,
//   },
//   github: {
//     authorizationEndpoint: 'https://github.com/login/oauth/authorize',
//     tokenEndpoint: 'https://github.com/login/oauth/access_token',
//     userInfoEndpoint: 'https://api.github.com/user',
//     supportsOIDC: false,
//     supportsPKCE: true,
//     scopes: ['read:user', 'user:email'],
//     getClientId: () => env.GITHUB_CLIENT_ID,
//     getClientSecret: () => env.GITHUB_CLIENT_SECRET,
//   },
//   microsoft: {
//     authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
//     tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
//     userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
//     supportsOIDC: true,
//     supportsPKCE: true,
//     scopes: ['openid', 'email', 'profile', 'User.Read', 'offline_access'],
//     extraAuthParams: {
//       prompt: 'select_account',
//     },
//     getClientId: () => env.MICROSOFT_CLIENT_ID,
//     getClientSecret: () => env.MICROSOFT_CLIENT_SECRET,
//   },
// };

// /** PKCE code verifier generator (32 bytes base64url) */
// export function generateCodeVerifier(): string {
//   return crypto.randomBytes(32).toString('base64url');
// }

// /** PKCE S256 challenge generator */
// export function generateCodeChallenge(verifier: string): string {
//   return crypto.createHash('sha256').update(verifier).digest('base64url');
// }

// /** OpenID Connect nonce generator */
// export function generateNonce(): string {
//   return crypto.randomBytes(32).toString('hex');
// }

// /**
//  * Checks if a provider has client ID and secret configured.
//  */
// function isConfigured(provider: string): boolean {
//   if (env.NODE_ENV === 'test') {
//     return false; // Force mock mode strictly in test environment
//   }
//   const config = OAUTH_PROVIDERS[provider];
//   if (!config) return false;
//   return !!(config.getClientId() && config.getClientSecret());
// }

// /**
//  * Gets the authorization endpoint URL for the given provider.
//  * Supports OAuth 2.1 PKCE and OpenID Connect Nonce.
//  */
// export function getAuthorizationUrl(
//   provider: string,
//   options: { state: string; codeChallenge: string; nonce?: string | undefined },
// ): string {
//   const config = OAUTH_PROVIDERS[provider];
//   if (!config) {
//     throw new AppError(
//       AppErrorMessage.INVALID_OAUTH_PROVIDER,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_PROVIDER,
//     );
//   }

//   const redirectUri = `${env.API_URL}/api/v1/auth/oauth/${provider}/callback`;

//   if (env.NODE_ENV === 'test') {
//     return `${redirectUri}?code=mock_code_${provider}_${crypto.randomBytes(4).toString('hex')}&state=${options.state}`;
//   }

//   if (!isConfigured(provider)) {
//     throw new AppError(
//       `OAuth provider '${provider}' is not configured on this server.`,
//       HttpStatusCode.INTERNAL_SERVER_ERROR,
//       AppErrorCode.INTERNAL_SERVER_ERROR,
//     );
//   }

//   const params = new URLSearchParams({
//     client_id: config.getClientId()!,
//     redirect_uri: redirectUri,
//     response_type: 'code',
//     scope: config.scopes.join(' '),
//     state: options.state,
//   });

//   if (config.supportsPKCE) {
//     params.set('code_challenge', options.codeChallenge);
//     params.set('code_challenge_method', 'S256');
//   }

//   if (config.supportsOIDC && options.nonce) {
//     params.set('nonce', options.nonce);
//   }

//   if (config.extraAuthParams) {
//     Object.entries(config.extraAuthParams).forEach(([k, v]) => {
//       params.set(k, v);
//     });
//   }

//   return `${config.authorizationEndpoint}?${params.toString()}`;
// }

// /**
//  * Verifies code callback, exchanges authorization code for access token using PKCE verifier,
//  * checks OpenID Connect ID Token nonce, and fetches user profile.
//  */
// // eslint-disable-next-line complexity, sonarjs/cognitive-complexity
// export async function verifyCallbackAndGetUser(
//   provider: string,
//   code: string,
//   options?: { codeVerifier?: string; nonce?: string },
// ): Promise<OAuthProfile> {
//   const config = OAUTH_PROVIDERS[provider];
//   if (!config) {
//     throw new AppError(
//       AppErrorMessage.INVALID_OAUTH_PROVIDER,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_PROVIDER,
//     );
//   }

//   if (isTestEnv() || code.startsWith('mock_code_')) {
//     return {
//       providerId: `${provider}-mock-${crypto.randomBytes(6).toString('hex')}`,
//       email: `mock.${provider}@example.com`,
//       name: `Mock ${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
//     };
//   }

//   if (!isConfigured(provider)) {
//     throw new AppError(
//       `OAuth provider '${provider}' is not configured on this server.`,
//       HttpStatusCode.INTERNAL_SERVER_ERROR,
//       AppErrorCode.INTERNAL_SERVER_ERROR,
//     );
//   }

//   const redirectUri = `${env.API_URL}/api/v1/auth/oauth/${provider}/callback`;

//   try {
//     const tokenParams: Record<string, string> = {
//       code,
//       client_id: config.getClientId()!,
//       client_secret: config.getClientSecret()!,
//       redirect_uri: redirectUri,
//       grant_type: 'authorization_code',
//     };

//     if (config.supportsPKCE && options?.codeVerifier) {
//       tokenParams['code_verifier'] = options.codeVerifier;
//     }

//     const tokenHeaders: Record<string, string> = {
//       'Content-Type': 'application/x-www-form-urlencoded',
//     };
//     if (provider === 'github') {
//       tokenHeaders['Accept'] = 'application/json';
//     }

//     const tokenRes = await fetch(config.tokenEndpoint, {
//       method: 'POST',
//       headers: tokenHeaders,
//       body: new URLSearchParams(tokenParams),
//     });

//     if (!tokenRes.ok) {
//       throw new Error(`${provider} token exchange failed: ${await tokenRes.text()}`);
//     }

//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     const tokenData: any = await tokenRes.json();

//     // Verify OIDC ID Token Nonce if present
//     if (config.supportsOIDC && tokenData.id_token && options?.nonce) {
//       try {
//         const parts = tokenData.id_token.split('.');
//         if (parts.length === 3) {
//           const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
//           const payload = JSON.parse(payloadJson);
//           if (payload.nonce && payload.nonce !== options.nonce) {
//             throw new Error(`OIDC nonce mismatch: expected ${options.nonce}, got ${payload.nonce}`);
//           }
//         }
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       } catch (err: any) {
//         logger.error({ err, provider }, 'OIDC ID Token nonce verification failed');
//         throw new AppError(
//           `OAuth ID Token verification failed: ${err.message}`,
//           HttpStatusCode.UNAUTHORIZED,
//           AppErrorCode.OAUTH_VERIFICATION_FAILED,
//         );
//       }
//     }

//     // Fetch user profile
//     if (provider === 'google') {
//       const profileRes = await fetch(config.userInfoEndpoint, {
//         headers: { Authorization: `Bearer ${tokenData.access_token}` },
//       });
//       if (!profileRes.ok) {
//         throw new Error(`Google userinfo fetch failed: ${await profileRes.text()}`);
//       }
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const profile: any = await profileRes.json();
//       return {
//         providerId: profile.sub,
//         email: profile.email,
//         name: profile.name,
//       };
//     }

//     if (provider === 'github') {
//       const userRes = await fetch(config.userInfoEndpoint, {
//         headers: {
//           Authorization: `Bearer ${tokenData.access_token}`,
//           'User-Agent': 'RFPNexa',
//         },
//       });
//       if (!userRes.ok) {
//         throw new Error(`GitHub user fetch failed: ${await userRes.text()}`);
//       }
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const userData: any = await userRes.json();

//       const emailsRes = await fetch('https://api.github.com/user/emails', {
//         headers: {
//           Authorization: `Bearer ${tokenData.access_token}`,
//           'User-Agent': 'RFPNexa',
//         },
//       });
//       let { email } = userData;
//       if (emailsRes.ok) {
//         // eslint-disable-next-line @typescript-eslint/no-explicit-any
//         const emails: any[] = (await emailsRes.json()) as any;
//         const primaryEmail =
//           emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
//         if (primaryEmail) {
//           // eslint-disable-next-line prefer-destructuring
//           email = primaryEmail.email;
//         }
//       }
//       if (!email) {
//         throw new Error('No verified email associated with this GitHub account.');
//       }
//       return {
//         providerId: String(userData.id),
//         email,
//         name: userData.name ?? userData.login,
//       };
//     }

//     if (provider === 'microsoft') {
//       const profileRes = await fetch(config.userInfoEndpoint, {
//         headers: { Authorization: `Bearer ${tokenData.access_token}` },
//       });
//       if (!profileRes.ok) {
//         throw new Error(`Microsoft Graph profile fetch failed: ${await profileRes.text()}`);
//       }
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const profile: any = await profileRes.json();
//       return {
//         providerId: profile.id,
//         email: profile.mail ?? profile.userPrincipalName,
//         name: profile.displayName ?? profile.givenName ?? 'Microsoft User',
//       };
//     }

//     throw new AppError(
//       AppErrorMessage.INVALID_OAUTH_PROVIDER,
//       HttpStatusCode.BAD_REQUEST,
//       AppErrorCode.INVALID_PROVIDER,
//     );
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//   } catch (error: any) {
//     if (error instanceof AppError) throw error;
//     logger.error({ err: error, provider }, 'OAuth callback verification failure');
//     throw new AppError(
//       AppErrorMessage.OAUTH_LOGIN_FAILED(provider, error.message),
//       HttpStatusCode.UNAUTHORIZED,
//       AppErrorCode.OAUTH_VERIFICATION_FAILED,
//     );
//   }
// }

// /**
//  * Handles account lookup, auto-linking, or auto-registration inside a short atomic database transaction.
//  */

// export async function authenticateOAuthUser(
//   provider: string,
//   profile: OAuthProfile,
//   clientMetadata?: { userAgent: string | null; ipAddress: string | null },
// ): Promise<User> {
//   const email = profile.email.trim().toLowerCase();

//   // Generate random temporary password hash outside transaction
//   const temporaryPassword = crypto.randomBytes(32).toString('hex');
//   const passwordHash = await bcrypt.hash(temporaryPassword, BCRYPT_ROUNDS.PASSWORD);

//   let targetUser: User | null = null;
//   let isNewUser = false;
//   let isLinked = false;

//   // eslint-disable-next-line sonarjs/cognitive-complexity
//   await AppDataSource.transaction(async (manager) => {
//     const userRepo = manager.getRepository(User);

//     // 1. Query by provider ID
//     if (provider === 'google') {
//       targetUser = await userRepo.findOne({ where: { googleId: profile.providerId } });
//     } else if (provider === 'github') {
//       targetUser = await userRepo.findOne({ where: { githubId: profile.providerId } });
//     } else if (provider === 'microsoft') {
//       targetUser = await userRepo.findOne({ where: { microsoftId: profile.providerId } });
//     }

//     if (targetUser) {
//       if (targetUser.isBlocked) {
//         throw new AppError(
//           AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_SUPPORT,
//           HttpStatusCode.FORBIDDEN,
//           AppErrorCode.ACCOUNT_BLOCKED,
//         );
//       }
//       targetUser.lastLoginAt = new Date();
//       await userRepo.save(targetUser);
//       return;
//     }

//     // 2. Query by Email (Auto-linking)
//     targetUser = await userRepo.findOne({ where: { email } });

//     if (targetUser) {
//       if (targetUser.isBlocked) {
//         throw new AppError(
//           AppErrorMessage.ACCOUNT_SUSPENDED_CONTACT_SUPPORT,
//           HttpStatusCode.FORBIDDEN,
//           AppErrorCode.ACCOUNT_BLOCKED,
//         );
//       }

//       // Link provider account
//       if (provider === 'google') {
//         targetUser.googleId = profile.providerId;
//       } else if (provider === 'github') {
//         targetUser.githubId = profile.providerId;
//       } else if (provider === 'microsoft') {
//         targetUser.microsoftId = profile.providerId;
//       }

//       if (!targetUser.emailVerified) {
//         targetUser.emailVerified = true;
//       }
//       targetUser.lastLoginAt = new Date();
//       await userRepo.save(targetUser);
//       isLinked = true;
//       return;
//     }

//     // 3. Register a new user (Auto-registration)
//     isNewUser = true;

//     let defaultCountry = await manager.getRepository(Country).findOne({
//       where: { isActive: true },
//     });
//     defaultCountry ??= await manager.getRepository(Country).save(
//       manager.getRepository(Country).create({
//         code: 'US',
//         name: 'United States',
//         slug: 'united-states',
//         isActive: true,
//       }),
//     );

//     const newUserDto: Partial<User> = {
//       name: profile.name,
//       email,
//       companyName: profile.name,
//       countryId: String(defaultCountry.id),
//       passwordHash,
//       emailVerified: true, // OAuth emails are pre-verified by provider
//       accountType: AccountType.USER,
//       passwordChangedAt: new Date(),
//       lastLoginAt: new Date(),
//     };

//     if (provider === 'google') {
//       newUserDto.googleId = profile.providerId;
//     } else if (provider === 'github') {
//       newUserDto.githubId = profile.providerId;
//     } else if (provider === 'microsoft') {
//       newUserDto.microsoftId = profile.providerId;
//     }

//     targetUser = userRepo.create(newUserDto);
//     await userRepo.save(targetUser);
//     await savePasswordToHistory(targetUser.id, passwordHash, manager);
//   });

//   // Post-commit non-blocking security logging
//   // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
//   if (isNewUser) {
//     logSecurityEvent({
//       userId: targetUser!.id,
//       email: targetUser!.email,
//       event: SecurityEvent.REGISTER_SUCCESS,
//       ipAddress: clientMetadata?.ipAddress ?? null,
//       userAgent: clientMetadata?.userAgent ?? null,
//       details: { method: `oauth_${provider}` },
//     }).catch((err) => {
//       logger.error({ err, userId: targetUser?.id }, 'Failed to log OAuth register security event');
//     });
//   }

//   logSecurityEvent({
//     userId: targetUser!.id,
//     email: targetUser!.email,
//     event: SecurityEvent.LOGIN_SUCCESS,
//     ipAddress: clientMetadata?.ipAddress ?? null,
//     userAgent: clientMetadata?.userAgent ?? null,
//     // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
//     details: { method: `oauth_${provider}`, ...(isLinked ? { action: 'linked' } : {}) },
//   }).catch((err) => {
//     logger.error({ err, userId: targetUser?.id }, 'Failed to log OAuth login security event');
//   });

//   return targetUser!;
// }
