import { Router } from 'express';

import * as controller from './countries.controller';
import {
  AddCommentSchema,
  AssignReviewerSchema,
  ChangeRequestQuerySchema,
  CountryIdParamSchema,
  CountryTimelineQuerySchema,
  CreateCountryChangeRequestSchema,
  DependencyMatrixQuerySchema,
  IdParamSchema,
  ReviewChangeRequestSchema,
  StateQuerySchema,
  UpdateCountryBodySchema,
  UpdateCountryParamsSchema,
  UpdateStateBodySchema,
  UpdateStateParamsSchema,
} from './countries.dto';

import { StatePermissions } from '@/constants/permissions/state';
import { auditLogger } from '@/middleware/auditLogger';
import { authenticate } from '@/middleware/authenticate';
import { requirePermission } from '@/middleware/permissions';
import { requireRole } from '@/middleware/requireAccountType';
import { validate } from '@/middleware/validate';
import { AccountType } from '@/types/enums';

const router = Router();

// ------------------------ PUBLIC ROUTE---------------------------------------------

/**
 * @swagger
 * /api/v1/countries:
 *   get:
 *     summary: List distinct countries (Public)
 *     description: Returns an array of objects with details for all unique country names
 *     stored in the database.
 *     operationId: listCountries
 *     tags: [States]
 *     security: []
 *     responses:
 *       200:
 *         description: List of distinct countries
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
 *                         type: object
 *                         required: [countryId, countryName, countryCode]
 *                         properties:
 *                           countryId:
 *                             type: string
 *                             example: "1"
 *                           countryName:
 *                             type: string
 *                             example: "United States"
 *                           countryCode:
 *                             type: string
 *                             example: "US"
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 - countryId: "1"
 *                   countryName: "United States"
 *                   countryCode: "US"
 *                 - countryId: "2"
 *                   countryName: "Canada"
 *                   countryCode: "CA"
 *               traceId: "uuid"
 */
router.get('/', controller.listCountries);

// ---------------------------------- PRIVATE ROUTE ----------------------------------

// All routes require authenticated Admin access
router.use(authenticate);
router.use(requireRole(AccountType.ADMIN));

// Hierarchy & Operational Stats

/**
 * @swagger
 * /api/v1/countries/hierarchy:
 *   get:
 *     summary: Get complete country-state-region nested hierarchy
 *     description: |
 *       Retrieves all operational countries, states, and counties nested in a hierarchical tree.
 *       **Required Permission:** `state.view`
 *     operationId: getCountriesHierarchy
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Nested geographical hierarchy tree resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/hierarchy',
  requirePermission(StatePermissions.VIEW.key),
  controller.getCountriesHierarchy,
);

/**
 * @swagger
 * /api/v1/countries/stats:
 *   get:
 *     summary: Get countries and states operational metrics
 *     description: |
 *       Provides administrative stats, including total change request counts, active countries/
 *       states, and pending tickets.
 *       **Required Permission:** `state.view`
 *     operationId: getOperationalStats
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Operational statistics resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get('/stats', requirePermission(StatePermissions.VIEW.key), controller.getOperationalStats);

/**
 * @swagger
 * /api/v1/countries/eligible-reviewers:
 *   get:
 *     summary: Get list of eligible change request reviewers
 *     description: |
 *       Lists all administrative users eligible to review state/country change requests.
 *       **Required Permission:** `state.manage`
 *     operationId: getEligibleReviewers
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: List of eligible reviewers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/eligible-reviewers',
  requirePermission(StatePermissions.MANAGE.key),
  controller.getEligibleReviewers,
);

/**
 * @swagger
 * /api/v1/countries/dependency-matrix:
 *   get:
 *     summary: Get dependency mapping for countries/states
 *     description: |
 *       Analyzes dependencies (e.g. active bids, user counts, plans) that would be affected by disabling locations.
 *       **Required Permission:** `state.view`
 *     operationId: getDependencyMatrix
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: countryIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: Country IDs to evaluate dependencies for
 *       - in: query
 *         name: stateIds
 *         schema:
 *           type: array
 *           items:
 *             type: string
 *         description: State IDs to evaluate dependencies for
 *     responses:
 *       200:
 *         description: Location dependency matrix resolved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/dependency-matrix',
  requirePermission(StatePermissions.VIEW.key),
  validate(DependencyMatrixQuerySchema, 'query'),
  controller.getDependencyMatrix,
);

// Ticket Workflow Queue & Details

/**
 * @swagger
 * /api/v1/countries/change-requests:
 *   get:
 *     summary: Get change request ticket review queue
 *     description: |
 *       Retrieves the paginated queue of location configuration change requests.
 *       **Required Permission:** `state.view`
 *     operationId: getReviewsQueue
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter by request ticket status (e.g., PENDING, APPROVED, REJECTED)
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated queue of change requests resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/change-requests',
  requirePermission(StatePermissions.VIEW.key),
  validate(ChangeRequestQuerySchema, 'query'),
  controller.getReviewsQueue,
);

/**
 * @swagger
 * /api/v1/countries/change-requests/{id}:
 *   get:
 *     summary: Get change request ticket details
 *     description: |
 *       Returns complete details, proposed changes, comments, and reviewers for a single change request.
 *       **Required Permission:** `state.view`
 *     operationId: getChangeRequestDetails
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Change request ticket ID
 *     responses:
 *       200:
 *         description: Change request ticket details resolved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 */
router.get(
  '/change-requests/:id',
  requirePermission(StatePermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  controller.getChangeRequestDetails,
);

/**
 * @swagger
 * /api/v1/countries/change-requests:
 *   post:
 *     summary: Propose a country/state config change request
 *     description: |
 *       Creates a new change request ticket for activating/deactivating countries or states.
 *       **Required Permission:** `state.manage`
 *     operationId: createChangeRequest
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, changes]
 *             properties:
 *               title: { type: string, example: "Deactivate Florida state" }
 *               description: { type: string, example: "Deactivating state due to operational policy update." }
 *               changes:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [type, resourceId, action]
 *                   properties:
 *                     type: { type: string, enum: [country, state], example: "state" }
 *                     resourceId: { type: string, format: uuid, example: "f1a2b3c4-e5d6-7890-abcd-1234567890ab" }
 *                     action: { type: string, enum: [activate, deactivate], example: "deactivate" }
 *     responses:
 *       201:
 *         description: Change request proposed successfully
 */
router.post(
  '/change-requests',
  requirePermission(StatePermissions.MANAGE.key),
  validate(CreateCountryChangeRequestSchema, 'body'),
  auditLogger('country_change_request.create', 'country_change_request'),
  controller.createChangeRequest,
);

/**
 * @swagger
 * /api/v1/countries/change-requests/{id}/assign:
 *   post:
 *     summary: Assign reviewer to change request ticket
 *     description: |
 *       Assigns an eligible administrator user to review the change request ticket.
 *       **Required Permission:** `state.manage`
 *     operationId: assignReviewer
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Change request ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [reviewerId]
 *             properties:
 *               reviewerId: { type: string, format: uuid, example: "b2c3d4e5-f6a7-8901-bcde-23456789012a" }
 *     responses:
 *       200:
 *         description: Reviewer assigned successfully
 */
router.post(
  '/change-requests/:id/assign',
  requirePermission(StatePermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  validate(AssignReviewerSchema, 'body'),
  auditLogger('country_change_request.assign', 'country_change_request'),
  controller.assignReviewer,
);

/**
 * @swagger
 * /api/v1/countries/change-requests/{id}/comments:
 *   post:
 *     summary: Add comment to change request ticket
 *     description: |
 *       Posts a discussion message or feedback comment inside a change request ticket.
 *       **Required Permission:** `state.view`
 *     operationId: addComment
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Change request ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string, example: "Florida state deactivation approved by legal team." }
 *     responses:
 *       201:
 *         description: Comment added successfully
 */
router.post(
  '/change-requests/:id/comments',
  requirePermission(StatePermissions.VIEW.key),
  validate(IdParamSchema, 'params'),
  validate(AddCommentSchema, 'body'),
  controller.addComment,
);

/**
 * @swagger
 * /api/v1/countries/change-requests/{id}/review:
 *   post:
 *     summary: Review and process change request ticket
 *     description: |
 *       Approves or rejects a change request ticket. Approving executes state config migrations.
 *       **Required Permission:** `state.manage`
 *     operationId: reviewChangeRequest
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Change request ticket ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [approve, reject], example: "approve" }
 *               reason: { type: string, example: "Approved based on legal consensus." }
 *     responses:
 *       200:
 *         description: Change request reviewed successfully
 */
router.post(
  '/change-requests/:id/review',
  requirePermission(StatePermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  validate(ReviewChangeRequestSchema, 'body'),
  auditLogger('country_change_request.review', 'country_change_request'),
  controller.reviewChangeRequest,
);

// Timelines

/**
 * @swagger
 * /api/v1/countries/{countryId}/timeline:
 *   get:
 *     summary: Get operational config lifecycle timeline of a country
 *     description: |
 *       Retrieves the history of change requests, reviewer logs, and activation transitions.
 *       **Required Permission:** `state.manage`
 *     operationId: getCountryTimeline
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: countryId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Country ID
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Operational timeline history resolved
 */
router.get(
  '/:countryId/timeline',
  requirePermission(StatePermissions.MANAGE.key),
  validate(CountryIdParamSchema, 'params'),
  validate(CountryTimelineQuerySchema, 'query'),
  controller.getCountryTimeline,
);

/**
 * @swagger
 * /api/v1/countries/change-requests/{id}/timeline:
 *   get:
 *     summary: Get log lifecycle events of a change request ticket
 *     description: |
 *       Retrieves the review steps, assignment transitions, and status change logs.
 *       **Required Permission:** `state.manage`
 *     operationId: getRequestTimeline
 *     tags: [Countries Admin]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Change request ticket ID
 *     responses:
 *       200:
 *         description: Change request ticket timeline resolved
 */
router.get(
  '/change-requests/:id/timeline',
  requirePermission(StatePermissions.MANAGE.key),
  validate(IdParamSchema, 'params'),
  controller.getRequestTimeline,
);

/**
 * @swagger
 * components:
 *   schemas:
 *     GeographicalState:
 *       type: object
 *       required: [id, code, name, slug, type, country]
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *         code:
 *           type: string
 *           example: "CA"
 *           description: ISO state/region code
 *         name:
 *           type: string
 *           example: "California"
 *         slug:
 *           type: string
 *           example: "california"
 *         type:
 *           type: string
 *           enum: [state, territory, federal]
 *           example: "state"
 *         country:
 *           type: string
 *           example: "United States"
 */

/**
 * @swagger
 * /api/v1/countries/states:
 *   get:
 *     summary: List and search geographical states / locations (Public)
 *     description: Returns a paginated list of active states,
 * optionally filtered by code, slug, type, countryId, or partial text search.
 *     operationId: listStates
 *     tags: [States]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Case-insensitive search on name, code, or country
 *       - in: query
 *         name: code
 *         schema: { type: string }
 *         description: Filter by exact ISO state code (e.g. CA, NY)
 *       - in: query
 *         name: slug
 *         schema: { type: string }
 *         description: Filter by exact slug
 *       - in: query
 *         name: type
 *         schema: { type: string }
 *         description: Filter by location type
 *       - in: query
 *         name: countryCode
 *         schema: { type: string }
 *         description: Filter by country code (e.g. US, CA)
 *       - $ref: '#/components/parameters/PageParam'
 *       - $ref: '#/components/parameters/LimitParam'
 *     responses:
 *       200:
 *         description: Paginated list of active states/locations
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
 *                         $ref: '#/components/schemas/GeographicalState'
 *                     meta:
 *                       $ref: '#/components/schemas/PaginationMeta'
 *             example:
 *               success: true
 *               message: "OK"
 *               data:
 *                 - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
 *                   code: "CA"
 *                   name: "California"
 *                   slug: "california"
 *                   type: "state"
 *                   country: "United States"
 *               meta:
 *                 totalItems: 1
 *                 itemCount: 1
 *                 itemsPerPage: 20
 *                 totalPages: 1
 *                 currentPage: 1
 *               traceId: "uuid"
 */
router.get('/states', validate(StateQuerySchema, 'query'), controller.listStates);

/**
 * @swagger
 * /api/v1/countries/states/{id}:
 *   patch:
 *     summary: Update an existing state (Admin)
 *     description: |
 *       Updates an existing geographical state/location.
 *       **Required Permission:** `location.manage` (Admin only)
 *     operationId: updateState
 *     tags: [States]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: State updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 */
router.patch(
  '/states/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(StatePermissions.MANAGE.key),
  validate(UpdateStateParamsSchema, 'params'),
  validate(UpdateStateBodySchema, 'body'),
  auditLogger('state.edit', 'state'),
  controller.updateState,
);

/**
 * @swagger
 * /api/v1/countries/{id}:
 *   patch:
 *     summary: Update an existing country (Admin)
 *     description: |
 *       Updates an existing country active status.
 *       **Required Permission:** `location.manage` (Admin only)
 *     operationId: updateCountry
 *     tags: [States]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [isActive]
 *             properties:
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Country updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 */
router.patch(
  '/:id',
  authenticate,
  requireRole(AccountType.ADMIN),
  requirePermission(StatePermissions.MANAGE.key),
  validate(UpdateCountryParamsSchema, 'params'),
  validate(UpdateCountryBodySchema, 'body'),
  auditLogger('country.edit', 'country'),
  controller.updateCountry,
);

export { router as countriesRouter };
