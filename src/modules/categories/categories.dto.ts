import z from 'zod';

import { CategoryStatus } from '@/types/enums';

export const CreateCategorySchema = z.object({
  code: z
    .string()
    .regex(/^\d{3}$/, 'Category code must be exactly 3 digits')
    .optional(),
  name: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type CreateCategoryDto = z.infer<typeof CreateCategorySchema>;

export const UpdateCategorySchema = z.object({
  code: z
    .string()
    .regex(/^\d{3}$/, 'Category code must be exactly 3 digits')
    .optional(),
  name: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  displayOrder: z.number().int().min(0).optional(),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().max(50).nullable().optional(),
  isActive: z.boolean().optional(),
});
export type UpdateCategoryDto = z.infer<typeof UpdateCategorySchema>;

export const SubmitCategoryReviewSchema = z.object({
  comment: z.string().max(1000).optional(),
  reviewerIds: z.array(z.string().uuid()).optional(),
});
export type SubmitCategoryReviewDto = z.infer<typeof SubmitCategoryReviewSchema>;

export const AssignCategoryReviewerSchema = z.object({
  reviewerIds: z.array(z.string().uuid()).min(1, 'At least one reviewer is required'),
});
export type AssignCategoryReviewerDto = z.infer<typeof AssignCategoryReviewerSchema>;

export const CategoryDecisionSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'REQUEST_CHANGES']),
  comment: z.string().max(1000).optional(),
  reason: z.string().max(1000).optional(),
});
export type CategoryDecisionDto = z.infer<typeof CategoryDecisionSchema>;

export const BatchCategoryItemSchema = z
  .object({
    action: z.enum(['upsert', 'delete']).default('upsert'),
    code: z.string().regex(/^\d{3}$/, 'Category code must be exactly 3 digits'),
    name: z.string().min(1).max(200).optional(),
    slug: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.action === 'upsert' && !data.name) {
        return false;
      }
      return true;
    },
    {
      message: 'Name is required for upsert operation',
      path: ['name'],
    },
  );
export type BatchCategoryItemDto = z.infer<typeof BatchCategoryItemSchema>;

export const BatchCategorySchema = z.array(BatchCategoryItemSchema);
export type BatchCategoryDto = z.infer<typeof BatchCategorySchema>;

export const CategoryQuerySchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  status: z
    .nativeEnum(CategoryStatus)
    .or(z.enum(['ALL', 'ACTIVE', 'INACTIVE']))
    .optional(),
  createdBy: z.string().uuid().optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  unusedOnly: z
    .preprocess((val) => {
      if (val === true || val === 'true' || val === '1') {
        return true;
      }

      if (val === false || val === 'false' || val === '0') {
        return false;
      }

      return val;
    }, z.boolean())
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type CategoryQueryDto = z.infer<typeof CategoryQuerySchema>;

export const IdParamSchema = z.object({
  id: z.uuid('Invalid ID format'),
});
export type IdParamDto = z.infer<typeof IdParamSchema>;

export interface CategoryStatsDto {
  total: number;
  active: number;
  inactive: number;
  archived: number;
  tendersCount: number;
}

export interface BatchCategoriesResultDto {
  created: number;
  updated: number;
  deleted: number;
}
