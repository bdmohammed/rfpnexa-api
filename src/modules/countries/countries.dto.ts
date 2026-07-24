import { z } from 'zod';

import {
  CountryChangeRequestAction,
  CountryChangeRequestTargetType,
  CountryCommentType,
  StateType,
} from '@/types/enums';

export const CountryQuerySchema = z.object({
  tab: z.enum(['stats', 'list', 'reviews']).optional().default('stats'),
  search: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

export const CascadePolicySchema = z.object({
  disableStates: z.boolean().default(true),
  disableTenders: z.boolean().default(true),
  disableCategories: z.boolean().default(false),
  hideFromSearch: z.boolean().default(true),
  notifySuppliers: z.boolean().default(true),
});

export const CreateCountryChangeRequestSchema = z.object({
  targetType: z.nativeEnum(CountryChangeRequestTargetType),
  countryId: z.coerce.string().min(1, 'Country ID is required'),
  stateId: z.coerce.string().optional().nullable(),
  action: z.nativeEnum(CountryChangeRequestAction),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
  cascadePolicy: CascadePolicySchema.optional(),
});

export const AssignReviewerSchema = z.object({
  reviewerId: z.string().uuid('Valid reviewer user ID is required'),
});

export const AddCommentSchema = z.object({
  type: z.nativeEnum(CountryCommentType).default(CountryCommentType.GENERAL),
  content: z.string().min(1, 'Comment content cannot be empty'),
});

export const ReviewChangeRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  comment: z.string().optional(),
});

export const ChangeRequestQuerySchema = z.object({
  filter: z.enum(['assigned', 'pending', 'approved', 'rejected', 'all']).optional().default('all'),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

export const IdParamSchema = z.object({
  id: z.string().uuid('Invalid Change Request UUID'),
});

export const CountryIdParamSchema = z.object({
  countryId: z.string().min(1, 'Country ID is required'),
});

export const DependencyMatrixQuerySchema = z.object({
  targetType: z.nativeEnum(CountryChangeRequestTargetType),
  countryId: z.string().min(1, 'Country ID is required'),
  stateId: z.string().optional(),
});

export const CountryTimelineQuerySchema = z.object({
  stateId: z.string().optional(),
});

export type CreateCountryChangeRequestInput = z.infer<typeof CreateCountryChangeRequestSchema>;
export type AssignReviewerInput = z.infer<typeof AssignReviewerSchema>;
export type AddCommentInput = z.infer<typeof AddCommentSchema>;
export type ReviewChangeRequestInput = z.infer<typeof ReviewChangeRequestSchema>;
export type ChangeRequestQueryInput = z.infer<typeof ChangeRequestQuerySchema>;
export type DependencyMatrixQueryInput = z.infer<typeof DependencyMatrixQuerySchema>;

export const UpdateStateSchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStateDto = z.infer<typeof UpdateStateSchema>;

export const UpdateStateParamsSchema = z.object({
  id: z.string(),
});
export type UpdateStateParamsDto = z.infer<typeof UpdateStateParamsSchema>;

export const UpdateStateBodySchema = z.object({
  isActive: z.boolean(),
});
export type UpdateStateBodyDto = z.infer<typeof UpdateStateBodySchema>;

export const UpdateCountryParamsSchema = z.object({
  id: z.string(),
});
export type UpdateCountryParamsDto = z.infer<typeof UpdateCountryParamsSchema>;

export const UpdateCountryBodySchema = z.object({
  isActive: z.boolean(),
});
export type UpdateCountryBodyDto = z.infer<typeof UpdateCountryBodySchema>;

export const StateQuerySchema = z.object({
  search: z.string().optional(),
  code: z.string().optional(),
  slug: z.string().optional(),
  type: z.enum(StateType).optional(),
  countryId: z.coerce.number().int().optional(),
  countryCode: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
export type StateQueryDto = z.infer<typeof StateQuerySchema>;
