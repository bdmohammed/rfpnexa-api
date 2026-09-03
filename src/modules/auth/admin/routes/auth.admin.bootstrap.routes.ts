import { Router } from 'express';

import {
  ApproveBootstrapAdminSchema,
  OwnerReviewSchema,
  VerifyBootstrapTokenSchema,
} from '../../auth.dto';
import * as authBootstrapController from '../controller/auth.admin.bootstrap.controller';

import { validate } from '@/middleware/validate';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/auth/owner-review:
 *   get:
 *     summary: Review admin requests for Owner (Public)
 *     description: Returns a list of pending admin registrations.
 *     operationId: ownerReview
 *     tags: [Admin Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner token to authorize action
 *     responses:
 *       200:
 *         description: Admin registration requests resolved successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/owner-review',
  validate(OwnerReviewSchema, 'query'),
  authBootstrapController.ownerReview,
);

/**
 * @swagger
 * /api/v1/admin/auth/bootstrap:
 *   get:
 *     summary: Verify bootstrap token (Public)
 *     description: Validates the token before launching initial admin registration.
 *     operationId: verifyBootstrapToken
 *     tags: [Admin Auth]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Bootstrap token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 *
 *   post:
 *     summary: Approve bootstrap admin creation (Public)
 *     description: Creates the initial platform administrator if bootstrap credentials match.
 *     operationId: approveBootstrapAdmin
 *     tags: [Admin Auth]
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
 *               token: { type: string }
 *               action:
 *                 type: string
 *                 enum: [approve, reject]
 *                 default: approve
 *     responses:
 *       200:
 *         description: Platform bootstrapped successfully
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get(
  '/bootstrap',
  validate(VerifyBootstrapTokenSchema, 'query'),
  authBootstrapController.verifyBootstrapToken,
);
router.post(
  '/bootstrap',
  validate(ApproveBootstrapAdminSchema),
  authBootstrapController.approveBootstrapAdmin,
);

export { router as adminAuthBootstrapRoutes };
