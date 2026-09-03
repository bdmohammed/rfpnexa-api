/**
 * jest.setup.ts -- Jest `setupFilesAfterEnv`.
 *
 * Runs AFTER Jest test framework is installed and moduleNameMapper is active.
 * Handles database initialization, migration execution, and cleanup inside Jest's module environment.
 */
import { AppDataSource } from '@/config/database';

beforeAll(async () => {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
    await AppDataSource.runMigrations();
  }
}, 30_000);

afterAll(async () => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}, 30_000);

beforeEach(() => {
  jest.clearAllMocks();
});
