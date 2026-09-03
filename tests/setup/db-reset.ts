import { AppDataSource } from '@/config/database';
import { CacheService } from '@/services/cache.service';

/**
 * Dynamically discovers all managed entity tables using TypeORM metadata
 * and truncates them with CASCADE, resetting primary key sequences.
 * Portable across database schema migrations without raw table list maintenance.
 */
export async function clearDatabase(): Promise<void> {
  await CacheService.flush();

  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const { entityMetadatas } = AppDataSource;
  if (entityMetadatas.length === 0) return;

  const uniqueTables = Array.from(
    new Set(
      entityMetadatas
        .filter((metadata) => metadata.tableType === 'regular')
        .map((metadata) => `"${metadata.tableName}"`),
    ),
  ).sort();

  if (uniqueTables.length === 0) return;

  const tableNames = uniqueTables.join(', ');

  // Cancel any lingering background queries from previous un-awaited promises
  try {
    await AppDataSource.query(`
      SELECT pg_cancel_backend(pid) 
      FROM pg_stat_activity 
      WHERE pid <> pg_backend_pid() 
        AND state = 'active' 
        AND datname = current_database();
    `);
  } catch {
    // Ignore permissions or non-postgres issues
  }

  try {
    await AppDataSource.query(`
      TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE
    `);
  } catch (err: any) {
    if (err?.code === '40P01' || err?.message?.includes('timeout')) {
      // Deadlock or timeout detected — brief retry after 50ms pause
      await new Promise((resolve) => setTimeout(resolve, 50));
      await AppDataSource.query(`
        TRUNCATE TABLE ${tableNames} RESTART IDENTITY CASCADE
      `);
    } else {
      throw err;
    }
  }
}
