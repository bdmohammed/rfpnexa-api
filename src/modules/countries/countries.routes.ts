import { Router } from 'express';

import * as controller from './countries.controller';
import {
  IsActiveParamsSchema,
  // AddCommentSchema,
  // AssignReviewerSchema,
  // ChangeRequestQuerySchema,
  // CountryIdParamSchema,
  // CountryTimelineQuerySchema,
  // CreateCountryChangeRequestSchema,
  // DependencyMatrixQuerySchema,
  // IdParamSchema,
  // PaginationQuerySchema,
  // ReviewChangeRequestSchema,
  UpdateCountryBodySchema,
  UpdateCountryParamsSchema,
  UpdateStateBodySchema,
  UpdateStateParamsSchema,
  // StateQuerySchema,
  // UpdateCountryBodySchema,
  // UpdateCountryParamsSchema,
  // UpdateStateBodySchema,
  // UpdateStateParamsSchema,
} from './countries.dto';

import { GeoLocationPermissions } from '@/constants/permissions/geoLocation';
// import { auditLogger } from '@/middleware/auditLogger';
import { authenticate } from '@/middleware/authenticate';
import { requirePermission } from '@/middleware/permissions';
import { requireAccountType } from '@/middleware/requireAccountType';
import { validate } from '@/middleware/validate';
import { AccountType } from '@/types/enums';

const router = Router();

// ------------------------ PUBLIC ROUTE---------------------------------------------

/**
 * @swagger
 * /api/v1/geography:
 *   get:
 *     summary: List distinct countries (Public)
 *     description: Returns all active countries sorted alphabetically.
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
 *                         required: [id, name, code]
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "1"
 *                           name:
 *                             type: string
 *                             example: "United States"
 *                           code:
 *                             type: string
 *                             example: "US"
 *             example:
 *               success: true
 *               message: "Success"
 *               data:
 *                 - id: "1"
 *                   name: "United States"
 *                   code: "US"
 *                 - id: "2"
 *                   name: "Canada"
 *                   code: "CA"
 *               traceId: "uuid"
 */
router.get('/countries', validate(IsActiveParamsSchema, 'query'), controller.listCountries);

// ---------------------------------- PRIVATE ROUTE ----------------------------------

// All routes require authenticated Admin access
router.use(authenticate);
router.use(requireAccountType(AccountType.ADMIN));

router.get(
  '/countries/states/:id',
  validate(UpdateCountryParamsSchema, 'params'),
  validate(IsActiveParamsSchema, 'query'),
  controller.listStates,
);
// Hierarchy & Operational Stats

/**
 * @swagger
 * /api/v1/geography/countries/hierarchy:
 *   get:
 *     summary: Get countries hierarchy
 *     description: |
 *       Retrieves the complete administrative hierarchy of countries and their
 *       nested states for the Country Management dashboard.
 *
 *       The response includes workflow status, active change request metadata,
 *       activation status, display order, and other management information
 *       required by administrators.
 *
 *       **Required Permission:** `state.view`
 *     operationId: getCountriesHierarchy
 *     tags:
 *       -  Geography
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Countries hierarchy retrieved successfully
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
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: "1"
 *                           code:
 *                             type: string
 *                             example: "US"
 *                           name:
 *                             type: string
 *                             example: "United States"
 *                           slug:
 *                             type: string
 *                             example: "united-states"
 *                           type:
 *                             type: string
 *                             example: "Country"
 *                           isActive:
 *                             type: boolean
 *                             example: true
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                           workflowStatus:
 *                             type: string
 *                             enum:
 *                               - None
 *                               - Pending Review
 *                               - Changes Requested
 *                           activeRequestId:
 *                             type: string
 *                             format: uuid
 *                             nullable: true
 *                           activeRequestNumber:
 *                             type: string
 *                             nullable: true
 *                           states:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   example: "101"
 *                                 countryId:
 *                                   type: string
 *                                   example: "1"
 *                                 code:
 *                                   type: string
 *                                   example: "CA"
 *                                 name:
 *                                   type: string
 *                                   example: "California"
 *                                 slug:
 *                                   type: string
 *                                   example: "california"
 *                                 type:
 *                                   type: string
 *                                   example: "STATE"
 *                                 isActive:
 *                                   type: boolean
 *                                   example: true
 *                                 updatedAt:
 *                                   type: string
 *                                   format: date-time
 *                                 workflowStatus:
 *                                   type: string
 *                                   enum:
 *                                     - None
 *                                     - Pending Review
 *                                     - Changes Requested
 *                                 activeRequestId:
 *                                   type: string
 *                                   format: uuid
 *                                   nullable: true
 *                                 activeRequestNumber:
 *                                   type: string
 *                                   nullable: true
 *       401:
 *         description: Authentication required
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       403:
 *         description: Insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get(
  '/hierarchy',
  requirePermission(GeoLocationPermissions.MANAGE.key),
  controller.getCountriesHierarchy,
);

/**
 * @swagger
 * /api/v1/geography/countries/:id/status:
 */
router.put(
  '/countries/:id/status',
  requirePermission(GeoLocationPermissions.MANAGE.key),
  validate(UpdateCountryParamsSchema, 'params'),
  validate(UpdateCountryBodySchema, 'body'),
  controller.updateCountryStatus,
);

/**
 * @swagger
 * /api/v1/geography/state/:id/status:
 */
router.put(
  '/states/:id/status',
  requirePermission(GeoLocationPermissions.MANAGE.key),
  validate(UpdateStateParamsSchema, 'params'),
  validate(UpdateStateBodySchema, 'body'),
  controller.updateStateStatus,
);

// /**
//  * @swagger
//  * /api/v1/geography/countries/stats:
//  *   get:
//  *     summary: Get country management statistics
//  *     description: |
//  *       Retrieves operational statistics for the Country Management dashboard,
//  *       including country counts, active/inactive status, open review requests,
//  *       and pending review assignments for the authenticated user.
//  *
//  *       **Required Permission:** `state.view`
//  *     operationId: getOperationalStats
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Operational statistics retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: object
//  *                       required:
//  *                         - totalCountries
//  *                         - activeCountries
//  *                         - disabledCountries
//  *                         - openReviews
//  *                         - pendingMine
//  *                       properties:
//  *                         totalCountries:
//  *                           type: integer
//  *                           example: 195
//  *                         activeCountries:
//  *                           type: integer
//  *                           example: 192
//  *                         disabledCountries:
//  *                           type: integer
//  *                           example: 3
//  *                         openReviews:
//  *                           type: integer
//  *                           example: 8
//  *                         pendingMine:
//  *                           type: integer
//  *                           example: 2
//  *       401:
//  *         description: Authentication required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Insufficient permissions
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// router.get(
//   '/stats',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   controller.getOperationalStats,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/{countryId}:
//  *   get:
//  *     summary: Get country details
//  *     description: |
//  *       Retrieves complete details for a single country including:
//  *
//  *       - Basic country information
//  *       - State statistics
//  *       - Pending review summary
//  *       - Current approved version
//  *       - Audit information
//  *
//  *       **Required Permission:** `geography.country.view`
//  *
//  *     operationId: getCountryById
//  *     tags:
//  *       - Geography
//  *
//  *     security:
//  *       - bearerAuth: []
//  *
//  *     parameters:
//  *       - in: path
//  *         name: countryId
//  *         required: true
//  *         description: Unique country identifier.
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *         example: 1
//  *
//  *     responses:
//  *       200:
//  *         description: Country retrieved successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: Country retrieved successfully.
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     id:
//  *                       type: integer
//  *                       example: 1
//  *                     code:
//  *                       type: string
//  *                       example: US
//  *                     name:
//  *                       type: string
//  *                       example: United States of America
//  *                     slug:
//  *                       type: string
//  *                       example: united-states-of-america
//  *                     isActive:
//  *                       type: boolean
//  *                       example: true
//  *                     createdAt:
//  *                       type: string
//  *                       format: date-time
//  *                     updatedAt:
//  *                       type: string
//  *                       format: date-time
//  *                     createdBy:
//  *                       type: object
//  *                       nullable: true
//  *                       properties:
//  *                         id:
//  *                           type: string
//  *                           format: uuid
//  *                         name:
//  *                           type: string
//  *                     updatedBy:
//  *                       type: object
//  *                       nullable: true
//  *                       properties:
//  *                         id:
//  *                           type: string
//  *                           format: uuid
//  *                         name:
//  *                           type: string
//  *                     statistics:
//  *                       type: object
//  *                       properties:
//  *                         totalStates:
//  *                           type: integer
//  *                           example: 50
//  *                         activeStates:
//  *                           type: integer
//  *                           example: 49
//  *                         inactiveStates:
//  *                           type: integer
//  *                           example: 1
//  *                     pendingReview:
//  *                       type: object
//  *                       properties:
//  *                         hasPendingCountryRequest:
//  *                           type: boolean
//  *                           example: false
//  *                         pendingStateRequests:
//  *                           type: integer
//  *                           example: 2
//  *                     currentVersion:
//  *                       type: object
//  *                       nullable: true
//  *                       properties:
//  *                         version:
//  *                           type: integer
//  *                           example: 5
//  *                         approvedAt:
//  *                           type: string
//  *                           format: date-time
//  *                         approvedBy:
//  *                           type: object
//  *                           nullable: true
//  *                           properties:
//  *                             id:
//  *                               type: string
//  *                               format: uuid
//  *                             name:
//  *                               type: string
//  *
//  *       400:
//  *         description: Invalid country identifier.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/BadRequestError'
//  *
//  *       401:
//  *         description: Authentication required.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/UnauthorizedError'
//  *
//  *       403:
//  *         description: Insufficient permissions.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ForbiddenError'
//  *
//  *       404:
//  *         description: Country not found.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/NotFoundError'
//  *
//  *       500:
//  *         description: Internal server error.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/InternalServerError'
//  */
// router.get(
//   '/countries/:countryId',
//   validate(CountryIdParamSchema, 'params'),
//   controller.getCountryById,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/{countryId}/statistics:
//  *   get:
//  *     summary: Get country statistics
//  *     description: |
//  *       Returns aggregated statistics for a country including state counts,
//  *       maker-checker review counts, version history, and activity summary.
//  *
//  *       **Required Permission:** `country.view`
//  *     operationId: getCountryStatisticsById
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         description: Country ID.
//  *         schema:
//  *           type: integer
//  *           minimum: 1
//  *           example: 1
//  *     responses:
//  *       '200':
//  *         description: Country statistics retrieved successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 success:
//  *                   type: boolean
//  *                   example: true
//  *                 message:
//  *                   type: string
//  *                   example: Country statistics retrieved successfully.
//  *                 data:
//  *                   type: object
//  *                   properties:
//  *                     countryId:
//  *                       type: integer
//  *                       example: 1
//  *
//  *                     states:
//  *                       type: object
//  *                       properties:
//  *                         total:
//  *                           type: integer
//  *                           example: 50
//  *                         active:
//  *                           type: integer
//  *                           example: 49
//  *                         inactive:
//  *                           type: integer
//  *                           example: 1
//  *
//  *                     reviews:
//  *                       type: object
//  *                       properties:
//  *                         pendingCountryRequests:
//  *                           type: integer
//  *                           example: 1
//  *                         pendingStateRequests:
//  *                           type: integer
//  *                           example: 2
//  *                         draftCountryRequests:
//  *                           type: integer
//  *                           example: 0
//  *                         draftStateRequests:
//  *                           type: integer
//  *                           example: 3
//  *                         inReviewCountryRequests:
//  *                           type: integer
//  *                           example: 1
//  *                         inReviewStateRequests:
//  *                           type: integer
//  *                           example: 2
//  *
//  *                     versions:
//  *                       type: object
//  *                       properties:
//  *                         countryVersions:
//  *                           type: integer
//  *                           example: 5
//  *                         stateVersions:
//  *                           type: integer
//  *                           example: 126
//  *
//  *                     activity:
//  *                       type: object
//  *                       properties:
//  *                         activities:
//  *                           type: integer
//  *                           example: 348
//  *                         lastActivityAt:
//  *                           type: string
//  *                           format: date-time
//  *                           nullable: true
//  *                           example: "2026-09-11T11:30:00Z"
//  *
//  *       '400':
//  *         description: Invalid country ID.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ValidationError'
//  *
//  *       '401':
//  *         $ref: '#/components/responses/Unauthorized'
//  *
//  *       '403':
//  *         $ref: '#/components/responses/Forbidden'
//  *
//  *       '404':
//  *         description: Country not found.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *
//  *       '500':
//  *         $ref: '#/components/responses/InternalServerError'
//  */
// router.get(
//   '/countries/:countryId/statistics',
//   validate(CountryIdParamSchema, 'params'),
//   controller.getCountryStatisticsById,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/eligible-reviewers:
//  *   get:
//  *     summary: Get list of eligible change request reviewers
//  *     description: |
//  *       Lists all administrative users eligible to review state/country change requests.
//  *       **Required Permission:** `state.manage`
//  *     operationId: getEligibleReviewers
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: List of eligible reviewers retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/SuccessResponse'
//  */
// router.get(
//   '/eligible-reviewers',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   controller.getEligibleReviewers,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/dependency-matrix:
//  *   get:
//  *     summary: Get dependency matrix
//  *     description: |
//  *       Computes the dependency impact for a country or state before performing
//  *       administrative operations such as disabling or archiving.
//  *
//  *       The response includes counts of affected users, states, tenders,
//  *       contracts, documents, and other related resources.
//  *
//  *       **Required Permission:** `state.view`
//  *     operationId: getDependencyMatrix
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - name: targetType
//  *         in: query
//  *         required: true
//  *         description: Target entity type for dependency analysis.
//  *         schema:
//  *           type: string
//  *           enum:
//  *             - COUNTRY
//  *             - STATE
//  *       - name: countryId
//  *         in: query
//  *         required: true
//  *         description: Country identifier.
//  *         schema:
//  *           type: string
//  *           example: "1"
//  *       - name: stateId
//  *         in: query
//  *         required: false
//  *         description: State identifier. Required when `targetType` is `STATE`.
//  *         schema:
//  *           type: string
//  *           example: "12"
//  *     responses:
//  *       200:
//  *         description: Dependency matrix retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: object
//  *                       properties:
//  *                         users:
//  *                           type: integer
//  *                           example: 124
//  *                         companies:
//  *                           type: integer
//  *                           example: 42
//  *                         tenders:
//  *                           type: integer
//  *                           example: 67
//  *                         draftTenders:
//  *                           type: integer
//  *                           example: 8
//  *                         publishedTenders:
//  *                           type: integer
//  *                           example: 21
//  *                         categories:
//  *                           type: integer
//  *                           example: 5
//  *                         states:
//  *                           type: integer
//  *                           example: 18
//  *                         cities:
//  *                           type: integer
//  *                           example: 0
//  *                         offices:
//  *                           type: integer
//  *                           example: 12
//  *                         contracts:
//  *                           type: integer
//  *                           example: 9
//  *                         documents:
//  *                           type: integer
//  *                           example: 315
//  *       400:
//  *         description: Invalid request parameters
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       401:
//  *         description: Authentication required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Insufficient permissions
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// router.get(
//   '/dependency-matrix',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(DependencyMatrixQuerySchema, 'query'),
//   controller.getDependencyMatrix,
// );

// // Ticket Workflow Queue & Details

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests:
//  *   get:
//  *     summary: Get country change request review queue
//  *     description: |
//  *       Retrieves a paginated review queue of country and state change requests.
//  *
//  *       Supports filtering by assignment and workflow status to help reviewers
//  *       manage pending approvals.
//  *
//  *       **Required Permission:** `state.view`
//  *     operationId: getReviewsQueue
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - name: filter
//  *         in: query
//  *         description: Review queue filter.
//  *         required: false
//  *         schema:
//  *           type: string
//  *           enum:
//  *             - all
//  *             - assigned
//  *             - pending
//  *             - approved
//  *             - rejected
//  *           default: all
//  *       - $ref: '#/components/parameters/PageParam'
//  *       - $ref: '#/components/parameters/LimitParam'
//  *     responses:
//  *       200:
//  *         description: Review queue retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         type: object
//  *                         properties:
//  *                           id:
//  *                             type: string
//  *                             format: uuid
//  *                           requestNumber:
//  *                             type: string
//  *                             example: "CR-000123"
//  *                           targetType:
//  *                             type: string
//  *                             enum:
//  *                               - COUNTRY
//  *                               - STATE
//  *                           countryId:
//  *                             type: string
//  *                             example: "1"
//  *                           countryName:
//  *                             type: string
//  *                             example: "India"
//  *                           stateId:
//  *                             type: string
//  *                             nullable: true
//  *                             example: "21"
//  *                           stateName:
//  *                             type: string
//  *                             nullable: true
//  *                             example: "Maharashtra"
//  *                           action:
//  *                             type: string
//  *                           status:
//  *                             type: string
//  *                           reason:
//  *                             type: string
//  *                           requestedBy:
//  *                             type: object
//  *                             properties:
//  *                               id:
//  *                                 type: string
//  *                                 format: uuid
//  *                               fullName:
//  *                                 type: string
//  *                               avatarUrl:
//  *                                 type: string
//  *                                 nullable: true
//  *                           assignedReviewer:
//  *                             nullable: true
//  *                             type: object
//  *                             properties:
//  *                               id:
//  *                                 type: string
//  *                                 format: uuid
//  *                               fullName:
//  *                                 type: string
//  *                               avatarUrl:
//  *                                 type: string
//  *                                 nullable: true
//  *                           cascadePolicy:
//  *                             type: object
//  *                           createdAt:
//  *                             type: string
//  *                             format: date-time
//  *                           updatedAt:
//  *                             type: string
//  *                             format: date-time
//  *                     meta:
//  *                       $ref: '#/components/schemas/PaginationMeta'
//  *       400:
//  *         description: Invalid request parameters
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       401:
//  *         description: Authentication required
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Insufficient permissions
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// router.get(
//   '/change-requests',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(ChangeRequestQuerySchema, 'query'),
//   controller.getReviewsQueue,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests/{id}:
//  *   get:
//  *     summary: Retrieve change request details
//  *     description: |
//  *       Retrieves the complete details of a country or state change request,
//  *       including requester information, assigned reviewers, discussion
//  *       comments, and the calculated dependency impact matrix.
//  *
//  *       **Required Permission:** `state.view`
//  *     operationId: getCountryChangeRequestDetails
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     responses:
//  *       200:
//  *         description: Change request retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/CountryChangeRequestDetails'
//  *       404:
//  *         description: Change request not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  */
// router.get(
//   '/change-requests/:id',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(IdParamSchema, 'params'),
//   controller.getChangeRequestDetails,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests:
//  *   post:
//  *     summary: Create a country or state change request
//  *     description: |
//  *       Creates a workflow request to activate or deactivate a country or state.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: createCountryChangeRequest
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/CreateCountryChangeRequest'
//  *     responses:
//  *       201:
//  *         description: Change request created successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/CountryChangeRequest'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  *       409:
//  *         $ref: '#/components/responses/ConflictError'
//  */
// router.post(
//   '/change-requests',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(CreateCountryChangeRequestSchema, 'body'),
//   auditLogger('country_change_request.create', 'country_change_request'),
//   controller.createChangeRequest,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests/{id}/assign:
//  *   post:
//  *     summary: Assign a reviewer to a change request
//  *     description: |
//  *       Assigns an eligible reviewer to a country or state change request.
//  *       Any existing pending reviewer assignment is cancelled before creating
//  *       the new assignment and moving the request into the review stage.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: assignCountryChangeRequestReviewer
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/AssignReviewer'
//  *     responses:
//  *       200:
//  *         description: Reviewer assigned successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/AssignReviewerResponse'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  *       409:
//  *         $ref: '#/components/responses/ConflictError'
//  */
// router.post(
//   '/change-requests/:id/assign',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(IdParamSchema, 'params'),
//   validate(AssignReviewerSchema, 'body'),
//   auditLogger('country_change_request.assign', 'country_change_request'),
//   controller.assignReviewer,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests/{id}/comments:
//  *   post:
//  *     summary: Add a comment to a change request
//  *     description: |
//  *       Adds a discussion comment or review feedback to an existing country or
//  *       state change request. The comment becomes part of the request's audit
//  *       history and collaboration timeline.
//  *
//  *       **Required Permission:** `state.view`
//  *     operationId: addCountryChangeRequestComment
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/AddComment'
//  *     responses:
//  *       201:
//  *         description: Comment added successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/AddCommentResponse'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  */
// router.post(
//   '/change-requests/:id/comments',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(IdParamSchema, 'params'),
//   validate(AddCommentSchema, 'body'),
//   controller.addComment,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests/{id}/review:
//  *   post:
//  *     summary: Review a country or state change request
//  *     description: |
//  *       Approves or rejects a pending country/state change request.
//  *       When approved, the requested configuration changes are applied
//  *       immediately and all related audit activities are recorded.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: reviewCountryChangeRequest
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             $ref: '#/components/schemas/ReviewChangeRequest'
//  *     responses:
//  *       200:
//  *         description: Change request reviewed successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/ReviewChangeRequestResponse'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  *       409:
//  *         $ref: '#/components/responses/ConflictError'
//  */
// router.post(
//   '/change-requests/:id/review',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(IdParamSchema, 'params'),
//   validate(ReviewChangeRequestSchema, 'body'),
//   auditLogger('country_change_request.review', 'country_change_request'),
//   controller.reviewChangeRequest,
// );

// // Timelines

// /**
//  * @swagger
//  * /api/v1/geography/countries/{countryId}/timeline:
//  *   get:
//  *     summary: Get country activity timeline
//  *     description: |
//  *       Retrieves the chronological audit timeline for a country or one of its
//  *       states, including change requests, review actions, approvals,
//  *       activations, deactivations, assignments, comments, and other operational
//  *       events.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: getCountryTimeline
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - name: countryId
//  *         in: path
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Country identifier
//  *       - name: stateId
//  *         in: query
//  *         required: false
//  *         schema:
//  *           type: string
//  *         description: Filter timeline to a specific state
//  *       - $ref: '#/components/parameters/PageParam'
//  *       - $ref: '#/components/parameters/LimitParam'
//  *     responses:
//  *       200:
//  *         description: Country timeline retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         $ref: '#/components/schemas/GetCountryTimelineItem'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  */
// router.get(
//   '/:countryId/timeline',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(CountryIdParamSchema, 'params'),
//   validate(CountryTimelineQuerySchema, 'query'),
//   controller.getCountryTimeline,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/change-requests/{id}/timeline:
//  *   get:
//  *     summary: Get change request activity timeline
//  *     description: |
//  *       Retrieves the complete chronological activity history for a country or
//  *       state change request, including assignments, comments, review actions,
//  *       approvals, rejections, and system-generated events.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: getCountryChangeRequestTimeline
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *       - $ref: '#/components/parameters/PageParam'
//  *       - $ref: '#/components/parameters/LimitParam'
//  *     responses:
//  *       200:
//  *         description: Change request timeline retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         $ref: '#/components/schemas/GetRequestTimelineItem'
//  *       400:
//  *         $ref: '#/components/responses/BadRequestError'
//  *       401:
//  *         $ref: '#/components/responses/UnauthorizedError'
//  *       403:
//  *         $ref: '#/components/responses/ForbiddenError'
//  *       404:
//  *         $ref: '#/components/responses/NotFoundError'
//  */
// router.get(
//   '/change-requests/:id/timeline',
//   requirePermission(GeoLocationPermissions.MANAGE.key),
//   validate(IdParamSchema, 'params'),
//   validate(PaginationQuerySchema, 'query'),
//   controller.getRequestTimeline,
// );

// /**
//  * @swagger
//  * /api/v1/geography/countries/states:
//  *   get:
//  *     summary: List and search geographical states / locations (Public)
//  *     description: Returns a paginated list of active states, optionally
//  *     filtered by code, slug, type, countryId, or partial text search.
//  *     operationId: listStates
//  *     tags: [States]
//  *     security: []
//  *     parameters:
//  *       - in: query
//  *         name: search
//  *         schema: { type: string }
//  *         description: Case-insensitive search on name, code, or country
//  *       - in: query
//  *         name: code
//  *         schema: { type: string }
//  *         description: Filter by exact ISO state code (e.g. CA, NY)
//  *       - in: query
//  *         name: slug
//  *         schema: { type: string }
//  *         description: Filter by exact slug
//  *       - in: query
//  *         name: type
//  *         schema: { type: string }
//  *         description: Filter by location type
//  *       - in: query
//  *         name: countryCode
//  *         schema: { type: string }
//  *         description: Filter by country code (e.g. US, CA)
//  *       - $ref: '#/components/parameters/PageParam'
//  *       - $ref: '#/components/parameters/LimitParam'
//  *     responses:
//  *       200:
//  *         description: Paginated list of active states/locations
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       type: array
//  *                       items:
//  *                         $ref: '#/components/schemas/GeographicalState'
//  *                     meta:
//  *                       $ref: '#/components/schemas/PaginationMeta'
//  *             example:
//  *               success: true
//  *               message: "OK"
//  *               data:
//  *                 - id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
//  *                   code: "CA"
//  *                   name: "California"
//  *                   slug: "california"
//  *                   type: "state"
//  *                   country: "United States"
//  *               meta:
//  *                 totalItems: 1
//  *                 itemCount: 1
//  *                 itemsPerPage: 20
//  *                 totalPages: 1
//  *                 currentPage: 1
//  *               traceId: "uuid"
//  */
// // router.get('/states', validate(StateQuerySchema, 'query'), controller.listStates);

// /**
//  * @swagger
//  * /api/v1/geography/countries/states/{id}:
//  *   patch:
//  *     summary: Update a state's operational status
//  *     description: |
//  *       Updates the operational status of an existing state.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: updateState
//  *     tags:
//  *       - States
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - isActive
//  *             properties:
//  *               isActive:
//  *                 type: boolean
//  *                 example: false
//  *     responses:
//  *       200:
//  *         description: State updated successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/GeographicalState'
//  *       400:
//  *         description: Invalid request.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       401:
//  *         description: Authentication required.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Insufficient permissions.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       404:
//  *         description: State not found.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// // router.patch(
// //   '/states/:id',
// //   authenticate,
// //   requireAccountType(AccountType.ADMIN),
// //   requirePermission(GeoLocationPermissions.MANAGE.key),
// //   validate(UpdateStateParamsSchema, 'params'),
// //   validate(UpdateStateBodySchema, 'body'),
// //   auditLogger('state.edit', 'state'),
// //   controller.updateState,
// // );

// /**
//  * @swagger
//  * /api/v1/geography/countries/{id}:
//  *   patch:
//  *     summary: Update a country's operational status
//  *     description: |
//  *       Updates the operational status of an existing country.
//  *
//  *       **Required Permission:** `state.manage`
//  *     operationId: updateCountry
//  *     tags:
//  *       - Geography
//  *     security:
//  *       - cookieAuth: []
//  *         csrfToken: []
//  *     parameters:
//  *       - $ref: '#/components/parameters/IdPathParam'
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - isActive
//  *             properties:
//  *               isActive:
//  *                 type: boolean
//  *                 example: false
//  *     responses:
//  *       200:
//  *         description: Country updated successfully.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               allOf:
//  *                 - $ref: '#/components/schemas/SuccessResponse'
//  *                 - type: object
//  *                   properties:
//  *                     data:
//  *                       $ref: '#/components/schemas/Country'
//  *       400:
//  *         description: Invalid request.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       401:
//  *         description: Authentication required.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       403:
//  *         description: Insufficient permissions.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  *       404:
//  *         description: Country not found.
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/ErrorResponse'
//  */
// // router.patch(
// //   '/:id',
// //   authenticate,
// //   requireAccountType(AccountType.ADMIN),
// //   requirePermission(GeoLocationPermissions.MANAGE.key),
// //   validate(UpdateCountryParamsSchema, 'params'),
// //   validate(UpdateCountryBodySchema, 'body'),
// //   auditLogger('country.edit', 'country'),
// //   controller.updateCountry,
// // );

export { router as countriesRouter };
