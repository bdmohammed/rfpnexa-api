// /**
//  * tests/helpers/fixtures/country.fixtures.ts
//  *
//  * Inserts a minimal active Country row into the test database.
//  * Country is required by registerUser (FK on users.country_id).
//  */
// import { Country } from '../../../src/database/entities/Country';

// import type { DataSource } from 'typeorm';

// export interface CountryFixture {
//   id: string;
//   code: string;
//   name: string;
// }

// /**
//  * Inserts a single active Country row and returns its id.
//  * Safe to call multiple times — uses a unique code per call.
//  */
// export async function createTestCountry(
//   dataSource: DataSource,
//   overrides: Partial<{ code: string; name: string }> = {},
// ): Promise<CountryFixture> {
//   const repo = dataSource.getRepository(Country);

//   // Use a fresh country each time to avoid unique constraint issues
//   // when the fixture is called more than once per test suite.
//   const code = overrides.code ?? 'US';
//   const name = overrides.name ?? 'United States';

//   // Upsert-style: check if already exists (idempotent across beforeEach re-runs)
//   const existing = await repo.findOne({ where: { code } });
//   if (existing) {
//     return { id: existing.id, code: existing.code, name: existing.name };
//   }

//   const country = repo.create({
//     code,
//     name,
//     isActive: true,
//     displayOrder: 1,
//     createdById: null,
//   });

//   const saved = await repo.save(country);
//   return { id: saved.id, code: saved.code, name: saved.name };
// }
