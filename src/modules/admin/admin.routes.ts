import { Router } from 'express';

import { auditLogger } from '../../middleware/auditLogger';
import { authenticate } from '../../middleware/authenticate';
import { requireAnyPermission, requirePermission } from '../../middleware/permissions';
import { requireAccountType } from '../../middleware/requireAccountType';
import { validate } from '../../middleware/validate';
import { AccountType } from '../../types/enums';
import * as authController from '../auth/auth.controller';
import {
  ApproveBootstrapAdminSchema,
  ForgotPasswordSchema,
  LoginSchema,
  OwnerReviewSchema,
  RegisterSchema,
  ResendVerificationSchema,
  ResetPasswordSchema,
  VerifyBootstrapTokenSchema,
  VerifyEmailSchema,
} from '../auth/auth.dto';

import * as controller from './admin.controller';
import {
  AssignUserRolesBodySchema,
  BlockUserSchema,
  CreateAdminSchema,
  CreateUserNoteSchema,
  IdParamSchema,
  ImpersonateUserSchema,
  ListUsersQuerySchema,
  PaginationQuerySchema,
  ReviewApprovalBodySchema,
  RoleParamSchema,
  SessionParamSchema,
  SubmitApprovalBodySchema,
  UpdateUserDetailSchema,
} from './admin.dto';
import setupRouter from './setup.routes';

import { TenderPermissions, UserPermissions } from '@/constants/permissions';
import { PermissionModules } from '@/types/types';

const router = Router();

// ─── Public Admin Auth Endpoints (No Session Required) ────────────────────────

/**
 * @swagger
 * /api/v1/admin/auth/register:
 *   post:
 *     summary: Register a new admin request (Public)
 *     description: Submits a registration application for the administrator role. Awaiting system owner approval.
 *     operationId: registerAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password, firstName, lastName]
 *             properties:
 *               email: { type: string, format: email, example: "superadmin@gmail.com" }
 *               password: { type: string, example: "1234@Admin#" }
 *               firstName: { type: string, example: "John" }
 *               lastName: { type: string, example: "Smith" }
 *     responses:
 *       201:
 *         description: Application submitted successfully
 */
router.post('/auth/register', validate(RegisterSchema), authController.registerAdmin);

/**
 * @swagger
 * /api/v1/admin/auth/login:
 *   post:
 *     summary: Admin credentials login (Public)
 *     description: Authenticates admin users and returns HTTP-Only session cookies.
 *     operationId: loginAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email, example: "superadmin@gmail.com" }
 *               password: { type: string, example: "1234@Admin#" }
 *     responses:
 *       200:
 *         description: Login successful
 */
router.post('/auth/login', validate(LoginSchema), authController.loginAdmin);

/**
 * @swagger
 * /api/v1/admin/auth/verify-email:
 *   post:
 *     summary: Verify admin email token (Public)
 *     description: Verifies the email address using the confirmation token sent during registration.
 *     operationId: verifyAdminEmail
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
 *               token: { type: string, example: "token123" }
 *     responses:
 *       200:
 *         description: Email verified successfully
 */
router.post('/auth/verify-email', validate(VerifyEmailSchema), authController.verifyAdminEmail);

/**
 * @swagger
 * /api/v1/admin/auth/resend-verification:
 *   post:
 *     summary: Resend admin email verification (Public)
 *     description: Re-dispatches email confirmation instructions.
 *     operationId: resendAdminVerification
 *     tags: [Admin Auth]
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
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Verification email resent
 */
router.post(
  '/auth/resend-verification',
  validate(ResendVerificationSchema),
  authController.resendAdminVerification,
);

/**
 * @swagger
 * /api/v1/admin/auth/forgot-password:
 *   post:
 *     summary: Request admin password reset (Public)
 *     description: Sends instructions to change the password if the account exists.
 *     operationId: forgotAdminPassword
 *     tags: [Admin Auth]
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
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Password reset email sent
 */
router.post(
  '/auth/forgot-password',
  validate(ForgotPasswordSchema),
  authController.forgotAdminPassword,
);

/**
 * @swagger
 * /api/v1/admin/auth/reset-password:
 *   post:
 *     summary: Reset admin password with token (Public)
 *     description: Changes password using a valid forgot-password token.
 *     operationId: resetAdminPassword
 *     tags: [Admin Auth]
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
 *               token: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Password updated successfully
 */
router.post(
  '/auth/reset-password',
  validate(ResetPasswordSchema),
  authController.resetAdminPassword,
);
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
 */
router.get('/auth/owner-review', validate(OwnerReviewSchema, 'query'), authController.ownerReview);

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
 */
router.get(
  '/auth/bootstrap',
  validate(VerifyBootstrapTokenSchema, 'query'),
  authController.verifyBootstrapToken,
);
router.post(
  '/auth/bootstrap',
  validate(ApproveBootstrapAdminSchema),
  authController.approveBootstrapAdmin,
);

// ─── Protected Admin Endpoints (Require Admin Session) ─────────────────────────
router.use(authenticate, requireAccountType(AccountType.ADMIN));

/**
 * @swagger
 * /api/v1/admin/auth/logout:
 *   post:
 *     summary: Log out admin user
 *     description: Invalidates admin token cookies and terminates the active session.
 *     operationId: logoutAdmin
 *     tags: [Admin Auth]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       200:
 *         description: Logout successful
 */
router.post('/auth/logout', authController.logoutAdmin);

router.use('/register', setupRouter);

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users/stats:
 *   get:
 *     summary: Get overall user directory statistics
 *     description: |
 *       Resolves aggregate metrics for users (total, active, suspended, account types).
 *       **Required Permission:** `user.view`
 *     operationId: getUserStats
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Statistics metrics resolved
 */
router.get('/users/stats', requirePermission(UserPermissions.VIEW.key), controller.getUserStats);

/**
 * @swagger
 * /api/v1/admin/users:
 *   get:
 *     summary: List platform users directory
 *     description: |
 *       Returns a paginated list of all customers, vendors, and admins.
 *       **Required Permission:** `user.view`
 *     operationId: listUsers
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: search
 *         in: query
 *         required: false
 *         schema: { type: string }
 *       - name: permission
 *         in: query
 *         required: false
 *         schema: { type: string }
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Users list resolved
 */
router.get(
  '/users',
  requireAnyPermission([UserPermissions.VIEW.key, TenderPermissions.MANAGE.key]),
  validate(ListUsersQuerySchema, 'query'),
  controller.listUsers,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}:
 *   get:
 *     summary: Get user details by ID
 *     description: |
 *       Retrieves the core profile of a single user.
 *       **Required Permission:** `user.view`
 *     operationId: getUserById
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Profile details resolved
 */
router.get(
  '/users/:id',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserById,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/block:
 *   patch:
 *     summary: Toggle user block status
 *     description: |
 *       Blocks or unblocks a user from authenticating.
 *       **Required Permission:** `user.block`
 *     operationId: blockUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isBlocked]
 *             properties:
 *               isBlocked: { type: boolean }
 *     responses:
 *       200:
 *         description: User status toggled
 */
router.patch(
  '/users/:id/block',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  validate(BlockUserSchema),
  auditLogger(UserPermissions.MANAGE.key, PermissionModules.USER),
  controller.blockUser,
);

/**
 * @swagger
 * /api/v1/admin/users/admin:
 *   post:
 *     summary: Create new administrator account
 *     description: |
 *       Initializes a new admin user record directly (Super-Admin option).
 *       **Required Permission:** `user.create_admin`
 *     operationId: createAdminUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, firstName, lastName]
 *     responses:
 *       201:
 *         description: Admin created
 */
router.post(
  '/users/admin',
  requirePermission(UserPermissions.MANAGE.key),
  validate(CreateAdminSchema),
  auditLogger(UserPermissions.MANAGE.key, PermissionModules.USER),
  controller.createAdmin,
);

// Detailed user administration sub-resource endpoints

/**
 * @swagger
 * /api/v1/admin/users/{id}/overview:
 *   get:
 *     summary: Get detailed user overview summary
 *     description: |
 *       Resolves key security status, subscription type, and transaction history.
 *       **Required Permission:** `user.view`
 *     operationId: getUserOverview
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Overview details resolved
 */
router.get(
  '/users/:id/overview',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserOverview,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/security:
 *   get:
 *     summary: Get user security settings stats
 *     description: |
 *       Resolves 2FA, password change history, and active sessions count.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSecurity
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Security summary
 */
router.get(
  '/users/:id/security',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserSecurity,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions:
 *   get:
 *     summary: List user active sessions
 *     description: |
 *       Lists token refresh details, login locations, and browsers.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSessions
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Sessions list resolved
 */
router.get(
  '/users/:id/sessions',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserSessions,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/devices:
 *   get:
 *     summary: List user recognized devices
 *     description: |
 *       Lists devices registered or cookie fingerprint keys matching user logins.
 *       **Required Permission:** `user.view`
 *     operationId: getUserDevices
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Devices list
 */
router.get(
  '/users/:id/devices',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserDevices,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/activity:
 *   get:
 *     summary: Get user action logs
 *     description: |
 *       Resolves recent events triggered by this user ID.
 *       **Required Permission:** `user.view`
 *     operationId: getUserActivity
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Activity log resolved
 */
router.get(
  '/users/:id/activity',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(PaginationQuerySchema, 'query'),
  controller.getUserActivity,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/timeline:
 *   get:
 *     summary: Get chronological timeline events
 *     description: |
 *       Resolves subscription upgrades, profile shifts, and ticket completions on a timeline.
 *       **Required Permission:** `user.view`
 *     operationId: getUserTimeline
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Timeline events resolved
 */
router.get(
  '/users/:id/timeline',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserTimeline,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/audit:
 *   get:
 *     summary: Get user audit log timeline
 *     description: |
 *       Resolves security and mutation records.
 *       **Required Permission:** `user.view`
 *     operationId: getUserAuditLogs
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Audit records resolved
 */
router.get(
  '/users/:id/audit',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(PaginationQuerySchema, 'query'),
  controller.getUserAuditLogs,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/subscription:
 *   get:
 *     summary: Get user subscription overview
 *     description: |
 *       Resolves active payment details and expiry dates.
 *       **Required Permission:** `user.view`
 *     operationId: getUserSubscription
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Subscription status details
 */
router.get(
  '/users/:id/subscription',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserSubscription,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/notes:
 *   get:
 *     summary: Get internal admin notes on user
 *     description: |
 *       Lists internal warnings or status notes recorded by admins.
 *       **Required Permission:** `user.view`
 *     operationId: getUserNotes
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Internal notes resolved
 *
 *   post:
 *     summary: Add internal admin note to user
 *     description: |
 *       Saves a warning note regarding this user profile.
 *       **Required Permission:** `user.view`
 *     operationId: createUserNote
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note: { type: string }
 *     responses:
 *       201:
 *         description: Note appended successfully
 */
router.get(
  '/users/:id/notes',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getUserNotes,
);
router.post(
  '/users/:id/notes',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(CreateUserNoteSchema),
  controller.createUserNote,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/details:
 *   patch:
 *     summary: Edit user contact profile details
 *     description: |
 *       Edits name, phone, or address details.
 *       **Required Permission:** `user.view`
 *     operationId: updateUserDetail
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: User profile edited
 */
router.patch(
  '/users/:id/details',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(UpdateUserDetailSchema),
  auditLogger('user.update', 'user'),
  controller.updateUserDetail,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/suspend:
 *   post:
 *     summary: Suspend user account
 *     description: |
 *       Suspends a user, blocking all auth triggers.
 *       **Required Permission:** `user.block`
 *     operationId: suspendUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Account suspended successfully
 */
router.post(
  '/users/:id/suspend',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.suspend', 'user'),
  controller.suspendUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/activate:
 *   post:
 *     summary: Activate suspended user account
 *     description: |
 *       Un-suspends a user.
 *       **Required Permission:** `user.block`
 *     operationId: activateUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Account activated
 */
router.post(
  '/users/:id/activate',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.activate', 'user'),
  controller.activateUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/archive:
 *   post:
 *     summary: Soft archive user profile
 *     description: |
 *       Hides user profile from regular searches.
 *       **Required Permission:** `user.block`
 *     operationId: archiveUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: User archived
 */
router.post(
  '/users/:id/archive',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.archive', 'user'),
  controller.archiveUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/unarchive:
 *   post:
 *     summary: Restore archived user profile
 *     description: |
 *       Restores an archived profile.
 *       **Required Permission:** `user.block`
 *     operationId: unarchiveUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: User restored
 */
router.post(
  '/users/:id/unarchive',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.unarchive', 'user'),
  controller.unarchiveUser,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/force-password-reset:
 *   post:
 *     summary: Force user password reset on next login
 *     description: |
 *       Forces the user to select a new password on their next authentication attempt.
 *       **Required Permission:** `user.view`
 *     operationId: forcePasswordReset
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Reset rule activated
 */
router.post(
  '/users/:id/force-password-reset',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.force_password_reset', 'user'),
  controller.forcePasswordChange,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/reset-password:
 *   post:
 *     summary: Send password reset email link
 *     description: |
 *       Sends a password reset token URL to the user's inbox.
 *       **Required Permission:** `user.view`
 *     operationId: sendAdminResetPasswordEmail
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Email dispatched
 */
router.post(
  '/users/:id/reset-password',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.reset_password', 'user'),
  controller.sendResetPasswordEmail,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/send-verification:
 *   post:
 *     summary: Resend verification email to user
 *     description: |
 *       Triggers confirmation mail sequence to verify user email address.
 *       **Required Permission:** `user.view`
 *     operationId: sendAdminUserVerification
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Email sent successfully
 */
router.post(
  '/users/:id/send-verification',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.send_verification', 'user'),
  controller.sendUserVerification,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/submit-approval:
 *   post:
 *     summary: Submit a user request for review/approval
 *     description: |
 *       Creates an approval request for the specified user record.
 *       **Required Permission:** `user.view`
 *     operationId: submitApproval
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewerId, notes]
 *             properties:
 *               reviewerId: { type: string, format: uuid, example: "b2c3d4e5-f6a7-8901-bcde-23456789012a" }
 *               notes: { type: string, example: "Profile details checked, needs final sign-off." }
 *     responses:
 *       200:
 *         description: Approval request submitted successfully
 */
router.post(
  '/users/:id/submit-approval',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(SubmitApprovalBodySchema),
  auditLogger('user.submit_approval', 'user'),
  controller.submitApproval,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/review-approval:
 *   post:
 *     summary: Review and process approval request
 *     description: |
 *       Approves or rejects a pending user registration review.
 *       **Required Permission:** `user.view`
 *     operationId: reviewApproval
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject], example: "approve" }
 *               reason: { type: string, example: "User credentials are valid." }
 *     responses:
 *       200:
 *         description: Approval request reviewed successfully
 */
router.post(
  '/users/:id/review-approval',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(ReviewApprovalBodySchema),
  auditLogger('user.review_approval', 'user'),
  controller.reviewApproval,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/approval-request:
 *   get:
 *     summary: Get user registration approval request details
 *     description: |
 *       Retrieves the pending approval request details for the specified user.
 *       **Required Permission:** `user.view`
 *     operationId: getApprovalRequest
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Approval request details resolved
 */
router.get(
  '/users/:id/approval-request',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getApprovalRequest,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions/{sessionId}:
 *   delete:
 *     summary: Terminate specific user session
 *     description: |
 *       Revokes a single login session.
 *       **Required Permission:** `user.view`
 *     operationId: revokeUserSession
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: sessionId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Session terminated
 */
router.delete(
  '/users/:id/sessions/:sessionId',
  requirePermission(UserPermissions.VIEW.key),
  validate(SessionParamSchema, 'params'),
  auditLogger('user.revoke_session', 'user'),
  controller.revokeSession,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/sessions:
 *   delete:
 *     summary: Terminate all user sessions
 *     description: |
 *       Logs the user out of all devices and browsers immediately.
 *       **Required Permission:** `user.view`
 *     operationId: revokeAllUserSessions
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: All active sessions revoked
 */
router.delete(
  '/users/:id/sessions',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  auditLogger('user.revoke_all_sessions', 'user'),
  controller.revokeAllSessions,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/impersonate:
 *   post:
 *     summary: Establish impersonation session
 *     description: |
 *       Establishes an impersonation token to act on behalf of the user. Logs audit trail.
 *       **Required Permission:** `user.view`
 *     operationId: impersonateUser
 *     tags: [Admin Users]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reason]
 *             properties:
 *               reason: { type: string, example: "Troubleshooting checkout issue" }
 *     responses:
 *       200:
 *         description: Impersonation token returned
 */
router.post(
  '/users/:id/impersonate',
  requirePermission(UserPermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(ImpersonateUserSchema),
  auditLogger('user.impersonate', 'user'),
  controller.impersonateUser,
);

// ─── User Role Assignments & Previews ──────────────────────────────────────────

/**
 * @swagger
 * /api/v1/admin/users/{id}/roles:
 *   get:
 *     summary: Get assigned roles list of user
 *     description: |
 *       Lists roles and expiry dates.
 *       **Required Permission:** `rbac.manage`
 *     operationId: getUserRoles
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Assigned roles list
 *
 *   put:
 *     summary: Assign new roles to user
 *     description: |
 *       Updates user role configurations.
 *       **Required Permission:** `rbac.manage`
 *     operationId: assignUserRoles
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [assignments]
 *     responses:
 *       200:
 *         description: Roles saved
 */
router.get(
  '/users/:id/roles',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  controller.getUserRoles,
);
router.put(
  '/users/:id/roles',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  validate(AssignUserRolesBodySchema),
  auditLogger('user.assign_roles', 'user'),
  controller.assignUserRoles,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/roles/{roleId}:
 *   delete:
 *     summary: Revoke role from user
 *     description: |
 *       Removes a role assignment.
 *       **Required Permission:** `rbac.manage`
 *     operationId: revokeUserRole
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *       - name: roleId
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Role revoked successfully
 */
router.delete(
  '/users/:id/roles/:roleId',
  requirePermission(UserPermissions.MANAGE.key),
  validate(RoleParamSchema, 'params'),
  auditLogger('user.revoke_role', 'user'),
  controller.revokeUserRole,
);

/**
 * @swagger
 * /api/v1/admin/users/{id}/permissions:
 *   get:
 *     summary: Preview compiled permissions of user
 *     description: |
 *       Resolves final flattened list of allowed actions compiled across active roles.
 *       **Required Permission:** `rbac.manage`
 *     operationId: previewUserPermissions
 *     tags: [Admin RBAC]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Flat permissions key list
 */
router.get(
  '/users/:id/permissions',
  requirePermission(UserPermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  controller.previewUserPermissions,
);

export { router as adminRouter };
