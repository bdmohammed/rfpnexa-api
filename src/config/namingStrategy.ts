import { DefaultNamingStrategy, type NamingStrategyInterface } from 'typeorm';

/**
 * Converts camelCase / PascalCase / acronym-containing names to snake_case.
 *
 * Examples:
 *   userId       -> user_id
 *   UserId       -> user_id
 *   userID       -> user_id
 *   HTTPStatus   -> http_status
 *   apiURL       -> api_url
 */
const snakeCase = (str: string): string => {
  return str
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .replace(/_+/g, '_')
    .toLowerCase();
};

/**
 * [WHAT]
 * Custom TypeORM NamingStrategy mapping TypeScript entity definitions to PostgreSQL snake_case schema names.
 *
 * [WHY]
 * Enforces consistent SQL naming conventions (tables, columns, foreign keys, junction tables) automatically.
 *
 * [CONSTRAINT]
 * Must honor explicit `@Column({ name: '...' })` custom overrides when provided by entity decorators.
 */
export class SnakeNamingStrategy extends DefaultNamingStrategy implements NamingStrategyInterface {
  /** Resolves database column name from entity property name and embedded column prefixes */
  override columnName(
    propertyName: string,
    customName: string,
    embeddedPrefixes: string[],
  ): string {
    const prefix = embeddedPrefixes.length ? `${embeddedPrefixes.join('_')}_` : '';

    return customName ? customName : snakeCase(`${prefix}${propertyName}`);
  }

  /** Resolves relation property name to snake_case */
  override relationName(propertyName: string): string {
    return snakeCase(propertyName);
  }

  /** Resolves foreign key join column name (e.g. `user_id`) */
  override joinColumnName(relationName: string, referencedColumnName: string): string {
    return snakeCase(`${relationName}_${referencedColumnName}`);
  }

  /** Resolves junction table name for Many-to-Many entity relations */
  override joinTableName(
    firstTableName: string,
    secondTableName: string,
    firstPropertyName: string,
  ): string {
    return snakeCase(`${firstTableName}_${firstPropertyName}_${secondTableName}`);
  }

  /** Resolves foreign key column names inside junction tables */
  override joinTableColumnName(
    tableName: string,
    propertyName: string,
    columnName?: string,
  ): string {
    return snakeCase(`${tableName}_${columnName ?? propertyName}`);
  }

  /** Resolves class table inheritance parent column names */
  classTableInheritanceParentColumnName(
    parentTableName: string,
    parentTableIdPropertyName: string,
  ): string {
    return snakeCase(`${parentTableName}_${parentTableIdPropertyName}`);
  }
}
