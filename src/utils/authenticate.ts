import type { AuthenticatedUser } from '@/types/express';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';

export interface AuthenticatedRequestContext {
  user: AuthenticatedUser;
  permissions: string[];
  roles: string[];
}

export function assertAuthenticated(
  req: Express.Request,
): asserts req is Express.Request & AuthenticatedRequestContext {
  if (!req.user) {
    throw new AppError(
      AppErrorMessage.UNAUTHORIZED,
      HttpStatusCode.UNAUTHORIZED,
      AppErrorCode.UNAUTHORIZED,
    );
  }

  if (!req.permissions) {
    throw new AppError(
      AppErrorMessage.MISSING_PERMISSIONS_REQUEST,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      AppErrorCode.INTERNAL_SERVER_ERROR,
    );
  }

  if (!req.roles) {
    throw new AppError(
      AppErrorMessage.MISSING_ROLES_REQUEST,
      HttpStatusCode.INTERNAL_SERVER_ERROR,
      AppErrorCode.INTERNAL_SERVER_ERROR,
    );
  }
}
