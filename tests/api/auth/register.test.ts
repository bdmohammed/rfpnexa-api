// /**
//  * tests/api/auth/register.test.ts
//  *
//  * [WHAT]
//  * API tests for POST /api/v1/auth/register.
//  * Uses supertest against the real Express app — no mocking of HTTP layers.
//  *
//  * [WHY — why this tier exists]
//  * Verifies HTTP concerns that the integration tier cannot:
//  *   - Response status codes (201, 400, 409, 429, 403)
//  *   - Response body shape (success, message, data, traceId)
//  *   - Zod validation middleware (missing / invalid fields → 400)
//  *   - CSRF protection middleware (no token → 403)
//  *   - Rate limiter (registerLimiter max: 5 → 6th request is 429)
//  *
//  * [ISOLATION]
//  * jest.resetModules() in beforeAll gives this file a fresh module registry.
//  * That means the in-memory express-rate-limit store is freshly initialised —
//  * rate-limiter state never bleeds in from other test files.
//  *
//  * [MOCKS]
//  * email.service   → fully mocked (registered BEFORE resetModules so the
//  *                   mock factory persists into the fresh registry)
//  * verifyPasswordBreach → mocked (HIBP call would fire in NODE_ENV=test)
//  */

// // ─── Mocks (hoisted — persist across jest.resetModules) ──────────────────────
// jest.mock('../../../src/services/email.service');

// jest.mock('../../../src/modules/auth/security.service', () => {
//   const actual = jest.requireActual<typeof import('../../../src/modules/auth/security.service')>(
//     '../../../src/modules/auth/security.service',
//   );
//   return { ...actual, verifyPasswordBreach: jest.fn().mockResolvedValue(undefined) };
// });

// // ─── Imports ──────────────────────────────────────────────────────────────────
// import request from 'supertest';

// import { getCsrf } from '../../helpers/csrf';
// import { createTestCountry } from '../../helpers/fixtures';
// import { startTestDatabase } from '../../helpers/test-datasource';

// import type { Express } from 'express';
// import type { StartedPostgreSqlContainer } from 'testcontainers';
// import type { DataSource } from 'typeorm';

// // ─── Suite state ──────────────────────────────────────────────────────────────
// let app: Express;
// let assertionDs: DataSource;
// let container: StartedPostgreSqlContainer;
// let countryId: string;

// // ─── Setup / Teardown ─────────────────────────────────────────────────────────
// beforeAll(async () => {
//   // 1. Boot container + run migrations
//   const db = await startTestDatabase();
//   container = db.container;
//   assertionDs = db.dataSource;

//   // 2. Set DATABASE_URL before ANY src/ module is imported
//   process.env['DATABASE_URL'] = db.connectionUrl;

//   // 3. Fresh module registry → fresh rate-limiter store + env.ts re-parse
//   jest.resetModules();

//   // 4. Re-import with fresh registry (order matters: database before app)
//   const { AppDataSource } = await import('../../../src/config/database');
//   await AppDataSource.initialize();

//   // 5. Boot the real Express app (registers all routes + middleware)
//   ({ app } = await import('../../../src/config/app'));

//   // 6. Seed country FK
//   const country = await createTestCountry(assertionDs);
//   countryId = country.id;
// }, 120_000);

// afterAll(async () => {
//   // Import AppDataSource from the fresh registry to destroy the connection pool
//   try {
//     const { AppDataSource } = await import('../../../src/config/database');
//     if (AppDataSource.isInitialized) await AppDataSource.destroy();
//     if (assertionDs?.isInitialized) await assertionDs.destroy();
//   } finally {
//     await container?.stop({ timeout: 10_000 });
//   }
// });

// beforeEach(() => {
//   jest.clearAllMocks();
// });

// // ─── Valid payload factory ────────────────────────────────────────────────────
// const VALID_BODY = () => ({
//   name: 'Jane Doe',
//   email: `jane-${Date.now()}-${Math.random().toString(36).slice(2)}@example-test.com`,
//   password: 'SecurePass1!',
//   countryId,
// });

// // =============================================================================
// // 1. Happy path
// // =============================================================================
// describe('POST /api/v1/auth/register — happy path', () => {
//   it('returns 201 with correct response shape', async () => {
//     const agent = request.agent(app);
//     const csrf = await getCsrf(agent);

//     const res = await agent
//       .post('/api/v1/auth/register')
//       .set('x-csrf-token', csrf.token)
//       .send(VALID_BODY())
//       .expect(201);

//     // Shape: { success, message, data, traceId }
//     expect(res.body).toMatchObject({
//       success: true,
//       message: expect.stringMatching(/verify your email/i),
//       data: null,
//     });
//     expect(typeof res.body.traceId).toBe('string');
//   });
// });

// // =============================================================================
// // 2. Duplicate email → 409
// // =============================================================================
// describe('POST /api/v1/auth/register — duplicate email', () => {
//   it('returns 409 with code EMAIL_TAKEN', async () => {
//     const agent = request.agent(app);
//     const body = VALID_BODY();

//     // First registration — must succeed
//     const csrf1 = await getCsrf(agent);
//     await agent
//       .post('/api/v1/auth/register')
//       .set('x-csrf-token', csrf1.token)
//       .send(body)
//       .expect(201);

//     // Duplicate registration — must be rejected
//     const csrf2 = await getCsrf(agent);
//     const res = await agent
//       .post('/api/v1/auth/register')
//       .set('x-csrf-token', csrf2.token)
//       .send(body)
//       .expect(409);

//     expect(res.body.code).toBe('EMAIL_TAKEN');
//     expect(res.body.success).toBe(false);
//   });
// });

// // =============================================================================
// // 3. Zod validation middleware — missing / invalid fields → 400
// // =============================================================================
// describe('POST /api/v1/auth/register — validation', () => {
//   const cases = [
//     {
//       label: 'missing name',
//       body: () => {
//         const b = VALID_BODY();
//         const { name: _, ...rest } = b;
//         return rest;
//       },
//     },
//     {
//       label: 'missing email',
//       body: () => {
//         const b = VALID_BODY();
//         const { email: _, ...rest } = b;
//         return rest;
//       },
//     },
//     { label: 'invalid email', body: () => ({ ...VALID_BODY(), email: 'not-an-email' }) },
//     { label: 'password too short', body: () => ({ ...VALID_BODY(), password: 'short' }) },
//     {
//       label: 'missing countryId',
//       body: () => {
//         const b = VALID_BODY();
//         const { countryId: _, ...rest } = b;
//         return rest;
//       },
//     },
//   ];

//   test.each(cases)('$label → 400', async ({ body }) => {
//     const agent = request.agent(app);
//     const csrf = await getCsrf(agent);

//     await agent
//       .post('/api/v1/auth/register')
//       .set('x-csrf-token', csrf.token)
//       .send(body())
//       .expect(400);
//   });
// });

// // =============================================================================
// // 4. CSRF enforcement — missing token → 403
// // =============================================================================
// describe('POST /api/v1/auth/register — CSRF', () => {
//   it('returns 403 when x-csrf-token header is absent', async () => {
//     await request(app).post('/api/v1/auth/register').send(VALID_BODY()).expect(403);
//   });
// });

// // =============================================================================
// // 5. Rate limiting — 6th request in the same window → 429
// // =============================================================================
// describe('POST /api/v1/auth/register — rate limit', () => {
//   it('returns 429 after exceeding the 5 requests/hour limit', async () => {
//     // Use a dedicated agent so the rate-limit IP is consistent (127.0.0.1)
//     const agent = request.agent(app);

//     // Fire 5 valid registrations (each with a unique email, each gets a fresh CSRF token)
//     for (let i = 0; i < 5; i++) {
//       const csrf = await getCsrf(agent);
//       await agent.post('/api/v1/auth/register').set('x-csrf-token', csrf.token).send(VALID_BODY()); // unique email per call — avoids 409 short-circuiting
//     }

//     // 6th request — must be rate-limited regardless of email uniqueness
//     const csrf = await getCsrf(agent);
//     const res = await agent
//       .post('/api/v1/auth/register')
//       .set('x-csrf-token', csrf.token)
//       .send(VALID_BODY())
//       .expect(429);

//     expect(res.body.code).toBe('RATE_LIMITED');
//   });
// });
