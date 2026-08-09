import { In, IsNull } from 'typeorm';

import type {
  BatchCategoriesResultDto,
  BatchCategoryItemDto,
  CategoryDecisionDto,
  CategoryQueryDto,
  CategoryStatsDto,
  CreateCategoryDto,
  SubmitCategoryReviewDto,
  UpdateCategoryDto,
} from './categories.dto';
import { AppDataSource } from '@/config/database';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
import { AuditLog } from '@/database/entities/AuditLog';
import { Category } from '@/database/entities/Category';
import { CategoryActivity } from '@/database/entities/CategoryActivity';
import { CategoryReview } from '@/database/entities/CategoryReview';
import { CategoryReviewAssignment } from '@/database/entities/CategoryReviewAssignment';
import { CategoryReviewComment } from '@/database/entities/CategoryReviewComment';
import { CategoryVersion } from '@/database/entities/CategoryVersion';
import { Tender } from '@/database/entities/Tender';
import { TenderVersion } from '@/database/entities/TenderVersion';
import {
  CategoryStatus,
  CategoryVersionStatus,
  ReviewAction,
  ReviewAssignmentStatus,
  ReviewStatus,
  TenderLifecycleStatus,
} from '@/types/enums';
import { generateSlug } from '@/utils/slug';

const categoryRepo = AppDataSource.getRepository(Category);
const categoryVersionRepo = AppDataSource.getRepository(CategoryVersion);
const categoryReviewRepo = AppDataSource.getRepository(CategoryReview);
const categoryReviewAssignmentRepo = AppDataSource.getRepository(CategoryReviewAssignment);
const categoryReviewCommentRepo = AppDataSource.getRepository(CategoryReviewComment);
const categoryActivityRepo = AppDataSource.getRepository(CategoryActivity);
const tenderRepo = AppDataSource.getRepository(Tender);
const auditRepo = AppDataSource.getRepository(AuditLog);

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function listAllCategories(
  query: Partial<CategoryQueryDto> = {},
): Promise<{ categories: Category[]; total: number }> {
  const page = Math.max(1, query.page ?? 1);
  const limit = Math.min(100, Math.max(1, query.limit ?? 20));
  const skip = (page - 1) * limit;

  const qb = categoryRepo
    .createQueryBuilder('category')
    .leftJoinAndSelect('category.createdByUser', 'creator')
    .orderBy('category.code', 'ASC');

  if (query.status === 'ARCHIVED') {
    qb.withDeleted().andWhere('category.deleted_at IS NOT NULL');
  } else {
    qb.andWhere('category.deleted_at IS NULL');
    if (query.status === 'ACTIVE') {
      qb.andWhere('category.isActive = :isActive', { isActive: true });
    } else if (query.status === 'INACTIVE') {
      qb.andWhere('category.isActive = :isActive', { isActive: false });
    } else if (query.status && query.status !== 'ALL') {
      qb.andWhere('category.status = :status', { status: query.status });
    }
  }

  if (query.code !== undefined && query.code !== '') {
    qb.andWhere('category.code = :code', { code: query.code });
  }

  if (query.slug !== undefined && query.slug !== '') {
    qb.andWhere('category.slug = :slug', { slug: query.slug });
  }

  if (query.createdBy !== undefined) {
    qb.andWhere('category.createdBy = :createdBy', { createdBy: query.createdBy });
  }

  if (query.dateFrom !== undefined) {
    qb.andWhere('category.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
  }

  if (query.dateTo !== undefined) {
    qb.andWhere('category.createdAt <= :dateTo', {
      dateTo: new Date(`${query.dateTo}T23:59:59.999Z`),
    });
  }

  if (query.search !== undefined && query.search !== '') {
    const searchPattern = `%${query.search}%`;
    qb.andWhere('(category.name ILIKE :search OR category.code ILIKE :search)', {
      search: searchPattern,
    });
  }

  if (query.unusedOnly) {
    qb.having('COALESCE(COUNT(tender.id), 0) = 0');
  }

  // Count subquery to match filters
  const countQb = categoryRepo.createQueryBuilder('category');
  if (query.status === 'ARCHIVED') {
    countQb.withDeleted().andWhere('category.deleted_at IS NOT NULL');
  } else {
    countQb.andWhere('category.deleted_at IS NULL');
    if (query.status === 'ACTIVE') {
      countQb.andWhere('category.isActive = :isActive', { isActive: true });
    } else if (query.status === 'INACTIVE') {
      countQb.andWhere('category.isActive = :isActive', { isActive: false });
    } else if (query.status && query.status !== 'ALL') {
      countQb.andWhere('category.status = :status', { status: query.status });
    }
  }
  if (query.code) countQb.andWhere('category.code = :code', { code: query.code });
  if (query.slug) countQb.andWhere('category.slug = :slug', { slug: query.slug });
  if (query.createdBy)
    countQb.andWhere('category.createdBy = :createdBy', { createdBy: query.createdBy });
  if (query.dateFrom)
    countQb.andWhere('category.createdAt >= :dateFrom', { dateFrom: new Date(query.dateFrom) });
  if (query.dateTo)
    countQb.andWhere('category.createdAt <= :dateTo', {
      dateTo: new Date(`${query.dateTo}T23:59:59.999Z`),
    });
  if (query.search) {
    const searchPattern = `%${query.search}%`;
    countQb.andWhere('(category.name ILIKE :search OR category.code ILIKE :search)', {
      search: searchPattern,
    });
  }
  if (query.unusedOnly) {
    countQb.andWhere((qb) => {
      const subQuery = qb
        .subQuery()
        .select('tv.category_id')
        .from('tender_versions', 'tv')
        .getQuery();
      return `category.id NOT IN ${subQuery}`;
    });
  }

  const total = await countQb.getCount();

  qb.offset(skip).limit(limit);
  const categories = await qb.getMany();

  const categoryIds = categories.map((c) => c.id);
  if (categoryIds.length > 0) {
    const versions = await categoryVersionRepo.find({
      where: { categoryId: In(categoryIds) },
      order: { createdAt: 'DESC' },
    });

    const versionMap = new Map<string, CategoryVersion>();
    for (const v of versions) {
      if (!versionMap.has(v.categoryId)) {
        versionMap.set(v.categoryId, v);
      }
    }

    const allCats = await categoryRepo.find({ withDeleted: true });
    const allCatMap = new Map<string, Category>(allCats.map((c) => [c.id, c]));

    for (const c of categories as any[]) {
      const v = versionMap.get(c.id);
      const parentId = v?.parentCategoryId ?? null;
      const parentCat = parentId ? allCatMap.get(parentId) : null;
      c.parentId = parentId;
      c.parentCategoryId = parentId;
      c.parentCategory = parentCat
        ? { id: parentCat.id, code: parentCat.code, name: parentCat.name }
        : null;
    }
  }

  return { categories, total };
}

export async function getCategoryStats(): Promise<CategoryStatsDto> {
  const total = await categoryRepo.count({ withDeleted: true });
  const active = await categoryRepo.count({ where: { isActive: true, isDeleted: false } });
  const inactive = await categoryRepo.count({ where: { isActive: false, isDeleted: false } });
  const archived = await categoryRepo.count({ where: { isDeleted: true }, withDeleted: true });

  const tendersCountResult = await tenderRepo
    .createQueryBuilder('tender')
    .innerJoin('tender.activeVersion', 'activeVersion')
    .select('COUNT(DISTINCT activeVersion.categoryId)', 'cnt')
    .getRawOne();
  const tendersCount = parseInt(tendersCountResult?.cnt ?? '0', 10);

  return { total, active, inactive, archived, tendersCount };
}

export async function getCategoryHistory(id: string): Promise<AuditLog[]> {
  return await auditRepo.find({
    where: { entityType: 'category', entityId: id },
    order: { createdAt: 'DESC' },
  });
}

export async function getCategoryById(id: string): Promise<Category> {
  const category = await categoryRepo.findOne({
    where: { id },
    relations: {
      createdByUser: true,
      updatedByUser: true,
      activeVersion: true,
    },
  });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }
  return category;
}

export async function getCategoryGovernanceDetails(id: string): Promise<{
  category: Category;
  versions: CategoryVersion[];
  reviews: CategoryReview[];
  activities: CategoryActivity[];
  usage: { tendersCount: number; activeTendersCount: number; subcategoriesCount: number };
}> {
  const category = await categoryRepo.findOne({
    where: { id },
    relations: {
      createdByUser: true,
      updatedByUser: true,
      activeVersion: true,
    },
  });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const versions = await categoryVersionRepo.find({
    where: { categoryId: id },
    relations: {
      createdByUser: true,
      approvedByUser: true,
      parentCategory: true,
    },
    order: { createdAt: 'DESC' },
  });

  const reviews = await categoryReviewRepo.find({
    where: { categoryId: id },
    relations: {
      assignments: {
        reviewer: true,
      },

      comments: {
        user: true,
      },
    },
    order: { createdAt: 'DESC' },
  });

  const activities = await categoryActivityRepo.find({
    where: { categoryId: id },
    relations: {
      actor: true,
    },
    order: { createdAt: 'DESC' },
  });

  const usage = await getCategoryUsageStats(id);

  return { category, versions, reviews, activities, usage };
}

export async function getCategoryUsageStats(categoryId: string): Promise<{
  tendersCount: number;
  activeTendersCount: number;
  subcategoriesCount: number;
}> {
  const tendersCountResult = await tenderRepo
    .createQueryBuilder('tender')
    .innerJoin('tender.activeVersion', 'activeVersion')
    .where('activeVersion.categoryId = :categoryId', { categoryId })
    .select('COUNT(tender.id)', 'cnt')
    .getRawOne();
  const tendersCount = parseInt(tendersCountResult?.cnt ?? '0', 10);

  const activeTendersResult = await tenderRepo
    .createQueryBuilder('tender')
    .innerJoin('tender.activeVersion', 'activeVersion')
    .where('activeVersion.categoryId = :categoryId', { categoryId })
    .andWhere('tender.status = :status', { status: TenderLifecycleStatus.ACTIVE })
    .select('COUNT(tender.id)', 'cnt')
    .getRawOne();
  const activeTendersCount = parseInt(activeTendersResult?.cnt ?? '0', 10);

  const subcategoriesCount = await categoryVersionRepo.count({
    where: { parentCategoryId: categoryId, status: CategoryVersionStatus.PUBLISHED },
  });

  return { tendersCount, activeTendersCount, subcategoriesCount };
}

export async function submitCategoryForReview(
  categoryId: string,
  userId: string,
  dto: Partial<SubmitCategoryReviewDto> = {},
): Promise<CategoryReview> {
  const category = await categoryRepo.findOne({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let latestVersion = await categoryVersionRepo.findOne({
    where: {
      categoryId,
      status: In([CategoryVersionStatus.DRAFT, CategoryVersionStatus.CHANGES_REQUESTED]),
    },
    order: { createdAt: 'DESC' },
  });

  latestVersion ??= await categoryVersionRepo.save(
    categoryVersionRepo.create({
      categoryId,
      name: category.name,
      slug: category.slug,
      description: category.description,
      versionNumber: '0.1',
      majorVersion: 0,
      minorVersion: 1,
      status: CategoryVersionStatus.DRAFT,
      createdByUserId: userId,
    }),
  );

  latestVersion.status = CategoryVersionStatus.IN_REVIEW;
  await categoryVersionRepo.save(latestVersion);

  category.status = CategoryStatus.IN_REVIEW;
  await categoryRepo.save(category);

  const review = categoryReviewRepo.create({
    categoryId,
    categoryVersionId: latestVersion.id,
    submittedByUserId: userId,
    submittedAt: new Date(),
    status: ReviewStatus.PENDING,
  });
  const savedReview = await categoryReviewRepo.save(review);

  if (dto.reviewerIds && dto.reviewerIds.length > 0) {
    const assignments = dto.reviewerIds.map((reviewerId) =>
      categoryReviewAssignmentRepo.create({
        reviewId: savedReview.id,
        reviewerId,
        assignedByUserId: userId,
        assignedAt: new Date(),
        status: ReviewAssignmentStatus.PENDING,
      }),
    );
    await categoryReviewAssignmentRepo.save(assignments);
  }

  if (dto.comment) {
    await categoryReviewCommentRepo.save(
      categoryReviewCommentRepo.create({
        categoryReviewId: savedReview.id,
        userId,
        comment: dto.comment,
        action: ReviewAction.SUBMIT,
      }),
    );
  }

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      categoryVersionId: latestVersion.id,
      actorId: userId,
      event: 'SUBMITTED',
      details: { version: latestVersion.versionNumber },
    }),
  );

  return savedReview;
}

export async function assignCategoryReviewers(
  categoryId: string,
  reviewerIds: string[],
  assignedByUserId: string,
): Promise<CategoryReviewAssignment[]> {
  const review = await categoryReviewRepo.findOne({
    where: { categoryId, status: ReviewStatus.PENDING },
    order: { createdAt: 'DESC' },
  });

  if (!review) {
    throw new AppError(
      'No pending review found for category',
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BAD_REQUEST,
    );
  }

  const existingAssignments = await categoryReviewAssignmentRepo.find({
    where: { reviewId: review.id },
  });
  const existingReviewerIds = new Set(existingAssignments.map((a) => a.reviewerId));

  const newAssignments = reviewerIds
    .filter((id) => !existingReviewerIds.has(id))
    .map((reviewerId) =>
      categoryReviewAssignmentRepo.create({
        reviewId: review.id,
        reviewerId,
        assignedByUserId,
        assignedAt: new Date(),
        status: ReviewAssignmentStatus.PENDING,
      }),
    );

  const savedAssignments = await categoryReviewAssignmentRepo.save(newAssignments);

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      categoryVersionId: review.categoryVersionId,
      actorId: assignedByUserId,
      event: 'REVIEWER_ASSIGNED',
      details: { reviewerIds },
    }),
  );

  return savedAssignments;
}

export async function reviewCategoryDecision(
  categoryId: string,
  reviewerUserId: string,
  dto: CategoryDecisionDto,
): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const review = await categoryReviewRepo.findOne({
    where: { categoryId },
    order: { createdAt: 'DESC' },
    relations: {
      categoryVersion: true,
    },
  });

  if (!review) {
    throw new AppError(
      'No active review found for category',
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BAD_REQUEST,
    );
  }

  const version = review.categoryVersion;

  if (dto.action === 'APPROVE') {
    version.status = CategoryVersionStatus.PUBLISHED;
    version.approvedByUserId = reviewerUserId;
    version.approvedAt = new Date();

    const nextMajor = version.majorVersion === 0 ? 1 : version.majorVersion + 1;
    version.majorVersion = nextMajor;
    version.minorVersion = 0;
    version.versionNumber = `${nextMajor}.0`;

    await categoryVersionRepo.save(version);

    category.status = CategoryStatus.PUBLISHED;
    category.activeVersionId = version.id;
    category.isActive = true;
    category.name = version.name;
    category.slug = version.slug;
    category.description = version.description;
    await categoryRepo.save(category);

    review.status = ReviewStatus.APPROVED;
    review.completedAt = new Date();
    review.decisionComment = dto.comment ?? 'Approved';
    await categoryReviewRepo.save(review);

    await categoryReviewCommentRepo.save(
      categoryReviewCommentRepo.create({
        categoryReviewId: review.id,
        userId: reviewerUserId,
        comment: dto.comment ?? 'Approved',
        action: ReviewAction.APPROVED,
      }),
    );

    await categoryActivityRepo.save(
      categoryActivityRepo.create({
        categoryId,
        categoryVersionId: version.id,
        actorId: reviewerUserId,
        event: 'APPROVED',
        details: { version: version.versionNumber },
      }),
    );
  } else if (dto.action === 'REQUEST_CHANGES') {
    version.status = CategoryVersionStatus.CHANGES_REQUESTED;
    version.minorVersion += 1;
    version.versionNumber = `${version.majorVersion}.${version.minorVersion}`;
    await categoryVersionRepo.save(version);

    category.status = CategoryStatus.DRAFT;
    await categoryRepo.save(category);

    review.status = ReviewStatus.CHANGES_REQUESTED;
    await categoryReviewRepo.save(review);

    await categoryReviewCommentRepo.save(
      categoryReviewCommentRepo.create({
        categoryReviewId: review.id,
        userId: reviewerUserId,
        comment: dto.comment ?? dto.reason ?? 'Changes requested',
        action: ReviewAction.CHANGES_REQUESTED,
      }),
    );

    await categoryActivityRepo.save(
      categoryActivityRepo.create({
        categoryId,
        categoryVersionId: version.id,
        actorId: reviewerUserId,
        event: 'REQUEST_CHANGES',
        details: { comment: dto.comment ?? dto.reason },
      }),
    );
  } else {
    version.status = CategoryVersionStatus.REJECTED;
    await categoryVersionRepo.save(version);

    category.status = CategoryStatus.DRAFT;
    await categoryRepo.save(category);

    review.status = ReviewStatus.REJECTED;
    review.completedAt = new Date();
    review.decisionComment = dto.reason ?? dto.comment ?? 'Rejected';
    await categoryReviewRepo.save(review);

    await categoryReviewCommentRepo.save(
      categoryReviewCommentRepo.create({
        categoryReviewId: review.id,
        userId: reviewerUserId,
        comment: dto.reason ?? dto.comment ?? 'Rejected',
        action: ReviewAction.REJECTED,
      }),
    );

    await categoryActivityRepo.save(
      categoryActivityRepo.create({
        categoryId,
        categoryVersionId: version.id,
        actorId: reviewerUserId,
        event: 'REJECTED',
        details: { reason: dto.reason ?? dto.comment },
      }),
    );
  }

  return category;
}

export async function createNewCategoryDraftVersion(
  categoryId: string,
  userId: string,
): Promise<CategoryVersion> {
  const category = await categoryRepo.findOne({
    where: { id: categoryId },
    relations: {
      activeVersion: true,
    },
  });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const currentVersion = category.activeVersion;
  const major = currentVersion ? currentVersion.majorVersion : 0;
  const minor = currentVersion ? currentVersion.minorVersion + 1 : 1;
  const versionNumber = `${major}.${minor}`;

  const newDraft = categoryVersionRepo.create({
    categoryId,
    majorVersion: major,
    minorVersion: minor,
    versionNumber,
    status: CategoryVersionStatus.DRAFT,
    name: category.name,
    slug: category.slug,
    description: category.description,
    createdByUserId: userId,
  });

  const savedDraft = await categoryVersionRepo.save(newDraft);

  category.status = CategoryStatus.DRAFT;
  await categoryRepo.save(category);

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      categoryVersionId: savedDraft.id,
      actorId: userId,
      event: 'DRAFT_CREATED',
      details: { version: versionNumber },
    }),
  );

  return savedDraft;
}

export async function addCategoryComment(
  categoryId: string,
  userId: string,
  commentText: string,
): Promise<CategoryReviewComment> {
  const category = await categoryRepo.findOne({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let review = await categoryReviewRepo.findOne({
    where: { categoryId },
    order: { createdAt: 'DESC' },
  });

  if (!review) {
    let version = await categoryVersionRepo.findOne({
      where: { categoryId },
      order: { createdAt: 'DESC' },
    });

    version ??= await createNewCategoryDraftVersion(categoryId, userId);

    review = await categoryReviewRepo.save(
      categoryReviewRepo.create({
        categoryId,
        categoryVersionId: version.id,
        status: ReviewStatus.PENDING,
      }),
    );
  }

  const newComment = await categoryReviewCommentRepo.save(
    categoryReviewCommentRepo.create({
      categoryReviewId: review.id,
      userId,
      comment: commentText,
      action: ReviewAction.SUBMIT,
    }),
  );

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      actorId: userId,
      event: 'COMMENT_ADDED',
      details: { comment: commentText },
    }),
  );

  return newComment;
}

export async function archiveCategory(categoryId: string, userId: string): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const activeChildren = await categoryVersionRepo.count({
    where: { parentCategoryId: categoryId, status: CategoryVersionStatus.PUBLISHED },
  });

  if (activeChildren > 0) {
    throw new AppError(
      'Cannot archive category with active subcategories',
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.BAD_REQUEST,
    );
  }

  category.status = CategoryStatus.ARCHIVED;
  category.isActive = false;
  await categoryRepo.save(category);

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      actorId: userId,
      event: 'ARCHIVED',
    }),
  );

  return category;
}

export async function restoreCategory(categoryId: string, userId: string): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id: categoryId } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  category.status = CategoryStatus.PUBLISHED;
  category.isActive = true;
  await categoryRepo.save(category);

  await categoryActivityRepo.save(
    categoryActivityRepo.create({
      categoryId,
      actorId: userId,
      event: 'RESTORED',
    }),
  );

  return category;
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = generateSlug(name);
  let slug = baseSlug;
  let counter = 1;
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const exists = await categoryRepo.findOne({ where: { slug } });
    if (!exists) {
      return slug;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function createCategory(dto: CreateCategoryDto, adminId?: string): Promise<Category> {
  const parentCategoryId = dto.parentCategoryId ?? null;
  let { code } = dto;

  if (!code || code.trim() === '') {
    if (parentCategoryId) {
      const childVersions = await categoryVersionRepo.find({
        where: { parentCategoryId },
        relations: {
          category: true,
        },
      });
      const childCodes = childVersions
        .map((v) => parseInt(v.category.code || '0', 10))
        .filter((n) => !isNaN(n) && n > 0);
      const maxVal = childCodes.length > 0 ? Math.max(...childCodes) : 0;
      code = String(maxVal + 1).padStart(3, '0');
    } else {
      const rootVersions = await categoryVersionRepo.find({
        where: { parentCategoryId: IsNull() },
        relations: {
          category: true,
        },
      });
      const rootCatIds = new Set(rootVersions.map((v) => v.categoryId));
      const allCategories = await categoryRepo.find({ withDeleted: true });
      const rootCategories = allCategories.filter(
        (c) => rootCatIds.has(c.id) || rootCatIds.size === 0,
      );
      const rootCodes = rootCategories
        .map((c) => parseInt(c.code, 10))
        .filter((n) => !isNaN(n) && n > 0);
      const maxVal = rootCodes.length > 0 ? Math.max(...rootCodes) : 0;
      code = String(maxVal + 1).padStart(3, '0');
    }
  }

  let { slug } = dto;
  slug ??= await generateUniqueSlug(dto.name);

  if (parentCategoryId) {
    const childVersions = await categoryVersionRepo.find({
      where: { parentCategoryId },
      relations: {
        category: true,
      },
    });
    const duplicateChild = childVersions.find((v) => v.category.code === code);
    if (duplicateChild) {
      throw new AppError(
        AppErrorMessage.CATEGORY_CODE_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_CODE_TAKEN,
      );
    }
  } else {
    const rootVersions = await categoryVersionRepo.find({
      where: { parentCategoryId: IsNull() },
      relations: {
        category: true,
      },
    });
    const duplicateRoot = rootVersions.find((v) => v.category.code === code);
    if (duplicateRoot) {
      throw new AppError(
        AppErrorMessage.CATEGORY_CODE_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_CODE_TAKEN,
      );
    }
  }
  const existingSlug = await categoryRepo.findOne({ where: { slug }, withDeleted: true });
  if (existingSlug) {
    throw new AppError(
      AppErrorMessage.CATEGORY_SLUG_EXISTS,
      HttpStatusCode.CONFLICT,
      AppErrorCode.CATEGORY_SLUG_TAKEN,
    );
  }

  const category = categoryRepo.create({
    code,
    name: dto.name,
    slug,
    description: dto.description ?? null,
    status: CategoryStatus.DRAFT,
    isActive: dto.isActive ?? false,
    createdBy: adminId as string,
    updatedBy: adminId ?? null,
    isDeleted: false,
  });

  let retries = 3;

  while (retries > 0) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const savedCategory = await categoryRepo.save(category);

      const version = categoryVersionRepo.create({
        categoryId: savedCategory.id,
        majorVersion: 0,
        minorVersion: 1,
        version: 1,
        versionNumber: '0.1',
        name: dto.name,
        slug: savedCategory.slug,
        description: dto.description ?? null,
        parentCategoryId,
        displayOrder: dto.displayOrder ?? 0,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        status: CategoryVersionStatus.DRAFT,
        createdByUserId: adminId ?? null,
      });
      // eslint-disable-next-line no-await-in-loop
      await categoryVersionRepo.save(version);

      return savedCategory;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === '23505') {
        const detail = err.detail ?? '';
        if (detail.includes('code')) {
          throw new AppError(
            AppErrorMessage.CATEGORY_CODE_EXISTS,
            HttpStatusCode.CONFLICT,
            AppErrorCode.CATEGORY_CODE_TAKEN,
          );
        }
        if (detail.includes('slug')) {
          if (dto.slug) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          category.slug = await generateUniqueSlug(dto.name);
          retries--;
          continue;
        }
      }
      throw err;
    }
  }
  throw new AppError(
    AppErrorMessage.SLUG_GENERATION_FAILED,
    HttpStatusCode.CONFLICT,
    AppErrorCode.CATEGORY_SLUG_CONFLICT,
  );
}

// eslint-disable-next-line sonarjs/cognitive-complexity
export async function updateCategory(
  id: string,
  dto: UpdateCategoryDto,
  adminId?: string,
): Promise<Category> {
  const category = await categoryRepo.findOne({ where: { id } });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  let { slug } = dto;
  if (dto.name && !slug && dto.name !== category.name) {
    slug = await generateUniqueSlug(dto.name);
  }

  const updates: Partial<Category> = {};
  if (dto.code !== undefined) updates.code = dto.code;
  if (dto.name !== undefined) updates.name = dto.name;
  if (slug !== undefined) updates.slug = slug;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.isActive !== undefined) updates.isActive = dto.isActive;
  if (adminId !== undefined) updates.updatedBy = adminId;

  if (updates.code && updates.code !== category.code) {
    const existingCode = await categoryRepo.findOne({
      where: { code: updates.code },
      withDeleted: true,
    });
    if (existingCode) {
      throw new AppError(
        AppErrorMessage.CATEGORY_CODE_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_CODE_TAKEN,
      );
    }
  }
  if (updates.slug && updates.slug !== category.slug) {
    const existingSlug = await categoryRepo.findOne({
      where: { slug: updates.slug },
      withDeleted: true,
    });
    if (existingSlug) {
      throw new AppError(
        AppErrorMessage.CATEGORY_SLUG_EXISTS,
        HttpStatusCode.CONFLICT,
        AppErrorCode.CATEGORY_SLUG_TAKEN,
      );
    }
  }

  Object.assign(category, updates);

  const latestVersion = await categoryVersionRepo.findOne({
    where: {
      categoryId: id,
      status: In([CategoryVersionStatus.DRAFT, CategoryVersionStatus.CHANGES_REQUESTED]),
    },
    order: { createdAt: 'DESC' },
  });

  if (latestVersion) {
    if (dto.name !== undefined) {
      latestVersion.name = dto.name;
      latestVersion.slug = slug ?? latestVersion.slug;
    }
    if (dto.description !== undefined) {
      latestVersion.description = dto.description;
    }
    const parentIdVal =
      dto.parentCategoryId !== undefined ? dto.parentCategoryId : (dto as any).parentId;
    if (parentIdVal !== undefined) {
      latestVersion.parentCategoryId = parentIdVal;
    }
    if (dto.displayOrder !== undefined) {
      latestVersion.displayOrder = dto.displayOrder;
    }
    if (dto.icon !== undefined) {
      latestVersion.icon = dto.icon;
    }
    if (dto.color !== undefined) {
      latestVersion.color = dto.color;
    }
    await categoryVersionRepo.save(latestVersion);
  }

  let retries = 3;
  while (retries > 0) {
    try {
      // eslint-disable-next-line no-await-in-loop
      return await categoryRepo.save(category);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      if (err.code === '23505') {
        const detail = err.detail ?? '';
        if (detail.includes('code')) {
          throw new AppError(
            AppErrorMessage.CATEGORY_CODE_EXISTS,
            HttpStatusCode.CONFLICT,
            AppErrorCode.CATEGORY_CODE_TAKEN,
          );
        }
        if (detail.includes('slug')) {
          if (dto.slug) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          category.slug = await generateUniqueSlug(category.name);
          retries--;
          continue;
        }
      }
      throw err;
    }
  }
  throw new AppError(
    AppErrorMessage.SLUG_GENERATION_FAILED,
    HttpStatusCode.CONFLICT,
    AppErrorCode.CATEGORY_SLUG_CONFLICT,
  );
}

export async function deleteCategory(id: string, adminId?: string): Promise<void> {
  const category = await categoryRepo.findOne({
    where: { id },
    relations: {
      tenders: {
        tender: true,
      },
    },
  });
  if (!category) {
    throw new AppError(
      AppErrorMessage.CATEGORY_NOT_FOUND,
      HttpStatusCode.NOT_FOUND,
      AppErrorCode.NOT_FOUND,
    );
  }

  const hasActiveTenders = category.tenders.some(
    (tv) => tv.tender.status === TenderLifecycleStatus.ACTIVE,
  );
  if (hasActiveTenders) {
    throw new AppError(
      AppErrorMessage.CATEGORY_DELETE_ASSOCIATED_TENDERS,
      HttpStatusCode.BAD_REQUEST,
      AppErrorCode.CATEGORY_HAS_TENDERS,
    );
  }

  category.isDeleted = true;
  if (adminId) {
    category.updatedBy = adminId;
  }
  await categoryRepo.softRemove(category);
}

export async function processBatchCategories(
  items: BatchCategoryItemDto[],
  adminId?: string,
): Promise<BatchCategoriesResultDto> {
  // eslint-disable-next-line sonarjs/cognitive-complexity, complexity
  return await AppDataSource.transaction(async (transactionalEntityManager) => {
    const categoryTxRepo = transactionalEntityManager.getRepository(Category);
    // const tenderTxRepo = transactionalEntityManager.getRepository(Tender);

    // 1. Fetch all existing categories (including soft-deleted ones)
    const allCategories = await categoryTxRepo.find({ withDeleted: true });

    // 2. Build lookups
    const codeMap = new Map<string, Category>(allCategories.map((c) => [c.code, c]));
    const slugSet = new Set<string>(allCategories.map((c) => c.slug));

    const categoriesToSave: Category[] = [];
    const categoriesToDelete: Category[] = [];

    let created = 0;
    let updated = 0;
    // let deleted = 0;

    // 3. Process items in-memory
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item) {
        continue;
      }

      if (item.action === 'delete') {
        const category = codeMap.get(item.code);
        if (category) {
          category.isDeleted = true;
          if (adminId) {
            category.updatedBy = adminId;
          }
          categoriesToDelete.push(category);
          // deleted++;
        }
        continue;
      }

      // Upsert action
      const name = item.name!;
      const category = codeMap.get(item.code);

      if (category) {
        // Update existing (including soft-deleted)
        category.name = name;
        category.isDeleted = false;
        if (item.description !== undefined) category.description = item.description;
        if (item.isActive !== undefined) category.isActive = item.isActive;
        if (adminId) {
          category.updatedBy = adminId;
        }

        if (item.slug) {
          if (item.slug !== category.slug && slugSet.has(item.slug)) {
            throw new AppError(
              AppErrorMessage.SLUG_CONFLICT_BATCH(i + 1, item.code, item.slug),
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          slugSet.delete(category.slug);
          category.slug = item.slug;
          slugSet.add(item.slug);
        } else {
          // Regenerate slug from name if no explicit slug provided
          slugSet.delete(category.slug);
          const baseSlug = generateSlug(name);
          let slug = baseSlug;
          let counter = 1;
          while (slugSet.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          category.slug = slug;
          slugSet.add(slug);
        }

        // Restore if it was soft-deleted
        if (category.deletedAt) {
          category.deletedAt = null;
        }

        categoriesToSave.push(category);
        updated++;
      } else {
        // Insert new category
        const newCategory = new Category();
        newCategory.code = item.code;
        newCategory.name = name;
        newCategory.description = item.description ?? null;
        newCategory.isActive = item.isActive ?? true;
        newCategory.isDeleted = false;
        if (adminId) {
          newCategory.createdBy = adminId;
          newCategory.updatedBy = adminId;
        }

        if (item.slug) {
          if (slugSet.has(item.slug)) {
            throw new AppError(
              AppErrorMessage.SLUG_CONFLICT_BATCH(i + 1, item.code, item.slug),
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
          newCategory.slug = item.slug;
          slugSet.add(item.slug);
        } else {
          const baseSlug = generateSlug(name);
          let slug = baseSlug;
          let counter = 1;
          while (slugSet.has(slug)) {
            slug = `${baseSlug}-${counter}`;
            counter++;
          }
          newCategory.slug = slug;
          slugSet.add(slug);
        }

        categoriesToSave.push(newCategory);
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        codeMap.set(item?.code, newCategory); // prevent internal duplicate code issue
        created++;
      }
    }

    // 4. Batch delete validations & actions
    if (categoriesToDelete.length > 0) {
      const deleteIds = categoriesToDelete.map((c) => c.id);

      // Check for associated tenders
      const tenderVersions = await transactionalEntityManager.getRepository(TenderVersion).find({
        where: { categoryId: In(deleteIds) },
        relations: {
          category: true,
        },
      });

      if (tenderVersions.length > 0) {
        const failedCodes = Array.from(
          new Set(tenderVersions.map((t) => t.category.code).filter(Boolean)),
        );
        throw new AppError(
          AppErrorMessage.CATEGORY_DELETE_TENDERS_ASSOCIATED(failedCodes.join(', ')),
          HttpStatusCode.BAD_REQUEST,
          AppErrorCode.CATEGORY_HAS_TENDERS,
        );
      }

      // Bulk soft delete using softRemove
      await categoryTxRepo.softRemove(categoriesToDelete);
    }

    // 5. Bulk save inserts & updates
    if (categoriesToSave.length > 0) {
      try {
        await categoryTxRepo.save(categoriesToSave);
      } catch (err: unknown) {
        const error = err as { code: string; detail?: string };
        if (error.code === '23505') {
          const detail = error.detail ?? '';
          if (detail.includes('code')) {
            throw new AppError(
              AppErrorMessage.CATEGORY_CODE_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_CODE_TAKEN,
            );
          }
          if (detail.includes('slug')) {
            throw new AppError(
              AppErrorMessage.CATEGORY_SLUG_EXISTS,
              HttpStatusCode.CONFLICT,
              AppErrorCode.CATEGORY_SLUG_TAKEN,
            );
          }
        }
        throw err;
      }
    }

    return { created, updated, deleted: categoriesToDelete.length };
  });
}
