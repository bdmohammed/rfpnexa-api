import { Router } from 'express';

import { ForgotPasswordSchema, ResetPasswordSchema } from '../../auth.dto';
import * as authPasswordController from '../controllers/auth.password.controller';

import { passwordResetEmailLimiter, passwordResetLimiter } from '@/middleware/rateLimits';
import { validate } from '@/middleware/validate';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/forgot-password:
 *   post:
 *     summary: Request a password reset email
 *     description: Sends a password recovery email containing a one-time link.
 *     operationId: forgotPassword
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: "jane@example.com"
 *     responses:
 *       200:
 *         description: Reset email sent (always returns generic 200 to prevent account enumeration)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "If that email is registered, a reset link has been sent."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post(
  '/forgot-password',
  passwordResetLimiter,
  passwordResetEmailLimiter,
  validate(ForgotPasswordSchema),
  authPasswordController.forgotPassword,
);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Reset password using a one-time token
 *     description: Validates password reset token and saves the new password.
 *     operationId: resetPassword
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "reset-token-xyz"
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: "NewSecurePass123!"
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Password reset successfully. Please log in."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/reset-password', validate(ResetPasswordSchema), authPasswordController.resetPassword);

export { router as authPasswordRoutes };
