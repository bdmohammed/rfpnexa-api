// /**
//  * tests/e2e/registration-flow.test.ts
//  *
//  * [WHAT]
//  * End-to-end test for the full customer registration journey:
//  *   1. POST /api/v1/auth/register  → 201
//  *   2. POST /api/v1/auth/verify-email (with the token from email_tokens) → 200
//  *   3. Assert user row has emailVerified=true, status='active' in DB
//  *
//  * [WHY — why this tier exists]
//  * The integration tier tests the service in isolation.
//  * The API tier tests individual HTTP endpoints.
//  * The E2E tier tests the FULL user journey across multiple round-trips
//  * through a real bound TCP server — the closest thing to a real browser client.
//  *
//  * [HOW — token extraction]
//  * sendVerificationEmail is mocked.  Its call argument contains the raw token
//  * (before it's hashed and stored).  We capture it from the mock's call args
//  * and use it to call /api/v1/auth/verify-email.
//  *
//  * [ISOLATION]
//  * - Own PostgreSQL container (via testcontainers)
//  * - Own HTTP server bound to port 0 (ephemeral)
//  * - jest.resetModules() for fresh module registry
//  */

// // ─── Mocks ────────────────────────────────────────────────────────────────────
// jest.mock('../../../src/services/email.service');

// jest.mock('../../../src/modules/auth/security.service', () => {
//   const actual = jest.requireActual<typeof import('../../../src/modules/auth/security.service')>(
//     '../../../src/modules/auth/security.service',
//   );
//   return { ...actual, verifyPasswordBreach: jest.fn().mockResolvedValue(undefined) };
// });

// // ─── Imports ──────────────────────────────────────────────────────────────────
// import { sendVerificationEmail } from '../../../src/services/email.service';
// import { startE2EServer, stopE2EServer } from '../helpers/e2e-server';
// import { createTestCountry } from '../helpers/fixtures';
// import { startTestDatabase } from '../helpers/test-datasource';

// import type { E2EServer } from '../helpers/e2e-server';
// import type { StartedPostgreSqlContainer } from 'testcontainers';
// import type { DataSource } from 'typeorm';

// const mockSendVerificationEmail = sendVerificationEmail;

// // ─── State ────────────────────────────────────────────────────────────────────
// let assertionDs: DataSource;
// let container: StartedPostgreSqlContainer;
// let e2eServer: E2EServer;
// let countryId: string;

// // ─── Helpers ──────────────────────────────────────────────────────────────────
// /** Fetches a CSRF token from the real server using the fetch API. */
// async function getCsrfToken(baseUrl: string, cookieJar: Map<string, string>): Promise<string> {
//   const res = await fetch(`${baseUrl}/api/v1/auth/csrf-token`);

//   // Persist any Set-Cookie headers into the jar
//   const setCookie = res.headers.get('set-cookie');
//   if (setCookie) {
//     // Parse "name=value; ..." and store name→value
//     setCookie.split(',').forEach((cookie) => {
//       const [pair] = cookie.trim().split(';');
//       if (pair) {
//         const eqIdx = pair.indexOf('=');
//         if (eqIdx !== -1) {
//           cookieJar.set(pair.slice(0, eqIdx).trim(), pair.slice(eqIdx + 1).trim());
//         }
//       }
//     });
//   }

//   const body = (await res.json()) as { data?: { csrfToken?: string } };
//   const token = body?.data?.csrfToken;
//   if (!token) throw new Error(`getCsrfToken: no token in response: ${JSON.stringify(body)}`);
//   return token;
// }

// /** Serialises the cookie jar into a Cookie header string. */
// function cookieHeader(jar: Map<string, string>): string {
//   return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
// }

// // ─── Setup / Teardown ─────────────────────────────────────────────────────────
// beforeAll(async () => {
//   const db = await startTestDatabase();
//   container = db.container;
//   assertionDs = db.dataSource;

//   process.env['DATABASE_URL'] = db.connectionUrl;
//   jest.resetModules();

//   const { AppDataSource } = await import('../../../src/config/database');
//   await AppDataSource.initialize();

//   e2eServer = await startE2EServer();

//   const country = await createTestCountry(assertionDs);
//   countryId = country.id;
// }, 120_000);

// afterAll(async () => {
//   try {
//     await stopE2EServer(e2eServer);
//     const { AppDataSource } = await import('../../../src/config/database');
//     if (AppDataSource.isInitialized) await AppDataSource.destroy();
//     if (assertionDs?.isInitialized) await assertionDs.destroy();
//   } finally {
//     await container?.stop({ timeout: 10_000 });
//   }
// });

// beforeEach(() => {
//   jest.clearAllMocks();
//   mockSendVerificationEmail.mockResolvedValue(undefined);
// });

// // =============================================================================
// // Full journey: register → verify email → active user
// // =============================================================================
// describe('Customer registration journey', () => {
//   it('completes register → verify-email flow and marks user as active', async () => {
//     const { baseUrl } = e2eServer;
//     const cookieJar = new Map<string, string>();

//     const email = `e2e-${Date.now()}@example-test.com`;
//     const payload = {
//       name: 'E2E User',
//       email,
//       password: 'SecurePass1!',
//       countryId,
//     };

//     // ── Step 1: GET /csrf-token ─────────────────────────────────────────────
//     const csrfToken = await getCsrfToken(baseUrl, cookieJar);

//     // ── Step 2: POST /register ──────────────────────────────────────────────
//     const registerRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-csrf-token': csrfToken,
//         Cookie: cookieHeader(cookieJar),
//       },
//       body: JSON.stringify(payload),
//     });

//     expect(registerRes.status).toBe(201);
//     const registerBody = (await registerRes.json()) as { success: boolean };
//     expect(registerBody.success).toBe(true);

//     // ── Step 3: Extract raw token from the mock ─────────────────────────────
//     // sendVerificationEmail is fire-and-forget — wait for micro-task queue
//     await new Promise((r) => setImmediate(r));

//     expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
//     const emailCallArgs = mockSendVerificationEmail.mock.calls[0]?.[0];
//     expect(emailCallArgs).toBeDefined();

//     // The service passes `token` (raw, pre-hash) as a call argument
//     const rawToken = emailCallArgs!.token as string;
//     expect(typeof rawToken).toBe('string');
//     expect(rawToken.length).toBeGreaterThan(10);

//     // ── Step 4: POST /verify-email ──────────────────────────────────────────
//     // Need a fresh CSRF token for the second mutating request
//     const csrfToken2 = await getCsrfToken(baseUrl, cookieJar);

//     const verifyRes = await fetch(`${baseUrl}/api/v1/auth/verify-email`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-csrf-token': csrfToken2,
//         Cookie: cookieHeader(cookieJar),
//       },
//       body: JSON.stringify({ token: rawToken }),
//     });

//     expect(verifyRes.status).toBe(200);
//     const verifyBody = (await verifyRes.json()) as { success: boolean; message: string };
//     expect(verifyBody.success).toBe(true);
//     expect(verifyBody.message).toMatch(/verified/i);

//     // ── Step 5: Assert DB state ─────────────────────────────────────────────
//     const rows = await assertionDs.query<{ email_verified: boolean; status: string }[]>(
//       'SELECT email_verified, status FROM users WHERE email = $1',
//       [email],
//     );

//     expect(rows).toHaveLength(1);
//     expect(rows[0]!.email_verified).toBe(true);
//     expect(rows[0]!.status).toBe('active');
//   });
// });

// // =============================================================================
// // Negative: register with invalid country → 400 (no journey completion)
// // =============================================================================
// describe('Customer registration journey — error cases', () => {
//   it('returns 400 for an invalid countryId', async () => {
//     const { baseUrl } = e2eServer;
//     const cookieJar = new Map<string, string>();

//     const csrfToken = await getCsrfToken(baseUrl, cookieJar);

//     const res = await fetch(`${baseUrl}/api/v1/auth/register`, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         'x-csrf-token': csrfToken,
//         Cookie: cookieHeader(cookieJar),
//       },
//       body: JSON.stringify({
//         name: 'Bad Country User',
//         email: `bad-${Date.now()}@example-test.com`,
//         password: 'SecurePass1!',
//         countryId: '99999',
//       }),
//     });

//     expect(res.status).toBe(400);
//     const body = (await res.json()) as { success: boolean };
//     expect(body.success).toBe(false);
//   });
// });
