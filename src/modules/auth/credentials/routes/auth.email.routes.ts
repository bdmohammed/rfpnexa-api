// import { Router } from 'express';

// import {
//   ChangePasswordSchema,
//   EmailChangeSchema,
//   ResendVerificationSchema,
//   VerifyEmailSchema,
// } from '../../auth.dto';
// import * as emailController from '../controllers/auth.email.controller';

// import { authenticate } from '@/middleware/authenticate';
// import {
//   emailChangeLimiter,
//   resendVerificationEmailLimiter,
//   resendVerificationLimiter,
// } from '@/middleware/rateLimits';
// import { validate } from '@/middleware/validate';

// const router = Router();

// /**
//  * @swagger
//  * /api/v1/auth/email/change/verify:
//  *   post:
//  *     summary: Complete email change verification
//  *     description: Verifies email change token and updates user's primary email. Logs out user upon completion.
//  *     operationId: verifyEmailChange
//  *     tags: [Auth]
//  *     security:
//  *       - csrfToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required: [token]
//  *             properties:
//  *               token:
//  *                 type: string
//  *                 description: Verification token sent to new email
//  *                 example: "email-verification-token-999"
//  *     responses:
//  *       200:
//  *         description: Email changed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "Email changed successfully. Please log in again."
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       409:
//  *         $ref: '#/components/responses/Conflict'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.post('/email/change/verify', validate(VerifyEmailSchema), emailController.verifyEmailChange);

// /**
//  * @swagger
//  * /api/v1/auth/password/change:
//  *   post:
//  *     summary: Change user password
//  *     description: Changes user password and revokes all active sessions.
//  *     operationId: changePassword
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/ChangePasswordSchema'
//  *     responses:
//  *       200:
//  *         description: Password changed successfully. User is logged out.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "Password changed successfully. Please log in again."
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.post(
//   '/password/change',
//   authenticate,
//   validate(ChangePasswordSchema),
//   emailController.changePassword,
// );

// /**
//  * @swagger
//  * /api/v1/auth/email/change:
//  *   post:
//  *     summary: Request email change
//  *     description: Initiates email change verification process. Sends confirmation links to both current and new emails.
//  *     operationId: requestEmailChange
//  *     tags: [Auth]
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required: [email]
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 description: New proposed email
//  *                 example: "new.email@example.com"
//  *     responses:
//  *       200:
//  *         description: Verification emails sent successfully
//  *       400:
//  *         $ref: '#/components/responses/ValidationError'
//  *       401:
//  *         $ref: '#/components/responses/Unauthorized'
//  *       409:
//  *         $ref: '#/components/responses/Conflict'
//  *       429:
//  *         $ref: '#/components/responses/TooManyRequests'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.post(
//   '/email/change',
//   authenticate,
//   emailChangeLimiter,
//   validate(EmailChangeSchema),
//   emailController.requestEmailChange,
// );

// /**
//  * @swagger
//  * /api/v1/auth/resend-verification:
//  *   post:
//  *     summary: Resend email verification link
//  *     description: Resends the activation link to the user's email if they haven't verified it yet.
//  *     operationId: resendVerification
//  *     tags: [Auth]
//  *     security:
//  *       - csrfToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required: [email]
//  *             properties:
//  *               email:
//  *                 type: string
//  *                 format: email
//  *                 example: "jane@example.com"
//  *                 description: User email address
//  *     responses:
//  *       200:
//  *         description: Resend email link triggered (always 200 to prevent email enumeration)
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  *             example:
//  *               success: true
//  *               message: "If the email exists and is not verified, a new verification link has been sent."
//  *               data: null
//  *               traceId: "d3b07384-d113-4ec2-a5d6-c73e16723223"
//  *       422:
//  *         $ref: '#/components/responses/ValidationError'
//  *       429:
//  *         $ref: '#/components/responses/RateLimited'
//  *       500:
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.post(
//   '/resend-verification',
//   resendVerificationLimiter,
//   resendVerificationEmailLimiter,
//   validate(ResendVerificationSchema),
//   emailController.resendVerification,
// );

// export { router as emailAuthRoutes };
