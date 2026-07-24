import express, { Router } from 'express';

import { auditLogger } from '../../middleware/auditLogger';
import { authenticate } from '../../middleware/authenticate';
import { validate } from '../../middleware/validate';
import { AccountType, PermissionKey } from '../../types/enums';

import * as controller from './categories.controll';
import {
  AssignCategoryReviewerSchema,
  CategoryDecisionSchema,
  CategoryQuerySchema,
  CreateCategorySchema,
  IdParamSchema,
  SubmitCategoryReviewSchema,
  UpdateCategorySchema,
} from './categories.dto';

import type { RequestHandler } from 'express';
import { requirePermission } from '@/middleware/permissions';
import { requireRole } from '@/middleware/requireAccountType';

const router = Router();

const adminAuth = [authenticate, requireRole(AccountType.ADMIN)];

/**
 * @swagger
 * components:
 *   schemas:
 *     Category:
 *       type: object
 *       required: [id, code, name, slug, isActive]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         code:
 *           type: string
 *           pattern: '^\d{3}$'
 *           example: "080"
 *         name:
 *           type: string
 *           example: "Professional, Scientific, and Technical Services"
 *         slug:
 *           type: string
 *           example: "professional-scientific-and-technical-services"
 *         description:
 *           type: string
 *           nullable: true
 *           example: "Includes legal, accounting, consulting, and engineering services."
 *         isActive:
 *           type: boolean
 *           example: true
 *
 *     CategoryHistoryItem:
 *       type: object
 *       required: [id, categoryId, action, changedBy, createdAt]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         categoryId:
 *           type: string
 *           format: uuid
 *         action:
 *           type: string
 *           example: "category.edit"
 *         changedBy:
 *           type: string
 *           format: uuid
 *           description: ID of the admin who performed the action
 *         changes:
 *           type: object
 *           description: Diff details of what was modified
 *         createdAt:
 *           type: string
 *           format: date-time
 */

// ─── Categories Management ───────────────────────────────────────────────────

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     summary: List all categories (Public)
 *     description: Retrieve all categories sorted by code. Publicly accessible. Supports search and filter parameters.
 *     operationId: listCategories
 *     tags: [Categories]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name or code (case-insensitive partial match)
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         description: Filter by exact 3-digit category code
 *       - in: query
 *         name: slug
 *         schema:
 *           type: string
 *         description: Filter by exact category slug
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: List of categories with metadata and stats
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         categories:
 *                           type: array
 *                           items:
 *                             $ref: '#/components/schemas/Category'
 *                         total:
 *                           type: integer
 *                         stats:
 *                           type: object
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               message: "OK"
 *               data:
 *                 categories:
 *                   - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                     code: "080"
 *                     name: "Professional Services"
 *                     slug: "professional-services"
 *                     description: null
 *                     isActive: true
 *                 total: 1
 *                 stats: {}
 *               meta:
 *                 totalItems: 1
 *                 itemCount: 1
 *                 itemsPerPage: 20
 *                 totalPages: 1
 *                 currentPage: 1
 *               traceId: "uuid"
 */
router.get('/', validate(CategoryQuerySchema, 'query'), controller.listCategories);

/**
 * @swagger
 * /api/v1/categories/analytics:
 *   get:
 *     summary: Get category analytics & stats
 *     tags: [Categories]
 *     responses:
 *       200:
 *         description: Category statistics overview
 */
router.get('/analytics', controller.getCategoryStats);

/**
 * @swagger
 * /api/v1/categories:
 *   post:
 *     summary: Create a new category (Admin)
 *     description: |
 *       Creates a new category with a unique 3-digit NAICS code.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: createCategory
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code, name]
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{3}$'
 *                 example: "090"
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Financial Services"
 *               slug:
 *                 type: string
 *                 maxLength: 200
 *                 example: "financial-services"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Banking and investment activities"
 *     responses:
 *       201:
 *         description: Category created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       409:
 *         description: Code or Slug already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post(
  '/',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(CreateCategorySchema),
  auditLogger('category.create', 'category'),
  controller.createCategory,
);

/**
 * @swagger
 * /api/v1/categories/batch:
 *   post:
 *     summary: Batch process categories (Admin)
 *     description: |
 *       Create, update, or soft-delete categories in bulk.
 *       Accepts application/json (array of actions) or text/csv payload directly in the request
 *       body. Maximum batch size is 500 items.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: batchCategories
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: array
 *             items:
 *               type: object
 *               required: [code]
 *               properties:
 *                 action:
 *                   type: string
 *                   enum: [upsert, delete]
 *                   default: upsert
 *                 code:
 *                   type: string
 *                   pattern: '^\d{3}$'
 *                   example: "080"
 *                 name:
 *                   type: string
 *                   maxLength: 200
 *                   example: "Professional Services"
 *                 slug:
 *                   type: string
 *                   maxLength: 200
 *                   example: "professional-services"
 *                 description:
 *                   type: string
 *                   example: "Updated description text"
 *                 isActive:
 *                   type: boolean
 *                   example: true
 *         text/csv:
 *           schema:
 *             type: string
 *             example: |
 *               action,code,name,slug
 *               upsert,080,New Category,new-category-slug
 *               delete,001,,
 *     responses:
 *       200:
 *         description: Batch processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         created: { type: integer, example: 1 }
 *                         updated: { type: integer, example: 0 }
 *                         deleted: { type: integer, example: 1 }
 *                         failed: { type: integer, example: 0 }
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
router.post(
  '/batch',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }) as RequestHandler,
  express.json({ limit: '1mb' }) as RequestHandler,
  controller.batchCategories,
);

/**
 * @swagger
 * /api/v1/categories/{id}:
 *   patch:
 *     summary: Update an existing category (Admin)
 *     description: |
 *       Updates code, name, and/or slug of a category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: updateCategory
 *     tags: [Categories]
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
 *             properties:
 *               code:
 *                 type: string
 *                 pattern: '^\d{3}$'
 *                 example: "080"
 *               name:
 *                 type: string
 *                 maxLength: 200
 *                 example: "Updated Category Name"
 *               slug:
 *                 type: string
 *                 maxLength: 200
 *                 example: "updated-category-slug"
 *               description:
 *                 type: string
 *                 maxLength: 1000
 *                 example: "Updated description details"
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Category updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Category'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       409:
 *         description: Conflict (slug or code already in use)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *
 *   delete:
 *     summary: Delete a category (Admin)
 *     description: |
 *       Soft-deletes a category. Action fails if the category has associated active tenders.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: deleteCategory
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Category deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *             example:
 *               success: true
 *               message: "Category deleted"
 *               data: null
 *               traceId: "uuid"
 *       400:
 *         description: Category has associated active tenders and cannot be deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch(
  '/:id',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  validate(UpdateCategorySchema),
  auditLogger('category.edit', 'category'),
  controller.updateCategory,
);
router.delete(
  '/:id',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  auditLogger('category.delete', 'category'),
  controller.deleteCategory,
);

/**
 * @swagger
 * /api/v1/categories/{id}/history:
 *   get:
 *     summary: Get category modification audit history (Admin)
 *     description: |
 *       Retrieves the audit trail log of updates and edits to this category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: getCategoryHistory
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Modification log resolved
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/CategoryHistoryItem'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get(
  '/:id/history',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.getCategoryHistory,
);

/**
 * @swagger
 * /api/v1/categories/{id}/governance:
 *   get:
 *     summary: Get category governance details (Admin)
 *     description: |
 *       Retrieves the review lifecycle and workflow governance info for this category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: getCategoryGovernance
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Governance information resolved successfully
 */
router.get(
  '/:id/governance',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.getCategoryGovernance,
);

router.post(
  '/:id/comments',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.addCategoryComment,
);

/**
 * @swagger
 * /api/v1/categories/{id}/submit:
 *   post:
 *     summary: Submit category for administrative review (Admin)
 *     description: |
 *       Submits the category version for approval.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: submitCategoryReview
 *     tags: [Categories]
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
 *             properties:
 *               comment: { type: string, maxLength: 1000, example: "Ready for review" }
 *               reviewerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 example: ["b2c3d4e5-f6a7-8901-bcde-23456789012a"]
 *     responses:
 *       200:
 *         description: Category submitted for review successfully
 */
router.post(
  '/:id/submit',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  validate(SubmitCategoryReviewSchema),
  controller.submitCategoryReview,
);

/**
 * @swagger
 * /api/v1/categories/{id}/assign-reviewer:
 *   post:
 *     summary: Assign reviewers to category registration review (Admin)
 *     description: |
 *       Updates the list of designated reviewers for this category request.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: assignCategoryReviewer
 *     tags: [Categories]
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
 *             required: [reviewerIds]
 *             properties:
 *               reviewerIds:
 *                 type: array
 *                 items: { type: string, format: uuid }
 *                 minItems: 1
 *                 example: ["b2c3d4e5-f6a7-8901-bcde-23456789012a"]
 *     responses:
 *       200:
 *         description: Reviewers assigned successfully
 */
router.post(
  '/:id/assign-reviewer',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  validate(AssignCategoryReviewerSchema),
  controller.assignCategoryReviewer,
);

/**
 * @swagger
 * /api/v1/categories/{id}/review:
 *   post:
 *     summary: Record review decision for category request (Admin)
 *     description: |
 *       Approves, rejects, or requests changes to the category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: reviewCategoryDecision
 *     tags: [Categories]
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
 *               action: { type: string, enum: [APPROVE, REJECT, REQUEST_CHANGES], example: "APPROVE" }
 *               comment: { type: string, maxLength: 1000, example: "Valid category code and details." }
 *               reason: { type: string, maxLength: 1000, example: "Documentation checked" }
 *     responses:
 *       200:
 *         description: Decision logged successfully
 */
router.post(
  '/:id/review',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  validate(CategoryDecisionSchema),
  controller.reviewCategoryDecision,
);

/**
 * @swagger
 * /api/v1/categories/{id}/draft:
 *   post:
 *     summary: Create new draft version of category (Admin)
 *     description: |
 *       Initializes a new draft revision for an active category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: createCategoryDraftVersion
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Draft version created successfully
 */
router.post(
  '/:id/draft',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.createCategoryDraftVersion,
);

/**
 * @swagger
 * /api/v1/categories/{id}/archive:
 *   post:
 *     summary: Archive category (Admin)
 *     description: |
 *       Marks category as archived.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: archiveCategory
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Category archived successfully
 */
router.post(
  '/:id/archive',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.archiveCategory,
);

/**
 * @swagger
 * /api/v1/categories/{id}/restore:
 *   post:
 *     summary: Restore archived category (Admin)
 *     description: |
 *       Re-activates a previously archived category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: restoreCategory
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Category restored successfully
 */
router.post(
  '/:id/restore',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.restoreCategory,
);

/**
 * @swagger
 * /api/v1/categories/{id}/usage:
 *   get:
 *     summary: Get category usage statistics (Admin)
 *     description: |
 *       Retrieves the count and list of active tenders or entities referencing this category.
 *       **Required Permission:** `MANAGE_CATEGORIES` (Admin only)
 *     operationId: getCategoryUsage
 *     tags: [Categories]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/IdPathParam'
 *     responses:
 *       200:
 *         description: Usage counts resolved successfully
 */
router.get(
  '/:id/usage',
  adminAuth,
  requirePermission(PermissionKey.MANAGE_CATEGORIES),
  validate(IdParamSchema, 'params'),
  controller.getCategoryUsage,
);

export { router as categoriesRouter };
