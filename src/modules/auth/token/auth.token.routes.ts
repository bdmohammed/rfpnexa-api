import { Router } from 'express';

import * as controller from './auth.token.controller';
import { csrfLimiter, refreshLimiter } from '@/middleware/rateLimits';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/csrf-token:
 *   get:
 *     summary: Get CSRF token
 *     description: Required before any state-mutating request (POST/PATCH/DELETE). Pass the returned token in the x-csrf-token header. Returns Cache-Control no-store headers.
 *     operationId: getCsrfToken
 *     tags: [Auth]
 *     security: []
 *     responses:
 *       200:
 *         description: CSRF token issued
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required: [success, data]
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   required: [csrfToken]
 *                   properties:
 *                     csrfToken:
 *                       type: string
 *                       example: "c7b395e8-5b4d-4952-b88a-36fb2e46b9a1"
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/csrf-token', csrfLimiter, controller.getCsrfToken);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Rotate session tokens
 *     description: Validates the HttpOnly refresh token cookie and issues a new access + refresh token pair. Stateless — no database lookup required.
 *     operationId: refreshTokens
 *     tags: [Auth]
 *     security:
 *       - refreshCookie: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Session tokens rotated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Session refreshed successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/refresh', refreshLimiter, controller.refresh);

export { router as tokenAuthRoutes };
