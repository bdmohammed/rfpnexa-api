import { z } from 'zod';

import type { DashboardWidgetResponse } from './layout/services/widget.service';
import { DashboardTheme } from '@/types/enums';

export const WidgetPositionSchema = z.object({
  widgetId: z.string().optional(),
  id: z.string().optional(),
  x: z.number({ error: 'x must be a number' }),
  y: z.number({ error: 'y must be a number' }),
  w: z.number({ error: 'w must be a number' }),
  h: z.number({ error: 'h must be a number' }),
  hidden: z.boolean({ error: 'hidden must be a boolean' }).optional().default(false),
  collapsed: z.boolean({ error: 'collapsed must be a boolean' }).optional().default(false),
});

export const PatchLayoutSchema = z.object({
  widgets: z.array(WidgetPositionSchema),
  theme: z.enum(DashboardTheme).optional(),
});

export type PatchLayoutDto = z.infer<typeof PatchLayoutSchema>;

export const updateDashboardLayoutSchema = PatchLayoutSchema;

export const updateDashboardThemeSchema = z.object({
  theme: z.enum(DashboardTheme),
});

export type UpdateDashboardThemeDto = z.infer<typeof updateDashboardThemeSchema>;

export interface BuildDashboardResponse {
  theme: DashboardTheme;
  layoutVersion: number;
  widgets: DashboardWidgetResponse[];
}
