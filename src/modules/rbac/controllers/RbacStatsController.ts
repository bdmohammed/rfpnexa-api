import { RbacService } from '../rbac.service';

import type { RoleStatsResult, SuccessResponse } from '../rbac.dto';
import { asyncHandler } from '@/core/asyncHandler';

export class RbacStatsController {
  public static getStats = asyncHandler<{}, SuccessResponse<RoleStatsResult>>(async (_req, res) => {
    const stats = await RbacService.getRoleStats();
    res.json({ success: true, data: stats });
  });
}
