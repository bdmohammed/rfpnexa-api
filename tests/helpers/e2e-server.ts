// /**
//  * tests/helpers/e2e-server.ts
//  *
//  * [WHAT]
//  * Starts the Express app on an ephemeral OS-assigned port (port 0) and
//  * returns the base URL and a stop handle for E2E tests.
//  *
//  * [WHY]
//  * E2E tests fire real HTTP requests (fetch / axios) against a real bound
//  * TCP socket.  Port 0 avoids EADDRINUSE conflicts between test workers.
//  *
//  * [USAGE]
//  * ```ts
//  * import { startE2EServer, stopE2EServer } from '../helpers/e2e-server';
//  *
//  * let server: Awaited<ReturnType<typeof startE2EServer>>;
//  *
//  * beforeAll(async () => {
//  *   server = await startE2EServer();
//  * }, 120_000);
//  *
//  * afterAll(async () => {
//  *   await stopE2EServer(server);
//  * });
//  *
//  * it('registers successfully', async () => {
//  *   const res = await fetch(`${server.baseUrl}/api/v1/auth/register`, {
//  *     method: 'POST',
//  *     headers: { 'Content-Type': 'application/json' },
//  *     body: JSON.stringify({ ... }),
//  *   });
//  *   expect(res.status).toBe(201);
//  * });
//  * ```
//  *
//  * [CONSTRAINT]
//  * Must be called AFTER jest.resetModules() + DATABASE_URL override so the
//  * app picks up the testcontainer connection string.
//  */

// import type { Server } from 'node:http';

// export interface E2EServer {
//   /** Base URL, e.g. http://127.0.0.1:54321 — no trailing slash */
//   baseUrl: string;
//   /** Raw Node http.Server handle — passed to stopE2EServer(). */
//   server: Server;
// }

// /**
//  * Dynamically imports the Express app, binds it to an ephemeral port,
//  * and resolves once the server is listening.
//  */
// export async function startE2EServer(): Promise<E2EServer> {
//   const { app } = await import('../../src/config/app');

//   return new Promise<E2EServer>((resolve, reject) => {
//     const server = app.listen(0, '127.0.0.1', () => {
//       const address = server.address();
//       if (!address || typeof address === 'string') {
//         reject(new Error('[e2e-server] Failed to get server address'));
//         return;
//       }
//       const baseUrl = `http://127.0.0.1:${address.port}`;
//       resolve({ baseUrl, server });
//     });

//     server.once('error', reject);
//   });
// }

// /**
//  * Closes the HTTP server and drains any in-flight connections.
//  * Jest will warn about open handles if this is not called.
//  */
// export async function stopE2EServer(e2e: E2EServer): Promise<void> {
//   return new Promise<void>((resolve, reject) => {
//     e2e.server.close((err) => (err ? reject(err) : resolve()));
//   });
// }
