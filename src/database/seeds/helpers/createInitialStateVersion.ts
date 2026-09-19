// import type { State } from '@/entities/State';
// import type { User } from '@/entities/User';
// import type { DataSource } from 'typeorm';
// import { StateVersion } from '@/entities/StateVersion';
// import { CountryChangeRequestAction, CountryChangeRequestStatus } from '@/types/enums';

// /**
//  * Creates the initial immutable version (v1) for a newly seeded state or list of states.
//  *
//  * This should only be called during database bootstrap.
//  */
// export async function createInitialStateVersion(
//   manager: DataSource,
//   stateOrStates: State | State[],
//   systemUser: User,
// ): Promise<void> {
//   const states = Array.isArray(stateOrStates) ? stateOrStates : [stateOrStates];
//   if (states.length === 0) {
//     return;
//   }

//   const versionRepo = manager.getRepository(StateVersion);
//   const now = new Date();

//   const versions = states.map((state) =>
//     versionRepo.create({
//       stateId: state.id,
//       countryId: state.countryId,

//       requestId: null,
//       previousVersionId: null,

//       version: 1,

//       code: state.code,
//       name: state.name,
//       slug: state.slug,
//       type: state.type,

//       isActiveBefore: false,
//       isActiveAfter: state.isActive,

//       action: CountryChangeRequestAction.ACTIVATE,
//       requestStatus: CountryChangeRequestStatus.APPROVED,

//       reason: 'Initial system seed',
//       cascadePolicy: null,

//       requestedById: systemUser.id,
//       approvedById: systemUser.id,

//       approvedAt: now,
//     }),
//   );

//   await versionRepo.save(versions);
// }
