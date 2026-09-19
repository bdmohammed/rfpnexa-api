import * as countriesService from './countries.service';

import type {
  // type AddCommentContract,
  // type AssignReviewerContract,
  // type CreateChangeRequestContract,
  // type GetChangeRequestDetailsContract,
  GetCountriesHierarchyContract,
  // type GetCountryByIdContract,
  // type GetCountryTimelineContract,
  // type GetDependencyMatrixContract,
  // type GetEligibleReviewersContract,
  // type GetOperationalStatsContract,
  // type GetRequestTimelineContract,
  // type GetReviewsQueueContract,
  listCountriesContract,
  UpdateCountryStatusContract,
  UpdateStateStatusContract,
  // type ListStatesContract,
  // type ReviewChangeRequestContract,
  // type UpdateCountryContract,
  // type UpdateStateContract,
} from './countries.dto';
import { contractAsyncHandler } from '@/core/asyncHandler';
import { sendCreated, sendOk } from '@/core/response';
import { assertAuthenticated } from '@/utils/authenticate';
import { toNumber } from '@/utils/number';
// import { getRequestMetadata } from '@/utils/userAgent';

export const getCountriesHierarchy = contractAsyncHandler<GetCountriesHierarchyContract>(
  async (_req, res) => {
    const hierarchy = await countriesService.getCountriesHierarchy();
    return sendOk(res, hierarchy, 'Countries hierarchy retrieved successfully');
  },
);

export const updateCountryStatus = contractAsyncHandler<UpdateCountryStatusContract>(
  async (req, res) => {
    const { id } = req.params;
    await countriesService.updateCountryStatus(toNumber(id), req.body);

    return sendCreated(res, {});
  },
);

export const updateStateStatus = contractAsyncHandler<UpdateStateStatusContract>(
  async (req, res) => {
    assertAuthenticated(req);

    const { id } = req.params;
    await countriesService.updateStateStatus(toNumber(id), req.body);

    return sendCreated(res, {});
  },
);

// export const getCountryById = contractAsyncHandler<GetCountryByIdContract>(async (req, res) => {
//   const country = await countriesService.getCountryById(toNumber(req.params.countryId));
//   return sendOk(res, country, 'Country retrieved successfully');
// });

// export const getOperationalStats = contractAsyncHandler<GetOperationalStatsContract>(
//   async (req, res) => {
//     assertAuthenticated(req);
//     const stats = await countriesService.getOperationalStats(req.user.userId);
//     return sendOk(res, stats, 'Operational stats retrieved successfully');
//   },
// );

// export const getEligibleReviewers = contractAsyncHandler<GetEligibleReviewersContract>(
//   async (req, res) => {
//     assertAuthenticated(req);
//     const reviewers = await countriesService.getEligibleReviewers(req.user.userId, req.roles);
//     return sendOk(res, reviewers, 'Eligible reviewers retrieved successfully');
//   },
// );

// export const getDependencyMatrix = contractAsyncHandler<GetDependencyMatrixContract>(
//   async (req, res) => {
//     const { targetType, countryId, stateId } = req.query;
//     const matrix = await countriesService.getDependencyMatrix(
//       targetType,
//       toNumber(countryId),
//       toNumber(stateId),
//     );
//     return sendOk(res, matrix, 'Dependency matrix computed successfully');
//   },
// );

// export const createChangeRequest = contractAsyncHandler<CreateChangeRequestContract>(
//   async (req, res) => {
//     assertAuthenticated(req);
//     const request = await countriesService.createChangeRequest(
//       req.user.userId,
//       req.body,
//       getRequestMetadata(req),
//     );
//     return sendCreated(res, request, 'Change request ticket created successfully');
//   },
// );

// export const assignReviewer = contractAsyncHandler<AssignReviewerContract>(async (req, res) => {
//   assertAuthenticated(req);
//   const { id } = req.params;
//   const { reviewerId } = req.body;
//   const assignment = await countriesService.assignReviewer(
//     id,
//     reviewerId,
//     req.user.userId,
//     getRequestMetadata(req),
//   );
//   return sendOk(res, assignment, 'Reviewer assigned successfully');
// });

// export const addComment = contractAsyncHandler<AddCommentContract>(async (req, res) => {
//   assertAuthenticated(req);
//   const { id } = req.params;
//   const comment = await countriesService.addComment(id, req.user.userId, req.body);
//   return sendCreated(res, comment, 'Comment added successfully');
// });

// export const reviewChangeRequest = contractAsyncHandler<ReviewChangeRequestContract>(
//   async (req, res) => {
//     assertAuthenticated(req);
//     const { id } = req.params;
//     const result = await countriesService.reviewChangeRequest(
//       id,
//       req.user.userId,
//       req.body,
//       getRequestMetadata(req),
//     );
//     return sendOk(res, result, 'Review decision executed successfully');
//   },
// );

// export const getReviewsQueue = contractAsyncHandler<GetReviewsQueueContract>(async (req, res) => {
//   assertAuthenticated(req);

//   const { filter = 'all', page = 1, limit = 20 } = req.query;
//   const result = await countriesService.getReviewsQueue(req.user.userId, filter, page, limit);
//   return sendOk(
//     res,
//     result.data,
//     'Reviews queue retrieved successfully',
//     paginationMeta(result.totalItems, page, limit),
//   );
// });

// export const getChangeRequestDetails = contractAsyncHandler<GetChangeRequestDetailsContract>(
//   async (req, res) => {
//     const { id } = req.params;
//     const details = await countriesService.getChangeRequestDetails(id);
//     return sendOk(res, details, 'Change request details retrieved successfully');
//   },
// );

// export const getCountryTimeline = contractAsyncHandler<GetCountryTimelineContract>(
//   async (req, res) => {
//     const { countryId } = req.params;
//     const { stateId, page = 1, limit = 20 } = req.query;
//     const result = await countriesService.getCountryTimeline(
//       toNumber(countryId),
//       toNumber(stateId),
//     );
//     return sendOk(
//       res,
//       result.data,
//       'Country timeline retrieved successfully',
//       paginationMeta(result.total, page, limit),
//     );
//   },
// );

// export const getRequestTimeline = contractAsyncHandler<GetRequestTimelineContract>(
//   async (req, res) => {
//     const { id } = req.params;
//     const { page = 1, limit = 20 } = req.query;
//     const result = await countriesService.getRequestTimeline(id, page, limit);
//     return sendOk(
//       res,
//       result.data,
//       'Change request timeline retrieved successfully',
//       paginationMeta(result.total, page, limit),
//     );
//   },
// );

// export const listStates = contractAsyncHandler<ListStatesContract>(async (req, res) => {
//   const result = await countriesService.listAllStates(req.query);
//   return sendOk(
//     res,
//     result.data,
//     'States retrieved successfully',
//     paginationMeta(result.total, result.page, result.limit),
//   );
// });

export const listCountries = contractAsyncHandler<listCountriesContract>(async (req, res) => {
  const countries = await countriesService.listDistinctCountries(req.query.isActive);
  return sendOk(res, countries);
});

export const listStates = contractAsyncHandler<listCountriesContract>(async (req, res) => {
  const states = await countriesService.listDistinctStates(
    toNumber(req.params.id as string),
    req.query.isActive,
  );
  return sendOk(res, states);
});

// export const listFullCountries = contractAsyncHandler<listFullCountriesContract>(
//   async (_req, res) => {
//     const countries = await countriesService.listDistinctCountries();
//     return sendOk(res, countries);
//   },
// );

// export const updateState = contractAsyncHandler<UpdateStateContract>(async (req, res) => {
//   assertAuthenticated(req);

//   const { id } = req.params;
//   const before = await countriesService.getStateAuditSnapshot(toNumber(id));
//   res.locals.auditBefore = before;
//   const state = await countriesService.updateState(toNumber(id), req.body, req.user.userId);

//   return sendOk(res, state, 'State updated successfully');
// });

// export const updateCountry = contractAsyncHandler<UpdateCountryContract>(async (req, res) => {
//   assertAuthenticated(req);

//   const { id } = req.params;
//   res.locals.auditBefore = await countriesService.getCountryAuditSnapshot(toNumber(id));
//   const country = await countriesService.updateCountry(toNumber(id), req.body, req.user.userId);

//   return sendOk(res, country, 'Country updated successfully');
// });
