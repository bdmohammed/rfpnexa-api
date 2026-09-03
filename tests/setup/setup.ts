/**
 * tests/setup/setup.ts
 *
 * Unified test environment lifecycle setup & teardown management.
 */
import { clearDatabase } from './db-reset';
import { resetMockHandlers } from './handlers';

import { AppDataSource } from '@/config/database';

/**
 * Initializes database connection and runs pending migrations before tests.
 */
export async function setupTestEnvironment(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  }
}

/**
 * Destroys database connections and cleans up background workers after tests.
 */
export async function teardownTestEnvironment(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}

/**
 * Resets database tables and clears mock handlers between test runs.
 */
export async function resetTestState(): Promise<void> {
  resetMockHandlers();
  await clearDatabase();
}

export * from './db-reset';
export * from './handlers';
export * from './server';
