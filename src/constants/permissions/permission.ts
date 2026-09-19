// import { PermissionActions } from '@/authorization/registry/types';
// import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
// import { definePermission } from '@/utils/permissions';

// /**
//  * [WHAT]
//  * Module seed definition for the Permission System Module.
//  *
//  * [WHY]
//  * Registers the Permission domain module in the database permission registry for RBAC seeding.
//  *
//  * [CONSTRAINT]
//  * Must remain `isSystemModule: true` and active to protect RBAC administration endpoints.
//  */
// export const permissionPermissionModule: PermissionModuleSeed = {
//   name: 'Permission',
//   key: PermissionModules.PERMISSION,
//   displayOrder: 4,
//   description: 'Permission Module',
//   isSystemModule: true,
//   isActive: true,
// } as const;

// /**
//  * [WHAT]
//  * Fine-grained RBAC permission definitions for the Permission management domain.
//  *
//  * [WHY]
//  * Controls administrative access for inspecting and configuring system permissions.
//  *
//  * [CONSTRAINT]
//  * Permission keys MUST follow `<module>:<action>` format produced by `definePermission()`.
//  */
// export const PermissionPermissions = {
//   /** Permission allowing inspection of permission registry and modules */
//   VIEW: definePermission(PermissionModules.PERMISSION, PermissionActions.VIEW, {
//     name: 'View Permissions',
//     description: 'View all permission modules and permissions.',
//     displayOrder: 1,
//     isActive: true,
//   }),

//   /** Permission allowing management of system permission modules */
//   MANAGE: definePermission(PermissionModules.PERMISSION, PermissionActions.MANAGE, {
//     name: 'Manage Permission Modules',
//     description: 'Manage permission modules.',
//     displayOrder: 9,
//     isActive: true,
//   }),

//   //   isActive: true,
//   // }),
//   // UPDATE: definePermission(PermissionModules.PERMISSION, PermissionActions.UPDATE, {
//   //   name: 'Update Permissions',
//   //   description: 'Modify existing permissions.',
//   //   displayOrder: 3,
//   //   isActive: true,
//   // }),
//   // DELETE: definePermission(PermissionModules.PERMISSION, PermissionActions.DELETE, {
//   //   name: 'Delete Permissions',
//   //   description: 'Delete custom permissions.',
//   //   displayOrder: 4,
//   //   isActive: true,
//   // }),
//   // RESTORE: definePermission(PermissionModules.PERMISSION, PermissionActions.RESTORE, {
//   //   name: 'Restore Permissions',
//   //   description: 'Restore previously deleted permissions.',
//   //   displayOrder: 5,
//   //   isActive: true,
//   // }),
//   // EXPORT: definePermission(PermissionModules.PERMISSION, PermissionActions.EXPORT, {
//   //   name: 'Export Permissions',
//   //   description: 'Export permission definitions.',
//   //   displayOrder: 6,
//   //   isActive: true,
//   // }),
//   // SYNC: definePermission(PermissionModules.PERMISSION, 'sync', {
//   //   name: 'Synchronize Permissions',
//   //   description: 'Synchronize seeded permissions with the database.',
//   //   displayOrder: 7,
//   //   isActive: true,
//   // }),
//   // REVIEW: definePermission(PermissionModules.PERMISSION, 'review', {
//   //   name: 'Review Permissions',
//   //   description: 'Review newly introduced permissions before assigning them to roles.',
//   //   displayOrder: 8,
//   //   isActive: true,
//   // }),
//   // AUDIT: definePermission(PermissionModules.PERMISSION, 'audit', {
//   //   name: 'View Permission Audit',
//   //   description: 'View permission change history.',
//   //   displayOrder: 10,
//   //   isActive: true,
//   // }),
// } as const;
