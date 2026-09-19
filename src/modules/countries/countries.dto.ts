import { z } from 'zod';

import type { RouteContract } from '@/core/asyncHandler';
import type { Country } from '@/database/entities/Country';
// // import type {
// //   CascadePolicyOptions,
// //   CountryChangeRequest,
// // } from '@/database/entities/CountryChangeRequest';
// import type { User } from '@/database/entities/User';
// import type {
//   ActorType,
//   CountryActivityType,
//   CountryAssignmentStatus,
//   CountryChangeRequestStatus,
// } from '@/types/enums';
// import type { PaginationMeta } from '@/types/types';
// import {
//   CountryChangeRequestAction,
//   CountryChangeRequestTargetType,
//   CountryCommentType,
//   StateType,
// } from '@/types/enums';

// export const CountryQuerySchema = z.object({
//   tab: z.enum(['stats', 'list', 'reviews']).optional().default('stats'),
//   search: z.string().optional(),
//   status: z.string().optional(),
//   page: z.coerce.number().int().min(1).optional().default(1),
//   limit: z.coerce.number().int().min(1).max(100).optional().default(50),
// });

// export const CascadePolicySchema = z.object({
//   disableStates: z.boolean().default(true),
//   disableTenders: z.boolean().default(true),
//   disableCategories: z.boolean().default(false),
//   hideFromSearch: z.boolean().default(true),
//   notifySuppliers: z.boolean().default(true),
// });

// export const CreateCountryChangeRequestSchema = z.object({
//   targetType: z.enum(CountryChangeRequestTargetType),
//   countryId: z.string().regex(/^\d+$/, 'Invalid Country ID'),
//   stateId: z.string().regex(/^\d+$/, 'Invalid State ID').optional().nullable(),
//   action: z.enum(CountryChangeRequestAction),
//   reason: z.string().min(10, 'Reason must be at least 10 characters'),
//   cascadePolicy: CascadePolicySchema.optional(),
// });

// export const AssignReviewerSchema = z.object({
//   reviewerId: z.string().uuid('Valid reviewer user ID is required'),
// });

// export const AddCommentSchema = z.object({
//   type: z.enum(CountryCommentType).default(CountryCommentType.GENERAL),
//   content: z.string().trim().min(1, 'Comment content cannot be empty').max(5000),
// });

// export const ReviewChangeRequestSchema = z.object({
//   action: z.enum(['APPROVE', 'REJECT']),
//   comment: z.string().optional(),
// });

// export const ChangeRequestQuerySchema = z.object({
//   filter: z.enum(['assigned', 'pending', 'approved', 'rejected', 'all']).optional().default('all'),
//   search: z.string().optional(),
//   page: z.coerce.number().int().min(1).optional().default(1),
//   limit: z.coerce.number().int().min(1).max(50).optional().default(20),
// });

// export const IdParamSchema = z.object({
//   id: z.uuid('Invalid Change Request UUID'),
// });
// export type IdParamDto = z.infer<typeof IdParamSchema>;

// export const CountryIdParamSchema = z.object({
//   countryId: z.string().regex(/^\d+$/, 'Invalid Country ID'),
// });

// export type CountryIdParamDto = z.infer<typeof CountryIdParamSchema>;

// export const DependencyMatrixQuerySchema = z.object({
//   targetType: z.enum(CountryChangeRequestTargetType),
//   countryId: z.string().regex(/^\d+$/, 'Invalid Country ID'),
//   stateId: z.string().regex(/^\d+$/, 'Invalid State ID').optional(),
// });

// export const PaginationQuerySchema = z.object({
//   page: z.coerce.number().int().positive().default(1),
//   limit: z.coerce.number().int().min(1).max(100).default(20),
// });

// export type PaginationQueryDto = z.infer<typeof PaginationQuerySchema>;

// export const CountryTimelineQuerySchema = z.object({
//   stateId: z.string().regex(/^\d+$/, 'Invalid State ID').optional(),
//   page: z.coerce.number().int().positive().default(1),
//   limit: z.coerce.number().int().min(1).max(100).default(20),
// });

// export type CountryTimelineQueryDto = z.infer<typeof CountryTimelineQuerySchema>;

// export type CreateCountryChangeRequestInputDto = z.infer<typeof CreateCountryChangeRequestSchema>;
// export type AssignReviewerInput = z.infer<typeof AssignReviewerSchema>;
// export type AddCommentInput = z.infer<typeof AddCommentSchema>;
// export type ReviewChangeRequestInput = z.infer<typeof ReviewChangeRequestSchema>;
// export type ChangeRequestQueryInputDto = z.infer<typeof ChangeRequestQuerySchema>;
// export type DependencyMatrixQueryInput = z.infer<typeof DependencyMatrixQuerySchema>;

// export const UpdateStateSchema = z.object({
//   isActive: z.boolean(),
// });
// export type UpdateStateDto = z.infer<typeof UpdateStateSchema>;

export const UpdateStateParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid State ID'),
});
export type UpdateStateParamsDto = z.infer<typeof UpdateStateParamsSchema>;

export const UpdateStateBodySchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStateBodyDto = z.infer<typeof UpdateStateBodySchema>;

export const UpdateCountryParamsSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid Country ID'),
});
export type UpdateCountryParamsDto = z.infer<typeof UpdateCountryParamsSchema>;

export const UpdateCountryBodySchema = z.object({
  isActive: z.string(),
});
export type UpdateCountryBodyDto = z.infer<typeof UpdateCountryBodySchema>;

// export const StateQuerySchema = z.object({
//   search: z.string().trim().min(1).optional(),
//   code: z.string().trim().toUpperCase().optional(),
//   slug: z.string().trim().optional(),
//   type: z.enum(StateType).optional(),
//   countryId: z.string().regex(/^\d+$/, 'Invalid Country ID').optional(),
//   countryCode: z.string().trim().toUpperCase().length(2).optional(),
//   page: z.coerce.number().int().positive().default(1),
//   limit: z.coerce.number().int().min(1).max(100).default(20),
// });

// export type StateQueryDto = z.infer<typeof StateQuerySchema>;

export const IsActiveParamsSchema = z.object({
  isActive: z.string().optional(),
});
export type IsActiveParamsDto = z.infer<typeof IsActiveParamsSchema>;

export interface ListDistinctCountriesResponse {
  id: number;
  name: string;
  code: string;
}

// export enum WorkflowStatus {
//   NONE = 'None',
//   PENDING_REVIEW = 'Pending Review',
//   CHANGES_REQUESTED = 'Changes Requested',
// }
// export interface StateHierarchyDto {
//   id: number;
//   countryId: number;
//   code: string;
//   name: string;
//   slug: string;
//   type: string;
//   isActive: boolean;
//   updatedAt: Date;
//   workflowStatus: WorkflowStatus;
//   activeRequestId: string | null;
//   activeRequestNumber: string | null;
// }

// export interface CountryHierarchyDto {
//   id: number;
//   code: string;
//   name: string;
//   slug: string;
//   type: 'Country';
//   isActive: boolean;
//   version: number;
//   tenderCount: number;
//   createdBy: Pick<User, 'name'>;
//   approvedBy: Pick<User, 'name'>;
//   updatedAt: Date;
//   workflowStatus: WorkflowStatus;
//   activeRequestId: string | null;
//   activeRequestNumber: string | null;
//   states: StateHierarchyDto[];
// }

// export interface GetOperationalStatsResponse {
//   totalCountries: number;
//   activeCountries: number;
//   inactiveCountries: number;

//   totalStates: number;
//   activeStates: number;
//   inactiveStates: number;

//   openChangeRequests: number;
//   pendingRequests: number;
//   approvedRequests: number;
//   rejectedRequests: number;

//   myPendingAssignments: number;
// }

// export interface GetEligibleReviewersResponse {
//   id: string;
//   name: string;
//   fullName: string;
//   email: string;
//   avatarUrl: string | null;
//   isSelf: boolean;
//   canBeAssigned: boolean;
// }

// export interface DependencyMatrix {
//   users: number;
//   companies: number;
//   tenders: number;
//   draftTenders: number;
//   publishedTenders: number;
//   categories: number;
//   states: number;
//   cities: number;
//   offices: number;
//   contracts: number;
//   documents: number;
// }

// export interface TenderStatistics {
//   total: string;
//   draft: string;
//   published: string;
//   awarded: string;
// }

// export interface GetReviewsQueueItem {
//   id: number;
//   requestNumber: string;
//   targetType: CountryChangeRequestTargetType;
//   countryId: number;
//   countryName: string;
//   stateId: number | null;
//   stateName: string | null;
//   action: CountryChangeRequestAction;
//   status: CountryChangeRequestStatus;
//   reason: string;
//   requestedBy: {
//     id: string;
//     fullName: string;
//     avatarUrl: string | null;
//   };
//   assignedReviewer: {
//     id: string;
//     fullName: string;
//     avatarUrl: string | null;
//   } | null;
//   cascadePolicy: CascadePolicyOptions;
//   createdAt: Date;
//   updatedAt: Date;
// }
// export interface GetReviewsQueueResponse {
//   data: GetReviewsQueueItem[];
//   totalItems: number;
// }

// export interface GetChangeRequestDetailsResponse extends DependencyMatrix, CountryChangeRequest {}

// export interface CreateCountryChangeRequestResponse {
//   id: string;
//   requestNumber: string;
//   targetType: CountryChangeRequestTargetType;
//   action: CountryChangeRequestAction;
//   status: CountryChangeRequestStatus;
//   createdAt: Date;
// }

// export interface AssignReviewerResponse {
//   assignmentId: string;
//   requestId: string;
//   requestNumber: string;
//   reviewer: {
//     id: string;
//     fullName: string;
//     avatarUrl: string | null;
//   };
//   status: CountryAssignmentStatus;
//   assignedAt: Date;
// }

// export interface AddCommentResponse {
//   id: string;
//   requestId: string;
//   author: {
//     id: string;
//   };
//   type: CountryCommentType;
//   content: string;
//   createdAt: Date;
// }

// export interface ReviewChangeRequestResponse {
//   id: string;
//   requestNumber: string;
//   status: CountryChangeRequestStatus;
//   reviewedById: string;
//   reviewedAt: Date;
// }

// export interface GetCountryTimelineItem {
//   id: string;
//   eventType: CountryActivityType;
//   title: string;
//   description: string | null;
//   actor: {
//     id: string;
//     fullName: string;
//     avatarUrl: string | null;
//   } | null;
//   actorType: ActorType;
//   requestId: string | null;
//   metadata: Record<string, unknown> | null;
//   createdAt: Date;
// }

// export interface GetCountryTimelineResponse {
//   data: GetCountryTimelineItem[];
//   total: number;
// }

// export interface GetRequestTimelineItem {
//   id: string;
//   eventType: CountryActivityType;
//   title: string;
//   description: string | null;
//   actorType: ActorType;
//   actor: {
//     id: string;
//     fullName: string;
//     avatarUrl: string | null;
//   } | null;
//   metadata: Record<string, unknown> | null;
//   createdAt: Date;
// }

// export interface GetRequestTimelineResponse {
//   data: GetRequestTimelineItem[];
//   total: number;
// }

// export interface ListStatesItem {
//   id: number;
//   code: string;
//   name: string;
//   slug: string;
//   type: StateType;
//   countryId: number;
//   countryCode: string;
//   countryName: string;
//   isActive: boolean;
// }

// export type ListStatesResponse = ListStatesItem[];

// export interface UpdateStateResponse {
//   id: number;
//   code: string;
//   name: string;
//   slug: string;
//   type: StateType;
//   countryId: number;
//   countryCode: string;
//   countryName: string;
//   isActive: boolean;
// }

// export interface UpdateCountryResponse {
//   id: number;
//   code: string;
//   name: string;
//   slug: string;
//   isActive: boolean;
// }

// export interface CountryCurrentVersion {
//   version: number;
//   approvedAt: string;
//   approvedBy: UserSummary | null;
// }

// export interface CountryPendingReview {
//   hasPendingRequest: boolean;
//   requestId: string | null;
//   status: string | null;
// }

// export type UserSummary = Pick<User, 'id' | 'name'>;

// export interface GetCountryByIdResponse {
//   id: number;
//   code: string;
//   name: string;
//   slug: string;
//   isActive: boolean;
//   statistics: StateStats;
//   currentVersion: CountryCurrentVersion | null;
//   pendingReview: CountryPendingReview;
//   createdBy: UserSummary;
//   updatedBy: UserSummary | null;
//   createdAt: Date;
//   updatedAt: Date;
// }

// export interface CountryStatisticsResponse {
//   countryId: number;

//   statistics: StateStats;

//   reviews: {
//     pendingCountryRequests: number;
//     pendingStateRequests: number;
//     draftCountryRequests: number;
//     draftStateRequests: number;
//     inReviewCountryRequests: number;
//     inReviewStateRequests: number;
//   };

//   versions: CountryCurrentVersion[];

//   activity: {
//     activities: number;
//     lastActivityAt: Date | null;
//   };
// }

// // ─── Route Contracts ──────────────────────────────────────────────────────────
// One interface per controller handler, consumed by asyncHandler.contract<C>.
export interface GetCountriesHierarchyContract extends RouteContract {
  // response: CountryHierarchyDto[];
  response: Country[];
}

// export interface GetCountryByIdContract extends RouteContract {
//   response: GetCountryByIdResponse;
//   params: CountryIdParamDto;
// }

// export interface GetOperationalStatsContract extends RouteContract {
//   response: GetOperationalStatsResponse;
// }

// export interface GetEligibleReviewersContract extends RouteContract {
//   response: GetEligibleReviewersResponse[];
// }

// export interface GetDependencyMatrixContract extends RouteContract {
//   query: DependencyMatrixQueryInput;
//   response: DependencyMatrix;
// }

// export interface CreateChangeRequestContract extends RouteContract {
//   body: CreateCountryChangeRequestInputDto;
//   response: CreateCountryChangeRequestResponse;
// }

// export interface AssignReviewerContract extends RouteContract {
//   params: IdParamDto;
//   body: AssignReviewerInput;
//   response: AssignReviewerResponse;
// }

// export interface AddCommentContract extends RouteContract {
//   params: IdParamDto;
//   body: AddCommentInput;
//   response: AddCommentResponse;
// }

// export interface ReviewChangeRequestContract extends RouteContract {
//   params: IdParamDto;
//   body: ReviewChangeRequestInput;
//   response: ReviewChangeRequestResponse;
// }

// export interface GetReviewsQueueContract extends RouteContract {
//   query: ChangeRequestQueryInputDto;
//   response: GetReviewsQueueItem[];
//   meta: PaginationMeta;
// }

// export interface GetChangeRequestDetailsContract extends RouteContract {
//   params: IdParamDto;
//   response: GetChangeRequestDetailsResponse;
// }

// export interface GetCountryTimelineContract extends RouteContract {
//   params: CountryIdParamDto;
//   query: CountryTimelineQueryDto;
//   response: GetCountryTimelineItem[];
//   meta: PaginationMeta;
// }

// export interface GetRequestTimelineContract extends RouteContract {
//   params: IdParamDto;
//   query: PaginationQueryDto;
//   response: GetRequestTimelineItem[];
//   meta: PaginationMeta;
// }

// export interface ListStatesContract extends RouteContract {
//   query: StateQueryDto;
//   response: ListStatesResponse;
//   meta: PaginationMeta;
// }

export interface listCountriesContract extends RouteContract {
  query: IsActiveParamsDto;
  response: ListDistinctCountriesResponse[];
}

export interface listFullCountriesContract extends RouteContract {
  params: UpdateCountryParamsDto;
  query: IsActiveParamsDto;
  response: Country[];
}

// export interface UpdateStateContract extends RouteContract {
//   params: UpdateStateParamsDto;
//   body: UpdateStateBodyDto;
//   response: UpdateStateResponse;
// }

// export interface UpdateCountryContract extends RouteContract {
//   params: UpdateCountryParamsDto;
//   body: UpdateCountryBodyDto;
//   response: UpdateCountryResponse;
// }

// export interface CountryStats {
//   totalCountries: string;
//   activeCountries: string;
//   inactiveCountries: string;
// }

// export interface StateStats {
//   totalStates: string;
//   activeStates: string;
//   inactiveStates: string;
// }

// export interface RequestStats {
//   open: string;
//   pending: string;
//   approved: string;
//   rejected: string;
// }

export interface UpdateCountryStatusContract extends RouteContract {
  params: UpdateCountryParamsDto;
  body: UpdateCountryBodyDto;
}

export interface UpdateStateStatusContract extends RouteContract {
  params: UpdateStateParamsDto;
  body: UpdateStateBodyDto;
}
