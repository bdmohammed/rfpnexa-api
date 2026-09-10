import { z } from 'zod';

import type { NotificationPreferences } from '@/types/types';
import {
  NotificationCategory,
  NotificationRecipientStatus,
  NotificationSeverity,
} from '@/types/enums';

export const GetNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  status: z.enum(NotificationRecipientStatus).optional(),
  category: z.enum(NotificationCategory).optional(),
  severity: z.enum(NotificationSeverity).optional(),
});

export type GetNotificationsQueryDto = z.infer<typeof GetNotificationsQuerySchema>;

export const UpdatePreferencesBodySchema = z.object({
  email: z.boolean(),
  push: z.boolean(),
  sms: z.boolean(),
  marketing: z.boolean(),
  security: z.boolean(),
  tender: z.boolean(),
  newsletter: z.boolean(),
}) satisfies z.ZodType<NotificationPreferences>;

export type UpdatePreferencesBodyDto = z.infer<typeof UpdatePreferencesBodySchema>;

export const NotificationIdParamSchema = z.object({
  id: z.uuid(),
});

export type NotificationIdParamDto = z.infer<typeof NotificationIdParamSchema>;

export const ExecuteActionParamsSchema = z.object({
  id: z.uuid(),
  actionId: z.uuid(),
});

export type ExecuteActionParamsDto = z.infer<typeof ExecuteActionParamsSchema>;
