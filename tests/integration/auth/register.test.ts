// /**
//  * tests/integration/auth/register.test.ts
//  *
//  * [WHAT]
//  * Integration tests for the registerUser() service function.
//  * Tests run against a real PostgreSQL database in a Docker container.
//  *
//  * [WHY — why this tier exists]
//  * Integration tests sit between unit tests (pure logic, no DB) and API tests
//  * (HTTP layer).  They verify that the service function:
//  *   - Correctly writes all expected rows in a single transaction
//  *   - Handles uniqueness violations atomically
//  *   - Wires up email-token hashing correctly (SHA-256 stored, raw token returned)
//  *   - Rolls back cleanly on mid-transaction failure
//  *
//  * [ISOLATION STRATEGY]
//  * Each test FILE gets its own throw-away PostgreSQL container and fresh module
//  * registry (jest.resetModules).  There is no shared state between files.
//  *
//  * [MOCKS]
//  * - email.service  → fully mocked (no AWS SES calls in tests)
//  * - verifyPasswordBreach → mocked to resolve (env.ts isLocalEnv() returns false
//  *   in NODE_ENV=test, so the HIBP HTTP call would fire without the mock)
//  *
//  * [CONSTRAINT]
//  * startTestDatabase() must complete BEFORE any src/ module is imported so that
//  * process.env['DATABASE_URL'] is set before env.ts is parsed.
//  */

// // ─── Mocks (hoisted by Jest before any imports) ──────────────────────────────
// // email.service: suppress all real outbound email — sendVerificationEmail is
// // fire-and-forget inside registerUser; we don't want real SES calls.
// jest.mock('../../../src/services/email.service');

// // security.service: only stub verifyPasswordBreach (external HIBP call).
// // savePasswordToHistory and checkPasswordHistory run for real — they're our code.
// jest.mock('../../../src/modules/auth/security.service', () => {
//   const actual = jest.requireActual<typeof import('../../../src/modules/auth/security.service')>(
//     '../../../src/modules/auth/security.service',
//   );
//   return {
//     ...actual,
//     verifyPasswordBreach: jest.fn().mockResolvedValue(undefined),
//   };
// });

// // ─── Imports (after mocks are registered) ────────────────────────────────────
// import { createTestCountry, createUnverifiedUser } from '../../helpers/fixtures';
// import { startTestDatabase } from '../../helpers/test-datasource';

// import type { StartedPostgreSqlContainer } from 'testcontainers';
// import type { DataSource } from 'typeorm';

// // ─── Module-level variables (assigned in beforeAll) ───────────────────────────
// let container: StartedPostgreSqlContainer;
// let assertionDs: DataSource; // used ONLY for direct DB assertions
// let countryId: string;

// // Lazily resolved after jest.resetModules() so the service sees the container URL
// let registerUser: typeof import('../../../src/modules/auth/auth.service').registerUser;
// let AppDataSource: typeof import('../../../src/config/database').AppDataSource;

// // ─── Typed mock references ────────────────────────────────────────────────────
// import { sendVerificationEmail } from '../../../src/services/email.service';

// const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<
//   typeof sendVerificationEmail
// >;

// // ─── Suite Setup ──────────────────────────────────────────────────────────────
// beforeAll(async () => {
//   // 1. Boot the container and run migrations
//   const db = await startTestDatabase();
//   container = db.container;
//   assertionDs = db.dataSource; // used for direct row queries in assertions

//   // 2. Point DATABASE_URL at the container BEFORE any src/ import
//   process.env['DATABASE_URL'] = db.connectionUrl;

//   // 3. Clear module registry — env.ts will re-parse the new DATABASE_URL
//   //    on next import, so AppDataSource gets the container connection string.
//   jest.resetModules();

//   // 4. Re-import with the fresh registry (container URL already in process.env)
//   ({ AppDataSource } = await import('../../../src/config/database'));
//   await AppDataSource.initialize();
//   // Migrations already ran in assertionDs (same DB) — no need to run again.

//   // 5. Re-import the service (now bound to the container's AppDataSource)
//   ({ registerUser } = await import('../../../src/modules/auth/auth.service'));

//   // 6. Seed the Country FK dependency
//   const country = await createTestCountry(assertionDs);
//   countryId = country.id;
// }, 120_000);

// afterAll(async () => {
//   try {
//     if (AppDataSource?.isInitialized) await AppDataSource.destroy();
//     if (assertionDs?.isInitialized) await assertionDs.destroy();
//   } finally {
//     await container?.stop({ timeout: 10_000 });
//   }
// });

// beforeEach(() => {
//   jest.clearAllMocks();
//   // Ensure the email mock always resolves (not rejected from a previous test)
//   mockSendVerificationEmail.mockResolvedValue(undefined);
// });

// // ─── Valid registration payload ───────────────────────────────────────────────
// const VALID_DTO = () => ({
//   name: 'Jane Doe',
//   email: `jane-${Date.now()}@example-test.com`, // unique per test call
//   password: 'SecurePass1!',
//   countryId,
// });

// // =============================================================================
// // 1. Happy path — all rows created in transaction
// // =============================================================================
// describe('registerUser — happy path', () => {
//   it('creates a User row with correct status and unverified flag', async () => {
//     const dto = VALID_DTO();
//     await registerUser(dto, { userAgent: null, ipAddress: null });

//     const row = await assertionDs.query<{ email_verified: boolean; status: string }[]>(
//       'SELECT email_verified, status FROM users WHERE email = $1',
//       [dto.email],
//     );

//     expect(row).toHaveLength(1);
//     expect(row[0]!.email_verified).toBe(false);
//     expect(row[0]!.status).toBe('pending_email_verification');
//   });

//   it('stores a bcrypt hash (not plaintext) in password_hash', async () => {
//     const dto = VALID_DTO();
//     await registerUser(dto, { userAgent: null, ipAddress: null });

//     const rows = await assertionDs.query<{ password_hash: string }[]>(
//       'SELECT password_hash FROM users WHERE email = $1',
//       [dto.email],
//     );

//     expect(rows[0]!.password_hash).toMatch(/^\$2[aby]\$/);
//   });

//   it('inserts a password_histories row in the same transaction', async () => {
//     const dto = VALID_DTO();
//     await registerUser(dto, { userAgent: null, ipAddress: null });

//     const userRows = await assertionDs.query<{ id: string }[]>(
//       'SELECT id FROM users WHERE email = $1',
//       [dto.email],
//     );
//     const userId = userRows[0]!.id;

//     const histRows = await assertionDs.query<{ user_id: string }[]>(
//       'SELECT user_id FROM password_histories WHERE user_id = $1',
//       [userId],
//     );

//     expect(histRows).toHaveLength(1);
//   });

//   it('inserts an email_tokens row with a SHA-256 hash (not the raw token)', async () => {
//     const dto = VALID_DTO();
//     await registerUser(dto, { userAgent: null, ipAddress: null });

//     const userRows = await assertionDs.query<{ id: string }[]>(
//       'SELECT id FROM users WHERE email = $1',
//       [dto.email],
//     );
//     const userId = userRows[0]!.id;

//     const tokenRows = await assertionDs.query<{ token_hash: string; type: string }[]>(
//       'SELECT token_hash, type FROM email_tokens WHERE user_id = $1',
//       [userId],
//     );

//     expect(tokenRows).toHaveLength(1);
//     expect(tokenRows[0]!.type).toBe('email_verification');
//     // token_hash should be a hex SHA-256 digest (64 hex chars), never the raw value
//     expect(tokenRows[0]!.token_hash).toMatch(/^[a-f0-9]{64}$/);
//   });

//   it('fires sendVerificationEmail exactly once with the correct recipient', async () => {
//     const dto = VALID_DTO();
//     await registerUser(dto, { userAgent: null, ipAddress: null });

//     // email dispatch is fire-and-forget — give the micro-task queue a tick
//     await new Promise((r) => setImmediate(r));

//     expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
//     expect(mockSendVerificationEmail).toHaveBeenCalledWith(
//       expect.objectContaining({ to: dto.email }),
//     );
//   });
// });

// // =============================================================================
// // 2. Duplicate email → 409 Conflict
// // =============================================================================
// describe('registerUser — duplicate email', () => {
//   it('throws EMAIL_TAKEN (code 409) when email already exists', async () => {
//     // Insert the email directly so no service side effects
//     await createUnverifiedUser(assertionDs, {
//       email: 'dup@example-test.com',
//       countryId,
//     });

//     const dto = { ...VALID_DTO(), email: 'dup@example-test.com' };

//     await expect(registerUser(dto, { userAgent: null, ipAddress: null })).rejects.toMatchObject({
//       statusCode: 409,
//       code: 'EMAIL_TAKEN',
//     });
//   });

//   it('does NOT create any user row after a 409', async () => {
//     await createUnverifiedUser(assertionDs, {
//       email: 'dup2@example-test.com',
//       countryId,
//     });

//     const dto = { ...VALID_DTO(), email: 'dup2@example-test.com' };
//     await expect(registerUser(dto, null)).rejects.toThrow();

//     const rows = await assertionDs.query<unknown[]>('SELECT id FROM users WHERE email = $1', [
//       'dup2@example-test.com',
//     ]);

//     // Only the one we inserted with the fixture — not a second from the failed call
//     expect(rows).toHaveLength(1);
//   });
// });

// // =============================================================================
// // 3. Invalid countryId → 400 Bad Request
// // =============================================================================
// describe('registerUser — invalid country', () => {
//   it('throws VALIDATION_ERROR (400) for a non-existent countryId', async () => {
//     const dto = { ...VALID_DTO(), countryId: '99999' };

//     await expect(registerUser(dto, { userAgent: null, ipAddress: null })).rejects.toMatchObject({
//       statusCode: 400,
//       code: 'VALIDATION_ERROR',
//     });
//   });

//   it('leaves no user row in DB after a failed country lookup', async () => {
//     const dto = { ...VALID_DTO(), countryId: '99999' };
//     const { email } = dto;

//     await expect(registerUser(dto, null)).rejects.toThrow();

//     const rows = await assertionDs.query<unknown[]>('SELECT id FROM users WHERE email = $1', [
//       email,
//     ]);
//     expect(rows).toHaveLength(0);
//   });
// });

// // =============================================================================
// // 4. Transaction rollback
// // =============================================================================
// describe('registerUser — transaction rollback', () => {
//   it('rolls back the transaction when email dispatch throws (fire-and-forget does NOT roll back)', () => {
//     // sendVerificationEmail is fire-and-forget (.catch'd inside registerUser).
//     // A thrown error there does NOT abort the transaction — by design.
//     // This test documents the intended behaviour: user IS created; email failure is logged.
//     mockSendVerificationEmail.mockRejectedValue(new Error('SES timeout'));

//     const dto = VALID_DTO();

//     // registerUser itself should NOT throw even if the email mock rejects
//     return expect(registerUser(dto, { userAgent: null, ipAddress: null })).resolves.toBeUndefined();
//   });
// });
