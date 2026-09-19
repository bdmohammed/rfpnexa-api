// import { checkPlanAccess } from '../access.rules';

// import type { Subscription } from '@/entities/Subscription';
// import type { TenderVersion } from '@/entities/TenderVersion';

// describe('utils/access.rules', () => {
//   describe('checkPlanAccess', () => {
//     it('should return true for all-access plan type', () => {
//       const result = checkPlanAccess(
//         'all-access',
//         {} as unknown as Subscription,
//         {} as unknown as TenderVersion,
//       );
//       expect(result).toBe(true);
//     });

//     it('should grant access for state plan when targetStateId matches version stateId', () => {
//       const subscription = { targetStateId: 'state-uuid-1' } as unknown as Subscription;
//       const version = { stateId: 'state-uuid-1' } as unknown as TenderVersion;

//       expect(checkPlanAccess('state', subscription, version)).toBe(true);
//     });

//     it('should deny access for state plan when targetStateId does not match version stateId', () => {
//       const subscription = { targetStateId: 'state-uuid-1' } as unknown as Subscription;
//       const version = { stateId: 'state-uuid-2' } as unknown as TenderVersion;

//       expect(checkPlanAccess('state', subscription, version)).toBe(false);
//     });

//     it('should grant access for country plan when country codes match (case-insensitive)', () => {
//       const subscription = { targetCountry: 'US' } as unknown as Subscription;
//       const version = {
//         state: {
//           country: {
//             code: 'us',
//           },
//         },
//       } as unknown as TenderVersion;

//       expect(checkPlanAccess('country', subscription, version)).toBe(true);
//     });

//     it('should deny access for country plan when country codes differ', () => {
//       const subscription = { targetCountry: 'US' } as unknown as Subscription;
//       const version = {
//         state: {
//           country: {
//             code: 'CA',
//           },
//         },
//       } as unknown as TenderVersion;

//       expect(checkPlanAccess('country', subscription, version)).toBe(false);
//     });

//     it('should grant access for category plan when targetCategoryId matches version categoryId', () => {
//       const subscription = { targetCategoryId: 'cat-uuid-1' } as unknown as Subscription;
//       const version = { categoryId: 'cat-uuid-1' } as unknown as TenderVersion;

//       expect(checkPlanAccess('category', subscription, version)).toBe(true);
//     });

//     it('should deny access for category plan when targetCategoryId differs', () => {
//       const subscription = { targetCategoryId: 'cat-uuid-1' } as unknown as Subscription;
//       const version = { categoryId: 'cat-uuid-2' } as unknown as TenderVersion;

//       expect(checkPlanAccess('category', subscription, version)).toBe(false);
//     });

//     it('should grant access for bundle plan when version categoryId is in selectedCategoryIds', () => {
//       const subscription = {
//         selectedCategoryIds: ['cat-1', 'cat-2', 'cat-3'],
//       } as unknown as Subscription;
//       const version = { categoryId: 'cat-2' } as unknown as TenderVersion;

//       expect(checkPlanAccess('bundle', subscription, version)).toBe(true);
//     });

//     it('should deny access for bundle plan when version categoryId is not in selectedCategoryIds', () => {
//       const subscription = { selectedCategoryIds: ['cat-1', 'cat-2'] } as unknown as Subscription;
//       const version = { categoryId: 'cat-99' } as unknown as TenderVersion;

//       expect(checkPlanAccess('bundle', subscription, version)).toBe(false);
//     });

//     it('should return false for unknown plan types', () => {
//       expect(
//         checkPlanAccess(
//           'unknown-plan',
//           {} as unknown as Subscription,
//           {} as unknown as TenderVersion,
//         ),
//       ).toBe(false);
//     });
//   });
// });
