// import * as authBootstrapService from '../service/auth.admin.bootstrap.service';

// import type {
//   ApproveBootstrapAdminDto,
//   OwnerReviewDto,
//   VerifyBootstrapTokenDto,
// } from '../../auth.dto';
// import type { ApiResponse } from '@/types/types';
// import { asyncHandler } from '@/core/asyncHandler';
// import { sendOk } from '@/core/response';
// import { getOwnerReviewResponseTemplate } from '@/services/email/templates/ownerReviewResponse';

// export const ownerReview = asyncHandler<{}, string, {}, OwnerReviewDto>(async (req, res) => {
//   const { token, action } = req.query;
//   const clientMetadata = {
//     userAgent: req.headers['user-agent'] ?? null,
//     ipAddress: req.ip ?? null,
//   };

//   await authBootstrapService.ownerReview(token, action, clientMetadata);
//   const html = getOwnerReviewResponseTemplate(action);
//   res.setHeader('Content-Type', 'text/html');
//   res.send(html);
// });

// export const verifyBootstrapToken = asyncHandler<
//   {},
//   ApiResponse<{ name: string; email: string }>,
//   {},
//   VerifyBootstrapTokenDto
// >(async (req, res) => {
//   const { token } = req.query;

//   const bootstrapTokenDetails = await authBootstrapService.verifyBootstrapToken(token);
//   return sendOk(res, bootstrapTokenDetails);
// });

// export const approveBootstrapAdmin = asyncHandler<{}, ApiResponse<null>, ApproveBootstrapAdminDto>(
//   async (req, res) => {
//     const { token, action } = req.body;
//     const clientMetadata = {
//       userAgent: req.headers['user-agent'] ?? null,
//       ipAddress: req.ip ?? null,
//     };

//     await authBootstrapService.approveBootstrapAdmin(token, action, clientMetadata);

//     const message =
//       action === 'approve'
//         ? 'Administrator successfully bootstrapped and activated.'
//         : 'Administrator setup request has been rejected.';

//     return sendOk(res, null, message);
//   },
// );
