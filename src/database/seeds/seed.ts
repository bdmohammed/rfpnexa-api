import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as bcrypt from 'bcryptjs';

// import { COUNTRIES_SEED_DATA } from './data/countries.data';
import {
  ensureCountry,
  // finalizeBootstrapCountry
} from './helpers/seedCountry';

import type { DataSource, EntityTarget, ObjectLiteral } from 'typeorm';
import { AppDataSource } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { SeedHistory } from '@/entities/SeedHistory';
import { User } from '@/entities/User';
import {
  AccountType,
  SeedStatus,
  // UserStatus
} from '@/types/enums';
import { hashToken } from '@/utils/crypto';

import 'reflect-metadata';

interface ApplySeedResult {
  name: string;
  status: SeedStatus;
  durationMs?: number;
}

async function applySeed(
  file: string,
  definitionsDir: string,
  dataSource: DataSource,
  systemUser: User | null,
): Promise<ApplySeedResult> {
  const filePath = path.join(definitionsDir, file);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const module = require(filePath);

  const SeedClass = module?.default;

  if (typeof SeedClass !== 'function') {
    logger.warn(
      {
        file,
        reason: 'Expected a default class export',
      },
      `Skipping invalid seed file: ${file}`,
    );

    return {
      name: file,
      status: SeedStatus.INVALID,
    };
  }

  const seed = new SeedClass();

  if (typeof seed.up !== 'function' || typeof seed.name !== 'string') {
    logger.warn(
      {
        file,
        reason: 'Seed must provide a string name and up() method',
      },
      `Skipping invalid seed file: ${file}`,
    );

    return {
      name: file,
      status: SeedStatus.INVALID,
    };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const checksum = hashToken(fileContent);

  const historyRepo = dataSource.getRepository(SeedHistory);
  const existing = await historyRepo.findOne({
    where: { id: seed.name, status: SeedStatus.SUCCESS },
  });

  if (existing) {
    logger.info(`Seed [${seed.name}] already applied. Skipping.`);
    return { name: seed.name, status: SeedStatus.SKIPPED };
  }

  logger.info(`Applying seed [${seed.name}]...`);
  const startTime = Date.now();

  try {
    await dataSource.transaction(async (manager) => {
      // A Proxy DataSource to intercept repository/query calls and redirect to the transactional manager
      const transactionalDataSource = new Proxy(dataSource, {
        get(target, prop, receiver) {
          if (prop === 'getRepository') {
            return <Entity extends ObjectLiteral>(entity: EntityTarget<Entity>) =>
              manager.getRepository(entity);
          }
          if (prop === 'manager') {
            return manager;
          }
          if (prop === 'query') {
            return (query: string, parameters?: Parameters<typeof manager.query>[1]) =>
              manager.query(query, parameters);
          }
          return Reflect.get(target, prop, receiver);
        },
      });

      // Execute seed logic inside transaction
      await seed.up(transactionalDataSource, systemUser ?? undefined);

      await manager
        .getRepository(SeedHistory)
        .createQueryBuilder()
        .insert()
        .values({
          id: seed.name,
          checksum,
          status: SeedStatus.SUCCESS,
          executedAt: new Date(),
        })
        .orUpdate(['checksum', 'status', 'executed_at'], ['id'])
        .execute();
    });

    const duration = Date.now() - startTime;
    logger.info(`✓ Seed [${seed.name}] applied successfully in ${duration}ms.`);
    return { name: seed.name, status: SeedStatus.APPLIED, durationMs: duration };
  } catch (err) {
    logger.error(
      { err, seedId: seed.name },
      `❌ Seed [${seed.name}] failed. Transaction rolled back.`,
    );

    // Save status: 'failed' outside of the transactional transaction
    try {
      await historyRepo
        .createQueryBuilder()
        .insert()
        .values({
          id: seed.name,
          checksum,
          status: SeedStatus.FAILED,
          executedAt: new Date(),
        })
        .orUpdate(['checksum', 'status', 'executed_at'], ['id'])
        .execute();
    } catch (saveErr) {
      logger.error(
        { err: saveErr },
        `Failed to write failure status to seed history for [${seed.name}]`,
      );
    }

    throw err;
  }
}

// eslint-disable-next-line complexity, sonarjs/cognitive-complexity
export async function runSeeds(dataSource: DataSource): Promise<void> {
  logger.info('🌱 Starting database seed runner...');

  const definitionsDir = path.join(__dirname, 'definitions');
  if (!fs.existsSync(definitionsDir)) {
    logger.warn(`Definitions directory not found at: ${definitionsDir}`);
    return;
  }

  const allFiles = fs.readdirSync(definitionsDir);

  const matchedFiles: string[] = [];
  const unmatchedFiles: string[] = [];

  const seedFileRegex = /^\d+[A-Z][A-Za-z0-9]*\.seed\.(ts|js)$/;

  for (const file of allFiles) {
    if (seedFileRegex.test(file)) {
      matchedFiles.push(file);
    } else {
      unmatchedFiles.push(file);
    }
  }

  matchedFiles.sort();

  logger.info({ matchedFiles }, 'Matched seed files');

  if (unmatchedFiles.length > 0) {
    logger.warn(
      {
        unmatchedFiles,
        expectedPattern: seedFileRegex.source,
      },
      'Ignoring files that do not match the seed naming convention',
    );
  }

  if (matchedFiles.length === 0) {
    logger.info('No versioned seed files found. Seeding complete.');
    return;
  }

  let executedCount = 0;
  let skippedCount = 0;
  const executedSeeds: { name: string; durationMs: number }[] = [];
  const skippedSeeds: string[] = [];

  const userRepo = dataSource.getRepository(User);
  const email = env.RFPNEXA_SYSTEM_ADMIN_EMAIL;

  let systemUser = await userRepo.findOne({ where: { email } });
  if (!systemUser) {
    const defaultCountryData = {
      code: 'US',
      name: 'United States',
    };
    const { country } = await ensureCountry(dataSource, defaultCountryData, null);

    // Generate high-entropy password hash that nobody knows
    const tempPassword = crypto.randomBytes(32).toString('hex');
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    systemUser = await userRepo.save(
      userRepo.create({
        name: 'System Service Account',
        email,
        passwordHash,
        companyName: 'RFPNEXA',
        accountType: AccountType.SYSTEM,
        // emailVerified: true,
        // isBlocked: false,
        // status: UserStatus.ACTIVE,
        // passwordChangedAt: new Date(),
        countryId: country.id,
      }),
    );

    // Back-patch the country row so created_by / updated_by point to the system user
    // if (isNew) {
    //   await finalizeBootstrapCountry(dataSource, country, systemUser);
    // }
  }

  for await (const file of matchedFiles) {
    const result = await applySeed(file, definitionsDir, dataSource, systemUser);
    if (result.status === SeedStatus.APPLIED && result.durationMs !== undefined) {
      executedCount++;
      executedSeeds.push({ name: result.name, durationMs: result.durationMs });
    } else if (result.status === SeedStatus.SKIPPED) {
      skippedCount++;
      skippedSeeds.push(result.name);
    }
  }

  logger.info(`✅ Seeding summary: ${executedCount} executed, ${skippedCount} skipped.`);
  if (executedCount > 0) {
    logger.info('Executed seeds in order:');
    executedSeeds.forEach((s) => {
      logger.info(`  - ${s.name} (${s.durationMs}ms)`);
    });
  }
  if (skippedCount > 0) {
    logger.info('Skipped seeds (already applied):');
    skippedSeeds.forEach((name) => {
      logger.info(`  - ${name}`);
    });
  }
}

async function main(): Promise<void> {
  try {
    await AppDataSource.initialize();
    logger.info('✓ Database connected');
    await runSeeds(AppDataSource);
  } catch (err) {
    logger.error({ err }, '❌ Seed runner failed');
    throw err;
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      logger.info('✓ Database connection closed');
    }
  }
}

if (require.main === module) {
  // Global unhandled rejection safety net
  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection at Promise');
    process.exit(1);
  });

  main()
    .then(() => {
      process.exit(0);
    })
    .catch((err) => {
      logger.error({ err }, 'Fatal seed runner error');
      process.exit(1);
    });
}
