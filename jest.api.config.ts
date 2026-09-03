import type { Config } from 'jest';

const swcTransform: Config['transform'] = {
  '^.+\\.ts$': [
    '@swc/jest',
    {
      jsc: {
        parser: {
          syntax: 'typescript',
          decorators: true,
        },
        transform: {
          legacyDecorator: true,
          decoratorMetadata: true,
        },
        target: 'ES2023',
      },
      module: {
        type: 'NodeNext',
      },
    },
  ],
};

const moduleNameMapper: NonNullable<Config['moduleNameMapper']> = {
  '^@/config/(.*)$': '<rootDir>/src/config/$1',
  '^@/entities/(.*)$': '<rootDir>/src/database/entities/$1',
  '^@/middleware/(.*)$': '<rootDir>/src/middleware/$1',
  '^@/modules/(.*)$': '<rootDir>/src/modules/$1',
  '^@/services/(.*)$': '<rootDir>/src/services/$1',
  '^@/utils/(.*)$': '<rootDir>/src/utils/$1',
  '^@/jobs/(.*)$': '<rootDir>/src/jobs/$1',
  '^@/core/(.*)$': '<rootDir>/src/core/$1',
  '^@/search/(.*)$': '<rootDir>/src/search/$1',
  '^@/types/(.*)$': '<rootDir>/src/types/$1',
  '^@/(.*)$': '<rootDir>/src/$1',
};

const config: Config = {
  displayName: 'api',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/api'],
  testMatch: ['**/*.test.ts'],
  transform: swcTransform,
  moduleNameMapper,
  setupFiles: ['<rootDir>/tests/jest.env-setup.ts'],
  maxWorkers: 1,
  testTimeout: 60_000,
  verbose: true,
};

export default config;
