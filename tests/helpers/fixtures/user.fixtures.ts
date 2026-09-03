// /**
//  * tests/helpers/fixtures/user.fixtures.ts
//  *
//  * Inserts User rows for integration/API/E2E tests.
//  * These fixtures bypass business-logic layers (registerUser) to allow tests
//  * to build specific pre-conditions (e.g. a duplicate email) without triggering
//  * email dispatch or HIBP checks.
//  */
// import * as bcrypt from 'bcryptjs';

// import { User } from '../../../src/database/entities/User';
// import { AccountType, UserStatus } from '../../../src/types/enums';

// import type { DataSource } from 'typeorm';

// export interface UserFixtureOptions {
//   name?: string;
//   email?: string;
//   password?: string;
//   countryId: string;
//   status?: UserStatus;
//   emailVerified?: boolean;
// }

// export interface UserFixture {
//   id: string;
//   email: string;
//   name: string;
//   passwordHash: string;
// }

// /**
//  * Inserts a user with PENDING_EMAIL_VERIFICATION status (default post-register state).
//  * Hashes the given password with bcrypt so login tests can use the raw password.
//  */
// export async function createUnverifiedUser(
//   dataSource: DataSource,
//   opts: UserFixtureOptions,
// ): Promise<UserFixture> {
//   const repo = dataSource.getRepository(User);

//   const password = opts.password ?? 'TestPass1!';
//   const passwordHash = await bcrypt.hash(password, 10); // low rounds for speed in tests

//   const user = repo.create({
//     name: opts.name ?? 'Test User',
//     email: opts.email ?? `user-${Date.now()}@example-test.com`,
//     passwordHash,
//     accountType: AccountType.USER,
//     status: opts.status ?? UserStatus.PENDING_EMAIL_VERIFICATION,
//     emailVerified: opts.emailVerified ?? false,
//     passwordChangedAt: new Date(),
//     countryId: opts.countryId,
//   });

//   const saved = await repo.save(user);
//   return { id: saved.id, email: saved.email, name: saved.name, passwordHash: saved.passwordHash };
// }

// /**
//  * Inserts a fully verified active user.
//  */
// export async function createVerifiedUser(
//   dataSource: DataSource,
//   opts: UserFixtureOptions,
// ): Promise<UserFixture> {
//   return createUnverifiedUser(dataSource, {
//     ...opts,
//     status: UserStatus.ACTIVE,
//     emailVerified: true,
//   });
// }
