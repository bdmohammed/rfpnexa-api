import {
  type AddCommentInput,
  type AssignReviewerInput,
  type ChangeRequestQueryInput,
  type CreateCountryChangeRequestInput,
  type DependencyMatrixQueryInput,
  type ReviewChangeRequestInput,
  type StateQueryDto,
  type UpdateCountryBodyDto,
  type UpdateCountryParamsDto,
  type UpdateStateBodyDto,
  type UpdateStateParamsDto,
} from './countries.dto';
import { CountriesService } from './countries.service';
import { CountryDependencyService, type DependencyMatrix } from './country-dependency.service';

import { asyncHandler } from '@/core/asyncHandler';
import { type ApiResponse, paginationMeta, sendCreated, sendOk } from '@/core/response';

export const getCountriesHierarchy = asyncHandler<{}, ApiResponse<unknown>>(async (_req, res) => {
  const hierarchy = await CountriesService.getCountriesHierarchy();
  return sendOk(res, hierarchy, 'Countries hierarchy retrieved successfully');
});

export const getOperationalStats = asyncHandler<{}, ApiResponse<unknown>>(async (req, res) => {
  const stats = await CountriesService.getOperationalStats(req.user!.userId);
  return sendOk(res, stats, 'Operational stats retrieved successfully');
});

export const getEligibleReviewers = asyncHandler<{}, ApiResponse<unknown>>(async (req, res) => {
  const reviewers = await CountriesService.getEligibleReviewers(req.user!.userId);
  return sendOk(res, reviewers, 'Eligible reviewers retrieved successfully');
});

export const getDependencyMatrix = asyncHandler<
  {},
  ApiResponse<DependencyMatrix>,
  {},
  DependencyMatrixQueryInput
>(async (req, res) => {
  const { targetType, countryId, stateId } = req.query;
  const matrix = await CountryDependencyService.getDependencyMatrix(targetType, countryId, stateId);
  return sendOk(res, matrix, 'Dependency matrix computed successfully');
});

export const createChangeRequest = asyncHandler<
  {},
  ApiResponse<unknown>,
  CreateCountryChangeRequestInput
>(async (req, res) => {
  const request = await CountriesService.createChangeRequest(req.user!.userId, req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return sendCreated(res, request, 'Change request ticket created successfully');
});

export const assignReviewer = asyncHandler<
  { id: string },
  ApiResponse<unknown>,
  AssignReviewerInput
>(async (req, res) => {
  const { id } = req.params;
  const { reviewerId } = req.body;
  const assignment = await CountriesService.assignReviewer(id, reviewerId, req.user!.userId, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return sendOk(res, assignment, 'Reviewer assigned successfully');
});

export const addComment = asyncHandler<{ id: string }, ApiResponse<unknown>, AddCommentInput>(
  async (req, res) => {
    const { id } = req.params;
    const comment = await CountriesService.addComment(id, req.user!.userId, req.body);
    return sendCreated(res, comment, 'Comment added successfully');
  },
);

export const reviewChangeRequest = asyncHandler<
  { id: string },
  ApiResponse<unknown>,
  ReviewChangeRequestInput
>(async (req, res) => {
  const { id } = req.params;
  const result = await CountriesService.reviewChangeRequest(id, req.user!.userId, req.body, {
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
  });
  return sendOk(res, result, 'Review decision executed successfully');
});

export const getReviewsQueue = asyncHandler<{}, ApiResponse<unknown>, {}, ChangeRequestQueryInput>(
  async (req, res) => {
    const { filter = 'all', page = 1, limit = 20 } = req.query;
    const result = await CountriesService.getReviewsQueue(req.user!.userId, filter, page, limit);
    return sendOk(
      res,
      result.data,
      'Reviews queue retrieved successfully',
      paginationMeta(result.meta.totalItems, page, limit),
    );
  },
);

export const getChangeRequestDetails = asyncHandler<{ id: string }, ApiResponse<unknown>>(
  async (req, res) => {
    const { id } = req.params;
    const details = await CountriesService.getChangeRequestDetails(id);
    return sendOk(res, details, 'Change request details retrieved successfully');
  },
);

export const getCountryTimeline = asyncHandler<
  { countryId: string },
  ApiResponse<unknown>,
  {},
  { stateId?: string }
>(async (req, res) => {
  const { countryId } = req.params;
  const { stateId } = req.query;
  const timeline = await CountriesService.getCountryTimeline(countryId, stateId);
  return sendOk(res, timeline, 'Country timeline retrieved successfully');
});

export const getRequestTimeline = asyncHandler<{ id: string }, ApiResponse<unknown>>(
  async (req, res) => {
    const { id } = req.params;
    const timeline = await CountriesService.getRequestTimeline(id);
    return sendOk(res, timeline, 'Request timeline retrieved successfully');
  },
);

export const listStates = asyncHandler<StateQueryDto>(async (req, res) => {
  const q = req.query;
  const { states, total } = await CountriesService.listAllStates(q);
  return sendOk(
    res,
    states,
    'OK',
    paginationMeta(total, q.page as unknown as number, q.limit as unknown as number),
  );
});

export const listCountries = asyncHandler(async (_req, res) => {
  const countries = await CountriesService.listDistinctCountries();
  return sendOk(res, countries);
});

export const updateState = asyncHandler<UpdateStateParamsDto, {}, UpdateStateBodyDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const before = await CountriesService.getStateById(id);
    res.locals['auditBefore'] = {
      isActive: before.isActive,
    };
    const state = await CountriesService.updateState(id, dto, req.user!.userId);
    return sendOk(res, state, 'State updated');
  },
);

export const updateCountry = asyncHandler<UpdateCountryParamsDto, {}, UpdateCountryBodyDto>(
  async (req, res) => {
    const dto = req.body;
    const { id } = req.params;
    const before = await CountriesService.getCountryById(id);
    res.locals['auditBefore'] = {
      isActive: before.isActive,
    };
    const country = await CountriesService.updateCountry(id, dto, req.user!.userId);
    return sendOk(res, country, 'Country updated');
  },
);
