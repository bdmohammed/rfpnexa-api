// // import { createInitialCountryVersion } from './createInitialCountryVersion';
// // import { createInitialStateVersion } from './createInitialStateVersion';

// // import type { CountrySeedInput, StateSeedInput } from '../data/countries.data';
// import type { CountrySeedInput } from '../data/countries-states.dto';
// import type { User } from '@/entities/User';
// import type { DataSource } from 'typeorm';
// // import { logger } from '@/config/logger';
// import { Country } from '@/entities/Country';
// // import { CountryActivity } from '@/entities/CountryActivity';
// import { State } from '@/entities/State';
// // import { ActorType, CountryActivityType, StateType } from '@/types/enums';

// /**
//  * Ensures that a country exists. If not, it creates the country and (if a system user is provided)
//  * records the country creation activity and the initial country version.
//  */
// export async function ensureCountry(
//   dataSource: DataSource,
//   countryData: CountrySeedInput[],
//   systemUser?: User | null,
// ): Promise<{ country: Country; isNew: boolean }> {
//   const countryRepo = dataSource.getRepository(Country);
//   // let country = await countryRepo.findOne({ where: { code: countryData.code } });

//   // if (country) {
//   //   return { country, isNew: false };
//   // }

//   const newCountry = countryRepo.create({
//     code: countryData.code,
//     name: countryData.name,
//     isActive: false,
//     // createdById: systemUser?.id ?? null,
//     // updatedById: systemUser?.id ?? null,
//   });

//   country = await countryRepo.save(newCountry);

//   if (systemUser) {
//     // await createInitialCountryVersion(dataSource, country, systemUser);
//     // const activityRepo = dataSource.getRepository(CountryActivity);
//     // await activityRepo.save(
//     //   activityRepo.create({
//     //     countryId: country.id,
//     //     actorId: systemUser.id,
//     //     actorType: ActorType.SYSTEM,
//     //     eventType: CountryActivityType.SEEDED,
//     //     title: 'Country Seeded',
//     //     description: `Country "${country.name} (${country.code})"
//     //     was created during the initial system data seeding.`,
//     //     oldValue: null,
//     //     newValue: {
//     //       name: country.name,
//     //       code: country.code,
//     //       isActive: country.isActive,
//     //     },
//     //     metadata: {
//     //       source: 'SYSTEM_SEEDER',
//     //       countryCode: country.code,
//     //       countryName: country.name,
//     //     },
//     //   }),
//     // );
//   }

//   return { country, isNew: true };
// }

// /**
//  * Finalizes country creation during initial system user bootstrap.
//  * Back-patches created_by / updated_by to the created system user,
//  * generates initial country version, and logs the seed activity.
//  */
// // export async function finalizeBootstrapCountry(
// //   dataSource: DataSource,
// //   country: Country,
// //   systemUser: User,
// // ): Promise<void> {
// // const countryRepo = dataSource.getRepository(Country);

// // await countryRepo.update(country.id, {
// //   createdById: systemUser.id,
// //   updatedById: systemUser.id,
// // });

// // await createInitialCountryVersion(dataSource, country, systemUser);

// // logger.info(
// //   `✓ Back-patched country [${country.code}] created_by/updated_by → system user [${systemUser.id}]`,
// // );

// // const activityRepo = dataSource.getRepository(CountryActivity);
// // await activityRepo.save(
// //   activityRepo.create({
// //     countryId: country.id,
// //     actorId: systemUser.id,
// //     actorType: ActorType.SYSTEM,
// //     eventType: CountryActivityType.SEEDED,
// //     title: 'Country Seeded',
// //     description: `Country "${country.name} (${country.code})" was created during the initial system data seeding.`,
// //     oldValue: null,
// //     newValue: {
// //       name: country.name,
// //       code: country.code,
// //       isActive: country.isActive,
// //     },
// //     metadata: {
// //       source: 'SYSTEM_SEEDER',
// //       countryCode: country.code,
// //       countryName: country.name,
// //     },
// //   }),
// // );
// // }

// /**
//  * Dynamically seeds states for a given country, skipping states that already exist,
//  * creating country activities, and generating initial state versions in bulk.
//  */
// export async function seedStates(
//   dataSource: DataSource,
//   country: Country,
//   statesData: readonly StateSeedInput[],
//   // systemUser: User,
// ): Promise<State[]> {
//   if (statesData.length === 0) {
//     return [];
//   }

//   const stateRepo = dataSource.getRepository(State);
//   const existingStates = await stateRepo.find({
//     where: { countryId: country.id },
//     select: { code: true },
//   });
//   const existingCodes = new Set(existingStates.map((s) => s.code));

//   const newStatesData = statesData.filter(({ code }) => !existingCodes.has(code));
//   if (newStatesData.length === 0) {
//     return [];
//   }

//   const statesToInsert = newStatesData.map((s) =>
//     stateRepo.create({
//       code: s.code,
//       name: s.name,
//       // type: s.type ?? StateType.STATE,
//       ...(s.slug ? { slug: s.slug } : {}),
//       countryId: country.id,
//       // createdById: systemUser.id,
//       // updatedById: systemUser.id,
//     }),
//   );

//   const savedStates = await stateRepo.save(statesToInsert);

//   // const activityRepo = dataSource.getRepository(CountryActivity);
//   // const stateActivities = savedStates.map((savedState) =>
//   //   activityRepo.create({
//   //     countryId: country.id,
//   //     stateId: savedState.id,
//   //     actorId: systemUser.id,
//   //     actorType: ActorType.SYSTEM,
//   //     eventType: CountryActivityType.SEEDED,
//   //     title: 'State Seeded',
//   //     description: `State "${savedState.name} (${savedState.code})"
//   //     was created during the initial system data seeding.`,
//   //     oldValue: null,
//   //     newValue: {
//   //       name: savedState.name,
//   //       code: savedState.code,
//   //       isActive: savedState.isActive,
//   //     },
//   //     metadata: {
//   //       source: 'SYSTEM_SEEDER',
//   //       countryCode: country.code,
//   //       stateCode: savedState.code,
//   //       stateName: savedState.name,
//   //     },
//   //   }),
//   // );

//   // await activityRepo.save(stateActivities);

//   // await createInitialStateVersion(dataSource, savedStates, systemUser);

//   return savedStates;
// }

// /**
//  * High-level dynamic helper to seed a country along with its states.
//  */
// export async function seedCountryWithStates(
//   dataSource: DataSource,
//   countryData: CountrySeedInput[],
//   systemUser: User,
// ): Promise<{ country: Country; seededStates: State[] }> {
//   const { country } = await ensureCountry(dataSource, countryData, systemUser);

//   let seededStates: State[] = [];
//   if (countryData.states && countryData.states.length > 0) {
//     seededStates = await seedStates(
//       dataSource,
//       country,
//       countryData.states,
//       // systemUser
//     );
//   }

//   return { country, seededStates };
// }

import type { CountrySeedInput, StateSeedInput } from '../data/countries-states.dto';
import type { User } from '@/entities/User';
import type { DataSource } from 'typeorm';
import { Country } from '@/entities/Country';
import { State } from '@/entities/State';

export async function ensureCountry(
  dataSource: DataSource,
  countryData: Pick<CountrySeedInput, 'name' | 'code'>,
  _systemUser?: User | null,
): Promise<{ country: Country; isNew: boolean }> {
  const countryRepo = dataSource.getRepository(Country);

  const existingCountry = await countryRepo.findOne({
    where: {
      code: countryData.code,
    },
  });

  if (existingCountry) {
    return {
      country: existingCountry,
      isNew: false,
    };
  }

  const newCountry = countryRepo.create({
    code: countryData.code,
    name: countryData.name,
    isActive: false,
  });

  const country = await countryRepo.save(newCountry);

  return {
    country,
    isNew: true,
  };
}

export async function seedStates(
  dataSource: DataSource,
  country: Country,
  statesData: readonly StateSeedInput[],
): Promise<State[]> {
  if (statesData.length === 0) {
    return [];
  }

  const stateRepo = dataSource.getRepository(State);

  const existingStates = await stateRepo.find({
    where: {
      countryId: country.id,
    },
    select: {
      code: true,
    },
  });

  const existingCodes = new Set(existingStates.map((state) => state.code));

  const newStatesData = statesData.filter(({ code }) => !existingCodes.has(code));

  if (newStatesData.length === 0) {
    return [];
  }

  const statesToInsert = newStatesData.map((state) =>
    stateRepo.create({
      code: state.code,
      name: state.name,
      // type: state.type,
      countryId: country.id,
      isActive: false,
    }),
  );

  return stateRepo.save(statesToInsert);
}

export async function seedCountryWithStates(
  dataSource: DataSource,
  countryData: CountrySeedInput,
  systemUser: User,
): Promise<{
  country: Country;
  seededStates: State[];
}> {
  const { country } = await ensureCountry(dataSource, countryData, systemUser);

  const seededStates = await seedStates(dataSource, country, countryData.states);

  return {
    country,
    seededStates,
  };
}
