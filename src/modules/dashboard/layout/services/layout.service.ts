// import { CURRENT_LAYOUT_VERSION } from '../config/layout-version';
// import { WIDGET_REGISTRY } from '../config/widget-registry';

// import type { DashboardWidget } from '@/database/entities/UserDashboardLayout';
// import { AppDataSource } from '@/config/database';
// import { UserDashboardLayout } from '@/database/entities/UserDashboardLayout';
// import { DashboardTheme } from '@/types/enums';

// const layoutRepository = AppDataSource.getRepository(UserDashboardLayout);

// export async function getOrCreateLayout(userId: string): Promise<UserDashboardLayout> {
//   const existing = await layoutRepository.findOne({
//     where: { userId },
//   });

//   if (existing) {
//     return existing;
//   }

//   const layout = buildDefaultLayout(userId);
//   return layoutRepository.save(layout);
// }

// export async function updateLayout(
//   userId: string,
//   widgets: DashboardWidget[],
// ): Promise<UserDashboardLayout> {
//   const layout = await layoutRepository.findOneOrFail({
//     where: { userId },
//   });

//   layout.widgets = widgets;

//   return layoutRepository.save(layout);
// }

// export async function updateTheme(
//   userId: string,
//   theme: DashboardTheme,
// ): Promise<UserDashboardLayout> {
//   const layout = await layoutRepository.findOneOrFail({
//     where: { userId },
//   });

//   layout.theme = theme;

//   return layoutRepository.save(layout);
// }

// export async function resetToDefault(userId: string): Promise<UserDashboardLayout> {
//   const layout = await layoutRepository.findOneOrFail({
//     where: { userId },
//   });

//   const defaults = buildDefaultLayout(userId);

//   layout.widgets = defaults.widgets;
//   layout.filters = defaults.filters;
//   layout.theme = defaults.theme;
//   layout.layoutVersion = defaults.layoutVersion;

//   return layoutRepository.save(layout);
// }

// export function buildDefaultLayout(userId: string): UserDashboardLayout {
//   const widgets: DashboardWidget[] = WIDGET_REGISTRY.map((widget, index) => {
//     return {
//       id: widget.id,
//       x: (index % 3) * 4,
//       y: Math.floor(index / 3) * 3,
//       w: widget.defaultLayout.w,
//       h: widget.defaultLayout.h,
//       hidden: false,
//       collapsed: false,
//     };
//   });

//   return layoutRepository.create({
//     userId,
//     widgets,
//     filters: {},
//     theme: DashboardTheme.DEFAULT,
//     layoutVersion: CURRENT_LAYOUT_VERSION,
//   });
// }
