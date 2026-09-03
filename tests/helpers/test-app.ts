// /**
//  * tests/helpers/test-app.ts
//  *
//  * [WHAT]
//  * Returns the real Express application instance for use with supertest in the
//  * API and E2E test tiers.
//  *
//  * [WHY]
//  * - Avoids calling app.listen() in tests — supertest handles port binding.
//  * - Centralises the import so all test files reference a single well-known path.
//  *
//  * [USAGE]
//  * ```ts
//  * import { getTestApp } from '../helpers/test-app';
//  *
//  * const app = await getTestApp();
//  * const res = await request(app).post('/api/v1/auth/register').send(body);
//  * ```
//  *
//  * [CONSTRAINT]
//  * Call this AFTER jest.resetModules() + overriding process.env['DATABASE_URL']
//  * so that env.ts inside app.ts sees the test container URL.
//  */

// import type { Express } from 'express';

// /**
//  * Dynamically imports the real Express app.
//  * Must be called after env vars are set and jest.resetModules() has been invoked
//  * (if a fresh module registry is needed).
//  */
// export async function getTestApp(): Promise<Express> {
//   // Dynamic import so callers can call jest.resetModules() first —
//   // a static import would be cached before resetModules takes effect.
//   const { app } = await import('../../src/config/app');
//   return app;
// }
