import { RbacService } from '../rbac.service';

import type {
  AssignRoleDto,
  CreateRoleDto,
  CreateRoleResult,
  DuplicateRoleBodyDto,
  IdParamDto,
  ListRolesQueryDto,
  RoleDetails,
  SuccessResponse,
  UpdateAssignmentStatusDto,
  UpdateRoleDto,
  UpdateRoleResult,
} from '../rbac.dto';
import type { Role } from '@/entities/Role';
import { asyncHandler } from '@/core/asyncHandler';
import { AccountType } from '@/types/enums';

export class RbacRoleController {
  public static getRoles = asyncHandler<{}, {}, {}, ListRolesQueryDto>(async (req, res) => {
    const includeDeleted = req.query.deleted;
    const userId = req.user?.userId;
    const isSuperAdmin = req.user?.accountType === AccountType.ADMIN;

    const roles = await RbacService.getRoles(includeDeleted, userId, isSuperAdmin);
    res.json({ success: true, data: roles });
  });

  public static getCategorizedRoles = asyncHandler(async (req, res) => {
    const { userId } = req.user!;

    const data = await RbacService.getCategorizedRoles(userId);
    res.json({ success: true, data });
  });

  public static getRoleById = asyncHandler<IdParamDto, SuccessResponse<RoleDetails>>(
    async (req, res) => {
      const { id } = req.params;
      const role = await RbacService.getRoleById(id);
      res.json({ success: true, data: role });
    },
  );

  public static createRole = asyncHandler<{}, SuccessResponse<CreateRoleResult>, CreateRoleDto>(
    async (req, res) => {
      const { body } = req;
      const draft = await RbacService.createRole(
        body.name,
        body.description,
        body.permissionKeys,
        req.user!.userId,
      );
      res.status(201).json({ success: true, data: draft });
    },
  );

  public static updateRole = asyncHandler<
    IdParamDto,
    SuccessResponse<UpdateRoleResult>,
    UpdateRoleDto
  >(async (req, res) => {
    const { id } = req.params;
    const { body } = req;
    const draft = await RbacService.updateRole(
      id,
      body.name,
      body.description,
      body.permissionKeys,
      req.user!.userId,
    );
    res.json({ success: true, data: draft });
  });

  public static duplicateRole = asyncHandler<
    IdParamDto,
    SuccessResponse<CreateRoleResult>,
    DuplicateRoleBodyDto
  >(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const draft = await RbacService.duplicateRole(id, name, req.user!.userId);
    res.status(201).json({ success: true, data: draft });
  });

  public static deleteRole = asyncHandler<IdParamDto, SuccessResponse<null>>(async (req, res) => {
    const { id } = req.params;
    await RbacService.deleteRole(id, req.user!.userId);
    res.json({ success: true, data: null });
  });

  public static restoreRole = asyncHandler<IdParamDto, SuccessResponse<Role>>(async (req, res) => {
    const { id } = req.params;
    const restoredRole = await RbacService.restoreRole(id, req.user!.userId);
    res.json({ success: true, data: restoredRole });
  });

  public static getAssignments = asyncHandler(async (_req, res) => {
    const assignments = await RbacService.getAssignments();
    res.json({ success: true, data: assignments });
  });

  public static assignRole = asyncHandler<{}, SuccessResponse<null>, AssignRoleDto>(
    async (req, res) => {
      const { userId, roleId, expiresAt } = req.body;
      await RbacService.assignRole(userId, roleId, expiresAt, req.user!.userId);
      res.status(201).json({ success: true, data: null });
    },
  );

  public static removeRoleAssignment = asyncHandler<{ id: string }, SuccessResponse<null>>(
    async (req, res) => {
      const { id } = req.params;
      await RbacService.restoreRole(id, req.user!.userId);
      res.json({ success: true, data: null });
    },
  );

  public static revokeAssignment = asyncHandler<{ id: string }, SuccessResponse<null>>(
    async (req, res) => {
      const { id } = req.params;
      await RbacService.revokeAssignment(id, req.user!.userId);
      res.json({ success: true, data: null });
    },
  );

  public static updateAssignmentStatus = asyncHandler<
    IdParamDto,
    SuccessResponse<null>,
    UpdateAssignmentStatusDto
  >(async (req, res) => {
    const { id } = req.params;
    const { status, comment } = req.body;
    await RbacService.updateAssignmentStatus(id, status, comment, req.user!.userId);
    res.json({ success: true, data: null });
  });

  public static getPermissions = asyncHandler(async (_req, res) => {
    const permissions = await RbacService.getPermissionsGroupedByModule();
    res.json({ success: true, data: permissions });
  });

  public static getModules = asyncHandler(async (_req, res) => {
    const modules = await RbacService.getModules();
    res.json({ success: true, data: modules });
  });
}
