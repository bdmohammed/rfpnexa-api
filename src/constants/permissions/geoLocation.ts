import { PermissionActions } from '@/authorization/registry/types';
import { PermissionModules, type PermissionModuleSeed } from '@/types/types';
import { definePermission } from '@/utils/permissions';

export const GeoLocationPermissionModule: PermissionModuleSeed = {
  name: 'GeoLocation',
  key: PermissionModules.GeoLocation,
  displayOrder: 14,
  description: 'Locations and geography management module.',
  isSystemModule: true,
  isActive: true,
} as const;

export const GeoLocationPermissions = {
  VIEW: definePermission(PermissionModules.GeoLocation, PermissionActions.VIEW, {
    name: 'View Locations',
    description: 'View countries, states, and geography hierarchy.',
    displayOrder: 1,
    isActive: true,
  }),

  MANAGE: definePermission(PermissionModules.GeoLocation, PermissionActions.MANAGE, {
    name: 'Manage Locations',
    description: 'Full administrative control over locations and geography.',
    displayOrder: 2,
    isActive: true,
  }),

  // CREATE: definePermission(PermissionModules.STATE, PermissionActions.CREATE, {
  //   name: 'Create Location Request',
  //   description: 'Create country or state change requests.',
  //   displayOrder: 2,
  //   isActive: true,
  // }),

  // UPDATE: definePermission(PermissionModules.STATE, PermissionActions.UPDATE, {
  //   name: 'Update Locations',
  //   description: 'Update country or state details and metadata.',
  //   displayOrder: 3,
  //   isActive: true,
  // }),

  // DELETE: definePermission(PermissionModules.STATE, PermissionActions.DELETE, {
  //   name: 'Delete Locations',
  //   description: 'Delete or archive countries or states.',
  //   displayOrder: 4,
  //   isActive: true,
  // }),

  // REVIEW: definePermission(PermissionModules.STATE, PermissionActions.REVIEW, {
  //   name: 'Review Location Tickets',
  //   description: 'Review geographical change request tickets.',
  //   displayOrder: 5,
  //   isActive: true,
  // }),

  // APPROVE: definePermission(PermissionModules.STATE, PermissionActions.APPROVE, {
  //   name: 'Approve Location Tickets',
  //   description: 'Approve country or state change request tickets.',
  //   displayOrder: 6,
  //   isActive: true,
  // }),

  // REJECT: definePermission(PermissionModules.STATE, PermissionActions.REJECT, {
  //   name: 'Reject Location Tickets',
  //   description: 'Reject country or state change request tickets.',
  //   displayOrder: 7,
  //   isActive: true,
  // }),

  // ASSIGN: definePermission(PermissionModules.STATE, PermissionActions.ASSIGN, {
  //   name: 'Assign Ticket Reviewers',
  //   description: 'Assign reviewer admins to geographical change tickets.',
  //   displayOrder: 8,
  //   isActive: true,
  // }),

  // AUDIT_VIEW: definePermission(PermissionModules.STATE, PermissionActions.AUDIT_VIEW, {
  //   name: 'View Location Audit',
  //   description: 'View audit logs and change timeline for countries and states.',
  //   displayOrder: 9,
  //   isActive: true,
  // }),
} as const;
