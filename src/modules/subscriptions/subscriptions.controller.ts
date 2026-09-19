// import * as service from './subscriptions.service';

// import type { ListSubscriptionsQueryDto } from '../admin/admin.dto';
// import type { CreateSubscriptionDto } from './subscriptions.dto';
// import type { Subscription } from '@/entities/Subscription';
// import type { JwtPayload } from '@/types/express';
// import type { ApiResponse } from '@/types/types';
// import { AppError, AppErrorCode, AppErrorMessage, HttpStatusCode } from '@/core/AppError';
// import { asyncHandler } from '@/core/asyncHandler';
// import { paginationMeta, sendCreated, sendOk } from '@/core/response';

// export const getPlans = asyncHandler(async (_req, res) => {
//   const plans = await service.listPlans();
//   return sendOk(res, plans);
// });

// export const createSubscription = asyncHandler<{}, object, CreateSubscriptionDto>(
//   async (req, res) => {
//     const { userId, email } = req.user as JwtPayload;
//     if (!userId || !email) {
//       throw new AppError(
//         AppErrorMessage.USER_NOT_LOGGED_IN,
//         HttpStatusCode.UNAUTHORIZED,
//         AppErrorCode.UNAUTHORIZED,
//       );
//     }
//     const result = await service.createSubscription(req.body, {
//       userId,
//       name: 'User',
//       email,
//     });
//     return sendCreated(res, result, 'Subscription initiated. Complete payment on PayPal.');
//   },
// );

// export const getMySubscription = asyncHandler(async (req, res) => {
//   const { userId } = req.user as JwtPayload;
//   if (!userId) {
//     throw new AppError(
//       AppErrorMessage.USER_NOT_LOGGED_IN,
//       HttpStatusCode.UNAUTHORIZED,
//       AppErrorCode.UNAUTHORIZED,
//     );
//   }
//   const result = await service.getMySubscription(userId);
//   return sendOk(res, result);
// });

// export const cancelMySubscription = asyncHandler(async (req, res) => {
//   const { userId } = req.user as JwtPayload;
//   if (!userId) {
//     throw new AppError(
//       AppErrorMessage.USER_NOT_LOGGED_IN,
//       HttpStatusCode.UNAUTHORIZED,
//       AppErrorCode.UNAUTHORIZED,
//     );
//   }
//   await service.cancelMySubscription(userId);
//   return sendOk(
//     res,
//     null,
//     'Subscription cancelled. Access remains until the end of the billing period.',
//   );
// });

// export const listSubscriptions = asyncHandler<
//   {},
//   ApiResponse<Subscription[]>,
//   {},
//   ListSubscriptionsQueryDto
// >(async (req, res) => {
//   const { page, limit } = req.query;
//   const { subscriptions, total } = await service.listAllSubscriptions({ page, limit });
//   return sendOk(res, subscriptions, 'OK', paginationMeta(total, page, limit));
// });
