// import {
//   type FindOptionsWhere,
//   OptimisticLockVersionMismatchError,
//   QueryFailedError,
//   type SelectQueryBuilder,
//   UpdateResult,
// } from 'typeorm';

import * as countryRepositories from './repositories/country.repository';
import {
  // type AddCommentInput,
  // type AddCommentResponse,
  // type AssignReviewerResponse,
  // type CountryHierarchyDto,
  // type CreateCountryChangeRequestInputDto,
  // type CreateCountryChangeRequestResponse,
  // type DependencyMatrix,
  // type GetChangeRequestDetailsResponse,
  // type GetCountryByIdResponse,
  // type GetCountryTimelineResponse,
  // type GetEligibleReviewersResponse,
  // type GetOperationalStatsResponse,
  // type GetRequestTimelineResponse,
  // type GetReviewsQueueItem,
  // type GetReviewsQueueResponse,
  type ListDistinctCountriesResponse,
  // type ListStatesResponse,
  // type ReviewChangeRequestInput,
  // type ReviewChangeRequestResponse,
  // type StateQueryDto,
  // type TenderStatistics,
  type UpdateCountryBodyDto,
  // type UpdateCountryResponse,
  type UpdateStateBodyDto,
  // type UpdateStateResponse,
  // type UserSummary,
} from './countries.dto';

// import * as countryChangeRequestRepositories from './repositories/countryChangeRequest.repository';
// import * as countryChangeRequestAssignmentRepository from './repositories/countryChangeRequestAssignment.repository';
// import * as countryVersionRepositories from './repositories/countryVersion.repository';
// import {
//   // buildWorkflowMap,
//   // mapCountriesHierarchy,
//   toUserSummary,
// } from './repositories/helper.repository';
// import * as stateRepositories from './repositories/state.repository';
// import type { RequestMetadata } from '@/utils/userAgent';
import { AppDataSource } from '@/config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { SUPER_ADMIN } from '@/core/constants';
// import { Tender } from '@/database/entities/Tender';
// import { TenderDocument } from '@/database/entities/TenderDocument';
import { Country } from '@/entities/Country';
// import { CountryActivity } from '@/entities/CountryActivity';
// import { CountryChangeRequest, DEFAULT_CASCADE_POLICY } from '@/entities/CountryChangeRequest';
// import { CountryChangeRequestAssignment } from '@/entities/CountryChangeRequestAssignment';
// import { CountryChangeRequestComment } from '@/entities/CountryChangeRequestComment';
// import { CountryVersion } from '@/entities/CountryVersion';
import { State } from '@/entities/State';
// import { StateVersion } from '@/entities/StateVersion';
// import { User } from '@/entities/User';
// import {
//   ActorType,
//   CountryActivityType,
//   CountryAssignmentStatus,
//   CountryChangeRequestAction,
//   CountryChangeRequestStatus,
//   CountryChangeRequestTargetType,
//   PermissionKey,
//   RoleStatus,
//   TenderBiddingStatus,
//   TenderProcessStatus,
//   TenderPublicationStatus,
//   TenderVersionStatus,
//   UserStatus,
// } from '@/types/enums';
// import { toNumber } from '@/utils/number';

const countryRepo = AppDataSource.getRepository(Country);
// const countryChangeRequestRepo = AppDataSource.getRepository(CountryChangeRequest);
const stateRepo = AppDataSource.getRepository(State);
// const userRepo = AppDataSource.getRepository(User);
// const tenderRepo = AppDataSource.getRepository(Tender);
// const tenderDocumentRepo = AppDataSource.getRepository(TenderDocument);
// const countryActivityRepo = AppDataSource.getRepository(CountryActivity);

/**
 * Retrieves countries hierarchy with nested states and workflow badges
 */
export async function getCountriesHierarchy(): Promise<Country[]> {
  // const [countries, activeRequests] = await Promise.all([
  //   countryRepositories.getCountriesWithStates(),
  //   countryChangeRequestRepositories.getActiveChangeRequests(),
  // ]);
  return countryRepositories.getCountriesWithStates();
  // const requestWorkflowMap = buildWorkflowMap(activeRequests);

  // return mapCountriesHierarchy(countries, requestWorkflowMap);
}

export async function updateCountryStatus(id: number, dto: UpdateCountryBodyDto): Promise<void> {
  await AppDataSource.transaction(async (manager) => {
    const txCountryRepo = manager.getRepository(Country);
    const txStateRepo = manager.getRepository(State);

    const result = await txCountryRepo.update({ id }, { isActive: Boolean(dto.isActive) });

    if (!result.affected) {
      throw new AppError(
        AppErrorMessage.COUNTRY_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.INVALID_COUNTRY,
      );
    }

    // Cascade: mirror the same isActive to every state that belongs to this country
    await txStateRepo.update({ countryId: id }, { isActive: Boolean(dto.isActive) });
  });
}

export async function updateStateStatus(id: number, dto: UpdateStateBodyDto): Promise<void> {
  await AppDataSource.transaction(async (manager) => {
    const txStateRepo = manager.getRepository(State);
    const txCountryRepo = manager.getRepository(Country);

    const state = await txStateRepo.findOne({
      where: { id },
      select: { id: true, countryId: true },
    });

    if (!state) {
      throw new AppError(
        AppErrorMessage.COUNTRY_NOT_FOUND,
        HttpStatusCode.NOT_FOUND,
        AppErrorCode.INVALID_COUNTRY,
      );
    }

    await txStateRepo.update({ id }, { isActive: Boolean(dto.isActive) });

    // Re-evaluate parent country status:
    // If ALL states of this country are now inactive → deactivate country
    // If at least one state is active → activate country
    const activeStateCount = await txStateRepo.count({
      where: { countryId: state.countryId, isActive: true },
    });

    const countryIsActive = activeStateCount > 0;
    await txCountryRepo.update({ id: state.countryId }, { isActive: countryIsActive });
  });
}

// /**
//  * Retrieves operational metrics for the Stats dashboard.
//  */
// export async function getOperationalStats(userId: string): Promise<GetOperationalStatsResponse> {
//   const [countryStats, stateStats, requestStats, myPendingAssignments] = await Promise.all([
//     countryRepositories.getCountryStats(),
//     stateRepositories.getStateStats(),
//     countryChangeRequestRepositories.getChangeRequestStats(),
//     countryChangeRequestAssignmentRepository.countPendingAssignments(userId),
//   ]);

//   const country = countryStats ?? {
//     totalCountries: '0',
//     activeCountries: '0',
//     inactiveCountries: '0',
//   };
//   const state = stateStats ?? { totalStates: '0', activeStates: '0', inactiveStates: '0' };
//   const request = requestStats ?? { open: '0', pending: '0', approved: '0', rejected: '0' };
//   return {
//     totalCountries: toNumber(country.totalCountries),
//     activeCountries: toNumber(country.activeCountries),
//     inactiveCountries: toNumber(country.inactiveCountries),

//     totalStates: toNumber(state.totalStates),
//     activeStates: toNumber(state.activeStates),
//     inactiveStates: toNumber(state.inactiveStates),

//     openChangeRequests: toNumber(request.open),
//     pendingRequests: toNumber(request.pending),
//     approvedRequests: toNumber(request.approved),
//     rejectedRequests: toNumber(request.rejected),

//     myPendingAssignments,
//   };
// }

// /**
//  * List eligible reviewers enforcing Rule 1 & Rule 2
//  */
// export async function getEligibleReviewers(
//   currentUserId: string,
//   roles: string[],
// ): Promise<GetEligibleReviewersResponse[]> {
//   // Users with active status and admin role that have country.review permission
//   const eligibleReviewers = await userRepo
//     .createQueryBuilder('user')
//     .innerJoin('user.userRoles', 'userRole')
//     .innerJoin('userRole.role', 'role')
//     .innerJoin('role.activeVersion', 'roleVersion')
//     .innerJoin('roleVersion.roleVersionPermissions', 'rvp')
//     .where('user.status = :userStatus', {
//       userStatus: UserStatus.ACTIVE,
//     })
//     .andWhere('role.status = :roleStatus', {
//       roleStatus: RoleStatus.ACTIVE,
//     })
//     .andWhere('rvp.permissionKey = :permKey', {
//       permKey: PermissionKey.COUNTRY_REVIEW,
//     })
//     .select(['user.id', 'user.name', 'user.email', 'user.avatarUrl'])
//     .distinct(true)
//     .orderBy('user.name', 'ASC')
//     .getMany();

//   const currentUserIsSuperAdmin = roles.includes(SUPER_ADMIN);
//   const hasOtherEligibleReviewer = eligibleReviewers.some((user) => user.id !== currentUserId);

//   const canSelfAssign = currentUserIsSuperAdmin || !hasOtherEligibleReviewer;

//   const reviewers = [...eligibleReviewers];
//   if (canSelfAssign && !reviewers.some((u) => u.id === currentUserId)) {
//     const currentUser = await userRepo.findOne({
//       where: { id: currentUserId },
//       select: {
//         id: true,
//         name: true,
//         email: true,
//         avatarUrl: true,
//       },
//     });
//     if (currentUser) {
//       reviewers.push(currentUser);
//     }
//   }

//   return reviewers.map((u) => {
//     const isSelf = u.id === currentUserId;
//     return {
//       id: u.id,
//       name: u.name,
//       fullName: u.name,
//       email: u.email,
//       avatarUrl: u.avatarUrl,
//       isSelf,
//       canBeAssigned: !isSelf || canSelfAssign,
//     };
//   });
// }

// /**
//  * Creates a new Country or State Change Request ticket (e.g. CTR-000001)
//  */
// export async function createChangeRequest(
//   requestedByUserId: string,
//   dto: CreateCountryChangeRequestInputDto,
//   reqMeta: RequestMetadata,
// ): Promise<CreateCountryChangeRequestResponse> {
//   return AppDataSource.transaction(async (manager) => {
//     const requestRepo = manager.getRepository(CountryChangeRequest);
//     const countryRepo = manager.getRepository(Country);
//     const stateRepo = manager.getRepository(State);
//     const activityRepo = manager.getRepository(CountryActivity);

//     const countryId = toNumber(dto.countryId);
//     const stateId =
//       dto.targetType === CountryChangeRequestTargetType.STATE ? toNumber(dto.stateId) : null;

//     const [country, state] = await Promise.all([
//       countryRepo.findOne({
//         where: {
//           id: countryId,
//         },
//         select: {
//           id: true,
//           name: true,
//           isActive: true,
//         },
//       }),

//       stateId === null
//         ? Promise.resolve(null)
//         : stateRepo.findOne({
//             where: {
//               id: stateId,
//               countryId,
//             },
//             select: {
//               id: true,
//               name: true,
//               isActive: true,
//             },
//           }),
//     ]);

//     if (!country) {
//       throw new AppError(
//         AppErrorMessage.COUNTRY_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if (dto.targetType === CountryChangeRequestTargetType.STATE && !state) {
//       throw new AppError(
//         AppErrorMessage.STATE_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }
//     const currentIsActive = state?.isActive ?? country.isActive;

//     if (dto.action === CountryChangeRequestAction.ACTIVATE && currentIsActive) {
//       throw new AppError(
//         AppErrorMessage.TARGET_ALREADY_ACTIVE(dto.targetType),
//         HttpStatusCode.CONFLICT,
//         AppErrorCode.RESOURCE_ALREADY_ACTIVE,
//       );
//     }

//     if (dto.action === CountryChangeRequestAction.DEACTIVATE && !currentIsActive) {
//       throw new AppError(
//         AppErrorMessage.TARGET_ALREADY_INACTIVE(dto.targetType),
//         HttpStatusCode.CONFLICT,
//         AppErrorCode.RESOURCE_ALREADY_INACTIVE,
//       );
//     }

//     const seqRes = await manager.query(
//       "SELECT nextval(COALESCE(pg_get_serial_sequence('country_change_requests', 'request_sequence'),
//       'country_change_requests_request_sequence_seq')) AS nextval",
//     );
//     const seqNumber = toNumber(seqRes[0].nextval);
//     const requestNumber = `CTR-${seqNumber.toString().padStart(6, '0')}`;

//     let request = requestRepo.create({
//       targetType: dto.targetType,
//       countryId,
//       stateId,
//       action: dto.action,
//       status: CountryChangeRequestStatus.READY_FOR_REVIEW,
//       requestedById: requestedByUserId,
//       reason: dto.reason,
//       cascadePolicy: {
//         ...DEFAULT_CASCADE_POLICY,
//         ...dto.cascadePolicy,
//       },
//       requestSequence: seqNumber,
//       requestNumber,
//     });

//     try {
//       request = await requestRepo.save(request);
//     } catch (err: unknown) {
//       const dbError = err as { code?: string; driverError?: { code?: string } };
//       if (
//         (err instanceof QueryFailedError && dbError.code === '23505') ||
//         dbError.code === '23505' ||
//         dbError.driverError?.code === '23505'
//       ) {
//         throw new AppError(
//           AppErrorMessage.CHANGE_REQUEST_ALREADY_EXISTS(dto.targetType.toLowerCase()),
//           HttpStatusCode.CONFLICT,
//           AppErrorCode.CONCURRENCY_CONFLICT,
//         );
//       }
//       throw err;
//     }

//     const targetName = state ? `${country.name} → ${state.name}` : country.name;

//     await activityRepo.save({
//       countryId,
//       stateId,
//       requestId: request.id,
//       actorId: requestedByUserId,
//       actorType: ActorType.USER,
//       eventType: CountryActivityType.REQUEST_CREATED,
//       title: `Change Request ${request.requestNumber} Created`,
//       description: `Requested to ${dto.action.toLowerCase()} ${dto.targetType.toLowerCase()} '${targetName}'.`,
//       oldValue: {
//         isActive: currentIsActive,
//       },
//       newValue: {
//         requestedAction: dto.action,
//       },
//       metadata: {
//         reason: dto.reason,
//         cascadePolicy: request.cascadePolicy,
//       },
//       ipAddress: reqMeta.ipAddress,
//       userAgent: reqMeta.userAgent,
//     });

//     return {
//       id: request.id,
//       requestNumber: request.requestNumber,
//       targetType: request.targetType,
//       action: request.action,
//       status: request.status,
//       createdAt: request.createdAt,
//     };
//   });
// }

// export async function assignReviewer(
//   requestId: string,
//   reviewerId: string,
//   assignedByUserId: string,
//   reqMeta?: RequestMetadata,
// ): Promise<AssignReviewerResponse> {
//   return AppDataSource.transaction(async (manager) => {
//     const requestRepo = manager.getRepository(CountryChangeRequest);
//     const assignmentRepo = manager.getRepository(CountryChangeRequestAssignment);
//     const activityRepo = manager.getRepository(CountryActivity);
//     const userRepo = manager.getRepository(User);

//     const [request, reviewer] = await Promise.all([
//       requestRepo.findOne({
//         where: { id: requestId },
//         lock: { mode: 'pessimistic_write' },
//       }),

//       userRepo.findOne({
//         where: { id: reviewerId },
//         select: {
//           id: true,
//           name: true,
//           avatarUrl: true,
//         },
//       }),
//     ]);

//     if (!request) {
//       throw new AppError(
//         AppErrorMessage.COUNTRY_CHANGE_REQUEST_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if (!reviewer) {
//       throw new AppError(
//         AppErrorMessage.USER_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.USER_NOT_FOUND,
//       );
//     }

//     if (reviewerId === request.requestedById) {
//       throw new AppError(
//         AppErrorMessage.CREATOR_REVIEWER_BLOCKED,
//         HttpStatusCode.FORBIDDEN,
//         AppErrorCode.CREATOR_APPROVAL_BLOCKED,
//       );
//     }

//     if (
//       [
//         CountryChangeRequestStatus.APPROVED,
//         CountryChangeRequestStatus.REJECTED,
//         CountryChangeRequestStatus.CANCELLED,
//       ].includes(request.status)
//     ) {
//       throw new AppError(
//         AppErrorMessage.CHANGE_REQUEST_ALREADY_CLOSED,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.INVALID_STATUS,
//       );
//     }

//     const alreadyAssigned = await assignmentRepo.existsBy({
//       requestId,
//       reviewerId,
//       status: CountryAssignmentStatus.PENDING,
//     });

//     if (alreadyAssigned) {
//       throw new AppError(
//         AppErrorMessage.REVIEWER_ALREADY_ASSIGNED,
//         HttpStatusCode.CONFLICT,
//         AppErrorCode.CONCURRENCY_CONFLICT,
//       );
//     }

//     await assignmentRepo.update(
//       {
//         requestId,
//         status: CountryAssignmentStatus.PENDING,
//       },
//       {
//         status: CountryAssignmentStatus.CANCELLED,
//       },
//     );

//     const assignment = assignmentRepo.create({
//       requestId,
//       reviewerId,
//       assignedById: assignedByUserId,
//       status: CountryAssignmentStatus.PENDING,
//     });

//     await assignmentRepo.save(assignment);

//     request.status = CountryChangeRequestStatus.IN_REVIEW;
//     try {
//       await requestRepo.save(request);
//     } catch (error) {
//       if (error instanceof OptimisticLockVersionMismatchError) {
//         throw new AppError(
//           'This change request was modified by another operation. Please reload and try again.',
//           HttpStatusCode.CONFLICT,
//           AppErrorCode.CONCURRENCY_CONFLICT,
//         );
//       }
//       throw error;
//     }

//     await activityRepo.save({
//       countryId: request.countryId,
//       stateId: request.stateId,
//       requestId: request.id,
//       actorId: assignedByUserId,
//       actorType: ActorType.USER,
//       eventType: CountryActivityType.REVIEWER_ASSIGNED,
//       title: 'Reviewer Assigned',
//       description: `Assigned reviewer '${reviewer.name}'.`,
//       metadata: {
//         reviewerId: reviewer.id,
//         reviewerName: reviewer.name,
//       },
//       ipAddress: reqMeta?.ipAddress ?? null,
//       userAgent: reqMeta?.userAgent ?? null,
//     });

//     return {
//       assignmentId: assignment.id,
//       requestId: request.id,
//       requestNumber: request.requestNumber,
//       reviewer: {
//         id: reviewer.id,
//         fullName: reviewer.name,
//         avatarUrl: reviewer.avatarUrl,
//       },
//       status: assignment.status,
//       assignedAt: assignment.createdAt,
//     };
//   });
// }

// /**
//  * Adds a comment to a change request
//  */
// export async function addComment(
//   requestId: string,
//   authorId: string,
//   dto: AddCommentInput,
// ): Promise<AddCommentResponse> {
//   return AppDataSource.transaction(async (manager) => {
//     const requestRepo = manager.getRepository(CountryChangeRequest);
//     const commentRepo = manager.getRepository(CountryChangeRequestComment);
//     const activityRepo = manager.getRepository(CountryActivity);

//     const request = await requestRepo.findOne({
//       where: { id: requestId },
//       select: {
//         id: true,
//         requestNumber: true,
//         countryId: true,
//         stateId: true,
//       },
//     });
//     if (!request) {
//       throw new AppError(
//         AppErrorMessage.COUNTRY_CHANGE_REQUEST_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     const comment = commentRepo.create({
//       requestId,
//       authorId,
//       type: dto.type,
//       content: dto.content,
//     });
//     const savedComment = await commentRepo.save(comment);

//     // Log Activity
//     await activityRepo.save({
//       countryId: request.countryId,
//       stateId: request.stateId,
//       requestId: request.id,
//       actorId: authorId,
//       actorType: ActorType.USER,
//       eventType: CountryActivityType.COMMENT_ADDED,
//       title: `Comment added to ${request.requestNumber}`,
//       description: dto.content.slice(0, 100),
//       metadata: {
//         commentId: savedComment.id,
//         commentType: savedComment.type,
//       },
//     });

//     return {
//       id: savedComment.id,
//       requestId: savedComment.requestId,
//       author: {
//         id: savedComment.authorId,
//       },
//       type: savedComment.type,
//       content: savedComment.content,
//       createdAt: savedComment.createdAt,
//     };
//   });
// }

// /**
//  * Reviews (Approve or Reject) a Change Request with atomic transaction and optimistic locking
//  */
// /**
//  * Reviews (approves or rejects) a country/state change request.
//  */
// export async function reviewChangeRequest(
//   requestId: string,
//   reviewerUserId: string,
//   dto: ReviewChangeRequestInput,
//   reqMeta: RequestMetadata,
// ): Promise<ReviewChangeRequestResponse> {
//   return AppDataSource.transaction(async (manager) => {
//     const requestRepo = manager.getRepository(CountryChangeRequest);
//     const assignmentRepo = manager.getRepository(CountryChangeRequestAssignment);
//     const countryRepo = manager.getRepository(Country);
//     const stateRepo = manager.getRepository(State);
//     const activityRepo = manager.getRepository(CountryActivity);

//     const request = await requestRepo.findOne({
//       where: { id: requestId },
//       lock: { mode: 'pessimistic_write' },
//     });

//     if (!request) {
//       throw new AppError(
//         AppErrorMessage.COUNTRY_CHANGE_REQUEST_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if (reviewerUserId === request.requestedById) {
//       throw new AppError(
//         AppErrorMessage.CREATOR_REVIEWER_BLOCKED,
//         HttpStatusCode.FORBIDDEN,
//         AppErrorCode.CREATOR_APPROVAL_BLOCKED,
//       );
//     }

//     if (
//       [
//         CountryChangeRequestStatus.APPROVED,
//         CountryChangeRequestStatus.REJECTED,
//         CountryChangeRequestStatus.CANCELLED,
//       ].includes(request.status)
//     ) {
//       throw new AppError(
//         AppErrorMessage.CHANGE_REQUEST_ALREADY_CLOSED,
//         HttpStatusCode.BAD_REQUEST,
//         AppErrorCode.INVALID_STATUS,
//       );
//     }

//     const assignment = await assignmentRepo.findOne({
//       where: {
//         requestId,
//         reviewerId: reviewerUserId,
//         status: CountryAssignmentStatus.PENDING,
//       },
//     });

//     if (!assignment) {
//       throw new AppError(
//         AppErrorMessage.CHANGE_REQUEST_NOT_ASSIGNED,
//         HttpStatusCode.FORBIDDEN,
//         AppErrorCode.FORBIDDEN,
//       );
//     }

//     const reviewedAt = new Date();

//     await assignmentRepo.update(assignment.id, {
//       status: CountryAssignmentStatus.COMPLETED,
//       respondedAt: reviewedAt,
//     });

//     if (dto.action === 'APPROVE') {
//       const isActive = request.action === CountryChangeRequestAction.ACTIVATE;
//       const countryVersionRepo = manager.getRepository(CountryVersion);
//       const stateVersionRepo = manager.getRepository(StateVersion);

//       if (request.targetType === CountryChangeRequestTargetType.COUNTRY) {
//         const countryBefore = await countryRepo.findOneOrFail({
//           where: { id: request.countryId },
//           lock: { mode: 'pessimistic_write' },
//         });

//         await countryRepo.update(request.countryId, { isActive });

//         // Compute the next per-country version number inside the transaction.
//         // The FOR UPDATE lock above prevents concurrent approvals for the same
//         // country from racing on this count.
//         const countryVersionCount = await countryVersionRepo.countBy({
//           countryId: request.countryId,
//         });

//         await countryVersionRepo.save(
//           countryVersionRepo.create({
//             countryId: request.countryId,
//             requestId: request.id,
//             version: countryVersionCount + 1,
//             code: countryBefore.code,
//             name: countryBefore.name,
//             slug: countryBefore.slug,
//             isActiveBefore: countryBefore.isActive,
//             isActiveAfter: isActive,
//             action: request.action,
//             approvedById: reviewerUserId,
//             requestedById: request.requestedById,
//           }),
//         );

//         if (!isActive && request.cascadePolicy.disableStates) {
//           await stateRepo.update({ countryId: request.countryId }, { isActive: false });

//           await activityRepo.save({
//             countryId: request.countryId,
//             requestId: request.id,
//             actorId: reviewerUserId,
//             actorType: ActorType.USER,
//             eventType: CountryActivityType.CASCADE_EXECUTED,
//             title: 'Cascade policy executed',
//             description: 'Configured cascade actions were executed.',
//             metadata: {
//               cascadePolicy: request.cascadePolicy,
//             },
//             ipAddress: reqMeta.ipAddress,
//             userAgent: reqMeta.userAgent ?? null,
//           });
//         }
//       } else {
//         const stateBefore = await stateRepo.findOneOrFail({
//           where: { id: request.stateId! },
//           lock: { mode: 'pessimistic_write' },
//         });

//         await stateRepo.update(request.stateId!, { isActive });

//         const stateVersionCount = await stateVersionRepo.countBy({
//           stateId: request.stateId!,
//         });

//         await stateVersionRepo.save(
//           stateVersionRepo.create({
//             stateId: request.stateId!,
//             countryId: request.countryId,
//             requestId: request.id,
//             version: stateVersionCount + 1,
//             code: stateBefore.code,
//             name: stateBefore.name,
//             slug: stateBefore.slug,
//             type: stateBefore.type,
//             isActiveBefore: stateBefore.isActive,
//             isActiveAfter: isActive,
//             action: request.action,
//             approvedById: reviewerUserId,
//             requestedById: request.requestedById,
//           }),
//         );
//       }

//       request.status = CountryChangeRequestStatus.APPROVED;
//       try {
//         await requestRepo.save(request);
//       } catch (error) {
//         if (error instanceof OptimisticLockVersionMismatchError) {
//           throw new AppError(
//             'This change request was modified by another operation. Please reload and try again.',
//             HttpStatusCode.CONFLICT,
//             AppErrorCode.CONCURRENCY_CONFLICT,
//           );
//         }
//         throw error;
//       }

//       await activityRepo.save({
//         countryId: request.countryId,
//         stateId: request.stateId,
//         requestId: request.id,
//         actorId: reviewerUserId,
//         actorType: ActorType.USER,
//         eventType: CountryActivityType.APPROVED,
//         title: `Change Request ${request.requestNumber} Approved`,
//         description: dto.comment ?? 'Approved',
//         metadata: {
//           comment: dto.comment ?? null,
//         },
//         ipAddress: reqMeta.ipAddress,
//         userAgent: reqMeta.userAgent ?? null,
//       });

//       return {
//         id: request.id,
//         requestNumber: request.requestNumber,
//         status: CountryChangeRequestStatus.APPROVED,
//         reviewedById: reviewerUserId,
//         reviewedAt,
//       };
//     }

//     request.status = CountryChangeRequestStatus.REJECTED;
//     try {
//       await requestRepo.save(request);
//     } catch (error) {
//       if (error instanceof OptimisticLockVersionMismatchError) {
//         throw new AppError(
//           'This change request was modified by another operation. Please reload and try again.',
//           HttpStatusCode.CONFLICT,
//           AppErrorCode.CONCURRENCY_CONFLICT,
//         );
//       }
//       throw error;
//     }

//     await activityRepo.save({
//       countryId: request.countryId,
//       stateId: request.stateId,
//       requestId: request.id,
//       actorId: reviewerUserId,
//       actorType: ActorType.USER,
//       eventType: CountryActivityType.REJECTED,
//       title: `Change Request ${request.requestNumber} Rejected`,
//       description: dto.comment ?? 'Rejected',
//       metadata: {
//         comment: dto.comment ?? null,
//       },
//       ipAddress: reqMeta.ipAddress,
//       userAgent: reqMeta.userAgent ?? null,
//     });

//     return {
//       id: request.id,
//       requestNumber: request.requestNumber,
//       status: CountryChangeRequestStatus.REJECTED,
//       reviewedById: reviewerUserId,
//       reviewedAt,
//     };
//   });
// }

// /**
//  * Retrieves Jira-style Change Request Queue
//  */
// export async function getReviewsQueue(
//   userId: string,
//   filter: 'assigned' | 'pending' | 'approved' | 'rejected' | 'all' = 'all',
//   page = 1,
//   limit = 20,
// ): Promise<GetReviewsQueueResponse> {
//   const qb = countryChangeRequestRepo
//     .createQueryBuilder('req')
//     .innerJoinAndSelect('req.country', 'country')
//     .leftJoinAndSelect('req.state', 'state')
//     .innerJoinAndSelect('req.requestedBy', 'requestedBy')
//     .leftJoinAndSelect('req.assignments', 'assignment')
//     .leftJoinAndSelect('assignment.reviewer', 'reviewer')
//     .orderBy('req.createdAt', 'DESC');

//   if (filter === 'assigned') {
//     qb.andWhere('assignment.reviewerId = :userId', { userId }).andWhere(
//       'assignment.status = :aStatus',
//       {
//         aStatus: CountryAssignmentStatus.PENDING,
//       },
//     );
//   } else if (filter === 'pending') {
//     qb.andWhere('req.status IN (:...statuses)', {
//       statuses: [CountryChangeRequestStatus.READY_FOR_REVIEW, CountryChangeRequestStatus.IN_REVIEW],
//     });
//   } else if (filter === 'approved') {
//     qb.andWhere('req.status = :status', { status: CountryChangeRequestStatus.APPROVED });
//   } else if (filter === 'rejected') {
//     qb.andWhere('req.status = :status', { status: CountryChangeRequestStatus.REJECTED });
//   }

//   const totalItems = await qb.getCount();
//   const requests = await qb
//     .skip((page - 1) * limit)
//     .take(limit)
//     .getMany();

//   return {
//     data: requests.map((r) => {
//       const pendingAssign = r.assignments.find((a) => a.status === CountryAssignmentStatus.PENDING);
//       return {
//         id: parseInt(r.id),
//         requestNumber: r.requestNumber,
//         targetType: r.targetType,
//         countryId: r.countryId,
//         countryName: r.country.name,
//         stateId: r.stateId,
//         stateName: r.state?.name,
//         action: r.action,
//         status: r.status,
//         reason: r.reason,
//         requestedBy: {
//           id: r.requestedBy.id,
//           fullName: r.requestedBy.name,
//           avatarUrl: r.requestedBy.avatarUrl,
//         },
//         assignedReviewer: pendingAssign
//           ? {
//               id: pendingAssign.reviewer.id,
//               fullName: pendingAssign.reviewer.name,
//               avatarUrl: pendingAssign.reviewer.avatarUrl,
//             }
//           : null,
//         cascadePolicy: r.cascadePolicy,
//         createdAt: r.createdAt,
//         updatedAt: r.updatedAt,
//       } as GetReviewsQueueItem;
//     }),
//     totalItems,
//   };
// }

// /**
//  * Fetches single change request detail with comments and dependency matrix
//  */
// export async function getChangeRequestDetails(
//   requestId: string,
// ): Promise<GetChangeRequestDetailsResponse> {
//   const request = await countryChangeRequestRepo.findOne({
//     where: { id: requestId },
//     relations: {
//       country: true,
//       state: true,
//       requestedBy: true,
//       assignments: {
//         reviewer: true,
//       },
//       comments: {
//         author: true,
//       },
//     },
//     order: { comments: { createdAt: 'ASC' } },
//   });

//   if (!request) {
//     throw new AppError(
//       'Change request not found',
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   const dependencyMatrix = await getDependencyMatrix(
//     request.targetType,
//     request.countryId,
//     request.stateId,
//   );

//   return {
//     ...request,
//     ...dependencyMatrix,
//   };
// }

// /**
//  * Retrieves the activity timeline for a country or a specific state.
//  */
// export async function getCountryTimeline(
//   countryId: number,
//   stateId: number | null,
//   page = 1,
//   limit = 20,
// ): Promise<GetCountryTimelineResponse> {
//   const where: FindOptionsWhere<CountryActivity> = {
//     countryId,
//     ...(stateId && { stateId }),
//   };

//   const [activities, total] = await countryActivityRepo.findAndCount({
//     where,
//     relations: {
//       actor: true,
//     },
//     select: {
//       id: true,
//       eventType: true,
//       title: true,
//       description: true,
//       actorType: true,
//       requestId: true,
//       metadata: true,
//       createdAt: true,
//       actor: {
//         id: true,
//         name: true,
//         avatarUrl: true,
//       },
//     },
//     order: {
//       createdAt: 'DESC',
//     },
//     skip: (page - 1) * limit,
//     take: limit,
//   });

//   return {
//     total,
//     data: activities.map((activity) => ({
//       id: activity.id,
//       eventType: activity.eventType,
//       title: activity.title,
//       description: activity.description,
//       actorType: activity.actorType,
//       requestId: activity.requestId,
//       metadata: activity.metadata,
//       createdAt: activity.createdAt,
//       actor: {
//         id: activity.actor.id,
//         fullName: activity.actor.name,
//         avatarUrl: activity.actor.avatarUrl,
//       },
//     })),
//   };
// }

// /**
//  * Retrieves the chronological activity timeline for a change request.
//  */
// export async function getRequestTimeline(
//   requestId: string,
//   page = 1,
//   limit = 20,
// ): Promise<GetRequestTimelineResponse> {
//   const exists = await countryChangeRequestRepo.existsBy({
//     id: requestId,
//   });

//   if (!exists) {
//     throw new AppError(
//       AppErrorMessage.COUNTRY_CHANGE_REQUEST_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   const [activities, total] = await countryActivityRepo.findAndCount({
//     where: { requestId },
//     relations: {
//       actor: true,
//     },
//     select: {
//       id: true,
//       eventType: true,
//       title: true,
//       description: true,
//       actorType: true,
//       metadata: true,
//       createdAt: true,
//       actor: {
//         id: true,
//         name: true,
//         avatarUrl: true,
//       },
//     },
//     order: {
//       createdAt: 'ASC',
//     },
//     skip: (page - 1) * limit,
//     take: limit,
//   });

//   return {
//     total,
//     data: activities.map((activity) => ({
//       id: activity.id,
//       eventType: activity.eventType,
//       title: activity.title,
//       description: activity.description,
//       actorType: activity.actorType,
//       metadata: activity.metadata,
//       createdAt: activity.createdAt,
//       actor: {
//         id: activity.actor.id,
//         fullName: activity.actor.name,
//         avatarUrl: activity.actor.avatarUrl,
//       },
//     })),
//   };
// }

// export async function listAllStates(query: StateQueryDto): Promise<{
//   data: ListStatesResponse;
//   total: number;
//   page: number;
//   limit: number;
// }> {
//   const page = Math.max(1, query.page);
//   const limit = Math.min(100, Math.max(1, query.limit));

//   const qb = stateRepo
//     .createQueryBuilder('state')
//     .innerJoin('state.country', 'country')
//     .select([
//       'state.id',
//       'state.code',
//       'state.name',
//       'state.slug',
//       'state.type',
//       'state.countryId',
//       'state.isActive',
//       'country.code',
//       'country.name',
//     ])
//     .where('state.isActive = true');

//   if (query.code) {
//     qb.andWhere('state.code = :code', {
//       code: query.code.toUpperCase(),
//     });
//   }

//   if (query.slug) {
//     qb.andWhere('state.slug = :slug', {
//       slug: query.slug,
//     });
//   }

//   if (query.type) {
//     qb.andWhere('state.type = :type', {
//       type: query.type,
//     });
//   }

//   if (query.countryId) {
//     qb.andWhere('state.countryId = :countryId', {
//       countryId: query.countryId,
//     });
//   }

//   if (query.countryCode) {
//     qb.andWhere('country.code = :countryCode', {
//       countryCode: query.countryCode.toUpperCase(),
//     });
//   }

//   if (query.search) {
//     qb.andWhere(
//       `
//       (
//         state.name ILIKE :search
//         OR state.code ILIKE :search
//         OR country.name ILIKE :search
//         OR country.code ILIKE :search
//       )
//       `,
//       {
//         search: `%${query.search.trim()}%`,
//       },
//     );
//   }

//   qb.orderBy('state.name', 'ASC')
//     .skip((page - 1) * limit)
//     .take(limit);

//   const [states, total] = await qb.getManyAndCount();

//   return {
//     page,
//     limit,
//     total,
//     data: states.map((state) => ({
//       id: state.id,
//       code: state.code,
//       name: state.name,
//       slug: state.slug,
//       type: state.type,
//       countryId: state.countryId,
//       countryCode: state.country.code,
//       countryName: state.country.name,
//       isActive: state.isActive,
//     })),
//   };
// }

export async function listDistinctCountries(
  isActive?: string,
): Promise<ListDistinctCountriesResponse[]> {
  const result = await countryRepo.find({
    select: {
      id: true,
      name: true,
      code: true,
    },
    // where: { isActive: true },
    ...(isActive ? { where: { isActive: Boolean(isActive) } } : null),
    order: { name: 'ASC' },
  });
  return result.map((country) => ({
    id: country.id,
    name: country.name,
    code: country.code,
  }));
}

export async function listDistinctStates(
  id: number,
  isActive?: string,
): Promise<ListDistinctCountriesResponse[]> {
  const result = await stateRepo.find({
    select: {
      id: true,
      name: true,
      code: true,
    },
    where: { countryId: id, ...(isActive ? { isActive: Boolean(isActive) } : null) },
    order: { name: 'ASC' },
  });
  return result.map((country) => ({
    id: country.id,
    name: country.name,
    code: country.code,
  }));
}

// export async function getStateById(id: number): Promise<State> {
//   const state = await stateRepo.findOne({
//     where: { id },
//     relations: {
//       country: true,
//     },
//   });
//   if (!state) {
//     throw new AppError(
//       AppErrorMessage.STATE_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }
//   return state;
// }

// export async function getCountryById(id: number): Promise<GetCountryByIdResponse> {
//   const country = await countryRepo.findOne({
//     where: { id },
//     relations: { createdBy: true, updatedBy: true },
//   });
//   if (!country) {
//     throw new AppError(
//       AppErrorMessage.COUNTRY_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   const [statistics, pendingReview, currentVersion] = await Promise.all([
//     stateRepositories.getStateStatsByCountryId(id),
//     countryChangeRequestRepositories.getPendingReview(id),
//     countryVersionRepositories.getCurrentVersion(id),
//   ]);
//   return {
//     ...country,
//     updatedBy: toUserSummary(country.updatedBy),
//     createdBy: toUserSummary(country.createdBy) as UserSummary,
//     statistics: {
//       totalStates: toNumber(statistics!.totalStates),
//       activeStates: toNumber(statistics!.activeStates),
//       inactiveStates: toNumber(statistics!.inactiveStates),
//       // pendingStateReviews: 0, // fetch separately if required
//     },

//     pendingReview: {
//       hasPendingRequest: !!pendingReview,
//       requestId: pendingReview?.requestId ?? null,
//       status: pendingReview?.status ?? null,
//     },

//     currentVersion: currentVersion
//       ? {
//           version: toNumber(currentVersion.version),
//           approvedAt: currentVersion.approvedAt,
//           approvedBy: {
//             id: currentVersion.approvedById,
//             name: currentVersion.approvedByName,
//           },
//         }
//       : null,
//   };
// }

// export async function updateState(
//   id: number,
//   dto: UpdateStateBodyDto,
//   updatedById: string,
// ): Promise<UpdateStateResponse> {
//   const { affected } = await stateRepo.update(
//     { id },
//     {
//       isActive: dto.isActive,
//       updatedById,
//     },
//   );

//   if (affected !== 1) {
//     throw new AppError(
//       AppErrorMessage.STATE_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   const state = await stateRepo.findOne({
//     where: { id },
//     relations: {
//       country: true,
//     },
//     select: {
//       id: true,
//       code: true,
//       name: true,
//       slug: true,
//       type: true,
//       countryId: true,
//       isActive: true,
//       country: {
//         code: true,
//         name: true,
//       },
//     },
//   });

//   if (!state) {
//     throw new AppError(
//       AppErrorMessage.STATE_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   return {
//     id: state.id,
//     code: state.code,
//     name: state.name,
//     slug: state.slug,
//     type: state.type,
//     countryId: state.countryId,
//     countryCode: state.country.code,
//     countryName: state.country.name,
//     isActive: state.isActive,
//   };
// }

// export async function updateCountry(
//   id: number,
//   dto: UpdateCountryBodyDto,
//   updatedById: string,
// ): Promise<UpdateCountryResponse> {
//   return AppDataSource.transaction(async (manager) => {
//     const countryRepo = manager.getRepository(Country);
//     const activityRepo = manager.getRepository(CountryActivity);

//     const country = await countryRepo.findOne({
//       where: { id },
//       select: {
//         id: true,
//         code: true,
//         name: true,
//         slug: true,
//         isActive: true,
//       },
//     });

//     if (!country) {
//       throw new AppError(
//         AppErrorMessage.COUNTRY_NOT_FOUND,
//         HttpStatusCode.NOT_FOUND,
//         AppErrorCode.NOT_FOUND,
//       );
//     }

//     if (country.isActive === dto.isActive) {
//       throw new AppError(
//         dto.isActive
//           ? AppErrorMessage.TARGET_ALREADY_ACTIVE('country')
//           : AppErrorMessage.TARGET_ALREADY_INACTIVE('country'),
//         HttpStatusCode.CONFLICT,
//         dto.isActive
//           ? AppErrorCode.RESOURCE_ALREADY_ACTIVE
//           : AppErrorCode.RESOURCE_ALREADY_INACTIVE,
//       );
//     }

//     country.isActive = dto.isActive;
//     country.updatedById = updatedById;

//     await countryRepo.save(country);

//     await activityRepo.save({
//       countryId: country.id,
//       stateId: null,
//       requestId: null,
//       actorId: updatedById,
//       actorType: ActorType.USER,
//       eventType: dto.isActive ? CountryActivityType.ACTIVATED : CountryActivityType.DEACTIVATED,
//       title: dto.isActive ? 'Country Activated' : 'Country Deactivated',
//       description: `${country.name} was ${dto.isActive ? 'activated' : 'deactivated'}.`,
//       oldValue: {
//         isActive: !dto.isActive,
//       },
//       newValue: {
//         isActive: dto.isActive,
//       },
//       metadata: null,
//       ipAddress: null,
//       userAgent: null,
//     });

//     return {
//       id: country.id,
//       code: country.code,
//       name: country.name,
//       slug: country.slug,
//       isActive: country.isActive,
//     };
//   });
// }

// function buildTenderStatisticsQuery(
//   targetType: CountryChangeRequestTargetType,
//   countryId: number,
//   stateId: number | null,
// ): SelectQueryBuilder<Tender> {
//   const qb = tenderRepo.createQueryBuilder('tender').innerJoin('tender.activeVersion', 'version');

//   if (targetType === CountryChangeRequestTargetType.COUNTRY) {
//     qb.innerJoin('version.state', 'state').where('state.country_id = :countryId', { countryId });
//   } else {
//     qb.where('version.state_id = :stateId', {
//       stateId,
//     });
//   }

//   return qb
//     .select('COUNT(*)', 'total')
//     .addSelect(
//       `COUNT(*) FILTER (
//         WHERE tender.status = :draftStatus
//       )`,
//       'draft',
//     )
//     .addSelect(
//       `COUNT(*) FILTER (
//         WHERE tender.publication_status IN (:...publishedStatuses)
//       )`,
//       'published',
//     )
//     .addSelect(
//       `COUNT(*) FILTER (
//         WHERE tender.publication_status = :awardedStatus
//       )`,
//       'awarded',
//     )
//     .setParameters({
//       draftStatus: TenderVersionStatus.DRAFT,
//       publishedStatuses: [TenderPublicationStatus.PUBLISHED, TenderBiddingStatus.OPEN],
//       awardedStatus: TenderProcessStatus.AWARDED,
//     });
// }

// /**
//  * Computes the comprehensive 11-field dependency matrix for a country or state
//  */
// export async function getDependencyMatrix(
//   targetType: CountryChangeRequestTargetType,
//   countryId: number,
//   stateId: number | null,
// ): Promise<DependencyMatrix> {
//   const isCountry = targetType === CountryChangeRequestTargetType.COUNTRY;

//   const tenderStatsQuery = buildTenderStatisticsQuery(targetType, countryId, stateId);
//   const documentsQuery = tenderDocumentRepo
//     .createQueryBuilder('document')
//     .innerJoin('document.tenderVersion', 'version');

//   if (isCountry) {
//     documentsQuery.innerJoin('version.state', 'state').where('state.country_id = :countryId', {
//       countryId,
//     });
//   } else {
//     documentsQuery.where('version.state_id = :stateId', {
//       stateId,
//     });
//   }

//   const [users, states, tenderStats, documents] = await Promise.all([
//     userRepo.count({
//       where: { countryId },
//     }),

//     isCountry
//       ? stateRepo.count({
//           where: {
//             countryId,
//           },
//         })
//       : Promise.resolve(1),

//     tenderStatsQuery.getRawOne<TenderStatistics>(),

//     documentsQuery.getCount(),
//   ]);

//   return {
//     users,
//     companies: 0,
//     tenders: toNumber(tenderStats!.total),
//     draftTenders: toNumber(tenderStats!.draft),
//     publishedTenders: toNumber(tenderStats!.published),
//     categories: 0,
//     states,
//     cities: 0,
//     offices: 0,
//     contracts: toNumber(tenderStats!.awarded),
//     documents,
//   };
// }

// export async function getStateAuditSnapshot(id: number) {
//   const state = await stateRepo.findOne({
//     select: {
//       isActive: true,
//     },
//     where: {
//       id,
//     },
//   });

//   if (!state) {
//     throw new AppError(
//       AppErrorMessage.STATE_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   return {
//     isActive: state.isActive,
//   };
// }

// export async function getCountryAuditSnapshot(id: number): Promise<{
//   isActive: boolean;
// }> {
//   const country = await countryRepo.findOne({
//     select: {
//       isActive: true,
//     },
//     where: {
//       id,
//     },
//   });

//   if (!country) {
//     throw new AppError(
//       AppErrorMessage.COUNTRY_NOT_FOUND,
//       HttpStatusCode.NOT_FOUND,
//       AppErrorCode.NOT_FOUND,
//     );
//   }

//   return {
//     isActive: country.isActive,
//   };
// }
