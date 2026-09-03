import { Router } from 'express';

import { OAuthCallbackQuerySchema, OAuthProviderSchema } from '../auth.dto';

import * as oauthController from './auth.oauth.controller';

import { validate } from '@/middleware/validate';

const router = Router();

// ─── OAuth Social Sign-In ─────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/auth/oauth/{provider}:
 *   get:
 *     summary: Redirect to OAuth provider
 *     description: Redirects client to the chosen OAuth provider's portal (google, github, microsoft) to authenticate.
 *     operationId: redirectToOAuthProvider
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *         description: OAuth provider name
 *     responses:
 *       302:
 *         description: Redirect to provider authorization page. Cookie/Header parameters not required as it initiates a browser-level redirection.
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/oauth/:provider',
  validate(OAuthProviderSchema, 'params'),
  oauthController.redirectToProvider,
);

/**
 * @swagger
 * /api/v1/auth/oauth/{provider}/callback:
 *   get:
 *     summary: Handle OAuth provider callback
 *     description: Exchanges authorization code for user profile, logs/registers the user, and redirects to frontend. Sets HttpOnly cookies.
 *     operationId: handleOAuthCallback
 *     tags: [Auth]
 *     security: []
 *     parameters:
 *       - name: provider
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github, microsoft]
 *         description: OAuth provider name
 *       - name: code
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth authorization code from provider
 *       - name: state
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *         description: OAuth CSRF state value to verify request authenticity
 *     responses:
 *       302:
 *         description: Redirects caller to frontend app (either success dashboard or login page with error query)
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/oauth/:provider/callback',
  validate(OAuthProviderSchema, 'params'),
  validate(OAuthCallbackQuerySchema, 'query'),
  oauthController.handleCallback,
);

export { router as oauthAuthRoutes };
