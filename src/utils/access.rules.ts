// import type { Subscription } from '@/entities/Subscription';
// import type { TenderVersion } from '@/entities/TenderVersion';

/**
 * Determines if a user can access the full details and document of a tender.
 *
 * Access is granted if:
 *   1. The user has an ACTIVE subscription with a non-expired endDate matching the tender's target, OR
 *   2. The user has individually purchased this specific tender.
 *
 * Called server-side on EVERY tender detail and document download request.
 * Never trust client-supplied access claims.
 */
// function checkCountryAccess(subscription: Subscription, version: TenderVersion): boolean {
//   const versionCountry = version.state.country.code;
//   const { targetCountry } = subscription;
//   if (versionCountry && targetCountry) {
//     return versionCountry.toLowerCase() === targetCountry.toLowerCase();
//   }
//   return false;
// }

// function checkBundleAccess(subscription: Subscription, version: TenderVersion): boolean {
//   const categoryIds = subscription.selectedCategoryIds;
//   const { categoryId } = version;
//   if (categoryIds && categoryId) {
//     return categoryIds.includes(categoryId);
//   }
//   return false;
// }

// export function checkPlanAccess(
//   planType: string,
//   subscription: Subscription,
//   version: TenderVersion,
// ): boolean {
//   if (planType === 'all-access') {
//     return true;
//   }
//   if (planType === 'state') {
//     return subscription.targetStateId === version.stateId;
//   }
//   if (planType === 'country') {
//     return checkCountryAccess(subscription, version);
//   }
//   if (planType === 'category') {
//     return subscription.targetCategoryId === version.categoryId;
//   }
//   if (planType === 'bundle') {
//     return checkBundleAccess(subscription, version);
//   }
//   return false;
// }
