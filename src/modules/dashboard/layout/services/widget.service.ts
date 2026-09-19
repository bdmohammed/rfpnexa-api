// import { WIDGET_REGISTRY, type WidgetDefinition } from '../config/widget-registry';

// import type { DashboardWidget, UserDashboardLayout } from '@/database/entities/UserDashboardLayout';

// export interface DashboardWidgetResponse extends Omit<
//   WidgetDefinition,
//   'requiredPermission' | 'group' | 'defaultLayout'
// > {
//   defaultLayout: Omit<DashboardWidget, 'id'>;
// }
// export function buildDashboardWidgets(
//   layout: UserDashboardLayout,
//   adminPermissions: string[],
//   roles: string[],
// ) {
//   return getAuthorizedWidgets(layout.widgets, adminPermissions, roles);

//   // return mergeLayout(authorizedWidgets, layout.widgets);
// }

// const widgetMap = new Map(WIDGET_REGISTRY.map((widget) => [widget.id, widget]));

// export function getAuthorizedWidgets(
//   widgets: DashboardWidget[],
//   permissions: string[],
//   roles: string[],
// ): DashboardWidgetResponse[] {
//   if (!permissions.includes('dashboard.view')) {
//     return [];
//   }

//   const isSuperAdmin = roles.includes('super-admin');

//   return widgets.reduce<DashboardWidgetResponse[]>((acc, widget) => {
//     const registryWidget = widgetMap.get(widget.id);

//     if (!registryWidget?.enabled) {
//       return acc;
//     }

//     if (isSuperAdmin || permissions.includes(registryWidget.requiredPermission)) {
//       const { requiredPermission, group, ...restRegistryWidget } = registryWidget;
//       acc.push({
//         ...restRegistryWidget,
//         defaultLayout: {
//           w: widget.w,
//           h: widget.h,
//           x: widget.x,
//           y: widget.y,
//           collapsed: widget.collapsed,
//           hidden: widget.hidden,
//         },
//       });
//     }

//     return acc;
//   }, []);
// }

// // export function mergeLayout(registry: readonly WidgetDefinition[], savedLayout: DashboardWidget[]) {
// //   const savedMap = new Map(savedLayout.map((widget) => [widget.id, widget]));

// //   return registry.map((widget) => {
// //     const saved = savedMap.get(widget.id) as DashboardWidget;

// //     return {
// //       id: widget.id,
// //       title: widget.title,
// //       icon: widget.icon,
// //       description: widget.description,
// //       permission: widget.requiredPermission,
// //       enabled: widget.enabled,
// //       x: saved.x,
// //       y: saved.y,
// //       w: saved.w,
// //       h: saved.h,
// //       collapsed: saved.collapsed,
// //     };
// //   });
// // }
