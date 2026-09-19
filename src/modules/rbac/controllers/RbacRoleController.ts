import { RbacService } from '../rbac.service';

import type {
  AssignRoleContract,
  DeleteRoleContract,
  GetRoleByIdContract,
  RevokeAssignmentContract,
  UpdateRoleContract,
} from '../rbac.dto';
import { contractAsyncHandler } from '@/core/asyncHandler';
import { sendCreated, sendOk } from '@/core/response';
import { assertAuthenticated } from '@/utils/authenticate';

export class RbacRoleController {
  public static getRoles = contractAsyncHandler(async (_req, res) => {
    // const includeDeleted = req.query.deleted;
    const roles = await RbacService.getRoles(true);
    return sendOk(res, roles, 'Roles retrieved successfully');
  });

  public static getRoleById = contractAsyncHandler<GetRoleByIdContract>(async (req, res) => {
    const { id } = req.params;
    const role = await RbacService.getRoleById(id);
    return sendOk(res, role, 'Role details retrieved successfully');
  });

  public static createRole = contractAsyncHandler<GetRoleByIdContract>(async (req, res) => {
    assertAuthenticated(req);
    const { body } = req;
    const role = await RbacService.createRole(
      body.name,
      body.permissionKeys,
      body.status,
      req.user.userId,
    );
    return sendCreated(res, role, 'Role created successfully');
  });

  public static updateRole = contractAsyncHandler<UpdateRoleContract>(async (req, res) => {
    assertAuthenticated(req);
    const { id } = req.params;
    const { body } = req;
    const role = await RbacService.updateRole(
      id,
      body.name,
      // body.description,
      body.permissionKeys,
      body.status,
      req.user.userId,
    );
    return sendOk(res, role, 'Role updated successfully');
  });

  public static deleteRole = contractAsyncHandler<DeleteRoleContract>(async (req, res) => {
    const { id } = req.params;
    await RbacService.deleteRole(id, req.user!.userId);
    return sendCreated(res, null, 'Role deleted successfully');
  });

  public static getPermissions = contractAsyncHandler(async (_req, res) => {
    const permissions = await RbacService.getPermissions();
    return sendOk(res, permissions, 'Permissions retrieved successfully');
  });

  public static getAssignments = contractAsyncHandler(async (_req, res) => {
    const assignments = await RbacService.getAssignments();
    return sendOk(res, assignments, 'Role assignments retrieved successfully');
  });

  public static assignRole = contractAsyncHandler<AssignRoleContract>(async (req, res) => {
    assertAuthenticated(req);

    const { userId, roleId, status } = req.body;
    const assignment = await RbacService.assignRole(userId, roleId, req.user.userId, status);
    return sendCreated(res, assignment, 'Role assigned successfully');
  });

  public static revokeAssignment = contractAsyncHandler<RevokeAssignmentContract>(
    async (req, res) => {
      assertAuthenticated(req);

      const { id } = req.params;
      await RbacService.revokeAssignment(id, req.user.userId);
      return sendCreated(res, null, 'Role assignment revoked successfully');
    },
  );
}
