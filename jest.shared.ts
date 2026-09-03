/**
 * Shared Jest configuration constants used across all test tier configs
 * (jest.unit.config.ts, jest.integration.config.ts, jest.api.config.ts,
 * jest.e2e.config.ts).
 *
 * WHY a .js file (not .ts):
 *   Jest loads *.config.ts files with a special TypeScript parser, but any
 *   module those config files IMPORT is resolved by Node's standard CJS
 *   resolver. That resolver does NOT try .ts extensions, so cross-importing
 *   between *.config.ts files breaks with ERR_MODULE_NOT_FOUND.
 *   A plain .js file is resolved immediately without any extension magic.
 */

/** @type {import('jest').Config['transform']} */
const swcTransform = {
  '^.+\\.ts$': [
    '@swc/jest',
    {
      jsc: {
        parser: {
          syntax: 'typescript',
          // TypeORM decorators: @Entity, @Column, @PrimaryGeneratedColumn …
          decorators: true,
        },
        transform: {
          // Mirrors TypeScript's experimentalDecorators
          legacyDecorator: true,
          // Mirrors TypeScript's emitDecoratorMetadata (required by TypeORM / reflect-mswetadata)
          decoratorMetadata: true,
        },
        target: 'ES2023',
      },
      // Jest runs in CJS mode; SWC must emit CJS regardless of tsconfig "module"
      module: {
        type: 'NodeNext',
      },
    },
  ],
};

/** @type {import('jest').Config['moduleNameMapper']} */
const moduleNameMapper = {
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

module.exports = { swcTransform, moduleNameMapper };
