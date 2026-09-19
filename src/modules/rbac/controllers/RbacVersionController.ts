// import { RbacService } from '../rbac.service';

// import type {
//   CompareVersionsParamsDto,
//   CompareVersionsResult,
//   IdParamDto,
//   RoleIdParamDto,
//   SuccessResponse,
// } from '../rbac.dto';
// import type { RoleVersion } from '@/entities/RoleVersion';
// import { asyncHandler } from '@/core/asyncHandler';

// export class RbacVersionController {
//   public static getRoleVersions = asyncHandler<RoleIdParamDto, SuccessResponse<RoleVersion[]>>(
//     async (req, res) => {
//       const { roleId } = req.params;
//       const versions = await RbacService.getRoleVersions(roleId);
//       res.json({ success: true, data: versions });
//     },
//   );

//   public static lockVersion = asyncHandler<IdParamDto, SuccessResponse<null>>(async (req, res) => {
//     const { id } = req.params;
//     await RbacService.lockRoleVersion(id, req.user!.userId);
//     res.json({ success: true, message: 'Role version draft locked successfully' });
//   });

//   public static unlockVersion = asyncHandler<IdParamDto, SuccessResponse<null>>(
//     async (req, res) => {
//       const { id } = req.params;
//       await RbacService.unlockRoleVersion(id, req.user!.userId);
//       res.json({ success: true, message: 'Role version draft unlocked successfully' });
//     },
//   );

//   public static compareVersions = asyncHandler<
//     CompareVersionsParamsDto,
//     SuccessResponse<CompareVersionsResult>
//   >(async (req, res) => {
//     const { id, v1, v2 } = req.params;
//     const comparison = await RbacService.compareRoleVersions(id, v1, v2);
//     res.json({ success: true, data: comparison });
//   });
// }
