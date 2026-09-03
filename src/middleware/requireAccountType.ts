import type { AccountType } from '@/types/enums';
import type { NextFunction, Request, Response } from 'express';
import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';

/**
 * Restricts access to users with a specific account type.
 *
 * WHY:
 * Provides coarse-grained authorization at the account boundary
 * (e.g. CUSTOMER, ADMIN).
 *
 * WHEN:
 * Use after authentication middleware.
 *
 * Example:
 * router.get(
 *   '/admin/tenders',
 *   authenticate,
 *   requireAccountType(AccountType.ADMIN),
 *   controller.list,
 * );
 */
export const requireAccountType = (allowedType: AccountType) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const { user } = req;

    // Authentication must happen before account-type authorization.
    if (!user) {
      return next(
        new AppError(
          AppErrorMessage.AUTHENTICATION_REQUIRED,
          HttpStatusCode.UNAUTHORIZED,
          AppErrorCode.UNAUTHENTICATED,
        ),
      );
    }

    if (user.accountType !== allowedType) {
      req.log.warn(
        {
          userId: user.userId,
          allowedAccountType: allowedType,
          actualAccountType: user.accountType,
        },
        'Account type authorization denied',
      );

      return next(
        new AppError(
          AppErrorMessage.FORBIDDEN_ACCESS_DENIED,
          HttpStatusCode.FORBIDDEN,
          AppErrorCode.FORBIDDEN,
        ),
      );
    }

    return next();
  };
};
