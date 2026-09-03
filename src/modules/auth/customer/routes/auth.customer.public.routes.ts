import { Router } from 'express';

import { LoginSchema, RegisterSchema, VerifyEmailSchema } from '../../auth.dto';
import * as controller from '../controllers/auth.customer.public.controller';

import { loginLimiter, registerLimiter } from '@/middleware/rateLimits';
import { validate } from '@/middleware/validate';

const router = Router();

/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user account
 *     description: Creates a new customer account and sends an email verification link.
 *     operationId: registerCustomer
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Account created — verification email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Registration successful. Please verify your email."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/register', registerLimiter, validate(RegisterSchema), controller.register);

/**
 * @swagger
 * /api/v1/auth/verify-email:
 *   post:
 *     summary: Verify email address with a one-time token
 *     description: Verifies the email address using the confirmation token sent via email during registration.
 *     operationId: verifyEmail
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token:
 *                 type: string
 *                 example: "verification-token-123"
 *                 description: Token from the verification email
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Email verified successfully. You can now log in."
 *               data: null
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       422:
 *         $ref: '#/components/responses/ValidationError'
 */
router.post('/verify-email', validate(VerifyEmailSchema), controller.verifyEmail);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login and obtain a JWT session cookie
 *     description: Authenticates credentials and sets HTTP-Only cookies `rfpnexa_token` and `rfpnexa_refresh`.
 *     operationId: login
 *     tags: [Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful. Cookies are set in response headers.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/AuthUser'
 *             example:
 *               success: true
 *               message: "Login successful"
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
 *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimited'
 */
router.post('/login', loginLimiter, validate(LoginSchema), controller.login);

export { router as customerAuthPublicRoutes };
