// import type { Country } from '@/entities/Country';
// import type { User } from '@/entities/User';
// import type { DataSource } from 'typeorm';
// import { CountryVersion } from '@/entities/CountryVersion';
// import { CountryChangeRequestAction, CountryChangeRequestStatus } from '@/types/enums';

// export async function createInitialCountryVersion(
//   manager: DataSource,
//   country: Country,
//   user: User,
// ): Promise<void> {
//   await manager.getRepository(CountryVersion).save({
//     countryId: country.id,

//     version: 1,
//     previousVersionId: null,
//     requestId: null,

//     code: country.code,
//     name: country.name,
//     slug: country.slug,

//     isActiveBefore: false,
//     isActiveAfter: country.isActive,

//     action: CountryChangeRequestAction.ACTIVATE,
//     requestStatus: CountryChangeRequestStatus.APPROVED,

//     reason: 'Initial system seed',
//     cascadePolicy: null,

//     requestedById: user.id,
//     approvedById: user.id,
//     approvedAt: new Date(),
//   });
// }
