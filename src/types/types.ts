import type { PermissionActions } from '@/authorization/registry/types';
import type { PermissionModule } from '@/entities/PermissionModule';
import type { User } from '@/entities/User';

export const PermissionModules = {
  DASHBOARD: 'dashboard',
  USER: 'user',
  ROLE: 'role',
  PERMISSION: 'permission',
  TENDER: 'tender',
  CATEGORY: 'category',
  BILLING: 'billing',
  PLAN: 'plan',
  SUPPORT: 'support',
  PAYMENT: 'payment',
  COUPON: 'coupon',
  INVOICE: 'invoice',
  ANALYTICS: 'analytics',
  CMS: 'cms',
  NOTIFICATION: 'notification',
  NOTIFICATION_TEMPLATE: 'notification_template',
  AUDIT: 'audit',
  SYSTEM: 'system',
  STATE: 'state',
} as const;

export type PermissionModuleKey = (typeof PermissionModules)[keyof typeof PermissionModules];

export type PermissionKey = `${PermissionModuleKey}.${PermissionActions}`;

export const PermissionKeys: Record<string, PermissionKey> = {
  DASHBOARD_VIEW: 'dashboard.view',
  DASHBOARD_EXPORT: 'dashboard.export',

  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',

  ROLE_VIEW: 'role.view',
} as const;

export type PermissionModuleSeed = Required<
  Pick<
    PermissionModule,
    'name' | 'key' | 'displayOrder' | 'description' | 'isSystemModule' | 'isActive'
  >
>;

/**
 * [WHAT]
 * Standardized API success response payload structure.
 *
 * [WHY]
 * Guarantees a consistent JSON contract across all API endpoints for clients and SDK consumers.
 */
export interface ApiResponse<T = unknown, U = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: U;
  traceId?: string | undefined;
}

/**
 * [WHAT]
 * Standardized metadata structure for paginated list responses.
 *
 * [WHY]
 * Provides pagination navigation metrics (total items, page count, prev/next flags) for UI components.
 */
export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export type SanitizedUser = Omit<
  User,
  'passwordHash' | 'tokenVersion' | 'failedLoginAttempts' | 'lockoutUntil'
>;
