// /**
//  * tests/helpers/test-datasource.ts
//  *
//  * [WHAT]
//  * Boots a throw-away PostgreSQL container via testcontainers, wires a fresh
//  * TypeORM DataSource to it, and runs the real project migrations.
//  *
//  * [WHY]
//  * Integration / API / E2E tests each get their own isolated database.
//  * No shared state, no fixture collisions, no leftover rows between files.
//  *
//  * [USAGE]
//  * ```ts
//  * import { startTestDatabase, stopTestDatabase } from '../helpers/test-datasource';
//  *
//  * let db: Awaited<ReturnType<typeof startTestDatabase>>;
//  *
//  * beforeAll(async () => {
//  *   db = await startTestDatabase();
//  *   // Override DATABASE_URL so env.ts picks up the container URL when
//  *   // modules are (re-)imported after jest.resetModules().
//  *   process.env['DATABASE_URL'] = db.connectionUrl;
//  * }, 120_000);
//  *
//  * afterAll(async () => {
//  *   await stopTestDatabase(db);
//  * });
//  * ```
//  *
//  * [CONSTRAINT]
//  * 1. synchronize: false — schema is managed exclusively via migrations.
//  * 2. Fails fast with a clear message if Docker is unavailable.
//  * 3. Must be called before any import of src/ modules so env.ts reads the
//  *    correct DATABASE_URL.
//  */

// import path from 'node:path';

// import { PostgreSqlContainer, type StartedPostgreSqlContainer } from 'testcontainers';
// import { DataSource } from 'typeorm';

// import { SnakeNamingStrategy } from '../../src/config/namingStrategy';
// import * as entities from '../../src/database/entities';

// import 'reflect-metadata';

// export interface TestDatabase {
//   /** Initialized DataSource pointing at the container — use for direct DB assertions. */
//   dataSource: DataSource;
//   /** Testcontainers handle — needed to call stopTestDatabase(). */
//   container: StartedPostgreSqlContainer;
//   /** Full postgresql:// connection string — assign to process.env['DATABASE_URL']
//    * before calling jest.resetModules() so that env.ts re-parses the new URL. */
//   connectionUrl: string;
// }

// /**
//  * Starts a PostgreSQL container, creates a DataSource, and runs migrations.
//  *
//  * @throws If Docker is not available or the container fails to start.
//  */
// export async function startTestDatabase(): Promise<TestDatabase> {
//   // ── Container ─────────────────────────────────────────────────────────────
//   let container: StartedPostgreSqlContainer;
//   try {
//     container = await new PostgreSqlContainer('postgres:16-alpine')
//       .withDatabase('rfpnexa_test')
//       .withUsername('test')
//       .withPassword('test')
//       // Pull timeout: 2 minutes on first run, almost instant after image is cached
//       .start();
//   } catch (err: unknown) {
//     const isDockerError =
//       err instanceof Error &&
//       (err.message.includes('connect ECONNREFUSED') ||
//         err.message.includes('Cannot connect to the Docker') ||
//         err.message.includes('socket hang up'));

//     if (isDockerError) {
//       throw new Error(
//         '[test-datasource] Docker is not available or not running.\n' +
//           'Integration / API / E2E tests require Docker to boot a PostgreSQL container.\n' +
//           'Please start Docker Desktop and re-run the test.\n' +
//           `Original error: ${String(err)}`,
//       );
//     }
//     throw err;
//   }

//   const connectionUrl = container.getConnectionUri();

//   // ── DataSource ─────────────────────────────────────────────────────────────
//   const dataSource = new DataSource({
//     type: 'postgres',
//     url: connectionUrl,
//     namingStrategy: new SnakeNamingStrategy(),

//     // Schema MUST be driven by migrations only — never synchronize
//     synchronize: false,
//     migrationsRun: false,

//     // Reduce noise in test output
//     logging: false,

//     entities: Object.values(entities),

//     // Always use .ts sources (Jest runs in the TS context via SWC)
//     migrations: [path.join(__dirname, '../../src/database/migrations/*.ts')],

//     extra: {
//       max: 5,
//       connectionTimeoutMillis: 5000,
//     },
//   });

//   await dataSource.initialize();
//   await dataSource.runMigrations({ transaction: 'all' });

//   return { dataSource, container, connectionUrl };
// }

// /**
//  * Destroys the DataSource and stops the container.
//  * Call this in afterAll() — always in a try/finally so the container is
//  * cleaned up even if the DataSource destruction throws.
//  */
// export async function stopTestDatabase(db: TestDatabase): Promise<void> {
//   try {
//     if (db.dataSource.isInitialized) {
//       await db.dataSource.destroy();
//     }
//   } finally {
//     await db.container.stop({ timeout: 10_000 });
//   }
// }
