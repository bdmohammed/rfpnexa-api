// import { WidgetGroup } from './widget-groups';

// export interface WidgetDefinition {
//   id: string;
//   title: string;
//   description: string;
//   icon?: string;
//   group: WidgetGroup;
//   requiredPermission: string;
//   enabled: boolean;
//   defaultLayout: {
//     w: number;
//     h: number;
//     x: number;
//     y: number;
//   };
// }

// export const WIDGET_REGISTRY: readonly WidgetDefinition[] = [
//   {
//     id: 'mrr_arr',
//     title: 'Revenue & Subscriptions',
//     requiredPermission: 'subscription.view',
//     defaultLayout: { w: 3, h: 2, x: 0, y: 0 },
//     enabled: true,
//     group: WidgetGroup.FINANCE,
//     description:
//       'Displays the Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR) metrics for your subscriptions.',
//   },
//   {
//     id: 'tender_workflow',
//     title: 'Tender Lifecycle Workflow',
//     requiredPermission: 'tender.view',
//     defaultLayout: { w: 3, h: 2, x: 3, y: 0 },
//     enabled: true,
//     group: WidgetGroup.TENDERS,
//     description:
//       'Visualizes the stages of the tender process, from creation to completion, highlighting key milestones and bottlenecks.',
//   },
//   {
//     id: 'users',
//     title: 'User Access Console',
//     requiredPermission: 'user.view',
//     defaultLayout: { w: 2, h: 2, x: 0, y: 2 },
//     enabled: true,
//     group: WidgetGroup.USERS,
//     description:
//       'Provides an overview of user access levels, recent logins, and pending access requests, allowing for quick management of user permissions.',
//   },
//   {
//     id: 'review_queue',
//     title: 'Compliance Review Queue',
//     requiredPermission: 'rbac.view',
//     defaultLayout: { w: 2, h: 2, x: 2, y: 2 },
//     enabled: true,
//     group: WidgetGroup.USERS,
//     description:
//       'Displays a list of items pending compliance review, including their status and priority, to streamline the review process.',
//   },
//   {
//     id: 'system_health',
//     title: 'Real-time System Diagnostics',
//     requiredPermission: 'system.view',
//     defaultLayout: { w: 3, h: 2, x: 0, y: 4 },
//     enabled: true,
//     group: WidgetGroup.SYSTEM,
//     description:
//       'Provides real-time insights into the health and performance of your system, including resource utilization and error rates.',
//   },
//   {
//     id: 'critical_alerts',
//     title: 'Operational Warnings',
//     requiredPermission: 'dashboard.view',
//     defaultLayout: { w: 2, h: 2, x: 3, y: 4 },
//     enabled: true,
//     group: WidgetGroup.SYSTEM,
//     description:
//       'Highlights critical operational alerts and warnings, allowing for immediate attention to potential issues affecting system stability.',
//   },
//   {
//     id: 'recent_activity',
//     title: 'Audit Access Activity Feed',
//     requiredPermission: 'audit.view',
//     defaultLayout: { w: 2, h: 2, x: 0, y: 6 },
//     enabled: true,
//     group: WidgetGroup.SYSTEM,
//     description:
//       'Displays a feed of recent audit activities, including user actions and system events, for compliance and security monitoring.',
//   },
//   {
//     id: 'quick_actions',
//     title: 'Quick Operations Console',
//     requiredPermission: 'dashboard.view',
//     defaultLayout: { w: 2, h: 1, x: 2, y: 6 },
//     enabled: true,
//     group: WidgetGroup.SYSTEM,
//     description:
//       'Provides quick access to common administrative tasks and operations, streamlining daily workflows.',
//   },
//   {
//     id: 'notifications',
//     title: 'System Notifications Logs',
//     requiredPermission: 'dashboard.view',
//     defaultLayout: { w: 2, h: 2, x: 2, y: 8 },
//     enabled: true,
//     group: WidgetGroup.SYSTEM,
//     description:
//       'Displays a log of system notifications and alerts, allowing for easy tracking and management of important updates.',
//   },
// ];
