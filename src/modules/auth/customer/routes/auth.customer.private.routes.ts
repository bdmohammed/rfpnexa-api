import { Router } from 'express';

import { getMe, logout } from '../controllers/auth.customer.private.controller';

import { authenticateAllowUnverified } from '@/middleware/authenticate';
import { loadPermissions } from '@/middleware/permissions';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate the current session
 *     description: Revokes the current session and clears HTTP-Only cookies rfpnexa_token and rfpnexa_refresh server-side.
 *     operationId: logout
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Logged out successfully"
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/logout', authenticateAllowUnverified, logout);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user profile
 *     description: Resolves the logged-in user profile, active roles, and permissions list.
 *     operationId: getMe
 *     tags: [Auth]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Current user profile and permission list
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/MeResponse'
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                 name: "Jane Doe"
 *                 email: "jane@example.com"
 *                 accountType: "user"
 *                 emailVerified: true
 *                 status: "active"
 *                 companyName: "Acme Corp"
 *                 country: "United States"
 *                 mustResetPassword: false
 *                 createdAt: "2026-07-01T12:00:00.000Z"
 *                 roles: ["tender-reviewer"]
 *                 permissions: ["tender.create", "tender.edit"]
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get('/me', authenticateAllowUnverified, loadPermissions, getMe);

export { router as customerAuthPrivateRoutes };
