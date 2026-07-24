import { parse } from 'csv-parse/sync';

import {
  type BatchCategoriesResultDto,
  type BatchCategoryItemDto,
  BatchCategorySchema,
  type CategoryDecisionDto,
  type CategoryQueryDto,
  type CategoryStatsDto,
  type CreateCategoryDto,
  type IdParamDto,
  type SubmitCategoryReviewDto,
  type UpdateCategoryDto,
} from './categories.dto';
import * as service from './categories.service';

import type { ApiResponse } from '@/core/response';
import type { AuditLog } from '@/database/entities/AuditLog';
import type { Category } from '@/database/entities/Category';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { asyncHandler } from '@/core/asyncHandler';
import { paginationMeta, sendCreated, sendOk } from '@/core/response';

export const listCategories = asyncHandler<
  {},
  ApiResponse<{ categories: Category[]; total: number; stats: CategoryStatsDto }>,
  {},
  CategoryQueryDto
>(async (req, res) => {
  const { query } = req;
  const { categories, total } = await service.listAllCategories(query);
  const stats = await service.getCategoryStats();
  return sendOk(
    res,
    { categories, total, stats },
    'OK',
    paginationMeta(total, query.page, query.limit),
  );
});

export const getCategoryStats = asyncHandler<{}, ApiResponse<CategoryStatsDto>>(
  async (_req, res) => {
    const stats = await service.getCategoryStats();
    return sendOk(res, stats);
  },
);

export const getCategoryHistory = asyncHandler<IdParamDto, ApiResponse<AuditLog[]>>(
  async (req, res) => {
    const history = await service.getCategoryHistory(req.params.id);
    return sendOk(res, history);
  },
);

export const createCategory = asyncHandler<{}, ApiResponse<Category>, CreateCategoryDto>(
  async (req, res) => {
    const dto = req.body;
    const category = await service.createCategory(dto, req.user!.userId);
    return sendCreated(res, category, 'Category created');
  },
);

export const updateCategory = asyncHandler<IdParamDto, ApiResponse<Category>, UpdateCategoryDto>(
  async (req, res) => {
    const dto = req.body;
    const before = await service.getCategoryById(req.params.id);
    res.locals['auditBefore'] = {
      code: before.code,
      name: before.name,
      slug: before.slug,
      description: before.description,
      isActive: before.isActive,
    };
    const category = await service.updateCategory(req.params.id, dto, req.user!.userId);
    return sendOk(res, category, 'Category updated');
  },
);

export const deleteCategory = asyncHandler<IdParamDto, ApiResponse<null>>(async (req, res) => {
  const before = await service.getCategoryById(req.params.id);
  res.locals['auditBefore'] = {
    code: before.code,
    name: before.name,
    slug: before.slug,
    description: before.description,
    isActive: before.isActive,
  };
  await service.deleteCategory(req.params.id, req.user!.userId);
  return sendOk(res, null, 'Category deleted');
});

export const getCategoryGovernance = asyncHandler<IdParamDto, ApiResponse<unknown>>(
  async (req, res) => {
    const details = await service.getCategoryGovernanceDetails(req.params.id);
    return sendOk(res, details);
  },
);

export const addCategoryComment = asyncHandler<
  IdParamDto,
  ApiResponse<unknown>,
  { comment: string }
>(async (req, res) => {
  const comment = await service.addCategoryComment(
    req.params.id,
    req.user!.userId,
    req.body.comment,
  );
  return sendOk(res, comment, 'Comment posted successfully');
});

export const submitCategoryReview = asyncHandler<
  IdParamDto,
  ApiResponse<unknown>,
  SubmitCategoryReviewDto
>(async (req, res) => {
  const review = await service.submitCategoryForReview(req.params.id, req.user!.userId, req.body);
  return sendOk(res, review, 'Submitted for review');
});

export const assignCategoryReviewer = asyncHandler<
  IdParamDto,
  ApiResponse<unknown>,
  { reviewerIds: string[] }
>(async (req, res) => {
  const assignments = await service.assignCategoryReviewers(
    req.params.id,
    req.body.reviewerIds,
    req.user!.userId,
  );
  return sendOk(res, assignments, 'Reviewers assigned');
});

export const reviewCategoryDecision = asyncHandler<
  IdParamDto,
  ApiResponse<unknown>,
  CategoryDecisionDto
>(async (req, res) => {
  const category = await service.reviewCategoryDecision(req.params.id, req.user!.userId, req.body);
  return sendOk(res, category, 'Decision recorded');
});

export const createCategoryDraftVersion = asyncHandler<IdParamDto, ApiResponse<unknown>>(
  async (req, res) => {
    const draft = await service.createNewCategoryDraftVersion(req.params.id, req.user!.userId);
    return sendCreated(res, draft, 'New draft version created');
  },
);

export const archiveCategory = asyncHandler<IdParamDto, ApiResponse<unknown>>(async (req, res) => {
  const category = await service.archiveCategory(req.params.id, req.user!.userId);
  return sendOk(res, category, 'Category archived');
});

export const restoreCategory = asyncHandler<IdParamDto, ApiResponse<unknown>>(async (req, res) => {
  const category = await service.restoreCategory(req.params.id, req.user!.userId);
  return sendOk(res, category, 'Category restored');
});

export const getCategoryUsage = asyncHandler<IdParamDto, ApiResponse<unknown>>(async (req, res) => {
  const usage = await service.getCategoryUsageStats(req.params.id);
  return sendOk(res, usage);
});

export const batchCategories = asyncHandler<
  {},
  ApiResponse<BatchCategoriesResultDto>,
  string | BatchCategoryItemDto[]
>(async (req, res) => {
  // eslint-disable-next-line no-useless-assignment
  let items: BatchCategoryItemDto[] = [];
  const contentType = req.headers['content-type'] ?? '';

  if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
    if (typeof req.body !== 'string' || !req.body.trim()) {
      throw new AppError(
        AppErrorMessage.CSV_EMPTY_OR_INVALID,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_BATCH_BODY,
      );
    }

    try {
      const records = parse(req.body, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as unknown as Record<string, unknown>[];

      items = records.map((record) => {
        const rawAction = record['action'] ?? 'upsert';
        const action = typeof rawAction === 'string' ? rawAction.toLowerCase() : 'upsert';

        return {
          action: ['upsert', 'delete'].includes(action)
            ? (action as 'upsert' | 'delete')
            : 'upsert',
          code: record['code'] ? String(record['code']).trim() : '',
          name: record['name'] ? String(record['name']).trim() : undefined,
          slug: record['slug'] ? String(record['slug']).trim() : undefined,
          description: record['description'] ? String(record['description']).trim() : undefined,
          isActive:
            record['is_active'] !== undefined
              ? record['is_active'] === 'true' || record['is_active'] === '1'
              : undefined,
        };
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AppError(
        AppErrorMessage.CSV_PARSE_FAILED({ message }),
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.CSV_PARSE_FAILED,
      );
    }
  } else if (contentType.includes('application/json')) {
    if (!Array.isArray(req.body)) {
      throw new AppError(
        AppErrorMessage.INVALID_BATCH_JSON,
        HttpStatusCode.BAD_REQUEST,
        AppErrorCode.INVALID_BATCH_BODY,
      );
    }
    items = (req.body as Record<string, unknown>[]).map((item) => ({
      action:
        typeof item['action'] === 'string' && ['upsert', 'delete'].includes(item['action'])
          ? (item['action'] as 'upsert' | 'delete')
          : 'upsert',
      code: item['code'] ? String(item['code']).trim() : '',
      name: item['name'] ? String(item['name']).trim() : undefined,
      slug: item['slug'] ? String(item['slug']).trim() : undefined,
      description: item['description'] ? String(item['description']).trim() : undefined,
      isActive: item['isActive'] !== undefined ? Boolean(item['isActive']) : undefined,
    }));
  } else {
    throw new AppError(
      AppErrorMessage.UNSUPPORTED_CONTENT_TYPE,
      HttpStatusCode.UNSUPPORTED_MEDIA_TYPE,
      AppErrorCode.UNSUPPORTED_MEDIA_TYPE,
    );
  }

  const MAX_BATCH_SIZE = 500;
  if (items.length > MAX_BATCH_SIZE) {
    throw new AppError(
      AppErrorMessage.BATCH_SIZE_EXCEEDED(MAX_BATCH_SIZE),
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BATCH_SIZE_EXCEEDED,
    );
  }

  if (items.length === 0) {
    throw new AppError(
      AppErrorMessage.EMPTY_BATCH_PAYLOAD,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.EMPTY_BATCH,
    );
  }

  const validationResult = BatchCategorySchema.safeParse(items);
  if (!validationResult.success) {
    throw new AppError(
      AppErrorMessage.BATCH_VALIDATION_FAILED,
      HttpStatusCode.UNPROCESSABLE_ENTITY,
      AppErrorCode.VALIDATION_ERROR,
    );
  }

  const result = await service.processBatchCategories(validationResult.data, req.user!.userId);
  return sendOk(res, result, 'Batch processed successfully');
});
