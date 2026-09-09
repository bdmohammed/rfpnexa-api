import { CURRENT_LAYOUT_VERSION } from '../config/layout-version';

import type { DashboardWidget, UserDashboardLayout } from '@/database/entities/UserDashboardLayout';

type Migration = (widgets: DashboardWidget[]) => DashboardWidget[];

const migrations: Record<number, Migration> = {
  // 2: migrateToV2,
  // 3: migrateToV3,
  // 4: migrateToV4,
};

export function migrateLayout(layout: UserDashboardLayout): UserDashboardLayout {
  let version = layout.layoutVersion;

  while (version < CURRENT_LAYOUT_VERSION) {
    const nextVersion = version + 1;
    const migration = migrations[nextVersion];
    if (migration) {
      layout.widgets = migration(layout.widgets);
    }
    version = nextVersion;
  }

  layout.layoutVersion = CURRENT_LAYOUT_VERSION;
  return layout;
}

// /**
//  * V2
//  * Rename widget id
//  * revenue -> financial-overview
//  */
// function migrateToV2(widgets: DashboardWidget[]): DashboardWidget[] {
//   return widgets.map((widget) => ({
//     ...widget,
//     id: widget.id === 'revenue' ? 'financial-overview' : widget.id,
//   }));
// }

// /**
//  * V3
//  * Add audit widget for existing users
//  */
// function migrateToV3(widgets: DashboardWidget[]): DashboardWidget[] {
//   const hasAudit = widgets.some((widget) => widget.id === 'audit');

//   if (hasAudit) {
//     return widgets;
//   }

//   return [
//     ...widgets,
//     {
//       id: 'audit',
//       x: 0,
//       y: 999,
//       w: 4,
//       h: 3,
//       collapsed: false,
//     },
//   ];
// }
